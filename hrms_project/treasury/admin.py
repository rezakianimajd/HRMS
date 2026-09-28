from django.contrib import admin
from treasury.models import (
    TreasuryEntity, TreasuryTransaction, PayableItem,
    CheckBook, ReceivedCheck, IssuedCheck,
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
