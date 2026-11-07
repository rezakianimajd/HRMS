"""تنظیمات و قواعد تأیید پرداخت خزانه (تفکیک وظایف §۳۲ و سطوح تأیید §۱۰).

- ``TreasurySettings``: تنظیمات سازمانی (اجبار تفکیک وظایف، سقف‌ها، پیش‌فرض‌ها).
- ``TreasuryApprovalRule``: قاعدهٔ سطح تأیید بر اساس مبلغ (مثلاً بالای ۱ میلیارد
  فقط «مدیر مالی» بتواند تأیید کند).
"""
from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models.base_model import BaseModel


class TreasurySettings(BaseModel):
    """تنظیمات سازمانی خزانه (یک ردیف برای هر شرکت)."""

    enforce_segregation = models.BooleanField(
        default=True, verbose_name=_('تفکیک وظایف الزامی است'),
        help_text=_('ثبت‌کنندهٔ درخواست نباید خودش آن را تأیید کند.'),
    )
    require_approval = models.BooleanField(
        default=True, verbose_name=_('تأیید پرداخت الزامی است'),
    )
    duplicate_reference_days = models.PositiveSmallIntegerField(
        default=30, verbose_name=_('بازهٔ بررسی شماره پیگیری تکراری (روز)'),
    )
    default_payment_limit = models.DecimalField(
        max_digits=18, decimal_places=2, null=True, blank=True,
        verbose_name=_('سقف پیش‌فرض هر پرداخت'),
    )

    class Meta:
        verbose_name = _('تنظیمات خزانه')
        verbose_name_plural = _('تنظیمات خزانه')
        unique_together = [('company',)]

    def __str__(self):
        return f'تنظیمات خزانه ({self.company_id})'


class TreasuryApprovalRule(BaseModel):
    """قاعدهٔ سطح تأیید بر اساس بازهٔ مبلغ."""

    name = models.CharField(max_length=150, verbose_name=_('عنوان قاعده'))
    min_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0,
                                     verbose_name=_('از مبلغ'))
    max_amount = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True,
                                     verbose_name=_('تا مبلغ (خالی = بی‌سقف)'))
    required_permission = models.CharField(
        max_length=60, default='treasury_approve', verbose_name=_('مجوز لازم برای تأیید'),
        help_text=_('مثال: treasury_approve یا treasury_manage_config'),
    )
    notes = models.CharField(max_length=250, blank=True, verbose_name=_('یادداشت'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('قاعدهٔ تأیید پرداخت')
        verbose_name_plural = _('قواعد تأیید پرداخت')
        ordering = ['min_amount', 'name']

    def __str__(self):
        return f'{self.name} ({self.min_amount}+)'

    def covers(self, amount):
        from decimal import Decimal

        value = Decimal(str(amount or 0))
        if value < (self.min_amount or 0):
            return False
        if self.max_amount is not None and value > self.max_amount:
            return False
        return True


def get_settings(company):
    """تنظیمات خزانهٔ شرکت (ساخت نمونهٔ پیش‌فرض بدون ذخیره در نبود ردیف)."""
    settings = TreasurySettings.objects.filter(company=company).first() if company else None
    return settings or TreasurySettings()


def resolve_required_permission(company, amount):
    """مجوز لازم برای تأیید مبلغ: دقیق‌ترین قاعدهٔ فعال یا پیش‌فرض."""
    if not company:
        return 'treasury_approve'
    rules = TreasuryApprovalRule.objects.filter(company=company, is_active=True)
    matched = [rule for rule in rules if rule.covers(amount)]
    if not matched:
        return 'treasury_approve'
    matched.sort(key=lambda rule: (rule.min_amount or 0), reverse=True)
    return matched[0].required_permission
