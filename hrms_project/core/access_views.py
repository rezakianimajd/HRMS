"""مدیریت نقش‌ها و مجوزهای ریز (منو‌محور) برای کل برنامه.

اندپوینت‌ها (زیر `/api/`):
- ``GET  users/roles/``                     فهرست نقش‌ها + مجوزهای ریز + شمارش کاربران
- ``GET  users/roles/catalog/``             کاتالوگ ماژول‌ها/منوها/عملیات (برای ماتریس مجوز)
- ``POST users/roles/<role>/permissions/``  ذخیرهٔ ماتریس مجوزهای یک نقش
- ``POST users/roles/create/``              ساخت نقش سفارشی
- ``POST users/roles/<role>/delete/``       حذف نقش سفارشی (بدون کاربر)
- ``GET  users/``                           فهرست کاربران + عنوان شغلی پرسنل (نقش سازمانی)
- ``POST users/<id>/role/``                 تغییر نقش یک کاربر (سیستمی یا سفارشی)
"""
import functools

from django.contrib.auth.models import User
from django.db.models import Count
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.employee_link import employee_link_payload
from core.models.user import AccessRole, RolePermission, UserProfile
from core.permission_catalog import ACTIONS, all_codes, catalog, stats


def _public_schema(view):
    """اجرای ویو در schema عمومی (مدل‌های کاربر/نقش آنجا هستند)."""
    from core.views import _public_schema as wrapper

    return wrapper(view)


def _allowed(request):
    """فقط مدیر ارشد یا کسی که مجوز مدیریت نقش/کاربر دارد."""
    if request.user.is_superuser:
        return True
    profile = getattr(request.user, 'profile', None)
    if profile is None:
        return False
    return bool(profile.is_hr_manager or profile.can_manage_roles)


def _forbidden():
    return Response({'error': 'دسترسی غیرمجاز — مدیریت کاربران و نقش‌ها لازم است.'}, status=403)


def _role_rows():
    """نقش‌های سیستمی + سفارشی با مجوزهای ریز و شمارش کاربران."""
    AccessRole.ensure_system_roles()
    rows = []
    counts = {
        row['role']: row['total']
        for row in UserProfile.objects.values('role').annotate(total=Count('id'))
    }
    for role in AccessRole.objects.filter(is_active=True):
        override = RolePermission.objects.filter(role=role.code).first()
        saved = dict(override.permissions or {}) if override else {}
        fine = {code: bool(value) for code, value in saved.items() if '.' in code}
        legacy = {code: bool(value) for code, value in saved.items() if '.' not in code}
        rows.append({
            'code': role.code,
            'name': role.name,
            'description': role.description,
            'color': role.color,
            'base_role': role.base_role,
            'is_system': role.is_system,
            'employees': counts.get(role.code, 0),
            'permissions_total': len(fine),
            'permissions': fine,
            'legacy_permissions': legacy,
            'applications': list(override.applications or []) if override else [],
        })
    return rows


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@_public_schema
def roles_overview_view(request):
    """فهرست نقش‌ها + کاتالوگ (یک درخواست برای کل صفحهٔ نقش‌ها)."""
    if not _allowed(request):
        return _forbidden()
    payload = {
        'roles': _role_rows(),
        'catalog': catalog(),
        'actions': [{'key': key, 'label': label, 'hint': hint} for key, label, hint in ACTIONS],
        'stats': stats(),
    }
    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@_public_schema
def permission_catalog_view(request):
    if not _allowed(request):
        return _forbidden()
    return Response({'catalog': catalog(), 'stats': stats()})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@_public_schema
def role_permissions_save_view(request, role):
    """ذخیرهٔ ماتریس مجوزهای یک نقش (کدهای ریز + لایهٔ قدیمی)."""
    if not _allowed(request):
        return _forbidden()
    role_obj = AccessRole.objects.filter(code=role, is_active=True).first()
    if role_obj is None:
        return Response({'error': 'نقش یافت نشد.'}, status=404)

    valid = all_codes()
    raw = request.data.get('permissions') or {}
    if isinstance(raw, list):
        raw = {code: True for code in raw}
    clean = {}
    rejected = []
    for code, value in raw.items():
        if '.' in code:
            if code in valid:
                clean[code] = bool(value)
            else:
                rejected.append(code)
        elif code in UserProfile.ROLE_DEFAULTS.get(role_obj.base_role, {}) or code.startswith('can_') or code.startswith('treasury_'):
            clean[code] = bool(value)

    if role_obj.code == 'super_admin':
        clean = {code: True for code in valid}

    applications = request.data.get('applications')
    defaults = {'permissions': clean}
    if applications is not None:
        defaults['applications'] = (
            '*' if applications == '*' else [str(item) for item in applications]
        )
    RolePermission.objects.update_or_create(role=role_obj.code, defaults=defaults)
    return Response({
        'message': f'مجوزهای نقش «{role_obj.name}» ذخیره شد.',
        'role': role_obj.code,
        'granted': sum(1 for value in clean.values() if value),
        'rejected': rejected[:20],
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@_public_schema
def role_create_view(request):
    """ساخت نقش سفارشی (کد یکتا، نام فارسی، نقش پایه)."""
    if not _allowed(request):
        return _forbidden()
    code = str(request.data.get('code') or '').strip().lower()
    name = str(request.data.get('name') or '').strip()
    if not code or not name:
        return Response({'error': 'کد و نام نقش الزامی است.'}, status=400)
    if len(code) > 50 or not code.replace('_', '').replace('-', '').isalnum():
        return Response({'error': 'کد نقش فقط حروف/عدد/خط تیره و حداکثر ۵۰ کاراکتر.'}, status=400)
    if AccessRole.objects.filter(code=code).exists():
        return Response({'error': 'این کد نقش قبلاً ثبت شده است.'}, status=400)

    base_role = str(request.data.get('base_role') or 'employee')
    if base_role not in UserProfile.ROLE_DEFAULTS:
        base_role = 'employee'

    role = AccessRole.objects.create(
        code=code,
        name=name,
        description=str(request.data.get('description') or ''),
        base_role=base_role,
        color=str(request.data.get('color') or '#64748b'),
        is_system=False,
        is_active=True,
        sort_order=int(request.data.get('sort_order') or 100),
    )
    return Response({'code': role.code, 'name': role.name}, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@_public_schema
def role_delete_view(request, role):
    """حذف نقش سفارشی؛ نقش سیستمی یا نقش دارای کاربر حذف نمی‌شود."""
    if not _allowed(request):
        return _forbidden()
    role_obj = AccessRole.objects.filter(code=role).first()
    if role_obj is None:
        return Response({'error': 'نقش یافت نشد.'}, status=404)
    if role_obj.is_system:
        return Response({'error': 'نقش سیستمی قابل حذف نیست.'}, status=400)
    in_use = UserProfile.objects.filter(role=role_obj.code).count()
    if in_use:
        return Response({'error': f'این نقش برای {in_use} کاربر استفاده می‌شود.'}, status=400)
    RolePermission.objects.filter(role=role_obj.code).delete()
    role_obj.delete()
    return Response({'message': 'نقش حذف شد.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@_public_schema
def access_users_view(request):
    """فهرست کاربران با عنوان شغلی پرسنل + نقش + شمارش مجوزهای ریز."""
    if not _allowed(request):
        return _forbidden()
    AccessRole.ensure_system_roles()
    roles = {row.code: row.name for row in AccessRole.objects.all()}
    from core.engines.permission_engine import fine_permissions_for

    rows = []
    for user in User.objects.filter(is_active=True).select_related('profile').order_by('username'):
        profile = getattr(user, 'profile', None)
        fine = fine_permissions_for(user) if not user.is_superuser else {}
        granted = sum(1 for value in fine.values() if value)
        role_code = profile.role if profile else ''
        rows.append({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': (user.get_full_name() or user.username).strip(),
            'is_active': user.is_active,
            'is_superuser': user.is_superuser,
            'role': role_code,
            'role_name': roles.get(role_code, role_code),
            'applications': list(profile.applications.values_list('id', flat=True)) if profile else [],
            'permissions_granted': 'همه' if user.is_superuser else granted,
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'date_joined': user.date_joined.isoformat() if user.date_joined else None,
            **employee_link_payload(profile, request),
        })
    return Response({'count': len(rows), 'results': rows})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@_public_schema
def access_user_set_role_view(request, user_id):
    """تغییر نقش کاربر (سیستمی یا سفارشی) + همگام‌سازی ماژول‌های مجاز."""
    if not _allowed(request):
        return _forbidden()
    user = User.objects.filter(id=user_id, is_active=True).first()
    if user is None:
        return Response({'error': 'کاربر یافت نشد.'}, status=404)

    AccessRole.ensure_system_roles()
    role_code = str(request.data.get('role') or '').strip()
    role_obj = AccessRole.objects.filter(code=role_code, is_active=True).first()
    if role_obj is None:
        return Response({'error': 'نقش نامعتبر است.'}, status=400)

    profile, _created = UserProfile.objects.get_or_create(user=user)
    profile.role = role_obj.code
    profile.save(update_fields=['role', 'updated_at'])
    return Response({
        'message': f'نقش کاربر به «{role_obj.name}» تغییر کرد.',
        'role': role_obj.code,
        'role_name': role_obj.name,
    })

