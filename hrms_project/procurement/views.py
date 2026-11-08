"""Views for the Procurement (مدیریت خریدها) module."""
import logging

from django.db.models import Sum
from django.utils import timezone
from rest_framework import viewsets, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

logger = logging.getLogger('procurement')

from procurement.models import (
    SupplierCategory, Supplier, ItemCategory, UnitOfMeasure, Item,
    PurchaseRequest, PurchaseOrder, PurchaseOrderLine,
    GoodsReceiptNote, PurchaseInvoice, PurchasePayment, ProcurementApprovalPolicy,
    Inquiry, InquirySupplier, Quotation, ProformaInvoice, ProcurementGuarantee,
    ProcurementGuaranteeAction, PurchasePaymentAllocation, ProcurementDocument,
)
from procurement.serializers import (
    SupplierCategorySerializer, SupplierSerializer, ItemCategorySerializer,
    UnitOfMeasureSerializer, ItemSerializer,
    PurchaseRequestSerializer, PurchaseOrderSerializer,
    GoodsReceiptNoteSerializer, PurchaseInvoiceSerializer, PurchasePaymentSerializer,
    ProcurementApprovalPolicySerializer,
    InquirySerializer, QuotationSerializer, ProformaInvoiceSerializer,
    ProcurementGuaranteeSerializer, PurchasePaymentAllocationSerializer,
    ProcurementDocumentSerializer,
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


class SupplierFilterMixin:
    """فیلتر ``?supplier=<id>`` برای اسناد مرتبط با یک طرف حساب (پروندهٔ خرید)."""

    supplier_lookup = 'supplier_id'

    def get_queryset(self):
        qs = super().get_queryset()
        supplier_id = self.request.query_params.get('supplier')
        if supplier_id:
            qs = qs.filter(**{self.supplier_lookup: supplier_id})
        return qs


class SupplierCategoryViewSet(BaseViewSet):
    serializer_class = SupplierCategorySerializer
    queryset = SupplierCategory.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code']
    ordering = ['name']


class SupplierViewSet(BaseViewSet):
    serializer_class = SupplierSerializer
    queryset = Supplier.objects.select_related('category')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'economic_code', 'national_id', 'tax_id']
    ordering = ['name']

    @action(detail=True, methods=['get'], url_path='profile')
    def profile(self, request, pk=None):
        """پروندهٔ خرید یک تأمین‌کننده — شاخص‌ها + همهٔ اسناد + خط زمانی.

        یک payload واحد (به‌جای هفت درخواست جدا در فرانت) و یک کوئری سبک
        (``values()``) به‌ازای هر رابطه؛ محاسبات در ``procurement.profile``.
        """
        from datetime import date as _date

        from django.db.models import Q

        from contracts.guarantee_validity import guarantee_validity
        from procurement import dashboard as dash
        from procurement import profile as prof

        supplier = self.get_object()
        today = _date.today()

        def light(queryset, fields, limit=300):
            rows = queryset.values(*sorted(set(fields.values())))[:limit]
            return [_flatten(row, fields) for row in rows]

        order_status = dict(PurchaseOrder.Status.choices)
        orders = []
        for row in light(PurchaseOrder.objects.filter(supplier=supplier).order_by('-date'), ORDER_FIELDS):
            document = dash.normalize_document(row)
            document['expected_date'] = dash.iso(row.get('expected_date'))
            document['status_label'] = str(order_status.get(row.get('status'), row.get('status') or ''))
            orders.append(document)

        invoice_status = dict(PurchaseInvoice.Status.choices)
        invoices = []
        for row in light(PurchaseInvoice.objects.filter(supplier=supplier).order_by('-date'), INVOICE_FIELDS):
            document = dash.normalize_document(row)
            rate = document['rate'] if document['group'] == 'foreign' else 1
            document['paid_amount'] = dash.num(row.get('paid_amount')) * rate
            document['due_date'] = dash.iso(row.get('due_date'))
            document['payment_status'] = row.get('payment_status') or 'unpaid'
            document['status_label'] = str(invoice_status.get(row.get('status'), row.get('status') or ''))
            due = dash.day(row.get('due_date'))
            unpaid = document['payment_status'] != 'paid'
            document['overdue'] = bool(
                due and due < today and unpaid and row.get('status') != 'cancelled'
            )
            invoices.append(document)

        payment_methods = dict(PurchasePayment.Method.choices)
        payment_fields = {
            'id': 'id', 'date': 'date', 'amount': 'amount', 'method': 'method',
            'reference': 'reference', 'bank': 'bank',
            'invoice_id': 'invoice_id', 'invoice_number': 'invoice__number',
        }
        payments = []
        for row in light(
            PurchasePayment.objects.filter(invoice__supplier=supplier).order_by('-date'), payment_fields,
        ):
            payments.append({
                'id': row.get('id'),
                'date': dash.iso(row.get('date')),
                'amount': dash.num(row.get('amount')),
                'method': row.get('method') or '',
                'method_label': str(payment_methods.get(row.get('method'), row.get('method') or '')),
                'reference': row.get('reference') or '',
                'bank': row.get('bank') or '',
                'invoice_id': row.get('invoice_id'),
                'invoice_number': row.get('invoice_number') or '',
            })

        kind_labels = dict(ProcurementGuarantee.Kind.choices)
        guarantees = []
        for row in light(
            ProcurementGuarantee.objects.filter(supplier=supplier).order_by('-issue_date'), GUARANTEE_FIELDS,
        ):
            item = dict(row)
            item['kind_label'] = str(kind_labels.get(row.get('kind'), row.get('kind') or ''))
            item['issue_date'] = dash.iso(row.get('issue_date'))
            item['expiry_date'] = dash.iso(row.get('expiry_date'))
            item.update(guarantee_validity(row, today=today))
            guarantees.append(item)

        proforma_status = dict(ProformaInvoice.Status.choices)
        proforma_fields = {
            'id': 'id', 'number': 'number', 'date': 'date', 'status': 'status', 'total': 'total',
            'exchange_rate': 'exchange_rate', 'currency_code': 'currency__code',
            'currency_name': 'currency__name',
        }
        proformas = []
        for row in light(
            ProformaInvoice.objects.filter(supplier=supplier).order_by('-date'), proforma_fields,
        ):
            document = dash.normalize_document(row)
            document['status_label'] = str(proforma_status.get(row.get('status'), row.get('status') or ''))
            proformas.append(document)

        quotation_status = dict(Quotation.Status.choices)
        quotation_fields = {
            'id': 'id', 'number': 'number', 'date': 'date', 'status': 'status', 'total': 'total',
            'exchange_rate': 'exchange_rate', 'currency_code': 'currency__code',
            'currency_name': 'currency__name', 'is_winner': 'is_winner',
            'delivery_days': 'delivery_days', 'inquiry_number': 'inquiry__number',
        }
        quotations = []
        for row in light(
            Quotation.objects.filter(supplier=supplier).order_by('-date'), quotation_fields,
        ):
            document = dash.normalize_document(row)
            document['status_label'] = str(quotation_status.get(row.get('status'), row.get('status') or ''))
            document['is_winner'] = bool(row.get('is_winner'))
            document['delivery_days'] = row.get('delivery_days') or 0
            document['inquiry_number'] = row.get('inquiry_number') or ''
            quotations.append(document)

        document_kinds = dict(ProcurementDocument.Kind.choices)
        document_rows = ProcurementDocument.objects.filter(
            Q(order__supplier=supplier)
            | Q(invoice__supplier=supplier)
            | Q(proforma__supplier=supplier)
            | Q(quotation__supplier=supplier)
            | Q(guarantee__supplier=supplier)
        ).order_by('-created_at')[:200]
        documents = []
        for row in document_rows:
            try:
                file_url = request.build_absolute_uri(row.file.url) if row.file else None
            except ValueError:
                file_url = None
            documents.append({
                'id': row.id,
                'title': row.title,
                'kind': row.kind,
                'kind_label': str(document_kinds.get(row.kind, row.kind or '')),
                'file_url': file_url,
                'size': row.size,
                'note': row.note,
                'created_at': dash.iso(row.created_at),
            })

        return Response({
            'supplier': SupplierSerializer(supplier).data,
            'summary': prof.supplier_summary(
                orders, invoices, payments, guarantees, proformas, quotations, today=today,
            ),
            'orders': orders,
            'invoices': invoices,
            'payments': payments,
            'guarantees': guarantees,
            'proformas': proformas,
            'quotations': quotations,
            'documents': documents,
            'timeline': prof.build_timeline(
                orders, invoices, payments, guarantees, proformas, documents,
            ),
        })


class ItemCategoryViewSet(BaseViewSet):
    serializer_class = ItemCategorySerializer
    queryset = ItemCategory.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code']
    ordering = ['code']


class UnitOfMeasureViewSet(BaseViewSet):
    serializer_class = UnitOfMeasureSerializer
    queryset = UnitOfMeasure.objects.all()
    ordering = ['code']


class ItemViewSet(BaseViewSet):
    serializer_class = ItemSerializer
    queryset = Item.objects.select_related('category', 'unit')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'barcode']
    ordering = ['code']


class PurchaseRequestViewSet(BaseViewSet):
    serializer_class = PurchaseRequestSerializer
    queryset = PurchaseRequest.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'description', 'department']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        obj = self.get_object()
        if obj.status != 'draft':
            return Response({'error': 'فقط درخواست پیش‌نویس قابل ارسال است.'}, status=400)
        obj.status = 'submitted'
        obj.submitted_by = request.user
        obj.submitted_at = timezone.now()
        obj.history = [*obj.history, {'step': 'submitted', 'by': request.user.username, 'at': timezone.now().isoformat()}]
        obj.save()
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        obj = self.get_object()
        if obj.status != 'submitted':
            return Response({'error': 'فقط درخواست در انتظار تأیید قابل تأیید است.'}, status=400)
        obj.status = 'approved'
        obj.history = [*obj.history, {'step': 'approved', 'by': request.user.username, 'at': timezone.now().isoformat()}]
        obj.save()
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        obj = self.get_object()
        if obj.status != 'submitted':
            return Response({'error': 'فقط درخواست در انتظار تأیید قابل رد است.'}, status=400)
        obj.status = 'rejected'
        obj.history = [*obj.history, {'step': 'rejected', 'by': request.user.username, 'at': timezone.now().isoformat()}]
        obj.save()
        return Response(self.get_serializer(obj).data)


class PurchaseOrderViewSet(SupplierFilterMixin, BaseViewSet):
    serializer_class = PurchaseOrderSerializer
    queryset = PurchaseOrder.objects.select_related('supplier', 'source_request').prefetch_related('lines')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'supplier__name']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        project = self.request.query_params.get('project')
        if project:
            qs = qs.filter(project_id=project)
        return qs

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        obj = self.get_object()
        if obj.status != 'draft':
            return Response({'error': 'فقط سفارش پیش‌نویس قابل ارسال است.'}, status=400)
        obj.status = 'submitted'
        obj.history = [*obj.history, {'step': 'submitted', 'by': request.user.username, 'at': timezone.now().isoformat()}]
        obj.save()
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        obj = self.get_object()
        if obj.status != 'submitted':
            return Response({'error': 'فقط سفارش در انتظار قابل تأیید است.'}, status=400)
        obj.status = 'approved'
        obj.history = [*obj.history, {'step': 'approved', 'by': request.user.username, 'at': timezone.now().isoformat()}]
        obj.save()
        # فاز ۲ — ثبت خودکار «تعهد هزینه» پروژه از سفارش خرید (idempotent)
        try:
            from projects.integration import sync_po_commitment
            commitment = sync_po_commitment(obj, request.user)
            if commitment is not None and obj.committed_cost_id != commitment.id:
                obj.committed_cost = commitment
                obj.save(update_fields=['committed_cost', 'updated_at'])
        except Exception:  # noqa: BLE001 — خطای یکپارچگی نباید تأیید سفارش را متوقف کند
            logger.exception('sync_po_commitment failed for PO %s', obj.pk)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        obj = self.get_object()
        if obj.status != 'approved':
            return Response({'error': 'ابتدا سفارش را تأیید کنید.'}, status=400)
        obj.status = 'sent'
        obj.history = [*obj.history, {'step': 'sent', 'by': request.user.username, 'at': timezone.now().isoformat()}]
        obj.save()
        return Response(self.get_serializer(obj).data)


class GoodsReceiptNoteViewSet(BaseViewSet):
    serializer_class = GoodsReceiptNoteSerializer
    queryset = GoodsReceiptNote.objects.select_related('order').prefetch_related('lines')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'order__number']
    ordering = ['-date', '-created_at']

    @action(detail=True, methods=['post'])
    def post_receipt(self, request, pk=None):
        obj = self.get_object()
        obj.status = 'posted'
        obj.save(update_fields=['status', 'updated_at'])
        # به‌روزرسانی تعداد تحویل‌شده در سطرهای سفارش
        for line in obj.lines.all():
            po_line = PurchaseOrderLine.objects.filter(order=obj.order, item=line.item).first()
            if po_line:
                po_line.received_quantity = (po_line.received_quantity or 0) + (line.quantity or 0)
                po_line.save(update_fields=['received_quantity', 'updated_at'])
        order = obj.order
        all_full = all((l.received_quantity or 0) >= (l.quantity or 0) for l in order.lines.all())
        order.status = 'received' if all_full else 'partial'
        order.save(update_fields=['status', 'updated_at'])
        # فاز ۲ — ثبت خودکار «تراکنش هزینه» پروژه از قبض انبار (idempotent)
        try:
            from projects.integration import sync_grn_costs
            tx = sync_grn_costs(obj, request.user)
            if tx is not None and obj.cost_transaction_id != tx.id:
                obj.cost_transaction = tx
                obj.save(update_fields=['cost_transaction', 'updated_at'])
        except Exception:  # noqa: BLE001
            logger.exception('sync_grn_costs failed for GRN %s', obj.pk)
        return Response(self.get_serializer(obj).data)


class PurchaseInvoiceViewSet(SupplierFilterMixin, BaseViewSet):
    serializer_class = PurchaseInvoiceSerializer
    queryset = PurchaseInvoice.objects.select_related('supplier', 'order').prefetch_related('lines')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'invoice_number', 'supplier__name']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        obj = self.get_object()
        if obj.status != 'draft':
            return Response({'error': 'فقط صورتحساب پیش‌نویس قابل ارسال است.'}, status=400)
        obj.status = 'submitted'
        obj.history = [*obj.history, {'step': 'submitted', 'by': request.user.username, 'at': timezone.now().isoformat()}]
        obj.save()
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        obj = self.get_object()
        if obj.status != 'submitted':
            return Response({'error': 'فقط صورتحساب در انتظار قابل تأیید است.'}, status=400)
        obj.status = 'approved'
        obj.history = [*obj.history, {'step': 'approved', 'by': request.user.username, 'at': timezone.now().isoformat()}]
        obj.save()
        return Response(self.get_serializer(obj).data)


class PurchasePaymentViewSet(SupplierFilterMixin, BaseViewSet):
    supplier_lookup = 'invoice__supplier_id'
    serializer_class = PurchasePaymentSerializer
    queryset = PurchasePayment.objects.select_related('invoice')
    ordering = ['-date', '-created_at']

    def perform_create(self, serializer):
        obj = serializer.save(company=_company(self.request))
        invoice = obj.invoice
        invoice.paid_amount = (invoice.paid_amount or 0) + (obj.amount or 0)
        invoice.save(update_fields=['paid_amount', 'updated_at'])
        if float(invoice.paid_amount) >= float(invoice.total):
            invoice.status = 'paid'
            invoice.save(update_fields=['status', 'updated_at'])


class ProcurementApprovalPolicyViewSet(BaseViewSet):
    serializer_class = ProcurementApprovalPolicySerializer
    queryset = ProcurementApprovalPolicy.objects.all()
    ordering = ['id']


# ---------------------------------------------------------------------------
# استعلام (RFQ) / پیشنهاد قیمت / پیش‌فاکتور / تضامین / اسناد
# ---------------------------------------------------------------------------
class InquiryViewSet(SupplierFilterMixin, BaseViewSet):
    supplier_lookup = 'suppliers__supplier_id'
    serializer_class = InquirySerializer
    queryset = Inquiry.objects.select_related(
        'project', 'source_request', 'currency', 'awarded_quotation__supplier',
    ).prefetch_related('lines__item', 'lines__unit', 'suppliers__supplier')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'subject', 'description', 'department', 'project__name']
    ordering_fields = ['date', 'deadline', 'created_at', 'status']
    ordering = ['-date', '-created_at']

    @action(detail=True, methods=['get'])
    def comparison(self, request, pk=None):
        """ماتریس مقایسهٔ پیشنهادهای این استعلام + رتبه‌بندی."""
        from procurement.pricing import compare_quotations

        inquiry = self.get_object()
        lines = [
            {
                'id': line.pk,
                'line_no': line.line_no,
                'description': line.description or getattr(line.item, 'name', ''),
                'quantity': float(line.quantity or 0),
                'unit_label': getattr(line.unit, 'name', ''),
            }
            for line in inquiry.lines.select_related('item', 'unit').all()
        ]
        quotations = [
            {
                'id': quotation.pk,
                'number': quotation.number,
                'supplier_name': getattr(quotation.supplier, 'name', ''),
                'status': quotation.status,
                'currency_label': getattr(quotation.currency, 'name', ''),
                'total': float(quotation.total or 0),
                'delivery_days': quotation.delivery_days,
                'validity_date': quotation.validity_date,
                'lines': [
                    {
                        'inquiry_line': row.inquiry_line_id,
                        'unit_price': float(row.unit_price or 0),
                        'amount': float(row.amount or 0),
                    }
                    for row in quotation.lines.all()
                ],
            }
            for quotation in inquiry.quotations.select_related('supplier', 'currency')
            .prefetch_related('lines')
        ]
        return Response(compare_quotations(lines, quotations))

    @action(detail=True, methods=['post'])
    def award(self, request, pk=None):
        """انتخاب پیشنهاد برنده؛ بقیهٔ پیشنهادها رد می‌شوند."""
        inquiry = self.get_object()
        quotation = inquiry.quotations.filter(pk=request.data.get('quotation')).first()
        if not quotation:
            return Response({'detail': 'پیشنهاد انتخاب‌شده در این استعلام نیست.'}, status=400)
        inquiry.quotations.exclude(pk=quotation.pk).update(status='rejected', is_winner=False)
        quotation.status = 'winner'
        quotation.is_winner = True
        quotation.awarded_at = timezone.now()
        quotation.save(update_fields=['status', 'is_winner', 'awarded_at', 'updated_at'])
        inquiry.awarded_quotation = quotation
        inquiry.status = Inquiry.Status.AWARDED
        inquiry.save(update_fields=['awarded_quotation', 'status', 'updated_at'])
        return Response(self.get_serializer(inquiry).data)

    @action(detail=True, methods=['post'])
    def add_suppliers(self, request, pk=None):
        """افزودن تأمین‌کننده‌های دعوت‌شده (فهرست id)."""
        inquiry = self.get_object()
        added = 0
        for supplier_id in request.data.get('suppliers') or []:
            _, made = InquirySupplier.objects.get_or_create(
                inquiry=inquiry, supplier_id=supplier_id,
                defaults={'company': inquiry.company_id or _company(request)},
            )
            added += 1 if made else 0
        return Response({'added': added, 'total': inquiry.suppliers.count()})


class QuotationViewSet(SupplierFilterMixin, BaseViewSet):
    serializer_class = QuotationSerializer
    queryset = Quotation.objects.select_related(
        'supplier', 'inquiry', 'currency',
    ).prefetch_related('lines__item', 'lines__unit')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'supplier__name', 'inquiry__number', 'inquiry__subject']
    ordering_fields = ['date', 'total', 'delivery_days', 'status']
    ordering = ['total', 'delivery_days']

    def get_queryset(self):
        qs = super().get_queryset()
        inquiry_id = self.request.query_params.get('inquiry')
        if inquiry_id:
            qs = qs.filter(inquiry_id=inquiry_id)
        supplier_id = self.request.query_params.get('supplier')
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        return qs


class ProformaInvoiceViewSet(SupplierFilterMixin, BaseViewSet):
    serializer_class = ProformaInvoiceSerializer
    queryset = ProformaInvoice.objects.select_related(
        'supplier', 'order', 'quotation', 'currency', 'converted_invoice',
    ).prefetch_related('lines__item', 'lines__unit')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'proforma_number', 'supplier__name', 'description']
    ordering_fields = ['date', 'valid_until', 'total', 'status']
    ordering = ['-date', '-created_at']

    @action(detail=True, methods=['post'])
    def convert(self, request, pk=None):
        """تبدیل پیش‌فاکتور به صورتحساب خرید (+ انتقال سطرها)."""
        proforma = self.get_object()
        if proforma.converted_invoice_id:
            return Response({'detail': 'این پیش‌فاکتور قبلاً تبدیل شده است.'}, status=400)
        invoice = PurchaseInvoice.objects.create(
            company_id=proforma.company_id,
            number=request.data.get('number') or '',
            supplier=proforma.supplier,
            order=proforma.order,
            date=request.data.get('date') or timezone.localdate(),
            due_date=request.data.get('due_date') or None,
            invoice_number=proforma.proforma_number,
            status=PurchaseInvoice.Status.DRAFT,
            currency=proforma.currency,
            exchange_rate=proforma.exchange_rate,
            vat_rate=proforma.vat_rate,
            subtotal=proforma.subtotal,
            discount=proforma.discount,
            vat_amount=proforma.vat_amount,
            total=proforma.total,
            description=proforma.description,
        )
        for line in proforma.lines.all():
            invoice.lines.create(
                company_id=proforma.company_id,
                line_no=line.line_no,
                item=line.item,
                description=line.description,
                quantity=line.quantity,
                unit=line.unit,
                unit_price=line.unit_price,
                amount=line.amount,
            )
        proforma.status = ProformaInvoice.Status.CONVERTED
        proforma.converted_invoice = invoice
        proforma.save(update_fields=['status', 'converted_invoice', 'updated_at'])
        return Response(PurchaseInvoiceSerializer(invoice, context={'request': request}).data)



class ProcurementGuaranteeViewSet(BaseViewSet):
    serializer_class = ProcurementGuaranteeSerializer
    queryset = ProcurementGuarantee.objects.select_related(
        'supplier', 'inquiry', 'order', 'invoice', 'proforma', 'project',
    ).prefetch_related('actions')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'supplier__name', 'bank', 'order__number']
    ordering_fields = ['issue_date', 'expiry_date', 'amount']
    ordering = ['-issue_date', '-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        kind = self.request.query_params.get('kind')
        if kind:
            qs = qs.filter(kind=kind)
        supplier_id = self.request.query_params.get('supplier')
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        return qs

    @action(detail=True, methods=['post'], url_path='action')
    def lifecycle_action(self, request, pk=None):
        """ثبت اقدام چرخهٔ عمر تضمین (آزادسازی/استرداد/اجرا/ابطال/تمدید)."""
        guarantee = self.get_object()
        action_key = request.data.get('action')
        valid = {choice for choice, _label in ProcurementGuarantee.LifecycleAction.choices}
        if action_key not in valid:
            return Response({'detail': 'اقدام نامعتبر است.'}, status=400)
        action_date = request.data.get('date') or timezone.localdate()
        ProcurementGuaranteeAction.objects.create(
            company_id=guarantee.company_id,
            guarantee=guarantee,
            action=action_key,
            date=action_date,
            previous_amount=guarantee.amount,
            new_amount=request.data.get('new_amount') or None,
            previous_expiry_date=guarantee.expiry_date,
            new_expiry_date=request.data.get('new_expiry_date') or None,
            note=request.data.get('note') or '',
        )
        updates = ['last_action', 'last_action_date', 'updated_at']
        guarantee.last_action = action_key
        guarantee.last_action_date = action_date
        if action_key in ('released', 'returned'):
            guarantee.is_released = True
            guarantee.release_date = action_date
            updates += ['is_released', 'release_date']
        if request.data.get('new_amount'):
            guarantee.amount = request.data['new_amount']
            updates.append('amount')
        if request.data.get('new_expiry_date'):
            guarantee.expiry_date = request.data['new_expiry_date']
            updates.append('expiry_date')
        guarantee.save(update_fields=updates)
        return Response(self.get_serializer(guarantee).data)

    @action(detail=False, methods=['get'])
    def overview(self, request):
        """خلاصهٔ تضامین خرید: شمارش و مبالغ به‌تفکیک وضعیت اعتبار."""
        rows = list(self.get_queryset())
        result = {
            'count': len(rows),
            'amount_total': 0.0,
            'active': 0,
            'expiring_30': 0,
            'expired': 0,
            'released': 0,
            'amount_expired': 0.0,
            'amount_risk': 0.0,
        }
        for item in rows:
            validity = item.validity()
            amount = float(item.amount or 0)
            result['amount_total'] += amount
            if item.is_released:
                result['released'] += 1
                continue
            days = validity['days_to_expiry']
            if validity['is_expired']:
                result['expired'] += 1
                result['amount_expired'] += amount
            elif days is not None and days <= 30:
                result['expiring_30'] += 1
                result['amount_risk'] += amount
            else:
                result['active'] += 1
        return Response(result)



class PurchasePaymentAllocationViewSet(BaseViewSet):
    serializer_class = PurchasePaymentAllocationSerializer
    queryset = PurchasePaymentAllocation.objects.select_related('payment', 'invoice', 'proforma')
    ordering = ['id']

    def perform_create(self, serializer):
        from procurement.pricing import payment_status_of

        allocation = serializer.save(company=_company(self.request))
        invoice = allocation.invoice
        if invoice:
            paid = PurchasePaymentAllocation.objects.filter(invoice=invoice).aggregate(
                total=Sum('amount'),
            )['total'] or 0
            invoice.paid_amount = paid
            invoice.payment_status = payment_status_of(invoice.total, paid)
            invoice.save(update_fields=['paid_amount', 'payment_status', 'updated_at'])


class ProcurementDocumentViewSet(BaseViewSet):
    serializer_class = ProcurementDocumentSerializer
    queryset = ProcurementDocument.objects.select_related(
        'inquiry', 'quotation', 'order', 'proforma', 'invoice', 'guarantee',
    )
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'note']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        for field in ('inquiry', 'quotation', 'order', 'proforma', 'invoice', 'guarantee'):
            value = params.get(field)
            if value:
                qs = qs.filter(**{f'{field}_id': value})
        kind = params.get('kind')
        if kind:
            qs = qs.filter(kind=kind)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(
            company=_company(self.request),
            uploaded_by=user if user.is_authenticated else None,
        )



# ---------------------------------------------------------------------------
# داشبورد مدیریت خریدها — یک اندپوینت تجمیعی (بدون N+1)
# ---------------------------------------------------------------------------
ORDER_FIELDS = {
    'id': 'id', 'number': 'number', 'status': 'status', 'date': 'date',
    'expected_date': 'expected_date', 'total': 'total', 'exchange_rate': 'exchange_rate',
    'supplier_name': 'supplier__name', 'currency_code': 'currency__code',
    'currency_name': 'currency__name', 'project_name': 'project__name',
}
INVOICE_FIELDS = {
    'id': 'id', 'number': 'number', 'status': 'status', 'date': 'date',
    'due_date': 'due_date', 'total': 'total', 'paid_amount': 'paid_amount',
    'payment_status': 'payment_status', 'exchange_rate': 'exchange_rate',
    'supplier_name': 'supplier__name', 'currency_code': 'currency__code',
    'currency_name': 'currency__name',
}
GUARANTEE_FIELDS = {
    'id': 'id', 'number': 'number', 'kind': 'kind', 'instrument_type': 'instrument_type',
    'amount': 'amount', 'issue_date': 'issue_date', 'expiry_date': 'expiry_date',
    'check_due_date': 'check_due_date', 'guarantee_expiry_date': 'guarantee_expiry_date',
    'is_released': 'is_released', 'supplier_name': 'supplier__name',
}
DASHBOARD_ROW_LIMIT = 2000


def _dashboard_rows(queryset, fields, limit=DASHBOARD_ROW_LIMIT):
    """``values()`` با کلیدهای تخت + سقف ردیف (بدون N+1)."""
    return list(queryset.values(*sorted(set(fields.values())))[:limit])


def _flatten(row, fields):
    return {key: row.get(source) for key, source in fields.items()}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    """دادهٔ کامل داشبورد «مدیریت خریدها» (شاخص‌ها، تفکیک ارزی، روند، توزیع‌ها).

    همهٔ محاسبات در `procurement.dashboard` (توابع خالص) انجام می‌شود و این ویو
    فقط ردیف‌ها را با یک کوئری به‌ازای هر مدل می‌خواند.
    """
    from datetime import date

    from procurement import dashboard as dash

    company = _company(request)
    today = date.today()

    def scoped(model):
        queryset = model.objects.all()
        return queryset.filter(company=company) if company else queryset

    order_rows = [_flatten(row, ORDER_FIELDS)
                  for row in _dashboard_rows(scoped(PurchaseOrder).order_by('-date'), ORDER_FIELDS)]
    orders = []
    for row in order_rows:
        document = dash.normalize_document(row)
        document['expected_date'] = dash.iso(row.get('expected_date'))
        orders.append(document)

    invoice_rows = [_flatten(row, INVOICE_FIELDS)
                    for row in _dashboard_rows(scoped(PurchaseInvoice).order_by('-date'), INVOICE_FIELDS)]
    invoices = []
    for row in invoice_rows:
        document = dash.normalize_document(row)
        rate = document['rate'] if document['group'] == 'foreign' else 1
        document['paid_amount'] = dash.num(row.get('paid_amount')) * rate
        due = dash.day(row.get('due_date'))
        unpaid = (row.get('payment_status') or 'unpaid') != 'paid'
        document['overdue'] = bool(
            due and due < today and unpaid and row.get('status') != 'cancelled'
        )
        invoices.append(document)

    payments = [
        {'date': dash.iso(row.get('date')), 'amount': dash.num(row.get('amount'))}
        for row in _dashboard_rows(
            scoped(PurchasePayment).order_by('-date'), {'date': 'date', 'amount': 'amount'},
        )
    ]

    inquiries = [
        {'status': row.get('status') or '', 'date': dash.iso(row.get('date'))}
        for row in _dashboard_rows(
            scoped(Inquiry).order_by('-date'),
            {'status': 'status', 'date': 'date', 'deadline': 'deadline'},
        )
    ]

    guarantee_rows = [_flatten(row, GUARANTEE_FIELDS)
                      for row in _dashboard_rows(scoped(ProcurementGuarantee), GUARANTEE_FIELDS)]
    kind_labels = dict(ProcurementGuarantee.Kind.choices)
    guarantees = []
    for row in guarantee_rows:
        item = dict(row)
        item['kind_label'] = str(kind_labels.get(row.get('kind'), row.get('kind') or ''))
        guarantees.append(item)

    counts = {
        'suppliers': scoped(Supplier).count(),
        'items': scoped(Item).count(),
        'requests': scoped(PurchaseRequest).count(),
        'receipts': scoped(GoodsReceiptNote).count(),
        'proformas': scoped(ProformaInvoice).count(),
        'orders': len(orders),
        'invoices': len(invoices),
        'payments': len(payments),
        'inquiries': len(inquiries),
        'guarantees': len(guarantees),
    }

    payload = dash.build_dashboard(
        counts, orders, invoices, payments, inquiries, guarantees,
        order_status_choices=PurchaseOrder.Status.choices,
        inquiry_status_choices=Inquiry.Status.choices,
        today=today,
    )
    return Response(payload)


# ---------------------------------------------------------------------------
# پرونده‌های خرید — یک ردیف برای هر طرف حساب (تأمین‌کننده) با جمع اسناد
# ---------------------------------------------------------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def supplier_profiles_view(request):
    """فهرست پرونده‌های خرید به‌ازای هر تأمین‌کننده.

    برای هر طرف حساب: تعداد و مبلغ سفارش‌ها، فاکتورها (با پرداخت‌شده)،
    پیش‌فاکتورها، پیشنهادها و تضامین — همه در **یک کوئری** با Subquery
    (بدون N+1).
    """
    from django.db.models import Count, DecimalField, OuterRef, Subquery, Sum, Value
    from django.db.models.functions import Coalesce

    supplier_id = request.query_params.get('supplier')
    queryset = Supplier.objects.filter(company=_company(request)).order_by('name')
    if supplier_id:
        queryset = queryset.filter(pk=supplier_id)

    amount_field = DecimalField(max_digits=20, decimal_places=2)

    def _total(model, field):
        return Coalesce(
            Subquery(
                model.objects.filter(supplier=OuterRef('pk'))
                .values('supplier').annotate(total=Sum(field)).values('total')[:1]
            ),
            Value(0),
            output_field=amount_field,
        )

    queryset = queryset.annotate(
        orders_count=Count('purchase_orders', distinct=True),
        orders_total=_total(PurchaseOrder, 'total'),
        invoices_count=Count('invoices', distinct=True),
        invoices_total=_total(PurchaseInvoice, 'total'),
        invoices_paid=_total(PurchaseInvoice, 'paid_amount'),
        proformas_count=Count('proforma_invoices', distinct=True),
        proformas_total=_total(ProformaInvoice, 'total'),
        quotations_count=Count('quotations', distinct=True),
        guarantees_count=Count('guarantees', distinct=True),
        guarantees_total=_total(ProcurementGuarantee, 'amount'),
    )

    rows = []
    for supplier in queryset:
        rows.append({
            'id': supplier.pk,
            'name': supplier.name,
            'code': supplier.code,
            'status': supplier.status,
            'status_label': supplier.get_status_display(),
            'phone': supplier.phone,
            'rating': float(supplier.rating or 0),
            'orders_count': supplier.orders_count,
            'orders_total': float(supplier.orders_total or 0),
            'invoices_count': supplier.invoices_count,
            'invoices_total': float(supplier.invoices_total or 0),
            'invoices_paid': float(supplier.invoices_paid or 0),
            'invoices_balance': float(supplier.invoices_total or 0) - float(supplier.invoices_paid or 0),
            'proformas_count': supplier.proformas_count,
            'proformas_total': float(supplier.proformas_total or 0),
            'quotations_count': supplier.quotations_count,
            'guarantees_count': supplier.guarantees_count,
            'guarantees_total': float(supplier.guarantees_total or 0),
            'documents_count': (
                supplier.orders_count + supplier.invoices_count + supplier.proformas_count
                + supplier.quotations_count + supplier.guarantees_count
            ),
        })
    return Response({'count': len(rows), 'results': rows})
