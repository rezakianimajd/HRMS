"""اعتبارسنجی شماره شبا (IBAN ایرانی) و استخراج بانک از کد شبا.

ساختار شبا ایران: ``IR`` + ۲ رقم کنترل + ۳ رقم کد بانک + ۱۹ رقم حساب (۲۶ نویسه).
اعتبارسنجی با الگوریتم ISO 13616 (mod 97) انجام می‌شود.
"""
import re

SHEBA_LENGTH = 26
IRAN_PREFIX = 'IR'

# کدهای رسمی بانک‌ها (همان کدهای Seed کاتالوگ بانک)
BANK_CODES = {
    '010': 'بانک ملی ایران',
    '011': 'بانک صنعت و معدن',
    '012': 'بانک ملت',
    '013': 'بانک رفاه کارگران',
    '014': 'بانک مسکن',
    '015': 'بانک سپه',
    '016': 'بانک کشاورزی',
    '017': 'بانک ملی ایران (سابق)',
    '018': 'بانک تجارت',
    '019': 'بانک صادرات ایران',
    '020': 'بانک توسعه صادرات ایران',
    '021': 'بانک توسعه تعاون',
    '022': 'پست بانک ایران',
    '051': 'مؤسسه اعتباری توسعه',
    '053': 'بانک کارآفرین',
    '054': 'بانک پارسیان',
    '055': 'بانک اقتصاد نوین',
    '056': 'بانک سامان',
    '057': 'بانک پاسارگاد',
    '058': 'بانک سرمایه',
    '059': 'بانک سینا',
    '060': 'بانک قرض‌الحسنه مهر ایران',
    '061': 'بانک شهر',
    '062': 'بانک آینده',
    '063': 'بانک قوامین',
    '064': 'بانک گردشگری',
    '065': 'بانک حکمت ایرانیان',
    '066': 'بانک دی',
    '069': 'بانک ایران زمین',
    '070': 'بانک قرض‌الحسنه رسالت',
    '078': 'بانک خاورمیانه',
    '095': 'بانک مشترک ایران-ونزوئلا',
}

_LETTERS = {chr(65 + index): str(10 + index) for index in range(26)}


def normalize(value):
    """حذف فاصله/خط تیره و بزرگ‌کردن حروف."""
    return re.sub(r'[\s-]', '', str(value or '')).upper()


def is_valid(value):
    """اعتبارسنجی mod 97 (بدون نیاز به دیتابیس)."""
    text = normalize(value)
    if len(text) != SHEBA_LENGTH or not text.startswith(IRAN_PREFIX):
        return False
    if not text[2:].isdigit():
        return False
    rotated = text[4:] + text[:4]
    digits = ''.join(_LETTERS.get(char, char) for char in rotated)
    try:
        return int(digits) % 97 == 1
    except ValueError:
        return False


def bank_code(value):
    """کد سه‌رقمی بانک از شبا."""
    text = normalize(value)
    return text[4:7] if len(text) >= 7 else ''


def bank_name(value, catalog=None):
    """نام بانک از شبا؛ در صورت وجود کاتالوگ شرکت اولویت دارد."""
    code = bank_code(value)
    if catalog:
        for row in catalog:
            if str(row.get('code') or '').zfill(3) == code:
                return row.get('name', '')
    return BANK_CODES.get(code, '')


def format_pretty(value):
    """نمایش گروه‌بندی‌شده: IR00 0000 0000 0000 0000 0000 00"""
    text = normalize(value)
    return ' '.join(text[index:index + 4] for index in range(0, len(text), 4))


def format_currency(amount):
    """مبلغ با جداکنندهٔ هزارگان (برای متن چاپ)."""
    try:
        return f'{int(amount):,}'
    except (TypeError, ValueError):
        return '0'
