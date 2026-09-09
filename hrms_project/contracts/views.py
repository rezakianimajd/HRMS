"""Views for the Contracts module."""
from rest_framework import viewsets, filters, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from contracts.models import (
    ContractParty, Contract, ContractDocument, Invoice, Statement,
    Addendum, Guarantee, Payment,
)
from contracts.serializers import (
    ContractPartySerializer, ContractSerializer, ContractDocumentSerializer,
    InvoiceSerializer, StatementSerializer, AddendumSerializer,
    GuaranteeSerializer, PaymentSerializer,
)


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class BaseContractViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        return qs

    def perform_create(self, serializer):
        company = _company(self.request)
        serializer.save(company=company)


class ContractPartyViewSet(BaseContractViewSet):
    serializer_class = ContractPartySerializer
    queryset = ContractParty.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'national_id', 'mobile', 'email', 'economic_code', 'registration_number']
    ordering = ['name']

    def get_queryset(self):
        qs = super().get_queryset()
        party_type = self.request.query_params.get('party_type')
        if party_type:
            qs = qs.filter(party_type=party_type)
        return qs

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """Return a party's contracts and aggregated financial figures."""
        from django.db.models import Sum, Count
        party = self.get_object()
        contracts = party.contracts.all()
        total_amount = contracts.aggregate(s=Sum('amount'))['s'] or 0
        active_count = contracts.filter(status='active').count()
        stats = {
            'contracts_count': contracts.count(),
            'active_count': active_count,
            'total_amount': total_amount,
            'contracts': ContractSerializer(contracts, many=True).data,
        }
        return Response(stats)

    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """Enable/disable a party (soft)."""
        party = self.get_object()
        party.is_active = not party.is_active
        party.save(update_fields=['is_active', 'updated_at'])
        return Response(ContractPartySerializer(party).data)


class ContractViewSet(BaseContractViewSet):
    serializer_class = ContractSerializer
    queryset = Contract.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'subject', 'party__name']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset().select_related('party', 'signatory').prefetch_related(
            'documents', 'invoices', 'statements', 'addendums', 'guarantees', 'payments',
        )
        party_id = self.request.query_params.get('party')
        if party_id:
            qs = qs.filter(party_id=party_id)
        contract_type = self.request.query_params.get('contract_type')
        if contract_type:
            qs = qs.filter(contract_type=contract_type)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs


class ContractDocumentViewSet(BaseContractViewSet):
    serializer_class = ContractDocumentSerializer
    queryset = ContractDocument.objects.all()
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_queryset(self):
        qs = super().get_queryset()
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        return qs


class InvoiceViewSet(BaseContractViewSet):
    serializer_class = InvoiceSerializer
    queryset = Invoice.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number']

    def get_queryset(self):
        qs = super().get_queryset()
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        return qs


class StatementViewSet(BaseContractViewSet):
    serializer_class = StatementSerializer
    queryset = Statement.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        return qs


class AddendumViewSet(BaseContractViewSet):
    serializer_class = AddendumSerializer
    queryset = Addendum.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        return qs


class GuaranteeViewSet(BaseContractViewSet):
    serializer_class = GuaranteeSerializer
    queryset = Guarantee.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'bank', 'contract__subject']
    ordering = ['-expiry_date']

    def get_queryset(self):
        qs = super().get_queryset().select_related('contract', 'contract__party')
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        guarantee_type = self.request.query_params.get('guarantee_type')
        if guarantee_type:
            qs = qs.filter(guarantee_type=guarantee_type)
        only_active = self.request.query_params.get('active')
        if only_active in ('true', '1'):
            qs = qs.filter(is_released=False)
        return qs

    @action(detail=True, methods=['post'])
    def release(self, request, pk=None):
        """Release a guarantee and record the release date."""
        from django.utils import timezone
        from datetime import date
        obj = self.get_object()
        obj.is_released = True
        obj.release_date = request.data.get('release_date') or date.today().isoformat()
        obj.save(update_fields=['is_released', 'release_date', 'updated_at'])
        return Response(GuaranteeSerializer(obj, context={'request': request}).data)


class PaymentViewSet(BaseContractViewSet):
    serializer_class = PaymentSerializer
    queryset = Payment.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        return qs