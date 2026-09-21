from django.urls import path, include
from rest_framework.routers import DefaultRouter
from pettycash.views import (
    PettyCashFundViewSet, PettyCashTransactionViewSet, PettyCashCategoryViewSet,
    PettyCashExpenseStatementViewSet, PettyCashApprovalPolicyViewSet,
    PettyCashApprovalStepViewSet,
)

router = DefaultRouter()
router.register(r'petty-cash-funds', PettyCashFundViewSet, basename='petty-cash-fund')
router.register(r'petty-cash-transactions', PettyCashTransactionViewSet, basename='petty-cash-transaction')
router.register(r'petty-cash-categories', PettyCashCategoryViewSet, basename='petty-cash-category')
router.register(r'petty-cash-expense-statements', PettyCashExpenseStatementViewSet, basename='petty-cash-expense-statement')
router.register(r'petty-cash-approval-policies', PettyCashApprovalPolicyViewSet, basename='petty-cash-approval-policy')
router.register(r'petty-cash-approval-steps', PettyCashApprovalStepViewSet, basename='petty-cash-approval-step')

urlpatterns = [
    path('', include(router.urls)),
]