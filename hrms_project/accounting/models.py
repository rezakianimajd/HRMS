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
from accounting.text_normalization import PersianNormalizedMixin


# =============================================================================
# Branch — organization unit that owns ledgers / sequences
# =============================================================================

class AccountingBaseModel(PersianNormalizedMixin, BaseModel):
    """پایهٔ مدل‌های حسابداری — متن‌ها پیش از ذخیره یکسان‌سازی می‌شوند (ي/ك → ی/ک)."""

    class Meta:
        abstract = True


class Branch(AccountingBaseModel):
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
class FiscalYear(AccountingBaseModel):
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


class FiscalPeriod(AccountingBaseModel):
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


class AccountingBook(AccountingBaseModel):
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
class AccountType(AccountingBaseModel):
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


class AccountGroup(AccountingBaseModel):
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
    coding_locked = models.BooleanField(
        default=False,
        verbose_name=_('کدینگ دستی (قفل)'),
        help_text=_('نوع/ماهیت این گروه دستی تعیین شده و ابزار اصلاح خودکار نباید آن را تغییر دهد.'),
    )
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('گروه حساب')
        verbose_name_plural = _('گروه‌های حساب')
        unique_together = [('company', 'code')]
        ordering = ['code']

    def __str__(self):
        return self.name


class Account(AccountingBaseModel):
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
    coding_locked = models.BooleanField(
        default=False,
        verbose_name=_('کدینگ دستی (قفل)'),
        help_text=_('نوع/ماهیت این حساب دستی تعیین شده و ابزار اصلاح خودکار نباید آن را تغییر دهد.'),
    )
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
class AuxiliaryCategory(AccountingBaseModel):
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


class AuxiliaryAccount(AccountingBaseModel):
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
    supplier = models.ForeignKey('procurement.Supplier', on_delete=models.SET_NULL, null=True, blank=True, related_name='auxiliary_accounts', verbose_name=_('تأمین‌کننده'))
    treasury_entity = models.ForeignKey('treasury.TreasuryEntity', on_delete=models.SET_NULL, null=True, blank=True, related_name='auxiliary_accounts', verbose_name=_('بانک/صندوق'))
    person_type = models.CharField(max_length=10, choices=[('legal', _('شخص حقوقی')), ('natural', _('شخص حقیقی'))], null=True, blank=True, verbose_name=_('نوع شخص'))
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
class AccountingDimension(AccountingBaseModel):
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


class DimensionValue(AccountingBaseModel):
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


class CostCenter(AccountingBaseModel):
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
class Journal(AccountingBaseModel):
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


class AccountingDocument(AccountingBaseModel):
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
    reference = models.CharField(max_length=100, blank=True, verbose_name=_('شماره عطف'))
    date = models.DateField(verbose_name=_('تاریخ سند'))
    description = models.TextField(blank=True, verbose_name=_('شرح سند'))
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    source_module = models.CharField(max_length=50, blank=True, default='', verbose_name=_('ماژول منبع'))
    source_type = models.CharField(max_length=50, blank=True, default='', verbose_name=_('نوع منبع'))
    source_id = models.CharField(max_length=64, blank=True, default='', verbose_name=_('شناسهٔ منبع'))
    is_locked = models.BooleanField(default=False, verbose_name=_('قفل ویرایش'))
    history = models.JSONField(default=list, blank=True, verbose_name=_('تاریخچهٔ چرخه'))
    issues = models.JSONField(default=list, blank=True, verbose_name=_('نواقص سند (چک‌لیست رفع نواقص)'))
    # Who / when
    created_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', db_constraint=False, verbose_name=_('ایجادکننده'))
    submitted_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', db_constraint=False, verbose_name=_('ارسال‌کننده'))
    approved_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', db_constraint=False, verbose_name=_('تأییدکننده'))
    posted_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', db_constraint=False, verbose_name=_('ثبت‌کننده'))
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

    # ---- نواقص سند (چک‌لیست رفع نواقص) ----
    @property
    def issues_count(self):
        return len(self.issues or [])

    @property
    def open_issues_count(self):
        """تعداد نواقصِ رفع‌نشده — مبنای آلارم قرمز در لیست اسناد."""
        return sum(1 for i in (self.issues or []) if not i.get('done'))


class AccountingDocumentLine(AccountingBaseModel):
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

    # --- ارزش افزوده و صورت معاملات فصلی (ماده 169 مکرر) ---
    vat_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name=_('نرخ ارزش افزوده (٪)'))
    vat_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('مبلغ ارزش افزوده'))
    invoice_number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره فاکتور'))
    invoice_type = models.CharField(
        max_length=20,
        choices=[
            ('sale', 'فروش کالا / خدمات'),
            ('purchase', 'خرید کالا / خدمات'),
            ('import', 'واردات'),
            ('export', 'صادرات'),
            ('service', 'قرارداد خدمت'),
            ('none', 'نامشخص'),
        ],
        default='none', verbose_name=_('نوع معامله'),
    )
    party_tax_id = models.CharField(max_length=20, blank=True, verbose_name=_('شماره اقتصادی طرف معامله'))
    party_national_id = models.CharField(max_length=20, blank=True, verbose_name=_('شناسه ملی / کد ملی طرف'))
    party_postal_code = models.CharField(max_length=10, blank=True, verbose_name=_('کد پستی طرف'))
    season_flag = models.BooleanField(default=False, verbose_name=_('مشمول معاملات فصلی'))

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


class AccountingDocumentDimension(AccountingBaseModel):
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
class AccountingSequence(AccountingBaseModel):
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
class SourceTransaction(AccountingBaseModel):
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


class PostingBatch(AccountingBaseModel):
    """یک بچ ثبت — گروهی از اسناد اتوماتیک تولیدشده در یک عملیات."""
    source_transaction = models.ForeignKey(SourceTransaction, on_delete=models.CASCADE, related_name='batches', verbose_name=_('تراکنش منبع'))
    posted_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان ثبت'))

    class Meta:
        verbose_name = _('بچ ثبت')
        verbose_name_plural = _('بچ‌های ثبت')
        ordering = ['-created_at']


class PostingTemplate(AccountingBaseModel):
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


class PostingTemplateLine(AccountingBaseModel):
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
# Approval workflow (گردشکار تأیید چندمرحله‌ای)
# =============================================================================
class ApprovalPolicy(AccountingBaseModel):
    """سیاست تأیید سند با سقف مبلغی برای چندمرحله‌ای شدن."""
    name = models.CharField(max_length=100, verbose_name=_('عنوان سیاست'))
    single_level_limit = models.DecimalField(max_digits=18, decimal_places=0, default=50000000, verbose_name=_('سقف تأیید تک‌مرحله (ریال)'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('سیاست تأیید اسناد')
        verbose_name_plural = _('سیاست‌های تأیید اسناد')

    def __str__(self):
        return self.name


class ApprovalStep(AccountingBaseModel):
    """یک مرحلهٔ تأیید در گردشکار سند."""
    class Decision(models.TextChoices):
        PENDING = 'pending', _('در انتظار')
        APPROVED = 'approved', _('تأیید')
        REJECTED = 'rejected', _('رد')

    document = models.ForeignKey(
        AccountingDocument, on_delete=models.CASCADE, related_name='approval_steps',
        verbose_name=_('سند'),
    )
    approver = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', db_constraint=False, verbose_name=_('تأییدکننده'))
    step_no = models.PositiveIntegerField(default=1, verbose_name=_('مرحله'))
    decision = models.CharField(max_length=10, choices=Decision.choices, default=Decision.PENDING, verbose_name=_('تصمیم'))
    comment = models.TextField(blank=True, verbose_name=_('نظر'))
    decided_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان تصمیم'))

    class Meta:
        verbose_name = _('مرحلهٔ تأیید سند')
        verbose_name_plural = _('مراحل تأیید اسناد')
        ordering = ['step_no']

    def __str__(self):
        return f'{self.document_id} / مرحله {self.step_no} - {self.get_decision_display()}'


# =============================================================================
# Bank statement & reconciliation
# =============================================================================
class BankStatement(AccountingBaseModel):
    """صورتحساب بانکی واردشده برای مغایرت‌گیری."""
    account = models.ForeignKey(
        Account, on_delete=models.CASCADE, related_name='bank_statements',
        verbose_name=_('حساب بانکی/صندوق'),
    )
    statement_date = models.DateField(verbose_name=_('تاریخ صورتحساب'))
    reference = models.CharField(max_length=100, blank=True, verbose_name=_('شماره صورتحساب'))
    opening_balance = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('ماندهٔ ابتدای دوره'))
    closing_balance = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('ماندهٔ انتهای دوره'))

    class Meta:
        verbose_name = _('صورتحساب بانکی')
        verbose_name_plural = _('صورتحساب‌های بانکی')
        ordering = ['-statement_date']

    def __str__(self):
        return f'{self.account.code} - {self.statement_date}'


class BankStatementLine(AccountingBaseModel):
    """یک ردیف صورتحساب بانکی (برای تطبیق با سطرهای ثبت‌شده)."""
    statement = models.ForeignKey(
        BankStatement, on_delete=models.CASCADE, related_name='lines',
        verbose_name=_('صورتحساب'),
    )
    date = models.DateField(verbose_name=_('تاریخ'))
    description = models.CharField(max_length=300, blank=True, verbose_name=_('شرح'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('مبلغ'))
    currency = models.CharField(max_length=10, choices=[('debit', 'برداشت'), ('credit', 'واریز')], default='debit', verbose_name=_('جهت'))
    matched = models.BooleanField(default=False, verbose_name=_('تطبیق‌شده'))

    class Meta:
        verbose_name = _('ردیف صورتحساب بانکی')
        verbose_name_plural = _('ردیف‌های صورتحساب بانکی')
        ordering = ['date']

    def __str__(self):
        return f'{self.date} - {self.description}'


class BankReconciliation(AccountingBaseModel):
    """تطبیق یک حساب بانکی در یک تاریخ مشخص."""
    account = models.ForeignKey(
        Account, on_delete=models.CASCADE, related_name='reconciliations',
        verbose_name=_('حساب بانکی/صندوق'),
    )
    as_of = models.DateField(verbose_name=_('تاریخ مغایرت‌گیری'))
    statement_balance = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('ماندهٔ نظام بانکی'))
    book_balance = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('ماندهٔ دفتری'))
    difference = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('اختلاف'))

    class Meta:
        verbose_name = _('مغایرت‌گیری بانکی')
        verbose_name_plural = _('مغایرت‌گیری‌های بانکی')
        ordering = ['-as_of']

    def __str__(self):
        return f'{self.account.code} - {self.as_of}'


# =============================================================================
# Accounting settings (per company, singleton)
# =============================================================================
class CodingConfig(AccountingBaseModel):
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


class AccountingSettings(AccountingBaseModel):
    """تنظیمات حسابداری (یک رکورد به ازای هر شرکت)."""
    base_currency = models.ForeignKey(
        'settings_app.Currency', on_delete=models.PROTECT, related_name='accounting_settings_as_base',
        verbose_name=_('ارز پایه'),
    )
    default_branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('شعبهٔ پیش‌فرض'))
    requires_approval = models.BooleanField(default=True, verbose_name=_('نیازمند تأیید قبل از ثبت'))
    allow_edit_posted = models.BooleanField(default=False, verbose_name=_('اجازهٔ ویرایش سند ثبت‌شده'))
    profit_loss_account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('حساب خلاصه سود و زیان'))
    retained_earnings_account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('حساب سود/زیان انباشته'))

    class Meta:
        verbose_name = _('تنظیمات حسابداری')
        verbose_name_plural = _('تنظیمات حسابداری')
        constraints = [
            models.UniqueConstraint(fields=['company'], name='uniq_acct_settings_per_company'),
        ]

    def __str__(self):
        return f'تنظیمات حسابداری ({self.company_id})'


# =============================================================================
# Financial statement approval — تأیید صورت‌های مالی (حسابرسی)
# =============================================================================
class FinancialStatementApproval(AccountingBaseModel):
    """تأیید/حسابرسی صورت‌های مالی (ترازنامه، سود و زیان، جریان نقدی).

    هر رکورد یک «سابقهٔ تأیید» است؛ آخرین رکورد برای هر (شرکت، نوع صورت، سال مالی)
    وضعیت جاری تأیید را مشخص می‌کند و در گزارش‌ها به‌عنوان مهر تأیید نمایش داده می‌شود.
    """

    class StatementType(models.TextChoices):
        BALANCE_SHEET = 'balance_sheet', _('ترازنامه')
        INCOME_STATEMENT = 'income_statement', _('سود و زیان')
        CASH_FLOW = 'cash_flow', _('جریان وجوه نقد')
        COMBINED = 'combined', _('صورت‌های مالی کامل')

    class Status(models.TextChoices):
        PENDING = 'pending', _('در انتظار تأیید')
        APPROVED = 'approved', _('تأییدشده')
        APPROVED_WITH_COMMENTS = 'approved_with_comments', _('تأیید با ملاحظات')
        REJECTED = 'rejected', _('رد شده')

    statement_type = models.CharField(
        max_length=30, choices=StatementType.choices, default=StatementType.BALANCE_SHEET,
        verbose_name=_('نوع صورت مالی'),
    )
    fiscal_year = models.ForeignKey(
        FiscalYear, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='statement_approvals', verbose_name=_('سال مالی'),
    )
    as_of_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ صورت مالی'))
    period_from = models.DateField(null=True, blank=True, verbose_name=_('از تاریخ'))
    period_to = models.DateField(null=True, blank=True, verbose_name=_('تا تاریخ'))
    status = models.CharField(
        max_length=30, choices=Status.choices, default=Status.PENDING,
        verbose_name=_('وضعیت تأیید'),
    )
    auditor_name = models.CharField(max_length=200, verbose_name=_('حسابرس/تأییدکننده'))
    audit_firm = models.CharField(max_length=250, blank=True, verbose_name=_('مؤسسهٔ حسابرسی'))
    reference_no = models.CharField(max_length=120, blank=True, verbose_name=_('شمارهٔ گزارش/نامه'))
    approved_at = models.DateField(null=True, blank=True, verbose_name=_('تاریخ تأیید'))
    opinion_note = models.TextField(blank=True, verbose_name=_('متن نظر حسابرسی'))
    note = models.TextField(blank=True, verbose_name=_('یادداشت داخلی'))
    prepared_by_name = models.CharField(max_length=200, blank=True, verbose_name=_('تهیه‌کننده'))

    class Meta:
        verbose_name = _('تأیید صورت مالی')
        verbose_name_plural = _('تأییدهای صورت مالی (حسابرسی)')
        ordering = ['-approved_at', '-id']
        indexes = [
            models.Index(fields=['company', 'statement_type'], name='fsa_co_type_idx'),
        ]

    def __str__(self):
        return f'{self.get_statement_type_display()} — {self.auditor_name} ({self.status})'

# =============================================================================
# Seasonal transactions report — ماده ۱۶۹ مکرر قانون مالیات‌های مستقیم
# =============================================================================

def seasonal_period_range(fiscal_year_start, quarter):
    """بازهٔ میلادی یک فصل از سال مالی، بر پایهٔ تقویم شمسی.

    شروع سال مالی شمسی (مثلاً ۱ فروردین) مبنای سه‌ماهه‌ها است؛ خروجی
    ``(start_date, end_date)`` میلادی برای فیلتر تاریخ فاکتور و گزارش‌ها.
    """
    import jdatetime
    from datetime import timedelta

    quarter = max(1, min(4, int(quarter or 1)))
    jstart = jdatetime.date.fromgregorian(date=fiscal_year_start)
    month_index = (jstart.month - 1) + (quarter - 1) * 3
    year_offset, month_zero = divmod(month_index, 12)
    start_j = jdatetime.date(jstart.year + year_offset, month_zero + 1, 1)

    next_index = month_index + 3
    next_offset, next_month_zero = divmod(next_index, 12)
    next_j = jdatetime.date(jstart.year + next_offset, next_month_zero + 1, 1)

    return start_j.togregorian(), (next_j - timedelta(days=1)).togregorian()


class SeasonalReport(AccountingBaseModel):
    """صورت معاملات فصلی — یک گزارش به‌ازای هر «سال مالی + فصل»."""

    class Quarter(models.IntegerChoices):
        Q1 = 1, _('سه‌ماهه اول')
        Q2 = 2, _('سه‌ماهه دوم')
        Q3 = 3, _('سه‌ماهه سوم')
        Q4 = 4, _('سه‌ماهه چهارم')

    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        READY = 'ready', _('آمادهٔ ارسال')
        SUBMITTED = 'submitted', _('ارسال‌شده')

    fiscal_year = models.ForeignKey(
        FiscalYear, on_delete=models.CASCADE, related_name='seasonal_reports',
        verbose_name=_('سال مالی'),
    )
    quarter = models.PositiveSmallIntegerField(
        choices=Quarter.choices, default=Quarter.Q1, verbose_name=_('فصل'),
    )
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'),
    )
    notes = models.TextField(blank=True, verbose_name=_('یادداشت'))
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان ارسال'))
    submission_ref = models.CharField(max_length=120, blank=True, verbose_name=_('شمارهٔ پیگیری / رسید'))

    class Meta:
        verbose_name = _('صورت معاملات فصلی')
        verbose_name_plural = _('صورت‌های معاملات فصلی')
        ordering = ['-fiscal_year__start_date', 'quarter']
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'fiscal_year', 'quarter'],
                name='uniq_seasonal_report_period',
            ),
        ]

    def __str__(self):
        return f'{self.fiscal_year.name} / {self.get_quarter_display()}'

    @property
    def period_range(self):
        return seasonal_period_range(self.fiscal_year.start_date, self.quarter)

    @property
    def period_start(self):
        return self.period_range[0]

    @property
    def period_end(self):
        return self.period_range[1]

    @property
    def is_locked(self):
        return self.status == self.Status.SUBMITTED


class SeasonalTransaction(AccountingBaseModel):
    """یک ردیف معاملهٔ فصلی (طرف معامله + فاکتور)."""

    class Kind(models.IntegerChoices):
        TYPE_1 = 1, _('نوع ۱')
        TYPE_2 = 2, _('نوع ۲')
        TYPE_3 = 3, _('نوع ۳')
        TYPE_4 = 4, _('نوع ۴')
        TYPE_5 = 5, _('نوع ۵')

    class PersonType(models.TextChoices):
        LEGAL = 'legal', _('شخص حقوقی')
        NATURAL = 'natural', _('شخص حقیقی')
        FOREIGN = 'foreign', _('شخص خارجی')
        AGGREGATE = 'aggregate', _('تجمیعی')

    class Direction(models.TextChoices):
        """جهت معامله.

        در این نسخه فقط «خرید» ثبت و گزارش می‌شود؛ ``SALE`` برای توسعهٔ
        آینده نگه داشته شده و در رابط کاربری فعلی قابل انتخاب نیست.
        """
        PURCHASE = 'purchase', _('خرید')
        SALE = 'sale', _('فروش')

    class MoadianStatus(models.TextChoices):
        REGISTERED = 'registered', _('درج‌شده در سامانه مودیان')
        PENDING = 'pending', _('درج‌نشده در سامانه')

    class Source(models.TextChoices):
        MANUAL = 'manual', _('ورود دستی')
        LEDGER = 'ledger', _('از اسناد حسابداری')

    class GoodsServiceType(models.TextChoices):
        """نوع کالا/خدمات در فایل خروجی.

        بر اساس دستور کارفرما، در این نسخه همهٔ ردیف‌ها با «سایر» گزارش می‌شوند؛
        افزودن مقادیر دیگر فقط با مستند نسخهٔ TTMS انجام می‌شود.
        """
        OTHER = 'other', _('سایر')

    report = models.ForeignKey(
        SeasonalReport, on_delete=models.CASCADE, related_name='transactions',
        verbose_name=_('گزارش فصلی'),
    )
    line_no = models.PositiveIntegerField(default=0, verbose_name=_('ردیف'))
    direction = models.CharField(
        max_length=10, choices=Direction.choices, default=Direction.PURCHASE,
        verbose_name=_('جهت معامله'),
    )
    name = models.CharField(max_length=250, verbose_name=_('نام / عنوان طرف معامله'))
    first_name = models.CharField(max_length=150, blank=True, verbose_name=_('نام (شخص حقیقی)'))
    last_name = models.CharField(max_length=150, blank=True, verbose_name=_('نام خانوادگی (شخص حقیقی)'))
    person_type = models.CharField(
        max_length=10, choices=PersonType.choices, blank=True, default='',
        verbose_name=_('نوع شخص'),
    )
    economic_code = models.CharField(
        max_length=20, blank=True, verbose_name=_('شماره اقتصادی (منسوخ)'),
        help_text=_('دیگر استفاده نمی‌شود؛ فقط برای حفظ داده‌های قبلی نگه داشته شده است.'),
    )
    national_id = models.CharField(max_length=20, blank=True, verbose_name=_('شناسه ملی / کد ملی'))
    postal_code = models.CharField(max_length=10, blank=True, verbose_name=_('کد پستی'))
    country = models.CharField(
        max_length=60, blank=True, default='ایران', verbose_name=_('کشور'),
        help_text=_('پیش‌فرض «ایران»؛ برای شخص خارجی قابل تغییر است.'),
    )
    province = models.CharField(max_length=60, blank=True, verbose_name=_('استان'))
    city = models.CharField(max_length=100, blank=True, verbose_name=_('شهر'))
    address = models.TextField(blank=True, verbose_name=_('آدرس'))
    goods_service_desc = models.CharField(max_length=300, blank=True, verbose_name=_('شرح کالا / خدمات'))
    amount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ (ریال)'))
    vat = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مالیات بر ارزش افزوده'))
    is_included = models.BooleanField(
        default=True, verbose_name=_('مشمول معاملات فصلی'),
        help_text=_('در این نسخه همهٔ ردیف‌ها مشمول هستند و این مقدار همیشه True است.'),
    )
    goods_service_type = models.CharField(
        max_length=20, choices=GoodsServiceType.choices, default=GoodsServiceType.OTHER,
        verbose_name=_('نوع کالا یا خدمات'),
    )
    kind = models.PositiveSmallIntegerField(choices=Kind.choices, default=Kind.TYPE_1, verbose_name=_('نوع معامله'))
    invoice_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ فاکتور'))
    invoice_no = models.CharField(max_length=50, blank=True, verbose_name=_('شماره فاکتور'))
    moadian_status = models.CharField(
        max_length=10, choices=MoadianStatus.choices, default=MoadianStatus.PENDING,
        verbose_name=_('وضعیت در سامانه مودیان'),
    )
    moadian_uid = models.CharField(max_length=120, blank=True, verbose_name=_('شناسهٔ یکتای صورتحساب'))
    currency_code = models.CharField(max_length=10, blank=True, verbose_name=_('ارز (صادرات/واردات)'))
    fx_rate = models.DecimalField(max_digits=18, decimal_places=6, default=1, verbose_name=_('نرخ ارز'))
    source = models.CharField(
        max_length=10, choices=Source.choices, default=Source.MANUAL, verbose_name=_('منبع ردیف'),
    )
    source_line = models.ForeignKey(
        AccountingDocumentLine, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='seasonal_rows', verbose_name=_('سطر سند مبنا'),
    )

    class Meta:
        verbose_name = _('ردیف معاملات فصلی')
        verbose_name_plural = _('ردیف‌های معاملات فصلی')
        ordering = ['line_no', 'id']
        indexes = [
            models.Index(fields=['report', 'direction', 'line_no'], name='seasonal_row_order_idx'),
            models.Index(fields=['report', 'economic_code'], name='seasonal_row_party_idx'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['report', 'direction', 'line_no'], name='uniq_seasonal_row_no',
            ),
        ]

    def __str__(self):
        return f'{self.line_no}. {self.name} — {self.invoice_no}'

    @property
    def total(self):
        return (self.amount or 0) + (self.vat or 0)


class SeasonalReconciliation(AccountingBaseModel):
    """یک بار مغایرت‌گیری گزارش فصلی با فایل دفاتر (برای پیگیری و حسابرسی).

    خلاصه و جزئیات نتیجه ذخیره می‌شود تا امکان «چه کسی، کِی، با چه فایلی و با چه
    نتیجه‌ای» فراهم باشد؛ خودِ فایل آپلودی نگه‌داری نمی‌شود.
    """

    report = models.ForeignKey(
        SeasonalReport, on_delete=models.CASCADE, related_name='reconciliations',
        verbose_name=_('گزارش فصلی'),
    )
    direction = models.CharField(
        max_length=10, choices=SeasonalTransaction.Direction.choices,
        default=SeasonalTransaction.Direction.PURCHASE, verbose_name=_('جهت معامله'),
    )
    file_name = models.CharField(max_length=255, blank=True, verbose_name=_('نام فایل دفاتر'))
    file_sheet = models.CharField(max_length=120, blank=True, verbose_name=_('شیت فایل'))
    source_rows = models.PositiveIntegerField(default=0, verbose_name=_('ردیف‌های فایل'))
    matched_count = models.PositiveIntegerField(default=0, verbose_name=_('ردیف‌های تطبیق‌یافته'))
    error_count = models.PositiveIntegerField(default=0, verbose_name=_('خطاها'))
    warning_count = models.PositiveIntegerField(default=0, verbose_name=_('هشدارها'))
    amount_delta = models.DecimalField(
        max_digits=20, decimal_places=2, default=0, verbose_name=_('اختلاف مبلغ کل'),
    )
    summary = models.JSONField(default=dict, blank=True, verbose_name=_('خلاصه'))
    detail = models.JSONField(default=dict, blank=True, verbose_name=_('جزئیات'))
    created_by_name = models.CharField(max_length=150, blank=True, verbose_name=_('اجراکننده'))

    class Meta:
        verbose_name = _('مغایرت‌گیری فصلی')
        verbose_name_plural = _('مغایرت‌گیری‌های فصلی')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.report_id} — {self.file_name or "فایل دفاتر"}'


class SeasonalExportRun(AccountingBaseModel):
    """یک بار ساخت «بستهٔ درج در فایل Access نسخهٔ TTMS» برای گزارش فصلی.

    سرور فقط بستهٔ zip (rows.csv + manifest.json + fill_ttms.ps1) را می‌سازد؛ درج
    روی فایل Access در ویندوز کاربر انجام می‌شود و نتیجه (result.json) در همین
    رکورد ثبت می‌گردد تا سابقهٔ «چه کسی، کِی، چند ردیف و با چه جمعی» بماند.
    """

    class Kind(models.TextChoices):
        TTMS_ACCESS = 'ttms_access', _('بستهٔ درج در فایل TTMS')
        CSV = 'csv', _('پیش‌نویس CSV')

    class Status(models.TextChoices):
        GENERATED = 'generated', _('ساخته شد (در انتظار اجرا)')
        FILLED = 'filled', _('روی فایل TTMS درج شد')
        DRY_RUN = 'dry_run', _('اجرای آزمایشی')
        FAILED = 'failed', _('ناموفق')

    report = models.ForeignKey(
        SeasonalReport, on_delete=models.CASCADE, related_name='export_runs',
        verbose_name=_('گزارش فصلی'),
    )
    kind = models.CharField(
        max_length=12, choices=Kind.choices, default=Kind.TTMS_ACCESS,
        verbose_name=_('نوع بسته'),
    )
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.GENERATED,
        verbose_name=_('وضعیت'),
    )
    mapping_version = models.CharField(max_length=40, blank=True, verbose_name=_('نسخهٔ نگاشت'))
    package_name = models.CharField(max_length=160, blank=True, verbose_name=_('نام بسته'))
    target_name = models.CharField(max_length=200, blank=True, verbose_name=_('فایل هدف TTMS'))
    filters = models.JSONField(default=dict, blank=True, verbose_name=_('فیلترهای اعمال‌شده'))
    options = models.JSONField(default=dict, blank=True, verbose_name=_('گزینه‌های بسته'))
    row_count = models.PositiveIntegerField(default=0, verbose_name=_('ردیف‌های بسته'))
    amount_total = models.DecimalField(
        max_digits=20, decimal_places=0, default=0, verbose_name=_('جمع مبلغ بسته'),
    )
    vat_total = models.DecimalField(
        max_digits=20, decimal_places=0, default=0, verbose_name=_('جمع مالیات بسته'),
    )
    filled_rows = models.PositiveIntegerField(default=0, verbose_name=_('ردیف‌های درج‌شده'))
    message = models.CharField(max_length=255, blank=True, verbose_name=_('پیام نتیجه'))
    result = models.JSONField(default=dict, blank=True, verbose_name=_('نتیجهٔ اجرا'))
    created_by_name = models.CharField(max_length=150, blank=True, verbose_name=_('سازنده'))

    class Meta:
        verbose_name = _('بستهٔ خروجی فصلی')
        verbose_name_plural = _('بسته‌های خروجی فصلی')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.package_name or "بستهٔ TTMS"} — {self.get_status_display()}'


class SeasonalSavedView(AccountingBaseModel):
    """نمای ذخیره‌شدهٔ فیلترهای گزارش فصلی (فیلتر ساده یا درخت شرط AND/OR).

    هر نما به یک گزارش (فصل/سال) تعلق دارد تا فیلترهای همان فصل با یک کلیک
    روی جدول، گزارش تحلیلی، پیوت طرف‌ها و خروجی‌ها اعمال شود.
    """

    report = models.ForeignKey(
        SeasonalReport, on_delete=models.CASCADE, related_name='saved_views',
        verbose_name=_('گزارش فصلی'),
    )
    name = models.CharField(max_length=120, verbose_name=_('نام نما'))
    description = models.CharField(max_length=255, blank=True, verbose_name=_('توضیح'))
    filters = models.JSONField(default=dict, blank=True, verbose_name=_('فیلترها'))
    is_shared = models.BooleanField(default=True, verbose_name=_('اشتراکی'))
    is_favorite = models.BooleanField(default=False, verbose_name=_('مورد علاقه'))
    owner_name = models.CharField(max_length=150, blank=True, verbose_name=_('سازنده'))
    use_count = models.PositiveIntegerField(default=0, verbose_name=_('تعداد استفاده'))

    class Meta:
        verbose_name = _('نمای ذخیره‌شدهٔ فصلی')
        verbose_name_plural = _('نماهای ذخیره‌شدهٔ فصلی')
        ordering = ['-is_favorite', 'name']
        constraints = [
            models.UniqueConstraint(fields=['report', 'name'], name='uniq_seasonal_view_name'),
        ]

    def __str__(self):
        return f'{self.name} — {self.report_id}'



