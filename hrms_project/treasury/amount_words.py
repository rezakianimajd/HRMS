"""تبدیل مبلغ ریالی/ارزی به حروف فارسی (بدون وابستگی خارجی).

نمونه‌ها::

    >>> amount_in_words(1250000000)
    'یک میلیارد و دویست و پنجاه میلیون ریال'
    >>> amount_in_words(1050, unit='دلار')
    'یک هزار و پنجاه دلار'
    >>> amount_in_words('1234.50')
    'یک هزار و دویست و سی و چهار ریال و پنجاه دینار'
"""
from decimal import Decimal, InvalidOperation

ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه']
TEENS = {
    10: 'ده', 11: 'یازده', 12: 'دوازده', 13: 'سیزده', 14: 'چهارده',
    15: 'پانزده', 16: 'شانزده', 17: 'هفده', 18: 'هجده', 19: 'نوزده',
}
TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود']
HUNDREDS = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد',
            'هشتصد', 'نهصد']
SCALES = ['', ' هزار', ' میلیون', ' میلیارد', ' هزار میلیارد', ' میلیون میلیارد']

DEFAULT_UNIT = 'ریال'
DEFAULT_FRACTION_UNIT = 'دینار'


def _three_digit_words(value):
    """تبدیل عدد ۱ تا ۹۹۹ به حروف."""
    value = int(value)
    if value <= 0:
        return ''
    parts = []
    hundreds, rest = divmod(value, 100)
    if hundreds:
        parts.append(HUNDREDS[hundreds])
    if 10 <= rest <= 19:
        parts.append(TEENS[rest])
        rest = 0
    else:
        tens, ones = divmod(rest, 10)
        if tens:
            parts.append(TENS[tens])
        if ones:
            parts.append(ONES[ones])
    return ' و '.join(part for part in parts if part)


def integer_to_words(value):
    """عدد صحیح نامنفی → حروف فارسی (بدون واحد)."""
    value = int(value)
    if value == 0:
        return 'صفر'
    groups = []
    scale = 0
    while value > 0 and scale < len(SCALES):
        value, chunk = divmod(value, 1000)
        if chunk:
            words = _three_digit_words(chunk)
            groups.append(f'{words}{SCALES[scale]}'.strip())
        scale += 1
    return ' و '.join(reversed(groups))


def _as_decimal(value):
    if value in (None, ''):
        return Decimal('0')
    try:
        return Decimal(str(value).replace(',', '').replace('٫', '.')).quantize(Decimal('0.01'))
    except (InvalidOperation, ValueError):
        return Decimal('0')


def amount_in_words(value, unit=DEFAULT_UNIT, fraction_unit=DEFAULT_FRACTION_UNIT,
                    negative_prefix='منفی '):
    """مبلغ عددی → «... ریال» (بخش اعشار با واحد خرد).

    ``unit`` برای ارز قابل تغییر است (دلار، یورو، درهم …) و برای ارزهای بدون
    خرد می‌توان ``fraction_unit=None`` داد.
    """
    amount = _as_decimal(value)
    negative = amount < 0
    amount = abs(amount)
    whole = int(amount)
    fraction = int((amount - whole) * 100)

    text = f'{integer_to_words(whole)} {unit}'.strip()
    if fraction and fraction_unit:
        text = f'{text} و {integer_to_words(fraction)} {fraction_unit}'
    return f'{negative_prefix}{text}' if negative else text
