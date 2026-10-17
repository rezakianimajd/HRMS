"""خروجی اکسل پرونده‌های پرسنلی — یک شیت و **یک ردیف برای هر پرسنل**.

ستون «لیست بیمه» و «شماره بیمه» به‌صورت برجسته در ابتدای جدول قرار دارند تا خروجی
هماهنگ با فیلتر «لیست بیمه» صفحهٔ پرسنل باشد. همهٔ فیلترهای همان صفحه (جستجو،
دپارتمان، عنوان شغلی، محل استقرار، وضعیت، جنسیت و لیست بیمه) روی خروجی اعمال می‌شوند.
"""
from decimal import Decimal

try:  # تاریخ شمسی
    from jdatetime import date as jdate
except ImportError:  # pragma: no cover
    jdate = None


# ---------------------------------------------------------------------------- #
# کمک‌تابع‌های ایمن
# ---------------------------------------------------------------------------- #
def _fa_date(value):
    """تاریخ شمسی به شکل 1404/01/15."""
    if not value:
        return ''
    if jdate is None:
        return str(value)
    try:
        jalali = jdate.fromgregorian(date=value)
        return f'{jalali.year:04d}/{jalali.month:02d}/{jalali.day:02d}'
    except Exception:  # noqa: BLE001
        return str(value)


def _text(value):
    return '' if value in (None, '') else str(value)


def _display(obj, field):
    """مقدار نمایشی یک فیلد choice (مثلاً get_status_display)."""
    getter = getattr(obj, f'get_{field}_display', None)
    if callable(getter):
        try:
            return _text(getter())
        except Exception:  # noqa: BLE001
            pass
    return _text(getattr(obj, field, ''))


def _related(obj, field, *attrs):
    """خواندن نام یک رابطه (FK) به‌صورت ایمن."""
    related = getattr(obj, field, None)
    if related is None:
        return ''
    for attr in attrs:
        value = getattr(related, attr, None)
        if value:
            return str(value)
    return str(related)


def _num(value):
    if value in (None, ''):
        return ''
    try:
        number = float(Decimal(value))
    except Exception:  # noqa: BLE001
        return ''
    return int(number) if number.is_integer() else number


HEADERS = [
    'ردیف',
    'کد پرسنلی',
    'نام',
    'نام خانوادگی',
    'کد ملی',
    'لیست بیمه',
    'شماره بیمه',
    'تاریخ تولد',
    'جنسیت',
    'وضعیت تأهل',
    'تعداد فرزند',
    'موبایل',
    'تلفن',
    'ایمیل',
    'دپارتمان',
    'عنوان شغلی',
    'محل استقرار',
    'نوع قرارداد',
    'تاریخ استخدام',
    'پایان قرارداد',
    'وضعیت',
    'نوبت کاری',
    'سطح تحصیلات',
    'شماره کارت',
    'تاریخ انقضای کارت',
    'وضعیت پرونده',
    'شهر',
    'آدرس',
]


def _row(index, employee):
    record_status = 'کامل' if getattr(employee, 'is_record_complete', False) else ''
    if not record_status:
        percent = getattr(employee, 'completeness_percent', None)
        record_status = f'{percent}٪' if percent is not None else ''

    return [
        index,
        _text(getattr(employee, 'employee_id', '')),
        _text(getattr(employee, 'first_name', '')),
        _text(getattr(employee, 'last_name', '')),
        _text(getattr(employee, 'national_id', '')),
        _related(employee, 'insurance_list', 'name'),
        _text(getattr(employee, 'insurance_number', '')),
        _fa_date(getattr(employee, 'birth_date', None)),
        _display(employee, 'gender'),
        _display(employee, 'marital_status'),
        _num(getattr(employee, 'children_count', None)),
        _text(getattr(employee, 'mobile', '')),
        _text(getattr(employee, 'phone', '')),
        _text(getattr(employee, 'email', '')),
        _related(employee, 'department', 'name'),
        _related(employee, 'job_title', 'name'),
        _related(employee, 'work_location', 'name'),
        _related(employee, 'contract_type', 'name'),
        _fa_date(getattr(employee, 'hire_date', None)),
        _fa_date(getattr(employee, 'contract_end_date', None)),
        _display(employee, 'status'),
        _display(employee, 'work_shift'),
        _display(employee, 'education_level'),
        _text(getattr(employee, 'card_number', '')),
        _fa_date(getattr(employee, 'card_expiry_date', None)),
        record_status,
        _text(getattr(employee, 'city', '')),
        _text(getattr(employee, 'address', '')),
    ]


def build_employees_workbook(queryset):
    """ساخت workbook پرسنل با سرستون‌های راست‌چین، فریز و فیلتر."""
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter

    if hasattr(queryset, 'select_related'):
        queryset = queryset.select_related(
            'department', 'job_title', 'work_location', 'insurance_list', 'contract_type',
        )

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = 'پرسنل'
    sheet.sheet_view.rightToLeft = True
    sheet.append(HEADERS)

    header_font = Font(bold=True, color='FFFFFF', size=11)
    header_fill = PatternFill('solid', fgColor='BE185D')
    center = Alignment(horizontal='center', vertical='center', wrap_text=True)

    for index, header in enumerate(HEADERS, start=1):
        cell = sheet.cell(row=1, column=index)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center
        sheet.column_dimensions[get_column_letter(index)].width = max(
            10, min(32, len(str(header)) + 4),
        )
    sheet.row_dimensions[1].height = 34
    sheet.freeze_panes = 'F2'   # ستون‌های شناسه و لیست بیمه همیشه دیده شوند

    for index, employee in enumerate(queryset, start=1):
        sheet.append(_row(index, employee))

    sheet.auto_filter.ref = f'A1:{get_column_letter(len(HEADERS))}{sheet.max_row}'
    return workbook
