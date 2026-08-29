"""
Serializers for the Employees module.
"""
from rest_framework import serializers
from employees.models import (
    Employee, Department, WorkLocation, JobTitle, InsuranceList, ContractType,
    EmploymentChange, ContractVersion, WorkExperience,
    SupplementaryInsurance, SupplementaryInsuranceDependent,
)


class DepartmentSerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source='parent.name', read_only=True)

    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'parent', 'parent_name', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class WorkLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkLocation
        fields = ['id', 'name', 'code', 'description', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class JobTitleSerializer(serializers.ModelSerializer):
    level_display = serializers.CharField(source='get_level_display', read_only=True)
    parent_name = serializers.CharField(source='parent.name', read_only=True)

    class Meta:
        model = JobTitle
        fields = ['id', 'name', 'code', 'level', 'level_display', 'parent', 'parent_name', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class InsuranceListSerializer(serializers.ModelSerializer):
    class Meta:
        model = InsuranceList
        fields = ['id', 'name', 'code', 'description', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class ContractTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractType
        fields = ['id', 'name', 'code', 'description', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


# =============================================================================
# Employee Serializers
# =============================================================================

class EmployeeListSerializer(serializers.ModelSerializer):
    """Compact serializer for employee list (better performance)."""
    department_name = serializers.CharField(source='department.name', read_only=True)
    job_title_name = serializers.CharField(source='job_title.name', read_only=True)
    work_location_name = serializers.CharField(source='work_location.name', read_only=True)
    full_name = serializers.CharField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)

    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id', 'full_name', 'first_name', 'last_name', 'photo', 'photo_url',
            'employee_id', 'national_id', 'mobile',
            'department', 'department_name',
            'job_title', 'job_title_name',
            'work_location', 'work_location_name',
            'status', 'status_display',
            'gender', 'gender_display',
            'hire_date', 'birth_date', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'full_name', 'created_at', 'birth_date']

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None


class EmployeeSerializer(serializers.ModelSerializer):
    """Full serializer for employee detail and create/update."""

    def to_internal_value(self, data):
        # Drop empty-string values so nullable fields get None (not '').
        # Also ignore `photo` when it's a URL string (not an uploaded file).
        cleaned = {}
        for k, v in data.items():
            if v == '':
                continue
            if k == 'photo' and isinstance(v, str):
                continue
            cleaned[k] = v
        return super().to_internal_value(cleaned)

    department_detail = DepartmentSerializer(source='department', read_only=True)
    job_title_detail = JobTitleSerializer(source='job_title', read_only=True)
    work_location_detail = WorkLocationSerializer(source='work_location', read_only=True)
    insurance_list_detail = InsuranceListSerializer(source='insurance_list', read_only=True)
    full_name = serializers.CharField(read_only=True)

    # Display strings for choice fields
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)
    marital_status_display = serializers.CharField(source='get_marital_status_display', read_only=True)
    contract_type_display = serializers.CharField(source='contract_type.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    work_shift_display = serializers.CharField(source='get_work_shift_display', read_only=True)
    education_level_display = serializers.CharField(source='get_education_level_display', read_only=True)
    university_type_display = serializers.CharField(source='get_university_type_display', read_only=True)
    supplementary_insurances = serializers.SerializerMethodField()

    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id', 'full_name',
            # Personal
            'first_name', 'last_name', 'photo', 'photo_url', 'national_id',
            'birth_date', 'birth_place', 'gender', 'gender_display',
            'marital_status', 'marital_status_display',
            'children_count', 'spouse_name', 'father_name',
            'birth_certificate_number',
            'national_id_serial', 'national_id_place', 'national_id_date',
            # Contact
            'phone', 'mobile', 'email', 'address', 'city', 'postal_code',
            'emergency_contact_name', 'emergency_contact_phone',
            # Employment
            'employee_id', 'hire_date', 'probation_end_date', 'official_date',
            'department', 'department_detail',
            'job_title', 'job_title_detail',
            'work_location', 'work_location_detail',
            'insurance_list', 'insurance_list_detail',
            'insurance_number',
            'contract_type', 'contract_type_display',
            'contract_start_date', 'contract_end_date',
            'status', 'status_display',
            'status_change_date', 'work_shift', 'work_shift_display',
            'work_start_time', 'work_end_time',
            'description',
            # Evaluation
            'education_level', 'education_level_display', 'education_field',
            'education_place', 'university_type', 'university_type_display',
            'distance_to_work_km', 'housing_type', 'has_car',
            'performance_score', 'satisfaction_score',
            'bank_name', 'account_number', 'sheba_number',
            'supplementary_insurances',
            # Meta
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'full_name', 'created_at', 'updated_at']

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None

    def get_supplementary_insurances(self, obj):
        return SupplementaryInsuranceSerializer(
            obj.supplementary_insurances.all(), many=True
        ).data


class EmployeeCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new employee with validations."""

    def to_internal_value(self, data):
        # Drop empty-string values so nullable fields get None (not '').
        # Also ignore `photo` when it's a URL string (not an uploaded file).
        cleaned = {}
        for k, v in data.items():
            if v == '':
                continue
            if k == 'photo' and isinstance(v, str):
                continue
            cleaned[k] = v
        return super().to_internal_value(cleaned)

    class Meta:
        model = Employee
        fields = [
            # Personal
            'first_name', 'last_name', 'photo', 'national_id',
            'birth_date', 'birth_place', 'gender',
            'marital_status', 'children_count', 'spouse_name', 'father_name',
            'birth_certificate_number',
            'national_id_serial', 'national_id_place', 'national_id_date',
            # Contact
            'phone', 'mobile', 'email', 'address', 'city', 'postal_code',
            'emergency_contact_name', 'emergency_contact_phone',
            # Employment
            'employee_id', 'hire_date', 'probation_end_date', 'official_date',
            'department', 'job_title', 'work_location', 'insurance_list',
            'insurance_number',
            'contract_type', 'contract_start_date', 'contract_end_date',
            'status', 'status_change_date', 'work_shift',
            'work_start_time', 'work_end_time', 'description',
            # Evaluation
            'education_level', 'education_field', 'education_place',
            'university_type',
            'distance_to_work_km', 'housing_type', 'has_car',
            'performance_score', 'satisfaction_score',
            # Banking
            'bank_name', 'account_number', 'sheba_number',
        ]

    def validate_national_id(self, value):
        # Normalize Persian/Arabic digits to English before validation
        normalized = str(value).translate(str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'))
        if not normalized.isdigit() or len(normalized) != 10:
            raise serializers.ValidationError("کد ملی باید ۱۰ رقم باشد.")
        return normalized

    def validate_mobile(self, value):
        # Normalize Persian/Arabic digits to English before validation
        normalized = str(value).translate(str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'))
        if not normalized.isdigit() or len(normalized) != 11:
            raise serializers.ValidationError("شماره موبایل باید ۱۱ رقم باشد.")
        return normalized

    def validate(self, data):
        # Validate marital status dependent fields
        if data.get('marital_status') == 'married':
            if data.get('children_count', 0) > 0 and not data.get('spouse_name'):
                raise serializers.ValidationError({
                    'spouse_name': 'برای افراد متأهل دارای فرزند، نام همسر الزامی است.'
                })
        return data


class EmploymentChangeSerializer(serializers.ModelSerializer):
    change_type_display = serializers.CharField(source='get_change_type_display', read_only=True)

    class Meta:
        model = EmploymentChange
        fields = [
            'id', 'employee', 'change_type', 'change_type_display',
            'effective_date', 'year', 'old_value', 'new_value', 'amount',
            'description', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class WorkExperienceSerializer(serializers.ModelSerializer):
    duration_years = serializers.FloatField(read_only=True)

    class Meta:
        model = WorkExperience
        fields = ['id', 'employee', 'company_name', 'job_title', 'start_date', 'end_date', 'description', 'duration_years', 'created_at']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at', 'duration_years']


class ContractVersionSerializer(serializers.ModelSerializer):
    contract_type_display = serializers.CharField(source='contract_type.name', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)

    class Meta:
        model = ContractVersion
        fields = [
            'id', 'employee', 'employee_name', 'version', 'year',
            'contract_type', 'contract_type_display',
            'start_date', 'end_date', 'base_salary', 'description', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class SupplementaryInsuranceDependentSerializer(serializers.ModelSerializer):
    relation_display = serializers.CharField(source='get_relation_display', read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = SupplementaryInsuranceDependent
        fields = [
            'id', 'insurance', 'first_name', 'last_name',
            'relation', 'relation_display', 'full_name',
        ]

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"


class SupplementaryInsuranceSerializer(serializers.ModelSerializer):
    dependents = SupplementaryInsuranceDependentSerializer(many=True, read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)

    class Meta:
        model = SupplementaryInsurance
        fields = [
            'id', 'employee', 'employee_name',
            'insurance_name', 'insurance_type', 'plan',
            'start_date', 'end_date',
            'monthly_amount', 'total_amount',
            'dependents', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']
