"""Annual closing operations — opening document, close accounts, closing journal,
and statutory (legal) books.

All querysets are company-scoped. Financial rules mirror `report_views`.
"""
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounting.models import (
    Account, AccountingDocument, AccountingDocumentLine, AccountingSettings,
    FiscalYear, Journal,
)


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


def _posted_lines(company, year=None):
    qs = AccountingDocumentLine.objects.filter(
        document__company=company,
        document__status__in=['posted', 'locked'],
    ).select_related('account', 'account__account_type')
    if year is not None:
        qs = qs.filter(document__fiscal_year=year)
    return qs


def _net_balance(company, account, year):
    debit = 0.0
    credit = 0.0
    for line in _posted_lines(company, year).filter(account=account):
        debit += float(line.debit or 0)
        credit += float(line.credit or 0)
    cat = account.account_type.category
    if cat in ('asset', 'expense', 'cost_of_sales'):
        return debit - credit
    return credit - debit


def _balances_by_category(company, year, categories):
    accounts = (
        Account.objects.filter(company=company, is_active=True, account_type__category__in=categories)
        .select_related('account_type')
        .order_by('code')
    )
    result = []
    for a in accounts:
        net = _net_balance(company, a, year)
        if abs(net) > 1e-9:
            result.append({'account': a, 'net': net})
    return result


def _target_account(company):
    settings = AccountingSettings.objects.filter(company=company).select_related('profit_loss_account').first()
    if settings and settings.profit_loss_account_id:
        return settings.profit_loss_account
    return Account.objects.filter(company=company, is_active=True, account_type__category='equity').order_by('code').first()


def _retained_account(company):
    settings = AccountingSettings.objects.filter(company=company).select_related('retained_earnings_account').first()
    if settings and settings.retained_earnings_account_id:
        return settings.retained_earnings_account
    return _target_account(company)


def _journal(company, jtype, name):
    j = Journal.objects.filter(company=company, journal_type=jtype).first()
    if not j:
        j = Journal.objects.create(company=company, code=jtype.upper(), name=name, journal_type=jtype)
    return j


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def opening_document(request):
    """سند افتتاحیه: انتقال ماندهٔ پایان سال قبل به ابتدای سال جدید."""
    company = _company(request)
    year_id = request.data.get('fiscal_year')
    year = FiscalYear.objects.filter(id=year_id, company=company).first()
    if not year:
        return Response({'error': 'سال مالی معتبر انتخاب کنید.'}, status=400)

    prev = FiscalYear.objects.filter(company=company, start_date__lt=year.start_date).order_by('-start_date').first()
    if not prev:
        return Response({'error': 'سال مالی قبل یافت نشد؛ سند افتتاحیه قابل ساخت نیست.'}, status=400)

    existing = AccountingDocument.objects.filter(
        company=company, source_module='annual', source_type='opening', source_id=f'opening-{year.id}',
    ).first()
    if existing:
        from accounting.serializers import AccountingDocumentSerializer
        return Response(AccountingDocumentSerializer(existing).data)

    target = _target_account(company)
    if not target:
        return Response({'error': 'حساب سود و زیان/حقوق برای توازن تعیین نشده است.'}, status=400)

    rows = _balances_by_category(company, prev, ['asset', 'liability', 'equity'])
    journal = _journal(company, Journal.JournalType.OPENING, 'سند افتتاحیه')

    with transaction.atomic():
        doc = AccountingDocument.objects.create(
            company=company,
            journal=journal,
            fiscal_year=year,
            date=year.start_date,
            description=f'سند افتتاحیهٔ {year.name}',
            status='posted',
            source_module='annual',
            source_type='opening',
            source_id=f'opening-{year.id}',
            is_locked=True,
            posted_by=request.user,
            posted_at=timezone.now(),
        )
        line_no = 0
        debit_total = 0.0
        credit_total = 0.0

        def push(account, debit, credit, desc=''):
            nonlocal line_no, debit_total, credit_total
            line_no += 1
            AccountingDocumentLine.objects.create(
                document=doc, company=company, account=account,
                description=desc,
                debit=Decimal(str(debit)), credit=Decimal(str(credit)),
                line_no=line_no, base_amount=Decimal(str(debit or credit)),
            )
            debit_total += debit
            credit_total += credit

        for r in rows:
            cat = r['account'].account_type.category
            debit_side = cat == 'asset'
            net = r['net']
            if net >= 0:
                d, c = (abs(net), 0.0) if debit_side else (0.0, abs(net))
            else:
                d, c = (0.0, abs(net)) if debit_side else (abs(net), 0.0)
            push(r['account'], d, c, f'ماندهٔ سال قبل {r["account"].code}')

        diff = debit_total - credit_total
        if diff > 1e-9:
            push(target, 0.0, diff, 'توازن افتتاحیه')
        elif diff < -1e-9:
            push(target, -diff, 0.0, 'توازن افتتاحیه')

    from accounting.serializers import AccountingDocumentSerializer
    return Response(AccountingDocumentSerializer(doc).data, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def close_accounts(request):
    """بستن حساب‌های موقت (درآمد/هزینه/بهای تمام‌شده) به حساب سود و زیان."""
    company = _company(request)
    year_id = request.data.get('fiscal_year')
    year = FiscalYear.objects.filter(id=year_id, company=company).first()
    if not year:
        return Response({'error': 'سال مالی معتبر انتخاب کنید.'}, status=400)

    target = _target_account(company)
    if not target:
        return Response({'error': 'حساب سود و زیان تعیین نشده است.'}, status=400)

    existing = AccountingDocument.objects.filter(
        company=company, source_module='annual', source_type='close-accounts', source_id=f'close-{year.id}',
    ).first()
    if existing:
        from accounting.serializers import AccountingDocumentSerializer
        return Response(AccountingDocumentSerializer(existing).data)

    rows = _balances_by_category(company, year, ['revenue', 'expense', 'cost_of_sales'])
    journal = _journal(company, Journal.JournalType.CLOSING, 'سند بستن حساب‌ها')

    with transaction.atomic():
        doc = AccountingDocument.objects.create(
            company=company,
            journal=journal,
            fiscal_year=year,
            date=year.end_date,
            description=f'بستن حساب‌های موقت {year.name}',
            status='posted',
            source_module='annual',
            source_type='close-accounts',
            source_id=f'close-{year.id}',
            is_locked=True,
            posted_by=request.user,
            posted_at=timezone.now(),
        )
        line_no = 0
        for r in rows:
            cat = r['account'].account_type.category
            net = r['net']
            if cat == 'revenue':
                d_acc, c_acc, d_tgt, c_tgt = net, 0.0, 0.0, net
            else:
                d_acc, c_acc, d_tgt, c_tgt = 0.0, net, net, 0.0
            line_no += 1
            AccountingDocumentLine.objects.create(
                document=doc, company=company, account=r['account'],
                description=f'بستن {r["account"].code}',
                debit=Decimal(str(d_acc)), credit=Decimal(str(c_acc)),
                line_no=line_no, base_amount=Decimal(str(d_acc or c_acc)),
            )
            line_no += 1
            AccountingDocumentLine.objects.create(
                document=doc, company=company, account=target,
                description='انتقال به سود و زیان',
                debit=Decimal(str(d_tgt)), credit=Decimal(str(c_tgt)),
                line_no=line_no, base_amount=Decimal(str(d_tgt or c_tgt)),
            )

    from accounting.serializers import AccountingDocumentSerializer
    return Response(AccountingDocumentSerializer(doc).data, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def closing_document(request):
    """سند اختتامیه: صفر کردن حساب‌های ترازنامه‌ای به حساب سود/زیان انباشته."""
    company = _company(request)
    year_id = request.data.get('fiscal_year')
    year = FiscalYear.objects.filter(id=year_id, company=company).first()
    if not year:
        return Response({'error': 'سال مالی معتبر انتخاب کنید.'}, status=400)

    target = _retained_account(company)
    if not target:
        return Response({'error': 'حساب سود/زیان انباشته تعیین نشده است.'}, status=400)

    existing = AccountingDocument.objects.filter(
        company=company, source_module='annual', source_type='closing', source_id=f'closing-{year.id}',
    ).first()
    if existing:
        from accounting.serializers import AccountingDocumentSerializer
        return Response(AccountingDocumentSerializer(existing).data)

    rows = _balances_by_category(company, year, ['asset', 'liability', 'equity'])
    journal = _journal(company, Journal.JournalType.CLOSING, 'سند اختتامیه')

    with transaction.atomic():
        doc = AccountingDocument.objects.create(
            company=company,
            journal=journal,
            fiscal_year=year,
            date=year.end_date,
            description=f'سند اختتامیهٔ {year.name}',
            status='posted',
            source_module='annual',
            source_type='closing',
            source_id=f'closing-{year.id}',
            is_locked=True,
            posted_by=request.user,
            posted_at=timezone.now(),
        )
        line_no = 0
        for r in rows:
            net = r['net']
            if net >= 0:
                d_acc, c_acc, d_tgt, c_tgt = 0.0, net, net, 0.0
            else:
                d_acc, c_acc, d_tgt, c_tgt = -net, 0.0, 0.0, -net
            line_no += 1
            AccountingDocumentLine.objects.create(
                document=doc, company=company, account=r['account'],
                description=f'اختتام {r["account"].code}',
                debit=Decimal(str(d_acc)), credit=Decimal(str(c_acc)),
                line_no=line_no, base_amount=Decimal(str(d_acc or c_acc)),
            )
            line_no += 1
            AccountingDocumentLine.objects.create(
                document=doc, company=company, account=target,
                description='اختتام به حساب هدف',
                debit=Decimal(str(d_tgt)), credit=Decimal(str(c_tgt)),
                line_no=line_no, base_amount=Decimal(str(d_tgt or c_tgt)),
            )

    from accounting.serializers import AccountingDocumentSerializer
    return Response(AccountingDocumentSerializer(doc).data, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def legal_books(request):
    """ساخت دفاتر قانونی: روزنامه، کل، معین و تراز آزمایشی سال مالی."""
    company = _company(request)
    year_id = request.query_params.get('fiscal_year')
    year = FiscalYear.objects.filter(id=year_id, company=company).first() if year_id else None

    lines = _posted_lines(company, year)

    journal_book = []
    docs = AccountingDocument.objects.filter(company=company, status__in=['posted', 'locked']).order_by('date', 'id')
    for doc in docs:
        if year and doc.fiscal_year_id != year.id:
            continue
        journal_book.append({
            'id': doc.id,
            'number': doc.number or str(doc.id),
            'date': doc.date.isoformat() if doc.date else None,
            'description': doc.description,
            'debit': float(doc.total_debit or 0),
            'credit': float(doc.total_credit or 0),
            'lines': [
                {
                    'account': l.account.code + ' - ' + l.account.name,
                    'debit': float(l.debit or 0),
                    'credit': float(l.credit or 0),
                }
                for l in doc.lines.select_related('account').all()
            ],
        })

    agg = {}
    for line in lines:
        rec = agg.setdefault(line.account_id, {
            'id': line.account_id, 'code': line.account.code, 'name': line.account.name,
            'nature': line.account.nature, 'debit': 0.0, 'credit': 0.0,
        })
        rec['debit'] += float(line.debit or 0)
        rec['credit'] += float(line.credit or 0)

    general_ledger = []
    for rec in sorted(agg.values(), key=lambda x: x['code']):
        balance = (rec['credit'] - rec['debit']) if rec['nature'] == 'credit' else (rec['debit'] - rec['credit'])
        general_ledger.append({**rec, 'balance': balance})

    ordered = _posted_lines(company, year).order_by('document__date', 'document__id', 'line_no')
    by_account = {}
    for line in ordered:
        by_account.setdefault(line.account_id, []).append({
            'date': line.document.date.isoformat() if line.document.date else None,
            'number': line.document.number or str(line.document_id),
            'description': line.description or line.document.description,
            'debit': float(line.debit or 0),
            'credit': float(line.credit or 0),
        })

    subsidiary_ledger = []
    for aid, rows in by_account.items():
        account = Account.objects.filter(id=aid).first()
        if not account:
            continue
        running = 0.0
        for r in rows:
            if account.nature == 'credit':
                running += r['credit'] - r['debit']
            else:
                running += r['debit'] - r['credit']
            r['balance'] = running
        subsidiary_ledger.append({
            'id': aid, 'code': account.code, 'name': account.name, 'rows': rows,
        })
    subsidiary_ledger.sort(key=lambda x: x['code'])

    trial_rows = [
        {
            'account_code': rec['code'], 'account_name': rec['name'],
            'debit': rec['debit'], 'credit': rec['credit'], 'balance': rec['balance'],
        }
        for rec in general_ledger
    ]
    total_debit = sum(r['debit'] for r in trial_rows)
    total_credit = sum(r['credit'] for r in trial_rows)

    return Response({
        'fiscal_year': {'id': year.id, 'name': year.name} if year else None,
        'journal_book': journal_book,
        'general_ledger': general_ledger,
        'subsidiary_ledger': subsidiary_ledger,
        'trial_balance': {'rows': trial_rows, 'total_debit': total_debit, 'total_credit': total_credit},
    })