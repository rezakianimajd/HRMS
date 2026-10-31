"""قواعد اعتبارسنجی زیرماژول «معاملات فصلی خرید» — منبع واحد سرور و فرانت‌اند.

اصل طراحی: قواعد **اعلانی** هستند تا با تغییر نسخهٔ TTMS فقط همین فایل
به‌روزرسانی شود. هر قاعده سه مشخصهٔ کلیدی دارد:

- ``field``: فیلد داخلی مدل (نه نام ستون فایل خروجی)
- ``level``: ``error`` (مانع آماده‌سازی/ارسال) یا ``warning`` (یادآوری)
- ``source``: منبع قاعده، تا تفکیک «الزام قانونی» از «الزام نسخهٔ TTMS» و
  «سیاست داخلی» ممکن باشد.

وضعیت مستندات: فایل رسمی/Access نسخهٔ هدف TTMS در محیط پروژه موجود نیست؛
بنابراین قواعدی که به ساختار فایل وابسته‌اند با منبع ``SOURCE_TTMS`` و
وضعیت «تأییدنشده» علامت خورده‌اند و هیچ خروجی‌ای «تأییدشده» اعلام نمی‌شود.
"""

RULESET_VERSION = 'draft-1405.3'
RULESET_STATUS = 'unverified'          # unverified | verified

SOURCE_LEGAL = 'ماده ۱۶۹ مکرر ق.م.م و آیین‌نامه — الزامات عمومی فهرست معاملات'
SOURCE_TTMS = 'قالب TTMS نسخهٔ هدف ۱۴۰۵ — تأییدنشده (فایل رسمی در دسترس نیست)'
SOURCE_INTERNAL = 'سیاست داخلی Kian EBP'

DIRECTION = 'purchase'                 # این نسخه فقط خرید

PERSON_TYPES = [
    ('legal', 'شخص حقوقی'),
    ('natural', 'شخص حقیقی'),
    ('foreign', 'شخص خارجی'),
    ('aggregate', 'تجمیعی'),
]

DEFAULT_COUNTRY = 'ایران'

FIELD_LABELS = {
    'line_no': 'ردیف',
    'name': 'نام شرکت / عنوان',
    'first_name': 'نام',
    'last_name': 'نام خانوادگی',
    'person_type': 'نوع فروشنده',
    'economic_code': 'شماره اقتصادی (منسوخ)',
    'national_id': 'شناسه ملی / کد ملی',
    'postal_code': 'کد پستی',
    'country': 'کشور',
    'province': 'استان',
    'city': 'شهر',
    'address': 'آدرس',
    'goods_service_desc': 'شرح کالا / خدمات',
    'goods_service_type': 'نوع کالا یا خدمات',
    'is_included': 'مشمول معاملات فصلی',
    'amount': 'مبلغ',
    'vat': 'مالیات بر ارزش افزوده',
    'total': 'جمع کل',
    'kind': 'نوع معامله',
    'invoice_date': 'تاریخ فاکتور',
    'invoice_no': 'شماره فاکتور',
    'moadian_status': 'وضعیت سامانه مودیان',
    'moadian_uid': 'شناسهٔ یکتای صورتحساب',
}

ALL_TYPES = ('legal', 'natural', 'foreign')
IRANIAN_TYPES = ('legal', 'natural')


def _rule(kind, field, person_types, level, source, message, **extra):
    return {
        'code': f'{kind}_{field}_{"_".join(person_types)}',
        'kind': kind,
        'field': field,
        'field_label': FIELD_LABELS.get(field, field),
        'person_types': list(person_types),
        'level': level,
        'source': source,
        'message': message,
        'direction': DIRECTION,
        **extra,
    }


# ---------------------------------------------------------------------------
# قواعد خرید (اعلانی — قابل نگهداری؛ با تغییر نسخهٔ TTMS فقط این بخش عوض می‌شود)
# ---------------------------------------------------------------------------
RULES = [
    _rule('required', 'person_type', ALL_TYPES, 'error', SOURCE_INTERNAL,
          'نوع فروشنده (حقوقی/حقیقی/خارجی) را انتخاب کنید؛ قواعد هر نوع متفاوت است.'),

    # ---- فروشندهٔ حقوقی: عنوان شرکت + شناسه ملی ۱۱ رقمی (کد اقتصادی استفاده نمی‌شود) ----
    _rule('required', 'name', ('legal',), 'error', SOURCE_LEGAL,
          'نام شرکت برای فروشندهٔ حقوقی الزامی است.'),
    _rule('required', 'national_id', ('legal',), 'error', SOURCE_LEGAL,
          'برای فروشندهٔ حقوقی، شناسه ملی ۱۱ رقمی الزامی است.'),
    _rule('digits', 'national_id', ('legal',), 'error', SOURCE_LEGAL,
          'شناسه ملی شخص حقوقی باید ۱۱ رقم باشد.', length=11),

    # ---- فروشندهٔ حقیقی: نام و نام خانوادگی جدا + کد ملی ۱۰ رقمی ----
    _rule('required', 'first_name', ('natural',), 'error', SOURCE_LEGAL,
          'برای فروشندهٔ حقیقی، «نام» الزامی است.'),
    _rule('required', 'last_name', ('natural',), 'error', SOURCE_LEGAL,
          'برای فروشندهٔ حقیقی، «نام خانوادگی» الزامی است.'),
    _rule('required', 'national_id', ('natural',), 'error', SOURCE_LEGAL,
          'برای فروشندهٔ حقیقی، کد ملی ۱۰ رقمی الزامی است.'),
    _rule('digits', 'national_id', ('natural',), 'error', SOURCE_LEGAL,
          'کد ملی شخص حقیقی باید ۱۰ رقم باشد.', length=10),

    # ---- شخص خارجی: شناسه‌های ایرانی معنا ندارند؛ نام/عنوان و کشور الزامی است ----
    _rule('required', 'name', ('foreign',), 'error', SOURCE_LEGAL,
          'نام/عنوان فروشندهٔ خارجی الزامی است.'),
    _rule('forbidden', 'national_id', ('foreign',), 'warning', SOURCE_TTMS,
          'برای شخص خارجی، شناسه ملی/کد ملی ایرانی ثبت نمی‌شود؛ این فیلد را خالی بگذارید.'),
    _rule('required', 'country', ('foreign',), 'error', SOURCE_TTMS,
          'برای شخص خارجی، کشور الزامی است (پشتیبانی قالب نسخهٔ هدف تأییدنشده).'),

    # کد پستی: توصیه‌شده در سطح الزامات عمومی (غیر مسدودکننده)
    _rule('recommended', 'postal_code', IRANIAN_TYPES, 'warning', SOURCE_LEGAL,
          'کد پستی فروشنده ثبت نشده است.'),
    _rule('digits', 'postal_code', IRANIAN_TYPES, 'error', SOURCE_LEGAL,
          'کد پستی باید ۱۰ رقم باشد.', length=10),

    # اقلام اطلاعاتی فاکتور (فعلاً هشدار؛ پس از تأیید قالب هدف به خطا ارتقا می‌یابد)
    _rule('recommended', 'invoice_no', ALL_TYPES, 'warning', SOURCE_TTMS,
          'شماره فاکتور وارد نشده است.'),
    _rule('recommended', 'invoice_date', ALL_TYPES, 'warning', SOURCE_TTMS,
          'تاریخ فاکتور وارد نشده است.'),
    _rule('recommended', 'goods_service_desc', ALL_TYPES, 'warning', SOURCE_TTMS,
          'شرح کالا یا خدمات وارد نشده است.'),
]


def rules_for(person_type=None, level=None):
    """قواعد اعمال‌شدنی برای یک نوع شخص (و در صورت نیاز یک سطح)."""
    selected = []
    for rule in RULES:
        if person_type and person_type not in rule['person_types']:
            continue
        if level and rule['level'] != level:
            continue
        selected.append(rule)
    return selected


def required_fields(person_type):
    """فیلدهای اجباری (سطح خطا) برای یک نوع فروشنده — برای نشانه‌گذاری فرم."""
    if person_type == 'aggregate':
        # «تجمیعی»: تنها مبلغ الزامی است و بقیهٔ فیلدها اختیاری‌اند
        return ['amount']
    fields = []
    for rule in rules_for(person_type):
        if rule['kind'] == 'required' and rule['level'] == 'error' and rule['field'] not in fields:
            fields.append(rule['field'])
    return fields


def recommended_fields(person_type):
    """فیلدهای توصیه‌شده (هشدار) برای یک نوع فروشنده."""
    fields = []
    for rule in rules_for(person_type):
        if rule['kind'] in ('required', 'recommended') and rule['level'] == 'warning' and rule['field'] not in fields:
            fields.append(rule['field'])
    return fields


def build_reference(direction=DIRECTION):
    """Payload مرجع برای رابط کاربری: قواعد، الزامات هر نوع شخص و منابع."""
    return {
        'direction': direction,
        'ruleset_version': RULESET_VERSION,
        'ruleset_status': RULESET_STATUS,
        'sources': {
            'legal': SOURCE_LEGAL,
            'ttms': SOURCE_TTMS,
            'internal': SOURCE_INTERNAL,
        },
        'field_labels': FIELD_LABELS,
        'person_types': [{'value': value, 'label': label} for value, label in PERSON_TYPES],
        'required': {value: required_fields(value) for value, _label in PERSON_TYPES},
        'recommended': {value: recommended_fields(value) for value, _label in PERSON_TYPES},
        'rules': RULES,
        'notes': [
            'این نسخه فقط معاملات خرید را ثبت و گزارش می‌کند؛ فروش در نسخهٔ بعد و مستقل اضافه می‌شود.',
            'کدهای «نوع معامله» (۱ تا ۵) بدون نگاشت رسمی حفظ شده‌اند و باید با مستند نسخهٔ TTMS هدف تطبیق شوند.',
            'فایل رسمی/Access نسخهٔ TTMS هدف در محیط پروژه موجود نبود؛ خروجی TTMS «آزمایش‌نشده» است.',
            'نوع «تجمیعی» برای ردیف‌هایی است که فقط مبلغ آن‌ها گزارش می‌شود؛ بقیهٔ فیلدها اختیاری‌اند.',
            'کشور به‌صورت پیش‌فرض «ایران» پر می‌شود و قابل ویرایش است.',
        ],
    }



# ---------------------------------------------------------------------------
# نگاشت پیش‌نویس خروجی TTMS (خرید)
# ---------------------------------------------------------------------------
# ``target_field`` عمداً خالی است: نام ستون رسمی نسخهٔ هدف TTMS در دسترس نیست و
# پرکردن آن با حدس، ممنوع است. با دریافت قالب رسمی، فقط همین جدول تکمیل می‌شود.
# تغییرات دستور کارفرما: «مشمول» برای همهٔ ردیف‌ها = بله و «نوع کالا/خدمات» = سایر؛
# همچنین کد اقتصادی حذف و برای حقیقی نام/نام خانوادگی جدا گزارش می‌شود.
TTMS_DRAFT_MAPPING = [
    {'internal': 'line_no', 'type': 'int', 'length': None, 'requirement': 'الزامی', 'target_field': None},
    {'internal': 'person_type', 'type': 'enum', 'length': 10, 'requirement': 'الزامی', 'target_field': None},
    {'internal': 'is_included', 'type': 'bool', 'length': 1, 'requirement': 'همیشه «بله»', 'target_field': None},
    {'internal': 'goods_service_type', 'type': 'enum', 'length': 20, 'requirement': 'همیشه «سایر»', 'target_field': None},
    {'internal': 'name', 'type': 'text', 'length': 250, 'requirement': 'الزامی برای حقوقی/خارجی', 'target_field': None},
    {'internal': 'first_name', 'type': 'text', 'length': 150, 'requirement': 'الزامی برای حقیقی', 'target_field': None},
    {'internal': 'last_name', 'type': 'text', 'length': 150, 'requirement': 'الزامی برای حقیقی', 'target_field': None},
    {'internal': 'national_id', 'type': 'text', 'length': 11, 'requirement': 'الزامی (حقوقی ۱۱ / حقیقی ۱۰)', 'target_field': None},
    {'internal': 'postal_code', 'type': 'text', 'length': 10, 'requirement': 'توصیه‌شده', 'target_field': None},
    {'internal': 'country', 'type': 'text', 'length': 60, 'requirement': 'الزامی برای خارجی', 'target_field': None},
    {'internal': 'province', 'type': 'text', 'length': 60, 'requirement': 'اختیاری', 'target_field': None},
    {'internal': 'city', 'type': 'text', 'length': 100, 'requirement': 'اختیاری', 'target_field': None},
    {'internal': 'address', 'type': 'text', 'length': 500, 'requirement': 'اختیاری', 'target_field': None},
    {'internal': 'goods_service_desc', 'type': 'text', 'length': 300, 'requirement': 'توصیه‌شده', 'target_field': None},
    {'internal': 'amount', 'type': 'int', 'length': 18, 'requirement': 'الزامی', 'target_field': None},
    {'internal': 'vat', 'type': 'int', 'length': 18, 'requirement': 'اختیاری', 'target_field': None},
    {'internal': 'total', 'type': 'int', 'length': 18, 'requirement': 'محاسباتی', 'target_field': None},
    {'internal': 'kind', 'type': 'int', 'length': 2, 'requirement': 'الزامی (۱..۵)', 'target_field': None},
    {'internal': 'invoice_date', 'type': 'date-jalali', 'length': 10, 'requirement': 'توصیه‌شده', 'target_field': None},
    {'internal': 'invoice_no', 'type': 'text', 'length': 50, 'requirement': 'توصیه‌شده', 'target_field': None},
    {'internal': 'moadian_status', 'type': 'enum', 'length': 10, 'requirement': 'اختیاری', 'target_field': None},
    {'internal': 'moadian_uid', 'type': 'text', 'length': 120, 'requirement': 'توصیه‌شده', 'target_field': None},
]

