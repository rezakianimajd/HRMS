"""کنترل‌های عملیاتی خزانه (§39 سند توسعه).

هدف: جلوگیری از خطاهای پرهزینه پیش از ثبت سند — نه بعد از آن.
توابع «تصمیم» خالص هستند (بدون دیتابیس) تا قابل تست و بازاستفاده در
serializer/سرویس باشند؛ توابعی که دیتابیس لازم دارند در انتها آمده‌اند.
"""
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError


class TreasuryGuardError(ValidationError):
    """خطای قاعدهٔ خزانه با پیام فارسی قابل نمایش در فرم."""


def _to_decimal(value):
    try:
        return Decimal(str(value if value is not None else 0).replace(',', ''))
    except (InvalidOperation, ValueError):
        raise TreasuryGuardError('مبلغ معتبر نیست.')


def ensure_amount(amount, label='مبلغ'):
    """مبلغ باید بزرگ‌تر از صفر باشد."""
    value = _to_decimal(amount)
    if value <= 0:
        raise TreasuryGuardError(f'{label} باید بزرگ‌تر از صفر باشد.')
    return value


def ensure_party(*names, label='ذی‌نفع'):
    """حداقل یکی از نام/طرف حساب باید پر باشد."""
    if not any(str(name or '').strip() for name in names):
        raise TreasuryGuardError(f'انتخاب {label} الزامی است.')
    return True


def ensure_currency(currency, exchange_rate=1, base_currency='IRR'):
    """ارز خارجی باید نرخ تبدیل معتبر داشته باشد و ریال نرخ ۱ داشته باشد."""
    exchange = _to_decimal(exchange_rate)
    if (currency or base_currency) != base_currency and exchange <= 0:
        raise TreasuryGuardError('برای ارز خارجی، نرخ تبدیل معتبر وارد کنید.')
    return exchange


def ensure_entity_direction(entity, direction):
    """نهاد پولی فعال و مجاز برای این جهت باشد."""
    labels = {'receipt': 'دریافت', 'payment': 'پرداخت', 'transfer': 'انتقال'}
    if entity is None:
        raise TreasuryGuardError('بانک/صندوق را انتخاب کنید.')
    if getattr(entity, 'is_active', True) is False:
        raise TreasuryGuardError('این بانک/صندوق غیرفعال است.')
    flag = {
        'receipt': 'allow_receipt',
        'payment': 'allow_payment',
        'transfer': 'allow_transfer',
    }.get(direction)
    if flag and hasattr(entity, flag) and getattr(entity, flag) is False:
        raise TreasuryGuardError(f'این حساب برای «{labels.get(direction, direction)}» مجاز نیست.')
    return True


def balance_decision(balance, amount, policy='block', min_balance=0):
    """سیاست ماندهٔ منفی صندوق/حساب (بدون دیتابیس).

    خروجی: ``{'blocked': bool, 'warn': bool, 'policy': str, 'available': Decimal}``
    - ``block``   : پرداخت بیش از موجودی ممنوع است
    - ``warn``    : مجاز ولی باید هشدار داده شود
    - ``approve`` : فقط با مجوز/تأیید اضافی
    """
    available = _to_decimal(balance) - _to_decimal(min_balance)
    amount_value = _to_decimal(amount)
    shortfall = amount_value > available
    return {
        'blocked': bool(shortfall and policy == 'block'),
        'warn': bool(shortfall and policy in ('warn', 'approve')),
        'policy': policy or 'block',
        'available': available,
        'shortfall': (amount_value - available) if shortfall else Decimal('0'),
    }


def ensure_balance(entity, amount, direction='payment'):
    """اعمال سیاست مانده روی یک نهاد (نیازمند ``entity.balance``)."""
    if direction != 'payment':
        return {'blocked': False, 'warn': False, 'policy': 'receipt'}
    decision = balance_decision(
        getattr(entity, 'balance', 0),
        amount,
        policy=getattr(entity, 'negative_balance_policy', 'block'),
        min_balance=getattr(entity, 'min_balance', 0) or 0,
    )
    if decision['blocked']:
        raise TreasuryGuardError(
            'موجودی این صندوق/حساب برای این پرداخت کافی نیست '
            f'(قابل استفاده: {decision["available"]:,}).',
        )
    return decision


def ensure_payment_limit(entity, amount):
    """سقف هر پرداخت روی نهاد (در صورت تعریف)."""
    limit = getattr(entity, 'payment_limit', None)
    if limit is None or limit == '':
        return True
    if _to_decimal(amount) > _to_decimal(limit):
        raise TreasuryGuardError(f'مبلغ از سقف پرداخت این حساب بیشتر است ({limit:,}).')
    return True


def ensure_unique_reference(company, model, reference, field='reference_no', exclude_id=None):
    """شماره پیگیری تکراری در همان سند ممنوع است."""
    ref = str(reference or '').strip()
    if not ref or company is None:
        return True
    queryset = model.objects.filter(company=company, **{field: ref})
    if exclude_id:
        queryset = queryset.exclude(pk=exclude_id)
    if queryset.exists():
        raise TreasuryGuardError('این شماره پیگیری قبلاً در سامانه ثبت شده است.')
    return True


def ensure_unique_check_number(company, model, number, exclude_id=None):
    """شمارهٔ چک تکراری (برای همان مدل/شرکت) ممنوع است."""
    value = str(number or '').strip()
    if not value or company is None:
        return True
    queryset = model.objects.filter(company=company, number=value)
    if exclude_id:
        queryset = queryset.exclude(pk=exclude_id)
    if queryset.exists():
        raise TreasuryGuardError('این شماره چک قبلاً ثبت شده است.')
    return True
