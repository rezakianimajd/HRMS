"""دوره‌های شمسی برای گزارش‌های ماژول پروژه (Phase 0).

زیرساخت شمسی در بک‌اند از قبل موجود است (`jdatetime` در
`employees/report_views.py`, `leaves/serializers.py`, `datamapping/views.py`)؛
این ماژول همان الگو را برای ماژول پروژه یکدست می‌کند تا سطل‌گذاری ماهانه
بر پایهٔ **ماه شمسی** انجام شود، نه ماه میلادی.

نمونه:
    >>> jalali_key(date(2026, 3, 25))
    '1405-01'
    >>> jalali_label(date(2026, 3, 25))
    'فروردین 1405'
"""
from jdatetime import date as jdate

JALALI_MONTHS = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]


def jalali_parts(gregorian_date):
    """اجزای تاریخ شمسی یک تاریخ میلادی: {'jy','jm','jd'}."""
    if not gregorian_date:
        return None
    try:
        j = jdate.fromgregorian(date=gregorian_date)
    except Exception:  # noqa: BLE001 — اگر ورودی تاریخ نبود، None برمی‌گردانیم
        return None
    return {'jy': j.year, 'jm': j.month, 'jd': j.day}


def jalali_key(gregorian_date):
    """کلید ماه شمسی برای سطل‌گذاری: مثل '1405-01'."""
    p = jalali_parts(gregorian_date)
    return f"{p['jy']:04d}-{p['jm']:02d}" if p else None


def jalali_label(gregorian_date):
    """برچسب خوانا: 'فروردین 1405'."""
    p = jalali_parts(gregorian_date)
    return f"{JALALI_MONTHS[p['jm'] - 1]} {p['jy']}" if p else ''


def jalali_short(gregorian_date):
    """برچسب کوتاه برای محور نمودار: '01/05' (ماه/سال دو رقمی)."""
    p = jalali_parts(gregorian_date)
    if not p:
        return ''
    return f"{p['jm']:02d}/{str(p['jy'])[2:]}"


def jalali_month_key(jy, jm):
    """کلید ماه از سال/ماه شمسی."""
    return f'{int(jy):04d}-{int(jm):02d}'


def jalali_period_fields(gregorian_date):
    """فیلدهای آمادهٔ خروجی API برای یک تاریخ."""
    p = jalali_parts(gregorian_date)
    if not p:
        return {'month': None, 'month_short': '', 'month_label': '', 'jy': None, 'jm': None, 'jd': None}
    return {
        'month': f"{p['jy']:04d}-{p['jm']:02d}",
        'month_short': f"{p['jm']:02d}/{str(p['jy'])[2:]}",
        'month_label': f"{JALALI_MONTHS[p['jm'] - 1]} {p['jy']}",
        'jy': p['jy'],
        'jm': p['jm'],
        'jd': p['jd'],
    }
