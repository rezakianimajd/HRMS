"""خروجی اکسل «گزارش خانوادهٔ پرسنل».

منبع داده: بخش «خانواده» پروندهٔ پرسنلی (`EmployeeFamilyMember`). اطلاعات بیمهٔ
تکمیلی هر عضو از پوشش‌های بیمه‌ای متصل به همان عضو خوانده می‌شود؛ بنابراین
گزارش همیشه با پروندهٔ پرسنلی هم‌خوان است.
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
    'sibling': 'خواهر / برادر',
    'other': 'سایر',
}

SOURCE_LABELS = {
    'manual': 'ثبت دستی',
    'supplementary_insurance': 'بیمه تکمیلی',
}

STATUS_LABELS = {
    'active': 'فعال',
    'expiring': 'نزدیک انقضا',
    'expired': 'منقضی',
    'upcoming': 'آینده',
    'none': 'بدون بیمه',
}

HEADERS = [
    'ردیف',
    'نام و نام خانوادگی پرسنل',
    'کد پرسنلی',
    'واحد سازمانی',
    'عنوان شغلی',
    'نام و نام خانوادگی عضو خانواده',
    'نسبت',
    'کد ملی',
    'تاریخ تولد',
    'سن',
    'تحت تکفل',
    'منبع ثبت',
    'تلفن همراه',
    'بیمهٔ تکمیلی',
    'وضعیت بیمه',
    'پیوست',
    'توضیحات',
]

COLUMN_WIDTHS = [6, 26, 11, 18, 18, 26, 12, 13, 13, 6, 9, 13, 14, 22, 13, 20, 30]


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

def _preferred_insurance(member):
    """پوشش بیمهٔ فعال‌تر/نزدیک‌ترِ عضو خانواده را برمی‌گرداند."""
    today = date.today()
    candidates = []
    for dependent in member.insurance_dependents.all():
        insurance = dependent.insurance
        if insurance is None:
            continue
        status = status_of(insurance.start_date, insurance.end_date, today)
        weight = {'active': 0, 'expiring': 1, 'upcoming': 2, 'expired': 3}.get(status, 4)
        candidates.append((weight, insurance.end_date or date.max, insurance, dependent))
    if not candidates:
        return None, None
    candidates.sort(key=lambda item: (item[0], item[1]))
    _weight, _end, insurance, dependent = candidates[0]
    return insurance, dependent


def collect_family_rows(queryset):
    """هر عضو خانواده یک ردیف گزارش همراه با اطلاعات پرسنل و بیمهٔ خودش."""
    today = date.today()
    rows = []
    for member in queryset:
        employee = member.employee
        insurance, dependent = _preferred_insurance(member)
        start = getattr(insurance, 'start_date', None)
        end = getattr(insurance, 'end_date', None)
        if insurance is None:
            status_key = 'none'
        else:
            status_key = status_of(start, end, today)
        attachment = getattr(dependent, 'attachment', None)
        birth = member.birth_date
        relation = member.relation or 'other'
        rows.append({
            'member_id': member.pk,
            'employee_id': getattr(employee, 'pk', None),
            'employee_name': getattr(employee, 'full_name', '') or '',
            'employee_code': getattr(employee, 'employee_id', '') or '',
            'employee_photo': getattr(employee, 'photo_url', '') or '',
            'employee_gender': getattr(employee, 'gender', '') or '',
            'department': getattr(getattr(employee, 'department', None), 'name', '') or '',
            'job_title': getattr(getattr(employee, 'job_title', None), 'name', '') or '',
            'member_name': member.full_name or 'بدون نام',
            'first_name': member.first_name or '',
            'last_name': member.last_name or '',
            'relation': relation,
            'relation_label': RELATION_LABELS.get(relation, 'سایر'),
            'national_id': member.national_id or '',
            'birth_date_raw': birth,
            'birth_date': jalali(birth),
            'age': age_of(birth, today),
            'is_dependent': member.is_dependent is not False,
            'dependent_label': 'بله' if member.is_dependent is not False else 'خیر',
            'source': member.source or 'manual',
            'source_label': SOURCE_LABELS.get(member.source, 'ثبت دستی'),
            'phone': member.phone or '',
            'notes': member.notes or '',
            'insurance_id': getattr(insurance, 'id', None),
            'insurance_name': getattr(insurance, 'insurance_name', '') or '',
            'insurance_type': getattr(insurance, 'insurance_type', '') or '',
            'plan': getattr(insurance, 'plan', '') or '',
            'period': (
                f'{jalali(start)} تا {jalali(end) if end else "اکنون"}' if start else ''
            ),
            'status': status_key,
            'status_label': STATUS_LABELS.get(status_key, ''),
            'attachment': bool(attachment),
            'attachment_url': getattr(attachment, 'url', '') if attachment else '',
            'attachment_name': (
                str(getattr(attachment, 'name', '') or '').split('/')[-1] if attachment else ''
            ),
        })
    return rows


def _search_text(row):
    return ' '.join(str(row.get(key) or '') for key in (
        'employee_name', 'employee_code', 'department', 'job_title',
        'member_name', 'national_id', 'phone', 'relation_label', 'source_label',
        'insurance_name', 'insurance_type', 'plan', 'notes',
    )).lower()


def apply_family_filters(rows, params):
    """اعمال همان فیلترهای صفحهٔ «گزارش خانوادهٔ پرسنل» روی ردیف‌ها."""
    relation = (params.get('relation') or 'all').strip()
    status = (params.get('status') or 'all').strip()
    department = (params.get('department') or 'all').strip()
    source = (params.get('source') or 'all').strip()
    dependency = (params.get('dependent') or 'all').strip()
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
        if source != 'all' and row['source'] != source:
            continue
        if dependency == 'yes' and not row['is_dependent']:
            continue
        if dependency == 'no' and row['is_dependent']:
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
        labels.append(f'نسبت: {RELATION_LABELS.get(relation, relation)}')
    if status != 'all':
        labels.append(f'وضعیت بیمه: {STATUS_LABELS.get(status, status)}')
    if department != 'all':
        labels.append(f'واحد: {department}')
    if source != 'all':
        labels.append(f'منبع: {SOURCE_LABELS.get(source, source)}')
    if dependency != 'all':
        labels.append('تحت تکفل' if dependency == 'yes' else 'بدون تکفل')
    if attachment != 'all':
        labels.append('دارای پیوست' if attachment == 'with' else 'بدون پیوست')
    if national_id != 'all':
        labels.append('دارای کد ملی' if national_id == 'with' else 'بدون کد ملی')
    if term:
        labels.append(f'جست‌وجو: {params.get("q")}')
    return result, labels


def build_family_workbook(rows, filter_labels=None, title='گزارش خانوادهٔ پرسنل'):
    """کارپوشهٔ اکسل: سطر عنوان، سطر فیلترها، سطر هدر و ردیف‌های داده."""
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import get_column_letter

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = 'خانواده پرسنل'
    sheet.sheet_view.rightToLeft = True

    last_column = get_column_letter(len(HEADERS))
    thin = Side(style='thin', color='D8DEE9')
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    center = Alignment(horizontal='center', vertical='center', wrap_text=True)
    right = Alignment(horizontal='right', vertical='center', wrap_text=False)

    sheet.merge_cells(f'A1:{last_column}1')
    title_cell = sheet['A1']
    title_cell.value = title
    title_cell.font = Font(name='Tahoma', size=13, bold=True, color='FFFFFF')
    title_cell.fill = PatternFill('solid', fgColor='BE185D')
    title_cell.alignment = center
    sheet.row_dimensions[1].height = 30

    sheet.merge_cells(f'A2:{last_column}2')
    summary_parts = [f'تعداد ردیف: {len(rows)}', f'تاریخ گزارش: {jalali(date.today())}']
    if filter_labels:
        summary_parts.insert(0, 'فیلترها: ' + ' · '.join(filter_labels))
    else:
        summary_parts.insert(0, 'فیلترها: بدون فیلتر (کل خانوادهٔ پرسنل)')
    summary_cell = sheet['A2']
    summary_cell.value = '  |  '.join(summary_parts)
    summary_cell.font = Font(name='Tahoma', size=9.5, color='475569')
    summary_cell.fill = PatternFill('solid', fgColor='F1F5F9')
    summary_cell.alignment = center
    sheet.row_dimensions[2].height = 22

    header_fill = PatternFill('solid', fgColor='9D174D')
    header_font = Font(name='Tahoma', size=10, bold=True, color='FFFFFF')
    for index, header in enumerate(HEADERS, start=1):
        cell = sheet.cell(row=3, column=index, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center
        cell.border = border
        sheet.column_dimensions[get_column_letter(index)].width = COLUMN_WIDTHS[index - 1]
    sheet.row_dimensions[3].height = 34

    for position, row in enumerate(rows, start=1):
        values = [
            position,
            row.get('employee_name', ''),
            row.get('employee_code', ''),
            row.get('department', ''),
            row.get('job_title', ''),
            row.get('member_name', ''),
            row.get('relation_label', ''),
            row.get('national_id', ''),
            row.get('birth_date', ''),
            '' if row.get('age') is None else row.get('age'),
            row.get('dependent_label', ''),
            row.get('source_label', ''),
            row.get('phone', ''),
            row.get('insurance_name', ''),
            row.get('status_label', ''),
            row.get('attachment_name', '') if row.get('attachment') else '',
            row.get('notes', ''),
        ]
        excel_row = 3 + position
        for index, value in enumerate(values, start=1):
            cell = sheet.cell(row=excel_row, column=index, value=value)
            cell.font = Font(name='Tahoma', size=9.5, color='1E293B')
            cell.border = border
            cell.alignment = center if index in (1, 3, 7, 8, 9, 10, 11, 12, 13, 15) else right
            if index in (3, 8, 13):  # کد پرسنلی، کد ملی و موبایل به‌صورت متن
                cell.number_format = '@'

    last_row = max(3 + len(rows), 3)
    sheet.auto_filter.ref = f'A3:{last_column}{last_row}'
    sheet.freeze_panes = 'C4'
    return workbook


def workbook_response(rows, filter_labels=None, filename='family-report.xlsx'):
    """پاسخ HTTP آماده برای دانلود فایل اکسل گزارش خانواده."""
    from urllib.parse import quote

    from django.http import HttpResponse
    from django.utils import timezone

    workbook = build_family_workbook(rows, filter_labels)
    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    stamp = timezone.localdate().strftime('%Y%m%d')
    ascii_name = f'family-report-{stamp}.xlsx'
    fa_name = quote(f'گزارش-خانواده-پرسنل-{stamp}.xlsx')
    response['Content-Disposition'] = (
        f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{fa_name}'
    )
    workbook.save(response)
    return response

