"""Accounting reports — read-only aggregations over posted documents.

All querysets are company-scoped. Report strings are kept printable and RTL.
"""
from django.db.models import Sum, Count
from django.template.loader import render_to_string
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounting.models import (
    AccountingDocument, AccountingDocumentLine, Account, AccountType,
)


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


def _posted_lines(request):
    """All lines from posted/locked documents, company-scoped."""
    qs = AccountingDocumentLine.objects.filter(
        document__company=_company(request),
        document__status__in=['posted', 'locked'],
    ).select_related('account')
    return qs


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard(request):
    """داشبورد KPI حسابداری."""
    from django.utils import timezone
    company = _company(request)

    docs = AccountingDocument.objects.filter(company=company)
    lines = _posted_lines(request).select_related('account__account_type')

    assets = liabilities = equity = 0
    revenue_month = expense_month = 0
    now = timezone.now()

    for line in lines:
        cat = line.account.account_type.category
        debit = float(line.debit or 0)
        credit = float(line.credit or 0)
        if cat == 'asset':
            assets += debit - credit
        elif cat == 'liability':
            liabilities += credit - debit
        elif cat == 'equity':
            equity += credit - debit

    month_lines = lines.filter(document__date__year=now.year, document__date__month=now.month)
    for line in month_lines:
        cat = line.account.account_type.category
        if cat == 'revenue':
            revenue_month += float(line.credit or 0) - float(line.debit or 0)
        elif cat in ('expense', 'cost_of_sales'):
            expense_month += float(line.debit or 0) - float(line.credit or 0)

    status_counts = {}
    for d in docs.values('status').annotate(c=Count('id')):
        status_counts[d['status']] = d['c']

    return Response({
        'total_assets': assets,
        'total_liabilities': liabilities,
        'total_equity': equity,
        'revenue_month': revenue_month,
        'expense_month': expense_month,
        'net_profit_month': revenue_month - expense_month,
        'pending_documents': status_counts.get('submitted', 0),
        'total_documents': docs.count(),
        'posted_documents': status_counts.get('posted', 0) + status_counts.get('locked', 0),
        'status_counts': status_counts,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def general_ledger(request):
    """دفتر کل: گردش همهٔ حساب‌ها در سندهای ثبت‌شده."""
    from_account = request.query_params.get('account')
    lines = _posted_lines(request).order_by('document__date', 'document__id', 'line_no')
    if from_account:
        lines = lines.filter(account_id=from_account)

    rows = []
    for line in lines:
        rows.append({
            'date': line.document.date.isoformat() if line.document.date else None,
            'document_id': line.document_id,
            'document_number': line.document.number or line.document_id,
            'description': line.description or line.document.description,
            'account_code': line.account.code,
            'account_id': line.account_id,
            'account_name': line.account.name,
            'debit': float(line.debit or 0),
            'credit': float(line.credit or 0),
        })
    total_debit = sum(r['debit'] for r in rows)
    total_credit = sum(r['credit'] for r in rows)
    return Response({'rows': rows, 'total_debit': total_debit, 'total_credit': total_credit})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def account_ledger(request, account_id):
    """دفتر معین یک حساب: گردش + مانده."""
    account = Account.objects.filter(id=account_id, company=_company(request)).first()
    if not account:
        return Response({'error': 'حساب یافت نشد'}, status=404)

    lines = _posted_lines(request).filter(account_id=account_id).order_by('document__date', 'document__id', 'line_no')
    rows = []
    balance = 0
    for line in lines:
        debit = float(line.debit or 0)
        credit = float(line.credit or 0)
        if account.nature == 'debit':
            balance += debit - credit
        else:
            balance += credit - debit
        rows.append({
            'date': line.document.date.isoformat() if line.document.date else None,
            'document_id': line.document_id,
            'document_number': line.document.number or line.document_id,
            'description': line.description or line.document.description,
            'debit': debit,
            'credit': credit,
            'balance': balance,
        })
    total_debit = sum(r['debit'] for r in rows)
    total_credit = sum(r['credit'] for r in rows)
    return Response({
        'account': {'code': account.code, 'name': account.name, 'nature': account.nature},
        'rows': rows,
        'total_debit': total_debit,
        'total_credit': total_credit,
        'balance': balance,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trial_balance(request):
    """تراز آزمایشی: جمع بدهکار/بستانکار و ماندهٔ هر حساب."""
    lines = _posted_lines(request)
    aggregates = {}
    for line in lines:
        agg = aggregates.setdefault(line.account_id, {
            'account_id': line.account_id,
            'account_code': line.account.code,
            'account_name': line.account.name,
            'nature': line.account.nature,
            'debit': 0,
            'credit': 0,
        })
        agg['debit'] += float(line.debit or 0)
        agg['credit'] += float(line.credit or 0)

    rows = []
    for agg in aggregates.values():
        if agg['nature'] == 'debit':
            balance = agg['debit'] - agg['credit']
        else:
            balance = agg['credit'] - agg['debit']
        rows.append({**agg, 'balance': balance})

    total_debit = sum(r['debit'] for r in rows)
    total_credit = sum(r['credit'] for r in rows)
    return Response({
        'rows': rows,
        'total_debit': total_debit,
        'total_credit': total_credit,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def income_statement(request):
    """صورت سود و زیان: درآمد − بهای تمام‌شده = سود ناخالص؛ − هزینه = سود خالص."""
    lines = _posted_lines(request).filter(
        account__account_type__category__in=['revenue', 'expense', 'cost_of_sales'],
    ).select_related('account__account_type')

    buckets = {'revenue': 0, 'cost_of_sales': 0, 'expense': 0}
    expense_by_group = {}
    for line in lines:
        category = line.account.account_type.category
        net = float(line.credit or 0) - float(line.debit or 0)
        if category == 'cost_of_sales':
            net = -net
        buckets[category] += net
        if category == 'expense':
            group = line.account.group.name if line.account.group else 'سایر'
            expense_by_group[group] = expense_by_group.get(group, 0) + (-net if net < 0 else -net)

    revenue = buckets['revenue']
    cost_of_sales = buckets['cost_of_sales']
    expense = -buckets['expense']
    gross_profit = revenue - cost_of_sales
    net_profit = gross_profit - expense

    expense_details = [{'group': g, 'amount': expense_by_group[g]} for g in expense_by_group]
    expense_details.sort(key=lambda x: -x['amount'])

    return Response({
        'revenue': revenue,
        'cost_of_sales': cost_of_sales,
        'gross_profit': gross_profit,
        'expenses': expense,
        'expense_details': expense_details,
        'net_profit': net_profit,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def balance_sheet(request):
    """ترازنامه: دارایی = بدهی + حقوق مالکانه."""
    lines = _posted_lines(request).select_related('account__account_type')

    assets = {}
    liabilities = {}
    equity = {}
    for line in lines:
        category = line.account.account_type.category
        debit = float(line.debit or 0)
        credit = float(line.credit or 0)
        if category == 'asset':
            balance = debit - credit
            target = assets
        elif category == 'liability':
            balance = credit - debit
            target = liabilities
        elif category == 'equity':
            balance = credit - debit
            target = equity
        else:
            continue
        rec = target.setdefault(line.account_id, {
            'id': line.account_id,
            'code': line.account.code,
            'name': line.account.name,
            'balance': 0,
        })
        rec['balance'] += balance

    def to_rows(target):
        rows = list(target.values())
        rows.sort(key=lambda x: x['code'])
        return rows, sum(r['balance'] for r in rows)

    asset_rows, total_assets = to_rows(assets)
    liability_rows, total_liabilities = to_rows(liabilities)
    equity_rows, total_equity = to_rows(equity)

    return Response({
        'assets': asset_rows,
        'total_assets': total_assets,
        'liabilities': liability_rows,
        'total_liabilities': total_liabilities,
        'equity': equity_rows,
        'total_equity': total_equity,
        'total_liabilities_equity': total_liabilities + total_equity,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cash_flow(request):
    """جریان نقدی (روش مستقیم): عملیاتی + سرمایه‌گذاری + تأمین مالی."""
    lines = _posted_lines(request).select_related('account__account_type')

    operating_in = 0
    operating_out = 0
    investing = 0
    financing = 0
    for line in lines:
        category = line.account.account_type.category
        debit = float(line.debit or 0)
        credit = float(line.credit or 0)
        if category == 'revenue':
            operating_in += credit - debit
        elif category in ('expense', 'cost_of_sales'):
            operating_out += debit - credit
        elif category == 'asset':
            if line.account.is_bank_cash:
                continue
            investing += credit - debit
        elif category in ('liability', 'equity'):
            financing += credit - debit

    operating = operating_in - operating_out
    net_change = operating + investing + financing
    return Response({
        'operating': {
            'inflows': operating_in,
            'outflows': operating_out,
            'net': operating,
        },
        'investing': investing,
        'financing': financing,
        'net_change': net_change,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tree_trial_balance(request):
    """تراز درختی حساب‌ها: سلسله‌مراتب حساب با جمع‌شوندگی فرزندان به والد."""
    lines = _posted_lines(request)

    direct = {}
    for line in lines:
        rec = direct.setdefault(line.account_id, {'debit': 0.0, 'credit': 0.0})
        rec['debit'] += float(line.debit or 0)
        rec['credit'] += float(line.credit or 0)

    accounts = list(Account.objects.filter(company=_company(request), is_active=True).order_by('code'))
    nodes = {}
    for a in accounts:
        d = direct.get(a.id, {'debit': 0.0, 'credit': 0.0})
        bal = (d['credit'] - d['debit']) if a.nature == 'credit' else (d['debit'] - d['credit'])
        nodes[a.id] = {
            'id': a.id,
            'code': a.code,
            'name': a.name,
            'level': a.level or 1,
            'parent_id': a.parent_id,
            'nature': a.nature,
            'debit': d['debit'],
            'credit': d['credit'],
            'balance': bal,
            'children': [],
        }

    roots = []
    for a in accounts:
        node = nodes[a.id]
        if node['parent_id'] and node['parent_id'] in nodes:
            nodes[node['parent_id']]['children'].append(node)
        else:
            roots.append(node)

    def rollup(node):
        for child in node['children']:
            rollup(child)
            node['debit'] += child['debit']
            node['credit'] += child['credit']
            node['balance'] += child['balance']

    for r in roots:
        rollup(r)

    def prune(node):
        keep = abs(node['debit']) > 1e-9 or abs(node['credit']) > 1e-9 or abs(node['balance']) > 1e-9
        kept_children = []
        for c in node['children']:
            pruned = prune(c)
            if pruned is not None:
                kept_children.append(pruned)
        node['children'] = kept_children
        return node if (keep or kept_children) else None

    pruned_roots = [p for p in (prune(r) for r in roots) if p is not None]

    return Response({
        'tree': pruned_roots,
        'total_debit': sum(r['debit'] for r in pruned_roots),
        'total_credit': sum(r['credit'] for r in pruned_roots),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def matrix_report(request):
    """گزارش مرور ترکیبی (ماتریس): حساب‌ها در ردیف، مراکز هزینه در ستون."""
    lines = _posted_lines(request).select_related('account', 'cost_center')

    accounts = {}
    cost_centers = {}
    cells = {}

    for line in lines:
        a = line.account_id
        debit = float(line.debit or 0)
        credit = float(line.credit or 0)

        acc = accounts.setdefault(a, {
            'id': a,
            'code': line.account.code,
            'name': line.account.name,
            'nature': line.account.nature,
            'debit': 0.0,
            'credit': 0.0,
        })
        acc['debit'] += debit
        acc['credit'] += credit

        c = line.cost_center_id
        if c:
            cc = cost_centers.setdefault(c, {
                'id': c,
                'code': line.cost_center.code,
                'name': line.cost_center.name,
                'debit': 0.0,
                'credit': 0.0,
            })
            cc['debit'] += debit
            cc['credit'] += credit
            key = f"{a}:{c}"
            cell = cells.setdefault(key, {'debit': 0.0, 'credit': 0.0})
            cell['debit'] += debit
            cell['credit'] += credit

    account_rows = sorted(accounts.values(), key=lambda x: x['code'])
    cost_cols = sorted(cost_centers.values(), key=lambda x: x['code'])

    return Response({
        'accounts': account_rows,
        'cost_centers': cost_cols,
        'cells': cells,
        'total_debit': sum(a['debit'] for a in account_rows),
        'total_credit': sum(a['credit'] for a in account_rows),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ledger_review(request):
    """مرور پله‌ای دفاتر: گردش دفتر به دفتر با ماندهٔ تجمعی (پله‌ای)."""
    from accounting.models import Journal

    docs = (
        AccountingDocument.objects
        .filter(company=_company(request), status__in=['posted', 'locked'])
        .select_related('journal')
        .order_by('date', 'id')
    )
    journals = list(Journal.objects.filter(company=_company(request)).order_by('code'))

    buckets = {j.id: {'journal': j, 'docs': []} for j in journals}
    buckets[None] = {'journal': None, 'docs': []}
    for d in docs:
        buckets[d.journal_id]['docs'].append(d)

    result = []
    for j in journals + [None]:
        bucket = buckets[j.id if j else None]
        steps = []
        running = 0.0
        total_debit = 0.0
        total_credit = 0.0
        for d in bucket['docs']:
            td = float(d.total_debit or 0)
            tc = float(d.total_credit or 0)
            running += td - tc
            total_debit += td
            total_credit += tc
            steps.append({
                'document_id': d.id,
                'number': d.number or str(d.id),
                'date': d.date.isoformat() if d.date else None,
                'description': d.description,
                'debit': td,
                'credit': tc,
                'running': running,
            })
        result.append({
            'journal_id': j.id if j else None,
            'code': j.code if j else 'GENERAL',
            'name': j.name if j else 'عمومی / بدون دفتر',
            'steps': steps,
            'opening': 0.0,
            'total_debit': total_debit,
            'total_credit': total_credit,
            'closing': running,
        })

    return Response({'journals': result})


def _safe_ratio(num, den):
    if not den:
        return None
    return round(num / den, 4)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def financial_statements(request):
    """صورت‌های مالی یکپارچه: ترازنامه + سود و زیان + جریان نقدی + نسبت‌ها."""
    lines = _posted_lines(request).select_related('account__account_type')

    assets, liabilities, equity = {}, {}, {}
    for line in lines:
        category = line.account.account_type.category
        debit = float(line.debit or 0)
        credit = float(line.credit or 0)
        if category == 'asset':
            balance, target = debit - credit, assets
        elif category == 'liability':
            balance, target = credit - debit, liabilities
        elif category == 'equity':
            balance, target = credit - debit, equity
        else:
            continue
        rec = target.setdefault(line.account_id, {
            'id': line.account_id, 'code': line.account.code,
            'name': line.account.name, 'balance': 0.0,
        })
        rec['balance'] += balance

    def to_rows(target):
        rows = sorted(target.values(), key=lambda x: x['code'])
        return rows, sum(r['balance'] for r in rows)

    asset_rows, total_assets = to_rows(assets)
    liability_rows, total_liabilities = to_rows(liabilities)
    equity_rows, total_equity = to_rows(equity)

    buckets = {'revenue': 0.0, 'cost_of_sales': 0.0, 'expense': 0.0}
    expense_by_group = {}
    for line in lines:
        category = line.account.account_type.category
        net = float(line.credit or 0) - float(line.debit or 0)
        if category == 'cost_of_sales':
            net = -net
        buckets[category] += net
        if category == 'expense':
            group = line.account.group.name if line.account.group else 'سایر'
            expense_by_group[group] = expense_by_group.get(group, 0.0) + (-net if net < 0 else -net)

    revenue = buckets['revenue']
    cost_of_sales = buckets['cost_of_sales']
    expense = -buckets['expense']
    gross_profit = revenue - cost_of_sales
    net_profit = gross_profit - expense

    operating_in = operating_out = investing = financing = 0.0
    for line in lines:
        category = line.account.account_type.category
        debit = float(line.debit or 0)
        credit = float(line.credit or 0)
        if category == 'revenue':
            operating_in += credit - debit
        elif category in ('expense', 'cost_of_sales'):
            operating_out += debit - credit
        elif category == 'asset':
            if line.account.is_bank_cash:
                continue
            investing += credit - debit
        elif category in ('liability', 'equity'):
            financing += credit - debit
    operating = operating_in - operating_out
    net_change = operating + investing + financing

    return Response({
        'balance_sheet': {
            'assets': asset_rows, 'total_assets': total_assets,
            'liabilities': liability_rows, 'total_liabilities': total_liabilities,
            'equity': equity_rows, 'total_equity': total_equity,
            'total_liabilities_equity': total_liabilities + total_equity,
        },
        'income_statement': {
            'revenue': revenue,
            'cost_of_sales': cost_of_sales,
            'gross_profit': gross_profit,
            'expenses': expense,
            'expense_details': [{'group': g, 'amount': v} for g, v in expense_by_group.items()],
            'net_profit': net_profit,
        },
        'cash_flow': {
            'operating': operating,
            'operating_in': operating_in,
            'operating_out': operating_out,
            'investing': investing,
            'financing': financing,
            'net_change': net_change,
        },
        'ratios': {
            'debt_ratio': _safe_ratio(total_liabilities, total_assets),
            'equity_ratio': _safe_ratio(total_equity, total_assets),
            'gross_margin': _safe_ratio(gross_profit, revenue),
            'net_margin': _safe_ratio(net_profit, revenue),
            'return_on_equity': _safe_ratio(net_profit, total_equity),
            'return_on_assets': _safe_ratio(net_profit, total_assets),
        },
    })