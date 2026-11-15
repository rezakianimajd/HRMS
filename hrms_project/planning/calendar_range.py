"""ابزارهای خالص بازهٔ تقویم برنامه‌ریزی (بدون وابستگی به دیتابیس)."""
from __future__ import annotations

from datetime import date, timedelta

MAX_RANGE_DAYS = 62
DEFAULT_RANGE_DAYS = 30


def parse_iso_date(value) -> date | None:
    """تاریخ ISO (``YYYY-MM-DD``) را می‌خواند؛ مقدار نامعتبر → None."""
    text = str(value or '').strip()[:10]
    if len(text) != 10:
        return None
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def calendar_range(start=None, end=None, today=None) -> tuple[date, date]:
    """بازهٔ امن تقویم: ترتیب اصلاح می‌شود و طول بازه محدود می‌ماند."""
    today = today or date.today()
    start_date = parse_iso_date(start)
    end_date = parse_iso_date(end)
    if start_date is None and end_date is None:
        return today - timedelta(days=DEFAULT_RANGE_DAYS), today + timedelta(days=DEFAULT_RANGE_DAYS)
    if start_date is None:
        start_date = end_date - timedelta(days=DEFAULT_RANGE_DAYS)
    if end_date is None:
        end_date = start_date + timedelta(days=DEFAULT_RANGE_DAYS)
    if start_date > end_date:
        start_date, end_date = end_date, start_date
    if (end_date - start_date).days > MAX_RANGE_DAYS:
        start_date = end_date - timedelta(days=MAX_RANGE_DAYS)
    return start_date, end_date
