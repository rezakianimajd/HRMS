"""پنل ادمین حقوق و دستمزد (payroll)."""
from django.contrib import admin

from payroll.models import EmployeeTransaction, SalaryRecord, BenefitRecord, EmployeeLoan


@admin.register(EmployeeTransaction)
class EmployeeTransactionAdmin(admin.ModelAdmin):
    list_display = ('employee', 'transaction_type', 'sub_type', 'title', 'amount', 'quantity', 'date')
    list_filter = ('transaction_type', 'date')
    search_fields = ('employee__first_name', 'employee__last_name', 'employee__employee_id',
                     'title', 'reference_number')
    list_select_related = ('employee',)
    raw_id_fields = ('employee',)
    date_hierarchy = 'date'
    ordering = ('-date',)


@admin.register(SalaryRecord)
class SalaryRecordAdmin(admin.ModelAdmin):
    list_display = ('employee', 'year', 'month', 'work_days', 'total_benefits',
                    'total_deductions', 'net_payable')
    list_filter = ('year', 'month')
    search_fields = ('employee__first_name', 'employee__last_name', 'employee__employee_id')
    list_select_related = ('employee',)
    raw_id_fields = ('employee',)
    ordering = ('-year', '-month')


@admin.register(BenefitRecord)
class BenefitRecordAdmin(admin.ModelAdmin):
    list_display = ('employee', 'year', 'month', 'benefit_type', 'gross_amount',
                    'reserved_tax', 'paid_amount')
    list_filter = ('year', 'month', 'benefit_type')
    search_fields = ('employee__first_name', 'employee__last_name', 'employee__employee_id')
    list_select_related = ('employee',)
    raw_id_fields = ('employee',)
    ordering = ('-year', '-month')


@admin.register(EmployeeLoan)
class EmployeeLoanAdmin(admin.ModelAdmin):
    list_display = ('employee', 'loan_type', 'amount', 'installment_count',
                    'installment_amount', 'grant_date', 'due_date', 'status')
    list_filter = ('status', 'loan_type')
    search_fields = ('employee__first_name', 'employee__last_name', 'employee__employee_id', 'description')
    list_select_related = ('employee',)
    raw_id_fields = ('employee',)
    ordering = ('-grant_date',)


# New payroll core — registered with a compact dynamic admin.
from payroll.models import (  # noqa: E402
    EmployeeAdvance, EmployeeLoanInstallment, EmployeePayrollComponent,
    EmployeePayrollProfile, PayrollAccountMapping, PayrollAdjustment, PayrollBankFormat,
    PayrollChangeLog, PayrollComponent, PayrollComponentRule, PayrollCost,
    PayrollCostAllocation, PayrollEmployeeResult, PayrollInsuranceRate, PayrollItem,
    PayrollOvertime, PayrollPaymentBatch, PayrollPaymentBatchLine, PayrollPeriod,
    PayrollSettlement, PayrollSettings, PayrollTaxBracket,
)

for _model in (
    PayrollSettings, PayrollInsuranceRate, PayrollTaxBracket, PayrollComponent,
    PayrollComponentRule, EmployeePayrollProfile, EmployeePayrollComponent, PayrollPeriod,
    PayrollEmployeeResult, PayrollItem, PayrollOvertime, EmployeeAdvance,
    EmployeeLoanInstallment, PayrollCostAllocation, PayrollCost, PayrollAccountMapping,
    PayrollBankFormat, PayrollPaymentBatch, PayrollPaymentBatchLine, PayrollSettlement,
    PayrollAdjustment, PayrollChangeLog,
):
    if not admin.site.is_registered(_model):
        admin.site.register(_model)
