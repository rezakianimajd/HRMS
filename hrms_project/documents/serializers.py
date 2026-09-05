"""
Serializers for the Documents module.
"""
from rest_framework import serializers
from documents.models import Document, DocumentType, OrganizationDocument


class DocumentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentType
        fields = ['id', 'name', 'code', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class DocumentListSerializer(serializers.ModelSerializer):
    """Compact serializer for document list."""
    document_type_name = serializers.CharField(source='document_type.name', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    file_extension = serializers.CharField(read_only=True)
    file_size_display = serializers.CharField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    days_until_expiry = serializers.IntegerField(read_only=True)

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'document_type', 'document_type_name',
            'employee', 'employee_name',
            'issue_date', 'expiry_date',
            'document_number', 'version',
            'file', 'file_extension', 'file_size_display',
            'is_expired', 'days_until_expiry',
            'description', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'file_extension', 'file_size_display',
                           'is_expired', 'days_until_expiry']


class DocumentSerializer(serializers.ModelSerializer):
    """Full serializer for document detail."""
    document_type_detail = DocumentTypeSerializer(source='document_type', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    file_extension = serializers.CharField(read_only=True)
    file_size_display = serializers.CharField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    days_until_expiry = serializers.IntegerField(read_only=True)

    class Meta:
        model = Document
        fields = [
            'id', 'title',
            'document_type', 'document_type_detail',
            'employee', 'employee_name', 'employee_id',
            'issue_date', 'expiry_date',
            'document_number', 'version',
            'file', 'file_extension', 'file_size_display',
            'is_expired', 'days_until_expiry',
            'description', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'file_extension',
                           'file_size_display', 'is_expired', 'days_until_expiry']


class OrganizationDocumentSerializer(serializers.ModelSerializer):
    """Serializer for company archive documents."""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    file_extension = serializers.CharField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = OrganizationDocument
        fields = [
            'id', 'title', 'category', 'category_display',
            'reference_number', 'issue_date', 'expiry_date',
            'file', 'file_url', 'file_extension',
            'tags', 'description',
            'is_expired', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'file_extension', 'is_expired']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class DocumentUploadSerializer(serializers.ModelSerializer):
    """Serializer for uploading a new document."""
    file = serializers.FileField(required=True)

    class Meta:
        model = Document
        fields = [
            'employee', 'title', 'document_type',
            'issue_date', 'expiry_date', 'document_number',
            'file', 'version', 'description',
        ]

    def validate_file(self, value):
        import os
        allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.xlsx', '.gif', '.bmp', '.webp']
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in allowed:
            raise serializers.ValidationError(
                f"فرمت فایل مجاز نیست. فرمت‌های مجاز: {', '.join(allowed)}"
            )
        max_size = 10 * 1024 * 1024  # 10 MB
        if value.size > max_size:
            raise serializers.ValidationError("حجم فایل نباید بیشتر از ۱۰ مگابایت باشد.")
        return value