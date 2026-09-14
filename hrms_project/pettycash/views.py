"""Views for the Petty Cash module."""
from django.utils import timezone
from rest_framework import viewsets, filters, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from pettycash.models import PettyCashFund, PettyCashTransaction, PettyCashCategory
from pettycash.serializers import (
    PettyCashFundSerializer, PettyCashTransactionSerializer, PettyCashCategorySerializer,
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


class PettyCashCategoryViewSet(BaseViewSet):
    serializer_class = PettyCashCategorySerializer
    queryset = PettyCashCategory.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code']
    ordering = ['name']


class PettyCashFundViewSet(BaseViewSet):
    serializer_class = PettyCashFundSerializer
    queryset = PettyCashFund.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'title', 'custodian__first_name', 'custodian__last_name']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset().select_related('custodian')
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        obj = self.get_object()
        obj.status = 'archived'
        obj.archived_at = timezone.now()
        obj.save(update_fields=['status', 'archived_at', 'updated_at'])
        return Response(PettyCashFundSerializer(obj).data)

    @action(detail=True, methods=['get'])
    def ledger(self, request, pk=None):
        """دفتر حساب: خلاصهٔ تراکنش‌ها و مانده."""
        obj = self.get_object()
        txs = obj.transactions.order_by('date', 'created_at')
        from django.db.models import Sum
        credits = obj.transactions.filter(entry_type='credit').aggregate(s=Sum('amount'))['s'] or 0
        debits = obj.transactions.filter(entry_type='debit').aggregate(s=Sum('amount'))['s'] or 0
        return Response({
            'fund': PettyCashFundSerializer(obj).data,
            'opening_balance': obj.opening_balance,
            'total_credits': credits,
            'total_debits': debits,
            'balance': obj.balance,
            'transactions': PettyCashTransactionSerializer(txs, many=True, context={'request': request}).data,
        })


class PettyCashTransactionViewSet(BaseViewSet):
    serializer_class = PettyCashTransactionSerializer
    queryset = PettyCashTransaction.objects.all()
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        qs = super().get_queryset().select_related('fund', 'category')
        fund_id = self.request.query_params.get('fund')
        if fund_id:
            qs = qs.filter(fund_id=fund_id)
        entry_type = self.request.query_params.get('entry_type')
        if entry_type:
            qs = qs.filter(entry_type=entry_type)
        return qs

    @action(detail=True, methods=['post'])
    def toggle_archive(self, request, pk=None):
        obj = self.get_object()
        obj.is_archived = not obj.is_archived
        obj.archived_at = timezone.now() if obj.is_archived else None
        obj.save(update_fields=['is_archived', 'archived_at', 'updated_at'])
        return Response(PettyCashTransactionSerializer(obj).data)
