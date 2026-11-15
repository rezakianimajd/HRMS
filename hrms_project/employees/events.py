"""موتور گزارش «رویدادها» در منابع انسانی.

رویدادها از پروندهٔ پرسنل و اعضای خانواده (تحت تکفل) ساخته می‌شوند:
تولد پرسنل، تولد تحت تکفل، سالگرد استخدام و پایان قرارداد.
این ماژول خالص است (بدون کوئری/دیتابیس) تا با SimpleTestCase تست شود؛
view فقط داده‌های مدل را به توابع همین فایل می‌دهد.
"""
from __future__ import annotations

from datetime import date, datetime

try:  # تاریخ شمسی
    from jdatetime import date as jdate
except ImportError:  # pragma: no cover
    jdate = None

EVENT_KINDS = {
    'employee_birthday': {'label': 'تولد پرسنل', 'color': '#0ea5e9', 'family': 'birthday'},
    'dependent_birthday': {'label': 'تولد تحت تکفل', 'color': '#be185d', 'family': 'birthday'},
    'hire_anniversary': {'label': 'سالگرد استخدام', 'color': '#10b981', 'family': 'anniversary'},
    'contract_end': {'label': 'پایان قرارداد', 'color': '#f59e0b', 'family': 'contract'},
}

DEFAULT_KINDS = ('employee_birthday', 'dependent_birthday', 'contract_end')

USER_RELATION_LABELS = {
    'employee': 'پرسنل',
    'spouse': 'همسر',
    'child': 'فرزند',
    'father': 'پدر',
    'mother': 'مادر',
    'sibling': 'خواهر / برادر',
    'other': 'سایر',
}

PERSON_TYPE_LABELS = {'employee': 'پرسنل', 'dependent': 'تحت تکفل'}


def as_date(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def jalali(value):
    value = as_date(value)
    if not value:
        return ''
    if jdate is None:
        return value.isoformat()
    try:
        converted = jdate.fromgregorian(date=value)
        return f'{converted.year:04d}/{converted.month:02d}/{converted.day:02d}'
    except Exception:  # noqa: BLE001
        return value.isoformat()


def safe_date(year, month, day):
    try:
        return date(year, month, day)
    except ValueError:
        if month == 2 and day == 29:
            return date(year, 3, 1)
        return None


def next_anniversary(value, today=None):
    """سالگرد/تولد بعدی (امروز یا بعد از امروز)."""
    value = as_date(value)
    today = as_date(today) or date.today()
    if not value:
        return None
    for year in (today.year, today.year + 1):
        candidate = safe_date(year, value.month, value.day)
        if candidate and candidate >= today:
            return candidate
    return None


def age_on(birth, on_date):
    birth = as_date(birth)
    on_date = as_date(on_date)
    if not birth or not on_date or on_date < birth:
        return None
    years = on_date.year - birth.year
    if (on_date.month, on_date.day) < (birth.month, birth.day):
        years -= 1
    return years if years >= 0 else None


def days_until(value, today=None):
    value = as_date(value)
    today = as_date(today) or date.today()
    if not value:
        return None
    return (value - today).days


def _name(employee):
    full = getattr(employee, 'full_name', '') or ''
    if full:
        return full.strip()
    return f'{getattr(employee, "first_name", "")} {getattr(employee, "last_name", "")}'.strip()


def _related_name(obj, attr):
    related = getattr(obj, attr, None)
    return getattr(related, 'name', '') or ''


def _employee_base(employee):
    return {
        'employee_db_id': getattr(employee, 'id', None),
        'employee_code': getattr(employee, 'employee_id', '') or '',
        'employee_name': _name(employee),
        'department': _related_name(employee, 'department'),
        'position': _related_name(employee, 'job_title'),
        'mobile': getattr(employee, 'mobile', '') or '',
        'gender': getattr(employee, 'gender', '') or '',
        'contract_end_date': as_date(getattr(employee, 'contract_end_date', None)),
    }


def jalali_parts(value):
    value = as_date(value)
    if not value:
        return None, None, None
    if jdate is None:
        return value.year, value.month, value.day
    try:
        converted = jdate.fromgregorian(date=value)
        return converted.year, converted.month, converted.day
    except Exception:  # noqa: BLE001
        return value.year, value.month, value.day


def _row(kind, event_date, today, **extra):
    meta = EVENT_KINDS.get(kind, {'label': kind, 'color': '#64748b', 'family': 'other'})
    event_date = as_date(event_date)
    jy, jm, _jd = jalali_parts(event_date)
    row = {
        'kind': kind,
        'kind_label': meta['label'],
        'kind_color': meta['color'],
        'event_date': event_date.isoformat() if event_date else '',
        'event_jalali': jalali(event_date),
        'event_month': jm,
        'event_year': jy,
        'event_gregorian_month': event_date.month if event_date else None,
        'days_until': days_until(event_date, today),
    }
    row.update(extra)
    return row
def _employee_events(employee, kinds, today):
    rows = []
    base = _employee_base(employee)
    birth = as_date(getattr(employee, 'birth_date', None))
    hire = as_date(getattr(employee, 'hire_date', None))
    contract_end = base.get('contract_end_date')

    if 'employee_birthday' in kinds and birth:
        event_date = next_anniversary(birth, today)
        rows.append(_row(
            'employee_birthday', event_date, today,
            person_type='employee', person_type_label=PERSON_TYPE_LABELS['employee'],
            person_id=base['employee_db_id'], person_name=base['employee_name'],
            relation='employee', relation_label=USER_RELATION_LABELS['employee'],
            birth_date=birth.isoformat(), age=age_on(birth, today),
            turning_age=age_on(birth, event_date), is_dependent=False,
            **base,
        ))

    if 'hire_anniversary' in kinds and hire:
        event_date = next_anniversary(hire, today)
        rows.append(_row(
            'hire_anniversary', event_date, today,
            person_type='employee', person_type_label=PERSON_TYPE_LABELS['employee'],
            person_id=base['employee_db_id'], person_name=base['employee_name'],
            relation='employee', relation_label=USER_RELATION_LABELS['employee'],
            hire_date=hire.isoformat(), years_of_service=age_on(hire, event_date),
            is_dependent=False, **base,
        ))

    if 'contract_end' in kinds and contract_end:
        rows.append(_row(
            'contract_end', contract_end, today,
            person_type='employee', person_type_label=PERSON_TYPE_LABELS['employee'],
            person_id=base['employee_db_id'], person_name=base['employee_name'],
            relation='employee', relation_label=USER_RELATION_LABELS['employee'],
            is_dependent=False, **base,
        ))
    return rows


def _dependent_events(member, kinds, today):
    if 'dependent_birthday' not in kinds:
        return []
    birth = as_date(getattr(member, 'birth_date', None))
    if not birth:
        return []
    employee = getattr(member, 'employee', None)
    if employee is None:
        return []
    base = _employee_base(employee)
    relation = getattr(member, 'relation', '') or 'other'
    full_name = f'{getattr(member, "first_name", "")} {getattr(member, "last_name", "")}'.strip()
    event_date = next_anniversary(birth, today)
    return [_row(
        'dependent_birthday', event_date, today,
        person_type='dependent', person_type_label=PERSON_TYPE_LABELS['dependent'],
        person_id=getattr(member, 'id', None), person_name=full_name or '—',
        relation=relation, relation_label=USER_RELATION_LABELS.get(relation, relation),
        birth_date=birth.isoformat(), age=age_on(birth, today),
        turning_age=age_on(birth, event_date),
        is_dependent=bool(getattr(member, 'is_dependent', True)),
        **base,
    )]


def _matches(row, *, scope, relation, employee, department, month,
             within_days, date_from, date_to, term):
    person_type = row.get('person_type')
    if scope == 'employees' and person_type != 'employee':
        return False
    if scope == 'dependents' and person_type != 'dependent':
        return False
    if relation:
        if relation == 'employee' and person_type != 'employee':
            return False
        if relation != 'employee' and row.get('relation') != relation:
            return False
    if employee and str(row.get('employee_db_id') or '') != str(employee):
        return False
    if department and str(row.get('department') or '') != str(department):
        return False
    if month and row.get('event_month') != int(month):
        return False
    days = row.get('days_until')
    if within_days not in (None, '') and days is not None:
        try:
            if not (0 <= days <= int(within_days)):
                return False
        except (TypeError, ValueError):
            pass
    event_date = as_date(row.get('event_date'))
    if date_from and event_date and event_date < date_from:
        return False
    if date_to and event_date and event_date > date_to:
        return False
    if term:
        haystack = ' '.join(str(row.get(key) or '') for key in (
            'person_name', 'employee_name', 'employee_code', 'department', 'position',
            'relation_label', 'kind_label', 'mobile',
        )).lower()
        if term not in haystack:
            return False
    return True

def collect_event_rows(
    employees, family_members, *, kinds=None, scope='all', relation='',
    employee=None, department=None, month=None, within_days=None,
    date_from=None, date_to=None, search='', today=None,
):
    """ساخت و فیلتر ردیف‌های رویداد؛ لیست مرتب بر اساس تاریخ رویداد."""
    today = as_date(today) or date.today()
    requested = set(kinds or DEFAULT_KINDS)
    requested &= set(EVENT_KINDS)
    if not requested:
        requested = set(DEFAULT_KINDS)

    rows = []
    for emp in employees or []:
        rows.extend(_employee_events(emp, requested, today))
    for member in family_members or []:
        rows.extend(_dependent_events(member, requested, today))

    from_date = as_date(date_from)
    to_date = as_date(date_to)
    term = (search or '').strip().lower()
    filtered = [
        row for row in rows
        if _matches(
            row, scope=scope, relation=relation, employee=employee,
            department=department, month=month, within_days=within_days,
            date_from=from_date, date_to=to_date, term=term,
        )
    ]
    filtered.sort(key=lambda row: (
        row.get('event_date') or '9999-12-31',
        row.get('kind') or '',
        row.get('person_name') or '',
    ))

    month_today = jalali_parts(today)[1]
    summary = {
        'total': len(filtered),
        'employees': len({row['employee_db_id'] for row in filtered if row.get('employee_db_id')}),
        'dependents': len([row for row in filtered if row.get('person_type') == 'dependent']),
        'birthdays_this_month': len([
            row for row in filtered
            if EVENT_KINDS.get(row.get('kind'), {}).get('family') == 'birthday'
            and row.get('event_month') == month_today
        ]),
        'upcoming_30': len([
            row for row in filtered
            if row.get('days_until') is not None and 0 <= row['days_until'] <= 30
        ]),
        'contract_end_90': len([
            row for row in filtered
            if row.get('kind') == 'contract_end'
            and row.get('days_until') is not None and 0 <= row['days_until'] <= 90
        ]),
    }
    return filtered, summary

