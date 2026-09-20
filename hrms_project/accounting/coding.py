"""کدینگ استاندارد حسابداری.

این ماژول منطق «پیشنهاد کد بعدی» بر اساس تنظیمات CodingConfig را پیاده می‌کند.
هر سطح کدینگ (نوع حساب، گروه، کل، معین، تفصیلی، مرکز هزینه) یک بازهٔ عددی
تعریف‌شده دارد؛ برنامه اولین کد آزاد داخل همان بازه را پیشنهاد می‌دهد.
"""
from accounting.models import (
    AccountType, AccountGroup, Account, AuxiliaryAccount, CostCenter,
    CodingConfig,
)

DEFAULT_CODING_CONFIGS = {
    'account_type': {'prefix': '', 'start_number': 1, 'end_number': 99, 'min_length': 1, 'max_length': 20},
    'group': {'prefix': '', 'start_number': 100, 'end_number': 999, 'min_length': 3, 'max_length': 20},
    'general': {'prefix': '', 'start_number': 1000, 'end_number': 9999, 'min_length': 4, 'max_length': 20},
    'subsidiary': {'prefix': '', 'start_number': 10000, 'end_number': 99999, 'min_length': 5, 'max_length': 20},
    'auxiliary': {'prefix': '', 'start_number': 100, 'end_number': 999, 'min_length': 3, 'max_length': 20},
    'cost_center': {'prefix': 'C', 'start_number': 1, 'end_number': 99, 'min_length': 2, 'max_length': 20},
}


def ensure_configs(company):
    """ساخت تنظیمات پیش‌فرض کدینگ در صورت نبود.*"""
    if not company:
        return
    for level, defaults in DEFAULT_CODING_CONFIGS.items():
        CodingConfig.objects.get_or_create(company=company, level=level, defaults=defaults)


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
    ensure_configs(company)
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