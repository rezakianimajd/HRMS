"""بستهٔ «پرکردن فایل Access نسخهٔ TTMS» برای صورت معاملات فصلی (خرید).

مبنای فنی — بررسی‌شده روی کپی فایل مرجع ``TTMS_96_New.mdb`` (نسخهٔ ۹۶):

- جدول سرصفحه: ``Kharid`` با ستون‌های ``Code`` (GUID)، ``HCFaslTypeCode``
  (۱=بهار … ۴=زمستان، قاعدهٔ ``<=4``)، ``HCYearCode`` و ``IsSent``.
- جدول ردیف‌ها: ``Kharid_Detail``؛ ستون‌های اجباری ``KalaKhadamatName``،
  ``Price``، ``MaliatArzeshAfzoodeh``، ``SayerAvarez``، ``TakhfifPrice`` و
  ``ForoushandeLastNameSherkatName``.
- قواعد ستونی: ``HCForoushandeTypeCode <= 2`` (۱ حقیقی / ۲ حقوقی) و
  ``HCForoushandeType1Code BETWEEN 5 AND 7``.
- ``KalaType`` از جدول ``KalaType`` (۱..۱۲؛ ۱۲ = «سایر کالا ها»).
- ``ForoushandePostCode`` ۱۰ و ``FactorDate`` ۱۰ نویسه، ``FactorNo`` ۵۰ نویسه،
  ``ForoushandeName`` ۵۰ و ``ForoushandeLastNameSherkatName`` ۱۰۰ نویسه.
- ``StateCode`` از نوع Byte و ``CityCode`` از نوع Integer است؛ چون کدهای
  منطقه‌ای TTMS (جدول ``Zone``) در HRMS نگه‌داری نمی‌شود، خالی (NULL) می‌مانند.

جریان کار: سرور این بستهٔ zip را می‌سازد و کاربر آن را روی ویندوز با اسکریپت
``fill_ttms.ps1`` اجرا می‌کند؛ اسکریپت **فقط روی کپی** فایل هدف می‌نویسد،
تراکنشی درج می‌کند، جمع‌ها را بازبینی و نتیجه را در ``result.json`` می‌نویسد.
سرور هیچ دسترسی‌ای به فایل Access ندارد (ACE/OLEDB روی لینوکس موجود نیست).
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import zipfile
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

from accounting.seasonal import DIRECTION_PURCHASE, _company_identity, _jalali_text

PACKAGE_VERSION = 'ttms-fill-1.0'
TEMPLATE_STATUS = 'tested-on-copy'      # درج/بازخوانی روی کپی فایل مرجع آزمایش شده است
TEMPLATE_REFERENCE = 'TTMS_96_New.mdb'

HEADER_TABLE = 'Kharid'
DETAIL_TABLE = 'Kharid_Detail'

ASSETS_DIR = Path(__file__).resolve().parent / 'ttms_assets'
FILLER_SCRIPT = 'fill_ttms.ps1'

# نوع کالا در فایل TTMS (جدول KalaType)
KALA_TYPES = [
    (1, 'دارو'),
    (2, 'دخانیات'),
    (3, 'موبایل'),
    (4, 'لوازم خانگی برقی'),
    (5, 'قطعات مصرفی و یدکی وسایل نقلیه'),
    (6, 'فراورده‌ها و مشتقات نفتی و گازی و پتروشیمیایی'),
    (7, 'طلا اعم از شمش، مسکوکات و مصنوعات زینتی'),
    (8, 'منسوجات و پوشاک'),
    (9, 'اسباب بازی'),
    (10, 'دام زنده، گوشت سفید و قرمز'),
    (11, 'محصولات اساسی کشاورزی'),
    (12, 'سایر کالا ها'),
]

# وضعیت مودی فروشنده (HCForoushandeType1Code)
SELLER_STATUS_CODES = [
    (5, 'مودی مشمول ثبت‌نام در نظام مالیاتی'),
    (6, 'مشمولین حقیقی ماده ۸۱ ق.م.م'),
    (7, 'اشخاصی که ملزم به ثبت‌نام در نظام مالیاتی نیستند'),
]

# نگاشت نوع شخص HRMS به (HCForoushandeTypeCode, HCForoushandeType1Code)
PERSON_TYPE_CODES = {
    'legal': (2, 5),
    'natural': (1, 5),
    'foreign': (2, 7),
    'aggregate': (2, 7),
}

# ستون‌های rows.csv به همان ترتیب INSERT در Kharid_Detail
# (name, kind, max_length, label) — kind: int | text | bool
DETAIL_COLUMNS = [
    ('Radif', 'int', None, 'شمارهٔ ردیف'),
    ('Sarjam', 'bool', None, 'سرجمع'),
    ('IsHagholAmalKari', 'bool', None, 'از طریق حق‌العمل‌کاری'),
    ('KalaType', 'int', None, 'نوع کالا (جدول KalaType)'),
    ('KalaKhadamatName', 'text', 100, 'شرح کالا یا خدمات'),
    ('Price', 'int', None, 'مبلغ کالا یا خدمات (ریال)'),
    ('MaliatArzeshAfzoodeh', 'int', None, 'مالیات بر ارزش افزوده'),
    ('AvarezArzeshAfzoodeh', 'int', None, 'عوارض ارزش افزوده'),
    ('SayerAvarez', 'int', None, 'سایر عوارض'),
    ('TakhfifPrice', 'int', None, 'تخفیف'),
    ('MaliatMaksoore', 'int', None, 'مالیات مکسوره'),
    ('HCForoushandeTypeCode', 'int', None, 'نوع فروشنده (۱ حقیقی / ۲ حقوقی)'),
    ('ForoushandePostCode', 'text', 10, 'کد پستی فروشنده'),
    ('ForoushandeName', 'text', 50, 'نام فروشنده (شخص حقیقی)'),
    ('ForoushandeLastNameSherkatName', 'text', 100, 'نام خانوادگی / نام شرکت فروشنده'),
    ('ForoushandeEconomicNO', 'text', 12, 'کد اقتصادی فروشنده'),
    ('ForoushandeNationalCode', 'text', 13, 'کد ملی / شناسه ملی فروشنده'),
    ('ForoushandeAddress', 'text', 80, 'آدرس فروشنده'),
    ('HCForoushandeType1Code', 'int', None, 'وضعیت مودی فروشنده (۵/۶/۷)'),
    ('StateCode', 'int', None, 'کد استان (در HRMS موجود نیست)'),
    ('CityCode', 'int', None, 'کد شهر (در HRMS موجود نیست)'),
    ('ArzType', 'int', None, 'نوع ارز (معاملات ریالی خالی)'),
    ('FactorNo', 'text', 50, 'شمارهٔ صورتحساب'),
    ('FactorDate', 'text', 10, 'تاریخ صورتحساب (شمسی)'),
    ('SanadNO', 'int', None, 'شمارهٔ سند حسابداری'),
    ('SanadDate', 'text', 10, 'تاریخ سند حسابداری (شمسی)'),
    ('IsSent', 'bool', None, 'ارسال‌شده به سازمان'),
]

COLUMN_NAMES = [item[0] for item in DETAIL_COLUMNS]
COLUMN_KINDS = {item[0]: item[1] for item in DETAIL_COLUMNS}
COLUMN_LENGTHS = {item[0]: item[2] for item in DETAIL_COLUMNS}
COLUMN_LABELS = {item[0]: item[3] for item in DETAIL_COLUMNS}

DEFAULT_OPTIONS = {
    'kala_type': 12,
    'kala_name': 'کالا/خدمات',
    'seller_type1_code': None,      # None = خودکار بر اساس نوع شخص
    'continue_radif': True,
    'dry_run': False,
}



# ---------------------------------------------------------------------------
# ابزارهای پایه
# ---------------------------------------------------------------------------

def _text(value, limit=None):
    text = ' '.join(str(value if value is not None else '').split())
    return text[:limit] if limit else text


def _digits(value, limit=None):
    text = ''.join(ch for ch in str(value if value is not None else '') if ch.isdigit())
    return text[:limit] if limit else text


def _to_int(value):
    try:
        return int(Decimal(str(value if value not in (None, '') else 0).replace(',', '').strip() or 0))
    except (InvalidOperation, ValueError, TypeError):
        return 0


def _jalali(value, fallback=None):
    """تاریخ میلادی/شمسی → رشتهٔ شمسی ``YYYY/MM/DD`` (برای ستون‌های متنی TTMS)."""
    target = value or fallback
    if not target:
        return ''
    if isinstance(target, str):
        text = target.strip().replace('-', '/')
        parts = text.split('/')
        if len(parts) == 3 and all(part.isdigit() for part in parts):
            year = int(parts[0])
            if year < 1700:                      # ورودی از پیش شمسی است
                return f'{year:04d}/{int(parts[1]):02d}/{int(parts[2]):02d}'
    text = _jalali_text(target)
    return text.replace('-', '/')


def _jalali_year(report):
    """سال شمسی گزارش (کد سال در فایل TTMS)."""
    start = getattr(getattr(report, 'fiscal_year', None), 'start_date', None)
    try:
        import jdatetime

        if start:
            return jdatetime.date.fromgregorian(date=start).year
    except Exception:                             # noqa: BLE001 — سال از نام استخراج می‌شود
        pass
    name = _digits(getattr(getattr(report, 'fiscal_year', None), 'name', ''))
    return int(name) if name else 0


def normalize_options(options=None):
    """اعتبارسنجی و پیش‌فرض‌گذاری گزینه‌های بستهٔ درج."""
    options = dict(options or {})
    kala_type = _to_int(options.get('kala_type') or DEFAULT_OPTIONS['kala_type'])
    if kala_type not in {value for value, _label in KALA_TYPES}:
        kala_type = DEFAULT_OPTIONS['kala_type']

    status = options.get('seller_type1_code')
    if status in (None, '', 'auto', 'AUTO'):
        seller_type1_code = None
    else:
        seller_type1_code = _to_int(status)
        if seller_type1_code not in {value for value, _label in SELLER_STATUS_CODES}:
            seller_type1_code = None

    kala_name = _text(options.get('kala_name'), 100) or DEFAULT_OPTIONS['kala_name']
    return {
        'kala_type': kala_type,
        'kala_name': kala_name,
        'seller_type1_code': seller_type1_code,
        'continue_radif': bool(options.get('continue_radif', True)),
        'dry_run': bool(options.get('dry_run', False)),
    }


def ttms_reference():
    """نگاشت، گزینه‌ها و توضیحات بستهٔ درج (منبع واحد برای رابط کاربری)."""
    return {
        'package_version': PACKAGE_VERSION,
        'template_status': TEMPLATE_STATUS,
        'template_reference': TEMPLATE_REFERENCE,
        'tables': {'header': HEADER_TABLE, 'detail': DETAIL_TABLE},
        'defaults': dict(DEFAULT_OPTIONS),
        'kala_types': [{'value': value, 'label': label} for value, label in KALA_TYPES],
        'seller_status_codes': [
            {'value': value, 'label': label} for value, label in SELLER_STATUS_CODES
        ],
        'person_type_map': {
            key: {'type_code': code, 'type1_code': extra}
            for key, (code, extra) in PERSON_TYPE_CODES.items()
        },
        'columns': [
            {'name': name, 'kind': kind, 'length': length, 'label': label}
            for name, kind, length, label in DETAIL_COLUMNS
        ],
        'workflow': [
            'بستهٔ zip را دانلود و در ویندوز از حالت فشرده خارج کنید.',
            'اسکریپت fill_ttms.ps1 را در PowerShell (نه CMD) با پارامتر -Target مسیر فایل Access اجرا کنید.',
            'اسکریپت فقط روی «کپی» فایل می‌نویسد؛ فایل اصلی دست‌نخورده می‌ماند.',
            'فایل result.json را برای ثبت نتیجه در HRMS بارگذاری کنید.',
        ],
        'notes': [
            'ساختار روی کپی فایل مرجع TTMS آزمایش شده است (درج، بازخوانی و بازگردانی تراکنش).',
            'کدهای استان/شهر و شمارهٔ سند در HRMS موجود نیست و خالی ارسال می‌شود.',
            'کد اقتصادی فروشنده طبق دستور کارفرما ارسال نمی‌شود.',
            'همهٔ ردیف‌ها با نوع کالای «سایر» و «مشمول معاملات فصلی» گزارش می‌شوند.',
        ],
    }


# ---------------------------------------------------------------------------
# ساخت ردیف‌ها و بستهٔ zip
# ---------------------------------------------------------------------------

def row_payload(row, options=None, fallback_date=None):
    """یک ردیف فصلی → مقادیر آمادهٔ درج در ``Kharid_Detail``."""
    options = options or normalize_options()
    type_code, type1_code = PERSON_TYPE_CODES.get(row.person_type, (2, 7))
    if options.get('seller_type1_code') is not None:
        type1_code = options['seller_type1_code']

    first_name = _text(getattr(row, 'first_name', ''), COLUMN_LENGTHS['ForoushandeName'])
    last_name = _text(getattr(row, 'last_name', ''), COLUMN_LENGTHS['ForoushandeLastNameSherkatName'])
    title = _text(getattr(row, 'name', ''), COLUMN_LENGTHS['ForoushandeLastNameSherkatName'])
    full_name = _text(f'{first_name} {last_name}', COLUMN_LENGTHS['ForoushandeLastNameSherkatName'])
    if row.person_type == 'natural':
        seller_name = first_name or title
        seller_title = last_name or full_name or title or 'نامشخص'
    elif row.person_type == 'aggregate':
        seller_name = ''
        seller_title = title or 'تجمیعی'
    else:                                        # حقوقی / خارجی
        seller_name = ''
        seller_title = title or full_name or 'نامشخص'

    description = (_text(getattr(row, 'goods_service_desc', ''),
                         COLUMN_LENGTHS['KalaKhadamatName']) or options['kala_name'])
    factor_date = _jalali(getattr(row, 'invoice_date', None), fallback_date)
    national_id = _digits(getattr(row, 'national_id', ''),
                          COLUMN_LENGTHS['ForoushandeNationalCode'])

    values = {
        'Radif': 0,                              # در build_rows مقدار می‌گیرد
        'Sarjam': False,
        'IsHagholAmalKari': False,
        'KalaType': options['kala_type'],
        'KalaKhadamatName': description,
        'Price': _to_int(getattr(row, 'amount', 0)),
        'MaliatArzeshAfzoodeh': _to_int(getattr(row, 'vat', 0)),
        'AvarezArzeshAfzoodeh': 0,
        'SayerAvarez': 0,
        'TakhfifPrice': 0,
        'MaliatMaksoore': 0,
        'HCForoushandeTypeCode': type_code,
        'ForoushandePostCode': _digits(getattr(row, 'postal_code', ''),
                                       COLUMN_LENGTHS['ForoushandePostCode']),
        'ForoushandeName': seller_name,
        'ForoushandeLastNameSherkatName': seller_title,
        'ForoushandeEconomicNO': '',
        'ForoushandeNationalCode': national_id,
        'ForoushandeAddress': _text(getattr(row, 'address', ''),
                                    COLUMN_LENGTHS['ForoushandeAddress']),
        'HCForoushandeType1Code': type1_code,
        'StateCode': None,
        'CityCode': None,
        'ArzType': None,
        'FactorNo': _text(getattr(row, 'invoice_no', ''), COLUMN_LENGTHS['FactorNo']),
        'FactorDate': factor_date,
        'SanadNO': None,
        'SanadDate': '',
        'IsSent': False,
    }
    return {name: values.get(name) for name in COLUMN_NAMES}


def build_rows(report, rows, options=None):
    """ردیف‌های گزارش (فیلترشده) → لیست مقادیر آمادهٔ درج با شمارهٔ ردیف پیوسته."""
    options = normalize_options(options)
    fallback_date = getattr(report, 'period_end', None)
    payloads = []
    for index, row in enumerate(rows, start=1):
        payload = row_payload(row, options, fallback_date=fallback_date)
        payload['Radif'] = index
        payloads.append(payload)
    return payloads


def _csv_value(value):
    if value is None:
        return ''
    if value is True:
        return 'True'
    if value is False:
        return 'False'
    return value


def _csv_text(payloads):
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=COLUMN_NAMES, lineterminator='\r\n')
    writer.writeheader()
    for payload in payloads:
        writer.writerow({name: _csv_value(payload.get(name)) for name in COLUMN_NAMES})
    return '\ufeff' + buffer.getvalue()


def _totals(payloads):
    amount = sum(_to_int(item.get('Price')) for item in payloads)
    vat = sum(_to_int(item.get('MaliatArzeshAfzoodeh')) for item in payloads)
    return {'rows': len(payloads), 'amount': amount, 'vat': vat, 'total': amount + vat}



def build_manifest(report, payloads, options=None, filters=None, package_name=''):
    """فایل ``manifest.json``: مشخصات دوره، نگاشت، جمع‌های کنترلی و ستون‌ها."""
    options = normalize_options(options)
    totals = _totals(payloads)
    company_name, company_economic, company_national = _company_identity(report)
    period_start, period_end = report.period_range
    try:
        from accounting import seasonal_reconcile

        filters_label = seasonal_reconcile.describe_expression(
            (filters or {}).get('expression') or {},
        )
    except Exception:                              # noqa: BLE001 — برچسب اختیاری است
        filters_label = ''

    return {
        'package': {
            'version': PACKAGE_VERSION,
            'name': package_name,
            'created_at': datetime.now().replace(microsecond=0).isoformat(),
            'status': TEMPLATE_STATUS,
            'template_reference': TEMPLATE_REFERENCE,
        },
        'report': {
            'id': getattr(report, 'pk', None),
            'fiscal_year': getattr(getattr(report, 'fiscal_year', None), 'name', ''),
            'quarter': getattr(report, 'quarter', None),
            'quarter_label': (report.get_quarter_display()
                              if hasattr(report, 'get_quarter_display') else ''),
            'period_start': _jalali_text(period_start),
            'period_end': _jalali_text(period_end),
            'direction': DIRECTION_PURCHASE,
            'filters_label': filters_label,
        },
        'company': {
            'name': company_name,
            'national_id': company_national,
            'economic_code': company_economic,
        },
        'target': {
            'header_table': HEADER_TABLE,
            'detail_table': DETAIL_TABLE,
            'hc_year_code': _jalali_year(report),
            'hc_fasl_type_code': getattr(report, 'quarter', None) or 0,
            'is_sent': False,
        },
        'options': options,
        'mapping': {
            'person_type_codes': {
                key: {'type_code': code, 'type1_code': extra}
                for key, (code, extra) in PERSON_TYPE_CODES.items()
            },
            'kala_type': options['kala_type'],
            'kala_type_label': dict(KALA_TYPES).get(options['kala_type'], ''),
            'seller_type1_code': options['seller_type1_code'],
        },
        'totals': totals,
        'columns': [
            {'name': name, 'kind': kind, 'length': length, 'label': label}
            for name, kind, length, label in DETAIL_COLUMNS
        ],
        'rows_file': 'rows.csv',
        'notes': [
            'تاریخ‌های فاقد مقدار با پایان فصل پر می‌شوند.',
            'کد استان/شهر و شمارهٔ سند ارسال نمی‌شود (NULL).',
        ],
    }


def build_readme(manifest):
    """راهنمای فارسی داخل بسته."""
    totals = manifest['totals']
    report = manifest['report']
    lines = [
        'بستهٔ درج ردیف‌های صورت معاملات فصلی در فایل Access نسخهٔ TTMS',
        '=' * 70,
        '',
        f"شرکت: {manifest['company']['name'] or '—'}",
        f"دوره: {report['fiscal_year']} — {report['quarter_label']}",
        f"بازهٔ فصل: {report['period_start']} تا {report['period_end']}",
        f"فیلترهای اعمال‌شده: {report['filters_label'] or 'بدون فیلتر'}",
        '',
        'جمع‌های بسته:',
        f"  تعداد ردیف: {totals['rows']}",
        f"  جمع مبلغ: {totals['amount']}",
        f"  جمع مالیات بر ارزش افزوده: {totals['vat']}",
        '',
        'محتوای بسته:',
        '  rows.csv        مقادیر آمادهٔ درج (ستون‌های Kharid_Detail)',
        '  manifest.json   مشخصات دوره، نگاشت و جمع‌های کنترلی',
        '  fill_ttms.ps1   اسکریپت درج در کپی فایل Access',
        '  README.txt      همین راهنما',
        '',
        'اجرا (روی ویندوز، در PowerShell):',
        '  1) فایل‌های بسته را در یک پوشه از حالت فشرده خارج کنید.',
        '  2) پنجرهٔ PowerShell را در همان پوشه باز کنید و اجرا کنید:',
        '       .\\fill_ttms.ps1 -Target "C:\\مسیر\\TTMS_96_New.mdb"',
        '     اجرای آزمایشی (بدون تغییر ماندگار):',
        '       .\\fill_ttms.ps1 -Target "C:\\مسیر\\TTMS_96_New.mdb" -DryRun',
        '  3) اسکریپت یک کپی با پسوند «.filled-<زمان>» می‌سازد و ردیف‌ها را در همان',
        '     کپی درج می‌کند؛ فایل اصلی تغییر نمی‌کند. برای نوشتن روی خود فایل،',
        '     سوییچ -InPlace را اضافه کنید (پیش از آن پشتیبان تهیه می‌شود).',
        '  4) نتیجهٔ اجرا در فایل result.json نوشته می‌شود؛ آن را در HRMS بارگذاری',
        '     کنید تا در تاریخچهٔ همان گزارش ثبت شود.',
        '',
        'پیش‌نیازها:',
        '  - Microsoft Access Database Engine (ACE) 2010/2016 یا Microsoft Access',
        '  - PowerShell 5.1 یا جدیدتر',
        '',
        'نکته‌های مهم:',
        '  - کدهای استان/شهر، شمارهٔ سند و کد اقتصادی ارسال نمی‌شوند.',
        '  - همهٔ ردیف‌ها «مشمول معاملات فصلی» با نوع کالای «سایر» گزارش می‌شوند.',
        '  - در نبود سرصفحهٔ فصل در جدول Kharid، یک سرصفحهٔ جدید ساخته می‌شود.',
        f"  - وضعیت قالب: {manifest['package']['status']} "
        f"(آزمایش‌شده روی کپی {TEMPLATE_REFERENCE})",
    ]
    return '\r\n'.join(lines)


def filler_script():
    """متن اسکریپت PowerShell از پوشهٔ ``ttms_assets``."""
    path = ASSETS_DIR / FILLER_SCRIPT
    return path.read_text(encoding='utf-8-sig')


def build_package(report, rows, options=None, filters=None):
    """بستهٔ zip درج در فایل Access → ``(zip_bytes, filename, manifest)``."""
    options = normalize_options(options)
    payloads = build_rows(report, rows, options)
    csv_bytes = _csv_text(payloads).encode('utf-8')

    stamp = datetime.now().strftime('%Y%m%d-%H%M')
    year_key = _jalali_year(report) or 'year'
    quarter = getattr(report, 'quarter', '') or ''
    package_name = f'ttms-fill-purchase-{year_key}-q{quarter}-{stamp}.zip'

    manifest = build_manifest(report, payloads, options, filters, package_name=package_name)
    manifest['checksum'] = {'rows_file_sha256': hashlib.sha256(csv_bytes).hexdigest()}

    manifest_text = json.dumps(manifest, ensure_ascii=False, indent=2)
    readme_text = build_readme(manifest)

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('rows.csv', csv_bytes)
        archive.writestr('manifest.json', manifest_text.encode('utf-8'))
        archive.writestr('README.txt', readme_text.encode('utf-8-sig'))
        try:
            script_text = filler_script()
        except OSError:
            script_text = ''
        if script_text:
            archive.writestr(FILLER_SCRIPT, script_text.encode('utf-8-sig'))
    return buffer.getvalue(), package_name, manifest

