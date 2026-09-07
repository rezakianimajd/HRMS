"""Serializers for the Notification module."""
from rest_framework import serializers
from notifications.models import Notification, BaleTemplate, BaleSendLog, BaleSchedule


class BaleTemplateSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)

    class Meta:
        model = BaleTemplate
        fields = [
            'id', 'title', 'event_type', 'event_type_display',
            'text', 'is_default', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class BaleSendLogSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    template_title = serializers.CharField(source='template.title', read_only=True)

    class Meta:
        model = BaleSendLog
        fields = [
            'id', 'template', 'template_title', 'subject', 'text',
            'chat_id', 'recipient_name', 'status', 'status_display',
            'error', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class BaleScheduleSerializer(serializers.ModelSerializer):
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    template_title = serializers.CharField(source='template.title', read_only=True)

    class Meta:
        model = BaleSchedule
        fields = [
            'id', 'title', 'template', 'template_title', 'text',
            'frequency', 'frequency_display', 'scheduled_at',
            'chat_ids', 'status', 'status_display', 'last_run_at', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'status', 'last_run_at', 'created_at', 'updated_at']


class NotificationSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'user_id', 'category', 'category_display',
            'priority', 'priority_display', 'title', 'body',
            'entity_type', 'entity_id', 'is_read', 'read_at', 'created_at',
        ]
        read_only_fields = [
            'id', 'user_id', 'category_display', 'priority_display',
            'entity_type', 'entity_id', 'created_at',
        ]