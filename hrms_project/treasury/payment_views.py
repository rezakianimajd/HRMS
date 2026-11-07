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
from treasury.numbering import allocate_number
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

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        if params.get('status'):
            values = [item for item in params['status'].split(',') if item]
            qs = qs.filter(status__in=values)
        if str(params.get('due_soon') or '').lower() in ('1', 'true'):
            from datetime import date, timedelta

            qs = qs.filter(due_date__lte=date.today() + timedelta(days=7))
        if params.get('date_from'):
            qs = qs.filter(due_date__gte=params['date_from'])
        if params.get('date_to'):
            qs = qs.filter(due_date__lte=params['date_to'])
        return qs

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
    ).prefetch_related('deductions')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'title', 'party__name']
    ordering = ['-requested_date', '-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        st = params.get('status')
        if st:
            values = [item for item in st.split(',') if item]
            qs = qs.filter(status__in=values)
        if params.get('date_from'):
            qs = qs.filter(requested_date__gte=params['date_from'])
        if params.get('date_to'):
            qs = qs.filter(requested_date__lte=params['date_to'])
        if str(params.get('due_soon') or '').lower() in ('1', 'true'):
            from datetime import date, timedelta

            qs = qs.filter(due_date__lte=date.today() + timedelta(days=7))
        return qs

    def create(self, request, *args, **kwargs):
        require(request.user, 'treasury_request')
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        company = _company(self.request)
        number = serializer.validated_data.get('number')
        if not number:
            number = allocate_number(
                'request', company, serializer.validated_data.get('requested_date'),
                PaymentRequest,
            )
        serializer.save(company=company, requester=self.request.user, number=number)

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
        from treasury.approval_models import get_settings, resolve_required_permission

        require(request.user, 'treasury_approve')
        obj = self.get_object()
        settings_obj = get_settings(obj.company)
        if (
            settings_obj.enforce_segregation
            and obj.requester_id
            and obj.requester_id == getattr(request.user, 'id', None)
        ):
            return Response(
                {'error': 'بر اساس تفکیک وظایف، ثبت‌کننده نمی‌تواند تأییدکنندهٔ همان درخواست باشد.'},
                status=400,
            )
        required = resolve_required_permission(
            obj.company, obj.approved_amount or obj.amount,
        )
        if required and required != 'treasury_approve':
            require(request.user, required)
        result = self._transition(request, PaymentRequest.Status.APPROVED)
        approved_amount = request.data.get('approved_amount')
        if approved_amount is not None:
            obj.approved_amount = approved_amount
            obj.save(update_fields=['approved_amount', 'updated_at'])
        return result

    @action(detail=True, methods=['get'])
    def distribution(self, request, pk=None):
        """تفکیک مبلغ: ناخالص، کسورات و مبلغ خالص پرداخت (§۱۹/§۲۰)."""
        obj = self.get_object()
        gross = obj.approved_amount or obj.amount
        return Response({
            'number': obj.number,
            'gross': str(gross),
            'deductions_total': str(obj.deductions_total),
            'net': str(obj.net_amount),
            'lines': obj.deduction_breakdown,
        })

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
    queryset = PaymentOrder.objects.select_related(
        'request', 'request__party', 'request__project', 'request__contract',
        'entity', 'issued_check', 'payment_method', 'accounting_document',
    )
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'request__number', 'request__title',
                     'request__party__name', 'reference', 'tracking_number']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        if params.get('status'):
            values = [item for item in params['status'].split(',') if item]
            qs = qs.filter(status__in=values)
        if params.get('entity'):
            qs = qs.filter(entity_id=params['entity'])
        if params.get('date_from'):
            qs = qs.filter(execution_date__gte=params['date_from'])
        if params.get('date_to'):
            qs = qs.filter(execution_date__lte=params['date_to'])
        return qs

    def create(self, request, *args, **kwargs):
        require(request.user, 'treasury_execute')
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        require(self.request.user, 'treasury_execute')
        company = _company(self.request)
        number = serializer.validated_data.get('number')
        if not number:
            number = allocate_number(
                'order', company, serializer.validated_data.get('execution_date'), PaymentOrder,
            )
        serializer.save(company=company, number=number)

    @action(detail=True, methods=['get'], url_path='print-data')
    def print_data(self, request, pk=None):
        """دادهٔ چاپ «فیش پرداخت وجه» (قالب جای‌نگهدار + بارکد + مبلغ به حروف)."""
        from treasury.print_templates import build_context, get_default_template, render_template
        from treasury.vouchers import build_payment_voucher

        obj = self.get_object()
        payload = build_payment_voucher(obj, request)
        template = get_default_template(obj.company, 'payment')
        payload['html'] = render_template(template, build_context(payload))
        payload['template_id'] = getattr(template, 'id', None)
        payload['template_name'] = getattr(template, 'name', '')
        payload['paper'] = getattr(template, 'paper', 'A5')
        return Response(payload)

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