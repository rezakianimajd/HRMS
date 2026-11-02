"""محاسبهٔ تاریخ پیشنهادی بعدی انواع مزایا (تکرار سالانهٔ شمسی).

هر نوع مزایا یک «تاریخ پیشنهادی» دارد که هر سال در همان روز و ماه شمسی تکرار
می‌شود؛ این ماژول نزدیک‌ترین رخداد آینده و تعداد روزهای باقی‌مانده را می‌سازد
تا در تعاریف و داشبورد منابع انسانی نمایش داده شود.
"""
from datetime import date

try:  # تاریخ شمسی
    from jdatetime import date as jdate
except ImportError:  # pragma: no cover
    jdate = None

URGENCY_LABELS = {
    'today': 'امروز',
    'soon': 'نزدیک',
    'upcoming': 'پیش‌رو',
    'later': 'دور',
    'unset': 'بدون تاریخ',
}


def to_jalali(value):
    if not value:
        return ''
    if jdate is None:
        return str(value)
    try:
        converted = jdate.fromgregorian(date=value)
        return f'{converted.year:04d}/{converted.month:02d}/{converted.day:02d}'
    except Exception:  # noqa: BLE001
        return str(value)


def next_occurrence(suggested, today=None):
    """نزدیک‌ترین رخداد آیندهٔ تاریخ پیشنهادی (تکرار سالانهٔ شمسی)."""
    if not suggested:
        return None
    today = today or date.today()
    if jdate is None:  # pragma: no cover - بدون کتابخانهٔ شمسی
        return suggested if suggested >= today else None
    try:
        base = jdate.fromgregorian(date=suggested)
        today_j = jdate.fromgregorian(date=today)
    except Exception:  # noqa: BLE001
        return suggested if suggested >= today else None

    for year in (today_j.year, today_j.year + 1, today_j.year + 2):
        day = base.day
        candidate = None
        while day >= 1 and candidate is None:
            try:
                candidate = jdate(year, base.month, day).togregorian()
            except ValueError:
                day -= 1
        if candidate and candidate >= today:
            return candidate
    return None


def days_remaining(suggested, today=None):
    today = today or date.today()
    upcoming = next_occurrence(suggested, today)
    if upcoming is None:
        return None
    return (upcoming - today).days


def urgency_of(days):
    if days is None:
        return 'unset'
    if days <= 0:
        return 'today'
    if days <= 14:
        return 'soon'
    if days <= 60:
        return 'upcoming'
    return 'later'


def benefit_schedule(suggested, today=None):
    """خلاصهٔ تاریخ پیشنهادی برای API: رخداد بعدی، روز باقی‌مانده و وضعیت."""
    today = today or date.today()
    upcoming = next_occurrence(suggested, today)
    remaining = (upcoming - today).days if upcoming else None
    urgency = urgency_of(remaining)
    return {
        'next_date': upcoming.isoformat() if upcoming else None,
        'next_date_jalali': to_jalali(upcoming),
        'days_remaining': remaining,
        'urgency': urgency,
        'urgency_label': URGENCY_LABELS.get(urgency, ''),
    }
