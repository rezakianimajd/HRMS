"""منطق خالص «سازمان‌ها و اشخاص» (تعاریف حسابداری).

این ماژول هیچ وابستگی به دیتابیس ندارد تا در تست‌های بدون DB هم قابل استفاده باشد؛
مدل/سریالایزر/ویوست از همین توابع استفاده می‌کنند.

قواعد کسب‌وکار:
* هر سازمان/شخص یک ``kind`` دارد که دامنهٔ آن را مشخص می‌کند (نهاد عمومی، مرجع
  قانونی، کارفرما، سهامدار، بیمه‌گر، حسابرس، سایر حقوقی/حقیقی).
* «شخصیت» (حقوقی/حقیقی) از ``kind`` مشتق می‌شود؛ فقط «سایر اشخاص حقیقی» حقیقی است.
* کد به‌صورت خودکار با پیشوند همان نوع ساخته می‌شود (``ORG-0001``، ``REG-0001`` …)
  و در صورت ورود دستی، همان کد حفظ می‌شود.
"""
from __future__ import annotations

from typing import Iterable

# (value, label) — ترتیب نمایش در UI هم همین است
KINDS = [
    ('organization', 'سازمان و نهاد عمومی'),
    ('regulatory', 'مرجع قانونی و نظارتی'),
    ('employer', 'کارفرما'),
    ('shareholder', 'سهامدار'),
    ('insurer', 'شرکت بیمه'),
    ('auditor', 'حسابرس / بازرس قانونی'),
    ('legal_person', 'سایر اشخاص حقوقی'),
    ('natural_person', 'سایر اشخاص حقیقی'),
    ('other', 'سایر'),
]

KIND_LABELS = dict(KINDS)
KIND_VALUES = tuple(value for value, _label in KINDS)

# پیشوند کد خودکار هر نوع
KIND_PREFIXES = {
    'organization': 'ORG',
    'regulatory': 'REG',
    'employer': 'EMP',
    'shareholder': 'SHR',
    'insurer': 'INS',
    'auditor': 'AUD',
    'legal_person': 'LGL',
    'natural_person': 'NAT',
    'other': 'OTH',
}

# انواعی که شخصیت حقوقی دارند (همه به‌جز شخص حقیقی)
NATURAL_KINDS = ('natural_person',)

# توضیح کوتاه هر نوع برای راهنمای فرم (نمونه‌های واقعی)
KIND_HINTS = {
    'organization': 'مثل شهرداری، دانشگاه، شرکت دولتی یا نهاد عمومی غیردولتی',
    'regulatory': 'مثل سازمان تأمین اجتماعی (شعبه …)، امور مالیاتی، اداره کار، بانک مرکزی',
    'employer': 'کارفرمای قراردادها و مشتریان پروژه‌ای',
    'shareholder': 'سهامداران شرکت با درصد سهام',
    'insurer': 'شرکت‌های بیمه‌ای که با آن‌ها قرارداد بیمه دارید',
    'auditor': 'حسابرس مستقل و بازرس قانونی',
    'legal_person': 'سایر شرکت‌ها و مؤسسات (تابعه، مشارکتی، …)',
    'natural_person': 'اشخاص حقیقی طرف حساب (غیرپرسنل)',
    'other': 'مواردی که در دسته‌های بالا نمی‌گنجند',
}

CODE_WIDTH = 4
MAX_CODE_ATTEMPTS = 200


def kind_label(kind: str) -> str:
    """برچسب فارسی نوع؛ برای مقدار ناشناخته همان مقدار خام برمی‌گردد."""
    return KIND_LABELS.get(str(kind or ''), str(kind or ''))


def code_prefix(kind: str) -> str:
    """پیشوند کد برای نوع سازمان/شخص (پیش‌فرض ``OTH``)."""
    return KIND_PREFIXES.get(str(kind or ''), KIND_PREFIXES['other'])


def person_type_of(kind: str) -> str:
    """``natural`` برای اشخاص حقیقی، در غیر این صورت ``legal``."""
    return 'natural' if str(kind or '') in NATURAL_KINDS else 'legal'


def person_type_label(kind: str) -> str:
    return 'شخص حقیقی' if person_type_of(kind) == 'natural' else 'شخص حقوقی'


def format_code(prefix: str, number: int) -> str:
    return f'{prefix}-{int(number):0{CODE_WIDTH}d}'


def code_number(code: str) -> int:
    """شمارهٔ انتهایی کد (``ORG-0007`` → 7)؛ در صورت نامعتبر بودن صفر."""
    text = str(code or '')
    suffix = text.rsplit('-', 1)[-1]
    return int(suffix) if suffix.isdigit() else 0


def next_code(kind: str, existing: Iterable[str]) -> str:
    """کد بعدی برای این نوع با نگاه به کدهای موجود (بدون پرس‌وجوی دیتابیس)."""
    prefix = code_prefix(kind)
    highest = 0
    for code in existing or ():
        if not str(code or '').upper().startswith(f'{prefix}-'):
            continue
        highest = max(highest, code_number(code))
    return format_code(prefix, highest + 1)


def normalize_code(value: str) -> str:
    """کد دستی: حروف بزرگ، بدون فاصلهٔ اضافه؛ خالی می‌ماند اگر ورودی خالی باشد."""
    return str(value or '').strip().upper()


def display_name(name: str, unit_name: str = '') -> str:
    """نام کامل سازمان با واحد/شعبه: «سازمان تأمین اجتماعی (شعبه ۱۲)»."""
    base = str(name or '').strip()
    unit = str(unit_name or '').strip()
    if base and unit:
        return f'{base} ({unit})'
    return base or unit


def kinds_summary(counts: dict) -> list:
    """آمار هر نوع به ترتیب ثابت ``KINDS`` — ورودی: ``{kind: count}``."""
    counts = counts or {}
    return [
        {'kind': kind, 'label': label, 'count': int(counts.get(kind, 0) or 0)}
        for kind, label in KINDS
    ]


def kinds_meta() -> list:
    """فرادادهٔ انواع برای فرم/فیلتر UI (تنها منبع حقیقت، همراه با راهنما و پیشوند کد)."""
    return [
        {
            'value': kind,
            'label': label,
            'hint': KIND_HINTS.get(kind, ''),
            'prefix': code_prefix(kind),
            'person_type': person_type_of(kind),
            'person_type_label': person_type_label(kind),
        }
        for kind, label in KINDS
    ]


def build_stats(kind_counts: dict, total: int, active: int, linked: int = 0) -> dict:
    """payload اندپوینت ``stats`` (خالص و قابل تست)."""
    summary = kinds_summary(kind_counts)
    return {
        'total': int(total or 0),
        'active': int(active or 0),
        'inactive': max(0, int(total or 0) - int(active or 0)),
        'linked': int(linked or 0),
        'kinds': summary,
        'kinds_meta': kinds_meta(),
    }
