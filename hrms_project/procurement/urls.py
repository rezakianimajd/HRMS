from django.urls import path, include
from rest_framework.routers import DefaultRouter
from procurement.views import (
    SupplierCategoryViewSet, SupplierViewSet, ItemCategoryViewSet,
    UnitOfMeasureViewSet, ItemViewSet, PurchaseRequestViewSet,
    PurchaseOrderViewSet, GoodsReceiptNoteViewSet, PurchaseInvoiceViewSet,
    PurchasePaymentViewSet, ProcurementApprovalPolicyViewSet,
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

urlpatterns = [
    path('', include(router.urls)),
]