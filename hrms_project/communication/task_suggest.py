"""تشخیص پیام‌های «قابل تبدیل به وظیفه» در چت + ساخت عنوان/توضیح وظیفه.

این ماژول کاملاً خالص است (بدون دیتابیس) تا قواعدش قابل تست باشد. هدف: وقتی کسی
در چت می‌نویسد «صورت‌وضعیت قرارداد فلان را بررسی کن» یا «فلان نامه چه شد؟»،
کلاینت یک دکمهٔ «تسک‌سازی» پیشنهادی ببیند و با یک کلیک وظیفه ساخته شود.
"""
from __future__ import annotations

# (برچسب، واژه‌ها) — ترتیب اهمیت است
ACTION_RULES = (
    ('پیگیری', ('پیگیری', 'پیگیر', 'چی شد', 'چه شد', 'در جریان', 'خبری نشد')),
    ('بررسی', ('بررسی', 'چک', 'کنترل', 'بازبینی', 'ریویو', 'دقت کن')),
    ('ارسال', ('ارسال', 'بفرست', 'فرستاده شود', 'ابلاغ')),
    ('ثبت', ('بزن', 'ثبت', 'صادر', 'وارد', 'بارگذاری', 'آپلود')),
    ('آماده‌سازی', ('آماده', 'تهیه', 'اصلاح', 'تکمیل', 'بنویس', 'درست کن')),
    ('هماهنگی', ('هماهنگ', 'تماس', 'جلسه', 'قرار بگذار', 'هم‌اهنگ')),
    ('یادآوری', ('یادت', 'فراموش نکن', 'حتماً', 'حتما')),
)

URGENT_WORDS = ('فوری', 'امروز', 'فردا', 'عجله', 'اورژانسی', 'asap')

DOMAIN_WORDS = (
    'قرارداد', 'صورت‌وضعیت', 'صورت وضعیت', 'نامه', 'فاکتور', 'پرداخت', 'پروژه',
    'سند', 'مدرک', 'پرسنل', 'خرید', 'تضمین', 'چک', 'حساب',
)

MIN_LENGTH = 8
MAX_TITLE = 140
POLITE_PREFIXES = (
    'لطفاً', 'لطفا', 'خواهشاً', 'خواهشا', 'می‌شه', 'میشه', 'می‌تونی', 'میتونی',
    'می‌تونید', 'میتونید', 'می‌شود', 'میشود',
)


def _normalize(text: str) -> str:
    return ' '.join(str(text or '').replace('\u200c', ' ').split())


# پیشوندهای تعارفی با همان نرمال‌سازی (نیم‌فاصله → فاصله) تا تطبیق درست باشد.
_POLITE_NORMALIZED = tuple(_normalize(prefix) for prefix in POLITE_PREFIXES)


def is_actionable(text: str) -> bool:
    """آیا متن پیام به یک کار قابل انجام اشاره دارد؟"""
    return suggest_task(text) is not None


def suggest_task(text: str):
    """پیشنهاد وظیفه از متن پیام؛ در نبود نشانهٔ «کار» مقدار None.

    خروجی: ``{is_actionable, reason, title, priority, matched}``
    """
    cleaned = _normalize(text)
    if len(cleaned) < MIN_LENGTH:
        return None
    lowered = cleaned.lower()
    matched = []
    reason = ''
    for label, words in ACTION_RULES:
        hits = [word for word in words if word.lower() in lowered]
        if hits and not reason:
            reason = label
        matched.extend(hits)
    if not reason:
        # بدون فعل درخواستی، اگر جملهٔ پرسشی/دستوری با موجودیت ماژول باشد هم پیشنهاد می‌دهیم.
        if not any(word in cleaned for word in DOMAIN_WORDS):
            return None
        if not any(mark in cleaned for mark in ('?', '؟', 'کن', 'کنید', 'شود', 'بشود')):
            return None
        reason = 'پیگیری'
    priority = 'high' if any(word in lowered for word in URGENT_WORDS) else 'normal'
    return {
        'is_actionable': True,
        'reason': reason,
        'title': build_title(cleaned),
        'priority': priority,
        'matched': matched[:4],
    }


def build_title(text: str, limit: int = MAX_TITLE) -> str:
    """عنوان کوتاه از جملهٔ اول پیام (بدون منشن‌ها، تعارف ابتدای جمله و فاصله‌های اضافی)."""
    cleaned = _normalize(text)
    for separator in ('\n', '؛', ';', '؟', '?', '!', '۔', '.'):
        if separator in cleaned:
            cleaned = cleaned.split(separator, 1)[0].strip()
    cleaned = cleaned.lstrip('@').strip(' -—:')
    stripped = True
    while stripped:
        stripped = False
        for prefix in _POLITE_NORMALIZED:
            if cleaned.startswith(prefix):
                cleaned = cleaned[len(prefix):].strip(' ،,:-')
                stripped = True
                break
    if len(cleaned) > limit:
        cleaned = f'{cleaned[:limit - 1].rstrip()}…'
    return cleaned or 'وظیفه از چت'


def build_description(text: str, *, conversation_title: str = '', sender: str = '') -> str:
    """توضیح وظیفه: متن پیام + مبدأ آن (برای پیگیری بعدی)."""
    cleaned = _normalize(text)
    parts = []
    source = '، '.join(
        item for item in (
            f'گفتگو: {conversation_title}' if conversation_title else '',
            f'فرستنده: {sender}' if sender else '',
        ) if item
    )
    if source:
        parts.append(f'از چت — {source}')
    if cleaned:
        parts.append(cleaned[:1500])
    return '\n'.join(parts)
