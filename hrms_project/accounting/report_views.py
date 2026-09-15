"""Accounting reports — read-only aggregations over posted documents.

All querysets are company-scoped. Report strings are kept printable and RTL.
"""
from django.db.models import Sum, Count
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
            'document_number': line.document.number or line.document_id,
            'description': line.description or line.document.description,
            'account_code': line.account.code,
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
    """صورت سود و زیان (ساده): درآمد − هزینه = سود/زیان."""
    lines = _posted_lines(request).filter(
        account__account_type__category__in=['revenue', 'expense', 'cost_of_sales'],
    ).select_related('account__account_type')

    revenue = 0
    expense = 0
    cost_of_sales = 0
    for line in lines:
        category = line.account.account_type.category
        net = float(line.credit or 0) - float(line.debit or 0)
        if category == 'revenue':
            revenue += net
        elif category == 'cost_of_sales':
            cost_of_sales += -net  # cost increases with debit
        else:
            expense += net

    profit = revenue - cost_of_sales - expense
    return Response({
        'revenue': revenue,
        'cost_of_sales': cost_of_sales,
        'gross_profit': revenue - cost_of_sales,
        'expenses': expense,
        'net_profit': profit,
    })