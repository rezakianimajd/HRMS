"""مدیریت «مجوزهای ریز هر کاربر» (پرسنل) — بدون نقش‌محوری.

- فقط یک «مدیر سیستم» با دسترسی کامل وجود دارد (سوپریوزر یا `is_full_access`).
- برای هر کاربر به‌صورت مستقل، برای تک‌تک منوها مجوز صادر می‌شود:
  `module.menu.action` با عملیات view/create/edit/delete/approve/export.
- یک کاربر می‌تواند در یک ماژول فقط «مشاهده» و در ماژول دیگر «تأیید» داشته باشد.

اندپوینت‌ها (زیر `/api/`):
- ``GET  users/``                   فهرست کاربران + عنوان شغلی + خلاصهٔ مجوزها
- ``GET  users/access/catalog/``    کاتالوگ ماژول/گروه/منو/عملیات (ماتریس)
- ``GET  users/<id>/access/``       مجوزهای یک کاربر
- ``POST users/<id>/access/``       ذخیرهٔ مجوزهای یک کاربر (ماتریس + دسترسی کامل)
"""
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.employee_link import employee_link_payload
from core.models.user import AccessRole, UserAccess, UserProfile
from core.permission_catalog import (
    ACTIONS, all_codes, catalog, is_valid_code, modules_brief, stats,
)


def _public_schema(view):
    """اجرای ویو در schema عمومی (مدل‌های کاربر/دسترسی آنجا هستند)."""
    from core.views import _public_schema as wrapper

    return wrapper(view)


def _allowed(request):
    """مدیر سیستم (سوپریوزر) یا کاربری با دسترسی کامل."""
    if request.user.is_superuser:
        return True
    access = UserAccess.objects.filter(user=request.user).first()
    return bool(access and access.is_full_access)


def _forbidden():
    return Response({'error': 'دسترسی غیرمجاز — مدیریت کاربران لازم است.'}, status=403)


def _granted(user):
    """کدهای مجوز داده‌شده به کاربر (سوپریوزر/دسترسی کامل → همه)."""
    if user.is_superuser:
        return set(all_codes())
    access = UserAccess.objects.filter(user=user).first()
    if access is None:
        return set()
    if access.is_full_access:
        return set(all_codes())
    return {
        code for code, value in (access.permissions or {}).items()
        if value and is_valid_code(code)
    }


def _user_row(user, roles):
    access = UserAccess.objects.filter(user=user).first()
    granted = _granted(user)
    profile = getattr(user, 'profile', None)
    role_code = profile.role if profile else ''
    full = bool(user.is_superuser or (access and access.is_full_access))
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'full_name': (user.get_full_name() or user.username).strip(),
        'is_active': user.is_active,
        'is_superuser': user.is_superuser,
        'is_full_access': full,
        'permissions_granted': 'همه' if full else len(granted),
        'modules': modules_brief(granted),
        'applications': list(access.applications or []) if access else [],
        'role': role_code,
        'role_name': roles.get(role_code, role_code),
        'last_login': user.last_login.isoformat() if user.last_login else None,
        'date_joined': user.date_joined.isoformat() if user.date_joined else None,
        'updated_at': access.updated_at.isoformat() if access else None,
        **employee_link_payload(profile),
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@_public_schema
def access_users_view(request):
    """فهرست کاربران با عنوان شغلی پرسنل + خلاصهٔ مجوزهای ریز."""
    if not _allowed(request):
        return _forbidden()
    AccessRole.ensure_system_roles()
    roles = {row.code: row.name for row in AccessRole.objects.all()}

    queryset = User.objects.select_related('profile', 'access').order_by('username')
    show_inactive = str(request.query_params.get('inactive') or '') in ('1', 'true')
    if not show_inactive:
        queryset = queryset.filter(is_active=True)
    rows = [_user_row(user, roles) for user in queryset]
    return Response({'count': len(rows), 'results': rows})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@_public_schema
def access_catalog_view(request):
    """کاتالوگ ماژول/گروه/منو/عملیات برای ماتریس مجوز کاربر."""
    if not _allowed(request):
        return _forbidden()
    return Response({
        'catalog': catalog(),
        'actions': [{'key': key, 'label': label, 'hint': hint} for key, label, hint in ACTIONS],
        'stats': stats(),
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@_public_schema
def user_access_view(request, user_id):
    """خواندن/ذخیرهٔ مجوزهای ریز یک کاربر."""
    if not _allowed(request):
        return _forbidden()
    target = User.objects.filter(id=user_id).first()
    if target is None:
        return Response({'error': 'کاربر یافت نشد.'}, status=404)

    if request.method == 'GET':
        access = UserAccess.objects.filter(user=target).first()
        granted = _granted(target)
        return Response({
            'user': {
                'id': target.id,
                'username': target.username,
                'full_name': (target.get_full_name() or target.username).strip(),
                'is_superuser': target.is_superuser,
            },
            'full_access': bool(target.is_superuser or (access and access.is_full_access)),
            'permissions': {code: True for code in granted},
            'applications': list(access.applications or []) if access else [],
            'note': getattr(access, 'note', '') or '',
            'updated_at': access.updated_at.isoformat() if access else None,
            'catalog': catalog(),
            'actions': [
                {'key': key, 'label': label, 'hint': hint} for key, label, hint in ACTIONS
            ],
            'stats': stats(),
        })

    if target.is_superuser:
        return Response(
            {'error': 'مجوزهای مدیر سیستم (سوپریوزر) قابل تغییر نیست.'}, status=400,
        )

    full_access = str(request.data.get('full_access')).lower() in ('1', 'true', 'on')
    raw = request.data.get('permissions') or {}
    if isinstance(raw, list):
        raw = {code: True for code in raw}
    clean = {}
    rejected = []
    for code, value in raw.items():
        if not isinstance(code, str) or '.' not in code:
            continue
        if is_valid_code(code):
            if value:
                clean[code] = True
        else:
            rejected.append(code)

    applications = request.data.get('applications')
    access, _created = UserAccess.objects.get_or_create(user=target)
    access.is_full_access = bool(full_access)
    access.permissions = {} if full_access else clean
    if applications is not None:
        access.applications = [str(item) for item in applications]
    note = request.data.get('note')
    if note is not None:
        access.note = str(note)[:250]
    access.updated_by = getattr(request.user, 'username', '')
    access.save()

    return Response({
        'message': (
            f'دسترسی کامل برای «{target.username}» فعال شد.'
            if full_access else
            f'{len(clean)} مجوز برای «{target.username}» ذخیره شد.'
        ),
        'user_id': target.id,
        'full_access': full_access,
        'granted': len(clean),
        'modules': modules_brief(set(clean)),
        'rejected': rejected[:20],
    })



# ── سازگاری با نسخهٔ قبلی (نقش‌ها) — UI دیگر از این‌ها استفاده نمی‌کند ──────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@_public_schema
def access_user_set_role_view(request, user_id):
    """تغییر نقش قدیمی کاربر (اثری روی مجوزهای ریز ندارد؛ فقط برچسب/سازگاری)."""
    if not _allowed(request):
        return _forbidden()
    user = User.objects.filter(id=user_id, is_active=True).first()
    if user is None:
        return Response({'error': 'کاربر یافت نشد.'}, status=404)

    AccessRole.ensure_system_roles()
    role_obj = AccessRole.objects.filter(
        code=str(request.data.get('role') or '').strip(), is_active=True,
    ).first()
    if role_obj is None:
        return Response({'error': 'نقش نامعتبر است.'}, status=400)

    profile, _created = UserProfile.objects.get_or_create(user=user)
    profile.role = role_obj.code
    profile.save(update_fields=['role', 'updated_at'])
    return Response({'role': role_obj.code, 'role_name': role_obj.name})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@_public_schema
def roles_overview_view(request):
    """(سازگاری) فهرست نقش‌های سیستمی + کاتالوگ؛ صفحهٔ جدید از آن استفاده نمی‌کند."""
    if not _allowed(request):
        return _forbidden()
    AccessRole.ensure_system_roles()
    rows = []
    for role in AccessRole.objects.filter(is_active=True):
        rows.append({
            'code': role.code,
            'name': role.name,
            'description': role.description,
            'color': role.color,
            'base_role': role.base_role,
            'is_system': role.is_system,
            'employees': UserProfile.objects.filter(role=role.code).count(),
        })
    return Response({
        'roles': rows,
        'catalog': catalog(),
        'actions': [{'key': key, 'label': label, 'hint': hint} for key, label, hint in ACTIONS],
        'stats': stats(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@_public_schema
def permission_catalog_view(request):
    return access_catalog_view(request)

