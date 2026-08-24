"""
Tenant Middleware - Detects tenant (company) from JWT token or session.
This is a supplementary middleware that can override/extend django_tenants TenantMiddleware.
"""
import logging
from django.utils.functional import SimpleLazyObject
from core.engines.company_engine import CompanyEngine

logger = logging.getLogger(__name__)


class CustomTenantMiddleware:
    """
    Custom middleware to detect and set the current company (tenant) context.
    This complements django_tenants.middleware.TenantMiddleware by providing
    additional tenant detection from JWT tokens and session data.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Attach company info to request
        request.company = SimpleLazyObject(lambda: self._get_company(request))
        request.company_id = SimpleLazyObject(lambda: self._get_company_id(request))

        response = self.get_response(request)
        return response

    def _get_company(self, request):
        """
        Get the current company from request context.
        Priority:
        1. django_tenants sets request.tenant (from domain/subdomain)
        2. Session-stored company
        3. First active company (SQLite dev fallback)
        """
        # First, check if django_tenants already set the tenant
        tenant = getattr(request, 'tenant', None)
        if tenant:
            return tenant

        # Second, check session
        company_id = request.session.get('current_company_id')
        if company_id:
            company = CompanyEngine.get_company_by_id(company_id)
            if company:
                return company

        # Third, fallback to first active company (needed in SQLite/dev mode)
        try:
            return CompanyEngine.get_all_active_companies().first()
        except Exception:
            return None

    def _get_company_id(self, request):
        """Get the current company ID from request context."""
        company = getattr(request, 'company', None)
        if company:
            return company.id
        return request.session.get('current_company_id')