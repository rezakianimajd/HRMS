"""
Views for the core app - Authentication, Company management, Language switching.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from core.serializers import (
    LoginSerializer,
    LoginResponseSerializer,
    CompanySerializer,
    UserSerializer,
    LanguageSwitcherSerializer,
    CompanySwitchSerializer,
    AuditLogSerializer,
)
from core.models import Company, AuditLog
from core.engines.authentication_engine import AuthenticationEngine
from core.engines.company_engine import CompanyEngine
from core.engines.language_engine import LanguageEngine


# =============================================================================
# Authentication Views
# =============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Authenticate user and return JWT tokens.
    Optionally accept company_id to set the active tenant context.
    """
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    username = serializer.validated_data['username']
    password = serializer.validated_data['password']
    company_id = serializer.validated_data.get('company_id')

    result = AuthenticationEngine.login(request, username, password, company_id)

    if result is None:
        return Response(
            {'error': 'نام کاربری یا رمز عبور اشتباه است یا دسترسی به شرکت ندارید.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # Log the login action
    user = User.objects.filter(username=username).first()
    if user:
        company = Company.objects.filter(id=company_id).first() if company_id else None
        AuditLog.objects.create(
            user=user,
            company=company,
            action='LOGIN',
            model_name='User',
            object_id=str(user.id),
            description=f"User {username} logged in",
            ip_address=request.META.get('REMOTE_ADDR'),
        )

    return Response(result, status=status.HTTP_200_OK)


@api_view(['POST'])
def logout_view(request):
    """Logout user (client-side should discard tokens)."""
    if request.user and request.user.is_authenticated:
        company = getattr(request, 'tenant', None) or getattr(request, 'company', None)
        AuditLog.objects.create(
            user=request.user,
            company=company,
            action='LOGOUT',
            model_name='User',
            object_id=str(request.user.id),
            description=f"User {request.user.username} logged out",
            ip_address=request.META.get('REMOTE_ADDR'),
        )

    return Response({'message': 'خروج موفقیت‌آمیز بود'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Get current authenticated user's profile."""
    user = request.user
    return Response(UserSerializer(user).data)


# =============================================================================
# Company (Tenant) Views
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def company_list_view(request):
    """Get list of companies accessible by the current user."""
    companies = AuthenticationEngine.get_user_companies(request.user)
    serializer = CompanySerializer(companies, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def company_detail_view(request, company_id):
    """Get details of a specific company."""
    company = CompanyEngine.get_company_by_id(company_id)
    if not company:
        return Response(
            {'error': 'شرکت یافت نشد.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Check access
    if not AuthenticationEngine.validate_company_access(request.user, company_id):
        return Response(
            {'error': 'شما به این شرکت دسترسی ندارید.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = CompanySerializer(company)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_company_view(request):
    """Get the current active company from the request context."""
    company = CompanyEngine.get_current_company(request)
    if not company:
        company_id = request.session.get('current_company_id')
        if company_id:
            company = CompanyEngine.get_company_by_id(company_id)

    if not company:
        return Response(
            {'error': 'شرکت فعالی انتخاب نشده است.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = CompanySerializer(company)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def switch_company_view(request):
    """Switch the active company for the current user."""
    serializer = CompanySwitchSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    company_id = serializer.validated_data['company_id']

    # Check access
    if not AuthenticationEngine.validate_company_access(request.user, company_id):
        return Response(
            {'error': 'شما به این شرکت دسترسی ندارید.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    company = CompanyEngine.switch_company(request, company_id)
    if not company:
        return Response(
            {'error': 'شرکت یافت نشد.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response({
        'message': f'شرکت به "{company.name}" تغییر یافت.',
        'company': CompanySerializer(company).data,
    })


# =============================================================================
# Language Views
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def language_list_view(request):
    """Get list of supported languages."""
    languages = LanguageEngine.get_supported_languages()
    return Response([
        {'code': code, 'name': name, 'direction': LanguageEngine.get_language_direction(code)}
        for code, name in languages
    ])


@api_view(['GET'])
@permission_classes([AllowAny])
def current_language_view(request):
    """Get the current active language."""
    language_code = LanguageEngine.get_current_language(request)
    return Response({
        'code': language_code,
        'name': LanguageEngine.get_language_name(language_code),
        'direction': LanguageEngine.get_language_direction(language_code),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def switch_language_view(request):
    """Switch the active language."""
    serializer = LanguageSwitcherSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    language_code = serializer.validated_data['language']
    success = LanguageEngine.set_language(request, language_code)

    if not success:
        return Response(
            {'error': 'زبان پشتیبانی نمی‌شود.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response({
        'message': 'زبان تغییر یافت.',
        'language': {
            'code': language_code,
            'name': LanguageEngine.get_language_name(language_code),
            'direction': LanguageEngine.get_language_direction(language_code),
        },
    })


# =============================================================================
# Audit Log Views
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_log_list_view(request):
    """Get audit logs for the current company."""
    company = getattr(request, 'tenant', None) or getattr(request, 'company', None)
    logs = AuditLog.objects.filter(company=company).order_by('-timestamp')[:100]
    serializer = AuditLogSerializer(logs, many=True)
    return Response(serializer.data)