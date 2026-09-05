"""
Views for the Documents module.
"""
from rest_framework import viewsets, status, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from documents.models import Document, DocumentType, OrganizationDocument
from documents.serializers import (
    DocumentSerializer, DocumentListSerializer, DocumentUploadSerializer,
    DocumentTypeSerializer, OrganizationDocumentSerializer,
)
from documents.engines.document_engine import DocumentEngine


class DocumentTypeViewSet(viewsets.ModelViewSet):
    """Full CRUD for document types (used by definitions + document upload)."""
    queryset = DocumentType.objects.all()
    serializer_class = DocumentTypeSerializer
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        if company:
            qs = qs.filter(company=company)
        return qs

    def perform_create(self, serializer):
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        serializer.save(company=company)


class OrganizationDocumentViewSet(viewsets.ModelViewSet):
    """CRUD for company-level archived documents (بایگانی اسناد سازمان)."""
    queryset = OrganizationDocument.objects.all()
    serializer_class = OrganizationDocumentSerializer
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    search_fields = ['title', 'reference_number', 'tags', 'description']
    ordering_fields = ['issue_date', 'created_at', 'title']
    ordering = ['-issue_date', '-created_at']
    filterset_fields = ['category', 'is_active']

    def get_queryset(self):
        qs = super().get_queryset()
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        if company:
            qs = qs.filter(company=company)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        expired = self.request.query_params.get('expired')
        if expired in ('true', '1'):
            from datetime import date
            qs = qs.filter(expiry_date__lt=date.today())
        elif expired in ('false', '0'):
            from datetime import date
            qs = qs.filter(expiry_date__gte=date.today()) | qs.filter(expiry_date__isnull=True)
        return qs

    def perform_create(self, serializer):
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        serializer.save(company=company)


class DocumentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for document CRUD with multi-tenant filtering.
    Supports file upload via multipart/form-data.
    """
    queryset = Document.objects.all()
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_serializer_class(self):
        if self.action == 'create':
            return DocumentUploadSerializer
        elif self.action == 'list':
            return DocumentListSerializer
        return DocumentSerializer

    def get_queryset(self):
        """Filter queryset by current company and optionally by employee_id."""
        qs = super().get_queryset()
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        if company:
            qs = qs.filter(company=company)

        # Optional filter by employee_id from query params
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)

        qs = qs.select_related('employee', 'document_type')
        return qs

    def perform_create(self, serializer):
        """Assign company from request context when creating."""
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        serializer.save(company=company)

    def destroy(self, request, *args, **kwargs):
        """Delete document record and physical file."""
        document = self.get_object()
        import os
        if document.file:
            if hasattr(document.file, 'path') and os.path.exists(document.file.path):
                os.remove(document.file.path)
        document.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], url_path='employee/(?P<employee_id>[^/.]+)')
    def by_employee(self, request, employee_id=None):
        """Get all documents for a specific employee."""
        company = getattr(request, 'tenant', None) or getattr(request, 'company', None)
        documents = DocumentEngine.get_documents(employee_id, company)
        serializer = DocumentListSerializer(documents, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def expiring(self, request):
        """Get documents expiring within the next 30 days."""
        company = getattr(request, 'tenant', None) or getattr(request, 'company', None)
        days = int(request.query_params.get('days', 30))
        documents = DocumentEngine.check_expiry_documents(company, days)
        serializer = DocumentListSerializer(documents, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def expired(self, request):
        """Get all expired documents."""
        company = getattr(request, 'tenant', None) or getattr(request, 'company', None)
        documents = DocumentEngine.get_expired_documents(company)
        serializer = DocumentListSerializer(documents, many=True)
        return Response(serializer.data)