"""Contract management for external/third-party contracts.

Covers procurement, purchase, tender/مناقصه contracts with a full case file:
parties (contractor/vendor), contracts, invoices, statements (صورت وضعیت),
addendums (الحاقیه), guarantees (تضامین), and payments.
"""
from django.db import models
from django.contrib.postgres.indexes import GinIndex
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


class GuaranteeKind(models.TextChoices):
    """نوع ضمانت / تضمین — **منبع یگانه** برای هر دو جای کاربرد.

    «نوع ضمانت» در قرارداد (`Contract.guarantee_type` و اقلام `guarantee_items`) و
    «نوع تضمین» در تضامین ثبت‌شده (`Guarantee.guarantee_type`) هر دو به همین تعریف
    ارجاع می‌دهند (Contract.GuaranteeKind و Guarantee.GuaranteeType)، پس گزینه‌های
    دو صفحه هرگز از هم جدا نمی‌شوند.
    """

    PERFORMANCE = 'performance', _('ضمانت حسن انجام کار')
    ADVANCE = 'advance', _('ضمانت پیش‌پرداخت')
    BID = 'bid', _('ضمانت شرکت در مناقصه')
    EXECUTION = 'execution', _('ضمانت اجرای تعهدات')
    INSURANCE = 'insurance', _('سپرده حق بیمه')
    DEDUCTION_REFUND = 'deduction_refund', _('ضمانت استرداد کسور وجه‌الضمان')
    WARRANTY_PERIOD = 'warranty_period', _('ضمانت‌نامه دوره تضمین یا رفع عیب')
    MAINTENANCE_PERIOD = 'maintenance_period', _('ضمانت‌نامه دوره نگهداری')
    FUNDS_REFUND = 'funds_refund', _('ضمانت‌نامه بازپرداخت یا استرداد وجوه')
    INSURANCE_SOCIAL = 'insurance_social', _('ضمانت‌نامه تعهدات بیمه و تأمین اجتماعی')
    MATERIALS_SUPPLY = 'materials_supply', _('ضمانت‌نامه تأمین مصالح و تجهیزات')
    OTHER = 'other', _('سایر')


class ContractParty(BaseModel):
    """A contractor / vendor / supplier (طرف قرارداد)."""

    class PartyType(models.TextChoices):
        CONTRACTOR = 'contractor', _('پیمانکار')
        SUPPLIER = 'supplier', _('فروشنده / تأمین‌کننده')
        CONSULTANT = 'consultant', _('مشاور')
        OTHER = 'other', _('سایر')

    class PersonType(models.TextChoices):
        LEGAL = 'legal', _('شخص حقوقی')
        NATURAL = 'natural', _('شخص حقیقی')

    class CompanyType(models.TextChoices):
        PUBLIC_JOINT_STOCK = 'public_joint_stock', _('سهامی عام')
        PRIVATE_JOINT_STOCK = 'private_joint_stock', _('سهامی خاص')
        LLC = 'llc', _('با مسئولیت محدود')
        COOPERATIVE = 'cooperative', _('تعاونی')
        SOLE_PROPRIETORSHIP = 'sole_proprietorship', _('مؤسسه انفرادی')
        BRANCH = 'branch', _('شعبه / نمایندگی')
        OTHER = 'other', _('سایر')

    name = models.CharField(max_length=250, verbose_name=_('نام / عنوان'))
    person_type = models.CharField(max_length=10, choices=PersonType.choices, default=PersonType.LEGAL, verbose_name=_('نوع شخص'))
    party_type = models.CharField(max_length=20, choices=PartyType.choices, default=PartyType.CONTRACTOR, verbose_name=_('نوع طرف'))
    national_id = models.CharField(max_length=20, blank=True, verbose_name=_('شناسه ملی / کد ثبت'))
    economic_code = models.CharField(max_length=20, blank=True, verbose_name=_('کد اقتصادی'))
    registration_number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره ثبت'))
    establishment_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ تأسیس'))
    company_type = models.CharField(max_length=30, choices=CompanyType.choices, blank=True, verbose_name=_('نوع شرکت'))
    registered_capital = models.DecimalField(max_digits=20, decimal_places=0, null=True, blank=True, verbose_name=_('سرمایه ثبتی (ریال)'))
    phone = models.CharField(max_length=20, blank=True, verbose_name=_('تلفن'))
    mobile = models.CharField(max_length=20, blank=True, verbose_name=_('موبایل'))
    email = models.EmailField(blank=True, verbose_name=_('ایمیل'))
    address = models.TextField(blank=True, verbose_name=_('آدرس'))
    contact_person = models.CharField(max_length=200, blank=True, verbose_name=_('شخص رابط'))
    bank_name = models.CharField(max_length=100, blank=True, verbose_name=_('بانک'))
    account_number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره حساب'))
    sheba_number = models.CharField(max_length=30, blank=True, verbose_name=_('شماره شبا'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    # مدیریت و ارتباطات کلیدی
    ceo_name = models.CharField(max_length=200, blank=True, verbose_name=_('مدیر عامل'))
    ceo_phone = models.CharField(max_length=20, blank=True, verbose_name=_('شماره تماس مدیر عامل'))
    finance_manager_name = models.CharField(max_length=200, blank=True, verbose_name=_('مدیر مالی'))
    finance_manager_phone = models.CharField(max_length=20, blank=True, verbose_name=_('شماره تماس مدیر مالی'))
    technical_contact_name = models.CharField(max_length=200, blank=True, verbose_name=_('رابط فنی و مهندسی'))
    technical_contact_phone = models.CharField(max_length=20, blank=True, verbose_name=_('شماره تماس رابط فنی'))

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

    # «نوع ضمانت» قرارداد — همان گزینه‌های module-level (منبع یگانه با Guarantee.GuaranteeType)
    GuaranteeKind = GuaranteeKind

    number = models.CharField(max_length=100, blank=True, verbose_name=_('شماره قرارداد'))
    subject = models.CharField(max_length=300, verbose_name=_('موضوع قرارداد'))
    party = models.ForeignKey(
        ContractParty, on_delete=models.PROTECT, related_name='contracts', verbose_name=_('طرف قرارداد'),
    )
    contract_type = models.CharField(max_length=20, choices=ContractType.choices, default=ContractType.PURCHASE, verbose_name=_('نوع قرارداد'))
    contract_type_master = models.ForeignKey(
        'ContractTypeMaster', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='contracts', verbose_name=_('نوع قرارداد (پیکربندی)'),
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    amount = models.DecimalField(max_digits=18, decimal_places=0, null=True, blank=True, verbose_name=_('مبلغ قرارداد (ریال)'))
    currency = models.ForeignKey(
        'settings_app.Currency', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='external_contracts', verbose_name=_('واحد ارز'),
    )
    start_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ شروع'))
    end_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ پایان'))
    signing_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ امضا'))
    signatory = models.ForeignKey(
        'settings_app.Signatory', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='external_contracts', verbose_name=_('امضاکنندهٔ مجاز'),
    )
    guarantee_amount = models.DecimalField(max_digits=18, decimal_places=0, null=True, blank=True, verbose_name=_('مبلغ تضمین (ریال)'))
    guarantee_type = models.CharField(
        max_length=20, choices=GuaranteeKind.choices, null=True, blank=True,
        verbose_name=_('نوع ضمانت'),
    )
    # ضمانت‌های متعدد: [{type, amount, percent, note}]
    guarantee_items = models.JSONField(
        default=list, blank=True, verbose_name=_('ضمانت‌ها'),
        help_text=_('لیست ضمانت‌ها: [{type, amount, percent, note}]'),
    )

    # Link to Project Business Platform (nullable; a contract may or may not belong to a project)
    project = models.ForeignKey(
        'projects.Project', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='external_contracts', verbose_name=_('پروژه'),
    )
    # پروژه‌های متعدد با درصد تخصیص: [{project, percentage}]
    project_allocations = models.JSONField(
        default=list, blank=True, verbose_name=_('تخصیص پروژه‌ها'),
        help_text=_('لیست پروژه‌ها با درصد: [{project, percentage}]'),
    )

    # --- Extended / enterprise detail fields ---
    category = models.CharField(max_length=50, blank=True, verbose_name=_('طبقه‌بندی قرارداد'))
    project_name = models.CharField(max_length=300, blank=True, verbose_name=_('نام پروژه / طرح'))
    project_location = models.CharField(max_length=300, blank=True, verbose_name=_('محل اجرا / تحویل'))
    tender_number = models.CharField(max_length=100, blank=True, verbose_name=_('شماره مناقصه / استعلام'))
    advance_payment = models.DecimalField(max_digits=18, decimal_places=0, null=True, blank=True, verbose_name=_('پیش‌پرداخت (ریال)'))
    advance_payments = models.JSONField(
        default=list, blank=True, verbose_name=_('پیش‌پرداخت‌های مرحله‌ای'),
        help_text=_('لیست مراحل پیش‌پرداخت: [{step, amount, due_date, note}]'),
    )
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
        indexes = [
            # Phase 0: جست‌وجوی «قراردادهای یک پروژه» روی JSONB بدون Seq Scan انجام شود.
            GinIndex(
                fields=['project_allocations'],
                name='contract_alloc_gin_idx',
                opclasses=['jsonb_path_ops'],
            ),
        ]

    def __str__(self):
        return f'{self.number or "—"} - {self.subject}'


def contract_document_upload_path(instance, filename):
    """
    مسیر سند قرارداد در بایگانی:
        archive/company_{id}/contracts/{contract_number}/<uuid>.pdf
    """
    from core.engines.archive_storage_engine import resolve_upload_path

    try:
        contract = instance.contract
        fields = {
            'number': getattr(contract, 'number', '') or '',
            'name': getattr(contract, 'subject', '') or '',
            'id': contract.pk,
        }
    except Exception:  # noqa: BLE001 — قرارداد بارگذاری نشده نباید آپلود را بشکند
        fields = {}

    return resolve_upload_path(
        instance.company_id, 'hrms.contracts', fields, filename,
        fallback_dir='contract_documents',
    )


class ContractDocument(BaseModel):
    """A file attached to a contract case (PDF contract, attachments...)."""
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='documents', verbose_name=_('قرارداد'))
    addendum = models.ForeignKey(
        'Addendum', on_delete=models.CASCADE, null=True, blank=True,
        related_name='documents', verbose_name=_('الحاقیه'),
        help_text=_('در صورت پیوست بودن سند به یک الحاقیه، این فیلد پر می‌شود.'),
    )
    guarantee = models.ForeignKey(
        'Guarantee', on_delete=models.CASCADE, null=True, blank=True,
        related_name='documents', verbose_name=_('تضمین'),
        help_text=_('در صورت پیوست بودن سند به یک تضمین، این فیلد پر می‌شود.'),
    )
    statement = models.ForeignKey(
        'Statement', on_delete=models.CASCADE, null=True, blank=True,
        related_name='documents', verbose_name=_('صورت‌وضعیت'),
        help_text=_('در صورت پیوست بودن سند به یک صورت‌وضعیت، این فیلد پر می‌شود.'),
    )
    title = models.CharField(max_length=200, verbose_name=_('عنوان سند'))
    file = models.FileField(upload_to=contract_document_upload_path, verbose_name=_('فایل'))
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
    subject = models.CharField(max_length=300, blank=True, verbose_name=_('شرح فاکتور'))
    date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ فاکتور'))
    due_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ سررسید'))
    currency = models.ForeignKey(
        'settings_app.Currency', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='invoices', verbose_name=_('واحد ارز'),
    )
    amount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ'))
    vat = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مالیات'))
    total = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ کل'))
    is_paid = models.BooleanField(default=False, verbose_name=_('پرداخت شده'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('فاکتور')
        verbose_name_plural = _('فاکتورها')
        ordering = ['-date']
        indexes = [
            models.Index(fields=['contract', 'date'], name='invoice_contract_date_idx'),
        ]

    def __str__(self):
        return f'{self.number or "—"} ({self.total})'


class Statement(BaseModel):
    """صورت وضعیت (progress statement) for a contract."""
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='statements', verbose_name=_('قرارداد'))
    number = models.CharField(max_length=100, blank=True, verbose_name=_('شماره صورت‌وضعیت'))
    date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ'))
    # «مبلغ» = مبلغ تجمعی این صورت‌وضعیت (کارکرد کل تا این دوره)
    amount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ تجمعی این صورت‌وضعیت (ریال)'))
    # --- تفکیک کامل مالی صورت‌وضعیت ---
    cumulative_previous_amount = models.DecimalField(
        max_digits=18, decimal_places=0, default=0,
        verbose_name=_('مبلغ تجمعی صورت‌وضعیت قبلی (ریال)'),
    )
    work_done = models.DecimalField(
        max_digits=18, decimal_places=0, default=0,
        verbose_name=_('کارکرد دوره (ریال)'),
    )
    value_added_tax = models.DecimalField(
        max_digits=18, decimal_places=0, default=0,
        verbose_name=_('اضافات - ارزش افزوده (ریال)'),
    )
    other_additions = models.DecimalField(
        max_digits=18, decimal_places=0, default=0,
        verbose_name=_('سایر اضافات (ریال)'),
    )
    # اضافات به‌صورت آیتم‌های [{"code","description","percent","amount"}] (از تعاریف اولیه)
    additions = models.JSONField(default=list, blank=True, verbose_name=_('اضافات'))
    additions_total = models.DecimalField(
        max_digits=18, decimal_places=0, default=0,
        verbose_name=_('جمع اضافات (ریال)'),
    )
    # کسورات به‌صورت آیتم‌های [{"title": "بیمه", "amount": 1000000, "note": ""}]
    deductions = models.JSONField(default=list, blank=True, verbose_name=_('کسورات'))
    deductions_total = models.DecimalField(
        max_digits=18, decimal_places=0, default=0,
        verbose_name=_('جمع کسورات (ریال)'),
    )
    net_amount = models.DecimalField(
        max_digits=18, decimal_places=0, default=0,
        verbose_name=_('مبلغ قابل پرداخت (ریال)'),
    )
    currency = models.ForeignKey(
        'settings_app.Currency', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='statements', verbose_name=_('واحد ارز'),
    )
    exchange_rate = models.DecimalField(
        max_digits=18, decimal_places=6, null=True, blank=True,
        verbose_name=_('نرخ ارز (به ریال)'),
    )
    # تجمع ارزی مستقل از ریال؛ هر دوره فقط کارکرد همان دوره با نرخ خودش تبدیل می‌شود.
    foreign_amount = models.DecimalField(
        max_digits=18, decimal_places=4, default=0,
        verbose_name=_('مبلغ تجمعی ارزی این صورت‌وضعیت'),
    )
    foreign_previous_amount = models.DecimalField(
        max_digits=18, decimal_places=4, default=0,
        verbose_name=_('مبلغ تجمعی ارزی دوره قبل'),
    )
    foreign_work_done = models.DecimalField(
        max_digits=18, decimal_places=4, default=0,
        verbose_name=_('کارکرد ارزی دوره'),
    )
    is_approved = models.BooleanField(default=False, verbose_name=_('تأیید شده'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('صورت‌وضعیت')
        verbose_name_plural = _('صورت‌وضعیت‌ها')
        ordering = ['-date']
        indexes = [
            models.Index(fields=['contract', 'date'], name='stmt_contract_date_idx'),
        ]

    def __str__(self):
        return f'{self.number or "—"} ({self.amount})'


class Addendum(BaseModel):
    """الحاقیه / amendment to a contract."""

    class SubjectType(models.TextChoices):
        """موضوع استاندارد الحاقیه (مطابق فهرست رایج قراردادی)."""
        PROVISIONS = 'provisions', _('اصلاح و تکمیل مفاد قرارداد')
        AMOUNT = 'amount', _('تغییر مبلغ، بهای قرارداد و تعدیل قیمت')
        DURATION = 'duration', _('تغییر مدت، تمدید و اصلاح برنامه زمانی قرارداد')
        SCOPE = 'scope', _('تغییر موضوع، دامنه و حجم کار قرارداد')
        TECHNICAL = 'technical', _('تغییر مشخصات فنی، نقشه‌ها و استانداردهای اجرایی')
        PAYMENT = 'payment', _('تغییر شرایط پرداخت، پیش‌پرداخت و تسویه‌حساب')
        GUARANTEES = 'guarantees', _('تغییر تضامین، ضمانت‌نامه‌ها و وثایق')
        DEDUCTIONS = 'deductions', _('تغییر کسورات، جرایم و خسارات قراردادی')
        OBLIGATIONS = 'obligations', _('تغییر تعهدات، مسئولیت‌ها و حدود اختیارات طرفین')
        PARTIES = 'parties', _('تغییر مشخصات طرفین، نمایندگان و صاحبان امضای مجاز')
        PROJECT = 'project', _('تغییر پروژه، محل اجرا و نحوه تخصیص کار')
        CONSULTANTS = 'consultants', _('تغییر ناظر، مشاور، پیمانکاران جزء و عوامل اجرایی')
        SUPPLY = 'supply', _('تغییر شرایط تأمین مصالح، تجهیزات و تحویل کالا')
        LEGAL = 'legal', _('تغییر شرایط بیمه، مالیات و الزامات قانونی')
        SUSPENSION = 'suspension', _('تغییر شرایط تعلیق، توقف، ازسرگیری و خاتمه قرارداد')
        DELIVERY = 'delivery', _('تغییر شرایط تحویل، آزمایش، تأیید و تضمین کیفیت')
        CURRENCY = 'currency', _('تغییر ارز قرارداد، نرخ تسعیر و شرایط مالی بین‌المللی')
        OTHER = 'other', _('سایر تغییرات و الحاق موارد جدید')

    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='addendums', verbose_name=_('قرارداد'))
    number = models.CharField(max_length=100, blank=True, verbose_name=_('شماره الحاقیه'))
    subject_type = models.CharField(
        max_length=20, choices=SubjectType.choices, blank=True,
        verbose_name=_('موضوع اصلی الحاقیه'),
        help_text=_('به‌صورت خودکار از اولین «موضوع‌های الحاقیه» هم‌گام می‌شود.'),
    )
    subject = models.CharField(max_length=300, blank=True, verbose_name=_('شرح موضوع'))
    subjects = models.JSONField(
        default=list, blank=True, verbose_name=_('موضوع‌های الحاقیه'),
        help_text=_('فهرست موضوع‌ها همراه فیلدهای تخصصی هر موضوع: '
                    '[{"type": "amount", "fields": {...}}] — امکان انتخاب چند موضوع.'),
    )
    # ---- مقادیر اثرگذار بر پروندهٔ قرارداد (آینهٔ فیلدهای موضوعی، برای گزارش/فیلتر) ----
    new_amount = models.DecimalField(
        max_digits=18, decimal_places=0, null=True, blank=True,
        verbose_name=_('مبلغ جدید قرارداد'),
    )
    advance_change = models.DecimalField(
        max_digits=18, decimal_places=0, null=True, blank=True,
        verbose_name=_('تغییر پیش‌پرداخت'),
    )
    new_advance_payment = models.DecimalField(
        max_digits=18, decimal_places=0, null=True, blank=True,
        verbose_name=_('پیش‌پرداخت جدید'),
    )
    new_retention_percent = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        verbose_name=_('درصد حسن انجام کار جدید'),
    )
    new_guarantee_amount = models.DecimalField(
        max_digits=18, decimal_places=0, null=True, blank=True,
        verbose_name=_('مبلغ جدید تضمین'),
    )
    new_exchange_rate = models.DecimalField(
        max_digits=18, decimal_places=6, null=True, blank=True,
        verbose_name=_('نرخ تسعیر جدید'),
    )
    date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ'))
    currency = models.ForeignKey(
        'settings_app.Currency', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='addendums', verbose_name=_('واحد ارز'),
    )
    amount_change = models.DecimalField(max_digits=18, decimal_places=0, null=True, blank=True, verbose_name=_('تغییر مبلغ'))
    percent_change = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, verbose_name=_('درصد تغییر'))
    new_end_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ پایان جدید'))
    change_description = models.TextField(blank=True, verbose_name=_('شرح تغییرات'))
    # مفاد / بندهای الحاقیه: [{"title": "...", "text": "..."}]
    provisions = models.JSONField(default=list, blank=True, verbose_name=_('مفاد / بندها'))

    class Meta:
        verbose_name = _('الحاقیه')
        verbose_name_plural = _('الحاقیه‌ها')
        ordering = ['-date']

    def __str__(self):
        return f'{self.number or "—"} - {self.date}'

    # ------------------------------------------------------------------ موضوع‌ها
    @property
    def subject_values(self):
        """ارزش موضوع‌ها (با پشتیبان‌گیری از فیلد تک‌مقداری قدیمی)."""
        values = [
            item.get('type') for item in (self.subjects or [])
            if isinstance(item, dict) and item.get('type')
        ]
        if not values and self.subject_type:
            values = [self.subject_type]
        return values

    @property
    def subject_labels(self):
        from contracts.addendum_schema import subject_label

        return [label for label in (subject_label(value) for value in self.subject_values) if label]

    @property
    def subjects_display(self):
        """عنوان‌های موضوع‌ها به‌صورت یک متن (برای فهرست/خروجی)."""
        return '، '.join(self.subject_labels)

    def subject_fields(self, kind=None):
        """فیلدهای تخصصی موضوع‌ها (برای فرم/خروجی)."""
        rows = []
        for item in self.subjects or []:
            if not isinstance(item, dict):
                continue
            if kind and item.get('type') != kind:
                continue
            rows.append({'type': item.get('type'), 'fields': item.get('fields') or {}})
        return rows

    @property
    def subject_label(self):
        """عنوان موضوع‌ها؛ در نبود آن‌ها شرح موضوع."""
        labels = self.subject_labels
        if labels:
            return '، '.join(labels)
        return self.subject or ''

    def clean(self):
        """اعتبارسنجی موضوع‌ها (نامعتبر/تکراری) و هم‌گامی موضوع اصلی."""
        from django.core.exceptions import ValidationError

        from contracts.addendum_schema import validate_subjects

        errors = validate_subjects(self.subjects)
        if errors:
            raise ValidationError({'subjects': errors})

    def save(self, *args, **kwargs):
        """نرمال‌سازی موضوع‌ها و هم‌گام‌سازی «موضوع اصلی» پیش از ذخیره."""
        from contracts.addendum_schema import normalize_subjects

        self.subjects = normalize_subjects(self.subjects)
        values = [item['type'] for item in self.subjects]
        self.subject_type = values[0] if values else (self.subject_type or '')
        super().save(*args, **kwargs)


class Guarantee(BaseModel):
    """ضمانت / چک / سفته associated with a contract.

    Instrument kinds:
      - check             چک
      - promissory        سفته
      - bank_guarantee    ضمانت‌نامه بانکی
    Lifecycle actions depend on the kind.
    """

    # «نوع تضمین» تضامین ثبت‌شده — همان گزینه‌های Contract.guarantee_type (منبع یگانه)
    GuaranteeType = GuaranteeKind

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
    contract_guarantee_index = models.PositiveIntegerField(
        null=True, blank=True,
        verbose_name=_('ردیف ضمانت قرارداد'),
        help_text=_('اندیس ضمانت انتخاب‌شده در فهرست guarantee_items قرارداد'),
    )
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
    statement = models.ForeignKey(Statement, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments', verbose_name=_('صورت‌وضعیت مرتبط'))
    date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ پرداخت'))
    currency = models.ForeignKey(
        'settings_app.Currency', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payments', verbose_name=_('واحد ارز'),
    )
    amount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ'))
    reference = models.CharField(max_length=100, blank=True, verbose_name=_('شماره مرجع / سند'))
    method = models.CharField(max_length=50, blank=True, verbose_name=_('روش پرداخت'))
    note = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('پرداخت')
        verbose_name_plural = _('پرداخت‌ها')
        ordering = ['-date']
        indexes = [
            models.Index(fields=['contract', 'date'], name='payment_contract_date_idx'),
        ]

    def __str__(self):
        return f'{self.date} - {self.amount}'


def payment_attachment_upload_path(instance, filename):
    """مسیر فایل پیوست پرداخت در بایگانی قرارداد."""
    from core.engines.archive_storage_engine import resolve_upload_path

    try:
        payment = instance.payment
        contract = payment.contract
        fields = {
            'number': getattr(contract, 'number', '') or '',
            'name': getattr(contract, 'subject', '') or '',
            'id': payment.pk,
        }
    except Exception:  # noqa: BLE001 — پرداخت ذخیره‌نشده نباید آپلود را بشکند
        fields = {}

    return resolve_upload_path(
        instance.company_id, 'hrms.contracts', fields, filename,
        fallback_dir='payment_attachments', subfolder='payments',
    )


class PaymentAttachment(BaseModel):
    """فایل پیوست یک پرداخت قرارداد (رسید، حواله، سند بانکی و...)."""

    payment = models.ForeignKey(
        Payment, on_delete=models.CASCADE, related_name='attachments',
        verbose_name=_('پرداخت'),
    )
    title = models.CharField(max_length=200, blank=True, verbose_name=_('عنوان فایل'))
    file = models.FileField(upload_to=payment_attachment_upload_path, verbose_name=_('فایل'))
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name=_('زمان بارگذاری'))

    class Meta:
        verbose_name = _('پیوست پرداخت')
        verbose_name_plural = _('پیوست‌های پرداخت')
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.title or self.file.name


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


class ContractTemplate(BaseModel):
    """قالب قرارداد — متن/ساختار آماده برای تولید پیش‌نویس قرارداد."""

    name = models.CharField(max_length=200, verbose_name=_('عنوان قالب'))
    contract_type_master = models.ForeignKey(
        ContractTypeMaster, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='templates', verbose_name=_('نوع قرارداد'),
    )
    content = models.TextField(verbose_name=_('متن / ساختار قالب'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('قالب قرارداد')
        verbose_name_plural = _('قالب‌ها و پیش‌نویس‌ها')
        ordering = ['name']

    def __str__(self):
        return self.name


class ContractDraft(BaseModel):
    """پیش‌نویس قرارداد با وضعیت و گردش‌کار تأیید."""

    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        PENDING = 'pending_approval', _('در انتظار تأیید')
        APPROVED = 'approved', _('تأیید شده')
        REJECTED = 'rejected', _('رد شده')

    title = models.CharField(max_length=300, verbose_name=_('عنوان پیش‌نویس'))
    template = models.ForeignKey(
        ContractTemplate, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='drafts', verbose_name=_('قالب مبدأ'),
    )
    contract = models.ForeignKey(
        Contract, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='drafts', verbose_name=_('قرارداد مرتبط'),
    )
    content = models.TextField(blank=True, verbose_name=_('متن پیش‌نویس'))
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    submitted_by = models.CharField(max_length=200, blank=True, verbose_name=_('ثبت‌کننده'))
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان ارسال برای تأیید'))

    class Meta:
        verbose_name = _('پیش‌نویس قرارداد')
        verbose_name_plural = _('پیش‌نویس‌ها')
        ordering = ['-updated_at']

    def __str__(self):
        return self.title


class ContractApproval(BaseModel):
    """یک مرحله از گردش‌کار تأیید پیش‌نویس قرارداد."""

    class Status(models.TextChoices):
        PENDING = 'pending', _('در انتظار')
        APPROVED = 'approved', _('تأیید شد')
        REJECTED = 'rejected', _('رد شد')

    draft = models.ForeignKey(
        ContractDraft, on_delete=models.CASCADE, related_name='approvals', verbose_name=_('پیش‌نویس'),
    )
    step = models.PositiveSmallIntegerField(default=1, verbose_name=_('مرحله'))
    approver = models.CharField(max_length=200, verbose_name=_('تأییدکننده'))
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, verbose_name=_('وضعیت'))
    comment = models.TextField(blank=True, verbose_name=_('نظر'))
    acted_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان اقدام'))

    class Meta:
        verbose_name = _('مرحله تأیید قرارداد')
        verbose_name_plural = _('گردش‌کار تأیید')
        ordering = ['step']

    def __str__(self):
        return f'{self.draft.title} - مرحله {self.step} ({self.get_status_display()})'



class ContractApprovalWorkflow(BaseModel):
    """تعریف گردش‌کار تأیید قرارداد: مجموعه‌ای از مراحل تأیید برای هر نوع قرارداد."""

    name = models.CharField(max_length=200, verbose_name=_('عنوان گردش‌کار'))
    contract_type = models.ForeignKey(
        ContractTypeMaster, on_delete=models.CASCADE, null=True, blank=True,
        related_name='approval_workflows', verbose_name=_('نوع قرارداد'),
    )
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('گردش‌کار تأیید')
        verbose_name_plural = _('گردش‌کارهای تأیید')
        ordering = ['name']

    def __str__(self):
        return self.name


class ContractApprovalStep(BaseModel):
    """یک مرحله از گردش‌کار تأیید قرارداد."""

    workflow = models.ForeignKey(
        ContractApprovalWorkflow, on_delete=models.CASCADE, related_name='steps', verbose_name=_('گردش‌کار'),
    )
    step = models.PositiveSmallIntegerField(default=1, verbose_name=_('ترتیب'))
    title = models.CharField(max_length=200, verbose_name=_('عنوان مرحله'))
    approver_role = models.CharField(max_length=200, verbose_name=_('نقش / سمت تأییدکننده'))
    min_amount = models.DecimalField(max_digits=18, decimal_places=0, null=True, blank=True, verbose_name=_('آستانه مبلغ (ریال)'))

    class Meta:
        verbose_name = _('مرحله گردش‌کار تأیید')
        verbose_name_plural = _('مراحل گردش‌کار تأیید')
        unique_together = [('workflow', 'step')]
        ordering = ['workflow', 'step']

    def __str__(self):
        return f'{self.workflow.name} - {self.step}. {self.title}'



class ContractAuditLog(BaseModel):
    """سابقه تغییرات قرارداد (audit trail) — چه کسی، چه چیزی، چه زمانی."""

    class Action(models.TextChoices):
        CREATE = 'create', _('ایجاد')
        UPDATE = 'update', _('ویرایش')
        DELETE = 'delete', _('حذف')
        STATUS = 'status', _('تغییر وضعیت')

    contract = models.ForeignKey(
        Contract, on_delete=models.CASCADE, related_name='audit_logs', verbose_name=_('قرارداد'),
    )
    user = models.CharField(max_length=200, blank=True, verbose_name=_('کاربر'))
    action = models.CharField(max_length=20, choices=Action.choices, verbose_name=_('اقدام'))
    field = models.CharField(max_length=100, blank=True, verbose_name=_('فیلد'))
    old_value = models.TextField(blank=True, verbose_name=_('مقدار قبلی'))
    new_value = models.TextField(blank=True, verbose_name=_('مقدار جدید'))

    class Meta:
        verbose_name = _('سابقه تغییرات قرارداد')
        verbose_name_plural = _('سوابق تغییرات قرارداد')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.contract_id} - {self.get_action_display()} - {self.field}'


class ContractAccountMapping(BaseModel):
    """نگاشت حساب‌های مالی قرارداد و کنترل تفصیل‌ها.

    برای هر «نقطهٔ مالی» قرارداد (حسن انجام کار، سپرده بیمه، پرداختنی،
    دریافتنی و ...) یک حساب معین و حداکثر سه تفصیل تعیین می‌شود. موتور
    حسابداری قرارداد این تنظیمات را از همین رکورد می‌خواند.
    """

    class Key(models.TextChoices):
        BASE = 'base_subsidiary', _('حساب معین پایه')
        RETENTION = 'retention', _('حسن انجام کار')
        INSURANCE_DEPOSIT = 'insurance_deposit', _('سپرده بیمه')
        PAYABLE = 'payable', _('پرداختنی‌ها')
        RECEIVABLE = 'receivable', _('دریافتنی‌ها')
        ADVANCE = 'advance', _('پیش‌پرداخت')
        TAX = 'tax', _('مالیات و عوارض')
        PENALTY = 'penalty', _('جریمه و خسارت')
        FEE = 'fee', _('کارمزد و خدمات')
        REVENUE = 'revenue', _('درآمد صورت‌وضعیت')
        COST = 'cost', _('هزینه و مصالح')
        GUARANTEE = 'guarantee', _('تضامین و ضمانت‌نامه‌ها')
        OTHER = 'other', _('سایر')

    class AuxSource(models.TextChoices):
        AUTO = 'auto', _('از دستهٔ تفصیلی (خودکار)')
        NONE = 'none', _('بدون تفصیل')
        CONTRACT = 'contract', _('قرارداد همین سند')
        PARTY = 'party', _('طرف حساب / پیمانکار')
        SUPPLIER = 'supplier', _('تأمین‌کننده')
        EMPLOYEE = 'employee', _('پرسنل')
        PROJECT = 'project', _('پروژه')
        BANK = 'bank', _('بانک')
        CASH = 'cash', _('صندوق')
        FIXED = 'fixed', _('تفصیل ثابت')

    class ControlMode(models.TextChoices):
        SOFT = 'soft', _('کنترل نرم (هشدار)')
        STRICT = 'strict', _('کنترل سخت (مسدودسازی)')

    key = models.CharField(max_length=40, choices=Key.choices, verbose_name=_('نقطهٔ مالی'))
    title = models.CharField(max_length=200, blank=True, verbose_name=_('عنوان نمایشی'))
    subsidiary_account = models.ForeignKey(
        'accounting.Account', on_delete=models.PROTECT, null=True, blank=True,
        related_name='contract_account_mappings', verbose_name=_('حساب معین'),
    )
    auxiliary_source_1 = models.CharField(
        max_length=20, choices=AuxSource.choices, default=AuxSource.NONE,
        verbose_name=_('منبع تفصیل یک'),
    )
    auxiliary_category_1 = models.ForeignKey(
        'accounting.AuxiliaryCategory', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='contract_mapping_slot_1', verbose_name=_('دستهٔ تفصیل یک'),
    )
    auxiliary_1 = models.ForeignKey(
        'accounting.AuxiliaryAccount', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='contract_mapping_fixed_1', verbose_name=_('تفصیل ثابت یک'),
    )
    auxiliary_source_2 = models.CharField(
        max_length=20, choices=AuxSource.choices, default=AuxSource.NONE,
        verbose_name=_('منبع تفصیل دو'),
    )
    auxiliary_category_2 = models.ForeignKey(
        'accounting.AuxiliaryCategory', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='contract_mapping_slot_2', verbose_name=_('دستهٔ تفصیل دو'),
    )
    auxiliary_2 = models.ForeignKey(
        'accounting.AuxiliaryAccount', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='contract_mapping_fixed_2', verbose_name=_('تفصیل ثابت دو'),
    )
    auxiliary_source_3 = models.CharField(
        max_length=20, choices=AuxSource.choices, default=AuxSource.NONE,
        verbose_name=_('منبع تفصیل سه'),
    )
    auxiliary_category_3 = models.ForeignKey(
        'accounting.AuxiliaryCategory', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='contract_mapping_slot_3', verbose_name=_('دستهٔ تفصیل سه'),
    )
    auxiliary_3 = models.ForeignKey(
        'accounting.AuxiliaryAccount', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='contract_mapping_fixed_3', verbose_name=_('تفصیل ثابت سه'),
    )
    auto_create_auxiliaries = models.BooleanField(
        default=True, verbose_name=_('ساخت خودکار تفصیل‌ها'),
        help_text=_('اگر تفصیل متناظر پیدا نشد، سیستم آن را بسازد.'),
    )
    enforce_auxiliary = models.BooleanField(
        default=False, verbose_name=_('الزام تفصیل هنگام ثبت'),
        help_text=_('در صورت فعال بودن، ثبت مالی بدون تفصیل‌های تعیین‌شده مسدود می‌شود.'),
    )
    control_mode = models.CharField(
        max_length=10, choices=ControlMode.choices, default=ControlMode.SOFT,
        verbose_name=_('حالت کنترل'),
    )
    notes = models.TextField(blank=True, verbose_name=_('توضیحات و کنترل‌ها'))
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name=_('ترتیب نمایش'))

    class Meta:
        verbose_name = _('نگاشت حساب قرارداد')
        verbose_name_plural = _('نگاشت‌های حساب قرارداد')
        unique_together = [('company', 'key')]
        ordering = ['sort_order', 'key']

    def __str__(self):
        return f'{self.get_key_display()} - {self.subsidiary_account or "بدون حساب"}'

    @property
    def general_account(self):
        """ریشهٔ سلسله‌مراتبی حساب معین (حساب کل)."""
        account = self.subsidiary_account
        seen = set()
        while account is not None and getattr(account, 'parent_id', None) and account.pk not in seen:
            seen.add(account.pk)
            account = account.parent
        return account
