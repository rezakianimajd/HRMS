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


class BaleSendLog(BaseModel):
    """Audit trail of every Bale message sent (for tracking / reporting)."""

    class Status(models.TextChoices):
        SENT = 'sent', _('ارسال موفق')
        FAILED = 'failed', _('ناموفق')

    template = models.ForeignKey(
        BaleTemplate,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='logs',
        verbose_name=_('قالب'),
    )
    subject = models.CharField(max_length=200, blank=True, verbose_name=_('موضوع'))
    text = models.TextField(verbose_name=_('متن ارسال‌شده'))
    chat_id = models.CharField(max_length=100, verbose_name=_('chat_id گیرنده'))
    recipient_name = models.CharField(max_length=200, blank=True, verbose_name=_('نام گیرنده'))
    status = models.CharField(max_length=10, choices=Status.choices, verbose_name=_('وضعیت'))
    error = models.TextField(blank=True, verbose_name=_('خطا'))

    class Meta:
        verbose_name = _('تاریخچه ارسال بله')
        verbose_name_plural = _('تاریخچه ارسال‌های بله')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.recipient_name or self.chat_id} - {self.get_status_display()}'


class BaleSchedule(BaseModel):
    """A scheduled Bale broadcast (time-based, execution via Celery beat/worker)."""

    class Frequency(models.TextChoices):
        ONCE = 'once', _('یک‌بار')
        DAILY = 'daily', _('روزانه')
        WEEKLY = 'weekly', _('هفتگی')
        MONTHLY = 'monthly', _('ماهانه')

    class Status(models.TextChoices):
        PENDING = 'pending', _('در انتظار')
        DONE = 'done', _('انجام شده')
        CANCELLED = 'cancelled', _('لغو شده')

    title = models.CharField(max_length=200, verbose_name=_('عنوان برنامه'))
    template = models.ForeignKey(
        BaleTemplate,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='schedules',
        verbose_name=_('قالب'),
    )
    text = models.TextField(verbose_name=_('متن پیام'))
    frequency = models.CharField(
        max_length=10, choices=Frequency.choices, default=Frequency.ONCE,
        verbose_name=_('تکرار'),
    )
    scheduled_at = models.DateTimeField(verbose_name=_('زمان اجرا'))
    chat_ids = models.TextField(
        verbose_name=_('لیست گیرندگان'),
        help_text=_('chat_id ها با کاما جدا شوند؛ خالی = همه‌گیرندگان'),
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING,
        verbose_name=_('وضعیت'),
    )
    last_run_at = models.DateTimeField(null=True, blank=True, verbose_name=_('آخرین اجرا'))

    class Meta:
        verbose_name = _('زمان‌بندی ارسال بله')
        verbose_name_plural = _('زمان‌بندی‌های ارسال بله')
        ordering = ['scheduled_at']

    def __str__(self):
        return self.title
