"""Jalali payroll calendar helpers.

The backend stores Gregorian dates. These helpers convert a Jalali year/month
to the exact Gregorian bounds so payroll periods follow the same calendar as the
rest of Kian (jdatetime, Tehran timezone).
"""
from __future__ import annotations

from datetime import date, timedelta

import jdatetime


class PayrollCalendarError(ValueError):
    pass


def jalali_month_bounds(year, month):
    try:
        year = int(year)
        month = int(month)
    except (TypeError, ValueError) as exc:
        raise PayrollCalendarError('سال و ماه شمسی باید عدد باشند.') from exc
    if not 1200 <= year <= 1700:
        raise PayrollCalendarError('سال شمسی نامعتبر است.')
    if not 1 <= month <= 12:
        raise PayrollCalendarError('ماه شمسی باید بین ۱ تا ۱۲ باشد.')
    start = jdatetime.date(year, month, 1)
    if month == 12:
        next_start = jdatetime.date(year + 1, 1, 1)
    else:
        next_start = jdatetime.date(year, month + 1, 1)
    end = next_start - timedelta(days=1)
    return start.togregorian(), end.togregorian()


def jalali_today():
    today = jdatetime.date.today()
    return {'year': today.year, 'month': today.month, 'day': today.day}


def month_label(year, month):
    try:
        return jdatetime.date(int(year), int(month), 1).strftime('%B %Y')
    except Exception:  # noqa: BLE001 — display helper must not break payloads
        return f'{year}/{month}'


def months_between(start, end):
    """Return inclusive Jalali (year, month) pairs spanning two dates."""
    start_j = jdatetime.date.fromgregorian(date=start)
    end_j = jdatetime.date.fromgregorian(date=end)
    rows = []
    year, month = start_j.year, start_j.month
    while (year, month) <= (end_j.year, end_j.month):
        rows.append((year, month))
        if month == 12:
            year, month = year + 1, 1
        else:
            month += 1
    return rows


def default_period_for_date(day: date | None = None):
    day = day or date.today()
    j = jdatetime.date.fromgregorian(date=day)
    start, end = jalali_month_bounds(j.year, j.month)
    return {
        'year': j.year,
        'month': j.month,
        'start_date': start,
        'end_date': end,
        'title': f'حقوق {month_label(j.year, j.month)}',
    }
