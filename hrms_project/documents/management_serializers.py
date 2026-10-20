"""Serializers for the Document Management (DMS) module."""
import hashlib
import os

from django.db.models import Q
from django.urls import reverse
from rest_framework import serializers

from core.engines.permission_engine import can
from documents.models import (
    DocumentActivity, DocumentFolder, DocumentVersion, ManagedDocument,
)
from documents.management_storage import (
    get_documents_storage_profile, validate_upload,
)

ALLOWED_EXTENSIONS = {
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt',
    '.csv', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.zip', '.rar',
}
MAX_FILE_SIZE = 50 * 1024 * 1024


def _user(request):
    user = getattr(request, 'user', None)
    return user if user and user.is_authenticated else None


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


def _user_name(user):
    if not user:
        return ''
    return ' '.join(part for part in [user.first_name, user.last_name] if part).strip() or user.username


def _can_view_storage(context):
    request = context.get('request') if context else None
    user = getattr(request, 'user', None)
    return bool(user and user.is_authenticated and can(user, 'can_manage_documents'))


def _file_size_display(size):
    size = int(size or 0)
    if size < 1024:
        return f'{size} B'
    if size < 1024 * 1024:
        return f'{size / 1024:.1f} KB'
    return f'{size / (1024 * 1024):.1f} MB'


class DocumentFolderSerializer(serializers.ModelSerializer):
    path = serializers.CharField(read_only=True)
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    documents_count = serializers.SerializerMethodField()
    children_count = serializers.SerializerMethodField()

    class Meta:
        model = DocumentFolder
        fields = [
            'id', 'name', 'code', 'parent', 'parent_name', 'path', 'description',
            'color', 'icon', 'order', 'is_system', 'documents_count', 'children_count',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'path', 'parent_name', 'documents_count', 'children_count']

    def validate_parent(self, value):
        company = _company(self.context.get('request'))
        if value and company and value.company_id != company.pk:
            raise serializers.ValidationError('پوشه والد متعلق به شرکت جاری نیست.')
        return value

    def get_documents_count(self, obj):
        """تعداد اسناد فعال خود پوشه و همهٔ زیرپوشه‌ها."""
        folder_ids = [obj.id]
        pending = [obj.id]
        while pending:
            current = pending.pop()
            child_ids = list(
                DocumentFolder.objects.filter(parent_id=current, is_active=True)
                .values_list('id', flat=True)
            )
            folder_ids.extend(child_ids)
            pending.extend(child_ids)
        docs = ManagedDocument.objects.filter(
            folder_id__in=set(folder_ids), is_active=True,
        ).exclude(status=ManagedDocument.Status.ARCHIVED)
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user and user.is_authenticated and not can(user, 'can_manage_documents'):
            docs = docs.filter(
                Q(confidentiality__in=[
                    ManagedDocument.Confidentiality.PUBLIC,
                    ManagedDocument.Confidentiality.INTERNAL,
                ])
                | Q(created_by=user),
            )
        return docs.count()

    def get_children_count(self, obj):
        return obj.children.filter(is_active=True).count()


class DocumentVersionSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True, required=False)
    file_url = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    file_extension = serializers.SerializerMethodField()
    file_size_display = serializers.SerializerMethodField()
    storage_path = serializers.SerializerMethodField()

    class Meta:
        model = DocumentVersion
        fields = [
            'id', 'document', 'version_number', 'file', 'file_url', 'original_name',
            'file_size', 'file_size_display', 'file_extension', 'storage_path',
            'mime_type', 'checksum', 'change_note', 'created_by', 'created_by_name',
            'created_at',
        ]
        read_only_fields = [
            'id', 'document', 'version_number', 'file_url', 'file_size',
            'file_size_display', 'file_extension', 'storage_path', 'mime_type',
            'checksum', 'created_by', 'created_by_name', 'created_at',
        ]

    def get_file_url(self, obj):
        if not obj.file:
            return None
        try:
            url = reverse('managed-document-content', args=[obj.document_id])
            url = f'{url}?version={obj.pk}'
        except Exception:  # noqa: BLE001
            url = f'/api/document-management/documents/{obj.document_id}/content/?version={obj.pk}'
        request = self.context.get('request')
        return request.build_absolute_uri(url) if request else url

    def get_created_by_name(self, obj):
        return _user_name(obj.created_by)

    def get_file_extension(self, obj):
        return os.path.splitext(obj.file.name)[1].lower() if obj.file else ''

    def get_file_size_display(self, obj):
        return _file_size_display(obj.file_size)

    def get_storage_path(self, obj):
        if not _can_view_storage(self.context):
            return ''
        return obj.file.name if obj.file else ''


class DocumentActivitySerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    user_name = serializers.SerializerMethodField()
    document_title = serializers.CharField(source='document.title', read_only=True)
    details = serializers.SerializerMethodField()

    class Meta:
        model = DocumentActivity
        fields = ['id', 'document', 'document_title', 'action', 'action_display', 'user', 'user_name', 'details', 'created_at']
        read_only_fields = fields

    def get_user_name(self, obj):
        return _user_name(obj.user)

    def get_details(self, obj):
        details = obj.details or {}
        if _can_view_storage(self.context):
            return details
        hidden = {'storage_path', 'path', 'file_path', 'absolute_path'}
        return {key: value for key, value in details.items() if key not in hidden}


class ManagedDocumentSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True, required=False, allow_null=True)
    folder_name = serializers.CharField(source='folder.name', read_only=True)
    folder_path = serializers.CharField(source='folder.path', read_only=True)
    confidentiality_display = serializers.CharField(source='get_confidentiality_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    workflow_status_display = serializers.CharField(source='get_workflow_status_display', read_only=True)
    is_editable_in_workflow = serializers.BooleanField(read_only=True)
    published_by_name = serializers.SerializerMethodField()
    superseded_by_title = serializers.CharField(source='superseded_by.title', read_only=True)
    tags_list = serializers.ListField(read_only=True)
    file_url = serializers.SerializerMethodField()
    file_name = serializers.CharField(read_only=True)
    file_extension = serializers.CharField(read_only=True)
    file_size = serializers.IntegerField(read_only=True)
    file_size_display = serializers.SerializerMethodField()
    mime_type = serializers.SerializerMethodField()
    storage_path = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)
    days_until_expiry = serializers.IntegerField(read_only=True)
    versions = DocumentVersionSerializer(many=True, read_only=True)

    class Meta:
        model = ManagedDocument
        fields = [
            'id', 'title', 'folder', 'folder_name', 'folder_path', 'description',
            'document_type', 'document_type_display', 'owner_department',
            'issuing_authority', 'related_entity_type', 'related_entity_id',
            'related_entity_label',
            'tags', 'tags_list', 'reference_number', 'issue_date', 'effective_date',
            'review_date', 'expiry_date', 'retention_until', 'confidentiality',
            'confidentiality_display', 'status', 'status_display', 'workflow_status',
            'workflow_status_display', 'is_editable_in_workflow', 'is_controlled',
            'published_at', 'published_by', 'published_by_name', 'superseded_by',
            'superseded_by_title', 'metadata', 'is_locked', 'current_version',
            'version_count', 'source_module_key', 'is_indexed',
            'file', 'file_url', 'file_name', 'file_extension', 'file_size',
            'file_size_display', 'mime_type', 'storage_path', 'created_by',
            'created_by_name', 'updated_by', 'updated_by_name', 'is_expired',
            'days_until_expiry', 'versions', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'current_version', 'version_count', 'source_module_key',
            'is_indexed', 'document_type_display', 'workflow_status_display',
            'is_editable_in_workflow', 'status', 'workflow_status', 'is_controlled',
            'published_at', 'published_by',
            'published_by_name', 'superseded_by', 'superseded_by_title',
            'file_url', 'file_name', 'file_extension', 'file_size',
            'file_size_display', 'mime_type', 'storage_path', 'created_by',
            'created_by_name', 'updated_by', 'updated_by_name', 'is_expired',
            'days_until_expiry', 'versions', 'created_at', 'updated_at',
        ]

    def get_file_url(self, obj):
        version = obj.current_version
        if version and version.file:
            try:
                url = reverse('managed-document-content', args=[obj.pk])
            except Exception:  # noqa: BLE001
                url = f'/api/document-management/documents/{obj.pk}/content/'
            request = self.context.get('request')
            return request.build_absolute_uri(url) if request else url
        return None

    def get_file_size_display(self, obj):
        return _file_size_display(obj.file_size)

    def get_mime_type(self, obj):
        return obj.current_version.mime_type if obj.current_version else ''

    def get_storage_path(self, obj):
        if not _can_view_storage(self.context):
            return ''
        return obj.current_version.file.name if obj.current_version and obj.current_version.file else ''

    def get_created_by_name(self, obj):
        return _user_name(obj.created_by)

    def get_updated_by_name(self, obj):
        return _user_name(obj.updated_by)

    def get_published_by_name(self, obj):
        return _user_name(obj.published_by)

    def validate_folder(self, value):
        company = _company(self.context.get('request'))
        if value and company and value.company_id != company.pk:
            raise serializers.ValidationError('پوشه انتخاب‌شده متعلق به شرکت جاری نیست.')
        return value

    def validate_file(self, value):
        if not value:
            return value
        company = _company(self.context.get('request'))
        profile = get_documents_storage_profile(getattr(company, 'pk', None))
        error = validate_upload(profile, value, ALLOWED_EXTENSIONS)
        if error:
            raise serializers.ValidationError(error)
        return value

    def validate(self, attrs):
        if not self.instance and not attrs.get('file'):
            raise serializers.ValidationError({'file': 'فایل سند الزامی است.'})
        if self.instance and self.instance.is_locked and attrs.get('is_locked', True):
            raise serializers.ValidationError({'is_locked': 'این سند قفل شده است؛ ابتدا قفل ویرایش را باز کنید.'})
        if (
            self.instance
            and self.instance.is_controlled
            and not self.instance.is_editable_in_workflow
        ):
            raise serializers.ValidationError({
                'workflow_status': (
                    'این سند کنترل‌شده منتشر یا در گردش‌کار است و ویرایش مستقیم ندارد. '
                    'ابتدا آن را از مسیر گردش‌کار برای بازنگری برگردانید.'
                ),
            })
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        upload = validated_data.pop('file', None)
        user = _user(request)
        # اسناد جدید همیشه از مرحله پیش‌نویس آغاز می‌شوند؛ انتشار فقط با اقدام صریح است.
        validated_data['workflow_status'] = ManagedDocument.WorkflowStatus.DRAFT
        validated_data['status'] = ManagedDocument.Status.DRAFT
        validated_data['is_controlled'] = True
        document = ManagedDocument.objects.create(**validated_data, created_by=user, updated_by=user)
        if upload:
            self._add_version(document, upload, user, 'نسخه اولیه سند')
        self._log(document, DocumentActivity.Action.CREATE, user, {'title': document.title})
        return document

    def update(self, instance, validated_data):
        request = self.context.get('request')
        upload = validated_data.pop('file', None)
        user = _user(request)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.updated_by = user
        instance.save()
        if upload:
            self._add_version(instance, upload, user, 'ثبت نسخه جدید')
        self._log(instance, DocumentActivity.Action.UPDATE, user, {'title': instance.title})
        return instance

    def _add_version(self, document, upload, user, change_note=''):
        hasher = hashlib.sha256()
        for chunk in upload.chunks():
            hasher.update(chunk)
        try:
            upload.seek(0)
        except Exception:  # noqa: BLE001
            pass
        last = document.versions.order_by('-version_number').first()
        version_number = (last.version_number + 1) if last else 1
        version = DocumentVersion.objects.create(
            company=document.company,
            document=document,
            version_number=version_number,
            file=upload,
            original_name=os.path.basename(upload.name),
            file_size=getattr(upload, 'size', 0),
            mime_type=getattr(upload, 'content_type', '') or '',
            checksum=hasher.hexdigest(),
            change_note=change_note or '',
            created_by=user,
        )
        document.current_version = version
        document.version_count = version_number
        document.save(update_fields=['current_version', 'version_count', 'updated_at'])
        self._log(document, DocumentActivity.Action.VERSION, user, {
            'version': version_number,
            'file_name': version.original_name,
        })
        return version

    def _log(self, document, action, user, details=None):
        DocumentActivity.objects.create(
            company=document.company,
            document=document,
            action=action,
            user=user,
            details=details or {},
        )

