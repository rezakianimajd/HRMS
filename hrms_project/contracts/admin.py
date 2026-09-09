from django.contrib import admin
from contracts.models import (
    ContractParty, Contract, ContractDocument, Invoice, Statement, Addendum, Guarantee, Payment,
)


@admin.register(ContractParty)
class ContractPartyAdmin(admin.ModelAdmin):
    list_display = ['name', 'party_type', 'mobile', 'email']
    list_filter = ['party_type']
    search_fields = ['name', 'national_id', 'mobile']


class ContractDocumentInline(admin.TabularInline):
    model = ContractDocument
    extra = 0


class InvoiceInline(admin.TabularInline):
    model = Invoice
    extra = 0


class StatementInline(admin.TabularInline):
    model = Statement
    extra = 0


class AddendumInline(admin.TabularInline):
    model = Addendum
    extra = 0


class GuaranteeInline(admin.TabularInline):
    model = Guarantee
    extra = 0


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0


@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ['number', 'subject', 'party', 'contract_type', 'status', 'amount', 'end_date']
    list_filter = ['contract_type', 'status']
    search_fields = ['number', 'subject', 'party__name']
    inlines = [
        ContractDocumentInline, InvoiceInline, StatementInline,
        AddendumInline, GuaranteeInline, PaymentInline,
    ]


admin.site.register(ContractDocument)
admin.site.register(Invoice)
admin.site.register(Statement)
admin.site.register(Addendum)
admin.site.register(Guarantee)
admin.site.register(Payment)