"""Views for the Settings module."""
import json
import re

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


APPEARANCE_SETTINGS_KEY = 'APPEARANCE_SETTINGS'
HEX_COLOR = re.compile(r'^#[0-9a-fA-F]{6}$')
FONT_FAMILIES = {'vazirmatn', 'iransans', 'tahoma', 'system'}
SIZE_RANGES = {
    'headerSize': (14, 32), 'cardSize': (12, 24),
    'bodySize': (12, 18), 'buttonSize': (12, 18), 'statSize': (12, 24),
}
WEIGHT_OPTIONS = {300, 400, 500, 600, 700}
DEFAULT_TYPOGRAPHY = {
    'family': 'vazirmatn',
    'headerSize': 20, 'headerWeight': 500,
    'cardSize': 16, 'cardWeight': 400,
    'bodySize': 13, 'bodyWeight': 400,
    'buttonSize': 13, 'buttonWeight': 500,
    'statSize': 14, 'statWeight': 500,
}


def _is_super_admin(user):
    """آیا کاربر «مدیر ارشد سیستم» است؟ (فقط او اجازهٔ تغییر ظاهر/فونت دارد)"""
    if getattr(user, 'is_superuser', False):
        return True
    profile = _get_user_profile(user)
    return bool(profile and profile.role == UserProfile.Role.SUPER_ADMIN)


def _sanitize_appearance(payload):
    """اعتبارسنجی و پاک‌سازی پالت‌ها و تنظیمات فونت."""
    data = payload if isinstance(payload, dict) else {}

    palettes = {}
    raw_palettes = data.get('palettes')
    if isinstance(raw_palettes, dict):
        for slug, item in list(raw_palettes.items())[:100]:
            if not isinstance(slug, str) or not re.fullmatch(r'[a-z0-9_-]{1,60}', slug):
                continue
            if not isinstance(item, dict):
                continue
            clean = {}
            for key in ('accent', 'background'):
                value = item.get(key)
                if isinstance(value, str) and HEX_COLOR.fullmatch(value.strip()):
                    clean[key] = value.strip().lower()
            if clean:
                palettes[slug] = clean

    typography = dict(DEFAULT_TYPOGRAPHY)
    raw_typography = data.get('typography')
    if isinstance(raw_typography, dict):
        family = raw_typography.get('family')
        if isinstance(family, str) and family in FONT_FAMILIES:
            typography['family'] = family
        for key, (low, high) in SIZE_RANGES.items():
            try:
                value = int(raw_typography.get(key))
            except (TypeError, ValueError):
                continue
            if low <= value <= high:
                typography[key] = value
        for key in ('headerWeight', 'cardWeight', 'bodyWeight', 'buttonWeight', 'statWeight'):
            try:
                value = int(raw_typography.get(key))
            except (TypeError, ValueError):
                continue
            if value in WEIGHT_OPTIONS:
                typography[key] = value

    return {'palettes': palettes, 'typography': typography}


def _read_appearance(company):
    raw = SettingsEngine.get_setting(APPEARANCE_SETTINGS_KEY, company, default={})
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except (TypeError, json.JSONDecodeError):
            raw = {}
    return _sanitize_appearance(raw)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def appearance_settings_view(request):
    """
    GET  → پالت‌ها و تنظیمات فونت برای همهٔ کاربران شرکت.
    PUT  → فقط مدیر ارشد سیستم؛ تنظیمات برای همهٔ کاربران اعمال می‌شود.
    """
    company = _get_company(request)
    if not company:
        return Response({'error': 'شرکت جاری یافت نشد'}, status=404)

    if request.method == 'PUT':
        if not _is_super_admin(request.user):
            return Response(
                {'error': 'تغییر ظاهر، پالت رنگی و فونت فقط برای مدیر ارشد سیستم مجاز است'},
                status=403,
            )
        clean = _sanitize_appearance(request.data)
        SettingsEngine.set_setting(
            APPEARANCE_SETTINGS_KEY, clean, company,
            description='ظاهر، پالت رنگی و فونت (سراسری برای همهٔ کاربران)',
            data_type='json', is_editable=False,
        )
        return Response({**clean, 'can_edit': True, 'message': 'تنظیمات ظاهر ذخیره شد'})

    clean = _read_appearance(company)
    return Response({**clean, 'can_edit': _is_super_admin(request.user)})


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
    if key == APPEARANCE_SETTINGS_KEY:
        return Response(
            {'error': 'تنظیمات ظاهر و فونت فقط از مسیر اختصاصی و توسط مدیر ارشد سیستم تغییر می‌کند'},
            status=403,
        )
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