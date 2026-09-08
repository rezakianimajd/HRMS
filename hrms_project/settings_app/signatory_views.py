"""CRUD view for Signatory (صاحبان امضا)."""
from rest_framework import viewsets, parsers
from settings_app.models import Signatory
from settings_app.serializers import SignatorySerializer


class SignatoryViewSet(viewsets.ModelViewSet):
    serializer_class = SignatorySerializer
    queryset = Signatory.objects.all()
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_queryset(self):
        qs = super().get_queryset()
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        if company:
            qs = qs.filter(company=company)
        return qs

    def perform_create(self, serializer):
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        serializer.save(company=company)