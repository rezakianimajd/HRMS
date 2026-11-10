"""رمزنگاری پیام‌ها + «ایندکس کور» برای جست‌وجو.

- متن پیام با ``EncryptionEngine`` (Fernet) رمز می‌شود؛ در DB فقط ciphertext است.
- برای جست‌وجو، هر واژه با ``HMAC-SHA256`` و کلید مشتق از ``SECRET_KEY`` امضا می‌شود و
  نسخهٔ کوتاه‌شده (۱۶ کاراکتر) در ``search_tokens`` ذخیره می‌گردد. بنابراین جست‌وجوی
  واژه‌ای ممکن است ولی متن قابل بازسازی نیست (blind index).
"""
from __future__ import annotations

import hashlib
import hmac
import re

from django.conf import settings

from core.engines.encryption_engine import EncryptionEngine

MAX_BODY_LENGTH = 20000
MAX_SEARCH_TOKENS = 400
_TOKEN_RE = re.compile(r'[\w\u0600-\u06FF]{2,}', re.UNICODE)
_PERSIAN_DIGITS = str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789')


def normalize_text(value) -> str:
    """نرمال‌سازی برای ایندکس: ارقام فارسی→لاتین، ی/ک عربی→فارسی، حروف کوچک."""
    text = str(value or '').translate(_PERSIAN_DIGITS)
    text = text.replace('ي', 'ی').replace('ى', 'ی').replace('ك', 'ک')
    return text.lower()


def tokenize(value) -> list[str]:
    """واژه‌های قابل جست‌وجو (حداقل ۲ حرف)."""
    return _TOKEN_RE.findall(normalize_text(value))


def _key() -> bytes:
    raw = f'chat-blind-index::{settings.SECRET_KEY}'.encode('utf-8')
    return hashlib.sha256(raw).digest()


def token_digest(token: str) -> str:
    """HMAC کوتاه یک واژهٔ نرمال‌شده."""
    digest = hmac.new(_key(), normalize_text(token).encode('utf-8'), hashlib.sha256)
    return digest.hexdigest()[:20]


def blind_index(value) -> str:
    """رشتهٔ توکن‌های امضاشده برای ذخیره در ``Message.search_tokens``."""
    digests = []
    seen = set()
    for token in tokenize(value):
        if token in seen:
            continue
        seen.add(token)
        digests.append(token_digest(token))
        if len(digests) >= MAX_SEARCH_TOKENS:
            break
    return ' '.join(digests)


def query_digests(query) -> list[str]:
    """توکن‌های امضاشدهٔ عبارت جست‌وجو (همه باید در پیام باشند)."""
    return [token_digest(token) for token in tokenize(query)]


def encrypt_body(value: str) -> str:
    return EncryptionEngine.encrypt(value or '')


def decrypt_body(value: str) -> str:
    return EncryptionEngine.decrypt(value or '')


def clean_body(value: str) -> str:
    """پاک‌سازی حداقلی: حذف کاراکترهای کنترلی و محدودکردن طول."""
    text = str(value or '').replace('\r\n', '\n').replace('\x00', '')
    return text[:MAX_BODY_LENGTH].strip()


def preview_of(value: str, length: int = 120) -> str:
    """خلاصهٔ کوتاه برای فهرست گفتگوها (روی متن رمزگشایی‌شده)."""
    text = re.sub(r'\s+', ' ', str(value or '')).strip()
    return text[:length]
