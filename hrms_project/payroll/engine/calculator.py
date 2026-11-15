"""Pure payroll arithmetic — unit-testable and free of Django imports."""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP


def dec(value):
    if isinstance(value, Decimal):
        return value
    if value in (None, ''):
        return Decimal('0')
    return Decimal(str(value))


def round_money(value, step=Decimal('1')):
    value = dec(value)
    step = dec(step) or Decimal('1')
    if step <= 0:
        step = Decimal('1')
    return (value / step).quantize(Decimal('1'), rounding=ROUND_HALF_UP) * step


def daily_rate(base_salary, work_days):
    base_salary = dec(base_salary)
    work_days = dec(work_days)
    return base_salary / work_days if work_days else Decimal('0')


def hourly_rate(base_salary, work_days, work_hours):
    daily = daily_rate(base_salary, work_days)
    work_hours = dec(work_hours)
    return daily / work_hours if work_hours else Decimal('0')


def overtime_amount(base_salary, work_days, work_hours, hours, multiplier):
    return (
        hourly_rate(base_salary, work_days, work_hours)
        * dec(hours)
        * dec(multiplier)
    )


def insurance_amounts(base, employee_rate, employer_rate, min_base=0, max_base=0):
    """Return employee/employer insurance for an insurance base.

    Rates are percentages supplied by effective-dated configuration; no legal
    rate is embedded in this module.
    """
    base = dec(base)
    min_base = dec(min_base)
    max_base = dec(max_base)
    if min_base and base < min_base:
        base = min_base
    if max_base and base > max_base:
        base = max_base
    employee = base * dec(employee_rate) / Decimal('100')
    employer = base * dec(employer_rate) / Decimal('100')
    return {
        'base': base,
        'employee': employee,
        'employer': employer,
        'total': employee + employer,
    }


def progressive_tax(taxable_income, brackets, exemption=0, insurance_deduction=0):
    """Calculate progressive tax from effective-dated bracket objects/dicts.

    ``brackets`` items must provide lower_bound, upper_bound (may be None) and
    rate (percentage). Returns a dict with amount and per-bracket breakdown.
    """
    taxable = dec(taxable_income) - dec(insurance_deduction) - dec(exemption)
    if taxable <= 0:
        return {'taxable': Decimal('0'), 'amount': Decimal('0'), 'rows': []}

    rows = []
    total = Decimal('0')
    ordered = sorted(
        brackets,
        key=lambda row: dec(_value(row, 'lower_bound')),
    )
    for bracket in ordered:
        lower = dec(_value(bracket, 'lower_bound'))
        upper = _value(bracket, 'upper_bound')
        upper = None if upper in (None, '', 0, '0') else dec(upper)
        rate = dec(_value(bracket, 'rate'))
        if taxable <= lower:
            continue
        portion = (min(taxable, upper) if upper is not None else taxable) - lower
        if portion <= 0:
            continue
        amount = portion * rate / Decimal('100')
        rows.append({
            'lower_bound': lower,
            'upper_bound': upper,
            'rate': rate,
            'portion': portion,
            'amount': amount,
        })
        total += amount
    return {'taxable': taxable, 'amount': total, 'rows': rows}


def _value(row, key):
    if isinstance(row, dict):
        return row.get(key)
    return getattr(row, key, None)


def summarize_lines(lines):
    """Summarize component line dicts by kind and tax/insurance flags."""
    summary = {
        'gross': Decimal('0'),
        'earnings': Decimal('0'),
        'deductions': Decimal('0'),
        'employer_costs': Decimal('0'),
        'insurance_base': Decimal('0'),
        'taxable_base': Decimal('0'),
    }
    for line in lines:
        amount = dec(line.get('amount'))
        kind = line.get('kind')
        if kind == 'earning':
            summary['earnings'] += amount
            if line.get('is_insurable'):
                summary['insurance_base'] += amount
            if line.get('is_taxable'):
                summary['taxable_base'] += amount
        elif kind == 'deduction':
            summary['deductions'] += amount
        elif kind == 'employer_cost':
            summary['employer_costs'] += amount
    summary['gross'] = summary['earnings']
    return summary


def clamp_amount(value, min_amount=None, max_amount=None):
    value = dec(value)
    if min_amount not in (None, ''):
        value = max(value, dec(min_amount))
    if max_amount not in (None, ''):
        value = min(value, dec(max_amount))
    return value
