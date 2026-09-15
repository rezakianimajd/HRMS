from django.urls import path, include
from rest_framework.routers import DefaultRouter
from accounting.views import (
    BranchViewSet, FiscalYearViewSet, FiscalPeriodViewSet, AccountingBookViewSet,
    AccountTypeViewSet, AccountGroupViewSet, AccountViewSet,
    AuxiliaryAccountViewSet, AccountingDimensionViewSet, DimensionValueViewSet,
    CostCenterViewSet, JournalViewSet, AccountingDocumentViewSet,
    AccountingSequenceViewSet, SourceTransactionViewSet,
    PostingTemplateViewSet, AccountingSettingsViewSet,
)

router = DefaultRouter()
router.register(r'branches', BranchViewSet, basename='accounting-branch')
router.register(r'fiscal-years', FiscalYearViewSet, basename='fiscal-year')
router.register(r'fiscal-periods', FiscalPeriodViewSet, basename='fiscal-period')
router.register(r'books', AccountingBookViewSet, basename='accounting-book')
router.register(r'account-types', AccountTypeViewSet, basename='account-type')
router.register(r'account-groups', AccountGroupViewSet, basename='account-group')
router.register(r'accounts', AccountViewSet, basename='account')
router.register(r'auxiliary-accounts', AuxiliaryAccountViewSet, basename='auxiliary-account')
router.register(r'dimensions', AccountingDimensionViewSet, basename='accounting-dimension')
router.register(r'dimension-values', DimensionValueViewSet, basename='dimension-value')
router.register(r'cost-centers', CostCenterViewSet, basename='cost-center')
router.register(r'journals', JournalViewSet, basename='journal')
router.register(r'documents', AccountingDocumentViewSet, basename='accounting-document')
router.register(r'sequences', AccountingSequenceViewSet, basename='accounting-sequence')
router.register(r'source-transactions', SourceTransactionViewSet, basename='source-transaction')
router.register(r'posting-templates', PostingTemplateViewSet, basename='posting-template')
router.register(r'settings', AccountingSettingsViewSet, basename='accounting-settings')

urlpatterns = [
    path('', include(router.urls)),
]