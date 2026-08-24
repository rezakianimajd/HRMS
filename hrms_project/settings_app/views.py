"""Views for the Settings module."""
from rest_framework import viewsets, status, parsers
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from settings_app.models import SystemSetting, CompanyProfile
from settings_app.serializers import SystemSettingSerializer, CompanyProfileSerializer
from settings_app.engines.settings_engine import SettingsEngine
from core.models.user import UserProfile, ROLE_PERMISSIONS


def _get_company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


def _get_user_profile(user):
    try:
        return user.profile
    except (UserProfile.DoesNotExist, AttributeError):
        return None


def _can_edit_settings(user):
    profile = _get_user_profile(user)
    if profile:
        return profile.can_edit_settings
    return user.is_superuser


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def settings_list(request):
    """Get all settings for the current company."""
    company = _get_company(request)
    if not company:
        return Response({'error': 'شرکت جاری یافت نشد'}, status=404)
    settings = SettingsEngine.get_all_settings(company)
    return Response(settings)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def settings_update(request, key):
    """Update a specific setting (admin/HR manager only)."""
    if not _can_edit_settings(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    company = _get_company(request)
    if not company:
        return Response({'error': 'شرکت جاری یافت نشد'}, status=404)

    value = request.data.get('value')
    if value is None:
        return Response({'error': 'مقدار الزامی است'}, status=400)

    SettingsEngine.set_setting(key, value, company)
    return Response({'key': key, 'value': value, 'message': 'تنظیم با موفقیت به‌روزرسانی شد'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def company_profile_view(request):
    """Get company profile."""
    company = _get_company(request)
    if not company:
        return Response({'error': 'شرکت جاری یافت نشد'}, status=404)
    profile = SettingsEngine.get_company_profile(company)
    return Response(CompanyProfileSerializer(profile).data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def company_profile_update(request):
    """Update company profile (admin/HR manager only)."""
    if not _can_edit_settings(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    company = _get_company(request)
    if not company:
        return Response({'error': 'شرکت جاری یافت نشد'}, status=404)

    profile = SettingsEngine.update_company_profile(company, request.data)
    return Response(CompanyProfileSerializer(profile).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def company_logo_upload(request):
    """Upload company logo."""
    if not _can_edit_settings(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    company = _get_company(request)
    if not company:
        return Response({'error': 'شرکت جاری یافت نشد'}, status=404)

    logo = request.FILES.get('logo')
    if not logo:
        return Response({'error': 'فایل لوگو الزامی است'}, status=400)

    profile = SettingsEngine.update_company_profile(company, {'logo': logo})
    return Response(CompanyProfileSerializer(profile).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def roles_list(request):
    """Get list of all roles with their permissions."""
    return Response(ROLE_PERMISSIONS)