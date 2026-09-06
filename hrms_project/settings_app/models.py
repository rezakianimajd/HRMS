"""
Models for the Settings module - System settings and company profile.
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

    key = models.CharField(
        max_length=100,
        verbose_name=_('کلید تنظیم'),
    )
    value = models.TextField(
        verbose_name=_('مقدار'),
        help_text=_('مقدار تنظیم (همیشه به‌صورت متن ذخیره می‌شود)'),
    )
    description = models.TextField(
        blank=True, null=True,
        verbose_name=_('توضیحات'),
    )
    data_type = models.CharField(
        max_length=20,
        choices=DataType.choices,
        default=DataType.STRING,
        verbose_name=_('نوع داده'),
    )
    is_editable = models.BooleanField(
        default=True,
        verbose_name=_('قابل ویرایش'),
    )

    class Meta:
        verbose_name = _('تنظیم سیستم')
        verbose_name_plural = _('تنظیمات سیستم')
        unique_together = [('company', 'key')]
        ordering = ['key']

    def __str__(self):
        return f"{self.key} = {self.value[:50]}"

    @staticmethod
    def get_default_settings():
        """Return the default settings dict for new companies."""
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
    legal_name = models.CharField(
        max_length=200,
        blank=True, null=True,
        verbose_name=_('نام کامل حقوقی'),
    )
    registration_number = models.CharField(
        max_length=50,
        blank=True, null=True,
        verbose_name=_('شماره ثبت'),
    )
    national_id = models.CharField(
        max_length=20,
        blank=True, null=True,
        verbose_name=_('شناسه ملی'),
    )
    economic_code = models.CharField(
        max_length=20,
        blank=True, null=True,
        verbose_name=_('کد اقتصادی'),
    )
    phone = models.CharField(
        max_length=20,
        blank=True, null=True,
        verbose_name=_('تلفن'),
    )
    email = models.EmailField(
        blank=True, null=True,
        verbose_name=_('ایمیل'),
    )
    address = models.TextField(
        blank=True, null=True,
        verbose_name=_('آدرس'),
    )
    postal_code = models.CharField(
        max_length=20,
        blank=True, null=True,
        verbose_name=_('کد پستی'),
    )
    website = models.URLField(
        blank=True, null=True,
        verbose_name=_('وب‌سایت'),
    )
    logo = models.ImageField(
        upload_to='company_logos/',
        blank=True, null=True,
        verbose_name=_('لوگو'),
    )
    tax_id = models.CharField(
        max_length=50,
        blank=True, null=True,
        verbose_name=_('شناسه مالیاتی'),
    )
    established_date = models.DateField(
        blank=True, null=True,
        verbose_name=_('تاریخ تأسیس'),
    )
    description = models.TextField(
        blank=True, null=True,
        verbose_name=_('توضیحات'),
    )
    # Legal representative / CEO (used in contracts).
    employer_rep_name = models.CharField(
        max_length=200, blank=True, verbose_name=_('نام نماینده حقوقی / مدیرعامل'),
    )
    employer_rep_title = models.CharField(
        max_length=100, blank=True, verbose_name=_('سمت نماینده'),
    )
    employer_rep_national_id = models.CharField(
        max_length=20, blank=True, verbose_name=_('کد ملی نماینده'),
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('تاریخ ایجاد'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('تاریخ به‌روزرسانی'))

    class Meta:
        verbose_name = _('مشخصات شرکت')
        verbose_name_plural = _('مشخصات شرکت‌ها')

    def __str__(self):
        return f"Profile: {self.company.name}"