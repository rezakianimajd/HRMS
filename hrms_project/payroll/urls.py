from django.urls import path, include
from rest_framework.routers import DefaultRouter
from payroll.views import (
    BenefitRecordViewSet, BenefitTypeDefinitionViewSet, EmployeeLoanViewSet,
    SalaryRecordViewSet, TransactionViewSet,
)
from payroll.views_payroll import (
    EmployeeAdvanceViewSet, EmployeeLoanInstallmentViewSet,
    EmployeePayrollComponentViewSet, EmployeePayrollProfileViewSet,
    PayrollAccountMappingViewSet, PayrollAdjustmentViewSet, PayrollBankFormatViewSet,
    PayrollChangeLogViewSet, PayrollComponentRuleViewSet, PayrollComponentViewSet,
    PayrollCostAllocationViewSet, PayrollCostViewSet, PayrollDashboardView,
    PayrollEmployeeResultViewSet, PayrollInsuranceRateViewSet, PayrollOptionsView,
    PayrollWorkDataViewSet,
    PayrollOvertimeViewSet, PayrollPaymentBatchViewSet, PayrollPeriodViewSet,
    PayrollReconciliationView, PayrollReportsView, PayrollSeedView,
    PayrollSettingsViewSet, PayrollSettlementViewSet, PayrollTaxBracketViewSet,
)

router = DefaultRouter()
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'salaries', SalaryRecordViewSet, basename='salary')
router.register(r'benefits', BenefitRecordViewSet, basename='benefit')
router.register(r'benefit-type-definitions', BenefitTypeDefinitionViewSet, basename='benefit-type-definition')
router.register(r'loans', EmployeeLoanViewSet, basename='loan')

# New component-based payroll
router.register(r'payroll-periods', PayrollPeriodViewSet, basename='payroll-period')
router.register(r'payroll-results', PayrollEmployeeResultViewSet, basename='payroll-result')
router.register(r'payroll-components', PayrollComponentViewSet, basename='payroll-component')
router.register(r'payroll-component-rules', PayrollComponentRuleViewSet, basename='payroll-component-rule')
router.register(r'payroll-settings', PayrollSettingsViewSet, basename='payroll-settings')
router.register(r'payroll-insurance-rates', PayrollInsuranceRateViewSet, basename='payroll-insurance-rate')
router.register(r'payroll-tax-brackets', PayrollTaxBracketViewSet, basename='payroll-tax-bracket')
router.register(r'payroll-profiles', EmployeePayrollProfileViewSet, basename='payroll-profile')
router.register(r'payroll-component-assignments', EmployeePayrollComponentViewSet,
                basename='payroll-component-assignment')
router.register(r'payroll-overtimes', PayrollOvertimeViewSet, basename='payroll-overtime')
router.register(r'payroll-work-data', PayrollWorkDataViewSet, basename='payroll-work-data')
router.register(r'payroll-advances', EmployeeAdvanceViewSet, basename='payroll-advance')
router.register(r'payroll-loan-installments', EmployeeLoanInstallmentViewSet,
                basename='payroll-loan-installment')
router.register(r'payroll-cost-allocations', PayrollCostAllocationViewSet,
                basename='payroll-cost-allocation')
router.register(r'payroll-costs', PayrollCostViewSet, basename='payroll-cost')
router.register(r'payroll-account-mappings', PayrollAccountMappingViewSet,
                basename='payroll-account-mapping')
router.register(r'payroll-bank-formats', PayrollBankFormatViewSet, basename='payroll-bank-format')
router.register(r'payroll-payment-batches', PayrollPaymentBatchViewSet,
                basename='payroll-payment-batch')
router.register(r'payroll-settlements', PayrollSettlementViewSet, basename='payroll-settlement')
router.register(r'payroll-adjustments', PayrollAdjustmentViewSet, basename='payroll-adjustment')
router.register(r'payroll-change-logs', PayrollChangeLogViewSet, basename='payroll-change-log')

urlpatterns = [
    path('payroll/options/', PayrollOptionsView.as_view(), name='payroll-options'),
    path('payroll/dashboard/', PayrollDashboardView.as_view(), name='payroll-dashboard'),
    path('payroll/reports/', PayrollReportsView.as_view(), name='payroll-reports'),
    path('payroll/reconciliation/', PayrollReconciliationView.as_view(), name='payroll-reconciliation'),
    path('payroll/seed-defaults/', PayrollSeedView.as_view(), name='payroll-seed-defaults'),
    path('', include(router.urls)),
]
