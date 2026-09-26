"""Tax / VAT and Article-169 reports (per Iranian 1405 rules).

- VAT summary (ledger) split by rate.
- Seasonal transaction report (ماده 169 مکرر) — aggregate by counterparty.
- Official ledger export (دفتر معین/کل) structured for Tax Organization.
- BI dashboard aggregates for the reporting insight hub.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounting.models import AccountingDocument, AccountingDocumentLine


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


def _lines(request):
    qs = AccountingDocumentLine.objects.filter(
        document__company=_company(request),
        document__status__in=['posted', 'locked'],
    ).select_related('document', 'account', 'account__account_type', 'auxiliary', 'auxiliary_1')
    year_id = request.query_params.get('fiscal_year')
    if year_id:
        qs = qs.filter(document__fiscal_year_id=year_id)
    return qs


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vat_ledger(request):
    """گزارش ارزش افزوده: جمع معاملات و مالیات به تفکیک نرخ و نوع (خرید/فروش)."""
    lines = _lines(request)
    by_rate = {}
    total_sale_net = total_sale_vat = 0.0
    total_purchase_net = total_purchase_vat = 0.0

    for line in lines:
        vat = float(line.vat_amount or 0)
        rate = float(line.vat_rate or 0)
        net = float(line.base_amount or 0) or (float(line.debit or 0) or float(line.credit or 0))

        bucket = by_rate.setdefault(str(rate), {
            'rate': rate,
            'sale_net': 0.0, 'sale_vat': 0.0,
            'purchase_net': 0.0, 'purchase_vat': 0.0,
        })
        if line.invoice_type in ('sale', 'export'):
            bucket['sale_net'] += net
            bucket['sale_vat'] += vat
            total_sale_net += net
            total_sale_vat += vat
        elif line.invoice_type in ('purchase', 'import'):
            bucket['purchase_net'] += net
            bucket['purchase_vat'] += vat
            total_purchase_net += net
            total_purchase_vat += vat

    rows = sorted(by_rate.values(), key=lambda x: x['rate'])
    return Response({
        'rows': rows,
        'total_sale_net': total_sale_net,
        'total_sale_vat': total_sale_vat,
        'total_purchase_net': total_purchase_net,
        'total_purchase_vat': total_purchase_vat,
        'payable': total_sale_vat - total_purchase_vat,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def seasonal_report(request):
    """صورت معاملات فصلی (ماده 169 مکرر) — تجمیع به تفکیک طرف معامله.

    مشخصات طرف (کد اقتصادی/شناسه ملی/کد پستی) در صورت پرنبودن، از مدیریت قراردادها
    (ContractParty مرتبط با تفصیلی طرف) بارگذاری می‌شود.
    """
    from contracts.models import ContractParty

    lines = _lines(request).exclude(invoice_type='none')

    # پیش‌بارگذاری مشخصات طرف از مدیریت قراردادها برای تفصیلی‌های مرتبط
    party_cache = {}
    for line in lines:
        aux = line.auxiliary_1 or line.auxiliary
        if not aux or not aux.party_id:
            continue
        party = ContractParty.objects.filter(id=aux.party_id).first()
        if party:
            party_cache[aux.id] = party

    parties = {}
    for line in lines:
        aux = line.auxiliary_1 or line.auxiliary
        pobj = party_cache.get(aux.id) if aux else None
        key = (
            line.party_tax_id
            or line.party_national_id
            or (pobj.economic_code if pobj else None)
            or (pobj.national_id if pobj else None)
            or (f'aux-{aux.id}' if aux else None)
            or f'inv-{line.invoice_number}'
        )
        if not key:
            continue
        key = str(key)
        p = parties.get(key)
        if p is None:
            p = parties[key] = {
                'tax_id': line.party_tax_id or (pobj.economic_code if pobj else ''),
                'national_id': line.party_national_id or (pobj.national_id if pobj else ''),
                'postal_code': line.party_postal_code or '',
                'name': (aux.name if aux else '') or (pobj.name if pobj else ''),
                'sale_count': 0, 'sale_amount': 0.0,
                'purchase_count': 0, 'purchase_amount': 0.0,
                'service_count': 0, 'service_amount': 0.0,
            }
        amount = float(line.base_amount or 0) or (float(line.debit or 0) or float(line.credit or 0))
        if line.invoice_type in ('sale', 'export'):
            p['sale_count'] += 1
            p['sale_amount'] += amount
        elif line.invoice_type in ('purchase', 'import'):
            p['purchase_count'] += 1
            p['purchase_amount'] += amount
        elif line.invoice_type == 'service':
            p['service_count'] += 1
            p['service_amount'] += amount

    rows = sorted(parties.values(), key=lambda x: -(x['sale_amount'] + x['purchase_amount']))
    return Response({
        'rows': rows,
        'total_sale': sum(p['sale_amount'] for p in rows),
        'total_purchase': sum(p['purchase_amount'] for p in rows),
        'total_parties': len(rows),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def official_ledger(request):
    """دفاتر رسمی (روزنامه/معین) با فرمت سازگار با سازمان امور مالیاتی."""
    lines = _lines(request).order_by('document__date', 'document__id', 'line_no')

    journal_book = []
    docs = AccountingDocument.objects.filter(
        company=_company(request), status__in=['posted', 'locked'],
    ).order_by('date', 'id')
    year_id = request.query_params.get('fiscal_year')
    for doc in docs:
        if year_id and str(doc.fiscal_year_id) != str(year_id):
            continue
        journal_book.append({
            'number': doc.number or str(doc.id),
            'date': doc.date.isoformat() if doc.date else None,
            'description': doc.description,
            'debit': float(doc.total_debit or 0),
            'credit': float(doc.total_credit or 0),
        })

    by_account = {}
    for line in lines:
        rec = by_account.setdefault(line.account_id, {
            'code': line.account.code, 'name': line.account.name, 'rows': [],
        })
        rec['rows'].append({
            'date': line.document.date.isoformat() if line.document.date else None,
            'number': line.document.number or str(line.document_id),
            'description': line.description or line.document.description,
            'debit': float(line.debit or 0),
            'credit': float(line.credit or 0),
        })
    subsidiary = sorted(by_account.values(), key=lambda x: x['code'])

    return Response({
        'journal_book': journal_book,
        'subsidiary_ledger': subsidiary,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def bi_dashboard(request):
    """داشبورد BI — روند سود/زیان، گردش نقد و ترکیب حساب‌ها."""
    lines = _lines(request).select_related('account__account_type')

    monthly = {}
    for line in lines:
        cat = line.account.account_type.category
        debit = float(line.debit or 0)
        credit = float(line.credit or 0)
        month = line.document.date.strftime('%Y-%m') if line.document.date else 'n/a'
        m = monthly.setdefault(month, {'revenue': 0.0, 'expense': 0.0, 'month': month})
        if cat == 'revenue':
            m['revenue'] += credit - debit
        elif cat in ('expense', 'cost_of_sales'):
            m['expense'] += debit - credit

    monthly_rows = []
    for month in sorted(monthly.keys()):
        rec = monthly[month]
        monthly_rows.append({
            'month': rec['month'],
            'revenue': round(rec['revenue'], 2),
            'expense': round(rec['expense'], 2),
            'net': round(rec['revenue'] - rec['expense'], 2),
        })

    category_totals = {}
    for line in lines:
        cat = line.account.account_type.category
        debit = float(line.debit or 0)
        credit = float(line.credit or 0)
        c = category_totals.setdefault(cat, 0.0)
        if cat in ('asset', 'expense', 'cost_of_sales'):
            c += debit - credit
        else:
            c += credit - debit

    category_labels = {
        'asset': 'دارایی', 'liability': 'بدهی', 'equity': 'حقوق مالکانه',
        'revenue': 'درآمد', 'expense': 'هزینه', 'cost_of_sales': 'بهای تمام‌شده',
        'memorandum': 'انتظامی',
    }

    return Response({
        'monthly': monthly_rows,
        'categories': [
            {'key': k, 'label': category_labels.get(k, k), 'value': round(v, 2)}
            for k, v in category_totals.items()
        ],
    })