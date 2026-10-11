"""ارزش کسب‌شده (EVM) و منحنی S — فاز ۱.

توابع این ماژول **خالص** هستند و روی دیکشنری/لیست داده کار می‌کنند تا مستقل از
دیتابیس تست شوند:

    PV = ارزش برنامه‌ای (زمان‌بندی بیس‌لاین × هزینهٔ برنامه‌ای)
    EV = ارزش کسب‌شده (هزینهٔ برنامه‌ای × درصد پیشرفت)
    AC = هزینهٔ واقعی

شاخص‌ها: SV, CV, SPI, CPI, EAC, ETC, VAC, TCPI و درصد پیشرفت وزنی.
"""
from datetime import date, timedelta

ZERO = 0.0001  # مخرج ایمن برای تقسیم‌ها


def _f(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _span_days(start, finish):
    if not start or not finish:
        return 0
    return max(1, (finish - start).days + 1)


def planned_value_at(items, as_of):
    """PV تا تاریخ `as_of` با توزیع خطی هزینهٔ هر ردیف بیس‌لاین روی بازهٔ آن."""
    total = 0.0
    for item in items:
        cost = _f(item.get('planned_cost'))
        start = item.get('early_start')
        finish = item.get('early_finish')
        if cost <= 0 or not start or not finish:
            continue
        if as_of >= finish:
            total += cost
        elif as_of >= start:
            total += cost * (_span_days(start, as_of) / _span_days(start, finish))
    return round(total, 2)


def earned_value(items):
    """EV: جمع (هزینهٔ برنامه‌ای × درصد پیشرفت) — پیشرفت وزنی."""
    total = 0.0
    for item in items:
        total += _f(item.get('planned_cost')) * _f(item.get('percent_complete')) / 100.0
    return round(total, 2)


def budget_at_completion(items):
    """BAC: جمع هزینهٔ برنامه‌ای ردیف‌ها."""
    return round(sum(_f(item.get('planned_cost')) for item in items), 2)


def physical_percent(items):
    """درصد پیشرفت فیزیکی وزنی (به وزن هزینهٔ برنامه‌ای)."""
    bac = sum(_f(item.get('planned_cost')) for item in items)
    if bac <= 0:
        weights = [_f(item.get('weight'), 1.0) for item in items]
        total_weight = sum(weights) or 1.0
        return round(sum(_f(item.get('percent_complete')) * w for item, w in zip(items, weights)) / total_weight, 2)
    return round(sum(_f(item.get('planned_cost')) * _f(item.get('percent_complete')) for item in items) / bac, 2)


def compute_metrics(bac, pv, ev, ac):
    """محاسبهٔ شاخص‌های EVM با محافظت از تقسیم بر صفر."""
    bac, pv, ev, ac = _f(bac), _f(pv), _f(ev), _f(ac)
    spi = round(ev / pv, 4) if pv > ZERO else None
    cpi = round(ev / ac, 4) if ac > ZERO else None
    eac = round(bac / cpi, 2) if cpi else None
    etc = round(eac - ac, 2) if eac is not None else None
    vac = round(bac - eac, 2) if eac is not None else None
    tcpi = round((bac - ev) / (bac - ac), 4) if (bac - ac) > ZERO else None
    return {
        'bac': round(bac, 2),
        'pv': round(pv, 2),
        'ev': round(ev, 2),
        'ac': round(ac, 2),
        'sv': round(ev - pv, 2),
        'cv': round(ev - ac, 2),
        'spi': spi,
        'cpi': cpi,
        'eac': eac,
        'etc': etc,
        'vac': vac,
        'tcpi': tcpi,
        'percent_complete': round(ev / bac * 100, 2) if bac > ZERO else 0.0,
        'performance': (
            'ahead' if spi and spi > 1.01 else
            'behind' if spi and spi < 0.99 else 'on_track'
        ) if spi else None,
    }


def s_curve(items, progress_entries, actual_entries=None, start=None, end=None, step_days=1):
    """سری زمانی تجمعی PV/EV/AC.

    items:            [{'planned_cost', 'early_start', 'early_finish', 'id', 'weight'}]
    progress_entries: [{'activity_id', 'date', 'percent_complete'}]
    actual_entries:   [{'date', 'amount'}] (اختیاری؛ در نبود آن AC صفر می‌ماند)
    """
    if not items:
        return []

    dates = [item.get('early_start') for item in items if item.get('early_start')]
    finishes = [item.get('early_finish') for item in items if item.get('early_finish')]
    if not dates or not finishes:
        return []

    cursor = start or min(dates)
    last = end or max(finishes)

    entries = sorted(
        [e for e in (progress_entries or []) if e.get('date')],
        key=lambda e: e['date'],
    )
    actuals = sorted(
        [a for a in (actual_entries or []) if a.get('date')],
        key=lambda a: a['date'],
    )

    series = []
    cumulative_ac = 0.0
    actual_index = 0
    while cursor <= last:
        pv = planned_value_at(items, cursor)

        cumulative_ev = 0.0
        for item in items:
            cost = _f(item.get('planned_cost'))
            if cost <= 0:
                continue
            applicable = [
                _f(e.get('percent_complete')) for e in entries
                if e.get('activity_id') == item.get('id') and e['date'] <= cursor
            ]
            percent = max(applicable) if applicable else 0.0
            cumulative_ev += cost * percent / 100.0

        while actual_index < len(actuals) and actuals[actual_index]['date'] <= cursor:
            cumulative_ac += _f(actuals[actual_index].get('amount'))
            actual_index += 1

        series.append({
            'date': cursor,
            'pv': round(pv, 2),
            'ev': round(cumulative_ev, 2),
            'ac': round(cumulative_ac, 2),
        })
        cursor += timedelta(days=step_days)

    return series


def monthly_last_points(series):
    """آخرین نقطهٔ هر ماه از سری روزانه (برای نمودار فشرده)."""
    buckets = {}
    for row in series:
        key = (row['date'].year, row['date'].month)
        buckets[key] = row
    return [buckets[key] for key in sorted(buckets)]
