"""
Models for the Documents module.
"""
import mimetypes
import os
from django.conf import settings
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

    اگر سند به یک پرسنل متصل و مربوط به «افراد تحت تکفل» باشد، به‌جای بایگانی
    سازمانی در پروندهٔ همان پرسنل و زیرپوشهٔ «افراد تحت تکفل» بایگانی می‌شود:
        archive/company_{id}/employees/{code}_{last_name}/افراد تحت تکفل/<uuid>.pdf
    """
    def fields():
        try:
            category = instance.get_category_display()
        except Exception:
            category = 'عمومی'
        return {'category': category, 'name': category, 'id': instance.pk}

    def employee_fields():
        emp = instance.employee
        return {
            'code': getattr(emp, 'employee_id', '') or '',
            'name': getattr(emp, 'first_name', '') or '',
            'last_name': getattr(emp, 'last_name', '') or '',
            'id': emp.pk,
            'national_id': getattr(emp, 'national_id', '') or '',
        }

    try:
        dependent = bool(getattr(instance, 'employee_id', None)) and instance.is_dependent
    except Exception:  # noqa: BLE001 — موجودیت ناقص نباید آپلود را بشکند
        dependent = False

    if dependent:
        fallback = (
            f"company_{instance.company_id}/employee_{instance.employee_id}"
            f"/documents/{DEPENDENTS_FOLDER}"
        )
        return _archive_upload_path(
            instance, filename,
            module_key='hr.employees',
            label_fields=employee_fields,
            fallback_subdir=fallback,
            subfolder=DEPENDENTS_FOLDER,
        )

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
    dependent_related = models.BooleanField(
        default=False, verbose_name=_('مربوط به افراد تحت تکفل'),
        help_text=_(
            'اگر این سند به یک پرسنل متصل باشد و مربوط به افراد تحت تکفل او باشد، '
            'در پوشهٔ همان پرسنل ← «افراد تحت تکفل» بایگانی می‌شود.'
        ),
    )

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

    def save(self, *args, **kwargs):
        """اگر سند به افراد تحت تکفل اشاره کند، پرچم مربوط‌بودن خودکار فعال می‌شود.

        اگر پرچم به‌صورت صریح در `update_fields` آمده باشد (کاربر آن را خاموش
        کرده است)، تشخیص خودکار انجام نمی‌شود.
        """
        update_fields = kwargs.get('update_fields')
        explicit_flag = update_fields is not None and 'dependent_related' in set(update_fields)
        if (not explicit_flag and not self.dependent_related
                and is_dependent_label(self.title, self.tags, self.description)):
            self.dependent_related = True
            if update_fields is not None:
                kwargs['update_fields'] = set(update_fields) | {'dependent_related'}
        return super().save(*args, **kwargs)

    @property
    def is_dependent(self) -> bool:
        """آیا این سند مربوط به افراد تحت تکفل است؟"""
        return bool(self.dependent_related) or is_dependent_label(
            self.title, self.tags, self.description,
        )

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


# ---------------------------------------------------------------------------
# Document Management (DMS): folders, versioned documents, activity log
# ---------------------------------------------------------------------------

def managed_document_version_upload_path(instance, filename):
    """مسیر نسخه‌های سند در بایگانی مدیریت اسناد."""
    from core.engines.archive_storage_engine import resolve_upload_path

    try:
        from documents.management_storage import (
            DOCUMENTS_STORAGE_MODULE_KEY, get_documents_storage_profile,
            storage_fields,
        )

        get_documents_storage_profile(instance.company_id)
        fields = storage_fields(instance.document)
        module_key = DOCUMENTS_STORAGE_MODULE_KEY
    except Exception:  # noqa: BLE001 — سند ناقص نباید آپلود را بشکند
        fields = {}
        module_key = 'hr.documents.management'

    return resolve_upload_path(
        instance.company_id, module_key, fields, filename,
        fallback_dir='document_management',
    )


class DocumentFolder(BaseModel):
    """پوشه/دستهٔ درختی کتابخانهٔ اسناد."""

    name = models.CharField(max_length=150, verbose_name=_('نام پوشه'))
    code = models.CharField(max_length=50, blank=True, verbose_name=_('کد پوشه'))
    parent = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True,
        related_name='children', verbose_name=_('پوشه والد'),
    )
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))
    color = models.CharField(max_length=20, blank=True, default='#0f766e', verbose_name=_('رنگ'))
    icon = models.CharField(max_length=50, blank=True, verbose_name=_('آیکن'))
    order = models.PositiveIntegerField(default=0, verbose_name=_('ترتیب'))
    is_system = models.BooleanField(default=False, verbose_name=_('پوشه سیستمی'))

    class Meta:
        verbose_name = _('پوشه اسناد')
        verbose_name_plural = _('پوشه‌های اسناد')
        ordering = ['order', 'name']
        unique_together = [('company', 'parent', 'name')]
        indexes = [models.Index(fields=['company', 'parent'], name='dms_folder_company_parent_idx')]

    def __str__(self):
        return self.name

    @property
    def path(self):
        parts = []
        node = self
        visited = set()
        while node is not None and node.pk not in visited:
            visited.add(node.pk)
            parts.append(node.name)
            node = node.parent
        return ' / '.join(reversed(parts))


class ManagedDocument(BaseModel):
    """سند مدیریت‌شده با متادیتا، محرمانگی و نسخه‌بندی."""

    class Confidentiality(models.TextChoices):
        PUBLIC = 'public', _('عمومی')
        INTERNAL = 'internal', _('داخلی')
        CONFIDENTIAL = 'confidential', _('محرمانه')
        SECRET = 'secret', _('سری')

    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        ACTIVE = 'active', _('فعال')
        ARCHIVED = 'archived', _('بایگانی‌شده')

    class DocumentType(models.TextChoices):
        COMPANY = 'company', _('مدارک شرکت')
        CIRCULAR = 'circular', _('بخشنامه و ابلاغیه')
        POLICY = 'policy', _('آیین‌نامه و مقررات')
        PROCEDURE = 'procedure', _('روش اجرایی و دستورالعمل')
        FORM = 'form', _('فرم و چک‌لیست')
        MINUTES = 'minutes', _('مصوبه و صورت‌جلسه')
        CORRESPONDENCE = 'correspondence', _('مکاتبه رسمی')
        TEMPLATE = 'template', _('قالب و سند استاندارد')
        QUALITY = 'quality', _('مستندات کیفیت و ISO')
        FINANCIAL = 'financial', _('سند مالی و حسابداری')
        HR = 'hr', _('سند منابع انسانی')
        CONTRACT = 'contract', _('سند قرارداد')
        PROJECT = 'project', _('سند پروژه')
        OTHER = 'other', _('سایر')

    class WorkflowStatus(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        IN_REVIEW = 'in_review', _('در حال بررسی')
        APPROVED = 'approved', _('تأییدشده')
        PUBLISHED = 'published', _('منتشرشده / لازم‌الاجرا')
        REJECTED = 'rejected', _('ردشده / بازگشتی')
        SUPERSEDED = 'superseded', _('جایگزین‌شده')
        WITHDRAWN = 'withdrawn', _('لغوشده')
        ARCHIVED = 'archived', _('بایگانی‌شده')

    folder = models.ForeignKey(
        DocumentFolder, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='documents', verbose_name=_('پوشه'),
    )
    source_module_key = models.CharField(
        max_length=80, blank=True, default='', verbose_name=_('کلید ماژول منبع'),
    )
    storage_path = models.CharField(
        max_length=500, blank=True, default='', verbose_name=_('مسیر ذخیره‌سازی'),
    )
    is_indexed = models.BooleanField(
        default=False, verbose_name=_('ایندکس‌شده از بایگانی'),
    )
    document_type = models.CharField(
        max_length=30, choices=DocumentType.choices,
        default=DocumentType.OTHER, verbose_name=_('نوع سند'),
    )
    owner_department = models.CharField(
        max_length=150, blank=True, default='', verbose_name=_('واحد مسئول'),
    )
    issuing_authority = models.CharField(
        max_length=200, blank=True, default='', verbose_name=_('مرجع صدور'),
    )
    related_entity_type = models.CharField(
        max_length=50, blank=True, default='', verbose_name=_('نوع موجودیت مرتبط'),
    )
    related_entity_id = models.CharField(
        max_length=64, blank=True, default='', verbose_name=_('شناسه موجودیت مرتبط'),
    )
    related_entity_label = models.CharField(
        max_length=200, blank=True, default='', verbose_name=_('عنوان موجودیت مرتبط'),
    )
    title = models.CharField(max_length=250, verbose_name=_('عنوان سند'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))
    tags = models.CharField(max_length=500, blank=True, verbose_name=_('برچسب‌ها'))
    reference_number = models.CharField(max_length=100, blank=True, verbose_name=_('شماره مرجع'))
    issue_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ صدور'))
    effective_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ لازم‌الاجرا'))
    review_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ بازنگری'))
    expiry_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ انقضا'))
    retention_until = models.DateField(null=True, blank=True, verbose_name=_('نگهداری تا'))
    confidentiality = models.CharField(
        max_length=20, choices=Confidentiality.choices,
        default=Confidentiality.INTERNAL, verbose_name=_('سطح محرمانگی'),
    )
    status = models.CharField(
        max_length=20, choices=Status.choices,
        default=Status.ACTIVE, verbose_name=_('وضعیت'),
    )
    workflow_status = models.CharField(
        max_length=20, choices=WorkflowStatus.choices,
        default=WorkflowStatus.PUBLISHED, verbose_name=_('وضعیت گردش‌کار'),
    )
    is_controlled = models.BooleanField(
        default=True, verbose_name=_('سند کنترل‌شده'),
    )
    is_locked = models.BooleanField(default=False, verbose_name=_('قفل ویرایش'))
    current_version = models.ForeignKey(
        'DocumentVersion', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('نسخه جاری'),
    )
    version_count = models.PositiveIntegerField(default=0, verbose_name=_('تعداد نسخه'))
    published_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان انتشار'))
    published_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='managed_documents_published', verbose_name=_('منتشرکننده'),
    )
    superseded_by = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='supersedes', verbose_name=_('سند جایگزین'),
    )
    metadata = models.JSONField(
        default=dict, blank=True, verbose_name=_('متادیتای تکمیلی'),
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='managed_documents_created', verbose_name=_('ایجادکننده'),
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='managed_documents_updated', verbose_name=_('آخرین ویرایش‌کننده'),
    )

    class Meta:
        verbose_name = _('سند مدیریت‌شده')
        verbose_name_plural = _('اسناد مدیریت‌شده')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'folder'], name='dms_doc_company_folder_idx'),
            models.Index(fields=['company', 'status'], name='dms_doc_company_status_idx'),
            models.Index(fields=['company', 'workflow_status'], name='dms_doc_company_workflow_idx'),
            models.Index(fields=['company', 'document_type'], name='dms_doc_company_type_idx'),
            models.Index(fields=['review_date'], name='dms_doc_review_idx'),
            models.Index(fields=['expiry_date'], name='dms_doc_expiry_idx'),
            models.Index(fields=['company', 'source_module_key'], name='dms_doc_source_module_idx'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'storage_path'],
                condition=~models.Q(storage_path=''),
                name='dms_doc_unique_storage_path',
            ),
        ]

    def __str__(self):
        return self.title

    @property
    def file_extension(self):
        version = self.current_version
        if version and version.file:
            return os.path.splitext(version.file.name)[1].lower()
        return ''

    @property
    def file_name(self):
        version = self.current_version
        if not version:
            return ''
        return version.original_name or os.path.basename(version.file.name)

    @property
    def file_size(self):
        return self.current_version.file_size if self.current_version else 0

    @property
    def is_expired(self):
        from datetime import date
        return bool(self.expiry_date and self.expiry_date < date.today())

    @property
    def days_until_expiry(self):
        from datetime import date
        if not self.expiry_date:
            return None
        return (self.expiry_date - date.today()).days

    @property
    def tags_list(self):
        return [tag.strip() for tag in (self.tags or '').split(',') if tag.strip()]

    @property
    def is_editable_in_workflow(self):
        """اسناد منتشرشده کنترل‌شده فقط از مسیر گردش‌کار قابل تغییرند."""
        return (
            not self.is_controlled
            or self.workflow_status in (
                self.WorkflowStatus.DRAFT,
                self.WorkflowStatus.REJECTED,
            )
        )


class DocumentVersion(BaseModel):
    """نسخهٔ فایل سند؛ فایل جاری سند از همین رکورد خوانده می‌شود."""

    document = models.ForeignKey(
        ManagedDocument, on_delete=models.CASCADE,
        related_name='versions', verbose_name=_('سند'),
    )
    version_number = models.PositiveIntegerField(default=1, verbose_name=_('شماره نسخه'))
    file = models.FileField(upload_to=managed_document_version_upload_path, verbose_name=_('فایل'))
    original_name = models.CharField(max_length=255, blank=True, verbose_name=_('نام فایل اصلی'))
    file_size = models.BigIntegerField(default=0, verbose_name=_('حجم فایل'))
    mime_type = models.CharField(max_length=120, blank=True, verbose_name=_('نوع فایل'))
    checksum = models.CharField(max_length=64, blank=True, verbose_name=_('چک‌سام'))
    change_note = models.TextField(blank=True, verbose_name=_('توضیح تغییرات'))
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='document_versions_created', verbose_name=_('ایجادکننده'),
    )

    class Meta:
        verbose_name = _('نسخه سند')
        verbose_name_plural = _('نسخه‌های سند')
        ordering = ['-version_number']
        unique_together = [('document', 'version_number')]
        indexes = [models.Index(fields=['document', 'version_number'], name='dms_version_doc_num_idx')]

    def __str__(self):
        return f'{self.document.title} - v{self.version_number}'

    def save(self, *args, **kwargs):
        if self.file:
            try:
                self.file_size = self.file.size
            except Exception:  # noqa: BLE001
                self.file_size = self.file_size or 0
            if not self.original_name:
                self.original_name = os.path.basename(self.file.name)
            if not self.mime_type:
                self.mime_type = mimetypes.guess_type(self.file.name)[0] or ''
        super().save(*args, **kwargs)


class DocumentActivity(BaseModel):
    """تاریخچه فعالیت روی اسناد برای حسابرسی و پیگیری."""

    class Action(models.TextChoices):
        CREATE = 'create', _('ایجاد سند')
        UPDATE = 'update', _('ویرایش اطلاعات')
        VERSION = 'new_version', _('ثبت نسخه جدید')
        ARCHIVE = 'archive', _('بایگانی')
        RESTORE = 'restore', _('بازگردانی')
        DELETE = 'delete', _('حذف')
        DOWNLOAD = 'download', _('دانلود')
        FOLDER = 'folder', _('تغییر پوشه')
        WORKFLOW = 'workflow', _('تغییر وضعیت گردش‌کار')

    document = models.ForeignKey(
        ManagedDocument, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='activities', verbose_name=_('سند'),
    )
    action = models.CharField(max_length=30, choices=Action.choices, verbose_name=_('اقدام'))
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='document_activities', verbose_name=_('کاربر'),
    )
    details = models.JSONField(default=dict, blank=True, verbose_name=_('جزئیات'))

    class Meta:
        verbose_name = _('فعالیت سند')
        verbose_name_plural = _('فعالیت‌های اسناد')
        ordering = ['-created_at']
        indexes = [models.Index(fields=['company', 'document'], name='dms_activity_company_doc_idx')]

    def __str__(self):
        return f'{self.get_action_display()} - {self.document_id}'