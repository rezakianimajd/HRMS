"""ویوهای فاز ۲ (بخش دوم) — صورتجلسه، گواهی پرداخت و تخصیص هزینهٔ منابع."""
from rest_framework import filters
from rest_framework.decorators import action
from rest_framework.response import Response

from projects import phase2_service
from projects.phase2_models import CostAllocation, MeasurementSheet, PaymentCertificate
from projects.phase2_serializers import (
    CostAllocationSerializer, MeasurementSheetSerializer, PaymentCertificateSerializer,
)
from projects.schedule_views import BaseScheduleViewSet


def _fail(exc):
    return Response({'detail': str(exc)}, status=400)


class MeasurementSheetViewSet(BaseScheduleViewSet):
    serializer_class = MeasurementSheetSerializer
    queryset = MeasurementSheet.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'title']
    ordering = ['-date', '-id']

    def get_queryset(self):
        qs = (
            super().get_queryset()
            .select_related('project', 'contract')
            .prefetch_related('lines', 'certificates')
        )
        params = self.request.query_params
        if params.get('project'):
            qs = qs.filter(project_id=params['project'])
        if params.get('contract'):
            qs = qs.filter(contract_id=params['contract'])
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        return qs

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        sheet = self.get_object()
        try:
            sheet = phase2_service.submit_sheet(sheet, request.user, request.data.get('note') or '')
        except ValueError as exc:
            return _fail(exc)
        return Response(self.get_serializer(sheet).data)

    @action(detail=True, methods=['post'])
    def check(self, request, pk=None):
        """تأیید مشاور."""
        sheet = self.get_object()
        try:
            sheet = phase2_service.check_sheet(sheet, request.user, request.data.get('note') or '')
        except ValueError as exc:
            return _fail(exc)
        return Response(self.get_serializer(sheet).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """تأیید کارفرما."""
        sheet = self.get_object()
        try:
            sheet = phase2_service.approve_sheet(sheet, request.user, request.data.get('note') or '')
        except ValueError as exc:
            return _fail(exc)
        return Response(self.get_serializer(sheet).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        sheet = self.get_object()
        try:
            sheet = phase2_service.reject_sheet(sheet, request.user, request.data.get('note') or '')
        except ValueError as exc:
            return _fail(exc)
        return Response(self.get_serializer(sheet).data)

    @action(detail=True, methods=['post'])
    def certify(self, request, pk=None):
        """صدور گواهی پرداخت از صورتجلسهٔ تأییدشده (و ساخت صورت‌وضعیت قرارداد)."""
        sheet = self.get_object()
        try:
            certificate = phase2_service.create_certificate(
                sheet, request.user, number=request.data.get('number') or None,
            )
        except ValueError as exc:
            return _fail(exc)
        return Response(PaymentCertificateSerializer(certificate).data, status=201)


class PaymentCertificateViewSet(BaseScheduleViewSet):
    serializer_class = PaymentCertificateSerializer
    queryset = PaymentCertificate.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number']
    ordering = ['-date', '-id']

    def get_queryset(self):
        qs = super().get_queryset().select_related('project', 'contract', 'sheet')
        params = self.request.query_params
        if params.get('project'):
            qs = qs.filter(project_id=params['project'])
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        return qs

    @action(detail=True, methods=['post'])
    def issue(self, request, pk=None):
        certificate = self.get_object()
        try:
            certificate = phase2_service.issue_certificate(certificate, request.user)
        except ValueError as exc:
            return _fail(exc)
        return Response(self.get_serializer(certificate).data)

    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        """ثبت پرداخت گواهی (پرداخت قراردادی نیز ساخته می‌شود)."""
        from django.utils.dateparse import parse_date

        certificate = self.get_object()
        try:
            phase2_service.register_certificate_payment(
                certificate,
                request.user,
                amount=request.data.get('amount'),
                date_value=parse_date(request.data.get('date') or ''),
                reference=request.data.get('reference') or '',
                method=request.data.get('method') or '',
            )
        except ValueError as exc:
            return _fail(exc)
        certificate.refresh_from_db()
        return Response(self.get_serializer(certificate).data)


class CostAllocationViewSet(BaseScheduleViewSet):
    serializer_class = CostAllocationSerializer
    queryset = CostAllocation.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'note']
    ordering = ['-date', '-id']

    def get_queryset(self):
        qs = super().get_queryset().select_related('project', 'wbs', 'activity', 'employee', 'resource')
        params = self.request.query_params
        if params.get('project'):
            qs = qs.filter(project_id=params['project'])
        if params.get('kind'):
            qs = qs.filter(kind=params['kind'])
        if params.get('posted') in ('1', 'true', 'True'):
            qs = qs.filter(cost_transaction__isnull=False)
        if params.get('posted') in ('0', 'false', 'False'):
            qs = qs.filter(cost_transaction__isnull=True)
        return qs

    @action(detail=True, methods=['post'])
    def post(self, request, pk=None):
        """تبدیل تخصیص به هزینهٔ واقعی پروژه (تراکنش هزینه)."""
        allocation = self.get_object()
        transaction_obj = phase2_service.post_allocation(allocation, request.user)
        allocation.refresh_from_db()
        return Response({
            'allocation': self.get_serializer(allocation).data,
            'cost_transaction': transaction_obj.id,
            'number': transaction_obj.number,
        })

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """خلاصهٔ تخصیص‌ها به تفکیک نوع (حقوق/تجهیز/مواد)."""
        qs = self.filter_queryset(self.get_queryset())
        by_kind = {}
        posted = 0
        total = 0.0
        for row in qs:
            total += float(row.amount or 0)
            by_kind[row.kind] = round(by_kind.get(row.kind, 0.0) + float(row.amount or 0), 2)
            if row.cost_transaction_id:
                posted += 1
        return Response({
            'count': qs.count(),
            'total': round(total, 2),
            'posted_count': posted,
            'pending_count': qs.count() - posted,
            'by_kind': by_kind,
        })

