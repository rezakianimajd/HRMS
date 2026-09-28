"""Views برای هستهٔ گردش پرداخت خزانه (فاز ۱).

گردشکار با State Machine دقیق + کنترل دسترسی عملیاتی + ردیابی حسابرسی.
حذف فیزیکی انجام نمی‌شود؛ برای اصلاح فقط ابطال/برگشتی.
"""
from django.utils import timezone
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response

from core.engines.permission_engine import require
from treasury.audit import log_transition
from treasury.payment_models import (
    TreasuryPaymentType, TreasuryPaymentMethod,
    PaymentCommitment, PaymentRequest, PaymentOrder,
)
from treasury.payment_serializers import (
    TreasuryPaymentTypeSerializer, TreasuryPaymentMethodSerializer,
    PaymentCommitmentSerializer, PaymentRequestSerializer, PaymentOrderSerializer,
)


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class BaseViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=_company(self.request))


class TreasuryPaymentTypeViewSet(BaseViewSet):
    serializer_class = TreasuryPaymentTypeSerializer
    queryset = TreasuryPaymentType.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name']
    ordering = ['code']

    def create(self, request, *args, **kwargs):
        require(request.user, 'treasury_manage_config')
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        require(request.user, 'treasury_manage_config')
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        require(request.user, 'treasury_manage_config')
        return super().destroy(request, *args, **kwargs)


class TreasuryPaymentMethodViewSet(BaseViewSet):
    serializer_class = TreasuryPaymentMethodSerializer
    queryset = TreasuryPaymentMethod.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name']
    ordering = ['code']

    def create(self, request, *args, **kwargs):
        require(request.user, 'treasury_manage_config')
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        require(request.user, 'treasury_manage_config')
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        require(request.user, 'treasury_manage_config')
        return super().destroy(request, *args, **kwargs)


class PaymentCommitmentViewSet(BaseViewSet):
    serializer_class = PaymentCommitmentSerializer
    queryset = PaymentCommitment.objects.select_related('party', 'project', 'contract')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'title', 'party__name']
    ordering = ['due_date', 'created_at']

    def create(self, request, *args, **kwargs):
        require(request.user, 'treasury_approve')
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        require(request.user, 'treasury_approve')
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        require(request.user, 'treasury_approve')
        obj = self.get_object()
        if obj.status == PaymentCommitment.Status.PAID:
            return Response({'error': 'تعهد تسویه‌شده قابل لغو نیست.'}, status=400)
        old = obj.status
        obj.status = PaymentCommitment.Status.CANCELLED
        obj.save(update_fields=['status', 'updated_at'])
        log_transition(request.user, obj.company, 'PaymentCommitment', obj.id, old, 'cancelled')
        return Response(self.get_serializer(obj).data)


class PaymentRequestViewSet(BaseViewSet):
    serializer_class = PaymentRequestSerializer
    queryset = PaymentRequest.objects.select_related(
        'party', 'project', 'contract', 'supplier', 'payment_type', 'payment_method',
    )
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'title', 'party__name']
    ordering = ['-requested_date', '-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        st = self.request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)
        return qs

    def create(self, request, *args, **kwargs):
        require(request.user, 'treasury_request')
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(company=_company(self.request), requester=self.request.user)

    def _transition(self, request, target):
        obj = self.get_object()
        if not obj.can_transition_to(target):
            return Response(
                {'error': f'گذار از «{obj.get_status_display()}» به «{target}» مجاز نیست.'},
                status=400,
            )
        from_status = obj.status
        obj.status = target
        if target == 'submitted':
            obj.submitted_at = timezone.now()
        if target in ('approved', 'rejected', 'returned'):
            obj.decided_at = timezone.now()
        obj.history = [*obj.history, {'step': target, 'by': request.user.username, 'at': timezone.now().isoformat()}]
        obj.save()
        log_transition(request.user, obj.company, 'PaymentRequest', obj.id, from_status, target)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        require(request.user, 'treasury_request')
        return self._transition(request, PaymentRequest.Status.SUBMITTED)

    @action(detail=True, methods=['post'])
    def under_review(self, request, pk=None):
        require(request.user, 'treasury_approve')
        return self._transition(request, PaymentRequest.Status.UNDER_REVIEW)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        require(request.user, 'treasury_approve')
        obj = self.get_object()
        r = self._transition(request, PaymentRequest.Status.APPROVED)
        approved_amount = request.data.get('approved_amount')
        if approved_amount is not None:
            obj.approved_amount = approved_amount
            obj.save(update_fields=['approved_amount', 'updated_at'])
        return r

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        require(request.user, 'treasury_approve')
        return self._transition(request, PaymentRequest.Status.REJECTED)

    @action(detail=True, methods=['post'])
    def return_(self, request, pk=None):
        require(request.user, 'treasury_approve')
        return self._transition(request, PaymentRequest.Status.RETURNED)

    @action(detail=True, methods=['post'])
    def schedule(self, request, pk=None):
        require(request.user, 'treasury_approve')
        obj = self.get_object()
        if not obj.commitment_id:
            commitment = PaymentCommitment.objects.create(
                company=obj.company,
                title=obj.title,
                party=obj.party,
                project=obj.project,
                contract=obj.contract,
                amount=obj.approved_amount or obj.amount,
                due_date=obj.due_date,
                source_type=obj.source_type,
                source_id=obj.source_id,
            )
            obj.commitment = commitment
            obj.save(update_fields=['commitment', 'updated_at'])
        return self._transition(request, PaymentRequest.Status.SCHEDULED)

    @action(detail=True, methods=['post'])
    def issue_order(self, request, pk=None):
        require(request.user, 'treasury_execute')
        return self._transition(request, PaymentRequest.Status.PAYMENT_ORDERED)

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        require(request.user, 'treasury_execute')
        obj = self.get_object()
        r = self._transition(request, PaymentRequest.Status.PAID)
        if obj.commitment:
            obj.commitment.amount_paid = (obj.commitment.amount_paid or 0) + (obj.approved_amount or obj.amount)
            remaining = float(obj.commitment.amount) - float(obj.commitment.amount_paid)
            obj.commitment.status = PaymentCommitment.Status.PAID if remaining <= 0.001 else PaymentCommitment.Status.PARTIAL
            obj.commitment.save(update_fields=['amount_paid', 'status', 'updated_at'])
        return r

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        require(request.user, 'treasury_request')
        return self._transition(request, PaymentRequest.Status.CANCELLED)


class PaymentOrderViewSet(BaseViewSet):
    serializer_class = PaymentOrderSerializer
    queryset = PaymentOrder.objects.select_related('request', 'entity', 'issued_check')
    ordering = ['-created_at']

    def create(self, request, *args, **kwargs):
        require(request.user, 'treasury_execute')
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def issue(self, request, pk=None):
        require(request.user, 'treasury_execute')
        obj = self.get_object()
        if obj.status != 'draft':
            return Response({'error': 'فقط دستور پیش‌نویس قابل صدور است.'}, status=400)
        from_status = obj.status
        obj.status = 'issued'
        obj.history = [*obj.history, {'step': 'issued', 'by': request.user.username, 'at': timezone.now().isoformat()}]
        obj.save()
        log_transition(request.user, obj.company, 'PaymentOrder', obj.id, from_status, 'issued')
        if obj.request and obj.request.status == PaymentRequest.Status.SCHEDULED:
            obj.request.status = PaymentRequest.Status.PAYMENT_ORDERED
            obj.request.save(update_fields=['status', 'updated_at'])
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        require(request.user, 'treasury_execute')
        obj = self.get_object()
        if obj.status != 'issued':
            return Response({'error': 'فقط دستور صادرشده قابل اجرا است.'}, status=400)
        from_status = obj.status
        obj.status = 'executed'
        obj.execution_date = request.data.get('execution_date') or timezone.now().date()
        obj.reference = request.data.get('reference', obj.reference)
        obj.history = [*obj.history, {'step': 'executed', 'by': request.user.username, 'at': timezone.now().isoformat()}]
        obj.save()
        log_transition(request.user, obj.company, 'PaymentOrder', obj.id, from_status, 'executed', {'reference': obj.reference})
        if obj.request:
            obj.request.status = PaymentRequest.Status.PAID
            obj.request.save(update_fields=['status', 'updated_at'])
            if obj.request.commitment:
                obj.request.commitment.amount_paid = (obj.request.commitment.amount_paid or 0) + (obj.amount or 0)
                rem = float(obj.request.commitment.amount) - float(obj.request.commitment.amount_paid)
                obj.request.commitment.status = PaymentCommitment.Status.PAID if rem <= 0.001 else PaymentCommitment.Status.PARTIAL
                obj.request.commitment.save(update_fields=['amount_paid', 'status', 'updated_at'])
        return Response(self.get_serializer(obj).data)