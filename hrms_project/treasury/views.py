"""Views for the Treasury (خزانه‌داری) module."""
from datetime import date as date_cls, timedelta
from decimal import Decimal

from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from core.engines.permission_engine import require
from treasury.audit import log_transition
from treasury.guards import (
    TreasuryGuardError, balance_decision, ensure_amount, ensure_entity_direction,
)
from treasury.models import (
    TreasuryEntity, TreasuryTransaction, PayableItem,
    CheckBook, ReceivedCheck, IssuedCheck,
)
from treasury.numbering import allocate_number
from contracts.numbering import display_statement_title
from treasury.serializers import (
    TreasuryEntitySerializer, TreasuryTransactionSerializer, PayableItemSerializer,
    CheckBookSerializer, ReceivedCheckSerializer, IssuedCheckSerializer,
)

OPEN_RECEIVED_CHECK_STATUSES = (
    ReceivedCheck.Status.REGISTERED, ReceivedCheck.Status.IN_CUSTODY,
    ReceivedCheck.Status.DEPOSITED, ReceivedCheck.Status.CLEARING,
    ReceivedCheck.Status.GUARANTEE_HELD,
)
OPEN_ISSUED_CHECK_STATUSES = (
    IssuedCheck.Status.DRAFT, IssuedCheck.Status.ISSUED, IssuedCheck.Status.DELIVERED,
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
    queryset = TreasuryEntity.objects.select_related(
        'bank', 'branch', 'responsible', 'project', 'cost_center', 'account',
    )
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name', 'account_number', 'sheba_number', 'card_number',
                     'bank__name', 'branch_name']
    ordering = ['code']

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        entity_type = params.get('entity_type')
        if entity_type:
            qs = qs.filter(entity_type=entity_type)
        if str(params.get('active') or '').lower() in ('1', 'true'):
            qs = qs.filter(is_active=True)
        if params.get('currency'):
            qs = qs.filter(currency=params['currency'])
        return qs

    def create(self, request, *args, **kwargs):
        require(request.user, 'treasury_manage_config')
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        require(request.user, 'treasury_manage_config')
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """نهاد پولی حذف فیزیکی نمی‌شود؛ فقط غیرفعال."""
        require(request.user, 'treasury_manage_config')
        obj = self.get_object()
        obj.is_active = False
        obj.save(update_fields=['is_active', 'updated_at'])
        return Response(self.get_serializer(obj).data)

    @action(detail=False, methods=['get'])
    def balances(self, request):
        """ماندهٔ لحظه‌ای همهٔ بانک‌ها/صندوق‌ها (یک کوئری تجمیعی)."""
        company = _company(request)
        rows = list(TreasuryEntity.objects.filter(company=company).values(
            'id', 'code', 'name', 'entity_type', 'initial_balance', 'currency',
            'is_active', 'min_balance', 'max_balance', 'payment_limit',
        ))
        totals = TreasuryTransaction.objects.filter(
            company=company, status='posted',
        ).values('entity_id', 'direction').annotate(total=Sum('amount'))
        index = {}
        for row in totals:
            entry = index.setdefault(row['entity_id'], {'receipt': Decimal('0'), 'payment': Decimal('0')})
            entry[row['direction']] = row['total'] or Decimal('0')
        for row in rows:
            entry = index.get(row['id'], {'receipt': Decimal('0'), 'payment': Decimal('0')})
            row['balance'] = (row['initial_balance'] or Decimal('0')) + entry['receipt'] - entry['payment']
            row['receipts'] = entry['receipt']
            row['payments'] = entry['payment']
        return Response(rows)


class TreasuryTransactionViewSet(BaseViewSet):
    serializer_class = TreasuryTransactionSerializer
    queryset = TreasuryTransaction.objects.select_related('entity', 'accounting_document')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'party', 'description', 'reference_no', 'tracking_no',
                     'entity__name', 'entity__code', 'source_module']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        direction = params.get('direction')
        if direction:
            qs = qs.filter(direction=direction)
        entity = params.get('entity')
        if entity:
            qs = qs.filter(entity_id=entity)
        status_param = params.get('status')
        if status_param:
            values = [item for item in status_param.split(',') if item]
            qs = qs.filter(status__in=values)
        date_from = params.get('date_from')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        date_to = params.get('date_to')
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs

    def perform_create(self, serializer):
        require(self.request.user, 'treasury_execute')
        company = _company(self.request)
        data = serializer.validated_data
        amount = data.get('amount')
        ensure_amount(amount, 'مبلغ تراکنش')
        entity = data.get('entity')
        direction = data.get('direction') or 'payment'
        if entity is not None:
            ensure_entity_direction(entity, direction)
            if direction == 'payment':
                decision = balance_decision(
                    entity.balance, amount,
                    policy=getattr(entity, 'negative_balance_policy', 'block'),
                    min_balance=getattr(entity, 'min_balance', 0) or 0,
                )
                if decision['blocked']:
                    raise TreasuryGuardError(
                        'موجودی این حساب برای این پرداخت کافی نیست '
                        f'(قابل استفاده: {decision["available"]:,}).',
                    )
        number = serializer.validated_data.get('number')
        if not number:
            number = allocate_number(
                'receipt' if direction == 'receipt' else 'payment',
                company, serializer.validated_data.get('date'), TreasuryTransaction,
            )
        serializer.save(company=company, number=number)

    def _post_transaction(self, request, obj):
        require(request.user, 'treasury_execute')
        if obj.status != TreasuryTransaction.Status.DRAFT:
            return Response({'error': 'این تراکنش قبلاً ثبت شده است.'}, status=400)
        from_status = obj.status
        obj.status = TreasuryTransaction.Status.POSTED
        obj.history = [*obj.history, {
            'step': 'posted',
            'by': getattr(request.user, 'username', ''),
            'at': timezone.now().isoformat(),
        }]
        obj.save(update_fields=['status', 'history'])
        log_transition(request.user, obj.company, 'TreasuryTransaction', obj.id,
                       from_status, 'posted')

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

    @action(detail=True, methods=['post'])
    def post_transaction(self, request, pk=None):
        return self._post_transaction(request, self.get_object())

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """ابطال تراکنش بدون حذف فیزیکی (فقط پیش‌نویس)."""
        require(request.user, 'treasury_approve')
        obj = self.get_object()
        if obj.status != TreasuryTransaction.Status.DRAFT:
            return Response(
                {'error': 'سند ثبت‌شده حذف/ابطال نمی‌شود؛ برای اصلاح از برگشتی استفاده کنید.'},
                status=400,
            )
        from_status = obj.status
        obj.status = TreasuryTransaction.Status.CANCELLED
        obj.save(update_fields=['status'])
        log_transition(request.user, obj.company, 'TreasuryTransaction', obj.id,
                       from_status, 'cancelled', {'reason': request.data.get('reason', '')})
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['get'], url_path='print-data')
    def print_data(self, request, pk=None):
        """دادهٔ چاپ رسید دریافت/پرداخت خزانه."""
        from treasury.vouchers import (
            build_verification, build_verification_payload, jalali_label,
        )

        obj = self.get_object()
        kind = 'receipt' if obj.direction == 'receipt' else 'payment'
        verification = build_verification(kind, obj, request)
        return Response({
            'kind': kind,
            'title': 'رسید دریافت' if kind == 'receipt' else 'رسید پرداخت',
            'number': obj.number,
            'date': jalali_label(obj.date),
            'amount': str(obj.amount),
            'party': obj.party,
            'description': obj.description,
            'account': getattr(obj.entity, 'name', ''),
            'verification': verification,
            'summary': build_verification_payload(kind, obj),
        })


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
                        'title': display_statement_title(st),
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
    """چک دریافتی + چرخهٔ کامل (صندوق اسناد → بانک → وصول/برگشت/عودت/واگذاری)."""

    serializer_class = ReceivedCheckSerializer
    queryset = ReceivedCheck.objects.select_related('party_account')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'bank_name', 'party', 'serial', 'series', 'branch_name',
                     'party_account__name', 'description']
    ordering = ['-due_date', '-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        status_param = params.get('status')
        if status_param:
            values = [item for item in status_param.split(',') if item]
            qs = qs.filter(status__in=values)
        if str(params.get('open') or '').lower() in ('1', 'true'):
            qs = qs.filter(status__in=OPEN_RECEIVED_CHECK_STATUSES)
        if str(params.get('due_soon') or '').lower() in ('1', 'true'):
            qs = qs.filter(due_date__lte=date_cls.today() + timedelta(days=7))
        kind = params.get('kind')
        if kind:
            qs = qs.filter(kind=kind)
        return qs

    def _transition(self, request, obj, target, extra=None, label=''):
        require(request.user, 'treasury_execute')
        from_status = obj.status
        obj.status = target
        entry = {
            'step': target,
            'by': getattr(request.user, 'username', ''),
            'at': timezone.now().isoformat(),
        }
        if label:
            entry['note'] = label
        obj.history = [*obj.history, entry]
        if extra:
            for field, value in extra.items():
                setattr(obj, field, value)
        obj.save()
        log_transition(request.user, obj.company, 'ReceivedCheck', obj.id,
                       from_status, target, extra)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def receive(self, request, pk=None):
        """ثبت چک در صندوق اسناد (تحویل‌گیری)."""
        obj = self.get_object()
        if obj.status != 'registered':
            return Response({'error': 'فقط چک ثبت‌شده قابل تحویل به صندوق اسناد است.'}, status=400)
        return self._transition(request, obj, ReceivedCheck.Status.IN_CUSTODY)

    @action(detail=True, methods=['post'])
    def deposit(self, request, pk=None):
        """واگذاری چک به بانک برای وصول."""
        obj = self.get_object()
        if obj.status not in ('registered', 'in_custody', 'guarantee_held'):
            return Response({'error': 'این چک قابل واگذاری به بانک نیست.'}, status=400)
        return self._transition(request, obj, ReceivedCheck.Status.DEPOSITED)

    @action(detail=True, methods=['post'])
    def start_clearing(self, request, pk=None):
        """انتقال به وضعیت «در جریان وصول»."""
        obj = self.get_object()
        if obj.status not in ('deposited',):
            return Response({'error': 'ابتدا چک را به بانک واگذار کنید.'}, status=400)
        return self._transition(request, obj, ReceivedCheck.Status.CLEARING)

    @action(detail=True, methods=['post'])
    def clear(self, request, pk=None):
        """وصول چک."""
        obj = self.get_object()
        if obj.status not in ('deposited', 'clearing'):
            return Response({'error': 'ابتدا چک را واریز کنید.'}, status=400)
        return self._transition(request, obj, ReceivedCheck.Status.CLEARED)

    @action(detail=True, methods=['post'])
    def bounce(self, request, pk=None):
        """برگشت چک."""
        obj = self.get_object()
        if obj.status not in ('deposited', 'clearing'):
            return Response({'error': 'وضعیت چک قابل برگشت نیست.'}, status=400)
        reason = (request.data.get('reason') or '').strip()
        return self._transition(request, obj, ReceivedCheck.Status.BOUNCED,
                                {'returned_reason': reason}, reason)

    @action(detail=True, methods=['post'])
    def return_to_customer(self, request, pk=None):
        """عودت چک به صادرکننده."""
        obj = self.get_object()
        if obj.status not in ('registered', 'in_custody', 'bounced'):
            return Response({'error': 'این چک قابل عودت نیست.'}, status=400)
        reason = (request.data.get('reason') or '').strip()
        return self._transition(request, obj, ReceivedCheck.Status.RETURNED_TO_CUSTOMER,
                                {'returned_reason': reason}, reason)

    @action(detail=True, methods=['post'])
    def transfer(self, request, pk=None):
        """واگذاری/ظهرنویسی چک به شخص دیگر."""
        obj = self.get_object()
        if obj.status not in ('registered', 'in_custody', 'deposited'):
            return Response({'error': 'وضعیت چک قابل ظهرنویسی نیست.'}, status=400)
        target = (request.data.get('endorsed_to') or '').strip()
        if not target:
            return Response({'error': 'نام طرف ظهرنویسی را وارد کنید.'}, status=400)
        return self._transition(request, obj, ReceivedCheck.Status.TRANSFERRED,
                                {'endorsed_to': target}, target)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """ابطال چک (بدون حذف فیزیکی)."""
        obj = self.get_object()
        if obj.status in ('cleared', 'cancelled'):
            return Response({'error': 'این چک قابل ابطال نیست.'}, status=400)
        reason = (request.data.get('reason') or '').strip()
        return self._transition(request, obj, ReceivedCheck.Status.CANCELLED,
                                {'returned_reason': reason}, reason)


class IssuedCheckViewSet(BaseViewSet):
    """چک پرداختی: صدور → تحویل → پاس/برگشت/عودت/ابطال."""

    serializer_class = IssuedCheckSerializer
    queryset = IssuedCheck.objects.select_related('checkbook', 'party_account')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'party', 'serial', 'series', 'branch_name',
                     'checkbook__bank_name', 'party_account__name']
    ordering = ['-due_date', '-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        status_param = params.get('status')
        if status_param:
            values = [item for item in status_param.split(',') if item]
            qs = qs.filter(status__in=values)
        if str(params.get('open') or '').lower() in ('1', 'true'):
            qs = qs.filter(status__in=OPEN_ISSUED_CHECK_STATUSES)
        if str(params.get('due_soon') or '').lower() in ('1', 'true'):
            qs = qs.filter(due_date__lte=date_cls.today() + timedelta(days=7))
        return qs

    def _transition(self, request, obj, target, extra=None, label=''):
        require(request.user, 'treasury_execute')
        from_status = obj.status
        obj.status = target
        entry = {
            'step': target,
            'by': getattr(request.user, 'username', ''),
            'at': timezone.now().isoformat(),
        }
        if label:
            entry['note'] = label
        obj.history = [*obj.history, entry]
        if extra:
            for field, value in extra.items():
                setattr(obj, field, value)
        obj.save()
        log_transition(request.user, obj.company, 'IssuedCheck', obj.id, from_status, target, extra)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def issue(self, request, pk=None):
        obj = self.get_object()
        if obj.status != IssuedCheck.Status.DRAFT:
            return Response({'error': 'فقط چک پیش‌نویس قابل صدور است.'}, status=400)
        require(request.user, 'treasury_execute')
        if obj.checkbook:
            obj.checkbook.used_leaves = (obj.checkbook.used_leaves or 0) + 1
            obj.checkbook.save(update_fields=['used_leaves', 'updated_at'])
        return self._transition(request, obj, IssuedCheck.Status.ISSUED)

    @action(detail=True, methods=['post'])
    def deliver(self, request, pk=None):
        """تحویل چک به ذی‌نفع."""
        obj = self.get_object()
        if obj.status != IssuedCheck.Status.ISSUED:
            return Response({'error': 'ابتدا چک را صادر کنید.'}, status=400)
        delivery_date = request.data.get('delivery_date') or timezone.localdate()
        return self._transition(request, obj, IssuedCheck.Status.DELIVERED,
                                {'delivery_date': delivery_date})

    @action(detail=True, methods=['post'])
    def clear(self, request, pk=None):
        obj = self.get_object()
        if obj.status not in (IssuedCheck.Status.ISSUED, IssuedCheck.Status.DELIVERED):
            return Response({'error': 'فقط چک صادرشده/تحویل‌شده قابل پاس است.'}, status=400)
        return self._transition(request, obj, IssuedCheck.Status.CLEARED)

    @action(detail=True, methods=['post'])
    def bounce(self, request, pk=None):
        obj = self.get_object()
        if obj.status not in (IssuedCheck.Status.ISSUED, IssuedCheck.Status.DELIVERED):
            return Response({'error': 'این چک قابل برگشت نیست.'}, status=400)
        return self._transition(request, obj, IssuedCheck.Status.BOUNCED)

    @action(detail=True, methods=['post'])
    def return_check(self, request, pk=None):
        """عودت چک از سوی ذی‌نفع (قبل از پاس)."""
        obj = self.get_object()
        if obj.status not in (IssuedCheck.Status.ISSUED, IssuedCheck.Status.DELIVERED):
            return Response({'error': 'این چک قابل عودت نیست.'}, status=400)
        return self._transition(request, obj, IssuedCheck.Status.RETURNED)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        obj = self.get_object()
        if obj.status in (IssuedCheck.Status.CLEARED, IssuedCheck.Status.CANCELLED):
            return Response({'error': 'این چک قابل ابطال نیست.'}, status=400)
        return self._transition(request, obj, IssuedCheck.Status.CANCELLED)


JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
                'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']

try:  # نام ماه شمسی برای نمودار روند
    from jdatetime import date as _jdate
except Exception:  # noqa: BLE001
    _jdate = None


def _month_label(value):
    if _jdate is None:
        return f'{value.year}-{value.month:02d}'
    try:
        converted = _jdate.fromgregorian(date=value)
        return JALALI_MONTHS[converted.month - 1]
    except Exception:  # noqa: BLE001
        return f'{value.year}-{value.month:02d}'


def _sum_amount(queryset):
    row = queryset.aggregate(total=Sum('amount'))
    return row['total'] or Decimal('0')


class TreasuryDashboardView(APIView):
    """داشبورد خزانه‌دار (§28/§30): مانده نقدینگی، صف پرداخت و سررسیدها."""

    def get(self, request):
        from treasury.operation_models import AdvanceAccount, Receipt
        from treasury.payment_models import PaymentCommitment, PaymentRequest
        from treasury.planning_models import TreasuryReconciliation

        company = _company(request)
        require(request.user, 'treasury_view')
        today = date_cls.today()
        soon = today + timedelta(days=7)
        month_later = today + timedelta(days=30)

        entities = list(TreasuryEntity.objects.filter(company=company).values(
            'id', 'code', 'name', 'entity_type', 'initial_balance', 'currency', 'is_active',
        ))
        totals = TreasuryTransaction.objects.filter(
            company=company, status='posted',
        ).values('entity_id', 'direction').annotate(total=Sum('amount'))
        flow = {}
        for row in totals:
            entry = flow.setdefault(
                row['entity_id'], {'receipt': Decimal('0'), 'payment': Decimal('0')},
            )
            entry[row['direction']] = row['total'] or Decimal('0')

        banks = cashboxes = Decimal('0')
        entity_rows = []
        for entity in entities:
            entry = flow.get(entity['id'], {'receipt': Decimal('0'), 'payment': Decimal('0')})
            balance = (entity['initial_balance'] or Decimal('0')) + entry['receipt'] - entry['payment']
            if entity['entity_type'] == 'cash':
                cashboxes += balance
            else:
                banks += balance
            entity_rows.append({**entity, 'balance': str(balance)})


        received_open = ReceivedCheck.objects.filter(
            company=company, status__in=OPEN_RECEIVED_CHECK_STATUSES,
        )
        issued_open = IssuedCheck.objects.filter(
            company=company, status__in=OPEN_ISSUED_CHECK_STATUSES,
        )
        commitments_open = PaymentCommitment.objects.filter(
            company=company, status__in=('open', 'scheduled', 'partial'),
        )
        pending_requests = PaymentRequest.objects.filter(
            company=company,
            status__in=('submitted', 'under_review', 'approved', 'scheduled', 'payment_ordered'),
        )
        clearing_receipts = Receipt.objects.filter(
            company=company, status__in=('expected', 'received'),
        )
        advances = AdvanceAccount.objects.filter(company=company, status__in=('open', 'partial'))

        due_received = received_open.filter(due_date__lte=soon)
        due_issued = issued_open.filter(due_date__lte=soon)
        due_commitments = commitments_open.filter(due_date__lte=soon)

        trend_rows = TreasuryTransaction.objects.filter(
            company=company, status='posted', date__gte=today - timedelta(days=183),
        ).order_by('date').values('date', 'direction', 'amount')
        trend = {}
        for row in trend_rows:
            label = _month_label(row['date'])
            entry = trend.setdefault(
                label, {'month': label, 'in': Decimal('0'), 'out': Decimal('0')},
            )
            key = 'in' if row['direction'] == 'receipt' else 'out'
            entry[key] += row['amount'] or Decimal('0')

        expected_receipts = _sum_amount(Receipt.objects.filter(
            company=company, status='expected', expected_date__lte=month_later,
        ))
        upcoming_payments = _sum_amount(commitments_open.filter(due_date__lte=month_later))

        def brief(queryset):
            return {'count': queryset.count(), 'amount': str(_sum_amount(queryset))}

        return Response({
            'as_of': today.isoformat(),
            'liquidity': {
                'banks': str(banks),
                'cashboxes': str(cashboxes),
                'total': str(banks + cashboxes),
                'available': str(banks + cashboxes),
            },
            'receivables': {
                'received_checks': brief(received_open),
                'receipts_in_clearing': brief(clearing_receipts),
            },
            'payables': {
                'issued_checks': brief(issued_open),
                'commitments': brief(commitments_open),
                'advances': brief(advances),
            },
            'pending_payments': brief(pending_requests),
            'due_soon_7d': {
                'received_checks': brief(due_received),
                'issued_checks': brief(due_issued),
                'commitments': brief(due_commitments),
            },
            'reconciliations': {
                'open': TreasuryReconciliation.objects.filter(
                    company=company, status='draft',
                ).count(),
            },
            'forecast_30d': {
                'expected_receipts': str(expected_receipts),
                'upcoming_payments': str(upcoming_payments),
                'projected_balance': str(
                    banks + cashboxes + expected_receipts - upcoming_payments
                ),
            },
            'entities': entity_rows,
            'trend': [
                {**row, 'in': str(row['in']), 'out': str(row['out'])}
                for row in list(trend.values())[-6:]
            ],
        })

