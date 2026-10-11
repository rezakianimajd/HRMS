"""پروندهٔ پروژه (Project Profile) — تجمیع کامل داده‌های قراردادی، مالی و پرداخت.

خروجی این ماژول با اکشن ``GET /api/projects/{id}/profile/`` برگردانده می‌شود و شامل:
  * قراردادهای مرتبط (پروژهٔ اصلی + تخصیص درصدی) با اقلام/BOQ، الحاقیه‌ها، صورت‌وضعیت‌ها،
    فاکتورها، پرداخت‌ها و ضمانت‌ها
  * جمع ریالی و جمع ارزی قراردادها و الحاقیه‌ها
  * هزینه‌ها (بودجه، تعهد، تراکنش‌های هزینه و ردیف‌های آن‌ها)
  * درآمدها (صورت‌وضعیت‌های پروژه و قرارداد، فاکتورها)
  * پرداخت‌های قراردادی + پرداخت‌ها/اسناد ثبت‌شده در دفاتر حسابداری مرتبط با پروژه
  * داده‌های نمودار (سری ماهانه، تفکیک منشأ هزینه، قراردادها به تفکیک وضعیت)
"""
from django.db.models import Count, Q, Sum

from accounting.constants import REPORTABLE_DOCUMENT_STATUSES
from accounting.models import AccountingDocumentLine
from contracts.models import Addendum, Contract, Guarantee, Invoice, Payment, Statement
from projects.cost_models import (
    BudgetLine, CommittedCost, CostTransaction, CostTransactionLine, ProgressStatement,
)
from projects.models import ContractItem

RIAL_CODES = {'', 'IRR', 'IRT', 'RIAL', 'RIALS'}


def _f(v):
    return round(float(v or 0), 2)


def _agg(qs, field):
    return _f(qs.aggregate(s=Sum(field))['s'])


def _is_rial(currency):
    if currency is None:
        return True
    return (getattr(currency, 'code', '') or '').upper() in RIAL_CODES


def _cur(currency):
    if currency is None:
        return {'id': None, 'code': 'IRR', 'name': 'ریال', 'symbol': 'ریال'}
    return {
        'id': currency.id, 'code': currency.code,
        'name': currency.name, 'symbol': currency.symbol,
    }


def _date(d):
    return d.isoformat() if d else None


def _month(d):
    return d.strftime('%Y-%m') if d else None
def _item_row(i):
    return {
        'id': i.id, 'code': i.code, 'description': i.description, 'unit': i.unit,
        'quantity': _f(i.quantity), 'unit_price': _f(i.unit_price), 'amount': _f(i.amount),
    }


def _addendum_row(a):
    return {
        'id': a.id, 'number': a.number, 'subject': a.subject, 'date': _date(a.date),
        'amount_change': _f(a.amount_change), 'percent_change': _f(a.percent_change),
        'new_end_date': _date(a.new_end_date), 'change_description': a.change_description,
        'currency': _cur(a.currency), 'is_rial': _is_rial(a.currency),
        'provisions': a.provisions or [],
    }


def _statement_row(s):
    return {
        'id': s.id, 'number': s.number, 'date': _date(s.date),
        'amount': _f(s.amount), 'work_done': _f(s.work_done),
        'cumulative_previous_amount': _f(s.cumulative_previous_amount),
        'value_added_tax': _f(s.value_added_tax),
        'additions_total': _f(s.additions_total), 'deductions_total': _f(s.deductions_total),
        'net_amount': _f(s.net_amount), 'is_approved': bool(s.is_approved),
        'currency': _cur(s.currency), 'is_rial': _is_rial(s.currency),
        'exchange_rate': _f(s.exchange_rate),
    }


def _invoice_row(v):
    return {
        'id': v.id, 'number': v.number, 'subject': v.subject, 'date': _date(v.date),
        'due_date': _date(v.due_date), 'amount': _f(v.amount), 'vat': _f(v.vat),
        'total': _f(v.total), 'is_paid': bool(v.is_paid),
        'currency': _cur(v.currency), 'is_rial': _is_rial(v.currency),
    }


def _payment_row(p, source='contract'):
    return {
        'id': p.id, 'date': _date(p.date), 'amount': _f(p.amount),
        'reference': p.reference, 'method': p.method, 'note': p.note, 'source': source,
        'currency': _cur(p.currency), 'is_rial': _is_rial(p.currency),
        'invoice_id': p.invoice_id, 'statement_id': p.statement_id,
    }


def _guarantee_row(g):
    return {
        'id': g.id, 'number': g.number, 'amount': _f(g.amount),
        'guarantee_type': g.guarantee_type, 'instrument_type': g.instrument_type,
        'issue_date': _date(g.issue_date), 'expiry_date': _date(g.expiry_date),
        'bank': g.bank, 'is_released': bool(g.is_released),
        'last_action': g.last_action, 'last_action_date': _date(g.last_action_date),
    }


def _ledger_row(line):
    """ردیف سند حسابداری مرتبط با پروژه/قرارداد (پرداخت به پیمانکار در دفاتر)."""
    doc = line.document
    return {
        'id': line.id,
        'document_id': doc.id,
        'document_number': doc.number or str(doc.id),
        'date': _date(doc.date),
        'description': line.description or doc.description,
        'debit': _f(line.debit), 'credit': _f(line.credit),
        'account_code': line.account.code if line.account_id else '',
        'account_name': line.account.name if line.account_id else '',
        'currency': _cur(line.currency),
        'is_rial': _is_rial(line.currency),
        'exchange_rate': _f(line.exchange_rate),
        'base_amount': _f(line.base_amount),
        'invoice_number': line.invoice_number,
        'reference': line.reference,
        'party_name': (line.auxiliary_1.name if line.auxiliary_1_id
                       else (line.auxiliary.name if line.auxiliary_id else '')),
        'contract_id': line.contract_id,
        'project_id': line.project_id,
        'status': doc.status,
    }


def _contract_payload(contract):
    items = list(ContractItem.objects.filter(contract=contract).order_by('code'))
    addendums = list(Addendum.objects.filter(contract=contract).select_related('currency').order_by('-date'))
    statements = list(Statement.objects.filter(contract=contract).select_related('currency').order_by('-date'))
    invoices = list(Invoice.objects.filter(contract=contract).select_related('currency').order_by('-date'))
    payments = list(Payment.objects.filter(contract=contract).select_related('currency').order_by('-date'))
    guarantees = list(Guarantee.objects.filter(contract=contract).order_by('-created_at'))

    ledger = [
        _ledger_row(l) for l in AccountingDocumentLine.objects.filter(
            document__company_id=contract.company_id,
            document__status__in=REPORTABLE_DOCUMENT_STATUSES,
            contract=contract,
        ).select_related(
            'document', 'account', 'currency', 'auxiliary', 'auxiliary_1',
        ).order_by('-document__date', 'line_no')
    ]

    add_rial = sum(_f(a.amount_change) for a in addendums if _is_rial(a.currency))
    add_cur = sum(_f(a.amount_change) for a in addendums if not _is_rial(a.currency))
    paid_rial = sum(_f(p.amount) for p in payments if _is_rial(p.currency))
    paid_cur = sum(_f(p.amount) for p in payments if not _is_rial(p.currency))

    return {
        'id': contract.id,
        'number': contract.number,
        'subject': contract.subject,
        'party_id': contract.party_id,
        'party_name': contract.party.name if contract.party_id else '',
        'party_type': contract.party.party_type if contract.party_id else '',
        'contract_type': contract.contract_type,
        'contract_type_display': contract.get_contract_type_display(),
        'status': contract.status,
        'status_display': contract.get_status_display(),
        'amount': _f(contract.amount),
        'is_rial': _is_rial(contract.currency),
        'currency': _cur(contract.currency),
        'start_date': _date(contract.start_date),
        'end_date': _date(contract.end_date),
        'signing_date': _date(contract.signing_date),
        'project_name': contract.project_name,
        'project_location': contract.project_location,
        'tender_number': contract.tender_number,
        'advance_payment': _f(contract.advance_payment),
        'retention_percent': _f(contract.retention_percent),
        'payment_terms': contract.payment_terms,
        'totals': {
            'items_count': len(items),
            'items_amount': sum(_f(i.amount) for i in items),
            'addendums_count': len(addendums),
            'addendum_rial': add_rial,
            'addendum_currency': add_cur,
            'final_amount': _f(contract.amount) + add_rial + add_cur,
            'statements_count': len(statements),
            'statements_cumulative': max([_f(s.amount) for s in statements] or [0]),
            'statements_net': sum(_f(s.net_amount) for s in statements),
            'invoices_count': len(invoices),
            'invoices_total': sum(_f(v.total) for v in invoices),
            'invoices_paid': sum(_f(v.total) for v in invoices if v.is_paid),
            'payments_count': len(payments),
            'paid_rial': paid_rial,
            'paid_currency': paid_cur,
            'paid_total': paid_rial + paid_cur,
            'guarantees_count': len(guarantees),
            'guarantee_total': sum(_f(g.amount) for g in guarantees),
            'ledger_lines': len(ledger),
            'ledger_debit': sum(r['debit'] for r in ledger),
            'ledger_credit': sum(r['credit'] for r in ledger),
        },
        'items': [_item_row(i) for i in items],
        'addendums': [_addendum_row(a) for a in addendums],
        'statements': [_statement_row(s) for s in statements],
        'invoices': [_invoice_row(v) for v in invoices],
        'payments': [_payment_row(p) for p in payments],
        'guarantees': [_guarantee_row(g) for g in guarantees],
        'ledger': ledger,
    }


def build_project_profile(project):
    """ساخت پروندهٔ کامل پروژه — همهٔ اعداد تجمیعی برای صفحهٔ پرونده."""
    company = project.company

    # ---------- ۱) قراردادهای مرتبط (پروژهٔ اصلی یا تخصیص درصدی) ----------
    contracts = list(
        Contract.objects.filter(company=company)
        .filter(Q(project=project) | Q(project_allocations__contains=[{'project': project.id}]))
        .select_related('party', 'currency')
        .order_by('-signing_date', '-created_at')
    )
    contract_payloads = [_contract_payload(c) for c in contracts]
    contract_ids = [c.id for c in contracts]

    for c, cp in zip(contracts, contract_payloads):
        pct = 100.0
        if c.project_id != project.id and c.project_allocations:
            for row in c.project_allocations:
                if str(row.get('project')) == str(project.id):
                    pct = float(row.get('percentage') or 0)
                    break
        cp['allocation_percent'] = pct

    # ---------- ۲) جمع ریالی / ارزی ----------
    rial_total = sum(cp['amount'] for cp in contract_payloads if cp['is_rial'])
    currency_map = {}
    for cp in contract_payloads:
        if cp['is_rial']:
            continue
        code = cp['currency']['code']
        entry = currency_map.setdefault(code, {
            'code': code, 'name': cp['currency']['name'], 'symbol': cp['currency']['symbol'],
            'contracts_amount': 0.0, 'addendum_amount': 0.0, 'paid_amount': 0.0, 'count': 0,
        })
        entry['contracts_amount'] += cp['amount']
        entry['addendum_amount'] += cp['totals']['addendum_currency']
        entry['paid_amount'] += cp['totals']['paid_currency']
        entry['count'] += 1

    addendum_rial = sum(cp['totals']['addendum_rial'] for cp in contract_payloads)
    items_amount = sum(cp['totals']['items_amount'] for cp in contract_payloads)
    paid_rial = sum(cp['totals']['paid_rial'] for cp in contract_payloads)
    paid_currency_total = sum(e['paid_amount'] for e in currency_map.values())
    invoices_total = sum(cp['totals']['invoices_total'] for cp in contract_payloads)

    # ---------- ۳) هزینه‌ها ----------
    budget_qs = BudgetLine.objects.filter(project=project)
    committed_qs = CommittedCost.objects.filter(project=project)
    cost_tx_qs = CostTransaction.objects.filter(project=project)
    cost_lines_qs = CostTransactionLine.objects.filter(transaction__project=project)

    budget = _agg(budget_qs, 'amount')
    committed = _agg(committed_qs, 'amount')
    actual_cost = _agg(cost_lines_qs, 'net_amount')

    costs_by_source = [
        {
            'id': r['transaction__cost_source__id'],
            'name': r['transaction__cost_source__name'] or 'بدون منشأ',
            'amount': _f(r['total']), 'count': r['count'],
        }
        for r in cost_lines_qs
        .values('transaction__cost_source__id', 'transaction__cost_source__name')
        .annotate(total=Sum('net_amount'), count=Count('id'))
        .order_by('-total')
    ]
    costs_by_wbs = [
        {
            'id': r['wbs__id'], 'code': r['wbs__code'] or '',
            'name': r['wbs__name'] or 'بدون WBS', 'amount': _f(r['total']),
        }
        for r in cost_lines_qs.values('wbs__id', 'wbs__code', 'wbs__name')
        .annotate(total=Sum('net_amount')).order_by('-total')[:15]
    ]
    transactions = [
        {
            'id': t.id, 'number': t.number, 'date': _date(t.date),
            'cost_source': t.cost_source.name if t.cost_source_id else '',
            'contract_id': t.contract_id,
            'contract_number': t.contract.number if t.contract_id else '',
            'currency': t.currency,
            'description': t.description,
            'amount': _f(t.total),
            'accounting_reference': t.accounting_reference,
            'purchase_reference': t.purchase_reference,
            'payroll_reference': t.payroll_reference,
            'warehouse_reference': t.warehouse_reference,
        }
        for t in cost_tx_qs.select_related('cost_source', 'contract')
        .annotate(total=Sum('lines__net_amount')).order_by('-date')[:200]
    ]
    committed_rows = [
        {
            'id': c.id, 'date': _date(c.date), 'description': c.description,
            'amount': _f(c.amount), 'reference': c.reference,
            'contract_id': c.contract_id,
            'contract_number': c.contract.number if c.contract_id else '',
        }
        for c in committed_qs.select_related('contract').order_by('-date')[:200]
    ]
    budget_rows = [
        {
            'id': b.id, 'description': b.description, 'unit': b.unit,
            'quantity': _f(b.quantity), 'unit_cost': _f(b.unit_cost), 'amount': _f(b.amount),
            'wbs': b.wbs.code if b.wbs_id else '',
            'cost_source': b.cost_source.name if b.cost_source_id else '',
        }
        for b in budget_qs.select_related('wbs', 'cost_source').order_by('id')[:200]
    ]

    # ---------- ۴) درآمدها (صورت‌وضعیت‌های پروژه) ----------
    progress_qs = ProgressStatement.objects.filter(project=project)
    progress_rows = [
        {
            'id': p.id, 'number': p.number, 'date': _date(p.date),
            'contract_id': p.contract_id,
            'contract_number': p.contract.number if p.contract_id else '',
            'gross': _f(p.gross), 'retention': _f(p.retention),
            'insurance': _f(p.insurance), 'tax': _f(p.tax), 'adjustment': _f(p.adjustment),
            'net_payable': _f(p.net_payable), 'is_approved': bool(p.is_approved),
            'items_count': p.items.count(),
        }
        for p in progress_qs.select_related('contract').order_by('-date')[:200]
    ]
    revenue_accrued = _agg(progress_qs, 'net_payable')
    revenue_gross = _agg(progress_qs, 'gross')

    # ---------- ۵) پرداخت‌ها ----------
    contract_payments = []
    for cp in contract_payloads:
        for p in cp['payments']:
            contract_payments.append({
                **p,
                'contract_id': cp['id'], 'contract_number': cp['number'],
                'contract_subject': cp['subject'], 'party_name': cp['party_name'],
            })
    contract_payments.sort(key=lambda r: r['date'] or '', reverse=True)

    ledger_lines = [
        _ledger_row(l) for l in AccountingDocumentLine.objects.filter(
            document__company=company,
            document__status__in=REPORTABLE_DOCUMENT_STATUSES,
        ).filter(Q(project=project) | Q(contract_id__in=contract_ids))
        .select_related('document', 'account', 'currency', 'auxiliary', 'auxiliary_1')
        .order_by('-document__date', 'line_no')[:400]
    ]

    # ---------- ۶) نمودارها ----------
    monthly = {}

    def bump(month, key, value):
        if not month:
            return
        row = monthly.setdefault(month, {'month': month, 'cost': 0.0, 'revenue': 0.0, 'payment': 0.0})
        row[key] += float(value or 0)

    for r in cost_lines_qs.values('transaction__date').annotate(total=Sum('net_amount')):
        bump(_month(r['transaction__date']), 'cost', r['total'])
    for r in progress_qs.values('date').annotate(total=Sum('net_payable')):
        bump(_month(r['date']), 'revenue', r['total'])
    for r in Payment.objects.filter(contract_id__in=contract_ids).values('date').annotate(total=Sum('amount')):
        bump(_month(r['date']), 'payment', r['total'])

    contracts_by_status = [
        {'status': r['status'], 'count': r['count'], 'amount': _f(r['total'])}
        for r in Contract.objects.filter(id__in=contract_ids).values('status')
        .annotate(count=Count('id'), total=Sum('amount')).order_by('-total')
    ]

    # ---------- ۷) خلاصه و خروجی ----------
    progress_percent = round(min(100.0, (revenue_accrued / rial_total) * 100), 1) if rial_total else 0.0

    summary = {
        'contracts_count': len(contract_payloads),
        'contracts_rial': rial_total,
        'contracts_currency': list(currency_map.values()),
        'addendum_rial': addendum_rial,
        'contracts_final_rial': rial_total + addendum_rial,
        'items_count': sum(len(cp['items']) for cp in contract_payloads),
        'items_amount': items_amount,
        'budget': budget,
        'committed': committed,
        'actual_cost': actual_cost,
        'remaining_budget': budget - actual_cost,
        'variance': budget - actual_cost,
        'forecast': committed + actual_cost,
        'revenue_accrued': revenue_accrued,
        'revenue_gross': revenue_gross,
        'invoices_total': invoices_total,
        'paid_rial': paid_rial,
        'paid_currency_total': paid_currency_total,
        'paid_total': paid_rial + paid_currency_total,
        'ledger_debit': sum(r['debit'] for r in ledger_lines),
        'ledger_credit': sum(r['credit'] for r in ledger_lines),
        'ledger_lines': len(ledger_lines),
        'payments_count': len(contract_payments),
        'guarantees_count': sum(cp['totals']['guarantees_count'] for cp in contract_payloads),
        'guarantee_total': sum(cp['totals']['guarantee_total'] for cp in contract_payloads),
        'progress_percent': progress_percent,
    }

    project_row = {
        'id': project.id,
        'code': project.code,
        'name': project.name,
        'status': project.status,
        'status_display': project.get_status_display(),
        'client': project.client,
        'location': project.location,
        'start_date': _date(project.start_date),
        'end_date': _date(project.end_date),
        'manager_id': project.manager_id,
        'manager_name': str(project.manager) if project.manager_id else '',
        'project_type': project.project_type.name if project.project_type_id else '',
        'description': project.description,
    }

    return {
        'project': project_row,
        'summary': summary,
        'contracts': contract_payloads,
        'contract_items': [
            {**item, 'contract_id': cp['id'], 'contract_number': cp['number'],
             'contract_subject': cp['subject'], 'party_name': cp['party_name'],
             'currency_code': cp['currency']['code']}
            for cp in contract_payloads for item in cp['items']
        ],
        'addendums': [
            {**a, 'contract_id': cp['id'], 'contract_number': cp['number'],
             'contract_subject': cp['subject']}
            for cp in contract_payloads for a in cp['addendums']
        ],
        'guarantees': [
            {**g, 'contract_id': cp['id'], 'contract_number': cp['number']}
            for cp in contract_payloads for g in cp['guarantees']
        ],
        'costs': {
            'budget_rows': budget_rows,
            'committed_rows': committed_rows,
            'transactions': transactions,
            'by_source': costs_by_source,
            'by_wbs': costs_by_wbs,
        },
        'revenues': {'progress_statements': progress_rows},
        'payments': {'contract': contract_payments, 'ledger': ledger_lines},
        'charts': {
            'monthly': [monthly[k] for k in sorted(monthly)],
            'cost_by_source': costs_by_source,
            'contracts_by_status': contracts_by_status,
        },
    }




