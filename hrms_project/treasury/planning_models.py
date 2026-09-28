"""فاز ۳ خزانه — مغایرت و برنامه‌ریزی نقدینگی.

پیش‌بینی جریان نقد به‌صورت محاسبه‌ای (بدون ذخیرهٔ تکراری) انجام می‌شود.
فقط «مغایرت خزانه» مدل دارد تا تراکنش‌های گردشی نهاد را با
موجودی اعلامی بانک/صندوق تطبیق دهد.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


class TreasuryReconciliation(BaseModel):
    """مغایرت خزانه — تطبیق ماندهٔ دفتری نهاد (از گردش) با موجودی اعلامی."""
    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        POSTED = 'posted', _('ثبت‌شده')
        CANCELLED = 'cancelled', _('لغو')

    entity = models.ForeignKey(
        'TreasuryEntity', on_delete=models.PROTECT, related_name='reconciliations',
        verbose_name=_('بانک/صندوق'),
    )
    as_of = models.DateField(verbose_name=_('تاریخ مغایرت‌گیری'))
    statement_balance = models.DecimalField(max_digits=18, decimal_places=2, verbose_name=_('موجودی اعلامی'))
    book_balance = models.DecimalField(max_digits=18, decimal_places=2, editable=False, verbose_name=_('مانده دفتری'))
    difference = models.DecimalField(max_digits=18, decimal_places=2, editable=False, verbose_name=_('اختلاف'))
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    note = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('مغایرت خزانه')
        verbose_name_plural = _('مغایرت‌های خزانه')
        ordering = ['-as_of', '-created_at']

    def __str__(self):
        return f'{self.entity_id} - {self.as_of}'

    def compute(self):
        self.book_balance = self.entity.balance if self.entity else 0
        self.difference = float(self.statement_balance) - float(self.book_balance)
        return self