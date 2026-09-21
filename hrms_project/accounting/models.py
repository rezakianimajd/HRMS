"""KIAN EBP — Accounting core models.

Design notes:
- Money is always ``DecimalField`` (never float).
- Tenant scoping via ``BaseModel`` (company FK) — do not duplicate.
- ``Branch`` is introduced here (does not exist elsewhere) and is scoped to company.
- ``Currency`` is REUSED from ``settings_app.Currency`` (with ``exchange_rate``).
- Project / WBS / CBS are REUSED from ``projects`` (not recreated).
- Contracts / parties / employees are REUSED from their own apps via FK.
"""
from django.db import models
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


# =============================================================================
# Branch — organization unit that owns ledgers / sequences
# =============================================================================
class Branch(BaseModel):
    """شعبه / واحد حسابداری (زیرمجموعهٔ شرکت)."""
    code = models.CharField(max_length=30, verbose_name=_('کد شعبه'))
    name = models.CharField(max_length=200, verbose_name=_('نام شعبه'))
    manager = models.ForeignKey(
        'employees.Employee', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='accounting_branches', verbose_name=_('مدیر شعبه'),
    )
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('شعبه')
        verbose_name_plural = _('شعبه‌ها')
        unique_together = [('company', 'code')]
        ordering = ['code']

    def __str__(self):
        return f'{self.code} - {self.name}'


# =============================================================================
# Fiscal year & period
# =============================================================================
class FiscalYear(BaseModel):
    """سال مالی."""
    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        OPEN = 'open', _('باز')
        CLOSED = 'closed', _('بسته')
        LOCKED = 'locked', _('قفل‌شده')

    name = models.CharField(max_length=100, verbose_name=_('عنوان سال مالی'))
    start_date = models.DateField(verbose_name=_('تاریخ شروع'))
    end_date = models.DateField(verbose_name=_('تاریخ پایان'))
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    is_current = models.BooleanField(default=False, verbose_name=_('سال جاری'))

    class Meta:
        verbose_name = _('سال مالی')
        verbose_name_plural = _('سال‌های مالی')
        ordering = ['-start_date']
        constraints = [
            models.CheckConstraint(check=~models.Q(start_date__gt=models.F('end_date')), name='accounting_fy_dates'),
        ]

    def __str__(self):
        return self.name


class FiscalPeriod(BaseModel):
    """دورهٔ مالی (ماه/سهماههٔ یک سال مالی)."""
    class Status(models.TextChoices):
        OPEN = 'open', _('باز')
        CLOSED = 'closed', _('بسته')
        LOCKED = 'locked', _('قفل‌شده')

    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='periods', verbose_name=_('سال مالی'))
    code = models.CharField(max_length=20, verbose_name=_('کد دوره'))
    start_date = models.DateField(verbose_name=_('تاریخ شروع'))
    end_date = models.DateField(verbose_name=_('تاریخ پایان'))
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN, verbose_name=_('وضعیت'))

    class Meta:
        verbose_name = _('دورهٔ مالی')
        verbose_name_plural = _('دوره‌های مالی')
        ordering = ['start_date']
        constraints = [
            models.UniqueConstraint(fields=['fiscal_year', 'code'], name='uniq_period_code'),
            models.CheckConstraint(check=~models.Q(start_date__gt=models.F('end_date')), name='accounting_period_dates'),
        ]

    def __str__(self):
        return f'{self.fiscal_year.name} / {self.code}'


class AccountingBook(BaseModel):
    """دفتر حسابداری / سرفصل‌های مجزا (اختیاری)."""
    code = models.CharField(max_length=30, verbose_name=_('کد دفتر'))
    name = models.CharField(max_length=150, verbose_name=_('نام دفتر'))
    currency = models.ForeignKey(
        'settings_app.Currency', on_delete=models.PROTECT, null=True, blank=True,
        related_name='accounting_books', verbose_name=_('ارز دفتر'),
    )
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('دفتر حسابداری')
        verbose_name_plural = _('دفاتر حسابداری')
        unique_together = [('company', 'code')]
        ordering = ['code']

    def __str__(self):
        return self.name


# =============================================================================
# Chart of accounts — AccountType, AccountGroup, Account
# =============================================================================
class AccountType(BaseModel):
    """نوع حساب: دارایی/بدهی/حقوق/درآمد/بهای تمام‌شده/هزینه/خارج از تراز."""
    class Category(models.TextChoices):
        ASSET = 'asset', _('دارایی')
        LIABILITY = 'liability', _('بدهی')
        EQUITY = 'equity', _('حقوق مالکانه')
        REVENUE = 'revenue', _('درآمد')
        COST_OF_SALES = 'cost_of_sales', _('بهای تمام‌شده')
        EXPENSE = 'expense', _('هزینه')
        MEMORANDUM = 'memorandum', _('حساب‌های انتظامی')

    class Nature(models.TextChoices):
        DEBIT = 'debit', _('بدهکار')
        CREDIT = 'credit', _('بستانکار')
        NONE = 'none', _('مهم نیست')

    code = models.CharField(max_length=20, verbose_name=_('کد'))
    name = models.CharField(max_length=100, verbose_name=_('عنوان'))
    category = models.CharField(max_length=20, choices=Category.choices, verbose_name=_('طبقه'))
    default_nature = models.CharField(max_length=10, choices=Nature.choices, default=Nature.NONE, verbose_name=_('ماهیت پیش‌فرض'))
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name=_('ترتیب نمایش'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('نوع حساب')
        verbose_name_plural = _('انواع حساب')
        unique_together = [('company', 'code')]
        ordering = ['sort_order', 'code']

    def __str__(self):
        return self.name


class AccountGroup(BaseModel):
    """گروه حساب — سطح میانی چارت حساب بین نوع و سرحساب."""
    class Nature(models.TextChoices):
        DEBIT = 'debit', _('بدهکار')
        CREDIT = 'credit', _('بستانکار')
        NONE = 'none', _('مهم نیست')

    account_type = models.ForeignKey(AccountType, on_delete=models.PROTECT, related_name='groups', verbose_name=_('نوع حساب'))
    code = models.CharField(max_length=20, verbose_name=_('کد'))
    name = models.CharField(max_length=150, verbose_name=_('عنوان'))
    nature = models.CharField(max_length=10, choices=Nature.choices, default=Nature.NONE, verbose_name=_('ماهیت'))
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children', verbose_name=_('گروه بالادستی'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('گروه حساب')
        verbose_name_plural = _('گروه‌های حساب')
        unique_together = [('company', 'code')]
        ordering = ['code']

    def __str__(self):
        return self.name


class Account(BaseModel):
    """سرحساب / حساب — سلسله‌مراتب نامحدود با parent (خودارجاع)."""
    class Nature(models.TextChoices):
        DEBIT = 'debit', _('بدهکار')
        CREDIT = 'credit', _('بستانکار')
        NONE = 'none', _('مهم نیست')

    class CurrencyBehavior(models.TextChoices):
        BASE = 'base', _('فقط ارز پایه')
        MULTI = 'multi', _('چندارزی')
        SPECIFIC = 'specific', _('ارز مشخص')

    code = models.CharField(max_length=50, verbose_name=_('کد حساب'))
    name = models.CharField(max_length=200, verbose_name=_('نام حساب'))
    account_type = models.ForeignKey(AccountType, on_delete=models.PROTECT, related_name='accounts', verbose_name=_('نوع حساب'))
    group = models.ForeignKey(AccountGroup, on_delete=models.SET_NULL, null=True, blank=True, related_name='accounts', verbose_name=_('گروه'))
    parent = models.ForeignKey('self', on_delete=models.PROTECT, null=True, blank=True, related_name='children', verbose_name=_('حساب بالادستی'))
    level = models.PositiveIntegerField(default=1, verbose_name=_('سطح'))
    nature = models.CharField(max_length=10, choices=Nature.choices, default=Nature.DEBIT, verbose_name=_('ماهیت'))
    currency_behavior = models.CharField(max_length=10, choices=CurrencyBehavior.choices, default=CurrencyBehavior.BASE, verbose_name=_('رفتار ارزی'))
    specific_currency = models.ForeignKey(
        'settings_app.Currency', on_delete=models.PROTECT, null=True, blank=True,
        related_name='accounts', verbose_name=_('ارز مشخص'),
    )
    is_postable = models.BooleanField(default=True, verbose_name=_('قابل سندخور'))
    is_reconcilable = models.BooleanField(default=False, verbose_name=_('قابل مغایرت‌گیری'))
    is_bank_cash = models.BooleanField(default=False, verbose_name=_('بانکی/صندوق'))
    requires_cost_center = models.BooleanField(default=False, verbose_name=_('نیازمند مرکز هزینه'))
    requires_project = models.BooleanField(default=False, verbose_name=_('نیازمند پروژه'))
    requires_contract = models.BooleanField(default=False, verbose_name=_('نیازمند قرارداد'))
    requires_party = models.BooleanField(default=False, verbose_name=_('نیازمند طرف حساب'))
    requires_employee = models.BooleanField(default=False, verbose_name=_('نیازمند پرسنل'))
    auxiliary_category_1 = models.ForeignKey(
        'AuxiliaryCategory', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='accounts_cat1', verbose_name=_('ارتباط با تفصیل یک'),
    )
    auxiliary_category_2 = models.ForeignKey(
        'AuxiliaryCategory', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='accounts_cat2', verbose_name=_('ارتباط با تفصیل دو'),
    )
    auxiliary_category_3 = models.ForeignKey(
        'AuxiliaryCategory', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='accounts_cat3', verbose_name=_('ارتباط با تفصیل سه'),
    )
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('حساب')
        verbose_name_plural = _('حساب‌ها')
        unique_together = [('company', 'code')]
        ordering = ['code']
        indexes = [models.Index(fields=['company', 'account_type'])]

    def __str__(self):
        return f'{self.code} - {self.name}'

    @property
    def full_code(self):
        """کد ترکیبی با پیمایش والدین (اختیاری برای نمایش)."""
        parts = []
        node = self
        while node:
            parts.append(node.code)
            node = node.parent
        return ' / '.join(reversed(parts))


# =============================================================================
# Auxiliary / Detailed account engine
# =============================================================================
class AuxiliaryCategory(BaseModel):
    """دسته‌بندی حساب تفصیلی (شناور): پرسنل، اشخاص حقیقی/حقوقی، پروژه، قرارداد، بانک، صندوق و ..."""
    class Source(models.TextChoices):
        MANUAL = 'manual', _('دستی')
        EMPLOYEE = 'employee', _('پرسنل')
        PARTY = 'party', _('طرف حساب')
        PROJECT = 'project', _('پروژه')
        CONTRACT = 'contract', _('قرارداد')
        BANK = 'bank', _('بانک')
        CASH = 'cash', _('صندوق')

    code = models.CharField(max_length=30, verbose_name=_('کد دسته'))
    name = models.CharField(max_length=150, verbose_name=_('عنوان دسته'))
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.MANUAL, verbose_name=_('منبع داده'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name=_('ترتیب'))

    class Meta:
        verbose_name = _('دسته‌بندی تفصیلی')
        verbose_name_plural = _('دسته‌بندی‌های تفصیلی')
        unique_together = [('company', 'code')]
        ordering = ['sort_order', 'code']

    def __str__(self):
        return self.name


class AuxiliaryAccount(BaseModel):
    """حساب تفصیلی — موجودیت تحلیلی (مشتری/تأمین‌کننده/پرسنل/پروژه/قرارداد/بانک/صندوق/سایر)."""
    class AuxType(models.TextChoices):
        PARTY = 'party', _('طرف حساب')
        CUSTOMER = 'customer', _('مشتری')
        SUPPLIER = 'supplier', _('تأمین‌کننده')
        CONTRACTOR = 'contractor', _('پیمانکار')
        EMPLOYEE = 'employee', _('پرسنل')
        BANK = 'bank', _('بانک')
        CASH = 'cash', _('صندوق')
        PROJECT = 'project', _('پروژه')
        CONTRACT = 'contract', _('قرارداد')
        OTHER = 'other', _('سایر')

    code = models.CharField(max_length=50, verbose_name=_('کد تفصیلی'))
    name = models.CharField(max_length=200, verbose_name=_('نام تفصیلی'))
    aux_type = models.CharField(max_length=20, choices=AuxType.choices, default=AuxType.OTHER, verbose_name=_('نوع تفصیلی'))
    category = models.ForeignKey(AuxiliaryCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='auxiliaries', verbose_name=_('دسته‌بندی'))
    account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True, related_name='auxiliaries', verbose_name=_('حساب مرتبط'))
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='children', verbose_name=_('تفصیلی بالادستی'),
    )

    # مرجع اختیاری به موجودیت‌های ماژول‌های دیگر (بدون تکرار مدل‌ها):
    party = models.ForeignKey('contracts.ContractParty', on_delete=models.SET_NULL, null=True, blank=True, related_name='auxiliary_accounts', verbose_name=_('طرف قرارداد'))
    employee = models.ForeignKey('employees.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='auxiliary_accounts', verbose_name=_('پرسنل'))
    project = models.ForeignKey('projects.Project', on_delete=models.SET_NULL, null=True, blank=True, related_name='auxiliary_accounts', verbose_name=_('پروژه'))
    contract = models.ForeignKey('contracts.Contract', on_delete=models.SET_NULL, null=True, blank=True, related_name='auxiliary_accounts', verbose_name=_('قرارداد'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('حساب تفصیلی')
        verbose_name_plural = _('حساب‌های تفصیلی')
        unique_together = [('company', 'code')]
        ordering = ['code']
        indexes = [models.Index(fields=['account', 'aux_type']), models.Index(fields=['parent'])]

    def __str__(self):
        return f'{self.code} - {self.name}'


# =============================================================================
# Dimensions — generic analytical axes
# =============================================================================
class AccountingDimension(BaseModel):
    """بُعد مالی (نمونه: مرکز هزینه، پروژه، قرارداد، پرسنل، طرف حساب)."""
    code = models.CharField(max_length=30, verbose_name=_('کد بُعد'))
    name = models.CharField(max_length=150, verbose_name=_('نام بُعد'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('بُعد مالی')
        verbose_name_plural = _('ابعاد مالی')
        unique_together = [('company', 'code')]
        ordering = ['code']

    def __str__(self):
        return self.name


class DimensionValue(BaseModel):
    """مقدار یک بُعد مالی برای یک سند/خط (link به موجودیت واقعی از طریق object_id)."""
    dimension = models.ForeignKey(AccountingDimension, on_delete=models.CASCADE, related_name='values', verbose_name=_('بُعد'))
    code = models.CharField(max_length=50, verbose_name=_('کد مقدار'))
    name = models.CharField(max_length=200, verbose_name=_('نام مقدار'))
    object_id = models.CharField(max_length=64, null=True, blank=True, verbose_name=_('شناسهٔ موجودیت مرجع'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('مقدار بُعد')
        verbose_name_plural = _('مقادیر ابعاد')
        unique_together = [('dimension', 'code')]
        ordering = ['dimension', 'code']

    def __str__(self):
        return f'{self.dimension.name} : {self.name}'


class CostCenter(BaseModel):
    """مرکز هزینه — سلسله‌مراتب نامحدود (parent خودارجاع)."""
    code = models.CharField(max_length=30, verbose_name=_('کد مرکز هزینه'))
    name = models.CharField(max_length=200, verbose_name=_('نام مرکز هزینه'))
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children', verbose_name=_('مرکز بالادستی'))
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='cost_centers', verbose_name=_('شعبه'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('مرکز هزینه')
        verbose_name_plural = _('مراکز هزینه')
        unique_together = [('company', 'code')]
        ordering = ['code']

    def __str__(self):
        return f'{self.code} - {self.name}'


# =============================================================================
# Journal & Accounting document (سند حسابداری)
# =============================================================================
class Journal(BaseModel):
    """دفتر روزنامه (دستی/اتوماتیک/افتتاحیه/اختتامیه/اصلاحی/برگشتی/انتقالی)."""
    class JournalType(models.TextChoices):
        MANUAL = 'manual', _('دستی')
        AUTOMATIC = 'automatic', _('اتوماتیک')
        OPENING = 'opening', _('افتتاحیه')
        CLOSING = 'closing', _('اختتامیه')
        ADJUSTMENT = 'adjustment', _('اصلاحی')
        REVERSAL = 'reversal', _('برگشتی')
        TRANSFER = 'transfer', _('انتقالی')

    code = models.CharField(max_length=30, verbose_name=_('کد روزنامه'))
    name = models.CharField(max_length=150, verbose_name=_('نام روزنامه'))
    journal_type = models.CharField(max_length=15, choices=JournalType.choices, default=JournalType.MANUAL, verbose_name=_('نوع روزنامه'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('دفتر روزنامه')
        verbose_name_plural = _('دفاتر روزنامه')
        unique_together = [('company', 'code')]
        ordering = ['code']

    def __str__(self):
        return self.name


class AccountingDocument(BaseModel):
    """سند حسابداری — هدر سند.

    شرکت از طریق BaseModel تأمین می‌شود (company FK)؛ اینجا دوباره تعریف نمی‌شود.
    """
    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        SUBMITTED = 'submitted', _('در انتظار تأیید')
        APPROVED = 'approved', _('تأییدشده')
        POSTED = 'posted', _('ثبت‌شده')
        LOCKED = 'locked', _('قفل‌شده')
        REVERSED = 'reversed', _('برگشت‌خورده')

    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, null=True, blank=True, related_name='documents', verbose_name=_('شعبه'))
    journal = models.ForeignKey(Journal, on_delete=models.PROTECT, null=True, blank=True, related_name='documents', verbose_name=_('دفتر روزنامه'))
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.PROTECT, null=True, blank=True, related_name='documents', verbose_name=_('سال مالی'))
    period = models.ForeignKey(FiscalPeriod, on_delete=models.PROTECT, null=True, blank=True, related_name='documents', verbose_name=_('دوره'))
    number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره سند'))
    date = models.DateField(verbose_name=_('تاریخ سند'))
    description = models.TextField(blank=True, verbose_name=_('شرح سند'))
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    source_module = models.CharField(max_length=50, blank=True, verbose_name=_('ماژول منبع'))
    source_type = models.CharField(max_length=50, blank=True, verbose_name=_('نوع منبع'))
    source_id = models.CharField(max_length=64, blank=True, verbose_name=_('شناسهٔ منبع'))
    is_locked = models.BooleanField(default=False, verbose_name=_('قفل ویرایش'))
    history = models.JSONField(default=list, blank=True, verbose_name=_('تاریخچهٔ چرخه'))
    # Who / when
    created_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('ایجادکننده'))
    submitted_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('ارسال‌کننده'))
    approved_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('تأییدکننده'))
    posted_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('ثبت‌کننده'))
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان ارسال'))
    posted_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان ثبت'))
    reversed_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='reversals', verbose_name=_('سند برگشتی از'))

    class Meta:
        verbose_name = _('سند حسابداری')
        verbose_name_plural = _('اسناد حسابداری')
        ordering = ['-date', '-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['source_module', 'source_id'],
                condition=~models.Q(source_id=''),
                name='uniq_source_doc',
            ),
        ]
        indexes = [
            models.Index(fields=['company', 'journal', 'date']),
            models.Index(fields=['company', 'status']),
        ]

    def __str__(self):
        return f'{self.number or self.pk} - {self.date}'

    # ---- مالی ----
    @property
    def total_debit(self):
        return sum(float(l.debit or 0) for l in self.lines.all())

    @property
    def total_credit(self):
        return sum(float(l.credit or 0) for l in self.lines.all())

    @property
    def is_balanced(self):
        return self.total_debit == self.total_credit


class AccountingDocumentLine(BaseModel):
    """سطر سند حسابداری."""
    document = models.ForeignKey(AccountingDocument, on_delete=models.CASCADE, related_name='lines', verbose_name=_('سند'))
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='lines', verbose_name=_('حساب'))
    auxiliary = models.ForeignKey(AuxiliaryAccount, on_delete=models.SET_NULL, null=True, blank=True, related_name='lines', verbose_name=_('تفصیلی'))
    auxiliary_1 = models.ForeignKey(AuxiliaryAccount, on_delete=models.SET_NULL, null=True, blank=True, related_name='lines_1', verbose_name=_('تفصیل یک'))
    auxiliary_2 = models.ForeignKey(AuxiliaryAccount, on_delete=models.SET_NULL, null=True, blank=True, related_name='lines_2', verbose_name=_('تفصیل دو'))
    auxiliary_3 = models.ForeignKey(AuxiliaryAccount, on_delete=models.SET_NULL, null=True, blank=True, related_name='lines_3', verbose_name=_('تفصیل سه'))
    maturity_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ (سررسید)'))
    line_no = models.PositiveIntegerField(default=0, verbose_name=_('ردیف'))
    description = models.TextField(blank=True, verbose_name=_('شرح سطر'))
    debit = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('بدهکار'))
    credit = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('بستانکار'))
    currency = models.ForeignKey(
        'settings_app.Currency', on_delete=models.PROTECT, null=True, blank=True,
        related_name='accounting_lines', verbose_name=_('ارز'),
    )
    exchange_rate = models.DecimalField(max_digits=18, decimal_places=6, default=1, verbose_name=_('نرخ ارز'))
    base_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('مبلغ ارز پایه'))
    reference = models.CharField(max_length=100, blank=True, verbose_name=_('ارجاع'))

    # ابعاد تحلیلی (FK به موجودیت‌های واقعی، بدون تکرار مدل):
    cost_center = models.ForeignKey(CostCenter, on_delete=models.SET_NULL, null=True, blank=True, related_name='lines', verbose_name=_('مرکز هزینه'))
    project = models.ForeignKey('projects.Project', on_delete=models.SET_NULL, null=True, blank=True, related_name='accounting_lines', verbose_name=_('پروژه'))
    contract = models.ForeignKey('contracts.Contract', on_delete=models.SET_NULL, null=True, blank=True, related_name='accounting_lines', verbose_name=_('قرارداد'))
    employee = models.ForeignKey('employees.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='accounting_lines', verbose_name=_('پرسنل'))

    class Meta:
        verbose_name = _('سطر سند حسابداری')
        verbose_name_plural = _('سطرهای سند حسابداری')
        ordering = ['line_no', 'id']

    def __str__(self):
        return f'{self.account.code} <- {self.debit or self.credit}'


class AccountingDocumentDimension(BaseModel):
    """پیوند سند/سطر به مقادیر ابعاد مالی (generic)."""
    document = models.ForeignKey(AccountingDocument, on_delete=models.CASCADE, related_name='dimensions', verbose_name=_('سند'))
    dimension = models.ForeignKey(AccountingDimension, on_delete=models.CASCADE, related_name='document_dimensions', verbose_name=_('بُعد'))
    value = models.ForeignKey(DimensionValue, on_delete=models.CASCADE, related_name='document_dimensions', verbose_name=_('مقدار'))

    class Meta:
        verbose_name = _('بُعد سند حسابداری')
        verbose_name_plural = _('ابعاد اسناد حسابداری')
        unique_together = [('document', 'dimension')]

    def __str__(self):
        return f'{self.dimension.name}: {self.value.name}'


# =============================================================================
# Sequence — configurable document numbering
# =============================================================================
class AccountingSequence(BaseModel):
    """شماره‌گذاری پیکربندی‌شدهٔ اسناد."""
    journal = models.ForeignKey(Journal, on_delete=models.CASCADE, related_name='sequences', verbose_name=_('دفتر روزنامه'))
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='sequences', verbose_name=_('سال مالی'))
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, null=True, blank=True, related_name='sequences', verbose_name=_('شعبه'))
    prefix = models.CharField(max_length=30, blank=True, verbose_name=_('پیشوند'))
    next_number = models.PositiveIntegerField(default=1, verbose_name=_('شمارهٔ بعدی'))
    padding = models.PositiveIntegerField(default=5, verbose_name=_('تعداد ارقام'))

    class Meta:
        verbose_name = _('شماره‌گذاری سند')
        verbose_name_plural = _('شماره‌گذاری اسناد')
        unique_together = [('journal', 'fiscal_year', 'branch')]

    def __str__(self):
        return f'{self.journal.name} / {self.fiscal_year.name}'


# =============================================================================
# Source transaction & posting
# =============================================================================
class SourceTransaction(BaseModel):
    """تراکنش منبع — رکورد ورودی از یک ماژول دیگر به موتور حسابداری."""
    source_module = models.CharField(max_length=50, verbose_name=_('ماژول منبع'))
    source_type = models.CharField(max_length=50, verbose_name=_('نوع منبع'))
    source_id = models.CharField(max_length=64, verbose_name=_('شناسهٔ منبع'))
    payload = models.JSONField(default=dict, verbose_name=_('دادهٔ تراکنش'))
    status = models.CharField(
        max_length=20,
        choices=[('pending', 'در انتظار'), ('processed', 'انجام‌شده'), ('failed', 'خطا'), ('duplicate', 'تکراری')],
        default='pending', verbose_name=_('وضعیت'),
    )
    error_message = models.TextField(blank=True, verbose_name=_('پیام خطا'))

    class Meta:
        verbose_name = _('تراکنش منبع')
        verbose_name_plural = _('تراکنش‌های منبع')
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['source_module', 'source_id'], name='uniq_source_tx'),
        ]
        indexes = [models.Index(fields=['source_module', 'status'])]

    def __str__(self):
        return f'{self.source_module}:{self.source_type}:{self.source_id}'


class PostingBatch(BaseModel):
    """یک بچ ثبت — گروهی از اسناد اتوماتیک تولیدشده در یک عملیات."""
    source_transaction = models.ForeignKey(SourceTransaction, on_delete=models.CASCADE, related_name='batches', verbose_name=_('تراکنش منبع'))
    posted_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان ثبت'))

    class Meta:
        verbose_name = _('بچ ثبت')
        verbose_name_plural = _('بچ‌های ثبت')
        ordering = ['-created_at']


class PostingTemplate(BaseModel):
    """قالب ثبت حسابداری — نگاشت تراکنش منبع به آرتیکل‌ها."""
    code = models.CharField(max_length=50, verbose_name=_('کد قالب'))
    name = models.CharField(max_length=200, verbose_name=_('نام قالب'))
    journal = models.ForeignKey(
        'accounting.Journal', on_delete=models.PROTECT, null=True, blank=True,
        related_name='posting_templates', verbose_name=_('دفتر روزنامه پیش‌فرض'),
    )
    source_module = models.CharField(max_length=50, verbose_name=_('ماژول منبع'))
    source_type = models.CharField(max_length=50, blank=True, verbose_name=_('نوع منبع'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))
    description_template = models.JSONField(default=list, blank=True, verbose_name=_('الگوی شرح سند'))

    DESCRIPTION_TOKENS = [
        ('invoice_number', 'شماره فاکتور'),
        ('supplier', 'فروشنده'),
        ('expense_date', 'تاریخ هزینه'),
        ('description', 'شرح هزینه'),
        ('account_code', 'کد معین'),
        ('account_name', 'نام معین'),
        ('aux1', 'تفصیل ۱'),
        ('aux2', 'تفصیل ۲'),
        ('aux3', 'تفصیل ۳'),
        ('fund', 'نام تنخواه'),
        ('custodian', 'تنخواه‌دار'),
    ]

    class Meta:
        verbose_name = _('قالب ثبت')
        verbose_name_plural = _('قالب‌های ثبت')
        unique_together = [('company', 'code')]
        ordering = ['code']

    def __str__(self):
        return self.name


class PostingTemplateLine(BaseModel):
    """خط قالب ثبت — یک بدهکار/بستانکار در قالب."""
    template = models.ForeignKey(PostingTemplate, on_delete=models.CASCADE, related_name='lines', verbose_name=_('قالب'))
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='posting_template_lines', verbose_name=_('حساب'))
    side = models.CharField(max_length=10, choices=[('debit', 'بدهکار'), ('credit', 'بستانکار')], verbose_name=_('طرف'))
    amount_expression = models.CharField(max_length=100, blank=True, verbose_name=_('عبارت مبلغ'), help_text=_('کلید از payload منبع، مثلاً gross_amount'))
    default_dimension = models.JSONField(default=dict, blank=True, verbose_name=_('ابعاد پیش‌فرض'))
    line_no = models.PositiveIntegerField(default=0, verbose_name=_('ردیف'))

    class Meta:
        verbose_name = _('خط قالب ثبت')
        verbose_name_plural = _('خطوط قالب‌های ثبت')
        ordering = ['line_no']

    def __str__(self):
        return f'{self.template.code} :: {self.account.code} ({self.side})'


# =============================================================================
# Accounting settings (per company, singleton)
# =============================================================================
class CodingConfig(BaseModel):
    """پیکربندی کدینگ — بازهٔ عددی برای هر سطح کدینگ.

    هر سطح (نوع حساب، گروه، کل، معین، تفصیلی، مرکز هزینه) می‌تواند پیشوند
    دلخواه و بازهٔ شروع/پایان و حداقل طول داشته باشد تا کد بعدی داخل همان
    بازه پیشنهاد شود.
    """
    class Level(models.TextChoices):
        ACCOUNT_TYPE = 'account_type', _('نوع حساب')
        GROUP = 'group', _('گروه حساب')
        GENERAL = 'general', _('حساب کل')
        SUBSIDIARY = 'subsidiary', _('حساب معین')
        AUXILIARY = 'auxiliary', _('حساب تفصیلی')
        COST_CENTER = 'cost_center', _('مرکز هزینه')

    level = models.CharField(max_length=20, choices=Level.choices, verbose_name=_('سطح کدینگ'))
    prefix = models.CharField(max_length=20, blank=True, verbose_name=_('پیشوند کد'))
    start_number = models.PositiveIntegerField(default=1, verbose_name=_('شروع از'))
    end_number = models.PositiveIntegerField(default=99, verbose_name=_('پایان تا'))
    min_length = models.PositiveSmallIntegerField(default=1, verbose_name=_('حداقل طول'))
    max_length = models.PositiveSmallIntegerField(default=10, verbose_name=_('حداکثر طول'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('پیکربندی کدینگ')
        verbose_name_plural = _('پیکربندی کدینگ')
        unique_together = [('company', 'level')]
        ordering = ['level']

    def __str__(self):
        return f'{self.get_level_display()} ({self.prefix}{self.start_number}..{self.prefix}{self.end_number})'


class AccountingSettings(BaseModel):
    """تنظیمات حسابداری (یک رکورد به ازای هر شرکت)."""
    base_currency = models.ForeignKey(
        'settings_app.Currency', on_delete=models.PROTECT, related_name='accounting_settings_as_base',
        verbose_name=_('ارز پایه'),
    )
    default_branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('شعبهٔ پیش‌فرض'))
    requires_approval = models.BooleanField(default=True, verbose_name=_('نیازمند تأیید قبل از ثبت'))
    allow_edit_posted = models.BooleanField(default=False, verbose_name=_('اجازهٔ ویرایش سند ثبت‌شده'))
    profit_loss_account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('حساب سود و زیان جاری'))

    class Meta:
        verbose_name = _('تنظیمات حسابداری')
        verbose_name_plural = _('تنظیمات حسابداری')
        constraints = [
            models.UniqueConstraint(fields=['company'], name='uniq_acct_settings_per_company'),
        ]

    def __str__(self):
        return f'تنظیمات حسابداری ({self.company_id})'