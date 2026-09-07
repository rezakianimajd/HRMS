"""Serializers for the Notification module."""
from rest_framework import serializers
from notifications.models import Notification, BaleTemplate


class BaleTemplateSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)

    class Meta:
        model = BaleTemplate
        fields = [
            'id', 'title', 'event_type', 'event_type_display',
            'text', 'is_default', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


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