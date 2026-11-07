"""Views برای عملیات خزانه (فاز ۲): دریافت، علی‌الحساب، انتقال، سپرده/ضمانت‌نامه."""
from datetime import date, timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response

from core.engines.permission_engine import require
from treasury.audit import log_transition
from treasury.numbering import allocate_number
from treasury.operation_models import (
    Receipt, AdvanceAccount, AdvanceSettlement, TreasuryTransfer, TreasuryGuarantee,
)
from treasury.operation_serializers import (
    ReceiptSerializer, AdvanceAccountSerializer, AdvanceSettlementSerializer,
    TreasuryTransferSerializer, TreasuryGuaranteeSerializer,
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


class ReceiptViewSet(BaseViewSet):
    serializer_class = ReceiptSerializer
    queryset = Receipt.objects.select_related(
        'party', 'entity', 'received_check', 'payment_method', 'terminal',
        'project', 'contract', 'cost_center', 'accounting_document',
    )
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'party__name', 'received_from', 'reference_no', 'tracking_no',
                     'bank_reference', 'purpose', 'description', 'entity__name']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        status_param = params.get('status')
        if status_param:
            values = [item for item in status_param.split(',') if item]
            qs = qs.filter(status__in=values)
        if params.get('method'):
            qs = qs.filter(method=params['method'])
        if params.get('entity'):
            qs = qs.filter(entity_id=params['entity'])
        if params.get('date_from'):
            qs = qs.filter(received_date__gte=params['date_from'])
        if params.get('date_to'):
            qs = qs.filter(received_date__lte=params['date_to'])
        return qs

    def perform_create(self, serializer):
        require(self.request.user, 'treasury_execute')
        company = _company(self.request)
        number = serializer.validated_data.get('number')
        if not number:
            number = allocate_number(
                'receipt', company,
                serializer.validated_data.get('received_date')
                or serializer.validated_data.get('expected_date'),
                Receipt,
            )
        serializer.save(company=company, number=number)

    def create(self, request, *args, **kwargs):
        require(request.user, 'treasury_execute')
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=['get'], url_path='print-data')
    def print_data(self, request, pk=None):
        """دادهٔ چاپ «فیش دریافت وجه» (قالب جای‌نگهدار + بارکد + مبلغ به حروف)."""
        from treasury.print_templates import build_context, get_default_template, render_template
        from treasury.vouchers import build_receipt_voucher

        obj = self.get_object()
        payload = build_receipt_voucher(obj, request)
        template = get_default_template(obj.company, 'receipt')
        payload['html'] = render_template(template, build_context(payload))
        payload['template_id'] = getattr(template, 'id', None)
        payload['template_name'] = getattr(template, 'name', '')
        payload['paper'] = getattr(template, 'paper', 'A5')
        return Response(payload)

    @action(detail=True, methods=['post'])
    def receive(self, request, pk=None):
        require(request.user, 'treasury_execute')
        obj = self.get_object()
        if obj.status != 'expected':
            return Response({'error': 'فقط دریافت مورد انتظار قابل انجام است.'}, status=400)
        old = obj.status
        obj.status = 'received'
        obj.received_date = request.data.get('received_date') or timezone.now().date()
        obj.history = [*obj.history, {'step': 'received', 'by': request.user.username, 'at': timezone.now().isoformat()}]
        obj.save()
        log_transition(request.user, obj.company, 'Receipt', obj.id, old, 'received')
        # ثبت در ماندهٔ نهاد
        if obj.entity:
            from treasury.models import TreasuryTransaction
            TreasuryTransaction.objects.create(
                company=obj.company, entity=obj.entity, direction='receipt',
                amount=obj.amount, date=obj.received_date or timezone.now().date(),
                party=obj.party.name if obj.party else '', description=obj.description,
                status='posted', source_module='receipt', source_id=f'receipt-{obj.id}',
            )
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def clear(self, request, pk=None):
        require(request.user, 'treasury_execute')
        obj = self.get_object()
        if obj.status != 'received':
            return Response({'error': 'ابتدا دریافت را انجام دهید.'}, status=400)
        old = obj.status
        obj.status = 'cleared'
        obj.history = [*obj.history, {'step': 'cleared', 'by': request.user.username, 'at': timezone.now().isoformat()}]
        obj.save()
        log_transition(request.user, obj.company, 'Receipt', obj.id, old, 'cleared')
        return Response(self.get_serializer(obj).data)


class AdvanceAccountViewSet(BaseViewSet):
    serializer_class = AdvanceAccountSerializer
    queryset = AdvanceAccount.objects.select_related('party', 'project', 'contract', 'supplier')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'party__name']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        if params.get('status'):
            values = [item for item in params['status'].split(',') if item]
            qs = qs.filter(status__in=values)
        return qs

    def create(self, request, *args, **kwargs):
        require(request.user, 'treasury_execute')
        return super().create(request, *args, **kwargs)


class AdvanceSettlementViewSet(BaseViewSet):
    serializer_class = AdvanceSettlementSerializer
    queryset = AdvanceSettlement.objects.select_related('advance')
    ordering = ['-date', '-created_at']

    def create(self, request, *args, **kwargs):
        require(request.user, 'treasury_execute')
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        obj = serializer.save(company=_company(self.request))
        adv = obj.advance
        settled = adv.settled_amount
        if settled >= float(adv.amount):
            adv.status = AdvanceAccount.Status.SETTLED
        elif settled > 0:
            adv.status = AdvanceAccount.Status.PARTIAL
        adv.save(update_fields=['status', 'updated_at'])


class TreasuryTransferViewSet(BaseViewSet):
    serializer_class = TreasuryTransferSerializer
    queryset = TreasuryTransfer.objects.select_related('source', 'destination')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'description']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        if params.get('status'):
            values = [item for item in params['status'].split(',') if item]
            qs = qs.filter(status__in=values)
        if params.get('entity'):
            qs = qs.filter(
                Q(source_id=params['entity']) | Q(destination_id=params['entity']),
            )
        if params.get('date_from'):
            qs = qs.filter(date__gte=params['date_from'])
        if params.get('date_to'):
            qs = qs.filter(date__lte=params['date_to'])
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
                'transfer', company, serializer.validated_data.get('date'), TreasuryTransfer,
            )
        serializer.save(company=company, number=number)

    @action(detail=True, methods=['get'], url_path='print-data')
    def print_data(self, request, pk=None):
        """دادهٔ چاپ «رسید انتقال بین حساب‌ها» (قالب جای‌نگهدار)."""
        from treasury.print_templates import build_context, get_default_template, render_template
        from treasury.vouchers import build_transfer_voucher

        obj = self.get_object()
        payload = build_transfer_voucher(obj, request)
        template = get_default_template(obj.company, 'transfer')
        payload['html'] = render_template(template, build_context(payload))
        payload['paper'] = getattr(template, 'paper', 'A5')
        return Response(payload)

    @action(detail=True, methods=['post'])
    def post_transfer(self, request, pk=None):
        require(request.user, 'treasury_execute')
        obj = self.get_object()
        if obj.status != 'draft':
            return Response({'error': 'فقط انتقال پیش‌نویس قابل ثبت است.'}, status=400)
        from treasury.vouchers import post_transfer_documents

        old = post_transfer_documents(obj, getattr(request.user, 'username', ''))
        log_transition(request.user, obj.company, 'TreasuryTransfer', obj.id, old, 'posted')
        return Response(self.get_serializer(obj).data)


class TreasuryGuaranteeViewSet(BaseViewSet):
    serializer_class = TreasuryGuaranteeSerializer
    queryset = TreasuryGuarantee.objects.select_related('party', 'contract', 'project')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'issuer', 'beneficiary', 'party__name']
    ordering = ['expiry_date', 'created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        if params.get('status'):
            values = [item for item in params['status'].split(',') if item]
            qs = qs.filter(status__in=values)
        if params.get('kind'):
            qs = qs.filter(kind=params['kind'])
        if str(params.get('expiring') or '').lower() in ('1', 'true'):
            from datetime import date, timedelta

            days = int(params.get('days') or 30)
            qs = qs.filter(
                status='active',
                expiry_date__lte=date.today() + timedelta(days=days),
            )
        return qs

    def create(self, request, *args, **kwargs):
        require(request.user, 'treasury_execute')
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def release(self, request, pk=None):
        require(request.user, 'treasury_approve')
        obj = self.get_object()
        if obj.status != 'active':
            return Response({'error': 'فقط سپرده فعال قابل آزادسازی است.'}, status=400)
        old = obj.status
        obj.status = 'released'
        obj.release_date = request.data.get('release_date') or timezone.now().date()
        obj.save()
        log_transition(request.user, obj.company, 'Guarantee', obj.id, old, 'released')
        return Response(self.get_serializer(obj).data)

    @action(detail=False, methods=['get'])
    def expiring(self, request):
        company = _company(request)
        days = int(request.query_params.get('days', 30))
        threshold = date.today() + timedelta(days=days)
        qs = TreasuryGuarantee.objects.filter(company=company, status='active', expiry_date__lte=threshold)
        return Response(self.get_serializer(qs, many=True).data)