"""شماره‌گذاری اسناد خزانه (قابل تنظیم، سال شمسی، بدون شمارهٔ تکراری).

قالب پیش‌فرض::

    RC-1405-000001   فیش دریافت
    PY-1405-000001   فیش پرداخت
    TR-1405-000001   انتقال
    PR-1405-000001   درخواست پرداخت
    PO-1405-000001   دستور پرداخت

پیشوند، جداکننده، تعداد رقم و درج سال از ``TreasuryNumberingSetting`` هر شرکت
خوانده می‌شود؛ شمارهٔ صادرشده تا زمان ابطال سند یکتا و پایدار است.
"""
from django.db import models, transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.models.base_model import BaseModel

try:  # سال شمسی؛ در محیط تست بدون jdatetime هم کار می‌کند
    from jdatetime import date as _jdate
except Exception:  # noqa: BLE001
    _jdate = None

DOC_KINDS = {
    'receipt': 'فیش دریافت',
    'payment': 'فیش پرداخت',
    'transfer': 'انتقال وجه',
    'request': 'درخواست پرداخت',
    'order': 'دستور پرداخت',
    'bank_order': 'دستور پرداخت بین‌بانکی',
}

DEFAULT_PREFIXES = {
    'receipt': 'RC',
    'payment': 'PY',
    'transfer': 'TR',
    'request': 'PR',
    'order': 'PO',
    'bank_order': 'BO',
}


def jalali_year(value=None):
    """سال شمسی یک تاریخ (پیش‌فرض: امروز)."""
    value = value or timezone.localdate()
    if _jdate is None:
        return getattr(value, 'year', None)
    try:
        return _jdate.fromgregorian(date=value).year
    except Exception:  # noqa: BLE001
        return getattr(value, 'year', None)


def render_number(prefix, seq, year=None, padding=6, separator='-', include_year=True):
    """ساخت شماره از اجزا (تابع خالص، قابل تست بدون دیتابیس)."""
    digits = max(1, min(int(padding or 6), 12))
    sequence = str(max(0, int(seq or 0))).zfill(digits)
    parts = [str(prefix or '').strip()]
    if include_year and year:
        parts.append(str(int(year)))
    parts.append(sequence)
    sep = separator if separator is not None else '-'
    return sep.join(part for part in parts if part)


def number_stem(prefix, year=None, separator='-', include_year=True):
    """پیشوند ثابت شماره (برای یافتن آخرین شمارهٔ همان سال)."""
    sep = separator if separator is not None else '-'
    if include_year and year:
        return f'{prefix}{sep}{year}{sep}'
    return f'{prefix}{sep}'


class TreasuryNumberingSetting(BaseModel):
    """تنظیمات شماره‌گذاری اسناد خزانه برای هر شرکت (یک ردیف)."""

    receipt_prefix = models.CharField(max_length=12, default='RC', verbose_name=_('پیشوند فیش دریافت'))
    payment_prefix = models.CharField(max_length=12, default='PY', verbose_name=_('پیشوند فیش پرداخت'))
    transfer_prefix = models.CharField(max_length=12, default='TR', verbose_name=_('پیشوند انتقال'))
    request_prefix = models.CharField(max_length=12, default='PR', verbose_name=_('پیشوند درخواست پرداخت'))
    order_prefix = models.CharField(max_length=12, default='PO', verbose_name=_('پیشوند دستور پرداخت'))
    bank_order_prefix = models.CharField(max_length=12, default='BO', verbose_name=_('پیشوند دستور بین‌بانکی'))
    padding = models.PositiveSmallIntegerField(default=6, verbose_name=_('تعداد رقم شماره'))
    separator = models.CharField(max_length=3, default='-', verbose_name=_('جداکننده'))
    include_year = models.BooleanField(default=True, verbose_name=_('درج سال شمسی در شماره'))
    reset_yearly = models.BooleanField(default=True, verbose_name=_('شمارش سالانه از یک شروع شود'))

    class Meta:
        verbose_name = _('تنظیمات شماره‌گذاری خزانه')
        verbose_name_plural = _('تنظیمات شماره‌گذاری خزانه')
        unique_together = [('company',)]

    def __str__(self):
        return f'شماره‌گذاری خزانه ({self.company_id})'

    def prefix_for(self, kind):
        return getattr(self, f'{kind}_prefix', '') or DEFAULT_PREFIXES.get(kind, 'DOC')

    @property
    def summary(self):
        return {
            'padding': self.padding,
            'separator': self.separator,
            'include_year': self.include_year,
            'reset_yearly': self.reset_yearly,
            'prefixes': {kind: self.prefix_for(kind) for kind in DOC_KINDS},
        }


def get_setting(company):
    """تنظیمات شرکت؛ در نبود ردیف، یک نمونهٔ پیش‌فرض (بدون ذخیره) می‌دهد."""
    setting = TreasuryNumberingSetting.objects.filter(company=company).first() if company else None
    return setting or TreasuryNumberingSetting()


def _trailing_digits(value):
    digits = ''.join(char for char in reversed(str(value or '')) if char.isdigit())
    return digits[::-1]


def last_sequence(model, field, company, stem):
    """بیشترین شمارهٔ ثبت‌شده با همان پیشوند → عدد (۰ اگر نبود)."""
    last = (
        model.objects.filter(company=company, **{f'{field}__startswith': stem})
        .order_by(f'-{field}').values_list(field, flat=True).first()
    )
    try:
        return int(_trailing_digits(last) or 0)
    except ValueError:
        return 0


def allocate_number(kind, company, date=None, model=None, field='number'):
    """شمارهٔ بعدی سند؛ شمارنده با قفل ردیف تنظیمات سریال می‌شود.

    شماره از «بیشترین شمارهٔ موجود با همان پیشوند/سال» مشتق می‌شود تا شماره
    تکراری صادر نشود (حتی اگر شماره دستی در سامانه ثبت شده باشد).
    """
    if model is None:
        raise ValueError('مدل سند برای شماره‌گذاری مشخص نیست.')
    day = date or timezone.localdate()
    year = jalali_year(day)

    with transaction.atomic():
        setting = (
            TreasuryNumberingSetting.objects.select_for_update()
            .filter(company=company).first()
        ) or TreasuryNumberingSetting()
        prefix = setting.prefix_for(kind)
        stem = number_stem(
            prefix, year=year, separator=setting.separator,
            include_year=setting.include_year,
        )
        seq = last_sequence(model, field, company, stem) + 1
        return render_number(
            prefix, seq, year=year, padding=setting.padding,
            separator=setting.separator, include_year=setting.include_year,
        )


def preview_numbers(company, date=None):
    """پیش‌نمایش شمارهٔ بعدی هر نوع سند (برای صفحهٔ تنظیمات)."""
    setting = get_setting(company)
    year = jalali_year(date or timezone.localdate())
    return {
        kind: render_number(
            setting.prefix_for(kind), 1, year=year, padding=setting.padding,
            separator=setting.separator, include_year=setting.include_year,
        )
        for kind in DOC_KINDS
    }

