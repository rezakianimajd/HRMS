"""صورت ریز هزینهٔ تنخواه — سند سروری موتور چاپ.

تابع ``statement_document`` خالص است (بدون دیتابیس) و تابع ``load_statement``
دادهٔ صورت را با همان دامنهٔ دید تنخواه از دیتابیس می‌خواند.
"""
from core.print_engine import components as pe
from core.print_engine.registry import PrintError, _company_info, can_print

LINE_COLUMNS = [
    {'key': 'line_no', 'label': '#', 'width': '4%', 'align': 'center', 'headerAlign': 'center', 'format': 'digits'},
    {'key': 'account', 'label': 'کد معین / سرفصل', 'width': '14%', 'align': 'center', 'headerAlign': 'center'},
    {'key': 'aux1', 'label': 'کد تفصیل ۱', 'width': '10%', 'align': 'center', 'headerAlign': 'center', 'fontSize': '8pt'},
    {'key': 'aux2', 'label': 'کد تفصیل ۲', 'width': '10%', 'align': 'center', 'headerAlign': 'center', 'fontSize': '8pt'},
    {'key': 'description', 'label': 'شرح هزینه', 'width': '19%', 'align': 'right', 'headerAlign': 'center', 'fontSize': '8pt'},
    {'key': 'supplier', 'label': 'فروشنده / طرف حساب', 'width': '14%', 'align': 'right', 'headerAlign': 'center', 'fontSize': '8pt'},
    {'key': 'invoice_number', 'label': 'شماره فاکتور', 'width': '9%', 'align': 'center', 'headerAlign': 'center', 'fontSize': '7.5pt'},
    {'key': 'base', 'label': 'مبلغ پایه', 'width': '8%', 'format': 'money', 'unit': '', 'align': 'left', 'headerAlign': 'center'},
    {'key': 'vat', 'label': 'ارزش افزوده', 'width': '6%', 'format': 'money', 'unit': '', 'align': 'left', 'headerAlign': 'center'},
    {'key': 'total', 'label': 'جمع ردیف', 'width': '8%', 'format': 'money', 'unit': '', 'align': 'left', 'headerAlign': 'center'},
]


def statement_document(data):
    """ساختار سند «صورت ریز هزینهٔ تنخواه» از دادهٔ آماده (بدون دیتابیس)."""
    lines = data.get('lines') or []
    status = data.get('status_display') or data.get('status') or ''

    identity = pe.field_grid([
        ('شماره صورت', data.get('number')),
        ('نام تنخواه', data.get('fund')),
        ('تاریخ صورت', pe.jalali(data.get('date'))),
    ], columns=3, widths=['12%', '14%', '14%', '38%', '12%', '10%'])

    sections = [{'html': identity}]
    description = (data.get('description') or '').strip()
    if description:
        sections.append({
            'html': f'<div class="pe-note" style="border-style:solid">{pe.esc(description)}</div>',
        })
    sections.append({
        'html': pe.data_table(LINE_COLUMNS, lines, {'zebra': True, 'header_style': 'light'}),
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
        'signatures': pe.signatures([
            {'title': 'تهیه‌کننده', 'name': data.get('custodian') or ''},
            {'title': 'تأییدکننده', 'name': data.get('approved_by') or ''},
            {'title': 'مهر و امضا'},
        ]),
        'watermark': watermark,
        'printed_on': data.get('printed_on'),
    }


def _aux_label(value):
    if not value:
        return ''
    return f'{value.code} — {value.name}'


def _line_payload(line):
    base = line.net_amount
    vat = line.vat_amount or 0
    if base is None:
        base = (line.debit or 0) - vat - (line.tax_amount or 0)
    return {
        'line_no': line.line_no,
        'account': f'{line.account.code} — {line.account.name}' if line.account_id else '',
        'aux1': _aux_label(line.auxiliary_1),
        'aux2': _aux_label(line.auxiliary_2),
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
        .prefetch_related('lines__account', 'lines__auxiliary_1', 'lines__auxiliary_2')
    )
    if company:
        queryset = queryset.filter(company=company)
    queryset = pc_access.scope_by_fund(queryset, company, getattr(request, 'user', None))
    statement = queryset.filter(pk=payload.get('id'), is_deleted=False).first()
    if not statement:
        raise PrintError('صورت هزینهٔ تنخواه یافت نشد.', 404)

    return statement_document({
        'company': _company_info(company),
        'number': statement.number or statement.pk,
        'date': statement.date,
        'fund': statement.fund.title if statement.fund_id else '',
        'custodian': statement.custodian.full_name if statement.custodian_id else '',
        'status': statement.status,
        'status_display': statement.get_status_display(),
        'payment_method': statement.get_payment_method_display(),
        'project': statement.project.name if statement.project_id else '',
        'cost_center': statement.cost_center.name if statement.cost_center_id else '',
        'description': statement.description,
        'approved_by': getattr(statement.approved_by, 'username', '') if statement.approved_by_id else '',
        'lines': [_line_payload(line) for line in statement.lines.all()],
        'printed_on': payload.get('printed_on'),
    })

