"""جریان نقدی پروژه (فاز ۲) — پیش‌بینی در برابر واقعی، سطل‌گذاری ماه شمسی.

توابع هسته‌ای **خالص** هستند (روی دیکشنری/لیست) تا بدون دیتابیس تست شوند:
    * `monthly_spread(items)`  → توزیع خطی مبلغ هر ردیف روی ماه‌های شمسی
    * `combine_months(...)`    → ردیف‌های نهایی با جمع تجمعی
    * `project_cashflow(p)`    → سرویس: پیش‌بینی از برنامه، واقعی از دفاتر و پرداخت‌ها
"""
from datetime import date, timedelta

from projects.jalali_utils import JALALI_MONTHS, jalali_period_fields


def _f(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def month_label(month_key):
    """برچسب خوانای ماه شمسی از کلید '1405-03'."""
    try:
        jy, jm = str(month_key).split('-')
        return f'{JALALI_MONTHS[int(jm) - 1]} {jy}'
    except (ValueError, IndexError):
        return str(month_key or '')


def monthly_spread(items, start=None, end=None):
    """توزیع خطی مبلغ هر ردیف روی ماه‌های شمسی بازهٔ آن.

    items: [{'amount', 'start', 'end'}]  →  خروجی: {month_key: amount}
    """
    buckets = {}
    for item in items or []:
        amount = _f(item.get('amount'))
        item_start = item.get('start') or start
        item_end = item.get('end') or end
        if amount == 0 or not item_start or not item_end:
            continue
        if item_end < item_start:
            item_end = item_start
        span_days = max(1, (item_end - item_start).days + 1)
        per_day = amount / span_days
        cursor = item_start
        while cursor <= item_end:
            month = jalali_period_fields(cursor)['month']
            if month:
                buckets[month] = buckets.get(month, 0.0) + per_day
            cursor += timedelta(days=1)
    return {key: round(value, 2) for key, value in buckets.items()}


def combine_months(inflow_planned, inflow_actual, outflow_planned, outflow_actual):
    """ترکیب چهار سری در ردیف‌های مرتب ماهانه همراه جمع تجمعی."""
    keys = sorted(set(inflow_planned) | set(inflow_actual) | set(outflow_planned) | set(outflow_actual))
    rows = []
    cum_in_plan = cum_out_plan = cum_in_act = cum_out_act = 0.0
    for key in keys:
        in_plan = round(_f(inflow_planned.get(key)), 2)
        out_plan = round(_f(outflow_planned.get(key)), 2)
        in_act = round(_f(inflow_actual.get(key)), 2)
        out_act = round(_f(outflow_actual.get(key)), 2)
        cum_in_plan += in_plan
        cum_out_plan += out_plan
        cum_in_act += in_act
        cum_out_act += out_act
        rows.append({
            'month': key,
            'month_short': f'{key[5:]}/{key[2:4]}',
            'month_label': month_label(key),
            'inflow_planned': in_plan,
            'inflow_actual': in_act,
            'outflow_planned': out_plan,
            'outflow_actual': out_act,
            'net_planned': round(in_plan - out_plan, 2),
            'net_actual': round(in_act - out_act, 2),
            'cum_inflow_planned': round(cum_in_plan, 2),
            'cum_inflow_actual': round(cum_in_act, 2),
            'cum_outflow_planned': round(cum_out_plan, 2),
            'cum_outflow_actual': round(cum_out_act, 2),
            'cum_net_planned': round(cum_in_plan - cum_out_plan, 2),
            'cum_net_actual': round(cum_in_act - cum_out_act, 2),
        })
    return rows


def _is_rial(currency):
    if currency is None:
        return True
    return (getattr(currency, 'code', '') or 'IRR').upper() in ('IRR', 'IRT', 'RIAL', 'RIALS')


def _add(bucket, day, amount):
    month = jalali_period_fields(day)['month'] if day else None
    if month:
        bucket[month] = bucket.get(month, 0.0) + amount


def project_cashflow(project, rial_only=True):
    """جریان نقدی پروژه: پیش‌بینی از برنامه (بیس‌لاین/فعالیت) و واقعی از دفاتر و پرداخت‌ها."""
    from contracts.models import Contract, Payment, Statement
    from projects.cost_models import CostTransaction
    from projects.schedule_models import Activity, BaselineActivity
    from projects.scheduling.service import current_baseline

    baseline = current_baseline(project)
    planned_items = []
    if baseline:
        planned_items = [
            {'amount': item.planned_cost, 'start': item.early_start, 'end': item.early_finish}
            for item in BaselineActivity.objects.filter(baseline=baseline)
        ]
    if not planned_items:
        planned_items = [
            {'amount': activity.planned_cost, 'start': activity.early_start, 'end': activity.early_finish}
            for activity in Activity.objects.filter(project=project)
        ]

    contracts = []
    if project.company_id:
        contracts = list(Contract.objects.filter(company_id=project.company_id, project=project))
    else:
        contracts = list(Contract.objects.filter(project=project))
    if rial_only:
        contracts = [c for c in contracts if _is_rial(c.currency)]
    contract_ids = [c.id for c in contracts]

    actual_in, actual_out = {}, {}
    for statement in Statement.objects.filter(contract_id__in=contract_ids).select_related('currency'):
        if rial_only and not _is_rial(statement.currency):
            continue
        _add(actual_in, statement.date, float(statement.net_amount or 0))

    for payment in Payment.objects.filter(contract_id__in=contract_ids).select_related('currency'):
        if rial_only and not _is_rial(payment.currency):
            continue
        _add(actual_out, payment.date, float(payment.amount or 0))

    for tx in CostTransaction.objects.filter(project=project).prefetch_related('lines'):
        total = sum(float(line.net_amount or line.amount or 0) for line in tx.lines.all())
        _add(actual_out, tx.date, total)

    # پیش‌بینی ورودی = ارزش برنامه‌ای (درآمد کارفرما) و پیش‌بینی خروجی = هزینهٔ برنامه‌ای
    planned_in = monthly_spread(planned_items)
    planned_out = monthly_spread(planned_items)

    rows = combine_months(planned_in, actual_in, planned_out, actual_out)

    return {
        'project': {'id': project.id, 'code': project.code, 'name': project.name},
        'baseline': baseline.name if baseline else None,
        'rows': rows,
        'totals': {
            'planned_in': round(sum(planned_in.values()), 2),
            'planned_out': round(sum(planned_out.values()), 2),
            'actual_in': round(sum(actual_in.values()), 2),
            'actual_out': round(sum(actual_out.values()), 2),
            'net_actual': round(sum(actual_in.values()) - sum(actual_out.values()), 2),
        },
    }

