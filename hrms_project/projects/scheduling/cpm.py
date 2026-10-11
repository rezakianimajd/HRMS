"""موتور CPM (فاز ۱) — زودترین/دیرترین، شناوری و مسیر بحرانی.

پیاده‌سازی **خالص** (بدون دیتابیس) با پیمایش رفت‌وبرگشت روی شبکهٔ وابستگی و
حساب روز کاری از طریق `CalendarSpec`. توابع این ماژول با داده‌های ساده
(dataclass) کار می‌کنند تا مستقل و تست‌پذیر باشند.
"""
from collections import deque
from dataclasses import dataclass, field

from projects.scheduling.workcal import CalendarSpec


class ScheduleCycleError(ValueError):
    """شبکهٔ وابستگی حلقه دارد (CPM تعریف نشده است)."""

    def __init__(self, labels):
        self.labels = list(labels)
        super().__init__('حلقه در شبکهٔ وابستگی: %s' % ' → '.join(str(x) for x in self.labels))


class ScheduleValidationError(ValueError):
    """دادهٔ زمان‌بندی نامعتبر (پیش‌نیاز ناشناخته، شناسهٔ تکراری…)."""


@dataclass
class CpmActivity:
    """نمای سبک یک فعالیت برای موتور CPM."""
    id: object
    code: str = ''
    name: str = ''
    duration: float = 0.0
    activity_type: str = 'task'          # task | milestone | summary | loe
    constraint_type: str = 'asap'        # asap | snet | fnlt | mso | mfo
    constraint_date: object = None
    calendar: object = None
    predecessors: list = field(default_factory=list)   # [(pred_id, rel_type, lag)]
    weight: float = 1.0
    planned_cost: float = 0.0
    percent_complete: float = 0.0
    actual_cost: float = 0.0

    def __post_init__(self):
        if self.activity_type == 'milestone':
            self.duration = 0.0
        if self.calendar is None:
            self.calendar = CalendarSpec()

    @property
    def label(self):
        return self.code or str(self.id)


def _index(activities):
    by_id = {}
    for activity in activities:
        if activity.id in by_id:
            raise ScheduleValidationError('شناسهٔ تکراری فعالیت: %s' % activity.id)
        by_id[activity.id] = activity
    return by_id


def _build_graph(by_id):
    pred = {aid: [] for aid in by_id}
    succ = {aid: [] for aid in by_id}
    for activity in by_id.values():
        for link in activity.predecessors or []:
            pid, rel_type, lag = (list(link) + ['fs', 0])[:3]
            if pid not in by_id:
                raise ScheduleValidationError(
                    'پیش‌نیاز %s برای فعالیت «%s» یافت نشد.' % (pid, activity.label),
                )
            if pid == activity.id:
                raise ScheduleCycleError([activity.label])
            rel_type = (rel_type or 'fs').lower()
            if rel_type not in ('fs', 'ss', 'ff', 'sf'):
                raise ScheduleValidationError('نوع وابستگی نامعتبر: %s' % rel_type)
            pred[activity.id].append((pid, rel_type, float(lag or 0)))
            succ[pid].append((activity.id, rel_type, float(lag or 0)))
    return pred, succ


def _topological_order(by_id, pred, succ):
    """مرتب‌سازی توپولوژیک (Kahn) با پیچیدگی O(V+E) — و تشخیص حلقه."""
    indegree = {aid: len(pred[aid]) for aid in by_id}
    queue = deque([aid for aid, deg in indegree.items() if deg == 0])
    order = []
    while queue:
        current = queue.popleft()
        order.append(current)
        for (nxt, _rel, _lag) in succ[current]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)
    if len(order) != len(by_id):
        remaining = [by_id[aid].label for aid in by_id if indegree[aid] > 0]
        raise ScheduleCycleError(remaining)
    return order


def _forward_pass(order, by_id, pred, project_start):
    """گذر رفت: ES/EF با احتساب تقویم، نوع وابستگی، Lag و محدودیت‌ها."""
    result = {}
    for aid in order:
        activity = by_id[aid]
        calendar = activity.calendar
        candidates = [calendar.next_working(project_start)]

        for (pid, rel_type, lag) in pred[aid]:
            prev = result[pid]
            if rel_type == 'fs':
                candidates.append(calendar.add_working_days(prev['ef'], 1 + lag))
            elif rel_type == 'ss':
                candidates.append(calendar.add_working_days(prev['es'], lag))
            elif rel_type == 'ff':
                candidates.append(
                    calendar.start_from_finish(calendar.add_working_days(prev['ef'], lag), activity.duration)
                )
            else:  # sf
                candidates.append(
                    calendar.start_from_finish(calendar.add_working_days(prev['es'], lag), activity.duration)
                )

        es = max(candidates)
        if activity.constraint_date:
            if activity.constraint_type == 'snet':
                es = max(es, calendar.next_working(activity.constraint_date))
            elif activity.constraint_type == 'mso':
                es = calendar.next_working(activity.constraint_date)
        result[aid] = {'es': es, 'ef': calendar.finish_from(es, activity.duration)}
    return result


def _backward_pass(order, by_id, succ, result, project_finish):
    """گذر برگشت: LS/LF با احتساب وابستگی‌ها و محدودیت‌های تاریخی."""
    for aid in reversed(order):
        activity = by_id[aid]
        calendar = activity.calendar
        lf_candidates = [project_finish]
        ls_candidates = []

        for (sid, rel_type, lag) in succ[aid]:
            nxt = result[sid]
            if rel_type == 'fs':
                lf_candidates.append(calendar.add_working_days(nxt['ls'], -1 - lag))
            elif rel_type == 'ss':
                ls_candidates.append(calendar.add_working_days(nxt['ls'], -lag))
            elif rel_type == 'ff':
                lf_candidates.append(calendar.add_working_days(nxt['lf'], -lag))
            else:  # sf
                ls_candidates.append(calendar.add_working_days(nxt['lf'], -lag))

        lf = min(lf_candidates)
        if ls_candidates:
            lf = min(lf, calendar.finish_from(min(ls_candidates), activity.duration))
        if activity.constraint_date:
            if activity.constraint_type == 'fnlt':
                lf = min(lf, calendar.prev_working(activity.constraint_date))
            elif activity.constraint_type == 'mfo':
                lf = calendar.prev_working(activity.constraint_date)

        result[aid]['ls'] = calendar.start_from_finish(lf, activity.duration)
        result[aid]['lf'] = lf
    return result


def compute_cpm(activities, project_start, project_finish=None):
    """اجرای CPM و برگرداندن نتیجهٔ کامل.

    خروجی:
        {
          'project_start': date, 'project_finish': date,
          'critical_path': [ids...],
          'results': {id: {es, ef, ls, lf, total_float, is_critical, free_float}},
        }
    """
    by_id = _index(activities)
    if not by_id:
        return {
            'project_start': project_start, 'project_finish': project_start,
            'critical_path': [], 'results': {},
        }

    pred, succ = _build_graph(by_id)
    order = _topological_order(by_id, pred, succ)

    first_calendar = next(iter(by_id.values())).calendar
    result = _forward_pass(order, by_id, pred, first_calendar.next_working(project_start))

    finish = project_finish or max(item['ef'] for item in result.values())
    _backward_pass(order, by_id, succ, result, finish)

    results = {}
    for aid, row in result.items():
        activity = by_id[aid]
        calendar = activity.calendar
        if row['ls'] and row['ls'] >= row['es']:
            total_float = max(0.0, calendar.working_days_between(row['es'], row['ls']) - 1)
        else:
            total_float = 0.0

        free_float = total_float
        for (sid, rel_type, _lag) in succ[aid]:
            if rel_type == 'fs' and result[sid]['es'] > row['ef']:
                gap = calendar.working_days_between(row['ef'], result[sid]['es']) - 2
                free_float = min(free_float, max(0.0, gap))

        results[aid] = {
            'es': row['es'],
            'ef': row['ef'],
            'ls': row['ls'],
            'lf': row['lf'],
            'total_float': round(total_float, 2),
            'free_float': round(free_float, 2),
            'is_critical': total_float <= 0.001,
        }

    critical_path = sorted(
        [aid for aid, row in results.items() if row['is_critical']],
        key=lambda aid: (results[aid]['es'], by_id[aid].code),
    )

    return {
        'project_start': min(row['es'] for row in results.values()),
        'project_finish': finish,
        'critical_path': critical_path,
        'results': results,
    }

