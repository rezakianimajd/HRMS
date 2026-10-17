"""
Models for the Documents module.
"""
import os
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


# نام زیرپوشهٔ استاندارد مدارک افراد تحت تکفل در پروندهٔ هر پرسنل
DEPENDENTS_FOLDER = 'افراد تحت تکفل'

# نشانه‌های نام/کد نوع مدرک که به «افراد تحت تکفل» اشاره می‌کنند
_DEPENDENT_MARKERS = (
    'تکفل', 'تحت پوشش', 'همسر', 'فرزند', 'فرزندان',
    'dependent', 'spouse', 'child',
)


def is_dependent_label(*values) -> bool:
    """آیا نام/کد نوع مدرک به مدارک افراد تحت تکفل اشاره دارد؟"""
    haystack = ' '.join(str(v or '') for v in values).strip().lower()
    if not haystack:
        return False
    return any(marker in haystack for marker in _DEPENDENT_MARKERS)


def _archive_upload_path(
    instance, filename, *, module_key, label_fields, fallback_subdir, subfolder='',
):
    """
    مسیر آپلود را بر اساس «پروفایل بایگانی ماژول» می‌سازد.

    ساختار خروجی (نسبت به MEDIA_ROOT):
        archive/company_{id}/{root_folder}/{entity_label}/{subfolder}/{unique}{ext}

    اگر پروفایل مربوطه تعریف نشده باشد، مسیر قدیمی (fallback) برگردانده می‌شود
    تا آپلود هرگز از کار نیفتد.
    """
    from core.engines.archive_storage_engine import resolve_upload_path

    try:
        fields = label_fields()
    except Exception:  # noqa: BLE001 — موجودیت ناقص نباید آپلود را بشکند
        fields = {}

    return resolve_upload_path(
        instance.company_id, module_key, fields, filename,
        fallback_dir=fallback_subdir, subfolder=subfolder,
    )


def document_upload_path(instance, filename):
    """
    مسیر مدرک پرسنل در بایگانی:
        archive/company_{id}/employees/{code}_{last_name}/{subfolder}/<uuid>.pdf

    برای مدارک افراد تحت تکفل، زیرپوشهٔ «افراد تحت تکفل» به‌صورت خودکار
    اضافه می‌شود (یا هر زیرپوشه‌ای که روی «نوع مدرک» تنظیم شده باشد).
    """
    def fields():
        emp = instance.employee
        return {
            'code': getattr(emp, 'employee_id', '') or '',
            'name': getattr(emp, 'first_name', '') or '',
            'last_name': getattr(emp, 'last_name', '') or '',
            'id': emp.pk,
            'national_id': getattr(emp, 'national_id', '') or '',
        }

    try:
        subfolder = instance.document_type.archive_subfolder
    except Exception:  # noqa: BLE001 — نوع مدرک هنوز ست نشده است
        subfolder = ''
    if not subfolder and is_dependent_label(
        getattr(instance, 'title', ''), getattr(instance, 'description', ''),
    ):
        subfolder = DEPENDENTS_FOLDER

    fallback = f"company_{instance.company_id}/employee_{instance.employee_id}/documents"
    if subfolder:
        fallback = f'{fallback}/{subfolder}'

    return _archive_upload_path(
        instance, filename,
        module_key='hr.employees',
        label_fields=fields,
        fallback_subdir=fallback,
        subfolder=subfolder,
    )


def organization_document_upload_path(instance, filename):
    """
    مسیر سند سازمانی در بایگانی:
        archive/company_{id}/organization/{category}/<uuid>.pdf
    """
    def fields():
        try:
            category = instance.get_category_display()
        except Exception:
            category = 'عمومی'
        return {'category': category, 'name': category, 'id': instance.pk}

    return _archive_upload_path(
        instance, filename,
        module_key='hrms.organization_documents',
        label_fields=fields,
        fallback_subdir='company_archive',
    )



class DocumentType(BaseModel):
    """
    Types of documents defined per company (e.g., National ID, Contract, Certificate, etc.).
    """
    name = models.CharField(
        max_length=200,
        verbose_name=_('نام نوع مدرک'),
    )
    code = models.CharField(
        max_length=50,
        verbose_name=_('کد نوع مدرک'),
    )
    archive_folder = models.CharField(
        max_length=120, blank=True, default='',
        verbose_name=_('زیرپوشهٔ بایگانی'),
        help_text=_(
            'نام زیرپوشه در پوشهٔ هر پرسنل؛ مثلاً «افراد تحت تکفل». '
            'اگر خالی بماند و نام/کد مدرک به افراد تحت تکفل اشاره کند، خودکار انتخاب می‌شود.'
        ),
    )

    class Meta:
        verbose_name = _('نوع مدرک')
        verbose_name_plural = _('انواع مدارک')
        unique_together = [('company', 'code')]
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"

    @property
    def archive_subfolder(self) -> str:
        """زیرپوشهٔ مؤثر برای بایگانی فایل‌های این نوع مدرک."""
        explicit = (self.archive_folder or '').strip()
        if explicit:
            return explicit
        if is_dependent_label(self.name, self.code):
            return DEPENDENTS_FOLDER
        return ''


class OrganizationDocument(BaseModel):
    """
    Company-level archived document (independent from employee documents).
    Used for the "بایگانی اسناد سازمان" page.
    Optionally linked to an employee (so a company document can appear on
    that employee's profile too).
    """

    class ArchiveCategory(models.TextChoices):
        CONTRACT = 'contract', _('قرارداد سازمانی')
        AGREEMENT = 'agreement', _('تفاهم‌نامه')
        OFFICIAL = 'official', _('ابلاغیه/بخشنامه رسمی')
        LICENSE = 'license', _('مجوز/پروانه')
        AUDIT = 'audit', _('گزارش حسابرسی/مالی')
        INSURANCE = 'insurance', _('بیمه نامه')
        CERTIFICATE = 'certificate', _('گواهی/گواهینامه')
        HR_DOC = 'hr_doc', _('مستندات منابع انسانی')
        LEGAL = 'legal', _('اسناد حقوقی')
        OTHER = 'other', _('سایر')

    # Optional link to an employee → this document also shows on their profile.
    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='company_archive_documents',
        verbose_name=_('پرسنل مرتبط (اختیاری)'),
    )
    title = models.CharField(max_length=250, verbose_name=_('عنوان سند'))
    category = models.CharField(
        max_length=30,
        choices=ArchiveCategory.choices,
        default=ArchiveCategory.CONTRACT,
        verbose_name=_('دسته‌بندی'),
    )
    reference_number = models.CharField(
        max_length=80, blank=True, verbose_name=_('شماره ثبت/مرجع'),
    )
    issue_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ صدور'))
    expiry_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ انقضا'))
    file = models.FileField(
        upload_to=organization_document_upload_path,
        blank=True, null=True,
        verbose_name=_('فایل'),
    )
    tags = models.CharField(max_length=300, blank=True, verbose_name=_('برچسب‌ها'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('سند سازمانی')
        verbose_name_plural = _('اسناد سازمانی (بایگانی)')
        ordering = ['-issue_date', '-created_at']
        indexes = [
            models.Index(fields=['company', 'category']),
            models.Index(fields=['company', 'employee']),
            models.Index(fields=['expiry_date']),
        ]

    def __str__(self):
        return self.title

    @property
    def is_expired(self):
        from datetime import date
        return bool(self.expiry_date and self.expiry_date < date.today())

    @property
    def file_extension(self):
        if self.file:
            return os.path.splitext(self.file.name)[1].lower()
        return ''

    @property
    def is_image(self):
        return self.file_extension in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']

    @property
    def is_pdf(self):
        return self.file_extension == '.pdf'


class Document(BaseModel):
    """
    An employee document with file upload support.
    Uses dynamic upload_to path based on company and employee.
    """
    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='documents',
        verbose_name=_('پرسنل'),
    )
    title = models.CharField(
        max_length=200,
        verbose_name=_('عنوان مدرک'),
    )
    document_type = models.ForeignKey(
        DocumentType,
        on_delete=models.PROTECT,
        related_name='documents',
        verbose_name=_('نوع مدرک'),
    )
    issue_date = models.DateField(
        blank=True,
        null=True,
        verbose_name=_('تاریخ صدور'),
    )
    expiry_date = models.DateField(
        blank=True,
        null=True,
        verbose_name=_('تاریخ انقضا'),
    )
    document_number = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name=_('شماره مدرک'),
    )
    file = models.FileField(
        upload_to=document_upload_path,
        verbose_name=_('فایل'),
        help_text=_('فرمت‌های مجاز: PDF, JPG, PNG, DOCX, XLSX'),
    )
    version = models.PositiveIntegerField(
        default=1,
        verbose_name=_('نسخه'),
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name=_('توضیحات'),
    )

    class Meta:
        verbose_name = _('مدرک')
        verbose_name_plural = _('مدارک')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['employee', 'document_type']),
            models.Index(fields=['company', 'employee']),
            models.Index(fields=['expiry_date']),
        ]

    def __str__(self):
        return f"{self.title} - {self.employee.full_name}"

    @property
    def file_extension(self):
        """Return the file extension (lowercase)."""
        if self.file:
            return os.path.splitext(self.file.name)[1].lower()
        return ''

    @property
    def file_size_display(self):
        """Return human-readable file size."""
        if self.file and hasattr(self.file, 'size'):
            size = self.file.size
            if size < 1024:
                return f"{size} B"
            elif size < 1024 * 1024:
                return f"{size / 1024:.1f} KB"
            else:
                return f"{size / (1024 * 1024):.1f} MB"
        return ''

    @property
    def is_image(self):
        """Check if file is an image type."""
        return self.file_extension in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']

    @property
    def is_pdf(self):
        """Check if file is a PDF."""
        return self.file_extension == '.pdf'

    @property
    def is_expired(self):
        """Check if document has expired."""
        from datetime import date
        if self.expiry_date:
            return self.expiry_date < date.today()
        return False

    @property
    def days_until_expiry(self):
        """Return number of days until expiry, or None if no expiry date."""
        from datetime import date
        if self.expiry_date:
            delta = self.expiry_date - date.today()
            return delta.days
        return None