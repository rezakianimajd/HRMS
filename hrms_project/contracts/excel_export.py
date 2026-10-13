"""خروجی اکسل جامع ماژول قراردادها.

خروجی یک فایل `.xlsx` چندشیتی است که **همهٔ آیتم‌های درون قرارداد** را می‌آورد:
قراردادها، مفاد و شرایط، تخصیص پروژه‌ها، پیش‌پرداخت‌های مرحله‌ای، ضمانت‌های قرارداد،
تضمین‌ها/ضمانت‌نامه‌ها، فاکتورها، صورت‌وضعیت‌ها (+ اضافات و کسورات)، پرداخت‌ها،
الحاقیه‌ها (+ مفاد)، و اختلافات/دعاوی.
"""
from decimal import Decimal

try:  # تبدیل تاریخ به شمسی (همان الگوی ماژول پروژه‌ها)
    from jdatetime import date as jdate
except ImportError:  # pragma: no cover
    jdate = None


def _fa_date(value):
    """تاریخ شمسی به شکل 1404/01/15 (برای فایل اکسل فارسی)."""
    if not value:
        return ''
    if jdate is None:
        return str(value)
    try:
        j = jdate.fromgregorian(date=value)
        return f'{j.year:04d}/{j.month:02d}/{j.day:02d}'
    except Exception:  # noqa: BLE001
        return str(value)


def _num(value):
    if value in (None, ''):
        return 0
    try:
        return float(Decimal(value))
    except Exception:  # noqa: BLE001
        return 0


def _text(value):
    return '' if value in (None, '') else str(value)


def _related_name(obj, field, *attrs):
    """نامِ یک رابطه (FK) را ایمن بخوان.

    نام فیلد در مدل‌های مختلف یکسان نیست (مثلاً «امضاکننده» فیلد `full_name` دارد و
    «ارز» فیلد `name`)، پس چند نام ممکن بررسی می‌شود و در نبود همه، رشتهٔ خالی
    برمی‌گردد تا خروجی هرگز خطا ندهد.
    """
    related = getattr(obj, field, None)
    if related is None:
        return ''
    for attr in attrs:
        value = getattr(related, attr, None)
        if value:
            return str(value)
    return ''


def _display(obj, attr):
    """متن نمایشی یک فیلد دارای choices (مثلاً get_status_display)."""
    getter = getattr(obj, f'get_{attr}_display', None)
    if callable(getter):
        try:
            return getter()
        except Exception:  # noqa: BLE001
            return ''
    return ''


def _sheet(wb, title, headers, first=False):
    """ساخت شیت راست‌به‌چپ با سرستون‌های قالب‌بندی‌شده و ردیف‌های یخ‌زده."""
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter

    ws = wb.active if first else wb.create_sheet()
    ws.title = title[:31]
    ws.sheet_view.rightToLeft = True
    ws.append(list(headers))

    header_font = Font(bold=True, color='FFFFFF', size=11)
    header_fill = PatternFill('solid', fgColor='B45309')
    center = Alignment(horizontal='center', vertical='center', wrap_text=True)
    for index, header in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=index)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center
        width = max(12, min(42, len(str(header)) + 6))
        ws.column_dimensions[get_column_letter(index)].width = width
    ws.freeze_panes = 'A2'
    return ws


def _append(ws, values):
    """افزودن یک ردیف داده با تراز وسط."""
    from openpyxl.styles import Alignment

    ws.append(list(values))
    row = ws.max_row
    cell = ws.cell(row=row, column=1)
    cell.alignment = Alignment(horizontal='center', vertical='center')
    return row


def _party_name(contract):
    return _related_name(contract, 'party', 'name')


def _type_label(contract):
    label = _related_name(contract, 'contract_type_master', 'name')
    return label or _display(contract, 'contract_type')


def _project_names(contract):
    """نام پروژه‌های تخصیص‌یافته (از project_allocations یا پروژهٔ منفرد)."""
    allocations = contract.project_allocations or []
    names = []
    ids = []
    for item in allocations:
        if isinstance(item, dict) and item.get('project'):
            ids.append(item['project'])
    if contract.project_id and not ids:
        ids.append(contract.project_id)
    if not ids:
        return names
    try:
        from projects.models import Project
        numeric = [i for i in ids if str(i).isdigit()]
        mapping = dict(
            Project.objects.filter(id__in=numeric).values_list('id', 'name')
        )
        return [mapping.get(int(i), f'#{i}') for i in ids]
    except Exception:  # noqa: BLE001 — نبود مدل/جدول پروژه نباید خروجی را قطع کند
        return [f'#{i}' for i in ids]



def _contract_bundle(contract):
    """آیتم‌های درون یک قرارداد + جمع‌های مالی آن."""
    invoices = list(contract.invoices.all())
    statements = list(contract.statements.all())
    payments = list(contract.payments.all())
    guarantees = list(contract.guarantees.all())
    addendums = list(contract.addendums.all())
    disputes = list(contract.disputes.all())
    return {
        'invoices': invoices,
        'statements': statements,
        'payments': payments,
        'guarantees': guarantees,
        'addendums': addendums,
        'disputes': disputes,
        'invoice_total': sum(_num(i.total or i.amount) for i in invoices),
        'statement_total': sum(_num(s.net_amount or s.amount) for s in statements),
        'payment_total': sum(_num(p.amount) for p in payments),
        'guarantee_total': sum(_num(g.amount) for g in guarantees),
    }


CONTRACT_HEADERS = [
    'ردیف', 'شماره قرارداد', 'موضوع قرارداد', 'طرف قرارداد', 'نوع شخص طرف', 'نوع قرارداد',
    'طبقه‌بندی', 'وضعیت', 'مبلغ قرارداد', 'ارز', 'تاریخ امضا', 'تاریخ شروع', 'تاریخ پایان',
    'امضاکننده', 'پروژه‌ها', 'نام پروژه / طرح', 'محل اجرا / تحویل', 'شماره مناقصه / استعلام',
    'پیش‌پرداخت', 'درصد حسن انجام کار', 'دوره گارانتی', 'مبلغ تضمین', 'نوع ضمانت',
    'تعداد فاکتور', 'جمع فاکتورها', 'تعداد صورت‌وضعیت', 'جمع صورت‌وضعیت‌ها (قابل پرداخت)',
    'تعداد پرداخت', 'جمع پرداخت‌ها', 'مانده پرداخت‌نشده', 'درصد پرداخت‌شده',
    'تعداد تضمین', 'جمع مبلغ تضمین‌ها', 'تعداد الحاقیه', 'جمع تغییر مبلغ الحاقیه‌ها',
    'تعداد اختلاف', 'تلفن طرف', 'ایمیل طرف', 'تاریخ ایجاد', 'آخرین به‌روزرسانی',
]


def _contracts_sheet(wb, contracts, first=False):
    ws = _sheet(wb, 'قراردادها', CONTRACT_HEADERS, first=first)
    total = {'amount': 0, 'invoice': 0, 'statement': 0, 'payment': 0, 'balance': 0, 'guarantee': 0}
    for index, contract in enumerate(contracts, start=1):
        bundle = _contract_bundle(contract)
        amount = _num(contract.amount)
        balance = amount - bundle['payment_total']
        paid_percent = round(bundle['payment_total'] / amount * 100, 1) if amount else 0
        addendum_change = sum(_num(a.amount_change) for a in bundle['addendums'])
        total['amount'] += amount
        total['invoice'] += bundle['invoice_total']
        total['statement'] += bundle['statement_total']
        total['payment'] += bundle['payment_total']
        total['balance'] += balance
        total['guarantee'] += bundle['guarantee_total']
        _append(ws, [
            index,
            _text(contract.number),
            _text(contract.subject),
            _related_name(contract, 'party', 'name'),
            _display(contract.party, 'person_type') if contract.party_id else '',
            _type_label(contract),
            _text(contract.category),
            _display(contract, 'status'),
            amount,
            _related_name(contract, 'currency', 'name', 'code') or 'ریال',
            _fa_date(contract.signing_date),
            _fa_date(contract.start_date),
            _fa_date(contract.end_date),
            _related_name(contract, 'signatory', 'full_name', 'name'),
            '، '.join(_project_names(contract)),
            _text(contract.project_name),
            _text(contract.project_location),
            _text(contract.tender_number),
            _num(contract.advance_payment),
            _num(contract.retention_percent),
            _text(contract.warranty_period),
            _num(contract.guarantee_amount),
            _display(contract, 'guarantee_type'),
            len(bundle['invoices']),
            bundle['invoice_total'],
            len(bundle['statements']),
            bundle['statement_total'],
            len(bundle['payments']),
            bundle['payment_total'],
            balance,
            paid_percent,
            len(bundle['guarantees']),
            bundle['guarantee_total'],
            len(bundle['addendums']),
            addendum_change,
            len(bundle['disputes']),
            _related_name(contract, 'party', 'phone', 'mobile'),
            _related_name(contract, 'party', 'email'),
            _fa_date(contract.created_at.date() if contract.created_at else None),
            _fa_date(contract.updated_at.date() if contract.updated_at else None),
        ])

    from openpyxl.styles import Font
    ws.append([])
    row = ws.max_row + 1
    ws.cell(row=row, column=1, value='جمع کل').font = Font(bold=True)
    for column, value in (
        (9, total['amount']),
        (25, total['invoice']),
        (27, total['statement']),
        (29, total['payment']),
        (30, total['balance']),
        (33, total['guarantee']),
    ):
        ws.cell(row=row, column=column, value=value).font = Font(bold=True)


def _terms_sheet(wb, contracts):
    """مفاد و شرایط قرارداد (متن‌های بلند که در شیت اصلی جا نمی‌شوند)."""
    headers = [
        'ردیف', 'شماره قرارداد', 'موضوع قرارداد', 'طرف قرارداد', 'وضعیت',
        'شرایط و نحوه پرداخت', 'شرایط تحویل', 'وجه التزام / جریمه تأخیر', 'شرایط بیمه',
        'توضیحات قرارداد', 'تعداد بندهای الحاقیه',
    ]
    ws = _sheet(wb, 'مفاد و شرایط', headers)
    for index, contract in enumerate(contracts, start=1):
        provisions = 0
        for addendum in contract.addendums.all():
            provisions += len(addendum.provisions or [])
        _append(ws, [
            index,
            _text(contract.number),
            _text(contract.subject),
            _party_name(contract),
            _display(contract, 'status'),
            _text(contract.payment_terms),
            _text(contract.delivery_terms),
            _text(contract.penalty_terms),
            _text(contract.insurance_terms),
            _text(contract.description),
            provisions,
        ])
    return ws


def _allocations_sheet(wb, contracts):
    """تخصیص پروژه‌ها (از فیلد JSON قرارداد)."""
    headers = ['ردیف', 'شماره قرارداد', 'موضوع قرارداد', 'پروژه', 'درصد تخصیص']
    ws = _sheet(wb, 'تخصیص پروژه‌ها', headers)
    index = 0
    for contract in contracts:
        allocations = contract.project_allocations or []
        for item in allocations:
            if not isinstance(item, dict):
                continue
            index += 1
            project_id = item.get('project')
            project_name = ''
            if project_id:
                from projects.models import Project
                project = Project.objects.filter(id=project_id).values_list('name', flat=True).first()
                project_name = project or f'#{project_id}'
            _append(ws, [
                index, _text(contract.number), _text(contract.subject),
                project_name, _num(item.get('percentage')),
            ])
    return ws


def _advance_sheet(wb, contracts):
    """پیش‌پرداخت‌های مرحله‌ای (فیلد JSON قرارداد)."""
    headers = ['ردیف', 'شماره قرارداد', 'موضوع قرارداد', 'مرحله', 'مبلغ', 'سررسید', 'یادداشت']
    ws = _sheet(wb, 'پیش‌پرداخت‌های مرحله‌ای', headers)
    index = 0
    for contract in contracts:
        for item in (contract.advance_payments or []):
            if not isinstance(item, dict):
                continue
            index += 1
            _append(ws, [
                index, _text(contract.number), _text(contract.subject),
                _text(item.get('step')), _num(item.get('amount')),
                _text(item.get('due_date')), _text(item.get('note')),
            ])
    return ws


def _guarantee_items_sheet(wb, contracts):
    """اقلام ضمانت ثبت‌شده در خود قرارداد (فیلد JSON)."""
    headers = ['ردیف', 'شماره قرارداد', 'موضوع قرارداد', 'نوع ضمانت', 'مبلغ', 'درصد', 'یادداشت']
    ws = _sheet(wb, 'اقلام ضمانت قرارداد', headers)
    index = 0
    for contract in contracts:
        for item in (contract.guarantee_items or []):
            if not isinstance(item, dict):
                continue
            index += 1
            _append(ws, [
                index, _text(contract.number), _text(contract.subject),
                _text(item.get('type')), _num(item.get('amount')),
                _num(item.get('percent')), _text(item.get('note')),
            ])
    return ws



def _guarantees_sheet(wb, contracts):
    """تضمین‌ها / چک / سفته / ضمانت‌نامه‌ها."""
    headers = [
        'ردیف', 'شماره قرارداد', 'موضوع قرارداد', 'نوع تضمین', 'نوع ابزار', 'شماره',
        'مبلغ', 'تاریخ صدور', 'تاریخ انقضا', 'بانک صادرکننده', 'شماره چک', 'بانک چک',
        'سررسید چک', 'شماره سفته', 'سررسید سفته', 'شماره ضمانت‌نامه', 'انقضای ضمانت‌نامه',
        'آزاد شده', 'تاریخ آزادسازی', 'آخرین اقدام', 'تاریخ آخرین اقدام', 'یادداشت',
    ]
    ws = _sheet(wb, 'تضمین‌ها', headers)
    index = 0
    for contract in contracts:
        for guarantee in contract.guarantees.all().order_by('-issue_date', '-id'):
            index += 1
            _append(ws, [
                index, _text(contract.number), _text(contract.subject),
                _display(guarantee, 'guarantee_type'), _display(guarantee, 'instrument_type'),
                _text(guarantee.number), _num(guarantee.amount),
                _fa_date(guarantee.issue_date), _fa_date(guarantee.expiry_date),
                _text(guarantee.bank), _text(guarantee.check_number), _text(guarantee.check_bank),
                _fa_date(guarantee.check_due_date), _text(guarantee.promissory_number),
                _fa_date(guarantee.promissory_due_date), _text(guarantee.guarantee_number),
                _fa_date(guarantee.guarantee_expiry_date),
                'بله' if guarantee.is_released else 'خیر', _fa_date(guarantee.release_date),
                _display(guarantee, 'last_action'),
                _fa_date(guarantee.last_action_date), _text(guarantee.note),
            ])
    return ws


def _invoices_sheet(wb, contracts):
    """فاکتورهای صادرشده در قرارداد."""
    headers = [
        'ردیف', 'شماره قرارداد', 'موضوع قرارداد', 'شماره فاکتور', 'شرح فاکتور',
        'تاریخ فاکتور', 'تاریخ سررسید', 'مبلغ', 'مالیات', 'مبلغ کل', 'وضعیت پرداخت',
        'تعداد پرداخت مرتبط', 'جمع پرداخت مرتبط', 'توضیحات',
    ]
    ws = _sheet(wb, 'فاکتورها', headers)
    index = 0
    for contract in contracts:
        for invoice in contract.invoices.all().order_by('-date', '-id'):
            index += 1
            payments = list(invoice.payments.all())
            _append(ws, [
                index, _text(contract.number), _text(contract.subject),
                _text(invoice.number), _text(invoice.subject),
                _fa_date(invoice.date), _fa_date(invoice.due_date),
                _num(invoice.amount), _num(invoice.vat), _num(invoice.total),
                'پرداخت‌شده' if invoice.is_paid else 'پرداخت‌نشده',
                len(payments), sum(_num(p.amount) for p in payments),
                _text(invoice.description),
            ])
    return ws


def _statements_sheet(wb, contracts):
    """صورت‌وضعیت‌ها با تفکیک کامل مالی."""
    headers = [
        'ردیف', 'شماره قرارداد', 'موضوع قرارداد', 'شماره صورت‌وضعیت', 'تاریخ',
        'مبلغ تجمعی این صورت‌وضعیت', 'مبلغ تجمعی صورت‌وضعیت قبلی', 'کارکرد دوره',
        'ارزش افزوده', 'سایر اضافات', 'جمع اضافات', 'جمع کسورات', 'مبلغ قابل پرداخت',
        'نرخ ارز', 'وضعیت تأیید', 'توضیحات',
    ]
    ws = _sheet(wb, 'صورت‌وضعیت‌ها', headers)
    index = 0
    for contract in contracts:
        for statement in contract.statements.all().order_by('date', 'id'):
            index += 1
            _append(ws, [
                index, _text(contract.number), _text(contract.subject),
                _text(statement.number), _fa_date(statement.date),
                _num(statement.amount), _num(statement.cumulative_previous_amount),
                _num(statement.work_done), _num(statement.value_added_tax),
                _num(statement.other_additions), _num(statement.additions_total),
                _num(statement.deductions_total), _num(statement.net_amount),
                _num(statement.exchange_rate),
                'تأییدشده' if statement.is_approved else 'تأییدنشده',
                _text(statement.description),
            ])
    return ws


def _statement_items_sheet(wb, contracts):
    """اضافات و کسورات هر صورت‌وضعیت (آیتم‌های JSON) به‌صورت تفصیلی."""
    headers = ['ردیف', 'شماره قرارداد', 'شماره صورت‌وضعیت', 'تاریخ', 'نوع آیتم', 'کد', 'عنوان', 'درصد', 'مبلغ', 'یادداشت']
    ws = _sheet(wb, 'اضافات و کسورات صورت‌وضعیت', headers)
    index = 0
    for contract in contracts:
        for statement in contract.statements.all().order_by('date', 'id'):
            for kind, items in (('اضافه', statement.additions or []), ('کسور', statement.deductions or [])):
                for item in items:
                    if not isinstance(item, dict):
                        continue
                    index += 1
                    _append(ws, [
                        index, _text(contract.number), _text(statement.number),
                        _fa_date(statement.date), kind, _text(item.get('code')),
                        _text(item.get('title') or item.get('description')),
                        _num(item.get('percent')), _num(item.get('amount')),
                        _text(item.get('note')),
                    ])
    return ws



def _payments_sheet(wb, contracts):
    """پرداخت‌ها با ارجاع به فاکتور و صورت‌وضعیت مرتبط."""
    headers = [
        'ردیف', 'شماره قرارداد', 'موضوع قرارداد', 'تاریخ پرداخت', 'مبلغ', 'ارز',
        'شماره مرجع / سند', 'روش پرداخت', 'فاکتور مرتبط', 'صورت‌وضعیت مرتبط', 'توضیحات',
    ]
    ws = _sheet(wb, 'پرداخت‌ها', headers)
    index = 0
    for contract in contracts:
        for payment in contract.payments.all().order_by('date', 'id'):
            index += 1
            _append(ws, [
                index, _text(contract.number), _text(contract.subject),
                _fa_date(payment.date), _num(payment.amount),
                _related_name(payment, 'currency', 'name', 'code') or 'ریال',
                _text(payment.reference), _text(payment.method),
                _text(payment.invoice.number if payment.invoice_id else ''),
                _text(payment.statement.number if payment.statement_id else ''),
                _text(payment.note),
            ])
    return ws


def _addendums_sheet(wb, contracts):
    """الحاقیه‌های قرارداد."""
    headers = [
        'ردیف', 'شماره قرارداد', 'موضوع قرارداد', 'شماره الحاقیه', 'موضوع الحاقیه', 'تاریخ',
        'تغییر مبلغ', 'درصد تغییر', 'تاریخ پایان جدید', 'تعداد مفاد', 'شرح تغییرات',
    ]
    ws = _sheet(wb, 'الحاقیه‌ها', headers)
    index = 0
    for contract in contracts:
        for addendum in contract.addendums.all().order_by('date', 'id'):
            index += 1
            _append(ws, [
                index, _text(contract.number), _text(contract.subject),
                _text(addendum.number), _text(addendum.subject), _fa_date(addendum.date),
                _num(addendum.amount_change), _num(addendum.percent_change),
                _fa_date(addendum.new_end_date), len(addendum.provisions or []),
                _text(addendum.change_description),
            ])
    return ws


def _addendum_provisions_sheet(wb, contracts):
    """مفاد / بندهای هر الحاقیه (آیتم‌های JSON)."""
    headers = ['ردیف', 'شماره قرارداد', 'شماره الحاقیه', 'تاریخ', 'ردیف بند', 'عنوان بند', 'متن بند']
    ws = _sheet(wb, 'مفاد الحاقیه‌ها', headers)
    index = 0
    for contract in contracts:
        for addendum in contract.addendums.all().order_by('date', 'id'):
            for position, provision in enumerate(addendum.provisions or [], start=1):
                if not isinstance(provision, dict):
                    continue
                index += 1
                _append(ws, [
                    index, _text(contract.number), _text(addendum.number), _fa_date(addendum.date),
                    position, _text(provision.get('title')), _text(provision.get('text')),
                ])
    return ws


def _disputes_sheet(wb, contracts):
    """اختلافات و دعاوی قرارداد (مدیریت ریسک)."""
    headers = [
        'ردیف', 'شماره قرارداد', 'موضوع قرارداد', 'موضوع اختلاف', 'نوع اختلاف', 'شدت',
        'وضعیت', 'مبلغ ادعا', 'تاریخ طرح', 'تاریخ حل', 'شرح', 'اقدام / نتیجه',
    ]
    ws = _sheet(wb, 'اختلافات و دعاوی', headers)
    index = 0
    for contract in contracts:
        for dispute in contract.disputes.all().order_by('-opened_date', '-id'):
            index += 1
            _append(ws, [
                index, _text(contract.number), _text(contract.subject),
                _text(dispute.title), _display(dispute, 'dispute_type'),
                _display(dispute, 'severity'), _display(dispute, 'status'),
                _num(dispute.claim_amount), _fa_date(dispute.opened_date),
                _fa_date(dispute.resolved_date), _text(dispute.description),
                _text(dispute.resolution),
            ])
    return ws


def _summary_sheet(wb, contracts, described):
    """شیت نخست: خلاصهٔ آماری + فهرست شیت‌ها."""
    from django.utils import timezone

    headers = ['شرح', 'مقدار']
    ws = _sheet(wb, 'خلاصه', headers, first=True)

    totals = {'amount': 0, 'invoice': 0, 'statement': 0, 'payment': 0, 'guarantee': 0}
    counters = {'invoices': 0, 'statements': 0, 'payments': 0, 'guarantees': 0, 'addendums': 0, 'disputes': 0}
    for contract in contracts:
        bundle = _contract_bundle(contract)
        totals['amount'] += _num(contract.amount)
        totals['invoice'] += bundle['invoice_total']
        totals['statement'] += bundle['statement_total']
        totals['payment'] += bundle['payment_total']
        totals['guarantee'] += bundle['guarantee_total']
        counters['invoices'] += len(bundle['invoices'])
        counters['statements'] += len(bundle['statements'])
        counters['payments'] += len(bundle['payments'])
        counters['guarantees'] += len(bundle['guarantees'])
        counters['addendums'] += len(bundle['addendums'])
        counters['disputes'] += len(bundle['disputes'])

    rows = [
        ('تاریخ تهیه گزارش', f'{timezone.localtime().strftime("%Y-%m-%d %H:%M")} (میلادی)'),
        ('تعداد قراردادها', len(contracts)),
        ('جمع مبلغ قراردادها (ریال)', totals['amount']),
        ('جمع فاکتورها', totals['invoice']),
        ('جمع صورت‌وضعیت‌ها (قابل پرداخت)', totals['statement']),
        ('جمع پرداخت‌ها', totals['payment']),
        ('مانده پرداخت‌نشده', totals['amount'] - totals['payment']),
        ('جمع مبلغ تضمین‌ها', totals['guarantee']),
        ('تعداد فاکتورها', counters['invoices']),
        ('تعداد صورت‌وضعیت‌ها', counters['statements']),
        ('تعداد پرداخت‌ها', counters['payments']),
        ('تعداد تضمین‌ها', counters['guarantees']),
        ('تعداد الحاقیه‌ها', counters['addendums']),
        ('تعداد اختلافات', counters['disputes']),
        ('', ''),
        ('شیت‌های این فایل', '—'),
    ]
    for label, value in rows:
        _append(ws, [label, value])

    _append(ws, ['', ''])
    _append(ws, ['شیت‌های این فایل', 'شرح محتوای شیت'])
    for name, description in described:
        _append(ws, [name, description])
    return ws


SHEET_LIST = [
    ('خلاصه', 'آمار کلی قراردادها و فهرست شیت‌ها'),
    ('قراردادها', 'همهٔ قراردادها با اقلام کلیدی و جمع‌های مالی هر قرارداد'),
    ('مفاد و شرایط', 'شرایط پرداخت، تحویل، وجه التزام، بیمه و توضیحات قرارداد'),
    ('تخصیص پروژه‌ها', 'پروژه‌های تخصیص‌یافته به هر قرارداد و درصد آن‌ها'),
    ('پیش‌پرداخت‌های مرحله‌ای', 'مراحل پیش‌پرداخت هر قرارداد'),
    ('اقلام ضمانت قرارداد', 'اقلام ضمانت ثبت‌شده در متن قرارداد'),
    ('تضمین‌ها', 'چک، سفته و ضمانت‌نامه‌های هر قرارداد'),
    ('فاکتورها', 'فاکتورهای صادرشده با مبلغ، مالیات و وضعیت پرداخت'),
    ('صورت‌وضعیت‌ها', 'صورت‌وضعیت‌ها با تفکیک کامل مالی'),
    ('اضافات و کسورات صورت‌وضعیت', 'آیتم‌های اضافات و کسورات هر صورت‌وضعیت'),
    ('پرداخت‌ها', 'پرداخت‌های هر قرارداد با ارجاع به فاکتور و صورت‌وضعیت'),
    ('الحاقیه‌ها', 'الحاقیه‌ها، تغییر مبلغ و تاریخ پایان جدید'),
    ('مفاد الحاقیه‌ها', 'بندهای (مفاد) ثبت‌شده در هر الحاقیه'),
    ('اختلافات و دعاوی', 'اختلافات قراردادی با نوع، شدت، مبلغ ادعا و نتیجه'),
]


def build_contracts_workbook(contracts):
    """ساخت فایل اکسل چندشیتی از قراردادها و تمام آیتم‌های درون آن‌ها."""
    from openpyxl import Workbook

    contracts = list(contracts)
    workbook = Workbook()
    _summary_sheet(workbook, contracts, SHEET_LIST)
    _contracts_sheet(workbook, contracts)
    _terms_sheet(workbook, contracts)
    _allocations_sheet(workbook, contracts)
    _advance_sheet(workbook, contracts)
    _guarantee_items_sheet(workbook, contracts)
    _guarantees_sheet(workbook, contracts)
    _invoices_sheet(workbook, contracts)
    _statements_sheet(workbook, contracts)
    _statement_items_sheet(workbook, contracts)
    _payments_sheet(workbook, contracts)
    _addendums_sheet(workbook, contracts)
    _addendum_provisions_sheet(workbook, contracts)
    _disputes_sheet(workbook, contracts)
    return workbook

    return ws
