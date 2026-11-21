"""
Models for the Settings module - System settings, company profile, signatories.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel
from core.models import Company


class SystemSetting(BaseModel):
    """
    Dynamic system settings per company.
    Key-value storage with type hints and editability control.
    """
    class DataType(models.TextChoices):
        STRING = 'string', _('متن')
        INTEGER = 'integer', _('عدد صحیح')
        BOOLEAN = 'boolean', _('بله/خیر')
        JSON = 'json', _('JSON')
        FILE_PATH = 'file_path', _('مسیر فایل')

    key = models.CharField(max_length=100, verbose_name=_('کلید تنظیم'))
    value = models.TextField(
        verbose_name=_('مقدار'),
        help_text=_('مقدار تنظیم (همیشه به‌صورت متن ذخیره می‌شود)'),
    )
    description = models.TextField(blank=True, null=True, verbose_name=_('توضیحات'))
    data_type = models.CharField(
        max_length=20, choices=DataType.choices, default=DataType.STRING,
        verbose_name=_('نوع داده'),
    )
    is_editable = models.BooleanField(default=True, verbose_name=_('قابل ویرایش'))

    class Meta:
        verbose_name = _('تنظیم سیستم')
        verbose_name_plural = _('تنظیمات سیستم')
        unique_together = [('company', 'key')]
        ordering = ['key']

    def __str__(self):
        return f"{self.key} = {self.value[:50]}"

    @staticmethod
    def get_default_settings():
        import json
        return [
            {'key': 'BASE_FILE_STORAGE_PATH', 'value': '', 'data_type': 'file_path', 'description': _('مسیر ذخیره‌سازی فایل‌ها'), 'is_editable': True},
            {'key': 'MAX_FILE_SIZE', 'value': '10', 'data_type': 'integer', 'description': _('حداکثر حجم فایل (مگابایت)'), 'is_editable': True},
            {'key': 'ALLOWED_FILE_EXTENSIONS', 'value': json.dumps(['pdf', 'jpg', 'jpeg', 'png', 'docx', 'xlsx']), 'data_type': 'json', 'description': _('فرمت‌های مجاز فایل'), 'is_editable': True},
            {'key': 'EXPIRY_ALERT_DAYS', 'value': '30', 'data_type': 'integer', 'description': _('تعداد روز قبل از انقضا برای هشدار'), 'is_editable': True},
            {'key': 'CONTRACT_ALERT_DAYS', 'value': '60', 'data_type': 'integer', 'description': _('تعداد روز قبل از پایان قرارداد برای هشدار'), 'is_editable': True},
            {'key': 'LEAVE_DEFAULT_TOTAL_DAYS', 'value': '30', 'data_type': 'integer', 'description': _('تعداد روز مرخصی استحقاقی پیش‌فرض در سال'), 'is_editable': True},
            {'key': 'LEAVE_CALCULATE_WEEKENDS', 'value': 'true', 'data_type': 'boolean', 'description': _('آیا روزهای تعطیل در محاسبه مرخصی لحاظ شوند؟'), 'is_editable': True},
            {'key': 'ATTENDANCE_WORK_DAYS_PER_MONTH', 'value': '22', 'data_type': 'integer', 'description': _('میانگین روزهای کاری در ماه'), 'is_editable': True},
            {'key': 'DATE_FORMAT', 'value': 'YYYY/MM/DD', 'data_type': 'string', 'description': _('فرمت نمایش تاریخ'), 'is_editable': True},
            {'key': 'CURRENCY_SYMBOL', 'value': 'ریال', 'data_type': 'string', 'description': _('نماد واحد پول'), 'is_editable': True},
        ]


class CompanyProfile(models.Model):
    """Extended company profile with legal and contact details."""
    company = models.OneToOneField(
        Company,
        on_delete=models.CASCADE,
        related_name='profile',
        db_constraint=False,
        verbose_name=_('شرکت'),
    )
    legal_name = models.CharField(max_length=200, blank=True, null=True, verbose_name=_('نام کامل حقوقی'))
    brand_name = models.CharField(max_length=200, blank=True, verbose_name=_('نام تجاری / برند'))
    legal_form = models.CharField(
        max_length=30, blank=True,
        choices=[
            ('private_joint_stock', _('سهامی خاص')),
            ('public_joint_stock', _('سهامی عام')),
            ('limited_liability', _('با مسئولیت محدود')),
            ('general_partnership', _('تضامنی')),
            ('cooperative', _('تعاونی')),
            ('sole_proprietorship', _('مالکیت فردی')),
            ('public_institution', _('مؤسسه/نهاد عمومی')),
            ('other', _('سایر')),
        ],
        verbose_name=_('شکل حقوقی'),
    )
    registration_number = models.CharField(max_length=50, blank=True, null=True, verbose_name=_('شماره ثبت'))
    registration_office = models.CharField(max_length=200, blank=True, verbose_name=_('اداره ثبت'))
    registration_date = models.DateField(blank=True, null=True, verbose_name=_('تاریخ ثبت'))
    national_id = models.CharField(max_length=20, blank=True, null=True, verbose_name=_('شناسه ملی'))
    economic_code = models.CharField(max_length=20, blank=True, null=True, verbose_name=_('کد اقتصادی'))
    tax_id = models.CharField(max_length=50, blank=True, null=True, verbose_name=_('شناسه مالیاتی'))
    tax_office = models.CharField(max_length=200, blank=True, verbose_name=_('حوزه مالیاتی'))
    insurance_code = models.CharField(max_length=50, blank=True, verbose_name=_('کد بیمه‌ای کارفرما'))
    duns_number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره DUNS / کد بین‌المللی'))
    stock_symbol = models.CharField(max_length=50, blank=True, verbose_name=_('نماد بورسی'))
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name=_('تلفن'))
    secondary_phone = models.CharField(max_length=20, blank=True, verbose_name=_('تلفن دوم'))
    fax = models.CharField(max_length=20, blank=True, verbose_name=_('فکس'))
    mobile = models.CharField(max_length=20, blank=True, verbose_name=_('موبایل'))
    email = models.EmailField(blank=True, null=True, verbose_name=_('ایمیل'))
    address = models.TextField(blank=True, null=True, verbose_name=_('آدرس'))
    address_line2 = models.CharField(max_length=300, blank=True, verbose_name=_('ادامهٔ آدرس'))
    postal_code = models.CharField(max_length=20, blank=True, null=True, verbose_name=_('کد پستی'))
    country = models.CharField(max_length=100, blank=True, default='ایران', verbose_name=_('کشور'))
    province = models.CharField(max_length=100, blank=True, verbose_name=_('استان'))
    city = models.CharField(max_length=100, blank=True, verbose_name=_('شهر'))
    coordinates = models.CharField(max_length=80, blank=True, verbose_name=_('مختصات جغرافیایی'))
    website = models.URLField(blank=True, null=True, verbose_name=_('وب‌سایت'))
    logo = models.ImageField(upload_to='company_logos/', blank=True, null=True, verbose_name=_('لوگو'))
    seal_image = models.ImageField(upload_to='company_seals/', blank=True, null=True, verbose_name=_('تصویر مهر شرکت'))
    established_date = models.DateField(blank=True, null=True, verbose_name=_('تاریخ تأسیس'))
    fiscal_year_end = models.DateField(blank=True, null=True, verbose_name=_('پایان سال مالی'))
    registered_capital = models.DecimalField(max_digits=18, decimal_places=0, null=True, blank=True, verbose_name=_('سرمایهٔ ثبت‌شده (ریال)'))
    paid_capital = models.DecimalField(max_digits=18, decimal_places=0, null=True, blank=True, verbose_name=_('سرمایهٔ پرداخت‌شده (ریال)'))
    total_shares = models.BigIntegerField(null=True, blank=True, verbose_name=_('تعداد کل سهام'))
    share_nominal_value = models.DecimalField(max_digits=18, decimal_places=0, null=True, blank=True, verbose_name=_('ارزش اسمی هر سهم (ریال)'))
    legal_auditor = models.CharField(max_length=200, blank=True, verbose_name=_('بازرس قانونی'))
    financial_advisor = models.CharField(max_length=200, blank=True, verbose_name=_('مشاور مالی'))
    description = models.TextField(blank=True, null=True, verbose_name=_('توضیحات'))

    # Legal representative / CEO (used in contracts).
    employer_rep_name = models.CharField(max_length=200, blank=True, verbose_name=_('نام نماینده حقوقی / مدیرعامل'))
    employer_rep_title = models.CharField(max_length=100, blank=True, verbose_name=_('سمت نماینده'))
    employer_rep_national_id = models.CharField(max_length=20, blank=True, verbose_name=_('کد ملی نماینده'))

    # Notification channels (Bale messenger + email)
    notify_email_enabled = models.BooleanField(default=True, verbose_name=_('ارسال ایمیل فعال'))
    notify_bale_enabled = models.BooleanField(default=False, verbose_name=_('ارسال پیام بله فعال'))
    bale_token = models.CharField(max_length=200, blank=True, verbose_name=_('توکن ربات بله'))
    bale_chat_id = models.CharField(max_length=100, blank=True, verbose_name=_('شناسه گفتگوی بله (chat_id)'))

    # Storage paths (configurable, per category)
    base_storage_path = models.CharField(
        max_length=500, blank=True, verbose_name=_('مسیر پایه ذخیره‌سازی'),
        help_text=_('ریشهٔ همهٔ فایل‌های آپلودی (مثال: /var/hr_data)'),
    )
    storage_path_employees = models.CharField(
        max_length=500, blank=True, verbose_name=_('مسیر مدارک پرسنل'),
        help_text=_('پوشهٔ مدارک پرسنلی (نسبی به مسیر پایه)'),
    )
    storage_path_correspondences = models.CharField(
        max_length=500, blank=True, verbose_name=_('مسیر مکاتبات'),
        help_text=_('پوشهٔ لازم برای نامه‌ها و مکاتبات'),
    )
    storage_path_documents = models.CharField(
        max_length=500, blank=True, verbose_name=_('مسیر بایگانی اسناد'),
        help_text=_('پوشهٔ اسناد سازمان'),
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('تاریخ ایجاد'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('تاریخ به‌روزرسانی'))

    class Meta:
        verbose_name = _('مشخصات شرکت')
        verbose_name_plural = _('مشخصات شرکت‌ها')

    def __str__(self):
        return f"Profile: {self.company.name}"


class Signatory(BaseModel):
    """A named signatory (صاحب امضا) — multiple signatories are supported."""

    full_name = models.CharField(max_length=200, verbose_name=_('نام و نام خانوادگی'))
    position = models.CharField(max_length=200, blank=True, verbose_name=_('سمت / عنوان'))
    national_id = models.CharField(max_length=20, blank=True, verbose_name=_('کد ملی'))
    mobile = models.CharField(max_length=20, blank=True, verbose_name=_('موبایل'))
    email = models.EmailField(blank=True, verbose_name=_('ایمیل'))
    signature_image = models.ImageField(
        upload_to='signatory_samples/',
        null=True, blank=True,
        verbose_name=_('نمونه امضا'),
    )
    signature_order = models.PositiveSmallIntegerField(default=0, verbose_name=_('ترتیب امضا'))
    is_default = models.BooleanField(default=False, verbose_name=_('امضای پیش‌فرض'))
    can_sign_contracts = models.BooleanField(default=True, verbose_name=_('مجاز به امضای قرارداد'))
    can_sign_financial = models.BooleanField(default=True, verbose_name=_('مجاز به امضای اسناد مالی'))
    note = models.TextField(blank=True, verbose_name=_('یادداشت'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('صاحب امضا')
        verbose_name_plural = _('صاحبان امضا')
        ordering = ['signature_order', 'full_name']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_default:
            Signatory.objects.filter(company=self.company, is_default=True).exclude(pk=self.pk).update(is_default=False)

    def __str__(self):
        return self.full_name


class CompanyShareholder(BaseModel):
    """سهام‌دار شرکت — حقیقی یا حقوقی، با درصد و تعداد سهام."""

    class ShareholderType(models.TextChoices):
        NATURAL = 'natural', _('شخص حقیقی')
        LEGAL = 'legal', _('شخص حقوقی')
        INSTITUTIONAL = 'institutional', _('نهاد / سرمایه‌گذار')

    profile = models.ForeignKey(
        CompanyProfile, on_delete=models.CASCADE, related_name='shareholders',
        verbose_name=_('مشخصات شرکت'),
    )
    shareholder_type = models.CharField(
        max_length=20, choices=ShareholderType.choices, default=ShareholderType.NATURAL,
        verbose_name=_('نوع سهام‌دار'),
    )
    name = models.CharField(max_length=200, verbose_name=_('نام سهام‌دار'))
    national_id = models.CharField(max_length=20, blank=True, verbose_name=_('کد ملی / شناسه ملی'))
    registration_number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره ثبت'))
    economic_code = models.CharField(max_length=20, blank=True, verbose_name=_('کد اقتصادی'))
    representative_name = models.CharField(max_length=200, blank=True, verbose_name=_('نام نماینده'))
    representative_national_id = models.CharField(max_length=20, blank=True, verbose_name=_('کد ملی نماینده'))
    share_percent = models.DecimalField(max_digits=6, decimal_places=3, default=0, verbose_name=_('درصد سهام'))
    shares_count = models.BigIntegerField(default=0, verbose_name=_('تعداد سهام'))
    investment_amount = models.DecimalField(max_digits=18, decimal_places=0, null=True, blank=True, verbose_name=_('مبلغ سرمایه‌گذاری (ریال)'))
    start_date = models.DateField(blank=True, null=True, verbose_name=_('تاریخ شروع سهامداری'))
    end_date = models.DateField(blank=True, null=True, verbose_name=_('تاریخ پایان سهامداری'))
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name=_('ترتیب'))
    note = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('سهام‌دار')
        verbose_name_plural = _('سهام‌داران')
        ordering = ['sort_order', 'name']

    def __str__(self):
        return f'{self.name} ({self.share_percent}%)'


class CompanyBoardMember(BaseModel):
    """عضو هیئت مدیره / بازرس."""

    class MembershipType(models.TextChoices):
        EXECUTIVE = 'executive', _('اجرایی')
        NON_EXECUTIVE = 'non_executive', _('غیراجرایی')
        INDEPENDENT = 'independent', _('مستقل')

    profile = models.ForeignKey(
        CompanyProfile, on_delete=models.CASCADE, related_name='board_members',
        verbose_name=_('مشخصات شرکت'),
    )
    full_name = models.CharField(max_length=200, verbose_name=_('نام و نام خانوادگی'))
    position = models.CharField(max_length=200, verbose_name=_('سمت در هیئت مدیره'))
    membership_type = models.CharField(
        max_length=20, choices=MembershipType.choices, default=MembershipType.NON_EXECUTIVE,
        verbose_name=_('نوع عضویت'),
    )
    national_id = models.CharField(max_length=20, blank=True, verbose_name=_('کد ملی'))
    appointment_date = models.DateField(blank=True, null=True, verbose_name=_('تاریخ انتصاب'))
    end_date = models.DateField(blank=True, null=True, verbose_name=_('پایان دوره'))
    share_percent = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True, verbose_name=_('درصد سهام (اختیاری)'))
    has_signature_authority = models.BooleanField(default=False, verbose_name=_('حق امضا'))
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name=_('ترتیب'))
    note = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('عضو هیئت مدیره')
        verbose_name_plural = _('اعضای هیئت مدیره')
        ordering = ['sort_order', 'full_name']

    def __str__(self):
        return f'{self.full_name} — {self.position}'


class CompanyBankAccount(BaseModel):
    """حساب بانکی رسمی/عملیاتی شرکت."""

    class AccountType(models.TextChoices):
        CURRENT = 'current', _('جاری')
        SAVINGS = 'savings', _('پس‌انداز')
        FOREIGN_CURRENCY = 'foreign_currency', _('ارزی')
        DEPOSIT = 'deposit', _('سپرده')
        OTHER = 'other', _('سایر')

    profile = models.ForeignKey(
        CompanyProfile, on_delete=models.CASCADE, related_name='bank_accounts',
        verbose_name=_('مشخصات شرکت'),
    )
    title = models.CharField(max_length=200, blank=True, verbose_name=_('عنوان حساب'))
    bank_name = models.CharField(max_length=200, verbose_name=_('نام بانک'))
    branch_name = models.CharField(max_length=200, blank=True, verbose_name=_('نام شعبه'))
    branch_code = models.CharField(max_length=30, blank=True, verbose_name=_('کد شعبه'))
    account_number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره حساب'))
    iban = models.CharField(max_length=34, blank=True, verbose_name=_('شماره شبا (IBAN)'))
    card_number = models.CharField(max_length=30, blank=True, verbose_name=_('شماره کارت'))
    account_type = models.CharField(
        max_length=30, choices=AccountType.choices, default=AccountType.CURRENT,
        verbose_name=_('نوع حساب'),
    )
    currency = models.ForeignKey(
        'settings_app.Currency', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='company_bank_accounts', verbose_name=_('ارز'),
    )
    swift_code = models.CharField(max_length=30, blank=True, verbose_name=_('کد SWIFT'))
    holder_name = models.CharField(max_length=200, blank=True, verbose_name=_('نام صاحب حساب'))
    opening_date = models.DateField(blank=True, null=True, verbose_name=_('تاریخ افتتاح'))
    is_official = models.BooleanField(default=False, verbose_name=_('حساب رسمی شرکت'))
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name=_('ترتیب'))
    note = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('حساب بانکی شرکت')
        verbose_name_plural = _('حساب‌های بانکی شرکت')
        ordering = ['-is_official', 'sort_order', 'bank_name']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_official:
            CompanyBankAccount.objects.filter(
                company=self.company, is_official=True,
            ).exclude(pk=self.pk).update(is_official=False)

    def __str__(self):
        return f'{self.bank_name} — {self.account_number or self.iban or self.title}'


class BaleContact(BaseModel):
    """A custom Bale recipient with a free-form category (finance, IT, ...)."""
    name = models.CharField(max_length=200, verbose_name=_('نام / عنوان'))
    chat_id = models.CharField(max_length=100, verbose_name=_('شناسه گفتگوی بله (chat_id)'))
    category = models.CharField(max_length=100, blank=True, verbose_name=_('دسته‌بندی'), help_text=_('مثلاً: مالی، فنی، پشتیبانی'))
    tag = models.CharField(max_length=100, blank=True, null=True, verbose_name=_('برچسب'), help_text=_('مثلاً: مشتری، هیئت‌مدیره، قرارداد'))
    country_code = models.CharField(max_length=10, blank=True, null=True, default='+98', verbose_name=_('کد کشور'))
    note = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('مخاطب بله')
        verbose_name_plural = _('مخاطبان بله')
        ordering = ['category', 'name']

    def __str__(self):
        return f'{self.name} ({self.chat_id})'


class Addition(BaseModel):
    """اقلام افزودنی روی صورت‌وضعیت (مثلاً ارزش افزوده، سایر اضافات)."""
    code = models.CharField(max_length=50, verbose_name=_('کد'))
    description = models.CharField(max_length=200, verbose_name=_('شرح'))
    default_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        verbose_name=_('درصد پیش‌فرض'),
    )

    class Meta:
        verbose_name = _('اضافه')
        verbose_name_plural = _('اضافات')
        ordering = ['code']

    def __str__(self):
        return f'{self.code} - {self.description}'


class Deduction(BaseModel):
    """اقلام کسورات صورت‌وضعیت (بیمه، حسن انجام کار، ...)."""
    code = models.CharField(max_length=50, verbose_name=_('کد'))
    description = models.CharField(max_length=200, verbose_name=_('شرح'))
    default_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        verbose_name=_('درصد پیش‌فرض'),
    )

    class Meta:
        verbose_name = _('کسور')
        verbose_name_plural = _('کسورات')
        ordering = ['code']

    def __str__(self):
        return f'{self.code} - {self.description}'


class Currency(BaseModel):
    """ارزهای قابل انتخاب برای صورت‌وضعیت / قرارداد."""
    code = models.CharField(max_length=10, verbose_name=_('کد ارز'))
    name = models.CharField(max_length=100, verbose_name=_('نام ارز'))
    symbol = models.CharField(max_length=20, verbose_name=_('نماد'))
    country_code = models.CharField(
        max_length=10, blank=True,
        verbose_name=_('کد کشور'),
        help_text=_('ISO-3166 alpha-2 برای نمایش پرچم (مثلاً IR، US، EU)'),
    )
    exchange_rate = models.DecimalField(
        max_digits=18, decimal_places=6, default=1,
        verbose_name=_('نرخ تبدیل به ریال'),
        help_text=_('مقدار ریال به ازای هر واحد این ارز (ریال = ۱)'),
    )

    class Meta:
        verbose_name = _('ارز')
        verbose_name_plural = _('ارزها')
        ordering = ['code']
        unique_together = [('company', 'code')]

    def __str__(self):
        return f'{self.code} - {self.name}'


# =============================================================================
# Storage & Archive — سامانهٔ بایگانی فایل بر اساس ماژول
# =============================================================================
class StorageProfile(BaseModel):
    """
    پروفایل بایگانی یک ماژول (مثلاً «پرسنل» یا «قراردادها»).

    ساختار پوشه روی سرور:
        {MEDIA_ROOT}/{archive_prefix}/company_{company}/<root_folder>/<entity_folder>/...

    مثال‌ها:
        * پرسنل → root_folder='employees'، entity_folder_pattern='{code}_{name}'
          → media/archive/company_1/employees/1001_احمدی/مدارک هویتی/...
        * قراردادها → root_folder='contracts'، entity_folder_pattern='{number}'
          → media/archive/company_1/contracts/CT-1403-015/اسناد قرارداد/...
    """

    module_key = models.CharField(
        max_length=80, verbose_name=_('کلید ماژول'),
        help_text=_('شناسهٔ یکتا مثل hr.employees یا hrms.contracts'),
    )
    module_name = models.CharField(max_length=150, verbose_name=_('نام ماژول'))
    root_folder = models.CharField(
        max_length=100, verbose_name=_('نام پوشهٔ ماژول'),
        help_text=_('نام پوشه در پوشهٔ بایگانی (لاتین/عدد پیشنهاد می‌شود)'),
    )
    entity_folder_pattern = models.CharField(
        max_length=200, default='{code}_{name}', blank=True,
        verbose_name=_('الگوی نام پوشهٔ موجودیت'),
        help_text=_('متغیرها: {code} {name} {last_name} {number} {id} {national_id}'),
    )
    subfolders = models.JSONField(
        default=list, blank=True, verbose_name=_('زیرپوشه‌های پیش‌فرض'),
        help_text=_('لیست زیرپوشه‌هایی که هنگام ساخت پوشهٔ هر موجودیت ساخته می‌شوند'),
    )
    allowed_extensions = models.JSONField(
        default=list, blank=True, verbose_name=_('فرمت‌های مجاز'),
        help_text=_('اگر خالی باشد از تنظیم عمومی ALLOWED_FILE_EXTENSIONS استفاده می‌شود'),
    )
    max_file_size_mb = models.PositiveIntegerField(
        default=10, verbose_name=_('حداکثر حجم فایل (MB)'),
    )
    include_company = models.BooleanField(
        default=True, verbose_name=_('تفکیک بر اساس شرکت'),
        help_text=_('ایجاد پوشهٔ company_{id} در بالای ساختار (برای چندمستاجری)'),
    )
    color = models.CharField(max_length=20, default='#6366f1', blank=True, verbose_name=_('رنگ نمایش'))
    icon = models.CharField(max_length=50, default='folder', blank=True, verbose_name=_('آیکون'))
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name=_('ترتیب'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('پروفایل بایگانی ماژول')
        verbose_name_plural = _('پروفایل‌های بایگانی ماژول‌ها')
        unique_together = [('company', 'module_key')]
        ordering = ['sort_order', 'module_name']

    def __str__(self):
        return f'{self.module_name} ({self.root_folder})'


class ArchiveFolder(BaseModel):
    """
    ثبت پوشهٔ بایگانی یک موجودیت مشخص (پرسنل، قرارداد، ...).

    این رکورد نگاشت «موجودیت ← پوشه» را نگه می‌دارد تا بدون پیمایش دیسک
    بتوان پوشهٔ هر موجودیت را پیدا کرد و از تکرار ساخت جلوگیری شد.
    """

    profile = models.ForeignKey(
        StorageProfile, on_delete=models.CASCADE, related_name='folders',
        verbose_name=_('پروفایل بایگانی'),
    )
    entity_type = models.CharField(
        max_length=50, verbose_name=_('نوع موجودیت'),
        help_text=_('مثلاً employee / contract / project'),
    )
    entity_id = models.CharField(
        max_length=64, blank=True, null=True, verbose_name=_('شناسهٔ موجودیت'),
    )
    label = models.CharField(max_length=200, verbose_name=_('نام پوشه'))
    relative_path = models.CharField(
        max_length=500, verbose_name=_('مسیر نسبی'),
        help_text=_('نسبت به MEDIA_ROOT'),
    )

    class Meta:
        verbose_name = _('پوشهٔ بایگانی موجودیت')
        verbose_name_plural = _('پوشه‌های بایگانی موجودیت‌ها')
        ordering = ['label']
        indexes = [
            models.Index(fields=['company', 'profile']),
            models.Index(fields=['entity_type', 'entity_id']),
        ]

    def __str__(self):
        return f'{self.label} → {self.relative_path}'


def default_storage_profiles():
    """
    پروفایل‌های بایگانی پیش‌فرض برای ماژول‌های اصلی سیستم.

    برای «seed» اولیهٔ هر شرکت استفاده می‌شود و در صورت نبودِ پروفایل
    برای هر شرکت فراخوانی می‌گردد.
    """
    return [
        {
            'module_key': 'hr.employees', 'module_name': 'پرسنل',
            'root_folder': 'employees', 'entity_folder_pattern': '{code}_{last_name}',
            'subfolders': [
                'مدارک هویتی', 'قرارداد و حکم', 'بیمه و مالیات',
                'مدارک تحصیلی', 'افراد تحت تکفل', 'سایر',
            ],
            'color': '#ec4899', 'icon': 'badge', 'sort_order': 1,
            'description': 'پوشهٔ اختصاصی هر پرسنل شامل همهٔ مدارک مرتبط',
        },
        {
            'module_key': 'hrms.contracts', 'module_name': 'قراردادها',
            'root_folder': 'contracts', 'entity_folder_pattern': '{number}',
            'subfolders': ['متن قرارداد', 'اسناد و مکاتبات', 'صورت‌وضعیت‌ها', 'تضامین', 'پرداخت‌ها'],
            'color': '#f59e0b', 'icon': 'handshake', 'sort_order': 2,
            'description': 'پوشهٔ هر قرارداد به نام شمارهٔ قرارداد',
        },
        {
            'module_key': 'hrms.projects', 'module_name': 'پروژه‌ها',
            'root_folder': 'projects', 'entity_folder_pattern': '{code}_{name}',
            'subfolders': ['مدارک فنی', 'قراردادها', 'صورت‌وضعیت‌ها', 'مکاتبات', 'گزارش‌ها'],
            'color': '#8b5cf6', 'icon': 'account_tree', 'sort_order': 3,
        },
        {
            'module_key': 'hrms.recruitment', 'module_name': 'جذب و استخدام',
            'root_folder': 'recruitment', 'entity_folder_pattern': '{name}',
            'subfolders': ['رزومه', 'مصاحبه‌ها', 'ارزیابی', 'پیشنهاد همکاری'],
            'color': '#0ea5e9', 'icon': 'person_search', 'sort_order': 4,
        },
        {
            'module_key': 'hrms.organization_documents', 'module_name': 'بایگانی اسناد سازمان',
            'root_folder': 'organization', 'entity_folder_pattern': '{category}',
            'subfolders': ['مجوزها', 'ابلاغیه‌ها', 'تفاهم‌نامه‌ها', 'گزارش‌های مالی'],
            'color': '#06b6d4', 'icon': 'folder_shared', 'sort_order': 5,
        },
        {
            'module_key': 'hrms.payroll', 'module_name': 'حقوق و دستمزد',
            'root_folder': 'payroll', 'entity_folder_pattern': '{year}',
            'subfolders': ['سوابق پرداخت', 'لیست بیمه', 'مالیات'],
            'color': '#10b981', 'icon': 'payments', 'sort_order': 6,
        },
        {
            'module_key': 'hrms.pettycash', 'module_name': 'تنخواه',
            'root_folder': 'pettycash', 'entity_folder_pattern': '{year}_{month}',
            'subfolders': ['صورت‌هزینه‌ها', 'فاکتورها', 'رسیدها'],
            'color': '#f97316', 'icon': 'wallet', 'sort_order': 7,
        },
        {
            'module_key': 'hrms.accounting', 'module_name': 'حسابداری',
            'root_folder': 'accounting', 'entity_folder_pattern': '{year}',
            'subfolders': ['اسناد حسابداری', 'صورت‌حساب‌های بانکی', 'گزارش‌ها'],
            'color': '#3b82f6', 'icon': 'calculate', 'sort_order': 8,
        },
        {
            'module_key': 'hr.documents.management',
            'module_name': 'مدیریت اسناد و مدارک',
            'root_folder': 'documents',
            'entity_folder_pattern': '{folder}_{name}',
            'subfolders': ['نسخه‌ها', 'پیوست‌ها', 'فایل‌های موقت'],
            'allowed_extensions': [
                '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
                '.txt', '.csv', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
                '.zip', '.rar',
            ],
            'max_file_size_mb': 50,
            'color': '#0f766e', 'icon': 'folder_copy', 'sort_order': 9,
            'description': 'پروفایل بایگانی کتابخانهٔ مرکزی مدیریت اسناد و مدارک',
        },
        {
            'module_key': 'hrms.correspondence', 'module_name': 'مکاتبات اداری',
            'root_folder': 'correspondences', 'entity_folder_pattern': '{year}',
            'subfolders': [
                'نامه‌های وارده', 'نامه‌های صادره', 'نامه‌های داخلی',
                'پیوست‌ها', 'ارجاعات', 'بایگانی',
            ],
            'allowed_extensions': [
                '.pdf', '.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff',
                '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar',
            ],
            'max_file_size_mb': 25,
            'color': '#0ea5e9', 'icon': 'mail', 'sort_order': 10,
            'description': 'بایگانی پیوست نامه‌ها به تفکیک سال شمسی در ساختار '
                           'archive/company_<id>/correspondences/<سال>',
        },
    ]


