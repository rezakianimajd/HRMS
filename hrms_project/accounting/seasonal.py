"""سرویس‌های صورت معاملات فصلی (ماده ۱۶۹ مکرر).

- ``sync_rows``: ذخیرهٔ گروهی و اتمیک ردیف‌ها (جایگزینی کامل لیست).
- ``validate_report``: اعتبارسنجی ردیف‌ها با سطح خطا/هشدار (برای گزارش و اکسل).
- ``control_totals``: جمع‌های کنترل (کل، به تفکیک نوع و وضعیت سامانه).
- ``build_workbook``: خروجی اکسل رسمی سه‌شیتی (داده / خلاصه / خطاها).
"""
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db import models
from django.db.models import Count, Sum

from accounting.models import SeasonalReport, SeasonalTransaction

# ستون‌های رسمی فرم معاملات فصلی (ترتیب پایه؛ در فاز ۲ با فایل TTMS تطبیق می‌شود)
OFFICIAL_COLUMNS = [
    'ردیف',
    'شماره اقتصادی طرف معامله',
    'شناسه ملی / کد ملی',
    'نام و نام خانوادگی / نام شرکت',
    'کد پستی',
    'استان',
    'شهر',
    'آدرس',
    'شرح کالا / خدمات',
    'مبلغ (ریال)',
    'مالیات بر ارزش افزوده',
    'جمع کل',
    'نوع معامله',
    'تاریخ فاکتور',
    'شماره فاکتور',
    'وضعیت سامانه مودیان',
]

ROW_FIELDS = (
    'name', 'person_type', 'economic_code', 'national_id', 'postal_code',
    'province', 'city', 'address', 'goods_service_desc', 'amount', 'vat',
    'kind', 'invoice_date', 'invoice_no', 'moadian_status', 'moadian_uid',
    'currency_code', 'fx_rate',
)


def _to_decimal(value):
    try:
        return Decimal(str(value or 0).replace(',', '').strip() or 0)
    except (InvalidOperation, ValueError):
        return Decimal('0')


def _digits_only(value):
    return ''.join(ch for ch in str(value or '') if ch.isdigit())


def _clean_text(value, limit=None):
    text = str(value if value is not None else '').strip()
    return text[:limit] if limit else text


def _parse_date(value):
    """تبدیل تاریخ ISO به ``date``؛ مقدار نامعتبر نادیده گرفته می‌شود."""
    if not value:
        return None
    if hasattr(value, 'year'):
        return value
    try:
        from datetime import date

        return date.fromisoformat(str(value)[:10])
    except (ValueError, TypeError):
        return None


def sync_rows(report, rows):
    """جایگزینی کامل ردیف‌های گزارش با لیست ورودی (تراکنشی).

    هر آیتم: ``{'id': optional, ...ROW_FIELDS}``. شمارهٔ ردیف‌ها از ۱ بازشماری
    می‌شود تا ترتیب جدول و خروجی همیشه یکسان باشد. ردیف‌هایی که در ورودی نیستند
    حذف می‌شوند (رفتار «ذخیرهٔ کل جدول»).
    """
    if report.is_locked:
        raise ValueError('این فصل ارسال شده است و قابل ویرایش نیست.')

    cleaned = []
    for index, raw in enumerate(rows or [], start=1):
        if not isinstance(raw, dict):
            continue
        amount = _to_decimal(raw.get('amount'))
        vat = _to_decimal(raw.get('vat'))
        kind = int(raw.get('kind') or 1)
        kind = kind if 1 <= kind <= 5 else 1
        item = {
            'id': raw.get('id') or None,
            'line_no': index,
            'name': _clean_text(raw.get('name'), 250),
            'person_type': _clean_text(raw.get('person_type'), 10),
            'economic_code': _digits_only(raw.get('economic_code'))[:20],
            'national_id': _digits_only(raw.get('national_id'))[:20],
            'postal_code': _digits_only(raw.get('postal_code'))[:10],
            'province': _clean_text(raw.get('province'), 60),
            'city': _clean_text(raw.get('city'), 100),
            'address': _clean_text(raw.get('address')),
            'goods_service_desc': _clean_text(raw.get('goods_service_desc'), 300),
            'amount': amount,
            'vat': vat,
            'kind': kind,
            'invoice_date': _parse_date(raw.get('invoice_date')),
            'invoice_no': _clean_text(raw.get('invoice_no'), 50),
            'moadian_status': 'registered' if raw.get('moadian_status') == 'registered' else 'pending',
            'moadian_uid': _clean_text(raw.get('moadian_uid'), 120),
            'currency_code': _clean_text(raw.get('currency_code'), 10),
            'fx_rate': _to_decimal(raw.get('fx_rate')) or Decimal('1'),
        }
        # ردیف‌های کاملاً خالی نادیده گرفته می‌شوند
        if not any([item['name'], item['invoice_no'], item['amount'], item['vat'], item['goods_service_desc']]):
            continue
        cleaned.append(item)

    with transaction.atomic():
        existing = {str(row.id): row for row in report.transactions.all()}
        # مرحلهٔ ۱: شماره‌های موقت تا محدودیت «ردیف یکتا» در بازچینش ترتیب نقض نشود
        report.transactions.update(line_no=models.F('line_no') + 100000)
        keep_ids = []
        for item in cleaned:
            row_id = item.pop('id', None)
            row = existing.get(str(row_id)) if row_id else None
            if row is None:
                row = SeasonalTransaction(report=report, company_id=report.company_id)
            for field in ROW_FIELDS:
                setattr(row, field, item[field])
            row.line_no = item['line_no']
            row.save()
            keep_ids.append(row.id)
        report.transactions.exclude(id__in=keep_ids).delete()

    return report.transactions.count()

def control_totals(report):
    """جمع‌های کنترل گزارش: کل، به تفکیک نوع معامله و وضعیت سامانه."""
    rows = report.transactions.all()
    agg = rows.aggregate(
        count=Count('id'),
        amount=Sum('amount'),
        vat=Sum('vat'),
    )
    by_kind = [
        {
            'kind': item['kind'],
            'label': SeasonalTransaction.Kind(item['kind']).label,
            'count': item['count'],
            'amount': float(item['amount'] or 0),
            'vat': float(item['vat'] or 0),
            'total': float((item['amount'] or 0) + (item['vat'] or 0)),
        }
        for item in rows.values('kind').annotate(count=Count('id'), amount=Sum('amount'), vat=Sum('vat')).order_by('kind')
    ]
    registered = rows.filter(moadian_status=SeasonalTransaction.MoadianStatus.REGISTERED).count()
    amount = float(agg['amount'] or 0)
    vat = float(agg['vat'] or 0)
    return {
        'count': agg['count'] or 0,
        'amount': amount,
        'vat': vat,
        'total': amount + vat,
        'registered': registered,
        'pending': (agg['count'] or 0) - registered,
        'by_kind': by_kind,
    }


def validate_report(report):
    """اعتبارسنجی ردیف‌های گزارش؛ خروجی: ``{'issues': [...], 'summary': {...}}``.

    ``level='error'`` مانع خروجی رسمی است و ``level='warning'`` فقط یادآوری است
    (مثلاً نبود شماره اقتصادی یا درج‌نشدن فاکتور در سامانه مودیان).
    """
    period_start, period_end = report.period_range
    rows = list(report.transactions.order_by('line_no', 'id'))
    issues = []
    seen = {}

    def add(row, field, level, message):
        issues.append({
            'row_id': row.id,
            'row_no': row.line_no,
            'row_name': row.name,
            'field': field,
            'level': level,
            'message': message,
        })

    for row in rows:
        if not row.name.strip():
            add(row, 'name', 'error', 'نام طرف معامله الزامی است.')
        if not row.amount and not row.vat:
            add(row, 'amount', 'error', 'مبلغ معامله باید بزرگ‌تر از صفر باشد.')
        if row.vat and row.amount and row.vat > row.amount:
            add(row, 'vat', 'error', 'مالیات بر ارزش افزوده نمی‌تواند از مبلغ معامله بیشتر باشد.')
        if not row.invoice_no.strip():
            add(row, 'invoice_no', 'warning', 'شماره فاکتور وارد نشده است.')
        if not row.invoice_date:
            add(row, 'invoice_date', 'warning', 'تاریخ فاکتور وارد نشده است.')
        elif not (period_start <= row.invoice_date <= period_end):
            add(row, 'invoice_date', 'error', 'تاریخ فاکتور بیرون از بازهٔ این فصل است.')
        if not row.economic_code:
            if row.person_type == SeasonalTransaction.PersonType.LEGAL:
                add(row, 'economic_code', 'error', 'برای شخص حقوقی، شماره اقتصادی ۱۱ رقمی الزامی است.')
            else:
                add(row, 'economic_code', 'warning', 'شماره اقتصادی ثبت نشده است.')
        elif len(row.economic_code) != 11:
            add(row, 'economic_code', 'error', 'شماره اقتصادی باید ۱۱ رقم باشد.')
        if row.national_id and len(row.national_id) not in (10, 11):
            add(row, 'national_id', 'error', 'شناسه ملی/کد ملی باید ۱۰ یا ۱۱ رقم باشد.')
        if not row.postal_code:
            add(row, 'postal_code', 'warning', 'کد پستی طرف معامله ثبت نشده است.')
        elif len(row.postal_code) != 10:
            add(row, 'postal_code', 'error', 'کد پستی باید ۱۰ رقم باشد.')
        if not row.goods_service_desc.strip():
            add(row, 'goods_service_desc', 'warning', 'شرح کالا یا خدمات وارد نشده است.')
        if row.moadian_status != SeasonalTransaction.MoadianStatus.REGISTERED:
            add(row, 'moadian_status', 'warning', 'این فاکتور در سامانه مودیان درج نشده است.')

        if row.invoice_no:
            key = (row.invoice_no.strip(), row.economic_code.strip())
            if key in seen:
                add(row, 'invoice_no', 'error', f'شماره فاکتور تکراری با ردیف {seen[key]} ثبت شده است.')
            else:
                seen[key] = row.line_no

    errors = sum(1 for issue in issues if issue['level'] == 'error')
    warnings = sum(1 for issue in issues if issue['level'] == 'warning')
    return {
        'issues': issues,
        'summary': {
            'rows': len(rows),
            'errors': errors,
            'warnings': warnings,
            'period_start': period_start.isoformat(),
            'period_end': period_end.isoformat(),
            'totals': control_totals(report),
        },
    }


# ---------------------------------------------------------------------------
# خروجی اکسل رسمی (سه شیت: داده / خلاصه / خطاها)
# ---------------------------------------------------------------------------

def _jalali_text(value):
    """تاریخ میلادی → رشتهٔ شمسی (مثل ۱۴۰۵/۰۱/۲۱)."""
    if not value:
        return ''
    import jdatetime

    jalali = jdatetime.date.fromgregorian(date=value)
    return f'{jalali.year:04d}/{jalali.month:02d}/{jalali.day:02d}'


def _company_identity(report):
    """نام و شناسهٔ قانونی شرکت برای سرصفحهٔ گزارش."""
    name = getattr(report.company, 'name', '') or ''
    economic_code = ''
    national_id = ''
    try:
        from settings_app.models import CompanyProfile

        profile = CompanyProfile.objects.filter(company_id=report.company_id).first()
        if profile:
            name = profile.legal_name or name
            economic_code = profile.economic_code or ''
            national_id = profile.national_id or ''
    except Exception:                      # تعریف‌نشده/خطای دسترسی — سرصفحه ساده می‌ماند
        pass
    return name, economic_code, national_id


def _row_values(row):
    """مقادیر یک ردیف به ترتیب ستون‌های رسمی."""
    return [
        row.line_no,
        row.economic_code,
        row.national_id,
        row.name,
        row.postal_code,
        row.province,
        row.city,
        row.address,
        row.goods_service_desc,
        int(row.amount or 0),
        int(row.vat or 0),
        int(row.total or 0),
        int(row.kind),
        _jalali_text(row.invoice_date),
        row.invoice_no,
        'درج‌شده در سامانه' if row.moadian_status == 'registered' else 'درج‌نشده',
    ]


def _build_data_sheet(workbook, report, rows, totals):
    """شیت «داده»: سرصفحهٔ رسمی + ردیف‌ها + سطر جمع."""
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import get_column_letter

    head_font = Font(bold=True, color='FFFFFF', size=10)
    head_fill = PatternFill('solid', fgColor='B45309')
    total_fill = PatternFill('solid', fgColor='FEF3C7')
    center = Alignment(horizontal='center', vertical='center', wrap_text=True)
    left = Alignment(horizontal='left', vertical='center')
    thin = Side(style='thin', color='D8DEE9')
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    columns = len(OFFICIAL_COLUMNS)

    ws = workbook.active
    ws.title = 'داده'
    ws.sheet_view.rightToLeft = True

    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=columns)
    title = ws.cell(row=1, column=1, value='صورت معاملات فصلی — ماده ۱۶۹ مکرر قانون مالیات‌های مستقیم')
    title.font = Font(bold=True, size=13)
    title.alignment = center

    company_name, company_economic, company_national = _company_identity(report)
    period_start, period_end = report.period_range
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=columns)
    meta = ws.cell(row=2, column=1, value=(
        f'{company_name}  |  شناسه ملی: {company_national or "—"}  |  شماره اقتصادی: {company_economic or "—"}'
        f'  |  سال مالی: {report.fiscal_year.name}  |  {report.get_quarter_display()}'
        f'  |  بازه: {_jalali_text(period_start)} تا {_jalali_text(period_end)}'
    ))
    meta.alignment = center

    for index, header in enumerate(OFFICIAL_COLUMNS, start=1):
        cell = ws.cell(row=3, column=index, value=header)
        cell.font = head_font
        cell.fill = head_fill
        cell.alignment = center
        cell.border = border
        ws.column_dimensions[get_column_letter(index)].width = max(10, min(30, len(header) + 6))
    ws.row_dimensions[3].height = 34
    ws.freeze_panes = 'A4'

    for offset, row in enumerate(rows):
        excel_row = 4 + offset
        for column, value in enumerate(_row_values(row), start=1):
            cell = ws.cell(row=excel_row, column=column, value=value)
            cell.border = border
            if column in (2, 3, 5, 14, 15):        # کدها و تاریخ به‌صورت متن
                cell.number_format = '@'
                cell.alignment = center
            elif column in (1, 13, 16):
                cell.alignment = center
            elif column in (10, 11, 12):
                cell.number_format = '#,##0'
                cell.alignment = left

    total_row = 4 + len(rows)
    ws.merge_cells(start_row=total_row, start_column=1, end_row=total_row, end_column=9)
    label = ws.cell(row=total_row, column=1, value='جمع کل')
    label.font = Font(bold=True)
    label.alignment = center
    for column, value in ((10, totals['amount']), (11, totals['vat']), (12, totals['total'])):
        cell = ws.cell(row=total_row, column=column, value=value)
        cell.font = Font(bold=True)
        cell.number_format = '#,##0'
        cell.alignment = left
    for column in range(1, columns + 1):
        cell = ws.cell(row=total_row, column=column)
        cell.fill = total_fill
        cell.border = border

    if rows:
        last_col = get_column_letter(columns)
        ws.auto_filter.ref = f'A3:{last_col}{3 + len(rows)}'
    return ws

def _build_summary_sheet(workbook, report, totals, validation):
    """شیت «خلاصه»: جمع‌های کنترلی، به تفکیک نوع معامله و وضعیت سامانه."""
    from openpyxl.styles import Font, PatternFill

    head_font = Font(bold=True, color='FFFFFF', size=10)
    head_fill = PatternFill('solid', fgColor='B45309')

    period_start, period_end = report.period_range
    ws = workbook.create_sheet('خلاصه')
    ws.sheet_view.rightToLeft = True

    ws.append(['صورت معاملات فصلی — خلاصهٔ کنترلی'])
    ws['A1'].font = Font(bold=True, size=13)
    ws.append([])
    for label, value in (
        ('سال مالی', report.fiscal_year.name),
        ('فصل', report.get_quarter_display()),
        ('بازهٔ فصل', f'{_jalali_text(period_start)} تا {_jalali_text(period_end)}'),
        ('وضعیت گزارش', report.get_status_display()),
        ('', ''),
        ('تعداد ردیف', totals['count']),
        ('جمع مبلغ (ریال)', totals['amount']),
        ('جمع مالیات بر ارزش افزوده', totals['vat']),
        ('جمع کل', totals['total']),
        ('درج‌شده در سامانه مودیان', totals['registered']),
        ('درج‌نشده در سامانه', totals['pending']),
        ('خطاهای اعتبارسنجی', validation['summary']['errors']),
        ('هشدارهای اعتبارسنجی', validation['summary']['warnings']),
    ):
        ws.append([label, value])
    ws.append([])
    ws.append(['نوع معامله', 'تعداد', 'مبلغ', 'مالیات', 'جمع کل'])
    for cell in ws[ws.max_row]:
        cell.font = head_font
        cell.fill = head_fill
    for item in totals['by_kind']:
        ws.append([item['label'], item['count'], item['amount'], item['vat'], item['total']])
    for row_cells in ws.iter_rows(min_row=1, max_row=ws.max_row):
        for cell in row_cells:
            if isinstance(cell.value, (int, float)):
                cell.number_format = '#,##0'
    ws.column_dimensions['A'].width = 30
    for letter in ('B', 'C', 'D', 'E'):
        ws.column_dimensions[letter].width = 18
    return ws


def _build_issues_sheet(workbook, validation):
    """شیت «خطاها»: فهرست خطا/هشدارهای اعتبارسنجی برای اصلاح قبل از ارسال."""
    from openpyxl.styles import Alignment, Font, PatternFill

    head_font = Font(bold=True, color='FFFFFF', size=10)
    head_fill = PatternFill('solid', fgColor='B45309')

    ws = workbook.create_sheet('خطاها')
    ws.sheet_view.rightToLeft = True
    ws.append(['ردیف', 'طرف معامله', 'فیلد', 'سطح', 'پیام'])
    for cell in ws[1]:
        cell.font = head_font
        cell.fill = head_fill
        cell.alignment = Alignment(horizontal='center', vertical='center')
    for issue in validation['issues']:
        ws.append([
            issue['row_no'], issue['row_name'], issue['field'],
            'خطا' if issue['level'] == 'error' else 'هشدار', issue['message'],
        ])
    if not validation['issues']:
        ws.append(['', 'موردی برای اصلاح نیست.', '', '', ''])
    for column, width in zip('ABCDE', (8, 30, 18, 10, 60)):
        ws.column_dimensions[column].width = width
    return ws


def build_workbook(report):
    """کارپوشهٔ خروجی رسمی: داده + خلاصه + خطاها."""
    from openpyxl import Workbook

    validation = validate_report(report)
    rows = list(report.transactions.order_by('line_no', 'id'))
    totals = validation['summary']['totals']

    workbook = Workbook()
    _build_data_sheet(workbook, report, rows, totals)
    _build_summary_sheet(workbook, report, totals, validation)
    _build_issues_sheet(workbook, validation)
    return workbook

