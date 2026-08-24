"""Serializers for the Payroll module."""
from rest_framework import serializers
from payroll.models import EmployeeTransaction, SalaryRecord, BenefitRecord


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


class BenefitRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    month_display = serializers.CharField(source='get_month_display', read_only=True)
    benefit_type_display = serializers.CharField(source='get_benefit_type_display', read_only=True)

    class Meta:
        model = BenefitRecord
        fields = '__all__'
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']
