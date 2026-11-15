"""پنل ادمین ماژول تنخواه."""
from django.contrib import admin

from pettycash.models import (
    PettyCashApprovalPolicy, PettyCashApprovalStep, PettyCashCategory,
    PettyCashCustodian, PettyCashExpenseAttachment, PettyCashExpenseStatement,
    PettyCashExpenseStatementLine, PettyCashFund, PettyCashPayment,
    PettyCashRequest, PettyCashSettlement, PettyCashSettings, PettyCashTransaction,
)


@admin.register(PettyCashFund)
class PettyCashFundAdmin(admin.ModelAdmin):
    list_display = ('code', 'title', 'custodian', 'kind', 'status', 'opening_balance', 'balance')
    list_filter = ('kind', 'status', 'is_active')
    search_fields = ('code', 'title', 'custodian__first_name', 'custodian__last_name')
    list_select_related = ('custodian',)
    raw_id_fields = ('custodian', 'account', 'general_account', 'advance_account')
    date_hierarchy = 'created_at'


@admin.register(PettyCashTransaction)
class PettyCashTransactionAdmin(admin.ModelAdmin):
    list_display = ('fund', 'entry_type', 'title', 'amount', 'date', 'payment_method', 'is_void')
    list_filter = ('entry_type', 'payment_method', 'is_void', 'date')
    search_fields = ('title', 'description', 'reference', 'fund__title', 'fund__code')
    list_select_related = ('fund', 'category')
    raw_id_fields = ('fund', 'category', 'statement', 'settlement', 'project', 'cost_center')
    date_hierarchy = 'date'


@admin.register(PettyCashCategory)
class PettyCashCategoryAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'budget_monthly', 'is_active')
    search_fields = ('code', 'name')


@admin.register(PettyCashExpenseStatement)
class PettyCashExpenseStatementAdmin(admin.ModelAdmin):
    list_display = ('number', 'fund', 'date', 'status', 'total', 'custodian')
    list_filter = ('status', 'date')
    search_fields = ('number', 'description', 'fund__title', 'fund__code')
    list_select_related = ('fund', 'custodian')
    raw_id_fields = ('fund', 'custodian', 'project', 'cost_center')
    date_hierarchy = 'date'


@admin.register(PettyCashExpenseStatementLine)
class PettyCashExpenseStatementLineAdmin(admin.ModelAdmin):
    list_display = ('statement', 'description', 'debit')
    search_fields = ('description', 'statement__number')
    raw_id_fields = ('statement', 'account', 'project', 'cost_center')


@admin.register(PettyCashExpenseAttachment)
class PettyCashExpenseAttachmentAdmin(admin.ModelAdmin):
    list_display = ('line', 'title', 'file')
    search_fields = ('title', 'line__statement__number')
    raw_id_fields = ('line', 'uploaded_by')


@admin.register(PettyCashRequest)
class PettyCashRequestAdmin(admin.ModelAdmin):
    list_display = ('number', 'kind', 'fund', 'amount', 'status', 'needed_date')
    list_filter = ('kind', 'status')
    search_fields = ('number', 'reason', 'fund__title', 'fund__code')
    list_select_related = ('fund', 'custodian')
    raw_id_fields = ('fund', 'custodian', 'project', 'cost_center')
    date_hierarchy = 'created_at'


@admin.register(PettyCashSettlement)
class PettyCashSettlementAdmin(admin.ModelAdmin):
    list_display = ('number', 'fund', 'date', 'cash_counted', 'status', 'shortage', 'recharge_amount')
    list_filter = ('status', 'date')
    search_fields = ('number', 'notes', 'fund__title', 'fund__code')
    list_select_related = ('fund', 'custodian')
    raw_id_fields = ('fund', 'custodian')
    date_hierarchy = 'date'


@admin.register(PettyCashPayment)
class PettyCashPaymentAdmin(admin.ModelAdmin):
    list_display = (
        'number', 'fund', 'kind', 'method', 'amount', 'payment_date',
        'destination_entity', 'reference',
    )
    list_filter = ('kind', 'method', 'payment_date')
    search_fields = ('number', 'reference', 'description', 'fund__title', 'fund__code')
    list_select_related = ('fund', 'custodian', 'destination_entity')
    raw_id_fields = ('fund', 'custodian', 'destination_entity', 'transaction', 'paid_by')
    date_hierarchy = 'payment_date'


@admin.register(PettyCashCustodian)
class PettyCashCustodianAdmin(admin.ModelAdmin):
    list_display = ('employee', 'role', 'user', 'supervisor', 'is_active')
    list_filter = ('role', 'is_active')
    search_fields = ('employee__first_name', 'employee__last_name', 'employee__employee_id')
    list_select_related = ('employee', 'user', 'supervisor')
    raw_id_fields = ('employee', 'user', 'supervisor', 'funds')


@admin.register(PettyCashSettings)
class PettyCashSettingsAdmin(admin.ModelAdmin):
    list_display = ('company', 'number_prefix', 'default_limit', 'max_single_payment', 'updated_at')


@admin.register(PettyCashApprovalPolicy)
class PettyCashApprovalPolicyAdmin(admin.ModelAdmin):
    list_display = ('company', 'name', 'is_active')


@admin.register(PettyCashApprovalStep)
class PettyCashApprovalStepAdmin(admin.ModelAdmin):
    list_display = ('statement', 'request', 'settlement', 'step_no', 'decision', 'approver')
    list_filter = ('decision',)
    raw_id_fields = ('statement', 'request', 'settlement', 'approver')
