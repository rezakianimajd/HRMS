"""سند خزانه‌داری (فیش دریافت / حواله پرداخت / رسید انتقال) — سند سروری موتور چاپ.

داده از سازنده‌های موجود خزانه (`treasury.vouchers`) گرفته می‌شود تا یک منبع
حقیقت برای شماره/تاریخ/مبلغ به حروف/کد اعتبارسنجی وجود داشته باشد.
"""
from core.print_engine import components as pe
from core.print_engine.registry import PrintError, can_print

KIND_KINDS = ('receipt', 'payment', 'payment_order', 'transfer', 'transaction')


def _instrument_fields(data):
    instrument = data.get('instrument') or {}
    return [
        ('شماره مرجع', instrument.get('reference_no')),
        ('شماره پیگیری', instrument.get('tracking_no')),
        ('مرجع بانکی', instrument.get('bank_reference')),
        ('پایانهٔ کارت‌خوان', pe.fa_digits(instrument.get('terminal') or '')),
        ('شماره چک', instrument.get('cheque')),
        ('شماره شبا مقصد', data.get('destination_iban')),
        ('شماره حساب مقصد', data.get('destination_account_number')),
        ('نام گیرنده', data.get('destination_owner_name')),
        ('کد ملی گیرنده', pe.fa_digits(data.get('destination_national_id') or '')),
        ('بانک مقصد', data.get('destination_bank')),
        ('نوع انتقال', data.get('transfer_type')),
    ]


def voucher_document(data):
    """ساختار سند «فیش/حوالهٔ خزانه» از دادهٔ آماده (بدون دیتابیس)."""
    is_receipt = (data.get('kind') or 'receipt') == 'receipt'
    account = data.get('account') or {}
    verification = data.get('verification') or {}
    status = data.get('status') or ''
    party_label = 'دریافت از' if is_receipt else 'پرداخت به'
    party_value = data.get('received_from') or data.get('beneficiary') or ''

    basics = pe.field_grid([
        ('شماره سند', data.get('number')),
        ('تاریخ', data.get('date')),
        ('ساعت', pe.fa_digits(data.get('time') or '')),
        ('وضعیت', status),
        ('روش', data.get('method')),
        ('صندوق / حساب', account.get('name') if isinstance(account, dict) else account),
        ('شعبه / بانک', (account.get('bank_name') or account.get('bank')
                         or account.get('branch_name')) if isinstance(account, dict) else ''),
        ('شماره حساب', (account.get('account_number') or account.get('sheba_number'))
         if isinstance(account, dict) else ''),
    ])
    parties = pe.field_grid([
        (party_label, party_value),
        ('بابت', data.get('purpose')),
        ('پروژه', data.get('project')),
        ('قرارداد', data.get('contract')),
        ('شماره درخواست', data.get('request_number')),
    ])
    instrument_fields = [(label, value) for label, value in _instrument_fields(data) if value]

    sections = [
        {'title': 'مشخصات سند', 'html': basics},
        {'title': 'طرف حساب و بابت', 'html': parties},
    ]
    if instrument_fields:
        sections.append({'title': 'اطلاعات ابزار پرداخت', 'html': pe.field_grid(instrument_fields)})
    description = data.get('description') or ''
    if description:
        sections.append({
            'title': 'توضیحات',
            'html': f'<div class="pe-note" style="border-style:solid">{pe.esc(description)}</div>',
        })

    signatures = [
        {'title': (item.get('label') or item.get('title') or ''), 'name': item.get('name') or ''}
        for item in (data.get('signatures') or [])
    ]
    watermark = ''
    if status and status not in ('ثبت‌شده', 'پرداخت‌شده', 'posted', 'paid'):
        watermark = 'پیش‌نویس'

    return {
        'title': data.get('title') or 'سند خزانه‌داری',
        'subtitle': f'{party_label}: {party_value}' if party_value else '',
        'badge': status,
        'company': data.get('company') or {},
        'meta': [
            ('شماره', data.get('number')),
            ('تاریخ', data.get('date')),
        ],
        'sections': sections,
        'amount_box': {
            'words': data.get('amount_words') or pe.amount_words(data.get('amount')),
            'value': pe.money(data.get('amount'), unit='ریال'),
        },
        'note': data.get('footer') or '',
        'barcode': pe.barcode(verification.get('code') or data.get('number') or ''),
        'signatures': pe.signatures(signatures),
        'watermark': watermark,
        'footer_note': (verification.get('code') and f'کد اعتبارسنجی: {verification["code"]}') or '',
        'printed_on': data.get('printed_on'),
    }


def load_voucher(payload, options=None, request=None):
    """خواندن سند خزانه از دیتابیس و ساخت سند چاپی."""
    from treasury import vouchers as tv

    if not can_print(getattr(request, 'user', None), 'treasury'):
        raise PrintError('برای چاپ اسناد خزانه‌داری مجوز لازم را ندارید.', 403)

    kind = str(payload.get('kind') or 'receipt').strip()
    identifier = payload.get('id')
    company = getattr(request, 'tenant', None) or getattr(request, 'company', None)

    def _fetch(model_path, label):
        module_name, class_name = model_path.rsplit('.', 1)
        module = __import__(module_name, fromlist=[class_name])
        model = getattr(module, class_name)
        queryset = model.objects.all()
        if company and hasattr(model, 'company'):
            queryset = queryset.filter(company=company)
        obj = queryset.filter(pk=identifier).first()
        if not obj:
            raise PrintError(f'{label} یافت نشد.', 404)
        return obj

    if kind == 'receipt':
        data = tv.build_receipt_voucher(_fetch('treasury.operation_models.Receipt', 'فیش دریافت'), request)
    elif kind == 'payment_order':
        data = tv.build_payment_voucher(_fetch('treasury.payment_models.PaymentOrder', 'دستور پرداخت'), request)
    elif kind == 'transfer':
        data = tv.build_transfer_voucher(
            _fetch('treasury.operation_models.TreasuryTransfer', 'رسید انتقال'), request,
        )
    elif kind in ('transaction', 'payment'):
        data = tv.build_transaction_voucher(
            _fetch('treasury.models.TreasuryTransaction', 'سند خزانه'), request,
        )
    else:
        raise PrintError(f'نوع سند خزانه «{kind}» پشتیبانی نمی‌شود.', 400)

    data['printed_on'] = payload.get('printed_on')
    return voucher_document(data)
