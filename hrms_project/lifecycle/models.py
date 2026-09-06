"""Models for the Employee Lifecycle module (Phase 3).

Covers:
  * Onboarding / Offboarding checklists (per employee)
  * Physical assets issued to employees (laptops, phones, desks, keys...)
  * A calendar event model for the organizational hybrid (Shamsi) calendar.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


class Asset(BaseModel):
    """A physical asset assigned to an employee."""

    class AssetType(models.TextChoices):
        LAPTOP = 'laptop', _('لپ‌تاپ')
        PHONE = 'phone', _('موبایل')
        DESK = 'desk', _('میز کار')
        MONITOR = 'monitor', _('مانیتور')
        KEY = 'key', _('کلید')
        OTHER = 'other', _('سایر')

    class AssetStatus(models.TextChoices):
        ASSIGNED = 'assigned', _('واگذارشده')
        RETURNED = 'returned', _('تحویل‌شده')
        LOST = 'lost', _('مفقود')
        DAMAGED = 'damaged', _('آسیب‌دیده')

    name = models.CharField(max_length=200, verbose_name=_('نام دارایی'))
    asset_type = models.CharField(
        max_length=20, choices=AssetType.choices, default=AssetType.OTHER,
        verbose_name=_('نوع دارایی'),
    )
    serial_number = models.CharField(max_length=100, blank=True, verbose_name=_('سریال / شناسه'))
    employee = models.ForeignKey(
        'employees.Employee', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assets', verbose_name=_('پرسنل واگذارشده'),
    )
    assigned_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ واگذاری'))
    return_due_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ بازگشت مورد انتظار'))
    returned_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ تحویل'))
    status = models.CharField(
        max_length=20, choices=AssetStatus.choices, default=AssetStatus.ASSIGNED,
        verbose_name=_('وضعیت'),
    )
    notes = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('دارایی')
        verbose_name_plural = _('اموال و تجهیزات')
        ordering = ['-assigned_date', '-created_at']
        indexes = [
            models.Index(fields=['company', 'employee'], name='lifecycle_asset_company_employee_idx'),
            models.Index(fields=['company', 'status'], name='lifecycle_asset_company_status_idx'),
        ]

    def __str__(self):
        return f'{self.name} ({self.get_asset_type_display()})'


class LifecycleChecklist(BaseModel):
    """A named checklist template (onboarding or offboarding)."""

    class Kind(models.TextChoices):
        ONBOARDING = 'onboarding', _('خوش‌آمدگویی / ورود')
        OFFBOARDING = 'offboarding', _('خروج / تسویه')

    employee = models.ForeignKey(
        'employees.Employee', on_delete=models.CASCADE,
        related_name='checklists', verbose_name=_('پرسنل'),
    )
    kind = models.CharField(max_length=20, choices=Kind.choices, verbose_name=_('نوع چک‌لیست'))
    progress_note = models.TextField(blank=True, verbose_name=_('توضیح پیشرفت'))

    class Meta:
        verbose_name = _('چک‌لیست چرخه عمر')
        verbose_name_plural = _('چک‌لیست‌های چرخه عمر')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.get_kind_display()} - {self.employee.full_name}'

    @property
    def progress(self):
        items = list(self.items.all())
        if not items:
            return 0
        done = sum(1 for i in items if i.is_completed)
        return round(done / len(items) * 100, 0)


class ChecklistItem(BaseModel):
    """A single task inside a lifecycle checklist."""

    checklist = models.ForeignKey(
        LifecycleChecklist, on_delete=models.CASCADE,
        related_name='items', verbose_name=_('چک‌لیست'),
    )
    title = models.CharField(max_length=250, verbose_name=_('عنوان وظیفه'))
    is_completed = models.BooleanField(default=False, verbose_name=_('انجام شده'))
    completed_at = models.DateField(null=True, blank=True, verbose_name=_('تاریخ انجام'))

    class Meta:
        verbose_name = _('اقلام چک‌لیست')
        verbose_name_plural = _('اقلام چک‌لیست')
        ordering = ['id']

    def __str__(self):
        return self.title


class CalendarEvent(BaseModel):
    """A company-wide calendar event for the hybrid Shamsi calendar.

    ``event_date`` is stored as a normal Gregorian DATE; consumers convert it
    to Jalali on the frontend using the existing date utils. ``source`` links
    the event to its originating entity (birthday, leave, contract, custom).
    """

    class EventType(models.TextChoices):
        CUSTOM = 'custom', _('رویداد عمومی')
        BIRTHDAY = 'birthday', _('تولد')
        LEAVE = 'leave', _('مرخصی')
        CONTRACT_END = 'contract_end', _('پایان قرارداد')

    title = models.CharField(max_length=250, verbose_name=_('عنوان'))
    event_date = models.DateField(verbose_name=_('تاریخ رویداد'))
    event_type = models.CharField(
        max_length=20, choices=EventType.choices, default=EventType.CUSTOM,
        verbose_name=_('نوع رویداد'),
    )
    employee = models.ForeignKey(
        'employees.Employee', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='calendar_events', verbose_name=_('پرسنل مرتبط'),
    )
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('رویداد تقویم')
        verbose_name_plural = _('رویدادهای تقویم')
        ordering = ['event_date', 'id']
        indexes = [
            models.Index(fields=['company', 'event_date'], name='lifecycle_event_company_date_idx'),
        ]

    def __str__(self):
        return self.title