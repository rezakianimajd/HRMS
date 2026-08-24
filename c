"""Serializers for the Payroll module."""
from rest_framework import serializers
from payroll.models import EmployeeTransaction


class TransactionSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)

    class Meta:
        model = EmployeeTransaction
        fields = [
            'id', 'employee', 'employee_name', 'employee_code',
            'transaction_type', 'transaction_type_display',
            'title', 'amount', 'quantity', 'date', 'description',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TransactionSummarySerializer(serializers.Serializer):
    """Aggregated summary of transactions per type."""
    transaction_type = serializers.CharField()
    transaction_type_display = serializers.CharField()
    count = serializers.IntegerField()
    total_amount = serializers.DecimalField(max_digits=20, decimal_places=0)
    total_quantity = serializers.DecimalField(max_digits=15, decimal_places=1)