"""عملیات چرخهٔ عمر تضامین (چک، سفته، ضمانت‌نامه بانکی و تعهدی).

این ماژول منطق خالص «تقلیل مبلغ»، نگاشت فیلدهای شماره/انقضا بر اساس نوع ابزار
و برچسب اقدامات را نگه می‌دارد تا هم ویو و هم تست‌ها از یک منبع استفاده کنند.
"""
from decimal import Decimal, InvalidOperation

# فیلد اختصاصی شماره و انقضا برای هر ابزار تضمین
NUMBER_FIELD_BY_INSTRUMENT = {
    'check': 'check_number',
    'promissory': 'promissory_number',
    'bank_guarantee': 'guarantee_number',
    'undertaking_guarantee': 'guarantee_number',
    'check_and_guarantee': 'guarantee_number',
    'promissory_and_guarantee': 'guarantee_number',
}

EXPIRY_FIELD_BY_INSTRUMENT = {
    'check': 'check_due_date',
    'promissory': 'promissory_due_date',
    'bank_guarantee': 'guarantee_expiry_date',
    'undertaking_guarantee': 'guarantee_expiry_date',
    'check_and_guarantee': 'guarantee_expiry_date',
    'promissory_and_guarantee': 'guarantee_expiry_date',
}

# ابزارهایی که عملیات تمدید/تقلیل برای آن‌ها مجاز است
EXTENDABLE_INSTRUMENTS = ('bank_guarantee', 'undertaking_guarantee')
REDUCIBLE_INSTRUMENTS = ('bank_guarantee', 'undertaking_guarantee')

ACTION_LABELS = {
    'extended': 'تمدید',
    'reduced': 'تقلیل',
    'returned': 'استرداد',
    'released': 'آزادسازی',
    'executed': 'اجرا / ضبط',
    'canceled': 'ابطال',
    'number_changed': 'تغییر شماره',
}

# علت‌های آزادسازی تضمین (تسویه پیش‌پرداخت، اختتام قرارداد و…)
RELEASE_REASONS = {
    'advance_settled': 'تسویه پیش‌پرداخت',
    'contract_closed': 'اختتام قرارداد',
    'obligation_fulfilled': 'انجام کامل تعهدات',
    'warranty_expired': 'پایان دوره تضمین / نگهداری',
    'other': 'سایر',
}


def release_reason_label(value) -> str:
    return RELEASE_REASONS.get(str(value or '').strip(), '')


def compose_release_note(reason=None, note='') -> str:
    """متن توضیح آزادسازی از «علت» + یادداشت کاربر."""
    parts = []
    label = release_reason_label(reason)
    if label:
        parts.append(f'علت آزادسازی: {label}')
    if note and str(note).strip():
        parts.append(str(note).strip())
    return ' — '.join(parts)


class GuaranteeActionError(ValueError):
    """خطای اعتبارسنجی اقدام تضمین (پیام فارسی برای کلاینت)."""


def resolve_reduced_amount(current_amount, *, reduction_amount=None, new_amount=None) -> Decimal:
    """مبلغ جدید تضمین پس از تقلیل.

    ورودی می‌تواند «مبلغ تقلیل» یا «مبلغ جدید» باشد؛ خروجی همیشه مبلغ جدید
    (بزرگ‌تر یا مساوی صفر و کمتر از مبلغ فعلی) است.
    """
    try:
        current = Decimal(str(current_amount or 0))
    except (InvalidOperation, TypeError, ValueError) as error:
        raise GuaranteeActionError('مبلغ فعلی تضمین معتبر نیست.') from error

    try:
        if new_amount not in (None, ''):
            target = Decimal(str(new_amount))
        elif reduction_amount not in (None, ''):
            reduction = Decimal(str(reduction_amount))
            if reduction <= 0:
                raise GuaranteeActionError('مبلغ تقلیل باید بزرگ‌تر از صفر باشد.')
            target = current - reduction
        else:
            raise GuaranteeActionError('مبلغ تقلیل یا مبلغ جدید را وارد کنید.')
    except (InvalidOperation, TypeError, ValueError) as error:
        if isinstance(error, GuaranteeActionError):
            raise
        raise GuaranteeActionError('مبلغ تقلیل معتبر نیست.') from error

    if target < 0:
        raise GuaranteeActionError('مبلغ جدید نمی‌تواند منفی باشد.')
    if target >= current:
        raise GuaranteeActionError('مبلغ جدید باید کمتر از مبلغ فعلی تضمین باشد.')
    return target


def action_number_field(instrument_type) -> str:
    return NUMBER_FIELD_BY_INSTRUMENT.get(instrument_type, '')


def action_expiry_field(instrument_type) -> str:
    return EXPIRY_FIELD_BY_INSTRUMENT.get(instrument_type, '')


def supports_extension(instrument_type) -> bool:
    return instrument_type in EXTENDABLE_INSTRUMENTS


def supports_reduction(instrument_type) -> bool:
    return instrument_type in REDUCIBLE_INSTRUMENTS
