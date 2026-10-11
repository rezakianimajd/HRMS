"""ویوهای فاز ۲ — تغییرات پروژه (Change Order) با گردش وضعیت و اعمال اثر."""
from rest_framework import filters
from rest_framework.decorators import action
from rest_framework.response import Response

from projects import change_service
from projects.change_models import ChangeOrder
from projects.change_serializers import ChangeOrderSerializer
from projects.schedule_views import BaseScheduleViewSet


class ChangeOrderViewSet(BaseScheduleViewSet):
    """تغییرات پروژه: CRUD + گردش «ارسال → تأیید/رد → اعمال»."""
    serializer_class = ChangeOrderSerializer
    queryset = ChangeOrder.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'title', 'subject']
    ordering = ['-request_date', '-id']

    def get_queryset(self):
        qs = (
            super().get_queryset()
            .select_related('project', 'contract', 'currency')
            .prefetch_related('lines', 'approvals')
        )
        params = self.request.query_params
        if params.get('project'):
            qs = qs.filter(project_id=params['project'])
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('pending') in ('1', 'true', 'True'):
            qs = qs.filter(status=ChangeOrder.Status.SUBMITTED)
        if params.get('applied') in ('1', 'true', 'True'):
            qs = qs.filter(applied=True)
        return qs

    def _fail(self, exc):
        return Response({'detail': str(exc)}, status=400)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """ارسال تغییر برای تأیید."""
        change_order = self.get_object()
        try:
            change_order = change_service.submit(
                change_order, request.user, request.data.get('comment') or '',
            )
        except ValueError as exc:
            return self._fail(exc)
        return Response(self.get_serializer(change_order).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """تأیید تغییر توسط مدیر/کارفرما."""
        change_order = self.get_object()
        try:
            change_order = change_service.decide(
                change_order, request.user, request.data.get('comment') or '', approve=True,
            )
        except ValueError as exc:
            return self._fail(exc)
        return Response(self.get_serializer(change_order).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """رد تغییر با ثبت دلیل."""
        change_order = self.get_object()
        try:
            change_order = change_service.decide(
                change_order, request.user, request.data.get('comment') or '', approve=False,
            )
        except ValueError as exc:
            return self._fail(exc)
        return Response(self.get_serializer(change_order).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        change_order = self.get_object()
        try:
            change_order = change_service.cancel(
                change_order, request.user, request.data.get('comment') or '',
            )
        except ValueError as exc:
            return self._fail(exc)
        return Response(self.get_serializer(change_order).data)

    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        """اعمال تغییر تأییدشده: بودجه، تمدید پایان پروژه و (اختیاری) الحاقیه."""
        change_order = self.get_object()
        create_addendum = request.data.get('create_addendum', True)
        try:
            result = change_service.apply_change_order(
                change_order, request.user, create_addendum=create_addendum in (True, 'true', 'True', 1, '1'),
            )
        except ValueError as exc:
            return self._fail(exc)
        return Response(result)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """خلاصهٔ تغییرات (تعداد و جمع اثر ریالی/زمانی) برای داشبورد."""
        qs = self.filter_queryset(self.get_queryset())
        total_cost = sum(float(row.cost_impact or 0) for row in qs)
        total_days = sum(float(row.time_impact_days or 0) for row in qs)
        by_status = {}
        for row in qs:
            by_status[row.status] = by_status.get(row.status, 0) + 1
        return Response({
            'count': qs.count(),
            'total_cost_impact': round(total_cost, 2),
            'total_time_impact_days': round(total_days, 2),
            'applied_count': qs.filter(applied=True).count(),
            'pending_count': qs.filter(status=ChangeOrder.Status.SUBMITTED).count(),
            'by_status': by_status,
        })
