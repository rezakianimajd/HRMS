"""عملیات خزانه (فاز ۲): دریافت، علی‌الحساب، انتقال، سپرده و ضمانت‌نامه.

حذف فیزیکی مجاز نیست؛ برای اصلاح فقط ابطال/برگشتی.
ماندهٔ علی‌الحساب و صندوق از گردش واقعی محاسبه می‌شود (نه فیلد دستی).
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


class Receipt(BaseModel):
    """دریافت وجوه — بانکی/نقدی/چک، با گردشکار مورد انتظار → انجام‌شده."""
    class Status(models.TextChoices):
        EXPECTED = 'expected', _('مورد انتظار')
        RECEIVED = 'received', _('دریافت‌شده')
        CLEARED = 'cleared', _('وصول‌شده')
        RETURNED = 'returned', _('برگشت')
        CANCELLED = 'cancelled', _('لغو')

    class Method(models.TextChoices):
        BANK = 'bank', _('بانکی')
        CASH = 'cash', _('نقدی')
        CHEQUE = 'cheque', _('چک')

    number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره دریافت'))
    party = models.ForeignKey('contracts.ContractParty', on_delete=models.SET_NULL, null=True, blank=True, related_name='treasury_receipts', verbose_name=_('طرف حساب'))
    entity = models.ForeignKey('TreasuryEntity', on_delete=models.PROTECT, null=True, blank=True, related_name='receipts', verbose_name=_('بانک/صندوق'))
    received_check = models.ForeignKey('ReceivedCheck', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('چک دریافتی'))
    method = models.CharField(max_length=10, choices=Method.choices, default=Method.BANK, verbose_name=_('روش دریافت'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, verbose_name=_('مبلغ'))
    expected_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ مورد انتظار'))
    received_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ دریافت'))
    description = models.TextField(blank=True, verbose_name=_('شرح'))
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.EXPECTED, verbose_name=_('وضعیت'))
    history = models.JSONField(default=list, blank=True, verbose_name=_('تاریخچهٔ چرخه'))

    class Meta:
        verbose_name = _('دریافت')
        verbose_name_plural = _('دریافت‌ها')
        ordering = ['-created_at']
        indexes = [models.Index(fields=['company', 'status'])]

    def __str__(self):
        return f'{self.number or self.pk} - {self.amount}'


class AdvanceAccount(BaseModel):
    """علی‌الحساب / پیش‌پرداخت — ماندهٔ خودکار از پرداخت‌ها و تسویه‌ها."""
    class Status(models.TextChoices):
        OPEN = 'open', _('باز')
        PARTIAL = 'partial', _('تسویه جزئی')
        SETTLED = 'settled', _('تسویه‌شده')
        CANCELLED = 'cancelled', _('لغو')

    number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره علی‌الحساب'))
    party = models.ForeignKey('contracts.ContractParty', on_delete=models.SET_NULL, null=True, blank=True, related_name='treasury_advances', verbose_name=_('طرف حساب'))
    project = models.ForeignKey('projects.Project', on_delete=models.SET_NULL, null=True, blank=True, related_name='treasury_advances', verbose_name=_('پروژه'))
    contract = models.ForeignKey('contracts.Contract', on_delete=models.SET_NULL, null=True, blank=True, related_name='treasury_advances', verbose_name=_('قرارداد'))
    supplier = models.ForeignKey('procurement.Supplier', on_delete=models.SET_NULL, null=True, blank=True, related_name='treasury_advances', verbose_name=_('تأمین‌کننده'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, verbose_name=_('مبلغ علی‌الحساب'))
    date = models.DateField(verbose_name=_('تاریخ پرداخت'))
    reason = models.TextField(blank=True, verbose_name=_('علت'))
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.OPEN, verbose_name=_('وضعیت'))

    class Meta:
        verbose_name = _('علی‌الحساب')
        verbose_name_plural = _('علی‌الحساب‌ها')
        ordering = ['-date', '-created_at']
        indexes = [models.Index(fields=['company', 'status'])]

    def __str__(self):
        return f'{self.number or self.pk} - {self.amount}'

    @property
    def settled_amount(self):
        from django.db.models import Sum
        return self.settlements.aggregate(s=Sum('amount'))['s'] or 0

    @property
    def balance(self):
        return float(self.amount) - float(self.settled_amount)


class AdvanceSettlement(BaseModel):
    """تسویهٔ علی‌الحساب — به‌روزرسانی خودکار مانده."""
    advance = models.ForeignKey(AdvanceAccount, on_delete=models.PROTECT, related_name='settlements', verbose_name=_('علی‌الحساب'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, verbose_name=_('مبلغ تسویه'))
    date = models.DateField(verbose_name=_('تاریخ تسویه'))
    description = models.TextField(blank=True, verbose_name=_('شرح'))

    class Meta:
        verbose_name = _('تسویه علی‌الحساب')
        verbose_name_plural = _('تسویه‌های علی‌الحساب')
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f'{self.advance_id} - {self.amount}'


class TreasuryTransfer(BaseModel):
    """انتقال وجه بین دو نهاد پولی (بانک/صندوق)."""
    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        POSTED = 'posted', _('ثبت‌شده')
        CANCELLED = 'cancelled', _('لغو')

    number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره انتقال'))
    source = models.ForeignKey('TreasuryEntity', on_delete=models.PROTECT, related_name='transfers_out', verbose_name=_('مبدأ'))
    destination = models.ForeignKey('TreasuryEntity', on_delete=models.PROTECT, related_name='transfers_in', verbose_name=_('مقصد'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, verbose_name=_('مبلغ'))
    date = models.DateField(verbose_name=_('تاریخ انتقال'))
    description = models.TextField(blank=True, verbose_name=_('شرح'))
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    history = models.JSONField(default=list, blank=True, verbose_name=_('تاریخچهٔ چرخه'))

    class Meta:
        verbose_name = _('انتقال وجه')
        verbose_name_plural = _('انتقال‌های وجه')
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f'{self.number or self.pk} - {self.amount}'


class TreasuryGuarantee(BaseModel):
    """سپرده و ضمانت‌نامه خزانه — با هشدار سررسید و چرخهٔ آزادسازی."""
    class Kind(models.TextChoices):
        GOOD_PERFORMANCE = 'good_performance', _('حسن انجام کار')
        TENDER = 'tender', _('شرکت در مناقصه')
        INSURANCE = 'insurance', _('سپرده بیمه')
        TAX = 'tax', _('سپرده مالیاتی')
        GUARANTEE_RECEIVED = 'guarantee_received', _('ضمانت‌نامه دریافتی')
        GUARANTEE_ISSUED = 'guarantee_issued', _('ضمانت‌نامه صادرشده')

    class Status(models.TextChoices):
        ACTIVE = 'active', _('فعال')
        EXPIRED = 'expired', _('منقضی‌شده')
        RELEASED = 'released', _('آزادشده')
        CANCELLED = 'cancelled', _('لغو')

    number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره'))
    kind = models.CharField(max_length=25, choices=Kind.choices, verbose_name=_('نوع'))
    issuer = models.CharField(max_length=250, blank=True, verbose_name=_('صادرکننده'))
    beneficiary = models.CharField(max_length=250, blank=True, verbose_name=_('ذی‌نفع'))
    party = models.ForeignKey('contracts.ContractParty', on_delete=models.SET_NULL, null=True, blank=True, related_name='treasury_guarantees', verbose_name=_('طرف حساب'))
    contract = models.ForeignKey('contracts.Contract', on_delete=models.SET_NULL, null=True, blank=True, related_name='treasury_guarantees', verbose_name=_('قرارداد'))
    project = models.ForeignKey('projects.Project', on_delete=models.SET_NULL, null=True, blank=True, related_name='treasury_guarantees', verbose_name=_('پروژه'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, verbose_name=_('مبلغ'))
    issue_date = models.DateField(verbose_name=_('تاریخ صدور'))
    expiry_date = models.DateField(verbose_name=_('تاریخ انقضا'))
    release_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ آزادسازی'))
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ACTIVE, verbose_name=_('وضعیت'))

    class Meta:
        verbose_name = _('سپرده / ضمانت‌نامه')
        verbose_name_plural = _('سپرده‌ها و ضمانت‌نامه‌ها')
        ordering = ['expiry_date', 'created_at']
        indexes = [models.Index(fields=['company', 'status']), models.Index(fields=['company', 'expiry_date'])]

    def __str__(self):
        return f'{self.get_kind_display()} - {self.number or self.pk}'

    @property
    def days_to_expiry(self):
        if not self.expiry_date:
            return None
        from datetime import date
        return (self.expiry_date - date.today()).days