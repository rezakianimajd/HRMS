"""System-wide update & broadcast models.

These models live in the **public schema** (``core`` is a SHARED_APP) because
updating the application and announcing maintenance are platform-level events,
not per-tenant data.
"""
from django.conf import settings as django_settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class UpdateSettings(models.Model):
    """Singleton configuration for the in-app updater."""

    channel = models.CharField(
        max_length=20, default='stable', verbose_name=_('کانال انتشار'),
        help_text=_('stable یا beta'),
    )
    feed_url = models.URLField(
        blank=True, verbose_name=_('آدرس منبع آپدیت'),
        help_text=_('برای بررسی نسخه‌های جدید (اختیاری)'),
    )
    public_key = models.TextField(
        blank=True, verbose_name=_('کلید عمومی امضا'),
        help_text=_('کلید Ed25519 (Base64) برای تأیید اصالت بسته؛ خالی = بررسی امضا غیرفعال'),
    )
    logout_countdown_seconds = models.PositiveIntegerField(
        default=60, verbose_name=_('شمارندهٔ خروج (ثانیه)'),
    )
    keep_releases = models.PositiveSmallIntegerField(
        default=3, verbose_name=_('تعداد بستهٔ نگهداری‌شده'),
    )
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('آخرین تغییر'))

    class Meta:
        verbose_name = _('تنظیمات به‌روزرسانی')
        verbose_name_plural = _('تنظیمات به‌روزرسانی')

    def __str__(self):
        return f'UpdateSettings(channel={self.channel})'

    @classmethod
    def load(cls):
        obj, _created = cls.objects.get_or_create(pk=1)
        return obj

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)


class AppRelease(models.Model):
    """An uploaded update package and its verification state."""

    class Status(models.TextChoices):
        UPLOADED = 'uploaded', _('آپلود شده')
        VERIFIED = 'verified', _('تأیید شده')
        STAGED = 'staged', _('آمادهٔ نصب')
        APPLIED = 'applied', _('نصب شده')
        FAILED = 'failed', _('ناموفق')

    version = models.CharField(max_length=40, verbose_name=_('نسخه'))
    build_hash = models.CharField(max_length=64, blank=True, verbose_name=_('هش بیلد'))
    channel = models.CharField(max_length=20, default='stable', verbose_name=_('کانال'))
    notes = models.TextField(blank=True, verbose_name=_('تغییرات'))
    manifest = models.JSONField(default=dict, blank=True, verbose_name=_('مانیفست'))
    artifact_path = models.CharField(max_length=500, verbose_name=_('مسیر فایل'))
    file_name = models.CharField(max_length=255, blank=True, verbose_name=_('نام فایل'))
    sha256 = models.CharField(max_length=64, blank=True, verbose_name=_('SHA-256'))
    size = models.BigIntegerField(default=0, verbose_name=_('حجم (بایت)'))
    signature_status = models.CharField(
        max_length=20, default='unknown', verbose_name=_('وضعیت امضا'),
        help_text=_('valid / invalid / unconfigured'),
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.UPLOADED,
        verbose_name=_('وضعیت'),
    )
    uploaded_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='uploaded_releases',
        verbose_name=_('آپلودکننده'),
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('تاریخ آپلود'))

    class Meta:
        verbose_name = _('بستهٔ به‌روزرسانی')
        verbose_name_plural = _('بسته‌های به‌روزرسانی')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.version} ({self.status})'


class UpdateUpload(models.Model):
    """Chunked upload session (survives connection drops)."""

    class Status(models.TextChoices):
        OPEN = 'open', _('در حال آپلود')
        COMPLETE = 'complete', _('کامل')
        ABORTED = 'aborted', _('لغو شده')

    upload_id = models.CharField(max_length=64, unique=True, verbose_name=_('شناسهٔ آپلود'))
    file_name = models.CharField(max_length=255, verbose_name=_('نام فایل'))
    total_size = models.BigIntegerField(default=0, verbose_name=_('حجم کل'))
    received_bytes = models.BigIntegerField(default=0, verbose_name=_('دریافت‌شده'))
    chunk_size = models.PositiveIntegerField(default=4 * 1024 * 1024, verbose_name=_('اندازهٔ تکه'))
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN, verbose_name=_('وضعیت'),
    )
    created_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='update_uploads',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('آپلود بسته')
        verbose_name_plural = _('آپلودهای بسته')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.file_name} ({self.received_bytes}/{self.total_size})'


class UpdateRun(models.Model):
    """One execution attempt of an update (progress + audit)."""

    class Status(models.TextChoices):
        RUNNING = 'running', _('در حال اجرا')
        SUCCESS = 'success', _('موفق')
        FAILED = 'failed', _('ناموفق')
        ROLLED_BACK = 'rolled_back', _('بازگشت داده شد')

    release = models.ForeignKey(
        AppRelease, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='runs', verbose_name=_('بسته'),
    )
    from_version = models.CharField(max_length=40, blank=True, verbose_name=_('از نسخه'))
    to_version = models.CharField(max_length=40, blank=True, verbose_name=_('به نسخه'))
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.RUNNING, verbose_name=_('وضعیت'),
    )
    steps = models.JSONField(default=list, blank=True, verbose_name=_('مراحل'))
    backup_path = models.CharField(max_length=500, blank=True, verbose_name=_('مسیر بکاپ'))
    error = models.TextField(blank=True, verbose_name=_('خطا'))
    started_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='update_runs', verbose_name=_('اجراکننده'),
    )
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = _('اجرای به‌روزرسانی')
        verbose_name_plural = _('اجراهای به‌روزرسانی')
        ordering = ['-started_at']

    def __str__(self):
        return f'{self.from_version} → {self.to_version} ({self.status})'


class SystemBroadcast(models.Model):
    """A platform-wide announcement (maintenance notice, update completed, ...)."""

    class Level(models.TextChoices):
        INFO = 'info', _('اطلاع')
        WARNING = 'warning', _('هشدار')
        MAINTENANCE = 'maintenance', _('تعمیرات')
        SUCCESS = 'success', _('موفقیت')

    class Action(models.TextChoices):
        NONE = 'none', _('بدون اقدام')
        LOGOUT = 'logout', _('خروج از سیستم')
        RELOAD = 'reload', _('بارگذاری مجدد')

    title = models.CharField(max_length=200, verbose_name=_('عنوان'))
    message = models.TextField(blank=True, verbose_name=_('متن'))
    level = models.CharField(
        max_length=20, choices=Level.choices, default=Level.INFO, verbose_name=_('سطح'),
    )
    action = models.CharField(
        max_length=20, choices=Action.choices, default=Action.NONE, verbose_name=_('اقدام لازم'),
    )
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))
    starts_at = models.DateTimeField(null=True, blank=True, verbose_name=_('شروع'))
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name=_('انقضا'))
    acknowledged_by = models.ManyToManyField(
        django_settings.AUTH_USER_MODEL, blank=True,
        related_name='acknowledged_broadcasts', verbose_name=_('تأییدکنندگان'),
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('تاریخ ایجاد'))

    class Meta:
        verbose_name = _('اعلان همگانی')
        verbose_name_plural = _('اعلان‌های همگانی')
        ordering = ['-created_at']

    def __str__(self):
        return self.title

