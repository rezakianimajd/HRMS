"""زنجیرهٔ دوره‌ای صورت‌وضعیت‌ها (بدون دیتابیس؛ قابل تست).

قاعده: وقتی **همهٔ** اسناد یک قرارداد شمارهٔ عددی و یکتا دارند، «دورهٔ قبل» با
شماره تعیین می‌شود، نه با ترتیب ثبت (pk). این نکته مهم است چون ممکن است سند
شمارهٔ ۱ بعد از سند شمارهٔ ۱۴ ثبت شود (یا اسناد قدیمی دیرتر وارد شوند)؛ در آن
حالت سند شمارهٔ ۱ «دورهٔ قبل» ندارد و نباید با مبلغ تجمعی سند ۱۴ مقایسه شود.

اگر شماره‌ها عددی/یکتا نباشند، رفتار قبلی (ترتیب شناسه) حفظ می‌شود تا زنجیرهٔ
داده‌های وارد‌شده دست‌نخورده بماند.
"""
from __future__ import annotations


def _row_number(row):
    if isinstance(row, dict):
        return row.get('number')
    return getattr(row, 'number', None)


def _row_id(row):
    if isinstance(row, dict):
        return row.get('id')
    return getattr(row, 'pk', None)


def number_value(value):
    """شمارهٔ عددی سند (اگر شماره عددی نباشد None)."""
    text = str(value or '').strip()
    return int(text) if text.isdigit() else None


def chain_mode(rows, *, number=None, pk=None):
    """حالت زنجیره: «number» اگر همهٔ اسناد شمارهٔ عددی یکتا داشته باشند، وگرنه «pk»."""
    rows = list(rows or [])
    current_pk = int(pk) if pk else None
    has_current = any(_row_id(row) == current_pk for row in rows)
    if number is not None and not has_current and number_value(number) is None:
        # سند جاری شمارهٔ عددی ندارد (یا خالی است) → جای آن روی محور دوره معلوم نیست.
        return 'pk'
    numbers = [str(_row_number(row) or '').strip() for row in rows]
    if not has_current and number_value(number) is not None:
        numbers.append(str(number).strip())
    if numbers and all(item.isdigit() for item in numbers) and len(set(numbers)) == len(numbers):
        return 'number'
    return 'pk'


def order_statements(rows):
    """مرتب‌سازی اسناد بر اساس زنجیرهٔ دوره (صعودی)."""
    rows = list(rows or [])
    if chain_mode(rows) == 'number':
        return sorted(rows, key=lambda row: (number_value(_row_number(row)), _row_id(row) or 0))
    return sorted(rows, key=lambda row: _row_id(row) or 0)


def previous_rows(rows, *, number=None, pk=None):
    """اسناد «دورهٔ قبل» نسبت به سند جاری (به ترتیب صعودی دوره).

    - حالت شماره‌محور: فقط اسنادی که شماره‌شان کوچک‌تر از شمارهٔ سند جاری است.
    - حالت شناسه‌محور: همهٔ رکوردهای قبلی از نظر شناسه (رفتار قبلی).
    """
    rows = list(rows or [])
    current_pk = int(pk) if pk else None
    candidates = [row for row in rows if _row_id(row) != current_pk]
    current_number = number_value(number)
    if chain_mode(rows, number=number, pk=pk) == 'number' and current_number is not None:
        prior = [
            row for row in candidates
            if (number_value(_row_number(row)) or 0) < current_number
        ]
        return sorted(prior, key=lambda row: (number_value(_row_number(row)), _row_id(row) or 0))
    if current_pk is None:
        return sorted(candidates, key=lambda row: _row_id(row) or 0)
    return sorted(
        [row for row in candidates if (_row_id(row) or 0) < current_pk],
        key=lambda row: _row_id(row) or 0,
    )
