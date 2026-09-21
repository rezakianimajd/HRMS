"""Serializers for the Petty Cash module."""
from rest_framework import serializers
from pettycash.models import (
    PettyCashFund, PettyCashTransaction, PettyCashCategory,
    PettyCashExpenseStatement, PettyCashExpenseStatementLine,
)


class PettyCashCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PettyCashCategory
        fields = ['id', 'name', 'code', 'is_active', 'created_at']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class PettyCashTransactionSerializer(serializers.ModelSerializer):
    entry_type_display = serializers.CharField(source='get_entry_type_display', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    receipt_url = serializers.SerializerMethodField()

    class Meta:
        model = PettyCashTransaction
        fields = [
            'id', 'fund', 'entry_type', 'entry_type_display',
            'category', 'category_name', 'amount', 'title', 'date',
            'receipt', 'receipt_url', 'description',
            'is_archived', 'archived_at', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def get_receipt_url(self, obj):
        if obj.receipt:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.receipt.url) if request else obj.receipt.url
        return None


class PettyCashExpenseStatementLineSerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source='account.code', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)

    class Meta:
        model = PettyCashExpenseStatementLine
        fields = [
            'id', 'statement', 'line_no', 'account', 'account_code', 'account_name',
            'auxiliary_1', 'auxiliary_2', 'auxiliary_3',
            'invoice_number', 'supplier', 'expense_date', 'description', 'debit',
        ]
        extra_kwargs = {'statement': {'read_only': True}}


class PettyCashExpenseStatementSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    fund_title = serializers.CharField(source='fund.title', read_only=True)
    custodian_name = serializers.CharField(source='custodian.full_name', read_only=True)
    total = serializers.DecimalField(max_digits=18, decimal_places=0, read_only=True)
    lines = PettyCashExpenseStatementLineSerializer(many=True, required=False)

    class Meta:
        model = PettyCashExpenseStatement
        fields = [
            'id', 'fund', 'fund_title', 'custodian', 'custodian_name', 'number',
            'date', 'description', 'status', 'status_display', 'history', 'total', 'lines', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at', 'custodian', 'status', 'history']

    def create(self, validated_data):
        lines = validated_data.pop('lines', [])
        company = validated_data.pop('company', None)
        st = PettyCashExpenseStatement.objects.create(company=company, **validated_data)
        for i, line in enumerate(lines, start=1):
            line.pop('statement', None)
            line.pop('company', None)
            PettyCashExpenseStatementLine.objects.create(statement=st, company=company, line_no=i, **line)
        return st


class PettyCashFundSerializer(serializers.ModelSerializer):
    custodian_name = serializers.CharField(source='custodian.full_name', read_only=True)
    custodian_code = serializers.CharField(source='custodian.employee_id', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    balance = serializers.DecimalField(max_digits=18, decimal_places=0, read_only=True)

    class Meta:
        model = PettyCashFund
        fields = [
            'id', 'code', 'title', 'custodian', 'custodian_name', 'custodian_code',
            'account', 'opening_balance', 'limit', 'status', 'status_display', 'balance',
            'archived_at', 'description', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at', 'balance']