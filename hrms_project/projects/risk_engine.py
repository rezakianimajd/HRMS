"""موتور محاسباتی ریسک (فاز ۳) — توابع خالص و بدون دیتابیس.

همهٔ توابع این ماژول فقط روی داده‌های ساده (dict/شبه‌آبجکت) کار می‌کنند تا
مستقل از ORM تست‌پذیر باشند:

* امتیاز و سطح ریسک در ماتریس ۵×۵ (احتمال × شدت اثر)
* ارزش مورد انتظار مالی (EMV) و ارزش باقی‌مانده پس از اقدام‌های کاهش
* ماتریس حرارتی (heatmap) با شمارش و شناسهٔ ریسک‌های هر خانه
* شاخص‌های کلیدی رجیستر (KPI) و وضعیت اقدام‌ها
"""
from decimal import Decimal, ROUND_HALF_UP

LEVEL_LABELS = {
    'low': 'کم',
    'medium': 'متوسط',
    'high': 'زیاد',
    'critical': 'بحرانی',
}

LEVEL_COLORS = {
    'low': '#10b981',       # سبز
    'medium': '#f59e0b',    # زرد
    'high': '#f97316',      # نارنجی
    'critical': '#ef4444',  # قرمز
}

LEVEL_ORDER = ['low', 'medium', 'high', 'critical']

# آستانه‌های استاندارد ماتریس ۵×۵ (امتیاز = احتمال × شدت)
LOW_MAX = 4
MEDIUM_MAX = 9
HIGH_MAX = 14


def clamp_scale(value, default=1):
    """مقدار مقیاس ۱ تا ۵ را محدود می‌کند (ورودی نامعتبر → پیش‌فرض)."""
    try:
        number = int(value)
    except (TypeError, ValueError):
        return default
    if number < 1:
        return 1
    if number > 5:
        return 5
    return number


def score_of(probability, impact):
    """امتیاز ریسک = احتمال × شدت اثر (۱ تا ۲۵)."""
    return clamp_scale(probability) * clamp_scale(impact)


def level_of(score):
    """سطح ریسک از روی امتیاز: کم / متوسط / زیاد / بحرانی."""
    try:
        value = int(score)
    except (TypeError, ValueError):
        value = 0
    if value <= LOW_MAX:
        return 'low'
    if value <= MEDIUM_MAX:
        return 'medium'
    if value <= HIGH_MAX:
        return 'high'
    return 'critical'


def worst_impact(*impacts):
    """بیشترین شدت اثر از میان ابعاد (هزینه/زمان/کیفیت/HSE)."""
    values = [clamp_scale(i, 0) for i in impacts if i not in (None, '')]
    values = [v for v in values if v > 0]
    return max(values) if values else 1


def effective_score(probability, impacts):
    """امتیاز ریسک بر پایهٔ احتمال و بیشترین شدت اثر میان همهٔ ابعاد."""
    return score_of(probability, worst_impact(*impacts))


def _money(value):
    try:
        return Decimal(str(value or 0))
    except Exception:  # noqa: BLE001
        return Decimal('0')


def _round2(value):
    return float(Decimal(str(value or 0)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))


def expected_cost(cost_impact, probability):
    """ارزش مورد انتظار مالی (EMV) = اثر مالی × (احتمال ÷ ۵)."""
    return _round2(_money(cost_impact) * Decimal(clamp_scale(probability, 0)) / Decimal('5'))


def residual_expected_cost(cost_impact, probability, residual_probability):
    """ارزش مالی باقی‌مانده پس از اقدام‌های کاهش.

    اگر احتمال باقی‌مانده ثبت نشده باشد، فرض می‌شود تغییری رخ نداده است.
    """
    rp = clamp_scale(residual_probability, 0) if residual_probability else 0
    if not rp:
        return expected_cost(cost_impact, probability)
    return expected_cost(cost_impact, rp)


def score_reduction(score, residual_score):
    """میزان کاهش امتیاز (خام − باقی‌مانده، هرگز منفی نمی‌شود)."""
    try:
        return max(int(score or 0) - int(residual_score or 0), 0)
    except (TypeError, ValueError):
        return 0


def reduction_percent(score, residual_score):
    """درصد کاهش امتیاز ریسک."""
    try:
        base = int(score or 0)
    except (TypeError, ValueError):
        return 0.0
    if base <= 0:
        return 0.0
    return round(score_reduction(base, residual_score) / base * 100, 1)


def _field(row, name, default=None):
    """خواندن یک فیلد از dict یا آبجکت (برای تست‌پذیری بدون ORM)."""
    if row is None:
        return default
    if isinstance(row, dict):
        return row.get(name, default)
    return getattr(row, name, default)


def is_overdue(due_date, today):
    """آیا سررسید گذشته است؟ (بدون وابستگی به ORM)."""
    if not due_date or not today:
        return False
    return due_date < today


def risk_row(risk):
    """تخت‌کردن یک ریسک (ORM یا dict) به نگاشت ساده برای موتور."""
    if isinstance(risk, dict):
        return risk
    return {
        'id': risk.id,
        'number': risk.number,
        'title': risk.title,
        'probability': risk.probability,
        'impact': risk.impact_cost,
        'impacts': [risk.impact_cost, risk.impact_time, risk.impact_quality, risk.impact_hse],
        'score': risk.score,
        'level': risk.level,
        'status': risk.status,
        'risk_type': risk.risk_type,
        'cost_impact': risk.cost_impact,
        'expected_cost': risk.expected_cost,
        'residual_probability': risk.residual_probability,
        'residual_impact': risk.residual_impact,
        'residual_score': risk.residual_score,
        'due_date': risk.due_date,
    }


def matrix_grid(rows):
    """ماتریس حرارتی ۵×۵: احتمال (سطر) × شدت اثر (ستون)."""
    rows = list(rows or [])
    cells = []
    max_count = 0
    for probability in range(1, 6):
        for impact in range(1, 6):
            score = probability * impact
            bucket = [
                {
                    'id': _field(r, 'id'),
                    'number': _field(r, 'number', ''),
                    'title': _field(r, 'title', ''),
                    'level': _field(r, 'level') or level_of(score),
                }
                for r in rows
                if clamp_scale(_field(r, 'probability'), 0) == probability
                and clamp_scale(_field(r, 'impact') if _field(r, 'impact') is not None
                                else _field(r, 'impact_cost'), 0) == impact
            ]
            max_count = max(max_count, len(bucket))
            cells.append({
                'probability': probability,
                'impact': impact,
                'score': score,
                'level': level_of(score),
                'count': len(bucket),
                'risks': bucket,
            })
    return {'cells': cells, 'max_count': max_count, 'total': len(rows)}


def action_stats(actions, today=None):
    """آمار اقدام‌های کاهش/واکنش (تعداد، درصد انجام، معوق)."""
    total = done = in_progress = planned = cancelled = overdue = 0
    total_cost = 0.0
    for action in actions or []:
        status = _field(action, 'status') or 'planned'
        total += 1
        if status == 'done':
            done += 1
        elif status == 'in_progress':
            in_progress += 1
        elif status == 'cancelled':
            cancelled += 1
        else:
            planned += 1
        if status not in ('done', 'cancelled') and is_overdue(_field(action, 'due_date'), today):
            overdue += 1
        total_cost += float(_money(_field(action, 'cost')))
    active = total - cancelled
    percent = round(done / active * 100, 1) if active else 0.0
    return {
        'total': total,
        'done': done,
        'in_progress': in_progress,
        'planned': planned,
        'cancelled': cancelled,
        'overdue': overdue,
        'percent': percent,
        'cost': _round2(total_cost),
    }


def risk_kpis(rows, today=None, actions=None, top_n=5):
    """شاخص‌های کلیدی رجیستر ریسک یک پروژه."""
    rows = list(rows or [])
    actions = list(actions or [])
    by_level = {level: 0 for level in LEVEL_ORDER}
    by_status = {}
    by_type = {'threat': 0, 'opportunity': 0}
    exposure = residual_exposure = gross_exposure = 0.0
    score_sum = 0
    overdue_risks = 0

    for row in rows:
        score = int(_field(row, 'score') or 0)
        level = _field(row, 'level') or level_of(score)
        status = _field(row, 'status') or 'open'
        by_level[level] = by_level.get(level, 0) + 1
        by_status[status] = by_status.get(status, 0) + 1
        risk_type = _field(row, 'risk_type') or 'threat'
        by_type[risk_type] = by_type.get(risk_type, 0) + 1
        score_sum += score
        cost_impact = _money(_field(row, 'cost_impact'))
        probability = _field(row, 'probability')
        exposure += float(expected_cost(cost_impact, probability))
        residual_exposure += float(residual_expected_cost(
            cost_impact, probability, _field(row, 'residual_probability'),
        ))
        gross_exposure += float(cost_impact)
        if status != 'closed' and is_overdue(_field(row, 'due_date'), today):
            overdue_risks += 1

    active = [r for r in rows if (_field(r, 'status') or 'open') != 'closed']
    top = sorted(
        rows, key=lambda r: (int(_field(r, 'score') or 0), _field(r, 'id') or 0), reverse=True,
    )[:top_n]

    return {
        'total': len(rows),
        'active': len(active),
        'closed': len(rows) - len(active),
        'by_level': by_level,
        'by_status': by_status,
        'by_type': by_type,
        'average_score': round(score_sum / len(rows), 2) if rows else 0.0,
        'exposure': _round2(exposure),
        'residual_exposure': _round2(residual_exposure),
        'gross_exposure': _round2(gross_exposure),
        'exposure_reduction_percent': (
            round((exposure - residual_exposure) / exposure * 100, 1) if exposure else 0.0
        ),
        'overdue_risks': overdue_risks,
        'actions': action_stats(actions, today),
        'top_risks': [
            {
                'id': _field(r, 'id'),
                'number': _field(r, 'number', ''),
                'title': _field(r, 'title', ''),
                'score': int(_field(r, 'score') or 0),
                'level': _field(r, 'level') or level_of(_field(r, 'score')),
                'status': _field(r, 'status'),
            }
            for r in top
        ],
    }
