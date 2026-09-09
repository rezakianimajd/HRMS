"""Application model — a tenant-level "product" on top of the core platform."""
from django.db import models
from django.utils.translation import gettext_lazy as _


class Application(models.Model):
    """A swappable product/workspace (HRMS, Contracts, Payroll, Inventory...).

    Lives in the public schema because access to apps is a platform-level
    concept, not a tenant-local concept; but access is gated per user via
    UserProfile.applications.
    """

    slug = models.SlugField(max_length=60, unique=True, verbose_name=_('شناسه'))
    title = models.CharField(max_length=120, verbose_name=_('عنوان'))
    description = models.TextField(blank=True, verbose_name=_('توضیح'))
    icon = models.CharField(max_length=80, blank=True, verbose_name=_('آیکون'))
    color = models.CharField(max_length=20, blank=True, default='#6366f1', verbose_name=_('رنگ'))
    order = models.PositiveIntegerField(default=0, verbose_name=_('ترتیب'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('سامانه')
        verbose_name_plural = _('سامانه‌ها')
        ordering = ['order', 'title']

    def __str__(self):
        return self.title