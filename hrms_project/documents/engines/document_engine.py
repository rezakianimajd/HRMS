"""
Document Engine - Core business logic for document management.
"""
import os
from datetime import date, timedelta
from django.db.models import Q
from documents.models import Document, DocumentType
from employees.models import Employee


class DocumentEngine:
    """
    Engine for document CRUD operations with file management.
    """

    ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.xlsx', '.gif', '.bmp', '.webp']
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

    @staticmethod
    def validate_file(file):
        """
        Validate uploaded file extension and size.
        Raises ValueError on invalid file.
        """
        ext = os.path.splitext(file.name)[1].lower()
        if ext not in DocumentEngine.ALLOWED_EXTENSIONS:
            raise ValueError(
                f"فرمت فایل مجاز نیست. فرمت‌های مجاز: {', '.join(DocumentEngine.ALLOWED_EXTENSIONS)}"
            )
        if file.size > DocumentEngine.MAX_FILE_SIZE:
            max_mb = DocumentEngine.MAX_FILE_SIZE / (1024 * 1024)
            raise ValueError(f"حجم فایل نباید بیشتر از {max_mb:.0f} مگابایت باشد.")

    @staticmethod
    def upload_document(data, file, company):
        """
        Upload a document for an employee.
        Args:
            data: dict with: employee_id, title, document_type_id, issue_date, expiry_date,
                  document_number, description
            file: Django UploadedFile object
            company: Company instance
        Returns:
            Document instance
        """
        # Validate file
        DocumentEngine.validate_file(file)

        # Validate employee belongs to the company
        employee_id = data.get('employee_id')
        employee = Employee.objects.filter(id=employee_id, company=company, is_active=True).first()
        if not employee:
            raise ValueError("پرسنل یافت نشد یا به این شرکت دسترسی ندارید.")

        document = Document.objects.create(
            company=company,
            employee=employee,
            title=data.get('title', file.name),
            document_type_id=data['document_type_id'],
            issue_date=data.get('issue_date'),
            expiry_date=data.get('expiry_date'),
            document_number=data.get('document_number'),
            file=file,
            version=data.get('version', 1),
            description=data.get('description'),
        )
        return document

    @staticmethod
    def get_documents(employee_id, company=None):
        """
        Get all documents for an employee, filtered by company.
        """
        qs = Document.objects.select_related('document_type', 'employee').filter(
            employee_id=employee_id, is_active=True
        )
        if company:
            qs = qs.filter(company=company)
        return qs.order_by('-created_at')

    @staticmethod
    def get_document(document_id, company=None):
        """
        Get a single document with access check.
        """
        qs = Document.objects.select_related('document_type', 'employee')
        if company:
            qs = qs.filter(company=company)
        return qs.filter(id=document_id).first()

    @staticmethod
    def delete_document(document_id, company=None):
        """
        Delete a document (physical file + DB record).
        """
        qs = Document.objects.filter(id=document_id)
        if company:
            qs = qs.filter(company=company)

        document = qs.first()
        if not document:
            raise ValueError("مدرک یافت نشد یا به این شرکت دسترسی ندارید.")

        # Delete physical file
        if document.file:
            if hasattr(document.file, 'path') and os.path.exists(document.file.path):
                os.remove(document.file.path)

        document.delete()
        return True

    @staticmethod
    def update_document(document_id, data, company=None):
        """
        Update document metadata (not the file itself).
        """
        qs = Document.objects.filter(id=document_id)
        if company:
            qs = qs.filter(company=company)

        document = qs.first()
        if not document:
            raise ValueError("مدرک یافت نشد یا به این شرکت دسترسی ندارید.")

        updatable_fields = [
            'title', 'document_type_id', 'issue_date', 'expiry_date',
            'document_number', 'version', 'description',
        ]
        for field in updatable_fields:
            if field in data:
                setattr(document, field, data[field])

        document.save()
        return document

    @staticmethod
    def check_expiry_documents(company=None, days=30):
        """
        Find documents that will expire within a given number of days.
        Args:
            company: Company instance (optional)
            days: Number of days threshold (default 30)
        Returns:
            QuerySet of Document instances nearing expiry
        """
        today = date.today()
        threshold = today + timedelta(days=days)

        qs = Document.objects.select_related('employee', 'document_type').filter(
            is_active=True,
            expiry_date__isnull=False,
            expiry_date__gte=today,
            expiry_date__lte=threshold,
        )
        if company:
            qs = qs.filter(company=company)
        return qs.order_by('expiry_date')

    @staticmethod
    def get_expired_documents(company=None):
        """
        Find documents that have already expired.
        """
        today = date.today()
        qs = Document.objects.select_related('employee', 'document_type').filter(
            is_active=True,
            expiry_date__isnull=False,
            expiry_date__lt=today,
        )
        if company:
            qs = qs.filter(company=company)
        return qs.order_by('expiry_date')

    @staticmethod
    def get_document_types(company=None):
        """
        Get all active document types for a company.
        """
        qs = DocumentType.objects.filter(is_active=True)
        if company:
            qs = qs.filter(company=company)
        return qs.order_by('name')