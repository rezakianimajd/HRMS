"""خروجی اکسل قراردادها — **تک‌شیت** و جامع.

همهٔ اطلاعات در یک کاربرگ جمع می‌شود: یک ردیف برای هر قرارداد (با تمام اقلام کلیدی و
مفاد آن) و بلافاصله ردیف‌های همهٔ آیتم‌های درون قرارداد (فاکتور، صورت‌وضعیت و اضافات/
کسورات آن، پرداخت، تضمین، الحاقیه و بندهای آن، تخصیص پروژه، پیش‌پرداخت، اقلام ضمانت و
اختلافات). ستون «نوع ردیف» امکان فیلتر/گروه‌بندی سریع در اکسل را می‌دهد.
"""
from decimal import Decimal

try:  # تاریخ شمسی (همان الگوی ماژول پروژه‌ها)
    from jdatetime import date as jdate
except ImportError:  # pragma: no cover
    jdate = None


# ----------------------------------------------------------------------------
# کمک‌تابع‌ها
# ----------------------------------------------------------------------------
def _fa_date(value):
    """تاریخ شمسی به شکل 1404/01/15."""
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
        return ''
    try:
        return float(Decimal(value))
    except Exception:  # noqa: BLE001
        return ''


def _text(value):
    return '' if value in (None, '') else str(value)


def _related_name(obj, field, *attrs):
    """نام یک رابطه (FK) را ایمن بخوان (نام فیلد در مدل‌ها متفاوت است)."""
    related = getattr(obj, field, None)
    if related is None:
        return ''
    for attr in attrs:
        value = getattr(related, attr, None)
        if value:
            return str(value)
    return ''


def _display(obj, attr):
    """متن نمایشی یک فیلد دارای choices (get_<attr>_display)."""
    if obj is None:
        return ''
    getter = getattr(obj, f'get_{attr}_display', None)
    if callable(getter):
        try:
            return getter()
        except Exception:  # noqa: BLE001
            return ''
    return ''


def _attr(obj, name):
    """مقدار یک فیلد به‌صورت متن (نبود فیلد هم مشکلی ایجاد نمی‌کند)."""
    return _text(getattr(obj, name, ''))


def _party_name(contract):
    return _related_name(contract, 'party', 'name')


def _type_label(contract):
    return _related_name(contract, 'contract_type_master', 'name') or _display(contract, 'contract_type')


def _project_label(project_id):
    """نام یک پروژه با شناسهٔ عددی (ایمن در برابر نبود جدول پروژه)."""
    if not project_id:
        return ''
    try:
        from projects.models import Project
        name = Project.objects.filter(id=project_id).values_list('name', flat=True).first()
        return name or f'#{project_id}'
    except Exception:  # noqa: BLE001
        return f'#{project_id}'


def _attr_list(contract, field):
    """فهرست JSON یک قرارداد (همیشه list برگردانده می‌شود)."""
    value = getattr(contract, field, None)
    return value if isinstance(value, list) else []


def _related_list(contract, field):
    """فهرست آیتم‌های یک رابطه (اگر در دسترس نباشد، فهرست خالی)."""
    fetcher = getattr(getattr(contract, field, None), 'all', None)
    if not callable(fetcher):
        return []
    try:
        return list(fetcher())
    except Exception:  # noqa: BLE001
        return []


def _related_count(contract, field):
    """تعداد اسناد/روابط مرتبط (اگر در دسترس نباشد، رشتهٔ خالی)."""
    counter = getattr(getattr(contract, field, None), 'count', None)
    if not callable(counter):
        return ''
    try:
        return counter()
    except Exception:  # noqa: BLE001
        return ''


def _project_names(contract):
    """نام پروژه‌های تخصیص‌یافته (از project_allocations یا پروژهٔ منفرد)."""
    allocations = _attr_list(contract, 'project_allocations')
    ids = [item.get('project') for item in allocations if isinstance(item, dict) and item.get('project')]
    if getattr(contract, 'project_id', None) and not ids:
        ids.append(contract.project_id)
    if not ids:
        return ''
    return '، '.join(_project_label(i) for i in ids)


def _join(label, value):
    """ساخت بخشی از ستون «جزئیات ردیف»."""
    text = _text(value)
    return f'{label}: {text}' if text else ''


def _details(*parts):
    return '؛ '.join(p for p in parts if p)


def _party_type(contract):
    party = getattr(contract, 'party', None)
    if party is None or not getattr(contract, 'party_id', None):
        return ''
    return _display(party, 'person_type')


def _contract_bundle(contract):
    """آیتم‌های درون یک قرارداد + جمع‌های مالی آن."""
    invoices = _related_list(contract, 'invoices')
    statements = _related_list(contract, 'statements')
    payments = _related_list(contract, 'payments')
    guarantees = _related_list(contract, 'guarantees')
    addendums = _related_list(contract, 'addendums')
    disputes = _related_list(contract, 'disputes')
    return {
        'invoices': invoices,
        'statements': statements,
        'payments': payments,
        'guarantees': guarantees,
        'addendums': addendums,
        'disputes': disputes,
        'invoice_total': sum(float(getattr(i, 'total', None) or getattr(i, 'amount', None) or 0) for i in invoices),
        'statement_total': sum(float(getattr(s, 'net_amount', None) or getattr(s, 'amount', None) or 0) for s in statements),
        'payment_total': sum(float(getattr(p, 'amount', None) or 0) for p in payments),
        'guarantee_total': sum(float(getattr(g, 'amount', None) or 0) for g in guarantees),
    }


# ----------------------------------------------------------------------------
# ستون‌های کاربرگ واحد (تک‌شیت)
# ----------------------------------------------------------------------------
ROW_TYPES = {
    'contract': 'قرارداد',
    'invoice': 'فاکتور',
    'statement': 'صورت‌وضعیت',
    'statement_addition': 'اضافهٔ صورت‌وضعیت',
    'statement_deduction': 'کسور صورت‌وضعیت',
    'payment': 'پرداخت',
    'guarantee': 'تضمین',
    'addendum': 'الحاقیه',
    'addendum_provision': 'مفاد الحاقیه',
    'project_allocation': 'تخصیص پروژه',
    'advance_payment': 'پیش‌پرداخت مرحله‌ای',
    'guarantee_item': 'قلم ضمانت قرارداد',
    'dispute': 'اختلاف',
}

HEADERS = [
    'ردیف', 'نوع ردیف', 'شماره قرارداد', 'موضوع قرارداد', 'طرف قرارداد', 'نوع شخص طرف',
    'نوع قرارداد', 'طبقه‌بندی', 'وضعیت',
    'مبلغ', 'ارز',
    'تاریخ', 'تاریخ دوم (پایان/سررسید/انقضا)', 'تاریخ امضا',
    'امضاکننده', 'پیش‌پرداخت', 'درصد حسن انجام کار', 'دوره گارانتی',
    'مبلغ تضمین', 'نوع ضمانت',
    'پروژه‌ها', 'نام پروژه / طرح', 'محل اجرا / تحویل', 'شماره مناقصه / استعلام',
    'شماره / کد آیتم', 'عنوان / شرح آیتم', 'مبلغ آیتم', 'مالیات / ارزش افزوده',
    'مبلغ کل / قابل پرداخت', 'درصد', 'مرجع / ارتباط', 'وضعیت آیتم', 'توضیحات آیتم',
    'جزئیات ردیف',
    'تعداد و جمع آیتم‌ها', 'جمع فاکتورها', 'جمع صورت‌وضعیت‌ها (قابل پرداخت)',
    'جمع پرداخت‌ها', 'مانده پرداخت‌نشده', 'درصد پرداخت‌شده',
    'شرایط و نحوه پرداخت', 'شرایط تحویل', 'وجه التزام / جریمه تأخیر', 'شرایط بیمه',
    'توضیحات قرارداد', 'تلفن طرف', 'ایمیل طرف', 'تاریخ ایجاد', 'آخرین به‌روزرسانی',
]


def _sheet(workbook):
    """ساخت کاربرگ یگانه (راست‌به‌چپ، سرستون قالب‌بندی‌شده، ردیف هدر ثابت)."""
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter

    ws = workbook.active
    ws.title = 'قراردادها'
    ws.sheet_view.rightToLeft = True
    ws.append(HEADERS)

    header_font = Font(bold=True, color='FFFFFF', size=11)
    header_fill = PatternFill('solid', fgColor='B45309')
    center = Alignment(horizontal='center', vertical='center', wrap_text=True)
    for index, header in enumerate(HEADERS, start=1):
        cell = ws.cell(row=1, column=index)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center
        ws.column_dimensions[get_column_letter(index)].width = max(12, min(40, len(str(header)) + 6))
    ws.freeze_panes = 'A2'
    return ws


def _blank_row():
    return [''] * len(HEADERS)


def _append_row(ws, values):
    from openpyxl.styles import Alignment

    row = _blank_row()
    for index, value in enumerate(values):
        if index < len(row):
            row[index] = value
    ws.append(row)
    ws.cell(row=ws.max_row, column=1).alignment = Alignment(horizontal='center', vertical='center')
    return ws.max_row


def _day_of(value):
    """تاریخ (بدون ساعت) از یک تاریخ/تاریخ‌زمان."""
    return getattr(value, 'date', lambda: None)() if value is not None else None


def _created_day(contract):
    return _day_of(getattr(contract, 'created_at', None))


def _updated_day(contract):
    return _day_of(getattr(contract, 'updated_at', None))


def _contract_currency(contract):
    return _related_name(contract, 'currency', 'name', 'code') or 'ریال'


def _contract_row(index, contract):
    """ردیف کامل یک قرارداد (با تمام اقلام کلیدی و مفاد آن)."""
    bundle = _contract_bundle(contract)
    amount = float(getattr(contract, 'amount', None) or 0)
    balance = amount - bundle['payment_total']
    paid_percent = round(bundle['payment_total'] / amount * 100, 1) if amount else ''
    addendums = bundle['addendums']
    provisions = sum(len(getattr(a, 'provisions', None) or []) for a in addendums)
    allocations = _attr_list(contract, 'project_allocations')
    advances = _attr_list(contract, 'advance_payments')
    guarantee_items = _attr_list(contract, 'guarantee_items')
    summary = (
        f"فاکتور: {len(bundle['invoices'])}، صورت‌وضعیت: {len(bundle['statements'])}، "
        f"پرداخت: {len(bundle['payments'])}، تضمین: {len(bundle['guarantees'])}، "
        f"الحاقیه: {len(addendums)} (بند: {provisions})، اختلاف: {len(bundle['disputes'])}، "
        f"تخصیص پروژه: {len(allocations)}، پیش‌پرداخت مرحله‌ای: {len(advances)}، "
        f"قلم ضمانت: {len(guarantee_items)}"
    )
    return [
        index, ROW_TYPES['contract'], _attr(contract, 'number'), _attr(contract, 'subject'),
        _party_name(contract), _party_type(contract),
        _type_label(contract), _attr(contract, 'category'), _display(contract, 'status'),
        _num(getattr(contract, 'amount', None)), _contract_currency(contract),
        _fa_date(getattr(contract, 'start_date', None)), _fa_date(getattr(contract, 'end_date', None)),
        _fa_date(getattr(contract, 'signing_date', None)),
        _related_name(contract, 'signatory', 'full_name', 'name'),
        _num(getattr(contract, 'advance_payment', None)), _num(getattr(contract, 'retention_percent', None)),
        _attr(contract, 'warranty_period'), _num(getattr(contract, 'guarantee_amount', None)),
        _display(contract, 'guarantee_type'),
        _project_names(contract), _attr(contract, 'project_name'), _attr(contract, 'project_location'),
        _attr(contract, 'tender_number'),
        '', '', '', '', '', '', '', '', '',
        _details(
            _join('پیش‌پرداخت‌های مرحله‌ای', len(advances)),
            _join('اقلام ضمانت قرارداد', len(guarantee_items)),
            _join('جمع تغییر مبلغ الحاقیه‌ها', sum(float(getattr(a, 'amount_change', None) or 0) for a in addendums) or ''),
            _join('تعداد اسناد پیوست', _related_count(contract, 'documents')),
        ),
        summary,
        _num(bundle['invoice_total']), _num(bundle['statement_total']), _num(bundle['payment_total']),
        _num(balance), paid_percent,
        _attr(contract, 'payment_terms'), _attr(contract, 'delivery_terms'), _attr(contract, 'penalty_terms'),
        _attr(contract, 'insurance_terms'), _attr(contract, 'description'),
        _related_name(contract, 'party', 'phone', 'mobile'), _related_name(contract, 'party', 'email'),
        _fa_date(_created_day(contract)), _fa_date(_updated_day(contract)),
    ]



def _item_row(kind, contract, item_no='', item_title='', date=None, date2=None,
              item_amount='', item_vat='', item_total='', percent='', reference='',
              item_status='', item_note='', details=''):
    """ساخت ردیف یک آیتم با ستون‌های مشترک (بخش قرارداد برای زمینه پر می‌شود)."""
    return [
        '', ROW_TYPES.get(kind, kind), _attr(contract, 'number'), _attr(contract, 'subject'),
        _party_name(contract), _party_type(contract),
        _type_label(contract), _attr(contract, 'category'), _display(contract, 'status'),
        _num(getattr(contract, 'amount', None)), _contract_currency(contract),
        _fa_date(date), _fa_date(date2), '',
        '', '', '', '', '', '',
        '', '', '', '',
        _text(item_no), _text(item_title),
        _num(item_amount), _num(item_vat), _num(item_total),
        _num(percent), _text(reference), _text(item_status),
        _text(item_note), _text(details),
        '', '', '', '', '', '',
        '', '', '', '', '',
        '', '', '', '',
    ]


def _sort_key(obj):
    """کلید مرتب‌سازی ایمن بر اساس اولین تاریخ موجود (بدون پرس‌وجوی اضافه)."""
    day = (getattr(obj, 'date', None) or getattr(obj, 'issue_date', None)
           or getattr(obj, 'opened_date', None))
    return (str(day or ''), getattr(obj, 'id', 0) or 0)


def _item_rows(contract):
    """ردیف‌های همهٔ آیتم‌های درون یک قرارداد (با ترتیب منطقی سند)."""
    rows = []
    invoices = sorted(_related_list(contract, 'invoices'), key=_sort_key)
    payments = sorted(_related_list(contract, 'payments'), key=_sort_key)
    statements = sorted(_related_list(contract, 'statements'), key=_sort_key)
    invoice_numbers = {getattr(i, 'id', None): getattr(i, 'number', '') for i in invoices}
    statement_numbers = {getattr(s, 'id', None): getattr(s, 'number', '') for s in statements}
    payments_by_invoice, payments_by_statement = {}, {}
    for payment in payments:
        invoice_id = getattr(payment, 'invoice_id', None)
        statement_id = getattr(payment, 'statement_id', None)
        if invoice_id:
            payments_by_invoice.setdefault(invoice_id, []).append(payment)
        if statement_id:
            payments_by_statement.setdefault(statement_id, []).append(payment)

    for invoice in invoices:
        linked = payments_by_invoice.get(getattr(invoice, 'id', None), [])
        rows.append(_item_row(
            'invoice', contract,
            item_no=_attr(invoice, 'number'), item_title=_attr(invoice, 'subject') or 'فاکتور',
            date=getattr(invoice, 'date', None), date2=getattr(invoice, 'due_date', None),
            item_amount=getattr(invoice, 'amount', None), item_vat=getattr(invoice, 'vat', None),
            item_total=getattr(invoice, 'total', None),
            reference=f"{len(linked)} پرداخت / {sum(float(getattr(p, 'amount', None) or 0) for p in linked):,.0f}",
            item_status='پرداخت‌شده' if getattr(invoice, 'is_paid', False) else 'پرداخت‌نشده',
            item_note=_attr(invoice, 'description'),
        ))
    for statement in statements:
        rows.append(_item_row(
            'statement', contract,
            item_no=_attr(statement, 'number'), item_title='صورت‌وضعیت',
            date=getattr(statement, 'date', None),
            item_amount=getattr(statement, 'amount', None),
            item_vat=getattr(statement, 'value_added_tax', None),
            item_total=getattr(statement, 'net_amount', None),
            reference=f"تجمعی قبلی: {float(getattr(statement, 'cumulative_previous_amount', 0) or 0):,.0f}",
            item_status='تأییدشده' if getattr(statement, 'is_approved', False) else 'تأییدنشده',
            item_note=_attr(statement, 'description'),
            details=_details(
                _join('کارکرد دوره', f"{float(getattr(statement, 'work_done', 0) or 0):,.0f}"),
                _join('سایر اضافات', f"{float(getattr(statement, 'other_additions', 0) or 0):,.0f}"),
                _join('جمع اضافات', f"{float(getattr(statement, 'additions_total', 0) or 0):,.0f}"),
                _join('جمع کسورات', f"{float(getattr(statement, 'deductions_total', 0) or 0):,.0f}"),
                _join('نرخ ارز', getattr(statement, 'exchange_rate', None)),
            ),
        ))
        for item in (getattr(statement, 'additions', None) or []):
            if isinstance(item, dict):
                rows.append(_item_row(
                    'statement_addition', contract,
                    item_no=item.get('code') or _attr(statement, 'number'),
                    item_title=f"اضافه: {item.get('title') or item.get('description') or ''}".strip(),
                    date=getattr(statement, 'date', None), item_amount=item.get('amount'),
                    percent=item.get('percent'), reference=_attr(statement, 'number'),
                    item_note=item.get('note'),
                ))
        for item in (getattr(statement, 'deductions', None) or []):
            if isinstance(item, dict):
                rows.append(_item_row(
                    'statement_deduction', contract,
                    item_no=item.get('code') or _attr(statement, 'number'),
                    item_title=f"کسور: {item.get('title') or item.get('description') or ''}".strip(),
                    date=getattr(statement, 'date', None), item_amount=item.get('amount'),
                    percent=item.get('percent'), reference=_attr(statement, 'number'),
                    item_note=item.get('note'),
                ))
    for payment in payments:
        rows.append(_item_row(
            'payment', contract,
            item_no=_attr(payment, 'reference'), item_title='پرداخت',
            date=getattr(payment, 'date', None), item_amount=getattr(payment, 'amount', None),
            reference=_details(
                _join('روش', _attr(payment, 'method')),
                _join('فاکتور', invoice_numbers.get(getattr(payment, 'invoice_id', None), '')),
                _join('صورت‌وضعیت', statement_numbers.get(getattr(payment, 'statement_id', None), '')),
            ),
            item_note=_attr(payment, 'note'),
        ))
    for guarantee in sorted(_related_list(contract, 'guarantees'), key=_sort_key, reverse=True):
        rows.append(_item_row(
            'guarantee', contract,
            item_no=_attr(guarantee, 'number'),
            item_title=_details(
                _display(guarantee, 'guarantee_type'), _display(guarantee, 'instrument_type'),
            ),
            date=getattr(guarantee, 'issue_date', None), date2=getattr(guarantee, 'expiry_date', None),
            item_amount=getattr(guarantee, 'amount', None),
            reference=_join('بانک', _attr(guarantee, 'bank')),
            item_status=_details(
                'آزادشده' if getattr(guarantee, 'is_released', False) else 'آزاد نشده',
                _join('آخرین اقدام', _display(guarantee, 'last_action')),
            ),
            details=_details(
                _join('شماره چک', _attr(guarantee, 'check_number')),
                _join('بانک چک', _attr(guarantee, 'check_bank')),
                _join('سررسید چک', _fa_date(getattr(guarantee, 'check_due_date', None))),
                _join('شماره سفته', _attr(guarantee, 'promissory_number')),
                _join('سررسید سفته', _fa_date(getattr(guarantee, 'promissory_due_date', None))),
                _join('شماره ضمانت‌نامه', _attr(guarantee, 'guarantee_number')),
                _join('انقضای ضمانت‌نامه', _fa_date(getattr(guarantee, 'guarantee_expiry_date', None))),
                _join('تاریخ آزادسازی', _fa_date(getattr(guarantee, 'release_date', None))),
                _join('تاریخ آخرین اقدام', _fa_date(getattr(guarantee, 'last_action_date', None))),
            ),
            item_note=_attr(guarantee, 'note'),
        ))
    for addendum in sorted(_related_list(contract, 'addendums'), key=_sort_key):
        provisions = getattr(addendum, 'provisions', None) or []
        rows.append(_item_row(
            'addendum', contract,
            item_no=_attr(addendum, 'number'), item_title=_attr(addendum, 'subject') or 'الحاقیه',
            date=getattr(addendum, 'date', None), date2=getattr(addendum, 'new_end_date', None),
            item_amount=getattr(addendum, 'amount_change', None),
            percent=getattr(addendum, 'percent_change', None),
            item_note=_attr(addendum, 'change_description'),
            details=_join('تعداد مفاد', len(provisions)),
        ))
        for position, provision in enumerate(provisions, start=1):
            if isinstance(provision, dict):
                rows.append(_item_row(
                    'addendum_provision', contract,
                    item_no=f'{_attr(addendum, "number")} / بند {position}',
                    item_title=provision.get('title'), date=getattr(addendum, 'date', None),
                    item_note=provision.get('text'),
                ))
    for item in _attr_list(contract, 'project_allocations'):
        if isinstance(item, dict):
            project_id = item.get('project')
            rows.append(_item_row(
                'project_allocation', contract,
                item_no=project_id,
                item_title=f"تخصیص پروژه: {_project_label(project_id)}",
                percent=item.get('percentage'),
            ))
    for item in _attr_list(contract, 'advance_payments'):
        if isinstance(item, dict):
            rows.append(_item_row(
                'advance_payment', contract,
                item_title=f"پیش‌پرداخت: {item.get('step') or ''}".strip(),
                date2=item.get('due_date'), item_amount=item.get('amount'),
                item_note=item.get('note'),
            ))
    for item in _attr_list(contract, 'guarantee_items'):
        if isinstance(item, dict):
            rows.append(_item_row(
                'guarantee_item', contract,
                item_title=f"قلم ضمانت: {item.get('type') or ''}".strip(),
                item_amount=item.get('amount'), percent=item.get('percent'),
                item_note=item.get('note'),
            ))
    for dispute in sorted(_related_list(contract, 'disputes'), key=_sort_key, reverse=True):
        rows.append(_item_row(
            'dispute', contract,
            item_title=_attr(dispute, 'title'),
            date=getattr(dispute, 'opened_date', None),
            date2=getattr(dispute, 'resolved_date', None),
            item_amount=getattr(dispute, 'claim_amount', None),
            reference=_display(dispute, 'dispute_type'),
            item_status=_details(_display(dispute, 'status'), _join('شدت', _display(dispute, 'severity'))),
            item_note=_attr(dispute, 'description'),
            details=_join('اقدام/نتیجه', _attr(dispute, 'resolution')),
        ))
    return rows



# ----------------------------------------------------------------------------
# ساخت کارپوشه با یک کاربرگ
# ----------------------------------------------------------------------------
MONEY_COLUMNS = (10, 16, 19, 27, 28, 29, 36, 37, 38, 39)
PERCENT_COLUMNS = (17, 30, 40)


def _format_columns(ws):
    """قالب اعداد (مبالغ/درصد) و فعال‌کردن فیلتر سرستون."""
    from openpyxl.utils import get_column_letter

    for column in MONEY_COLUMNS:
        for cell in ws[get_column_letter(column)][1:]:
            if isinstance(cell.value, (int, float)):
                cell.number_format = '#,##0'
    for column in PERCENT_COLUMNS:
        for cell in ws[get_column_letter(column)][1:]:
            if isinstance(cell.value, (int, float)):
                cell.number_format = '0.0#'
    ws.auto_filter.ref = f'A1:{get_column_letter(len(HEADERS))}{max(ws.max_row, 1)}'


def build_contracts_workbook(contracts, **_options):
    """کارپوشهٔ تک‌شیتی قراردادها.

    ردیف «قرارداد» و بلافاصله همهٔ ردیف‌های آیتم‌های همان قرارداد در یک کاربرگ
    «قراردادها» نوشته می‌شوند؛ ستون «نوع ردیف» برای فیلتر/گروه‌بندی در اکسل است.
    """
    from openpyxl import Workbook

    workbook = Workbook()
    ws = _sheet(workbook)

    for index, contract in enumerate(contracts, start=1):
        _append_row(ws, _contract_row(index, contract))
        for row in _item_rows(contract):
            _append_row(ws, row)

    _format_columns(ws)
    return workbook

