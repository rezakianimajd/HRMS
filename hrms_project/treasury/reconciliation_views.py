"""Views مغایرت بانکی: ورود گردش، تطبیق خودکار/دستی، اختلاف و Audit."""
from datetime import date, timedelta

from django.utils import timezone
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.engines.permission_engine import require
from treasury.audit import log_transition
from treasury.models import TreasuryTransaction
from treasury.reconciliation_models import TreasuryStatementLine
from treasury.reconciliation_serializers import TreasuryStatementLineSerializer
from treasury.reconciliation_service import auto_match


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class TreasuryStatementLineViewSet(viewsets.ModelViewSet):
    serializer_class = TreasuryStatementLineSerializer
    queryset = TreasuryStatementLine.objects.select_related(
        'entity', 'matched_transaction',
    )
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['reference', 'description', 'entity__name']
    ordering = ['-date', '-created_at']
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        params = self.request.query_params
        if params.get('entity'):
            qs = qs.filter(entity_id=params['entity'])
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if str(params.get('open') or '').lower() in ('1', 'true'):
            qs = qs.filter(status__in=('unmatched', 'partial'))
        if params.get('date_from'):
            qs = qs.filter(date__gte=params['date_from'])
        if params.get('date_to'):
            qs = qs.filter(date__lte=params['date_to'])
        return qs

    def perform_create(self, serializer):
        require(self.request.user, 'treasury_execute')
        serializer.save(company=_company(self.request))

    @action(detail=False, methods=['post'], url_path='import-lines')
    def import_lines(self, request):
        """ورود دسته‌ای گردش بانک (Excel/CSV تبدیل‌شده به JSON توسط فرانت)."""
        require(request.user, 'treasury_execute')
        company = _company(request)
        entity_id = request.data.get('entity')
        rows = request.data.get('rows') or []
        if not entity_id or not isinstance(rows, list):
            return Response({'error': 'حساب و ردیف‌های گردش الزامی است.'}, status=400)
        created = 0
        errors = []
        for index, row in enumerate(rows, start=1):
            try:
                TreasuryStatementLine.objects.create(
                    company=company,
                    entity_id=entity_id,
                    date=row.get('date'),
                    direction=row.get('direction') or 'credit',
                    amount=row.get('amount'),
                    reference=str(row.get('reference') or '')[:100],
                    description=str(row.get('description') or '')[:250],
                    source=TreasuryStatementLine.Source.IMPORT,
                )
                created += 1
            except Exception as exc:  # noqa: BLE001
                errors.append(f'ردیف {index}: {exc}')
        return Response({'created': created, 'errors': errors[:20]})

    @action(detail=False, methods=['post'], url_path='auto-match')
    def auto_match(self, request):
        """تطبیق خودکار ردیف‌های باز با تراکنش‌های همان حساب."""
        require(request.user, 'treasury_execute')
        company = _company(request)
        entity_id = request.data.get('entity') or request.query_params.get('entity')
        try:
            days = int(request.data.get('days') or 3)
        except (TypeError, ValueError):
            days = 3
        lines_qs = TreasuryStatementLine.objects.filter(
            company=company, status__in=('unmatched', 'partial'),
        )
        if entity_id:
            lines_qs = lines_qs.filter(entity_id=entity_id)
        lines = list(lines_qs)
        if not lines:
            return Response({'matched': 0, 'checked': 0})
        entity_ids = {line.entity_id for line in lines}
        transactions = list(
            TreasuryTransaction.objects.filter(
                company=company,
                status=TreasuryTransaction.Status.POSTED,
                entity_id__in=entity_ids,
                statement_lines__isnull=True,
            )
        )
        matches = auto_match(lines, transactions, day_tolerance=days)
        now = timezone.now()
        for line, transaction in ((row[0], row[1]) for row in matches):
            line.matched_transaction = transaction
            line.status = TreasuryStatementLine.Status.MATCHED
            line.matched_at = now
            line.save(update_fields=['matched_transaction', 'status', 'matched_at'])
            log_transition(request.user, company, 'TreasuryStatementLine', line.id,
                           'unmatched', 'matched', {'transaction': transaction.pk})
        return Response({'matched': len(matches), 'checked': len(lines)})

    @action(detail=True, methods=['post'])
    def match(self, request, pk=None):
        """تطبیق دستی با یک تراکنش مشخص."""
        require(request.user, 'treasury_execute')
        line = self.get_object()
        transaction_id = request.data.get('transaction')
        transaction = TreasuryTransaction.objects.filter(
            company=line.company, pk=transaction_id,
        ).first()
        if transaction is None:
            return Response({'error': 'تراکنش انتخاب‌شده پیدا نشد.'}, status=404)
        line.matched_transaction = transaction
        line.status = TreasuryStatementLine.Status.MATCHED
        line.matched_at = timezone.now()
        line.save(update_fields=['matched_transaction', 'status', 'matched_at'])
        log_transition(request.user, line.company, 'TreasuryStatementLine', line.id,
                       'unmatched', 'matched', {'transaction': transaction.pk, 'mode': 'manual'})
        return Response(self.get_serializer(line).data)

    @action(detail=True, methods=['post'])
    def unmatch(self, request, pk=None):
        require(request.user, 'treasury_execute')
        line = self.get_object()
        line.matched_transaction = None
        line.matched_at = None
        line.status = TreasuryStatementLine.Status.UNMATCHED
        line.save(update_fields=['matched_transaction', 'matched_at', 'status'])
        return Response(self.get_serializer(line).data)

    @action(detail=True, methods=['post'])
    def ignore(self, request, pk=None):
        require(request.user, 'treasury_execute')
        line = self.get_object()
        line.status = TreasuryStatementLine.Status.IGNORED
        line.note = request.data.get('note', line.note)
        line.save(update_fields=['status', 'note'])
        return Response(self.get_serializer(line).data)

    @action(detail=True, methods=['post'], url_path='mark-adjusted')
    def mark_adjusted(self, request, pk=None):
        """ثبت اختلاف/کارمزد/سود به‌عنوان ردیف اصلاح‌شده."""
        require(request.user, 'treasury_approve')
        line = self.get_object()
        line.status = TreasuryStatementLine.Status.ADJUSTED
        line.note = request.data.get('note', line.note)
        line.save(update_fields=['status', 'note'])
        return Response(self.get_serializer(line).data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """خلاصهٔ مغایرت به تفکیک حساب و وضعیت."""
        company = _company(request)
        rows = (
            TreasuryStatementLine.objects.filter(company=company)
            .values('entity_id', 'entity__name', 'status')
        )
        summary = {}
        for row in rows:
            entry = summary.setdefault(
                row['entity_id'],
                {'entity': row['entity__name'], 'unmatched': 0, 'matched': 0,
                 'ignored': 0, 'adjusted': 0, 'partial': 0},
            )
            entry[row['status']] = entry.get(row['status'], 0) + 1
        return Response(list(summary.values()))

