from django.db import models
from django.utils.translation import gettext_lazy as _


class BaseModel(models.Model):
    """
    Abstract base model for all tenant-specific models.
    Every record must belong to a company (tenant).
    """
    company = models.ForeignKey(
        'core.Company',
        on_delete=models.CASCADE,
        related_name='%(class)s_records',
        verbose_name=_('شرکت'),
        help_text=_('شرکت مربوطه'),
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('تاریخ ایجاد'),
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_('تاریخ به‌روزرسانی'),
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name=_('فعال'),
        help_text=_('وضعیت فعال بودن رکورد'),
    )

    class Meta:
        abstract = True
        ordering = ['-created_at']