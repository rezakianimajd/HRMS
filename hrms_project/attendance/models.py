"""Models for the Attendance module."""
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


class AttendanceRecord(BaseModel):
    """Daily attendance/clock-in record per employee."""

    class Status(models.TextChoices):
        PRESENT = 'present', _('حضور')
        ABSENT = 'absent', _('غیبت')
        LEAVE = 'leave', _('مرخصی')
        MISSION = 'mission', _('مأموریت')
        HOLIDAY = 'holiday', _('تعطیل')

    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='attendance_records',
        verbose_name=_('پرسنل'),
    )
    date = models.DateField(verbose_name=_('تاریخ'))
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PRESENT,
        verbose_name=_('وضعیت'),
    )
    check_in = models.TimeField(null=True, blank=True, verbose_name=_('ورود'))
    check_out = models.TimeField(null=True, blank=True, verbose_name=_('خروج'))
    work_hours = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        verbose_name=_('ساعت کاری'),
    )
    overtime_hours = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        verbose_name=_('اضافهکار'),
    )
    note = models.CharField(max_length=300, blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('رکورد حضور')
        verbose_name_plural = _('حضور و غیاب')
        ordering = ['-date', 'employee__employee_id']
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'employee', 'date'],
                name='uniq_attendance_employee_date',
            )
        ]

    def __str__(self):
        return f"{self.employee.full_name} - {self.date} ({self.get_status_display()})"