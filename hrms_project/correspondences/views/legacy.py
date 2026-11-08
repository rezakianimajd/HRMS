"""ویوست‌های قدیمی مکاتبات (فقط-خواندنی).

این مدل‌ها بازنشسته شده‌اند؛ فقط فهرست/جزئیات برای تاریخچه سرو می‌شود.
"""
from rest_framework import viewsets, filters, parsers

from correspondences.models import IncomingLetter, OutgoingLetter, Announcement, Form, Organization, OrganizationalLetter
from correspondences.serializers import (
    IncomingLetterSerializer, OutgoingLetterSerializer,
    AnnouncementSerializer, FormSerializer,
    OrganizationSerializer, OrganizationalLetterSerializer,
)
from correspondences.views.base import DefinitionPermissionMixin, _company_scoped


class BaseCorrespondenceViewSet(viewsets.ReadOnlyModelViewSet):
    """ویوست **فقط-خواندنی** مدل‌های قدیمی مکاتبات.

    ثبت/ویرایش این مدل‌ها بازنشسته شده است (دفتر نامه‌ها = ``LetterViewSet``)؛
    فقط فهرست/جزئیات برای تاریخچه و سازگاری باقی می‌ماند تا هم مسیر تکثیر
    ``OrganizationDocument`` بسته شود و هم داده‌های قدیمی از دست نرود.
    """
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    ordering = ['-date']
    search_fields = ['number', 'subject', 'sender']

    def get_queryset(self):
        return _company_scoped(super().get_queryset(), self.request)


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


class OrganizationViewSet(DefinitionPermissionMixin, viewsets.ModelViewSet):
    """سازمان‌های طرف مکاتبه — تنها مدل قدیمی که هنوز نوشتن دارد (تب مخاطبین)."""

    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    permission_label = 'تعاریف مکاتبات'
    serializer_class = OrganizationSerializer
    queryset = Organization.objects.all()
    search_fields = ['name', 'code', 'type']
    ordering = ['name']

    def get_queryset(self):
        return _company_scoped(super().get_queryset(), self.request)


class OrganizationalLetterViewSet(BaseCorrespondenceViewSet):
    serializer_class = OrganizationalLetterSerializer
    queryset = OrganizationalLetter.objects.all()
    search_fields = ['number', 'subject']
    ordering = ['-date']


