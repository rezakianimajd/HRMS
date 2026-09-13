"""Contract management for external/third-party contracts.

Covers procurement, purchase, tender/مناقصه contracts with a full case file:
parties (contractor/vendor), contracts, invoices, statements (صورت وضعیت),
addendums (الحاقیه), guarantees (تضامین), and payments.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


class ContractParty(BaseModel):
    """A contractor / vendor / supplier (طرف قرارداد)."""

    class PartyType(models.TextChoices):
        CONTRACTOR = 'contractor', _('پیمانکار')
        SUPPLIER = 'supplier', _('فروشنده / تأمین‌کننده')
        CONSULTANT = 'consultant', _('مشاور')
        OTHER = 'other', _('سایر')

    name = models.CharField(max_length=250, verbose_name=_('نام / عنوان'))
    party_type = models.CharField(max_length=20, choices=PartyType.choices, default=PartyType.CONTRACTOR, verbose_name=_('نوع طرف'))
    national_id = models.CharField(max_length=20, blank=True, verbose_name=_('شناسه ملی / کد ثبت'))
    economic_code = models.CharField(max_length=20, blank=True, verbose_name=_('کد اقتصادی'))
    registration_number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره ثبت'))
    phone = models.CharField(max_length=20, blank=True, verbose_name=_('تلفن'))
    mobile = models.CharField(max_length=20, blank=True, verbose_name=_('موبایل'))
    email = models.EmailField(blank=True, verbose_name=_('ایمیل'))
    address = models.TextField(blank=True, verbose_name=_('آدرس'))
    contact_person = models.CharField(max_length=200, blank=True, verbose_name=_('شخص رابط'))
    bank_name = models.CharField(max_length=100, blank=True, verbose_name=_('بانک'))
    account_number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره حساب'))
    sheba_number = models.CharField(max_length=30, blank=True, verbose_name=_('شماره شبا'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('طرف قرارداد')
        verbose_name_plural = _('طرف‌های قرارداد')
        ordering = ['name']

    def __str__(self):
        return self.name


class Contract(BaseModel):
    """A third-party contract (پیمانکاری / خرید / مناقصه)."""

    class ContractType(models.TextChoices):
        CONSTRUCTION = 'construction', _('پیمانکاری / اجرا')
        PURCHASE = 'purchase', _('خرید')
        TENDER = 'tender', _('مناقصه')
        CONSULTING = 'consulting', _('مشاوره')
        SERVICE = 'service', _('خدمات')
        OTHER = 'other', _('سایر')

    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        ACTIVE = 'active', _('در حال اجرا')
        SUSPENDED = 'suspended', _('متوقف')
        COMPLETED = 'completed', _('تکمیل شده')
        TERMINATED = 'terminated', _('فسخ شده')

    number = models.CharField(max_length=100, blank=True, verbose_name=_('شماره قرارداد'))
    subject = models.CharField(max_length=300, verbose_name=_('موضوع قرارداد'))
    party = models.ForeignKey(
        ContractParty, on_delete=models.PROTECT, related_name='contracts', verbose_name=_('طرف قرارداد'),
    )
    contract_type = models.CharField(max_length=20, choices=ContractType.choices, default=ContractType.PURCHASE, verbose_name=_('نوع قرارداد'))
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    amount = models.DecimalField(max_digits=18, decimal_places=0, null=True, blank=True, verbose_name=_('مبلغ قرارداد (ریال)'))
    start_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ شروع'))
    end_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ پایان'))
    signing_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ امضا'))
    signatory = models.ForeignKey(
        'settings_app.Signatory', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='external_contracts', verbose_name=_('امضاکنندهٔ مجاز'),
    )
    guarantee_amount = models.DecimalField(max_digits=18, decimal_places=0, null=True, blank=True, verbose_name=_('مبلغ تضمین (ریال)'))

    # Link to Project Business Platform (nullable; a contract may or may not belong to a project)
    project = models.ForeignKey(
        'projects.Project', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='external_contracts', verbose_name=_('پروژه'),
    )

    # --- Extended / enterprise detail fields ---
    category = models.CharField(max_length=50, blank=True, verbose_name=_('طبقه‌بندی قرارداد'))
    project_name = models.CharField(max_length=300, blank=True, verbose_name=_('نام پروژه / طرح'))
    project_location = models.CharField(max_length=300, blank=True, verbose_name=_('محل اجرا / تحویل'))
    tender_number = models.CharField(max_length=100, blank=True, verbose_name=_('شماره مناقصه / استعلام'))
    advance_payment = models.DecimalField(max_digits=18, decimal_places=0, null=True, blank=True, verbose_name=_('پیش‌پرداخت (ریال)'))
    retention_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name=_('درصد حسن انجام کار'))
    warranty_period = models.CharField(max_length=100, blank=True, verbose_name=_('دوره گارانتی / تضمین کیفیت'))
    payment_terms = models.TextField(blank=True, verbose_name=_('شرایط و نحوه پرداخت'))
    delivery_terms = models.TextField(blank=True, verbose_name=_('شرایط تحویل'))
    penalty_terms = models.TextField(blank=True, verbose_name=_('شرایط وجه التزام / جریمه تأخیر'))
    insurance_terms = models.TextField(blank=True, verbose_name=_('شرایط بیمه'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('قرارداد')
        verbose_name_plural = _('قراردادها')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.number or "—"} - {self.subject}'


class ContractDocument(BaseModel):
    """A file attached to a contract case (PDF contract, attachments...)."""
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='documents', verbose_name=_('قرارداد'))
    title = models.CharField(max_length=200, verbose_name=_('عنوان سند'))
    file = models.FileField(upload_to='contract_documents/', verbose_name=_('فایل'))
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name=_('زمان بارگذاری'))

    class Meta:
        verbose_name = _('سند قرارداد')
        verbose_name_plural = _('اسناد قرارداد')
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.title


class Invoice(BaseModel):
    """Invoice (فاکتور) issued against a contract."""
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='invoices', verbose_name=_('قرارداد'))
    number = models.CharField(max_length=100, blank=True, verbose_name=_('شماره فاکتور'))
    date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ فاکتور'))
    amount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ (ریال)'))
    vat = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مالیات (ریال)'))
    total = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ کل (ریال)'))
    is_paid = models.BooleanField(default=False, verbose_name=_('پرداخت شده'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('فاکتور')
        verbose_name_plural = _('فاکتورها')
        ordering = ['-date']

    def __str__(self):
        return f'{self.number or "—"} ({self.total})'


class Statement(BaseModel):
    """صورت وضعیت (progress statement) for a contract."""
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='statements', verbose_name=_('قرارداد'))
    number = models.CharField(max_length=100, blank=True, verbose_name=_('شماره صورت‌وضعیت'))
    date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ'))
    amount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ (ریال)'))
    is_approved = models.BooleanField(default=False, verbose_name=_('تأیید شده'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('صورت‌وضعیت')
        verbose_name_plural = _('صورت‌وضعیت‌ها')
        ordering = ['-date']

    def __str__(self):
        return f'{self.number or "—"} ({self.amount})'


class Addendum(BaseModel):
    """الحاقیه / amendment to a contract."""
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='addendums', verbose_name=_('قرارداد'))
    number = models.CharField(max_length=100, blank=True, verbose_name=_('شماره الحاقیه'))
    date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ'))
    change_description = models.TextField(blank=True, verbose_name=_('شرح تغییرات'))
    amount_change = models.DecimalField(max_digits=18, decimal_places=0, null=True, blank=True, verbose_name=_('تغییر مبلغ (ریال)'))
    new_end_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ پایان جدید'))

    class Meta:
        verbose_name = _('الحاقیه')
        verbose_name_plural = _('الحاقیه‌ها')
        ordering = ['-date']

    def __str__(self):
        return f'{self.number or "—"} - {self.date}'


class Guarantee(BaseModel):
    """ضمانت / چک / سفته associated with a contract.

    Instrument kinds:
      - check             چک
      - promissory        سفته
      - bank_guarantee    ضمانت‌نامه بانکی
    Lifecycle actions depend on the kind.
    """

    class GuaranteeType(models.TextChoices):
        PERFORMANCE = 'performance', _('ضمانت حسن انجام کار')
        ADVANCE = 'advance', _('ضمانت پیش‌پرداخت')
        BID = 'bid', _('ضمانت شرکت در مناقصه')
        OTHER = 'other', _('سایر')

    class InstrumentType(models.TextChoices):
        CHECK = 'check', _('چک')
        PROMISSORY = 'promissory', _('سفته')
        BANK_GUARANTEE = 'bank_guarantee', _('ضمانت‌نامه بانکی')
        CHECK_AND_GUARANTEE = 'check_and_guarantee', _('چک + ضمانت‌نامه')
        PROMISSORY_AND_GUARANTEE = 'promissory_and_guarantee', _('سفته + ضمانت‌نامه')

    class LifecycleAction(models.TextChoices):
        RETURNED = 'returned', _('استرداد')
        EXECUTED = 'executed', _('اجرا / ضبط')
        CANCELED = 'canceled', _('ابطال')
        EXTENDED = 'extended', _('تمدید')

    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='guarantees', verbose_name=_('قرارداد'))
    guarantee_type = models.CharField(max_length=20, choices=GuaranteeType.choices, default=GuaranteeType.PERFORMANCE, verbose_name=_('نوع تضمین'))
    instrument_type = models.CharField(max_length=40, choices=InstrumentType.choices, default=InstrumentType.CHECK, verbose_name=_('نوع ابزار تضمین'))
    number = models.CharField(max_length=100, blank=True, verbose_name=_('شماره'))
    amount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ (ریال)'))
    issue_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ صدور'))
    expiry_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ انقضا'))
    bank = models.CharField(max_length=100, blank=True, verbose_name=_('بانک صادرکننده'))
    # چک و سفته: تاریخ سررسید / ضمانت‌نامه: تاریخ انقضا مشترکاً از expiry_date استفاده می‌شود،
    # اما برای وضوح فیلدهای زیر اضافه شده‌اند:
    check_number = models.CharField(max_length=100, blank=True, verbose_name=_('شماره چک'))
    check_bank = models.CharField(max_length=100, blank=True, verbose_name=_('بانک چک'))
    check_due_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ سررسید چک'))
    promissory_number = models.CharField(max_length=100, blank=True, verbose_name=_('شماره سفته'))
    promissory_due_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ سررسید سفته'))
    guarantee_number = models.CharField(max_length=100, blank=True, verbose_name=_('شماره ضمانت‌نامه'))
    guarantee_expiry_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ انقضای ضمانت‌نامه'))

    is_released = models.BooleanField(default=False, verbose_name=_('آزاد شده'))
    release_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ آزادسازی'))
    # آخرین اقدام چرخهٔ عمر (استرداد/اجرا/ابطال/تمدید)
    last_action = models.CharField(max_length=20, choices=LifecycleAction.choices, blank=True, verbose_name=_('آخرین اقدام'))
    last_action_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ آخرین اقدام'))
    note = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('تضمین')
        verbose_name_plural = _('تضمین‌ها')
        ordering = ['-expiry_date']

    def __str__(self):
        return f'{self.get_guarantee_type_display()} - {self.number or "—"}'


class Payment(BaseModel):
    """پرداخت done against a contract."""
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='payments', verbose_name=_('قرارداد'))
    invoice = models.ForeignKey(Invoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments', verbose_name=_('فاکتور مرتبط'))
    date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ پرداخت'))
    amount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ (ریال)'))
    reference = models.CharField(max_length=100, blank=True, verbose_name=_('شماره مرجع / سند'))
    method = models.CharField(max_length=50, blank=True, verbose_name=_('روش پرداخت'))

    class Meta:
        verbose_name = _('پرداخت')
        verbose_name_plural = _('پرداخت‌ها')
        ordering = ['-date']

    def __str__(self):
        return f'{self.date} - {self.amount}'


class ContractDispute(BaseModel):
    """اختلاف / دعوای مرتبط با قرارداد (Risk Management)."""

    class DisputeType(models.TextChoices):
        FINANCIAL = 'financial', _('مالی')
        TECHNICAL = 'technical', _('فنی')
        TIMELINE = 'timeline', _('زمان‌بندی / تأخیر')
        QUALITY = 'quality', _('کیفیت')
        LEGAL = 'legal', _('حقوقی')
        OTHER = 'other', _('سایر')

    class Status(models.TextChoices):
        OPEN = 'open', _('باز')
        UNDER_REVIEW = 'under_review', _('در حال بررسی')
        RESOLVED = 'resolved', _('حل‌شده')
        ESCALATED = 'escalated', _('ارجاع به مرجع بالاتر')
        CLOSED = 'closed', _('بسته')

    class Severity(models.TextChoices):
        LOW = 'low', _('کم')
        MEDIUM = 'medium', _('متوسط')
        HIGH = 'high', _('زیاد')
        CRITICAL = 'critical', _('بحرانی')

    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='disputes', verbose_name=_('قرارداد'))
    title = models.CharField(max_length=250, verbose_name=_('موضوع اختلاف'))
    dispute_type = models.CharField(max_length=20, choices=DisputeType.choices, default=DisputeType.OTHER, verbose_name=_('نوع اختلاف'))
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.MEDIUM, verbose_name=_('شدت'))
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN, verbose_name=_('وضعیت'))
    claim_amount = models.DecimalField(max_digits=18, decimal_places=0, null=True, blank=True, verbose_name=_('مبلغ ادعا (ریال)'))
    opened_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ طرح'))
    resolved_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ حل'))
    description = models.TextField(blank=True, verbose_name=_('شرح'))
    resolution = models.TextField(blank=True, verbose_name=_('اقدام/نتیجه'))

    class Meta:
        verbose_name = _('اختلاف قرارداد')
        verbose_name_plural = _('اختلافات و دعاوی')
        ordering = ['-opened_date', '-created_at']

    def __str__(self):
        return f'{self.get_dispute_type_display()} - {self.title}'


class ContractTypeMaster(BaseModel):
    """Master data: contract type (independent of pricing method)."""
    name = models.CharField(max_length=150, verbose_name=_('عنوان'))
    code = models.CharField(max_length=50, verbose_name=_('کد'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('نوع قرارداد')
        verbose_name_plural = _('انواع قرارداد')
        unique_together = [('company', 'code')]
        ordering = ['name']

    def __str__(self):
        return self.name


class SupplierEvaluation(BaseModel):
    """ارزیابی تأمین‌کننده/پیمانکار بر اساس معیارها و امتیاز."""

    class Recommendation(models.TextChoices):
        APPROVED = 'approved', _('تأییدشده')
        CONDITIONAL = 'conditional', _('تأیید مشروط')
        SUSPENDED = 'suspended', _('تعلیق')
        BLACKLISTED = 'blacklisted', _('لیست سیاه')

    party = models.ForeignKey(
        ContractParty, on_delete=models.CASCADE, related_name='evaluations', verbose_name=_('طرف قرارداد'),
    )
    contract = models.ForeignKey(
        Contract, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='evaluations', verbose_name=_('قرارداد مرتبط'),
    )
    evaluation_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ ارزیابی'))
    period = models.CharField(max_length=100, blank=True, verbose_name=_('دوره ارزیابی'))

    # Score criteria (0-100)
    quality_score = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name=_('کیفیت (۰-۱۰۰)'))
    delivery_score = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name=_('تحویل به‌موقع (۰-۱۰۰)'))
    price_score = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name=_('قیمت (۰-۱۰۰)'))
    cooperation_score = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name=_('همکاری (۰-۱۰۰)'))
    safety_score = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name=_('ایمنی/HSE (۰-۱۰۰)'))

    recommendation = models.CharField(max_length=20, choices=Recommendation.choices, default=Recommendation.APPROVED, verbose_name=_('نتیجه ارزیابی'))
    strengths = models.TextField(blank=True, verbose_name=_('نقاط قوت'))
    weaknesses = models.TextField(blank=True, verbose_name=_('نقاط ضعف'))
    evaluator = models.CharField(max_length=200, blank=True, verbose_name=_('ارزیاب'))

    class Meta:
        verbose_name = _('ارزیابی تأمین‌کننده')
        verbose_name_plural = _('ارزیابی‌های تأمین‌کننده')
        ordering = ['-evaluation_date', '-created_at']

    @property
    def total_score(self):
        scores = [self.quality_score, self.delivery_score, self.price_score, self.cooperation_score, self.safety_score]
        return sum(float(s or 0) for s in scores) / len(scores)

    def __str__(self):
        return f'{self.party.name} - {self.evaluation_date}'
