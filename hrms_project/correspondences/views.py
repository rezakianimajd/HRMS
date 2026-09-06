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

    def _set_employees(self, instance, data):
        """For letter models with `employees` M2M, set the related persons."""
        if 'employees' in data:
            ids = data.get('employees') or []
            if isinstance(ids, str):
                ids = [x.strip() for x in ids.split(',') if x.strip()]
            ids = [int(x) for x in ids if str(x).isdigit()]
            instance.employees.set(ids)

    def perform_create(self, serializer):
        company = _get_company(self.request)
        data = self.request.data
        instance = serializer.save(company=company)
        self._set_employees(instance, data)

    def perform_update(self, serializer):
        instance = serializer.save()
        data = self.request.data
        if 'employees' in data:
            self._set_employees(instance, data)
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
