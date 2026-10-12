"""ویوهای کیفیت و HSE (فاز ۳ بخش دوم) — CRUD + KPI + گردش کار."""
from django.utils import timezone
from rest_framework import filters
from rest_framework.decorators import action
from rest_framework.response import Response

from projects import quality_service
from projects.quality_models import HSEIncident, Inspection, NCR, PunchItem, QualityPlan, QualityPlanItem
from projects.quality_serializers import (
    HSEIncidentSerializer, InspectionSerializer, NCRSerializer, PunchItemSerializer,
    QualityPlanItemSerializer, QualityPlanSerializer,
)
from projects.schedule_views import BaseScheduleViewSet


def _fail(exc):
    return Response({'detail': str(exc)}, status=400)


def _parse_date(value):
    from django.utils.dateparse import parse_date

    return parse_date(value) if value else None


class QualityPlanViewSet(BaseScheduleViewSet):
    serializer_class = QualityPlanSerializer
    queryset = QualityPlan.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'title', 'description']
    ordering = ['number']

    def get_queryset(self):
        qs = super().get_queryset().select_related('project', 'contract').prefetch_related('items')
        params = self.request.query_params
        if params.get('project'):
            qs = qs.filter(project_id=params['project'])
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        return qs


class QualityPlanItemViewSet(BaseScheduleViewSet):
    serializer_class = QualityPlanItemSerializer
    queryset = QualityPlanItem.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['item_no', 'description', 'reference']
    ordering = ['sort_order', 'item_no']

    def get_queryset(self):
        qs = super().get_queryset().select_related('plan', 'wbs', 'activity')
        params = self.request.query_params
        if params.get('plan'):
            qs = qs.filter(plan_id=params['plan'])
        if params.get('project'):
            qs = qs.filter(plan__project_id=params['project'])
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('point_type'):
            qs = qs.filter(point_type=params['point_type'])
        return qs

    def create(self, request, *args, **kwargs):
        if not (request.data or {}).get('plan'):
            return Response({'detail': 'انتخاب طرح بازرسی الزامی است.'}, status=400)
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='set-status')
    def set_status(self, request, pk=None):
        item = self.get_object()
        try:
            quality_service.set_plan_item_status(item, request.user, request.data.get('status'))
        except ValueError as exc:
            return _fail(exc)
        return Response(self.get_serializer(item).data)


class InspectionViewSet(BaseScheduleViewSet):
    serializer_class = InspectionSerializer
    queryset = Inspection.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'title', 'inspector_name', 'location']
    ordering = ['-date', '-id']

    def get_queryset(self):
        qs = super().get_queryset().select_related(
            'project', 'plan_item', 'plan_item__plan', 'wbs',
        ).prefetch_related('ncrs')
        params = self.request.query_params
        if params.get('project'):
            qs = qs.filter(project_id=params['project'])
        if params.get('plan_item'):
            qs = qs.filter(plan_item_id=params['plan_item'])
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('result'):
            qs = qs.filter(result=params['result'])
        return qs

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """ثبت نتیجهٔ بازرسی (و در صورت رد، ساخت خودکار NCR)."""
        inspection = self.get_object()
        data = request.data or {}
        try:
            inspection, ncr = quality_service.complete_inspection(
                inspection, request.user,
                result=data.get('result'),
                date_value=_parse_date(data.get('date')),
                remarks=data.get('remarks') or '',
                next_inspection_date=_parse_date(data.get('next_inspection_date')),
                create_ncr=bool(data.get('create_ncr')),
                ncr_defaults={
                    'severity': data.get('severity') or None,
                    'due_date': _parse_date(data.get('ncr_due_date')),
                    'responsible_name': data.get('responsible_name') or '',
                },
            )
        except ValueError as exc:
            return _fail(exc)
        payload = {
            'inspection': self.get_serializer(inspection).data,
            'ncr': NCRSerializer(ncr).data if ncr else None,
        }
        return Response(payload, status=201)


class NCRViewSet(BaseScheduleViewSet):
    serializer_class = NCRSerializer
    queryset = NCR.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'title', 'description', 'responsible_name', 'discipline']
    ordering = ['-detected_date', '-id']

    def get_queryset(self):
        qs = super().get_queryset().select_related(
            'project', 'inspection', 'wbs', 'activity', 'responsible',
        ).prefetch_related('punch_items')
        params = self.request.query_params
        if params.get('project'):
            qs = qs.filter(project_id=params['project'])
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('severity'):
            qs = qs.filter(severity=params['severity'])
        if params.get('open') in ('1', 'true', 'True'):
            qs = qs.exclude(status__in=[NCR.Status.CLOSED, NCR.Status.CANCELLED])
        return qs

    @action(detail=True, methods=['post'], url_path='set-status')
    def set_status(self, request, pk=None):
        ncr = self.get_object()
        try:
            quality_service.set_ncr_status(
                ncr, request.user, request.data.get('status'),
                note=request.data.get('note') or '',
                date_value=_parse_date(request.data.get('date')),
            )
        except ValueError as exc:
            return _fail(exc)
        return Response(self.get_serializer(ncr).data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        ncr = self.get_object()
        try:
            quality_service.close_ncr(
                ncr, request.user, note=request.data.get('note') or '',
                date_value=_parse_date(request.data.get('date')),
            )
        except ValueError as exc:
            return _fail(exc)
        return Response(self.get_serializer(ncr).data)


class PunchItemViewSet(BaseScheduleViewSet):
    serializer_class = PunchItemSerializer
    queryset = PunchItem.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'description', 'location', 'discipline', 'responsible_name']
    ordering = ['-id']

    def get_queryset(self):
        qs = super().get_queryset().select_related('project', 'wbs', 'ncr', 'responsible')
        params = self.request.query_params
        if params.get('project'):
            qs = qs.filter(project_id=params['project'])
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('priority'):
            qs = qs.filter(priority=params['priority'])
        if params.get('overdue') in ('1', 'true', 'True'):
            qs = qs.filter(due_date__lt=timezone.localdate()).exclude(
                status__in=[PunchItem.Status.VERIFIED, PunchItem.Status.REJECTED],
            )
        return qs

    @action(detail=True, methods=['post'], url_path='set-status')
    def set_status(self, request, pk=None):
        item = self.get_object()
        try:
            quality_service.set_punch_status(
                item, request.user, request.data.get('status'),
                date_value=_parse_date(request.data.get('date')),
                verified_by_name=request.data.get('verified_by_name') or '',
                note=request.data.get('note') or '',
            )
        except ValueError as exc:
            return _fail(exc)
        return Response(self.get_serializer(item).data)

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        item = self.get_object()
        try:
            quality_service.verify_punch_item(
                item, request.user,
                verified_by_name=request.data.get('verified_by_name') or '',
                date_value=_parse_date(request.data.get('date')),
                note=request.data.get('note') or '',
            )
        except ValueError as exc:
            return _fail(exc)
        return Response(self.get_serializer(item).data)


class HSEIncidentViewSet(BaseScheduleViewSet):
    serializer_class = HSEIncidentSerializer
    queryset = HSEIncident.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'title', 'location', 'involved_persons', 'reported_by_name']
    ordering = ['-date', '-id']

    def get_queryset(self):
        qs = super().get_queryset().select_related('project', 'wbs')
        params = self.request.query_params
        if params.get('project'):
            qs = qs.filter(project_id=params['project'])
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('incident_type'):
            qs = qs.filter(incident_type=params['incident_type'])
        return qs

    @action(detail=True, methods=['post'], url_path='set-status')
    def set_status(self, request, pk=None):
        incident = self.get_object()
        try:
            quality_service.set_hse_status(
                incident, request.user, request.data.get('status'),
                date_value=_parse_date(request.data.get('date')),
                note=request.data.get('note') or '',
            )
        except ValueError as exc:
            return _fail(exc)
        return Response(self.get_serializer(incident).data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        incident = self.get_object()
        try:
            quality_service.close_hse_incident(
                incident, request.user, date_value=_parse_date(request.data.get('date')),
                note=request.data.get('note') or '',
            )
        except ValueError as exc:
            return _fail(exc)
        return Response(self.get_serializer(incident).data)


class QualityKpiViewSet(BaseScheduleViewSet):
    """/api/quality-kpis/?project=ID — شاخص‌های یکجای کیفیت و HSE پروژه."""
    serializer_class = InspectionSerializer
    queryset = Inspection.objects.none()

    def list(self, request):
        from projects.models import Project

        project_id = request.query_params.get('project')
        if not project_id:
            return Response({'detail': 'شناسهٔ پروژه لازم است.'}, status=400)
        project = Project.objects.filter(pk=project_id).first()
        if not project:
            return Response({'detail': 'پروژه یافت نشد.'}, status=404)
        return Response(quality_service.project_quality_kpis(project))
