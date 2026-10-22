"""نگاشت و کنترل حساب‌های مالی قراردادها.

این فایل مرجع مشترک صفحهٔ «نگاشت و کنترل»، API و موتورهای حسابداری است.
کلیدهای هر نقطهٔ مالی و منطق خواندن تنظیمات را در یک جا نگه می‌دارد تا
صفحه و سیستم از یک منبع واحد استفاده کنند.
"""
from contracts.models import ContractAccountMapping

MAPPING_DEFINITIONS = [
    {
        'key': 'base_subsidiary', 'label': 'حساب معین پایه',
        'description': 'حساب معین پیش‌فرض رویدادهای عمومی قرارداد',
        'color': '#0f766e', 'required': False,
    },
    {
        'key': 'retention', 'label': 'حسن انجام کار',
        'description': 'حساب کسور و سپردهٔ حسن انجام کار',
        'color': '#f97316', 'required': True,
    },
    {
        'key': 'insurance_deposit', 'label': 'سپرده بیمه',
        'description': 'حساب سپرده یا کسور بیمهٔ قرارداد',
        'color': '#0891b2', 'required': True,
    },
    {
        'key': 'payable', 'label': 'پرداختنی‌ها',
        'description': 'حساب پرداختنی به پیمانکار، تأمین‌کننده یا طرف قرارداد',
        'color': '#dc2626', 'required': True,
    },
    {
        'key': 'receivable', 'label': 'دریافتنی‌ها',
        'description': 'حساب مطالبات و دریافتنی‌های قرارداد',
        'color': '#2563eb', 'required': True,
    },
    {
        'key': 'advance', 'label': 'پیش‌پرداخت',
        'description': 'حساب پیش‌پرداخت و تسویهٔ آن',
        'color': '#6366f1', 'required': False,
    },
    {
        'key': 'tax', 'label': 'مالیات و عوارض',
        'description': 'مالیات بر ارزش افزوده، تکلیفی و عوارض قرارداد',
        'color': '#be123c', 'required': False,
    },
    {
        'key': 'penalty', 'label': 'جریمه و خسارت',
        'description': 'وجه التزام، جریمهٔ تأخیر و خسارات قراردادی',
        'color': '#b45309', 'required': False,
    },
    {
        'key': 'fee', 'label': 'کارمزد و خدمات',
        'description': 'حساب کارمزد، خدمات و هزینه‌های جانبی قرارداد',
        'color': '#7c3aed', 'required': False,
    },
    {
        'key': 'revenue', 'label': 'درآمد صورت‌وضعیت',
        'description': 'حساب درآمد شناسایی‌شده از صورت‌وضعیت‌ها',
        'color': '#10b981', 'required': False,
    },
    {
        'key': 'cost', 'label': 'هزینه و مصالح',
        'description': 'حساب هزینه، مصالح و بهای تمام‌شدهٔ قرارداد',
        'color': '#64748b', 'required': False,
    },
    {
        'key': 'guarantee', 'label': 'تضامین و ضمانت‌نامه‌ها',
        'description': 'حساب تضامین، ضمانت‌نامه‌ها و وثایق قرارداد',
        'color': '#8b5cf6', 'required': False,
    },
    {
        'key': 'other', 'label': 'سایر',
        'description': 'سایر رویدادهای مالی قرارداد',
        'color': '#94a3b8', 'required': False,
    },
]

MAPPING_BY_KEY = {item['key']: item for item in MAPPING_DEFINITIONS}

EVENT_MAPPING_KEYS = {
    'payment': ('payable', 'base_subsidiary'),
    'statement': ('revenue', 'receivable', 'retention', 'insurance_deposit', 'tax', 'fee', 'cost'),
    'guarantee': ('guarantee', 'base_subsidiary'),
}

AUXILIARY_SOURCES = [
    {'value': 'auto', 'label': 'از دستهٔ تفصیلی (خودکار)'},
    {'value': 'none', 'label': 'بدون تفصیل'},
    {'value': 'contract', 'label': 'قرارداد همین سند'},
    {'value': 'party', 'label': 'طرف حساب / پیمانکار'},
    {'value': 'supplier', 'label': 'تأمین‌کننده'},
    {'value': 'employee', 'label': 'پرسنل'},
    {'value': 'project', 'label': 'پروژه'},
    {'value': 'bank', 'label': 'بانک'},
    {'value': 'cash', 'label': 'صندوق'},
    {'value': 'fixed', 'label': 'تفصیل ثابت'},
]

CONTROL_MODES = [
    {'value': 'soft', 'label': 'کنترل نرم (هشدار)'},
    {'value': 'strict', 'label': 'کنترل سخت (مسدودسازی)'},
]


def account_brief(account):
    if account is None:
        return None
    return {
        'id': account.pk,
        'code': getattr(account, 'code', ''),
        'name': getattr(account, 'name', ''),
        'full_code': getattr(account, 'full_code', '') or '',
        'parent_id': getattr(account, 'parent_id', None),
        'parent_code': getattr(getattr(account, 'parent', None), 'code', ''),
        'parent_name': getattr(getattr(account, 'parent', None), 'name', ''),
    }


def auxiliary_brief(auxiliary):
    if auxiliary is None:
        return None
    return {
        'id': auxiliary.pk,
        'code': getattr(auxiliary, 'code', ''),
        'name': getattr(auxiliary, 'name', ''),
        'aux_type': getattr(auxiliary, 'aux_type', ''),
    }


def category_brief(category):
    if category is None:
        return None
    return {
        'id': category.pk,
        'code': getattr(category, 'code', ''),
        'name': getattr(category, 'name', ''),
        'source': getattr(category, 'source', ''),
    }


def auxiliary_slot_payload(row, slot):
    source = getattr(row, f'auxiliary_source_{slot}', ContractAccountMapping.AuxSource.NONE)
    category = getattr(row, f'auxiliary_category_{slot}', None)
    auxiliary = getattr(row, f'auxiliary_{slot}', None)
    return {
        'slot': slot,
        'source': source,
        'category': category_brief(category),
        'auxiliary': auxiliary_brief(auxiliary),
    }


def missing_fields(row):
    """فیلدهای ناقص یک نگاشت برای نمایش وضعیت کنترل."""
    if row is None:
        return ['حساب معین']
    missing = []
    if not row.subsidiary_account_id:
        missing.append('حساب معین')
    for slot in (1, 2, 3):
        source = getattr(row, f'auxiliary_source_{slot}')
        category = getattr(row, f'auxiliary_category_{slot}_id')
        auxiliary = getattr(row, f'auxiliary_{slot}_id')
        if source == ContractAccountMapping.AuxSource.AUTO and not category:
            missing.append(f'دستهٔ تفصیل {slot}')
        if source == ContractAccountMapping.AuxSource.FIXED and not auxiliary:
            missing.append(f'تفصیل ثابت {slot}')
    return missing


def mapping_payload(row):
    if row is None:
        return None
    missing = missing_fields(row)
    return {
        'id': row.pk,
        'key': row.key,
        'key_display': row.get_key_display(),
        'title': row.title,
        'subsidiary_account': row.subsidiary_account_id,
        'subsidiary_account_detail': account_brief(row.subsidiary_account),
        'general_account_detail': account_brief(row.general_account),
        'auxiliary_source_1': row.auxiliary_source_1,
        'auxiliary_category_1': row.auxiliary_category_1_id,
        'auxiliary_1': row.auxiliary_1_id,
        'auxiliary_source_2': row.auxiliary_source_2,
        'auxiliary_category_2': row.auxiliary_category_2_id,
        'auxiliary_2': row.auxiliary_2_id,
        'auxiliary_source_3': row.auxiliary_source_3,
        'auxiliary_category_3': row.auxiliary_category_3_id,
        'auxiliary_3': row.auxiliary_3_id,
        'auxiliary_slots': [auxiliary_slot_payload(row, slot) for slot in (1, 2, 3)],
        'auto_create_auxiliaries': row.auto_create_auxiliaries,
        'enforce_auxiliary': row.enforce_auxiliary,
        'control_mode': row.control_mode,
        'control_mode_display': row.get_control_mode_display(),
        'notes': row.notes,
        'sort_order': row.sort_order,
        'is_active': row.is_active,
        'missing': missing,
        'is_complete': not missing,
    }


def mapping_defaults(definition):
    return {
        'key': definition['key'],
        'title': definition['label'],
        'subsidiary_account': None,
        'subsidiary_account_detail': None,
        'general_account_detail': None,
        **{f'auxiliary_source_{slot}': ContractAccountMapping.AuxSource.NONE for slot in (1, 2, 3)},
        **{f'auxiliary_category_{slot}': None for slot in (1, 2, 3)},
        **{f'auxiliary_{slot}': None for slot in (1, 2, 3)},
        'auxiliary_slots': [
            {'slot': slot, 'source': ContractAccountMapping.AuxSource.NONE, 'category': None, 'auxiliary': None}
            for slot in (1, 2, 3)
        ],
        'auto_create_auxiliaries': True,
        'enforce_auxiliary': False,
        'control_mode': ContractAccountMapping.ControlMode.SOFT,
        'control_mode_display': ContractAccountMapping.ControlMode.SOFT.label,
        'notes': '',
        'sort_order': MAPPING_DEFINITIONS.index(definition),
        'is_active': True,
        'missing': ['حساب معین'],
        'is_complete': False,
    }



def saved_mappings(company):
    if not company:
        return {}
    return {
        row.key: row
        for row in ContractAccountMapping.objects.filter(company=company).select_related(
            'subsidiary_account', 'subsidiary_account__parent',
            'auxiliary_category_1', 'auxiliary_category_2', 'auxiliary_category_3',
            'auxiliary_1', 'auxiliary_2', 'auxiliary_3',
        )
    }


def contract_mapping_rows(company):
    saved = saved_mappings(company)
    rows = []
    for definition in MAPPING_DEFINITIONS:
        row = saved.get(definition['key'])
        payload = mapping_payload(row) if row else mapping_defaults(definition)
        payload['definition'] = definition
        rows.append(payload)
    return rows


def contract_mapping_summary(company):
    rows = contract_mapping_rows(company)
    total = len(rows)
    configured = sum(1 for row in rows if row.get('subsidiary_account'))
    complete = sum(1 for row in rows if row.get('is_complete'))
    strict = sum(1 for row in rows if row.get('control_mode') == ContractAccountMapping.ControlMode.STRICT)
    return {
        'total': total,
        'configured': configured,
        'complete': complete,
        'missing': total - complete,
        'strict': strict,
    }


def resolve_contract_mapping(company, key):
    mapping = MAPPING_BY_KEY.get(key)
    if not mapping:
        return None
    row = ContractAccountMapping.objects.filter(company=company, key=key, is_active=True).first()
    return mapping_payload(row) if row else mapping_defaults(mapping)


def resolve_event_mapping(company, event='payment'):
    """خواندن نگاشت مؤثر یک رویداد برای موتورهای حسابداری.

    ترتیب کلیدها در ``EVENT_MAPPING_KEYS`` مشخص است؛ اولین نگاشتِ دارای
    حساب معین به‌عنوان نگاشت اصلی رویداد برگردانده می‌شود.
    """
    keys = EVENT_MAPPING_KEYS.get(event, ())
    rows = [resolve_contract_mapping(company, key) for key in keys]
    rows = [row for row in rows if row]
    primary = next((row for row in rows if row.get('subsidiary_account')), None)
    return {
        'event': event,
        'primary': primary,
        'mappings': rows,
        'ready': bool(primary),
    }

