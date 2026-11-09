"""گیت مجوز ریز برای «سازمان‌ها و اشخاص» در تعاریف حسابداری.

لایهٔ مجوز ``<module>.<menu>.<action>`` است (``core.permission_catalog``):

* اگر کاربر کد ریزِ همین منو (``accounting.acc-org-parties.*``) را داشته باشد،
  دقیقاً همان اعمال می‌شود.
* در غیر این صورت، برای سازگاری با کاربران قدیمی، هر مجوز حسابداری با همان
  عمل (``module_action_granted``) پذیرفته می‌شود تا کسی قفل نشود.
"""
from django.core.exceptions import PermissionDenied

MODULE = 'accounting'
MENU = 'acc-org-parties'

# نگاشت عمل ویو به کدهای مجوز (اولی خواستهٔ اصلی، بعدی‌ها سازگاری)
ACTION_FALLBACKS = {
    'view': ('view',),
    'create': ('create',),
    'edit': ('edit', 'create'),
    'delete': ('delete',),
    'export': ('export', 'view'),
}


def granted_codes(user):
    """کدهای ریز داده‌شده در ماژول حسابداری (فقط True)."""
    if not user or not getattr(user, 'is_authenticated', False):
        return set()
    from core.engines.permission_engine import fine_permissions_for

    return {
        code for code, value in fine_permissions_for(user).items()
        if value and str(code).startswith(f'{MODULE}.')
    }


def has_permission(user, action):
    """آیا کاربر این عمل را روی سازمان‌ها و اشخاص دارد؟"""
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_superuser', False):
        return True

    from core.engines.permission_engine import module_action_granted

    wanted = ACTION_FALLBACKS.get(action, (action,))
    codes = granted_codes(user)
    if any(f'{MODULE}.{MENU}.{item}' in codes for item in wanted):
        return True
    return module_action_granted(user, MODULE, wanted)


def require(user, action, label='سازمان‌ها و اشخاص'):
    """PermissionDenied با پیام فارسی اگر مجوز نباشد."""
    if not has_permission(user, action):
        raise PermissionDenied(
            f'دسترسی غیرمجاز — برای {label} مجوز «{ACTION_FALLBACKS.get(action, (action,))[0]}» لازم است.',
        )


class OrgPartyPermissionMixin:
    """گیت per-action روی ویوست سازمان‌ها و اشخاص."""

    action_permission_map = {
        'list': 'view', 'retrieve': 'view', 'stats': 'view', 'options': 'view', 'meta': 'view',
        'create': 'create',
        'update': 'edit', 'partial_update': 'edit', 'toggle_status': 'edit',
        'destroy': 'delete',
    }

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        wanted = self.action_permission_map.get(self.action, 'view')
        require(request.user, wanted)
