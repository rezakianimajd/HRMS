"""خروجی اکسل گزارش افراد تحت تکفل بیمهٔ تکمیلی.

خروجی شامل یک شیت راست‌به‌چپ با سطر عنوان، سطر «هدر جدول» و ردیف‌های داده است.
همان فیلترهای صفحه (نسبت، وضعیت بیمه، واحد، پیوست، کد ملی و جست‌وجو) روی
داده‌ها اعمال می‌شوند تا فایل اکسل دقیقاً همان چیزی باشد که کاربر می‌بیند.
"""
from datetime import date, timedelta

try:  # تاریخ شمسی
    from jdatetime import date as jdate
except ImportError:  # pragma: no cover
    jdate = None

RELATION_LABELS = {
    'spouse': 'همسر',
    'child': 'فرزند',
    'father': 'پدر',
    'mother': 'مادر',
    'other': 'سایر',
}

STATUS_LABELS = {
    'active': 'فعال',
    'expiring': 'نزدیک انقضا',
    'expired': 'منقضی',
    'upcoming': 'آینده',
}

HEADERS = [
    'ردیف',
    'نام و نام خانوادگی پرسنل',
    'کد پرسنلی',
    'واحد سازمانی',
    'عنوان شغلی',
    'بیمه',
    'طرح',
    'دورهٔ پوشش',
    'وضعیت بیمه',
    'نام و نام خانوادگی فرد تحت تکفل',
    'نسبت',
    'کد ملی',
    'تاریخ تولد',
    'سن',
    'پیوست',
]

COLUMN_WIDTHS = [6, 26, 11, 18, 18, 22, 16, 24, 13, 28, 10, 13, 13, 6, 22]


def jalali(value):
    if not value:
        return ''
    if jdate is None:
        return str(value)
    try:
        converted = jdate.fromgregorian(date=value)
        return f'{converted.year:04d}/{converted.month:02d}/{converted.day:02d}'
    except Exception:  # noqa: BLE001
        return str(value)


def status_of(start, end, today=None):
    today = today or date.today()
    if start and start > today:
        return 'upcoming'
    if end and end < today:
        return 'expired'
    if end and end <= today + timedelta(days=30):
        return 'expiring'
    return 'active'


def age_of(birth, today=None):
    if not birth:
        return None
    today = today or date.today()
    years = today.year - birth.year
    if (today.month, today.day) < (birth.month, birth.day):
        years -= 1
    return years if years >= 0 else None


def collect_dependent_rows(queryset):
    """هر فرد تحت تکفل یک ردیف گزارش با اطلاعات پرسنل و بیمهٔ خودش."""
    today = date.today()
    rows = []
    for dependent in queryset:
        insurance = dependent.insurance
        employee = getattr(insurance, 'employee', None)
        employee_name = getattr(employee, 'full_name', '') or ''
        department = getattr(getattr(employee, 'department', None), 'name', '') or ''
        job_title = getattr(getattr(employee, 'job_title', None), 'name', '') or ''
        start = getattr(insurance, 'start_date', None)
        end = getattr(insurance, 'end_date', None)
        status_key = status_of(start, end, today)
        relation = getattr(dependent, 'relation', 'other') or 'other'
        attachment = getattr(dependent, 'attachment', None)
        birth = getattr(dependent, 'birth_date', None)
        rows.append({
            'employee_name': employee_name,
            'employee_code': getattr(employee, 'employee_id', '') or '',
            'department': department,
            'job_title': job_title,
            'insurance_name': getattr(insurance, 'insurance_name', '') or '',
            'insurance_type': getattr(insurance, 'insurance_type', '') or '',
            'plan': getattr(insurance, 'plan', '') or '',
            'period': f"{jalali(start)} تا {jalali(end) if end else 'اکنون'}" if start else '',
            'status': status_key,
            'status_label': STATUS_LABELS.get(status_key, ''),
            'dependent_name': f"{getattr(dependent, 'first_name', '')} {getattr(dependent, 'last_name', '')}".strip(),
            'relation': relation,
            'relation_label': RELATION_LABELS.get(relation, 'سایر'),
            'national_id': getattr(dependent, 'national_id', '') or '',
            'birth_date': jalali(birth),
            'age': age_of(birth, today),
            'attachment': bool(attachment),
            'attachment_name': (str(getattr(attachment, 'name', '') or '').split('/')[-1]),
            'insurance_id': getattr(insurance, 'id', None),
        })
    return rows


def _search_text(row):
    return ' '.join(str(row.get(key) or '') for key in (
        'employee_name', 'employee_code', 'department', 'job_title',
        'insurance_name', 'insurance_type', 'plan',
        'dependent_name', 'national_id', 'relation_label',
    )).lower()


def apply_dependent_filters(rows, params):
    """اعمال همان فیلترهای صفحه روی ردیف‌های گزارش."""
    relation = (params.get('relation') or 'all').strip()
    status = (params.get('status') or 'all').strip()
    department = (params.get('department') or 'all').strip()
    attachment = (params.get('attachment') or 'all').strip()
    national_id = (params.get('national_id') or 'all').strip()
    term = (params.get('q') or '').strip().lower()

    result = []
    for row in rows:
        if relation != 'all' and row['relation'] != relation:
            continue
        if status != 'all' and row['status'] != status:
            continue
        if department != 'all' and row['department'] != department:
            continue
        if attachment == 'with' and not row['attachment']:
            continue
        if attachment == 'missing' and row['attachment']:
            continue
        if national_id == 'with' and not row['national_id']:
            continue
        if national_id == 'missing' and row['national_id']:
            continue
        if term and term not in _search_text(row):
            continue
        result.append(row)

    labels = []
    if relation != 'all':
        labels.append(f"نسبت: {RELATION_LABELS.get(relation, relation)}")
    if status != 'all':
        labels.append(f"وضعیت بیمه: {STATUS_LABELS.get(status, status)}")
    if department != 'all':
        labels.append(f"واحد: {department}")
    if attachment != 'all':
        labels.append('دارای پیوست' if attachment == 'with' else 'بدون پیوست')
    if national_id != 'all':
        labels.append('دارای کد ملی' if national_id == 'with' else 'بدون کد ملی')
    if term:
        labels.append(f"جست‌وجو: {params.get('q')}")
    return result, labels


def build_dependents_workbook(rows, filter_labels=None, title='گزارش افراد تحت تکفل بیمهٔ تکمیلی'):
    """کارپوشهٔ اکسل: سطر عنوان، سطر هدر جدول و سپس ردیف‌های داده."""
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import get_column_letter

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = 'افراد تحت تکفل'
    sheet.sheet_view.rightToLeft = True

    last_column = get_column_letter(len(HEADERS))
    thin = Side(style='thin', color='D8DEE9')
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    center = Alignment(horizontal='center', vertical='center', wrap_text=True)
    right = Alignment(horizontal='right', vertical='center', wrap_text=False)

    # سطر ۱ — عنوان گزارش
    sheet.merge_cells(f'A1:{last_column}1')
    title_cell = sheet['A1']
    title_cell.value = title
    title_cell.font = Font(name='Tahoma', size=13, bold=True, color='FFFFFF')
    title_cell.fill = PatternFill('solid', fgColor='6D28D9')
    title_cell.alignment = center
    sheet.row_dimensions[1].height = 30

    # سطر ۲ — خلاصهٔ فیلترها و تاریخ
    sheet.merge_cells(f'A2:{last_column}2')
    summary_parts = [f'تعداد ردیف: {len(rows)}', f'تاریخ گزارش: {jalali(date.today())}']
    if filter_labels:
        summary_parts.insert(0, 'فیلترها: ' + ' · '.join(filter_labels))
    else:
        summary_parts.insert(0, 'فیلترها: بدون فیلتر (همهٔ افراد تحت تکفل)')
    summary_cell = sheet['A2']
    summary_cell.value = '  |  '.join(summary_parts)
    summary_cell.font = Font(name='Tahoma', size=9.5, color='475569')
    summary_cell.fill = PatternFill('solid', fgColor='F1F5F9')
    summary_cell.alignment = center
    sheet.row_dimensions[2].height = 22

    # سطر ۳ — هدر جدول
    header_fill = PatternFill('solid', fgColor='1D4ED8')
    header_font = Font(name='Tahoma', size=10, bold=True, color='FFFFFF')
    for index, header in enumerate(HEADERS, start=1):
        cell = sheet.cell(row=3, column=index, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center
        cell.border = border
        sheet.column_dimensions[get_column_letter(index)].width = COLUMN_WIDTHS[index - 1]
    sheet.row_dimensions[3].height = 34

    # ردیف‌های داده
    for position, row in enumerate(rows, start=1):
        values = [
            position,
            row.get('employee_name', ''),
            row.get('employee_code', ''),
            row.get('department', ''),
            row.get('job_title', ''),
            row.get('insurance_name', ''),
            row.get('plan', ''),
            row.get('period', ''),
            row.get('status_label', ''),
            row.get('dependent_name', ''),
            row.get('relation_label', ''),
            row.get('national_id', ''),
            row.get('birth_date', ''),
            '' if row.get('age') is None else row.get('age'),
            row.get('attachment_name', '') if row.get('attachment') else '',
        ]
        excel_row = 3 + position
        for index, value in enumerate(values, start=1):
            cell = sheet.cell(row=excel_row, column=index, value=value)
            cell.font = Font(name='Tahoma', size=9.5, color='1E293B')
            cell.border = border
            cell.alignment = center if index in (1, 3, 9, 11, 12, 13, 14) else right
            if index == 12:  # کد ملی به‌صورت متن تا صفر ابتدایی حفظ شود
                cell.number_format = '@'

    last_row = max(3 + len(rows), 3)
    sheet.auto_filter.ref = f'A3:{last_column}{last_row}'
    sheet.freeze_panes = 'C4'
    return workbook


def workbook_response(rows, filter_labels=None, filename='dependents-report.xlsx'):
    """پاسخ HTTP آماده برای دانلود فایل اکسل."""
    from urllib.parse import quote

    from django.http import HttpResponse
    from django.utils import timezone

    workbook = build_dependents_workbook(rows, filter_labels)
    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    stamp = timezone.localdate().strftime('%Y%m%d')
    ascii_name = f'dependents-report-{stamp}.xlsx'
    fa_name = quote(f'گزارش-افراد-تحت-تکفل-{stamp}.xlsx')
    response['Content-Disposition'] = (
        f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{fa_name}'
    )
    workbook.save(response)
    return response

