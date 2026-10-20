from django.contrib import admin

from documents.models import (
    DocumentActivity, DocumentFolder, DocumentVersion, ManagedDocument,
)


class DocumentVersionInline(admin.TabularInline):
    model = DocumentVersion
    extra = 0
    readonly_fields = ['version_number', 'file_size', 'mime_type', 'checksum', 'created_at']


@admin.register(DocumentFolder)
class DocumentFolderAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent', 'company', 'order', 'is_active']
    list_filter = ['is_active', 'company']
    search_fields = ['name', 'code', 'description']


@admin.register(ManagedDocument)
class ManagedDocumentAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'document_type', 'folder', 'workflow_status', 'confidentiality',
        'version_count', 'review_date', 'expiry_date', 'created_at',
    ]
    list_filter = ['workflow_status', 'document_type', 'status', 'confidentiality', 'company']
    search_fields = [
        'title', 'tags', 'reference_number', 'description', 'owner_department',
        'issuing_authority', 'related_entity_label',
    ]
    inlines = [DocumentVersionInline]


@admin.register(DocumentVersion)
class DocumentVersionAdmin(admin.ModelAdmin):
    list_display = ['document', 'version_number', 'original_name', 'file_size', 'created_at']
    search_fields = ['document__title', 'original_name']


@admin.register(DocumentActivity)
class DocumentActivityAdmin(admin.ModelAdmin):
    list_display = ['document', 'action', 'user', 'created_at']
    list_filter = ['action', 'company']
    search_fields = ['document__title', 'details']
