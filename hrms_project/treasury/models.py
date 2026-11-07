"""خزانه‌داری (Treasury) — زیرساخت وجوه نقد و گردش پرداخت.

مدل‌ها:
- کاتالوگ بانک/شعبه و پایانهٔ کارت‌خوان (Master Data)
- نهاد پولی (بانک/صندوق) با حساب، شعبه، سقف و سیاست مانده
- دریافت / پرداخت خزانه (تراکنش‌ها)
- آیتم قابل پرداخت (یکپارچه از ماژول‌های دیگر)
- شماره‌گذاری قابل تنظیم اسناد خزانه
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel
from treasury.payment_models import (
    TreasuryPaymentType, TreasuryPaymentMethod,
    PaymentCommitment, PaymentDeduction, PaymentRequest, PaymentOrder,
)
from treasury.operation_models import (
    Receipt, AdvanceAccount, AdvanceSettlement, TreasuryTransfer, TreasuryGuarantee,
)
from treasury.planning_models import TreasuryReconciliation
from treasury.master_models import Bank, BankBranch, POSTerminal
from treasury.numbering import TreasuryNumberingSetting, allocate_number, preview_numbers
from treasury.bank_order_models import BankPaymentOrder
from treasury.reconciliation_models import TreasuryStatementLine
from treasury.approval_models import TreasuryApprovalRule, TreasurySettings
from treasury.print_templates import TreasuryPrintTemplate


class TreasuryEntity(BaseModel):
    """نهاد پولی خزانه: بانک یا صندوق (یک منبع یکتا برای موجودی و گردش).

    حساب بانکی شرکت همان ``TreasuryEntity`` با ``entity_type=bank`` است؛
    اطلاعات شعبه/شبا/کارت/سقف و مجوزها روی همین ردیف نگهداری می‌شود تا
    «حساب بانکی» و «موجودی» دو جا تکرار نشود.
    """
    class EntityType(models.TextChoices):
        BANK = 'bank', _('بانک')
        CASH = 'cash', _('صندوق')

    class Currency(models.TextChoices):
        IRR = 'IRR', _('ریال')
        USD = 'USD', _('دلار')
        EUR = 'EUR', _('یورو')
        AED = 'AED', _('درهم')
        TRY = 'TRY', _('لیر')
        OTHER = 'OTHER', _('سایر')

    class AccountType(models.TextChoices):
        CURRENT = 'current', _('جاری')
        SHORT = 'short', _('کوتاه‌مدت')
        LONG = 'long', _('بلندمدت')
        LOAN = 'loan', _('قرض‌الحسنه')
        FOREIGN = 'foreign', _('ارزی')
        OTHER = 'other', _('سایر')

    class NegativeBalancePolicy(models.TextChoices):
        BLOCK = 'block', _('ممنوع')
        WARN = 'warn', _('با هشدار')
        APPROVE = 'approve', _('فقط با مجوز')

    code = models.CharField(max_length=30, verbose_name=_('کد'))
    name = models.CharField(max_length=200, verbose_name=_('نام'))
    entity_type = models.CharField(max_length=10, choices=EntityType.choices, default=EntityType.BANK, verbose_name=_('نوع نهاد'))
    bank = models.ForeignKey('treasury.Bank', on_delete=models.SET_NULL, null=True, blank=True,
                             related_name='entities', verbose_name=_('بانک (کاتالوگ)'))
    branch = models.ForeignKey('treasury.BankBranch', on_delete=models.SET_NULL, null=True,
                               blank=True, related_name='entities', verbose_name=_('شعبه'))
    branch_name = models.CharField(max_length=150, blank=True, verbose_name=_('نام شعبه'))
    branch_code = models.CharField(max_length=20, blank=True, verbose_name=_('کد شعبه'))
    city = models.CharField(max_length=80, blank=True, verbose_name=_('شهر'))
    province = models.CharField(max_length=80, blank=True, verbose_name=_('استان'))
    address = models.CharField(max_length=300, blank=True, verbose_name=_('آدرس'))
    phone = models.CharField(max_length=40, blank=True, verbose_name=_('تلفن'))
    account_number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره حساب'))
    sheba_number = models.CharField(max_length=30, blank=True, verbose_name=_('شماره شبا'))
    card_number = models.CharField(max_length=30, blank=True, verbose_name=_('شماره کارت'))
    account_type = models.CharField(max_length=10, choices=AccountType.choices,
                                    default=AccountType.CURRENT, verbose_name=_('نوع حساب'))
    owner_name = models.CharField(max_length=200, blank=True, verbose_name=_('صاحب حساب'))
    currency = models.CharField(max_length=10, choices=Currency.choices,
                                default=Currency.IRR, verbose_name=_('ارز حساب'))
    opened_on = models.DateField(null=True, blank=True, verbose_name=_('تاریخ افتتاح'))
    initial_balance = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('ماندهٔ ابتدایی'))
    allow_receipt = models.BooleanField(default=True, verbose_name=_('مجاز برای دریافت'))
    allow_payment = models.BooleanField(default=True, verbose_name=_('مجاز برای پرداخت'))
    allow_transfer = models.BooleanField(default=True, verbose_name=_('مجاز برای انتقال'))
    payment_limit = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True,
                                        verbose_name=_('سقف هر پرداخت'))
    min_balance = models.DecimalField(max_digits=18, decimal_places=2, default=0,
                                      verbose_name=_('حداقل موجودی'))
    max_balance = models.DecimalField(max_digits=18, decimal_places=2, default=0,
                                      verbose_name=_('حداکثر موجودی (۰ = بی‌سقف)'))
    negative_balance_policy = models.CharField(
        max_length=10, choices=NegativeBalancePolicy.choices,
        default=NegativeBalancePolicy.BLOCK, verbose_name=_('سیاست ماندهٔ منفی'),
    )
    responsible = models.ForeignKey(
        'employees.Employee', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='treasury_cashboxes', verbose_name=_('مسئول صندوق/حساب'),
    )
    project = models.ForeignKey('projects.Project', on_delete=models.SET_NULL, null=True,
                                blank=True, related_name='treasury_entities',
                                verbose_name=_('پروژه پیش‌فرض'))
    cost_center = models.ForeignKey('accounting.CostCenter', on_delete=models.SET_NULL,
                                    null=True, blank=True, related_name='treasury_entities',
                                    verbose_name=_('مرکز هزینه پیش‌فرض'))
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
    def is_cash(self):
        return self.entity_type == self.EntityType.CASH

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

    class InstrumentKind(models.TextChoices):
        CASH = 'cash', _('نقدی')
        CHEQUE = 'cheque', _('چک')
        SHEBA = 'sheba', _('شبا / حواله بانکی')
        BILL = 'bill', _('سند / برات')
        POS = 'pos', _('کارت‌خوان')
        OTHER = 'other', _('سایر')

    entity = models.ForeignKey(TreasuryEntity, on_delete=models.PROTECT, related_name='transactions', verbose_name=_('بانک/صندوق'))
    number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره تراکنش'))
    date = models.DateField(verbose_name=_('تاریخ'))
    direction = models.CharField(max_length=10, choices=Direction.choices, verbose_name=_('جهت'))
    instrument_kind = models.CharField(
        max_length=10, choices=InstrumentKind.choices, default=InstrumentKind.CASH,
        verbose_name=_('نوع سند'),
    )
    amount = models.DecimalField(max_digits=18, decimal_places=2, verbose_name=_('مبلغ'))
    party = models.CharField(max_length=250, blank=True, verbose_name=_('طرف حساب'))
    party_national_id = models.CharField(max_length=20, blank=True,
                                         verbose_name=_('شناسه/کد ملی طرف حساب'))
    destination_owner_name = models.CharField(max_length=250, blank=True,
                                             verbose_name=_('نام صاحب حساب مقصد'))
    destination_national_id = models.CharField(max_length=20, blank=True,
                                              verbose_name=_('شناسه/کد ملی مقصد'))
    destination_account_number = models.CharField(max_length=50, blank=True,
                                                 verbose_name=_('شماره حساب مقصد'))
    destination_iban = models.CharField(max_length=34, blank=True, verbose_name=_('شبا مقصد'))
    destination_bank = models.CharField(max_length=120, blank=True, verbose_name=_('بانک مقصد'))
    cheque_number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره چک'))
    cheque_due_date = models.DateField(null=True, blank=True, verbose_name=_('سررسید چک'))
    is_guarantee = models.BooleanField(default=False, verbose_name=_('چک تضمینی'))
    invoice_number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره فاکتور'))
    invoice_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ فاکتور'))
    invoice_amount = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True,
                                         verbose_name=_('مقدار فاکتور'))
    debit_account = models.ForeignKey(
        'accounting.Account', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='treasury_transactions_debit', verbose_name=_('حساب بدهکار سند'),
    )
    description = models.TextField(blank=True, verbose_name=_('شرح'))
    source_module = models.CharField(max_length=50, blank=True, verbose_name=_('ماژول مبدأ'))
    source_id = models.CharField(max_length=64, blank=True, verbose_name=_('شناسهٔ مبدأ'))
    currency = models.CharField(max_length=10, default='IRR', verbose_name=_('ارز'))
    exchange_rate = models.DecimalField(max_digits=18, decimal_places=6, default=1,
                                        verbose_name=_('نرخ تبدیل به ریال'))
    reference_no = models.CharField(max_length=100, blank=True, verbose_name=_('شماره پیگیری'))
    tracking_no = models.CharField(max_length=100, blank=True, verbose_name=_('شماره مرجع بانکی'))
    accounting_document = models.ForeignKey(
        'accounting.AccountingDocument', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='treasury_transactions', verbose_name=_('سند حسابداری'),
    )
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
    """چک دریافتی با چرخهٔ کامل: ثبت → صندوق اسناد → واگذاری/وصول/برگشت/عودت."""
    class Kind(models.TextChoices):
        NORMAL = 'normal', _('عادی')
        GUARANTEE = 'guarantee', _('تضمینی')
        PROMISSORY = 'promissory', _('سفته')

    class Status(models.TextChoices):
        REGISTERED = 'registered', _('ثبت‌شده')
        IN_CUSTODY = 'in_custody', _('در صندوق اسناد')
        DEPOSITED = 'deposited', _('واگذارشده به بانک')
        CLEARING = 'clearing', _('در جریان وصول')
        CLEARED = 'cleared', _('وصول‌شده')
        BOUNCED = 'bounced', _('برگشتی')
        RETURNED_TO_CUSTOMER = 'returned_to_customer', _('عودت به صادرکننده')
        TRANSFERRED = 'transferred', _('واگذارشده به شخص')
        GUARANTEE_HELD = 'guarantee_held', _('تضمینی نزد ما')
        CANCELLED = 'cancelled', _('لغو')

    number = models.CharField(max_length=50, verbose_name=_('شماره چک'))
    kind = models.CharField(max_length=15, choices=Kind.choices, default=Kind.NORMAL,
                            verbose_name=_('نوع سند'))
    bank_name = models.CharField(max_length=200, verbose_name=_('بانک صادرکننده'))
    branch_name = models.CharField(max_length=150, blank=True, verbose_name=_('شعبه'))
    account_number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره حساب'))
    series = models.CharField(max_length=20, blank=True, verbose_name=_('سری'))
    serial = models.CharField(max_length=30, blank=True, verbose_name=_('سریال'))
    party = models.CharField(max_length=250, verbose_name=_('طرف حساب (صادرکننده)'))
    party_account = models.ForeignKey(
        'contracts.ContractParty', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='received_checks', verbose_name=_('طرف حساب (پرونده)'),
    )
    issuer_national_id = models.CharField(max_length=20, blank=True, verbose_name=_('کد ملی صادرکننده'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, verbose_name=_('مبلغ'))
    issue_date = models.DateField(verbose_name=_('تاریخ صدور'))
    due_date = models.DateField(verbose_name=_('تاریخ سررسید'))
    status = models.CharField(max_length=25, choices=Status.choices, default=Status.REGISTERED, verbose_name=_('وضعیت'))
    endorsed_to = models.CharField(max_length=250, blank=True, verbose_name=_('ظهرنویسی به'))
    returned_reason = models.CharField(max_length=250, blank=True, verbose_name=_('علت برگشت/عودت'))
    history = models.JSONField(default=list, blank=True, verbose_name=_('تاریخچهٔ چرخه'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('چک دریافتی')
        verbose_name_plural = _('چک‌های دریافتی')
        ordering = ['-due_date', '-created_at']
        indexes = [models.Index(fields=['company', 'status'])]

    def __str__(self):
        return f'{self.number} - {self.amount} ({self.bank_name})'

    @property
    def is_open(self):
        """چک باز (هنوز تعیین‌تکلیف نشده) برای گزارش اسناد در جریان."""
        return self.status in {
            self.Status.REGISTERED, self.Status.IN_CUSTODY, self.Status.DEPOSITED,
            self.Status.CLEARING, self.Status.GUARANTEE_HELD,
        }


class IssuedCheck(BaseModel):
    """چک پرداختی صادرشده از دسته‌چک."""
    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        ISSUED = 'issued', _('صادرشده')
        DELIVERED = 'delivered', _('تحویل به ذی‌نفع')
        CLEARED = 'cleared', _('پاس‌شده')
        BOUNCED = 'bounced', _('برگشتی')
        RETURNED = 'returned', _('عودت‌شده')
        CANCELLED = 'cancelled', _('لغو')

    checkbook = models.ForeignKey(CheckBook, on_delete=models.PROTECT, related_name='checks', verbose_name=_('دسته‌چک'))
    number = models.CharField(max_length=50, verbose_name=_('شماره چک'))
    series = models.CharField(max_length=20, blank=True, verbose_name=_('سری'))
    serial = models.CharField(max_length=30, blank=True, verbose_name=_('سریال'))
    branch_name = models.CharField(max_length=150, blank=True, verbose_name=_('شعبه'))
    party = models.CharField(max_length=250, verbose_name=_('ذینفع'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, verbose_name=_('مبلغ'))
    issue_date = models.DateField(verbose_name=_('تاریخ صدور'))
    due_date = models.DateField(verbose_name=_('تاریخ سررسید'))
    party_account = models.ForeignKey(
        'contracts.ContractParty', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='issued_checks', verbose_name=_('ذی‌نفع (پرونده)'),
    )
    delivery_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ تحویل'))
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

    @property
    def is_open(self):
        return self.status in {self.Status.DRAFT, self.Status.ISSUED, self.Status.DELIVERED}
