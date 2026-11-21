"""CRUD view for Signatory (صاحبان امضا)."""
from rest_framework import viewsets, parsers
from rest_framework.permissions import BasePermission, SAFE_METHODS
from settings_app.models import Signatory
from settings_app.serializers import SignatorySerializer


class CanEditSignatories(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        from settings_app.views import _can_edit_settings
        return bool(request.user and request.user.is_authenticated and _can_edit_settings(request.user))


class SignatoryViewSet(viewsets.ModelViewSet):
    serializer_class = SignatorySerializer
    queryset = Signatory.objects.all()
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    permission_classes = [CanEditSignatories]

    def get_queryset(self):
        qs = super().get_queryset()
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        if company:
            qs = qs.filter(company=company)
        return qs

    def perform_create(self, serializer):
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        serializer.save(company=company)