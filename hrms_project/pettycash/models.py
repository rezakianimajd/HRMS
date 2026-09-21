"""Models for the Petty Cash (تنخواه) module."""
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


class PettyCashCategory(BaseModel):
    """دسته‌بندی هزینه/دریافت تنخواه (سفر، خرید، پذیرایی و ...)."""
    name = models.CharField(max_length=200, verbose_name=_('عنوان دسته‌بندی'))
    code = models.CharField(max_length=50, verbose_name=_('کد'))

    class Meta:
        verbose_name = _('دسته‌بندی تنخواه')
        verbose_name_plural = _('دسته‌بندی‌های تنخواه')
        unique_together = [('company', 'code')]
        ordering = ['name']

    def __str__(self):
        return self.name


class PettyCashFund(BaseModel):
    """صندوق/تنخواه اختصاص‌یافته به یک تنخواه‌دار."""

    class Status(models.TextChoices):
        ACTIVE = 'active', _('فعال')
        ARCHIVED = 'archived', _('بایگانی‌شده')
        SUSPENDED = 'suspended', _('معلق')

    code = models.CharField(max_length=50, verbose_name=_('کد تنخواه'))
    title = models.CharField(max_length=200, verbose_name=_('عنوان تنخواه'))
    custodian = models.ForeignKey(
        'employees.Employee',
        on_delete=models.PROTECT,
        related_name='petty_cash_funds',
        verbose_name=_('تنخواه‌دار'),
    )
    opening_balance = models.DecimalField(
        max_digits=18, decimal_places=0, default=0,
        verbose_name=_('اعتبار اولیه (ریال)'),
    )
    limit = models.DecimalField(
        max_digits=18, decimal_places=0, null=True, blank=True,
        verbose_name=_('سقف تنخواه (ریال)'),
        help_text=_('حداکثر ماندهٔ تنخواه'),
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE,
        verbose_name=_('وضعیت'),
    )
    archived_at = models.DateTimeField(null=True, blank=True, verbose_name=_('تاریخ بایگانی'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('تنخواه')
        verbose_name_plural = _('تنخواه‌ها')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'custodian']),
            models.Index(fields=['company', 'status']),
        ]

    def __str__(self):
        return f'{self.code} - {self.title}'

    @property
    def balance(self):
        """ماندهٔ فعلی = اعتبار اولیه + دریافت‌ها − هزینه‌ها."""
        from django.db.models import Sum
        credits = self.transactions.filter(entry_type='credit').aggregate(s=Sum('amount'))['s'] or 0
        debits = self.transactions.filter(entry_type='debit').aggregate(s=Sum('amount'))['s'] or 0
        return self.opening_balance + credits - debits


class PettyCashTransaction(BaseModel):
    """تراکنش تنخواه (دریافت/شارژ یا هزینه/پرداخت)."""

    class EntryType(models.TextChoices):
        CREDIT = 'credit', _('دریافت / شارژ')
        DEBIT = 'debit', _('هزینه / پرداخت')

    fund = models.ForeignKey(
        PettyCashFund,
        on_delete=models.CASCADE,
        related_name='transactions',
        verbose_name=_('تنخواه'),
    )
    entry_type = models.CharField(
        max_length=10, choices=EntryType.choices,
        verbose_name=_('نوع تراکنش'),
    )
    category = models.ForeignKey(
        PettyCashCategory,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='transactions',
        verbose_name=_('دسته‌بندی'),
    )
    amount = models.DecimalField(max_digits=18, decimal_places=0, verbose_name=_('مبلغ (ریال)'))
    title = models.CharField(max_length=200, verbose_name=_('عنوان'))
    date = models.DateField(verbose_name=_('تاریخ'))
    receipt = models.FileField(upload_to='petty_cash/receipts/', blank=True, null=True, verbose_name=_('تصویر رسید'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))
    is_archived = models.BooleanField(default=False, verbose_name=_('بایگانی‌شده'))
    archived_at = models.DateTimeField(null=True, blank=True, verbose_name=_('تاریخ بایگانی'))

    class Meta:
        verbose_name = _('تراکنش تنخواه')
        verbose_name_plural = _('تراکنش‌های تنخواه')
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['company', 'fund']),
            models.Index(fields=['company', 'entry_type']),
        ]

    def __str__(self):
        return f'{self.get_entry_type_display()} - {self.amount} ({self.date})'


class PettyCashExpenseStatement(BaseModel):
    """صورت ریز هزینهٔ تنخواه — ثبت کدینگ هزینه و شارژ به تنخواه‌دار.

    چرخه: draft → submitted → approved → posted (و در صورت رد: rejected / edited).
    """
    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        SUBMITTED = 'submitted', _('ارسال به حسابداری')
        APPROVED = 'approved', _('تأیید حسابداری')
        POSTED = 'posted', _('ثبت در سند و تنخواه')
        REJECTED = 'rejected', _('برگشت خورده')
        EDITED = 'edited', _('ویرایش‌شده')

    fund = models.ForeignKey(
        PettyCashFund, on_delete=models.CASCADE, related_name='expense_statements',
        verbose_name=_('تنخواه'),
    )
    custodian = models.ForeignKey(
        'employees.Employee', on_delete=models.PROTECT, related_name='expense_statements',
        verbose_name=_('تنخواه‌دار'),
    )
    number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره صورت'))
    date = models.DateField(verbose_name=_('تاریخ صورت'))
    description = models.TextField(blank=True, verbose_name=_('شرح صورت'))
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    history = models.JSONField(default=list, blank=True, verbose_name=_('تاریخچهٔ چرخه'))
    source_transaction = models.OneToOneField(
        'accounting.SourceTransaction', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='petty_statement', verbose_name=_('تراکنش منبع حسابداری'),
    )

    class Meta:
        verbose_name = _('صورت ریز هزینهٔ تنخواه')
        verbose_name_plural = _('صورت هزینه‌های تنخواه')
        ordering = ['-date', '-created_at']
        indexes = [models.Index(fields=['company', 'fund']), models.Index(fields=['company', 'status'])]

    def __str__(self):
        return f'{self.number or self.pk} - {self.fund.title} ({self.date})'

    @property
    def total(self):
        return sum(float(l.debit or 0) for l in self.lines.all())


class PettyCashExpenseStatementLine(BaseModel):
    """یک سطر کدینگ در صورت هزینهٔ تنخواه."""
    statement = models.ForeignKey(
        PettyCashExpenseStatement, on_delete=models.CASCADE, related_name='lines',
        verbose_name=_('صورت هزینه'),
    )
    line_no = models.PositiveIntegerField(default=0, verbose_name=_('ردیف'))
    account = models.ForeignKey('accounting.Account', on_delete=models.PROTECT, related_name='petty_statement_lines', verbose_name=_('کد معین'))
    auxiliary_1 = models.ForeignKey('accounting.AuxiliaryAccount', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('تفصیل یک'))
    auxiliary_2 = models.ForeignKey('accounting.AuxiliaryAccount', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('تفصیل دو'))
    auxiliary_3 = models.ForeignKey('accounting.AuxiliaryAccount', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('تفصیل سه'))
    invoice_number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره فاکتور'))
    supplier = models.CharField(max_length=200, blank=True, verbose_name=_('فروشنده'))
    expense_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ هزینه'))
    description = models.TextField(blank=True, verbose_name=_('شرح هزینه'))
    debit = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ (ریال)'))

    class Meta:
        verbose_name = _('سطر صورت هزینهٔ تنخواه')
        verbose_name_plural = _('سطرهای صورت هزینهٔ تنخواه')
        ordering = ['line_no', 'id']

    def __str__(self):
        return f'{self.account.code} - {self.debit}'
