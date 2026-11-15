"""سریالایزرهای ماژول برنامه‌ریزی شخصی."""
from rest_framework import serializers

from planning import services
from planning.models import Note, PlanningGroup, PlanningShare, Task
from planning.richtext import normalize_checklist, sanitize_html


def _display_name(user):
    if not user:
        return ''
    try:
        return (user.get_full_name() or '').strip() or user.get_username()
    except Exception:  # noqa: BLE001
        return ''


def _items_of(serializer):
    instance = serializer.instance
    if isinstance(instance, (list, tuple)):
        return [item for item in instance if item is not None]
    return [instance] if instance is not None else []


def _prime_shares(serializer, kind):
    """اشتراک‌های صفحهٔ جاری را با **یک** کوئری در context کش می‌کند (رفع N+1).

    ``PlanningShare`` با کلید عمومی (``item_kind``/``item_id``) به آیتم وصل است و
    رابطهٔ معکوس ORM ندارد؛ بنابراین گروه‌بندی در پایتون انجام می‌شود.
    """
    context = serializer.context
    cache = context.setdefault('_shares_cache', {})
    if cache.get('__primed__'):
        return cache
    cache['__primed__'] = True
    grouped: dict = {}
    ids = [getattr(item, 'pk', None) for item in _items_of(serializer)]
    ids = [pk for pk in ids if pk]
    if ids:
        rows = PlanningShare.objects.filter(
            item_kind=kind, item_id__in=ids,
        ).select_related('shared_with').order_by('id')
        for share in rows:
            grouped.setdefault(share.item_id, []).append(share)
    cache['by_item'] = grouped
    return cache


def _shares_of(serializer, obj, kind):
    if obj is None:
        return []
    return _prime_shares(serializer, kind)['by_item'].get(obj.pk, [])


def _access_for(serializer, obj, kind):
    request = serializer.context.get('request')
    user = getattr(request, 'user', None)
    if not user or not getattr(user, 'is_authenticated', False) or obj is None:
        return None
    if getattr(user, 'is_superuser', False) or obj.owner_id == getattr(user, 'pk', None):
        return 'owner'
    for share in _shares_of(serializer, obj, kind):
        if share.shared_with_id == getattr(user, 'pk', None):
            return share.permission
    return None


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


class PlanningGroupSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()

    class Meta:
        model = PlanningGroup
        fields = ['id', 'name', 'description', 'color', 'member_count', 'members', 'created_at']
        read_only_fields = ['id', 'member_count', 'members', 'created_at']

    def _members(self, obj):
        """اعضا از prefetch (بدون کوئری هر گروه خوانده می‌شوند)."""
        cache = self.context.setdefault('_group_members', {})
        if obj.pk in cache:
            return cache[obj.pk]
        rows = []
        for member in obj.member_rows.all():
            user = member.user
            rows.append({'id': member.user_id, 'name': _display_name(user)})
        cache[obj.pk] = rows
        return rows

    def get_member_count(self, obj):
        return len(self._members(obj))

    def get_members(self, obj):
        return self._members(obj)


class NoteSerializer(serializers.ModelSerializer):
    body = serializers.CharField(required=False, allow_blank=True, trim_whitespace=False)
    owner_name = serializers.SerializerMethodField()
    shares = serializers.SerializerMethodField()
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

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['body'] = services.decrypt_text(instance.body)
        return data

    def get_owner_name(self, obj):
        return _display_name(obj.owner)

    def get_shares(self, obj):
        rows = _shares_of(self, obj, PlanningShare.ItemKind.NOTE)
        return PlanningShareSerializer(rows, many=True).data

    def get_access(self, obj):
        return _access_for(self, obj, PlanningShare.ItemKind.NOTE)

    def get_is_mine(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        return bool(user and obj.owner_id == user.pk)

    def create(self, validated_data):
        validated_data['body'] = services.encrypt_text(
            sanitize_html(validated_data.get('body', '')),
        )
        if 'checklist' in validated_data:
            validated_data['checklist'] = normalize_checklist(validated_data.get('checklist'))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'body' in validated_data:
            validated_data['body'] = services.encrypt_text(
                sanitize_html(validated_data.get('body') or ''),
            )
        if 'checklist' in validated_data:
            validated_data['checklist'] = normalize_checklist(validated_data.get('checklist'))
        return super().update(instance, validated_data)


class TaskSerializer(serializers.ModelSerializer):
    description = serializers.CharField(required=False, allow_blank=True, trim_whitespace=False)
    owner_name = serializers.SerializerMethodField()
    shares = serializers.SerializerMethodField()
    access = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    assignees = serializers.SerializerMethodField()
    assignee_groups = serializers.SerializerMethodField()
    is_private = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'status', 'status_display', 'priority',
            'priority_display', 'due_date', 'due_time', 'reminder_at', 'completed_at',
            'checklist', 'tags', 'is_pinned', 'is_shared', 'is_overdue',
            'related_module', 'related_object_type', 'related_object_id', 'related_label',
            'source_message', 'owner', 'owner_name', 'shares', 'access', 'is_mine',
            'assignees', 'assignee_groups', 'is_private',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'owner', 'owner_name', 'shares', 'access', 'is_mine',
                            'is_shared', 'is_overdue', 'completed_at', 'created_at',
                            'updated_at', 'status_display', 'priority_display',
                            'assignees', 'assignee_groups', 'is_private']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['description'] = services.decrypt_text(instance.description)
        return data

    def get_owner_name(self, obj):
        return _display_name(obj.owner)

    def get_shares(self, obj):
        rows = _shares_of(self, obj, PlanningShare.ItemKind.TASK)
        return PlanningShareSerializer(rows, many=True).data

    def get_access(self, obj):
        return _access_for(self, obj, PlanningShare.ItemKind.TASK)

    def get_is_mine(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        return bool(user and obj.owner_id == user.pk)

    def get_assignees(self, obj):
        """مسئولان از کش اشتراک‌های صفحه خوانده می‌شوند (بدون کوئری هر ردیف)."""
        cache = self.context.setdefault('_assignee_cache', {})
        if obj.pk in cache:
            return cache[obj.pk]
        rows = [
            {'id': share.shared_with_id, 'name': _display_name(share.shared_with)}
            for share in _shares_of(self, obj, PlanningShare.ItemKind.TASK)
            if share.role == PlanningShare.Role.ASSIGNEE and share.shared_with_id
        ]
        cache[obj.pk] = rows
        return rows

    def get_assignee_groups(self, obj):
        return services.assignee_groups(obj)

    def get_is_private(self, obj):
        return not (obj.is_shared or self.get_assignees(obj))

    def create(self, validated_data):
        validated_data['description'] = services.encrypt_text(
            validated_data.get('description', ''),
        )
        if 'checklist' in validated_data:
            validated_data['checklist'] = normalize_checklist(validated_data.get('checklist'))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'description' in validated_data:
            validated_data['description'] = services.encrypt_text(
                validated_data.get('description') or '',
            )
        if 'checklist' in validated_data:
            validated_data['checklist'] = normalize_checklist(validated_data.get('checklist'))
        return super().update(instance, validated_data)
