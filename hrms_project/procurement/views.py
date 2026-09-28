"""Views for the Procurement (خرید و تدارکات) module."""
from django.db.models import Sum
from django.utils import timezone
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response

from procurement.models import (
    SupplierCategory, Supplier, ItemCategory, UnitOfMeasure, Item,
    PurchaseRequest, PurchaseOrder, PurchaseOrderLine,
    GoodsReceiptNote, PurchaseInvoice, PurchasePayment, ProcurementApprovalPolicy,
)
from procurement.serializers import (
    SupplierCategorySerializer, SupplierSerializer, ItemCategorySerializer,
    UnitOfMeasureSerializer, ItemSerializer,
    PurchaseRequestSerializer, PurchaseOrderSerializer,
    GoodsReceiptNoteSerializer, PurchaseInvoiceSerializer, PurchasePaymentSerializer,
    ProcurementApprovalPolicySerializer,
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


class PurchaseOrderViewSet(BaseViewSet):
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
        return Response(self.get_serializer(obj).data)


class PurchaseInvoiceViewSet(BaseViewSet):
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


class PurchasePaymentViewSet(BaseViewSet):
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