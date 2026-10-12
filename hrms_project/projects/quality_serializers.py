"""سریالایزرهای کیفیت و HSE (فاز ۳ بخش دوم)."""
from django.utils import timezone
from rest_framework import serializers

from projects.jalali_utils import jalali_full
from projects.quality_engine import is_overdue
from projects.quality_models import HSEIncident, Inspection, NCR, PunchItem, QualityPlan, QualityPlanItem
from projects.quality_service import (
    hse_next_statuses, ncr_next_statuses, plan_item_next_statuses, punch_next_statuses,
)


class QualityPlanItemSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    inspection_type_display = serializers.CharField(source='get_inspection_type_display', read_only=True)
    point_type_display = serializers.CharField(source='get_point_type_display', read_only=True)
    wbs_name = serializers.CharField(source='wbs.name', read_only=True)
    activity_code = serializers.CharField(source='activity.code', read_only=True)
    planned_date_jalali = serializers.SerializerMethodField()
    next_statuses = serializers.SerializerMethodField()
    # داخل طرح بازرسی به‌صورت تودرتو نوشته می‌شود
    plan = serializers.PrimaryKeyRelatedField(queryset=QualityPlan.objects.all(), required=False)

    class Meta:
        model = QualityPlanItem
        fields = [
            'id', 'plan', 'item_no', 'description', 'wbs', 'wbs_name', 'activity', 'activity_code',
            'inspection_type', 'inspection_type_display', 'point_type', 'point_type_display',
            'reference', 'method', 'frequency', 'responsible_name', 'planned_date',
            'planned_date_jalali', 'status', 'status_display', 'next_statuses', 'sort_order',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def get_planned_date_jalali(self, obj):
        return jalali_full(obj.planned_date)

    def get_next_statuses(self, obj):
        return plan_item_next_statuses(obj.status)


class QualityPlanSerializer(serializers.ModelSerializer):
    items = QualityPlanItemSerializer(many=True, required=False)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    project_code = serializers.CharField(source='project.code', read_only=True)
    contract_number = serializers.CharField(source='contract.number', read_only=True)
    date_jalali = serializers.SerializerMethodField()
    approved_at_jalali = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()
    items_stats = serializers.SerializerMethodField()

    class Meta:
        model = QualityPlan
        fields = [
            'id', 'project', 'project_code', 'contract', 'contract_number', 'number', 'title',
            'revision', 'date', 'date_jalali', 'status', 'status_display', 'prepared_by_name',
            'approved_by_name', 'approved_at', 'approved_at_jalali', 'description',
            'items', 'items_count', 'items_stats',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def get_date_jalali(self, obj):
        return jalali_full(obj.date)

    def get_approved_at_jalali(self, obj):
        return jalali_full(obj.approved_at)

    def get_items_count(self, obj):
        return obj.items.count()

    def get_items_stats(self, obj):
        from projects.quality_engine import plan_progress

        return plan_progress(list(obj.items.all()))

    def create(self, validated_data):
        items = validated_data.pop('items', []) or []
        company = validated_data.get('company')
        plan = QualityPlan.objects.create(**validated_data)
        for index, item in enumerate(items, start=1):
            item.setdefault('sort_order', index)
            QualityPlanItem.objects.create(company=company, plan=plan, **item)
        return plan

    def update(self, instance, validated_data):
        items = validated_data.pop('items', None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        if items is not None:
            instance.items.all().delete()
            for index, item in enumerate(items, start=1):
                item.setdefault('sort_order', index)
                QualityPlanItem.objects.create(company=instance.company, plan=instance, **item)
        return instance


class InspectionSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    result_display = serializers.SerializerMethodField()
    project_code = serializers.CharField(source='project.code', read_only=True)
    plan_item_no = serializers.CharField(source='plan_item.item_no', read_only=True)
    plan_number = serializers.CharField(source='plan_item.plan.number', read_only=True)
    wbs_name = serializers.CharField(source='wbs.name', read_only=True)
    date_jalali = serializers.SerializerMethodField()
    next_inspection_date_jalali = serializers.SerializerMethodField()
    ncr_count = serializers.SerializerMethodField()
    overdue = serializers.SerializerMethodField()

    class Meta:
        model = Inspection
        fields = [
            'id', 'project', 'project_code', 'plan_item', 'plan_item_no', 'plan_number',
            'wbs', 'wbs_name', 'number', 'title', 'date', 'date_jalali', 'inspector_name',
            'location', 'status', 'status_display', 'result', 'result_display', 'report_ref',
            'remarks', 'next_inspection_date', 'next_inspection_date_jalali',
            'ncr_count', 'overdue', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def get_result_display(self, obj):
        return obj.get_result_display() if obj.result else ''

    def get_date_jalali(self, obj):
        return jalali_full(obj.date)

    def get_next_inspection_date_jalali(self, obj):
        return jalali_full(obj.next_inspection_date)

    def get_ncr_count(self, obj):
        return obj.ncrs.count()

    def get_overdue(self, obj):
        return obj.status == 'planned' and is_overdue(obj.date, timezone.localdate())


class NCRSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    project_code = serializers.CharField(source='project.code', read_only=True)
    inspection_number = serializers.CharField(source='inspection.number', read_only=True)
    wbs_name = serializers.CharField(source='wbs.name', read_only=True)
    activity_code = serializers.CharField(source='activity.code', read_only=True)
    responsible_full_name = serializers.CharField(source='responsible.full_name', read_only=True)
    detected_date_jalali = serializers.SerializerMethodField()
    due_date_jalali = serializers.SerializerMethodField()
    closed_date_jalali = serializers.SerializerMethodField()
    next_statuses = serializers.SerializerMethodField()
    overdue = serializers.SerializerMethodField()
    age_days = serializers.SerializerMethodField()
    punch_count = serializers.SerializerMethodField()

    class Meta:
        model = NCR
        fields = [
            'id', 'project', 'project_code', 'inspection', 'inspection_number', 'wbs', 'wbs_name',
            'activity', 'activity_code', 'number', 'title', 'description', 'source', 'source_display',
            'severity', 'severity_display', 'discipline', 'status', 'status_display', 'next_statuses',
            'detected_date', 'detected_date_jalali', 'due_date', 'due_date_jalali', 'closed_date',
            'closed_date_jalali', 'root_cause', 'corrective_action', 'preventive_action',
            'responsible', 'responsible_full_name', 'responsible_name', 'requires_rework',
            'cost_impact', 'closed_by', 'note', 'overdue', 'age_days', 'punch_count', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at', 'closed_by', 'closed_date']

    def get_detected_date_jalali(self, obj):
        return jalali_full(obj.detected_date)

    def get_due_date_jalali(self, obj):
        return jalali_full(obj.due_date)

    def get_closed_date_jalali(self, obj):
        return jalali_full(obj.closed_date)

    def get_next_statuses(self, obj):
        return ncr_next_statuses(obj.status)

    def get_overdue(self, obj):
        return obj.status not in ('closed', 'cancelled') and is_overdue(obj.due_date, timezone.localdate())

    def get_age_days(self, obj):
        if not obj.detected_date:
            return None
        end = obj.closed_date or timezone.localdate()
        return max((end - obj.detected_date).days, 0)

    def get_punch_count(self, obj):
        return obj.punch_items.count()


class PunchItemSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    project_code = serializers.CharField(source='project.code', read_only=True)
    wbs_name = serializers.CharField(source='wbs.name', read_only=True)
    ncr_number = serializers.CharField(source='ncr.number', read_only=True)
    responsible_full_name = serializers.CharField(source='responsible.full_name', read_only=True)
    reported_date_jalali = serializers.SerializerMethodField()
    due_date_jalali = serializers.SerializerMethodField()
    fixed_date_jalali = serializers.SerializerMethodField()
    verified_date_jalali = serializers.SerializerMethodField()
    next_statuses = serializers.SerializerMethodField()
    overdue = serializers.SerializerMethodField()

    class Meta:
        model = PunchItem
        fields = [
            'id', 'project', 'project_code', 'wbs', 'wbs_name', 'ncr', 'ncr_number', 'number',
            'location', 'discipline', 'description', 'priority', 'priority_display', 'status',
            'status_display', 'next_statuses', 'responsible', 'responsible_full_name',
            'responsible_name', 'reported_date', 'reported_date_jalali', 'due_date',
            'due_date_jalali', 'fixed_date', 'fixed_date_jalali', 'verified_date',
            'verified_date_jalali', 'verified_by_name', 'cost', 'note', 'overdue', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at', 'fixed_date', 'verified_date']

    def get_reported_date_jalali(self, obj):
        return jalali_full(obj.reported_date)

    def get_due_date_jalali(self, obj):
        return jalali_full(obj.due_date)

    def get_fixed_date_jalali(self, obj):
        return jalali_full(obj.fixed_date)

    def get_verified_date_jalali(self, obj):
        return jalali_full(obj.verified_date)

    def get_next_statuses(self, obj):
        return punch_next_statuses(obj.status)

    def get_overdue(self, obj):
        return obj.status not in ('verified', 'rejected') and is_overdue(obj.due_date, timezone.localdate())


class HSEIncidentSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    incident_type_display = serializers.CharField(source='get_incident_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    project_code = serializers.CharField(source='project.code', read_only=True)
    wbs_name = serializers.CharField(source='wbs.name', read_only=True)
    date_jalali = serializers.SerializerMethodField()
    closed_date_jalali = serializers.SerializerMethodField()
    next_statuses = serializers.SerializerMethodField()
    is_lti = serializers.SerializerMethodField()

    class Meta:
        model = HSEIncident
        fields = [
            'id', 'project', 'project_code', 'wbs', 'wbs_name', 'number', 'title',
            'incident_type', 'incident_type_display', 'severity', 'severity_display', 'status',
            'status_display', 'next_statuses', 'date', 'date_jalali', 'time', 'location',
            'description', 'involved_persons', 'lost_days', 'man_hours', 'root_cause',
            'corrective_action', 'preventive_action', 'reported_by_name', 'closed_date',
            'closed_date_jalali', 'cost_impact', 'note', 'is_lti', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at', 'closed_date']

    def get_date_jalali(self, obj):
        return jalali_full(obj.date)

    def get_closed_date_jalali(self, obj):
        return jalali_full(obj.closed_date)

    def get_next_statuses(self, obj):
        return hse_next_statuses(obj.status)

    def get_is_lti(self, obj):
        return obj.incident_type == HSEIncident.IncidentType.LOST_TIME
