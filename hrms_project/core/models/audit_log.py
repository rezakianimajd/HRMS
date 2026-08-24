from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _


class AuditLog(models.Model):
    """
    Audit log model for tracking all operations in the system.
    This model is NOT connected to BaseModel (no is_active, no company FK for simplicity).
    """
    ACTION_CHOICES = [
        ('CREATE', _('ایجاد')),
        ('UPDATE', _('به‌روزرسانی')),
        ('DELETE', _('حذف')),
        ('LOGIN', _('ورود')),
        ('LOGOUT', _('خروج')),
        ('VIEW', _('مشاهده')),
        ('EXPORT', _('خروجی')),
        ('APPROVE', _('تأیید')),
        ('REJECT', _('رد')),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        verbose_name=_('کاربر'),
    )
    company = models.ForeignKey(
        'core.Company',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('شرکت'),
    )
    action = models.CharField(
        max_length=20,
        choices=ACTION_CHOICES,
        verbose_name=_('عملیات'),
    )
    model_name = models.CharField(
        max_length=100,
        verbose_name=_('نام مدل'),
        help_text=_('نام مدل مورد نظر (مثلاً Employee, Leave)'),
    )
    object_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_('شناسه شیء'),
        help_text=_('شناسه رکورد مورد نظر'),
    )
    changes = models.JSONField(
        blank=True,
        null=True,
        verbose_name=_('تغییرات'),
        help_text=_('داده‌های تغییر یافته (فرمت JSON)'),
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name=_('توضیحات'),
        help_text=_('توضیحات اضافی در مورد عملیات'),
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('زمان'),
    )
    ip_address = models.GenericIPAddressField(
        blank=True,
        null=True,
        verbose_name=_('آدرس IP'),
    )

    class Meta:
        verbose_name = _('لاگ عملیات')
        verbose_name_plural = _('لاگ‌های عملیات')
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['company', 'action']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['model_name', 'object_id']),
        ]

    def __str__(self):
        return f"{self.get_action_display()} - {self.model_name} ({self.object_id}) by {self.user}"