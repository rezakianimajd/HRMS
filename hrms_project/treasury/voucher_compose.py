"""ساخت سند خزانه از روی «فرم + پیش‌نمایش چاپ».

جریان کاری: کاربر در دیالوگ «صدور سند» نوع سند (فیش دریافت / حواله پرداخت / رسید انتقال)
را انتخاب می‌کند، فیلدها را پر می‌کند و همان لحظه پیش‌نمایش قالب چاپ (با تاریخ شمسی،
مبلغ به حروف، بارکد و جای‌نگهدارهای قالب) را می‌بیند؛ سپس سند را ثبت می‌کند.

این ماژول **خالص** است (بدون ORM) تا بدون دیتابیس هم قابل تست باشد:
- ``to_decimal`` / ``currency_unit`` / ``parse_date``
- ``preview_verification`` (کد/بارکد پیش‌نمایش)
- ``build_preview_payload`` (دیکشنری جای‌نگهدارها)
- ``compose_html`` (رندر قالب)
عملیات دیتابیس در ``treasury/voucher_compose_views.py`` است.
"""
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from django.utils import timezone

from treasury.amount_words import amount_in_words
from treasury.barcode import barcode_svg
from treasury.print_templates import build_context, render_template
from treasury.vouchers import VOUCHER_TITLES, jalali_label

DOC_KINDS = ('receipt', 'payment', 'transfer')

PREVIEW_NOTE = 'پیش‌نمایش — این سند هنوز ثبت نشده و فاقد اعتبار است.'

SIGNATURES = {
    'receipt': [
        {'label': 'دریافت‌کننده', 'name': ''},
        {'label': 'خزانه‌دار', 'name': ''},
        {'label': 'تأییدکننده', 'name': ''},
        {'label': 'مدیر مالی', 'name': ''},
    ],
    'payment': [
        {'label': 'تهیه‌کننده', 'name': ''},
        {'label': 'بررسی‌کننده', 'name': ''},
        {'label': 'تأییدکننده', 'name': ''},
        {'label': 'خزانه‌دار', 'name': ''},
    ],
    'transfer': [
        {'label': 'تحویل‌دهنده', 'name': ''},
        {'label': 'تحویل‌گیرنده', 'name': ''},
        {'label': 'خزانه‌دار', 'name': ''},
    ],
}

# روش‌های دریافت/پرداخت (هم‌راستا با Receipt.Method و TreasuryPaymentMethod)
METHOD_LABELS = {
    'cash': 'نقدی',
    'bank': 'واریز به حساب',
    'transfer': 'حواله بانکی',
    'internal_transfer': 'انتقال بانکی',
    'sheba': 'شبا / حواله بانکی',
    'cheque': 'چک',
    'guarantee_cheque': 'چک تضمینی',
    'card_to_card': 'کارت‌به‌کارت',
    'pos': 'کارت‌خوان',
    'bill': 'سند / برات',
    'draft': 'اسناد دریافتنی',
    'foreign_currency': 'ارزی',
    'other': 'سایر',
}


def to_decimal(value, default=Decimal('0')):
    """ورودی کاربر (عدد/رشته با جداکننده فارسی) → Decimal."""
    if value is None or value == '':
        return default
    if isinstance(value, Decimal):
        return value
    text = str(value).strip().replace(',', '').replace('،', '').replace(' ', '')
    digits = text.translate(str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'))
    try:
        return Decimal(digits)
    except (InvalidOperation, ValueError):
        return default


def currency_unit(currency):
    """واحد پول برای «مبلغ به حروف»."""
    code = (currency or 'IRR').upper()
    return 'ریال' if code == 'IRR' else code


def parse_date(value):
    """رشتهٔ ISO یا تاریخ → ``date`` (نامعتبر → None)."""
    if not value:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return datetime.strptime(str(value)[:10], '%Y-%m-%d').date()
    except (TypeError, ValueError):
        return None


def preview_verification(kind, number=''):
    """کد/بارکد پیش‌نمایش (بدون امضای HMAC؛ سند هنوز وجود ندارد)."""
    code = f'PREVIEW-{kind}-{number or "—"}'
    return {'code': code, 'token': '', 'url': '', 'barcode': barcode_svg(code)}


def method_label(data):
    """برچسب فارسی روش از کد یا متن آزاد."""
    raw = str(data.get('method') or '').strip()
    if not raw:
        return ''
    return METHOD_LABELS.get(raw, data.get('method_label') or raw)


def build_preview_payload(kind, data, company_brief=None, number='', account=None):
    """دیکشنری جای‌نگهدارهای قالب برای پیش‌نمایش (بدون دخالت در دیتابیس)."""
    data = data or {}
    amount = to_decimal(data.get('amount'))
    currency = data.get('currency') or 'IRR'
    document_date = parse_date(data.get('date')) or timezone.localdate()
    cheque_due = parse_date(data.get('cheque_due_date'))
    party_name = data.get('party') or ''
    return {
        'kind': kind,
        'title': VOUCHER_TITLES.get(kind, 'سند خزانه'),
        'company': company_brief or {},
        'number': number,
        'date': jalali_label(document_date),
        'time': data.get('time') or '',
        'status': data.get('status') or 'پیش‌نمایش',
        'received_from': data.get('received_from') or party_name,
        'beneficiary': data.get('beneficiary') or party_name,
        'request_number': data.get('request_number') or '',
        'amount': str(amount),
        'amount_words': amount_in_words(amount, unit=currency_unit(currency)),
        'currency': currency,
        'exchange_rate': str(to_decimal(data.get('exchange_rate'), Decimal('1'))),
        'purpose': data.get('purpose') or data.get('title') or '',
        'description': data.get('description') or '',
        'method': method_label(data),
        'instrument': {
            'reference_no': data.get('reference_no') or '',
            'tracking_no': data.get('tracking_no') or '',
            'bank_reference': data.get('bank_reference') or '',
            'terminal': data.get('terminal') or '',
            'cheque': data.get('cheque_number') or '',
        },
        'account': account or {},
        'project': data.get('project_name') or '',
        'contract': data.get('contract_title') or '',
        'accounting_document': data.get('accounting_document') or '',
        'transfer_type': data.get('transfer_type') or '',
        'company_national_id': data.get('company_national_id') or '',
        'customer_number': data.get('customer_number') or '',
        'cheque_due_date': jalali_label(cheque_due) if cheque_due else '',
        'from': data.get('from_account') or {},
        'to': data.get('to_account') or {},
        'fee': str(to_decimal(data.get('fee'))),
        'note': data.get('note') or '',
        'signatures': SIGNATURES.get(kind, SIGNATURES['receipt']),
        'verification': preview_verification(kind, number),
        'footer': PREVIEW_NOTE,
        'preview': True,
        'generated_at': timezone.now().isoformat(),
    }


def compose_html(payload, template=None):
    """رندر قالب چاپ (قالب نداشته باشد → قالب استاندارد)."""
    return render_template(template, build_context(payload))

