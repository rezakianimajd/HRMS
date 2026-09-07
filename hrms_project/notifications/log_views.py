"""API for Bale send log (history) and schedules."""
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response

from notifications.models import BaleSendLog, BaleSchedule
from notifications.serializers import BaleSendLogSerializer, BaleScheduleSerializer


class BaleSendLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BaleSendLogSerializer
    queryset = BaleSendLog.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['recipient_name', 'chat_id', 'subject']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        if company:
            qs = qs.filter(company=company)
        st = self.request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)
        return qs


class BaleScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = BaleScheduleSerializer
    queryset = BaleSchedule.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title']
    ordering = ['scheduled_at']

    def get_queryset(self):
        qs = super().get_queryset()
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        if company:
            qs = qs.filter(company=company)
        return qs

    def perform_create(self, serializer):
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        serializer.save(company=company)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        obj = self.get_object()
        obj.status = BaleSchedule.Status.CANCELLED
        obj.save(update_fields=['status', 'updated_at'])
        return Response(BaleScheduleSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def run_now(self, request, pk=None):
        """Execute a schedule immediately."""
        from notifications.scheduling import run_schedule

        obj = self.get_object()
        result = run_schedule(obj)
        return Response(result)
