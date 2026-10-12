"""فاز ۳ (بخش دوم) — کیفیت و HSE پروژه.

* `QualityPlan` / `QualityPlanItem` → طرح بازرسی و آزمون (ITP/IQP) با نقاط
  توقف (Hold)، شاهد (Witness) و بازنگری مدارک
* `Inspection` → بازرسی/آزمون اجراشده با نتیجهٔ قبول/رد/مشروط
* `NCR` → گزارش عدم انطباق با ریشه‌یابی، اقدام اصلاحی/پیشگیرانه و چرخهٔ تأیید
* `PunchItem` → لیست نقص/کسرکار (Snag List) با مسئول، سررسید و تأیید رفع
* `HSEIncident` → رویداد HSE (شبه‌حادثه، کمک‌های اولیه، از کارافتادگی، زیست‌محیطی)
"""
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models.audit_mixin import (
    AllObjectsManager, AuditableModel, SoftDeleteManager,
)
from core.models.base_model import BaseModel


class QualityPlan(BaseModel, AuditableModel):
    """طرح بازرسی و آزمون (ITP) — سند مرجع کنترل کیفیت پروژه."""
    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        ACTIVE = 'active', _('جاری')
        SUPERSEDED = 'superseded', _('نسخهٔ قدیمی')
        CANCELLED = 'cancelled', _('لغو شده')

    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='quality_plans',
        verbose_name=_('پروژه'),
    )
    contract = models.ForeignKey(
        'contracts.Contract', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='quality_plans', verbose_name=_('قرارداد'),
    )
    number = models.CharField(max_length=50, verbose_name=_('شمارهٔ طرح'))
    title = models.CharField(max_length=250, verbose_name=_('عنوان'))
    revision = models.CharField(max_length=20, default='00', verbose_name=_('ویرایش'))
    date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ'))
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'),
    )
    prepared_by_name = models.CharField(max_length=200, blank=True, verbose_name=_('تهیه‌کننده'))
    approved_by_name = models.CharField(max_length=200, blank=True, verbose_name=_('تأییدکننده'))
    approved_at = models.DateField(null=True, blank=True, verbose_name=_('تاریخ تأیید'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('طرح بازرسی (ITP)')
        verbose_name_plural = _('طرح‌های بازرسی (ITP)')
        unique_together = [('project', 'number')]
        ordering = ['number']

    def __str__(self):
        return f'{self.number} - {self.title}'


class QualityPlanItem(BaseModel):
    """ردیف طرح بازرسی: فعالیت، نوع بازرسی، مرجع، تواتر و نوع نقطهٔ کنترلی."""
    class InspectionType(models.TextChoices):
        MATERIAL = 'material', _('کنترل مواد و مصالح')
        SHOP = 'shop', _('بازرسی کارگاهی')
        SITE = 'site', _('بازرسی محلی')
        TEST = 'test', _('آزمون')
        COMMISSIONING = 'commissioning', _('راه‌اندازی/کمیسیونینگ')
        SURVEY = 'survey', _('نقشه‌برداری/کنترل هندسی')
        DOCUMENT = 'document', _('بازنگری مدارک')
        OTHER = 'other', _('سایر')

    class PointType(models.TextChoices):
        HOLD = 'hold', _('نقطهٔ توقف (H)')
        WITNESS = 'witness', _('نقطهٔ شاهد (W)')
        REVIEW = 'review', _('بازنگری مدارک (R)')
        SURVEILLANCE = 'surveillance', _('پایش (S)')

    class Status(models.TextChoices):
        NOT_STARTED = 'not_started', _('شروع‌نشده')
        IN_PROGRESS = 'in_progress', _('در جریان')
        PASSED = 'passed', _('قبول‌شده')
        FAILED = 'failed', _('رد شده')
        WAIVED = 'waived', _('معاف‌شده')

    plan = models.ForeignKey(
        QualityPlan, on_delete=models.CASCADE, related_name='items', verbose_name=_('طرح بازرسی'),
    )
    item_no = models.CharField(max_length=20, verbose_name=_('ردیف'))
    description = models.CharField(max_length=300, verbose_name=_('شرح فعالیت/آیتم'))
    wbs = models.ForeignKey(
        'projects.WBSNode', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='quality_items', verbose_name=_('گره WBS'),
    )
    activity = models.ForeignKey(
        'projects.Activity', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='quality_items', verbose_name=_('فعالیت'),
    )
    inspection_type = models.CharField(
        max_length=20, choices=InspectionType.choices, default=InspectionType.SITE,
        verbose_name=_('نوع بازرسی'),
    )
    point_type = models.CharField(
        max_length=20, choices=PointType.choices, default=PointType.WITNESS,
        verbose_name=_('نوع نقطهٔ کنترلی'),
    )
    reference = models.CharField(max_length=250, blank=True, verbose_name=_('مرجع/استاندارد'))
    method = models.CharField(max_length=250, blank=True, verbose_name=_('روش بازرسی/آزمون'))
    frequency = models.CharField(max_length=100, blank=True, verbose_name=_('تواتر'))
    responsible_name = models.CharField(max_length=200, blank=True, verbose_name=_('مسئول بازرسی'))
    planned_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ برنامه‌ای'))
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.NOT_STARTED, verbose_name=_('وضعیت'),
    )
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name=_('ترتیب'))

    class Meta:
        verbose_name = _('ردیف طرح بازرسی')
        verbose_name_plural = _('ردیف‌های طرح بازرسی')
        ordering = ['sort_order', 'item_no']

    def __str__(self):
        return f'{self.item_no} - {self.description}'


class Inspection(BaseModel, AuditableModel):
    """بازرسی/آزمون اجراشده (نتیجهٔ آن مبنای NCR و آزادسازی کار است)."""
    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Result(models.TextChoices):
        PASS = 'pass', _('قبول')
        FAIL = 'fail', _('رد')
        CONDITIONAL = 'conditional', _('قبول مشروط')
        NA = 'na', _('قابل‌اجرا نبود')

    class Status(models.TextChoices):
        PLANNED = 'planned', _('برنامه‌ریزی‌شده')
        DONE = 'done', _('انجام‌شده')
        CANCELLED = 'cancelled', _('لغو شده')

    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='inspections',
        verbose_name=_('پروژه'),
    )
    plan_item = models.ForeignKey(
        QualityPlanItem, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='inspections', verbose_name=_('ردیف طرح بازرسی'),
    )
    wbs = models.ForeignKey(
        'projects.WBSNode', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='inspections', verbose_name=_('گره WBS'),
    )
    number = models.CharField(max_length=50, verbose_name=_('شمارهٔ بازرسی'))
    title = models.CharField(max_length=250, blank=True, verbose_name=_('عنوان'))
    date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ بازرسی'))
    inspector_name = models.CharField(max_length=200, blank=True, verbose_name=_('بازرس'))
    location = models.CharField(max_length=250, blank=True, verbose_name=_('محل'))
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PLANNED, verbose_name=_('وضعیت'),
    )
    result = models.CharField(
        max_length=20, choices=Result.choices, null=True, blank=True, verbose_name=_('نتیجه'),
    )
    report_ref = models.CharField(max_length=250, blank=True, verbose_name=_('مرجع گزارش'))
    remarks = models.TextField(blank=True, verbose_name=_('ملاحظات'))
    next_inspection_date = models.DateField(null=True, blank=True, verbose_name=_('بازرسی بعدی'))

    class Meta:
        verbose_name = _('بازرسی')
        verbose_name_plural = _('بازرسی‌ها')
        unique_together = [('project', 'number')]
        ordering = ['-date', '-id']
        indexes = [models.Index(fields=['project', 'result'], name='insp_proj_result_idx')]

    def __str__(self):
        return f'{self.number} - {self.title or self.get_result_display()}'


class NCR(BaseModel, AuditableModel):
    """گزارش عدم انطباق (NCR) با ریشه‌یابی و اقدام اصلاحی/پیشگیرانه."""
    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Source(models.TextChoices):
        INSPECTION = 'inspection', _('بازرسی/آزمون')
        SITE = 'site', _('مشاهدهٔ محل')
        AUDIT = 'audit', _('ممیزی')
        CLIENT = 'client', _('کارفرما/مشاور')
        OTHER = 'other', _('سایر')

    class Severity(models.TextChoices):
        MINOR = 'minor', _('جزئی')
        MAJOR = 'major', _('عمده')
        CRITICAL = 'critical', _('بحرانی')

    class Status(models.TextChoices):
        OPEN = 'open', _('باز')
        CORRECTING = 'correcting', _('در حال اصلاح')
        VERIFYING = 'verifying', _('در حال تأیید')
        CLOSED = 'closed', _('بسته')
        CANCELLED = 'cancelled', _('لغو شده')

    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='ncrs', verbose_name=_('پروژه'),
    )
    inspection = models.ForeignKey(
        Inspection, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='ncrs', verbose_name=_('بازرسی مرتبط'),
    )
    wbs = models.ForeignKey(
        'projects.WBSNode', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='ncrs', verbose_name=_('گره WBS'),
    )
    activity = models.ForeignKey(
        'projects.Activity', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='ncrs', verbose_name=_('فعالیت'),
    )
    number = models.CharField(max_length=50, verbose_name=_('شمارهٔ NCR'))
    title = models.CharField(max_length=250, verbose_name=_('عنوان'))
    description = models.TextField(blank=True, verbose_name=_('شرح عدم انطباق'))
    source = models.CharField(
        max_length=20, choices=Source.choices, default=Source.INSPECTION, verbose_name=_('منشأ'),
    )
    severity = models.CharField(
        max_length=20, choices=Severity.choices, default=Severity.MINOR, verbose_name=_('شدت'),
    )
    discipline = models.CharField(max_length=100, blank=True, verbose_name=_('رشته/دیسیپلین'))
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN, verbose_name=_('وضعیت'),
    )
    detected_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ تشخیص'))
    due_date = models.DateField(null=True, blank=True, verbose_name=_('مهلت رفع'))
    closed_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ بستن'))
    root_cause = models.TextField(blank=True, verbose_name=_('علت ریشه‌ای'))
    corrective_action = models.TextField(blank=True, verbose_name=_('اقدام اصلاحی'))
    preventive_action = models.TextField(blank=True, verbose_name=_('اقدام پیشگیرانه'))
    responsible = models.ForeignKey(
        'employees.Employee', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='ncrs', verbose_name=_('مسئول'),
    )
    responsible_name = models.CharField(max_length=200, blank=True, verbose_name=_('مسئول (متنی)'))
    requires_rework = models.BooleanField(default=False, verbose_name=_('نیازمند اجرای مجدد'))
    cost_impact = models.DecimalField(
        max_digits=18, decimal_places=2, default=0, verbose_name=_('اثر مالی (ریال)'),
    )
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='closed_ncrs', verbose_name=_('تأییدکنندهٔ بستن'),
    )
    note = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('عدم انطباق (NCR)')
        verbose_name_plural = _('گزارش‌های عدم انطباق (NCR)')
        unique_together = [('project', 'number')]
        ordering = ['-detected_date', '-id']
        indexes = [
            models.Index(fields=['project', 'status'], name='ncr_proj_status_idx'),
            models.Index(fields=['project', 'severity'], name='ncr_proj_sev_idx'),
        ]

    def __str__(self):
        return f'{self.number} - {self.title}'


class PunchItem(BaseModel, AuditableModel):
    """لیست نقص/کسرکار (Snag/Punch List) با چرخهٔ رفع و تأیید."""
    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Priority(models.TextChoices):
        LOW = 'low', _('کم')
        MEDIUM = 'medium', _('متوسط')
        HIGH = 'high', _('زیاد')

    class Status(models.TextChoices):
        OPEN = 'open', _('باز')
        IN_PROGRESS = 'in_progress', _('در حال رفع')
        FIXED = 'fixed', _('رفع‌شده')
        VERIFIED = 'verified', _('تأییدشده')
        REJECTED = 'rejected', _('رد شده')

    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='punch_items',
        verbose_name=_('پروژه'),
    )
    wbs = models.ForeignKey(
        'projects.WBSNode', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='punch_items', verbose_name=_('گره WBS'),
    )
    ncr = models.ForeignKey(
        NCR, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='punch_items', verbose_name=_('NCR مرتبط'),
    )
    number = models.CharField(max_length=50, verbose_name=_('شمارهٔ مورد'))
    location = models.CharField(max_length=250, blank=True, verbose_name=_('محل/موقعیت'))
    discipline = models.CharField(max_length=100, blank=True, verbose_name=_('رشته/دیسیپلین'))
    description = models.CharField(max_length=400, verbose_name=_('شرح نقص/کسرکار'))
    priority = models.CharField(
        max_length=20, choices=Priority.choices, default=Priority.MEDIUM, verbose_name=_('اولویت'),
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN, verbose_name=_('وضعیت'),
    )
    responsible = models.ForeignKey(
        'employees.Employee', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='punch_items', verbose_name=_('مسئول رفع'),
    )
    responsible_name = models.CharField(max_length=200, blank=True, verbose_name=_('مسئول (متنی)'))
    reported_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ ثبت'))
    due_date = models.DateField(null=True, blank=True, verbose_name=_('مهلت رفع'))
    fixed_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ رفع'))
    verified_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ تأیید'))
    verified_by_name = models.CharField(max_length=200, blank=True, verbose_name=_('تأییدکننده'))
    cost = models.DecimalField(
        max_digits=18, decimal_places=2, default=0, verbose_name=_('هزینهٔ رفع (ریال)'),
    )
    note = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('مورد کسرکار (Punch)')
        verbose_name_plural = _('لیست کسرکار (Punch List)')
        unique_together = [('project', 'number')]
        ordering = ['-id']
        indexes = [models.Index(fields=['project', 'status'], name='punch_proj_status_idx')]

    def __str__(self):
        return f'{self.number} - {self.description[:40]}'


class HSEIncident(BaseModel, AuditableModel):
    """رویداد HSE (شبه‌حادثه، کمک‌های اولیه، از کارافتادگی، زیست‌محیطی)."""
    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class IncidentType(models.TextChoices):
        NEAR_MISS = 'near_miss', _('شبه‌حادثه')
        FIRST_AID = 'first_aid', _('کمک‌های اولیه')
        MEDICAL_TREATMENT = 'medical_treatment', _('درمان پزشکی')
        LOST_TIME = 'lost_time', _('از کارافتادگی (LTI)')
        ENVIRONMENTAL = 'environmental', _('زیست‌محیطی')
        PROPERTY_DAMAGE = 'property_damage', _('خسارت به اموال')
        FIRE = 'fire', _('آتش‌سوزی')
        OTHER = 'other', _('سایر')

    class Severity(models.TextChoices):
        LOW = 'low', _('کم')
        MEDIUM = 'medium', _('متوسط')
        HIGH = 'high', _('زیاد')
        CRITICAL = 'critical', _('بحرانی')

    class Status(models.TextChoices):
        OPEN = 'open', _('باز')
        INVESTIGATING = 'investigating', _('در حال بررسی')
        CLOSED = 'closed', _('بسته')

    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='hse_incidents',
        verbose_name=_('پروژه'),
    )
    wbs = models.ForeignKey(
        'projects.WBSNode', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='hse_incidents', verbose_name=_('گره WBS'),
    )
    number = models.CharField(max_length=50, verbose_name=_('شمارهٔ رویداد'))
    title = models.CharField(max_length=250, verbose_name=_('عنوان'))
    incident_type = models.CharField(
        max_length=30, choices=IncidentType.choices, default=IncidentType.NEAR_MISS,
        verbose_name=_('نوع رویداد'),
    )
    severity = models.CharField(
        max_length=20, choices=Severity.choices, default=Severity.LOW, verbose_name=_('شدت'),
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN, verbose_name=_('وضعیت'),
    )
    date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ'))
    time = models.TimeField(null=True, blank=True, verbose_name=_('ساعت'))
    location = models.CharField(max_length=250, blank=True, verbose_name=_('محل رویداد'))
    description = models.TextField(blank=True, verbose_name=_('شرح رویداد'))
    involved_persons = models.CharField(max_length=300, blank=True, verbose_name=_('افراد درگیر'))
    lost_days = models.PositiveIntegerField(default=0, verbose_name=_('روزهای از کارافتادگی'))
    man_hours = models.PositiveIntegerField(
        default=0, verbose_name=_('نفر-ساعت کارکرد (برای نرخ رویداد)'),
    )
    root_cause = models.TextField(blank=True, verbose_name=_('علت ریشه‌ای'))
    corrective_action = models.TextField(blank=True, verbose_name=_('اقدام اصلاحی'))
    preventive_action = models.TextField(blank=True, verbose_name=_('اقدام پیشگیرانه'))
    reported_by_name = models.CharField(max_length=200, blank=True, verbose_name=_('گزارش‌دهنده'))
    closed_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ بستن'))
    cost_impact = models.DecimalField(
        max_digits=18, decimal_places=2, default=0, verbose_name=_('اثر مالی (ریال)'),
    )
    note = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('رویداد HSE')
        verbose_name_plural = _('رویدادهای HSE')
        unique_together = [('project', 'number')]
        ordering = ['-date', '-id']
        indexes = [models.Index(fields=['project', 'incident_type'], name='hse_proj_type_idx')]

    def __str__(self):
        return f'{self.number} - {self.title}'
