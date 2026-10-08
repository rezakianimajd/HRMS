from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


class MappingSource(BaseModel):
    """برنامهٔ حسابداری مبدا که داده از آن ایمپورت می‌شود (سپیدار، هلو، نوین، ...)."""
    name = models.CharField(max_length=150, verbose_name=_('نام برنامه مبدا'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('منبع داده')
        verbose_name_plural = _('منابع داده')
        unique_together = [('company', 'name')]
        ordering = ['name']

    def __str__(self):
        return self.name


class MappingEntry(BaseModel):
    """یک ردیف نگاشت: نگاشتِ کد/عنوان مبدا به یک کدینگ حسابداری هدف."""

    class Level(models.TextChoices):
        GROUP = 'group', _('گروه حساب')
        GENERAL = 'general', _('حساب کل')
        SUBSIDIARY = 'subsidiary', _('حساب معین')
        AUXILIARY = 'auxiliary', _('حساب تفصیلی')

    class Status(models.TextChoices):
        PENDING = 'pending', _('در انتظار')
        MATCHED = 'matched', _('نگاشت‌شده')
        NEW = 'new', _('ایجاد جدید')
        IGNORED = 'ignored', _('نادیده گرفته')

    source = models.ForeignKey(
        MappingSource, on_delete=models.CASCADE, null=True, blank=True,
        related_name='entries', verbose_name=_('منبع'),
    )
    level = models.CharField(max_length=20, choices=Level.choices, verbose_name=_('سطح کدینگ'))
    source_code = models.CharField(max_length=50, blank=True, verbose_name=_('کد مبدا'))
    source_name = models.CharField(max_length=250, blank=True, verbose_name=_('عنوان مبدا'))

    target_group = models.ForeignKey(
        'accounting.AccountGroup', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('گروه هدف'),
    )
    target_account = models.ForeignKey(
        'accounting.Account', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('حساب هدف'),
    )
    target_auxiliary = models.ForeignKey(
        'accounting.AuxiliaryAccount', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('تفصیلی هدف'),
    )

    match_score = models.FloatField(default=0, verbose_name=_('امتیاز شباهت'))
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, verbose_name=_('وضعیت'))
    resolved = models.BooleanField(default=False, verbose_name=_('انجام شده'))

    class Meta:
        verbose_name = _('نگاشت کد')
        verbose_name_plural = _('نگاشت کدها')
        unique_together = [('company', 'source', 'level', 'source_code')]
        ordering = ['level', 'source_code']

    def __str__(self):
        return f'{self.get_level_display()}: {self.source_code}'

    @property
    def target_name(self):
        if self.target_group:
            return self.target_group.name
        if self.target_account:
            return self.target_account.name
        if self.target_auxiliary:
            return self.target_auxiliary.name
        return ''

    @property
    def target_code(self):
        if self.target_group:
            return self.target_group.code
        if self.target_account:
            return self.target_account.code
        if self.target_auxiliary:
            return self.target_auxiliary.code
        return ''
