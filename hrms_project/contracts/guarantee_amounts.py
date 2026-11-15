"""محاسبهٔ مبلغ ریالی تضمین قرارداد (ارز قرارداد ↔ معادل ریالی نقدی).

این ماژول خالص و بدون دیتابیس است تا قواعد تبدیل در تست‌های DB-free پوشش
داده شود؛ سریالایزر و اکشن‌ها فقط از همین توابع استفاده می‌کنند.
"""
from __future__ import annotations

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

RIAL_MARKERS = ('ریال', 'ريال', 'IRR', 'RIAL')
RIAL_CODES = {'IRR', 'IRR ', 'IR', 'RIAL', 'RIALS'}


def _decimal(value) -> Decimal:
    if value in (None, ''):
        return Decimal('0')
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal('0')


def currency_is_rial(currency) -> bool:
    """آیا ارز همان ریال است؟ (شیء Currency، کد/نماد/نام متنی یا None)."""
    if currency in (None, ''):
        return True
    if isinstance(currency, str):
        text = currency
    else:
        text = ' '.join(str(part or '') for part in (
            getattr(currency, 'code', ''),
            getattr(currency, 'symbol', ''),
            getattr(currency, 'name', ''),
        ))
    cleaned = text.strip().upper()
    if cleaned in RIAL_CODES:
        return True
    return any(marker in text for marker in RIAL_MARKERS)


def round_rial(value) -> Decimal:
    return _decimal(value).quantize(Decimal('1'), rounding=ROUND_HALF_UP)


def guarantee_rial_amount(amount, exchange_rate=None, rial_amount=None, currency=None):
    """معادل ریالی تضمین.

    - اگر «معادل ریالی دریافتی» ثبت شده باشد همان مبلغ ملاک است (مثلاً نرخ روز تسویه).
    - ارز ریالی → خود مبلغ.
    - ارز خارجی → مبلغ × نرخ تسعیر؛ بدون نرخ معتبر → ``None`` (نامشخص).
    """
    explicit = _decimal(rial_amount)
    if explicit > 0:
        return round_rial(explicit)
    base = _decimal(amount)
    if currency_is_rial(currency):
        return round_rial(base)
    rate = _decimal(exchange_rate)
    if rate <= 0:
        return None
    return round_rial(base * rate)
