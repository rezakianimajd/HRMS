"""سریالایزرهای فاز ۲ — تغییرات پروژه (Change Order)."""
from rest_framework import serializers

from projects.change_models import ChangeOrder, ChangeOrderApproval, ChangeOrderLine
from projects.jalali_utils import jalali_full


class ChangeOrderLineSerializer(serializers.ModelSerializer):
    wbs_name = serializers.CharField(source='wbs.name', read_only=True)
    cbs_name = serializers.CharField(source='cbs.name', read_only=True)
    cost_source_name = serializers.CharField(source='cost_source.name', read_only=True)

    class Meta:
        model = ChangeOrderLine
        fields = [
            'id', 'change_order', 'wbs', 'wbs_name', 'cbs', 'cbs_name',
            'cost_source', 'cost_source_name', 'description', 'unit',
            'quantity', 'unit_price', 'amount',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class ChangeOrderApprovalSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    created_jalali = serializers.SerializerMethodField()

    class Meta:
        model = ChangeOrderApproval
        fields = [
            'id', 'change_order', 'action', 'action_display', 'actor',
            'actor_name', 'comment', 'created_at', 'created_jalali',
        ]

    def get_created_jalali(self, obj):
        return jalali_full(obj.created_at.date()) if obj.created_at else ''


class ChangeOrderSerializer(serializers.ModelSerializer):
    lines = ChangeOrderLineSerializer(many=True, required=False)
    approvals = ChangeOrderApprovalSerializer(many=True, read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    project_code = serializers.CharField(source='project.code', read_only=True)
    contract_number = serializers.CharField(source='contract.number', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    cause_display = serializers.CharField(source='get_cause_display', read_only=True)
    currency_code = serializers.CharField(source='currency.code', read_only=True)
    request_date_jalali = serializers.SerializerMethodField()
    decided_date_jalali = serializers.SerializerMethodField()
    next_statuses = serializers.SerializerMethodField()

    class Meta:
        model = ChangeOrder
        fields = [
            'id', 'project', 'project_name', 'project_code', 'contract', 'contract_number',
            'number', 'title', 'subject', 'cause', 'cause_display', 'description',
            'request_date', 'request_date_jalali', 'decided_date', 'decided_date_jalali',
            'time_impact_days', 'cost_impact', 'currency', 'currency_code',
            'status', 'status_display', 'requested_by', 'decided_by', 'decision_note',
            'applied', 'applied_at', 'applied_budget_line', 'created_addendum',
            'next_statuses', 'lines', 'approvals', 'created_at',
        ]
        read_only_fields = [
            'id', 'company', 'created_at', 'updated_at', 'applied', 'applied_at',
            'applied_budget_line', 'created_addendum', 'decided_by', 'status',
        ]

    def get_request_date_jalali(self, obj):
        return jalali_full(obj.request_date)

    def get_decided_date_jalali(self, obj):
        return jalali_full(obj.decided_date)

    def get_next_statuses(self, obj):
        from projects.change_service import next_statuses

        return next_statuses(obj.status)

    def create(self, validated_data):
        """ایجاد تغییر همراه با خطوط اثر (nested write)."""
        lines = validated_data.pop('lines', []) or []
        company = validated_data.get('company')
        change_order = ChangeOrder.objects.create(**validated_data)
        for line in lines:
            ChangeOrderLine.objects.create(company=company, change_order=change_order, **line)
        return change_order

    def update(self, instance, validated_data):
        """به‌روزرسانی سرصفحه و (در صورت ارسال) جایگزینی خطوط اثر."""
        lines = validated_data.pop('lines', None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        if lines is not None:
            instance.lines.all().delete()
            for line in lines:
                ChangeOrderLine.objects.create(
                    company=instance.company, change_order=instance, **line,
                )
        return instance

