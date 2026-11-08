"""تجمیع «پروندهٔ خرید» یک تأمین‌کننده (توابع خالص و قابل تست).

اسناد به‌صورت دیکشنری‌های سبک (`procurement.dashboard.normalize_document`) وارد
می‌شوند؛ بنابراین پروندهٔ خرید با یک کوئری به‌ازای هر رابطه ساخته می‌شود و
محاسبات بدون دیتابیس قابل تست است. قاعدهٔ اعتبار تضامین همان
`contracts.guarantee_validity` است.
"""
from datetime import date

from contracts.guarantee_validity import guarantee_validity
from procurement.dashboard import currency_split, day, iso, num


def _sum(rows, key='rial_amount'):
    return round(sum(num(row.get(key)) for row in rows), 2)


def _last_date(rows, keys=('date',)):
    dates = []
    for row in rows:
        for key in keys:
            value = row.get(key)
            if value:
                dates.append(str(value)[:10])
    return max(dates) if dates else None


def guarantee_state(guarantees, today=None):
    """شمارش/مبلغ تضامین فعال، نزدیک انقضا، منقضی و آزادشده."""
    today = today or date.today()
    state = {
        'count': 0, 'active_count': 0, 'expiring_count': 0,
        'expired_count': 0, 'released_count': 0,
        'amount': 0.0, 'active_amount': 0.0,
    }
    for row in guarantees:
        amount = num(row.get('amount'))
        state['count'] += 1
        state['amount'] += amount
        if row.get('is_released'):
            state['released_count'] += 1
            continue
        state['active_count'] += 1
        state['active_amount'] += amount
        validity = guarantee_validity(row, today=today)
        if validity.get('is_expired'):
            state['expired_count'] += 1
        else:
            days_left = validity.get('days_to_expiry')
            if days_left is not None and days_left <= 30:
                state['expiring_count'] += 1
    for key in ('amount', 'active_amount'):
        state[key] = round(state[key], 2)
    return state


def supplier_summary(orders, invoices, payments, guarantees, proformas, quotations,
                     today=None):
    """شاخص‌های پروندهٔ خرید: سفارش، صورتحساب، پرداخت، مانده، تضامین و تفکیک ارزی."""
    today = today or date.today()
    open_orders = [row for row in orders if row.get('status') not in ('closed', 'cancelled', 'invoiced')]
    open_invoices = [row for row in invoices if row.get('status') != 'cancelled']
    invoiced = _sum(open_invoices)
    paid = round(sum(num(row.get('paid_amount')) for row in open_invoices), 2)
    overdue = [row for row in open_invoices if row.get('overdue')]
    unpaid = [row for row in open_invoices if (row.get('payment_status') or 'unpaid') != 'paid']
    split = currency_split(orders)
    guarantee_info = guarantee_state(guarantees, today=today)

    return {
        'orders': {
            'count': len(orders),
            'amount': _sum(orders),
            'open_count': len(open_orders),
            'open_amount': _sum(open_orders),
            'average': round(_sum(orders) / len(orders), 2) if orders else 0.0,
            'last_date': _last_date(orders),
            'rial_count': split['groups']['rial']['count'],
            'foreign_count': split['groups']['foreign']['count'],
            'rial_amount': split['groups']['rial']['rial_amount'],
            'foreign_amount': split['groups']['foreign']['rial_amount'],
            'by_currency': split['by_currency'],
        },
        'invoices': {
            'count': len(invoices),
            'invoiced': invoiced,
            'paid': paid,
            'balance': round(max(0.0, invoiced - paid), 2),
            'unpaid_count': len(unpaid),
            'overdue_count': len(overdue),
            'overdue_amount': _sum(overdue),
            'last_date': _last_date(invoices),
        },
        'payments': {
            'count': len(payments),
            'amount': round(sum(num(row.get('amount')) for row in payments), 2),
            'last_date': _last_date(payments),
        },
        'guarantees': guarantee_info,
        'proformas': {
            'count': len(proformas),
            'amount': _sum(proformas),
            'last_date': _last_date(proformas),
        },
        'quotations': {
            'count': len(quotations),
            'amount': _sum(quotations),
            'won_count': len([row for row in quotations if row.get('is_winner')]),
            'last_date': _last_date(quotations),
        },
        'collection_rate': round(paid / invoiced * 100, 1) if invoiced else 0.0,
        'last_activity': max(
            [value for value in (
                _last_date(orders), _last_date(invoices),
                _last_date(payments), _last_date(guarantees, ('issue_date',)),
            ) if value],
            default=None,
        ),
        'today': today.isoformat(),
    }


TIMELINE_META = {
    'order': {'label': 'سفارش خرید', 'tone': '#2563eb'},
    'invoice': {'label': 'صورتحساب', 'tone': '#0e7490'},
    'payment': {'label': 'پرداخت', 'tone': '#0f766e'},
    'guarantee': {'label': 'تضمین', 'tone': '#b45309'},
    'proforma': {'label': 'پیش‌فاکتور', 'tone': '#7c3aed'},
    'document': {'label': 'سند', 'tone': '#475569'},
}


def _entry(kind, when, title, detail='', amount=None):
    meta = TIMELINE_META.get(kind, {'label': kind, 'tone': '#475569'})
    return {
        'kind': kind,
        'label': meta['label'],
        'tone': meta['tone'],
        'date': iso(when),
        'title': title or '',
        'detail': detail or '',
        'amount': round(num(amount), 2) if amount is not None else None,
    }


def build_timeline(orders=(), invoices=(), payments=(), guarantees=(), proformas=(),
                   documents=(), limit=60):
    """خط زمانی پرونده: سفارش، صورتحساب، پرداخت، تضمین، پیش‌فاکتور و اسناد."""
    events = []
    for row in orders:
        events.append(_entry(
            'order', row.get('date'),
            row.get('number') or 'سفارش خرید',
            row.get('status_label') or '', row.get('rial_amount'),
        ))
    for row in invoices:
        events.append(_entry(
            'invoice', row.get('date'),
            row.get('number') or 'صورتحساب',
            row.get('status_label') or '', row.get('rial_amount'),
        ))
    for row in payments:
        events.append(_entry(
            'payment', row.get('date'),
            row.get('invoice_number') or 'پرداخت',
            row.get('method_label') or '', row.get('amount'),
        ))
    for row in guarantees:
        events.append(_entry(
            'guarantee', row.get('issue_date'),
            row.get('number') or 'تضمین',
            row.get('kind_label') or '', row.get('amount'),
        ))
    for row in proformas:
        events.append(_entry(
            'proforma', row.get('date'),
            row.get('number') or 'پیش‌فاکتور',
            row.get('status_label') or '', row.get('rial_amount'),
        ))
    for row in documents:
        events.append(_entry(
            'document', row.get('created_at'),
            row.get('title') or 'سند',
            row.get('kind_label') or '',
        ))
    events = [event for event in events if event['date']]
    events.sort(key=lambda item: (item['date'], item['kind']), reverse=True)
    return events[:limit]
