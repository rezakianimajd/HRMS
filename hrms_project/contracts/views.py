"""Views for the Contracts module."""
from rest_framework import viewsets, filters, parsers
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
    search_fields = ['name', 'national_id', 'mobile', 'email']
    ordering = ['name']


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

    def get_queryset(self):
        qs = super().get_queryset()
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        return qs


class PaymentViewSet(BaseContractViewSet):
    serializer_class = PaymentSerializer
    queryset = Payment.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        return qs