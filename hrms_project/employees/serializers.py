"""
Serializers for the Employees module.
"""
import os
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
    department_name = serializers.CharField(source='department.name', read_only=True)
    job_title_name = serializers.CharField(source='job_title.name', read_only=True)
    work_location_name = serializers.CharField(source='work_location.name', read_only=True)
    insurance_list_name = serializers.CharField(source='insurance_list.name', read_only=True)
    full_name = serializers.CharField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)
    photo_url = serializers.SerializerMethodField()
    completeness_percent = serializers.IntegerField(read_only=True)

    class Meta:
        model = Employee
        fields = [
            'id', 'full_name', 'first_name', 'last_name', 'photo', 'photo_url',
            'employee_id', 'national_id', 'mobile',
            'department', 'department_name',
            'job_title', 'job_title_name',
            'work_location', 'work_location_name',
            'insurance_list', 'insurance_list_name',
            'status', 'status_display',
            'gender', 'gender_display',
            'hire_date', 'birth_date', 'is_active', 'created_at',
            'card_number', 'card_expiry_date',
            'is_record_complete', 'completeness_percent',
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
    def to_internal_value(self, data):
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
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)
    marital_status_display = serializers.CharField(source='get_marital_status_display', read_only=True)
    contract_type_display = serializers.CharField(source='contract_type.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    work_shift_display = serializers.CharField(source='get_work_shift_display', read_only=True)
    education_level_display = serializers.CharField(source='get_education_level_display', read_only=True)
    university_type_display = serializers.CharField(source='get_university_type_display', read_only=True)
    supplementary_insurances = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()
    completeness_percent = serializers.IntegerField(read_only=True)

    class Meta:
        model = Employee
        fields = [
            'id', 'full_name',
            'first_name', 'last_name', 'photo', 'photo_url', 'national_id',
            'birth_date', 'birth_place', 'gender', 'gender_display',
            'marital_status', 'marital_status_display',
            'children_count', 'spouse_name', 'father_name',
            'birth_certificate_number',
            'national_id_serial', 'national_id_place', 'national_id_date',
            'phone', 'mobile', 'email', 'address', 'city', 'postal_code',
            'emergency_contact_name', 'emergency_contact_phone',
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
            'education_level', 'education_level_display', 'education_field',
            'education_place', 'university_type', 'university_type_display',
            'distance_to_work_km', 'housing_type', 'has_car',
            'performance_score', 'satisfaction_score',
            'bank_name', 'account_number', 'sheba_number',
            'card_bank_name', 'card_number', 'card_expiry_date',
            'supplementary_insurances',
            'bale_chat_id',
            'is_record_complete', 'completeness_percent',
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
            obj.supplementary_insurances.all(), many=True, context=self.context,
        ).data


class EmployeeCreateSerializer(serializers.ModelSerializer):
    def to_internal_value(self, data):
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
            'first_name', 'last_name', 'photo', 'national_id',
            'birth_date', 'birth_place', 'gender',
            'marital_status', 'children_count', 'spouse_name', 'father_name',
            'birth_certificate_number',
            'national_id_serial', 'national_id_place', 'national_id_date',
            'phone', 'mobile', 'email', 'address', 'city', 'postal_code',
            'emergency_contact_name', 'emergency_contact_phone',
            'employee_id', 'hire_date', 'probation_end_date', 'official_date',
            'department', 'job_title', 'work_location', 'insurance_list',
            'insurance_number',
            'contract_type', 'contract_start_date', 'contract_end_date',
            'status', 'status_change_date', 'work_shift',
            'work_start_time', 'work_end_time', 'description',
            'education_level', 'education_field', 'education_place',
            'university_type',
            'distance_to_work_km', 'housing_type', 'has_car',
            'performance_score', 'satisfaction_score',
            'bank_name', 'account_number', 'sheba_number',
            'card_bank_name', 'card_number', 'card_expiry_date',
            'is_record_complete',
            'bale_chat_id',
        ]

    def validate_national_id(self, value):
        normalized = str(value).translate(str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'))
        if not normalized.isdigit() or len(normalized) != 10:
            raise serializers.ValidationError("کد ملی باید ۱۰ رقم باشد.")
        return normalized

    def validate_mobile(self, value):
        normalized = str(value).translate(str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'))
        if not normalized.isdigit() or len(normalized) != 11:
            raise serializers.ValidationError("شماره موبایل باید ۱۱ رقم باشد.")
        return normalized

    def validate(self, data):
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
    signature_image_url = serializers.SerializerMethodField()

    def get_signature_image_url(self, obj):
        if obj.signature_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.signature_image.url)
            return obj.signature_image.url
        return None

    class Meta:
        model = ContractVersion
        fields = [
            'id', 'employee', 'employee_name', 'version', 'year',
            'contract_type', 'contract_type_display',
            'start_date', 'end_date', 'base_salary', 'description',
            'attraction_allowance', 'job_allowance', 'housing_allowance',
            'meal_voucher', 'travel_cost', 'family_allowance', 'children_allowance',
            'contract_text',
            'signed_by', 'signed_at', 'signature_image', 'signature_image_url',
            'created_at',
        ]
        read_only_fields = [
            'id', 'company', 'is_active', 'created_at', 'updated_at',
        ]


class SupplementaryInsuranceDependentSerializer(serializers.ModelSerializer):
    ALLOWED_ATTACHMENT_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.webp'}
    MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024

    relation_display = serializers.CharField(source='get_relation_display', read_only=True)
    attachment = serializers.FileField(required=False, allow_null=True)
    remove_attachment = serializers.BooleanField(write_only=True, required=False, default=False)
    attachment_url = serializers.SerializerMethodField()
    attachment_name = serializers.SerializerMethodField()
    attachment_size = serializers.SerializerMethodField()
    attachment_size_display = serializers.SerializerMethodField()
    has_attachment = serializers.SerializerMethodField()

    class Meta:
        model = SupplementaryInsuranceDependent
        fields = [
            'id', 'insurance', 'first_name', 'last_name',
            'relation', 'relation_display',
            'attachment', 'attachment_url', 'attachment_name',
            'attachment_size', 'attachment_size_display', 'has_attachment',
            'remove_attachment',
        ]

    def get_attachment_url(self, obj):
        if not obj.attachment:
            return ''
        request = self.context.get('request')
        return request.build_absolute_uri(obj.attachment.url) if request else obj.attachment.url

    def get_attachment_name(self, obj):
        return os.path.basename(obj.attachment.name) if obj.attachment else ''

    def get_attachment_size(self, obj):
        if not obj.attachment:
            return 0
        try:
            return int(obj.attachment.size)
        except Exception:  # noqa: BLE001
            return 0

    def get_attachment_size_display(self, obj):
        size = self.get_attachment_size(obj)
        if size <= 0:
            return ''
        if size < 1024:
            return f'{size} B'
        if size < 1024 * 1024:
            return f'{size / 1024:.1f} KB'
        return f'{size / (1024 * 1024):.2f} MB'

    def get_has_attachment(self, obj):
        return bool(obj.attachment)

    @staticmethod
    def _drop_attachment(instance):
        if instance and instance.attachment:
            instance.attachment.delete(save=False)
            instance.attachment = None

    def validate_attachment(self, value):
        if not value:
            return value
        extension = os.path.splitext(getattr(value, 'name', ''))[1].lower()
        if extension not in self.ALLOWED_ATTACHMENT_EXTENSIONS:
            raise serializers.ValidationError('فرمت پیوست باید PDF یا تصویر (JPG/PNG/WEBP) باشد.')
        if int(getattr(value, 'size', 0)) > self.MAX_ATTACHMENT_SIZE:
            raise serializers.ValidationError('حجم پیوست نباید بیشتر از ۱۰ مگابایت باشد.')
        return value

    def create(self, validated_data):
        validated_data.pop('remove_attachment', None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        remove_attachment = validated_data.pop('remove_attachment', False)
        if remove_attachment:
            self._drop_attachment(instance)
        return super().update(instance, validated_data)


class SupplementaryInsuranceSerializer(serializers.ModelSerializer):
    dependents = SupplementaryInsuranceDependentSerializer(many=True, read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    employee_gender = serializers.CharField(source='employee.gender', read_only=True)
    employee_photo_url = serializers.SerializerMethodField()
    department_name = serializers.CharField(source='employee.department.name', read_only=True)
    job_title_name = serializers.CharField(source='employee.job_title.name', read_only=True)
    dependents_count = serializers.SerializerMethodField()
    dependents_with_attachment = serializers.SerializerMethodField()

    class Meta:
        model = SupplementaryInsurance
        fields = [
            'id', 'employee', 'employee_name', 'employee_code',
            'employee_gender', 'employee_photo_url',
            'department_name', 'job_title_name',
            'insurance_name', 'insurance_type', 'plan',
            'start_date', 'end_date',
            'monthly_amount', 'total_amount',
            'dependents', 'dependents_count', 'dependents_with_attachment',
            'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def get_employee_photo_url(self, obj):
        employee = getattr(obj, 'employee', None)
        if employee and employee.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(employee.photo.url)
            return employee.photo.url
        return ''

    def get_dependents_count(self, obj):
        return len(obj.dependents.all())

    def get_dependents_with_attachment(self, obj):
        return sum(1 for dependent in obj.dependents.all() if dependent.attachment)