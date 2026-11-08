from django.urls import path, include
from rest_framework.routers import DefaultRouter
from procurement.views import (
    supplier_profiles_view,
    SupplierCategoryViewSet, SupplierViewSet, ItemCategoryViewSet,
    UnitOfMeasureViewSet, ItemViewSet, PurchaseRequestViewSet,
    PurchaseOrderViewSet, GoodsReceiptNoteViewSet, PurchaseInvoiceViewSet,
    PurchasePaymentViewSet, ProcurementApprovalPolicyViewSet,
    InquiryViewSet, QuotationViewSet, ProformaInvoiceViewSet,
    ProcurementGuaranteeViewSet, PurchasePaymentAllocationViewSet,
    ProcurementDocumentViewSet,
)

router = DefaultRouter()
router.register(r'supplier-categories', SupplierCategoryViewSet, basename='supplier-category')
router.register(r'suppliers', SupplierViewSet, basename='supplier')
router.register(r'item-categories', ItemCategoryViewSet, basename='item-category')
router.register(r'units', UnitOfMeasureViewSet, basename='unit-of-measure')
router.register(r'items', ItemViewSet, basename='item')
router.register(r'purchase-requests', PurchaseRequestViewSet, basename='purchase-request')
router.register(r'purchase-orders', PurchaseOrderViewSet, basename='purchase-order')
router.register(r'good-receipts', GoodsReceiptNoteViewSet, basename='goods-receipt')
router.register(r'purchase-invoices', PurchaseInvoiceViewSet, basename='purchase-invoice')
router.register(r'purchase-payments', PurchasePaymentViewSet, basename='purchase-payment')
router.register(r'procurement-policies', ProcurementApprovalPolicyViewSet, basename='procurement-policy')
# استعلام و زنجیرهٔ خرید
router.register(r'inquiries', InquiryViewSet, basename='inquiry')
router.register(r'quotations', QuotationViewSet, basename='quotation')
router.register(r'proforma-invoices', ProformaInvoiceViewSet, basename='proforma-invoice')
router.register(r'procurement-guarantees', ProcurementGuaranteeViewSet, basename='procurement-guarantee')
router.register(r'payment-allocations', PurchasePaymentAllocationViewSet, basename='payment-allocation')
router.register(r'procurement-documents', ProcurementDocumentViewSet, basename='procurement-document')

urlpatterns = [
    path('supplier-profiles/', supplier_profiles_view, name='supplier-profiles'),
    path('', include(router.urls)),
]