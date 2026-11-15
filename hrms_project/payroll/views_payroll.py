"""DRF views for the payroll core."""
from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import PermissionDenied
from django.db.models import Q
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.engines.permission_engine import module_action_granted, user_access_record
from payroll import finalization, reporting
from payroll.bank_files import generate_batch, mark_batch_paid
from payroll.defaults import ensure_default_components, ensure_payroll_settings
from payroll.models import (
    EmployeeAdvance, EmployeeLoanInstallment, EmployeePayrollComponent,
    EmployeePayrollProfile, PayrollAccountMapping, PayrollAdjustment, PayrollBankFormat,
    PayrollChangeLog, PayrollComponent, PayrollComponentRule, PayrollCost,
    PayrollCostAllocation, PayrollEmployeeResult, PayrollInsuranceRate, PayrollOvertime,
    PayrollPaymentBatch, PayrollPeriod, PayrollSettlement, PayrollSettings, PayrollTaxBracket,
)
from payroll.serializers_payroll import (
    EmployeeAdvanceSerializer, EmployeeLoanInstallmentSerializer,
    EmployeePayrollComponentSerializer, EmployeePayrollProfileSerializer,
    PayrollAccountMappingSerializer, PayrollAdjustmentSerializer, PayrollBankFormatSerializer,
    PayrollChangeLogSerializer, PayrollComponentRuleSerializer, PayrollComponentSerializer,
    PayrollCostAllocationSerializer, PayrollCostSerializer, PayrollEmployeeResultListSerializer,
    PayrollEmployeeResultSerializer, PayrollInsuranceRateSerializer, PayrollOvertimeSerializer,
    PayrollPaymentBatchSerializer, PayrollPeriodListSerializer, PayrollPeriodSerializer,
    PayrollSettingsSerializer, PayrollSettlementSerializer, PayrollTaxBracketSerializer,
)
from payroll.services import PayrollError, calculate_period, open_period, transition_period


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


def _manager(user):
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_superuser', False):
        return True
    access = user_access_record(user)
    if access is not None and access.is_full_access:
        return True
    profile = getattr(user, 'profile', None)
    if profile is not None and profile.role in {'super_admin', 'hr_manager'}:
        return True
    return (
        module_action_granted(user, 'payroll', ('view', 'create', 'edit', 'approve', 'export'))
        or module_action_granted(user, 'hrms', ('view', 'create', 'edit', 'approve', 'export'))
    )


def _self_employee_id(user):
    profile = getattr(user, 'profile', None)
    return getattr(profile, 'employee_id', None) if profile else None


class PayrollPermissionMixin:
    permission_classes = [IsAuthenticated]
    payroll_self_access = False

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if _manager(request.user):
            return
        if self.payroll_self_access and getattr(self, 'action', None) in ('list', 'retrieve', 'payslip'):
            return
        actions = {
            'list': ('view',), 'retrieve': ('view',), 'options': ('view',),
            'create': ('create',), 'update': ('edit',), 'partial_update': ('edit',),
            'destroy': ('delete',), 'calculate': ('edit',), 'recalculate': ('edit',),
            'review': ('approve',), 'approve': ('approve',), 'post_accounting': ('approve', 'edit'),
            'payment_request': ('approve', 'create'), 'mark_paid': ('approve', 'edit'),
            'close': ('approve',), 'reopen': ('approve', 'edit'), 'results': ('view',),
            'dashboard': ('view',), 'summary': ('view',), 'payslip': ('view',),
            'generate': ('edit',), 'generate_installments': ('edit',),
            'reject': ('approve',), 'download': ('view', 'export'),
        }.get(getattr(self, 'action', ''), ('view',))
        if not (
            module_action_granted(request.user, 'payroll', actions)
            or module_action_granted(request.user, 'hrms', actions)
        ):
            raise PermissionDenied('دسترسی به اطلاعات حقوق و دستمزد مجاز نیست.')


class CompanyScopedQuerysetMixin:
    def scope_company(self, qs):
        company = _company(self.request)
        return qs.filter(company=company) if company else qs

    def perform_create(self, serializer):
        serializer.save(company=_company(self.request))


class PayrollPeriodViewSet(PayrollPermissionMixin, viewsets.ModelViewSet):
    queryset = PayrollPeriod.objects.none()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'notes', 'description']
    ordering_fields = ['year', 'month', 'start_date', 'status', 'net_amount', 'gross_amount']
    ordering = ['-year', '-month', '-id']

    def get_queryset(self):
        qs = PayrollPeriod.objects.select_related('accounting_document', 'payment_request')
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        status_q = self.request.query_params.get('status')
        if status_q:
            qs = qs.filter(status__in=[x for x in status_q.split(',') if x])
        year = self.request.query_params.get('year')
        if year:
            qs = qs.filter(year=year)
        return qs

    def get_serializer_class(self):
        return PayrollPeriodListSerializer if self.action == 'list' else PayrollPeriodSerializer

    def perform_create(self, serializer):
        serializer.save(company=_company(self.request), status=PayrollPeriod.Status.DRAFT)

    def perform_update(self, serializer):
        if self.get_object().status in (PayrollPeriod.Status.PAID, PayrollPeriod.Status.CLOSED):
            raise ValidationError({'detail': 'دورهٔ پرداخت‌شده/بسته‌شده قابل ویرایش نیست.'})
        serializer.save()

    def _run(self, handler):
        period = self.get_object()
        try:
            handler(period, self.request.user, self.request)
        except PayrollError as exc:
            return Response({'detail': exc.message}, status=exc.status)
        period.refresh_from_db()
        return Response(PayrollPeriodSerializer(period, context={'request': self.request}).data)

    @action(detail=True, methods=['post'])
    def calculate(self, request, pk=None):
        return self._run(lambda p, u, r: calculate_period(p, u, r))

    @action(detail=True, methods=['post'])
    def recalculate(self, request, pk=None):
        return self._run(lambda p, u, r: calculate_period(
            p, u, r, recalculate=True, reason=request.data.get('reason', ''),
        ))

    @action(detail=True, methods=['post'])
    def open(self, request, pk=None):
        return self._run(lambda p, u, r: open_period(p, u, r))

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        return self._run(lambda p, u, r: transition_period(
            p, PayrollPeriod.Status.UNDER_REVIEW, u, request=r,
        ))

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        return self._run(lambda p, u, r: transition_period(
            p, PayrollPeriod.Status.APPROVED, u, request=r,
        ))

    @action(detail=True, methods=['post'], url_path='post-accounting')
    def post_accounting(self, request, pk=None):
        return self._run(lambda p, u, r: finalization.post_accounting(p, u, r))

    @action(detail=True, methods=['post'], url_path='payment-request')
    def payment_request(self, request, pk=None):
        return self._run(lambda p, u, r: finalization.create_payment_request(p, u, r))

    @action(detail=True, methods=['post'], url_path='mark-paid')
    def mark_paid(self, request, pk=None):
        return self._run(lambda p, u, r: finalization.mark_paid(
            p, u, r, request.data.get('reference', ''),
        ))

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        return self._run(lambda p, u, r: finalization.close_period(p, u, r))

    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        return self._run(lambda p, u, r: finalization.reopen_period(
            p, u, r, request.data.get('reason', ''),
        ))

    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        period = self.get_object()
        qs = period.results.select_related('employee').prefetch_related('items')
        search = request.query_params.get('search')
        if search:
            qs = qs.filter(employee__first_name__icontains=search) | qs.filter(
                employee__last_name__icontains=search,
            ) | qs.filter(employee__employee_id__icontains=search)
        status_q = request.query_params.get('status')
        if status_q:
            qs = qs.filter(status=status_q)
        page = self.paginate_queryset(qs)
        serializer = PayrollEmployeeResultListSerializer(page if page is not None else qs, many=True)
        return self.get_paginated_response(serializer.data) if page is not None else Response(serializer.data)

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        period = self.get_object()
        return Response({
            'period': PayrollPeriodSerializer(period).data,
            'reconciliation': reporting.reconciliation_payload(period),
            'costs': reporting.cost_summary(period),
        })


class PayrollEmployeeResultViewSet(PayrollPermissionMixin, viewsets.ReadOnlyModelViewSet):
    queryset = PayrollEmployeeResult.objects.none()
    serializer_class = PayrollEmployeeResultSerializer
    payroll_self_access = True
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id']
    ordering_fields = ['employee__employee_id', 'net_amount', 'gross_amount', 'status']
    ordering = ['employee__employee_id']

    def get_serializer_class(self):
        return PayrollEmployeeResultListSerializer if self.action == 'list' else PayrollEmployeeResultSerializer

    def get_queryset(self):
        qs = PayrollEmployeeResult.objects.select_related(
            'employee', 'period', 'cost_center', 'project',
        ).prefetch_related('items')
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        if not _manager(self.request.user):
            employee_id = _self_employee_id(self.request.user)
            if not employee_id:
                return qs.none()
            qs = qs.filter(employee_id=employee_id)
        period = self.request.query_params.get('period')
        if period:
            qs = qs.filter(period_id=period)
        employee = self.request.query_params.get('employee')
        if employee:
            qs = qs.filter(employee_id=employee)
        status_q = self.request.query_params.get('status')
        if status_q:
            qs = qs.filter(status=status_q)
        return qs

    @action(detail=True, methods=['get'])
    def payslip(self, request, pk=None):
        result = self.get_object()
        return Response({
            **PayrollEmployeeResultSerializer(result, context={'request': request}).data,
            'items': result.items.values(
                'id', 'code', 'title', 'kind', 'amount', 'quantity', 'rate',
                'is_insurable', 'is_taxable',
            ),
        })


class PayrollComponentViewSet(PayrollPermissionMixin, viewsets.ModelViewSet):
    queryset = PayrollComponent.objects.none()
    serializer_class = PayrollComponentSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'title', 'description']
    ordering_fields = ['priority', 'code', 'title']
    ordering = ['priority', 'code']

    def get_queryset(self):
        qs = PayrollComponent.objects.all()
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        kind = self.request.query_params.get('kind')
        if kind:
            qs = qs.filter(kind=kind)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=_company(self.request), is_builtin=False)

    @action(detail=False, methods=['get'])
    def options(self, request):
        qs = self.get_queryset().filter(is_active=True).order_by('priority', 'code')
        return Response([
            {
                'id': row.pk, 'code': row.code, 'title': row.title, 'kind': row.kind,
                'category': row.category, 'calc_type': row.calc_type,
            }
            for row in qs
        ])


class PayrollComponentRuleViewSet(PayrollPermissionMixin, viewsets.ModelViewSet):
    queryset = PayrollComponentRule.objects.none()
    serializer_class = PayrollComponentRuleSerializer
    ordering = ['-effective_from']
    filter_backends = [filters.OrderingFilter]

    def get_queryset(self):
        qs = PayrollComponentRule.objects.select_related('component')
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        component = self.request.query_params.get('component')
        if component:
            qs = qs.filter(component_id=component)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=_company(self.request))


class PayrollSettingsViewSet(PayrollPermissionMixin, viewsets.ModelViewSet):
    queryset = PayrollSettings.objects.none()
    serializer_class = PayrollSettingsSerializer
    http_method_names = ['get', 'post', 'patch', 'put', 'head', 'options']

    def get_queryset(self):
        qs = PayrollSettings.objects.all()
        company = _company(self.request)
        return qs.filter(company=company) if company else qs

    def list(self, request, *args, **kwargs):
        company = _company(request)
        ensure_payroll_settings(company)
        ensure_default_components(company)
        row = self.get_queryset().first()
        return Response(self.get_serializer(row).data if row else {})

    def create(self, request, *args, **kwargs):
        company = _company(request)
        row, _ = PayrollSettings.objects.get_or_create(company=company)
        serializer = self.get_serializer(row, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PayrollInsuranceRateViewSet(PayrollPermissionMixin, viewsets.ModelViewSet):
    queryset = PayrollInsuranceRate.objects.none()
    serializer_class = PayrollInsuranceRateSerializer
    ordering = ['-effective_from']

    def get_queryset(self):
        qs = PayrollInsuranceRate.objects.all()
        company = _company(self.request)
        return qs.filter(company=company) if company else qs

    def perform_create(self, serializer):
        serializer.save(company=_company(self.request))


class PayrollCRUDBase(PayrollPermissionMixin, viewsets.ModelViewSet):
    model = None
    serializer_class = None
    ordering = ['-created_at']
    search_fields = []
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

    def get_queryset(self):
        qs = self.model.objects.all()
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=_company(self.request))


class EmployeePayrollProfileViewSet(PayrollCRUDBase):
    model = EmployeePayrollProfile
    serializer_class = EmployeePayrollProfileSerializer
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id']
    ordering = ['employee__employee_id', '-effective_from']

    def get_queryset(self):
        qs = super().get_queryset().select_related('employee', 'default_project', 'default_cost_center')
        employee = self.request.query_params.get('employee')
        return qs.filter(employee_id=employee) if employee else qs


class EmployeePayrollComponentViewSet(PayrollCRUDBase):
    model = EmployeePayrollComponent
    serializer_class = EmployeePayrollComponentSerializer
    ordering = ['employee__employee_id', 'component__priority']

    def get_queryset(self):
        qs = super().get_queryset().select_related('employee', 'component')
        employee = self.request.query_params.get('employee')
        return qs.filter(employee_id=employee) if employee else qs


class PayrollOvertimeViewSet(PayrollCRUDBase):
    model = PayrollOvertime
    serializer_class = PayrollOvertimeSerializer
    ordering = ['-date']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id', 'note']

    def get_queryset(self):
        qs = super().get_queryset().select_related('employee', 'period')
        status_q = self.request.query_params.get('status')
        if status_q:
            qs = qs.filter(status__in=[x for x in status_q.split(',') if x])
        period = self.request.query_params.get('period')
        if period:
            qs = qs.filter(period_id=period)
        employee = self.request.query_params.get('employee')
        return qs.filter(employee_id=employee) if employee else qs

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        from django.utils import timezone

        row = self.get_object()
        row.status = PayrollOvertime.Status.APPROVED
        row.approved_by = request.user
        row.approved_at = timezone.now()
        row.save(update_fields=['status', 'approved_by', 'approved_at', 'updated_at'])
        return Response(self.get_serializer(row).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        row = self.get_object()
        row.status = PayrollOvertime.Status.REJECTED
        row.save(update_fields=['status', 'updated_at'])
        return Response(self.get_serializer(row).data)


class PayrollTaxBracketViewSet(PayrollPermissionMixin, viewsets.ModelViewSet):
    queryset = PayrollTaxBracket.objects.none()
    serializer_class = PayrollTaxBracketSerializer
    ordering = ['effective_from', 'lower_bound']

    def get_queryset(self):
        qs = PayrollTaxBracket.objects.all()
        company = _company(self.request)
        return qs.filter(company=company) if company else qs

    def perform_create(self, serializer):
        serializer.save(company=_company(self.request))


class EmployeeAdvanceViewSet(PayrollCRUDBase):
    model = EmployeeAdvance
    serializer_class = EmployeeAdvanceSerializer
    ordering = ['-date']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id', 'reason']

    def get_queryset(self):
        qs = super().get_queryset().select_related('employee', 'last_deducted_period')
        status_q = self.request.query_params.get('status')
        if status_q:
            qs = qs.filter(status__in=[x for x in status_q.split(',') if x])
        employee = self.request.query_params.get('employee')
        return qs.filter(employee_id=employee) if employee else qs

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        from django.utils import timezone

        row = self.get_object()
        row.status = EmployeeAdvance.Status.APPROVED
        row.approved_by = request.user
        row.approved_at = timezone.now()
        row.remaining_amount = row.remaining_amount or row.amount
        row.save(update_fields=['status', 'approved_by', 'approved_at', 'remaining_amount', 'updated_at'])
        return Response(self.get_serializer(row).data)


class EmployeeLoanInstallmentViewSet(PayrollPermissionMixin, viewsets.ReadOnlyModelViewSet):
    queryset = EmployeeLoanInstallment.objects.none()
    serializer_class = EmployeeLoanInstallmentSerializer

    def get_queryset(self):
        qs = EmployeeLoanInstallment.objects.select_related('loan', 'loan__employee')
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        loan = self.request.query_params.get('loan')
        if loan:
            qs = qs.filter(loan_id=loan)
        employee = self.request.query_params.get('employee')
        if employee:
            qs = qs.filter(loan__employee_id=employee)
        return qs


class PayrollCostAllocationViewSet(PayrollCRUDBase):
    model = PayrollCostAllocation
    serializer_class = PayrollCostAllocationSerializer
    ordering = ['employee__employee_id', '-percentage']

    def get_queryset(self):
        qs = super().get_queryset().select_related('employee', 'project', 'cost_center')
        employee = self.request.query_params.get('employee')
        return qs.filter(employee_id=employee) if employee else qs


class PayrollCostViewSet(PayrollPermissionMixin, viewsets.ReadOnlyModelViewSet):
    queryset = PayrollCost.objects.none()
    serializer_class = PayrollCostSerializer

    def get_queryset(self):
        qs = PayrollCost.objects.select_related('employee', 'project', 'cost_center', 'period')
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        period = self.request.query_params.get('period')
        if period:
            qs = qs.filter(period_id=period)
        project = self.request.query_params.get('project')
        if project:
            qs = qs.filter(project_id=project)
        cost_center = self.request.query_params.get('cost_center')
        return qs.filter(cost_center_id=cost_center) if cost_center else qs


class PayrollAccountMappingViewSet(PayrollCRUDBase):
    model = PayrollAccountMapping
    serializer_class = PayrollAccountMappingSerializer
    ordering = ['code']


class PayrollBankFormatViewSet(PayrollCRUDBase):
    model = PayrollBankFormat
    serializer_class = PayrollBankFormatSerializer
    ordering = ['bank_name', 'code']


class PayrollChangeLogViewSet(PayrollPermissionMixin, viewsets.ReadOnlyModelViewSet):
    queryset = PayrollChangeLog.objects.none()
    serializer_class = PayrollChangeLogSerializer

    def get_queryset(self):
        qs = PayrollChangeLog.objects.select_related('user', 'period')
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        period = self.request.query_params.get('period')
        return qs.filter(period_id=period) if period else qs


class PayrollSettlementViewSet(PayrollCRUDBase):
    model = PayrollSettlement
    serializer_class = PayrollSettlementSerializer
    ordering = ['-date', '-id']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id']

    def get_queryset(self):
        qs = super().get_queryset().select_related('employee', 'accounting_document', 'payment_request')
        employee = self.request.query_params.get('employee')
        return qs.filter(employee_id=employee) if employee else qs

    @action(detail=True, methods=['post'])
    def calculate(self, request, pk=None):
        row = self.get_object()
        try:
            row = finalization.calculate_settlement(row, request.user, request)
        except PayrollError as exc:
            return Response({'detail': exc.message}, status=exc.status)
        return Response(self.get_serializer(row).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        from django.utils import timezone

        row = self.get_object()
        if row.status not in (PayrollSettlement.Status.CALCULATED, PayrollSettlement.Status.DRAFT):
            return Response({'detail': 'وضعیت تسویه برای تأیید مجاز نیست.'}, status=400)
        row.status = PayrollSettlement.Status.APPROVED
        row.approved_by = request.user
        row.approved_at = timezone.now()
        row.save(update_fields=['status', 'approved_by', 'approved_at', 'updated_at'])
        return Response(self.get_serializer(row).data)

    @action(detail=True, methods=['post'], url_path='mark-paid')
    def mark_paid(self, request, pk=None):
        from django.utils import timezone

        row = self.get_object()
        if row.status != PayrollSettlement.Status.APPROVED:
            return Response({'detail': 'تسویه ابتدا باید تأیید شود.'}, status=400)
        row.status = PayrollSettlement.Status.PAID
        row.paid_at = timezone.now()
        row.save(update_fields=['status', 'paid_at', 'updated_at'])
        return Response(self.get_serializer(row).data)


class PayrollAdjustmentViewSet(PayrollCRUDBase):
    model = PayrollAdjustment
    serializer_class = PayrollAdjustmentSerializer
    ordering = ['-created_at']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id', 'title']

    def get_queryset(self):
        qs = super().get_queryset().select_related('employee', 'original_period', 'target_period')
        status_q = self.request.query_params.get('status')
        return qs.filter(status=status_q) if status_q else qs

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        from django.utils import timezone

        row = self.get_object()
        row.status = PayrollAdjustment.Status.APPROVED
        row.approved_by = request.user
        row.approved_at = timezone.now()
        row.save(update_fields=['status', 'approved_by', 'approved_at', 'updated_at'])
        return Response(self.get_serializer(row).data)


class PayrollPaymentBatchViewSet(PayrollPermissionMixin, viewsets.ReadOnlyModelViewSet):
    queryset = PayrollPaymentBatch.objects.none()
    serializer_class = PayrollPaymentBatchSerializer

    def get_queryset(self):
        qs = PayrollPaymentBatch.objects.select_related('period', 'format').prefetch_related('lines')
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        period = self.request.query_params.get('period')
        return qs.filter(period_id=period) if period else qs

    @action(detail=False, methods=['post'])
    def generate(self, request):
        period = PayrollPeriod.objects.filter(
            company=_company(request), pk=request.data.get('period'),
        ).first()
        bank_format = PayrollBankFormat.objects.filter(
            company=_company(request), pk=request.data.get('format'),
        ).first()
        if not period or not bank_format:
            return Response({'detail': 'دوره یا قالب پرداخت یافت نشد.'}, status=404)
        try:
            batch = generate_batch(period, bank_format, request.user, request)
        except PayrollError as exc:
            return Response({'detail': exc.message}, status=exc.status)
        return Response(self.get_serializer(batch).data, status=201)

    @action(detail=True, methods=['post'], url_path='mark-paid')
    def mark_paid(self, request, pk=None):
        batch = self.get_object()
        try:
            batch = mark_batch_paid(batch, request.user, request)
        except PayrollError as exc:
            return Response({'detail': exc.message}, status=exc.status)
        return Response(self.get_serializer(batch).data)


class PayrollDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _manager(request.user):
            raise PermissionDenied('دسترسی به داشبورد حقوق مجاز نیست.')
        return Response(reporting.dashboard_payload(_company(request)))


class PayrollReportsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _manager(request.user):
            raise PermissionDenied('دسترسی به گزارش‌های حقوق مجاز نیست.')
        return Response(reporting.reports_summary(_company(request)))


class PayrollReconciliationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _manager(request.user):
            raise PermissionDenied('دسترسی به گزارش مغایرت مجاز نیست.')
        period = PayrollPeriod.objects.filter(
            company=_company(request), pk=request.query_params.get('period'),
        ).first()
        if not period:
            return Response({'detail': 'دوره یافت نشد.'}, status=404)
        return Response(reporting.reconciliation_payload(period))


class PayrollOptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _manager(request.user):
            raise PermissionDenied('دسترسی به گزینه‌های حقوق مجاز نیست.')
        from accounting.models import Account, CostCenter, Journal
        from employees.models import Employee
        from projects.models import Project
        from treasury.models import TreasuryEntity

        company = _company(request)
        search = (request.query_params.get('search') or '').strip()
        employees = Employee.objects.filter(company=company, is_active=True)
        if search:
            employees = employees.filter(
                Q(first_name__icontains=search) | Q(last_name__icontains=search)
                | Q(employee_id__icontains=search) | Q(national_id__icontains=search)
            )
        employees = employees.select_related('department', 'job_title').order_by('employee_id')[:500]
        projects = Project.objects.filter(company=company).order_by('code')[:500]
        cost_centers = CostCenter.objects.filter(company=company, is_active=True).order_by('code')[:500]
        accounts = Account.objects.filter(company=company, is_active=True, is_postable=True).order_by('code')[:1000]
        journals = Journal.objects.filter(company=company, is_active=True).order_by('code')[:100]
        entities = TreasuryEntity.objects.filter(company=company).order_by('code')[:200]
        components = PayrollComponent.objects.filter(company=company, is_active=True).order_by('priority')[:200]
        formats = PayrollBankFormat.objects.filter(company=company, is_active=True).order_by('code')[:100]
        periods = PayrollPeriod.objects.filter(company=company).order_by('-year', '-month')[:30]
        return Response({
            'employees': [
                {
                    'id': row.pk, 'code': row.employee_id, 'name': row.full_name,
                    'department': getattr(getattr(row, 'department', None), 'name', '') or '',
                    'job_title': getattr(getattr(row, 'job_title', None), 'name', '') or '',
                }
                for row in employees
            ],
            'projects': [
                {'id': row.pk, 'code': row.code, 'name': row.name} for row in projects
            ],
            'cost_centers': [
                {'id': row.pk, 'code': row.code, 'name': row.name} for row in cost_centers
            ],
            'accounts': [
                {'id': row.pk, 'code': row.code, 'name': row.name} for row in accounts
            ],
            'journals': [
                {'id': row.pk, 'code': row.code, 'name': row.name} for row in journals
            ],
            'treasury_entities': [
                {'id': row.pk, 'code': row.code, 'name': row.name} for row in entities
            ],
            'components': [
                {'id': row.pk, 'code': row.code, 'title': row.title, 'kind': row.kind}
                for row in components
            ],
            'bank_formats': [
                {'id': row.pk, 'code': row.code, 'name': row.name, 'bank': row.bank_name}
                for row in formats
            ],
            'periods': [
                {'id': row.pk, 'label': row.label, 'status': row.status} for row in periods
            ],
        })


class PayrollSeedView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not _manager(request.user):
            raise PermissionDenied('دسترسی غیرمجاز.')
        company = _company(request)
        settings = ensure_payroll_settings(company)
        created = ensure_default_components(company)
        return Response({
            'settings_id': settings.pk if settings else None,
            'components_created': len(created),
        })