"""
Search Engine - Advanced full-text and fuzzy search across employees and documents.
"""
from django.db.models import Q
from employees.models import Employee

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
            # Full-text search fields (case-insensitive contains).
            # We intentionally avoid `trigram_similar` here because that lookup
            # requires the PostgreSQL `pg_trgm` extension to be installed on the
            # database. If it isn't (common on fresh deploys), the query would
            # raise `FieldError` and return 500. `icontains` is robust and fast
            # enough for normal HR search workloads.
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

    @staticmethod
    def global_search(query, company=None):
        """
        Unified global search across every searchable entity:
        employees, documents, incoming/outgoing letters, HR requests,
        leave requests, and salary payslips.

        Returns a dict of entity-type -> lightweight result dicts. Each result
        carries ``entity_type`` so the frontend can render/group/navigate it.
        """
        results = {
            'employees': [],
            'documents': [],
            'letters': [],
            'hr_requests': [],
            'leave_requests': [],
            'salary_records': [],
        }
        if not query:
            return results

        # Employees & documents reuse the existing engines (already ordered).
        results['employees'] = SearchEngine.search_employees(query, {}, company)[:20]
        results['documents'] = SearchEngine.search_documents(query, {}, company)[:20]

        # Incoming / outgoing letters (different sender/receiver fields).
        from correspondences.models import IncomingLetter, OutgoingLetter

        letters = []
        inc_qs = IncomingLetter.objects.filter(is_active=True)
        if company:
            inc_qs = inc_qs.filter(company=company)
        inc_qs = inc_qs.filter(
            Q(number__icontains=query) | Q(subject__icontains=query) |
            Q(sender__icontains=query) | Q(description__icontains=query)
        )
        for o in inc_qs[:10]:
            letters.append({
                'id': o.id,
                'kind': 'incoming',
                'number': o.number,
                'subject': o.subject,
                'counterparty': o.sender,
                'date': o.date.isoformat() if o.date else None,
                'priority': o.priority,
                'entity_type': 'letter',
            })

        out_qs = OutgoingLetter.objects.filter(is_active=True)
        if company:
            out_qs = out_qs.filter(company=company)
        out_qs = out_qs.filter(
            Q(number__icontains=query) | Q(subject__icontains=query) |
            Q(receiver__icontains=query) | Q(description__icontains=query)
        )
        for o in out_qs[:10]:
            letters.append({
                'id': o.id,
                'kind': 'outgoing',
                'number': o.number,
                'subject': o.subject,
                'counterparty': o.receiver,
                'date': o.date.isoformat() if o.date else None,
                'priority': o.priority,
                'entity_type': 'letter',
            })
        results['letters'] = letters

        # HR administrative requests.
        from employees.models import HRRequest
        hr_qs = HRRequest.objects.filter(is_active=True)
        if company:
            hr_qs = hr_qs.filter(company=company)
        hr_qs = hr_qs.filter(
            Q(employee__first_name__icontains=query) |
            Q(employee__last_name__icontains=query) |
            Q(employee__employee_id__icontains=query) |
            Q(description__icontains=query) |
            Q(target_value__icontains=query)
        ).select_related('employee')
        results['hr_requests'] = [{
            'id': r.id,
            'employee_name': r.employee.full_name if r.employee else '',
            'request_type': r.get_request_type_display(),
            'status': r.get_status_display(),
            'date': (r.requested_date.isoformat() if r.requested_date else
                     (r.created_at.date().isoformat() if r.created_at else None)),
            'entity_type': 'hr_request',
        } for r in hr_qs[:10]]

        # Leave requests.
        from leaves.models import LeaveRequest
        leave_qs = LeaveRequest.objects.filter(is_active=True)
        if company:
            leave_qs = leave_qs.filter(company=company)
        leave_qs = leave_qs.filter(
            Q(employee__first_name__icontains=query) |
            Q(employee__last_name__icontains=query) |
            Q(employee__employee_id__icontains=query) |
            Q(reason__icontains=query)
        ).select_related('employee')
        results['leave_requests'] = [{
            'id': r.id,
            'employee_name': r.employee.full_name if r.employee else '',
            'leave_type': r.get_leave_type_display(),
            'status': r.get_status_display(),
            'days': float(r.days or 0),
            'date': r.start_date.isoformat() if r.start_date else None,
            'entity_type': 'leave_request',
        } for r in leave_qs[:10]]

        # Salary payslips.
        from payroll.models import SalaryRecord
        salary_qs = SalaryRecord.objects.filter(is_active=True)
        if company:
            salary_qs = salary_qs.filter(company=company)
        salary_qs = salary_qs.filter(
            Q(employee__first_name__icontains=query) |
            Q(employee__last_name__icontains=query) |
            Q(employee__employee_id__icontains=query)
        ).select_related('employee')
        results['salary_records'] = [{
            'id': r.id,
            'employee_name': r.employee.full_name if r.employee else '',
            'period': f'{r.year}/{r.month}',
            'net_payable': float(r.net_payable or 0),
            'entity_type': 'payslip',
        } for r in salary_qs[:10]]

        return results
