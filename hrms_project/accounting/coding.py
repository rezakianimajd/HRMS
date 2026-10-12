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


def _padded_suffix(start, end, min_length, max_length, prefix):
    """اولین پسوند آزاد در بازه، با حفظ طول کل کد در محدودهٔ مجاز."""
    for n in range(start, end + 1):
        digits = str(n).zfill(min_length)
        code = f'{prefix}{digits}'
        if len(code) > max_length:
            code = f'{prefix}{n}'
        yield code


def suggest_code(company, level, parent_code=None):
    """اولین کد آزاد در بازهٔ تعریف‌شده برای یک سطح کدینگ.

    - عمومی: کد = پیشوند + شماره.
    - حساب معین (subsidiary): اگر `parent_code` (کد کل) داده شود، کد به‌صورت
      ترکیبی `parent_code + suffix` ساخته می‌شود تا سلسله‌مراتب کد برقرار باشد.
    - حساب تفصیلی (auxiliary) عمداً شناور می‌ماند: کد مستقل از معین تولید
      می‌شود (مطابق نیاز کاربر).
    """
    if not company:
        return None
    ensure_configs(company)
    cfg = CodingConfig.objects.filter(company=company, level=level, is_active=True).first()
    if not cfg:
        return None

    used = _existing_codes(company, level)

    if level == 'subsidiary' and parent_code:
        for code in _padded_suffix(cfg.start_number, cfg.end_number, cfg.min_length,
                                   cfg.max_length, str(parent_code)):
            if code not in used:
                return code
        return None

    for code in _padded_suffix(cfg.start_number, cfg.end_number, cfg.min_length,
                               cfg.max_length, cfg.prefix):
        if code not in used:
            return code
    return None


def resolve_inheritance(parent=None, group=None):
    """وراثت نوع حساب/ماهیت/گروه از والد (حساب بالادستی) یا گروه حساب.

    خروجی: ``(account_type, nature, source)`` که ``source`` یکی از
    ``parent`` / ``group`` / ``None`` است.
    """
    if parent is not None:
        return parent.account_type, parent.nature, 'parent'
    if group is not None:
        return group.account_type, group.nature, 'group'
    return None, None, None


def next_code(company, level, parent=None, group=None, account_type=None,
              parent_code=None, subclass=None):
    """پیشنهاد کد بعدی + اطلاعات وراثت — مبنای فرم‌های کدینگ.

    کد پیشنهادی برای حساب معین بر پایهٔ **کد والد انتخاب‌شده** ساخته می‌شود
    (مثل ``1001`` + ``00001``) و اگر والدی انتخاب نشده باشد، از بازهٔ عمومی همان
    سطح استفاده می‌کند. نوع حساب، ماهیت و گروه نیز از والد/گروه ارث می‌برند تا
    فرم کدینگ هرگز به‌اشتباه «دارایی» نشان ندهد.
    """
    if not company:
        return None
    ensure_configs(company)
    cfg = CodingConfig.objects.filter(company=company, level=level, is_active=True).first()
    if not cfg:
        return None

    inherited_type, inherited_nature, source = resolve_inheritance(parent, group)
    used = _existing_codes(company, level)

    base_prefix = parent_code or (parent.code if parent is not None else None)
    code = None
    code_basis = 'range'

    if level == 'subsidiary' and base_prefix:
        code = next(
            (c for c in _padded_suffix(cfg.start_number, cfg.end_number, cfg.min_length,
                                       cfg.max_length, str(base_prefix)) if c not in used),
            None,
        )
        code_basis = 'parent' if code else 'range'

    if not code:
        code = next(
            (c for c in _padded_suffix(cfg.start_number, cfg.end_number, cfg.min_length,
                                       cfg.max_length, cfg.prefix) if c not in used),
            None,
        )
        if code_basis != 'parent':
            code_basis = 'range'

    resolved_type = inherited_type or account_type
    full_code = f'{parent.code} / {code}' if (parent is not None and code) else (code or '')

    return {
        'code': code,
        'level': level,
        'code_basis': code_basis,
        'parent': parent.id if parent is not None else None,
        'parent_code': parent.code if parent is not None else '',
        'parent_name': parent.name if parent is not None else '',
        'full_code': full_code,
        'group': (parent.group_id if parent is not None and parent.group_id else (
            group.id if group is not None else None)),
        'group_name': (
            (parent.group.name if parent is not None and parent.group_id else
             (group.name if group is not None else ''))
        ),
        'account_type': getattr(resolved_type, 'id', None),
        'account_type_name': getattr(resolved_type, 'name', ''),
        'account_type_category': getattr(resolved_type, 'category', ''),
        'nature': inherited_nature or 'debit',
        'inherited_from': source,
        'subclass': subclass or '',
        'config': {
            'level': cfg.level,
            'prefix': cfg.prefix,
            'start_number': cfg.start_number,
            'end_number': cfg.end_number,
            'min_length': cfg.min_length,
            'max_length': cfg.max_length,
        },
    }



def validate_code(company, level, code):
    """بررسی اینکه کد واردشده در بازهٔ تعریف‌شده باشد (از نظر طول)."""
    if not company or not code:
        return True
    cfg = CodingConfig.objects.filter(company=company, level=level, is_active=True).first()
    if not cfg:
        return True
    return cfg.min_length <= len(code) <= cfg.max_length