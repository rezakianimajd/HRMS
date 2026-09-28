"""Views for the Treasury (خزانه‌داری) module."""
from decimal import Decimal
from django.db.models import Sum
from django.utils import timezone
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response

from treasury.models import (
    TreasuryEntity, TreasuryTransaction, PayableItem,
    CheckBook, ReceivedCheck, IssuedCheck,
)
from treasury.serializers import (
    TreasuryEntitySerializer, TreasuryTransactionSerializer, PayableItemSerializer,
    CheckBookSerializer, ReceivedCheckSerializer, IssuedCheckSerializer,
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


class TreasuryEntityViewSet(BaseViewSet):
    serializer_class = TreasuryEntitySerializer
    queryset = TreasuryEntity.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name', 'account_number', 'sheba_number']
    ordering = ['code']


class TreasuryTransactionViewSet(BaseViewSet):
    serializer_class = TreasuryTransactionSerializer
    queryset = TreasuryTransaction.objects.select_related('entity')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'party', 'description']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        direction = self.request.query_params.get('direction')
        if direction:
            qs = qs.filter(direction=direction)
        entity = self.request.query_params.get('entity')
        if entity:
            qs = qs.filter(entity_id=entity)
        return qs

    @action(detail=True, methods=['post'])
    def post_transaction(self, request, pk=None):
        obj = self.get_object()
        if obj.status != 'draft':
            return Response({'error': 'این تراکنش قبلاً ثبت شده است.'}, status=400)
        obj.status = 'posted'
        obj.history = [*obj.history, {'step': 'posted', 'by': request.user.username, 'at': timezone.now().isoformat()}]
        obj.save()

        if obj.direction == 'payment' and obj.source_module and obj.source_id:
            payable = PayableItem.objects.filter(
                company=obj.company,
                source_type=obj.source_module,
                source_id=str(obj.source_id),
            ).first()
            if payable:
                payable.paid = (payable.paid or Decimal('0')) + (obj.amount or Decimal('0'))
                if float(payable.paid) >= float(payable.amount):
                    payable.is_paid = True
                payable.save(update_fields=['paid', 'is_paid', 'updated_at'])

        return Response(self.get_serializer(obj).data)


class PayableItemViewSet(BaseViewSet):
    serializer_class = PayableItemSerializer
    queryset = PayableItem.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'party']
    ordering = ['due_date', 'created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        is_paid = self.request.query_params.get('is_paid')
        if is_paid is not None:
            qs = qs.filter(is_paid=(is_paid.lower() == 'true'))
        return qs

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        company = _company(request)
        pending = PayableItem.objects.filter(company=company, is_paid=False)
        total_payable = pending.aggregate(s=Sum('amount'))['s'] or Decimal('0')
        total_paid = pending.aggregate(s=Sum('paid'))['s'] or Decimal('0')
        open_count = pending.count()
        entities = TreasuryEntity.objects.filter(company=company, is_active=True)
        total_cash = sum(float(e.balance) for e in entities)
        return Response({
            'total_payable': float(total_payable),
            'total_paid': float(total_paid),
            'outstanding': float(total_payable) - float(total_paid),
            'open_count': open_count,
            'total_cash': total_cash,
        })

    @action(detail=False, methods=['post'])
    def sync_payables(self, request):
        company = _company(request)
        imported = 0

        try:
            from procurement.models import PurchaseInvoice
            for inv in PurchaseInvoice.objects.filter(company=company, status__in=['submitted', 'approved']):
                if float(inv.balance) <= 0:
                    continue
                PayableItem.objects.update_or_create(
                    company=company,
                    source_type=PayableItem.SourceType.PURCHASE_INVOICE,
                    source_id=str(inv.id),
                    defaults={
                        'title': f'صورتحساب خرید {inv.number or inv.id}',
                        'party': inv.supplier.name if inv.supplier else '',
                        'amount': inv.balance,
                        'paid': float(inv.paid_amount or 0),
                        'due_date': inv.due_date or inv.date,
                    },
                )
                imported += 1
        except Exception:
            pass

        try:
            from payroll.models import SalaryRecord
            for sal in SalaryRecord.objects.filter(company=company, net_payable__gt=0):
                PayableItem.objects.update_or_create(
                    company=company,
                    source_type=PayableItem.SourceType.SALARY,
                    source_id=str(sal.id),
                    defaults={
                        'title': f'حقوق {sal.year}/{sal.month}',
                        'party': getattr(sal.employee, 'full_name', '') if sal.employee else '',
                        'amount': sal.net_payable,
                        'paid': 0,
                        'due_date': None,
                    },
                )
                imported += 1
        except Exception:
            pass

        try:
            from contracts.models import Invoice as ContractInvoice
            for inv in ContractInvoice.objects.filter(company=company, is_paid=False):
                amount = getattr(inv, 'total', None) or getattr(inv, 'amount', 0)
                PayableItem.objects.update_or_create(
                    company=company,
                    source_type=PayableItem.SourceType.CONTRACT_INVOICE,
                    source_id=str(inv.id),
                    defaults={
                        'title': f'فاکتور قرارداد {getattr(inv, "number", "") or inv.id}',
                        'party': inv.contract.party.name if getattr(inv, 'contract', None) and inv.contract.party else '',
                        'amount': amount,
                        'paid': 0,
                        'due_date': None,
                    },
                )
                imported += 1
        except Exception:
            pass

        try:
            from projects.cost_models import ProgressStatement
            for st in ProgressStatement.objects.filter(company=company, is_approved=False):
                PayableItem.objects.update_or_create(
                    company=company,
                    source_type=PayableItem.SourceType.PROJECT_STATEMENT,
                    source_id=str(st.id),
                    defaults={
                        'title': f'صورت‌وضعیت {st.number or st.id}',
                        'party': st.contract.party.name if getattr(st, 'contract', None) and st.contract.party else '',
                        'amount': st.net_payable,
                        'paid': 0,
                        'due_date': None,
                    },
                )
                imported += 1
        except Exception:
            pass

        return Response({'imported': imported})


class CheckBookViewSet(BaseViewSet):
    serializer_class = CheckBookSerializer
    queryset = CheckBook.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'bank_name', 'account_number']
    ordering = ['code']


class ReceivedCheckViewSet(BaseViewSet):
    serializer_class = ReceivedCheckSerializer
    queryset = ReceivedCheck.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'bank_name', 'party']
    ordering = ['-due_date', '-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs

    @action(detail=True, methods=['post'])
    def deposit(self, request, pk=None):
        obj = self.get_object()
        if obj.status != 'registered':
            return Response({'error': 'فقط چک ثبت‌شده قابل واریز است.'}, status=400)
        obj.status = 'deposited'
        obj.history = [*obj.history, {'step': 'deposited', 'by': request.user.username, 'at': timezone.now().isoformat()}]
        obj.save()
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def clear(self, request, pk=None):
        obj = self.get_object()
        if obj.status != 'deposited':
            return Response({'error': 'ابتدا چک را واریز کنید.'}, status=400)
        obj.status = 'cleared'
        obj.history = [*obj.history, {'step': 'cleared', 'by': request.user.username, 'at': timezone.now().isoformat()}]
        obj.save()
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def bounce(self, request, pk=None):
        obj = self.get_object()
        if obj.status not in ('deposited', 'cleared'):
            return Response({'error': 'وضعیت چک قابل برگشت نیست.'}, status=400)
        obj.status = 'bounced'
        obj.history = [*obj.history, {'step': 'bounced', 'by': request.user.username, 'at': timezone.now().isoformat()}]
        obj.save()
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def endorse(self, request, pk=None):
        obj = self.get_object()
        if obj.status not in ('registered', 'deposited'):
            return Response({'error': 'وضعیت چک قابل ظهرنویسی نیست.'}, status=400)
        obj.status = 'endorsed'
        obj.endorsed_to = request.data.get('endorsed_to', obj.endorsed_to)
        obj.history = [*obj.history, {'step': 'endorsed', 'by': request.user.username, 'at': timezone.now().isoformat()}]
        obj.save()
        return Response(self.get_serializer(obj).data)


class IssuedCheckViewSet(BaseViewSet):
    serializer_class = IssuedCheckSerializer
    queryset = IssuedCheck.objects.select_related('checkbook')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'party', 'checkbook__bank_name']
    ordering = ['-due_date', '-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs

    @action(detail=True, methods=['post'])
    def issue(self, request, pk=None):
        obj = self.get_object()
        if obj.status != 'draft':
            return Response({'error': 'فقط چک پیش‌نویس قابل صدور است.'}, status=400)
        obj.status = 'issued'
        obj.history = [*obj.history, {'step': 'issued', 'by': request.user.username, 'at': timezone.now().isoformat()}]
        obj.save()
        if obj.checkbook:
            obj.checkbook.used_leaves = (obj.checkbook.used_leaves or 0) + 1
            obj.checkbook.save(update_fields=['used_leaves', 'updated_at'])
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def clear(self, request, pk=None):
        obj = self.get_object()
        if obj.status != 'issued':
            return Response({'error': 'فقط چک صادرشده قابل پاس است.'}, status=400)
        obj.status = 'cleared'
        obj.history = [*obj.history, {'step': 'cleared', 'by': request.user.username, 'at': timezone.now().isoformat()}]
        obj.save()
        return Response(self.get_serializer(obj).data)
