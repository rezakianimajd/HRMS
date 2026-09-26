from django.urls import path, include
from rest_framework.routers import DefaultRouter
from accounting import report_views
from accounting import annual_views
from accounting.views import (
    BranchViewSet, FiscalYearViewSet, FiscalPeriodViewSet, AccountingBookViewSet,
    AccountTypeViewSet, AccountGroupViewSet, AccountViewSet,
    AuxiliaryAccountViewSet, AuxiliaryCategoryViewSet,
    AccountingDimensionViewSet, DimensionValueViewSet,
    CostCenterViewSet, JournalViewSet, AccountingDocumentViewSet,
    BankStatementViewSet, BankStatementLineViewSet, BankReconciliationViewSet,
    ApprovalPolicyViewSet, ApprovalStepViewSet,
    AccountingSequenceViewSet, SourceTransactionViewSet,
    PostingTemplateViewSet, AccountingSettingsViewSet, CodingConfigViewSet,
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
router.register(r'auxiliary-categories', AuxiliaryCategoryViewSet, basename='auxiliary-category')
router.register(r'dimensions', AccountingDimensionViewSet, basename='accounting-dimension')
router.register(r'dimension-values', DimensionValueViewSet, basename='dimension-value')
router.register(r'cost-centers', CostCenterViewSet, basename='cost-center')
router.register(r'journals', JournalViewSet, basename='journal')
router.register(r'documents', AccountingDocumentViewSet, basename='accounting-document')
router.register(r'bank-statements', BankStatementViewSet, basename='bank-statement')
router.register(r'bank-statement-lines', BankStatementLineViewSet, basename='bank-statement-line')
router.register(r'bank-reconciliations', BankReconciliationViewSet, basename='bank-reconciliation')
router.register(r'approval-policies', ApprovalPolicyViewSet, basename='approval-policy')
router.register(r'approval-steps', ApprovalStepViewSet, basename='approval-step')
router.register(r'sequences', AccountingSequenceViewSet, basename='accounting-sequence')
router.register(r'source-transactions', SourceTransactionViewSet, basename='source-transaction')
router.register(r'posting-templates', PostingTemplateViewSet, basename='posting-template')
router.register(r'settings', AccountingSettingsViewSet, basename='accounting-settings')
router.register(r'coding-configs', CodingConfigViewSet, basename='coding-config')

urlpatterns = [
    path('', include(router.urls)),
    path('reports/general-ledger/', report_views.general_ledger, name='report-general-ledger'),
    path('reports/account-ledger/<int:account_id>/', report_views.account_ledger, name='report-account-ledger'),
    path('reports/trial-balance/', report_views.trial_balance, name='report-trial-balance'),
    path('reports/income-statement/', report_views.income_statement, name='report-income-statement'),
    path('reports/balance-sheet/', report_views.balance_sheet, name='report-balance-sheet'),
    path('reports/cash-flow/', report_views.cash_flow, name='report-cash-flow'),
    path('reports/dashboard/', report_views.dashboard, name='report-dashboard'),
    path('reports/tree-trial-balance/', report_views.tree_trial_balance, name='report-tree-trial-balance'),
    path('reports/matrix/', report_views.matrix_report, name='report-matrix'),
    path('reports/ledger-review/', report_views.ledger_review, name='report-ledger-review'),
    path('reports/financial-statements/', report_views.financial_statements, name='report-financial-statements'),
    path('annual/opening-document/', annual_views.opening_document, name='annual-opening-document'),
    path('annual/close-accounts/', annual_views.close_accounts, name='annual-close-accounts'),
    path('annual/closing-document/', annual_views.closing_document, name='annual-closing-document'),
    path('annual/legal-books/', annual_views.legal_books, name='annual-legal-books'),
]