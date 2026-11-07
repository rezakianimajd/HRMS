"""Master Data خزانه: بانک، شعبه و پایانهٔ کارت‌خوان.

قاعدهٔ معماری (§45 سند توسعه): نهاد پولی/حساب بانکی شرکت در ``TreasuryEntity``
نگهداری می‌شود (یک منبع یکتا برای موجودی). این ماژول فقط «کاتالوگ بانک‌ها»
(قابل مدیریت توسط مدیر سیستم) و «پایانه‌ها» را اضافه می‌کند و به همان نهاد
وصل می‌شود؛ هیچ موجودی یا گردشی تکرار نمی‌شود.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models.base_model import BaseModel


class Bank(BaseModel):
    """بانک (کاتالوگ مرجع، مستقل از کد ثابت در بک‌اند)."""

    name = models.CharField(max_length=150, verbose_name=_('نام بانک'))
    name_en = models.CharField(max_length=150, blank=True, verbose_name=_('نام انگلیسی'))
    code = models.CharField(max_length=20, blank=True, verbose_name=_('کد بانک'),
                            help_text=_('کد رسمی بانک مرکزی (در صورت وجود)'))
    swift_code = models.CharField(max_length=20, blank=True, verbose_name=_('کد SWIFT'))
    sort_order = models.PositiveIntegerField(default=0, verbose_name=_('ترتیب نمایش'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))
    note = models.CharField(max_length=250, blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('بانک')
        verbose_name_plural = _('بانک‌ها')
        ordering = ['sort_order', 'name']
        indexes = [models.Index(fields=['company', 'is_active'])]

    def __str__(self):
        return self.name


class BankBranch(BaseModel):
    """شعبهٔ بانک (آدرس/تلفن شعبه برای فیش و چاپ)."""

    bank = models.ForeignKey(Bank, on_delete=models.CASCADE, related_name='branches',
                             verbose_name=_('بانک'))
    code = models.CharField(max_length=20, blank=True, verbose_name=_('کد شعبه'))
    name = models.CharField(max_length=150, verbose_name=_('نام شعبه'))
    city = models.CharField(max_length=80, blank=True, verbose_name=_('شهر'))
    province = models.CharField(max_length=80, blank=True, verbose_name=_('استان'))
    address = models.CharField(max_length=300, blank=True, verbose_name=_('آدرس'))
    phone = models.CharField(max_length=40, blank=True, verbose_name=_('تلفن'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('شعبهٔ بانک')
        verbose_name_plural = _('شعبه‌های بانک')
        ordering = ['bank__name', 'name']
        unique_together = [('company', 'bank', 'code', 'name')]

    def __str__(self):
        return f'{self.bank.name} - {self.name}'


class POSTerminal(BaseModel):
    """پایانهٔ کارت‌خوان و اتصال آن به حساب بانکی شرکت."""

    bank = models.ForeignKey(Bank, on_delete=models.SET_NULL, null=True, blank=True,
                             related_name='terminals', verbose_name=_('بانک'))
    provider = models.CharField(max_length=100, blank=True, verbose_name=_('شرکت ارائه‌دهنده'))
    terminal_number = models.CharField(max_length=40, verbose_name=_('شماره پایانه'))
    merchant_number = models.CharField(max_length=40, blank=True, verbose_name=_('شماره پذیرنده'))
    serial_number = models.CharField(max_length=60, blank=True, verbose_name=_('شماره سریال دستگاه'))
    entity = models.ForeignKey(
        'treasury.TreasuryEntity', on_delete=models.PROTECT, null=True, blank=True,
        related_name='terminals', verbose_name=_('حساب بانکی مقصد'),
    )
    branch_name = models.CharField(max_length=150, blank=True, verbose_name=_('شعبه'))
    project = models.ForeignKey('projects.Project', on_delete=models.SET_NULL, null=True,
                                blank=True, related_name='treasury_terminals',
                                verbose_name=_('پروژه'))
    cost_center = models.ForeignKey('accounting.CostCenter', on_delete=models.SET_NULL,
                                    null=True, blank=True, related_name='treasury_terminals',
                                    verbose_name=_('مرکز هزینه'))
    activated_on = models.DateField(null=True, blank=True, verbose_name=_('تاریخ فعال‌سازی'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))
    note = models.CharField(max_length=250, blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('پایانهٔ کارت‌خوان')
        verbose_name_plural = _('پایانه‌های کارت‌خوان')
        ordering = ['bank__name', 'terminal_number']
        unique_together = [('company', 'terminal_number')]

    def __str__(self):
        return f'{self.terminal_number} - {self.bank.name if self.bank else "—"}'
