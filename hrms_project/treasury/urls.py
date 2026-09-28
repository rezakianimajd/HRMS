from django.urls import path, include
from rest_framework.routers import DefaultRouter
from treasury.views import (
    TreasuryEntityViewSet, TreasuryTransactionViewSet, PayableItemViewSet,
    CheckBookViewSet, ReceivedCheckViewSet, IssuedCheckViewSet,
)
from treasury.payment_views import (
    TreasuryPaymentTypeViewSet, TreasuryPaymentMethodViewSet,
    PaymentCommitmentViewSet, PaymentRequestViewSet, PaymentOrderViewSet,
)
from treasury.operation_views import (
    ReceiptViewSet, AdvanceAccountViewSet, AdvanceSettlementViewSet,
    TreasuryTransferViewSet, TreasuryGuaranteeViewSet,
)
from treasury.planning_views import (
    TreasuryReconciliationViewSet, CashFlowForecastViewSet,
)

router = DefaultRouter()
router.register(r'treasury-entities', TreasuryEntityViewSet, basename='treasury-entity')
router.register(r'treasury-transactions', TreasuryTransactionViewSet, basename='treasury-transaction')
router.register(r'payable-items', PayableItemViewSet, basename='payable-item')
router.register(r'check-books', CheckBookViewSet, basename='check-book')
router.register(r'received-checks', ReceivedCheckViewSet, basename='received-check')
router.register(r'issued-checks', IssuedCheckViewSet, basename='issued-check')
router.register(r'payment-types', TreasuryPaymentTypeViewSet, basename='payment-type')
router.register(r'payment-methods', TreasuryPaymentMethodViewSet, basename='payment-method')
router.register(r'payment-commitments', PaymentCommitmentViewSet, basename='payment-commitment')
router.register(r'payment-requests', PaymentRequestViewSet, basename='payment-request')
router.register(r'payment-orders', PaymentOrderViewSet, basename='payment-order')
router.register(r'receipts', ReceiptViewSet, basename='receipt')
router.register(r'advance-accounts', AdvanceAccountViewSet, basename='advance-account')
router.register(r'advance-settlements', AdvanceSettlementViewSet, basename='advance-settlement')
router.register(r'treasury-transfers', TreasuryTransferViewSet, basename='treasury-transfer')
router.register(r'guarantees', TreasuryGuaranteeViewSet, basename='guarantee')
router.register(r'treasury-reconciliations', TreasuryReconciliationViewSet, basename='treasury-reconciliation')
router.register(r'cash-flow-forecast', CashFlowForecastViewSet, basename='cash-flow-forecast')

urlpatterns = [
    path('', include(router.urls)),
]