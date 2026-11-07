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
from functools import lru_cache

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


@lru_cache(maxsize=8192)
def _normalize_cached(text):
    tokens = [token for token in _fold(text).split(' ') if token]
    tokens = [token for token in tokens if token not in HONORIFICS]
    return ' '.join(tokens).lower()


def normalize_name(value):
    """کلید نرمال‌شدهٔ نام (بدون القاب، علائم، اختلاف ي/ك) — با کش برای سرعت."""
    return _normalize_cached(str(value or ''))


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


def _candidate_label(candidate, key):
    return str(key(candidate) if key else candidate)


def prefilter_candidates(raw, candidates, key=None):
    """کاهش سریع کاندیدها با تطبیق ارزان (بدون SequenceMatcher).

    برای استخرهای بزرگ (هزاران طرف حساب/سازمان) محاسبهٔ امتیاز شباهت برای همهٔ
    کاندیدها کند است؛ این تابع فقط کاندیدهایی را نگه می‌دارد که حداقل یک نشانهٔ
    متنی مشترک دارند (پیشوند، زیررشته یا توکن مشترک).
    """
    raw_norm = normalize_name(raw)
    raw_compact = raw_norm.replace(' ', '')
    if not raw_compact:
        return list(candidates)
    raw_tokens = set(raw_norm.split())
    head = raw_compact[:2]
    picks = []
    for candidate in candidates:
        label = normalize_name(_candidate_label(candidate, key))
        if not label:
            continue
        compact = label.replace(' ', '')
        if (
            compact == raw_compact
            or compact.startswith(head)
            or raw_compact.startswith(compact[:2])
            or raw_compact in compact
            or compact in raw_compact
            or raw_tokens.intersection(label.split())
        ):
            picks.append(candidate)
    return picks


def best_matches(raw, candidates, limit=5, threshold=0.6, key=None):
    """بهترین کاندیدها برای یک نام خام → ``[{'score': .., 'item': ..}]``."""
    candidates = list(candidates)
    if len(candidates) > 40:
        # پیش‌فیلتر ارزان تا محاسبهٔ شباهت فقط روی کاندیدهای مرتبط انجام شود
        candidates = prefilter_candidates(raw, candidates, key=key)
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
    """نام‌های خام موجود در داده‌های مکاتبات → ``[{'scope','raw','count'}]``.

    برای هر فیلد نامه، هر «اتصال خالی» یک دامنهٔ جداگانه است؛ مثلاً فرستندهٔ یک
    نامهٔ وارده می‌تواند هم‌زمان به پرسنل (sender)، طرف حساب (counterparty)،
    سازمان (organization) و مخاطب (contact) نگاشت شود.
    """
    from django.db.models import Count

    from correspondences.models import Correspondent, Letter, LetterReferral

    sources = [
        # ارجاعات
        ('referral', LetterReferral, 'to_name', {'to_employee__isnull': True}),
        # پرسنل نامه‌ها
        ('sender', Letter, 'sender_name', {'sender_employee__isnull': True}),
        ('receiver', Letter, 'receiver_name', {'receiver_employee__isnull': True}),
        ('delivery', Letter, 'delivered_by_name', {'delivered_by__isnull': True}),
        # طرف حساب نامه (وارده از فرستنده / صادره از گیرنده)
        ('counterparty', Letter, 'sender_name', {'party_account__isnull': True}),
        ('counterparty', Letter, 'receiver_name', {'party_account__isnull': True}),
        # نام آزاد طرف حساب (شرکتی که هنوز در قراردادها نیست) — قابل «تعمیم» به طرف حساب
        ('counterparty', Letter, 'party_name', {'party_account__isnull': True}),
        # سازمان طرف نامه
        ('organization', Letter, 'sender_name', {'sender_organization__isnull': True}),
        ('organization', Letter, 'receiver_name', {'organization__isnull': True}),
        # مخاطب نامه
        ('contact', Letter, 'sender_name', {'correspondent__isnull': True}),
        # سازمان مخاطبین
        ('organization', Correspondent, 'name', {'organization__isnull': True}),
    ]
    samples = []
    for scope, model, name_field, link_filter in sources:
        qs = model.objects.filter(company=company).exclude(**{f'{name_field}': ''})
        if link_filter:
            qs = qs.filter(**link_filter)
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
