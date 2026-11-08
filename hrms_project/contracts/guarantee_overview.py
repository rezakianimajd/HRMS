"""نمای کلی وضعیت تضامین قراردادها (صفحهٔ پایش تضامین).

هر قرارداد بر اساس `guarantee_compliance` به یک ردیف خلاصه تبدیل می‌شود:
مبلغ مورد نیاز، تأمین‌شده، آزادشده، کمبود، درصد پوشش، شمارش وضعیت‌ها و
نزدیک‌ترین سررسید. تابع `summarize` جمع کل را برای کارت‌های بالای صفحه می‌سازد.
"""
from datetime import date


def _days_until(value):
    if not value:
        return None
    try:
        day = date.fromisoformat(str(value)[:10])
    except ValueError:
        return None
    return (day - date.today()).days


def contract_overview_row(contract, compliance):
    """تبدیل خروجی `guarantee_compliance` به ردیف خلاصهٔ یک قرارداد."""
    summary = (compliance or {}).get('summary') or {}
    requirements = (compliance or {}).get('requirements') or []
    warnings = (compliance or {}).get('warnings') or []

    next_expiry = None
    next_days = None
    for requirement in requirements:
        for item in requirement.get('items') or []:
            if item.get('is_released'):
                continue
            days = item.get('days_to_expiry')
            if days is None:
                continue
            if next_days is None or days < next_days:
                next_days = days
                next_expiry = item.get('valid_until') or item.get('expiry_date')

    return {
        'contract': getattr(contract, 'id', None),
        'contract_number': getattr(contract, 'number', '') or '',
        'contract_subject': getattr(contract, 'subject', '') or '',
        'party_name': getattr(getattr(contract, 'party', None), 'name', '') or '',
        'status': getattr(contract, 'status', '') or '',
        'effective_amount': summary.get('effective_amount') or (compliance or {}).get('effective_amount') or 0.0,
        'required_total': summary.get('required_total', 0.0),
        'provided_total': summary.get('provided_total', 0.0),
        'fulfilled_total': summary.get('fulfilled_total', summary.get('provided_total', 0.0)),
        'released_total': summary.get('released_total', 0.0),
        'balance_total': summary.get('balance_total', 0.0),
        'coverage_percent': summary.get('coverage_percent', 0.0),
        'required_count': summary.get('required_count', 0),
        'provided_count': summary.get('provided_count', 0),
        'released_count': summary.get('released_count', 0),
        'partial_count': summary.get('partial_count', 0),
        'missing_count': summary.get('missing_count', 0),
        'registered_count': summary.get('registered_count', 0),
        'guarantee_count': summary.get('registered_count', 0),
        'warnings_count': len(warnings),
        'next_expiry': next_expiry,
        'next_expiry_days': next_days,
    }


def summarize(rows):
    """جمع کل ردیف‌های پایش برای کارت‌های خلاصه."""
    totals = {
        'contracts': len(rows),
        'required_total': 0.0,
        'provided_total': 0.0,
        'fulfilled_total': 0.0,
        'released_total': 0.0,
        'balance_total': 0.0,
        'guarantees': 0,
        'expiring_30': 0,
        'expired': 0,
        'missing_contracts': 0,
        'partial_contracts': 0,
        'covered_contracts': 0,
    }
    for row in rows:
        totals['required_total'] += row.get('required_total') or 0.0
        totals['provided_total'] += row.get('provided_total') or 0.0
        totals['fulfilled_total'] += row.get('fulfilled_total') or 0.0
        totals['released_total'] += row.get('released_total') or 0.0
        totals['balance_total'] += row.get('balance_total') or 0.0
        totals['guarantees'] += row.get('guarantee_count') or 0
        if row.get('missing_count'):
            totals['missing_contracts'] += 1
        elif row.get('partial_count'):
            totals['partial_contracts'] += 1
        elif row.get('required_count'):
            totals['covered_contracts'] += 1
        days = row.get('next_expiry_days')
        if days is not None:
            if days < 0:
                totals['expired'] += 1
            elif days <= 30:
                totals['expiring_30'] += 1
    required = totals['required_total']
    fulfilled = totals['fulfilled_total']
    totals['coverage_percent'] = round(fulfilled / required * 100.0, 1) if required else (
        100.0 if fulfilled else 0.0
    )
    return totals
