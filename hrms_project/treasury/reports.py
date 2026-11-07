"""گزارش‌های دریافت و پرداخت خزانه (§۲۷) — تجمیع سمت سرور، بدون N+1.

هر گزارش یک ساختار یکسان برمی‌گرداند:
``{'key','title','columns':[{'key','label','width'}], 'rows':[...], 'totals':{...}}``
و از همان داده برای خروجی Excel استفاده می‌شود.
"""
from decimal import Decimal

from django.db.models import DecimalField, Sum, Value
from django.db.models.functions import Coalesce

ZERO = Decimal('0')


def _range(queryset, field, date_from, date_to):
    if date_from:
        queryset = queryset.filter(**{f'{field}__gte': date_from})
    if date_to:
        queryset = queryset.filter(**{f'{field}__lte': date_to})
    return queryset


def _money(value):
    return str(value or ZERO)


def _total(rows, key):
    return _money(sum((Decimal(row[key]) for row in rows), ZERO))


def daily_report(company, date_from=None, date_to=None, entity_id=None):
    from treasury.models import TreasuryTransaction

    qs = TreasuryTransaction.objects.filter(company=company, status='posted')
    if entity_id:
        qs = qs.filter(entity_id=entity_id)
    qs = _range(qs, 'date', date_from, date_to)
    rows_map = {}
    for row in qs.values('date', 'direction').annotate(total=Sum('amount')):
        entry = rows_map.setdefault(
            row['date'], {'date': row['date'], 'receipts': ZERO, 'payments': ZERO},
        )
        entry['receipts' if row['direction'] == 'receipt' else 'payments'] = row['total'] or ZERO
    rows = [
        {
            'date': entry['date'].isoformat(),
            'receipts': _money(entry['receipts']),
            'payments': _money(entry['payments']),
            'net': _money(entry['receipts'] - entry['payments']),
        }
        for entry in sorted(rows_map.values(), key=lambda item: item['date'])
    ]
    return {
        'key': 'daily',
        'title': 'گزارش روزانه دریافت و پرداخت',
        'columns': [
            {'key': 'date', 'label': 'تاریخ', 'width': '20%'},
            {'key': 'receipts', 'label': 'دریافت', 'width': '26%'},
            {'key': 'payments', 'label': 'پرداخت', 'width': '26%'},
            {'key': 'net', 'label': 'خالص', 'width': '28%'},
        ],
        'rows': rows,
        'totals': {
            'receipts': _total(rows, 'receipts'),
            'payments': _total(rows, 'payments'),
            'net': _total(rows, 'net'),
        },
    }


def by_party_report(company, date_from=None, date_to=None, entity_id=None):
    from treasury.models import TreasuryTransaction

    qs = TreasuryTransaction.objects.filter(
        company=company, status='posted',
    ).exclude(party='')
    if entity_id:
        qs = qs.filter(entity_id=entity_id)
    qs = _range(qs, 'date', date_from, date_to)
    rows_map = {}
    for row in qs.values('party', 'direction').annotate(total=Sum('amount')):
        entry = rows_map.setdefault(
            row['party'], {'party': row['party'], 'receipts': ZERO, 'payments': ZERO},
        )
        entry['receipts' if row['direction'] == 'receipt' else 'payments'] = row['total'] or ZERO
    rows = [
        {
            'party': entry['party'],
            'receipts': _money(entry['receipts']),
            'payments': _money(entry['payments']),
            'net': _money(entry['receipts'] - entry['payments']),
        }
        for entry in sorted(
            rows_map.values(),
            key=lambda item: (item['receipts'] + item['payments']),
            reverse=True,
        )
    ]
    return {
        'key': 'by_party',
        'title': 'دریافت/پرداخت به تفکیک طرف حساب',
        'columns': [
            {'key': 'party', 'label': 'طرف حساب', 'width': '34%'},
            {'key': 'receipts', 'label': 'دریافت', 'width': '22%'},
            {'key': 'payments', 'label': 'پرداخت', 'width': '22%'},
            {'key': 'net', 'label': 'خالص', 'width': '22%'},
        ],
        'rows': rows,
        'totals': {
            'receipts': _total(rows, 'receipts'),
            'payments': _total(rows, 'payments'),
            'net': _total(rows, 'net'),
        },
    }


def cash_flow_report(company, date_from=None, date_to=None, entity_id=None):
    from treasury.models import TreasuryEntity, TreasuryTransaction

    entities_qs = TreasuryEntity.objects.filter(company=company)
    if entity_id:
        entities_qs = entities_qs.filter(id=entity_id)
    entities = list(entities_qs.values(
        'id', 'code', 'name', 'entity_type', 'initial_balance',
    ))
    qs = TreasuryTransaction.objects.filter(company=company, status='posted')
    if entity_id:
        qs = qs.filter(entity_id=entity_id)
    qs = _range(qs, 'date', date_from, date_to)
    flow = {}
    for row in qs.values('entity_id', 'direction').annotate(total=Sum('amount')):
        entry = flow.setdefault(row['entity_id'], {'receipt': ZERO, 'payment': ZERO})
        entry[row['direction']] = row['total'] or ZERO
    rows = []
    for entity in entities:
        entry = flow.get(entity['id'], {'receipt': ZERO, 'payment': ZERO})
        rows.append({
            'entity': f"{entity['code']} — {entity['name']}",
            'type': 'صندوق' if entity['entity_type'] == 'cash' else 'بانک',
            'receipts': _money(entry['receipt']),
            'payments': _money(entry['payment']),
            'balance': _money(
                (entity['initial_balance'] or ZERO) + entry['receipt'] - entry['payment']
            ),
        })
    return {
        'key': 'cash_flow',
        'title': 'گردش حساب‌ها و صندوق‌ها',
        'columns': [
            {'key': 'entity', 'label': 'حساب/صندوق', 'width': '34%'},
            {'key': 'type', 'label': 'نوع', 'width': '10%'},
            {'key': 'receipts', 'label': 'دریافت', 'width': '18%'},
            {'key': 'payments', 'label': 'پرداخت', 'width': '18%'},
            {'key': 'balance', 'label': 'مانده', 'width': '20%'},
        ],
        'rows': rows,
        'totals': {
            'receipts': _total(rows, 'receipts'),
            'payments': _total(rows, 'payments'),
            'balance': _total(rows, 'balance'),
        },
    }


def received_checks_report(company, date_from=None, date_to=None, statuses=None, **kwargs):
    from treasury.models import ReceivedCheck

    qs = ReceivedCheck.objects.filter(company=company)
    if statuses:
        qs = qs.filter(status__in=statuses)
    qs = _range(qs, 'due_date', date_from, date_to)
    rows = [
        {
            'number': row.number,
            'party': row.party,
            'bank': row.bank_name,
            'due_date': row.due_date.isoformat() if row.due_date else '',
            'amount': _money(row.amount),
            'status': row.get_status_display(),
        }
        for row in qs.order_by('due_date')
    ]
    return {
        'key': 'received_checks',
        'title': 'چک‌های دریافتی',
        'columns': [
            {'key': 'number', 'label': 'شماره چک', 'width': '16%'},
            {'key': 'party', 'label': 'صادرکننده', 'width': '24%'},
            {'key': 'bank', 'label': 'بانک', 'width': '18%'},
            {'key': 'due_date', 'label': 'سررسید', 'width': '14%'},
            {'key': 'amount', 'label': 'مبلغ', 'width': '16%'},
            {'key': 'status', 'label': 'وضعیت', 'width': '12%'},
        ],
        'rows': rows,
        'totals': {'amount': _total(rows, 'amount'), 'count': len(rows)},
    }


def issued_checks_report(company, date_from=None, date_to=None, statuses=None, **kwargs):
    from treasury.models import IssuedCheck

    qs = IssuedCheck.objects.filter(company=company).select_related('checkbook')
    if statuses:
        qs = qs.filter(status__in=statuses)
    qs = _range(qs, 'due_date', date_from, date_to)
    rows = [
        {
            'number': row.number,
            'party': row.party,
            'bank': getattr(row.checkbook, 'bank_name', ''),
            'due_date': row.due_date.isoformat() if row.due_date else '',
            'amount': _money(row.amount),
            'status': row.get_status_display(),
        }
        for row in qs.order_by('due_date')
    ]
    return {
        'key': 'issued_checks',
        'title': 'چک‌های پرداختی',
        'columns': [
            {'key': 'number', 'label': 'شماره چک', 'width': '16%'},
            {'key': 'party', 'label': 'ذی‌نفع', 'width': '26%'},
            {'key': 'bank', 'label': 'بانک', 'width': '18%'},
            {'key': 'due_date', 'label': 'سررسید', 'width': '14%'},
            {'key': 'amount', 'label': 'مبلغ', 'width': '16%'},
            {'key': 'status', 'label': 'وضعیت', 'width': '10%'},
        ],
        'rows': rows,
        'totals': {'amount': _total(rows, 'amount'), 'count': len(rows)},
    }



def transfers_report(company, date_from=None, date_to=None, **kwargs):
    from treasury.operation_models import TreasuryTransfer

    qs = TreasuryTransfer.objects.filter(company=company).select_related(
        'source', 'destination',
    )
    qs = _range(qs, 'date', date_from, date_to)
    rows = [
        {
            'number': row.number or f'#{row.pk}',
            'date': row.date.isoformat(),
            'source': getattr(row.source, 'name', ''),
            'destination': getattr(row.destination, 'name', ''),
            'amount': _money(row.amount),
            'fee': _money(row.fee),
            'status': row.get_status_display(),
        }
        for row in qs.order_by('-date')
    ]
    return {
        'key': 'transfers',
        'title': 'انتقال‌های بین حساب‌ها',
        'columns': [
            {'key': 'number', 'label': 'شماره', 'width': '14%'},
            {'key': 'date', 'label': 'تاریخ', 'width': '12%'},
            {'key': 'source', 'label': 'مبدأ', 'width': '20%'},
            {'key': 'destination', 'label': 'مقصد', 'width': '20%'},
            {'key': 'amount', 'label': 'مبلغ', 'width': '14%'},
            {'key': 'fee', 'label': 'کارمزد', 'width': '10%'},
            {'key': 'status', 'label': 'وضعیت', 'width': '10%'},
        ],
        'rows': rows,
        'totals': {
            'amount': _total(rows, 'amount'),
            'fee': _total(rows, 'fee'),
            'count': len(rows),
        },
    }


REPORTS = {
    'daily': daily_report,
    'by_party': by_party_report,
    'cash_flow': cash_flow_report,
    'receivables_due': lambda company, **kw: received_checks_report(
        company, statuses=('registered', 'in_custody', 'deposited', 'clearing'), **kw,
    ),
    'cheques_returned': lambda company, **kw: received_checks_report(
        company, statuses=('bounced', 'returned_to_customer'), **kw,
    ),
    'issued_due': lambda company, **kw: issued_checks_report(
        company, statuses=('draft', 'issued', 'delivered'), **kw,
    ),
    'issued_returned': lambda company, **kw: issued_checks_report(
        company, statuses=('bounced', 'returned'), **kw,
    ),
    'transfers': transfers_report,
}


def report_catalog():
    """فهرست گزارش‌های موجود (برای صفحهٔ گزارش‌ها)."""
    return [
        {'key': 'daily', 'title': 'روزانه دریافت و پرداخت'},
        {'key': 'by_party', 'title': 'به تفکیک طرف حساب'},
        {'key': 'cash_flow', 'title': 'گردش حساب/صندوق'},
        {'key': 'receivables_due', 'title': 'اسناد دریافتنی باز'},
        {'key': 'cheques_returned', 'title': 'چک‌های برگشتی/عودتی'},
        {'key': 'issued_due', 'title': 'چک‌های پرداختی باز'},
        {'key': 'issued_returned', 'title': 'چک‌های پرداختی برگشتی'},
        {'key': 'transfers', 'title': 'انتقال‌های بانکی'},
    ]


def build_report(kind, company, date_from=None, date_to=None, entity_id=None):
    builder = REPORTS.get(kind)
    if builder is None:
        raise KeyError(kind)
    return builder(company, date_from=date_from, date_to=date_to, entity_id=entity_id)

