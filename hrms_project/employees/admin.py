"""پنل ادمین ماژول پرسنل (employees).

قبلاً این فایل وجود نداشت و در نتیجه هیچ‌یک از مدل‌های پرسنل (از جمله خود
«پرسنل») در ادمین جنگو ثبت نشده بود و فقط مدل‌های اپ «جذب و استخدام» دیده می‌شدند.
"""
from django.contrib import admin

from employees.models import (
    Department, WorkLocation, JobTitle, ContractType, InsuranceList,
    Employee, WorkExperience, EmployeePenalty, EmploymentChange,
    ContractVersion, SupplementaryInsurance, SupplementaryInsuranceDependent,
    HRRequest, AssistantKnowledge,
)


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = (
        'employee_id', 'full_name', 'national_id', 'mobile',
        'department', 'job_title', 'status', 'hire_date', 'is_active',
    )
    list_filter = (
        'is_active', 'status', 'gender', 'marital_status', 'work_shift',
        'department', 'job_title', 'contract_type', 'work_location', 'insurance_list',
    )
    search_fields = (
        'first_name', 'last_name', 'national_id', 'employee_id',
        'mobile', 'phone', 'email', 'insurance_number',
        'bank_name', 'account_number', 'sheba_number',
    )
    date_hierarchy = 'hire_date'
    ordering = ('-created_at',)
    list_per_page = 25
    list_select_related = ('department', 'job_title', 'work_location', 'contract_type', 'insurance_list')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('شناسهٔ پرسنلی', {
            'fields': ('company', 'employee_id', 'first_name', 'last_name', 'photo', 'national_id', 'is_active'),
        }),
        ('اطلاعات شخصی', {
            'fields': ('birth_date', 'birth_place', 'gender', 'marital_status', 'children_count',
                       'spouse_name', 'father_name', 'birth_certificate_number',
                       'national_id_serial', 'national_id_place', 'national_id_date'),
        }),
        ('تماس', {
            'fields': ('mobile', 'phone', 'email', 'address', 'city', 'postal_code',
                       'emergency_contact_name', 'emergency_contact_phone', 'bale_chat_id'),
        }),
        ('استخدام', {
            'fields': ('hire_date', 'probation_end_date', 'official_date', 'status', 'status_change_date',
                       'work_shift', 'work_start_time', 'work_end_time',
                       'department', 'job_title', 'work_location', 'insurance_list', 'insurance_number'),
        }),
        ('قرارداد', {
            'fields': ('contract_type', 'contract_start_date', 'contract_end_date'),
        }),
        ('تحصیلات و ارزیابی', {
            'fields': ('education_level', 'education_field', 'education_place', 'university_type',
                       'distance_to_work_km', 'housing_type', 'has_car',
                       'performance_score', 'satisfaction_score', 'description'),
        }),
        ('اطلاعات بانکی', {
            'fields': ('bank_name', 'account_number', 'sheba_number',
                       'card_bank_name', 'card_number', 'card_expiry_date'),
        }),
        ('سیستمی', {
            'fields': ('is_record_complete', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='نام و نام خانوادگی', ordering='last_name')
    def full_name(self, obj):
        return f'{obj.first_name} {obj.last_name}'.strip()


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'parent', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'code')
    ordering = ('code',)


@admin.register(JobTitle)
class JobTitleAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'level', 'parent', 'is_active')
    list_filter = ('is_active', 'level')
    search_fields = ('name', 'code')
    ordering = ('code',)


@admin.register(WorkLocation)
class WorkLocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'code')


@admin.register(ContractType)
class ContractTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'code')


@admin.register(InsuranceList)
class InsuranceListAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'code')


# --------------------------------------------------------------------------
# رکوردهای وابسته به پرسنل
# --------------------------------------------------------------------------

@admin.register(WorkExperience)
class WorkExperienceAdmin(admin.ModelAdmin):
    list_display = ('employee', 'company_name', 'job_title', 'start_date', 'end_date')
    search_fields = ('employee__first_name', 'employee__last_name', 'employee__employee_id',
                     'company_name', 'job_title')
    list_select_related = ('employee',)
    raw_id_fields = ('employee',)
    ordering = ('-start_date',)


@admin.register(EmployeePenalty)
class EmployeePenaltyAdmin(admin.ModelAdmin):
    list_display = ('employee', 'date', 'amount', 'reason')
    search_fields = ('employee__first_name', 'employee__last_name', 'employee__employee_id', 'reason')
    list_select_related = ('employee',)
    raw_id_fields = ('employee',)
    ordering = ('-date',)


@admin.register(EmploymentChange)
class EmploymentChangeAdmin(admin.ModelAdmin):
    list_display = ('employee', 'change_type', 'effective_date', 'old_value', 'new_value', 'amount')
    list_filter = ('change_type',)
    search_fields = ('employee__first_name', 'employee__last_name', 'employee__employee_id', 'description')
    list_select_related = ('employee',)
    raw_id_fields = ('employee',)
    ordering = ('-effective_date',)


@admin.register(ContractVersion)
class ContractVersionAdmin(admin.ModelAdmin):
    list_display = ('employee', 'version', 'year', 'contract_type', 'start_date', 'end_date', 'base_salary')
    list_filter = ('year', 'contract_type')
    search_fields = ('employee__first_name', 'employee__last_name', 'employee__employee_id')
    list_select_related = ('employee', 'contract_type')
    raw_id_fields = ('employee',)
    ordering = ('-start_date',)


class SupplementaryInsuranceDependentInline(admin.TabularInline):
    model = SupplementaryInsuranceDependent
    extra = 0
    fields = ('first_name', 'last_name', 'relation')


@admin.register(SupplementaryInsuranceDependent)
class SupplementaryInsuranceDependentAdmin(admin.ModelAdmin):
    list_display = ('insurance', 'first_name', 'last_name', 'relation')
    list_filter = ('relation',)
    search_fields = ('first_name', 'last_name',
                     'insurance__employee__first_name', 'insurance__employee__last_name')
    list_select_related = ('insurance',)
    raw_id_fields = ('insurance',)


@admin.register(SupplementaryInsurance)
class SupplementaryInsuranceAdmin(admin.ModelAdmin):
    list_display = ('employee', 'insurance_name', 'insurance_type', 'plan',
                    'start_date', 'end_date', 'monthly_amount', 'total_amount')
    list_filter = ('insurance_type', 'plan')
    search_fields = ('employee__first_name', 'employee__last_name', 'employee__employee_id', 'insurance_name')
    list_select_related = ('employee',)
    raw_id_fields = ('employee',)
    inlines = [SupplementaryInsuranceDependentInline]
    ordering = ('-start_date',)


@admin.register(HRRequest)
class HRRequestAdmin(admin.ModelAdmin):
    list_display = ('employee', 'request_type', 'status', 'requested_date', 'target_value')
    list_filter = ('status', 'request_type')
    search_fields = ('employee__first_name', 'employee__last_name', 'employee__employee_id', 'description')
    list_select_related = ('employee', 'reviewed_by')
    raw_id_fields = ('employee', 'reviewed_by')
    ordering = ('-requested_date',)


@admin.register(AssistantKnowledge)
class AssistantKnowledgeAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'is_active')
    list_filter = ('category', 'is_active')
    search_fields = ('title', 'content', 'tags')

