"""Views/API for the Document Management (DMS) module."""
import os
from datetime import date, timedelta

from django.db.models import Count, Q, Sum
from rest_framework import parsers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from documents.models import (
    DocumentActivity, DocumentFolder, DocumentVersion, ManagedDocument,
)
from documents.management_serializers import (
    DocumentActivitySerializer, DocumentFolderSerializer, ManagedDocumentSerializer,
)
from documents.management_storage import (
    get_documents_storage_profile, storage_policy_dict,
)
from documents.management_sync import sync_archive_files


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class DocumentFolderViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentFolderSerializer
    queryset = DocumentFolder.objects.all()
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset().select_related('parent')
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=_company(self.request))


class ManagedDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = ManagedDocumentSerializer
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    queryset = ManagedDocument.objects.all()
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset().select_related(
            'folder', 'current_version', 'created_by', 'updated_by',
        ).prefetch_related('versions')
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        params = self.request.query_params
        folder = params.get('folder')
        if folder:
            qs = qs.filter(folder_id=folder)
        state = params.get('status')
        if state:
            qs = qs.filter(status=state)
        elif params.get('include_archived') not in ('1', 'true', 'yes'):
            qs = qs.exclude(status=ManagedDocument.Status.ARCHIVED)
        confidentiality = params.get('confidentiality')
        if confidentiality:
            qs = qs.filter(confidentiality=confidentiality)
        tag = params.get('tag')
        if tag:
            qs = qs.filter(tags__icontains=tag)
        query = params.get('search') or params.get('q')
        if query:
            qs = qs.filter(
                Q(title__icontains=query)
                | Q(description__icontains=query)
                | Q(tags__icontains=query)
                | Q(reference_number__icontains=query)
                | Q(folder__name__icontains=query)
            )
        ordering = params.get('ordering')
        if ordering in ('title', '-title', 'created_at', '-created_at', 'issue_date', '-issue_date', 'expiry_date', '-expiry_date'):
            qs = qs.order_by(ordering)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=_company(self.request))

    def perform_destroy(self, instance):
        if str(self.request.query_params.get('purge', '')).lower() in ('1', 'true', 'yes'):
            file_paths = []
            for version in instance.versions.all():
                if version.file:
                    try:
                        file_paths.append(version.file.path)
                    except Exception:  # noqa: BLE001
                        pass
            DocumentActivity.objects.create(
                company=instance.company, document=None,
                action=DocumentActivity.Action.DELETE, user=getattr(self.request.user, 'pk', None) and self.request.user,
                details={'title': instance.title, 'id': instance.pk},
            )
            instance.delete()
            for file_path in file_paths:
                if os.path.exists(file_path):
                    os.remove(file_path)
            return
        instance.status = ManagedDocument.Status.ARCHIVED
        instance.save(update_fields=['status', 'updated_at'])
        DocumentActivity.objects.create(
            company=instance.company, document=instance,
            action=DocumentActivity.Action.ARCHIVE, user=getattr(self.request.user, 'pk', None) and self.request.user,
            details={'title': instance.title},
        )

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        document = self.get_object()
        document.status = ManagedDocument.Status.ARCHIVED
        document.save(update_fields=['status', 'updated_at'])
        DocumentActivity.objects.create(
            company=document.company, document=document,
            action=DocumentActivity.Action.ARCHIVE, user=getattr(request.user, 'pk', None) and request.user,
            details={'title': document.title},
        )
        return Response(self.get_serializer(document).data)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        document = self.get_object()
        document.status = ManagedDocument.Status.ACTIVE
        document.save(update_fields=['status', 'updated_at'])
        DocumentActivity.objects.create(
            company=document.company, document=document,
            action=DocumentActivity.Action.RESTORE, user=getattr(request.user, 'pk', None) and request.user,
            details={'title': document.title},
        )
        return Response(self.get_serializer(document).data)

    @action(detail=True, methods=['get', 'post'])
    def versions(self, request, pk=None):
        document = self.get_object()
        if request.method.lower() == 'post':
            upload = request.FILES.get('file')
            if not upload:
                return Response({'file': 'فایل نسخه جدید الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)
            serializer = self.get_serializer(document, data={'file': upload}, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        document.refresh_from_db()
        return Response(self.get_serializer(document).data)

    @action(detail=True, methods=['post'], url_path='restore-version')
    def restore_version(self, request, pk=None):
        document = self.get_object()
        version = document.versions.filter(pk=request.data.get('version')).first()
        if not version:
            return Response({'version': 'نسخه انتخاب‌شده پیدا نشد.'}, status=status.HTTP_404_NOT_FOUND)
        document.current_version = version
        document.save(update_fields=['current_version', 'updated_at'])
        DocumentActivity.objects.create(
            company=document.company, document=document,
            action=DocumentActivity.Action.UPDATE, user=getattr(request.user, 'pk', None) and request.user,
            details={'restored_version': version.version_number, 'file_name': version.original_name},
        )
        return Response(self.get_serializer(document).data)

    @action(detail=True, methods=['post'])
    def download(self, request, pk=None):
        document = self.get_object()
        version = document.current_version
        if not version or not version.file:
            return Response({'detail': 'فایلی برای این سند ثبت نشده است.'}, status=status.HTTP_404_NOT_FOUND)
        DocumentActivity.objects.create(
            company=document.company, document=document,
            action=DocumentActivity.Action.DOWNLOAD, user=getattr(request.user, 'pk', None) and request.user,
            details={'file_name': version.original_name},
        )
        url = request.build_absolute_uri(version.file.url)
        return Response({'url': url, 'file_name': version.original_name})


class DocumentActivityViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DocumentActivitySerializer
    queryset = DocumentActivity.objects.all()

    def get_queryset(self):
        qs = super().get_queryset().select_related('document', 'user')
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        document_id = self.request.query_params.get('document')
        if document_id:
            qs = qs.filter(document_id=document_id)
        action_name = self.request.query_params.get('action')
        if action_name:
            qs = qs.filter(action=action_name)
        return qs


class DocumentManagementStatsAPIView(APIView):
    def get(self, request):
        company = _company(request)
        docs = ManagedDocument.objects.filter(is_active=True)
        if company:
            docs = docs.filter(company=company)

        # اولین بار: فایل‌های موجود در بایگانی ماژول‌ها را در کتابخانه ایندکس کن.
        auto_indexed = 0
        if company and not docs.exists():
            try:
                auto_indexed = sync_archive_files(company).get('created', 0)
                if auto_indexed:
                    docs = ManagedDocument.objects.filter(is_active=True, company=company)
            except Exception:  # noqa: BLE001 — ایندکس خودکار نباید آمار را بشکند
                auto_indexed = 0

        today = date.today()
        storage_qs = DocumentVersion.objects.filter(document__is_active=True)
        if company:
            storage_qs = storage_qs.filter(company=company)
        storage = storage_qs.aggregate(total=Sum('file_size'))['total'] or 0
        storage_policy = storage_policy_dict(get_documents_storage_profile(getattr(company, 'pk', None)))
        live_docs = docs.exclude(status=ManagedDocument.Status.ARCHIVED)
        expiring = live_docs.filter(expiry_date__gte=today, expiry_date__lte=today + timedelta(days=30)).count()
        expired = live_docs.filter(expiry_date__lt=today).count()
        recent_docs = live_docs.select_related('folder', 'current_version', 'created_by').order_by('-created_at')[:6]
        activities = DocumentActivity.objects.select_related('document', 'user')
        if company:
            activities = activities.filter(company=company)
        return Response({
            'total': live_docs.count(),
            'active': docs.filter(status=ManagedDocument.Status.ACTIVE).count(),
            'auto_indexed': auto_indexed,
            'archived': docs.filter(status=ManagedDocument.Status.ARCHIVED).count(),
            'expiring_soon': expiring,
            'expired': expired,
            'storage_bytes': storage,
            'storage_policy': storage_policy,
            'folders': DocumentFolder.objects.filter(company=company, is_active=True).count() if company else DocumentFolder.objects.filter(is_active=True).count(),
            'by_confidentiality': list(
                live_docs.values('confidentiality').annotate(count=Count('id'))
            ),
            'recent_documents': ManagedDocumentSerializer(recent_docs, many=True, context={'request': request}).data,
            'recent_activity': DocumentActivitySerializer(activities[:10], many=True, context={'request': request}).data,
        })


class DocumentManagementSyncAPIView(APIView):
    """همگام‌سازی دستی فایل‌های موجود در بایگانی همهٔ ماژول‌ها."""

    def post(self, request):
        company = _company(request)
        if not company:
            return Response({'error': 'شرکت جاری یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        result = sync_archive_files(company)
        return Response(result)

