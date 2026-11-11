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
DEFAULT_COLUMNS = {
    'letter-list': [
        'number', 'letter_date', 'direction', 'subject', 'party', 'status', 'attachments',
    ],
}

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
        'show_meta': False,
        'logo_width': 28,
        'logo_height': 18,
        'company_font_size': 13,
        'title_font_size': 13,
        'subtitle_font_size': 9.5,
        'space_top': 0,
        'space_bottom': 6,
        'space_side': 0,
    },
    'footer': {
        'enabled': True,
        'text': '',
        'extra': '',
        'show_page_number': True,
        'signatures': True,
        'align': 'center',
        'show_border': True,
        'font_size': 7.5,
        'space_bottom': 0,
    },
    'columns': {
        'letter-list': list(DEFAULT_COLUMNS['letter-list']),
    },
}

_TEXT_LIMITS = {
    'title': 120, 'subtitle': 160, 'address': 200, 'phone': 60,
    'email': 120, 'website': 120, 'extra': 240, 'text': 200,
}

COLUMNS_BY_DOCUMENT = {
    'letter-list': (
        'number', 'unit_reg_no', 'company_reg_no', 'external_number', 'indicator_no',
        'transmittal_no', 'direction', 'letter_date', 'received_date', 'sent_date',
        'due_date', 'unit_reg_date', 'category', 'series', 'subject', 'summary', 'body',
        'party', 'sender', 'receiver', 'organization', 'correspondent', 'sender_title',
        'delivery_type', 'delivered_by', 'entered_by', 'drafter', 'priority',
        'confidentiality', 'status', 'amount', 'currency', 'archive_ref',
        'contract_number', 'tags', 'attachments', 'referrals', 'entry_method',
        'entry_time', 'created_at',
    ),
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


def _sanitize_columns(raw):
    """ستون‌های انتخابی هر سند چاپی (کلید سند → فهرست کلید ستون‌ها)."""
    data = raw if isinstance(raw, dict) else {}
    clean = {}
    for document, allowed in COLUMNS_BY_DOCUMENT.items():
        requested = data.get(document)
        if not isinstance(requested, (list, tuple)):
            clean[document] = list(DEFAULT_COLUMNS.get(document, allowed))
            continue
        selected = []
        for key in requested:
            candidate = str(key or '').strip()
            if candidate in allowed and candidate not in selected:
                selected.append(candidate)
        clean[document] = selected or list(DEFAULT_COLUMNS.get(document, allowed))
    return clean


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
            'logo_width': _number(
                header_raw.get('logo_width'), 8, 90, header_default['logo_width'],
            ),
            'logo_height': _number(
                header_raw.get('logo_height'), 6, 60, header_default['logo_height'],
            ),
            'company_font_size': _number(
                header_raw.get('company_font_size'), 8, 24, header_default['company_font_size'],
            ),
            'title_font_size': _number(
                header_raw.get('title_font_size'), 8, 24, header_default['title_font_size'],
            ),
            'subtitle_font_size': _number(
                header_raw.get('subtitle_font_size'), 6, 20, header_default['subtitle_font_size'],
            ),
            'space_top': _number(header_raw.get('space_top'), 0, 40, header_default['space_top']),
            'space_bottom': _number(
                header_raw.get('space_bottom'), 0, 40, header_default['space_bottom'],
            ),
            'space_side': _number(header_raw.get('space_side'), 0, 30, header_default['space_side']),
        },
        'footer': {
            'enabled': _flag(footer_raw.get('enabled'), footer_default['enabled']),
            'text': _text(footer_raw.get('text'), _TEXT_LIMITS['text']),
            'extra': _text(footer_raw.get('extra'), _TEXT_LIMITS['extra']),
            'show_page_number': _flag(
                footer_raw.get('show_page_number'), footer_default['show_page_number'],
            ),
            'signatures': _flag(footer_raw.get('signatures'), footer_default['signatures']),
            'align': _enum(footer_raw.get('align'), ALIGNMENTS, footer_default['align']),
            'show_border': _flag(footer_raw.get('show_border'), footer_default['show_border']),
            'font_size': _number(
                footer_raw.get('font_size'), 5, 14, footer_default['font_size'],
            ),
            'space_bottom': _number(
                footer_raw.get('space_bottom'), 0, 20, footer_default['space_bottom'],
            ),
        },
        'columns': _sanitize_columns(data.get('columns')),
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
