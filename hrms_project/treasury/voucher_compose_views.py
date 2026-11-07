"""اندپوینت‌های «صدور سند با پیش‌نمایش چاپ» (فیش دریافت، حواله پرداخت، رسید انتقال).

- ``POST /api/treasury/voucher-preview/`` → پیش‌نمایش HTML قالب چاپ با دادهٔ فرم
  (تاریخ شمسی، مبلغ به حروف، بارکد، شمارهٔ بعدی) بدون ثبت هیچ رکوردی.
- ``POST /api/treasury/voucher-issue/`` → ثبت واقعی سند از همان داده و برگرداندن
  ``print_url`` برای چاپ نهایی (با شمارهٔ رسمی و کد اعتبارسنجی).
"""
from django.db import transaction
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from core.engines.permission_engine import require
from treasury.guards import (
    TreasuryGuardError, balance_decision, ensure_amount, ensure_entity_direction,
)
from treasury.models import TreasuryTransaction
from treasury.numbering import allocate_number
from treasury.operation_models import Receipt, TreasuryTransfer
from treasury.operation_serializers import ReceiptSerializer, TreasuryTransferSerializer
from treasury.print_templates import get_default_template
from treasury.serializers import TreasuryTransactionSerializer
from treasury.voucher_compose import (
    DOC_KINDS, build_preview_payload, compose_html, parse_date, to_decimal,
)
from treasury.vouchers import post_transfer_documents


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


def _company_brief(company):
    return {
        'name': getattr(company, 'name', '') or '',
        'code': getattr(company, 'code', '') or '',
        'phone': getattr(company, 'phone', '') or '',
        'address': getattr(company, 'address', '') or '',
    }


def _entity_brief(entity):
    if entity is None:
        return {}
    from treasury.vouchers import _entity_brief as entity_brief

    return entity_brief(entity)


def _kind(value):
    kind = str(value or 'receipt').strip()
    return kind if kind in DOC_KINDS else ''


class VoucherPreviewView(APIView):
    """پیش‌نمایش چاپ سند (بدون ثبت)."""

    def post(self, request):
        require(request.user, 'treasury_view')
        kind = _kind(request.data.get('kind'))
        if not kind:
            return Response({'error': 'نوع سند نامعتبر است.'}, status=400)
        company = _company(request)
        data = request.data
        from treasury.models import TreasuryEntity

        entity = TreasuryEntity.objects.filter(
            company=company, pk=data.get('entity'),
        ).first() if data.get('entity') else None
        from_entity = to_entity = None
        if kind == 'transfer':
            from_entity = TreasuryEntity.objects.filter(
                company=company, pk=data.get('source'),
            ).first()
            to_entity = TreasuryEntity.objects.filter(
                company=company, pk=data.get('destination'),
            ).first()
            entity = from_entity or entity
        number = ''
        try:
            model = TreasuryTransfer if kind == 'transfer' else (
                Receipt if kind == 'receipt' else TreasuryTransaction
            )
            number = allocate_number(kind, company, parse_date(data.get('date')), model)
        except Exception:  # noqa: BLE001 - شمارهٔ پیش‌نمایش اجباری نیست
            number = ''
        payload = build_preview_payload(
            kind,
            {
                **(data.dict() if hasattr(data, 'dict') else dict(data)),
                'from_account': _entity_brief(from_entity),
                'to_account': _entity_brief(to_entity),
            },
            company_brief=_company_brief(company),
            number=number,
            account=_entity_brief(entity),
        )
        template = get_default_template(company, kind)
        payload['html'] = compose_html(payload, template)
        payload['template_id'] = getattr(template, 'id', None)
        payload['template_name'] = getattr(template, 'name', '')
        payload['paper'] = getattr(template, 'paper', 'A5')
        return Response(payload)


def _document_date(data):
    return parse_date(data.get('date')) or timezone.localdate()


class VoucherIssueView(APIView):
    """ثبت سند از فرم پیش‌نمایش (فیش دریافت / حواله پرداخت / رسید انتقال)."""

    def post(self, request):
        require(request.user, 'treasury_execute')
        kind = _kind(request.data.get('kind'))
        if not kind:
            return Response({'error': 'نوع سند نامعتبر است.'}, status=400)
        company = _company(request)
        if company is None:
            return Response({'error': 'شرکت فعال مشخص نیست.'}, status=400)

        handler = {
            'receipt': self._issue_receipt,
            'payment': self._issue_payment,
            'transfer': self._issue_transfer,
        }[kind]
        try:
            with transaction.atomic():
                document, print_url = handler(request, company)
        except TreasuryGuardError as exc:
            return Response({'error': ' '.join(exc.messages)}, status=400)
        except Exception as exc:  # noqa: BLE001
            detail = getattr(exc, 'detail', None)
            if detail is not None:
                return Response({'error': detail}, status=400)
            raise

        return Response({
            'kind': kind,
            'id': document.pk,
            'number': getattr(document, 'number', '') or '',
            'status': getattr(document, 'status', ''),
            'print_url': print_url,
        }, status=201)

    # ── فیش دریافت ────────────────────────────────────────────────────
    def _issue_receipt(self, request, company):
        data = request.data
        payload = {
            key: data.get(key) for key in (
                'party', 'received_from', 'entity', 'received_check', 'method',
                'payment_method', 'terminal', 'amount', 'currency', 'exchange_rate',
                'reference_no', 'tracking_no', 'bank_reference', 'purpose', 'project',
                'contract', 'cost_center', 'accounting_document', 'expected_date',
                'description',
            ) if data.get(key) not in (None, '')
        }
        document_date = _document_date(data)
        payload.setdefault('received_date', document_date)
        serializer = ReceiptSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        number = allocate_number('receipt', company, payload.get('received_date'), Receipt)
        receipt = serializer.save(company=company, number=number)

        mark_received = str(data.get('mark_received', 'true')).lower() not in ('0', 'false')
        if mark_received:
            receipt.status = Receipt.Status.RECEIVED
            receipt.received_date = payload.get('received_date')
            receipt.history = [
                *receipt.history,
                {
                    'step': 'received',
                    'by': getattr(request.user, 'username', ''),
                    'at': timezone.now().isoformat(),
                },
            ]
            receipt.save(update_fields=['status', 'received_date', 'history', 'updated_at'])
        return receipt, f'/treasury/receipts/{receipt.pk}/print-data/'


    # ── حواله / فیش پرداخت ────────────────────────────────────────────
    def _issue_payment(self, request, company):
        data = request.data
        entity = None
        if data.get('entity'):
            from treasury.models import TreasuryEntity

            entity = TreasuryEntity.objects.filter(
                company=company, pk=data.get('entity'),
            ).first()
        amount = to_decimal(data.get('amount'))
        ensure_amount(amount, 'مبلغ پرداخت')
        if entity is None:
            raise TreasuryGuardError('حساب/صندوق پرداخت را انتخاب کنید.')
        if entity is not None:
            ensure_entity_direction(entity, 'payment')
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

        payload = {
            'entity': getattr(entity, 'pk', None),
            'direction': 'payment',
            'instrument_kind': data.get('instrument_kind') or 'cash',
            'amount': amount,
            'date': _document_date(data),
            'party': data.get('party') or data.get('beneficiary') or '',
            'party_national_id': data.get('party_national_id') or '',
            'cheque_number': data.get('cheque_number') or '',
            'cheque_due_date': parse_date(data.get('cheque_due_date')),
            'is_guarantee': bool(data.get('is_guarantee')),
            'invoice_number': data.get('invoice_number') or '',
            'invoice_date': parse_date(data.get('invoice_date')),
            'description': data.get('description') or data.get('purpose') or '',
            'reference_no': data.get('reference_no') or '',
            'tracking_no': data.get('tracking_no') or '',
            'debit_account': data.get('debit_account') or None,
        }
        payload = {key: value for key, value in payload.items() if value not in (None, '')}
        serializer = TreasuryTransactionSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        number = allocate_number('payment', company, payload.get('date'), TreasuryTransaction)
        document = serializer.save(
            company=company,
            number=number,
            status=TreasuryTransaction.Status.POSTED,
            history=[{
                'step': 'posted',
                'by': getattr(request.user, 'username', ''),
                'at': timezone.now().isoformat(),
            }],
        )
        return document, f'/treasury/treasury-transactions/{document.pk}/print-data/'

    # ── رسید انتقال وجه ───────────────────────────────────────────────
    def _issue_transfer(self, request, company):
        data = request.data
        payload = {
            'source': data.get('source') or data.get('from_account_id'),
            'destination': data.get('destination') or data.get('to_account_id'),
            'amount': to_decimal(data.get('amount')),
            'fee': to_decimal(data.get('fee')),
            'date': _document_date(data),
            'description': data.get('description') or data.get('purpose') or '',
        }
        payload = {key: value for key, value in payload.items() if value not in (None, '')}
        if not payload.get('source') or not payload.get('destination'):
            raise TreasuryGuardError('حساب مبدأ و مقصد را انتخاب کنید.')
        if payload.get('source') == payload.get('destination'):
            raise TreasuryGuardError('حساب مبدأ و مقصد نباید یکسان باشند.')
        serializer = TreasuryTransferSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        number = allocate_number('transfer', company, payload.get('date'), TreasuryTransfer)
        transfer = serializer.save(company=company, number=number)
        post_transfer_documents(transfer, getattr(request.user, 'username', ''))
        return transfer, f'/treasury/treasury-transfers/{transfer.pk}/print-data/'

