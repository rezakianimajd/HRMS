"""
Filters for the Employees module.
"""
import django_filters
from employees.models import Employee


class EmployeeFilter(django_filters.FilterSet):
    """Advanced filtering for Employee list."""
    first_name = django_filters.CharFilter(lookup_expr='icontains', label='نام')
    last_name = django_filters.CharFilter(lookup_expr='icontains', label='نام خانوادگی')
    national_id = django_filters.CharFilter(lookup_expr='exact', label='کد ملی')
    employee_id = django_filters.CharFilter(lookup_expr='exact', label='کد پرسنلی')
    mobile = django_filters.CharFilter(lookup_expr='exact', label='موبایل')
    search = django_filters.CharFilter(method='filter_search', label='جستجوی سراسری')

    department = django_filters.NumberFilter(field_name='department_id', label='دپارتمان')
    job_title = django_filters.NumberFilter(field_name='job_title_id', label='عنوان شغلی')
    work_location = django_filters.NumberFilter(field_name='work_location_id', label='محل استقرار')
    insurance_list = django_filters.NumberFilter(field_name='insurance_list_id', label='لیست بیمه')

    gender = django_filters.ChoiceFilter(choices=Employee.Gender.choices, label='جنسیت')
    marital_status = django_filters.ChoiceFilter(choices=Employee.MaritalStatus.choices, label='وضعیت تأهل')
    contract_type = django_filters.NumberFilter(label='نوع قرارداد')
    status = django_filters.ChoiceFilter(choices=Employee.EmploymentStatus.choices, label='وضعیت')

    hire_date_from = django_filters.DateFilter(field_name='hire_date', lookup_expr='gte', label='استخدام از تاریخ')
    hire_date_to = django_filters.DateFilter(field_name='hire_date', lookup_expr='lte', label='استخدام تا تاریخ')
    birth_date_from = django_filters.DateFilter(field_name='birth_date', lookup_expr='gte', label='تولد از تاریخ')
    birth_date_to = django_filters.DateFilter(field_name='birth_date', lookup_expr='lte', label='تولد تا تاریخ')

    work_shift = django_filters.ChoiceFilter(choices=Employee.WorkShift.choices, label='نوبت کاری')
    is_active = django_filters.BooleanFilter(label='فعال')

    # Numeric range filters
    children_count_min = django_filters.NumberFilter(field_name='children_count', lookup_expr='gte', label='تعداد فرزندان از')
    children_count_max = django_filters.NumberFilter(field_name='children_count', lookup_expr='lte', label='تعداد فرزندان تا')

    # Date range for contract end
    contract_end_after = django_filters.DateFilter(field_name='contract_end_date', lookup_expr='gte', label='پایان قرارداد از')
    contract_end_before = django_filters.DateFilter(field_name='contract_end_date', lookup_expr='lte', label='پایان قرارداد تا')

    # Combined/related filters
    has_document_type = django_filters.NumberFilter(method='filter_has_document', label='دارای نوع مدرک')
    has_expired_document = django_filters.BooleanFilter(method='filter_has_expired_doc', label='دارای مدرک منقضی')

    class Meta:
        model = Employee
        fields = []

    def filter_search(self, queryset, name, value):
        """Custom search across multiple fields."""
        from django.db.models import Q
        return queryset.filter(
            Q(first_name__icontains=value) |
            Q(last_name__icontains=value) |
            Q(national_id__icontains=value) |
            Q(employee_id__icontains=value) |
            Q(mobile__icontains=value) |
            Q(email__icontains=value)
        )