"""هستهٔ گردش پرداخت خزانه (فاز ۱).

تفکیک زنجیرهٔ:
    درخواست پرداخت → بررسی/تأیید → تعهد → دستور پرداخت → اجرا
حذف فیزیکی مجاز نیست؛ برای اصلاح فقط ابطال/برگشتی.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


class TreasuryPaymentType(BaseModel):
    """انواع پرداخت: علی‌الحساب، پیش‌پرداخت، تسویه، قطعی، فوری، موردی."""
    code = models.CharField(max_length=30, verbose_name=_('کد'))
    name = models.CharField(max_length=150, verbose_name=_('عنوان'))
    requires_contract = models.BooleanField(default=False, verbose_name=_('نیازمند قرارداد'))
    requires_project = models.BooleanField(default=False, verbose_name=_('نیازمند پروژه'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('نوع پرداخت')
        verbose_name_plural = _('انواع پرداخت')
        unique_together = [('company', 'code')]
        ordering = ['code']

    def __str__(self):
        return self.name


class TreasuryPaymentMethod(BaseModel):
    """روش‌های پرداخت: انتقال بانکی، چک، نقد، کارت."""
    class Target(models.TextChoices):
        BANK = 'bank', _('بانک')
        CASH = 'cash', _('صندوق')
        CHEQUE = 'cheque', _('چک')
        CARD = 'card', _('کارت')

    code = models.CharField(max_length=30, verbose_name=_('کد'))
    name = models.CharField(max_length=150, verbose_name=_('عنوان'))
    target = models.CharField(max_length=10, choices=Target.choices, default=Target.BANK, verbose_name=_('مقصد ابزار'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('روش پرداخت')
        verbose_name_plural = _('روش‌های پرداخت')
        unique_together = [('company', 'code')]
        ordering = ['code']

    def __str__(self):
        return self.name


class PaymentCommitment(BaseModel):
    """تعهد نقدی خزانه — بدهی قطعی/در انتظار که باید پرداخت شود."""
    class Status(models.TextChoices):
        OPEN = 'open', _('باز')
        SCHEDULED = 'scheduled', _('برنامه‌ریزی‌شده')
        PARTIAL = 'partial', _('پرداخت جزئی')
        PAID = 'paid', _('تسویه‌شده')
        CANCELLED = 'cancelled', _('لغو')

    number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره تعهد'))
    source_type = models.CharField(max_length=30, blank=True, verbose_name=_('نوع مبدأ'))
    source_id = models.CharField(max_length=64, blank=True, verbose_name=_('شناسهٔ مبدأ'))
    title = models.CharField(max_length=250, verbose_name=_('عنوان تعهد'))
    party = models.ForeignKey('contracts.ContractParty', on_delete=models.SET_NULL, null=True, blank=True, related_name='treasury_commitments', verbose_name=_('طرف حساب'))
    project = models.ForeignKey('projects.Project', on_delete=models.SET_NULL, null=True, blank=True, related_name='treasury_commitments', verbose_name=_('پروژه'))
    contract = models.ForeignKey('contracts.Contract', on_delete=models.SET_NULL, null=True, blank=True, related_name='treasury_commitments', verbose_name=_('قرارداد'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, verbose_name=_('مبلغ تعهد'))
    amount_paid = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('پرداخت‌شده'))
    due_date = models.DateField(null=True, blank=True, verbose_name=_('سررسید'))
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.OPEN, verbose_name=_('وضعیت'))

    class Meta:
        verbose_name = _('تعهد نقدی')
        verbose_name_plural = _('تعهدات نقدی')
        ordering = ['due_date', 'created_at']
        indexes = [models.Index(fields=['company', 'status']), models.Index(fields=['company', 'due_date'])]

    def __str__(self):
        return f'{self.number or self.pk} - {self.title}'

    @property
    def balance(self):
        return float(self.amount) - float(self.amount_paid)


class PaymentRequest(BaseModel):
    """درخواست پرداخت — با State Machine کامل."""
    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        SUBMITTED = 'submitted', _('ثبت‌شده')
        UNDER_REVIEW = 'under_review', _('در حال بررسی')
        APPROVED = 'approved', _('تأییدشده')
        SCHEDULED = 'scheduled', _('برنامه‌ریزی‌شده')
        PAYMENT_ORDERED = 'payment_ordered', _('دستور پرداخت صادرشده')
        PAID = 'paid', _('پرداخت‌شده')
        REJECTED = 'rejected', _('رد شده')
        RETURNED = 'returned', _('برگشت‌خورده')
        CANCELLED = 'cancelled', _('لغو')

    TRANSITIONS = {
        'draft': {'submitted', 'cancelled'},
        'submitted': {'under_review', 'rejected', 'returned', 'cancelled'},
        'under_review': {'approved', 'rejected', 'returned', 'cancelled'},
        'approved': {'scheduled', 'returned', 'cancelled'},
        'scheduled': {'payment_ordered', 'returned', 'cancelled'},
        'payment_ordered': {'paid', 'returned', 'cancelled'},
        'paid': set(),
        'rejected': set(),
        'returned': set(),
        'cancelled': set(),
    }

    number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره درخواست'))
    title = models.CharField(max_length=250, verbose_name=_('عنوان درخواست'))
    description = models.TextField(blank=True, verbose_name=_('شرح'))
    requester = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('درخواست‌کننده'))
    department = models.CharField(max_length=200, blank=True, verbose_name=_('واحد درخواست'))
    party = models.ForeignKey('contracts.ContractParty', on_delete=models.SET_NULL, null=True, blank=True, related_name='treasury_payment_requests', verbose_name=_('طرف حساب'))
    project = models.ForeignKey('projects.Project', on_delete=models.SET_NULL, null=True, blank=True, related_name='treasury_payment_requests', verbose_name=_('پروژه'))
    contract = models.ForeignKey('contracts.Contract', on_delete=models.SET_NULL, null=True, blank=True, related_name='treasury_payment_requests', verbose_name=_('قرارداد'))
    supplier = models.ForeignKey('procurement.Supplier', on_delete=models.SET_NULL, null=True, blank=True, related_name='treasury_payment_requests', verbose_name=_('تأمین‌کننده'))
    commitment = models.ForeignKey(PaymentCommitment, on_delete=models.SET_NULL, null=True, blank=True, related_name='payment_requests', verbose_name=_('تعهد مرتبط'))
    payment_type = models.ForeignKey(TreasuryPaymentType, on_delete=models.SET_NULL, null=True, blank=True, related_name='payment_requests', verbose_name=_('نوع پرداخت'))
    payment_method = models.ForeignKey(TreasuryPaymentMethod, on_delete=models.SET_NULL, null=True, blank=True, related_name='payment_requests', verbose_name=_('روش پرداخت'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, verbose_name=_('مبلغ درخواستی'))
    approved_amount = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True, verbose_name=_('مبلغ تأییدشده'))
    requested_date = models.DateField(verbose_name=_('تاریخ درخواست'))
    due_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ سررسید'))
    source_type = models.CharField(max_length=30, blank=True, verbose_name=_('نوع مبدأ'))
    source_id = models.CharField(max_length=64, blank=True, verbose_name=_('شناسهٔ مبدأ'))
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    history = models.JSONField(default=list, blank=True, verbose_name=_('تاریخچهٔ چرخه'))
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان ثبت'))
    decided_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان تصمیم'))

    class Meta:
        verbose_name = _('درخواست پرداخت')
        verbose_name_plural = _('درخواست‌های پرداخت')
        ordering = ['-requested_date', '-created_at']
        indexes = [models.Index(fields=['company', 'status']), models.Index(fields=['company', 'due_date'])]

    def __str__(self):
        return f'{self.number or self.pk} - {self.title}'

    def can_transition_to(self, target):
        value = getattr(target, 'value', target)
        return value in self.TRANSITIONS.get(self.status, set())


class PaymentOrder(BaseModel):
    """دستور پرداخت — صدور و اجرای پرداخت با ابزار مشخص."""
    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        ISSUED = 'issued', _('صادرشده')
        EXECUTED = 'executed', _('اجراشده')
        RETURNED = 'returned', _('برگشتی')
        CANCELLED = 'cancelled', _('لغو')

    class Instrument(models.TextChoices):
        TRANSFER = 'transfer', _('انتقال بانکی')
        CHEQUE = 'cheque', _('چک')
        CASH = 'cash', _('نقد')
        CARD = 'card', _('کارت')

    number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره دستور'))
    request = models.ForeignKey(PaymentRequest, on_delete=models.PROTECT, related_name='payment_orders', verbose_name=_('درخواست پرداخت'))
    entity = models.ForeignKey('TreasuryEntity', on_delete=models.PROTECT, null=True, blank=True, related_name='payment_orders', verbose_name=_('بانک/صندوق'))
    instrument = models.CharField(max_length=15, choices=Instrument.choices, default=Instrument.TRANSFER, verbose_name=_('ابزار پرداخت'))
    issued_check = models.ForeignKey('IssuedCheck', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('چک صادرشده'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, verbose_name=_('مبلغ'))
    execution_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ اجرا'))
    reference = models.CharField(max_length=100, blank=True, verbose_name=_('شماره مرجع'))
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    history = models.JSONField(default=list, blank=True, verbose_name=_('تاریخچهٔ چرخه'))

    class Meta:
        verbose_name = _('دستور پرداخت')
        verbose_name_plural = _('دستورهای پرداخت')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.number or self.pk} - {self.amount}'