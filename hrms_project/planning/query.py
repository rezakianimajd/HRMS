"""پالایش، مرتب‌سازی و خلاصهٔ فهرست‌های برنامه‌ریزی (خالص و قابل تست بدون دیتابیس).

این ماژول هیچ کوئری‌ای اجرا نمی‌کند؛ فقط پارامترهای ورودی را نرمال و به
دیکشنری/فهرست آمادهٔ ``queryset.filter(**...)`` و ``queryset.order_by(*...)``
تبدیل می‌کند تا ویوها کوتاه بمانند و منطق در تست‌های DB-free پوشش داده شود.
"""
from __future__ import annotations

from datetime import date, timedelta

TASK_STATUSES = ('todo', 'doing', 'done', 'cancelled')
TASK_PRIORITIES = ('low', 'normal', 'high', 'urgent')
CLOSED_STATUSES = ('done', 'cancelled')
DUE_PRESETS = ('today', 'tomorrow', 'week', 'overdue', 'none')

_TRUE_VALUES = ('1', 'true', 'yes', 'on')

TASK_SORT_MAP = {
    'default': ['-is_pinned', 'due_date', '-created_at'],
    '-due_date': ['-is_pinned', '-due_date', '-created_at'],
    'due_date': ['-is_pinned', 'due_date', '-created_at'],
    '-created_at': ['-is_pinned', '-created_at'],
    'created_at': ['is_pinned', 'created_at'],
    'title': ['-is_pinned', 'title'],
    'status': ['-is_pinned', 'status', 'due_date'],
    'priority': ['-is_pinned', 'priority_rank', 'due_date'],
}

NOTE_SORT_MAP = {
    'default': ['-is_pinned', '-updated_at'],
    '-updated_at': ['-is_pinned', '-updated_at'],
    'updated_at': ['is_pinned', 'updated_at'],
    '-created_at': ['-is_pinned', '-created_at'],
    'created_at': ['is_pinned', 'created_at'],
    'title': ['-is_pinned', 'title'],
}


def truthy(value) -> bool:
    """``1/true/yes/on`` را True می‌داند (برای پارامترهای کوئری‌استرینگ)."""
    return str(value).strip().lower() in _TRUE_VALUES


def csv_list(value, allowed=None) -> list[str]:
    """رشتهٔ ``a,b`` (یا لیست) را به فهرست یکتای کلیدهای مجاز تبدیل می‌کند."""
    if value in (None, '', 'null', 'None'):
        return []
    parts = value if isinstance(value, (list, tuple)) else str(value).split(',')
    seen: list[str] = []
    for part in parts:
        key = str(part).strip().lower()
        if not key or key in ('null', 'undefined', 'all'):
            continue
        if allowed and key not in allowed:
            continue
        if key not in seen:
            seen.append(key)
    return seen


def int_list(value) -> list[int]:
    """شناسه‌های عددی را از رشته/لیست بیرون می‌کشد (بدون خطا روی مقدار نامعتبر)."""
    if value in (None, '', 'null'):
        return []
    parts = value if isinstance(value, (list, tuple)) else str(value).split(',')
    result: list[int] = []
    for part in parts:
        text = str(part).strip()
        if text.isdigit() and int(text) not in result:
            result.append(int(text))
    return result


def parse_iso_date(value) -> date | None:
    """تاریخ ISO (``YYYY-MM-DD``) را می‌خواند؛ مقدار نامعتبر → None."""
    text = str(value or '').strip()[:10]
    if len(text) != 10:
        return None
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def due_lookup(preset, today=None) -> dict:
    """پیش‌فرض‌های سررسید را به لوکاپ‌های کوئری تبدیل می‌کند."""
    key = str(preset or '').strip().lower()
    if key not in DUE_PRESETS:
        return {}
    today = today or date.today()
    if key == 'none':
        return {'due_date__isnull': True}
    if key == 'today':
        return {'due_date': today}
    if key == 'tomorrow':
        return {'due_date': today + timedelta(days=1)}
    if key == 'week':
        return {'due_date__range': (today, today + timedelta(days=7))}
    return {'due_date__lt': today}



def task_filters(params, today=None) -> dict:
    """فیلترهای فهرست وظایف: وضعیت/اولویت/سررسید/برچسب/سنجاق/گروه.

    ``params`` هر شیئی با ``.get`` است (QueryDict یا دیکشنری).
    """
    filters: dict = {}
    statuses = csv_list(params.get('status'), TASK_STATUSES)
    if statuses:
        filters['status__in'] = statuses
    elif truthy(params.get('open')) or truthy(params.get('open_only')):
        filters['status__in'] = [key for key in TASK_STATUSES if key not in CLOSED_STATUSES]

    priorities = csv_list(params.get('priority'), TASK_PRIORITIES)
    if priorities:
        filters['priority__in'] = priorities

    preset = (params.get('due') or '').strip().lower()
    if preset in DUE_PRESETS:
        filters.update(due_lookup(preset, today))

    due_from = parse_iso_date(params.get('due_from'))
    due_to = parse_iso_date(params.get('due_to'))
    if due_from and due_to:
        filters['due_date__range'] = (due_from, due_to)
    elif due_from:
        filters['due_date__gte'] = due_from
    elif due_to:
        filters['due_date__lte'] = due_to

    tag = (params.get('tag') or '').strip()
    if tag:
        filters['tags__icontains'] = tag

    if truthy(params.get('pinned')):
        filters['is_pinned'] = True

    group_ids = int_list(params.get('group') or params.get('group_id'))
    if group_ids:
        filters['assignee_groups__id__in'] = group_ids

    related = (params.get('related') or '').strip()
    if related:
        filters['related_module'] = related
    return filters


def note_filters(params) -> dict:
    """فیلترهای فهرست یادداشت‌ها: رنگ/برچسب/سنجاق."""
    filters: dict = {}
    color = (params.get('color') or '').strip()
    if color:
        filters['color__iexact'] = color
    tag = (params.get('tag') or '').strip()
    if tag:
        filters['tags__icontains'] = tag
    if truthy(params.get('pinned')):
        filters['is_pinned'] = True
    return filters


def task_ordering(value) -> list[str]:
    """مرتب‌سازی امن فهرست وظایف (مقدار ناشناخته → پیش‌فرض)."""
    key = str(value or 'default').strip()
    return list(TASK_SORT_MAP.get(key, TASK_SORT_MAP['default']))


def note_ordering(value) -> list[str]:
    """مرتب‌سازی امن فهرست یادداشت‌ها (مقدار ناشناخته → پیش‌فرض)."""
    key = str(value or 'default').strip()
    return list(NOTE_SORT_MAP.get(key, NOTE_SORT_MAP['default']))


def search_term(params) -> str:
    """عبارت جست‌وجو را از ``q`` یا ``search`` می‌خواند."""
    return (params.get('q') or params.get('search') or '').strip()


def summary_payload(
    *, note_total=0, note_pinned=0, status_counts=None, due_today=0, overdue=0,
    shared_notes=0, shared_tasks=0, today=None,
) -> dict:
    """خلاصهٔ شمارنده‌ها برای نوار شاخص/سایدبار (بدون دیتابیس)."""
    counts = {key: int((status_counts or {}).get(key) or 0) for key in TASK_STATUSES}
    total_tasks = sum(counts.values())
    open_tasks = counts['todo'] + counts['doing']
    done = counts['done']
    completion = int(round((done / total_tasks) * 100)) if total_tasks else 0
    payload = {
        'notes': int(note_total or 0),
        'pinned_notes': int(note_pinned or 0),
        'notes_shared_with_me': int(shared_notes or 0),
        'shared_notes': int(shared_notes or 0),
        'tasks': total_tasks,
        'open_tasks': open_tasks,
        'due_today': int(due_today or 0),
        'overdue': int(overdue or 0),
        'todo': counts['todo'],
        'doing': counts['doing'],
        'done_tasks': done,
        'cancelled': counts['cancelled'],
        'completion_rate': completion,
        'shared_tasks': int(shared_tasks or 0),
    }
    if today is not None:
        payload['today'] = today.isoformat()
    return payload
