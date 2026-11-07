"""Views دستور پرداخت بین‌بانکی (پایا/ساتنا) + پیش‌نمایش/چاپ."""
from django.utils import timezone
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.engines.permission_engine import require
from treasury import iban as iban_utils
from treasury.bank_order_models import BankPaymentOrder
from treasury.bank_order_serializers import BankPaymentOrderSerializer
from treasury.numbering import allocate_number
from treasury.print_templates import build_context, get_default_template, render_template


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


def _voucher_payload(order, request):
    from treasury.vouchers import build_verification, jalali_label

    verification = build_verification('bank_order', order, request)
    return {
        'kind': 'bank_order',
        'title': 'دستور پرداخت الکترونیکی بین‌بانکی',
        'company': {
            'name': getattr(order.company, 'name', '') or '',
            'code': getattr(order.company, 'code', '') or '',
        },
        'number': order.number,
        'date': jalali_label(order.date),
        'transfer_type': order.get_transfer_type_display(),
        'company_national_id': order.company_national_id,
        'customer_number': order.customer_number,
        'amount': f'{order.amount:,}' if order.amount is not None else '',
        'amount_words': order.amount_in_words,
        'source_account_number': order.source_account_number
        or getattr(order.source_entity, 'account_number', ''),
        'source_iban': order.source_iban_pretty,
        'destination_owner_name': order.destination_owner_name,
        'destination_account_number': order.destination_account_number,
        'destination_iban': order.destination_iban_pretty,
        'destination_bank': order.destination_bank_name,
        'cheque_number': order.cheque_number or '—',
        'note': order.note,
        'status': order.get_status_display(),
        'verification': verification,
        'account': {
            'name': getattr(order.source_entity, 'name', ''),
            'account_number': getattr(order.source_entity, 'account_number', ''),
            'sheba_number': getattr(order.source_entity, 'sheba_number', ''),
            'bank_name': getattr(getattr(order.source_entity, 'bank', None), 'name', ''),
        },
        'instrument': {'cheque': order.cheque_number},
    }


class BankPaymentOrderViewSet(viewsets.ModelViewSet):
    serializer_class = BankPaymentOrderSerializer
    queryset = BankPaymentOrder.objects.select_related('source_entity', 'company')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'destination_owner_name', 'destination_iban',
                     'destination_account_number', 'source_iban', 'cheque_number', 'note']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        params = self.request.query_params
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('transfer_type'):
            qs = qs.filter(transfer_type=params['transfer_type'])
        if params.get('entity'):
            qs = qs.filter(source_entity_id=params['entity'])
        return qs

    def perform_create(self, serializer):
        require(self.request.user, 'treasury_execute')
        company = _company(self.request)
        number = serializer.validated_data.get('number') or allocate_number(
            'bank_order', company, serializer.validated_data.get('date'),
            BankPaymentOrder,
        )
        serializer.save(company=company, number=number)

    def update(self, request, *args, **kwargs):
        require(request.user, 'treasury_execute')
        instance = self.get_object()
        if instance.status != BankPaymentOrder.Status.DRAFT:
            return Response(
                {'error': 'سند ثبت‌شده قابل ویرایش نیست؛ برای اصلاح آن را لغو و سند جدید صادر کنید.'},
                status=400,
            )
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def register(self, request, pk=None):
        require(request.user, 'treasury_execute')
        order = self.get_object()
        if order.status != BankPaymentOrder.Status.DRAFT:
            return Response({'error': 'فقط پیش‌نویس قابل ثبت است.'}, status=400)
        order.status = BankPaymentOrder.Status.REGISTERED
        order.history = [*order.history, {
            'step': 'registered',
            'by': getattr(request.user, 'username', ''),
            'at': timezone.now().isoformat(),
        }]
        order.save(update_fields=['status', 'history'])
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'])
    def mark_printed(self, request, pk=None):
        order = self.get_object()
        order.status = BankPaymentOrder.Status.PRINTED
        order.history = [*order.history, {
            'step': 'printed',
            'by': getattr(request.user, 'username', ''),
            'at': timezone.now().isoformat(),
        }]
        order.save(update_fields=['status', 'history'])
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        require(request.user, 'treasury_approve')
        order = self.get_object()
        if order.status == BankPaymentOrder.Status.CANCELLED:
            return Response({'error': 'این دستور قبلاً لغو شده است.'}, status=400)
        order.status = BankPaymentOrder.Status.CANCELLED
        order.history = [*order.history, {
            'step': 'cancelled',
            'by': getattr(request.user, 'username', ''),
            'at': timezone.now().isoformat(),
            'reason': request.data.get('reason', ''),
        }]
        order.save(update_fields=['status', 'history'])
        return Response(self.get_serializer(order).data)

    @action(detail=False, methods=['get'], url_path='lookup-sheba')
    def lookup_sheba(self, request):
        """دریافت اطلاعات شبا (اعتبارسنجی + بانک) — دکمهٔ «دریافت اطلاعات»."""
        value = request.query_params.get('iban') or ''
        return Response({
            'valid': iban_utils.is_valid(value),
            'normalized': iban_utils.normalize(value),
            'pretty': iban_utils.format_pretty(value),
            'bank_code': iban_utils.bank_code(value),
            'bank_name': iban_utils.bank_name(value),
        })

    @action(detail=True, methods=['get'], url_path='print-data')
    def print_data(self, request, pk=None):
        order = self.get_object()
        payload = _voucher_payload(order, request)
        template = get_default_template(order.company, 'bank_order')
        html = render_template(template, build_context(payload))
        return Response({
            **payload,
            'html': html,
            'template_id': getattr(template, 'id', None),
            'template_name': getattr(template, 'name', ''),
            'paper': getattr(template, 'paper', 'A4'),
        })

