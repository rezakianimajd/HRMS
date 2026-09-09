"""Performance appraisal cycles and per-employee appraisal history."""
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


class AppraisalCycle(BaseModel):
    """A periodic performance appraisal cycle."""

    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        ACTIVE = 'active', _('فعال')
        CLOSED = 'closed', _('بسته')

    title = models.CharField(max_length=200, verbose_name=_('عنوان دوره'))
    cycle_type = models.CharField(max_length=50, blank=True, verbose_name=_('نوع دوره'))
    start_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ شروع'))
    end_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ پایان'))
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))
    # Stored criteria weights (JSON) so each cycle can vary weights.
    weights = models.JSONField(default=dict, blank=True, verbose_name=_('وزن معیارها'))

    class Meta:
        verbose_name = _('دوره ارزیابی')
        verbose_name_plural = _('دوره‌های ارزیابی')
        ordering = ['-start_date']

    def __str__(self):
        return self.title


class AppraisalRecord(BaseModel):
    """A saved per-employee appraisal snapshot in a cycle."""

    cycle = models.ForeignKey(
        AppraisalCycle, on_delete=models.CASCADE, related_name='records', verbose_name=_('دوره ارزیابی'),
    )
    employee = models.ForeignKey(
        'employees.Employee', on_delete=models.CASCADE, related_name='appraisals', verbose_name=_('پرسنل'),
    )
    total_score = models.DecimalField(max_digits=5, decimal_places=1, default=0, verbose_name=_('امتیاز نهایی (۰-۱۰۰)'))
    breakdown = models.JSONField(default=dict, blank=True, verbose_name=_('تفکیک امتیاز معیارها'))
    self_score = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True, verbose_name=_('خودارزیابی'))
    manager_score = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True, verbose_name=_('امتیاز مدیر'))
    goals = models.JSONField(default=list, blank=True, verbose_name=_('اهداف / OKR'))
    strengths = models.TextField(blank=True, verbose_name=_('نقاط قوت'))
    improvements = models.TextField(blank=True, verbose_name=_('نقاط بهبود'))
    comments = models.TextField(blank=True, verbose_name=_('نظر نهایی'))
    reviewed_by = models.CharField(max_length=200, blank=True, verbose_name=_('ارزیاب'))

    class Meta:
        verbose_name = _('سابقه ارزیابی')
        verbose_name_plural = _('سوابق ارزیابی')
        ordering = ['-cycle__start_date', '-created_at']
        unique_together = [('company', 'cycle', 'employee')]

    def __str__(self):
        return f'{self.employee.full_name} — {self.cycle.title} ({self.total_score})'