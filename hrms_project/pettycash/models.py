"""Models for the Petty Cash (تنخواه) module."""
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


class PettyCashCategory(BaseModel):
    """دسته‌بندی هزینه/دریافت تنخواه (سفر، خرید، پذیرایی و ...)."""
    name = models.CharField(max_length=200, verbose_name=_('عنوان دسته‌بندی'))
    code = models.CharField(max_length=50, verbose_name=_('کد'))

    class Meta:
        verbose_name = _('دسته‌بندی تنخواه')
        verbose_name_plural = _('دسته‌بندی‌های تنخواه')
        unique_together = [('company', 'code')]
        ordering = ['name']

    def __str__(self):
        return self.name


class PettyCashFund(BaseModel):
    """صندوق/تنخواه اختصاص‌یافته به یک تنخواه‌دار."""

    class Status(models.TextChoices):
        ACTIVE = 'active', _('فعال')
        ARCHIVED = 'archived', _('بایگانی‌شده')
        SUSPENDED = 'suspended', _('معلق')

    code = models.CharField(max_length=50, verbose_name=_('کد تنخواه'))
    title = models.CharField(max_length=200, verbose_name=_('عنوان تنخواه'))
    custodian = models.ForeignKey(
        'employees.Employee',
        on_delete=models.PROTECT,
        related_name='petty_cash_funds',
        verbose_name=_('تنخواه‌دار'),
    )
    opening_balance = models.DecimalField(
        max_digits=18, decimal_places=0, default=0,
        verbose_name=_('اعتبار اولیه (ریال)'),
    )
    limit = models.DecimalField(
        max_digits=18, decimal_places=0, null=True, blank=True,
        verbose_name=_('سقف تنخواه (ریال)'),
        help_text=_('حداکثر ماندهٔ تنخواه'),
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE,
        verbose_name=_('وضعیت'),
    )
    archived_at = models.DateTimeField(null=True, blank=True, verbose_name=_('تاریخ بایگانی'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('تنخواه')
        verbose_name_plural = _('تنخواه‌ها')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'custodian']),
            models.Index(fields=['company', 'status']),
        ]

    def __str__(self):
        return f'{self.code} - {self.title}'

    @property
    def balance(self):
        """ماندهٔ فعلی = اعتبار اولیه + دریافت‌ها − هزینه‌ها."""
        from django.db.models import Sum
        credits = self.transactions.filter(entry_type='credit').aggregate(s=Sum('amount'))['s'] or 0
        debits = self.transactions.filter(entry_type='debit').aggregate(s=Sum('amount'))['s'] or 0
        return self.opening_balance + credits - debits


class PettyCashTransaction(BaseModel):
    """تراکنش تنخواه (دریافت/شارژ یا هزینه/پرداخت)."""

    class EntryType(models.TextChoices):
        CREDIT = 'credit', _('دریافت / شارژ')
        DEBIT = 'debit', _('هزینه / پرداخت')

    fund = models.ForeignKey(
        PettyCashFund,
        on_delete=models.CASCADE,
        related_name='transactions',
        verbose_name=_('تنخواه'),
    )
    entry_type = models.CharField(
        max_length=10, choices=EntryType.choices,
        verbose_name=_('نوع تراکنش'),
    )
    category = models.ForeignKey(
        PettyCashCategory,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='transactions',
        verbose_name=_('دسته‌بندی'),
    )
    amount = models.DecimalField(max_digits=18, decimal_places=0, verbose_name=_('مبلغ (ریال)'))
    title = models.CharField(max_length=200, verbose_name=_('عنوان'))
    date = models.DateField(verbose_name=_('تاریخ'))
    receipt = models.FileField(upload_to='petty_cash/receipts/', blank=True, null=True, verbose_name=_('تصویر رسید'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))
    is_archived = models.BooleanField(default=False, verbose_name=_('بایگانی‌شده'))
    archived_at = models.DateTimeField(null=True, blank=True, verbose_name=_('تاریخ بایگانی'))

    class Meta:
        verbose_name = _('تراکنش تنخواه')
        verbose_name_plural = _('تراکنش‌های تنخواه')
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['company', 'fund']),
            models.Index(fields=['company', 'entry_type']),
        ]

    def __str__(self):
        return f'{self.get_entry_type_display()} - {self.amount} ({self.date})'