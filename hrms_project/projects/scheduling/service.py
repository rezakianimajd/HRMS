"""سرویس‌های فاز ۱ — اتصال مدل‌ها به موتورهای CPM/EVM.

* `recalculate_schedule` → اجرای CPM و ذخیرهٔ نتایج روی فعالیت‌ها
* `freeze_baseline` → قفل برنامهٔ فعلی به‌عنوان بیس‌لاین نسخه‌دار
* `project_evm` → شاخص‌های EVM + منحنی S (سطل‌گذاری ماه شمسی)
* `resource_histogram` → بار روزانهٔ منابع و هشدار بیش‌تخصیص
* `gantt_payload` → دادهٔ آمادهٔ صفحهٔ گانت (راست‌به‌چپ شمسی)
"""
from datetime import date, timedelta

from django.db import transaction
from django.db.models import Sum

from projects.jalali_utils import jalali_full, jalali_period_fields
from projects.schedule_models import (
    Activity, ActivityProgress, ActivityRelationship, Baseline, BaselineActivity,
    CalendarException, ResourceAssignment, WorkCalendar,
)
from projects.scheduling.cpm import CpmActivity, compute_cpm
from projects.scheduling.evm import (
    budget_at_completion, compute_metrics, earned_value, monthly_last_points,
    physical_percent, planned_value_at, s_curve,
)
from projects.scheduling.workcal import CalendarSpec, build_calendar_spec


# ---------------------------------------------------------------- تقویم
def _exceptions_map(calendar_obj):
    if calendar_obj is None:
        return {}
    return {
        exc.date: {'is_working': exc.is_working, 'hours': float(exc.hours or 0)}
        for exc in CalendarException.objects.filter(calendar=calendar_obj)
    }


def resolve_calendar(project, activity_calendar=None):
    if activity_calendar is not None:
        return activity_calendar
    return (
        WorkCalendar.objects.filter(project=project, is_default=True).first()
        or WorkCalendar.objects.filter(project=project).first()
        or WorkCalendar.objects.filter(project__isnull=True, is_default=True).first()
        or WorkCalendar.objects.filter(project__isnull=True).first()
    )


def calendar_spec_for(project, activity_calendar=None):
    calendar_obj = resolve_calendar(project, activity_calendar)
    return build_calendar_spec(calendar_obj, _exceptions_map(calendar_obj)), calendar_obj


# ---------------------------------------------------------------- CPM
def load_cpm_activities(project):
    """ساخت ورودی موتور CPM از داده‌های دیتابیس."""
    specs = {}
    for activity in Activity.objects.filter(project=project).select_related('calendar'):
        spec, _cal_obj = calendar_spec_for(project, activity.calendar)
        specs[activity.id] = CpmActivity(
            id=activity.id,
            code=activity.code,
            name=activity.name,
            duration=float(activity.duration_days or 0),
            activity_type=activity.activity_type,
            constraint_type=activity.constraint_type,
            constraint_date=activity.constraint_date,
            calendar=spec,
            weight=float(activity.weight or 1),
            planned_cost=float(activity.planned_cost or 0),
            percent_complete=float(activity.percent_complete or 0),
            actual_cost=float(activity.actual_cost or 0),
        )
    for rel in ActivityRelationship.objects.filter(project=project):
        target = specs.get(rel.successor_id)
        if target is not None and rel.predecessor_id in specs:
            target.predecessors.append(
                (rel.predecessor_id, rel.rel_type, float(rel.lag_days or 0)),
            )
    return list(specs.values())


def recalculate_schedule(project, project_start=None, project_finish=None):
    """اجرای CPM و ذخیرهٔ نتایج (bulk_update) — برگرداندن خلاصه."""
    start = project_start or project.start_date or date.today()
    specs = load_cpm_activities(project)
    result = compute_cpm(specs, start, project_finish=project_finish)
    rows = result['results']

    updates = []
    for activity in Activity.objects.filter(project=project):
        row = rows.get(activity.id)
        if not row:
            continue
        activity.early_start = row['es']
        activity.early_finish = row['ef']
        activity.late_start = row['ls']
        activity.late_finish = row['lf']
        activity.total_float = row['total_float']
        activity.is_critical = row['is_critical']
        updates.append(activity)

    with transaction.atomic():
        if updates:
            Activity.objects.bulk_update(
                updates,
                ['early_start', 'early_finish', 'late_start', 'late_finish',
                 'total_float', 'is_critical'],
                batch_size=500,
            )

    return {
        'project_start': result['project_start'].isoformat() if result['project_start'] else None,
        'project_finish': result['project_finish'].isoformat() if result['project_finish'] else None,
        'activities': len(specs),
        'updated': len(updates),
        'critical_count': len(result['critical_path']),
        'critical_path': result['critical_path'],
    }


# ---------------------------------------------------------------- بیس‌لاین
def current_baseline(project):
    return (
        Baseline.objects.filter(project=project, is_current=True).order_by('-version').first()
        or Baseline.objects.filter(project=project).order_by('-version').first()
    )


@transaction.atomic
def freeze_baseline(project, name=None, note=''):
    """قفل وضعیت فعلی برنامه به‌عنوان بیس‌لاین نسخه‌دار (مبنای EVM)."""
    activities = list(Activity.objects.filter(project=project))
    if not activities:
        raise ValueError('برای قفل بیس‌لاین، ابتدا فعالیت‌های پروژه را تعریف کنید.')

    last = Baseline.objects.filter(project=project).order_by('-version').first()
    version = (last.version + 1) if last else 1
    Baseline.objects.filter(project=project, is_current=True).update(is_current=False)

    baseline = Baseline.objects.create(
        company=project.company, project=project,
        name=name or f'بیس‌لاین {version}', version=version, is_current=True, note=note or '',
    )

    items, total, starts, finishes = [], 0.0, [], []
    for activity in activities:
        total += float(activity.planned_cost or 0)
        if activity.early_start:
            starts.append(activity.early_start)
        if activity.early_finish:
            finishes.append(activity.early_finish)
        items.append(BaselineActivity(
            company=project.company, baseline=baseline, activity=activity,
            code=activity.code, name=activity.name,
            early_start=activity.early_start, early_finish=activity.early_finish,
            late_start=activity.late_start, late_finish=activity.late_finish,
            duration_days=activity.duration_days, total_float=activity.total_float,
            planned_cost=activity.planned_cost, weight=activity.weight,
        ))
    BaselineActivity.objects.bulk_create(items, batch_size=500)

    baseline.total_cost = total
    baseline.start_date = min(starts) if starts else None
    baseline.end_date = max(finishes) if finishes else None
    baseline.save(update_fields=['total_cost', 'start_date', 'end_date'])
    return baseline


# ---------------------------------------------------------------- EVM
def _eval_items(project, baseline=None, as_of=None):
    """ردیف‌های ارزیابی: از بیس‌لاین (اگر باشد) وگرنه از فعالیت‌های فعلی + پیشرفت تا `as_of`."""
    as_of = as_of or date.today()
    rows = []
    if baseline is not None:
        source = 'baseline'
        for item in BaselineActivity.objects.filter(baseline=baseline):
            rows.append({
                'id': item.activity_id, 'code': item.code, 'name': item.name,
                'planned_cost': float(item.planned_cost or 0),
                'early_start': item.early_start, 'early_finish': item.early_finish,
                'weight': float(item.weight or 1), 'percent_complete': 0.0,
            })
    else:
        source = 'activities'
        for activity in Activity.objects.filter(project=project):
            rows.append({
                'id': activity.id, 'code': activity.code, 'name': activity.name,
                'planned_cost': float(activity.planned_cost or 0),
                'early_start': activity.early_start, 'early_finish': activity.early_finish,
                'weight': float(activity.weight or 1),
                'percent_complete': float(activity.percent_complete or 0),
            })

    latest = {}
    for entry in ActivityProgress.objects.filter(
        activity__project=project, date__lte=as_of,
    ).order_by('date'):
        latest[entry.activity_id] = float(entry.percent_complete or 0)
    for row in rows:
        if row['id'] in latest:
            row['percent_complete'] = latest[row['id']]
    return rows, source


def project_evm(project, as_of=None, baseline=None):
    """شاخص‌های EVM + منحنی S (با سطل‌گذاری ماه شمسی)."""
    as_of = as_of or date.today()
    baseline = baseline or current_baseline(project)
    items, source = _eval_items(project, baseline, as_of)

    ac_total = float(
        Activity.objects.filter(project=project).aggregate(s=Sum('actual_cost'))['s'] or 0
    )
    metrics = compute_metrics(
        budget_at_completion(items),
        planned_value_at(items, as_of),
        earned_value(items),
        ac_total,
    )
    metrics.update({
        'as_of': as_of.isoformat(),
        'source': source,
        'baseline_id': baseline.id if baseline else None,
        'baseline_name': baseline.name if baseline else None,
        'physical_percent': physical_percent(items),
        'items_count': len(items),
    })

    progress_entries = [
        {'activity_id': e.activity_id, 'date': e.date,
         'percent_complete': float(e.percent_complete or 0)}
        for e in ActivityProgress.objects.filter(activity__project=project).order_by('date')
    ]
    actual_entries = [
        {'date': a.actual_start or a.early_start, 'amount': float(a.actual_cost or 0)}
        for a in Activity.objects.filter(project=project)
        if (a.actual_start or a.early_start)
    ]

    daily = s_curve(items, progress_entries, actual_entries, step_days=7)
    curve = []
    for row in monthly_last_points(daily) if daily else []:
        period = jalali_period_fields(row['date'])
        curve.append({
            **row,
            'date': row['date'].isoformat(),
            'month': period['month'],
            'month_short': period['month_short'],
            'month_label': period['month_label'],
            'jy': period['jy'],
            'jm': period['jm'],
        })

    return {'metrics': metrics, 'curve': curve}


# ---------------------------------------------------------------- منابع
def resource_histogram(project, date_from=None, date_to=None):
    """بار روزانهٔ منابع و هشدار بیش‌تخصیص (بر پایهٔ `Resource.daily_capacity`)."""
    assignments = list(
        ResourceAssignment.objects.filter(activity__project=project).select_related('activity', 'resource')
    )
    if not assignments:
        return {'days': [], 'overallocated': [], 'resources': [], 'max_load': 0}

    bounds = [a.activity.early_start for a in assignments if a.activity.early_start]
    bounds += [a.activity.early_finish for a in assignments if a.activity.early_finish]
    start = date_from or (min(bounds) if bounds else date.today())
    end = date_to or (max(bounds) if bounds else start)

    load = {}
    for assignment in assignments:
        activity = assignment.activity
        if not (activity.early_start and activity.early_finish):
            continue
        calendar, _ = calendar_spec_for(project, activity.calendar)
        cursor = activity.early_start
        while cursor <= activity.early_finish:
            if calendar.is_working(cursor):
                key = (assignment.resource_id, cursor)
                load[key] = load.get(key, 0.0) + float(assignment.units_per_day or 0)
            cursor += timedelta(days=1)

    days = []
    cursor = start
    while cursor <= end:
        total = sum(value for (rid, day), value in load.items() if day == cursor)
        days.append({'date': cursor.isoformat(), 'total': round(total, 2)})
        cursor += timedelta(days=1)

    overallocated = []
    seen, resources = set(), []
    for assignment in assignments:
        resource = assignment.resource
        if resource.id not in seen:
            seen.add(resource.id)
            resources.append({
                'id': resource.id, 'name': str(resource),
                'capacity': float(resource.daily_capacity or 0),
            })
        capacity = float(resource.daily_capacity or 0)
        if capacity <= 0:
            continue
        cursor = start
        while cursor <= end:
            current = load.get((resource.id, cursor), 0.0)
            if current > capacity:
                overallocated.append({
                    'resource_id': resource.id, 'resource': str(resource),
                    'date': cursor.isoformat(),
                    'load': round(current, 2), 'capacity': capacity,
                })
            cursor += timedelta(days=1)

    return {
        'days': days,
        'overallocated': overallocated,
        'resources': resources,
        'max_load': round(max([d['total'] for d in days] or [0]), 2),
    }


# ---------------------------------------------------------------- گانت
def gantt_payload(project, include_baseline=True):
    """دادهٔ آمادهٔ صفحهٔ گانت: فعالیت‌ها (با برچسب شمسی)، وابستگی‌ها و بیس‌لاین."""
    activities = list(
        Activity.objects.filter(project=project).select_related('wbs').order_by('sequence', 'code')
    )
    baseline = current_baseline(project) if include_baseline else None
    base_map = {}
    if baseline:
        base_map = {
            item.activity_id: item
            for item in BaselineActivity.objects.filter(baseline=baseline)
        }

    rows = []
    for activity in activities:
        base = base_map.get(activity.id)
        rows.append({
            'id': activity.id,
            'code': activity.code,
            'name': activity.name,
            'activity_type': activity.activity_type,
            'wbs_id': activity.wbs_id,
            'wbs_name': activity.wbs.name if activity.wbs_id else '',
            'duration_days': float(activity.duration_days or 0),
            'start': activity.early_start.isoformat() if activity.early_start else None,
            'finish': activity.early_finish.isoformat() if activity.early_finish else None,
            'start_jalali': jalali_full(activity.early_start),
            'finish_jalali': jalali_full(activity.early_finish),
            'late_start_jalali': jalali_full(activity.late_start),
            'late_finish_jalali': jalali_full(activity.late_finish),
            'total_float': float(activity.total_float or 0),
            'is_critical': bool(activity.is_critical),
            'percent_complete': float(activity.percent_complete or 0),
            'planned_cost': float(activity.planned_cost or 0),
            'actual_cost': float(activity.actual_cost or 0),
            'constraint_type': activity.constraint_type,
            'constraint_date': activity.constraint_date.isoformat() if activity.constraint_date else None,
            'baseline_start': base.early_start.isoformat() if base and base.early_start else None,
            'baseline_finish': base.early_finish.isoformat() if base and base.early_finish else None,
            'predecessors': [
                {'id': link.predecessor_id, 'rel_type': link.rel_type,
                 'lag_days': float(link.lag_days or 0)}
                for link in activity.predecessor_links.all()
            ],
        })

    calendars = [
        {
            'id': cal.id, 'name': cal.name, 'project_id': cal.project_id,
            'working_days': cal.working_days or [5, 6, 0, 1, 2, 3],
            'half_working_days': cal.half_working_days or [],
            'hours_per_day': float(cal.hours_per_day or 8),
            'is_default': cal.is_default,
        }
        for cal in (
            WorkCalendar.objects.filter(project__isnull=True) | WorkCalendar.objects.filter(project=project)
        )
    ]

    return {
        'project': {
            'id': project.id, 'code': project.code, 'name': project.name,
            'start_date': project.start_date.isoformat() if project.start_date else None,
        },
        'activities': rows,
        'calendars': calendars,
        'baseline': (
            {
                'id': baseline.id, 'name': baseline.name, 'version': baseline.version,
                'total_cost': float(baseline.total_cost or 0),
                'start_date': baseline.start_date.isoformat() if baseline.start_date else None,
                'end_date': baseline.end_date.isoformat() if baseline.end_date else None,
            } if baseline else None
        ),
        'counts': {
            'activities': len(rows),
            'milestones': len([r for r in rows if r['activity_type'] == 'milestone']),
            'critical': len([r for r in rows if r['is_critical']]),
        },
    }



