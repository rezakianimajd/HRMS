"""کدینگ استاندارد حسابداری.

این ماژول منطق «پیشنهاد کد بعدی» بر اساس تنظیمات CodingConfig را پیاده می‌کند.
هر سطح کدینگ (نوع حساب، گروه، کل، معین، تفصیلی، مرکز هزینه) یک بازهٔ عددی
تعریف‌شده دارد؛ برنامه اولین کد آزاد داخل همان بازه را پیشنهاد می‌دهد.
"""
from accounting.models import (
    AccountType, AccountGroup, Account, AuxiliaryAccount, CostCenter,
    CodingConfig,
)


def _existing_codes(company, level):
    """کدهای استفاده‌شدهٔ یک سطح کدینگ خاص."""
    if level == 'account_type':
        qs = AccountType.objects.filter(company=company)
    elif level == 'group':
        qs = AccountGroup.objects.filter(company=company)
    elif level == 'general':
        qs = Account.objects.filter(company=company, parent__isnull=True)
    elif level == 'subsidiary':
        qs = Account.objects.filter(company=company, parent__isnull=False)
    elif level == 'auxiliary':
        qs = AuxiliaryAccount.objects.filter(company=company)
    elif level == 'cost_center':
        qs = CostCenter.objects.filter(company=company)
    else:
        return set()
    return set(qs.values_list('code', flat=True))


def suggest_code(company, level):
    """اولین کد آزاد در بازهٔ تعریف‌شده برای یک سطح کدینگ.

    کد به صورت `prefix + number` ساخته می‌شود و number به `min_length` ارقام
    چپ‌چین (zero-padded) می‌شود؛ مگر اینکه طول نهایی از `max_length` عبور کند
    که در آن حالت padding حذف می‌شود.
    """
    if not company:
        return None
    cfg = CodingConfig.objects.filter(company=company, level=level, is_active=True).first()
    if not cfg:
        return None

    used = _existing_codes(company, level)
    for n in range(cfg.start_number, cfg.end_number + 1):
        digits = str(n).zfill(cfg.min_length)
        code = f'{cfg.prefix}{digits}'
        if len(code) > cfg.max_length:
            code = f'{cfg.prefix}{n}'
        if code not in used:
            return code
    return None


def validate_code(company, level, code):
    """بررسی اینکه کد واردشده در بازهٔ تعریف‌شده باشد (از نظر طول)."""
    if not company or not code:
        return True
    cfg = CodingConfig.objects.filter(company=company, level=level, is_active=True).first()
    if not cfg:
        return True
    return cfg.min_length <= len(code) <= cfg.max_length