"""
Views for the Employees module.
"""
from rest_framework import viewsets, status, filters, parsers
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from employees.models import (
    Employee, Department, WorkLocation, JobTitle, InsuranceList, ContractType,
    EmploymentChange, ContractVersion, WorkExperience,
    SupplementaryInsurance, SupplementaryInsuranceDependent,
)
from employees.serializers import (
    EmployeeSerializer, EmployeeListSerializer, EmployeeCreateSerializer,
    DepartmentSerializer, WorkLocationSerializer, JobTitleSerializer, InsuranceListSerializer,
    ContractTypeSerializer, EmploymentChangeSerializer, ContractVersionSerializer,
    WorkExperienceSerializer,
    SupplementaryInsuranceSerializer, SupplementaryInsuranceDependentSerializer,
)
from employees.filters import EmployeeFilter
from employees.engines.employee_engine import EmployeeEngine


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class EmployeeViewSet(viewsets.ModelViewSet):
    """
    API endpoint for employee CRUD with multi-tenant filtering.
    All queries are automatically filtered by the current company.
    """
    queryset = Employee.objects.all()
    pagination_class = StandardPagination
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    filterset_class = EmployeeFilter
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering_fields = ['first_name', 'last_name', 'employee_id', 'hire_date', 'created_at', 'status']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return EmployeeListSerializer
        elif self.action == 'create':
            return EmployeeCreateSerializer
        return EmployeeSerializer

    def get_queryset(self):
        """Filter queryset by current tenant (company) and active status."""
        qs = super().get_queryset()
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        if company:
            qs = qs.filter(company=company)
        # Soft-deleted employees (is_active=False) must not appear in the
        # main employee list, reports, or phonebook.
        qs = qs.filter(is_active=True)
        # Optimize queries
        qs = qs.select_related('department', 'job_title', 'work_location', 'insurance_list')
        return qs

    def perform_create(self, serializer):
        """Assign company from request context when creating."""
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        serializer.save(company=company)

    def perform_update(self, serializer):
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        """Soft delete - set is_active=False instead of physical delete.

        Only superusers, HR managers, and super admins may delete employees.
        """
        profile = getattr(request.user, 'profile', None)
        allowed = request.user.is_superuser or (
            profile is not None and profile.is_hr_manager
        )
        if not allowed:
            return Response(
                {'error': 'شما مجاز به حذف پرسنل نیستید'},
                status=status.HTTP_403_FORBIDDEN,
            )

        employee = self.get_object()
        employee.is_active = False
        # Release unique fields so they can be reused by another employee.
        # Use a short, unique suffix derived from the primary key so the
        # values stay within the fields' max_length limits.
        suffix = str(employee.id)
        employee.employee_id = ('D' + suffix)[:20]
        employee.national_id = ('D' + suffix)[:10]
        employee.mobile = ('D' + suffix)[:15]
        employee.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Quick search across employee fields."""
        query = request.query_params.get('q', '')
        company = getattr(request, 'tenant', None) or getattr(request, 'company', None)
        employees = EmployeeEngine.search_employees(query, company)
        serializer = EmployeeListSerializer(employees, many=True)
        return Response(serializer.data)


# =============================================================================
# Auxiliary ViewSets (for dropdown data)
# =============================================================================

class BaseCompanyViewSet(viewsets.ModelViewSet):
    """Base CRUD ViewSet that filters by company for auxiliary models."""
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        if company:
            qs = qs.filter(company=company)
        return qs

    def perform_create(self, serializer):
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        serializer.save(company=company)


class DepartmentViewSet(BaseCompanyViewSet):
    serializer_class = DepartmentSerializer
    queryset = Department.objects.all()


class WorkLocationViewSet(BaseCompanyViewSet):
    serializer_class = WorkLocationSerializer
    queryset = WorkLocation.objects.all()


class JobTitleViewSet(BaseCompanyViewSet):
    serializer_class = JobTitleSerializer
    queryset = JobTitle.objects.all()


class InsuranceListViewSet(BaseCompanyViewSet):
    serializer_class = InsuranceListSerializer
    queryset = InsuranceList.objects.all()


class ContractTypeViewSet(BaseCompanyViewSet):
    serializer_class = ContractTypeSerializer
    queryset = ContractType.objects.all()


class EmploymentChangeViewSet(BaseCompanyViewSet):
    """Employment change history for a specific employee."""
    serializer_class = EmploymentChangeSerializer
    queryset = EmploymentChange.objects.all()
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering = ['-effective_date', '-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs


class WorkExperienceViewSet(BaseCompanyViewSet):
    """Work experience entries for an employee."""
    serializer_class = WorkExperienceSerializer
    queryset = WorkExperience.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs


class ContractVersionViewSet(BaseCompanyViewSet):
    """Versioned employment contracts for an employee."""
    serializer_class = ContractVersionSerializer
    queryset = ContractVersion.objects.all()
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering = ['-year', '-version']

    def get_queryset(self):
        qs = super().get_queryset()
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        year = self.request.query_params.get('year')
        if year:
            qs = qs.filter(year=year)
        return qs


class EmploymentChangeReadViewSet(viewsets.ReadOnlyModelViewSet):
    """Alias for read-only employment change history (used in profile)."""
    serializer_class = EmploymentChangeSerializer
    queryset = EmploymentChange.objects.all()
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering = ['-effective_date', '-created_at']

    def get_queryset(self):
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        qs = super().get_queryset()
        if company:
            qs = qs.filter(company=company)
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs


class ContractVersionReadViewSet(viewsets.ReadOnlyModelViewSet):
    """Alias for read-only contract versions (used in profile)."""
    serializer_class = ContractVersionSerializer
    queryset = ContractVersion.objects.all()
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering = ['-year', '-version']

    def get_queryset(self):
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        qs = super().get_queryset()
        if company:
            qs = qs.filter(company=company)
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs


class SupplementaryInsuranceViewSet(BaseCompanyViewSet):
    """Supplementary insurance records for employees."""
    serializer_class = SupplementaryInsuranceSerializer
    queryset = SupplementaryInsurance.objects.all()
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs


class SupplementaryInsuranceDependentViewSet(viewsets.ModelViewSet):
    """Dependents under a supplementary insurance record."""
    serializer_class = SupplementaryInsuranceDependentSerializer
    queryset = SupplementaryInsuranceDependent.objects.all()
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        insurance_id = self.request.query_params.get('insurance_id')
        if insurance_id:
            qs = qs.filter(insurance_id=insurance_id)
        return qs
