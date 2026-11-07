"""کاتالوگ مجوزهای ریز برنامه — منبع واحد (backend + UI).

هر «منو» در سایدبار یک شناسهٔ مجوز دارد: ``<module>.<menu>.<action>``
و عملیات استاندارد: view / create / edit / delete / approve / export.

منبع داده: ``core/permission_catalog_data.json`` که از ``menuConfig.js``
استخراج شده است (۱۰ ماژول، ۷۵ گروه، ۲۵۹ منو). برای افزودن منوی جدید:
ابتدا منو را در ``menuConfig.js`` بسازید، سپس JSON را بازتولید کنید.
"""
import json
from pathlib import Path

DATA_FILE = Path(__file__).with_name('permission_catalog_data.json')

ACTIONS = [
    ('view', 'مشاهده', 'مشاهدهٔ منو و اطلاعات'),
    ('create', 'ایجاد', 'افزودن رکورد جدید'),
    ('edit', 'ویرایش', 'تغییر اطلاعات موجود'),
    ('delete', 'حذف', 'حذف/ابطال رکورد'),
    ('approve', 'تأیید', 'تأیید یا رد گردش‌کار'),
    ('export', 'خروجی', 'چاپ و دریافت فایل'),
]

ACTION_KEYS = [row[0] for row in ACTIONS]

# منوهایی که «تأیید» برایشان معنا دارد (بر اساس شناسه/مسیر)
APPROVE_HINTS = (
    'request', 'leave', 'approval', 'approve', 'check', 'voucher', 'payment',
    'receipt', 'document', 'contract', 'correspondence', 'letter', 'order',
    'referral', 'commitment', 'reconcile', 'payroll', 'payslip', 'appraisal',
    'recruit', 'lifecycle', 'loan', 'advance', 'transfer', 'stock', 'purchase',
)
EXPORT_HINTS = ('report', 'archive', 'statement', 'ledger', 'print', 'export', 'verify')
# منوهایی که ایجاد/حذف برایشان معنا ندارد (نمایشی/گزارشی)
READONLY_ONLY_HINTS = ('dashboard', 'report', 'overview', 'calendar', 'verify', 'insight')

MODULE_META = {
    'hrms': {'name': 'منابع انسانی', 'slug': 'hrms', 'color': '#6366f1'},
    'contracts': {'name': 'قراردادها', 'slug': 'contracts', 'color': '#f59e0b'},
    'documents': {'name': 'مدیریت اسناد', 'slug': 'documents', 'color': '#0f766e'},
    'projects': {'name': 'پروژه‌ها', 'slug': 'projects', 'color': '#8b5cf6'},
    'accounting': {'name': 'حسابداری و مالی', 'slug': 'accounting', 'color': '#0ea5e9'},
    'treasury': {'name': 'خزانه‌داری', 'slug': 'treasury', 'color': '#14b8a6'},
    'procurement': {'name': 'تدارکات و انبار', 'slug': 'procurement', 'color': '#3b82f6'},
    'pettycash': {'name': 'تنخواه', 'slug': 'pettycash', 'color': '#f59e0b'},
    'correspondence': {'name': 'مکاتبات', 'slug': 'correspondence', 'color': '#0ea5e9'},
    'settings': {'name': 'تنظیمات و تعاریف', 'slug': 'settings', 'color': '#64748b'},
}

# نگاشت مجوزهای قدیمی (ماژول‌محور) به مجوزهای ریز جدید:
# هر کلید قدیمی ⇒ مجموعه‌ای از (module, actions) که مجاز می‌کند.
LEGACY_RULES = {
    'treasury_view': [('treasury', ('view',))],
    'treasury_request': [('treasury', ('create',))],
    'treasury_execute': [('treasury', ('create', 'edit'))],
    'treasury_approve': [('treasury', ('approve',))],
    'treasury_manage_config': [('treasury', ('create', 'edit', 'delete'))],
    'can_view_all_employees': [('hrms', ('view',))],
    'can_add_employee': [('hrms', ('create',))],
    'can_change_employee': [('hrms', ('edit',))],
    'can_delete_employee': [('hrms', ('delete',))],
    'can_manage_documents': [('documents', ('create', 'edit'))],
    'can_delete_documents': [('documents', ('delete',))],
    'can_approve_documents': [('documents', ('approve',))],
    'can_publish_documents': [('documents', ('approve', 'edit'))],
    'can_approve_leaves': [('hrms', ('approve',))],
    'can_view_sensitive_data': [('hrms', ('view',))],
    'can_edit_settings': [('settings', ('create', 'edit'))],
    'can_manage_users': [('settings', ('create', 'edit', 'delete'))],
    'can_manage_roles': [('settings', ('create', 'edit', 'delete'))],
    'can_manage_companies': [('settings', ('edit',))],
    'can_view_audit_logs': [('settings', ('view',))],
}


def _load_raw():
    with DATA_FILE.open(encoding='utf-8') as handle:
        return json.load(handle)


def _available_actions(menu_id, path):
    hint = f'{menu_id} {path}'.lower()
    if any(token in hint for token in READONLY_ONLY_HINTS):
        actions = ['view']
        if any(token in hint for token in EXPORT_HINTS):
            actions.append('export')
        return actions
    actions = ['view', 'create', 'edit', 'delete']
    if any(token in hint for token in APPROVE_HINTS):
        actions.append('approve')
    if any(token in hint for token in EXPORT_HINTS):
        actions.append('export')
    return actions


_CACHE = {}


def catalog():
    """کاتالوگ کامل: هر ماژول → گروه‌ها → منوها با مجوزهای ریز."""
    if 'data' in _CACHE:
        return _CACHE['data']
    modules = []
    for raw in _load_raw():
        slug = raw['slug']
        meta = MODULE_META.get(
            slug, {'name': raw.get('name', slug), 'slug': slug, 'color': '#64748b'},
        )
        groups = []
        seen = set()
        for group in raw.get('groups', []):
            items = []
            for item in group.get('items', []):
                menu_id = (item.get('id') or '').strip()
                if not menu_id or menu_id in seen:
                    continue
                seen.add(menu_id)
                menu_key = menu_id[len(f'{slug}-'):] if menu_id.startswith(f'{slug}-') else menu_id
                if not menu_key:
                    menu_key = menu_id
                path = item.get('path', '') or ''
                actions = _available_actions(menu_id, path)
                items.append({
                    'id': menu_key,
                    'title': item.get('title', menu_id),
                    'path': path,
                    'actions': actions,
                    'codes': {action: f'{slug}.{menu_key}.{action}' for action in actions},
                })
            if items:
                groups.append({'title': group.get('title', ''), 'items': items})
        modules.append({
            'slug': slug,
            'name': meta['name'],
            'color': meta['color'],
            'groups': groups,
            'menu_count': sum(len(group['items']) for group in groups),
            'code_count': sum(
                len(item['actions']) for group in groups for item in group['items']
            ),
        })
    _CACHE['data'] = modules
    return modules


def module_slugs():
    return [module['slug'] for module in catalog()]


def codes_for(module_slug=None):
    """همهٔ کدهای مجوز (اختیاری: فقط یک ماژول)."""
    result = []
    for module in catalog():
        if module_slug and module['slug'] != module_slug:
            continue
        for group in module['groups']:
            for item in group['items']:
                result.extend(item['codes'].values())
    return result


ALL_CODES = None


def all_codes():
    global ALL_CODES
    if ALL_CODES is None:
        ALL_CODES = set(codes_for())
    return ALL_CODES


def is_valid_code(code):
    return code in all_codes()


def action_label(action):
    return {key: label for key, label, _hint in ACTIONS}.get(action, action)


def stats():
    modules = catalog()
    return {
        'modules': len(modules),
        'groups': sum(len(module['groups']) for module in modules),
        'menus': sum(module['menu_count'] for module in modules),
        'codes': sum(module['code_count'] for module in modules),
        'actions': [
            {'key': key, 'label': label, 'hint': hint} for key, label, hint in ACTIONS
        ],
    }


def parse_code(code):
    """``treasury.receipts.view`` → (module, menu, action)."""
    parts = str(code or '').split('.')
    if len(parts) != 3:
        return None
    return tuple(parts)


def module_any_permission(granted, module, actions):
    """آیا در مجموعهٔ مجوزهای داده‌شده، مجوزی برای این ماژول/عملیات هست؟"""
    if not granted:
        return False
    prefix = f'{module}.'
    suffixes = tuple(f'.{action}' for action in actions)
    return any(code.startswith(prefix) and code.endswith(suffixes) for code in granted)

