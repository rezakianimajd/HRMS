"""Views for the Correspondences module."""
from rest_framework import viewsets, filters, parsers
from correspondences.models import IncomingLetter, OutgoingLetter, Announcement, Form, Organization, OrganizationalLetter
from correspondences.serializers import (
    IncomingLetterSerializer, OutgoingLetterSerializer,
    AnnouncementSerializer, FormSerializer,
    OrganizationSerializer, OrganizationalLetterSerializer,
)


def _get_company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class BaseCorrespondenceViewSet(viewsets.ModelViewSet):
    """Base ViewSet with multi-tenant filtering."""
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    ordering = ['-date']
    search_fields = ['number', 'subject', 'sender']

    def get_queryset(self):
        qs = super().get_queryset()
        company = _get_company(self.request)
        if company:
            qs = qs.filter(company=company)
        return qs

    def _set_employees_and_archive(self, instance, data):
        """
        Save related persons (M2M) AND mirror letters into the company
        archive (OrganizationDocument) so the letter appears both on each
        employee's profile and in "بایگانی اسناد سازمان".
        """
        from employees.models import Employee
        from documents.models import OrganizationDocument

        company = instance.company
        ids = []
        raw = data.get('employees') if isinstance(data, dict) else None
        if raw is None:
            raw = data.get('employees')
        if raw:
            if isinstance(raw, str):
                raw = [x.strip() for x in raw.split(',') if x.strip()]
            ids = [int(x) for x in raw if str(x).isdigit()]

        employees = list(Employee.objects.filter(company=company, id__in=ids))
        instance.employees.set(ids)

        subject = getattr(instance, 'subject', None) or getattr(instance, 'title', None) or ''
        number = getattr(instance, 'number', '')
        letter_date = getattr(instance, 'date', None)
        description = getattr(instance, 'description', '') or ''

        for emp in employees:
            OrganizationDocument.objects.create(
                company=company,
                employee=emp,
                title=f"نامه: {subject} ({number})",
                category=OrganizationDocument.ArchiveCategory.HR_DOC,
                reference_number=number,
                issue_date=letter_date,
                file=instance.file if getattr(instance, 'file', None) else None,
                description=description,
                tags='مکاتبات',
            )

    def perform_create(self, serializer):
        company = _get_company(self.request)
        data = self.request.data
        instance = serializer.save(company=company)
        # For incoming/outgoing letters -> mirror into archive + employee profile
        if hasattr(instance, 'employees'):
            self._set_employees_and_archive(instance, data)
        return instance

    def perform_update(self, serializer):
        instance = serializer.save()
        data = self.request.data
        if 'employees' in data and hasattr(instance, 'employees'):
            self._set_employees_and_archive(instance, data)
        return instance

class IncomingLetterViewSet(BaseCorrespondenceViewSet):
    serializer_class = IncomingLetterSerializer
    queryset = IncomingLetter.objects.all()
    search_fields = ['number', 'subject', 'sender']


class OutgoingLetterViewSet(BaseCorrespondenceViewSet):
    serializer_class = OutgoingLetterSerializer
    queryset = OutgoingLetter.objects.all()
    search_fields = ['number', 'subject', 'receiver']


class AnnouncementViewSet(BaseCorrespondenceViewSet):
    serializer_class = AnnouncementSerializer
    queryset = Announcement.objects.all()
    search_fields = ['number', 'title']


class FormViewSet(BaseCorrespondenceViewSet):
    serializer_class = FormSerializer
    queryset = Form.objects.all()
    search_fields = ['name', 'code', 'category']
    ordering = ['name']


class OrganizationViewSet(BaseCorrespondenceViewSet):
    serializer_class = OrganizationSerializer
    queryset = Organization.objects.all()
    search_fields = ['name', 'code', 'type']
    ordering = ['name']


class OrganizationalLetterViewSet(BaseCorrespondenceViewSet):
    serializer_class = OrganizationalLetterSerializer
    queryset = OrganizationalLetter.objects.all()
    search_fields = ['number', 'subject']
    ordering = ['-date']
