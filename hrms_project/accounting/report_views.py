"""Accounting reports — read-only aggregations over reportable documents.

"Reportable" = every document except drafts (see `constants.REPORTABLE_DOCUMENT_STATUSES`):
submitted, approved, posted and locked documents all appear in the reports.

All querysets are company-scoped. Report strings are kept printable and RTL.
"""
from django.db.models import Q, Sum, Count
from django.template.loader import render_to_string
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounting.constants import REPORTABLE_DOCUMENT_STATUSES
from accounting.models import (
    AccountingDocument, AccountingDocumentLine, Account, AccountType,
    AccountGroup, AuxiliaryAccount, FiscalYear, FinancialStatementApproval,
)


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


def _report_lines(request, *, include_annual_closing=False):
    """همهٔ خطوط اسناد قابل‌گزارش (ارسال‌شده/تأییدشده/ثبت‌شده/قفل‌شده) — شرکت جاری.

    پیش‌نویس‌ها کنار گذاشته می‌شوند.

    **سند اختتامیه** به‌طور پیش‌فرض از گزارش‌های مالی حذف می‌شود: آن سند عمداً
    ماندهٔ حساب‌های دائمی را صفر می‌کند و اگر در تراز/ترازنامه لحاظ شود، پس از
    بستن سال همهٔ مانده‌ها صفر (و ترازنامه بی‌معنا) می‌شود. دفترها (کل/معین/مرور)
    با `include_annual_closing=True` آن را نشان می‌دهند تا رد حسابرسی حفظ شود.
    """
    qs = AccountingDocumentLine.objects.filter(
        document__company=_company(request),
        document__status__in=REPORTABLE_DOCUMENT_STATUSES,
    ).select_related('account')
    if not include_annual_closing:
        qs = qs.exclude(
            document__source_module='annual', document__source_type='closing',
        )
    return qs


def _signed_balance(debit, credit):
    """ماندهٔ تجمعی با علامت؛ ممکن است طرف بدهکار/بستانکار عوض شود.

    برخلاف ماندهٔ دورهٔ یک بازه (که ماهیت حساب تعیین‌کننده است)، ماندهٔ ابتدای
    دوره و پایان دوره بر پایهٔ خالص تجمعی محاسبه می‌شود.
    """
    net = float(debit or 0) - float(credit or 0)
    return (net, 0.0) if net >= 0 else (0.0, -net)


def _is_before(doc_date, boundary):
    """آیا تاریخ سند پیش از مرز «از تاریخ» است؟ (تفکیک ماندهٔ ابتدای دوره)"""
    if not boundary or doc_date is None:
        return False
    return doc_date.isoformat()[:10] < str(boundary)[:10]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard(request):
    """داشبورد KPI حسابداری."""
    from django.utils import timezone
    company = _company(request)

    docs = AccountingDocument.objects.filter(company=company)
    lines = _report_lines(request).select_related('account__account_type')

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
    qs = _report_lines(request).select_related('account__account_type', 'document')

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
        sign = -1.0 if line.document.source_type == 'reversal' else 1.0
        vat = sign * float(line.vat_amount or 0)
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
    lines = _report_lines(request, include_annual_closing=True).order_by(
        'document__date', 'document__id', 'line_no',
    )
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
    """ریز گردش یک حساب / گروه حساب / تفصیلی: ردیف‌های گردش + ماندهٔ تجمعی.

    پارامترهای اختیاری:
      ``kind``     = account (پیش‌فرض) | group | aux1 | aux2 | aux3
      ``account``  = شناسهٔ حساب والد (برای kind=aux*، جهت ماهیت و محدودکردن مسیر)
      ``aux1``/``aux2`` = پیشوند مسیر تفصیلی (برای kind=aux2/aux3)
      ``date_from`` / ``date_to`` = بازهٔ تاریخ سند
    """
    company = _company(request)
    kind = (request.query_params.get('kind') or 'account').strip()
    lines = _report_lines(request, include_annual_closing=True)
    nature = 'debit'

    if kind == 'group':
        group = AccountGroup.objects.filter(id=account_id, company=company).first()
        if not group:
            return Response({'error': 'گروه حساب یافت نشد'}, status=404)
        lines = lines.filter(account__group_id=group.id)
        nature = getattr(group, 'nature', None) or 'debit'
        base = {'kind': 'group', 'code': group.code, 'name': group.name, 'nature': nature}
    elif kind in ('aux1', 'aux2', 'aux3'):
        slot = int(kind[-1])
        aux = AuxiliaryAccount.objects.filter(id=account_id, company=company).first()
        if not aux:
            return Response({'error': 'تفصیلی یافت نشد'}, status=404)
        lines = lines.filter(**{f'auxiliary_{slot}_id': aux.id})
        for i in range(1, slot):
            prefix = request.query_params.get(f'aux{i}')
            if prefix:
                lines = lines.filter(**{f'auxiliary_{i}_id': prefix})
        parent_id = request.query_params.get('account')
        parent = Account.objects.filter(id=parent_id, company=company).first() if parent_id else None
        if parent:
            lines = lines.filter(account_id=parent.id)
            nature = parent.nature or 'debit'
        base = {'kind': kind, 'code': aux.code, 'name': aux.name, 'nature': nature}
    else:
        account = Account.objects.filter(id=account_id, company=company).first()
        if not account:
            return Response({'error': 'حساب یافت نشد'}, status=404)
        lines = lines.filter(account_id=account.id)
        nature = account.nature or 'debit'
        base = {'kind': 'account', 'code': account.code, 'name': account.name, 'nature': nature}

    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    if date_from:
        lines = lines.filter(document__date__gte=date_from)
    if date_to:
        lines = lines.filter(document__date__lte=date_to)

    lines = lines.order_by('document__date', 'document__id', 'line_no')
    rows = []
    balance = 0
    for line in lines:
        debit = float(line.debit or 0)
        credit = float(line.credit or 0)
        if nature == 'debit':
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
        'account': base,
        'rows': rows,
        'total_debit': total_debit,
        'total_credit': total_credit,
        'balance': balance,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trial_balance(request):
    """تراز آزمایشی: جمع بدهکار/بستانکار و ماندهٔ هر حساب."""
    lines = _report_lines(request)
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
    lines = _report_lines(request).filter(
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


# =============================================================================
# ترازنامه — ابزارهای مشترک (گروه‌بندی، سلامت اسناد، مهر تأیید حسابرسی)
# =============================================================================
UNGROUPED_LABEL = 'سایر حساب‌ها'
AUDIT_FINAL_STATUSES = ('approved', 'approved_with_comments')


def _round2(value):
    """گرد کردن مبلغ به دو رقم اعشار (مقایسهٔ دقیق تراز)."""
    return round(float(value or 0), 2)


def _balance_scope(request):
    """دامنهٔ ترازنامه: شرکت + (سال مالی و/یا تاریخ «تا تاریخ»)."""
    company = _company(request)
    qs = _report_lines(request).select_related('account__account_type', 'account__group')
    params = request.query_params
    year = None
    year_id = params.get('fiscal_year')
    if year_id:
        year = FiscalYear.objects.filter(pk=year_id, company=company).first()
        if year:
            qs = qs.filter(document__date__gte=year.start_date, document__date__lte=year.end_date)
    as_of = params.get('as_of') or params.get('date_to')
    if as_of:
        qs = qs.filter(document__date__lte=as_of)
    return qs, year, as_of


def _grouped_rows(rows, total):
    """ردیف‌ها را بر پایهٔ گروه حساب دسته‌بندی می‌کند (با جمع و سهم درصدی)."""
    groups = {}
    for row in rows:
        key = row.get('group') or UNGROUPED_LABEL
        bucket = groups.setdefault(key, {
            'name': key, 'code': row.get('group_code') or '', 'rows': [], 'total': 0.0,
        })
        bucket['rows'].append(row)
        bucket['total'] += row['balance']
    ordered = sorted(groups.values(), key=lambda g: (-g['total'], g['name']))
    for group in ordered:
        group['total'] = _round2(group['total'])
        group['percent'] = round(group['total'] / total * 100, 1) if total else 0.0
        group['rows'] = sorted(group['rows'], key=lambda r: r['code'])
        for row in group['rows']:
            row['share'] = round(row['balance'] / total * 100, 1) if total else 0.0
    return ordered


def _document_integrity(request, year=None, as_of=None):
    """سلامت اسناد در دامنهٔ گزارش (مبنای تصمیم «تأیید حسابرسی»)."""
    qs = AccountingDocument.objects.filter(company=_company(request))
    if year:
        qs = qs.filter(date__gte=year.start_date, date__lte=year.end_date)
    if as_of:
        qs = qs.filter(date__lte=as_of)
    by_status = {row['status']: row['n'] for row in qs.values('status').annotate(n=Count('id'))}
    unbalanced = 0
    for doc in qs.annotate(d=Sum('lines__debit'), c=Sum('lines__credit')):
        if _round2(float(doc.d or 0) - float(doc.c or 0)) != 0:
            unbalanced += 1
    totals = qs.aggregate(debit=Sum('lines__debit'), credit=Sum('lines__credit'))
    pending = by_status.get('submitted', 0) + by_status.get('approved', 0)
    return {
        'documents': sum(by_status.values()),
        'by_status': by_status,
        'posted': by_status.get('posted', 0) + by_status.get('locked', 0),
        'pending_approval': pending,
        'draft_excluded': by_status.get('draft', 0),
        'unbalanced_documents': unbalanced,
        'total_debit': _round2(totals['debit']),
        'total_credit': _round2(totals['credit']),
        'is_clean': unbalanced == 0 and pending == 0,
    }


def _audit_block(request, year=None, as_of=None):
    """آخرین تأیید حسابرسی + وضعیت سلامت داده‌های دامنهٔ گزارش."""
    approvals = (
        FinancialStatementApproval.objects
        .filter(company=_company(request), statement_type__in=['balance_sheet', 'combined'])
        .select_related('fiscal_year')
        .order_by('-approved_at', '-id')
    )
    if year:
        approvals = approvals.filter(Q(fiscal_year=year) | Q(fiscal_year__isnull=True))
    item = approvals.first()
    integrity = _document_integrity(request, year=year, as_of=as_of)
    payload = None
    if item:
        payload = {
            'id': item.id,
            'statement_type': item.statement_type,
            'statement_type_display': item.get_statement_type_display(),
            'status': item.status,
            'status_display': item.get_status_display(),
            'auditor_name': item.auditor_name,
            'audit_firm': item.audit_firm,
            'reference_no': item.reference_no,
            'approved_at': item.approved_at.isoformat() if item.approved_at else '',
            'as_of_date': item.as_of_date.isoformat() if item.as_of_date else '',
            'opinion_note': item.opinion_note,
            'prepared_by_name': item.prepared_by_name,
            'fiscal_year_name': item.fiscal_year.name if item.fiscal_year else '',
            'is_final': item.status in AUDIT_FINAL_STATUSES,
        }
    return {
        'approval': payload,
        'is_audited': bool(payload and payload['is_final']),
        'status': (payload or {}).get('status') or 'unaudited',
        'integrity': integrity,
    }



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def balance_sheet(request):
    """ترازنامه: دارایی = بدهی + حقوق صاحبان سهام.

    خروجی برای نمایش کارتی «دارایی (راست) / بدهی + حقوق صاحبان سهام (چپ)» به‌همراه
    یک کارت تمام‌عرض جمع‌ها و کنترل تراز، و «مهر تأیید حسابرسی» غنی‌سازی شده است:
    گروه‌بندی بر پایهٔ گروه حساب، نسبت‌ها، سلامت اسناد و آخرین تأیید حسابرسی.
    """
    from django.utils import timezone

    lines, year, as_of = _balance_scope(request)
    buckets = {'asset': {}, 'liability': {}, 'equity': {}}
    # سود (زیان) دوره: اگر حساب‌های موقت هنوز بسته نشده باشند، در حقوق صاحبان
    # سهام لحاظ می‌شود تا معادلهٔ حسابداری تراز بماند. پس از «بستن حساب‌ها»
    # ماندهٔ این حساب‌ها صفر است، پس خطر شمارش دوباره وجود ندارد.
    pnl = {'revenue': 0.0, 'cost_of_sales': 0.0, 'expense': 0.0}
    for line in lines:
        account = line.account
        category = account.account_type.category if account.account_type else None
        debit = float(line.debit or 0)
        credit = float(line.credit or 0)
        if category in pnl:
            pnl[category] += (credit - debit) if category == 'revenue' else (debit - credit)
            continue
        if category not in buckets:
            continue
        balance = (debit - credit) if category == 'asset' else (credit - debit)
        rec = buckets[category].setdefault(account.id, {
            'id': account.id,
            'code': account.code,
            'name': account.name,
            'group': account.group.name if account.group else '',
            'group_code': account.group.code if account.group else '',
            'balance': 0.0,
        })
        rec['balance'] += balance

    def finalize(bucket):
        rows = [{**row, 'balance': _round2(row['balance'])} for row in bucket.values()]
        rows.sort(key=lambda r: r['code'])
        return rows, _round2(sum(r['balance'] for r in rows))

    asset_rows, total_assets = finalize(buckets['asset'])
    liability_rows, total_liabilities = finalize(buckets['liability'])
    equity_rows, total_equity = finalize(buckets['equity'])

    net_profit = _round2(pnl['revenue'] - pnl['cost_of_sales'] - pnl['expense'])
    if abs(net_profit) >= 0.01:
        equity_rows.append({
            'id': 'net-profit',
            'code': '',
            'name': 'سود (زیان) دوره',
            'group': 'سود و زیان دوره',
            'group_code': '',
            'balance': net_profit,
            'is_synthetic': True,
        })
        total_equity = _round2(total_equity + net_profit)

    total_le = _round2(total_liabilities + total_equity)
    difference = _round2(total_assets - total_le)
    audit = _audit_block(request, year=year, as_of=as_of)
    documents = audit['integrity']
    # مهر تأیید فقط وقتی «سبز» است که حسابرسی تأیید کرده باشد و اسناد دامنه پاک باشند
    audited = bool(audit['is_audited'] and documents['is_clean'])

    return Response({
        # --- دارایی‌ها ---
        'assets': asset_rows,
        'asset_groups': _grouped_rows(asset_rows, total_assets),
        'total_assets': total_assets,
        # --- بدهی‌ها ---
        'liabilities': liability_rows,
        'liability_groups': _grouped_rows(liability_rows, total_liabilities),
        'total_liabilities': total_liabilities,
        # --- حقوق صاحبان سهام ---
        'equity': equity_rows,
        'equity_groups': _grouped_rows(equity_rows, total_equity),
        'total_equity': total_equity,
        'net_profit': net_profit,
        # --- کنترل تراز ---
        'total_liabilities_equity': total_le,
        'difference': difference,
        'is_balanced': difference == 0,
        'ratios': {
            'debt_to_asset': round(total_liabilities / total_assets * 100, 1) if total_assets else 0.0,
            'equity_to_asset': round(total_equity / total_assets * 100, 1) if total_assets else 0.0,
            'leverage': round(total_liabilities / total_equity, 2) if total_equity else 0.0,
        },
        # --- فراداده و تأیید حسابرسی ---
        'fiscal_year': ({
            'id': year.id, 'name': year.name, 'status': year.status,
            'start_date': year.start_date.isoformat(), 'end_date': year.end_date.isoformat(),
            'is_current': year.is_current,
        } if year else None),
        'as_of': as_of or '',
        'audit': audit,
        'audited': audited,
        'generated_at': timezone.now().isoformat(),
    })



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cash_flow(request):
    """جریان نقدی (روش مستقیم): عملیاتی + سرمایه‌گذاری + تأمین مالی."""
    lines = _report_lines(request).select_related('account__account_type')

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
    lines = _report_lines(request)

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
    """گزارش ماتریس تراز حساب‌ها: سطح تراز + ریز سطح + تراز سه/چهار/شش‌ستونی.

    پارامترها (اختیاری): ``date_from`` و ``date_to`` (تاریخ سند، ISO/میلادی).

    - گردش دوره = اسناد بین «از تاریخ» و «تا تاریخ».
    - ماندهٔ ابتدای دوره = خالص تجمعی اسناد پیش از «از تاریخ» (برای تراز شش‌ستونی).
    - ماندهٔ پایان دوره = ماندهٔ ابتدای دوره + گردش دوره.
    - ``balance_debit``/``balance_credit`` همان ماندهٔ دوره بر پایهٔ ماهیت حساب است
      (برای قالب سه/چهارستونی).

    هر گره: ``id, kind, code, name, level, debit, credit, balance_debit,
    balance_credit, opening_balance_debit, opening_balance_credit,
    closing_balance_debit, closing_balance_credit, children``.
    """
    company = _company(request)
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    lines = _report_lines(request).select_related(
        'account', 'account__account_type', 'account__group',
        'auxiliary_1', 'auxiliary_2', 'auxiliary_3',
    )
    if date_to:
        lines = lines.filter(document__date__lte=date_to)

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
            'opening_debit': 0.0,
            'opening_credit': 0.0,
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
            'opening_debit': 0.0,
            'opening_credit': 0.0,
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
        # اسناد پیش از «از تاریخ» به‌عنوان ماندهٔ ابتدای دوره تفکیک می‌شوند
        opening = _is_before(line.document.date, date_from)
        if opening:
            acc_nodes[aid]['opening_debit'] += debit
            acc_nodes[aid]['opening_credit'] += credit
        else:
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
                'opening_debit': 0.0,
                'opening_credit': 0.0,
                'children': [],
            })
            if opening:
                node['opening_debit'] += debit
                node['opening_credit'] += credit
            else:
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
                node['opening_debit'] += child['opening_debit']
                node['opening_credit'] += child['opening_credit']

    for r in roots:
        rollup(r)

    # --- محاسبهٔ مانده برای هر گره (پس از رول‌آپ) ---
    def finalize(node):
        node['balance_debit'], node['balance_credit'] = balances(
            node['debit'], node['credit'], node['nature']
        )
        # ماندهٔ ابتدا و پایان دوره (خالص تجمعی با علامت) — برای تراز شش‌ستونی
        node['opening_balance_debit'], node['opening_balance_credit'] = _signed_balance(
            node['opening_debit'], node['opening_credit']
        )
        node['closing_balance_debit'], node['closing_balance_credit'] = _signed_balance(
            node['opening_debit'] + node['debit'], node['opening_credit'] + node['credit']
        )
        node.pop('opening_debit', None)
        node.pop('opening_credit', None)
        node.pop('group_id', None)
        node.pop('parent_id', None)
        node['children'] = sorted(node['children'], key=lambda x: x['code'])
        for child in node['children']:
            finalize(child)

    roots = sorted(roots, key=lambda x: x['code'])
    for r in roots:
        finalize(r)

    _TOTAL_KEYS = (
        'debit', 'credit', 'balance_debit', 'balance_credit',
        'opening_balance_debit', 'opening_balance_credit',
        'closing_balance_debit', 'closing_balance_credit',
    )

    def total_of(node_list):
        t = {k: 0.0 for k in _TOTAL_KEYS}
        for n in node_list:
            for k in _TOTAL_KEYS:
                t[k] += float(n.get(k) or 0)
        return t

    return Response({
        'tree': roots,
        'total': total_of(roots),
        'levels': [
            {'value': 0, 'label': 'گروه'},
            {'value': 1, 'label': 'کل'},
            {'value': 2, 'label': 'معین'},
            {'value': 3, 'label': 'تفصیلی ۴'},
            {'value': 4, 'label': 'تفصیلی ۵'},
            {'value': 5, 'label': 'تفصیلی ۶'},
        ],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ledger_review(request):
    """مرور پله‌ای دفاتر: گردش دفتر به دفتر با ماندهٔ تجمعی (پله‌ای)."""
    from accounting.models import Journal

    docs = (
        AccountingDocument.objects
        .filter(company=_company(request), status__in=REPORTABLE_DOCUMENT_STATUSES)
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
    from django.utils import timezone

    lines, year, as_of = _balance_scope(request)

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

    # سود (زیان) دوره در حقوق صاحبان سهام — همانند گزارش ترازنامه، تا معادله
    # «دارایی = بدهی + حقوق صاحبان سهام» پیش از بستن حساب‌ها هم برقرار بماند.
    if abs(net_profit) >= 0.01:
        equity_rows.append({
            'id': 'net-profit', 'code': '', 'name': 'سود (زیان) دوره',
            'balance': net_profit, 'is_synthetic': True,
        })
        total_equity = _round2(total_equity + net_profit)

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
        'fiscal_year': ({
            'id': year.id, 'name': year.name, 'status': year.status,
            'start_date': year.start_date.isoformat(), 'end_date': year.end_date.isoformat(),
            'is_current': year.is_current,
        } if year else None),
        'as_of': as_of or '',
        'generated_at': timezone.now().isoformat(),
    })