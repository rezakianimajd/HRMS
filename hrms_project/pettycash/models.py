"""Models for the Petty Cash (تنخواه) module."""
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


class PettyCashCategory(BaseModel):
    """دسته‌بندی هزینه/دریافت تنخواه (سفر، خرید، پذیرایی و ...)."""
    name = models.CharField(max_length=200, verbose_name=_('عنوان دسته‌بندی'))
    code = models.CharField(max_length=50, verbose_name=_('کد'))
    budget_monthly = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('بودجه ماهانه (ریال)'))

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
    general_account = models.ForeignKey(
        'accounting.Account', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='petty_cash_funds_general', verbose_name=_('حساب کل'),
        help_text=_('حساب کل (سطح ۱) که تنخواه به آن متصل است.'),
    )
    account = models.ForeignKey(
        'accounting.Account', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='petty_cash_funds', verbose_name=_('حساب معین'),
        help_text=_('حساب معینی که هنگام ثبت سند، طرف بستانکار تنخواه قرار می‌گیرد.'),
    )
    auxiliary_1 = models.ForeignKey(
        'accounting.AuxiliaryAccount', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('تفصیل یک'),
    )
    auxiliary_2 = models.ForeignKey(
        'accounting.AuxiliaryAccount', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('تفصیل دو'),
    )
    auxiliary_3 = models.ForeignKey(
        'accounting.AuxiliaryAccount', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('تفصیل سه'),
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
    budget_monthly = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('بودجه ماهانه (ریال)'))
    is_reconciled = models.BooleanField(default=False, verbose_name=_('مغایرت‌گیری‌شده'))
    reconciled_at = models.DateTimeField(null=True, blank=True, verbose_name=_('تاریخ مغایرت‌گیری'))
    reconciled_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', db_constraint=False, verbose_name=_('مغایرت‌گیرنده'))
    archived_at = models.DateTimeField(null=True, blank=True, verbose_name=_('تاریخ بایگانی'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Kind(models.TextChoices):
        IMPREST = 'imprest', _('ثابت (Imprest)')
        OCCASIONAL = 'occasional', _('موردی')
        ADVANCE = 'advance', _('علی‌الحساب')

    PAYMENT_METHOD_CHOICES = [
        ('cash', _('نقد')),
        ('card', _('کارت')),
        ('bank_transfer', _('انتقال بانکی')),
        ('cheque', _('چک')),
        ('other', _('سایر')),
    ]

    kind = models.CharField(
        max_length=20, choices=Kind.choices, default=Kind.IMPREST,
        verbose_name=_('نوع تنخواه'),
        help_text=_('ثابت = شارژ مجدد بر اساس هزینه‌های تأییدشده؛ موردی/علی‌الحساب = تسویه پس از پایان کار.'),
    )
    fixed_amount = models.DecimalField(
        max_digits=18, decimal_places=0, default=0,
        verbose_name=_('مبلغ ثابت تنخواه (ریال)'),
        help_text=_('برای تنخواه ثابت: مبلغی که ماندهٔ نقد + اسناد تأییدشده باید برابر آن باشد.'),
    )
    settlement_days = models.PositiveIntegerField(
        default=30, verbose_name=_('مهلت تسویه (روز)'),
    )
    start_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ شروع اعتبار'))
    end_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ پایان اعتبار'))
    payment_methods = models.JSONField(
        default=list, blank=True, verbose_name=_('روش‌های پرداخت مجاز'),
        help_text=_('خالی = استفاده از تنظیمات شرکت'),
    )
    allowed_projects = models.ManyToManyField(
        'projects.Project', blank=True, related_name='petty_cash_funds', verbose_name=_('پروژه‌های مجاز'),
    )
    allowed_cost_centers = models.ManyToManyField(
        'accounting.CostCenter', blank=True, related_name='petty_cash_funds', verbose_name=_('مراکز هزینهٔ مجاز'),
    )
    allowed_accounts = models.ManyToManyField(
        'accounting.Account', blank=True, related_name='petty_cash_funds_allowed', verbose_name=_('سرفصل‌های هزینهٔ مجاز'),
    )
    advance_account = models.ForeignKey(
        'treasury.AdvanceAccount', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='petty_cash_funds', verbose_name=_('علی‌الحساب مرتبط (خزانه‌داری)'),
        help_text=_('برای تنخواه نوع علی‌الحساب؛ از مدل موجود خزانه‌داری استفاده می‌شود.'),
    )

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
        """ماندهٔ فعلی = اعتبار اولیه + دریافت‌ها − هزینه‌ها (بدون تراکنش‌های ابطال‌شده)."""
        from django.db.models import Sum
        from decimal import Decimal
        live = self.transactions.filter(is_void=False)
        credits = live.filter(entry_type='credit').aggregate(s=Sum('amount'))['s'] or Decimal('0')
        debits = live.filter(entry_type='debit').aggregate(s=Sum('amount'))['s'] or Decimal('0')
        return (self.opening_balance or Decimal('0')) + credits - debits

    @property
    def target_amount(self):
        """مبلغ هدف تنخواه ثابت (در صورت تعیین، وگرنه اعتبار اولیه)."""
        return self.fixed_amount or self.opening_balance

    @property
    def limit_display(self):
        return self.limit if self.limit is not None else self.target_amount

    @property
    def usage_percent(self):
        """درصد مصرف از سقف (برای هشدار نزدیک شدن به سقف)."""
        limit = self.limit_display or 0
        if not limit:
            return 0
        return round(float(max(self.balance, 0)) / float(limit) * 100, 2)



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
    payment_method = models.CharField(
        max_length=20, choices=PettyCashFund.PAYMENT_METHOD_CHOICES, default='cash',
        verbose_name=_('روش پرداخت'),
    )
    reference = models.CharField(max_length=100, blank=True, verbose_name=_('شماره سند/رسید'))
    counterparty = models.CharField(max_length=200, blank=True, verbose_name=_('طرف حساب'))
    project = models.ForeignKey(
        'projects.Project', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('پروژه'),
    )
    cost_center = models.ForeignKey(
        'accounting.CostCenter', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('مرکز هزینه'),
    )
    statement = models.ForeignKey(
        'PettyCashExpenseStatement', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='transactions', verbose_name=_('صورت هزینهٔ مرتبط'),
    )
    settlement = models.ForeignKey(
        'PettyCashSettlement', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='transactions', verbose_name=_('تسویهٔ مرتبط'),
    )
    unique_key = models.CharField(
        max_length=120, blank=True, default='', verbose_name=_('کلید یکتای عملیات'),
        help_text=_('برای جلوگیری از ثبت دوبارهٔ یک عملیات مالی (مثلاً statement:12:debit).'),
    )
    is_void = models.BooleanField(default=False, verbose_name=_('ابطال‌شده'))
    voided_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان ابطال'))
    voided_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', db_constraint=False, verbose_name=_('ابطال‌کننده'),
    )
    void_reason = models.TextField(blank=True, verbose_name=_('علت ابطال'))
    created_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', db_constraint=False, verbose_name=_('ثبت‌کننده'),
    )

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
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'unique_key'],
                condition=~models.Q(unique_key=''),
                name='uniq_petty_tx_key',
            ),
        ]

    def __str__(self):
        return f'{self.get_entry_type_display()} - {self.amount} ({self.date})'

    def signed_amount(self):
        """اثر تراکنش بر مانده: دریافت مثبت، پرداخت منفی."""
        from decimal import Decimal
        amount = self.amount or Decimal('0')
        return amount if self.entry_type == self.EntryType.CREDIT else -amount



class PettyCashApprovalPolicy(BaseModel):
    """سیاست گردشکار تأیید — چندمرحله‌ای بر اساس سقف مبلغ."""
    name = models.CharField(max_length=100, verbose_name=_('عنوان سیاست'))
    single_level_limit = models.DecimalField(max_digits=18, decimal_places=0, default=50000000, verbose_name=_('سقف تأیید تک‌مرحله (ریال)'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('سیاست تأیید تنخواه')
        verbose_name_plural = _('سیاست‌های تأیید تنخواه')

    def __str__(self):
        return self.name


class PettyCashApprovalStep(BaseModel):
    """یک مرحلهٔ تأیید در گردشکار صورت هزینه."""
    class Decision(models.TextChoices):
        PENDING = 'pending', _('در انتظار')
        APPROVED = 'approved', _('تأیید')
        REJECTED = 'rejected', _('رد')

    statement = models.ForeignKey(
        'PettyCashExpenseStatement', on_delete=models.CASCADE, null=True, blank=True,
        related_name='approval_steps', verbose_name=_('صورت هزینه'),
    )
    request = models.ForeignKey(
        'PettyCashRequest', on_delete=models.CASCADE, null=True, blank=True,
        related_name='approval_steps', verbose_name=_('درخواست تنخواه'),
    )
    settlement = models.ForeignKey(
        'PettyCashSettlement', on_delete=models.CASCADE, null=True, blank=True,
        related_name='approval_steps', verbose_name=_('تسویه'),
    )
    approver = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', db_constraint=False, verbose_name=_('تأییدکننده'))
    step_no = models.PositiveIntegerField(default=1, verbose_name=_('مرحله'))
    decision = models.CharField(max_length=10, choices=Decision.choices, default=Decision.PENDING, verbose_name=_('تصمیم'))
    comment = models.TextField(blank=True, verbose_name=_('نظر'))
    decided_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان تصمیم'))

    class Meta:
        verbose_name = _('مرحلهٔ تأیید تنخواه')
        verbose_name_plural = _('مراحل تأیید تنخواه')
        ordering = ['step_no']

    def __str__(self):
        target = self.statement_id or self.request_id or self.settlement_id
        return f'{target} / مرحله {self.step_no} - {self.get_decision_display()}'



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
    submitted_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', db_constraint=False, verbose_name=_('ارسال‌کننده'))
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان ارسال'))
    approved_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', db_constraint=False, verbose_name=_('تأییدکننده'))
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان تأیید'))
    source_transaction = models.OneToOneField(
        'accounting.SourceTransaction', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='petty_statement', verbose_name=_('تراکنش منبع حسابداری'),
    )
    is_deleted = models.BooleanField(default=False, verbose_name=_('حذف نرم'))
    deleted_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان حذف'))
    project = models.ForeignKey(
        'projects.Project', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('پروژه'),
    )
    cost_center = models.ForeignKey(
        'accounting.CostCenter', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('مرکز هزینه'),
    )
    payment_method = models.CharField(
        max_length=20, choices=PettyCashFund.PAYMENT_METHOD_CHOICES, default='cash',
        verbose_name=_('روش پرداخت'),
    )
    due_date = models.DateField(
        null=True, blank=True, verbose_name=_('مهلت تسویه'),
        help_text=_('در صورت خالی بودن از مهلت پیش‌فرض تنخواه استفاده می‌شود.'),
    )
    settled_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان تسویه'))

    class Meta:
        verbose_name = _('صورت ریز هزینهٔ تنخواه')
        verbose_name_plural = _('صورت هزینه‌های تنخواه')
        ordering = ['-date', '-created_at']
        indexes = [models.Index(fields=['company', 'fund']), models.Index(fields=['company', 'status'])]

    def __str__(self):
        return f'{self.number or self.pk} - {self.fund.title} ({self.date})'

    @property
    def total(self):
        """جمع مبالغ سطرها (Decimal؛ بدون خطای گرد کردن)."""
        from decimal import Decimal
        return sum((line.debit or Decimal('0') for line in self.lines.all()), Decimal('0'))

    @property
    def net_total(self):
        from decimal import Decimal
        return sum((line.net_amount if line.net_amount is not None else (line.debit or Decimal('0'))
                    for line in self.lines.all()), Decimal('0'))

    @property
    def tax_total(self):
        from decimal import Decimal
        return sum(((line.vat_amount or Decimal('0')) + (line.tax_amount or Decimal('0'))
                    for line in self.lines.all()), Decimal('0'))

    @property
    def is_editable(self):
        return self.status in (self.Status.DRAFT, self.Status.EDITED, self.Status.REJECTED)

    @property
    def is_settled(self):
        return self.settlements.filter(status__in=('approved', 'posted')).exists()



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
    attachment = models.FileField(upload_to='petty_cash/expense_attachments/%Y/%m/', blank=True, null=True, verbose_name=_('فاکتور / رسید'))
    debit = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ (ریال)'))
    net_amount = models.DecimalField(
        max_digits=18, decimal_places=0, null=True, blank=True,
        verbose_name=_('مبلغ خالص (ریال)'),
        help_text=_('اگر خالی باشد برابر مبلغ کل منهای مالیات و عوارض در نظر گرفته می‌شود.'),
    )
    vat_amount = models.DecimalField(
        max_digits=18, decimal_places=0, default=0, verbose_name=_('مالیات بر ارزش افزوده (ریال)'),
    )
    tax_amount = models.DecimalField(
        max_digits=18, decimal_places=0, default=0, verbose_name=_('سایر مالیات و عوارض (ریال)'),
    )
    category = models.ForeignKey(
        'PettyCashCategory', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='lines', verbose_name=_('دسته‌بندی هزینه'),
    )
    project = models.ForeignKey(
        'projects.Project', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('پروژه'),
    )
    cost_center = models.ForeignKey(
        'accounting.CostCenter', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('مرکز هزینه'),
    )
    contract = models.ForeignKey(
        'contracts.Contract', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('قرارداد'),
    )

    class Meta:
        verbose_name = _('سطر صورت هزینهٔ تنخواه')
        verbose_name_plural = _('سطرهای صورت هزینهٔ تنخواه')
        ordering = ['line_no', 'id']
        indexes = [models.Index(fields=['company', 'invoice_number'])]

    def __str__(self):
        return f'{self.account.code} - {self.debit}'

    @property
    def computed_net(self):
        from decimal import Decimal
        if self.net_amount is not None:
            return self.net_amount
        gross = self.debit or Decimal('0')
        return gross - (self.vat_amount or Decimal('0')) - (self.tax_amount or Decimal('0'))

    @property
    def has_document(self):
        if self.attachment:
            return True
        return self.attachments.exists()



class PettyCashExpenseAttachment(BaseModel):
    """پیوست اضافی هر سطر هزینه (چند فایل برای یک هزینه)."""
    class Kind(models.TextChoices):
        INVOICE = 'invoice', _('فاکتور')
        RECEIPT = 'receipt', _('رسید')
        OTHER = 'other', _('سایر')

    line = models.ForeignKey(
        PettyCashExpenseStatementLine, on_delete=models.CASCADE,
        related_name='attachments', verbose_name=_('سطر هزینه'),
    )
    file = models.FileField(upload_to='petty_cash/expense_attachments/%Y/%m/', verbose_name=_('فایل'))
    title = models.CharField(max_length=200, blank=True, verbose_name=_('عنوان'))
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.INVOICE, verbose_name=_('نوع پیوست'))
    uploaded_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', db_constraint=False, verbose_name=_('بارگذار'),
    )

    class Meta:
        verbose_name = _('پیوست سطر هزینهٔ تنخواه')
        verbose_name_plural = _('پیوست‌های سطر هزینهٔ تنخواه')
        ordering = ['id']
        indexes = [models.Index(fields=['company', 'line'])]

    def __str__(self):
        return self.title or (self.file.name if self.file else str(self.pk))


class PettyCashSettings(BaseModel):
    """تنظیمات و محدودیت‌های ماژول تنخواه (یک رکورد در هر شرکت)."""
    number_prefix = models.CharField(max_length=20, default='PC', verbose_name=_('پیشوند شماره‌گذاری'))
    default_settlement_days = models.PositiveIntegerField(default=30, verbose_name=_('مهلت پیش‌فرض تسویه (روز)'))
    default_limit = models.DecimalField(
        max_digits=18, decimal_places=0, null=True, blank=True,
        verbose_name=_('سقف پیش‌فرض تنخواه (ریال)'),
    )
    max_single_payment = models.DecimalField(
        max_digits=18, decimal_places=0, null=True, blank=True,
        verbose_name=_('سقف هر پرداخت (ریال)'),
        help_text=_('اگر تعیین شود، هیچ پرداخت/هزینه‌ای بیش از این مبلغ پذیرفته نمی‌شود.'),
    )
    require_attachment = models.BooleanField(
        default=False, verbose_name=_('الزام پیوست برای هر سطر هزینه'),
        help_text=_('پیش‌فرض خاموش است تا گردش فعلی متوقف نشود؛ در تنظیمات قابل فعال‌سازی است.'),
    )
    require_invoice_number = models.BooleanField(default=False, verbose_name=_('الزام شمارهٔ فاکتور'))
    enforce_segregation_of_duties = models.BooleanField(
        default=True, verbose_name=_('الزام تفکیک وظایف'),
        help_text=_('ثبت‌کننده/ارسال‌کننده نتواند خودش تأیید یا ثبت نهایی کند.'),
    )
    allow_negative_balance = models.BooleanField(
        default=True, verbose_name=_('اجازهٔ ماندهٔ منفی'),
        help_text=_('پیش‌فرض باز است تا گردش فعلی متوقف نشود؛ با خاموش کردن آن، پرداخت بیش از ماندهٔ تنخواه مسدود می‌شود.'),
    )
    low_balance_alert_ratio = models.DecimalField(
        max_digits=5, decimal_places=2, default=20,
        verbose_name=_('آستانهٔ هشدار ماندهٔ کم (درصد)'),
    )
    payment_methods = models.JSONField(
        default=list, blank=True, verbose_name=_('روش‌های پرداخت مجاز'),
        help_text=_('فهرست کدها؛ خالی = همهٔ روش‌ها مجاز (cash, card, bank_transfer, cheque, other)'),
    )

    class Meta:
        verbose_name = _('تنظیمات تنخواه')
        verbose_name_plural = _('تنظیمات تنخواه')
        constraints = [
            models.UniqueConstraint(fields=['company'], name='uniq_petty_settings_company'),
        ]

    def __str__(self):
        return f'تنظیمات تنخواه ({self.company_id})'


class PettyCashRequest(BaseModel):
    """درخواست تنخواه: وجه، شارژ، افزایش سقف، موردی، مأموریت، تمدید، تغییر تنخواه‌دار، بستن."""
    class Kind(models.TextChoices):
        FUND = 'fund', _('درخواست وجه تنخواه')
        RECHARGE = 'recharge', _('درخواست شارژ مجدد')
        LIMIT_INCREASE = 'limit_increase', _('درخواست افزایش سقف')
        ADHOC = 'adhoc', _('درخواست تنخواه موردی')
        MISSION = 'mission', _('درخواست تنخواه مأموریت')
        EXTEND = 'extend', _('درخواست تمدید مهلت تسویه')
        CUSTODIAN_CHANGE = 'custodian_change', _('درخواست تغییر تنخواه‌دار')
        CLOSE = 'close', _('درخواست بستن/لغو تنخواه')

    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        SUBMITTED = 'submitted', _('در انتظار تأیید')
        APPROVED = 'approved', _('تأییدشده')
        REJECTED = 'rejected', _('ردشده')
        CANCELLED = 'cancelled', _('لغوشده')
        DONE = 'done', _('اجراشده')

    number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره درخواست'))
    kind = models.CharField(max_length=30, choices=Kind.choices, default=Kind.FUND, verbose_name=_('نوع درخواست'))
    fund = models.ForeignKey(
        PettyCashFund, on_delete=models.PROTECT, null=True, blank=True,
        related_name='requests', verbose_name=_('تنخواه'),
    )
    custodian = models.ForeignKey(
        'employees.Employee', on_delete=models.PROTECT, null=True, blank=True,
        related_name='petty_cash_requests', verbose_name=_('تنخواه‌دار'),
    )
    department = models.ForeignKey(
        'employees.Department', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('واحد سازمانی'),
    )
    project = models.ForeignKey(
        'projects.Project', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('پروژه'),
    )
    cost_center = models.ForeignKey(
        'accounting.CostCenter', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('مرکز هزینه'),
    )
    account = models.ForeignKey(
        'accounting.Account', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('سرفصل هزینهٔ پیش‌بینی‌شده'),
    )
    amount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ درخواستی (ریال)'))
    reason = models.TextField(blank=True, verbose_name=_('شرح و علت درخواست'))
    needed_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ موردنیاز'))
    due_date = models.DateField(null=True, blank=True, verbose_name=_('مهلت تسویه'))
    attachment = models.FileField(
        upload_to='petty_cash/requests/%Y/%m/', blank=True, null=True, verbose_name=_('پیوست'),
    )
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    requester = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', db_constraint=False, verbose_name=_('درخواست‌کننده'),
    )
    submitted_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', db_constraint=False, verbose_name=_('ارسال‌کننده'),
    )
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان ارسال'))
    approved_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', db_constraint=False, verbose_name=_('تأییدکننده'),
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان تأیید'))
    decision_note = models.TextField(blank=True, verbose_name=_('نظر تصمیم‌گیرنده'))
    resulting_transaction = models.ForeignKey(
        PettyCashTransaction, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='source_requests', verbose_name=_('تراکنش حاصل'),
    )
    history = models.JSONField(default=list, blank=True, verbose_name=_('تاریخچهٔ چرخه'))

    class Meta:
        verbose_name = _('درخواست تنخواه')
        verbose_name_plural = _('درخواست‌های تنخواه')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['company', 'kind']),
            models.Index(fields=['company', 'fund']),
        ]

    def __str__(self):
        return f'{self.number or self.pk} - {self.get_kind_display()}'


class PettyCashSettlement(BaseModel):
    """تسویهٔ تنخواه — کنترل نقد، کسری/اضافه‌پرداخت، برگشت وجه و محاسبهٔ شارژ مجدد."""
    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        SUBMITTED = 'submitted', _('ارسال برای تأیید')
        APPROVED = 'approved', _('تأییدشده')
        POSTED = 'posted', _('ثبت نهایی')
        REJECTED = 'rejected', _('برگشت‌خورده')

    number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره تسویه'))
    fund = models.ForeignKey(
        PettyCashFund, on_delete=models.PROTECT, related_name='settlements', verbose_name=_('تنخواه'),
    )
    custodian = models.ForeignKey(
        'employees.Employee', on_delete=models.PROTECT, related_name='petty_cash_settlements',
        verbose_name=_('تنخواه‌دار'),
    )
    date = models.DateField(verbose_name=_('تاریخ تسویه'))
    period_from = models.DateField(null=True, blank=True, verbose_name=_('از تاریخ'))
    period_to = models.DateField(null=True, blank=True, verbose_name=_('تا تاریخ'))
    statements = models.ManyToManyField(
        PettyCashExpenseStatement, blank=True, related_name='settlements', verbose_name=_('صورت‌های هزینه'),
    )
    cash_counted = models.DecimalField(
        max_digits=18, decimal_places=0, default=0, verbose_name=_('وجه نقد شمارش‌شده (ریال)'),
    )
    expenses_total = models.DecimalField(
        max_digits=18, decimal_places=0, default=0, verbose_name=_('جمع هزینه‌های تأییدشده (ریال)'),
    )
    rejected_total = models.DecimalField(
        max_digits=18, decimal_places=0, default=0, verbose_name=_('جمع هزینه‌های ردشده (ریال)'),
    )
    returned_amount = models.DecimalField(
        max_digits=18, decimal_places=0, default=0, verbose_name=_('وجه برگشتی به خزانه (ریال)'),
    )
    shortage = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('کسری (ریال)'))
    overage = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('اضافه‌پرداخت (ریال)'))
    recharge_amount = models.DecimalField(
        max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ قابل شارژ مجدد (ریال)'),
    )
    is_full = models.BooleanField(default=True, verbose_name=_('تسویهٔ کامل'))
    notes = models.TextField(blank=True, verbose_name=_('توضیحات و صورت‌جلسه شمارش'))
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    submitted_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', db_constraint=False, verbose_name=_('ارسال‌کننده'),
    )
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان ارسال'))
    approved_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', db_constraint=False, verbose_name=_('تأییدکننده'),
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان تأیید'))
    history = models.JSONField(default=list, blank=True, verbose_name=_('تاریخچهٔ چرخه'))
    source_transaction = models.OneToOneField(
        'accounting.SourceTransaction', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='petty_settlement', verbose_name=_('تراکنش منبع حسابداری'),
    )

    class Meta:
        verbose_name = _('تسویهٔ تنخواه')
        verbose_name_plural = _('تسویه‌های تنخواه')
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['company', 'fund']),
            models.Index(fields=['company', 'status']),
        ]

    def __str__(self):
        return f'{self.number or self.pk} - {self.fund.title if self.fund_id else ""}'

    @property
    def balance_difference(self):
        """اختلاف نقد شمارش‌شده با جمع هزینه‌های تأییدشده (مثبت = اضافه، منفی = کسری)."""
        return (self.cash_counted or 0) - (self.expenses_total or 0)



