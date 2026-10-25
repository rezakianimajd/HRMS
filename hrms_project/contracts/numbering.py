"""ابزارهای استانداردسازی و نمایش شمارهٔ صورت‌وضعیت."""
from __future__ import annotations

_DIGIT_MAP = str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789')
_PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'


def to_ascii_digits(value) -> str:
    """ارقام فارسی/عربی را به لاتین تبدیل می‌کند."""
    if value is None:
        return ''
    return str(value).translate(_DIGIT_MAP)


def to_persian_digits(value) -> str:
    """همهٔ ارقام لاتین متن را به فارسی تبدیل می‌کند."""
    if value is None:
        return ''
    return ''.join(
        _PERSIAN_DIGITS[int(char)] if char.isdigit() and char in '0123456789' else char
        for char in str(value)
    )


def normalize_statement_number(value) -> str:
    """شمارهٔ عددی را حداقل دو رقمی می‌کند؛ متن‌های غیرعددی حفظ می‌شوند."""
    text = to_ascii_digits(value).strip()
    if not text:
        return ''
    if text.isdigit():
        digits = text.lstrip('0') or '0'
        return digits.zfill(2)
    return text


def display_statement_number(value) -> str:
    """شمارهٔ استاندارد با ارقام فارسی برای نمایش/خروجی."""
    normalized = normalize_statement_number(value)
    return to_persian_digits(normalized) if normalized else ''


_KIND_LABELS = {
    'statement': 'صورت‌وضعیت',
    'increase': 'تعدیل افزایشی',
    'decrease': 'تعدیل کاهشی',
}


def statement_kind_label(value) -> str:
    return _KIND_LABELS.get(getattr(value, 'kind', value) or 'statement', 'صورت‌وضعیت')


def display_statement_title(value) -> str:
    """عنوان یکپارچهٔ سند، شامل نوع و شمارهٔ فارسی."""
    label = statement_kind_label(value)
    number = display_statement_number(getattr(value, 'number', value))
    return f'{label} {number}'.strip() if number else label
