"""اسناد مغایرت بانکی (Statement Lines) برای تطبیق با گردش خزانه.

مسیر کار: ورود گردش بانک (دستی/Excel/CSV) → تطبیق خودکار یا دستی با تراکنش
خزانه → ثبت اختلاف/کارمزد/به‌عنوان ناشناس. حذف فیزیکی ندارد و هر تغییر
وضعیت در AuditLog ثبت می‌شود.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models.base_model import BaseModel


class TreasuryStatementLine(BaseModel):
    """یک ردیف گردش بانک که باید با تراکنش خزانه تطبیق شود."""

    class Direction(models.TextChoices):
        CREDIT = 'credit', _('واریز (بستانکار)')
        DEBIT = 'debit', _('برداشت (بدهکار)')

    class Status(models.TextChoices):
        UNMATCHED = 'unmatched', _('تطبیق‌نشده')
        MATCHED = 'matched', _('تطبیق‌شده')
        PARTIAL = 'partial', _('تطبیق جزئی')
        IGNORED = 'ignored', _('نادیده‌گرفته')
        ADJUSTED = 'adjusted', _('اصلاح‌شده (اختلاف/کارمزد)')

    class Source(models.TextChoices):
        MANUAL = 'manual', _('دستی')
        IMPORT = 'import', _('ورود فایل بانک')
        API = 'api', _('دریافت از بانک')

    entity = models.ForeignKey(
        'treasury.TreasuryEntity', on_delete=models.PROTECT,
        related_name='statement_lines', verbose_name=_('حساب/صندوق'),
    )
    date = models.DateField(verbose_name=_('تاریخ گردش'))
    direction = models.CharField(max_length=10, choices=Direction.choices,
                                 verbose_name=_('نوع گردش'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, verbose_name=_('مبلغ'))
    reference = models.CharField(max_length=100, blank=True, verbose_name=_('شماره پیگیری/مرجع'))
    description = models.CharField(max_length=250, blank=True, verbose_name=_('شرح بانک'))
    source = models.CharField(max_length=10, choices=Source.choices, default=Source.MANUAL,
                              verbose_name=_('منبع ردیف'))
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.UNMATCHED,
                              verbose_name=_('وضعیت تطبیق'))
    matched_transaction = models.ForeignKey(
        'treasury.TreasuryTransaction', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='statement_lines', verbose_name=_('تراکنش خزانه'),
    )
    matched_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان تطبیق'))
    note = models.TextField(blank=True, verbose_name=_('یادداشت اختلاف'))

    class Meta:
        verbose_name = _('ردیف گردش بانک')
        verbose_name_plural = _('ردیف‌های گردش بانک')
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['company', 'entity', 'date']),
        ]

    def __str__(self):
        return f'{self.date} — {self.amount} ({self.get_status_display()})'

    @property
    def is_open(self):
        return self.status in {self.Status.UNMATCHED, self.Status.PARTIAL}
