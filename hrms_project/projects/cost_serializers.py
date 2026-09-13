"""Serializers for Phase 2 cost & progress models."""
from rest_framework import serializers
from projects.cost_models import (
    BudgetLine, CommittedCost, CostTransaction, CostTransactionLine,
    ProgressStatement, ProgressStatementItem,
)


class BudgetLineSerializer(serializers.ModelSerializer):
    wbs_name = serializers.CharField(source='wbs.name', read_only=True)
    cbs_name = serializers.CharField(source='cbs.name', read_only=True)

    class Meta:
        model = BudgetLine
        fields = [
            'id', 'project', 'wbs', 'wbs_name', 'cbs', 'cbs_name',
            'cost_source', 'description', 'quantity', 'unit', 'unit_cost', 'amount',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class CommittedCostSerializer(serializers.ModelSerializer):
    wbs_name = serializers.CharField(source='wbs.name', read_only=True)
    cbs_name = serializers.CharField(source='cbs.name', read_only=True)

    class Meta:
        model = CommittedCost
        fields = [
            'id', 'project', 'contract', 'contract_item', 'wbs', 'wbs_name',
            'cbs', 'cbs_name', 'description', 'amount', 'date', 'reference',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class CostTransactionLineSerializer(serializers.ModelSerializer):
    wbs_name = serializers.CharField(source='wbs.name', read_only=True)
    cbs_name = serializers.CharField(source='cbs.name', read_only=True)
    resource_name = serializers.CharField(source='resource.name', read_only=True)

    class Meta:
        model = CostTransactionLine
        fields = [
            'id', 'transaction', 'wbs', 'wbs_name', 'cbs', 'cbs_name', 'resource', 'resource_name',
            'contract_item', 'price_basis', 'obs', 'description', 'quantity', 'unit',
            'unit_cost', 'amount', 'tax', 'discount', 'net_amount',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class CostTransactionSerializer(serializers.ModelSerializer):
    lines = CostTransactionLineSerializer(many=True, read_only=True)
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = CostTransaction
        fields = [
            'id', 'project', 'number', 'date', 'cost_source', 'contract', 'currency',
            'description', 'accounting_reference', 'purchase_reference',
            'warehouse_reference', 'payroll_reference', 'document_reference',
            'lines', 'total_amount', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def get_total_amount(self, obj):
        return sum(float(l.net_amount or l.amount or 0) for l in obj.lines.all())


class ProgressStatementItemSerializer(serializers.ModelSerializer):
    wbs_name = serializers.CharField(source='wbs.name', read_only=True)

    class Meta:
        model = ProgressStatementItem
        fields = [
            'id', 'statement', 'contract_item', 'wbs', 'wbs_name', 'description',
            'unit', 'unit_price', 'previous_quantity', 'current_quantity',
            'cumulative_quantity', 'progress_percent', 'amount',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class ProgressStatementSerializer(serializers.ModelSerializer):
    items = ProgressStatementItemSerializer(many=True, read_only=True)

    class Meta:
        model = ProgressStatement
        fields = [
            'id', 'project', 'contract', 'number', 'date', 'gross', 'retention',
            'insurance', 'tax', 'adjustment', 'net_payable', 'is_approved', 'items',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']