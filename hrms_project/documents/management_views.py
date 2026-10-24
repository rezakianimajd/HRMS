"""Views/API for the Document Management (DMS) module."""
import logging
import os
from datetime import date, timedelta

from django.core.exceptions import PermissionDenied
from django.db.models import Count, Q, Sum
from django.http import FileResponse
from django.utils import timezone
from rest_framework import parsers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from core.engines.permission_engine import can
from documents.models import (
    DocumentActivity, DocumentFolder, DocumentVersion, ManagedDocument,
)
from documents.management_serializers import (
    DocumentActivitySerializer, DocumentFolderSerializer, ManagedDocumentSerializer,
)
from documents.management_storage import (
    get_documents_storage_profile, storage_policy_dict,
)
from documents.management_sync import reconcile_indexed_sources, sync_archive_files
from documents.management_folders import ensure_default_document_folders
from documents.management_workflow import can_transition, valid_workflow_targets


logger = logging.getLogger(__name__)


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


def _can_manage_documents(request):
    return can(getattr(request, 'user', None), 'can_manage_documents')


def _can_delete_documents(request):
    return can(getattr(request, 'user', None), 'can_delete_documents')


def _require_manage(request):
    if not _can_manage_documents(request):
        raise PermissionDenied('برای این عملیات به مجوز مدیریت اسناد نیاز دارید.')


def _require_delete(request):
    if not _can_delete_documents(request):
        raise PermissionDenied('برای حذف سند به مجوز حذف اسناد نیاز دارید.')


def _require_workflow_decision(request, target):
    """تأیید/رد و انتشار مجوز مستقل از مدیریت اسناد دارند."""
    user = getattr(request, 'user', None)
    if target in (
        ManagedDocument.WorkflowStatus.APPROVED,
        ManagedDocument.WorkflowStatus.REJECTED,
    ) and not can(user, 'can_approve_documents'):
        raise PermissionDenied('برای تأیید یا رد سند به مجوز تأیید اسناد نیاز دارید.')
    if target in (
        ManagedDocument.WorkflowStatus.PUBLISHED,
        ManagedDocument.WorkflowStatus.WITHDRAWN,
        ManagedDocument.WorkflowStatus.SUPERSEDED,
    ) and not can(user, 'can_publish_documents'):
        raise PermissionDenied('برای انتشار، لغو یا جایگزینی سند به مجوز انتشار اسناد نیاز دارید.')


def _accessible_documents(request):
    """اسناد قابل مشاهدهٔ کاربر جاری؛ منبع واحد برای فهرست، آمار و تاریخچه."""
    qs = ManagedDocument.objects.all()
    company = _company(request)
    if company:
        qs = qs.filter(company=company)
    user = getattr(request, 'user', None)
    if user and user.is_authenticated and not _can_manage_documents(request):
        qs = qs.filter(
            Q(confidentiality__in=[
                ManagedDocument.Confidentiality.PUBLIC,
                ManagedDocument.Confidentiality.INTERNAL,
            ])
            | Q(created_by=user)
        )
    return qs


class DocumentFolderViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentFolderSerializer
    queryset = DocumentFolder.objects.all()
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset().select_related('parent')
        company = _company(self.request)
        if company:
            ensure_default_document_folders(company)
            qs = qs.filter(company=company)
        return qs

    def perform_create(self, serializer):
        _require_manage(self.request)
        serializer.save(company=_company(self.request))

    def perform_update(self, serializer):
        _require_manage(self.request)
        serializer.save()

    def perform_destroy(self, instance):
        _require_manage(self.request)
        if instance.is_system:
            raise ValidationError('پوشه‌های سیستمی ساختار کتابخانه قابل حذف نیستند.')
        instance.delete()


class ManagedDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = ManagedDocumentSerializer
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    queryset = ManagedDocument.objects.all()
    ordering = ['-created_at']

    def get_queryset(self):
        company = _company(self.request)
        if company:
            try:
                reconcile_indexed_sources(company)
            except Exception:  # noqa: BLE001 — ترمیم نباید فهرست اسناد را بشکند
                logger.exception('DMS source reconciliation failed')
        qs = _accessible_documents(self.request).select_related(
            'folder', 'current_version', 'created_by', 'updated_by',
            'published_by', 'superseded_by',
            'source_document__document_type', 'source_document__employee',
            'source_organization_document',
        ).prefetch_related('versions')
        params = self.request.query_params
        folder = params.get('folder')
        if folder:
            qs = qs.filter(folder_id=folder)
        workflow_status = params.get('workflow_status') or params.get('workflow')
        state = params.get('status')
        if state:
            qs = qs.filter(status=state)
        elif workflow_status:
            qs = qs.filter(workflow_status=workflow_status)
        elif params.get('include_archived') not in ('1', 'true', 'yes'):
            qs = qs.exclude(status=ManagedDocument.Status.ARCHIVED)
        document_type = params.get('document_type') or params.get('type')
        if document_type:
            qs = qs.filter(document_type=document_type)
        owner_department = params.get('owner_department')
        if owner_department:
            qs = qs.filter(owner_department__icontains=owner_department)
        related_type = params.get('related_entity_type')
        if related_type:
            qs = qs.filter(related_entity_type=related_type)
        related_id = params.get('related_entity_id')
        if related_id:
            qs = qs.filter(related_entity_id=related_id)
        confidentiality = params.get('confidentiality')
        if confidentiality:
            qs = qs.filter(confidentiality=confidentiality)
        tag = params.get('tag')
        if tag:
            qs = qs.filter(tags__icontains=tag)
        if params.get('mine') in ('1', 'true', 'yes'):
            qs = qs.filter(created_by=self.request.user)
        due_review = params.get('review')
        if due_review == 'due':
            qs = qs.filter(review_date__isnull=False, review_date__lte=date.today())
        elif due_review == 'soon':
            qs = qs.filter(
                review_date__gte=date.today(),
                review_date__lte=date.today() + timedelta(days=30),
            )
        query = params.get('search') or params.get('q')
        if query:
            qs = qs.filter(
                Q(title__icontains=query)
                | Q(description__icontains=query)
                | Q(tags__icontains=query)
                | Q(reference_number__icontains=query)
                | Q(owner_department__icontains=query)
                | Q(issuing_authority__icontains=query)
                | Q(related_entity_label__icontains=query)
                | Q(folder__name__icontains=query)
            )
        ordering = params.get('ordering')
        allowed_ordering = (
            'title', '-title', 'created_at', '-created_at', 'updated_at', '-updated_at',
            'issue_date', '-issue_date', 'effective_date', '-effective_date',
            'review_date', '-review_date', 'expiry_date', '-expiry_date',
            'reference_number', '-reference_number',
        )
        if ordering in allowed_ordering:
            qs = qs.order_by(ordering)
        return qs

    def perform_create(self, serializer):
        _require_manage(self.request)
        serializer.save(company=_company(self.request))

    def perform_update(self, serializer):
        _require_manage(self.request)
        serializer.save()

    def perform_destroy(self, instance):
        _require_manage(self.request)
        _require_delete(self.request)
        if instance.is_controlled and instance.workflow_status == ManagedDocument.WorkflowStatus.PUBLISHED:
            if str(self.request.query_params.get('force', '')).lower() not in ('1', 'true', 'yes'):
                raise ValidationError('سند منتشرشده کنترل‌شده بدون تأیید صریح force حذف نمی‌شود.')
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
        instance.workflow_status = ManagedDocument.WorkflowStatus.ARCHIVED
        instance.save(update_fields=['status', 'workflow_status', 'updated_at'])
        DocumentActivity.objects.create(
            company=instance.company, document=instance,
            action=DocumentActivity.Action.ARCHIVE, user=getattr(self.request.user, 'pk', None) and self.request.user,
            details={'title': instance.title},
        )

    @action(detail=True, methods=['post'], url_path='workflow')
    def workflow(self, request, pk=None):
        """گذار کنترل‌شدهٔ وضعیت سند با ثبت کامل در تاریخچه."""
        _require_manage(request)
        document = self.get_object()
        target = str(request.data.get('status') or '').strip()
        valid_targets = valid_workflow_targets()
        if target not in valid_targets:
            raise ValidationError({'status': 'وضعیت مقصد معتبر نیست.'})
        if target == ManagedDocument.WorkflowStatus.REJECTED and not str(request.data.get('note') or '').strip():
            raise ValidationError({'note': 'برای رد یا بازگشت سند، دلیل بازنگری را وارد کنید.'})
        if not can_transition(document.workflow_status, target):
            raise ValidationError({'status': 'گذار وضعیت انتخاب‌شده مجاز نیست.'})
        _require_workflow_decision(request, target)

        replacement = None
        if target == ManagedDocument.WorkflowStatus.SUPERSEDED:
            replacement_id = request.data.get('replacement_id')
            if not replacement_id:
                raise ValidationError({'replacement_id': 'انتخاب سند جایگزین الزامی است.'})
            replacement = ManagedDocument.objects.filter(
                pk=replacement_id, company=document.company, is_active=True,
            ).exclude(pk=document.pk).first()
            if not replacement:
                raise ValidationError({'replacement_id': 'سند جایگزین معتبر نیست.'})
            if replacement.workflow_status not in (
                ManagedDocument.WorkflowStatus.APPROVED,
                ManagedDocument.WorkflowStatus.PUBLISHED,
            ):
                raise ValidationError({'replacement_id': 'سند جایگزین باید تأییدشده یا منتشرشده باشد.'})

        previous = document.workflow_status
        document.workflow_status = target
        if target in (
            ManagedDocument.WorkflowStatus.DRAFT,
            ManagedDocument.WorkflowStatus.REJECTED,
            ManagedDocument.WorkflowStatus.IN_REVIEW,
            ManagedDocument.WorkflowStatus.APPROVED,
        ):
            document.status = ManagedDocument.Status.DRAFT
        elif target == ManagedDocument.WorkflowStatus.PUBLISHED:
            document.status = ManagedDocument.Status.ACTIVE
            document.published_at = timezone.now()
            document.published_by = request.user
            document.is_locked = True
            if not document.effective_date:
                document.effective_date = date.today()
        else:
            document.status = ManagedDocument.Status.ARCHIVED
        if target == ManagedDocument.WorkflowStatus.DRAFT:
            document.is_locked = False
        if replacement:
            document.superseded_by = replacement

        history = list((document.metadata or {}).get('workflow_history', []))
        history.append({
            'from': previous,
            'to': target,
            'by': getattr(request.user, 'username', ''),
            'at': timezone.now().isoformat(),
            'note': str(request.data.get('note') or '')[:1000],
        })
        document.metadata = {**(document.metadata or {}), 'workflow_history': history[-100:]}
        document.updated_by = request.user
        document.save()
        DocumentActivity.objects.create(
            company=document.company, document=document,
            action=DocumentActivity.Action.WORKFLOW, user=request.user,
            details={
                'from': previous,
                'to': target,
                'note': str(request.data.get('note') or '')[:1000],
                'replacement_id': replacement.pk if replacement else None,
            },
        )
        return Response(self.get_serializer(document).data)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        _require_manage(request)
        document = self.get_object()
        previous = document.workflow_status
        document.status = ManagedDocument.Status.ARCHIVED
        document.workflow_status = ManagedDocument.WorkflowStatus.ARCHIVED
        document.save(update_fields=['status', 'workflow_status', 'updated_at'])
        DocumentActivity.objects.create(
            company=document.company, document=document,
            action=DocumentActivity.Action.ARCHIVE, user=getattr(request.user, 'pk', None) and request.user,
            details={'title': document.title, 'from': previous},
        )
        return Response(self.get_serializer(document).data)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        _require_manage(request)
        document = self.get_object()
        document.status = ManagedDocument.Status.ACTIVE
        if document.is_controlled:
            document.workflow_status = ManagedDocument.WorkflowStatus.DRAFT
            document.is_locked = False
        else:
            document.workflow_status = ManagedDocument.WorkflowStatus.PUBLISHED
        document.save(update_fields=['status', 'workflow_status', 'is_locked', 'updated_at'])
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
            _require_manage(request)
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
        _require_manage(request)
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

    @action(detail=True, methods=['get'], url_path='content')
    def content(self, request, pk=None):
        """جریان امن فایل با بررسی دسترسی؛ مسیر فیزیکی افشا نمی‌شود."""
        document = self.get_object()
        version = document.current_version
        version_id = request.query_params.get('version')
        if version_id:
            version = document.versions.filter(pk=version_id).first()
        if not version or not version.file:
            return Response({'detail': 'فایلی برای این سند ثبت نشده است.'}, status=status.HTTP_404_NOT_FOUND)
        DocumentActivity.objects.create(
            company=document.company, document=document,
            action=DocumentActivity.Action.DOWNLOAD, user=getattr(request.user, 'pk', None) and request.user,
            details={'file_name': version.original_name, 'version': version.version_number},
        )
        response = FileResponse(
            version.file.open('rb'),
            as_attachment=False,
            filename=version.original_name or os.path.basename(version.file.name),
        )
        response['Content-Type'] = version.mime_type or 'application/octet-stream'
        response['X-Content-Type-Options'] = 'nosniff'
        response['Cache-Control'] = 'private, no-store'
        return response

    @action(detail=True, methods=['post'])
    def download(self, request, pk=None):
        document = self.get_object()  # دسترسی محرمانگی در get_queryset اعمال شده است.
        version = document.current_version
        if not version or not version.file:
            return Response({'detail': 'فایلی برای این سند ثبت نشده است.'}, status=status.HTTP_404_NOT_FOUND)
        content_url = request.build_absolute_uri(f'/api/document-management/documents/{document.pk}/content/')
        return Response({'file_name': version.original_name, 'content_url': content_url})


class DocumentActivityViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DocumentActivitySerializer
    queryset = DocumentActivity.objects.all()

    def get_queryset(self):
        qs = DocumentActivity.objects.filter(
            document__in=_accessible_documents(self.request),
        ).select_related('document', 'user')
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


class DocumentManagementMenuAPIView(APIView):
    """درخت سبک پوشه‌ها برای منوی کناربرگ؛ بدون شمارش سنگین اسناد."""

    def get(self, request):
        company = _company(request)
        if not company:
            return Response([])
        ensure_default_document_folders(company)
        folders = DocumentFolder.objects.filter(
            company=company, is_active=True,
        ).values(
            'id', 'name', 'parent', 'code', 'color', 'order', 'is_system',
        )
        return Response(list(folders))


class DocumentManagementStatsAPIView(APIView):
    def get(self, request):
        company = _company(request)
        if company:
            ensure_default_document_folders(company)
            try:
                reconcile_indexed_sources(company)
            except Exception:  # noqa: BLE001 — ترمیم نباید آمار را بشکند
                logger.exception('DMS source reconciliation failed')
        docs = _accessible_documents(request).filter(is_active=True)

        # اولین بار: فایل‌های موجود در بایگانی ماژول‌ها را در کتابخانه ایندکس کن.
        auto_indexed = 0
        if company and not docs.exists() and _can_manage_documents(request):
            try:
                auto_indexed = sync_archive_files(company).get('created', 0)
                if auto_indexed:
                    docs = _accessible_documents(request).filter(is_active=True)
            except Exception:  # noqa: BLE001 — ایندکس خودکار نباید آمار را بشکند
                auto_indexed = 0

        today = date.today()
        storage_qs = DocumentVersion.objects.filter(document__in=docs)
        storage = storage_qs.aggregate(total=Sum('file_size'))['total'] or 0
        storage_policy = (
            storage_policy_dict(get_documents_storage_profile(getattr(company, 'pk', None)))
            if _can_manage_documents(request) else None
        )
        live_docs = docs.exclude(status=ManagedDocument.Status.ARCHIVED)
        expiring = live_docs.filter(expiry_date__gte=today, expiry_date__lte=today + timedelta(days=30)).count()
        expired = live_docs.filter(expiry_date__lt=today).count()
        recent_docs = live_docs.select_related(
            'folder', 'current_version', 'created_by',
            'source_document__document_type', 'source_organization_document',
        ).order_by('-created_at')[:6]
        activities = DocumentActivity.objects.filter(
            document__in=docs,
        ).select_related('document', 'user')
        if company:
            activities = activities.filter(company=company)
        return Response({
            'total': live_docs.count(),
            'active': docs.filter(status=ManagedDocument.Status.ACTIVE).count(),
            'auto_indexed': auto_indexed,
            'archived': docs.filter(status=ManagedDocument.Status.ARCHIVED).count(),
            'expiring_soon': expiring,
            'expired': expired,
            'review_due': live_docs.filter(review_date__isnull=False, review_date__lte=today).count(),
            'pending_review': live_docs.filter(
                workflow_status=ManagedDocument.WorkflowStatus.IN_REVIEW,
            ).count(),
            'published': live_docs.filter(
                workflow_status=ManagedDocument.WorkflowStatus.PUBLISHED,
            ).count(),
            'storage_bytes': storage,
            'storage_policy': storage_policy,
            'folders': DocumentFolder.objects.filter(company=company, is_active=True).count() if company else DocumentFolder.objects.filter(is_active=True).count(),
            'by_confidentiality': list(
                live_docs.values('confidentiality').annotate(count=Count('id'))
            ),
            'by_workflow': list(
                live_docs.values('workflow_status').annotate(count=Count('id'))
            ),
            'by_type': list(
                live_docs.values('document_type').annotate(count=Count('id'))
            ),
            'recent_documents': ManagedDocumentSerializer(recent_docs, many=True, context={'request': request}).data,
            'recent_activity': DocumentActivitySerializer(activities[:10], many=True, context={'request': request}).data,
        })


class DocumentManagementSyncAPIView(APIView):
    """همگام‌سازی دستی فایل‌های موجود در بایگانی همهٔ ماژول‌ها."""

    def post(self, request):
        _require_manage(request)
        company = _company(request)
        if not company:
            return Response({'error': 'شرکت جاری یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        result = sync_archive_files(company)
        return Response(result)

