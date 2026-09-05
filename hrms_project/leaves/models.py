"""Models for the Leaves module (مرخصی و مأموریت)."""
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


class LeaveRequest(BaseModel):
    """A leave/mission request submitted for an employee."""

    class LeaveType(models.TextChoices):
        ANNUAL = 'annual', _('مرخصی استحقاقی')
        SICK = 'sick', _('مرخصی استعلاجی')
        MISSION = 'mission', _('مأموریت')
        UNPAID = 'unpaid', _('مرخصی بدون حقوق')
        MARRIAGE = 'marriage', _('مرخصی ازدواج')
        MATERNITY = 'maternity', _('مرخصی زایمان')
        OTHER = 'other', _('سایر')

    class Status(models.TextChoices):
        PENDING = 'pending', _('در انتظار تأیید')
        APPROVED = 'approved', _('تأیید شده')
        REJECTED = 'rejected', _('رد شده')
        CANCELLED = 'cancelled', _('لغو شده')

    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='leave_requests',
        verbose_name=_('پرسنل'),
    )
    leave_type = models.CharField(
        max_length=30,
        choices=LeaveType.choices,
        default=LeaveType.ANNUAL,
        verbose_name=_('نوع مرخصی/مأموریت'),
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name=_('وضعیت'),
    )
    start_date = models.DateField(verbose_name=_('تاریخ شروع'))
    end_date = models.DateField(verbose_name=_('تاریخ پایان'))
    days = models.DecimalField(
        max_digits=5, decimal_places=1, default=1,
        verbose_name=_('تعداد روز'),
    )
    reason = models.TextField(blank=True, verbose_name=_('دلیل/توضیح'))
    approved_by = models.ForeignKey(
        'employees.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_leave_requests',
        verbose_name=_('تأییدکننده'),
    )

    class Meta:
        verbose_name = _('درخواست مرخصی/مأموریت')
        verbose_name_plural = _('مرخصی و مأموریت')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.employee.full_name} - {self.get_leave_type_display()} ({self.start_date} تا {self.end_date})'