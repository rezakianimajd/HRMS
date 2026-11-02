"""Serializers for the Payroll module."""
from rest_framework import serializers
from payroll.benefit_dates import benefit_schedule, to_jalali
from payroll.models import (
    BenefitRecord, BenefitTypeDefinition, EmployeeLoan, EmployeeTransaction, SalaryRecord,
)


class TransactionSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)

    class Meta:
        model = EmployeeTransaction
        fields = [
            'id', 'employee', 'employee_name', 'employee_code',
            'transaction_type', 'transaction_type_display',
            'sub_type', 'title', 'amount', 'quantity', 'date',
            'start_date', 'end_date', 'period', 'reference_number',
            'description', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TransactionSummarySerializer(serializers.Serializer):
    """Aggregated summary of transactions per type."""
    transaction_type = serializers.CharField()
    transaction_type_display = serializers.CharField()
    count = serializers.IntegerField()
    total_amount = serializers.DecimalField(max_digits=20, decimal_places=0)
    total_quantity = serializers.DecimalField(max_digits=15, decimal_places=1)


class SalaryRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    month_display = serializers.CharField(source='get_month_display', read_only=True)

    class Meta:
        model = SalaryRecord
        fields = '__all__'
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class BenefitTypeDefinitionSerializer(serializers.ModelSerializer):
    """تعریف نوع مزایا + تاریخ پیشنهادی و نزدیک‌ترین رخداد آیندهٔ آن."""

    suggested_date_jalali = serializers.SerializerMethodField()
    next_date = serializers.SerializerMethodField()
    next_date_jalali = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    urgency = serializers.SerializerMethodField()
    urgency_label = serializers.SerializerMethodField()

    class Meta:
        model = BenefitTypeDefinition
        fields = [
            'id', 'code', 'title', 'suggested_date', 'suggested_date_jalali',
            'next_date', 'next_date_jalali', 'days_remaining', 'urgency', 'urgency_label',
            'note', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def _schedule(self, obj):
        cache = getattr(obj, '_benefit_schedule_cache', None)
        if cache is None:
            cache = benefit_schedule(obj.suggested_date)
            obj._benefit_schedule_cache = cache
        return cache

    def get_suggested_date_jalali(self, obj):
        return to_jalali(obj.suggested_date)

    def get_next_date(self, obj):
        return self._schedule(obj)['next_date']

    def get_next_date_jalali(self, obj):
        return self._schedule(obj)['next_date_jalali']

    def get_days_remaining(self, obj):
        return self._schedule(obj)['days_remaining']

    def get_urgency(self, obj):
        return self._schedule(obj)['urgency']

    def get_urgency_label(self, obj):
        return self._schedule(obj)['urgency_label']


class BenefitRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    month_display = serializers.CharField(source='get_month_display', read_only=True)
    benefit_type_display = serializers.SerializerMethodField()

    class Meta:
        model = BenefitRecord
        fields = '__all__'
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def get_benefit_type_display(self, obj):
        """عنوان نوع مزایا از تعاریف اولیه؛ در نبود آن، برچسب قدیمی (TextChoices)."""
        definitions = self.context.get('benefit_type_map')
        if definitions is None:
            company = getattr(obj, 'company', None)
            queryset = BenefitTypeDefinition.objects.all()
            if company is not None:
                queryset = queryset.filter(company=company)
            definitions = {row.code: row.title for row in queryset.only('code', 'title')}
        if obj.benefit_type in definitions:
            return definitions[obj.benefit_type]
        legacy = dict(BenefitRecord.BenefitType.choices)
        return legacy.get(obj.benefit_type, obj.benefit_type)

    def validate_benefit_type(self, value):
        code = str(value or '').strip()
        if not code:
            raise serializers.ValidationError('نوع مزایا را انتخاب کنید.')
        request = self.context.get('request')
        company = None
        if request is not None:
            company = getattr(request, 'tenant', None) or getattr(request, 'company', None)
        queryset = BenefitTypeDefinition.objects.filter(code=code)
        if company is not None:
            queryset = queryset.filter(company=company)
        if not queryset.exists():
            raise serializers.ValidationError('نوع مزایا در تعاریف اولیه یافت نشد.')
        return code


class EmployeeLoanSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    loan_type_display = serializers.CharField(source='get_loan_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = EmployeeLoan
        fields = [
            'id', 'employee', 'employee_name', 'employee_code',
            'loan_type', 'loan_type_display',
            'amount', 'installment_count', 'installment_amount',
            'grant_date', 'due_date', 'status', 'status_display',
            'description', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']
