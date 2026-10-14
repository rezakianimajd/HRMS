"""یکسان‌سازی متن فارسی در کدینگ حسابداری.

حروف عربی «ي» و «ك» (و «ى») در سراسر سامانه به «ی» و «ک» فارسی تبدیل می‌شوند تا
کدینگ‌ها (نوع حساب، گروه، حساب، تفصیلی، مرکز هزینه، بُعد مالی، روزنامه و …) و
جستجو/تطبیق نام‌ها هم‌شکل و بدون تفاوت پنهان باشند.

سه سطح استفاده:
* `normalize_persian(text)` — یک رشته،
* `normalize_persian_deep(value)` — هر ساختار JSON (رشته/لیست/دیکشنری) برای فیلدهای JSON،
* `PersianNormalizedMixin` — روی مدل‌ها؛ در `save()` همهٔ فیلدهای متنی یکسان می‌شوند.
"""
from django.db import models

# حروفی که باید به شکل فارسی خود برگردند
ARABIC_TO_PERSIAN = {
    '\u064a': '\u06cc',   # ي → ی
    '\u0649': '\u06cc',   # ى (الف مقصوره) → ی
    '\u0643': '\u06a9',   # ك → ک
}
TRANSLATION_TABLE = str.maketrans(ARABIC_TO_PERSIAN)


def normalize_persian(value):
    """حروف عربی را در یک رشته به شکل فارسی تبدیل می‌کند (سایر کاراکترها دست‌نخورده)."""
    if not isinstance(value, str) or not value:
        return value
    return value.translate(TRANSLATION_TABLE)


def normalize_persian_deep(value):
    """همان تبدیل، اما روی ساختارهای تودرتو (لیست/دیکشنری) — برای فیلدهای JSON."""
    if isinstance(value, str):
        return normalize_persian(value)
    if isinstance(value, list):
        return [normalize_persian_deep(item) for item in value]
    if isinstance(value, tuple):
        return tuple(normalize_persian_deep(item) for item in value)
    if isinstance(value, dict):
        return {key: normalize_persian_deep(item) for key, item in value.items()}
    return value


_TEXT_FIELDS_CACHE = {}


def text_fields(model):
    """نام فیلدهای متنی (Char/Text) که نگهداری متن آزاد هستند (بدون فیلدهای انتخابی)."""
    cached = _TEXT_FIELDS_CACHE.get(model)
    if cached is not None:
        return cached
    names = []
    for field in model._meta.concrete_fields:
        if isinstance(field, (models.CharField, models.TextField)) and not field.choices:
            names.append(field.attname)
    _TEXT_FIELDS_CACHE[model] = names
    return names


class PersianNormalizedMixin:
    """مدل‌هایی که متن‌شان باید یکسان‌سازی شود (ي/ك → ی/ک) — بدون تغییر ساختار جدول."""

    def normalize_persian_fields(self):
        for name in text_fields(type(self)):
            value = getattr(self, name, None)
            if isinstance(value, str) and value:
                setattr(self, name, normalize_persian(value))
        return self

    def save(self, *args, **kwargs):
        self.normalize_persian_fields()
        return super().save(*args, **kwargs)
