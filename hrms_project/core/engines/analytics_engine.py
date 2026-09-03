"""
Analytics Engine — multi-step/cross-cutting HR analysis (offline, rule-based).
Answers higher-level questions that combine several records:

  * best manager team (by average score)
  * average age/tenure per department
  * org-chart depth and widest span of control
  * average salary per department
  * highest-overtime / lowest-pay employees
  * cost per employee per department
  * likely resignation within next 6 months
  * risk-score / correlation-style patterns across tenure/gender/education
  * high-performance + high-tenure + underpaid staff

No ML / embed / internet. Pure Python + Django ORM.
"""
from datetime import date, timedelta
from collections import defaultdict

_DIGITS = '۰۱۲۳۴۵۶۷۸۹'


def fa_num(n):
    """Convert number/string digits to Persian digits."""
    if n is None:
        return '۰'
    if isinstance(n, float):
        n = round(n, 1)
    return ''.join(_DIGITS[int(c)] if c.isdigit() else c for c in str(n))


def age_on(birth):
    if not birth:
        return None
    today = date.today()
    return today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))


def tenure_years(hire):
    if not hire:
        return None
    today = date.today()
    return (today - hire).days / 365.25


def _money(v):
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0.0


def _avg(values):
    vals = [v for v in values if v is not None]
    return sum(vals) / len(vals) if vals else None


# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------
def _load_employees(company=None, active=True):
    from employees.models import Employee
    qs = Employee.objects.select_related(
        'department', 'job_title', 'work_location', 'contract_type'
    )
    if company:
        qs = qs.filter(company=company)
    if active:
        qs = qs.filter(is_active=True)
    return list(qs)


def _score_of(emp, company=None):
    """Overall score using the existing ScoringEngine (or None if unavailable)."""
    try:
        from employees.engines.scoring_engine import ScoringEngine
        res = ScoringEngine().score_employee(emp, company=company)
        return float(res.get('total_score', 0) or 0)
    except Exception:
        # Fallback: weighted simple score
        total = 0.0
        weights = 0
        if emp.performance_score is not None:
            total += float(emp.performance_score or 0)
            weights += 1
        if emp.satisfaction_score is not None:
            total += float(emp.satisfaction_score or 0)
            weights += 1
        return round(total / weights, 1) if weights else None


def _latest_payroll_rows(emp_ids, company=None):
    """
    Return dict employee_id -> latest (by year desc, month desc) SalaryRecord.
    """
    from payroll.models import SalaryRecord
    rows = SalaryRecord.objects.filter(employee_id__in=emp_ids)
    if company:
        rows = rows.filter(company=company)
    if not emp_ids:
        return {}
    out = {}
    for rec in rows.order_by('-year', '-month'):
        # order_by gives the newest first, first occurrence per employee is latest
        if rec.employee_id not in out:
            out[rec.employee_id] = rec
    # Convert to floats quickly
    for eid, rec in out.items():
        _ = eid  # keep rec
    return out


# ---------------------------------------------------------------------------
# 1) Best-performing manager team
# ---------------------------------------------------------------------------
def managers_best_team(company=None):
    from orgchart.models import Position

    positions = list(Position.objects.select_related('department').all())
    if company:
        positions = [p for p in positions if p.company_id == (company.id if company else None)
                     or (getattr(p, 'company_id', None) == company.id)]

    pos_children = defaultdict(list)
    for p in positions:
        if p.parent_id:
            pos_children[p.parent_id].append(p)

    emp_scores = {}
    employees = _load_employees(company)

    def get_score(eid):
        if eid not in emp_scores:
            emp_scores[eid] = None
            for e in employees:
                if e.id == eid:
                    emp_scores[eid] = _score_of(e, company)
                    break
        return emp_scores[eid]

    teams = []
    for root in positions:
        if root.parent_id is not None:
            continue
        # gather all descendant occupants recursively
        team_eids = []
        stack = list(pos_children.get(root.id, []))
        seen_pos = set()
        while stack:
            child = stack.pop()
            if child.id in seen_pos:
                continue
            seen_pos.add(child.id)
            for occ in child.occupants.all():
                team_eids.append(occ.id)
            stack.extend(pos_children.get(child.id, []))
        if not team_eids:
            continue
        scores = [s for s in (get_score(eid) for eid in team_eids) if s is not None]
        avg = sum(scores) / len(scores) if scores else None
        managers = list(root.occupants.all())
        for m in managers:
            teams.append((avg, m, len(team_eids)))

    teams = [t for t in teams if t[0] is not None]
    if not teams:
        return None
    teams.sort(key=lambda x: (-x[0], -x[2]))
    lines = ['🏆 بهترین میانگین امتیاز تیم (بر اساس مدیر سازمانی):']
    for avg, mgr, cnt in teams[:1]:
        lines.append(
            f'• {mgr.full_name} — میانگین تیم: {fa_num(avg)} از ۱۰۰ '
            f'({fa_num(cnt)} عضو زیرمجموعه)'
        )
    return {
        'type': 'analytics',
        'title': 'بهترین تیم',
        'answer': '\n'.join(lines),
    }


# ---------------------------------------------------------------------------
# 2) Average age & average tenure per department
# ---------------------------------------------------------------------------
def avg_age_tenure_by_dept(company=None):
    employees = _load_employees(company)
    by_dept = defaultdict(list)
    for e in employees:
        key = e.department.name if e.department else '(بدون بخش)'
        by_dept[key].append(e)
    if not by_dept:
        return None
    lines = ['📅 میانگین سن و سابقه کار به تفکیک دپارتمان:']
    out = []
    for name, emps in sorted(by_dept.items()):
        ages = [age_on(e.birth_date) for e in emps if age_on(e.birth_date) is not None]
        tenures = [tenure_years(e.hire_date) for e in emps if tenure_years(e.hire_date) is not None]
        avg_age = sum(ages) / len(ages) if ages else None
        avg_ten = sum(tenures) / len(tenures) if tenures else None
        out.append((name, avg_age, avg_ten, len(emps)))
    for name, a_age, a_ten, cnt in out:
        lines.append(
            f'• {name}: میانگین سن {fa_num(a_age or 0)} سال، '
            f'میانگین سابقه {fa_num(a_ten or 0)} سال ({fa_num(cnt)} نفر)'
        )
    return {'type': 'analytics', 'title': 'میانگین دپارتمانها', 'answer': '\n'.join(lines)}


# ---------------------------------------------------------------------------
# 3) Org chart depth + widest span of control
# ---------------------------------------------------------------------------
def orgchart_summary(company=None):
    from orgchart.models import Position

    positions = list(Position.objects.values(
        'id', 'title', 'parent_id', 'company_id'
    ))
    if company:
        positions = [p for p in positions if p.get('company_id') == company.id]

    if not positions:
        return {'type': 'analytics', 'title': 'باردهی', 'answer': 'هیچ پوزیشن سازمانی تعریف نشده است.'}

    children = defaultdict(list)
    for p in positions:
        if p['parent_id']:
            children[p['parent_id']].append(p)

    # max depth: longest root->leaf chain
    memo = {}

    def depth(p):
        if p['id'] in memo:
            return memo[p['id']]
        mx = 1
        for c in children[p['id']]:
            mx = max(mx, 1 + depth(c))
        memo[p['id']] = mx
        return mx

    max_depth = max((depth(p) for p in positions), default=1)
    # widest span (direct children count), and best manager occupant count fallback
    span_pos = max(positions, key=lambda p: len(children[p['id']]))
    widest = len(children[span_pos['id']])

    # manager name: occupant of widest position
    try:
        pos_obj = Position.objects.select_related('parent').get(id=span_pos['id'])
        managers = list(pos_obj.occupants.all()) if widest > 0 else []
        manager_name = managers[0].full_name if managers else span_pos['title']
    except Position.DoesNotExist:
        manager_name = span_pos['title']

    lines = [
        '🏢 ساختار چارت سازمانی:',
        f'• تعداد لایه‌ها: {fa_num(max_depth)} لایه',
        f'• بیشترین زیردست مستقیم (تیم): {manager_name} با {fa_num(widest)} پوزیشن بلافاصله',
    ]
    return {'type': 'analytics', 'title': 'چارت سازمانی', 'answer': '\n'.join(lines)}


# ---------------------------------------------------------------------------
# 4) Average salary / cost per dept & overtime/lowest-pay highlights
# ---------------------------------------------------------------------------
def salary_dept(company=None, cost_per_emp=False):
    employees = _load_employees(company)
    if not employees:
        return None
    ids = [e.id for e in employees]
    latest = _latest_payroll_rows(ids, company)

    hours_map, net_map = defaultdict(float), defaultdict(float)
    count_map = defaultdict(int)
    for e in employees:
        key = e.department.name if e.department else '(بدون بخش)'
        count_map[key] += 1
        rec = latest.get(e.id)
        if rec:
            net_map[key] += _money(rec.net_payable)
            if rec.overtime_hours:
                hours_map[key] += float(rec.overtime_hours or 0)

    lines = ['💰 میانگین {0} به تفکیک دپارتمان:'.format('هزینه سرانه' if cost_per_emp else 'حقوق خالص')]
    for key in count_map:
        net = net_map.get(key, 0)
        avg_net = net / count_map[key] if count_map[key] else 0
        lines.append(f'• {key}: {fa_num(round(avg_net))} ریال ({fa_num(count_map[key])} نفر)')
    return {'type': 'analytics', 'title': 'حقوق دپارتمانها', 'answer': '\n'.join(lines)}


def overtime_lowest_pay(company=None):
    employees = _load_employees(company)
    if not employees:
        return None
    ids = [e.id for e in employees]
    latest = _latest_payroll_rows(ids, company)

    rows = []
    for e in employees:
        rec = latest.get(e.id)
        rows.append((
            e,
            float(rec.overtime_hours or 0) if rec else 0.0,
            _money(rec.net_payable) if rec else 0.0,
        ))
    rows.sort(key=lambda r: (-r[1], r[2]))
    top_ot = rows[:3]
    rows.sort(key=lambda r: (r[2], -r[1]))
    low_pay = rows[:3]

    lines = ['⏱ بیشترین اضافهکار (و حقوق خالص):']
    for e, oh, net in top_ot:
        lines.append(f'• {e.full_name}: {fa_num(round(oh))} ساعت — {fa_num(round(net))} ریال')
    lines.append('')
    lines.append('💸 کمترین حقوق (و اضافهکار):')
    for e, oh, net in low_pay:
        lines.append(f'• {e.full_name}: {fa_num(round(net))} ریال — OT {fa_num(round(oh))} ساعت')
    return {'type': 'analytics', 'title': 'اضافهکار/حقوق', 'answer': '\n'.join(lines)}


# ---------------------------------------------------------------------------
# 5) Resignation forecast (next 6 months)
# ---------------------------------------------------------------------------
def likely_resign_in_6m(company=None):
    from payroll.models import SalaryRecord, EmployeeTransaction
    from employees.models import EmployeePenalty, EmploymentChange

    today = date.today()
    six_m = today + timedelta(days=180)
    employees = _load_employees(company)
    ids = [e.id for e in employees]
    latest = _latest_payroll_rows(ids, company)

    rows = []
    for e in employees:
        score = 0
        reasons = []
        # contract ending within 6 months
        if e.contract_end_date and today <= e.contract_end_date <= six_m:
            score += 30
            reasons.append('قرارداد تا ۶ ماه آینده تمام میشود')
        # low satisfaction
        if e.satisfaction_score is not None and float(e.satisfaction_score or 0) < 50:
            score += 25
            reasons.append('رضایت پایین')
        if e.performance_score is not None and float(e.performance_score or 0) < 50:
            score += 18
            reasons.append('عملکرد پایین')
        rec = latest.get(e.id)
        if rec:
            if float(rec.overtime_hours or 0) > 30:
                score += 8
                reasons.append('اضافهکار سنگین')
        # long tenure vs low score
        years = tenure_years(e.hire_date) or 0
        if years >= 10 and float(e.performance_score or 100) < 70:
            score += 8
            reasons.append('سابقه بالا ولی عملکرد متوسط')
        if score >= 20:
            rows.append((score, e, reasons))
    rows.sort(key=lambda x: -x[0])
    if not rows:
        return {'type': 'analytics', 'title': 'پیشبینی استعفا', 'answer': 'در ۶ ماه آینده، کارمند پرخطری پیشبینی نمیشود.'}
    lines = ['🔮 کارمندانی که احتمال استعفایشان در ۶ ماه آینده بیشتر است:']
    for score, e, reasons in rows[:8]:
        lines.append(f'• {e.full_name} — ریسک {fa_num(score)}٪')
        for r in reasons:
            lines.append(f'    ↳ {r}')
    return {'type': 'analytics', 'title': 'پیشبینی استعفا', 'answer': '\n'.join(lines)}


# ---------------------------------------------------------------------------
# 6) Patterns: tenure/gender/education/scores
# ---------------------------------------------------------------------------
def patterns_overview(company=None):
    employees = _load_employees(company)
    if not employees:
        return None
    lines = ['📊 نگاهی کلی به الگوها:']
    # by gender avg performance/satisfaction
    g = defaultdict(list)
    for e in employees:
        key = e.get_gender_display() if e.gender else '(نامشخص)'
        g[key].append(e)
    for key, emps in g.items():
        perf = [float(e.performance_score or 0) for e in emps if e.performance_score is not None]
        sat = [float(e.satisfaction_score or 0) for e in emps if e.satisfaction_score is not None]
        if perf or sat:
            lines.append(
                f'• {key}: میانگین عملکرد {fa_num(_avg(perf) or 0)}، '
                f'رضایت {fa_num(_avg(sat) or 0)} ({fa_num(len(emps))} نفر)'
            )
    # education average
    edu = defaultdict(list)
    for e in employees:
        key = e.get_education_level_display() if e.education_level else '(نامشخص)'
        edu[key].append(e)
    if edu:
        lines.append('تحصیلات (میانگین عملکرد):')
        for key, emps in edu.items():
            perf = [float(e.performance_score or 0) for e in emps if e.performance_score is not None]
            lines.append(f'• {key}: {fa_num(_avg(perf) or 0)} ({fa_num(len(emps))} نفر)')
    # tenure groups
    lines.append('سابقه (میانگین امتیاز عملکرد):')
    for label, lo, hi in (('کمتر از ۲ سال', 0, 2), ('۲ تا ۱۰ سال', 2, 10), ('بیش از ۱۰ سال', 10, 99)):
        grp = [e for e in employees if (lo <= (tenure_years(e.hire_date) or 0) < hi)
               and e.performance_score is not None]
        if grp:
            avg = sum(float(e.performance_score or 0) for e in grp) / len(grp)
            lines.append(f'• {label}: میانگین عملکرد {fa_num(round(avg, 1))} ({fa_num(len(grp))} نفر)')
    return {'type': 'analytics', 'title': 'الگوهای داده', 'answer': '\n'.join(lines)}


# ---------------------------------------------------------------------------
# 7) High performance + 10y tenure + underpaid
# ---------------------------------------------------------------------------
def high_perf_tenure_underpaid(company=None):
    employees = _load_employees(company)
    if not employees:
        return None
    ids = [e.id for e in employees]
    latest = _latest_payroll_rows(ids, company)

    nets = [_money(latest.get(e.id).net_payable) if latest.get(e.id) else 0 for e in employees]
    median = sorted(nets)[len(nets) // 2] if nets else 0

    hits = []
    for e in employees:
        years = tenure_years(e.hire_date) or 0
        perf = float(e.performance_score or 0)
        net = _money(latest.get(e.id).net_payable) if latest.get(e.id) else 0
        if years >= 10 and perf >= 70 and net and net < median:
            hits.append((net, e, years, perf))
    hits.sort(key=lambda x: x[0])
    if not hits:
        return {'type': 'analytics', 'title': 'عملکرد/سابقه/حقوق', 'answer': 'کارمندی با سابقه ۱۰+ سال، عملکرد بالا ولی حقوق زیر میانه پیدا نشد.'}
    lines = ['⭐ کارمندانی با سابقه ۱۰+ سال، عملکرد بالا، ولی حقوق کمتر از میانه:']
    for net, e, years, perf in hits[:8]:
        lines.append(f'• {e.full_name} — سابقه {fa_num(round(years, 1))} سال، عملکرد {fa_num(round(perf))}، حقوق {fa_num(round(net))} ریال')
    return {'type': 'analytics', 'title': 'عملکرد/سابقه/حقوق', 'answer': '\n'.join(lines)}


# ---------------------------------------------------------------------------
# Dispatcher — detect & run
# ---------------------------------------------------------------------------
INTENT_MAP = [
    ('managers_best_team', managers_best_team,
     ['بالاترین میانگین امتیاز تیم', 'تیمشان بالاترین میانگین', 'مدیرانی که تیمشان', 'بهترین مدیر از نظر میانگین']),
    ('avg_age_tenure', avg_age_tenure_by_dept,
     ['میانگین سنی و سابقه', 'سن و سابقه در هر بخش', 'میانگین سن به تفکیک', 'سن و سابقه کار در هر']),
    ('orgchart', orgchart_summary,
     ['چند لایه', 'چارت سازمانی ما', 'چند زیردست', 'بیشترین زیردست', 'چند لایه دارد']),
    ('salary_dept', salary_dept,
     ['میانگین حقوق در هر بخش', 'میانگین حقوق به تفکیک', 'میانگین حقوق هر بخش']),
    ('cost_per_emp', lambda company=None: salary_dept(company, cost_per_emp=True),
     ['هزینه هر بخش', 'هر بخش به ازای هر کارمند', 'هزینه به ازای هر کارمند']),
    ('ot_lowpay', overtime_lowest_pay,
     ['بیشترین اضافه', 'اضافهکار دارند', 'کمترین حقوق را', 'زیاد اضافهکار']),
    ('resign_next6', likely_resign_in_6m,
     ['۶ ماه آینده', 'استعفا در', 'پیشبینی کن کدام', 'احتمالا استعفا']),
    ('patterns', patterns_overview,
     ['چه الگوهایی', 'بین سابقه کار', 'بین جنسیت', 'و نمره ارزیابی']),
    ('high_perf_tenure_underpaid', high_perf_tenure_underpaid,
     ['عملکرد بالایی دارند', 'سابقه بالای ۱۰', 'بالای 10 سال', 'حقوقشان پایین']),
]


def detect_analytics(q, company=None):
    """Return analytics result if q matches one of the analytic intents else None."""
    for _, fn, phrases in INTENT_MAP:
        if any(p in q for p in phrases):
            try:
                return fn(company)
            except Exception:
                return {
                    'type': 'analytics',
                    'answer': 'متاسفانه در محاسبه تحلیل خطایی رخ داد. لطفاً بعداً دوباره بپرسید.',
                }
    return None


class AnalyticsEngine:
    """
    Facade used by the HR assistant to detect and run analytical intents.
    """

    @staticmethod
    def detect(query, company=None):
        """query is the normalized Persian query; falls back to detect_analytics."""
        return detect_analytics(query, company=company)
