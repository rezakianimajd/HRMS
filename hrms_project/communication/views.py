"""API ماژول «گفتگوی سازمانی»."""
from __future__ import annotations

import json

from django.db.models import Count, Q
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from communication import crypto, permissions as chat_permissions, services
from communication.models import (
    ChatAuditLog, ChatEvent, Conversation, ConversationMember, Message,
    MessageAttachment,
)
from communication.serializers import (
    ChatAuditLogSerializer, ConversationMemberSerializer, ConversationSerializer,
    MessageSerializer, conversations_with_stats,
)


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


def _json_list(value):
    """پارس فهرست JSON یا رشتهٔ کاماشده (فرم‌های multipart)."""
    if value in (None, '', 'null'):
        return []
    if isinstance(value, (list, tuple)):
        return list(value)
    text = str(value).strip()
    if text.startswith('['):
        try:
            parsed = json.loads(text)
            return parsed if isinstance(parsed, list) else []
        except ValueError:
            return []
    return [part for part in text.split(',') if part.strip()]


class ConversationViewSet(viewsets.ModelViewSet):
    """گفتگوها: فهرست، ساخت گروه/کانال، جزئیات، اعضا، خواندن و آرشیو."""

    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'description', 'related_label']

    def get_queryset(self):
        user = self.request.user
        qs = (
            conversations_with_stats(user)
            .select_related('created_by')
            .prefetch_related('members__user')
        )
        params = self.request.query_params
        kind = params.get('kind')
        if kind:
            qs = qs.filter(kind=kind)
        if params.get('related_module'):
            qs = qs.filter(related_module=params['related_module'])
        if params.get('related_object_id'):
            qs = qs.filter(related_object_id=str(params['related_object_id']))
        if params.get('archived') in ('1', 'true'):
            qs = qs.filter(members__user=user, members__is_archived=True)
        else:
            qs = qs.exclude(members__user=user, members__is_archived=True)
        return qs.distinct()

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        rows = response.data.get('results') if isinstance(response.data, dict) else response.data
        ids = [row['id'] for row in rows or [] if row.get('id')]
        if ids:
            members = {
                member.conversation_id: member
                for member in ConversationMember.objects.filter(
                    user=request.user, conversation_id__in=ids,
                )
            }
            for row in rows:
                member = members.get(row['id'])
                row['unread_count'] = (
                    services.unread_count_by_id(row['id'], member) if member else 0
                )
                row['membership'] = (
                    ConversationMemberSerializer(member).data if member else None
                )
        return response

    def create(self, request, *args, **kwargs):
        """ساخت گفتگو: خصوصی (با ``user``) یا گروه/کانال (با ``title`` و ``members``)."""
        data = request.data
        kind = data.get('kind') or Conversation.Kind.GROUP
        if kind == Conversation.Kind.DIRECT:
            from django.contrib.auth import get_user_model

            target_id = data.get('user') or data.get('user_id')
            if not target_id or not str(target_id).isdigit():
                raise ValidationError({'user': 'برای گفتگوی خصوصی یک کاربر را انتخاب کنید.'})
            other = get_user_model().objects.filter(pk=int(target_id), is_active=True).first()
            if not other:
                raise ValidationError({'user': 'کاربر انتخاب‌شده یافت نشد.'})
            if str(other.pk) == str(request.user.pk):
                raise ValidationError({'user': 'گفتگوی خصوصی با خودتان ممکن نیست.'})
            conversation, created = services.get_or_create_direct(
                _company(request), request.user, other,
            )
            payload = self.get_serializer(conversation).data
            return Response(
                payload,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
            )

        conversation = services.create_conversation(
            _company(request), request.user, kind=kind, title=data.get('title', ''),
            member_ids=_json_list(data.get('members')),
            description=data.get('description', ''),
            related_module=data.get('related_module', ''),
            related_object_type=data.get('related_object_type', ''),
            related_object_id=data.get('related_object_id', ''),
            related_label=data.get('related_label', ''),
            color=data.get('color', ''), icon=data.get('icon', ''),
            is_public=str(data.get('is_public', '')).lower() in ('1', 'true', 'yes'),
            post_policy=data.get('post_policy') or Conversation.PostPolicy.MEMBERS,
        )
        return Response(
            self.get_serializer(conversation).data,
            status=status.HTTP_201_CREATED,
        )

    # ------------------------------------------------------------------ #
    # پیام‌ها
    # ------------------------------------------------------------------ #
    @action(detail=True, methods=['get', 'post'], url_path='messages')
    def messages(self, request, pk=None):
        conversation = self.get_object()
        chat_permissions.ensure_view(request.user, conversation)
        if request.method == 'POST':
            return self._send_message(request, conversation)
        return self._list_messages(request, conversation)

    def _list_messages(self, request, conversation):
        params = request.query_params
        try:
            limit = min(max(int(params.get('limit') or 40), 1), 100)
        except (TypeError, ValueError):
            limit = 40
        qs = (
            Message.objects.filter(conversation=conversation)
            .select_related('sender', 'reply_to')
            .prefetch_related('attachments__document', 'entity_refs', 'mentions__user')
            .order_by('-id')
        )
        before = params.get('before')
        if before and str(before).isdigit():
            qs = qs.filter(id__lt=int(before))
        search = (params.get('search') or '').strip()
        if search:
            for digest in crypto.query_digests(search):
                qs = qs.filter(search_tokens__contains=digest)
        rows = list(qs[:limit])
        conversation.member_count = conversation.members.count()
        serializer = MessageSerializer(
            rows, many=True,
            context={**self.get_serializer_context(), 'request': request},
        )
        return Response({
            'results': serializer.data,
            'has_more': len(rows) == limit,
            'member_count': conversation.member_count,
        })

    def _send_message(self, request, conversation):
        data = request.data
        body = data.get('body', '')
        reply_to_id = data.get('reply_to')
        reply_to = None
        if reply_to_id and str(reply_to_id).isdigit():
            reply_to = Message.objects.filter(
                pk=int(reply_to_id), conversation=conversation,
            ).first()
        uploads = [{'upload': upload} for upload in request.FILES.getlist('files')]
        document_ids = _json_list(data.get('documents'))
        attachments = uploads + [{'document': doc_id} for doc_id in document_ids]
        entity_refs = _json_list(data.get('entity_refs'))
        mentions = _json_list(data.get('mentions'))
        try:
            message = services.post_message(
                _company(request), conversation, request.user, body,
                reply_to=reply_to, mentions=mentions, entity_refs=entity_refs,
                attachments=attachments,
            )
        except ValueError as error:
            raise ValidationError({'body': str(error)}) from error
        except PermissionError as error:
            raise PermissionDenied(str(error)) from error
        services.mark_read(conversation, request.user, message)
        conversation.member_count = conversation.members.count()
        serializer = MessageSerializer(
            message, context={**self.get_serializer_context(), 'request': request},
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


    # ------------------------------------------------------------------ #
    # اعضا / خواندن / آرشیو
    # ------------------------------------------------------------------ #
    @action(detail=True, methods=['get', 'post'], url_path='members')
    def members(self, request, pk=None):
        conversation = self.get_object()
        chat_permissions.ensure_view(request.user, conversation)
        if request.method == 'GET':
            rows = conversation.members.select_related('user').all()
            return Response(ConversationMemberSerializer(rows, many=True).data)
        chat_permissions.can_manage_members(request.user, conversation) or _deny(
            'فقط مدیر گفتگو می‌تواند عضو اضافه کند.',
        )
        added = services.add_members(
            _company(request), conversation, _json_list(request.data.get('users')),
            actor=request.user,
        )
        return Response({'added': [user.pk for user in added]}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path=r'members/(?P<user_id>[0-9]+)')
    def remove_member(self, request, pk=None, user_id=None):
        conversation = self.get_object()
        from django.contrib.auth import get_user_model

        member_user = get_object_or_404(get_user_model(), pk=user_id)
        if member_user.pk != request.user.pk:
            chat_permissions.can_manage_members(request.user, conversation) or _deny(
                'فقط مدیر گفتگو می‌تواند عضو حذف کند.',
            )
        services.remove_member(_company(request), conversation, member_user, actor=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='read')
    def read(self, request, pk=None):
        conversation = self.get_object()
        chat_permissions.ensure_view(request.user, conversation)
        message_id = request.data.get('message')
        message = None
        if message_id and str(message_id).isdigit():
            message = Message.objects.filter(pk=int(message_id), conversation=conversation).first()
        member = services.mark_read(conversation, request.user, message)
        return Response({
            'last_read_message': getattr(member, 'last_read_message_id', None),
            'unread': services.unread_count(conversation, member),
        })

    @action(detail=True, methods=['post'], url_path='preferences')
    def preferences(self, request, pk=None):
        """سنجاق/آرشیو/بی‌صدا/سطح اعلان برای کاربر جاری."""
        conversation = self.get_object()
        member = ConversationMember.objects.filter(
            conversation=conversation, user=request.user,
        ).first()
        if not member:
            raise PermissionDenied('شما عضو این گفتگو نیستید.')
        data = request.data
        updated = []
        if 'is_pinned' in data:
            member.is_pinned = str(data.get('is_pinned')).lower() in ('1', 'true', 'yes')
            updated.append('is_pinned')
        if 'is_archived' in data:
            member.is_archived = str(data.get('is_archived')).lower() in ('1', 'true', 'yes')
            updated.append('is_archived')
        if data.get('notify') in dict(ConversationMember.Notify.choices):
            member.notify = data['notify']
            updated.append('notify')
        if updated:
            member.save(update_fields=[*updated, 'updated_at'])
        return Response(ConversationMemberSerializer(member).data)

    @action(detail=True, methods=['get'], url_path='audit')
    def audit(self, request, pk=None):
        conversation = self.get_object()
        chat_permissions.ensure_view(request.user, conversation)
        rows = conversation.audit_logs.select_related('actor')[:100]
        return Response(ChatAuditLogSerializer(rows, many=True).data)

    @action(detail=True, methods=['post'], url_path='join')
    def join(self, request, pk=None):
        conversation = self.get_object()
        if not (conversation.is_public and conversation.kind == Conversation.Kind.CHANNEL):
            raise PermissionDenied('این گفتگو عمومی نیست.')
        services.add_members(_company(request), conversation, [], actor=request.user,
                            extra_members=[request.user])
        return Response({'joined': True})

    @action(detail=True, methods=['get'], url_path='pinned')
    def pinned(self, request, pk=None):
        conversation = self.get_object()
        chat_permissions.ensure_view(request.user, conversation)
        rows = Message.objects.filter(
            conversation=conversation, is_pinned=True, deleted_at__isnull=True,
        ).order_by('-id')[:50]
        return Response(MessageSerializer(
            rows, many=True, context={**self.get_serializer_context(), 'request': request},
        ).data)


def _deny(message):
    raise PermissionDenied(message)



class MessageViewSet(viewsets.GenericViewSet):
    """ویرایش/حذف/سنجاق پیام + دانلود پیوست."""

    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer
    queryset = Message.objects.all()

    def get_queryset(self):
        return Message.objects.filter(
            conversation__in=chat_permissions.visible_conversations(self.request.user),
        ).select_related('conversation', 'sender', 'reply_to')

    def partial_update(self, request, pk=None):
        message = get_object_or_404(self.get_queryset(), pk=pk)
        chat_permissions.ensure_view(request.user, message.conversation)
        try:
            message = services.edit_message(message, request.user, request.data.get('body', ''))
        except PermissionError as error:
            raise PermissionDenied(str(error)) from error
        except ValueError as error:
            raise ValidationError({'body': str(error)}) from error
        message.conversation.member_count = message.conversation.members.count()
        return Response(MessageSerializer(
            message, context={**self.get_serializer_context(), 'request': request},
        ).data)

    def destroy(self, request, pk=None):
        message = get_object_or_404(self.get_queryset(), pk=pk)
        chat_permissions.ensure_view(request.user, message.conversation)
        try:
            services.delete_message(message, request.user)
        except PermissionError as error:
            raise PermissionDenied(str(error)) from error
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='pin')
    def pin(self, request, pk=None):
        message = get_object_or_404(self.get_queryset(), pk=pk)
        chat_permissions.ensure_view(request.user, message.conversation)
        if not chat_permissions.can_post(request.user, message.conversation):
            raise PermissionDenied('اجازهٔ سنجاق‌کردن پیام را ندارید.')
        message.is_pinned = not message.is_pinned
        message.save(update_fields=['is_pinned', 'updated_at'])
        return Response({'is_pinned': message.is_pinned})


class AttachmentViewSet(viewsets.GenericViewSet):
    """دانلود/پیش‌نمایش پیوست چت (با بررسی عضویت گفتگو)."""

    permission_classes = [IsAuthenticated]
    queryset = MessageAttachment.objects.all()

    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, pk=None):
        attachment = get_object_or_404(
            MessageAttachment.objects.select_related('message__conversation', 'document'), pk=pk,
        )
        chat_permissions.ensure_view(request.user, attachment.message.conversation)
        inline = str(request.query_params.get('inline', '')).lower() in ('1', 'true', 'yes')
        if attachment.document_id:
            from documents.management_views import ManagedDocumentViewSet  # noqa: F401

            version = getattr(attachment.document, 'current_version', None)
            if not version or not version.file:
                raise Http404('فایل سند یافت نشد.')
            handle = version.file.open('rb')
            file_name = version.original_name or 'document'
            content_type = version.mime_type or 'application/octet-stream'
            response = FileResponse(handle, as_attachment=not inline, filename=file_name)
            response['Content-Type'] = content_type
            response['X-Content-Type-Options'] = 'nosniff'
            return response
        if not attachment.file:
            raise Http404('فایل پیوست یافت نشد.')
        try:
            handle = attachment.file.open('rb')
        except Exception as error:  # noqa: BLE001
            raise Http404('فایل روی سرور یافت نشد.') from error
        file_name = attachment.original_name or attachment.file.name.rsplit('/', 1)[-1]
        inline = inline and attachment.kind in ('image', 'pdf')
        response = FileResponse(handle, as_attachment=not inline, filename=file_name)
        response['Content-Type'] = attachment.mime_type or 'application/octet-stream'
        response['X-Content-Type-Options'] = 'nosniff'
        response['Cache-Control'] = 'private, max-age=600'
        response['X-Frame-Options'] = 'SAMEORIGIN'
        return response



class ChatUtilityAPIView(APIView):
    """زیرساخت مشترک نماهای کمکی چت."""

    permission_classes = [IsAuthenticated]

    def _company(self):
        return _company(self.request)


class EventsAPIView(ChatUtilityAPIView):
    """رویدادهای چت برای Real-time سبک (Polling؛ بعداً WebSocket)."""

    def get(self, request):
        since = request.query_params.get('since') or '0'
        try:
            since_id = int(since)
        except (TypeError, ValueError):
            since_id = 0
        memberships = ConversationMember.objects.filter(user=request.user).values_list(
            'conversation_id', flat=True,
        )
        qs = ChatEvent.objects.filter(
            id__gt=since_id,
        ).filter(
            Q(conversation_id__in=list(memberships)) | Q(conversation_id__isnull=True)
        ).order_by('id')[:200]
        rows = []
        for event in qs:
            if event.audience and request.user.pk not in event.audience:
                continue
            rows.append({
                'id': event.id,
                'type': event.event_type,
                'conversation': event.conversation_id,
                'payload': event.payload,
                'at': event.created_at.isoformat(),
            })
        return Response({'results': rows, 'last': rows[-1]['id'] if rows else since_id})


class UnreadAPIView(ChatUtilityAPIView):
    """نشان‌های سایدبار: چت خوانده‌نشده + منشن."""

    def get(self, request):
        summary = services.unread_summary(request.user)
        try:
            from planning.services import upcoming_summary

            summary.update(upcoming_summary(request.user))
        except Exception:  # noqa: BLE001 — ماژول برنامه‌ریزی اختیاری است
            summary.setdefault('planning', 0)
        return Response(summary)


class DirectoryAPIView(ChatUtilityAPIView):
    """فهرست سبک کاربران برای انتخاب عضو/منشن."""

    def get(self, request):
        from django.contrib.auth import get_user_model
        from django.db.models import Q as DbQ

        query = (request.query_params.get('q') or '').strip()
        users = get_user_model().objects.filter(is_active=True)
        if query:
            users = users.filter(
                DbQ(first_name__icontains=query) | DbQ(last_name__icontains=query)
                | DbQ(username__icontains=query),
            )
        rows = []
        for user in users.order_by('first_name', 'last_name')[:50]:
            rows.append({
                'id': user.pk,
                'name': (user.get_full_name() or '').strip() or user.get_username(),
                'username': user.get_username(),
            })
        return Response(rows)


class SearchAPIView(ChatUtilityAPIView):
    """جست‌وجوی پیام‌ها در گفتگوهای مجاز کاربر."""

    def get(self, request):
        query = (request.query_params.get('q') or '').strip()
        if not query:
            return Response([])
        rows = services.search_messages(request.user, query, limit=30)
        conversation_ids = {row.conversation_id for row in rows}
        conversations = {
            conversation.pk: conversation.title
            for conversation in Conversation.objects.filter(pk__in=conversation_ids)
        }
        payload = []
        for row in rows:
            payload.append({
                'id': row.pk,
                'conversation': row.conversation_id,
                'conversation_title': conversations.get(row.conversation_id, ''),
                'sender_name': row.sender_name,
                'preview': crypto.preview_of(crypto.decrypt_body(row.body), 140),
                'created_at': row.created_at.isoformat(),
            })
        return Response(payload)

