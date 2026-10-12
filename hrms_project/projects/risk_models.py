"""فاز ۳ (بخش اول) — رجیستر ریسک پروژه.

* `RiskCategory` → دسته‌بندی ریسک (فنی، مالی، حقوقی، HSE، اقلیمی، ...)
* `Risk` → ریسک/فرصت با احتمال، شدت اثر (هزینه/زمان/کیفیت/HSE)، امتیاز،
  راهبرد پاسخ، برنامهٔ کاهش و کاهندهٔ «ریسک باقی‌مانده» (residual)
* `RiskAction` → اقدام‌های برنامهٔ کاهش/واکنش با مسئول و سررسید
* `RiskReview` → گزارش بازنگری دوره‌ای (عکس فوری از احتمال/شدت/امتیاز/وضعیت)
"""
from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models.audit_mixin import (
    AllObjectsManager, AuditableModel, SoftDeleteManager,
)
from core.models.base_model import BaseModel

SCALE_VALIDATORS = [MinValueValidator(1), MaxValueValidator(5)]


class RiskCategory(BaseModel):
    """دستهٔ ریسک (فنی، مالی، حقوقی، HSE، اقلیمی، سیاستی، ...)."""
    name = models.CharField(max_length=150, verbose_name=_('نام دسته'))
    code = models.CharField(max_length=30, verbose_name=_('کد'))
    discipline = models.CharField(max_length=100, blank=True, verbose_name=_('رشته/دیسیپلین'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('دستهٔ ریسک')
        verbose_name_plural = _('دسته‌های ریسک')
        unique_together = [('company', 'code')]
        ordering = ['code']

    def __str__(self):
        return f'{self.code} - {self.name}'


class Risk(BaseModel, AuditableModel):
    """یک ردیف رجیستر ریسک (تهدید یا فرصت)."""
    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class RiskType(models.TextChoices):
        THREAT = 'threat', _('تهدید')
        OPPORTUNITY = 'opportunity', _('فرصت')

    class Status(models.TextChoices):
        OPEN = 'open', _('باز')
        MITIGATING = 'mitigating', _('در حال کاهش')
        MONITORING = 'monitoring', _('تحت پایش')
        OCCURRED = 'occurred', _('رخ‌داده')
        ACCEPTED = 'accepted', _('پذیرفته‌شده')
        CLOSED = 'closed', _('بسته')

    class Response(models.TextChoices):
        AVOID = 'avoid', _('اجتناب')
        TRANSFER = 'transfer', _('انتقال (بیمه/پیمانکار جزء)')
        MITIGATE = 'mitigate', _('کاهش')
        ACCEPT = 'accept', _('پذیرش')
        EXPLOIT = 'exploit', _('بهره‌گیری')
        ENHANCE = 'enhance', _('تشدید')
        SHARE = 'share', _('تقسیم')

    class Level(models.TextChoices):
        LOW = 'low', _('کم')
        MEDIUM = 'medium', _('متوسط')
        HIGH = 'high', _('زیاد')
        CRITICAL = 'critical', _('بحرانی')

    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='risks',
        verbose_name=_('پروژه'),
    )
    category = models.ForeignKey(
        RiskCategory, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='risks', verbose_name=_('دستهٔ ریسک'),
    )
    wbs = models.ForeignKey(
        'projects.WBSNode', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='risks', verbose_name=_('گره WBS'),
    )
    activity = models.ForeignKey(
        'projects.Activity', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='risks', verbose_name=_('فعالیت'),
    )
    number = models.CharField(max_length=50, verbose_name=_('شمارهٔ ریسک'))
    title = models.CharField(max_length=250, verbose_name=_('عنوان'))
    description = models.TextField(blank=True, verbose_name=_('شرح ریسک'))
    root_cause = models.TextField(blank=True, verbose_name=_('علت ریشه‌ای'))
    trigger = models.CharField(max_length=250, blank=True, verbose_name=_('نشانهٔ وقوع (Trigger)'))

    risk_type = models.CharField(
        max_length=20, choices=RiskType.choices, default=RiskType.THREAT, verbose_name=_('نوع'),
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN, verbose_name=_('وضعیت'),
    )
    response_strategy = models.CharField(
        max_length=20, choices=Response.choices, default=Response.MITIGATE,
        verbose_name=_('راهبرد پاسخ'),
    )

    probability = models.PositiveSmallIntegerField(
        default=3, validators=SCALE_VALIDATORS, verbose_name=_('احتمال (۱ تا ۵)'),
    )
    impact_cost = models.PositiveSmallIntegerField(
        default=3, validators=SCALE_VALIDATORS, verbose_name=_('شدت اثر هزینه (۱ تا ۵)'),
    )
    impact_time = models.PositiveSmallIntegerField(
        default=1, validators=SCALE_VALIDATORS, verbose_name=_('شدت اثر زمان (۱ تا ۵)'),
    )
    impact_quality = models.PositiveSmallIntegerField(
        default=1, validators=SCALE_VALIDATORS, verbose_name=_('شدت اثر کیفیت (۱ تا ۵)'),
    )
    impact_hse = models.PositiveSmallIntegerField(
        default=1, validators=SCALE_VALIDATORS, verbose_name=_('شدت اثر HSE (۱ تا ۵)'),
    )
    score = models.PositiveSmallIntegerField(default=0, verbose_name=_('امتیاز ریسک (احتمال × بیشترین اثر)'))
    level = models.CharField(
        max_length=20, choices=Level.choices, default=Level.MEDIUM,
        verbose_name=_('سطح ریسک'),
    )

    cost_impact = models.DecimalField(
        max_digits=18, decimal_places=2, default=0, verbose_name=_('اثر مالی (ریال)'),
    )
    expected_cost = models.DecimalField(
        max_digits=18, decimal_places=2, default=0, verbose_name=_('ارزش مورد انتظار (احتمال × اثر مالی)'),
    )
    schedule_impact_days = models.IntegerField(default=0, verbose_name=_('اثر زمانی (روز)'))

    residual_probability = models.PositiveSmallIntegerField(
        default=0, validators=[MaxValueValidator(5)], verbose_name=_('احتمال باقی‌مانده'),
    )
    residual_impact = models.PositiveSmallIntegerField(
        default=0, validators=[MaxValueValidator(5)], verbose_name=_('شدت اثر باقی‌مانده'),
    )
    residual_score = models.PositiveSmallIntegerField(default=0, verbose_name=_('امتیاز ریسک باقی‌مانده'))
    residual_cost = models.DecimalField(
        max_digits=18, decimal_places=2, default=0, verbose_name=_('اثر مالی باقی‌مانده'),
    )

    owner = models.ForeignKey(
        'employees.Employee', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='owned_risks', verbose_name=_('مالک ریسک'),
    )
    owner_name = models.CharField(max_length=200, blank=True, verbose_name=_('مالک (نام متنی)'))
    identified_by_name = models.CharField(max_length=200, blank=True, verbose_name=_('شناسایی‌کننده'))
    identified_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ شناسایی'))
    due_date = models.DateField(null=True, blank=True, verbose_name=_('مهلت پاسخ/کاهش'))
    review_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ بازنگری بعدی'))
    closed_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ بسته‌شدن'))

    mitigation_plan = models.TextField(blank=True, verbose_name=_('برنامهٔ کاهش/پاسخ'))
    contingency_plan = models.TextField(blank=True, verbose_name=_('برنامهٔ واکنش اضطراری'))
    note = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('ریسک پروژه')
        verbose_name_plural = _('رجیستر ریسک')
        unique_together = [('project', 'number')]
        ordering = ['-score', '-id']
        indexes = [
            models.Index(fields=['project', 'status'], name='risk_proj_status_idx'),
            models.Index(fields=['project', 'level'], name='risk_proj_level_idx'),
        ]

    def __str__(self):
        return f'{self.number} — {self.title}'


class RiskAction(BaseModel, AuditableModel):
    """اقدام برنامهٔ کاهش/واکنش ریسک (تکلیف با مسئول و سررسید)."""
    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Status(models.TextChoices):
        PLANNED = 'planned', _('برنامه‌ریزی‌شده')
        IN_PROGRESS = 'in_progress', _('در حال اجرا')
        DONE = 'done', _('انجام‌شده')
        CANCELLED = 'cancelled', _('لغو شده')

    risk = models.ForeignKey(
        'Risk', on_delete=models.CASCADE, related_name='actions', verbose_name=_('ریسک'),
    )
    title = models.CharField(max_length=250, verbose_name=_('عنوان اقدام'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))
    owner = models.ForeignKey(
        'employees.Employee', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='risk_actions', verbose_name=_('مسئول'),
    )
    owner_name = models.CharField(max_length=200, blank=True, verbose_name=_('مسئول (نام متنی)'))
    start_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ شروع'))
    due_date = models.DateField(null=True, blank=True, verbose_name=_('سررسید'))
    completed_at = models.DateField(null=True, blank=True, verbose_name=_('تاریخ انجام'))
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PLANNED, verbose_name=_('وضعیت'),
    )
    cost = models.DecimalField(
        max_digits=18, decimal_places=2, default=0, verbose_name=_('هزینهٔ اقدام'),
    )
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name=_('ترتیب'))

    class Meta:
        verbose_name = _('اقدام ریسک')
        verbose_name_plural = _('اقدام‌های ریسک')
        ordering = ['sort_order', 'id']
        indexes = [models.Index(fields=['risk', 'status'], name='risk_act_status_idx')]

    def __str__(self):
        return self.title


class RiskReview(BaseModel):
    """گزارش بازنگری دوره‌ای یک ریسک (تاریخچهٔ امتیاز و وضعیت)."""
    risk = models.ForeignKey(
        Risk, on_delete=models.CASCADE, related_name='reviews', verbose_name=_('ریسک'),
    )
    date = models.DateField(verbose_name=_('تاریخ بازنگری'))
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='risk_reviews', verbose_name=_('بازنگر'),
    )
    reviewer_name = models.CharField(max_length=200, blank=True, verbose_name=_('بازنگر (نام)'))
    probability = models.PositiveSmallIntegerField(default=0, verbose_name=_('احتمال'))
    impact = models.PositiveSmallIntegerField(default=0, verbose_name=_('شدت اثر'))
    score = models.PositiveSmallIntegerField(default=0, verbose_name=_('امتیاز'))
    residual_score = models.PositiveSmallIntegerField(default=0, verbose_name=_('امتیاز باقی‌مانده'))
    status = models.CharField(max_length=20, blank=True, verbose_name=_('وضعیت در زمان بازنگری'))
    note = models.TextField(blank=True, verbose_name=_('یادداشت'))
    next_review_date = models.DateField(null=True, blank=True, verbose_name=_('بازنگری بعدی'))

    class Meta:
        verbose_name = _('بازنگری ریسک')
        verbose_name_plural = _('بازنگری‌های ریسک')
        ordering = ['-date', '-id']

    def __str__(self):
        return f'{self.risk_id} @ {self.date}'
