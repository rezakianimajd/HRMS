"""صورت ریز هزینهٔ تنخواه — سند سروری موتور چاپ.

تابع ``statement_document`` خالص است (بدون دیتابیس) و تابع ``load_statement``
دادهٔ صورت را با همان دامنهٔ دید تنخواه از دیتابیس می‌خواند.
"""
from core.print_engine import components as pe
from core.print_engine.registry import PrintError, can_print

LINE_COLUMNS = [
    {'key': 'line_no', 'label': '#', 'width': '4%', 'align': 'center', 'format': 'digits'},
    {'key': 'account', 'label': 'کد معین / سرفصل', 'width': '18%'},
    {'key': 'description', 'label': 'شرح هزینه', 'width': '21%'},
    {'key': 'supplier', 'label': 'فروشنده / طرف حساب', 'width': '16%'},
    {'key': 'invoice_number', 'label': 'شماره فاکتور', 'width': '10%', 'align': 'center'},
    {'key': 'base', 'label': 'مبلغ پایه', 'width': '11%', 'format': 'money', 'unit': '', 'align': 'left'},
    {'key': 'vat', 'label': 'ارزش افزوده', 'width': '10%', 'format': 'money', 'unit': '', 'align': 'left'},
    {'key': 'total', 'label': 'جمع ردیف', 'width': '10%', 'format': 'money', 'unit': '', 'align': 'left'},
]


def _amount(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def statement_document(data):
    """ساختار سند «صورت ریز هزینهٔ تنخواه» از دادهٔ آماده (بدون دیتابیس)."""
    lines = data.get('lines') or []
    base_total = _amount(data.get('base_total')) or sum(_amount(row.get('base')) for row in lines)
    vat_total = _amount(data.get('vat_total')) or sum(_amount(row.get('vat')) for row in lines)
    total = _amount(data.get('total')) or (base_total + vat_total)
    status = data.get('status_display') or data.get('status') or ''

    identity = pe.field_grid([
        ('تنخواه', data.get('fund')),
        ('تنخواه‌دار', data.get('custodian')),
        ('تاریخ صورت', pe.jalali(data.get('date'))),
        ('روش پرداخت', data.get('payment_method')),
        ('پروژه', data.get('project')),
        ('مرکز هزینه', data.get('cost_center')),
        ('مهلت تسویه', pe.jalali(data.get('due_date')) if data.get('due_date') else ''),
    ])
    totals = pe.field_grid([
        ('جمع مبلغ پایه', pe.money(base_total, with_unit=False)),
        ('جمع ارزش افزوده', pe.money(vat_total, with_unit=False)),
        ('جمع کل', pe.money(total, with_unit=False)),
    ])

    sections = [
        {'title': 'مشخصات صورت هزینه', 'html': identity},
        {'title': 'سطرهای هزینه', 'html': pe.data_table(LINE_COLUMNS, lines, {'zebra': True})},
        {'title': 'جمع‌ها', 'html': totals},
    ]
    description = (data.get('description') or '').strip()
    if description:
        sections.append({
            'title': 'شرح صورت',
            'html': f'<div class="pe-note" style="border-style:solid">{pe.esc(description)}</div>',
        })

    watermark = ''
    if status and status not in ('ثبت‌شده', 'posted'):
        watermark = 'پیش‌نویس'

    return {
        'title': 'صورت ریز هزینهٔ تنخواه',
        'subtitle': data.get('fund') or '',
        'badge': status,
        'company': data.get('company') or {},
        'meta': [
            ('شماره صورت', data.get('number')),
            ('تاریخ', pe.jalali(data.get('date'))),
        ],
        'sections': sections,
        'amount_box': {
            'words': pe.amount_words(total),
            'value': pe.money(total),
        },
        'barcode': pe.barcode(data.get('number') or ''),
        'signatures': pe.signatures([
            {'title': 'تهیه‌کننده', 'name': data.get('custodian') or ''},
            {'title': 'تأییدکننده', 'name': data.get('approved_by') or ''},
            {'title': 'مهر و امضا'},
        ]),
        'footer_note': (
            f'مبلغ پایه: {pe.money(base_total)} — ارزش افزوده: {pe.money(vat_total)}'
        ),
        'watermark': watermark,
        'printed_on': data.get('printed_on'),
    }


def _line_payload(line):
    base = line.net_amount
    vat = line.vat_amount or 0
    if base is None:
        base = (line.debit or 0) - vat - (line.tax_amount or 0)
    return {
        'line_no': line.line_no,
        'account': f'{line.account.code} — {line.account.name}' if line.account_id else '',
        'description': line.description or '',
        'supplier': line.supplier or '',
        'invoice_number': line.invoice_number or '',
        'base': base,
        'vat': vat,
        'total': line.debit or 0,
    }


def load_statement(payload, options=None, request=None):
    """خواندن صورت هزینه از دیتابیس (با دامنهٔ دید تنخواه) و ساخت سند چاپی."""
    from pettycash import access as pc_access
    from pettycash.models import PettyCashExpenseStatement

    if not can_print(getattr(request, 'user', None), 'pettycash'):
        raise PrintError('برای چاپ صورت هزینهٔ تنخواه مجوز لازم را ندارید.', 403)

    company = getattr(request, 'tenant', None) or getattr(request, 'company', None)
    queryset = (
        PettyCashExpenseStatement.objects
        .select_related('fund', 'custodian', 'project', 'cost_center')
        .prefetch_related('lines__account')
    )
    if company:
        queryset = queryset.filter(company=company)
    queryset = pc_access.scope_by_fund(queryset, company, getattr(request, 'user', None))
    statement = queryset.filter(pk=payload.get('id'), is_deleted=False).first()
    if not statement:
        raise PrintError('صورت هزینهٔ تنخواه یافت نشد.', 404)

    return statement_document({
        'company': {
            'name': getattr(company, 'name', '') or '',
            'subtitle': getattr(company, 'code', '') or '',
        },
        'number': statement.number or statement.pk,
        'date': statement.date,
        'fund': statement.fund.title if statement.fund_id else '',
        'custodian': statement.custodian.full_name if statement.custodian_id else '',
        'status': statement.status,
        'status_display': statement.get_status_display(),
        'payment_method': statement.get_payment_method_display(),
        'project': statement.project.name if statement.project_id else '',
        'cost_center': statement.cost_center.name if statement.cost_center_id else '',
        'due_date': statement.due_date,
        'description': statement.description,
        'approved_by': getattr(statement.approved_by, 'username', '') if statement.approved_by_id else '',
        'lines': [_line_payload(line) for line in statement.lines.all()],
        'base_total': statement.net_total,
        'vat_total': statement.tax_total,
        'total': statement.total,
        'printed_on': payload.get('printed_on'),
    })

