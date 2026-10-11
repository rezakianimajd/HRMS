"""ویوهای فاز ۱ — زمان‌بندی، منابع و EVM."""
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from projects import audit
from projects.schedule_models import (
    Activity, ActivityProgress, ActivityRelationship, Baseline, BaselineActivity,
    CalendarException, ResourceAssignment, ResourceRate, WorkCalendar,
)
from projects.schedule_serializers import (
    ActivityProgressSerializer, ActivityRelationshipSerializer, ActivitySerializer,
    BaselineItemSerializer, BaselineSerializer, CalendarExceptionSerializer,
    ResourceAssignmentSerializer, ResourceRateSerializer, WorkCalendarSerializer,
)


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class BaseScheduleViewSet(viewsets.ModelViewSet):
    """پایهٔ ویوهای زمان‌بندی: فیلتر شرکت + حسابرسی + حذف نرم (در صورت پشتیبانی مدل)."""

    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        return qs

    def _user(self):
        user = getattr(self.request, 'user', None)
        return user if getattr(user, 'is_authenticated', False) else None

    def perform_create(self, serializer):
        user = self._user()
        model = serializer.Meta.model
        payload = {'company': _company(self.request)}
        if hasattr(model, 'created_by'):
            payload['created_by'] = user
        if hasattr(model, 'updated_by'):
            payload['updated_by'] = user
        instance = serializer.save(**payload)
        audit.log_object(user, instance, 'CREATE')

    def perform_update(self, serializer):
        user = self._user()
        model = serializer.Meta.model
        before = audit._snapshot(serializer.instance)
        payload = {'updated_by': user} if hasattr(model, 'updated_by') else {}
        instance = serializer.save(**payload)
        audit.log_object(user, instance, 'UPDATE', changes=audit.diff(before, audit._snapshot(instance)))

    def perform_destroy(self, instance):
        user = self._user()
        audit.log_object(user, instance, 'DELETE',
                         description=f'حذف {instance.__class__.__name__} #{instance.pk}')
        instance.delete()


class WorkCalendarViewSet(BaseScheduleViewSet):
    serializer_class = WorkCalendarSerializer
    queryset = WorkCalendar.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code']
    ordering = ['-is_default', 'name']

    def get_queryset(self):
        qs = super().get_queryset().select_related('project')
        project = self.request.query_params.get('project')
        if project:
            qs = qs.filter(project_id=project)
        elif self.request.query_params.get('with_company') in ('1', 'true', 'True'):
            qs = qs.filter(project__isnull=True)
        return qs


class CalendarExceptionViewSet(BaseScheduleViewSet):
    serializer_class = CalendarExceptionSerializer
    queryset = CalendarException.objects.all()
    ordering = ['date']

    def get_queryset(self):
        qs = super().get_queryset()
        calendar = self.request.query_params.get('calendar')
        if calendar:
            qs = qs.filter(calendar_id=calendar)
        return qs


class ActivityViewSet(BaseScheduleViewSet):
    serializer_class = ActivitySerializer
    queryset = Activity.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name']
    ordering = ['sequence', 'code']

    def get_queryset(self):
        qs = super().get_queryset().select_related('wbs', 'calendar')
        params = self.request.query_params
        if params.get('project'):
            qs = qs.filter(project_id=params['project'])
        if params.get('wbs'):
            qs = qs.filter(wbs_id=params['wbs'])
        if params.get('activity_type'):
            qs = qs.filter(activity_type=params['activity_type'])
        if params.get('is_critical') in ('1', 'true', 'True'):
            qs = qs.filter(is_critical=True)
        return qs

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """تاریخچهٔ پیشرفت یک فعالیت."""
        rows = ActivityProgress.objects.filter(activity_id=pk).order_by('date')
        return Response(ActivityProgressSerializer(rows, many=True).data)

    @action(detail=True, methods=['post'], url_path='add-progress')
    def add_progress(self, request, pk=None):
        """ثبت گزارش پیشرفت فعالیت و به‌روزرسانی درصد پیشرفت جاری."""
        activity = self.get_object()
        serializer = ActivityProgressSerializer(
            data={**request.data, 'activity': activity.id},
        )
        serializer.is_valid(raise_exception=True)
        entry = serializer.save(company=_company(request))
        if float(entry.percent_complete or 0) >= float(activity.percent_complete or 0):
            activity.percent_complete = entry.percent_complete
            activity.save(update_fields=['percent_complete'])
        return Response(ActivityProgressSerializer(entry).data, status=201)


class ActivityRelationshipViewSet(BaseScheduleViewSet):
    serializer_class = ActivityRelationshipSerializer
    queryset = ActivityRelationship.objects.all()
    ordering = ['project', 'predecessor', 'successor']

    def get_queryset(self):
        qs = super().get_queryset().select_related('predecessor', 'successor')
        project = self.request.query_params.get('project')
        if project:
            qs = qs.filter(project_id=project)
        return qs


class BaselineViewSet(BaseScheduleViewSet):
    serializer_class = BaselineSerializer
    queryset = Baseline.objects.all()
    ordering = ['-version']

    def get_queryset(self):
        qs = super().get_queryset().select_related('project')
        project = self.request.query_params.get('project')
        if project:
            qs = qs.filter(project_id=project)
        if self.request.query_params.get('current') in ('1', 'true', 'True'):
            qs = qs.filter(is_current=True)
        return qs

    @action(detail=True, methods=['get'])
    def items(self, request, pk=None):
        rows = BaselineActivity.objects.filter(baseline_id=pk).order_by('code')
        return Response(BaselineItemSerializer(rows, many=True).data)


class ResourceRateViewSet(BaseScheduleViewSet):
    serializer_class = ResourceRateSerializer
    queryset = ResourceRate.objects.all()
    ordering = ['resource', '-effective_from']

    def get_queryset(self):
        qs = super().get_queryset().select_related('resource', 'currency')
        resource = self.request.query_params.get('resource')
        if resource:
            qs = qs.filter(resource_id=resource)
        return qs


class ResourceAssignmentViewSet(BaseScheduleViewSet):
    serializer_class = ResourceAssignmentSerializer
    queryset = ResourceAssignment.objects.all()
    ordering = ['activity', 'resource']

    def get_queryset(self):
        qs = super().get_queryset().select_related('activity', 'resource')
        params = self.request.query_params
        if params.get('activity'):
            qs = qs.filter(activity_id=params['activity'])
        if params.get('project'):
            qs = qs.filter(activity__project_id=params['project'])
        if params.get('resource'):
            qs = qs.filter(resource_id=params['resource'])
        return qs

    @action(detail=True, methods=['post'], url_path='apply-rate')
    def apply_rate(self, request, pk=None):
        """پرکردن نرخ واحد از «نرخ مؤثرمورخ» منبع و محاسبهٔ هزینهٔ برنامه‌ای."""
        assignment = self.get_object()
        activity = assignment.activity
        project = activity.project
        ref_date = activity.early_start or activity.constraint_date or project.start_date

        rate = None
        if ref_date:
            rate = (
                ResourceRate.objects
                .filter(resource_id=assignment.resource_id, effective_from__lte=ref_date)
                .order_by('-effective_from').first()
            )
        if rate is None:
            rate = (
                ResourceRate.objects
                .filter(resource_id=assignment.resource_id)
                .order_by('-effective_from').first()
            )
        if rate is None:
            return Response({'detail': 'برای این منبع هیچ نرخی ثبت نشده است.'}, status=400)

        duration = float(activity.duration_days or 0)
        quantity = float(assignment.planned_qty or 0) or (
            float(assignment.units_per_day or 0) * duration
        )
        assignment.unit_rate = rate.rate
        assignment.planned_qty = quantity
        assignment.planned_cost = round(quantity * float(rate.rate or 0), 2)
        assignment.save(update_fields=['unit_rate', 'planned_qty', 'planned_cost'])

        # به‌روزرسانی هزینهٔ برنامه‌ای فعالیت از جمع تخصیص‌ها
        total = sum(
            float(row.planned_cost or 0)
            for row in ResourceAssignment.objects.filter(activity=activity)
        )
        if total > 0:
            activity.planned_cost = round(total, 2)
            activity.save(update_fields=['planned_cost'])

        return Response(ResourceAssignmentSerializer(assignment).data)


class ActivityProgressViewSet(BaseScheduleViewSet):
    serializer_class = ActivityProgressSerializer
    queryset = ActivityProgress.objects.all()
    ordering = ['activity', 'date']

    def get_queryset(self):
        qs = super().get_queryset().select_related('activity')
        params = self.request.query_params
        if params.get('activity'):
            qs = qs.filter(activity_id=params['activity'])
        if params.get('project'):
            qs = qs.filter(activity__project_id=params['project'])
        return qs

