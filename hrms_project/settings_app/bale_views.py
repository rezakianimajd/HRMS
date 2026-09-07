"""Views for Bale contacts (custom recipients with categories)."""
from rest_framework import viewsets, filters
from settings_app.models import BaleContact
from settings_app.serializers import BaleContactSerializer


class BaleContactViewSet(viewsets.ModelViewSet):
    serializer_class = BaleContactSerializer
    queryset = BaleContact.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'chat_id', 'category', 'note']
    ordering = ['category', 'name']

    def get_queryset(self):
        qs = super().get_queryset()
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        if company:
            qs = qs.filter(company=company)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        return qs

    def perform_create(self, serializer):
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        serializer.save(company=company)