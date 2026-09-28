"""خزانه‌داری (Treasury) — فاز ۱: زیرساخت وجوه نقد و گردش پرداخت.

مدل‌ها:
- بانک و صندوق (نهادهای پولی)
- دریافت / پرداخت خزانه (تراکنش‌ها)
- آیتم قابل پرداخت (یکپارچه از ماژول‌های دیگر)
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


class TreasuryEntity(BaseModel):
    """نهاد پولی خزانه: بانک یا صندوق."""
    class EntityType(models.TextChoices):
        BANK = 'bank', _('بانک')
        CASH = 'cash', _('صندوق')

    code = models.CharField(max_length=30, verbose_name=_('کد'))
    name = models.CharField(max_length=200, verbose_name=_('نام'))
    entity_type = models.CharField(max_length=10, choices=EntityType.choices, default=EntityType.BANK, verbose_name=_('نوع نهاد'))
    account_number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره حساب'))
    sheba_number = models.CharField(max_length=30, blank=True, verbose_name=_('شماره شبا'))
    initial_balance = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('ماندهٔ ابتدایی'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))
    account = models.ForeignKey('accounting.Account', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('حساب معین مرتبط'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('نهاد پولی خزانه')
        verbose_name_plural = _('نهادهای پولی خزانه')
        unique_together = [('company', 'code')]
        ordering = ['code']

    def __str__(self):
        return f'{self.code} - {self.name}'

    @property
    def balance(self):
        from django.db.models import Sum
        receipts = self.transactions.filter(direction='receipt', status='posted').aggregate(s=Sum('amount'))['s'] or 0
        payments = self.transactions.filter(direction='payment', status='posted').aggregate(s=Sum('amount'))['s'] or 0
        return self.initial_balance + receipts - payments


class TreasuryTransaction(BaseModel):
    """تراکنش خزانه: دریافت یا پرداخت."""
    class Direction(models.TextChoices):
        RECEIPT = 'receipt', _('دریافت')
        PAYMENT = 'payment', _('پرداخت')

    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        POSTED = 'posted', _('ثبت شده')
        CANCELLED = 'cancelled', _('لغو')

    entity = models.ForeignKey(TreasuryEntity, on_delete=models.PROTECT, related_name='transactions', verbose_name=_('بانک/صندوق'))
    number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره تراکنش'))
    date = models.DateField(verbose_name=_('تاریخ'))
    direction = models.CharField(max_length=10, choices=Direction.choices, verbose_name=_('جهت'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, verbose_name=_('مبلغ'))
    party = models.CharField(max_length=250, blank=True, verbose_name=_('طرف حساب'))
    description = models.TextField(blank=True, verbose_name=_('شرح'))
    source_module = models.CharField(max_length=50, blank=True, verbose_name=_('ماژول مبدأ'))
    source_id = models.CharField(max_length=64, blank=True, verbose_name=_('شناسهٔ مبدأ'))
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    history = models.JSONField(default=list, blank=True, verbose_name=_('تاریخچهٔ چرخه'))

    class Meta:
        verbose_name = _('تراکنش خزانه')
        verbose_name_plural = _('تراکنش‌های خزانه')
        ordering = ['-date', '-created_at']
        indexes = [models.Index(fields=['company', 'entity']), models.Index(fields=['company', 'direction'])]

    def __str__(self):
        return f'{self.get_direction_display()} - {self.amount} ({self.date})'


class PayableItem(BaseModel):
    """آیتم قابل پرداخت یکپارچه — جمع‌آوری از ماژول‌های دیگر.

    فقط اشاره به مبدأ و مبلغ را نگه می‌دارد و هنگام ثبت پرداخت،
    ماژول مبدأ را به‌روزرسانی می‌کند.
    """
    class SourceType(models.TextChoices):
        PURCHASE_INVOICE = 'purchase_invoice', _('صورتحساب خرید')
        SALARY = 'salary', _('حقوق')
        CONTRACT_INVOICE = 'contract_invoice', _('فاکتور قرارداد')
        PROJECT_STATEMENT = 'project_statement', _('صورت‌وضعیت پروژه')

    source_type = models.CharField(max_length=30, choices=SourceType.choices, verbose_name=_('نوع مبدأ'))
    source_id = models.CharField(max_length=64, verbose_name=_('شناسهٔ مبدأ'))
    title = models.CharField(max_length=250, verbose_name=_('عنوان'))
    party = models.CharField(max_length=250, blank=True, verbose_name=_('طرف حساب'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, verbose_name=_('مبلغ'))
    paid = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('پرداخت‌شده'))
    due_date = models.DateField(null=True, blank=True, verbose_name=_('سررسید'))
    is_paid = models.BooleanField(default=False, verbose_name=_('تسویه شده'))

    class Meta:
        verbose_name = _('آیتم قابل پرداخت')
        verbose_name_plural = _('آیتم‌های قابل پرداخت')
        ordering = ['due_date', 'created_at']
        indexes = [models.Index(fields=['company', 'is_paid']), models.Index(fields=['company', 'due_date'])]

    def __str__(self):
        return f'{self.title} - {self.amount}'

    @property
    def balance(self):
        return float(self.amount) - float(self.paid)


class CheckBook(BaseModel):
    """دسته‌چک‌های صادرشده برای یک بانک."""
    code = models.CharField(max_length=50, verbose_name=_('کد دسته‌چک'))
    bank_name = models.CharField(max_length=200, verbose_name=_('نام بانک'))
    account_number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره حساب'))
    entity = models.ForeignKey(TreasuryEntity, on_delete=models.PROTECT, null=True, blank=True, related_name='checkbooks', verbose_name=_('نهاد مرتبط'))
    series_start = models.CharField(max_length=50, blank=True, verbose_name=_('شروع سری'))
    series_end = models.CharField(max_length=50, blank=True, verbose_name=_('پایان سری'))
    total_leaves = models.PositiveIntegerField(default=0, verbose_name=_('تعداد برگ'))
    used_leaves = models.PositiveIntegerField(default=0, verbose_name=_('برگ مصرف‌شده'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('دسته‌چک')
        verbose_name_plural = _('دسته‌چک‌ها')
        unique_together = [('company', 'code')]
        ordering = ['code']

    def __str__(self):
        return f'{self.code} - {self.bank_name}'


class ReceivedCheck(BaseModel):
    """چک دریافتی با چرخهٔ کامل پاس/ظهرنویسی/برگشت."""
    class Status(models.TextChoices):
        REGISTERED = 'registered', _('ثبت‌شده')
        DEPOSITED = 'deposited', _('واریز به حساب')
        CLEARED = 'cleared', _('پاس‌شده')
        BOUNCED = 'bounced', _('برگشتی')
        ENDORSED = 'endorsed', _('ظهرنویسی‌شده')
        CANCELLED = 'cancelled', _('لغو')

    number = models.CharField(max_length=50, verbose_name=_('شماره چک'))
    bank_name = models.CharField(max_length=200, verbose_name=_('بانک صادرکننده'))
    party = models.CharField(max_length=250, verbose_name=_('طرف حساب (صادرکننده)'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, verbose_name=_('مبلغ'))
    issue_date = models.DateField(verbose_name=_('تاریخ صدور'))
    due_date = models.DateField(verbose_name=_('تاریخ سررسید'))
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.REGISTERED, verbose_name=_('وضعیت'))
    endorsed_to = models.CharField(max_length=250, blank=True, verbose_name=_('ظهرنویسی به'))
    history = models.JSONField(default=list, blank=True, verbose_name=_('تاریخچهٔ چرخه'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('چک دریافتی')
        verbose_name_plural = _('چک‌های دریافتی')
        ordering = ['-due_date', '-created_at']
        indexes = [models.Index(fields=['company', 'status'])]

    def __str__(self):
        return f'{self.number} - {self.amount} ({self.bank_name})'


class IssuedCheck(BaseModel):
    """چک پرداختی صادرشده از دسته‌چک."""
    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        ISSUED = 'issued', _('صادرشده')
        CLEARED = 'cleared', _('پاس‌شده')
        BOUNCED = 'bounced', _('برگشتی')
        CANCELLED = 'cancelled', _('لغو')

    checkbook = models.ForeignKey(CheckBook, on_delete=models.PROTECT, related_name='checks', verbose_name=_('دسته‌چک'))
    number = models.CharField(max_length=50, verbose_name=_('شماره چک'))
    party = models.CharField(max_length=250, verbose_name=_('ذینفع'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, verbose_name=_('مبلغ'))
    issue_date = models.DateField(verbose_name=_('تاریخ صدور'))
    due_date = models.DateField(verbose_name=_('تاریخ سررسید'))
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    history = models.JSONField(default=list, blank=True, verbose_name=_('تاریخچهٔ چرخه'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('چک پرداختی')
        verbose_name_plural = _('چک‌های پرداختی')
        ordering = ['-due_date', '-created_at']
        indexes = [models.Index(fields=['company', 'status'])]

    def __str__(self):
        return f'{self.number} - {self.amount} ({self.party})'
