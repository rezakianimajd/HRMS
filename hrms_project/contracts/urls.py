from django.urls import path, include
from rest_framework.routers import DefaultRouter
from contracts.views import (
    ContractPartyViewSet, ContractViewSet, ContractDocumentViewSet,
    InvoiceViewSet, StatementViewSet, AddendumViewSet, GuaranteeViewSet, PaymentViewSet,
)

router = DefaultRouter()
router.register(r'external-contracts', ContractViewSet, basename='external-contract')
router.register(r'contract-parties', ContractPartyViewSet, basename='contract-party')
router.register(r'contract-documents', ContractDocumentViewSet, basename='contract-document')
router.register(r'contract-invoices', InvoiceViewSet, basename='contract-invoice')
router.register(r'contract-statements', StatementViewSet, basename='contract-statement')
router.register(r'contract-addendums', AddendumViewSet, basename='contract-addendum')
router.register(r'contract-guarantees', GuaranteeViewSet, basename='contract-guarantee')
router.register(r'contract-payments', PaymentViewSet, basename='contract-payment')

urlpatterns = [
    path('', include(router.urls)),
]