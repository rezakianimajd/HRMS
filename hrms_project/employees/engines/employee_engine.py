"""
Employee Engine - Core business logic for employee management.
"""
from django.db import models, IntegrityError
from django.db.models import Q
from employees.models import Employee
from core.models import Company


class EmployeeEngine:
    """
    Engine for employee CRUD operations with multi-tenant validation.
    """

    @staticmethod
    def create_employee(data, company):
        """
        Create a new employee for a given company.
        Validates uniqueness of national_id, employee_id, and mobile within the company.
        Args:
            data: dict with employee fields
            company: Company instance
        Returns:
            Employee instance
        Raises:
            ValueError on validation failure
        """
        # Validate required fields
        required_fields = ['first_name', 'last_name', 'national_id', 'birth_date',
                          'gender', 'marital_status', 'mobile', 'employee_id',
                          'hire_date', 'department_id', 'job_title_id',
                          'work_location_id', 'insurance_list_id', 'contract_type']
        for field in required_fields:
            if field not in data or data[field] is None:
                raise ValueError(f"Field '{field}' is required.")

        # Check uniqueness within company
        if Employee.objects.filter(company=company, national_id=data['national_id']).exists():
            raise ValueError(f"کد ملی '{data['national_id']}' قبلاً در این شرکت ثبت شده است.")

        if Employee.objects.filter(company=company, employee_id=data['employee_id']).exists():
            raise ValueError(f"کد پرسنلی '{data['employee_id']}' قبلاً در این شرکت ثبت شده است.")

        if data.get('mobile') and Employee.objects.filter(company=company, mobile=data['mobile']).exists():
            raise ValueError(f"شماره موبایل '{data['mobile']}' قبلاً در این شرکت ثبت شده است.")

        # Validate marital-status dependent fields
        if data.get('marital_status') == 'married':
            if data.get('children_count', 0) > 0 and not data.get('spouse_name'):
                raise ValueError("برای افراد متأهل، درج نام همسر الزامی است.")

        employee = Employee.objects.create(
            company=company,
            first_name=data['first_name'],
            last_name=data['last_name'],
            national_id=data['national_id'],
            birth_date=data['birth_date'],
            birth_place=data.get('birth_place'),
            gender=data['gender'],
            marital_status=data['marital_status'],
            children_count=data.get('children_count', 0),
            spouse_name=data.get('spouse_name'),
            national_id_serial=data.get('national_id_serial'),
            national_id_place=data.get('national_id_place'),
            national_id_date=data.get('national_id_date'),
            phone=data.get('phone'),
            mobile=data['mobile'],
            email=data.get('email'),
            address=data.get('address'),
            postal_code=data.get('postal_code'),
            emergency_contact_name=data.get('emergency_contact_name'),
            emergency_contact_phone=data.get('emergency_contact_phone'),
            employee_id=data['employee_id'],
            hire_date=data['hire_date'],
            probation_end_date=data.get('probation_end_date'),
            official_date=data.get('official_date'),
            department_id=data['department_id'],
            job_title_id=data['job_title_id'],
            work_location_id=data['work_location_id'],
            insurance_list_id=data['insurance_list_id'],
            contract_type=data['contract_type'],
            contract_start_date=data.get('contract_start_date'),
            contract_end_date=data.get('contract_end_date'),
            status=data.get('status', 'active'),
            status_change_date=data.get('status_change_date'),
            work_shift=data.get('work_shift'),
            description=data.get('description'),
        )
        return employee

    @staticmethod
    def update_employee(employee_id, data, company=None):
        """
        Update an existing employee.
        Args:
            employee_id: Employee primary key
            data: dict with fields to update
            company: Company instance for validation (optional but recommended)
        Returns:
            Employee instance
        """
        qs = Employee.objects.filter(id=employee_id)
        if company:
            qs = qs.filter(company=company)

        employee = qs.first()
        if not employee:
            raise ValueError("پرسنل یافت نشد یا به این شرکت دسترسی ندارید.")

        # Check uniqueness if changing unique fields
        if 'national_id' in data and data['national_id'] != employee.national_id:
            if Employee.objects.filter(company=employee.company, national_id=data['national_id']).exclude(id=employee.id).exists():
                raise ValueError(f"کد ملی '{data['national_id']}' قبلاً در این شرکت ثبت شده است.")

        if 'employee_id' in data and data['employee_id'] != employee.employee_id:
            if Employee.objects.filter(company=employee.company, employee_id=data['employee_id']).exclude(id=employee.id).exists():
                raise ValueError(f"کد پرسنلی '{data['employee_id']}' قبلاً در این شرکت ثبت شده است.")

        if data.get('mobile') and data['mobile'] != employee.mobile:
            if Employee.objects.filter(company=employee.company, mobile=data['mobile']).exclude(id=employee.id).exists():
                raise ValueError(f"شماره موبایل '{data['mobile']}' قبلاً در این شرکت ثبت شده است.")

        # Update fields
        updatable_fields = [
            'first_name', 'last_name', 'national_id', 'birth_date', 'birth_place',
            'gender', 'marital_status', 'children_count', 'spouse_name',
            'national_id_serial', 'national_id_place', 'national_id_date',
            'phone', 'mobile', 'email', 'address', 'postal_code',
            'emergency_contact_name', 'emergency_contact_phone',
            'employee_id', 'hire_date', 'probation_end_date', 'official_date',
            'department_id', 'job_title_id', 'work_location_id', 'insurance_list_id',
            'contract_type', 'contract_start_date', 'contract_end_date',
            'status', 'status_change_date', 'work_shift', 'description',
        ]
        for field in updatable_fields:
            if field in data:
                setattr(employee, field, data[field])

        employee.save()
        return employee

    @staticmethod
    def get_employee(employee_id, company=None):
        """
        Get a single employee with all related data (optimized with select_related/prefetch_related).
        """
        qs = Employee.objects.select_related(
            'department', 'job_title', 'work_location', 'insurance_list', 'company'
        ).prefetch_related('documents')
        if company:
            qs = qs.filter(company=company)
        return qs.filter(id=employee_id).first()

    @staticmethod
    def delete_employee(employee_id, company=None):
        """
        Soft delete an employee by setting is_active=False.
        """
        qs = Employee.objects.filter(id=employee_id)
        if company:
            qs = qs.filter(company=company)

        employee = qs.first()
        if not employee:
            raise ValueError("پرسنل یافت نشد یا به این شرکت دسترسی ندارید.")

        employee.is_active = False
        employee.save()
        return employee

    @staticmethod
    def get_employees(filters=None, company=None):
        """
        Get employee list with optional filters.
        Filters dict can contain: first_name, last_name, national_id, employee_id,
        department_id, job_title_id, work_location_id, insurance_list_id,
        gender, marital_status, contract_type, status, is_active,
        hire_date_from, hire_date_to, birth_date_from, birth_date_to,
        search (text search across name/national_id/employee_id/mobile)
        """
        qs = Employee.objects.select_related(
            'department', 'job_title', 'work_location', 'insurance_list'
        )

        if company:
            qs = qs.filter(company=company)

        if not filters:
            return qs.filter(is_active=True)

        # Text search
        search = filters.get('search')
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(national_id__icontains=search) |
                Q(employee_id__icontains=search) |
                Q(mobile__icontains=search) |
                Q(email__icontains=search)
            )

        # Exact match filters
        for field in ['national_id', 'employee_id', 'gender', 'marital_status',
                       'contract_type', 'status', 'mobile']:
            if field in filters and filters[field]:
                qs = qs.filter(**{field: filters[field]})

        # Partial match on names
        if filters.get('first_name'):
            qs = qs.filter(first_name__icontains=filters['first_name'])
        if filters.get('last_name'):
            qs = qs.filter(last_name__icontains=filters['last_name'])

        # ForeignKey filters
        for field in ['department_id', 'job_title_id', 'work_location_id', 'insurance_list_id']:
            if field in filters and filters[field]:
                qs = qs.filter(**{field: filters[field]})

        # Date range filters
        if filters.get('hire_date_from'):
            qs = qs.filter(hire_date__gte=filters['hire_date_from'])
        if filters.get('hire_date_to'):
            qs = qs.filter(hire_date__lte=filters['hire_date_to'])
        if filters.get('birth_date_from'):
            qs = qs.filter(birth_date__gte=filters['birth_date_from'])
        if filters.get('birth_date_to'):
            qs = qs.filter(birth_date__lte=filters['birth_date_to'])

        # is_active filter
        if 'is_active' in filters:
            qs = qs.filter(is_active=filters['is_active'])
        else:
            qs = qs.filter(is_active=True)

        return qs

    @staticmethod
    def search_employees(query, company=None):
        """
        Full-text style search across employee fields.
        """
        qs = Employee.objects.select_related(
            'department', 'job_title', 'work_location'
        ).filter(is_active=True)

        if company:
            qs = qs.filter(company=company)

        if query:
            qs = qs.filter(
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query) |
                Q(national_id__icontains=query) |
                Q(employee_id__icontains=query) |
                Q(phone__icontains=query) |
                Q(mobile__icontains=query) |
                Q(email__icontains=query)
            )

        return qs[:50]