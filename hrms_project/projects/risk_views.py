"""ویوهای رجیستر ریسک (فاز ۳) — CRUD + ماتریس + KPI + گردش کار وضعیت."""
from django.utils import timezone
from rest_framework import filters
from rest_framework.decorators import action
from rest_framework.response import Response

from projects import risk_engine, risk_service
from projects.risk_models import Risk, RiskAction, RiskCategory, RiskReview
from projects.risk_serializers import (
    RiskActionSerializer, RiskCategorySerializer, RiskReviewSerializer, RiskSerializer,
)
from projects.schedule_views import BaseScheduleViewSet


def _fail(exc):
    return Response({'detail': str(exc)}, status=400)


def _parse_date(value):
    from django.utils.dateparse import parse_date

    return parse_date(value) if value else None


class RiskCategoryViewSet(BaseScheduleViewSet):
    serializer_class = RiskCategorySerializer
    queryset = RiskCategory.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'discipline']
    ordering = ['code']


class RiskViewSet(BaseScheduleViewSet):
    serializer_class = RiskSerializer
    queryset = Risk.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'title', 'description', 'owner_name', 'trigger']
    ordering = ['-score', '-id']

    def get_queryset(self):
        qs = super().get_queryset().select_related(
            'project', 'category', 'wbs', 'activity', 'owner',
        ).prefetch_related('actions', 'reviews')
        params = self.request.query_params
        if params.get('project'):
            qs = qs.filter(project_id=params['project'])
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('level'):
            qs = qs.filter(level=params['level'])
        if params.get('category'):
            qs = qs.filter(category_id=params['category'])
        if params.get('risk_type'):
            qs = qs.filter(risk_type=params['risk_type'])
        if params.get('overdue') in ('1', 'true', 'True'):
            qs = qs.filter(due_date__lt=timezone.localdate()).exclude(status=Risk.Status.CLOSED)
        if params.get('active') in ('1', 'true', 'True'):
            qs = qs.exclude(status=Risk.Status.CLOSED)
        return qs

    @action(detail=False, methods=['get'])
    def matrix(self, request):
        """ماتریس حرارتی ۵×۵ + شاخص‌های کلیدی (بر پایهٔ فیلترهای همان درخواست)."""
        qs = self.filter_queryset(self.get_queryset())
        rows = [risk_engine.risk_row(risk) for risk in qs]
        actions = list(
            RiskAction.objects.filter(risk__in=qs).values('id', 'status', 'due_date', 'cost')
        )
        today = timezone.localdate()
        return Response({
            'matrix': risk_engine.matrix_grid(rows),
            'kpis': risk_engine.risk_kpis(rows, today=today, actions=actions),
        })

    @action(detail=False, methods=['get'])
    def kpis(self, request):
        project_id = request.query_params.get('project')
        if not project_id:
            return Response({'detail': 'شناسهٔ پروژه لازم است.'}, status=400)
        from projects.models import Project

        project = Project.objects.filter(pk=project_id).first()
        if not project:
            return Response({'detail': 'پروژه یافت نشد.'}, status=404)
        return Response(risk_service.project_risk_kpis(project))

    @action(detail=True, methods=['post'])
    def recalculate(self, request, pk=None):
        risk = self.get_object()
        risk_service.recalculate_risk(risk)
        return Response(self.get_serializer(risk).data)

    @action(detail=True, methods=['post'], url_path='set-status')
    def set_status(self, request, pk=None):
        """تغییر وضعیت ریسک (با اعتبارسنجی گذار و ثبت تاریخچه)."""
        risk = self.get_object()
        target = request.data.get('status')
        try:
            risk_service.set_status(
                risk, request.user, target,
                note=request.data.get('note') or '',
                review_date=_parse_date(request.data.get('review_date')),
            )
        except ValueError as exc:
            return _fail(exc)
        return Response(self.get_serializer(risk).data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        risk = self.get_object()
        try:
            risk_service.set_status(
                risk, request.user, Risk.Status.CLOSED, note=request.data.get('note') or '',
            )
        except ValueError as exc:
            return _fail(exc)
        return Response(self.get_serializer(risk).data)

    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        risk = self.get_object()
        try:
            risk_service.set_status(
                risk, request.user, Risk.Status.OPEN, note=request.data.get('note') or '',
            )
        except ValueError as exc:
            return _fail(exc)
        return Response(self.get_serializer(risk).data)

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        """ثبت بازنگری دوره‌ای ریسک."""
        risk = self.get_object()
        data = request.data or {}
        review = risk_service.add_review(
            risk,
            request.user,
            date_value=_parse_date(data.get('date')),
            note=data.get('note') or '',
            probability=data.get('probability') or None,
            impact=data.get('impact') or None,
            residual_probability=data.get('residual_probability') or None,
            residual_impact=data.get('residual_impact') or None,
            next_review_date=_parse_date(data.get('next_review_date')),
        )
        risk.refresh_from_db()
        return Response({
            'review': RiskReviewSerializer(review).data,
            'risk': self.get_serializer(risk).data,
        }, status=201)


class RiskActionViewSet(BaseScheduleViewSet):
    serializer_class = RiskActionSerializer
    queryset = RiskAction.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'owner_name']
    ordering = ['due_date', 'id']

    def get_queryset(self):
        qs = super().get_queryset().select_related('risk', 'risk__project', 'owner')
        params = self.request.query_params
        if params.get('risk'):
            qs = qs.filter(risk_id=params['risk'])
        if params.get('project'):
            qs = qs.filter(risk__project_id=params['project'])
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('overdue') in ('1', 'true', 'True'):
            qs = qs.filter(due_date__lt=timezone.localdate()).exclude(
                status__in=[RiskAction.Status.DONE, RiskAction.Status.CANCELLED],
            )
        return qs

    def create(self, request, *args, **kwargs):
        # `risk` فقط در نوشتن تودرتوی ریسک اختیاری است، نه در این اندپوینت
        if not (request.data or {}).get('risk'):
            return Response({'detail': 'انتخاب ریسک الزامی است.'}, status=400)
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='set-status')
    def set_status(self, request, pk=None):
        action_obj = self.get_object()
        try:
            risk_service.set_action_status(
                action_obj, request.user, request.data.get('status'),
                date_value=_parse_date(request.data.get('date')),
            )
        except ValueError as exc:
            return _fail(exc)
        return Response(self.get_serializer(action_obj).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        action_obj = self.get_object()
        risk_service.complete_action(
            action_obj, request.user, date_value=_parse_date(request.data.get('date')),
        )
        return Response(self.get_serializer(action_obj).data)


class RiskReviewViewSet(BaseScheduleViewSet):
    serializer_class = RiskReviewSerializer
    queryset = RiskReview.objects.all()
    filter_backends = [filters.OrderingFilter]
    ordering = ['-date', '-id']

    def get_queryset(self):
        qs = super().get_queryset().select_related('risk', 'reviewer')
        params = self.request.query_params
        if params.get('risk'):
            qs = qs.filter(risk_id=params['risk'])
        if params.get('project'):
            qs = qs.filter(risk__project_id=params['project'])
        return qs
