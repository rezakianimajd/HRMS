"""خروجی اکسل گزارش رویدادهای منابع انسانی."""
import io
from datetime import date

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from employees.events import EVENT_KINDS, jalali

HEADERS = [
    'ردیف', 'نوع رویداد', 'تاریخ رویداد', 'روزهای مانده', 'شخص', 'نوع شخص',
    'نسبت', 'پرسنل اصلی', 'کد پرسنلی', 'واحد سازمانی', 'عنوان شغلی',
    'تلفن همراه', 'تاریخ تولد', 'سن / سابقه', 'توضیح',
]
WIDTHS = [5, 16, 12, 12, 26, 11, 13, 26, 11, 18, 18, 14, 12, 10, 26]
ACCENT = '0EA5E9'
DARK = '0369A1'


def _days_label(value):
    if value is None:
        return ''
    if value < 0:
        return f'{abs(value)} روز گذشته'
    if value == 0:
        return 'امروز'
    return f'{value} روز'


def _age_label(row):
    if row.get('turning_age') is not None:
        return f'{row["turning_age"]} ساله'
    if row.get('years_of_service') is not None:
        return f'{row["years_of_service"]} سال سابقه'
    if row.get('age') is not None:
        return f'{row["age"]} سال'
    return ''


def build_events_workbook(rows, *, title='گزارش رویدادهای منابع انسانی', filter_labels=None):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = 'رویدادها'
    sheet.sheet_view.rightToLeft = True

    center = Alignment(horizontal='center', vertical='center', wrap_text=True)
    right = Alignment(horizontal='right', vertical='center', wrap_text=False)
    thin = Side(style='thin', color='E2E8F0')
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    last_column = get_column_letter(len(HEADERS))

    sheet.merge_cells(f'A1:{last_column}1')
    title_cell = sheet['A1']
    title_cell.value = title
    title_cell.font = Font(name='Tahoma', size=13, bold=True, color='FFFFFF')
    title_cell.fill = PatternFill('solid', fgColor=ACCENT)
    title_cell.alignment = center
    sheet.row_dimensions[1].height = 30

    sheet.merge_cells(f'A2:{last_column}2')
    summary_parts = [f'تعداد ردیف: {len(rows)}', f'تاریخ گزارش: {jalali(date.today())}']
    if filter_labels:
        summary_parts.insert(0, 'فیلترها: ' + ' · '.join(filter_labels))
    summary_cell = sheet['A2']
    summary_cell.value = ' | '.join(summary_parts)
    summary_cell.font = Font(name='Tahoma', size=9.5, color='475569')
    summary_cell.fill = PatternFill('solid', fgColor='F1F5F9')
    summary_cell.alignment = center
    sheet.row_dimensions[2].height = 22

    header_fill = PatternFill('solid', fgColor=DARK)
    header_font = Font(name='Tahoma', size=10, bold=True, color='FFFFFF')
    for index, header in enumerate(HEADERS, start=1):
        cell = sheet.cell(row=3, column=index, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center
        cell.border = border
    sheet.row_dimensions[3].height = 28

    for row_index, row in enumerate(rows, start=4):
        values = [
            row_index - 3,
            row.get('kind_label', ''),
            row.get('event_jalali') or jalali(row.get('event_date')),
            _days_label(row.get('days_until')),
            row.get('person_name', ''),
            row.get('person_type_label', ''),
            row.get('relation_label', ''),
            row.get('employee_name', ''),
            row.get('employee_code', ''),
            row.get('department', ''),
            row.get('position', ''),
            row.get('mobile', ''),
            jalali(row.get('birth_date')),
            _age_label(row),
            row.get('note', ''),
        ]
        for column_index, value in enumerate(values, start=1):
            cell = sheet.cell(row=row_index, column=column_index, value=value)
            cell.font = Font(name='Tahoma', size=9.5, bold=(column_index == 5))
            cell.alignment = right if column_index in (5, 8, 10, 11, 15) else center
            cell.border = border
            if column_index == 4:
                cell.font = Font(name='Tahoma', size=9.5, bold=True,
                                 color='B45309' if (row.get('days_until') or 0) < 0 else '0F766E')

    for index, width in enumerate(WIDTHS, start=1):
        sheet.column_dimensions[get_column_letter(index)].width = width
    sheet.freeze_panes = 'A4'
    sheet.auto_filter.ref = f'A3:{last_column}{max(3, len(rows) + 3)}'

    output = io.BytesIO()
    workbook.save(output)
    return output.getvalue()


def events_workbook_response(rows, *, title='گزارش رویدادهای منابع انسانی', filter_labels=None):
    from urllib.parse import quote

    from django.http import HttpResponse

    content = build_events_workbook(rows, title=title, filter_labels=filter_labels)
    response = HttpResponse(
        content,
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    encoded = quote('گزارش-رویدادهای-منابع-انسانی.xlsx')
    response['Content-Disposition'] = (
        f"attachment; filename=\"hr-events.xlsx\"; filename*=UTF-8''{encoded}"
    )
    return response
