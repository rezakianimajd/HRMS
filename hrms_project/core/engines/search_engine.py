"""
Search Engine - Advanced full-text and fuzzy search across employees and documents.
"""
from django.db.models import Q, F, Value, CharField
from django.db.models.functions import Concat
from django.conf import settings
from employees.models import Employee

# Trigram similarity only works on PostgreSQL (requires the pg_trgm extension).
# Simply importing TrigramSimilarity succeeds even on SQLite, so we must check
# the actual database engine rather than the import.
_HAS_PG = False
try:
    _ENGINE = settings.DATABASES.get('default', {}).get('ENGINE', '')
    _HAS_PG = 'postgresql' in _ENGINE
except Exception:
    _HAS_PG = False

HAS_TRIGRAM = _HAS_PG

if HAS_TRIGRAM:
    from django.contrib.postgres.search import TrigramSimilarity

from documents.models import Document
from core.models import Company


class SearchEngine:
    """
    Advanced search engine with full-text, fuzzy, and combined filtering.
    Uses PostgreSQL trigram similarity for fuzzy matching.
    """

    SIMILARITY_THRESHOLD = 0.1  # Minimum similarity for trigram matching

    @staticmethod
    def search_employees(query='', filters=None, company=None):
        """
        Full-text + fuzzy search on employees with combined filters.
        Args:
            query: Text search query
            filters: dict of advanced filters
            company: Company instance
        Returns:
            QuerySet of Employee instances ordered by relevance
        """
        qs = Employee.objects.select_related(
            'department', 'job_title', 'work_location', 'insurance_list'
        )

        if company:
            qs = qs.filter(company=company, is_active=True)

        if query:
            # Full-text search fields
            full_text_q = (
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query) |
                Q(national_id__icontains=query) |
                Q(employee_id__icontains=query) |
                Q(phone__icontains=query) |
                Q(mobile__icontains=query) |
                Q(email__icontains=query) |
                Q(address__icontains=query)
            )

            if HAS_TRIGRAM:
                fuzzy_q = (
                    Q(first_name__trigram_similar=query) |
                    Q(last_name__trigram_similar=query)
                )
                qs = qs.filter(full_text_q | fuzzy_q).annotate(
                    first_name_sim=TrigramSimilarity('first_name', query),
                    last_name_sim=TrigramSimilarity('last_name', query),
                ).order_by('-first_name_sim', '-last_name_sim', '-hire_date')
            else:
                qs = qs.filter(full_text_q).order_by('-hire_date')
        else:
            qs = qs.order_by('-hire_date')

        # Apply advanced filters
        if filters:
            qs = SearchEngine._apply_employee_filters(qs, filters)

        return qs

    @staticmethod
    def _apply_employee_filters(qs, filters):
        """Apply combined filters to employee queryset."""
        # Dropdown single-select filters
        dropdown_fields = {
            'gender': 'gender',
            'marital_status': 'marital_status',
            'contract_type': 'contract_type',
            'status': 'status',
            'work_shift': 'work_shift',
            'department': 'department_id',
            'job_title': 'job_title_id',
            'work_location': 'work_location_id',
            'insurance_list': 'insurance_list_id',
        }
        for filter_key, db_field in dropdown_fields.items():
            if filter_key in filters and filters[filter_key]:
                qs = qs.filter(**{db_field: filters[filter_key]})

        # Date range filters
        if filters.get('hire_date_after'):
            qs = qs.filter(hire_date__gte=filters['hire_date_after'])
        if filters.get('hire_date_before'):
            qs = qs.filter(hire_date__lte=filters['hire_date_before'])
        if filters.get('birth_date_after'):
            qs = qs.filter(birth_date__gte=filters['birth_date_after'])
        if filters.get('birth_date_before'):
            qs = qs.filter(birth_date__lte=filters['birth_date_before'])
        if filters.get('contract_end_after'):
            qs = qs.filter(contract_end_date__gte=filters['contract_end_after'])
        if filters.get('contract_end_before'):
            qs = qs.filter(contract_end_date__lte=filters['contract_end_before'])

        # Numeric range filters
        if filters.get('children_count_min') is not None:
            qs = qs.filter(children_count__gte=filters['children_count_min'])
        if filters.get('children_count_max') is not None:
            qs = qs.filter(children_count__lte=filters['children_count_max'])

        # Combined filters
        if filters.get('has_document_type'):
            qs = qs.filter(documents__document_type_id=filters['has_document_type']).distinct()

        if filters.get('has_expired_document'):
            from datetime import date
            qs = qs.filter(
                documents__expiry_date__lt=date.today(),
                documents__is_active=True,
            ).distinct()

        return qs

    @staticmethod
    def search_documents(query='', filters=None, company=None):
        """
        Full-text search on documents with filters.
        """
        qs = Document.objects.select_related('employee', 'document_type')

        if company:
            qs = qs.filter(company=company, is_active=True)

        if query:
            qs = qs.filter(
                Q(title__icontains=query) |
                Q(description__icontains=query) |
                Q(document_number__icontains=query) |
                Q(employee__first_name__icontains=query) |
                Q(employee__last_name__icontains=query) |
                Q(employee__employee_id__icontains=query)
            )

        if filters:
            if filters.get('document_type'):
                qs = qs.filter(document_type_id=filters['document_type'])
            if filters.get('issue_date_after'):
                qs = qs.filter(issue_date__gte=filters['issue_date_after'])
            if filters.get('issue_date_before'):
                qs = qs.filter(issue_date__lte=filters['issue_date_before'])
            if filters.get('expiry_date_after'):
                qs = qs.filter(expiry_date__gte=filters['expiry_date_after'])
            if filters.get('expiry_date_before'):
                qs = qs.filter(expiry_date__lte=filters['expiry_date_before'])
            if filters.get('employee_id'):
                qs = qs.filter(employee__employee_id__icontains=filters['employee_id'])

        return qs.order_by('-created_at')

    @staticmethod
    def advanced_search(data, company=None):
        """
        Combined advanced search returning both employees and documents.
        """
        query = data.get('query', '')
        filters = data.get('filters', {})
        search_type = data.get('type', 'all')  # 'employees', 'documents', or 'all'

        results = {}

        if search_type in ('all', 'employees'):
            results['employees'] = SearchEngine.search_employees(query, filters, company)[:50]

        if search_type in ('all', 'documents'):
            results['documents'] = SearchEngine.search_documents(query, filters, company)[:50]

        return results