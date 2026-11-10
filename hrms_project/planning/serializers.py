"""سریالایزرهای ماژول برنامه‌ریزی شخصی."""
from rest_framework import serializers

from planning import services
from planning.models import Note, PlanningShare, Task


def _display_name(user):
    if not user:
        return ''
    try:
        return (user.get_full_name() or '').strip() or user.get_username()
    except Exception:  # noqa: BLE001
        return ''


class PlanningShareSerializer(serializers.ModelSerializer):
    shared_with_name = serializers.SerializerMethodField()
    permission_display = serializers.CharField(source='get_permission_display', read_only=True)
    item_kind_display = serializers.CharField(source='get_item_kind_display', read_only=True)

    class Meta:
        model = PlanningShare
        fields = [
            'id', 'item_kind', 'item_kind_display', 'item_id', 'shared_by',
            'shared_with', 'shared_with_name', 'permission', 'permission_display',
            'created_at',
        ]
        read_only_fields = ['id', 'shared_by', 'created_at', 'shared_with_name',
                            'permission_display', 'item_kind_display']

    def get_shared_with_name(self, obj):
        return _display_name(obj.shared_with)


class NoteSerializer(serializers.ModelSerializer):
    body = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    shares = PlanningShareSerializer(many=True, read_only=True)
    access = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = [
            'id', 'title', 'body', 'color', 'tags', 'checklist', 'is_pinned',
            'is_shared', 'related_module', 'related_object_type', 'related_object_id',
            'related_label', 'owner', 'owner_name', 'shares', 'access', 'is_mine',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'owner', 'owner_name', 'shares', 'access', 'is_mine',
                            'is_shared', 'created_at', 'updated_at']

    def get_body(self, obj):
        return services.decrypt_text(obj.body)

    def get_owner_name(self, obj):
        return _display_name(obj.owner)

    def get_access(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        return services.permission_for(user, PlanningShare.ItemKind.NOTE, obj.pk)

    def get_is_mine(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        return bool(user and obj.owner_id == user.pk)

    def create(self, validated_data):
        validated_data['body'] = services.encrypt_text(validated_data.get('body', ''))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'body' in validated_data:
            validated_data['body'] = services.encrypt_text(validated_data.get('body') or '')
        return super().update(instance, validated_data)


class TaskSerializer(serializers.ModelSerializer):
    description = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    shares = PlanningShareSerializer(many=True, read_only=True)
    access = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'status', 'status_display', 'priority',
            'priority_display', 'due_date', 'due_time', 'reminder_at', 'completed_at',
            'checklist', 'tags', 'is_pinned', 'is_shared', 'is_overdue',
            'related_module', 'related_object_type', 'related_object_id', 'related_label',
            'source_message', 'owner', 'owner_name', 'shares', 'access', 'is_mine',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'owner', 'owner_name', 'shares', 'access', 'is_mine',
                            'is_shared', 'is_overdue', 'completed_at', 'created_at',
                            'updated_at', 'status_display', 'priority_display']

    def get_description(self, obj):
        return services.decrypt_text(obj.description)

    def get_owner_name(self, obj):
        return _display_name(obj.owner)

    def get_access(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        return services.permission_for(user, PlanningShare.ItemKind.TASK, obj.pk)

    def get_is_mine(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        return bool(user and obj.owner_id == user.pk)

    def create(self, validated_data):
        validated_data['description'] = services.encrypt_text(
            validated_data.get('description', ''),
        )
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'description' in validated_data:
            validated_data['description'] = services.encrypt_text(
                validated_data.get('description') or '',
            )
        return super().update(instance, validated_data)
