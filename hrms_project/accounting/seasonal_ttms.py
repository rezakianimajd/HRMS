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
from functools import lru_cache
from pathlib import Path

from accounting.seasonal import DIRECTION_PURCHASE, _company_identity, _jalali_text

PACKAGE_VERSION = 'ttms-fill-1.0'
TEMPLATE_STATUS = 'tested-on-copy'      # درج/بازخوانی روی کپی فایل مرجع آزمایش شده است
TEMPLATE_REFERENCE = 'TTMS_96_New.mdb'

HEADER_TABLE = 'Kharid'
DETAIL_TABLE = 'Kharid_Detail'

ASSETS_DIR = Path(__file__).resolve().parent / 'ttms_assets'
FILLER_SCRIPT = 'fill_ttms.ps1'
ZONE_ASSET = 'zone_codes.json'
ARZ_ASSET = 'arz_codes.json'
TAX_OFFICE_ASSET = 'edarekoll_codes.json'
COUNTRY_ASSET = 'country_names.json'

# ستون‌هایی که کاربر می‌تواند در «پیش‌نمایش» اصلاح کند (بقیه فقط نمایشی است)
EDITABLE_COLUMNS = [
    'StateCode',
    'CityCode',
    'KalaType',
    'HCForoushandeTypeCode',
    'HCForoushandeType1Code',
    'ForoushandePostCode',
    'ForoushandePerCityCode',
    'ForoushandeTell',
    'ForoushandeNationalCode',
    'ForoushandeName',
    'ForoushandeLastNameSherkatName',
    'ForoushandeAddress',
    'KalaKhadamatName',
    'Price',
    'MaliatArzeshAfzoodeh',
    'AvarezArzeshAfzoodeh',
    'SayerAvarez',
    'TakhfifPrice',
    'MaliatMaksoore',
    'BargashtType',
    'IsHagholAmalKari',
    'Sarjam',
    'ArzType',
    'Arz_Price',
    'Arz_MaliatArzeshAfzoodeh',
    'Arz_AvarezArzeshAfzoodeh',
    'Arz_SayerAvarez',
    'Arz_TakhfifPrice',
    'Arz_MaliatMaksoore',
    'MoadelRialiPrice',
    'MoadelRialiMaliatArzeshAfzoodeh',
    'FactorNo',
    'FactorDate',
    'SanadNO',
    'SanadDate',
]

# محدودهٔ مجاز ستون‌های عددی فایل TTMS (بر اساس نوع فیلد در Access)
COLUMN_RANGES = {
    'StateCode': (0, 255),
    'CityCode': (0, 2147483647),
    'KalaType': (1, 12),
    'HCForoushandeTypeCode': (1, 2),
    'HCForoushandeType1Code': (5, 7),
    'ArzType': (0, 32767),
    'SanadNO': (0, 2147483647),
    'Radif': (0, 2147483647),
    'Price': (0, 10 ** 15),
    'MaliatArzeshAfzoodeh': (0, 10 ** 15),
    'AvarezArzeshAfzoodeh': (0, 10 ** 15),
    'SayerAvarez': (0, 10 ** 15),
    'TakhfifPrice': (0, 10 ** 15),
    'MaliatMaksoore': (0, 10 ** 15),
    'Arz_Price': (0, 10 ** 15),
    'Arz_MaliatArzeshAfzoodeh': (0, 10 ** 15),
    'Arz_AvarezArzeshAfzoodeh': (0, 10 ** 15),
    'Arz_SayerAvarez': (0, 10 ** 15),
    'Arz_TakhfifPrice': (0, 10 ** 15),
    'Arz_MaliatMaksoore': (0, 10 ** 15),
    'MoadelRialiPrice': (0, 10 ** 15),
    'MoadelRialiMaliatArzeshAfzoodeh': (0, 10 ** 15),
}



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

# ستون‌های rows.csv — کامل و به همان ترتیب فیلدهای جدول Kharid_Detail فایل مرجع
# (name, kind, max_length, label, note)
# kind: int | text | bool | guid (فیلد GUID بدون منبع در HRMS؛ خالی ارسال می‌شود)
DETAIL_COLUMNS = [
    ('Radif', 'int', None, 'شمارهٔ ردیف', 'شمارهٔ ترتیبی درج (ادامهٔ ردیف‌های فایل)'),
    ('Sarjam', 'bool', None, 'سرجمع', 'ردیف‌های عادی همیشه «خیر»'),
    ('IsHagholAmalKari', 'bool', None, 'از طریق حق‌العمل‌کاری', 'قابل تنظیم برای ردیف یا همه'),
    ('KalaType', 'int', None, 'نوع کالا (جدول KalaType)', 'کد ۱..۱۲ از جدول KalaType'),
    ('KalaKhadamatName', 'text', 100, 'شرح کالا یا خدمات', 'از شرح ردیف گزارش فصلی'),
    ('KalaCode', 'guid', None, 'شناسهٔ کالا (GUID)', 'شناسهٔ کالای TTMS؛ منبعی در HRMS ندارد'),
    ('BargashtType', 'bool', None, 'برگشتی', 'برای ردیف‌های برگشتی «بله»'),
    ('Price', 'int', None, 'مبلغ کالا یا خدمات (ریال)', 'مبلغ ردیف گزارش فصلی'),
    ('MaliatArzeshAfzoodeh', 'int', None, 'مالیات بر ارزش افزوده', 'مالیات ردیف گزارش فصلی'),
    ('AvarezArzeshAfzoodeh', 'int', None, 'عوارض ارزش افزوده', 'پیش‌فرض صفر؛ قابل اصلاح'),
    ('SayerAvarez', 'int', None, 'سایر عوارض', 'پیش‌فرض صفر؛ قابل اصلاح'),
    ('TakhfifPrice', 'int', None, 'تخفیف', 'پیش‌فرض صفر؛ قابل اصلاح'),
    ('MaliatMaksoore', 'int', None, 'مالیات مکسوره', 'پیش‌فرض صفر؛ قابل اصلاح'),
    ('HCForoushandeTypeCode', 'int', None, 'نوع فروشنده (۱ حقیقی / ۲ حقوقی)', 'خودکار از نوع شخص'),
    ('ForoushandePostCode', 'text', 10, 'کد پستی فروشنده', 'از کد پستی ردیف'),
    ('ForoushandePerCityCode', 'text', 10, 'پیش‌شمارهٔ شهر فروشنده', 'پیش‌فرض خالی؛ قابل اصلاح'),
    ('ForoushandeTell', 'text', 50, 'تلفن فروشنده', 'پیش‌فرض خالی؛ قابل اصلاح'),
    ('ForoushandeAddress', 'text', 80, 'آدرس فروشنده', 'از آدرس ردیف'),
    ('ForoushandeName', 'text', 50, 'نام فروشنده (شخص حقیقی)', 'نام شخص حقیقی'),
    ('ForoushandeLastNameSherkatName', 'text', 100, 'نام خانوادگی / نام شرکت فروشنده', 'الزامی‌ترین ستون فروشنده'),
    ('ForoushandeEconomicNO', 'text', 12, 'کد اقتصادی فروشنده', 'طبق دستور کارفرما ارسال نمی‌شود'),
    ('ForoushandeNationalCode', 'text', 13, 'کد ملی / شناسه ملی فروشنده', 'از شناسهٔ ملی ردیف'),
    ('HCForoushandeType1Code', 'int', None, 'وضعیت مودی فروشنده (۵/۶/۷)', 'خودکار؛ قابل بازنویسی'),
    ('StateCode', 'int', None, 'کد استان (جدول Zone)', 'تشخیص خودکار از نام استان'),
    ('CityCode', 'int', None, 'کد شهر (جدول Zone)', 'تشخیص خودکار از نام شهر'),
    ('ArzType', 'int', None, 'نوع ارز (جدول Arz)', 'برای معاملات ریالی خالی'),
    ('Arz_Price', 'int', None, 'مبلغ ارزی', 'فقط برای معاملات ارزی'),
    ('Arz_MaliatArzeshAfzoodeh', 'int', None, 'مالیات ارزی', 'فقط برای معاملات ارزی'),
    ('Arz_AvarezArzeshAfzoodeh', 'int', None, 'عوارض ارزی', 'فقط برای معاملات ارزی'),
    ('Arz_SayerAvarez', 'int', None, 'سایر عوارض ارزی', 'فقط برای معاملات ارزی'),
    ('Arz_TakhfifPrice', 'int', None, 'تخفیف ارزی', 'فقط برای معاملات ارزی'),
    ('Arz_MaliatMaksoore', 'int', None, 'مالیات مکسورهٔ ارزی', 'فقط برای معاملات ارزی'),
    ('ArzBarabari_Price', 'guid', None, 'نرخ برابری ارز مبلغ (GUID)', 'مرجع نرخ ارز TTMS؛ خارج از دامنهٔ HRMS'),
    ('ArzBarabari_TakhfifPrice', 'guid', None, 'نرخ برابری ارز تخفیف (GUID)', 'مرجع نرخ ارز TTMS'),
    ('ArzBarabari_MaliatArzeshAfzoodeh', 'guid', None, 'نرخ برابری ارز مالیات (GUID)', 'مرجع نرخ ارز TTMS'),
    ('ArzBarabari_AvarezArzeshAfzoodeh', 'guid', None, 'نرخ برابری ارز عوارض (GUID)', 'مرجع نرخ ارز TTMS'),
    ('ArzBarabari_SayerAvarez', 'guid', None, 'نرخ برابری ارز سایر عوارض (GUID)', 'مرجع نرخ ارز TTMS'),
    ('ArzBarabari_MaliatMaksoore', 'guid', None, 'نرخ برابری ارز مالیات مکسوره (GUID)', 'مرجع نرخ ارز TTMS'),
    ('MoadelRialiPrice', 'int', None, 'معادل ریالی مبلغ ارزی', 'در معاملهٔ ارزی خودکار پر می‌شود'),
    ('MoadelRialiTakhfifPrice', 'int', None, 'معادل ریالی تخفیف ارزی', 'در معاملهٔ ارزی خودکار پر می‌شود'),
    ('MoadelRialiMaliatArzeshAfzoodeh', 'int', None, 'معادل ریالی مالیات ارزی', 'در معاملهٔ ارزی خودکار پر می‌شود'),
    ('MoadelRialiAvarezArzeshAfzoodeh', 'int', None, 'معادل ریالی عوارض ارزی', 'در معاملهٔ ارزی خودکار پر می‌شود'),
    ('MoadelRialiSayerAvarez', 'int', None, 'معادل ریالی سایر عوارض ارزی', 'در معاملهٔ ارزی خودکار پر می‌شود'),
    ('MoadelRialiMaliatMaksoore', 'int', None, 'معادل ریالی مالیات مکسورهٔ ارزی', 'در معاملهٔ ارزی خودکار پر می‌شود'),
    ('FactorNo', 'text', 50, 'شمارهٔ صورتحساب', 'از شمارهٔ فاکتور ردیف'),
    ('FactorDate', 'text', 10, 'تاریخ صورتحساب (شمسی)', 'شمسی؛ در صورت خالی بودن پایان فصل'),
    ('SanadNO', 'int', None, 'شمارهٔ سند حسابداری', 'اختیاری؛ قابل اصلاح'),
    ('SanadDate', 'text', 10, 'تاریخ سند حسابداری (شمسی)', 'اختیاری؛ قابل اصلاح'),
    ('IsSent', 'bool', None, 'ارسال‌شده به سازمان', 'همیشه «خیر» تا در TTMS ارسال شود'),
]

COLUMN_NAMES = [item[0] for item in DETAIL_COLUMNS]
COLUMN_KINDS = {item[0]: item[1] for item in DETAIL_COLUMNS}
COLUMN_LENGTHS = {item[0]: item[2] for item in DETAIL_COLUMNS}
COLUMN_LABELS = {item[0]: item[3] for item in DETAIL_COLUMNS}
COLUMN_NOTES = {item[0]: item[4] for item in DETAIL_COLUMNS}
GUID_COLUMNS = tuple(name for name, kind, *_rest in DETAIL_COLUMNS if kind == 'guid')

DEFAULT_OPTIONS = {
    'kala_type': 12,
    'kala_name': 'کالا/خدمات',
    'seller_type1_code': None,      # None = خودکار بر اساس نوع شخص
    'continue_radif': True,
    'dry_run': False,
    'auto_zone': True,              # تشخیص خودکار کد استان/شهر از نام استان/شهر طرف معامله
    'tax_office_code': None,        # ادارهٔ کل امور مالیاتی (جدول EdareKol)
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


def _normalize_zone(text, strip_prefix=True):
    """نرمال‌سازی نام استان/شهر برای تطبیق با جدول Zone فایل TTMS."""
    value = str(text if text is not None else '')
    value = (value.replace('ي', 'ی').replace('ك', 'ک')
                  .replace('\u064a', 'ی').replace('\u0643', 'ک'))
    value = value.replace('\u200c', ' ').replace('\u200f', ' ').replace('\u200e', ' ')
    value = ' '.join(value.split())
    if strip_prefix and value.startswith('استان '):
        value = value[len('استان '):]
    return value


@lru_cache(maxsize=1)
def _zones():
    """کدهای استان/شهر نسخهٔ TTMS (از جدول Zone فایل مرجع) + نمایهٔ تطبیق نام."""
    path = ASSETS_DIR / ZONE_ASSET
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return [], {}, {}, {}
    provinces = [{'code': int(code), 'name': name} for code, name in data.get('provinces', [])]
    cities = {
        str(code): [{'code': int(city_code), 'name': city_name} for city_code, city_name in items]
        for code, items in (data.get('cities') or {}).items()
    }
    province_index, city_index = {}, {}
    for province in provinces:
        province_index[_normalize_zone(province['name'])] = province['code']
    for code, items in cities.items():
        bucket = {}
        for item in items:
            bucket.setdefault(_normalize_zone(item['name'], strip_prefix=False), item['code'])
        city_index[code] = bucket
    return provinces, cities, province_index, city_index


def zone_provinces():
    """فهرست استان‌های TTMS (کد + نام)."""
    return list(_zones()[0])


def zone_cities(province_code=None):
    """فهرست شهرهای یک استان (در صورت نبود کد، فهرست خالی)."""
    if province_code in (None, ''):
        return []
    return list(_zones()[1].get(str(province_code), []))


@lru_cache(maxsize=1)
def currency_codes():
    """کدهای ارز نسخهٔ TTMS (جدول ``Arz``) برای معاملات ارزی."""
    path = ASSETS_DIR / ARZ_ASSET
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return []
    return [{'code': int(code), 'name': name} for code, name in data.get('currencies', [])]


@lru_cache(maxsize=1)
def tax_offices():
    """اداره‌های کل امور مالیاتی (جدول ``EdareKol``) برای پروفایل مؤدی در TTMS."""
    path = ASSETS_DIR / TAX_OFFICE_ASSET
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return []
    return [
        {'code': int(code), 'name': name, 'province_code': int(province)}
        for code, name, province in data.get('offices', [])
    ]


def suggested_tax_office(state_code):
    """ادارهٔ کل پیشنهادی بر اساس کد استان (اولین ادارهٔ همان استان)."""
    if state_code in (None, ''):
        return None
    for office in tax_offices():
        if office['province_code'] == int(state_code):
            return office
    return None


def _tax_office_name(code):
    """نام ادارهٔ کل از روی کد آن."""
    if code in (None, ''):
        return ''
    for office in tax_offices():
        if office['code'] == int(code):
            return office['name']
    return ''


@lru_cache(maxsize=1)
def country_names():
    """فهرست کشورها (نام فارسی) برای انتخاب/جستجو در جدول و نگاشت TTMS."""
    path = ASSETS_DIR / COUNTRY_ASSET
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return ['ایران']
    names = [str(name).strip() for name in data.get('countries', []) if str(name).strip()]
    return names or ['ایران']


def geo_options(province_code=None):
    """گزینه‌های جغرافیایی مشترک رابط کاربری: کشورها، استان‌ها و شهرهای یک استان."""
    provinces = zone_provinces()
    if province_code not in (None, ''):
        return {
            'province': province_code,
            'cities': zone_cities(province_code),
        }
    return {
        'countries': country_names(),
        'provinces': provinces,
    }


def match_zone(province_text, city_text=''):
    """نام استان/شهر متنی → (کد استان، کد شهر) بر اساس جدول Zone."""
    _provinces, _cities, province_index, city_index = _zones()
    province_key = _normalize_zone(province_text)
    state_code = province_index.get(province_key) if province_key else None
    if state_code is None and province_key:
        for name, code in province_index.items():
            if province_key in name or name in province_key:
                state_code = code
                break
    if state_code is None:
        return None, None
    city_key = _normalize_zone(city_text, strip_prefix=False)
    if not city_key:
        return state_code, None
    bucket = city_index.get(str(state_code), {})
    city_code = bucket.get(city_key)
    if city_code is None:
        for name, code in bucket.items():
            if city_key in name or name in city_key:
                city_code = code
                break
    return state_code, city_code


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
    tax_office_code = options.get('tax_office_code')
    if tax_office_code in (None, '', 'auto'):
        tax_office_code = None
    else:
        tax_office_code = _to_int(tax_office_code)
        if not any(office['code'] == tax_office_code for office in tax_offices()):
            tax_office_code = None
    return {
        'kala_type': kala_type,
        'kala_name': kala_name,
        'seller_type1_code': seller_type1_code,
        'continue_radif': bool(options.get('continue_radif', True)),
        'dry_run': bool(options.get('dry_run', False)),
        'auto_zone': bool(options.get('auto_zone', True)),
        'tax_office_code': tax_office_code,
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
        'columns': _column_spec(),
        'coverage': column_coverage(),
        'editable': list(EDITABLE_COLUMNS),
        'column_ranges': {key: list(value) for key, value in COLUMN_RANGES.items()},
        'zone_source': f'{TEMPLATE_REFERENCE} :: Zone',
        'provinces': zone_provinces(),
        'currencies': currency_codes(),
        'tax_offices': tax_offices(),
        'workflow': [
            'بستهٔ zip را دانلود و در ویندوز از حالت فشرده خارج کنید.',
            'اسکریپت fill_ttms.ps1 را در PowerShell (نه CMD) با پارامتر -Target مسیر فایل Access اجرا کنید.',
            'اسکریپت فقط روی «کپی» فایل می‌نویسد؛ فایل اصلی دست‌نخورده می‌ماند.',
            'ردیف‌های تکراری (شمارهٔ فاکتور + شناسهٔ ملی + مبلغ) به‌طور پیش‌فرض درج نمی‌شوند؛ برای درج اجباری از -AllowDuplicates استفاده کنید.',
            'فایل result.json را برای ثبت نتیجه در HRMS بارگذاری کنید.',
        ],
        'notes': [
            'ساختار روی کپی فایل مرجع TTMS آزمایش شده است (درج، بازخوانی و بازگردانی تراکنش).',
            'کد استان/شهر از جدول Zone همان فایل TTMS خوانده و از نام استان/شهر طرف معامله تشخیص داده می‌شود؛ در پیش‌نمایش قابل اصلاح است.',
            'کد اقتصادی فروشنده طبق دستور کارفرما ارسال نمی‌شود.',
            'همهٔ ردیف‌ها با نوع کالای «سایر» و «مشمول معاملات فصلی» گزارش می‌شوند.',
        ],
    }


# ---------------------------------------------------------------------------
# ساخت ردیف‌ها و بستهٔ zip
# ---------------------------------------------------------------------------

def row_payload(row, options=None, fallback_date=None):
    """یک ردیف فصلی → مقادیر آمادهٔ درج در ``Kharid_Detail``."""
    options = normalize_options(options)
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
    state_code, city_code = None, None
    if options.get('auto_zone', True):
        state_code, city_code = match_zone(
            getattr(row, 'province', ''), getattr(row, 'city', ''),
        )

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
        'StateCode': state_code,
        'CityCode': city_code,
        'ArzType': None,
        'Arz_Price': None,
        'Arz_MaliatArzeshAfzoodeh': None,
        'Arz_AvarezArzeshAfzoodeh': None,
        'Arz_SayerAvarez': None,
        'Arz_TakhfifPrice': None,
        'Arz_MaliatMaksoore': None,
        'ArzBarabari_Price': None,
        'ArzBarabari_TakhfifPrice': None,
        'ArzBarabari_MaliatArzeshAfzoodeh': None,
        'ArzBarabari_AvarezArzeshAfzoodeh': None,
        'ArzBarabari_SayerAvarez': None,
        'ArzBarabari_MaliatMaksoore': None,
        'MoadelRialiPrice': None,
        'MoadelRialiTakhfifPrice': None,
        'MoadelRialiMaliatArzeshAfzoodeh': None,
        'MoadelRialiAvarezArzeshAfzoodeh': None,
        'MoadelRialiSayerAvarez': None,
        'MoadelRialiMaliatMaksoore': None,
        'ForoushandePerCityCode': '',
        'ForoushandeTell': '',
        'KalaCode': None,
        'BargashtType': False,
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


# ---------------------------------------------------------------------------
# پیش‌نمایش و اصلاح مقادیر (پیش از ساخت بسته)
# ---------------------------------------------------------------------------

DATE_COLUMNS = ('FactorDate', 'SanadDate')


class OverridesError(ValueError):
    """مقادیر اصلاح‌شدهٔ کاربر معتبر نیست (پیام‌ها در ``errors``)."""

    def __init__(self, errors):
        super().__init__('invalid overrides')
        self.errors = list(errors or [])


def _row_key(row):
    """کلید پایدار یک ردیف فصلی برای نگاشت اصلاح‌های کاربر."""
    value = getattr(row, 'pk', None) or getattr(row, 'id', None) or getattr(row, 'line_no', None)
    return str(value if value is not None else '')


def _clean_override_value(column, value):
    """اعتبارسنجی/تبدیل یک مقدار اصلاح‌شده → ``(value, error)``."""
    label = COLUMN_LABELS.get(column, column)
    kind = COLUMN_KINDS.get(column)
    if kind == 'bool':
        if isinstance(value, bool):
            return value, None
        text = str(value if value is not None else '').strip().lower()
        if text in ('1', 'true', 'yes', 'بله', 'درست'):
            return True, None
        if text in ('0', 'false', 'no', 'خیر', 'نه', ''):
            return False, None
        return None, f'مقدار «{label}» باید بله یا خیر باشد.'
    if kind == 'guid':
        return None, f'«{label}» شناسهٔ GUID است و از HRMS قابل تولید نیست.'
    if kind == 'int':
        text = _digits(value)
        if not text:
            return None, None
        number = int(text)
        low, high = COLUMN_RANGES.get(column, (None, None))
        if low is not None and not (low <= number <= high):
            return None, f'مقدار {number} برای «{label}» باید بین {low} و {high} باشد.'
        return number, None

    text = _text(value, COLUMN_LENGTHS.get(column))
    if column == 'ForoushandeNationalCode':
        text = _digits(text, COLUMN_LENGTHS.get(column))
    if column in DATE_COLUMNS and text and not _is_jalali_text(text):
        return None, f'«{label}» باید به شکل ۱۴۰۵/۰۱/۲۱ باشد (تاریخ شمسی).'
    if column in ('ForoushandePostCode',) and text and len(text) != 10:
        return None, 'کد پستی باید ۱۰ رقم باشد.'
    return text, None


def _is_jalali_text(text):
    import re

    return bool(re.fullmatch(r'\d{4}/\d{2}/\d{2}', str(text)))


def normalize_overrides(raw, keys=None):
    """اصلاح‌های سطری کاربر → ``(clean, errors)``.

    ``raw`` به شکل ``{'<row_key>': {'StateCode': 10, ...}}`` است؛ فقط ستون‌های
    قابل ویرایش پذیرفته می‌شوند و مقدار خالی یعنی «پاک کردن» مقدار خودکار.
    """
    raw = raw if isinstance(raw, dict) else {}
    allowed = {str(key) for key in (keys or [])}
    clean, errors = {}, []
    for row_key, values in raw.items():
        key = str(row_key)
        if allowed and key not in allowed:
            continue
        if not isinstance(values, dict):
            continue
        bucket = {}
        for column, value in values.items():
            if column not in EDITABLE_COLUMNS:
                continue
            if isinstance(value, str) and not value.strip():
                bucket[column] = None
                continue
            cleaned, error = _clean_override_value(column, value)
            if error:
                errors.append({'row': key, 'column': column, 'message': error})
                continue
            bucket[column] = cleaned
        if bucket:
            clean[key] = bucket
    return clean, errors


def normalize_defaults(raw):
    """مقادیر «اعمال به همه» → ``(clean, errors)`` (مقدار خالی نادیده گرفته می‌شود)."""
    raw = raw if isinstance(raw, dict) else {}
    clean, errors = {}, []
    for column, value in raw.items():
        if column not in EDITABLE_COLUMNS:
            continue
        if value is None or (isinstance(value, str) and not value.strip()):
            continue
        cleaned, error = _clean_override_value(column, value)
        if error:
            errors.append({'row': '*', 'column': column, 'message': error})
            continue
        clean[column] = cleaned
    return clean, errors


def apply_overrides(payloads, keys, overrides=None, defaults=None):
    """اعمال «اعمال به همه» و سپس اصلاح‌های سطری روی مقادیر نگاشت‌شده."""
    overrides = overrides or {}
    defaults = defaults or {}
    for index, payload in enumerate(payloads):
        key = keys[index] if index < len(keys) else str(index + 1)
        for column, value in defaults.items():
            if column in payload:
                payload[column] = value
        for column, value in (overrides.get(key) or {}).items():
            if column in payload:
                payload[column] = value
    return _apply_currency_defaults(payloads)


CURRENCY_PAIRS = (
    ('Arz_Price', 'MoadelRialiPrice', 'Price'),
    ('Arz_TakhfifPrice', 'MoadelRialiTakhfifPrice', 'TakhfifPrice'),
    ('Arz_MaliatArzeshAfzoodeh', 'MoadelRialiMaliatArzeshAfzoodeh', 'MaliatArzeshAfzoodeh'),
    ('Arz_AvarezArzeshAfzoodeh', 'MoadelRialiAvarezArzeshAfzoodeh', 'AvarezArzeshAfzoodeh'),
    ('Arz_SayerAvarez', 'MoadelRialiSayerAvarez', 'SayerAvarez'),
    ('Arz_MaliatMaksoore', 'MoadelRialiMaliatMaksoore', 'MaliatMaksoore'),
)


def company_profile(report):
    """اطلاعات مؤدی (شرکت) برای تکمیل یک‌بارهٔ جدول ``Moshakhasat`` در TTMS.

    TTMS پیش از ارسال، پروفایل مؤدی را در جدول Moshakhasat لازم دارد؛ این اطلاعات
    در HRMS وجود دارد و در manifest/README بسته آورده می‌شود تا کاربر یک‌بار آن را
    در خود TTMS ثبت کند (نوشتن مستقیم در این جدول به‌دلیل فیلدهای GUID اجباری
    انجام نمی‌شود).
    """
    name, economic_code, national_id = _company_identity(report)
    profile = {
        'moady_name': _text(name, 250),
        'national_code': _digits(national_id, 11),
        'economic_code': _digits(economic_code, 20),
        'registration_no': '',
        'postal_code': '',
        'address': '',
        'tel_code': '',
        'tel_no': '',
        'fax_no': '',
        'mobile_no': '',
        'tax_office_code': None,
        'tax_office_name': '',
        'source': 'Company / CompanyProfile',
    }
    try:
        from settings_app.models import CompanyProfile

        record = CompanyProfile.objects.filter(company_id=getattr(report, 'company_id', None)).first()
        if record:
            profile.update({
                'moady_name': _text(record.legal_name or name, 250),
                'national_code': _digits(record.national_id, 11),
                'economic_code': _digits(record.economic_code, 20),
                'registration_no': _digits(record.registration_number, 13),
                'postal_code': _digits(record.postal_code, 10),
                'address': _text(record.address, 70),
                'tel_no': _text(record.phone, 50),
                'mobile_no': _digits(getattr(record, 'mobile', ''), 11),
            })
    except Exception:                              # noqa: BLE001 — پروفایل اختیاری است
        pass
    return profile


def _apply_currency_defaults(payloads):
    """در معاملهٔ ارزی، «معادل ریالی» هر جزء ارزی از مقدار ریالی همان جزء پر می‌شود."""
    for payload in payloads:
        if not payload.get('ArzType'):
            continue
        for arz_column, moadel_column, rial_column in CURRENCY_PAIRS:
            if payload.get(moadel_column) in (None, ''):
                payload[moadel_column] = payload.get(rial_column) or 0
    return payloads


def _zone_label(state_code, city_code):
    """نام استان/شهر برای نمایش در پیش‌نمایش (از جدول Zone)."""
    provinces, cities, _index, _city_index = _zones()
    province_name = ''
    for province in provinces:
        if province['code'] == state_code:
            province_name = province['name']
            break
    city_name = ''
    for city in cities.get(str(state_code), []):
        if city['code'] == city_code:
            city_name = city['name']
            break
    return province_name, city_name


def _quality_report(payloads, rows, report):
    """هشدار/خطاهای کیفیت دادهٔ خروجی TTMS + ردیف‌های نیازمند اصلاح."""
    provinces = {province['code'] for province in zone_provinces()}
    city_index = {str(code): {city['code'] for city in items}
                  for code, items in _zones()[1].items()}
    period_start = _jalali_text(report.period_range[0])
    period_end = _jalali_text(report.period_range[1])
    total = len(payloads)

    counters = {}
    needs_fix = set()

    def bump(code, key=None):
        counters[code] = counters.get(code, 0) + 1
        if key is not None:
            needs_fix.add(key)

    invoice_keys = {}
    for index, payload in enumerate(payloads):
        key = _row_key(rows[index]) if index < len(rows) else str(index + 1)
        state = payload.get('StateCode')
        city = payload.get('CityCode')
        amount = _to_int(payload.get('Price'))
        vat = _to_int(payload.get('MaliatArzeshAfzoodeh'))
        date = str(payload.get('FactorDate') or '')
        national = str(payload.get('ForoushandeNationalCode') or '')
        postal = str(payload.get('ForoushandePostCode') or '')
        person_type = getattr(rows[index], 'person_type', '') if index < len(rows) else ''

        if state in (None, ''):
            bump('state_code', key)
        elif state not in provinces:
            bump('state_unknown', key)
        elif city not in (None, ''):
            allowed = city_index.get(str(state))
            if allowed and city not in allowed:
                bump('city_mismatch', key)
        if city in (None, ''):
            bump('city_code', key)
        if not date:
            bump('factor_date', key)
        elif period_start and date < period_start or (period_end and date > period_end):
            bump('date_outside', key)
        if not national:
            bump('national_code', key)
        elif person_type == 'legal' and len(national) != 11:
            bump('national_length', key)
        elif person_type == 'natural' and len(national) != 10:
            bump('national_length', key)
        if postal and len(postal) != 10:
            bump('postal_code', key)
        if amount <= 0:
            bump('zero_amount', key)
        elif vat > 0 and vat * 10 > amount + 10:
            bump('vat_ratio', key)
        discount = _to_int(payload.get('TakhfifPrice'))
        if discount > amount:
            bump('discount_gt_amount', key)
        if payload.get('BargashtType'):
            bump('return_row')
        if payload.get('IsHagholAmalKari'):
            bump('commission_row')
        currency = payload.get('ArzType')
        fx_amount = _to_int(payload.get('Arz_Price'))
        if currency:
            if fx_amount <= 0:
                bump('currency_missing_amount', key)
            bump('fx_rate_manual')
        elif fx_amount > 0:
            bump('currency_missing_type', key)
        invoice_no = str(payload.get('FactorNo') or '')
        if not invoice_no:
            bump('missing_invoice', key)
        elif invoice_no and national:
            invoice_keys.setdefault((invoice_no, national), []).append(key)

    for keys in invoice_keys.values():
        if len(keys) > 1:
            for key in keys:
                bump('duplicate_invoice', key)

    messages = {
        'state_code': ('کد استان ندارد؛ از ستون «استان» انتخاب کنید.', 'warning', 'StateCode'),
        'state_unknown': ('کد استان در جدول Zone نسخهٔ TTMS وجود ندارد.', 'error', 'StateCode'),
        'city_code': ('کد شهر ندارد (اختیاری است، ولی برای ارسال دقیق‌تر بهتر است).', 'info', 'CityCode'),
        'city_mismatch': ('کد شهر با استان انتخاب‌شده هم‌خوان نیست.', 'warning', 'CityCode'),
        'factor_date': ('تاریخ صورتحساب ندارد؛ پایان فصل جایگزین شده است.', 'warning', 'FactorDate'),
        'date_outside': ('تاریخ صورتحساب بیرون از بازهٔ فصل است.', 'warning', 'FactorDate'),
        'national_code': ('شناسهٔ ملی / کد ملی ندارد.', 'warning', 'ForoushandeNationalCode'),
        'national_length': ('طول شناسهٔ ملی/کد ملی با نوع شخص نمی‌خواند (حقوقی ۱۱ / حقیقی ۱۰).',
                            'warning', 'ForoushandeNationalCode'),
        'postal_code': ('کد پستی ۱۰ رقمی نیست.', 'warning', 'ForoushandePostCode'),
        'zero_amount': ('مبلغ صفر یا منفی است.', 'warning', 'Price'),
        'vat_ratio': ('مالیات بیشتر از ۱۰٪ مبلغ است؛ بررسی کنید.', 'warning', 'MaliatArzeshAfzoodeh'),
        'missing_invoice': ('شمارهٔ فاکتور ندارد.', 'warning', 'FactorNo'),
        'duplicate_invoice': ('ترکیب شمارهٔ فاکتور و شناسهٔ ملی در این خروجی تکرار شده است.',
                              'warning', 'FactorNo'),
        'discount_gt_amount': ('تخفیف بیشتر از مبلغ ردیف است؛ بررسی کنید.', 'warning', 'TakhfifPrice'),
        'return_row': ('ردیف به‌عنوان «برگشتی» علامت خورده است.', 'info', 'BargashtType'),
        'commission_row': ('ردیف «از طریق حق‌العمل‌کاری» علامت خورده است.', 'info', 'IsHagholAmalKari'),
        'currency_missing_amount': ('نوع ارز انتخاب شده ولی مبلغ ارزی خالی است.',
                                    'warning', 'Arz_Price'),
        'currency_missing_type': ('مبلغ ارزی وارد شده ولی نوع ارز انتخاب نشده است.',
                                  'warning', 'ArzType'),
        'fx_rate_manual': ('برای ردیف ارزی، «نرخ برابری ارز» (GUID) باید در خود TTMS ثبت شود.',
                           'info', 'ArzBarabari_Price'),
    }

    warnings = []
    for code, count in sorted(counters.items(), key=lambda item: item[0]):
        message, level, column = messages.get(code, ('', 'warning', ''))
        warnings.append({
            'code': code, 'level': level, 'count': count, 'column': column,
            'message': f'{count} از {total} ردیف: {message}' if message else f'{count} ردیف',
        })
    return warnings, needs_fix


def _preview_warnings(payloads):
    """سازگاری عقب‌رو: هشدارهای ساده بدون اطلاعات ردیف‌ها."""
    return _quality_report(payloads, [], _FakePeriod())[0]


class _FakePeriod:
    period_range = ('', '')



def _column_spec():
    """مشخصات کامل ستون‌های خروجی TTMS برای رابط کاربری (وضعیت پشتیبانی و منبع)."""
    return [
        {
            'name': name,
            'kind': kind,
            'length': length,
            'label': label,
            'note': COLUMN_NOTES.get(name, ''),
            'editable': name in EDITABLE_COLUMNS,
            'supported': kind != 'guid',
            'range': list(COLUMN_RANGES[name]) if name in COLUMN_RANGES else None,
        }
        for name, kind, length, label, _note in DETAIL_COLUMNS
    ]


def column_coverage():
    """خلاصهٔ پوشش ستون‌های Kharid_Detail: کامل / قابل اصلاح / خارج از دامنهٔ HRMS."""
    editable = set(EDITABLE_COLUMNS)
    coverage = {'total': len(DETAIL_COLUMNS), 'editable': [], 'auto': [],
                'out_of_scope': []}
    for name, kind, _length, label, note in DETAIL_COLUMNS:
        entry = {'name': name, 'label': label, 'note': note}
        if kind == 'guid':
            coverage['out_of_scope'].append(entry)
        elif name in editable:
            coverage['editable'].append(entry)
        else:
            coverage['auto'].append(entry)
    coverage['counts'] = {
        'editable': len(coverage['editable']),
        'auto': len(coverage['auto']),
        'out_of_scope': len(coverage['out_of_scope']),
    }
    return coverage


def preview(report, rows, options=None, filters=None, overrides=None, defaults=None):
    """پیش‌نمایش مقادیری که در ``Kharid_Detail`` نوشته می‌شود (قابل اصلاح)."""
    options = normalize_options(options)
    rows = list(rows)
    payloads = build_rows(report, rows, options)
    keys = [_row_key(row) for row in rows]
    clean_overrides, errors = normalize_overrides(overrides, keys)
    clean_defaults, default_errors = normalize_defaults(defaults)
    apply_overrides(payloads, keys, clean_overrides, clean_defaults)

    try:
        from accounting import seasonal_reconcile

        filters_label = seasonal_reconcile.describe_expression(
            (filters or {}).get('expression') or {},
        )
    except Exception:                              # noqa: BLE001 — برچسب اختیاری است
        filters_label = ''

    warnings, needs_fix = _quality_report(payloads, rows, report)

    preview_rows = []
    for index, payload in enumerate(payloads):
        row = rows[index]
        full_name = ' '.join(
            part for part in (
                _text(getattr(row, 'name', '')),
                _text(getattr(row, 'first_name', '')),
                _text(getattr(row, 'last_name', '')),
            ) if part
        )
        province_name, city_name = _zone_label(payload.get('StateCode'), payload.get('CityCode'))
        preview_rows.append({
            'key': keys[index],
            'line_no': payload.get('Radif'),
            'party_name': full_name[:120],
            'person_type': getattr(row, 'person_type', ''),
            'province': _text(getattr(row, 'province', ''), 60),
            'city': _text(getattr(row, 'city', ''), 100),
            'province_name': province_name,
            'city_name': city_name,
            'needs_fix': keys[index] in needs_fix,
            'amount': payload.get('Price'),
            'vat': payload.get('MaliatArzeshAfzoodeh'),
            'invoice_no': payload.get('FactorNo'),
            'values': payload,
        })

    return {
        'package_version': PACKAGE_VERSION,
        'template_status': TEMPLATE_STATUS,
        'zone_source': f'{TEMPLATE_REFERENCE} :: Zone',
        'currency_source': f'{TEMPLATE_REFERENCE} :: Arz',
        'report': {
            'id': getattr(report, 'pk', None),
            'fiscal_year': getattr(getattr(report, 'fiscal_year', None), 'name', ''),
            'hc_year_code': _jalali_year(report),
            'quarter': getattr(report, 'quarter', None),
            'quarter_label': (report.get_quarter_display()
                              if hasattr(report, 'get_quarter_display') else ''),
            'period_start': _jalali_text(report.period_range[0]),
            'period_end': _jalali_text(report.period_range[1]),
            'filters_label': filters_label,
        },
        'options': options,
        'columns': _column_spec(),
        'coverage': column_coverage(),
        'editable': list(EDITABLE_COLUMNS),
        'kala_types': [{'value': value, 'label': label} for value, label in KALA_TYPES],
        'currencies': currency_codes(),
        'person_type_codes': {
            key: {'type_code': code, 'type1_code': extra}
            for key, (code, extra) in PERSON_TYPE_CODES.items()
        },
        'rows': preview_rows,
        'totals': _totals(payloads),
        'warnings': warnings,
        'needs_fix_count': len(needs_fix),
        'company_profile': {**company_profile(report), 'tax_office_code': options.get('tax_office_code')},
        'errors': errors + default_errors,
    }


def preview_csv(report, rows, options=None, overrides=None, defaults=None):
    """فایل ``rows.csv`` پیش‌نمایش (بدون ساخت zip) برای بازبینی در اکسل."""
    options = normalize_options(options)
    rows = list(rows)
    payloads = build_rows(report, rows, options)
    keys = [_row_key(row) for row in rows]
    clean_overrides, errors = normalize_overrides(overrides, keys)
    clean_defaults, default_errors = normalize_defaults(defaults)
    problems = errors + default_errors
    if problems:
        raise OverridesError(problems)
    apply_overrides(payloads, keys, clean_overrides, clean_defaults)

    stamp = datetime.now().strftime('%Y%m%d-%H%M')
    year_key = _jalali_year(report) or 'year'
    quarter = getattr(report, 'quarter', '') or ''
    filename = f'ttms-preview-{year_key}-q{quarter}-{stamp}.csv'
    return _csv_text(payloads).encode('utf-8'), filename








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
            'tax_office_code': options.get('tax_office_code'),
            'commission_header_table': 'HagholAmalKari',
        },
        'company_profile': {
            **company_profile(report),
            'tax_office_code': options.get('tax_office_code'),
            'tax_office_name': _tax_office_name(options.get('tax_office_code')),
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
        'columns': _column_spec(),
        'coverage': column_coverage(),
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
    coverage = manifest.get('coverage') or {}
    counts = coverage.get('counts') or {}
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
        'پوشش ستون‌های Kharid_Detail:',
        f"  کل: {coverage.get('total', 0)} ستون | خودکار: {counts.get('auto', 0)}"
        f" | قابل اصلاح: {counts.get('editable', 0)} | خارج از دامنه: {counts.get('out_of_scope', 0)}",
        '  ستون‌های «خارج از دامنه» (نرخ برابری ارز و شناسهٔ کالا) در TTMS وجود دارند',
        '  ولی منبعی در HRMS ندارند و خالی (NULL) ارسال می‌شوند.',
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
        'جلوگیری از درج تکراری:',
        '  ردیف‌هایی که ترکیب «شمارهٔ فاکتور + شناسهٔ ملی + مبلغ» آن‌ها از قبل در',
        '  Kharid_Detail وجود دارد، به‌طور پیش‌فرض درج نمی‌شوند (اجرای دوباره بی‌خطر است).',
        '  برای درج اجباری همهٔ ردیف‌ها، سوییچ -AllowDuplicates را اضافه کنید.',
        '',
        'کدهای مرجع:',
        '  - استان/شهر از جدول Zone همان فایل TTMS (کد استان + کد شهر) پر می‌شود.',
        '  - نوع کالا از جدول KalaType (۱۲ = سایر کالا ها).',
        '  - نوع ارز از جدول Arz برای معاملات ارزی (ریالی خالی می‌ماند).',
        '',
        'پروفایل مؤدی (جدول Moshakhasat در TTMS):',
        '  این اطلاعات را یک‌بار در خود TTMS ثبت کنید (نوشتن مستقیم انجام نمی‌شود):',
        f"    نام مؤدی: {manifest.get('company_profile', {}).get('moady_name') or '—'}",
        f"    شناسهٔ ملی: {manifest.get('company_profile', {}).get('national_code') or '—'}",
        f"    کد اقتصادی: {manifest.get('company_profile', {}).get('economic_code') or '—'}",
        f"    شمارهٔ ثبت: {manifest.get('company_profile', {}).get('registration_no') or '—'}",
        f"    کد پستی: {manifest.get('company_profile', {}).get('postal_code') or '—'}",
        f"    ادارهٔ کل: {manifest.get('company_profile', {}).get('tax_office_name') or '—'}",
        '',
        'نکته‌های تکمیلی TTMS:',
        '  - ردیف‌های «حق‌العمل‌کاری» در TTMS سرصفحهٔ جداگانه (جدول HagholAmalKari) دارند؛',
        '    پیش از ارسال، وجود سرصفحهٔ همان فصل را بررسی کنید.',
        '  - «نرخ برابری ارز» و «شناسهٔ کالا» از نوع GUID هستند و در HRMS منبعی ندارند؛',
        '    برای معاملات ارزی، نرخ را در خود TTMS تکمیل کنید.',
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
    """محتوای خام اسکریپت PowerShell از پوشهٔ ``ttms_assets`` (با BOM و CRLF)."""
    return (ASSETS_DIR / FILLER_SCRIPT).read_bytes()


def build_package(report, rows, options=None, filters=None, overrides=None, defaults=None):
    """بستهٔ zip درج در فایل Access → ``(zip_bytes, filename, manifest)``.

    ``overrides`` (اصلاح‌های سطری پیش‌نمایش) و ``defaults`` (اعمال به همه) پیش از
    نوشتن CSV روی مقادیر نگاشت‌شده اعمال می‌شوند؛ مقدار نامعتبر → ``OverridesError``.
    """
    options = normalize_options(options)
    rows = list(rows)
    payloads = build_rows(report, rows, options)
    keys = [_row_key(row) for row in rows]
    clean_overrides, errors = normalize_overrides(overrides, keys)
    clean_defaults, default_errors = normalize_defaults(defaults)
    problems = errors + default_errors
    if problems:
        raise OverridesError(problems)
    apply_overrides(payloads, keys, clean_overrides, clean_defaults)

    csv_bytes = _csv_text(payloads).encode('utf-8')

    stamp = datetime.now().strftime('%Y%m%d-%H%M')
    year_key = _jalali_year(report) or 'year'
    quarter = getattr(report, 'quarter', '') or ''
    package_name = f'ttms-fill-purchase-{year_key}-q{quarter}-{stamp}.zip'

    manifest = build_manifest(report, payloads, options, filters, package_name=package_name)
    manifest['checksum'] = {'rows_file_sha256': hashlib.sha256(csv_bytes).hexdigest()}
    manifest['overrides'] = {
        'rows': len(clean_overrides),
        'defaults': clean_defaults,
        'columns': sorted({
            column for values in clean_overrides.values() for column in values
        } | set(clean_defaults)),
    }

    manifest_text = json.dumps(manifest, ensure_ascii=False, indent=2)
    readme_text = build_readme(manifest)

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('rows.csv', csv_bytes)
        archive.writestr('manifest.json', manifest_text.encode('utf-8'))
        archive.writestr('README.txt', readme_text.encode('utf-8-sig'))
        try:
            script_bytes = filler_script()
        except OSError:
            script_bytes = b''
        if script_bytes:
            archive.writestr(FILLER_SCRIPT, script_bytes)
    return buffer.getvalue(), package_name, manifest

