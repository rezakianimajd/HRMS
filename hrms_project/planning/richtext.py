"""پاک‌سازی HTML سبک یادداشت‌ها و شمارش چک‌لیست تودرتو (بدون وابستگی بیرونی)."""
from __future__ import annotations

import re
from html import escape
from html.parser import HTMLParser

ALLOWED_TAGS = {
    'b', 'strong', 'i', 'em', 'u', 's', 'br', 'p', 'div', 'span', 'ul', 'ol', 'li',
    'blockquote',
}
VOID_TAGS = {'br'}
BLOCKED_TAGS = {
    'script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'img', 'video',
    'audio', 'form', 'input', 'button', 'textarea', 'select', 'svg', 'math',
}
MAX_LENGTH = 20000
MAX_DEPTH = 3
MAX_ITEMS = 100

_COLOR_PATTERN = re.compile(r'^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\))$')


def _extract_color(style_value):
    """فقط مقدار ``color`` معتبر (هگز یا rgb/rgba) را برمی‌گرداند."""
    for chunk in str(style_value or '').split(';'):
        if ':' not in chunk:
            continue
        name, value = chunk.split(':', 1)
        if name.strip().lower() != 'color':
            continue
        color = value.strip()
        if _COLOR_PATTERN.match(color):
            return color
    return None


class _Sanitizer(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.stack = []
        self.blocked = 0

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in BLOCKED_TAGS:
            self.blocked += 1
            return
        if self.blocked or tag not in ALLOWED_TAGS:
            return
        style = ''
        for name, value in attrs:
            if name.lower() == 'style':
                color = _extract_color(value)
                if color:
                    style = f' style="color:{color}"'
                break
        self.parts.append(f'<{tag}{style}>')
        if tag not in VOID_TAGS:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        tag = tag.lower()
        if tag in BLOCKED_TAGS or self.blocked or tag not in ALLOWED_TAGS:
            return
        if tag in VOID_TAGS:
            self.parts.append(f'<{tag}>')

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in BLOCKED_TAGS:
            if self.blocked:
                self.blocked -= 1
            return
        if self.blocked or tag not in ALLOWED_TAGS or tag in VOID_TAGS:
            return
        if tag not in self.stack:
            return
        while self.stack:
            open_tag = self.stack.pop()
            self.parts.append(f'</{open_tag}>')
            if open_tag == tag:
                break

    def handle_data(self, data):
        if self.blocked:
            return
        text = escape(data)
        self.parts.append(text.replace('\n', '<br>'))

    def result(self):
        while self.stack:
            self.parts.append(f'</{self.stack.pop()}>')
        return ''.join(self.parts)


def sanitize_html(value) -> str:
    """HTML امن یادداشت را می‌سازد؛ متن ساده با ``<br>`` حفظ می‌شود."""
    text = str(value or '')[:MAX_LENGTH]
    if not text.strip():
        return ''
    if '<' not in text:
        return escape(text).replace('\n', '<br>')
    parser = _Sanitizer()
    parser.feed(text)
    parser.close()
    return parser.result()[:MAX_LENGTH]


def normalize_checklist(value, depth: int = 0) -> list[dict]:
    """چک‌لیست (و زیرمجموعه‌های آن) را نرمال می‌کند: متن خالی حذف، عمق محدود."""
    if depth >= MAX_DEPTH or not isinstance(value, list):
        return []
    rows: list[dict] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        text = str(item.get('text') or '').strip()[:300]
        if not text:
            continue
        row = {'text': text, 'done': bool(item.get('done'))}
        children = normalize_checklist(item.get('children'), depth + 1)
        if children:
            row['children'] = children
        rows.append(row)
        if len(rows) >= MAX_ITEMS:
            break
    return rows


def checklist_stats(value) -> dict:
    """شمارندهٔ موارد انجام‌شده/کل با احتساب زیرمجموعه‌ها."""
    def walk(rows):
        total = done = 0
        for row in rows or []:
            if not isinstance(row, dict):
                continue
            total += 1
            if row.get('done'):
                done += 1
            child_total, child_done = walk(row.get('children'))
            total += child_total
            done += child_done
        return total, done

    total, done = walk(normalize_checklist(value))
    percent = int(round((done / total) * 100)) if total else 0
    return {'total': total, 'done': done, 'percent': percent}
