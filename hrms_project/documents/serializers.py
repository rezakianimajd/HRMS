"""
Serializers for the Documents module.
"""
from rest_framework import serializers
from documents.models import Document, DocumentType, OrganizationDocument


class DocumentTypeSerializer(serializers.ModelSerializer):
    archive_subfolder = serializers.CharField(read_only=True)

    class Meta:
        model = DocumentType
        fields = [
            'id', 'name', 'code', 'archive_folder', 'archive_subfolder',
            'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'archive_subfolder']


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
    is_dependent = serializers.BooleanField(read_only=True)
    file_url = serializers.SerializerMethodField()
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)

    class Meta:
        model = OrganizationDocument
        fields = [
            'id', 'title', 'category', 'category_display',
            'employee', 'employee_name',
            'reference_number', 'issue_date', 'expiry_date',
            'file', 'file_url', 'file_extension',
            'tags', 'description', 'dependent_related', 'is_dependent',
            'is_expired', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'file_extension',
                            'is_expired', 'is_dependent']

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
    # پیش‌فرض‌ها هم‌راستا با پروفایل بایگانی «پروندهٔ پرسنل» (hr.employees)
    DEFAULT_EXTENSIONS = [
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.txt', '.csv', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
        '.zip', '.rar',
    ]
    DEFAULT_MAX_MB = 50

    class Meta:
        model = Document
        fields = [
            'id', 'employee', 'title', 'document_type',
            'issue_date', 'expiry_date', 'document_number',
            'file', 'version', 'description',
        ]
        read_only_fields = ['id']

    def _upload_policy(self):
        """پسوندهای مجاز و سقف حجم را از پروفایل بایگانی همان شرکت می‌خواند."""
        allowed = {item.lower() for item in self.DEFAULT_EXTENSIONS}
        max_mb = self.DEFAULT_MAX_MB
        try:
            from settings_app.models import StorageProfile

            request = self.context.get('request')
            company = getattr(request, 'tenant', None) or getattr(request, 'company', None)
            company_id = getattr(company, 'id', None)
            if company_id:
                profile = StorageProfile.objects.filter(
                    company_id=company_id, module_key='hr.employees', is_active=True,
                ).first()
                if profile:
                    from documents.management_storage import normalize_extensions

                    extensions = normalize_extensions(profile, self.DEFAULT_EXTENSIONS)
                    if extensions:
                        allowed = extensions
                    max_mb = int(profile.max_file_size_mb or max_mb)
        except Exception:  # noqa: BLE001 — نبود پروفایل نباید آپلود را بشکند
            pass
        return allowed, max_mb

    def validate_file(self, value):
        import os

        allowed, max_mb = self._upload_policy()
        extension = os.path.splitext(getattr(value, 'name', '') or '')[1].lower()
        if allowed and extension not in allowed:
            raise serializers.ValidationError(
                'فرمت فایل مجاز نیست. فرمت‌های مجاز: '
                + '، '.join(sorted(item.lstrip('.') for item in allowed))
            )
        if value.size > max_mb * 1024 * 1024:
            raise serializers.ValidationError(
                f'حجم فایل نباید بیشتر از {max_mb} مگابایت باشد.'
            )
        return value