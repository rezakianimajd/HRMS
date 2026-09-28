"""Views برای فاز ۳ خزانه: مغایرت، پیش‌بینی جریان نقد و گزارش."""
from datetime import date, timedelta

from django.db.models import Sum
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response

from core.engines.permission_engine import require
from treasury.audit import log_transition
from treasury.models import TreasuryEntity, TreasuryReconciliation
from treasury.payment_models import PaymentCommitment
from treasury.operation_models import Receipt
from treasury.planning_serializers import TreasuryReconciliationSerializer


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class TreasuryReconciliationViewSet(viewsets.ModelViewSet):
    serializer_class = TreasuryReconciliationSerializer
    queryset = TreasuryReconciliation.objects.select_related('entity')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['entity__name']
    ordering = ['-as_of', '-created_at']

    def create(self, request, *args, **kwargs):
        require(request.user, 'treasury_approve')
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save(company=_company(request))
        obj.compute()
        obj.status = 'posted'
        obj.save(update_fields=['book_balance', 'difference', 'status', 'updated_at'])
        log_transition(request.user, obj.company, 'TreasuryReconciliation', obj.id, 'draft', 'posted')
        return Response(self.get_serializer(obj).data, status=201)

    @action(detail=False, methods=['get'])
    def by_entity(self, request):
        require(request.user, 'treasury_view')
        company = _company(request)
        rows = TreasuryReconciliation.objects.filter(company=company, status='posted').order_by('-as_of')[:50]
        return Response(self.get_serializer(rows, many=True).data)


class CashFlowForecastViewSet(viewsets.ViewSet):
    """پیش‌بینی جریان نقد — منابع + دریافت‌های آتی − پرداخت‌های قطعی − تعهدات آتی."""

    def list(self, request):
        require(request.user, 'treasury_view')
        company = _company(request)
        today = date.today()
        horizon = int(request.query_params.get('days', 90))
        future = today + timedelta(days=horizon)

        entities = TreasuryEntity.objects.filter(company=company, is_active=True)
        current_cash = sum(float(e.balance) for e in entities)

        commitments = PaymentCommitment.objects.filter(
            company=company, status__in=['open', 'scheduled', 'partial'],
        )
        scheduled_out = sum(float(c.balance) for c in commitments)

        expected_in = Receipt.objects.filter(company=company, status='expected').aggregate(s=Sum('amount'))['s'] or 0

        forecast_balance = current_cash + float(expected_in) - scheduled_out

        return Response({
            'current_cash': current_cash,
            'expected_in': float(expected_in),
            'scheduled_out': scheduled_out,
            'forecast_balance': forecast_balance,
            'horizon_days': horizon,
        })