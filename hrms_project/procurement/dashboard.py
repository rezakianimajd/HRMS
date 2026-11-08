"""تجمیع دادهٔ داشبورد «مدیریت خریدها».

توابع این ماژول **خالص** هستند (بدون دیتابیس) و از ردیف‌های ``.values()`` تغذیه
می‌شوند؛ بنابراین هم داشبورد با یک کوئری به‌ازای هر مدل ساخته می‌شود (بدون N+1)
و هم بدون PostgreSQL قابل تست است. قاعدهٔ اعتبار تضامین همان
``contracts.guarantee_validity`` است (چک = ۵ سال از صدور).
"""
from datetime import date, timedelta

from contracts.guarantee_validity import guarantee_validity

RIAL_CODES = frozenset({'IRR', 'IRT'})
RIAL_NAMES = frozenset({'ریال', 'ریال ایران', 'تومان'})

MONTHS = 6
DUE_SOON_DAYS = 14
EXPIRING_DAYS = 30
OPEN_ORDER_STATUSES = ('draft', 'submitted', 'approved', 'sent', 'partial')
OPEN_INQUIRY_STATUSES = ('draft', 'sent', 'open', 'evaluating')


def num(value):
    """عدد ایمن (None/رشتهٔ نامعتبر → ۰)."""
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def day(value):
    """تبدیل مقدار به ``date`` (رشتهٔ ISO، datetime یا date)."""
    if not value:
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def iso(value):
    converted = day(value)
    return converted.isoformat() if converted else None


def month_key(value):
    """کلید ماه میلادی ``YYYY-MM`` از تاریخ/رشته."""
    converted = day(value)
    if converted:
        return '%04d-%02d' % (converted.year, converted.month)
    text = str(value or '')
    return text[:7] if len(text) >= 7 else ''


def month_buckets(count=MONTHS, today=None):
    """ماه‌های اخیر (به ترتیب قدیم به جدید) برای نمودار روند."""
    today = today or date.today()
    year, month = today.year, today.month
    keys = []
    for _ in range(count):
        keys.append('%04d-%02d' % (year, month))
        month -= 1
        if month == 0:
            year, month = year - 1, 12
    return list(reversed(keys))


def currency_group(code=None, name=None, rate=None):
    """تفکیک ریالی/ارزی با همان منطق فهرست اسناد."""
    code_text = str(code or '').strip().upper()
    name_text = str(name or '').strip()
    if code_text in RIAL_CODES or name_text in RIAL_NAMES:
        return 'rial'
    if code_text or name_text:
        return 'foreign'
    return 'foreign' if num(rate) > 1 else 'rial'


def normalize_document(row, amount_key='total', date_key='date'):
    """ردیف سند (سفارش/فاکتور) → مبلغ، معادل ریالی و گروه ارزی."""
    amount = num(row.get(amount_key))
    rate = num(row.get('exchange_rate')) or 1
    group = currency_group(row.get('currency_code'), row.get('currency_name'), row.get('exchange_rate'))
    return {
        'id': row.get('id'),
        'number': row.get('number') or '',
        'date': iso(row.get(date_key)),
        'month': month_key(row.get(date_key)),
        'amount': amount,
        'rial_amount': amount if group == 'rial' else amount * rate,
        'rate': rate,
        'group': group,
        'currency': (row.get('currency_code') or row.get('currency_name') or ''),
        'status': row.get('status') or '',
        'supplier': row.get('supplier_name') or '',
        'supplier_id': row.get('supplier_id'),
        'project': row.get('project_name') or '',
    }


def build_monthly(orders, invoices, payments, buckets):
    """سری زمانی شش‌ماههٔ سفارش‌ها، صورتحساب‌ها و پرداخت‌ها (معادل ریالی)."""
    chart = {
        key: {
            'month': key, 'orders': 0, 'order_amount': 0.0,
            'rial_orders': 0, 'foreign_orders': 0,
            'rial_amount': 0.0, 'foreign_amount': 0.0,
            'invoice_amount': 0.0, 'payment_amount': 0.0,
        }
        for key in buckets
    }
    for row in orders:
        bucket = chart.get(row.get('month'))
        if bucket is None:
            continue
        bucket['orders'] += 1
        bucket['order_amount'] += num(row.get('rial_amount'))
        if row.get('group') == 'foreign':
            bucket['foreign_orders'] += 1
            bucket['foreign_amount'] += num(row.get('rial_amount'))
        else:
            bucket['rial_orders'] += 1
            bucket['rial_amount'] += num(row.get('rial_amount'))
    for row in invoices:
        bucket = chart.get(row.get('month'))
        if bucket is not None:
            bucket['invoice_amount'] += num(row.get('rial_amount'))
    for row in payments:
        bucket = chart.get(month_key(row.get('date')))
        if bucket is not None:
            bucket['payment_amount'] += num(row.get('amount'))
    for bucket in chart.values():
        bucket['order_amount'] = round(bucket['order_amount'], 2)
        bucket['rial_amount'] = round(bucket['rial_amount'], 2)
        bucket['foreign_amount'] = round(bucket['foreign_amount'], 2)
        bucket['invoice_amount'] = round(bucket['invoice_amount'], 2)
        bucket['payment_amount'] = round(bucket['payment_amount'], 2)
    return [chart[key] for key in buckets]


def status_breakdown(rows, choices):
    """شمارش وضعیت‌ها به ترتیب ``choices`` مدل + درصد."""
    counts = {}
    for row in rows:
        key = row.get('status') or ''
        counts[key] = counts.get(key, 0) + 1
    total = sum(counts.values())
    result = []
    for key, label in choices:
        count = counts.pop(key, 0)
        if count:
            result.append({
                'key': key, 'label': str(label), 'count': count,
                'percent': round(count / total * 100, 1) if total else 0,
            })
    for key, count in sorted(counts.items()):
        if count:
            result.append({
                'key': key, 'label': key or 'نامشخص', 'count': count,
                'percent': round(count / total * 100, 1) if total else 0,
            })
    return result


def currency_split(documents):
    """تفکیک اسناد به گروه ریالی/ارزی + جمع هر ارز خارجی."""
    groups = {
        'rial': {'count': 0, 'amount': 0.0, 'rial_amount': 0.0},
        'foreign': {'count': 0, 'amount': 0.0, 'rial_amount': 0.0},
    }
    by_currency = {}
    for row in documents:
        group = groups.get(row.get('group') or 'rial', groups['rial'])
        group['count'] += 1
        group['amount'] += num(row.get('amount'))
        group['rial_amount'] += num(row.get('rial_amount'))
        if row.get('group') != 'foreign':
            continue
        key = row.get('currency') or 'ارز'
        bucket = by_currency.setdefault(
            key, {'currency': key, 'count': 0, 'amount': 0.0, 'rial_amount': 0.0},
        )
        bucket['count'] += 1
        bucket['amount'] += num(row.get('amount'))
        bucket['rial_amount'] += num(row.get('rial_amount'))
    for group in groups.values():
        group['average'] = round(group['rial_amount'] / group['count'], 2) if group['count'] else 0.0
        group['amount'] = round(group['amount'], 2)
        group['rial_amount'] = round(group['rial_amount'], 2)
    ordered = sorted(by_currency.values(), key=lambda item: item['rial_amount'], reverse=True)
    for item in ordered:
        item['amount'] = round(item['amount'], 2)
        item['rial_amount'] = round(item['rial_amount'], 2)
    return {'groups': groups, 'by_currency': ordered}


def top_suppliers(documents, limit=6):
    """تأمین‌کنندگان برتر بر اساس معادل ریالی سفارش‌ها."""
    buckets = {}
    for row in documents:
        key = row.get('supplier') or 'بدون تأمین‌کننده'
        item = buckets.setdefault(key, {'name': key, 'count': 0, 'amount': 0.0})
        item['count'] += 1
        item['amount'] += num(row.get('rial_amount'))
    ordered = sorted(buckets.values(), key=lambda item: item['amount'], reverse=True)[:limit]
    for item in ordered:
        item['amount'] = round(item['amount'], 2)
    return ordered


def due_orders(orders, today=None, days=DUE_SOON_DAYS):
    """سفارش‌های باز با تاریخ تحویل نزدیک یا گذشته."""
    today = today or date.today()
    rows = []
    for row in orders:
        if row.get('status') in ('closed', 'cancelled', 'invoiced'):
            continue
        expected = day(row.get('expected_date'))
        if not expected:
            continue
        delta = (expected - today).days
        if delta > days:
            continue
        rows.append({
            'id': row.get('id'),
            'number': row.get('number') or '',
            'supplier': row.get('supplier') or '',
            'status': row.get('status') or '',
            'expected_date': expected.isoformat(),
            'days': delta,
            'rial_amount': round(num(row.get('rial_amount')), 2),
            'group': row.get('group') or 'rial',
        })
    rows.sort(key=lambda item: item['days'])
    return rows


def guarantee_summary(guarantees, today=None, days=EXPIRING_DAYS):
    """خلاصهٔ تضامین خرید + ترکیب انواع (اعتبار با قاعدهٔ قراردادها)."""
    today = today or date.today()
    summary = {
        'total': 0, 'active': 0, 'expiring': 0, 'expired': 0, 'released': 0,
        'total_amount': 0.0, 'active_amount': 0.0,
        'expiring_amount': 0.0, 'released_amount': 0.0,
    }
    kinds = {}
    for row in guarantees:
        amount = num(row.get('amount'))
        summary['total'] += 1
        summary['total_amount'] += amount
        kind = row.get('kind') or 'other'
        bucket = kinds.setdefault(kind, {
            'key': kind, 'label': row.get('kind_label') or kind, 'count': 0, 'amount': 0.0,
        })
        bucket['count'] += 1
        bucket['amount'] += amount
        if row.get('is_released'):
            summary['released'] += 1
            summary['released_amount'] += amount
            continue
        summary['active'] += 1
        summary['active_amount'] += amount
        validity = guarantee_validity(row, today=today)
        days_left = validity.get('days_to_expiry')
        if validity.get('is_expired'):
            summary['expired'] += 1
        elif days_left is not None and days_left <= days:
            summary['expiring'] += 1
            summary['expiring_amount'] += amount
    for key in ('total_amount', 'active_amount', 'expiring_amount', 'released_amount'):
        summary[key] = round(summary[key], 2)
    ordered = sorted(kinds.values(), key=lambda item: item['amount'], reverse=True)
    for item in ordered:
        item['amount'] = round(item['amount'], 2)
    summary['kinds'] = ordered
    return summary


def order_cards(orders, today=None, limit=80):
    """کارت‌های سفارش برای گرید داشبورد (بدون لغوشده، تازه‌ترین‌ها)."""
    today = today or date.today()
    rows = []
    for row in orders:
        if row.get('status') == 'cancelled':
            continue
        expected = day(row.get('expected_date'))
        rows.append({
            'id': row.get('id'),
            'number': row.get('number') or '',
            'supplier': row.get('supplier') or '',
            'status': row.get('status') or '',
            'date': row.get('date'),
            'expected_date': expected.isoformat() if expected else None,
            'days': (expected - today).days if expected else None,
            'amount': round(num(row.get('amount')), 2),
            'rial_amount': round(num(row.get('rial_amount')), 2),
            'group': row.get('group') or 'rial',
            'currency': row.get('currency') or '',
            'rate': row.get('rate') or 1,
        })
    rows.sort(key=lambda item: (item['date'] or '', item['id'] or 0), reverse=True)
    return rows[:limit]


def project_split(documents, limit=6):
    """سفارش‌ها به تفکیک پروژه (برای شناسایی تمرکز خرید)."""
    buckets = {}
    for row in documents:
        key = row.get('project') or 'بدون پروژه'
        item = buckets.setdefault(key, {'label': key, 'count': 0, 'amount': 0.0})
        item['count'] += 1
        item['amount'] += num(row.get('rial_amount'))
    ordered = sorted(buckets.values(), key=lambda item: item['amount'], reverse=True)[:limit]
    for item in ordered:
        item['amount'] = round(item['amount'], 2)
    return ordered


def build_dashboard(counts, orders, invoices, payments, inquiries, guarantees,
                    order_status_choices=(), inquiry_status_choices=(),
                    today=None, months=MONTHS):
    """payload کامل داشبورد از ردیف‌های خام (تابع خالص)."""
    today = today or date.today()
    buckets = month_buckets(months, today)
    valued = [row for row in orders if row.get('status') != 'cancelled']
    monthly = build_monthly(valued, invoices, payments, buckets)
    split = currency_split(valued)

    groups = {}
    for key in ('rial', 'foreign'):
        group_orders = [row for row in valued if row.get('group') == key]
        group_invoices = [row for row in invoices if row.get('group') == key]
        invoiced = sum(num(row.get('rial_amount')) for row in group_invoices)
        paid = sum(num(row.get('paid_amount')) for row in group_invoices)
        groups[key] = {
            'count': len(group_orders),
            'amount': round(sum(num(row.get('rial_amount')) for row in group_orders), 2),
            'average': split['groups'][key]['average'],
            'active': len([row for row in group_orders if row.get('status') in OPEN_ORDER_STATUSES]),
            'invoiced': round(invoiced, 2),
            'paid': round(paid, 2),
            'outstanding': round(max(0.0, invoiced - paid), 2),
            'overdue': len([row for row in group_invoices if row.get('overdue')]),
        }

    total_invoiced = sum(group['invoiced'] for group in groups.values())
    total_paid = sum(group['paid'] for group in groups.values())
    guarantees_data = guarantee_summary(guarantees, today=today)
    totals = {
        'order_amount': round(sum(num(row.get('rial_amount')) for row in valued), 2),
        'invoiced': round(total_invoiced, 2),
        'paid': round(total_paid, 2),
        'outstanding': round(max(0.0, total_invoiced - total_paid), 2),
        'collection_rate': round(total_paid / total_invoiced * 100, 1) if total_invoiced else 0,
        'overdue_invoices': sum(group['overdue'] for group in groups.values()),
        'open_orders': len([row for row in valued if row.get('status') in OPEN_ORDER_STATUSES]),
        'open_inquiries': len([row for row in inquiries if row.get('status') in OPEN_INQUIRY_STATUSES]),
        'rial_count': groups['rial']['count'],
        'foreign_count': groups['foreign']['count'],
        'rial_amount': groups['rial']['amount'],
        'foreign_rial_amount': groups['foreign']['amount'],
        'guarantee_amount': guarantees_data['active_amount'],
        'active_guarantees': guarantees_data['active'],
        'expiring_guarantees': guarantees_data['expiring'],
    }

    return {
        'counts': counts,
        'totals': totals,
        'groups': groups,
        'by_currency': split['by_currency'],
        'monthly': monthly,
        'order_status': status_breakdown(orders, order_status_choices),
        'inquiry_status': status_breakdown(inquiries, inquiry_status_choices),
        'top_suppliers': top_suppliers(valued),
        'projects': project_split(valued),
        'due_orders': due_orders(valued, today=today),
        'orders': order_cards(valued, today=today),
        'guarantees': guarantees_data,
    }
    buckets = {}
    for row in documents:
        key = row.get('project') or 'بدون پروژه'
        item = buckets.setdefault(key, {'label': key, 'count': 0, 'amount': 0.0})
        item['count'] += 1
        item['amount'] += num(row.get('rial_amount'))
    ordered = sorted(buckets.values(), key=lambda item: item['amount'], reverse=True)[:limit]
    for item in ordered:
        item['amount'] = round(item['amount'], 2)
    return ordered
