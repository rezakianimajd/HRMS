"""یکسان‌سازی شمارهٔ نامه‌های صادره به قالب استاندارد «SEQ/PREFIX/YY».

قالب مورد نظر کاربر (گروه شماره‌گذاری «مؤسسه»):

    شمارهٔ سری / پیشوند فارسی / سال شمسی دو رقمی    →    ``5802/ص م/05``

چون متن فارسی/RTL است، سال در سمت چپِ نمایش می‌آید و شمارهٔ سری در سمت راست؛
در فایل اندیکاتور بعضی ردیف‌ها جابه‌جا (``05/ص م/5802``) و با فاصله‌های اضافه
ثبت شده‌اند و این ماژول همه را به قالب بالا برمی‌گرداند.
"""
from __future__ import annotations

import re

FA_TO_EN = str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789')

PERSIAN_LETTERS = 'آاأإبپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیئء'
LETTER_RE = re.compile(f'[{PERSIAN_LETTERS}]+')
SPLIT_RE = re.compile(r'[^0-9A-Za-z' + PERSIAN_LETTERS + r']+')


def digits(value) -> str:
    return str(value or '').translate(FA_TO_EN)


def _split_parts(text: str):
    return [part for part in SPLIT_RE.split(text) if part]


def parse_letter_number(number):
    """اجزای شمارهٔ نامه: ``{'year': '05', 'prefix': 'ص م', 'seq': '5792'}`` یا None."""
    raw = digits(number).strip()
    if not raw:
        return None

    year = ''
    serials = []
    letters = []

    for part in _split_parts(raw):
        letters_inside = ''.join(LETTER_RE.findall(part))
        digits_inside = ''.join(ch for ch in part if ch.isdigit())
        if letters_inside:
            letters.append(letters_inside)
        if digits_inside:
            if not letters_inside and len(digits_inside) == 2 and digits_inside.startswith('0'):
                year = year or digits_inside
            else:
                serials.append(digits_inside)

    if not year:
        for candidate in list(serials):
            if len(candidate) == 4 and candidate[:2] in ('13', '14'):
                year = candidate[-2:]
                serials.remove(candidate)
                break

    if not letters or not serials or not year:
        return None

    prefix = ' '.join(dict.fromkeys(letters))
    # بزرگ‌ترین گروه رقمی = شمارهٔ سری (سال/کدهای میانی حذف می‌شوند)
    seq = max(serials, key=lambda value: int(value))
    return {'year': year, 'prefix': prefix, 'seq': seq}


def normalize_letter_number(number):
    """نسخهٔ یکسان‌شدهٔ شماره (``None`` اگر قابل تشخیص نباشد).

    خروجی: ``{seq}/{prefix}/{yy}`` مثل ``5802/ص م/05``.
    """
    parsed = parse_letter_number(number)
    if not parsed:
        return None
    return f"{parsed['seq']}/{parsed['prefix']}/{parsed['year']}"


def university_number(serial):
    """شمارهٔ نامهٔ «ارسالی به دانشگاه»: سری سه‌رقمی (مثل 007)."""
    text = digits(serial).strip()
    text = ''.join(ch for ch in text if ch.isdigit())
    if not text:
        return ''
    return str(int(text)).zfill(3)
