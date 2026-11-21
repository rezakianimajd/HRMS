"""CRUD views for company governance data (shareholders, board, bank accounts)."""
from rest_framework import parsers, viewsets
from rest_framework.permissions import BasePermission, SAFE_METHODS

from settings_app.engines.settings_engine import SettingsEngine
from settings_app.models import CompanyBankAccount, CompanyBoardMember, CompanyShareholder
from settings_app.serializers import (
    CompanyBankAccountSerializer, CompanyBoardMemberSerializer, CompanyShareholderSerializer,
)


class CanEditCompanyProfile(BasePermission):
    """خواندن برای همهٔ کاربران مجاز، نوشتن فقط برای مدیر تنظیمات."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        from settings_app.views import _can_edit_settings
        return bool(request.user and request.user.is_authenticated and _can_edit_settings(request.user))


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class CompanyProfileRelatedViewSet(viewsets.ModelViewSet):
    """Base viewset for records owned by the current company's profile."""

    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    permission_classes = [CanEditCompanyProfile]

    def get_queryset(self):
        queryset = super().get_queryset()
        company = _company(self.request)
        if company:
            queryset = queryset.filter(company=company)
        return queryset

    def perform_create(self, serializer):
        company = _company(self.request)
        profile = SettingsEngine.get_company_profile(company) if company else None
        serializer.save(company=company, profile=profile)


class CompanyShareholderViewSet(CompanyProfileRelatedViewSet):
    serializer_class = CompanyShareholderSerializer
    queryset = CompanyShareholder.objects.all()
    ordering = ['sort_order', 'name']


class CompanyBoardMemberViewSet(CompanyProfileRelatedViewSet):
    serializer_class = CompanyBoardMemberSerializer
    queryset = CompanyBoardMember.objects.all()
    ordering = ['sort_order', 'full_name']


class CompanyBankAccountViewSet(CompanyProfileRelatedViewSet):
    serializer_class = CompanyBankAccountSerializer
    queryset = CompanyBankAccount.objects.all()
    ordering = ['-is_official', 'sort_order', 'bank_name']
