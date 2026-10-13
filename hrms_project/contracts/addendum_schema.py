"""طرح (Schema) «موضوع‌های الحاقیه» — منبع واحد بک‌اند و فرانت‌اند.

برای هر موضوع، دو چیز تعریف می‌شود:

1. **فیلدهای تخصصی** آن موضوع: مثلاً «تغییر مبلغ و تعدیل» فیلدهای مبلغ جدید، شاخص تعدیل،
   مبنای تعدیل و تاریخ اجرا دارد؛ «تغییر مدت و تمدید» فیلدهای تاریخ پایان جدید، روزهای
   تمدید و علت تمدید. فرم فرانت‌اند کاملاً از روی همین تعریف ساخته می‌شود.
2. **اثر بر پروندهٔ قرارداد** (`effect`): بعضی فیلدها مقدار قرارداد را تغییر می‌دهند؛
   مانند `amount_change` که مبلغ قرارداد را افزایش/کاهش می‌دهد یا `new_advance_payment`
   که پیش‌پرداخت پروندهٔ قرارداد را جابه‌جا می‌کند. حالت‌ها:
   - ``set``   → مقدار قرارداد برابر همین مقدار جدید می‌شود.
   - ``delta`` → مقدار قرارداد به اندازهٔ این عدد زیاد/کم می‌شود.

هر الحاقیه می‌تواند **چند موضوع** داشته باشد و اثر همهٔ آن‌ها روی پروندهٔ قرارداد جمع
می‌شود (نتایج در `addendum_effects.py` محاسبه می‌شود).
"""
from decimal import Decimal

# اهداف قابل تغییر در پروندهٔ قرارداد (نام فیلد → برچسب)
CONTRACT_TARGETS = {
    'amount': 'مبلغ قرارداد',
    'end_date': 'تاریخ پایان قرارداد',
    'advance_payment': 'پیش‌پرداخت قرارداد',
    'retention_percent': 'درصد حسن انجام کار',
    'guarantee_amount': 'مبلغ تضمین',
    'exchange_rate': 'نرخ تسعیر ارز',
}

# گروه‌های موضوعی (برای دسته‌بندی بهتر در فرم)
GROUPS = {
    'financial': 'مالی و مبلغ',
    'time': 'زمان و برنامه',
    'scope': 'دامنه و مشخصات فنی',
    'parties': 'طرفین و عوامل اجرایی',
    'legal': 'حقوقی، بیمه و مالیات',
    'close': 'تحویل، تعلیق و خاتمه',
    'other': 'سایر',
}


def _f(key, label, kind='text', **extra):
    """تعریف یک فیلد (کلید، عنوان، نوع و گزینه‌های تکمیلی)."""
    spec = {'key': key, 'label': label, 'type': kind}
    spec.update(extra)
    return spec


SUBJECTS = [
    {
        'value': 'amount', 'label': 'تغییر مبلغ، بهای قرارداد و تعدیل قیمت',
        'group': 'financial',
        'fields': [
            _f('amount_change', 'تغییر مبلغ (افزایش/کاهش)', 'money',
               effect=('amount', 'delta'), help='عدد مثبت = افزایش، منفی = کاهش'),
            _f('new_amount', 'مبلغ جدید قرارداد', 'money', effect=('amount', 'set')),
            _f('percent_change', 'درصد تغییر', 'percent'),
            _f('adjustment_basis', 'مبنای تعدیل', 'text',
               help='شاخص، بخشنامه یا مصوبهٔ مبنای تعدیل'),
            _f('adjustment_index', 'شاخص / ضریب تعدیل', 'number'),
            _f('effective_date', 'تاریخ اجرای تغییر', 'date'),
        ],
    },
    {
        'value': 'payment', 'label': 'تغییر شرایط پرداخت، پیش‌پرداخت و تسویه‌حساب',
        'group': 'financial',
        'fields': [
            _f('advance_change', 'تغییر پیش‌پرداخت (افزایش/کاهش)', 'money',
               effect=('advance_payment', 'delta'), help='عدد مثبت = افزایش، منفی = کاهش'),
            _f('new_advance_payment', 'پیش‌پرداخت جدید قرارداد', 'money',
               effect=('advance_payment', 'set')),
            _f('advance_percent', 'درصد پیش‌پرداخت جدید', 'percent'),
            _f('payment_terms_new', 'شرایط پرداخت جدید', 'textarea'),
            _f('settlement_terms', 'شرایط تسویه‌حساب', 'textarea'),
            _f('payment_steps', 'تعداد/توالی اقساط', 'text'),
        ],
    },
    {
        'value': 'deductions', 'label': 'تغییر کسورات، جرایم و خسارات قراردادی',
        'group': 'financial',
        'fields': [
            _f('new_retention_percent', 'درصد حسن انجام کار جدید', 'percent',
               effect=('retention_percent', 'set')),
            _f('penalty_amount', 'مبلغ جریمه', 'money'),
            _f('penalty_waiver', 'مبلغ بخشودگی جریمه', 'money'),
            _f('penalty_basis', 'مبنای محاسبهٔ جریمه', 'text'),
            _f('deduction_note', 'توضیح کسورات', 'textarea'),
        ],
    },
    {
        'value': 'guarantees', 'label': 'تغییر تضامین، ضمانت‌نامه‌ها و وثایق',
        'group': 'financial',
        'fields': [
            _f('new_guarantee_amount', 'مبلغ جدید تضمین', 'money',
               effect=('guarantee_amount', 'set')),
            _f('guarantee_validity_days', 'تمدید اعتبار (روز)', 'int'),
            _f('new_guarantee_expiry', 'تاریخ انقضای جدید', 'date'),
            _f('guarantee_kind', 'نوع تضمین', 'select', choices=[
                {'value': 'performance', 'label': 'حسن انجام کار'},
                {'value': 'advance', 'label': 'پیش‌پرداخت'},
                {'value': 'bid', 'label': 'شرکت در مناقصه'},
                {'value': 'execution', 'label': 'اجرای تعهدات'},
                {'value': 'other', 'label': 'سایر'},
            ]),
            _f('guarantee_note', 'توضیحات تضامین', 'textarea'),
        ],
    },
    {
        'value': 'currency', 'label': 'تغییر ارز قرارداد، نرخ تسعیر و شرایط مالی بین‌المللی',
        'group': 'financial',
        'fields': [
            _f('new_exchange_rate', 'نرخ تسعیر جدید', 'number',
               effect=('exchange_rate', 'set')),
            _f('settlement_currency', 'ارز تسویه', 'text'),
            _f('currency_clause', 'شرایط مالی بین‌المللی / ارزی', 'textarea'),
            _f('rate_basis', 'مبنای نرخ (بانک مرکزی/توافقی)', 'text'),
        ],
    },
]

SUBJECTS += [
    {
        'value': 'duration', 'label': 'تغییر مدت، تمدید و اصلاح برنامه زمانی قرارداد',
        'group': 'time',
        'fields': [
            _f('new_end_date', 'تاریخ پایان جدید', 'date', effect=('end_date', 'set')),
            _f('extension_days', 'مدت تمدید (روز)', 'int'),
            _f('new_start_date', 'تاریخ شروع جدید', 'date'),
            _f('time_reason', 'علت تمدید', 'select', choices=[
                {'value': 'employer_delay', 'label': 'تأخیر کارفرما'},
                {'value': 'change_order', 'label': 'تغییر کار / دستور کار جدید'},
                {'value': 'force_majeure', 'label': 'قوه قاهره'},
                {'value': 'material_delay', 'label': 'تأخیر تأمین مصالح'},
                {'value': 'other', 'label': 'سایر'},
            ]),
            _f('new_schedule_note', 'اصلاحات برنامهٔ زمانی', 'textarea'),
        ],
    },
    {
        'value': 'provisions', 'label': 'اصلاح و تکمیل مفاد قرارداد',
        'group': 'legal',
        'fields': [
            _f('article_ref', 'ماده / بند مورد اصلاح', 'text'),
            _f('old_text', 'متن قبلی', 'textarea'),
            _f('new_text', 'متن جدید', 'textarea'),
            _f('legal_basis', 'مستند / مبنای اصلاح', 'text'),
        ],
    },
    {
        'value': 'scope', 'label': 'تغییر موضوع، دامنه و حجم کار قرارداد',
        'group': 'scope',
        'fields': [
            _f('scope_description', 'شرح دامنهٔ جدید', 'textarea'),
            _f('added_items', 'اقلام افزوده', 'textarea'),
            _f('removed_items', 'اقلام حذف‌شده', 'textarea'),
            _f('quantity_change', 'تغییر حجم کار (مقدار/درصد)', 'text'),
        ],
    },
    {
        'value': 'technical', 'label': 'تغییر مشخصات فنی، نقشه‌ها و استانداردهای اجرایی',
        'group': 'scope',
        'fields': [
            _f('spec_reference', 'شمارهٔ مشخصات / نقشه', 'text'),
            _f('revision', 'ویرایش (Revisions)', 'text'),
            _f('standard_code', 'استاندارد مرجع', 'text'),
            _f('technical_note', 'توضیح فنی', 'textarea'),
        ],
    },
    {
        'value': 'project', 'label': 'تغییر پروژه، محل اجرا و نحوه تخصیص کار',
        'group': 'scope',
        'fields': [
            _f('project_ref', 'پروژه / کار جدید', 'text'),
            _f('location_new', 'محل اجرای جدید', 'text'),
            _f('allocation_note', 'نحوهٔ تخصیص کار', 'textarea'),
        ],
    },
    {
        'value': 'supply', 'label': 'تغییر شرایط تأمین مصالح، تجهیزات و تحویل کالا',
        'group': 'scope',
        'fields': [
            _f('supply_terms_new', 'شرایط تأمین جدید', 'textarea'),
            _f('delivery_place', 'محل تحویل', 'text'),
            _f('incoterms', 'شرایط تحویل (Incoterms)', 'text'),
            _f('supply_note', 'توضیحات', 'textarea'),
        ],
    },
]

SUBJECTS += [
    {
        'value': 'delivery', 'label': 'تغییر شرایط تحویل، آزمایش، تأیید و تضمین کیفیت',
        'group': 'close',
        'fields': [
            _f('acceptance_stage', 'مرحلهٔ تحویل / تأیید', 'text'),
            _f('test_standard', 'آزمون و استاندارد پذیرش', 'text'),
            _f('quality_warranty_months', 'دورهٔ تضمین کیفیت (ماه)', 'int'),
            _f('delivery_note', 'توضیحات تحویل', 'textarea'),
        ],
    },
    {
        'value': 'parties', 'label': 'تغییر مشخصات طرفین، نمایندگان و صاحبان امضای مجاز',
        'group': 'parties',
        'fields': [
            _f('party_role', 'طرف قرارداد', 'select', choices=[
                {'value': 'employer', 'label': 'کارفرما'},
                {'value': 'contractor', 'label': 'پیمانکار'},
                {'value': 'consultant', 'label': 'مشاور'},
                {'value': 'other', 'label': 'سایر'},
            ]),
            _f('party_name_new', 'نام جدید طرف', 'text'),
            _f('representative', 'نماینده / صاحب امضا', 'text'),
            _f('signatory_power', 'حد اختیارات', 'text'),
        ],
    },
    {
        'value': 'consultants', 'label': 'تغییر ناظر، مشاور، پیمانکاران جزء و عوامل اجرایی',
        'group': 'parties',
        'fields': [
            _f('role_type', 'نقش', 'select', choices=[
                {'value': 'supervisor', 'label': 'ناظر'},
                {'value': 'consultant', 'label': 'مشاور'},
                {'value': 'subcontractor', 'label': 'پیمانکار جزء'},
                {'value': 'staff', 'label': 'عوامل اجرایی'},
            ]),
            _f('entity_name', 'نام جدید', 'text'),
            _f('replaced_entity', 'جایگزینِ', 'text'),
            _f('consultant_note', 'توضیحات', 'textarea'),
        ],
    },
    {
        'value': 'obligations', 'label': 'تغییر تعهدات، مسئولیت‌ها و حدود اختیارات طرفین',
        'group': 'legal',
        'fields': [
            _f('party_obligations', 'تعهدات جدید', 'textarea'),
            _f('liability_limit', 'حد مسئولیت', 'text'),
            _f('obligation_note', 'توضیحات', 'textarea'),
        ],
    },
    {
        'value': 'legal', 'label': 'تغییر شرایط بیمه، مالیات و الزامات قانونی',
        'group': 'legal',
        'fields': [
            _f('insurance_basis', 'شرایط بیمه', 'textarea'),
            _f('tax_basis', 'شرایط مالیات و عوارض', 'textarea'),
            _f('legal_reference', 'مستند قانونی', 'text'),
            _f('legal_note', 'توضیحات', 'textarea'),
        ],
    },
    {
        'value': 'suspension', 'label': 'تغییر شرایط تعلیق، توقف، ازسرگیری و خاتمه قرارداد',
        'group': 'close',
        'fields': [
            _f('action_type', 'نوع اقدام', 'select', choices=[
                {'value': 'suspension', 'label': 'تعلیق'},
                {'value': 'stop', 'label': 'توقف'},
                {'value': 'resume', 'label': 'ازسرگیری'},
                {'value': 'termination', 'label': 'خاتمه'},
            ]),
            _f('action_date', 'تاریخ اجرا', 'date'),
            _f('action_days', 'مدت (روز)', 'int'),
            _f('action_reason', 'علت', 'textarea'),
        ],
    },
    {
        'value': 'other', 'label': 'سایر تغییرات و الحاق موارد جدید',
        'group': 'other',
        'fields': [
            _f('free_title', 'عنوان تغییر', 'text'),
            _f('free_text', 'شرح کامل', 'textarea'),
        ],
    },
]

SUBJECT_INDEX = {s['value']: s for s in SUBJECTS}
SUBJECT_VALUES = [s['value'] for s in SUBJECTS]

# نگاشت فیلد → اثر (از روی تعریف بالا ساخته می‌شود؛ منبع واحد)
EFFECT_RULES = {}
for _subject in SUBJECTS:
    for _field in _subject['fields']:
        if _field.get('effect'):
            EFFECT_RULES[_field['key']] = {
                'target': _field['effect'][0],
                'mode': _field['effect'][1],
                'subject': _subject['value'],
                'label': _field['label'],
            }


def subject_options():
    """فهرست کامل موضوع‌ها با فیلدهای تخصصی و اثر آن‌ها (برای API و فرم)."""
    return [
        {
            'value': subject['value'],
            'label': subject['label'],
            'group': subject['group'],
            'group_label': GROUPS.get(subject['group'], ''),
            'fields': subject['fields'],
        }
        for subject in SUBJECTS
    ]


def normalize_subjects(raw):
    """ورودی موضوع‌ها را به شکل استاندارد ``[{'type', 'fields'}]`` در می‌آورد."""
    items = []
    if isinstance(raw, dict):
        raw = [raw]
    for item in raw or []:
        if isinstance(item, str):
            if item in SUBJECT_INDEX:
                items.append({'type': item, 'fields': {}})
            continue
        if not isinstance(item, dict):
            continue
        kind = item.get('type') or item.get('subject_type') or item.get('value')
        if kind not in SUBJECT_INDEX:
            continue
        fields = item.get('fields') if isinstance(item.get('fields'), dict) else {}
        clean = {}
        allowed = {f['key'] for f in SUBJECT_INDEX[kind]['fields']}
        for key, value in fields.items():
            if key in allowed and value not in (None, ''):
                clean[key] = value
        items.append({'type': kind, 'fields': clean})
    return items


def validate_subjects(raw):
    """اعتبارسنجی موضوع‌ها؛ فهرست خطاها (خالی = بی‌خطا)."""
    errors = []
    if isinstance(raw, dict):
        raw = [raw]
    seen = set()
    for item in raw or []:
        if isinstance(item, str):
            kind = item
        elif isinstance(item, dict):
            kind = item.get('type') or item.get('subject_type') or item.get('value')
        else:
            kind = None
        if kind in SUBJECT_INDEX:
            if kind in seen:
                errors.append(f'موضوع «{SUBJECT_INDEX[kind]["label"]}» تکراری است.')
            seen.add(kind)
        elif kind not in (None, ''):
            errors.append(f'موضوع نامعتبر: «{kind}».')
    return errors


def subject_label(value):
    subject = SUBJECT_INDEX.get(value)
    return subject['label'] if subject else ''


def to_decimal(value):
    if value in (None, ''):
        return None
    try:
        return Decimal(str(value))
    except Exception:  # noqa: BLE001
        return None

