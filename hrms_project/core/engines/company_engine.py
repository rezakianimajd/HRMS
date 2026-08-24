"""
Company Engine - Handles all company (tenant) related operations.
"""
from django.db import connection
from core.models import Company


class CompanyEngine:
    """
    Engine for managing multi-tenant company operations.
    Provides methods to get, create, and switch between companies.
    """

    @staticmethod
    def get_current_company(request):
        """
        Get the current company from the request's tenant context.
        Args:
            request: HTTP request object
        Returns:
            Company instance or None
        """
        return getattr(request, 'tenant', None)

    @staticmethod
    def get_company_by_id(company_id):
        """
        Get a company by its ID.
        Args:
            company_id: Company primary key
        Returns:
            Company instance or None
        """
        try:
            return Company.objects.get(id=company_id, is_active=True)
        except Company.DoesNotExist:
            return None

    @staticmethod
    def get_company_by_schema(schema_name):
        """
        Get a company by its schema name.
        Args:
            schema_name: The PostgreSQL schema name
        Returns:
            Company instance or None
        """
        try:
            return Company.objects.get(schema_name=schema_name, is_active=True)
        except Company.DoesNotExist:
            return None

    @staticmethod
    def get_company_by_code(code):
        """
        Get a company by its unique code.
        Args:
            code: Company unique code
        Returns:
            Company instance or None
        """
        try:
            return Company.objects.get(code=code, is_active=True)
        except Company.DoesNotExist:
            return None

    @staticmethod
    def create_company(data):
        """
        Create a new company (tenant) with its own schema.
        Args:
            data: dict with keys:
                - name (required)
                - code (required)
                - schema_name (auto-generated from code if not provided)
                - email (optional)
                - phone (optional)
                - address (optional)
                - postal_code (optional)
                - national_id (optional)
                - economic_code (optional)
                - registration_number (optional)
                - logo (optional)
                - domain (optional, primary domain)
                - is_active (optional, default True)
        Returns:
            Company instance or None on failure
        """
        name = data.get('name')
        code = data.get('code')
        if not name or not code:
            raise ValueError("Company 'name' and 'code' are required.")

        schema_name = data.get('schema_name', code.lower().replace(' ', '_'))

        company = Company.objects.create(
            schema_name=schema_name,
            name=name,
            code=code,
            email=data.get('email'),
            phone=data.get('phone'),
            address=data.get('address'),
            postal_code=data.get('postal_code'),
            national_id=data.get('national_id'),
            economic_code=data.get('economic_code'),
            registration_number=data.get('registration_number'),
            logo=data.get('logo'),
            is_active=data.get('is_active', True),
        )
        return company

    @staticmethod
    def switch_company(request, company_id):
        """
        Switch the current user's active company context.
        Stores the selected company ID in the session.
        Args:
            request: HTTP request object
            company_id: Target company ID to switch to
        Returns:
            Company instance or None
        """
        company = CompanyEngine.get_company_by_id(company_id)
        if company:
            request.session['current_company_id'] = company.id
            request.session['current_company_code'] = company.code
        return company

    @staticmethod
    def get_user_companies(user):
        """
        Get all companies accessible by a given user.
        Uses the user's profile or related companies.
        For now, returns all active companies (can be restricted via permissions later).
        Args:
            user: Django User instance
        Returns:
            QuerySet of Company instances
        """
        # TODO: In future phases, implement proper user-company permission mapping
        # For now, if user has a profile with companies ManyToMany, use that
        if hasattr(user, 'profile') and hasattr(user.profile, 'companies'):
            return user.profile.companies.filter(is_active=True)
        # Fallback: return all active companies for superusers
        if user.is_superuser:
            return Company.objects.filter(is_active=True)
        return Company.objects.none()

    @staticmethod
    def get_all_active_companies():
        """
        Get all active companies.
        Returns:
            QuerySet of active Company instances
        """
        return Company.objects.filter(is_active=True)

    @staticmethod
    def get_company_stats(company_id):
        """
        Get basic statistics for a company.
        Args:
            company_id: Company ID
        Returns:
            dict with count stats
        """
        company = CompanyEngine.get_company_by_id(company_id)
        if not company:
            return None

        # Switch to tenant schema to query tenant-specific data
        with connection.cursor() as cursor:
            cursor.execute(f"SET search_path TO \"{company.schema_name}\"")
            # These queries will be expanded in future phases
            # cursor.execute("SELECT COUNT(*) FROM employees_employee WHERE is_active = true")
            # employee_count = cursor.fetchone()[0]

        return {
            'company_id': company.id,
            'company_name': company.name,
            'company_code': company.code,
            'schema_name': company.schema_name,
            # 'employee_count': 0,  # Will be implemented in later phases
        }