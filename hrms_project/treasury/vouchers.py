"""قالب دادهٔ چاپ فیش‌های خزانه و توکن اعتبارسنجی سند (QR).

- ``sign_voucher`` یک توکن امضاشده (HMAC) از «نوع + شناسه + شمارهٔ سند» می‌سازد
  که در QR فیش قرار می‌گیرد؛ با اسکن آن، صفحهٔ اعتبارسنجی فقط اطلاعات
  غیرمحرمانه (شماره، تاریخ، مبلغ، نوع، وضعیت) را نشان می‌دهد.
- ``build_*_voucher`` دادهٔ آمادهٔ چاپ (RTL/فارسی) را برای قالب فیش برمی‌گرداند؛
  همهٔ اعداد به حروف و تاریخ‌ها شمسی هستند.

هیچ راز یا کلید جدیدی لازم نیست؛ از ``SECRET_KEY`` و ``django.core.signing``
استفاده می‌شود (توکن جعل‌ناپذیر و قابل انقضا).
"""
from django.core import signing
from django.utils import timezone

from treasury.amount_words import amount_in_words
from treasury.barcode import barcode_svg

SALT = 'treasury.voucher'
TOKEN_MAX_AGE = 60 * 60 * 24 * 365 * 5  # ۵ سال

VOUCHER_TITLES = {
    'receipt': 'فیش دریافت وجه',
    'payment': 'فیش پرداخت وجه',
    'transfer': 'رسید انتقال وجه',
}

FOOTER_NOTE = 'این رسید صرفاً پس از ثبت و تأیید در سامانه معتبر است.'

try:  # تاریخ شمسی
    from jdatetime import date as _jdate
except Exception:  # noqa: BLE001
    _jdate = None

PERSIAN_DIGITS = str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹')


def jalali_label(value):
    """تاریخ میلادی/شمسی → «۱۴۰۵/۰۸/۱۲» (با اعداد فارسی)."""
    if not value:
        return ''
    if _jdate is None:
        return str(value)
    try:
        converted = _jdate.fromgregorian(date=value)
        return converted.strftime('%Y/%m/%d').translate(PERSIAN_DIGITS)
    except Exception:  # noqa: BLE001
        return str(value)


def _company_brief(company):
    return {
        'name': getattr(company, 'name', '') or '',
        'code': getattr(company, 'code', '') or '',
        'phone': getattr(company, 'phone', '') or '',
        'address': getattr(company, 'address', '') or '',
    }


def _verification_code(kind, obj):
    number = getattr(obj, 'number', '') or f'#{getattr(obj, "pk", "")}'
    return f'{kind.upper()}-{number}'


def sign_voucher(kind, obj):
    """توکن امضاشدهٔ سند برای QR/بارکد اعتبارسنجی."""
    payload = {
        'k': kind,
        'i': getattr(obj, 'pk', None),
        'n': getattr(obj, 'number', '') or '',
        'c': getattr(obj, 'company_id', None),
    }
    return signing.dumps(payload, salt=SALT, compress=True)


def verify_voucher(token, max_age=TOKEN_MAX_AGE):
    """بازخوانی توکن؛ در صورت دست‌کاری/انقضا استثنا می‌دهد."""
    return signing.loads(token, salt=SALT, max_age=max_age)


def build_verification(kind, obj, request=None, path='/treasury/verify'):
    token = sign_voucher(kind, obj)
    url = f'{path}?token={token}'
    if request is not None:
        try:
            url = request.build_absolute_uri(url)
        except Exception:  # noqa: BLE001
            pass
    code = _verification_code(kind, obj)
    return {
        'token': token,
        'code': code,
        'url': url,
        'barcode': barcode_svg(code),
    }


def _document_brief(kind, obj, request=None):
    verification = build_verification(kind, obj, request)
    return {
        'id': getattr(obj, 'pk', None),
        'kind': kind,
        'number': getattr(obj, 'number', '') or '',
        'status': getattr(obj, 'get_status_display', lambda: '')()
        if hasattr(obj, 'get_status_display') else '',
        'verification': verification,
        'footer': FOOTER_NOTE,
    }


def _entity_brief(entity):
    if entity is None:
        return {}
    bank = getattr(entity, 'bank', None)
    return {
        'code': getattr(entity, 'code', '') or '',
        'name': getattr(entity, 'name', '') or '',
        'kind': 'صندوق' if getattr(entity, 'is_cash', False) else 'بانک',
        'bank_name': getattr(bank, 'name', '') or '',
        'branch_name': getattr(entity, 'branch_name', '') or '',
        'branch_code': getattr(entity, 'branch_code', '') or '',
        'account_number': getattr(entity, 'account_number', '') or '',
        'sheba_number': getattr(entity, 'sheba_number', '') or '',
        'card_number': getattr(entity, 'card_number', '') or '',
        'currency': getattr(entity, 'currency', 'IRR') or 'IRR',
    }


def build_receipt_voucher(receipt, request=None):
    """دادهٔ چاپ «فیش دریافت وجه»."""
    company = getattr(receipt, 'company', None)
    entity = getattr(receipt, 'entity', None)
    party = getattr(receipt, 'party', None)
    method = getattr(receipt, 'payment_method', None)
    document = _document_brief('receipt', receipt, request)
    amount = getattr(receipt, 'amount', 0) or 0
    currency = getattr(receipt, 'currency', 'IRR') or 'IRR'
    unit = 'ریال' if currency == 'IRR' else currency
    return {
        'kind': 'receipt',
        'title': VOUCHER_TITLES['receipt'],
        'company': _company_brief(company),
        'number': document['number'],
        'date': jalali_label(getattr(receipt, 'received_date', None)
                             or getattr(receipt, 'expected_date', None)),
        'time': str(getattr(receipt, 'received_time', '') or ''),
        'status': document['status'],
        'received_from': getattr(receipt, 'received_from', '') or getattr(party, 'name', '') or '',
        'amount': str(amount),
        'amount_words': amount_in_words(amount, unit=unit),
        'currency': currency,
        'exchange_rate': str(getattr(receipt, 'exchange_rate', 1) or 1),
        'purpose': getattr(receipt, 'purpose', '') or '',
        'description': getattr(receipt, 'description', '') or '',
        'method': getattr(method, 'name', '') or (
            receipt.get_method_display() if hasattr(receipt, 'get_method_display') else ''
        ),
        'instrument': {
            'reference_no': getattr(receipt, 'reference_no', '') or '',
            'tracking_no': getattr(receipt, 'tracking_no', '') or '',
            'bank_reference': getattr(receipt, 'bank_reference', '') or '',
            'terminal': getattr(getattr(receipt, 'terminal', None), 'terminal_number', '') or '',
            'cheque': getattr(getattr(receipt, 'received_check', None), 'number', '') or '',
        },
        'account': _entity_brief(entity),
        'project': getattr(getattr(receipt, 'project', None), 'name', '') or '',
        'contract': getattr(getattr(receipt, 'contract', None), 'title', '') or '',
        'signatures': [
            {'label': 'دریافت‌کننده', 'name': ''},
            {'label': 'خزانه‌دار', 'name': ''},
            {'label': 'تأییدکننده', 'name': ''},
            {'label': 'مدیر مالی', 'name': ''},
        ],
        'verification': document['verification'],
        'footer': document['footer'],
        'generated_at': timezone.now().isoformat(),
    }



def build_payment_voucher(order, request=None):
    """دادهٔ چاپ «فیش پرداخت وجه» بر اساس دستور/درخواست پرداخت."""
    company = getattr(order, 'company', None)
    request_obj = getattr(order, 'request', None)
    entity = getattr(order, 'entity', None)
    party = getattr(request_obj, 'party', None)
    method = getattr(order, 'payment_method', None)
    document = _document_brief('payment', order, request)
    amount = getattr(order, 'amount', 0) or 0
    currency = getattr(order, 'currency', 'IRR') or 'IRR'
    unit = 'ریال' if currency == 'IRR' else currency
    return {
        'kind': 'payment',
        'title': VOUCHER_TITLES['payment'],
        'company': _company_brief(company),
        'number': document['number'],
        'date': jalali_label(getattr(order, 'execution_date', None) or timezone.localdate()),
        'status': document['status'],
        'beneficiary': getattr(party, 'name', '') or getattr(request_obj, 'title', '') or '',
        'request_number': getattr(request_obj, 'number', '') or '',
        'amount': str(amount),
        'amount_words': amount_in_words(amount, unit=unit),
        'currency': currency,
        'exchange_rate': str(getattr(order, 'exchange_rate', 1) or 1),
        'purpose': getattr(request_obj, 'title', '') or '',
        'description': getattr(request_obj, 'description', '') or '',
        'method': getattr(method, 'name', '')
        or getattr(order, 'get_instrument_display', lambda: '')(),
        'instrument': {
            'reference_no': getattr(order, 'reference', '') or '',
            'tracking_no': getattr(order, 'tracking_number', '') or '',
            'bank_reference': getattr(order, 'bank_reference', '') or '',
            'cheque': getattr(getattr(order, 'issued_check', None), 'number', '') or '',
        },
        'account': _entity_brief(entity),
        'project': getattr(getattr(request_obj, 'project', None), 'name', '') or '',
        'contract': getattr(getattr(request_obj, 'contract', None), 'title', '') or '',
        'accounting_document': getattr(
            getattr(order, 'accounting_document', None), 'number', '',
        ) or '',
        'signatures': [
            {'label': 'تهیه‌کننده', 'name': ''},
            {'label': 'بررسی‌کننده', 'name': ''},
            {'label': 'تأییدکننده', 'name': ''},
            {'label': 'خزانه‌دار', 'name': ''},
        ],
        'verification': document['verification'],
        'footer': document['footer'],
        'generated_at': timezone.now().isoformat(),
    }


def build_transfer_voucher(transfer, request=None):
    """دادهٔ چاپ «رسید انتقال بین حساب‌ها»."""
    document = _document_brief('transfer', transfer, request)
    amount = getattr(transfer, 'amount', 0) or 0
    return {
        'kind': 'transfer',
        'title': VOUCHER_TITLES['transfer'],
        'company': _company_brief(getattr(transfer, 'company', None)),
        'number': document['number'],
        'date': jalali_label(getattr(transfer, 'date', None)),
        'status': document['status'],
        'amount': str(amount),
        'amount_words': amount_in_words(amount),
        'description': getattr(transfer, 'description', '') or '',
        'from': _entity_brief(getattr(transfer, 'source', None)),
        'to': _entity_brief(getattr(transfer, 'destination', None)),
        'verification': document['verification'],
        'footer': document['footer'],
        'generated_at': timezone.now().isoformat(),
    }


def build_verification_payload(kind, obj):
    """اطلاعات غیرمحرمانه برای صفحهٔ اعتبارسنجی سند (§33)."""
    amount = getattr(obj, 'amount', 0) or 0
    date = (
        getattr(obj, 'received_date', None)
        or getattr(obj, 'execution_date', None)
        or getattr(obj, 'date', None)
        or getattr(obj, 'requested_date', None)
    )
    return {
        'kind': kind,
        'kind_label': VOUCHER_TITLES.get(kind, 'سند خزانه'),
        'number': getattr(obj, 'number', '') or '',
        'date': jalali_label(date),
        'amount': str(amount),
        'amount_words': amount_in_words(amount),
        'status': getattr(obj, 'get_status_display', lambda: '')(),
        'valid': True,
    }

def build_transaction_voucher(transaction, request=None):
    """دادهٔ چاپ «رسید/حوالهٔ تراکنش خزانه» (دفتر اسناد و پرداخت‌های مستقیم)."""
    kind = 'receipt' if getattr(transaction, 'direction', 'receipt') == 'receipt' else 'payment'
    document = _document_brief(kind, transaction, request)
    amount = getattr(transaction, 'amount', 0) or 0
    currency = getattr(transaction, 'currency', 'IRR') or 'IRR'
    unit = 'ریال' if currency == 'IRR' else currency
    party = getattr(transaction, 'party', '') or ''
    entity = getattr(transaction, 'entity', None)
    instrument_kind = getattr(transaction, 'instrument_kind', '') or ''
    instrument_choices = getattr(type(transaction), 'InstrumentKind', None)
    instrument_labels = dict(instrument_choices.choices) if instrument_choices else {}
    company = getattr(transaction, 'company', None)
    account = _entity_brief(entity)
    template_kind = kind
    if instrument_kind == 'sheba':
        template_kind = 'interbank'
    elif instrument_kind == 'cash':
        template_kind = 'cash'
    is_receipt = kind == 'receipt'
    return {
        'kind': kind,
        'template_kind': template_kind,
        'title': VOUCHER_TITLES[kind],
        'company': _company_brief(company),
        'company_national_id': getattr(company, 'code', '') or '',
        'number': document['number'],
        'date': jalali_label(getattr(transaction, 'date', None)),
        'status': document['status'],
        'received_from': party if is_receipt else '',
        'beneficiary': party if not is_receipt else '',
        'amount': str(amount),
        'amount_words': amount_in_words(amount, unit=unit),
        'currency': currency,
        'method': instrument_labels.get(instrument_kind, instrument_kind),
        'operation': 'دریافت نقدی' if is_receipt else 'پرداخت نقدی',
        'purpose': getattr(transaction, 'description', '') or '',
        'description': getattr(transaction, 'description', '') or '',
        'instrument': {
            'reference_no': getattr(transaction, 'reference_no', '') or '',
            'tracking_no': getattr(transaction, 'tracking_no', '') or '',
            'bank_reference': '',
            'terminal': '',
            'cheque': getattr(transaction, 'cheque_number', '') or '',
        },
        'cheque_number': getattr(transaction, 'cheque_number', '') or '',
        'cheque_due_date': jalali_label(getattr(transaction, 'cheque_due_date', None)),
        'account': account,
        'account_branch': account.get('branch_name', ''),
        'source_owner_name': _company_brief(company).get('name', ''),
        'source_national_id': getattr(company, 'code', '') or '',
        'bank_name': account.get('bank_name', ''),
        'transfer_type': 'بین‌بانکی',
        'fee': '0',
        'payer_name': _company_brief(company).get('name', '') if not is_receipt else party,
        'payer_account': account.get('account_number', '') if not is_receipt else '',
        'payer_national_id': getattr(company, 'code', '') or '' if not is_receipt else '',
        'receiver_name': party if not is_receipt else _company_brief(company).get('name', ''),
        'receiver_account': account.get('account_number', '') if is_receipt else '',
        'receiver_national_id': '',
        'destination_owner_name': getattr(transaction, 'destination_owner_name', '') or '',
        'destination_national_id': getattr(transaction, 'destination_national_id', '') or '',
        'destination_account_number': getattr(transaction, 'destination_account_number', '') or '',
        'destination_iban': getattr(transaction, 'destination_iban', '') or '',
        'destination_bank': getattr(transaction, 'destination_bank', '') or '',
        'project': '',
        'contract': '',
        'accounting_document': getattr(
            getattr(transaction, 'accounting_document', None), 'number', '',
        ) or '',
        'signatures': [
            {'label': 'دریافت‌کننده' if is_receipt else 'پرداخت‌کننده', 'name': ''},
            {'label': 'خزانه‌دار', 'name': ''},
            {'label': 'تأییدکننده', 'name': ''},
            {'label': 'مدیر مالی', 'name': ''},
        ],
        'verification': document['verification'],
        'footer': document['footer'],
        'generated_at': timezone.now().isoformat(),
    }


def post_transfer_documents(transfer, username=''):
    """ثبت «انتقال وجه»: ساخت جفت تراکنش پرداخت/دریافت + به‌روزرسانی وضعیت.

    منبع واحد این عملیات است؛ هم اکشن ``post_transfer`` و هم
    «صدور سند با پیش‌نمایش» از همین تابع استفاده می‌کنند.
    """
    from treasury.models import TreasuryTransaction

    description = getattr(transfer, 'description', '') or ''
    source_id = f'transfer-{transfer.pk}'
    TreasuryTransaction.objects.create(
        company=transfer.company, entity=transfer.source, direction='payment',
        amount=transfer.amount, date=transfer.date, description=description,
        status='posted', source_module='transfer', source_id=source_id,
    )
    TreasuryTransaction.objects.create(
        company=transfer.company, entity=transfer.destination, direction='receipt',
        amount=transfer.amount, date=transfer.date, description=description,
        status='posted', source_module='transfer', source_id=source_id,
    )
    previous = transfer.status
    transfer.status = 'posted'
    transfer.history = [
        *transfer.history,
        {'step': 'posted', 'by': username, 'at': timezone.now().isoformat()},
    ]
    transfer.save()
    return previous

