from django.urls import path, include
from rest_framework.routers import DefaultRouter
from contracts.views import (
    ContractPartyViewSet, ContractViewSet, ContractDocumentViewSet,
    InvoiceViewSet, StatementViewSet, AddendumViewSet, GuaranteeViewSet,
    PaymentViewSet, ContractDisputeViewSet,
    ContractTypeMasterViewSet, SupplierEvaluationViewSet,
    ContractTemplateViewSet, ContractDraftViewSet, ContractApprovalViewSet,
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
router.register(r'contract-disputes', ContractDisputeViewSet, basename='contract-dispute')
router.register(r'contract-types-master', ContractTypeMasterViewSet, basename='contract-type-master')
router.register(r'supplier-evaluations', SupplierEvaluationViewSet, basename='supplier-evaluation')
router.register(r'contract-templates', ContractTemplateViewSet, basename='contract-template')
router.register(r'contract-drafts', ContractDraftViewSet, basename='contract-draft')
router.register(r'contract-approvals', ContractApprovalViewSet, basename='contract-approval')

urlpatterns = [
    path('', include(router.urls)),
]