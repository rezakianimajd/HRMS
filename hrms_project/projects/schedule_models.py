"""فاز ۱ — زمان‌بندی، منابع و ارزش کسب‌شده (EVM).

* `WorkCalendar` / `CalendarException` → تقویم کاری و تعطیلات (هفتهٔ ایرانی)
* `Activity` / `ActivityRelationship` → شبکهٔ فعالیت و وابستگی (FS/SS/FF/SF + Lag)
* `Baseline` / `BaselineActivity` → بیس‌لاین نسخه‌دار برای مقایسه برنامه/واقعی
* `ResourceRate` / `ResourceAssignment` → نرخ مؤثرمورخ و تخصیص منابع
* `ActivityProgress` → پیشرفت زمان‌مند فعالیت (سوخت منحنی S و EVM)

محاسبات سنگین (CPM و EVM) در بستهٔ `projects/scheduling/` و به‌صورت توابع خالص
پیاده‌سازی شده‌اند تا بدون دیتابیس قابل تست باشند.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models.audit_mixin import (
    AllObjectsManager, AuditableModel, SoftDeleteManager,
)
from core.models.base_model import BaseModel

# هفتهٔ کاری ایران: شنبه(5)، یکشنبه(6)، دوشنبه(0)، سه‌شنبه(1)، چهارشنبه(2)، پنجشنبه(3)
IRAN_WORKING_DAYS = [5, 6, 0, 1, 2, 3]
IRAN_HALF_DAYS = [3]
WEEKDAY_LABELS = {
    0: 'دوشنبه', 1: 'سه‌شنبه', 2: 'چهارشنبه', 3: 'پنجشنبه',
    4: 'جمعه', 5: 'شنبه', 6: 'یکشنبه',
}


class WorkCalendar(BaseModel, AuditableModel):
    """تقویم کاری — مبنای محاسبهٔ مدت و تاریخ‌ها در CPM."""
    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, null=True, blank=True,
        related_name='work_calendars', verbose_name=_('پروژه'),
        help_text=_('خالی = تقویم شرکتی (قابل استفاده در همهٔ پروژه‌ها)'),
    )
    code = models.CharField(max_length=50, blank=True, verbose_name=_('کد'))
    name = models.CharField(max_length=150, verbose_name=_('نام تقویم'))
    working_days = models.JSONField(
        default=list, blank=True, verbose_name=_('روزهای کاری هفته'),
        help_text=_('شمارهٔ روز هفتهٔ پایتون: 0=دوشنبه … 5=شنبه، 6=یکشنبه'),
    )
    half_working_days = models.JSONField(
        default=list, blank=True, verbose_name=_('روزهای نیمه‌کاری'),
    )
    hours_per_day = models.DecimalField(
        max_digits=5, decimal_places=2, default=8, verbose_name=_('ساعت کار روزانه'),
    )
    is_default = models.BooleanField(default=False, verbose_name=_('تقویم پیش‌فرض'))
    note = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('تقویم کاری')
        verbose_name_plural = _('تقویم‌های کاری')
        ordering = ['-is_default', 'name']

    def __str__(self):
        return self.name

    def effective_working_days(self):
        return list(self.working_days or IRAN_WORKING_DAYS)


class CalendarException(BaseModel):
    """استثنای تقویم: تعطیل رسمی، روز کاری جبرانی یا نیمه‌روز."""
    calendar = models.ForeignKey(
        WorkCalendar, on_delete=models.CASCADE, related_name='exceptions',
        verbose_name=_('تقویم'),
    )
    date = models.DateField(verbose_name=_('تاریخ'))
    is_working = models.BooleanField(default=False, verbose_name=_('روز کاری است؟'))
    hours = models.DecimalField(
        max_digits=5, decimal_places=2, default=0, verbose_name=_('ساعت کار این روز'),
    )
    title = models.CharField(max_length=200, blank=True, verbose_name=_('عنوان'))

    class Meta:
        verbose_name = _('استثنای تقویم')
        verbose_name_plural = _('استثناهای تقویم')
        unique_together = [('calendar', 'date')]
        ordering = ['date']

    def __str__(self):
        return f'{self.calendar} {self.date}'



class Activity(BaseModel, AuditableModel):
    """فعالیت زمان‌بندی‌شدهٔ پروژه (گرهٔ اجرایی شبکه، مستقل از درخت WBS اما متصل به آن)."""
    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class ActivityType(models.TextChoices):
        TASK = 'task', _('فعالیت')
        MILESTONE = 'milestone', _('نقطهٔ عطف')
        SUMMARY = 'summary', _('خلاصه (والد)')
        LOE = 'loe', _('حمایتی / سطح تلاش')

    class ConstraintType(models.TextChoices):
        ASAP = 'asap', _('در اسرع وقت')
        SNET = 'snet', _('شروع نه‌زودتر از')
        FNLT = 'fnlt', _('پایان نه‌دیرتر از')
        MSO = 'mso', _('شروع در تاریخ')
        MFO = 'mfo', _('پایان در تاریخ')

    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='activities',
        verbose_name=_('پروژه'),
    )
    wbs = models.ForeignKey(
        'projects.WBSNode', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='activities', verbose_name=_('گره WBS'),
    )
    calendar = models.ForeignKey(
        WorkCalendar, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='activities', verbose_name=_('تقویم کاری'),
    )
    code = models.CharField(max_length=50, verbose_name=_('کد فعالیت'))
    name = models.CharField(max_length=250, verbose_name=_('نام فعالیت'))
    activity_type = models.CharField(
        max_length=20, choices=ActivityType.choices, default=ActivityType.TASK,
        verbose_name=_('نوع'),
    )
    duration_days = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, verbose_name=_('مدت (روز کاری)'),
    )
    constraint_type = models.CharField(
        max_length=10, choices=ConstraintType.choices, default=ConstraintType.ASAP,
        verbose_name=_('نوع محدودیت'),
    )
    constraint_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ محدودیت'))
    sequence = models.PositiveIntegerField(default=0, verbose_name=_('ترتیب نمایش'))

    early_start = models.DateField(null=True, blank=True, verbose_name=_('شروع زودترین'))
    early_finish = models.DateField(null=True, blank=True, verbose_name=_('پایان زودترین'))
    late_start = models.DateField(null=True, blank=True, verbose_name=_('شروع دیرترین'))
    late_finish = models.DateField(null=True, blank=True, verbose_name=_('پایان دیرترین'))
    total_float = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, verbose_name=_('شناوری کل'),
    )
    is_critical = models.BooleanField(default=False, verbose_name=_('بحرانی'))

    actual_start = models.DateField(null=True, blank=True, verbose_name=_('شروع واقعی'))
    actual_finish = models.DateField(null=True, blank=True, verbose_name=_('پایان واقعی'))
    percent_complete = models.DecimalField(
        max_digits=5, decimal_places=2, default=0, verbose_name=_('درصد پیشرفت'),
    )
    weight = models.DecimalField(
        max_digits=12, decimal_places=4, default=1, verbose_name=_('وزن پیشرفت'),
    )
    planned_cost = models.DecimalField(
        max_digits=18, decimal_places=2, default=0, verbose_name=_('هزینهٔ برنامه‌ای'),
    )
    actual_cost = models.DecimalField(
        max_digits=18, decimal_places=2, default=0, verbose_name=_('هزینهٔ واقعی'),
    )
    progress_method = models.CharField(
        max_length=20, default='percent', verbose_name=_('روش اندازه‌گیری پیشرفت'),
    )
    notes = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('فعالیت')
        verbose_name_plural = _('فعالیت‌ها')
        unique_together = [('project', 'code')]
        ordering = ['sequence', 'code']
        indexes = [
            models.Index(fields=['project', 'activity_type'], name='activity_proj_type_idx'),
            models.Index(fields=['project', 'is_critical'], name='activity_proj_crit_idx'),
        ]

    def __str__(self):
        return f'{self.code} — {self.name}'


class ActivityRelationship(BaseModel, AuditableModel):
    """وابستگی بین دو فعالیت (پیش‌نیاز → پس‌نیاز) با Lag."""
    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class RelType(models.TextChoices):
        FS = 'fs', _('پایان به شروع (FS)')
        SS = 'ss', _('شروع به شروع (SS)')
        FF = 'ff', _('پایان به پایان (FF)')
        SF = 'sf', _('شروع به پایان (SF)')

    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='activity_relationships',
        verbose_name=_('پروژه'),
    )
    predecessor = models.ForeignKey(
        Activity, on_delete=models.CASCADE, related_name='successor_links',
        verbose_name=_('پیش‌نیاز'),
    )
    successor = models.ForeignKey(
        Activity, on_delete=models.CASCADE, related_name='predecessor_links',
        verbose_name=_('پس‌نیاز'),
    )
    rel_type = models.CharField(
        max_length=2, choices=RelType.choices, default=RelType.FS, verbose_name=_('نوع وابستگی'),
    )
    lag_days = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, verbose_name=_('تأخیر/تقدم (روز)'),
    )

    class Meta:
        verbose_name = _('وابستگی فعالیت')
        verbose_name_plural = _('وابستگی‌های فعالیت')
        unique_together = [('predecessor', 'successor')]
        ordering = ['project', 'predecessor', 'successor']

    def __str__(self):
        return f'{self.predecessor_id} → {self.successor_id} ({self.rel_type})'


class Baseline(BaseModel):
    """بیس‌لاین زمان‌بندی — تصویر قفل‌شدهٔ برنامه برای مقایسه و EVM."""
    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='baselines',
        verbose_name=_('پروژه'),
    )
    name = models.CharField(max_length=150, verbose_name=_('عنوان بیس‌لاین'))
    version = models.PositiveIntegerField(default=1, verbose_name=_('نسخه'))
    is_current = models.BooleanField(default=True, verbose_name=_('بیس‌لاین جاری'))
    total_cost = models.DecimalField(
        max_digits=18, decimal_places=2, default=0, verbose_name=_('جمع هزینهٔ برنامه‌ای (BAC)'),
    )
    start_date = models.DateField(null=True, blank=True, verbose_name=_('شروع برنامه'))
    end_date = models.DateField(null=True, blank=True, verbose_name=_('پایان برنامه'))
    note = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('بیس‌لاین')
        verbose_name_plural = _('بیس‌لاین‌ها')
        unique_together = [('project', 'version')]
        ordering = ['-version']

    def __str__(self):
        return f'{self.project.code} v{self.version}'


class BaselineActivity(BaseModel):
    """ردیف بیس‌لاین برای هر فعالیت (تاریخ‌ها، مدت، شناوری و هزینه)."""
    baseline = models.ForeignKey(
        Baseline, on_delete=models.CASCADE, related_name='items', verbose_name=_('بیس‌لاین'),
    )
    activity = models.ForeignKey(
        'projects.Activity', on_delete=models.CASCADE, related_name='baseline_items',
        verbose_name=_('فعالیت'),
    )
    code = models.CharField(max_length=50, blank=True, verbose_name=_('کد'))
    name = models.CharField(max_length=250, blank=True, verbose_name=_('نام'))
    early_start = models.DateField(null=True, blank=True, verbose_name=_('شروع زودترین'))
    early_finish = models.DateField(null=True, blank=True, verbose_name=_('پایان زودترین'))
    late_start = models.DateField(null=True, blank=True, verbose_name=_('شروع دیرترین'))
    late_finish = models.DateField(null=True, blank=True, verbose_name=_('پایان دیرترین'))
    duration_days = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name=_('مدت'))
    total_float = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name=_('شناوری'))
    planned_cost = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('هزینهٔ برنامه‌ای'))
    weight = models.DecimalField(max_digits=12, decimal_places=4, default=1, verbose_name=_('وزن'))

    class Meta:
        verbose_name = _('ردیف بیس‌لاین')
        verbose_name_plural = _('ردیف‌های بیس‌لاین')
        unique_together = [('baseline', 'activity')]
        ordering = ['code']

    def __str__(self):
        return f'{self.code} @ v{self.baseline.version}'


class ResourceRate(BaseModel, AuditableModel):
    """نرخ منبع با تاریخ اعتبار (نرخ‌های مؤثرمورخ)."""
    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    resource = models.ForeignKey(
        'projects.Resource', on_delete=models.CASCADE, related_name='rates',
        verbose_name=_('منبع'),
    )
    effective_from = models.DateField(verbose_name=_('معتبر از'))
    rate = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('نرخ واحد'))
    currency = models.ForeignKey(
        'settings_app.Currency', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='resource_rates', verbose_name=_('ارز'),
    )
    note = models.CharField(max_length=200, blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('نرخ منبع')
        verbose_name_plural = _('نرخ‌های منابع')
        unique_together = [('resource', 'effective_from')]
        ordering = ['resource', '-effective_from']

    def __str__(self):
        return f'{self.resource} @ {self.effective_from}'


class ResourceAssignment(BaseModel, AuditableModel):
    """تخصیص منبع به فعالیت (مبنای هزینهٔ منابع و هیستوگرام منابع)."""
    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    activity = models.ForeignKey(
        'projects.Activity', on_delete=models.CASCADE, related_name='assignments',
        verbose_name=_('فعالیت'),
    )
    resource = models.ForeignKey(
        'projects.Resource', on_delete=models.CASCADE, related_name='assignments',
        verbose_name=_('منبع'),
    )
    units_per_day = models.DecimalField(max_digits=12, decimal_places=4, default=1, verbose_name=_('مقدار روزانه'))
    planned_qty = models.DecimalField(max_digits=18, decimal_places=4, default=0, verbose_name=_('مقدار برنامه‌ای'))
    actual_qty = models.DecimalField(max_digits=18, decimal_places=4, default=0, verbose_name=_('مقدار واقعی'))
    unit_rate = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('نرخ واحد'))
    planned_cost = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('هزینهٔ برنامه‌ای'))
    actual_cost = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('هزینهٔ واقعی'))

    class Meta:
        verbose_name = _('تخصیص منبع')
        verbose_name_plural = _('تخصیص منابع')
        unique_together = [('activity', 'resource')]
        ordering = ['activity', 'resource']

    def __str__(self):
        return f'{self.resource} → {self.activity.code}'


class ActivityProgress(BaseModel):
    """پیشرفت زمان‌مند فعالیت — سوخت منحنی S و EVM."""
    activity = models.ForeignKey(
        'projects.Activity', on_delete=models.CASCADE, related_name='progress_entries',
        verbose_name=_('فعالیت'),
    )
    date = models.DateField(verbose_name=_('تاریخ گزارش'))
    percent_complete = models.DecimalField(
        max_digits=5, decimal_places=2, default=0, verbose_name=_('درصد پیشرفت'),
    )
    quantity = models.DecimalField(
        max_digits=18, decimal_places=4, default=0, verbose_name=_('مقدار'),
    )
    note = models.CharField(max_length=250, blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('پیشرفت فعالیت')
        verbose_name_plural = _('پیشرفت فعالیت‌ها')
        unique_together = [('activity', 'date')]
        ordering = ['activity', 'date']

    def __str__(self):
        return f'{self.activity.code} @ {self.date} = {self.percent_complete}%'
