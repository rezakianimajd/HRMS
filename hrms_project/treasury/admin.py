from django.contrib import admin
from treasury.models import (
    TreasuryEntity, TreasuryTransaction, PayableItem,
    CheckBook, ReceivedCheck, IssuedCheck,
    TreasuryPaymentType, TreasuryPaymentMethod,
    PaymentCommitment, PaymentRequest, PaymentOrder,
    Receipt, AdvanceAccount, AdvanceSettlement, TreasuryTransfer, TreasuryGuarantee,
)


@admin.register(TreasuryEntity)
class TreasuryEntityAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'entity_type', 'account_number', 'initial_balance', 'is_active')
    list_filter = ('entity_type', 'is_active')
    search_fields = ('code', 'name', 'account_number', 'sheba_number')


@admin.register(TreasuryTransaction)
class TreasuryTransactionAdmin(admin.ModelAdmin):
    list_display = ('number', 'entity', 'date', 'direction', 'amount', 'status')
    list_filter = ('direction', 'status')
    search_fields = ('number', 'party', 'description')


@admin.register(PayableItem)
class PayableItemAdmin(admin.ModelAdmin):
    list_display = ('title', 'source_type', 'party', 'amount', 'paid', 'due_date', 'is_paid')
    list_filter = ('source_type', 'is_paid')
    search_fields = ('title', 'party')


@admin.register(CheckBook)
class CheckBookAdmin(admin.ModelAdmin):
    list_display = ('code', 'bank_name', 'account_number', 'total_leaves', 'used_leaves', 'is_active')
    search_fields = ('code', 'bank_name', 'account_number')


@admin.register(ReceivedCheck)
class ReceivedCheckAdmin(admin.ModelAdmin):
    list_display = ('number', 'bank_name', 'party', 'amount', 'due_date', 'status')
    list_filter = ('status',)
    search_fields = ('number', 'bank_name', 'party')


@admin.register(IssuedCheck)
class IssuedCheckAdmin(admin.ModelAdmin):
    list_display = ('number', 'party', 'amount', 'due_date', 'status')
    list_filter = ('status',)
    search_fields = ('number', 'party', 'checkbook__bank_name')


@admin.register(TreasuryPaymentType)
class TreasuryPaymentTypeAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'requires_contract', 'requires_project', 'is_active')


@admin.register(TreasuryPaymentMethod)
class TreasuryPaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'target', 'is_active')


@admin.register(PaymentCommitment)
class PaymentCommitmentAdmin(admin.ModelAdmin):
    list_display = ('number', 'title', 'party', 'amount', 'amount_paid', 'due_date', 'status')
    list_filter = ('status',)
    search_fields = ('number', 'title', 'party__name')


@admin.register(PaymentRequest)
class PaymentRequestAdmin(admin.ModelAdmin):
    list_display = ('number', 'title', 'party', 'amount', 'status', 'requested_date')
    list_filter = ('status', 'payment_type')
    search_fields = ('number', 'title', 'party__name')


@admin.register(PaymentOrder)
class PaymentOrderAdmin(admin.ModelAdmin):
    list_display = ('number', 'request', 'instrument', 'amount', 'status')
    list_filter = ('status', 'instrument')


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ('number', 'party', 'method', 'amount', 'status')
    list_filter = ('status', 'method')


@admin.register(AdvanceAccount)
class AdvanceAccountAdmin(admin.ModelAdmin):
    list_display = ('number', 'party', 'amount', 'date', 'status')
    list_filter = ('status',)
    search_fields = ('number', 'party__name')


@admin.register(AdvanceSettlement)
class AdvanceSettlementAdmin(admin.ModelAdmin):
    list_display = ('advance', 'amount', 'date')


@admin.register(TreasuryTransfer)
class TreasuryTransferAdmin(admin.ModelAdmin):
    list_display = ('number', 'source', 'destination', 'amount', 'date', 'status')
    list_filter = ('status',)


@admin.register(TreasuryGuarantee)
class TreasuryGuaranteeAdmin(admin.ModelAdmin):
    list_display = ('number', 'kind', 'issuer', 'beneficiary', 'amount', 'expiry_date', 'status')
    list_filter = ('kind', 'status')
    search_fields = ('number', 'issuer', 'beneficiary', 'party__name')
