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

    # تجمیع به تفکیک طبقه
    buckets = {'revenue': 0, 'cost_of_sales': 0, 'expense': 0}
    expense_by_group = {}
    for line in lines:
        category = line.account.account_type.category
        net = float(line.credit or 0) - float(line.debit or 0)
        if category == 'cost_of_sales':
            net = -net  # هزینه با بدهکار افزایش می‌یابد
        buckets[category] += net
        if category == 'expense':
            group = line.account.group.name if line.account.group else 'سایر'
            expense_by_group[group] = expense_by_group.get(group, 0) + (-net if net < 0 else -net)

    revenue = buckets['revenue']
    cost_of_sales = buckets['cost_of_sales']
    expense = -buckets['expense']  # expense عدد منفی شد → مثبت کنیم
    gross_profit = revenue - cost_of_sales
    net_profit = gross_profit - expense

    expense_details = [
        {'group': g, 'amount': expense_by_group[g]} for g in expense_by_group
    ]
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
            # سرمایه‌گذاری: تغییر خالص دارایی‌های ثابت (نقد غیر بانکی)
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
