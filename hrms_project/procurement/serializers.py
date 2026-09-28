"""Serializers for the Procurement (خرید و تدارکات) module."""
from rest_framework import serializers
from procurement.models import (
    SupplierCategory, Supplier, ItemCategory, UnitOfMeasure, Item,
    PurchaseRequest, PurchaseRequestLine, PurchaseOrder, PurchaseOrderLine,
    GoodsReceiptNote, GoodsReceiptNoteLine, PurchaseInvoice, PurchaseInvoiceLine,
    PurchasePayment, ProcurementApprovalPolicy,
)


class BaseModelSerializer(serializers.ModelSerializer):
    class Meta:
        abstract = True
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class SupplierCategorySerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = SupplierCategory
        fields = '__all__'


class SupplierSerializer(BaseModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = Supplier
        fields = '__all__'


class ItemCategorySerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = ItemCategory
        fields = '__all__'


class UnitOfMeasureSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = UnitOfMeasure
        fields = '__all__'


class ItemSerializer(BaseModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    unit_name = serializers.CharField(source='unit.name', read_only=True)
    nature_display = serializers.CharField(source='get_nature_display', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = Item
        fields = '__all__'


class PurchaseRequestLineSerializer(BaseModelSerializer):
    item_code = serializers.CharField(source='item.code', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = PurchaseRequestLine
        fields = '__all__'


class PurchaseRequestSerializer(BaseModelSerializer):
    lines = PurchaseRequestLineSerializer(many=True, required=False)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total = serializers.DecimalField(max_digits=18, decimal_places=0, read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = PurchaseRequest
        fields = '__all__'

    def create(self, validated_data):
        lines = validated_data.pop('lines', [])
        obj = PurchaseRequest.objects.create(**validated_data)
        for i, line in enumerate(lines, start=1):
            line['line_no'] = i
            PurchaseRequestLine.objects.create(request=obj, **line)
        return obj

    def update(self, instance, validated_data):
        lines = validated_data.pop('lines', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if lines is not None:
            instance.lines.all().delete()
            for i, line in enumerate(lines, start=1):
                line['line_no'] = i
                PurchaseRequestLine.objects.create(request=instance, **line)
        return instance


class PurchaseOrderLineSerializer(BaseModelSerializer):
    item_code = serializers.CharField(source='item.code', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = PurchaseOrderLine
        fields = '__all__'


class PurchaseOrderSerializer(BaseModelSerializer):
    lines = PurchaseOrderLineSerializer(many=True, required=False)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = PurchaseOrder
        fields = '__all__'

    def create(self, validated_data):
        lines = validated_data.pop('lines', [])
        obj = PurchaseOrder.objects.create(**validated_data)
        for i, line in enumerate(lines, start=1):
            line['line_no'] = i
            PurchaseOrderLine.objects.create(order=obj, **line)
        return obj

    def update(self, instance, validated_data):
        lines = validated_data.pop('lines', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if lines is not None:
            instance.lines.all().delete()
            for i, line in enumerate(lines, start=1):
                line['line_no'] = i
                PurchaseOrderLine.objects.create(order=instance, **line)
        return instance


class GoodsReceiptNoteLineSerializer(BaseModelSerializer):
    item_code = serializers.CharField(source='item.code', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = GoodsReceiptNoteLine
        fields = '__all__'


class GoodsReceiptNoteSerializer(BaseModelSerializer):
    lines = GoodsReceiptNoteLineSerializer(many=True, required=False)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = GoodsReceiptNote
        fields = '__all__'

    def create(self, validated_data):
        lines = validated_data.pop('lines', [])
        obj = GoodsReceiptNote.objects.create(**validated_data)
        for i, line in enumerate(lines, start=1):
            line['line_no'] = i
            GoodsReceiptNoteLine.objects.create(receipt=obj, **line)
        return obj


class PurchaseInvoiceLineSerializer(BaseModelSerializer):
    item_code = serializers.CharField(source='item.code', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = PurchaseInvoiceLine
        fields = '__all__'


class PurchaseInvoiceSerializer(BaseModelSerializer):
    lines = PurchaseInvoiceLineSerializer(many=True, required=False)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    balance = serializers.DecimalField(max_digits=18, decimal_places=0, read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = PurchaseInvoice
        fields = '__all__'

    def create(self, validated_data):
        lines = validated_data.pop('lines', [])
        obj = PurchaseInvoice.objects.create(**validated_data)
        for i, line in enumerate(lines, start=1):
            line['line_no'] = i
            PurchaseInvoiceLine.objects.create(invoice=obj, **line)
        return obj

    def update(self, instance, validated_data):
        lines = validated_data.pop('lines', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if lines is not None:
            instance.lines.all().delete()
            for i, line in enumerate(lines, start=1):
                line['line_no'] = i
                PurchaseInvoiceLine.objects.create(invoice=instance, **line)
        return instance


class PurchasePaymentSerializer(BaseModelSerializer):
    method_display = serializers.CharField(source='get_method_display', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = PurchasePayment
        fields = '__all__'


class ProcurementApprovalPolicySerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = ProcurementApprovalPolicy
        fields = '__all__'