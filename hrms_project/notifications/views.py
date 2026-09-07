"""Views for the Notification Center module."""
from datetime import datetime

from django.utils import timezone
from rest_framework import status, viewsets, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from notifications.models import Notification
from notifications.serializers import NotificationSerializer


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    List / retrieve notifications for the current user.

    A user sees notifications where:
      * user_id == request.user.id  (direct), OR
      * user_id IS NULL and they are a superuser / HR-typed profile (global)
    """
    serializer_class = NotificationSerializer
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    ordering_fields = ['created_at', 'priority', 'category']
    ordering = ['-created_at']
    search_fields = ['title', 'body']

    def get_queryset(self):
        company = _company(self.request)
        qs = Notification.objects.all()
        if company:
            qs = qs.filter(company=company)

        user = self.request.user
        if user.is_superuser:
            # superuser sees everything in this tenant
            pass
        else:
            # direct + global (user_id IS NULL)
            from core.models.user import UserProfile
            profile = getattr(user, 'profile', None)
            admin_roles = ['super_admin', 'hr_manager', 'hr_specialist']
            is_admin = bool(profile and profile.role in admin_roles)
            if is_admin:
                qs = qs.filter(user_id__isnull=True) | qs.filter(user_id=user.id)
            else:
                qs = qs.filter(user_id=user.id)
            qs = qs.distinct()

        is_read = self.request.query_params.get('is_read')
        if is_read in ('true', 'false'):
            qs = qs.filter(is_read=(is_read == 'true'))

        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)

        return qs

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Return the number of unread notifications for the bell badge."""
        qs = self.get_queryset().filter(is_read=False)
        return Response({'count': qs.count()})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all visible notifications as read."""
        updated = self.get_queryset().filter(is_read=False).update(
            is_read=True, read_at=timezone.now(),
        )
        return Response({'updated': updated})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        obj = self.get_object()
        if not obj.is_read:
            obj.is_read = True
            obj.read_at = timezone.now()
            obj.save(update_fields=['is_read', 'read_at', 'updated_at'])
        return Response(NotificationSerializer(obj).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sync_now_view(request):
    """Trigger an on-demand notification sync for the current tenant."""
    company = _company(request)
    if not company:
        return Response({'error': 'شرکت فعالی انتخاب نشده است.'}, status=400)

    from notifications.sync_service import sync_for_company

    if request.user.is_superuser or getattr(getattr(request.user, 'profile', None), 'is_hr_manager', False):
        result = sync_for_company(company)
        return Response({'message': 'همگام‌سازی اعلان‌ها انجام شد.', **result})

    return Response({'error': 'دسترسی غیرمجاز'}, status=403)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_now_view(request):
    """Send a custom message through Email and/or Bale (admin only).

    Body: {
      'channel': 'email' | 'bale' | 'both',
      'subject': '...',      # used for email subject
      'text': '...'          # message body (Bale text / email body)
    }
    """
    company = _company(request)
    if not company:
        return Response({'error': 'شرکت فعالی انتخاب نشده است.'}, status=400)

    if not (request.user.is_superuser or getattr(getattr(request.user, 'profile', None), 'is_hr_manager', False)):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    channel = (request.data.get('channel') or 'both').lower()
    subject = (request.data.get('subject') or 'پیام مدیریتی').strip()
    text = (request.data.get('text') or '').strip()

    if not text:
        return Response({'error': 'متن پیام الزامی است.'}, status=400)

    from notifications.channels import _company_settings, send_email, send_bale

    email_enabled, bale_enabled, bale_token, bale_chat_id = _company_settings(company)
    results = {}

    if channel in ('email', 'both'):
        from notifications.sync_service import _admin_emails
        results['email'] = send_email(_admin_emails(company), subject, text)

    if channel in ('bale', 'both'):
        results['bale'] = send_bale(bale_token, bale_chat_id, f'{subject}\n\n{text}')

    return Response({'message': 'پیام ارسال شد.', 'results': results})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_send_view(request):
    """Send a test message over Email and/or Bale (admin only).

    Body: { 'channel': 'email' | 'bale' | 'both' }
    """
    company = _company(request)
    if not company:
        return Response({'error': 'شرکت فعالی انتخاب نشده است.'}, status=400)

    if not (request.user.is_superuser or getattr(getattr(request.user, 'profile', None), 'is_hr_manager', False)):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    channel = (request.data.get('channel') or 'both').lower()
    from notifications.channels import (
        _company_settings, send_email, send_bale,
    )

    email_enabled, bale_enabled, bale_token, bale_chat_id = _company_settings(company)
    results = {}

    if channel in ('email', 'both'):
        # Determine admin emails in the same tenant context
        from notifications.sync_service import _admin_emails
        recipients = _admin_emails(company)
        results['email'] = send_email(
            recipients,
            'HRMS — پیام آزمایشی',
            'این یک پیام آزمایشی از سامانه HRMS است.',
        )

    if channel in ('bale', 'both'):
        results['bale'] = send_bale(
            bale_token, bale_chat_id,
            'HRMS — پیام آزمایشی\nاین یک پیام آزمایشی از سامانه HRMS است.',
        )

    return Response({'message': 'ارسال آزمایشی انجام شد.', 'results': results})
