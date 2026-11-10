"""سریالایزرهای ماژول گفتگوی سازمانی."""
from django.db.models import Count, OuterRef, Subquery
from rest_framework import serializers

from communication import crypto, permissions
from communication.models import (
    ChatAuditLog, Conversation, ConversationMember, Message, MessageAttachment,
    MessageEntityRef, MessageReceipt,
)


def _user_name(user):
    if not user:
        return ''
    try:
        return (user.get_full_name() or '').strip() or user.get_username()
    except Exception:  # noqa: BLE001
        return ''


class ConversationMemberSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    notify_display = serializers.CharField(source='get_notify_display', read_only=True)

    class Meta:
        model = ConversationMember
        fields = [
            'id', 'user', 'user_name', 'role', 'role_display', 'notify', 'notify_display',
            'joined_at', 'last_read_message', 'last_read_at', 'is_pinned', 'is_archived',
        ]
        read_only_fields = ['id', 'joined_at', 'user_name', 'role_display', 'notify_display']

    def get_user_name(self, obj):
        return _user_name(obj.user)


class MessageAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)

    class Meta:
        model = MessageAttachment
        fields = [
            'id', 'title', 'original_name', 'file_name', 'mime_type', 'size', 'kind',
            'kind_display', 'file_url', 'document',
        ]
        read_only_fields = fields

    def get_file_name(self, obj):
        if obj.original_name:
            return obj.original_name
        if obj.document_id:
            version = getattr(obj.document, 'current_version', None)
            return getattr(version, 'original_name', '') or obj.document.title
        return ''

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.document_id:
            path = f'/api/document-management/documents/{obj.document_id}/content/'
        elif obj.file:
            path = f'/api/chat/attachments/{obj.pk}/download/'
        else:
            return ''
        return request.build_absolute_uri(path) if request else path


class MessageEntityRefSerializer(serializers.ModelSerializer):
    is_accessible = serializers.SerializerMethodField()

    class Meta:
        model = MessageEntityRef
        fields = ['id', 'module', 'object_type', 'object_id', 'label', 'url', 'is_accessible']
        read_only_fields = fields

    def get_is_accessible(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        return permissions.can_read_module(user, obj.module)


class MessageSerializer(serializers.ModelSerializer):
    body = serializers.SerializerMethodField()
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    attachments = MessageAttachmentSerializer(many=True, read_only=True)
    entity_refs = MessageEntityRefSerializer(many=True, read_only=True)
    mentions = serializers.SerializerMethodField()
    reply_to_preview = serializers.SerializerMethodField()
    reply_to_sender = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()
    read_count = serializers.SerializerMethodField()
    delivered_count = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    read_by = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender', 'sender_name', 'kind', 'kind_display',
            'body', 'reply_to', 'reply_to_preview', 'reply_to_sender', 'thread_root',
            'edited_at', 'deleted_at', 'is_pinned', 'metadata',
            'attachments', 'entity_refs', 'mentions', 'is_mine',
            'read_count', 'delivered_count', 'member_count', 'read_by', 'created_at',
        ]
        read_only_fields = fields

    def get_body(self, obj):
        if obj.deleted_at:
            return ''
        return crypto.decrypt_body(obj.body)

    def get_mentions(self, obj):
        return [
            {'id': mention.user_id, 'name': _user_name(mention.user)}
            for mention in obj.mentions.all() if mention.user_id
        ]

    def get_reply_to_preview(self, obj):
        if not obj.reply_to_id or not obj.reply_to:
            return ''
        return crypto.preview_of(crypto.decrypt_body(obj.reply_to.body), 90)

    def get_reply_to_sender(self, obj):
        return getattr(obj.reply_to, 'sender_name', '') if obj.reply_to_id else ''

    def get_is_mine(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        return bool(user and obj.sender_id and obj.sender_id == user.pk)

    def _receipt_rows(self, obj):
        cache = self.context.setdefault('_receipt_cache', {})
        if obj.pk not in cache:
            cache[obj.pk] = list(MessageReceipt.objects.filter(message=obj).values(
                'user', 'read_at', 'delivered_at',
            ))
        return cache[obj.pk]

    def get_read_count(self, obj):
        return sum(1 for row in self._receipt_rows(obj) if row['read_at'])

    def get_delivered_count(self, obj):
        return sum(1 for row in self._receipt_rows(obj) if row['delivered_at'])

    def get_member_count(self, obj):
        return int(getattr(obj.conversation, 'member_count', 0) or 0)

    def get_read_by(self, obj):
        if not obj.sender_id:
            return []
        return [
            {'user': row['user'], 'at': row['read_at']}
            for row in self._receipt_rows(obj) if row['read_at']
        ]



class ConversationSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    members = ConversationMemberSerializer(many=True, read_only=True)
    can_post = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'kind', 'kind_display', 'title', 'description', 'color', 'icon',
            'is_public', 'post_policy', 'status', 'related_module', 'related_object_type',
            'related_object_id', 'related_label', 'created_by', 'last_message_at',
            'message_count', 'created_at', 'last_message', 'unread_count', 'member_count',
            'members', 'can_post',
        ]
        read_only_fields = fields

    def get_last_message(self, obj):
        body = getattr(obj, 'last_body', None)
        if body is None:
            return None
        return {
            'preview': crypto.preview_of(crypto.decrypt_body(body), 90),
            'sender': getattr(obj, 'last_sender_name', '') or '',
            'at': obj.last_message_at,
        }

    def get_unread_count(self, obj):
        return int(getattr(obj, 'unread_count', 0) or 0)

    def get_member_count(self, obj):
        annotated = getattr(obj, 'member_count', None)
        if annotated is not None:
            return int(annotated)
        return obj.members.count()

    def get_can_post(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        return permissions.can_post(user, obj) if user else False

    def to_representation(self, instance):
        """در گفتگوی خصوصی، عنوان = نام طرف مقابل (چون عنوان ذخیره نمی‌شود)."""
        data = super().to_representation(instance)
        data['is_direct'] = instance.kind == Conversation.Kind.DIRECT
        if not data['is_direct']:
            return data
        request = self.context.get('request')
        current_id = getattr(getattr(request, 'user', None), 'pk', None)
        names = []
        for member in data.get('members') or []:
            if current_id and str(member.get('user')) == str(current_id):
                continue
            name = (member.get('user_name') or '').strip()
            if name:
                names.append(name)
        if not (data.get('title') or '').strip():
            data['title'] = '، '.join(names) or 'گفتگوی خصوصی'
        data['peer_names'] = names
        return data


class ChatAuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = ChatAuditLog
        fields = ['id', 'conversation', 'message', 'actor', 'actor_name', 'action',
                  'action_display', 'metadata', 'created_at']
        read_only_fields = fields

    def get_actor_name(self, obj):
        return _user_name(obj.actor)


def conversations_with_stats(user):
    """QuerySet گفتگوها با شمارنده‌های سبک (بدون N+1) و ترتیب پایدار صفحه‌بندی."""
    last_message = Message.objects.filter(conversation=OuterRef('pk')).order_by('-id')
    return (
        permissions.visible_conversations(user)
        .annotate(
            member_count=Count('members', distinct=True),
            last_body=Subquery(last_message.values('body')[:1]),
            last_sender_name=Subquery(last_message.values('sender_name')[:1]),
        )
        .order_by('-last_message_at', '-created_at', '-id')
    )

