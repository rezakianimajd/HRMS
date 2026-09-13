from django.urls import path, include
from rest_framework.routers import DefaultRouter
from projects.views import (
    ProjectTypeViewSet, ProjectViewSet, ProjectPhaseViewSet, WBSNodeViewSet,
    WBSTemplateViewSet, CBSNodeViewSet, ResourceCategoryViewSet, ResourceViewSet,
    CostSourceViewSet, OBSNodeViewSet,
    PriceListViewSet, PriceListVersionViewSet, PriceListChapterViewSet,
    PriceListItemViewSet, ContractItemViewSet, ContractWBSViewSet,
    ContractPriceBasisViewSet,
)
from projects.cost_views import (
    BudgetLineViewSet, CommittedCostViewSet, CostTransactionViewSet,
    CostTransactionLineViewSet, ProgressStatementViewSet, ProgressStatementItemViewSet,
)

router = DefaultRouter()
router.register(r'project-types', ProjectTypeViewSet, basename='project-type')
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'project-phases', ProjectPhaseViewSet, basename='project-phase')
router.register(r'wbs-nodes', WBSNodeViewSet, basename='wbs-node')
router.register(r'wbs-templates', WBSTemplateViewSet, basename='wbs-template')
router.register(r'cbs-nodes', CBSNodeViewSet, basename='cbs-node')
router.register(r'resource-categories', ResourceCategoryViewSet, basename='resource-category')
router.register(r'resources', ResourceViewSet, basename='resource')
router.register(r'cost-sources', CostSourceViewSet, basename='cost-source')
router.register(r'obs-nodes', OBSNodeViewSet, basename='obs-node')
router.register(r'price-lists', PriceListViewSet, basename='price-list')
router.register(r'price-list-versions', PriceListVersionViewSet, basename='price-list-version')
router.register(r'price-list-chapters', PriceListChapterViewSet, basename='price-list-chapter')
router.register(r'price-list-items', PriceListItemViewSet, basename='price-list-item')
router.register(r'contract-items', ContractItemViewSet, basename='contract-item')
router.register(r'contract-wbs', ContractWBSViewSet, basename='contract-wbs')
router.register(r'contract-price-bases', ContractPriceBasisViewSet, basename='contract-price-basis')
router.register(r'budget-lines', BudgetLineViewSet, basename='budget-line')
router.register(r'committed-costs', CommittedCostViewSet, basename='committed-cost')
router.register(r'cost-transactions', CostTransactionViewSet, basename='cost-transaction')
router.register(r'cost-transaction-lines', CostTransactionLineViewSet, basename='cost-transaction-line')
router.register(r'progress-statements', ProgressStatementViewSet, basename='progress-statement')
router.register(r'progress-statement-items', ProgressStatementItemViewSet, basename='progress-statement-item')

from projects import analytics_views

urlpatterns = [
    path('', include(router.urls)),
    path('analytics/cost-summary/', analytics_views.cost_summary, name='cost-summary'),
    path('analytics/cost-by-wbs/', analytics_views.cost_by_wbs, name='cost-by-wbs'),
    path('analytics/cost-by-cbs/', analytics_views.cost_by_cbs, name='cost-by-cbs'),
]
