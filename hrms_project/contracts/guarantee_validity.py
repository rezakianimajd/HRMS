"""اعتبار ابزارهای تضمین (چک / سفته / ضمانت‌نامه).

قاعدهٔ کسب‌وکار: **چک** با گذشتن «تاریخ سررسید» منقضی نمی‌شود؛ دارنده تا **۵ سال** از
تاریخ صدور می‌تواند مطالبه کند (قانون اصلاح قانون صدور چک). بنابراین برای ابزارهای
چک‌محور، «سرآمد اعتبار» = تاریخ صدور + ۵ سال است و «تاریخ سررسید» فقط یک هشدار
عملیاتی است، نه انقضا. برای ضمانت‌نامه‌ها همان `guarantee_expiry_date`/`expiry_date`
ملاک انقضاست.

این ماژول خالص است (بدون دیتابیس) و هم مدل `Guarantee` و هم دیکشنری را می‌پذیرد تا
سریالایزرها و گزارش‌های داخلی از یک منبع استفاده کنند.
"""
from datetime import date, datetime

CHECK_VALIDITY_YEARS = 5
CHECK_INSTRUMENTS = frozenset({'check', 'check_and_guarantee'})


def _day(value):
    """تبدیل مقدار به ``date`` (رشتهٔ ISO، datetime یا date)."""
    if not value:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except (ValueError, TypeError):
        return None


def _get(source, key, default=None):
    if isinstance(source, dict):
        return source.get(key, default)
    return getattr(source, key, default)


def add_years(day, years):
    """افزودن سال با مدیریت ۲۹ فوریه."""
    if day is None:
        return None
    try:
        return day.replace(year=day.year + years)
    except ValueError:  # 29 February در سال غیرکبیسه
        return day.replace(year=day.year + years, day=28)


def is_check_instrument(instrument_type):
    return str(instrument_type or '').strip() in CHECK_INSTRUMENTS


def guarantee_validity(source, today=None):
    """محاسبهٔ سرآمد اعتبار و وضعیت انقضای یک تضمین.

    خروجی: ``is_check``، ``validity_years``، ``valid_until`` (ISO)، ``due_date`` (ISO)،
    ``days_to_expiry``، ``is_expired``، ``expiry_kind`` (``validity``/``expiry``/``none``).
    """
    today = today or date.today()
    instrument = str(_get(source, 'instrument_type', '') or '').strip()
    is_check = is_check_instrument(instrument)

    issue = _day(_get(source, 'issue_date'))
    # انقضای واقعی ضمانت‌نامه
    expiry = _day(_get(source, 'guarantee_expiry_date')) or _day(_get(source, 'expiry_date'))
    # سررسید عملیاتی (چک/سفته)
    due = (
        _day(_get(source, 'check_due_date'))
        or _day(_get(source, 'promissory_due_date'))
        or _day(_get(source, 'expiry_date'))
    )

    if is_check:
        base = issue or due
        valid_until = add_years(base, CHECK_VALIDITY_YEARS) if base else None
        # اگر ضمانت‌نامهٔ همراهِ چک انقضای دیرتری داشته باشد، همان ملاک است
        if expiry and (valid_until is None or expiry > valid_until):
            valid_until = expiry
        expiry_kind = 'validity' if valid_until else 'none'
        validity_years = CHECK_VALIDITY_YEARS
    else:
        valid_until = expiry
        expiry_kind = 'expiry' if valid_until else 'none'
        validity_years = None

    days = (valid_until - today).days if valid_until else None
    return {
        'is_check': is_check,
        'validity_years': validity_years,
        'valid_until': valid_until.isoformat() if valid_until else None,
        'due_date': due.isoformat() if due else None,
        'due_days': (due - today).days if due else None,
        'days_to_expiry': days,
        'is_expired': bool(days is not None and days < 0),
        'expiry_kind': expiry_kind,
    }
