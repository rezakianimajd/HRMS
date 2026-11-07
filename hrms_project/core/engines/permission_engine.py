"""
Permission Engine — RBAC ریز بر اساس کاتالوگ منوها + سازگاری با مجوزهای قدیمی.

دو لایهٔ مجوز:
1. **قدیمی (module-level)**: ``treasury_execute``، ``can_manage_documents`` … — همان چیزی که
   ویوها با ``require(user, 'treasury_execute')`` صدا می‌زنند.
2. **ریز (menu-level)**: ``treasury.receipts.edit`` — «ماژول.منو.عملیات» برای تک‌تک منوها
   (مشاهده/ایجاد/ویرایش/حذف/تأیید/خروجی) از ``core/permission_catalog.py``.

هر دو لایه هم‌خوان‌اند: مجوز ریز ⇒ چک قدیمی همان ماژول پاس می‌شود (``LEGACY_RULES``) و برعکس؛
پس کد ویوهای موجود نیازی به تغییر ندارد.
"""
from core.permission_catalog import (
    LEGACY_RULES, all_codes as catalog_codes, is_valid_code,
    legacy_permissions_from_fine, module_any_permission,
)

ALL_PERMISSIONS = [
    'can_view_all_employees', 'can_add_employee', 'can_change_employee',
    'can_delete_employee', 'can_view_sensitive_data', 'can_manage_documents',
    'can_delete_documents', 'can_approve_documents', 'can_publish_documents',
    'can_approve_leaves', 'can_edit_settings',
    'can_manage_users', 'can_manage_roles', 'can_manage_companies',
    'can_view_audit_logs',
    'treasury_view',
    'treasury_request',
    'treasury_execute',
    'treasury_approve',
    'treasury_manage_config',
]


def _role_override(role):
    """ردیف ذخیره‌شدهٔ مجوزهای نقش (RolePermission) یا None."""
    from core.models.user import RolePermission

    return RolePermission.objects.filter(role=role).first()


def user_access_record(user):
    """ردیف مجوزهای کاربر (UserAccess) یا None."""
    from core.models.user import UserAccess

    if not user or not getattr(user, 'is_authenticated', False):
        return None
    return UserAccess.objects.filter(user=user).first()


def fine_permissions_for(user):
    """کدهای ریز داده‌شده به کاربر: dict(code → bool) — منبع اصلی: UserAccess."""
    granted = {}
    if not user or not getattr(user, 'is_authenticated', False):
        return granted
    if getattr(user, 'is_superuser', False):
        return {code: True for code in catalog_codes()}

    access = user_access_record(user)
    if access is not None:
        if access.is_full_access:
            return {code: True for code in catalog_codes()}
        for key, value in (access.permissions or {}).items():
            if is_valid_code(key):
                granted[key] = bool(value)
        return granted

    # سازگاری: کاربرانی که هنوز مجوز کاربری ندارند، از نقش قدیمی استفاده می‌کنند
    profile = getattr(user, 'profile', None)
    if profile is None:
        return granted
    override = _role_override(profile.role)
    saved = (override.permissions or {}) if override else {}
    for key, value in saved.items():
        if is_valid_code(key):
            granted[key] = bool(value)
    return granted


def permissions_for(user):
    """مجوزهای لایهٔ قدیمی — از مجوزهای کاربر مشتق می‌شود (سازگاری با ویوها)."""
    if getattr(user, 'is_superuser', False):
        return {permission: True for permission in ALL_PERMISSIONS}
    if not user or not getattr(user, 'is_authenticated', False):
        return {permission: False for permission in ALL_PERMISSIONS}

    access = user_access_record(user)
    if access is not None:
        if access.is_full_access:
            return {permission: True for permission in ALL_PERMISSIONS}
        granted = {code for code, value in (access.permissions or {}).items() if value}
        derived = legacy_permissions_from_fine(granted)
        return {permission: bool(derived.get(permission, False))
                for permission in ALL_PERMISSIONS}

    profile = getattr(user, 'profile', None)
    if profile is None:
        return {permission: False for permission in ALL_PERMISSIONS}
    return profile._effective_permissions()


def _legacy_implied(legacy_code, granted_fine):
    """آیا مجوزهای ریز، این مجوز قدیمی را نتیجه می‌دهند؟"""
    for module, actions in LEGACY_RULES.get(legacy_code, []):
        if module_any_permission(granted_fine, module, actions):
            return True
    return False


def _fine_implied(fine_code, legacy_perms):
    """آیا مجوزهای قدیمی، این مجوز ریز را نتیجه می‌دهند؟"""
    parts = str(fine_code).split('.')
    if len(parts) != 3:
        return False
    module, _menu, action = parts
    for legacy_code, rules in LEGACY_RULES.items():
        if not legacy_perms.get(legacy_code, False):
            continue
        for rule_module, actions in rules:
            if rule_module == module and action in actions:
                return True
    return False


def can(user, permission):
    """آیا کاربر این مجوز (قدیمی یا ریز) را دارد؟"""
    if not user or not user.is_authenticated:
        return False
    if getattr(user, 'is_superuser', False):
        return True

    if is_valid_code(permission):
        if fine_permissions_for(user).get(permission, False):
            return True
        return _fine_implied(permission, permissions_for(user))

    if permissions_for(user).get(permission, False):
        return True
    return _legacy_implied(permission, fine_permissions_for(user))


def require(user, permission):
    """PermissionDenied اگر کاربر مجوز نداشته باشد (چک سمت ویو)."""
    from django.core.exceptions import PermissionDenied

    if not can(user, permission):
        raise PermissionDenied(f'دسترسی غیرمجاز — به مجوز «{permission}» نیاز دارید.')


def can_any(user, permissions):
    return any(can(user, permission) for permission in permissions)


def effective_summary(user):
    """خلاصهٔ مجوزها برای فرانت: لایهٔ قدیمی + شمارش مجوزهای ریز."""
    fine = fine_permissions_for(user)
    granted = {code for code, value in fine.items() if value}
    modules = {}
    for code in granted:
        module = code.split('.')[0]
        modules[module] = modules.get(module, 0) + 1
    return {
        'legacy': permissions_for(user) if user and user.is_authenticated else {},
        'fine': fine,
        'granted_count': len(granted),
        'modules': modules,
    }
