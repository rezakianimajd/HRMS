"""موتور محاسباتی کیفیت و HSE (فاز ۳ بخش دوم) — توابع خالص و بدون دیتابیس.

* چرخهٔ وضعیت NCR، کسرکار (Punch) و رویداد HSE (قابل تست بدون دیتابیس)
* شاخص‌های بازرسی (نرخ قبولی)، NCR (باز/معوق/میانگین زمان بستن)
* پیشرفت لیست کسرکار و شاخص‌های HSE (روزهای بدون حادثه، LTIFR)
"""
from decimal import Decimal, ROUND_HALF_UP

# ------------------------------- چرخهٔ وضعیت‌ها -------------------------------

NCR_TRANSITIONS = {
    'open': {'correcting', 'verifying', 'cancelled'},
    'correcting': {'verifying', 'cancelled'},
    'verifying': {'closed', 'correcting', 'cancelled'},
    'closed': {'verifying'},
    'cancelled': {'open'},
}

PUNCH_TRANSITIONS = {
    'open': {'in_progress', 'fixed', 'rejected'},
    'in_progress': {'fixed', 'rejected'},
    'fixed': {'verified', 'in_progress', 'rejected'},
    'verified': {'in_progress'},
    'rejected': {'in_progress', 'fixed'},
}

HSE_TRANSITIONS = {
    'open': {'investigating', 'closed'},
    'investigating': {'closed', 'open'},
    'closed': {'investigating'},
}

PLAN_ITEM_TRANSITIONS = {
    'not_started': {'in_progress', 'passed', 'failed', 'waived'},
    'in_progress': {'passed', 'failed', 'waived'},
    'passed': {'in_progress'},
    'failed': {'in_progress', 'passed', 'waived'},
    'waived': {'in_progress'},
}


def _can(transitions, current, target):
    return target in transitions.get(current, set())


def _next(transitions, current):
    return sorted(transitions.get(current, set()))


def can_transition_ncr(current, target):
    return _can(NCR_TRANSITIONS, current, target)


def ncr_next_statuses(current):
    return _next(NCR_TRANSITIONS, current)


def can_transition_punch(current, target):
    return _can(PUNCH_TRANSITIONS, current, target)


def punch_next_statuses(current):
    return _next(PUNCH_TRANSITIONS, current)


def can_transition_hse(current, target):
    return _can(HSE_TRANSITIONS, current, target)


def hse_next_statuses(current):
    return _next(HSE_TRANSITIONS, current)


def can_transition_plan_item(current, target):
    return _can(PLAN_ITEM_TRANSITIONS, current, target)


def plan_item_next_statuses(current):
    return _next(PLAN_ITEM_TRANSITIONS, current)


# --------------------------------- ابزارها ---------------------------------

def _field(row, name, default=None):
    """خواندن فیلد از dict یا آبجکت (تست‌پذیری بدون ORM)."""
    if row is None:
        return default
    if isinstance(row, dict):
        return row.get(name, default)
    return getattr(row, name, default)


def _money(value):
    try:
        return Decimal(str(value or 0))
    except Exception:  # noqa: BLE001
        return Decimal('0')


def _round2(value):
    return float(Decimal(str(value or 0)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))


def _pct(part, whole, digits=1):
    if not whole:
        return 0.0
    return round(part / whole * 100, digits)


def is_overdue(due_date, today):
    """آیا سررسید گذشته است؟"""
    if not due_date or not today:
        return False
    return due_date < today


# --------------------------------- بازرسی‌ها ---------------------------------

def inspection_stats(inspections):
    """آمار بازرسی‌ها: تعداد، نتیجه‌ها و نرخ قبولی."""
    rows = list(inspections or [])
    passed = sum(1 for r in rows if _field(r, 'result') == 'pass')
    failed = sum(1 for r in rows if _field(r, 'result') == 'fail')
    conditional = sum(1 for r in rows if _field(r, 'result') == 'conditional')
    na = sum(1 for r in rows if _field(r, 'result') == 'na')
    done = passed + failed + conditional
    return {
        'total': len(rows),
        'done': done,
        'planned': sum(1 for r in rows if (_field(r, 'status') or 'planned') == 'planned'),
        'passed': passed,
        'failed': failed,
        'conditional': conditional,
        'na': na,
        'pass_rate': _pct(passed, done),
    }


def plan_progress(items):
    """پیشرفت ردیف‌های طرح بازرسی (ITP) و نقاط توقف باز."""
    rows = list(items or [])
    by_status = {}
    for row in rows:
        status = _field(row, 'status') or 'not_started'
        by_status[status] = by_status.get(status, 0) + 1
    passed = by_status.get('passed', 0)
    failed = by_status.get('failed', 0)
    waived = by_status.get('waived', 0)
    closed = passed + failed + waived
    pending_hold = sum(
        1 for r in rows
        if _field(r, 'point_type') == 'hold' and (_field(r, 'status') or 'not_started') not in ('passed', 'waived')
    )
    return {
        'total': len(rows),
        'by_status': by_status,
        'passed': passed,
        'failed': failed,
        'in_progress': by_status.get('in_progress', 0),
        'not_started': by_status.get('not_started', 0),
        'waived': waived,
        'closed': closed,
        'percent': _pct(closed, len(rows)),
        'pending_hold_points': pending_hold,
    }


# ------------------------------- عدم انطباق (NCR) -------------------------------

def ncr_stats(ncrs, today=None):
    """شاخص‌های NCR: باز، معوق، شدت‌ها و میانگین زمان بستن."""
    rows = list(ncrs or [])
    by_status = {}
    by_severity = {}
    cost = 0.0
    overdue = 0
    durations = []
    for row in rows:
        status = _field(row, 'status') or 'open'
        severity = _field(row, 'severity') or 'minor'
        by_status[status] = by_status.get(status, 0) + 1
        by_severity[severity] = by_severity.get(severity, 0) + 1
        cost += float(_money(_field(row, 'cost_impact')))
        if status not in ('closed', 'cancelled') and is_overdue(_field(row, 'due_date'), today):
            overdue += 1
        detected = _field(row, 'detected_date')
        closed = _field(row, 'closed_date')
        if detected and closed and closed >= detected:
            durations.append((closed - detected).days)
    open_count = sum(v for k, v in by_status.items() if k not in ('closed', 'cancelled'))
    return {
        'total': len(rows),
        'open': open_count,
        'closed': by_status.get('closed', 0),
        'cancelled': by_status.get('cancelled', 0),
        'critical': by_severity.get('critical', 0),
        'major': by_severity.get('major', 0),
        'overdue': overdue,
        'by_status': by_status,
        'by_severity': by_severity,
        'cost_impact': _round2(cost),
        'avg_close_days': round(sum(durations) / len(durations), 1) if durations else 0.0,
    }


# --------------------------------- کسرکارها ---------------------------------

def punch_stats(items, today=None):
    """آمار لیست کسرکار: باز، معوق، درصد تکمیل و هزینهٔ رفع."""
    rows = list(items or [])
    by_status = {}
    by_priority = {}
    cost = 0.0
    overdue = 0
    for row in rows:
        status = _field(row, 'status') or 'open'
        priority = _field(row, 'priority') or 'medium'
        by_status[status] = by_status.get(status, 0) + 1
        by_priority[priority] = by_priority.get(priority, 0) + 1
        cost += float(_money(_field(row, 'cost')))
        if status not in ('verified', 'rejected') and is_overdue(_field(row, 'due_date'), today):
            overdue += 1
    verified = by_status.get('verified', 0)
    rejected = by_status.get('rejected', 0)
    active = len(rows) - rejected
    return {
        'total': len(rows),
        'open': len(rows) - verified - rejected,
        'verified': verified,
        'rejected': rejected,
        'in_progress': by_status.get('in_progress', 0),
        'fixed': by_status.get('fixed', 0),
        'overdue': overdue,
        'by_status': by_status,
        'by_priority': by_priority,
        'cost': _round2(cost),
        'percent': _pct(verified, active),
    }


# ----------------------------------- HSE -----------------------------------

def hse_stats(incidents, today=None):
    """شاخص‌های HSE: روزهای بدون حادثه، LTI، LTIFR و روزهای از کارافتادگی."""
    rows = list(incidents or [])
    by_type = {}
    man_hours = 0
    lost_days = 0
    cost = 0.0
    dates = []
    lti_dates = []
    open_count = 0
    for row in rows:
        incident_type = _field(row, 'incident_type') or 'other'
        by_type[incident_type] = by_type.get(incident_type, 0) + 1
        man_hours += int(_field(row, 'man_hours') or 0)
        lost_days += int(_field(row, 'lost_days') or 0)
        cost += float(_money(_field(row, 'cost_impact')))
        if (_field(row, 'status') or 'open') != 'closed':
            open_count += 1
        row_date = _field(row, 'date')
        if row_date:
            dates.append(row_date)
            if incident_type == 'lost_time':
                lti_dates.append(row_date)
    last_date = max(dates) if dates else None
    last_lti = max(lti_dates) if lti_dates else None
    lti_count = by_type.get('lost_time', 0)
    return {
        'total': len(rows),
        'open': open_count,
        'closed': len(rows) - open_count,
        'near_miss': by_type.get('near_miss', 0),
        'lti': lti_count,
        'environmental': by_type.get('environmental', 0),
        'by_type': by_type,
        'lost_days': lost_days,
        'man_hours': man_hours,
        'ltifr': round(lti_count * 1_000_000 / man_hours, 2) if man_hours else 0.0,
        'last_incident_date': last_date.isoformat() if last_date else '',
        'last_lti_date': last_lti.isoformat() if last_lti else '',
        'days_since_last_incident': (today - last_date).days if (today and last_date) else '',
        'days_since_last_lti': (today - last_lti).days if (today and last_lti) else '',
        'cost_impact': _round2(cost),
    }


def quality_kpis(plans=None, inspections=None, ncrs=None, punch_items=None,
                 incidents=None, today=None):
    """شاخص‌های یکجای کیفیت/HSE یک پروژه."""
    return {
        'plans': plan_progress(plans),
        'inspections': inspection_stats(inspections),
        'ncr': ncr_stats(ncrs, today=today),
        'punch': punch_stats(punch_items, today=today),
        'hse': hse_stats(incidents, today=today),
    }
