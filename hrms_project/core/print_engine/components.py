"""موتور چاپ یکپارچهٔ برنامه — اجزای قابل استفاده در همهٔ اسناد چاپی.

هدف: تمام چاپ‌های برنامه (فیش/حواله، نامه، گزارش‌های جدولی، فیش حقوقی، صورت‌های
مالی، قرارداد و ...) از یک قالب، یک CSS و یک مجموعه helper استفاده کنند.

این ماژول خالص است (بدون دیتابیس) تا تست آن ساده باشد.
"""
import html
from decimal import Decimal, InvalidOperation

try:  # تاریخ شمسی
    from jdatetime import date as _jdate
except Exception:  # noqa: BLE001 — بدون jdatetime هم باید کار کند
    _jdate = None

PERSIAN_DIGITS = str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹')
JALALI_MONTHS = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]


def esc(value):
    """escape ایمن برای هر مقدار (همیشه رشته)."""
    if value is None:
        return ''
    return html.escape(str(value), quote=True)


def fa_digits(value):
    """ارقام لاتین → فارسی."""
    return str(value if value is not None else '').translate(PERSIAN_DIGITS)


def jalali(value, with_time=False):
    """تاریخ میلادی (date/datetime/رشته ISO) → «۱۴۰۵/۰۸/۱۷»."""
    if not value:
        return ''
    text = str(value)[:10]
    try:
        year, month, day = (int(part) for part in text.split('-'))
    except (ValueError, TypeError):
        return esc(value)
    if _jdate is not None:
        try:
            from datetime import date as _date

            converted = _jdate.fromgregorian(date=_date(year, month, day))
            result = f'{converted.year}/{converted.month:02d}/{converted.day:02d}'
        except Exception:  # noqa: BLE001
            result = f'{year}/{month:02d}/{day:02d}'
    else:
        result = f'{year}/{month:02d}/{day:02d}'
    if with_time and len(str(value)) > 10:
        result = f'{result} {fa_digits(str(value)[11:16])}'
    return fa_digits(result)


def to_decimal(value):
    if value in (None, ''):
        return None
    try:
        return Decimal(str(value).replace(',', '').replace('٬', ''))
    except (InvalidOperation, ValueError):
        return None


def money(value, unit='ریال', with_unit=True, fa=True):
    """قالب مبلغ: «۱۲٬۳۴۵٬۶۷۸ ریال» (جداکنندهٔ هزارگان فارسی)."""
    amount = to_decimal(value)
    if amount is None:
        return ''
    text = f'{amount:,.0f}'.replace(',', '٬')
    if fa:
        text = fa_digits(text)
    return f'{text} {unit}' if with_unit else text


def amount_words(value, unit='ریال'):
    """مبلغ به حروف (با استفاده از helper خزانه‌داری)."""
    try:
        from treasury.amount_words import amount_in_words

        return amount_in_words(to_decimal(value) or 0, unit=unit)
    except Exception:  # noqa: BLE001 — نبود helper نباید چاپ را بشکند
        return ''


def barcode(value):
    """بارکد Code 39 به‌صورت SVG (بدون وابستگی بیرونی)."""
    try:
        from treasury.barcode import barcode_svg

        return barcode_svg(str(value or ''))
    except Exception:  # noqa: BLE001
        return ''


class RawHtml(str):
    """رشتهٔ HTML آماده — از escape رد می‌شود (فقط برای محتوای تولیدشدهٔ خودمان)."""


def raw(html):
    """علامت‌گذاری محتوای HTML که از قبل ایمن است."""
    return RawHtml(html or '')


def field_grid(fields, columns=3):
    """جدول «برچسب/مقدار» — ورودی: [(label, value), ...] (فقط مقادیر غیرخالی)."""
    rows = [item for item in fields if item and item[1] not in (None, '', [])]
    if not rows:
        return ''
    cells = []
    for index, (label, value) in enumerate(rows):
        if index % columns == 0:
            cells.append('<tr>')
        rendered = str(value) if isinstance(value, RawHtml) else esc(value)
        cells.append(f'<th class="pe-label">{esc(label)}</th><td class="pe-value">{rendered}</td>')
        if index % columns == columns - 1 or index == len(rows) - 1:
            for _pad in range(columns - 1 - (index % columns)):
                cells.append('<th class="pe-label"></th><td class="pe-value"></td>')
            cells.append('</tr>')
    return f'<table class="pe-fields">{"".join(cells)}</table>'


def data_table(columns, rows, options=None):
    """جدول دادهٔ گزارش — columns: [{key,label,align,width,format}]، rows: [dict]."""
    options = options or {}
    head = ''.join(
        f'<th style="text-align:{col.get("align", "right")};'
        f'{"width:" + str(col["width"]) + ";" if col.get("width") else ""}">'
        f'{esc(col.get("label", ""))}</th>'
        for col in columns
    )
    body = []
    for row in rows:
        cells = []
        for col in columns:
            value = row.get(col.get('key'))
            formatter = col.get('format')
            if callable(formatter):
                rendered = formatter(value, row)
            elif formatter == 'money':
                rendered = money(value, col.get('unit', 'ریال'))
            elif formatter == 'jalali':
                rendered = jalali(value)
            elif formatter == 'digits':
                rendered = fa_digits(value)
            else:
                rendered = esc(value)
            cells.append(f'<td style="text-align:{col.get("align", "right")}">{rendered}</td>')
        body.append(f'<tr>{"".join(cells)}</tr>')
    total = options.get('total_row')
    footer = ''
    if total:
        span = int(total.get('colspan', 1) or 1)
        footer = (
            '<tfoot><tr>'
            f'<td colspan="{span}">{esc(total.get("label", "جمع"))}</td>'
            f'<td colspan="{max(1, len(columns) - span)}">{esc(total.get("value", ""))}</td>'
            '</tr></tfoot>'
        )
    zebra = 'pe-zebra' if options.get('zebra', True) else ''
    empty = '<tr><td colspan="99">داده‌ای برای چاپ نیست.</td></tr>'
    return (
        f'<table class="pe-table {zebra}"><thead><tr>{head}</tr></thead>'
        f'<tbody>{"".join(body) or empty}</tbody>{footer}</table>'
    )


def signatures(items):
    """ردیف امضاها — [{'title': 'مهر و امضا', 'name': ''}, ...]."""
    rows = [item for item in items if item]
    if not rows:
        return ''
    cells = ''.join(
        '<div class="pe-sign">'
        f'<div class="pe-sign-title">{esc(item.get("title", ""))}</div>'
        f'<div class="pe-sign-name">{esc(item.get("name", ""))}</div>'
        '</div>'
        for item in rows
    )
    return f'<div class="pe-sign-row">{cells}</div>'


def watermark(text):
    """واترمارک محو در پس‌زمینهٔ سند (مثلاً «پیش‌نویس»)."""
    if not text:
        return ''
    return f'<div class="pe-watermark">{esc(text)}</div>'
