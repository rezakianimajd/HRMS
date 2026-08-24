"""Models for the OrgChart module."""
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


class Position(BaseModel):
    """Organizational position / node in the org chart tree."""
    title = models.CharField(max_length=200, verbose_name=_('عنوان پوزیشن'))
    code = models.CharField(max_length=50, verbose_name=_('کد پوزیشن'))
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='children', verbose_name=_('پوزیشن بالادستی'),
    )
    level = models.PositiveIntegerField(default=1, verbose_name=_('سطح در درخت'))
    department = models.ForeignKey(
        'employees.Department', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='positions', verbose_name=_('دپارتمان'),
    )
    description = models.TextField(blank=True, null=True, verbose_name=_('توضیحات'))
    occupants = models.ManyToManyField(
        'employees.Employee',
        blank=True,
        related_name='positions',
        verbose_name=_('پرسنل مستقر در جایگاه'),
    )

    class Meta:
        verbose_name = _('پوزیشن سازمانی')
        verbose_name_plural = _('پوزیشن‌های سازمانی')
        unique_together = [('company', 'code')]
        ordering = ['level', 'title']

    def __str__(self):
        return f"{self.title} ({self.code})"