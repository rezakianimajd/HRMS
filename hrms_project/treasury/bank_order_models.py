"""دستور پرداخت الکترونیکی بین‌بانکی (پایا/ساتنا) — طبق فرم‌های بانکی ایران.

این سند، «برگهٔ دستور پرداخت» است که خزانه‌دار برای بانک صادر می‌کند
(شبا مبدأ/مقصد، شناسه ملی، شماره مشتری، از محل چک …). اعتبارسنجی شبا با
الگوریتم mod 97 انجام می‌شود و بانک مقصد از کد شبا شناسایی می‌گردد.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models.base_model import BaseModel
from treasury import iban as iban_utils


class BankPaymentOrder(BaseModel):
    """برگهٔ دستور پرداخت الکترونیکی بین‌بانکی (پایا/ساتنا)."""

    class TransferType(models.TextChoices):
        SATNA = 'satna', _('ساتنا (فوری)')
        PAYA = 'paya', _('پایا (دسته‌ای)')

    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        REGISTERED = 'registered', _('ثبت‌شده')
        PRINTED = 'printed', _('چاپ‌شده/تحویل بانک')
        CANCELLED = 'cancelled', _('لغو')

    number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره سریال'))
    transfer_type = models.CharField(max_length=10, choices=TransferType.choices,
                                     default=TransferType.SATNA, verbose_name=_('نوع انتقال'))
    date = models.DateField(verbose_name=_('تاریخ دستور'))
    company_national_id = models.CharField(max_length=20, blank=True,
                                           verbose_name=_('شناسه/کد ملی شرکت'))
    customer_number = models.CharField(max_length=40, blank=True,
                                       verbose_name=_('شماره مشتری بانک'))
    source_entity = models.ForeignKey(
        'treasury.TreasuryEntity', on_delete=models.PROTECT, related_name='bank_orders_out',
        verbose_name=_('سپردهٔ مبدأ (حساب شرکت)'),
    )
    source_account_number = models.CharField(max_length=50, blank=True,
                                             verbose_name=_('شماره سپردهٔ مبدأ'))
    source_iban = models.CharField(max_length=26, blank=True, verbose_name=_('شبا مبدأ'))
    destination_owner_name = models.CharField(max_length=200, verbose_name=_('نام صاحب سپردهٔ مقصد'))
    destination_account_number = models.CharField(max_length=50, blank=True,
                                                  verbose_name=_('شماره سپردهٔ مقصد'))
    destination_iban = models.CharField(max_length=26, verbose_name=_('شبا مقصد'))
    destination_bank_code = models.CharField(max_length=5, blank=True,
                                             verbose_name=_('کد بانک مقصد'))
    destination_bank_name = models.CharField(max_length=150, blank=True,
                                             verbose_name=_('نام بانک مقصد'))
    commercial_customer = models.CharField(max_length=150, blank=True,
                                           verbose_name=_('مشخصات مشتری تجاری'))
    cheque_number = models.CharField(max_length=50, blank=True,
                                     verbose_name=_('از محل چک شماره'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, verbose_name=_('مبلغ'))
    note = models.CharField(max_length=250, blank=True, default='انتقال وجه',
                            verbose_name=_('شرح انتقال'))
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.DRAFT,
                              verbose_name=_('وضعیت'))
    payment_order = models.ForeignKey(
        'treasury.PaymentOrder', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='bank_orders', verbose_name=_('دستور پرداخت مرتبط'),
    )
    accounting_document = models.ForeignKey(
        'accounting.AccountingDocument', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='treasury_bank_orders', verbose_name=_('سند حسابداری'),
    )
    history = models.JSONField(default=list, blank=True, verbose_name=_('تاریخچهٔ چرخه'))

    class Meta:
        verbose_name = _('دستور پرداخت بین‌بانکی')
        verbose_name_plural = _('دستورهای پرداخت بین‌بانکی')
        ordering = ['-date', '-created_at']
        indexes = [models.Index(fields=['company', 'status'])]

    def __str__(self):
        return f'{self.number or self.pk} — {self.destination_owner_name}'

    def clean(self):
        from django.core.exceptions import ValidationError

        errors = {}
        source = iban_utils.normalize(self.source_iban)
        destination = iban_utils.normalize(self.destination_iban)
        if source and not iban_utils.is_valid(source):
            errors['source_iban'] = _('شماره شبای مبدأ معتبر نیست.')
        if not iban_utils.is_valid(destination):
            errors['destination_iban'] = _('شماره شبای مقصد الزامی و باید معتبر باشد.')
        if source and destination and source == destination:
            errors['destination_iban'] = _('شبا مبدأ و مقصد نباید یکی باشد.')
        if not self.amount or self.amount <= 0:
            errors['amount'] = _('مبلغ باید بزرگ‌تر از صفر باشد.')
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.source_iban = iban_utils.normalize(self.source_iban)
        self.destination_iban = iban_utils.normalize(self.destination_iban)
        if self.destination_iban:
            self.destination_bank_code = iban_utils.bank_code(self.destination_iban)
            if not self.destination_bank_name:
                self.destination_bank_name = iban_utils.bank_name(self.destination_iban)
        return super().save(*args, **kwargs)

    @property
    def amount_in_words(self):
        from treasury.amount_words import amount_in_words

        return amount_in_words(self.amount)

    @property
    def destination_iban_pretty(self):
        return iban_utils.format_pretty(self.destination_iban)

    @property
    def source_iban_pretty(self):
        return iban_utils.format_pretty(self.source_iban)

