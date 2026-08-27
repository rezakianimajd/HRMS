"""Backup & restore views for the Settings module."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from core.models import Company
from settings_app.engines.backup_engine import BackupEngine


def _get_company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


def _get_user_profile(user):
    try:
        return user.profile
    except Exception:
        return None


def _can_restore(user):
    """Restore is reserved for super admins (and Django superusers)."""
    if user.is_superuser:
        return True
    profile = _get_user_profile(user)
    if profile is not None:
        return profile.role == 'super_admin'
    return False


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def backup_list(request):
    """List available backups for the current company (any authenticated user)."""
    company = _get_company(request)
    if not company:
        return Response({'error': 'شرکت جاری یافت نشد'}, status=404)
    return Response(BackupEngine.list_backups(company))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def backup_create(request):
    """Create a backup of the current company's data (any authenticated user)."""
    company = _get_company(request)
    if not company:
        return Response({'error': 'شرکت جاری یافت نشد'}, status=404)

    result = BackupEngine.create_backup(company)
    return Response({
        'message': 'بکاپ با موفقیت ساخته شد',
        **result,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def backup_restore(request, filename):
    """Restore a backup (super admin only)."""
    if not _can_restore(request.user):
        return Response({'error': 'تنها مدیر ارشد سیستم می‌تواند بکاپ را بازیابی کند'}, status=403)

    company = _get_company(request)
    if not company:
        return Response({'error': 'شرکت جاری یافت نشد'}, status=404)

    try:
        result = BackupEngine.restore_backup(company, filename)
        return Response(result)
    except FileNotFoundError:
        return Response({'error': 'فایل بکاپ یافت نشد'}, status=404)
    except Exception as e:
        return Response({'error': f'خطا در بازیابی بکاپ: {str(e)[:200]}'}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def wipe_data(request):
    """Wipe all tenant business data (super admin only)."""
    if not _can_restore(request.user):
        return Response({'error': 'تنها مدیر ارشد سیستم می‌تواند داده‌ها را خالی کند'}, status=403)

    company = _get_company(request)
    if not company:
        return Response({'error': 'شرکت جاری یافت نشد'}, status=404)

    deleted = BackupEngine.wipe_tenant_data(company)
    return Response({'message': 'داده‌ها با موفقیت خالی شدند', 'deleted_count': deleted})