"""جست‌وجوی موجودیت‌ها برای «الصاق/ارجاع» در چت.

جست‌وجو **در خودِ ماژول مقصد** انجام می‌شود (نه در چت): از موتور جست‌وجوی ماژول‌ها
(``core.module_search``) استفاده می‌کنیم و فقط ماژول‌هایی را برمی‌گردانیم که کاربر
مجوز خواندن آن‌ها را دارد. خروجی، «ارجاع» است نه کپی داده.
"""
from __future__ import annotations

from communication.permissions import can_read_module

# ماژول‌های قابل ارجاع در چت (به ترتیب نمایش)
ENTITY_MODULES = (
    'contracts',
    'projects',
    'procurement',
    'accounting',
    'treasury',
    'documents',
    'correspondence',
    'hr',
)


def _object_id(row):
    value = str(row.get('id') or '')
    for prefix in (f"{row.get('type') or ''}-", 'document-', 'letter-'):
        if prefix and value.startswith(prefix):
            return value[len(prefix):]
    return value


def search_entities(user, query, modules=None, per_module=6, total_limit=40):
    """جست‌وجوی موجودیت در ماژول‌های مجاز کاربر.

    خروجی: ``[{module, module_label, object_type, object_id, label, subtitle, url}]``
    """
    from core.module_search import module_search

    text = str(query or '').strip()
    if len(text) < 2:
        return []
    requested = [item for item in (modules or []) if item in ENTITY_MODULES]
    targets = requested or list(ENTITY_MODULES)

    results = []
    for module in targets:
        if not can_read_module(user, module):
            continue
        try:
            payload = module_search(text, module)
        except Exception:  # noqa: BLE001 — جست‌وجوی یک ماژول نباید کل نتیجه را بشکند
            continue
        for row in (payload or {}).get('results', [])[:per_module]:
            results.append({
                'module': module,
                'module_label': payload.get('module_label') or module,
                'object_type': row.get('type') or module,
                'object_id': _object_id(row),
                'label': row.get('title') or '',
                'subtitle': row.get('subtitle') or '',
                'url': row.get('path') or '',
                'icon': row.get('icon') or '',
                'color': row.get('color') or '',
            })
            if len(results) >= total_limit:
                return results
    return results


def entity_to_ref(entity):
    """تبدیل نتیجهٔ جست‌وجو به ``entity_refs`` قابل ارسال در POST پیام."""
    if not entity:
        return None
    module = str(entity.get('module') or '').strip()[:40]
    if not module:
        return None
    return {
        'module': module,
        'object_type': str(entity.get('object_type') or '')[:60],
        'object_id': str(entity.get('object_id') or '')[:60],
        'label': str(entity.get('label') or '')[:200],
        'url': str(entity.get('url') or '')[:300],
    }
