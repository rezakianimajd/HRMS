"""User management views for the Settings module."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from core.models.user import UserProfile, RolePermission, ROLE_PERMISSIONS
from core.models import Company


def _get_company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


def _get_user_profile(user):
    try:
        return user.profile
    except (UserProfile.DoesNotExist, AttributeError):
        return None


def _can_manage_users(user):
    profile = _get_user_profile(user)
    if profile:
        return profile.can_manage_users
    return user.is_superuser


def _can_manage_roles(user):
    profile = _get_user_profile(user)
    if profile:
        return profile.can_manage_roles
    return user.is_superuser


def _serialize_user(user):
    profile = _get_user_profile(user)
    companies = []
    current_company = None
    role = 'employee'
    if profile:
        companies = [{'id': c.id, 'name': c.name, 'code': c.code} for c in profile.companies.all()]
        current_company = profile.current_company.id if profile.current_company else None
        role = profile.role
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_active': user.is_active,
        'is_superuser': user.is_superuser,
        'role': role,
        'role_display': dict(UserProfile.Role.choices).get(role, role),
        'phone': profile.phone if profile else None,
        'companies': companies,
        'current_company': current_company,
        'last_login': user.last_login.isoformat() if user.last_login else None,
        'date_joined': user.date_joined.isoformat() if user.date_joined else None,
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def users_list(request):
    """List users (admin/HR manager only)."""
    if not _can_manage_users(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)
    users = User.objects.all().order_by('-date_joined')
    return Response([_serialize_user(u) for u in users])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def users_create(request):
    """Create a new user (admin/HR manager only)."""
    if not _can_manage_users(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    username = request.data.get('username')
    password = request.data.get('password')
    if not username or not password:
        return Response({'error': 'نام کاربری و رمز عبور الزامی است'}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'این نام کاربری قبلاً ثبت شده است'}, status=400)

    user = User.objects.create_user(
        username=username,
        password=password,
        email=request.data.get('email', ''),
        first_name=request.data.get('first_name', ''),
        last_name=request.data.get('last_name', ''),
    )

    role = request.data.get('role', 'employee')
    profile, _ = UserProfile.objects.get_or_create(user=user, defaults={'role': role})
    profile.role = role
    profile.save()

    company_ids = request.data.get('company_ids', [])
    if company_ids:
        profile.companies.set(company_ids)
    else:
        company = _get_company(request)
        if company:
            profile.companies.set([company.id])
            profile.current_company = company
            profile.save()

    return Response(_serialize_user(user), status=201)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def users_update(request, user_id):
    """Update a user's role, active status, and companies."""
    if not _can_manage_users(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'کاربر یافت نشد'}, status=404)

    # Update basic fields
    if 'first_name' in request.data:
        user.first_name = request.data['first_name']
    if 'last_name' in request.data:
        user.last_name = request.data['last_name']
    if 'email' in request.data:
        user.email = request.data['email']
    if 'is_active' in request.data:
        user.is_active = request.data['is_active']
    user.save()

    # Update password if provided
    if request.data.get('password'):
        user.set_password(request.data['password'])
        user.save()

    # Update profile
    profile, _ = UserProfile.objects.get_or_create(user=user)
    if request.data.get('role'):
        profile.role = request.data['role']
    if 'phone' in request.data:
        profile.phone = request.data['phone']
    company_ids = request.data.get('company_ids')
    if company_ids is not None:
        profile.companies.set(company_ids)
    if request.data.get('current_company'):
        profile.current_company_id = request.data['current_company']
    profile.save()

    return Response(_serialize_user(user))


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def users_delete(request, user_id):
    """Hard delete a user and their profile."""
    if not _can_manage_users(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'کاربر یافت نشد'}, status=404)

    # Prevent deleting yourself (would lock you out).
    if user.id == request.user.id:
        return Response({'error': 'نمی‌توانید حساب خود را حذف کنید'}, status=400)

    user.delete()
    return Response({'message': 'کاربر حذف شد'})


ROLE_DESCRIPTIONS = {
    'super_admin': {'label': 'مدیر ارشد سیستم', 'description': 'دسترسی کامل به تمام شرکت‌ها و تنظیمات'},
    'hr_manager': {'label': 'مدیر منابع انسانی', 'description': 'دسترسی کامل به ماژول‌های HR (بدون تنظیمات سیستم)'},
    'hr_specialist': {'label': 'کارشناس منابع انسانی', 'description': 'مدیریت پرسنل و مدارک (بدون حذف)'},
    'department_head': {'label': 'مدیر دپارتمان', 'description': 'فقط مشاهده و تأیید مرخصی دپارتمان خود'},
    'employee': {'label': 'کارمند', 'description': 'دسترسی به پروفایل خود (فاز آینده)'},
}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def roles_list(request):
    """List all roles with descriptions and effective permissions."""
    result = []
    for key, meta in ROLE_DESCRIPTIONS.items():
        result.append({
            'key': key,
            **meta,
            'permissions': RolePermission.get_for_role(key),
        })
    return Response(result)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def roles_update(request, role):
    """Update permissions for a role (super_admin & hr_manager only)."""
    if not _can_manage_roles(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    if role not in ROLE_DESCRIPTIONS:
        return Response({'error': 'نقش نامعتبر است'}, status=404)

    permissions = request.data.get('permissions')
    if not isinstance(permissions, dict):
        return Response({'error': 'permissions باید یک object باشد'}, status=400)

    # Keep only boolean permission keys.
    allowed_keys = set(list(ROLE_PERMISSIONS.get('super_admin', {}).keys()) + ['can_manage_roles'])
    clean = {k: bool(v) for k, v in permissions.items() if k in allowed_keys}

    obj, _ = RolePermission.objects.update_or_create(
        role=role,
        defaults={'permissions': clean},
    )
    return Response({
        'role': role,
        'permissions': RolePermission.get_for_role(role),
        'message': 'دسترسی‌ها به‌روزرسانی شد',
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def companies_list(request):
    """List all companies (for user assignment)."""
    companies = Company.objects.filter(is_active=True)
    return Response([{'id': c.id, 'name': c.name, 'code': c.code} for c in companies])