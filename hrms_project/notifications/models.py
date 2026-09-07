"""Models for the Notification Center module."""
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


class Notification(BaseModel):
    """
    A user-targeted notification generated from HR events:
    pending leave/HR requests, expiring contracts/documents, and
    nearly-exhausted leave balances.

    ``user_id`` is a plain integer (not a ForeignKey to ``auth.User``) because
    ``auth.User`` lives in the shared/public schema while this model is a
    tenant model; a cross-schema FK would break lookups. ``user_id IS NULL``
    indicates a global notification shown to HR managers / superusers.
    """

    class Category(models.TextChoices):
        LEAVE_REQUEST = 'leave_request', _('درخواست مرخصی')
        HR_REQUEST = 'hr_request', _('درخواست اداری')
        CONTRACT_EXPIRY = 'contract_expiry', _('انقضای قرارداد')
        DOCUMENT_EXPIRY = 'document_expiry', _('انقضای مدرک')
        LEAVE_BALANCE = 'leave_balance', _('پایان مانده مرخصی')

    class Priority(models.TextChoices):
        LOW = 'low', _('کم')
        NORMAL = 'normal', _('عادی')
        HIGH = 'high', _('زیاد')
        URGENT = 'urgent', _('فوری')

    user_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name=_('شناسه کاربر گیرنده'),
        help_text=_('NULL = اعلان سراسری (مدیران منابع انسانی / سوپرادمین)'),
    )
    category = models.CharField(
        max_length=30,
        choices=Category.choices,
        verbose_name=_('دسته‌بندی'),
    )
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.NORMAL,
        verbose_name=_('اولویت'),
    )
    title = models.CharField(max_length=200, verbose_name=_('عنوان'))
    body = models.TextField(blank=True, verbose_name=_('متن'))
    # Generic pointer to the related entity (employee / request / document id + type).
    entity_type = models.CharField(max_length=50, blank=True, verbose_name=_('نوع موجودیت'))
    entity_id = models.PositiveIntegerField(null=True, blank=True, verbose_name=_('شناسه موجودیت'))
    is_read = models.BooleanField(default=False, verbose_name=_('خوانده شده'))
    read_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان خواندن'))
    # Stable dedup key so the sync job does not create duplicates on every run.
    dedup_key = models.CharField(max_length=255, blank=True, verbose_name=_('کلید یکتاسازی'))

    class Meta:
        verbose_name = _('اعلان')
        verbose_name_plural = _('اعلان‌ها')
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class BaleTemplate(BaseModel):
    """A reusable message template for quick Bale sending."""

    class EventType(models.TextChoices):
        BIRTHDAY = 'birthday', _('تولد')
        BENEFITS = 'benefits', _('مزایا')
        PAYSLIP = 'payslip', _('فیش حقوقی')
        EID = 'eid', _('اعیاد')
        ANNOUNCEMENT = 'announcement', _('اطلاعیه')
        OTHER = 'other', _('سایر')

    title = models.CharField(max_length=200, verbose_name=_('عنوان قالب'))
    event_type = models.CharField(
        max_length=20,
        choices=EventType.choices,
        default=EventType.ANNOUNCEMENT,
        verbose_name=_('نوع مناسبت'),
    )
    text = models.TextField(verbose_name=_('متن پیام'))
    is_default = models.BooleanField(default=False, verbose_name=_('پیش‌فرض'))

    class Meta:
        verbose_name = _('قالب پیام بله')
        verbose_name_plural = _('قالب‌های پیام بله')
        ordering = ['event_type', 'title']

    def __str__(self):
        return f'{self.title} ({self.get_event_type_display()})'
