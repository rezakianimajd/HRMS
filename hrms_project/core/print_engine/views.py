"""نقاط پایانی موتور چاپ یکپارچه.

- ``POST /api/print/preview/`` → HTML سند آمادهٔ چاپ (بدون ذخیره)
- ``GET  /api/print/options/`` → انواع سند، اندازهٔ کاغذ و جهت چاپ
"""
from django.utils import timezone
from rest_framework import status as http_status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.print_engine import registry
from core.print_engine.layout import PAPERS


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def preview_view(request):
    """رندر سند چاپی (HTML) برای پیش‌نمایش/چاپ در کلاینت."""
    document_key = str(request.data.get('document') or '').strip()
    payload = request.data.get('payload') or {}
    options = request.data.get('options') or {}
    if not isinstance(payload, dict):
        return Response({'detail': 'ساختار payload نامعتبر است.'},
                        status=http_status.HTTP_400_BAD_REQUEST)
    if not isinstance(options, dict):
        options = {}
    payload.setdefault('printed_on', timezone.localdate().isoformat())
    try:
        html = registry.render(document_key, payload, options, request=request)
    except registry.PrintError as error:
        return Response({'detail': error.message}, status=error.status)
    return Response({'document': document_key, 'html': html, 'options': options})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def options_view(request):
    """گزینه‌های موتور چاپ برای رابط کاربری."""
    return Response({
        'documents': registry.available_documents(),
        'papers': [{'key': key, 'label': key} for key in PAPERS],
        'orientations': [
            {'key': 'portrait', 'label': 'عمودی'},
            {'key': 'landscape', 'label': 'افقی'},
        ],
        'columns': registry.column_catalog(),
    })
