"""
Permission Engine — centralized RBAC check.
Each caller asks: can this request user perform `<permission>`?
"""
from django.contrib.auth.models import User

ALL_PERMISSIONS = [
    'can_view_all_employees', 'can_add_employee', 'can_change_employee',
    'can_delete_employee', 'can_view_sensitive_data', 'can_manage_documents',
    'can_delete_documents', 'can_approve_leaves', 'can_edit_settings',
    'can_manage_users', 'can_manage_roles', 'can_manage_companies',
    'can_view_audit_logs',
]


def permissions_for(user):
    """Return the full effective permission dict for a request user.

    superuser/implicitly granted everything (system owner).
    """
    if getattr(user, 'is_superuser', False):
        return {p: True for p in ALL_PERMISSIONS}

    profile = getattr(user, 'profile', None)
    if profile is None:
        # fallback to django groups could be added later; default deny-all
        return {p: False for p in ALL_PERMISSIONS}
    return profile._effective_permissions()


def can(user, permission):
    """Boolean — does this user (must not be Anonymous) hold `permission`?"""
    if not user or not user.is_authenticated:
        return False
    if getattr(user, 'is_superuser', False):
        return True
    perms = permissions_for(user)
    return bool(perms.get(permission, False))


def require(user, permission):
    """Raise PermissionDenied if user lacks permission. Used by caller-side."""
    from django.core.exceptions import PermissionDenied
    if not can(user, permission):
        raise PermissionDenied(f'دسترسی غیرمجاز — به مجوز «{permission}» نیاز دارید.')