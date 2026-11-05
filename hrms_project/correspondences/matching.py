"""نرمال‌سازی و تطبیق نام‌ها برای نگاشت داده‌های واردشده از اکسل.

هدف: نام‌های خام و ناهمگون (مثل «خ.حسینی»، «آقای حسینی»، «حسيني» یا
«سیده زهرا حسینی») به یک پرسنل / طرف حساب / مخاطب مشخص نگاشت شوند تا هم
داده‌های موجود اصلاح شود و هم ورودهای بعدی خودکار تشخیص داده شوند.

این ماژول منطق خالص (بدون دیتابیس) و ابزار خواندن نمونه‌ها را دارد؛ اعمال نگاشت
روی داده‌ها در :mod:`correspondences.mapping` است.
"""
import re
import unicodedata
from difflib import SequenceMatcher

# ---------------------------------------------------------------------------
# نرمال‌سازی متن فارسی
# ---------------------------------------------------------------------------
_CHAR_MAP = {
    'ي': 'ی', 'ى': 'ی', 'ئ': 'ی', 'ك': 'ک', 'ة': 'ه', 'ۀ': 'ه',
    'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ؤ': 'و', 'ء': '',
    '\u200c': ' ',      # نیم‌فاصله
    '\u200d': '',       # اتصال‌دهندهٔ عرض‌صفر
    '\u0640': '',       # کشیده
    'ـ': '',
}
_DIGITS_MAP = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
}

# القاب و عناوینی که در تطبیق نام نادیده گرفته می‌شوند
HONORIFICS = {
    'خانم', 'خ', 'آقا', 'آقای', 'اقا', 'اقای', 'جناب', 'جنابعالی', 'سرکار',
    'سرکارخانم', 'حاج', 'حاجی', 'حاجیه', 'دکتر', 'دكتر', 'مهندس', 'استاد',
    'پروفسور', 'مرحوم', 'مرحومه', 'مغفور', 'مغفوره', 'شادروان',
    'سرهنگ', 'سردار', 'سرتیپ', 'تیمسار', 'مدیر', 'مدیرعامل', 'رئیس', 'معاون',
    'کارشناس', 'مسئول', 'مسوول', 'همکار', 'همکاران',
}

_PUNCTUATION = re.compile(
    r'[.,،؛:()\[\]{}«»"\'`/\\|_\-–—+*&^%$#@!?~=<>\u060c\u061b\u061f]'
)
_SPACE = re.compile(r'\s+')

# واژه‌های عمومی که در نام سازمان‌ها تکرار می‌شوند و شاهد قوی‌ای نیستند
GENERIC_TOKENS = {
    'شرکت', 'موسسه', 'مؤسسه', 'سازمان', 'اداره', 'بانک', 'فروشگاه', 'تعاونی',
    'گروه', 'صنایع', 'کارخانه', 'دفتر', 'شعبه', 'نمایندگی', 'بازرگانی',
}


def _fold(value):
    """نرمال‌سازی پایه: ی/ک عربی، حذف اعراب و علائم، ارقام لاتین."""
    text = unicodedata.normalize('NFC', str(value or ''))
    text = ''.join(ch for ch in text if not ('\u064b' <= ch <= '\u065f'))
    text = ''.join(_CHAR_MAP.get(ch, ch) for ch in text)
    text = ''.join(_DIGITS_MAP.get(ch, ch) for ch in text)
    text = _PUNCTUATION.sub(' ', text)
    return _SPACE.sub(' ', text).strip()


def normalize_name(value):
    """کلید نرمال‌شدهٔ نام (بدون القاب، علائم، اختلاف ي/ك)."""
    tokens = [token for token in _fold(value).split(' ') if token]
    tokens = [token for token in tokens if token not in HONORIFICS]
    return ' '.join(tokens).lower()


def name_tokens(value):
    """توکن‌های نرمال‌شدهٔ نام."""
    return [token for token in normalize_name(value).split(' ') if token]


def is_meaningful(value, min_length=3):
    """آیا نام به‌قدر کافی معنادار است که نگاشت شود؟"""
    return len(normalize_name(value).replace(' ', '')) >= min_length


def _significant_tokens(tokens):
    """توکن‌های معنادار (بدون واژه‌های عمومی مثل «شرکت»)."""
    significant = [token for token in tokens if token not in GENERIC_TOKENS]
    return significant or tokens


def similarity(raw, candidate):
    """امتیاز شباهت ۰..۱ بین نام خام و نام کاندید.

    قواعد مهم:
    - برابری کامل نرمال‌شده → ۱
    - همهٔ توکن‌های نام خام داخل نام کاندید باشند («حسینی» ⊆ «سیده زهرا حسینی») → ۰٫۹
    - نام خانوادگی یکی و حرف اول یکی از نام‌ها یکی («ز.حسینی» / «خ.حسینی») → ۰٫۸۵
    - در نهایت شباهت متنی به‌عنوان مکمل
    """
    left = normalize_name(raw)
    right = normalize_name(candidate)
    if not left or not right:
        return 0.0
    if left == right:
        return 1.0

    left_tokens = left.split(' ')
    right_tokens = right.split(' ')
    left_set = set(_significant_tokens(left_tokens))
    right_set = set(_significant_tokens(right_tokens))

    score = 0.0
    if left_set <= right_set:
        score = 0.9
        # یک توکن کوتاه مشترک (مثل «سید») به‌تنهایی شاهد ضعیفی است
        if len(left_set) == 1 and len(next(iter(left_set))) < 4:
            score = 0.62
    else:
        common = left_set & right_set
        if common:
            score = 0.5 + 0.35 * (len(common) / max(len(left_set), 1))
        # ترتیب برعکس (نام خانوادگی اول)
        if sorted(_significant_tokens(left_tokens)) == sorted(
                _significant_tokens(right_tokens)):
            score = max(score, 0.88)
        if left_tokens[-1] == right_tokens[-1]:
            score = max(score, 0.8)
            initial = left_tokens[0][:1]
            if any(token[:1] == initial for token in right_tokens[:-1]):
                score = max(score, 0.85)

    ratio = SequenceMatcher(None, left, right).ratio()
    return round(max(score, ratio * 0.75), 4)


def best_matches(raw, candidates, limit=5, threshold=0.6, key=None):
    """بهترین کاندیدها برای یک نام خام → ``[{'score': .., 'item': ..}]``."""
    scored = []
    for candidate in candidates:
        label = key(candidate) if key else str(candidate)
        score = similarity(raw, label)
        if score >= threshold:
            scored.append({'score': score, 'item': candidate})
    scored.sort(key=lambda row: row['score'], reverse=True)
    return scored[:limit]


# ---------------------------------------------------------------------------
# نمونه‌های موجود در داده‌ها (برای فهرست «نام‌های نگاشت‌نشده»)
# ---------------------------------------------------------------------------
def iter_name_samples(company):
    """نام‌های خام موجود در داده‌های مکاتبات → ``[{'scope','raw','count'}]``."""
    from django.db.models import Count

    from correspondences.models import Letter, LetterReferral

    sources = [
        ('referral', LetterReferral, 'to_name', 'to_employee'),
        ('sender', Letter, 'sender_name', 'sender_employee'),
        ('receiver', Letter, 'receiver_name', 'receiver_employee'),
        ('delivery', Letter, 'delivered_by_name', 'delivered_by'),
    ]
    samples = []
    for scope, model, name_field, link_field in sources:
        qs = model.objects.filter(company=company).exclude(**{f'{name_field}': ''})
        qs = qs.filter(**{f'{link_field}__isnull': True})
        rows = qs.values(name_field).annotate(count=Count('id')).order_by('-count')
        for row in rows:
            raw = (row[name_field] or '').strip()
            if not is_meaningful(raw):
                continue
            samples.append({
                'scope': scope,
                'raw': raw,
                'count': row['count'],
                'normalized': normalize_name(raw),
            })
    return samples
