"""System-level endpoints: health, version and platform-wide broadcasts."""
import os
import shutil

from django.conf import settings
from django.db import connection
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from core.models import SystemBroadcast
from core.version import version_info
from core.views import _public_schema


@api_view(['GET'])
@permission_classes([AllowAny])
def health_view(request):
    """
    Lightweight liveness/readiness probe.

    Used by nginx/systemd, the updater (post-restart verification) and monitoring.
    Never requires authentication and never touches tenant tables.
    """
    checks = {'database': False, 'media_writable': False, 'disk_free': None}
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            checks['database'] = cursor.fetchone()[0] == 1
    except Exception:  # noqa: BLE001
        checks['database'] = False

    try:
        checks['media_writable'] = bool(settings.MEDIA_ROOT) and os.access(settings.MEDIA_ROOT, os.W_OK)
    except Exception:  # noqa: BLE001
        checks['media_writable'] = False

    try:
        checks['disk_free'] = shutil.disk_usage(settings.MEDIA_ROOT).free
    except Exception:  # noqa: BLE001
        checks['disk_free'] = None

    healthy = bool(checks['database'])
    return Response(
        {**version_info(), 'healthy': healthy, 'checks': checks},
        status=200 if healthy else 503,
    )


@api_view(['GET'])
@permission_classes([AllowAny])
def version_view(request):
    """Current product version — polled by the SPA to detect a new deployment."""
    return Response(version_info())


def _broadcast_payload(broadcast):
    return {
        'id': broadcast.id,
        'title': broadcast.title,
        'message': broadcast.message,
        'level': broadcast.level,
        'action': broadcast.action,
        'starts_at': broadcast.starts_at,
        'expires_at': broadcast.expires_at,
        'created_at': broadcast.created_at,
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@_public_schema
def broadcast_active(request):
    """Active, not-yet-acknowledged platform announcements for the current user."""
    now = timezone.now()
    queryset = (
        SystemBroadcast.objects.filter(is_active=True)
        .exclude(acknowledged_by=request.user)
        .prefetch_related('acknowledged_by')
        .distinct()
    )
    items = [
        _broadcast_payload(item)
        for item in queryset
        if (not item.starts_at or item.starts_at <= now)
        and (not item.expires_at or item.expires_at > now)
    ]
    return Response({'count': len(items), 'items': items})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@_public_schema
def broadcast_ack(request, broadcast_id):
    """Mark one announcement as seen by the current user."""
    broadcast = get_object_or_404(SystemBroadcast, pk=broadcast_id)
    broadcast.acknowledged_by.add(request.user)
    return Response({'acknowledged': True})
