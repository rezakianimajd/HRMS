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

    # --- کدینگ حسابداری ردیف (بر پایهٔ «تعاریف اولیهٔ پروژه») ---
    account_definition_title = serializers.CharField(source='account_definition.title', read_only=True)
    account_definition_kind = serializers.CharField(source='account_definition.kind', read_only=True)
    general_account_code = serializers.CharField(source='general_account.code', read_only=True)
    general_account_name = serializers.CharField(source='general_account.name', read_only=True)
    account_code = serializers.CharField(source='account.code', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    cost_center_name = serializers.CharField(source='cost_center.name', read_only=True)
    auxiliary_1_code = serializers.CharField(source='auxiliary_1.code', read_only=True)
    auxiliary_1_name = serializers.CharField(source='auxiliary_1.name', read_only=True)
    auxiliary_2_code = serializers.CharField(source='auxiliary_2.code', read_only=True)
    auxiliary_2_name = serializers.CharField(source='auxiliary_2.name', read_only=True)
    auxiliary_3_code = serializers.CharField(source='auxiliary_3.code', read_only=True)
    auxiliary_3_name = serializers.CharField(source='auxiliary_3.name', read_only=True)
    coding_preview = serializers.SerializerMethodField()

    class Meta:
        model = CostTransactionLine
        fields = [
            'id', 'transaction', 'wbs', 'wbs_name', 'cbs', 'cbs_name', 'resource', 'resource_name',
            'contract_item', 'price_basis', 'obs', 'description', 'quantity', 'unit',
            'unit_cost', 'amount', 'tax', 'discount', 'net_amount',
            'account_definition', 'account_definition_title', 'account_definition_kind',
            'general_account', 'general_account_code', 'general_account_name',
            'account', 'account_code', 'account_name', 'cost_center', 'cost_center_name',
            'auxiliary_1', 'auxiliary_1_code', 'auxiliary_1_name',
            'auxiliary_2', 'auxiliary_2_code', 'auxiliary_2_name',
            'auxiliary_3', 'auxiliary_3_code', 'auxiliary_3_name',
            'coding_note', 'coding_preview',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def get_coding_preview(self, obj):
        """متن خلاصهٔ کدینگ، آمادهٔ نمایش در فهرست ردیف‌ها."""
        parts = []
        if obj.general_account_id:
            parts.append(f'کل: {obj.general_account.code}')
        if obj.account_id:
            parts.append(f'معین: {obj.account.code}')
        for slot, label in ((1, 'تفصیل ۱'), (2, 'تفصیل ۲'), (3, 'تفصیل ۳')):
            auxiliary = getattr(obj, f'auxiliary_{slot}', None)
            if auxiliary is not None:
                parts.append(f'{label}: {auxiliary.code}')
        if obj.cost_center_id:
            parts.append(f'مرکز هزینه: {obj.cost_center.code}')
        return ' · '.join(parts)


class CostTransactionSerializer(serializers.ModelSerializer):
    lines = CostTransactionLineSerializer(many=True, read_only=True)
    total_amount = serializers.SerializerMethodField()
    currency_name = serializers.CharField(source='currency.name', read_only=True)
    currency_code_display = serializers.SerializerMethodField()

    class Meta:
        model = CostTransaction
        fields = [
            'id', 'project', 'number', 'date', 'cost_source', 'contract',
            'currency', 'currency_name', 'currency_code', 'currency_code_display',
            'description', 'accounting_reference', 'purchase_reference',
            'warehouse_reference', 'payroll_reference', 'document_reference',
            'lines', 'total_amount', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def get_currency_code_display(self, obj):
        """کد ارز مؤثر: از ارجاع جدید و در نبود آن مقدار میراثی (Phase 0)."""
        return obj.currency.code if obj.currency_id else (obj.currency_code or 'IRR')

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