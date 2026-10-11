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
    AccountGroup, AuxiliaryAccount,
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
def dashboard_rich(request):
    """داشبورد غنی: KPI + روند ماهانه + ترکیب طبقات + وضعیت اسناد + معادلهٔ حسابداری.

    داده‌ها یکجا برگردانده می‌شوند تا فرانت بتواند داشبورد تعاملی/گرافیکی بسازد.
    """
    from django.utils import timezone
    import calendar

    company = _company(request)
    qs = _posted_lines(request).select_related('account__account_type', 'document')

    year_id = request.query_params.get('fiscal_year')
    if year_id:
        qs = qs.filter(document__fiscal_year_id=year_id)

    now = timezone.now()

    totals = {
        'asset': 0.0, 'liability': 0.0, 'equity': 0.0,
        'revenue': 0.0, 'expense': 0.0, 'cost_of_sales': 0.0,
    }
    monthly = {}
    account_turnover = {}

    def cat_net(line):
        cat = line.account.account_type.category
        debit = float(line.debit or 0)
        credit = float(line.credit or 0)
        if cat in ('asset', 'expense', 'cost_of_sales'):
            return cat, debit - credit
        return cat, credit - debit

    for line in qs:
        cat, net = cat_net(line)
        if cat in totals:
            totals[cat] += net

        # روند ماهانه
        if line.document.date:
            month = line.document.date.strftime('%Y-%m')
            m = monthly.setdefault(month, {'month': month, 'revenue': 0.0, 'expense': 0.0})
            if cat == 'revenue':
                m['revenue'] += net
            elif cat in ('expense', 'cost_of_sales'):
                m['expense'] += net

        # گردش حساب برای Top accounts
        turnover = float(line.debit or 0) + float(line.credit or 0)
        account_turnover[line.account_id] = account_turnover.get(line.account_id, 0.0) + turnover

    # روند ماهانه مرتب + net
    monthly_rows = []
    for month in sorted(monthly.keys()):
        rec = monthly[month]
        monthly_rows.append({
            'month': rec['month'],
            'revenue': round(rec['revenue'], 2),
            'expense': round(rec['expense'], 2),
            'net': round(rec['revenue'] - rec['expense'], 2),
        })
    last_months = monthly_rows[-12:]

    # دلتا (آخرین ماه کامل vs ماه قبل)
    def delta(key):
        if len(monthly_rows) < 2:
            return None
        prev = monthly_rows[-2][key]
        cur = monthly_rows[-1][key]
        if prev == 0:
            return None if cur == 0 else 100.0
        return round((cur - prev) / abs(prev) * 100, 1)

    # ماه جاری (ریال)
    cur_month_key = now.strftime('%Y-%m')
    cm = next((m for m in monthly_rows if m['month'] == cur_month_key), None)
    revenue_month = cm['revenue'] if cm else 0.0
    expense_month = cm['expense'] if cm else 0.0
    net_month = revenue_month - expense_month

    # ترکیب طبقات
    category_labels = {
        'asset': 'دارایی', 'liability': 'بدهی', 'equity': 'حقوق مالکانه',
        'revenue': 'درآمد', 'expense': 'هزینه', 'cost_of_sales': 'بهای تمام‌شده',
        'memorandum': 'انتظامی',
    }
    category_breakdown = [
        {'key': k, 'label': category_labels.get(k, k), 'value': round(v, 2)}
        for k, v in totals.items()
    ]

    # وضعیت اسناد
    docs = AccountingDocument.objects.filter(company=company)
    if year_id:
        docs = docs.filter(fiscal_year_id=year_id)
    status_counts = {}
    for d in docs.values('status').annotate(c=Count('id')):
        status_counts[d['status']] = d['c']

    total_documents = docs.count()
    posted_documents = status_counts.get('posted', 0) + status_counts.get('locked', 0)
    pending_documents = status_counts.get('submitted', 0)

    # معادلهٔ حسابداری
    liabilities_equity = totals['liability'] + totals['equity']
    difference = totals['asset'] - liabilities_equity
    balanced = abs(difference) < 0.01

    # اسناد اخیر (۱۰ سند آخر)
    recent_documents = []
    for doc in docs.select_related('journal').order_by('-created_at')[:10]:
        recent_documents.append({
            'id': doc.id,
            'number': doc.number or str(doc.id),
            'date': doc.date.isoformat() if doc.date else None,
            'description': doc.description,
            'status': doc.status,
            'status_display': doc.get_status_display(),
            'total_debit': float(doc.total_debit or 0),
            'total_credit': float(doc.total_credit or 0),
            'journal_name': doc.journal.name if doc.journal else None,
        })

    # Top accounts (۵ حساب با بیشترین گردش)
    top_account_ids = sorted(account_turnover.items(), key=lambda x: -x[1])[:5]
    top_accounts = []
    for aid, turnover in top_account_ids:
        acc = Account.objects.filter(id=aid).only('code', 'name').first()
        if acc:
            top_accounts.append({'id': aid, 'code': acc.code, 'name': acc.name, 'turnover': round(turnover, 2)})

    # ارزش افزوده (فقط مشمول)
    vat_payable = 0.0
    vat_receivable = 0.0
    for line in qs.filter(season_flag=True):
        vat = float(line.vat_amount or 0)
        if line.invoice_type in ('sale', 'export'):
            vat_payable += vat
        elif line.invoice_type in ('purchase', 'import'):
            vat_receivable += vat

    # کهنگی مانده (Aging) بر اساس سررسید
    aging = {
        'receivable': {'current': 0.0, 'd30': 0.0, 'd60': 0.0, 'd90': 0.0, 'total': 0.0},
        'payable': {'current': 0.0, 'd30': 0.0, 'd60': 0.0, 'd90': 0.0, 'total': 0.0},
    }
    for line in qs.filter(maturity_date__isnull=False):
        cat = line.account.account_type.category
        debit = float(line.debit or 0)
        credit = float(line.credit or 0)
        if cat == 'asset' and debit > credit:
            bucket = aging['receivable']
            amount = debit - credit
        elif cat == 'liability' and credit > debit:
            bucket = aging['payable']
            amount = credit - debit
        else:
            continue
        days = (line.maturity_date - now.date()).days
        if days < 0:
            key = 'd90'
        elif days <= 30:
            key = 'current'
        elif days <= 60:
            key = 'd30'
        elif days <= 90:
            key = 'd60'
        else:
            key = 'd90'
        bucket[key] += amount
        bucket['total'] += amount

    return Response({
        'kpis': {
            'total_assets': round(totals['asset'], 2),
            'total_liabilities': round(totals['liability'], 2),
            'total_equity': round(totals['equity'], 2),
            'revenue_month': round(revenue_month, 2),
            'expense_month': round(expense_month, 2),
            'net_profit_month': round(net_month, 2),
            'vat_payable': round(vat_payable, 2),
            'vat_receivable': round(vat_receivable, 2),
            'total_documents': total_documents,
            'posted_documents': posted_documents,
            'pending_documents': pending_documents,
        },
        'deltas': {
            'revenue': delta('revenue'),
            'expense': delta('expense'),
            'net': delta('net'),
        },
        'monthly_trend': last_months,
        'category_breakdown': category_breakdown,
        'status_counts': status_counts,
        'accounting_equation': {
            'assets': round(totals['asset'], 2),
            'liabilities_equity': round(liabilities_equity, 2),
            'difference': round(difference, 2),
            'balanced': balanced,
        },
        'top_accounts': top_accounts,
        'aging': aging,
        'vat_summary': {
            'payable': round(vat_payable, 2),
            'receivable': round(vat_receivable, 2),
            'net': round(vat_payable - vat_receivable, 2),
        },
        'recent_documents': recent_documents,
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
    """گزارش مرور ترکیبی (ماتریس): تراز سلسله‌مراتبی پله‌ای.

    ستون عمودی (ردیف‌ها): گروه → کل → معین → تفصیل ۱ → تفصیل ۲ → تفصیل ۳.
    ستون افقی (بالای جدول): سطح تفکیک — ریز گروه، ریز کل، ریز معین،
    ریز تفصیل ۱، ریز تفصیل ۲، ریز تفصیل ۳.
    برای هر سطر: کد حساب، شرح، گردش بدهکار، گردش بستانکار، مانده بدهکار، مانده بستانکار.
    """
    company = _company(request)
    lines = _posted_lines(request).select_related(
        'account', 'account__account_type', 'account__group',
        'auxiliary_1', 'auxiliary_2', 'auxiliary_3',
    )

    def resolve_nature(nature, account_type):
        if nature and nature != 'none':
            return nature
        if account_type is not None and getattr(account_type, 'default_nature', 'none') != 'none':
            return account_type.default_nature
        return 'debit'

    def balances(debit, credit, nature):
        """(balance_debit, balance_credit) بر اساس ماهیت."""
        if nature == 'credit':
            diff = credit - debit
            return (0.0, diff) if diff >= 0 else (-diff, 0.0)
        diff = debit - credit
        return (diff, 0.0) if diff >= 0 else (0.0, -diff)

    # --- گره‌های حساب (کل و معین) ---
    accounts = list(
        Account.objects.filter(company=company, is_active=True)
        .select_related('group', 'account_type')
        .order_by('code')
    )
    acc_nodes = {}
    for a in accounts:
        acc_nodes[a.id] = {
            'id': a.id,
            'kind': 'account',
            'code': a.code,
            'name': a.name,
            'nature': resolve_nature(a.nature, a.account_type),
            'group_id': a.group_id,
            'parent_id': a.parent_id,
            'level': 1 if a.parent_id is None else 2,
            'debit': 0.0,
            'credit': 0.0,
            'children': [],
        }

    # --- گره‌های گروه ---
    groups = list(
        AccountGroup.objects.filter(company=company, is_active=True)
        .select_related('account_type')
        .order_by('code')
    )
    group_nodes = {}
    for g in groups:
        group_nodes[g.id] = {
            'id': g.id,
            'kind': 'group',
            'code': g.code,
            'name': g.name,
            'nature': resolve_nature(g.nature, g.account_type),
            'level': 0,
            'debit': 0.0,
            'credit': 0.0,
            'children': [],
        }

    _SLOT_LEVEL = {'aux1': 3, 'aux2': 4, 'aux3': 5}

    # --- گره‌های تفصیلی (تفصیل ۱/۲/۳) با مسیر کامل ---
    aux_nodes = {}
    for line in lines:
        aid = line.account_id
        if aid not in acc_nodes:
            # سطر متعلق به حساب غیرفعال/ناموجود — در گزارش لحاظ نمی‌شود
            continue
        debit = float(line.debit or 0)
        credit = float(line.credit or 0)
        acc_nodes[aid]['debit'] += debit
        acc_nodes[aid]['credit'] += credit

        path = []
        for slot, aux_obj in (
            ('aux1', line.auxiliary_1),
            ('aux2', line.auxiliary_2),
            ('aux3', line.auxiliary_3),
        ):
            if aux_obj is not None:
                path.append((slot, aux_obj))

        for i, (slot, aux_obj) in enumerate(path):
            key = tuple([aid] + [(s, o.id) for s, o in path[: i + 1]])
            node = aux_nodes.setdefault(key, {
                'id': aux_obj.id,
                'kind': slot,
                'code': aux_obj.code,
                'name': aux_obj.name,
                'nature': acc_nodes[aid]['nature'] if aid in acc_nodes else 'debit',
                'level': _SLOT_LEVEL[slot],
                'debit': 0.0,
                'credit': 0.0,
                'children': [],
            })
            node['debit'] += debit
            node['credit'] += credit
    # --- اتصال حساب‌ها: معین زیر کل، کل زیر گروه ---
    account_roots = []
    for a in accounts:
        node = acc_nodes[a.id]
        if a.parent_id and a.parent_id in acc_nodes:
            acc_nodes[a.parent_id]['children'].append(node)
        else:
            account_roots.append(node)

    # --- اتصال تفصیلی‌ها (زیر حساب یا تفصیلی بالادستی) ---
    for key, node in aux_nodes.items():
        aid = key[0]
        if len(key) > 2:
            parent_key = key[:-1]
            if parent_key in aux_nodes:
                aux_nodes[parent_key]['children'].append(node)
                continue
        acc_nodes[aid]['children'].append(node)

    # --- اتصال ریشه‌های حساب به گروه (یا به ریشهٔ گزارش) ---
    roots = []
    for node in account_roots:
        gid = node['group_id']
        if gid and gid in group_nodes:
            group_nodes[gid]['children'].append(node)
        else:
            roots.append(node)
    for gnode in group_nodes.values():
        roots.append(gnode)

    # --- رول‌آپ گردش حساب‌ها به والد (تفصیلی‌ها جمع نمی‌شوند: زیرمجموعه‌اند) ---
    def rollup(node, depth=0):
        node['depth'] = depth
        for child in node['children']:
            rollup(child, depth + 1)
            if child['kind'] == 'account':
                node['debit'] += child['debit']
                node['credit'] += child['credit']

    for r in roots:
        rollup(r)

    # --- محاسبهٔ مانده برای هر گره (پس از رول‌آپ) ---
    def finalize(node):
        node['balance_debit'], node['balance_credit'] = balances(
            node['debit'], node['credit'], node['nature']
        )
        node.pop('group_id', None)
        node.pop('parent_id', None)
        node['children'] = sorted(node['children'], key=lambda x: x['code'])
        for child in node['children']:
            finalize(child)

    roots = sorted(roots, key=lambda x: x['code'])
    for r in roots:
        finalize(r)

    def total_of(node_list):
        t = {'debit': 0.0, 'credit': 0.0, 'balance_debit': 0.0, 'balance_credit': 0.0}
        for n in node_list:
            t['debit'] += n['debit']
            t['credit'] += n['credit']
            t['balance_debit'] += n['balance_debit']
            t['balance_credit'] += n['balance_credit']
        return t

    return Response({
        'tree': roots,
        'total': total_of(roots),
        'levels': [
            {'value': 0, 'label': 'ریز گروه'},
            {'value': 1, 'label': 'ریز کل'},
            {'value': 2, 'label': 'ریز معین'},
            {'value': 3, 'label': 'ریز تفصیل ۱'},
            {'value': 4, 'label': 'ریز تفصیل ۲'},
            {'value': 5, 'label': 'ریز تفصیل ۳'},
        ],
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