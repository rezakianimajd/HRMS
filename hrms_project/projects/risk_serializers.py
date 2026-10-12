"""سریالایزرهای رجیستر ریسک (فاز ۳)."""
from rest_framework import serializers

from projects.jalali_utils import jalali_full
from projects.risk_engine import LEVEL_COLORS, LEVEL_LABELS, is_overdue, reduction_percent
from projects.risk_models import Risk, RiskAction, RiskCategory, RiskReview
from projects.risk_service import action_next_statuses, next_statuses


class RiskCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskCategory
        fields = ['id', 'name', 'code', 'discipline', 'description', 'is_active']
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class RiskActionSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    risk = serializers.PrimaryKeyRelatedField(queryset=Risk.objects.all(), required=False)
    risk_number = serializers.CharField(source='risk.number', read_only=True)
    owner_full_name = serializers.CharField(source='owner.full_name', read_only=True)
    due_date_jalali = serializers.SerializerMethodField()
    start_date_jalali = serializers.SerializerMethodField()
    completed_at_jalali = serializers.SerializerMethodField()
    overdue = serializers.SerializerMethodField()
    next_statuses = serializers.SerializerMethodField()

    class Meta:
        model = RiskAction
        fields = [
            'id', 'risk', 'risk_number', 'title', 'description', 'owner', 'owner_full_name',
            'owner_name', 'start_date', 'start_date_jalali', 'due_date', 'due_date_jalali',
            'completed_at', 'completed_at_jalali', 'status', 'status_display', 'overdue',
            'cost', 'sort_order', 'next_statuses', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at', 'completed_at']

    def get_due_date_jalali(self, obj):
        return jalali_full(obj.due_date)

    def get_start_date_jalali(self, obj):
        return jalali_full(obj.start_date)

    def get_completed_at_jalali(self, obj):
        return jalali_full(obj.completed_at)

    def get_overdue(self, obj):
        from django.utils import timezone

        return obj.status not in ('done', 'cancelled') and is_overdue(obj.due_date, timezone.localdate())

    def get_next_statuses(self, obj):
        return action_next_statuses(obj.status)


class RiskReviewSerializer(serializers.ModelSerializer):
    date_jalali = serializers.SerializerMethodField()
    next_review_date_jalali = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    level = serializers.SerializerMethodField()

    class Meta:
        model = RiskReview
        fields = [
            'id', 'risk', 'date', 'date_jalali', 'reviewer', 'reviewer_name',
            'probability', 'impact', 'score', 'level', 'residual_score', 'status',
            'status_display', 'note', 'next_review_date', 'next_review_date_jalali',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def get_date_jalali(self, obj):
        return jalali_full(obj.date)

    def get_next_review_date_jalali(self, obj):
        return jalali_full(obj.next_review_date)

    def get_status_display(self, obj):
        return dict(Risk.Status.choices).get(obj.status, obj.status)

    def get_level(self, obj):
        from projects.risk_engine import level_of

        return level_of(obj.score)


class RiskSerializer(serializers.ModelSerializer):
    actions = RiskActionSerializer(many=True, required=False)
    reviews = RiskReviewSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    risk_type_display = serializers.CharField(source='get_risk_type_display', read_only=True)
    response_display = serializers.CharField(source='get_response_strategy_display', read_only=True)
    level_display = serializers.SerializerMethodField()
    level_color = serializers.SerializerMethodField()
    next_statuses = serializers.SerializerMethodField()
    project_code = serializers.CharField(source='project.code', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    wbs_name = serializers.CharField(source='wbs.name', read_only=True)
    activity_code = serializers.CharField(source='activity.code', read_only=True)
    owner_full_name = serializers.CharField(source='owner.full_name', read_only=True)
    identified_date_jalali = serializers.SerializerMethodField()
    due_date_jalali = serializers.SerializerMethodField()
    review_date_jalali = serializers.SerializerMethodField()
    closed_date_jalali = serializers.SerializerMethodField()
    score_reduction = serializers.SerializerMethodField()
    overdue = serializers.SerializerMethodField()
    actions_stats = serializers.SerializerMethodField()
    worst_impact = serializers.SerializerMethodField()

    class Meta:
        model = Risk
        fields = [
            'id', 'project', 'project_code', 'category', 'category_name', 'wbs', 'wbs_name',
            'activity', 'activity_code', 'number', 'title', 'description', 'root_cause',
            'trigger', 'risk_type', 'risk_type_display', 'status', 'status_display',
            'response_strategy', 'response_display', 'next_statuses',
            'probability', 'impact_cost', 'impact_time', 'impact_quality', 'impact_hse',
            'worst_impact', 'score', 'level', 'level_display', 'level_color',
            'cost_impact', 'expected_cost', 'schedule_impact_days',
            'residual_probability', 'residual_impact', 'residual_score', 'residual_cost',
            'score_reduction', 'owner', 'owner_full_name', 'owner_name', 'identified_by_name',
            'identified_date', 'identified_date_jalali', 'due_date', 'due_date_jalali',
            'review_date', 'review_date_jalali', 'closed_date', 'closed_date_jalali',
            'overdue', 'mitigation_plan', 'contingency_plan', 'note',
            'actions', 'actions_stats', 'reviews', 'created_at',
        ]
        read_only_fields = [
            'id', 'company', 'created_at', 'updated_at', 'score', 'level',
            'expected_cost', 'residual_score', 'residual_cost', 'closed_date',
        ]

    def get_level_display(self, obj):
        return LEVEL_LABELS.get(obj.level or '', obj.level or '')

    def get_level_color(self, obj):
        return LEVEL_COLORS.get(obj.level or '', '#64748b')

    def get_next_statuses(self, obj):
        return next_statuses(obj.status)

    def get_worst_impact(self, obj):
        from projects.risk_engine import worst_impact

        return worst_impact(obj.impact_cost, obj.impact_time, obj.impact_quality, obj.impact_hse)

    def get_score_reduction(self, obj):
        return reduction_percent(obj.score, obj.residual_score)

    def get_overdue(self, obj):
        from django.utils import timezone

        return obj.status != 'closed' and is_overdue(obj.due_date, timezone.localdate())

    def get_actions_stats(self, obj):
        from projects.risk_engine import action_stats

        return action_stats(list(obj.actions.all()))

    def get_identified_date_jalali(self, obj):
        return jalali_full(obj.identified_date)

    def get_due_date_jalali(self, obj):
        return jalali_full(obj.due_date)

    def get_review_date_jalali(self, obj):
        return jalali_full(obj.review_date)

    def get_closed_date_jalali(self, obj):
        return jalali_full(obj.closed_date)

    def create(self, validated_data):
        actions = validated_data.pop('actions', []) or []
        company = validated_data.get('company')
        risk = Risk.objects.create(**validated_data)
        for index, action in enumerate(actions, start=1):
            action.setdefault('sort_order', index)
            RiskAction.objects.create(company=company, risk=risk, **action)
        from projects.risk_service import recalculate_risk

        recalculate_risk(risk)
        return risk

    def update(self, instance, validated_data):
        actions = validated_data.pop('actions', None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        from projects.risk_service import recalculate_risk

        recalculate_risk(instance, save=False)
        instance.save()
        if actions is not None:
            instance.actions.all().delete()
            for index, action in enumerate(actions, start=1):
                action.setdefault('sort_order', index)
                RiskAction.objects.create(company=instance.company, risk=instance, **action)
        return instance
