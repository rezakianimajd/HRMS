from django.contrib import admin
from procurement.models import (
    SupplierCategory, Supplier, ItemCategory, UnitOfMeasure, Item,
    PurchaseRequest, PurchaseRequestLine, PurchaseOrder, PurchaseOrderLine,
    GoodsReceiptNote, GoodsReceiptNoteLine, PurchaseInvoice, PurchaseInvoiceLine,
    PurchasePayment, ProcurementApprovalPolicy,
)


@admin.register(SupplierCategory)
class SupplierCategoryAdmin(admin.ModelAdmin):
    list_display = ('code', 'name')
    search_fields = ('code', 'name')


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'economic_code', 'rating', 'status')
    list_filter = ('status', 'category')
    search_fields = ('code', 'name', 'economic_code', 'national_id')


@admin.register(ItemCategory)
class ItemCategoryAdmin(admin.ModelAdmin):
    list_display = ('code', 'name')
    search_fields = ('code', 'name')


@admin.register(UnitOfMeasure)
class UnitOfMeasureAdmin(admin.ModelAdmin):
    list_display = ('code', 'name')


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'category', 'unit', 'nature', 'is_active')
    list_filter = ('nature', 'is_active', 'category')
    search_fields = ('code', 'name', 'barcode')


class PurchaseRequestLineInline(admin.TabularInline):
    model = PurchaseRequestLine
    extra = 0


@admin.register(PurchaseRequest)
class PurchaseRequestAdmin(admin.ModelAdmin):
    list_display = ('number', 'department', 'date', 'status')
    list_filter = ('status',)
    search_fields = ('number', 'description')
    inlines = [PurchaseRequestLineInline]


class PurchaseOrderLineInline(admin.TabularInline):
    model = PurchaseOrderLine
    extra = 0


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ('number', 'supplier', 'date', 'total', 'status')
    list_filter = ('status',)
    search_fields = ('number', 'supplier__name')
    inlines = [PurchaseOrderLineInline]


class GoodsReceiptNoteLineInline(admin.TabularInline):
    model = GoodsReceiptNoteLine
    extra = 0


@admin.register(GoodsReceiptNote)
class GoodsReceiptNoteAdmin(admin.ModelAdmin):
    list_display = ('number', 'order', 'date', 'status')
    list_filter = ('status',)
    inlines = [GoodsReceiptNoteLineInline]


class PurchaseInvoiceLineInline(admin.TabularInline):
    model = PurchaseInvoiceLine
    extra = 0


@admin.register(PurchaseInvoice)
class PurchaseInvoiceAdmin(admin.ModelAdmin):
    list_display = ('number', 'supplier', 'date', 'total', 'paid_amount', 'status')
    list_filter = ('status',)
    search_fields = ('number', 'invoice_number', 'supplier__name')
    inlines = [PurchaseInvoiceLineInline]


@admin.register(PurchasePayment)
class PurchasePaymentAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'date', 'amount', 'method')
    list_filter = ('method',)


@admin.register(ProcurementApprovalPolicy)
class ProcurementApprovalPolicyAdmin(admin.ModelAdmin):
    list_display = ('name', 'single_level_limit', 'is_active')