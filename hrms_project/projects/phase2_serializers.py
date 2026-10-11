"""سریالایزرهای فاز ۲ (بخش دوم) — صورتجلسه، گواهی پرداخت و تخصیص هزینه."""
from rest_framework import serializers

from projects.jalali_utils import jalali_full
from projects.phase2_models import (
    CostAllocation, MeasurementSheet, MeasurementSheetLine, PaymentCertificate,
)


class MeasurementSheetLineSerializer(serializers.ModelSerializer):
    contract_item_code = serializers.CharField(source='contract_item.code', read_only=True)
    wbs_name = serializers.CharField(source='wbs.name', read_only=True)

    class Meta:
        model = MeasurementSheetLine
        fields = [
            'id', 'sheet', 'line_no', 'contract_item', 'contract_item_code', 'wbs', 'wbs_name',
            'description', 'unit', 'unit_price', 'previous_quantity', 'current_quantity',
            'cumulative_quantity', 'amount',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class PaymentCertificateSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    project_code = serializers.CharField(source='project.code', read_only=True)
    contract_number = serializers.CharField(source='contract.number', read_only=True)
    sheet_number = serializers.CharField(source='sheet.number', read_only=True)
    date_jalali = serializers.SerializerMethodField()
    due_date_jalali = serializers.SerializerMethodField()

    class Meta:
        model = PaymentCertificate
        fields = [
            'id', 'project', 'project_code', 'contract', 'contract_number', 'sheet', 'sheet_number',
            'statement', 'invoice', 'payable_item', 'contract_payment',
            'number', 'date', 'date_jalali', 'due_date', 'due_date_jalali',
            'gross', 'deductions', 'net_payable', 'paid_amount', 'status', 'status_display',
            'note', 'created_at',
        ]
        read_only_fields = [
            'id', 'company', 'created_at', 'updated_at', 'statement', 'contract_payment',
            'paid_amount', 'gross', 'deductions', 'net_payable', 'status',
        ]

    def get_date_jalali(self, obj):
        return jalali_full(obj.date)

    def get_due_date_jalali(self, obj):
        return jalali_full(obj.due_date)


class CostAllocationSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    project_code = serializers.CharField(source='project.code', read_only=True)
    wbs_name = serializers.CharField(source='wbs.name', read_only=True)
    activity_code = serializers.CharField(source='activity.code', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    resource_name = serializers.CharField(source='resource.name', read_only=True)
    date_jalali = serializers.SerializerMethodField()
    posted = serializers.SerializerMethodField()

    class Meta:
        model = CostAllocation
        fields = [
            'id', 'project', 'project_code', 'wbs', 'wbs_name', 'activity', 'activity_code',
            'cost_source', 'kind', 'kind_display', 'employee', 'employee_name',
            'resource', 'resource_name', 'title', 'date', 'date_jalali',
            'quantity', 'unit', 'rate', 'amount', 'note', 'cost_transaction', 'posted',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at', 'cost_transaction']

    def get_date_jalali(self, obj):
        return jalali_full(obj.date)

    def get_posted(self, obj):
        return bool(obj.cost_transaction_id)


class MeasurementSheetSerializer(serializers.ModelSerializer):
    lines = MeasurementSheetLineSerializer(many=True, required=False)
    certificates = PaymentCertificateSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    next_statuses = serializers.SerializerMethodField()
    project_code = serializers.CharField(source='project.code', read_only=True)
    contract_number = serializers.CharField(source='contract.number', read_only=True)
    date_jalali = serializers.SerializerMethodField()
    period_from_jalali = serializers.SerializerMethodField()
    period_to_jalali = serializers.SerializerMethodField()

    class Meta:
        model = MeasurementSheet
        fields = [
            'id', 'project', 'project_code', 'contract', 'contract_number',
            'number', 'title', 'description', 'date', 'date_jalali',
            'period_from', 'period_from_jalali', 'period_to', 'period_to_jalali',
            'status', 'status_display', 'next_statuses', 'prepared_by_name',
            'checked_by', 'checked_at', 'approved_by', 'approved_at', 'decision_note',
            'gross_amount', 'retention_percent', 'retention_amount', 'insurance_amount',
            'tax_amount', 'other_deductions', 'net_amount', 'statement',
            'lines', 'certificates', 'created_at',
        ]
        read_only_fields = [
            'id', 'company', 'created_at', 'updated_at', 'status', 'checked_by', 'checked_at',
            'approved_by', 'approved_at', 'gross_amount', 'retention_amount', 'net_amount',
            'statement', 'retention_percent',
        ]

    def get_next_statuses(self, obj):
        from projects.phase2_service import sheet_next_statuses

        return sheet_next_statuses(obj.status)

    def get_date_jalali(self, obj):
        return jalali_full(obj.date)

    def get_period_from_jalali(self, obj):
        return jalali_full(obj.period_from)

    def get_period_to_jalali(self, obj):
        return jalali_full(obj.period_to)

    def create(self, validated_data):
        lines = validated_data.pop('lines', []) or []
        company = validated_data.get('company')
        sheet = MeasurementSheet.objects.create(**validated_data)
        for index, line in enumerate(lines, start=1):
            line.setdefault('line_no', index)
            if not line.get('amount') and line.get('current_quantity') and line.get('unit_price'):
                line['amount'] = round(float(line['current_quantity']) * float(line['unit_price']), 2)
            MeasurementSheetLine.objects.create(company=company, sheet=sheet, **line)
        from projects.phase2_service import recalculate_sheet

        recalculate_sheet(sheet)
        return sheet

    def update(self, instance, validated_data):
        lines = validated_data.pop('lines', None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        if lines is not None:
            instance.lines.all().delete()
            for index, line in enumerate(lines, start=1):
                line.setdefault('line_no', index)
                if not line.get('amount') and line.get('current_quantity') and line.get('unit_price'):
                    line['amount'] = round(float(line['current_quantity']) * float(line['unit_price']), 2)
                MeasurementSheetLine.objects.create(company=instance.company, sheet=instance, **line)
            from projects.phase2_service import recalculate_sheet

            recalculate_sheet(instance)
        return instance

