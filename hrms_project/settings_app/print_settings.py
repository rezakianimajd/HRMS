"""تنظیمات «چاپ» (سربرگ/پاورقی/کاغذ) — مشترک بین تنظیمات ظاهر و موتور چاپ.

این تنظیمات داخل همان payload ظاهر (`/settings/appearance/` کلید ``print``) ذخیره
می‌شوند؛ موتور چاپ هنگام رندر آن‌ها را می‌خواند تا هر سند (نامه، گزارش جدولی،
فیش، سند خزانه) سربرگ و پاورقی یکدست و قابل تنظیم داشته باشد.
"""
from __future__ import annotations

import re

PAPERS = ('A4', 'A5', 'A3', 'Letter')
ORIENTATIONS = ('portrait', 'landscape')
ALIGNMENTS = ('right', 'center', 'left')
MARGIN_PATTERN = re.compile(r'^[\d.]+(?:mm|cm|in|pt)(?:\s+[\d.]+(?:mm|cm|in|pt)){0,3}$')
DEFAULT_MARGIN = '10mm 9mm 12mm 9mm'

DEFAULT_PRINT_SETTINGS = {
    'paper': 'A4',
    'orientation': 'portrait',
    'font_size': 9.5,
    'margin': DEFAULT_MARGIN,
    'header': {
        'enabled': True,
        'show_logo': True,
        'title': '',
        'subtitle': '',
        'address': '',
        'phone': '',
        'email': '',
        'website': '',
        'extra': '',
        'align': 'center',
        'show_border': True,
        'show_meta': True,
    },
    'footer': {
        'enabled': True,
        'text': '',
        'extra': '',
        'show_page_number': True,
        'show_printed_at': True,
        'align': 'center',
        'show_border': True,
    },
}

_TEXT_LIMITS = {
    'title': 120, 'subtitle': 160, 'address': 200, 'phone': 60,
    'email': 120, 'website': 120, 'extra': 240, 'text': 200,
}


def _text(value, limit):
    if value is None:
        return ''
    return str(value).strip()[:limit]


def _flag(value, fallback):
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in ('1', 'true', 'yes', 'on'):
            return True
        if lowered in ('0', 'false', 'no', 'off'):
            return False
    return fallback


def _enum(value, options, fallback):
    candidate = str(value or '').strip()
    for option in options:
        if candidate.lower() == option.lower():
            return option
    return fallback


def _number(value, low, high, fallback):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return fallback
    return max(low, min(high, round(number, 2)))


def sanitize_print(raw):
    """اعتبارسنجی و کامل‌کردن تنظیمات چاپ (merge با پیش‌فرض‌ها)."""
    data = raw if isinstance(raw, dict) else {}
    base = DEFAULT_PRINT_SETTINGS
    header_raw = data.get('header') if isinstance(data.get('header'), dict) else {}
    footer_raw = data.get('footer') if isinstance(data.get('footer'), dict) else {}
    header_default = base['header']
    footer_default = base['footer']

    margin = _text(data.get('margin'), 60)
    if not MARGIN_PATTERN.match(margin or ''):
        margin = DEFAULT_MARGIN

    return {
        'paper': _enum(data.get('paper'), PAPERS, base['paper']),
        'orientation': _enum(data.get('orientation'), ORIENTATIONS, base['orientation']),
        'font_size': _number(data.get('font_size'), 7, 14, base['font_size']),
        'margin': margin,
        'header': {
            'enabled': _flag(header_raw.get('enabled'), header_default['enabled']),
            'show_logo': _flag(header_raw.get('show_logo'), header_default['show_logo']),
            'title': _text(header_raw.get('title'), _TEXT_LIMITS['title']),
            'subtitle': _text(header_raw.get('subtitle'), _TEXT_LIMITS['subtitle']),
            'address': _text(header_raw.get('address'), _TEXT_LIMITS['address']),
            'phone': _text(header_raw.get('phone'), _TEXT_LIMITS['phone']),
            'email': _text(header_raw.get('email'), _TEXT_LIMITS['email']),
            'website': _text(header_raw.get('website'), _TEXT_LIMITS['website']),
            'extra': _text(header_raw.get('extra'), _TEXT_LIMITS['extra']),
            'align': _enum(header_raw.get('align'), ALIGNMENTS, header_default['align']),
            'show_border': _flag(header_raw.get('show_border'), header_default['show_border']),
            'show_meta': _flag(header_raw.get('show_meta'), header_default['show_meta']),
        },
        'footer': {
            'enabled': _flag(footer_raw.get('enabled'), footer_default['enabled']),
            'text': _text(footer_raw.get('text'), _TEXT_LIMITS['text']),
            'extra': _text(footer_raw.get('extra'), _TEXT_LIMITS['extra']),
            'show_page_number': _flag(
                footer_raw.get('show_page_number'), footer_default['show_page_number'],
            ),
            'show_printed_at': _flag(
                footer_raw.get('show_printed_at'), footer_default['show_printed_at'],
            ),
            'align': _enum(footer_raw.get('align'), ALIGNMENTS, footer_default['align']),
            'show_border': _flag(footer_raw.get('show_border'), footer_default['show_border']),
        },
    }


def print_settings_for(company):
    """تنظیمات ذخیره‌شدهٔ چاپ شرکت (بدون خطا در نبودِ تنظیمات)."""
    if company is None:
        return sanitize_print({})
    try:
        from settings_app.engines.settings_engine import SettingsEngine

        raw = SettingsEngine.get_setting('APPEARANCE_SETTINGS', company, default={})
        if isinstance(raw, str):
            import json

            try:
                raw = json.loads(raw)
            except (TypeError, json.JSONDecodeError):
                raw = {}
        return sanitize_print((raw or {}).get('print'))
    except Exception:  # noqa: BLE001 — چاپ نباید به‌خاطر تنظیمات بشکند
        return sanitize_print({})
