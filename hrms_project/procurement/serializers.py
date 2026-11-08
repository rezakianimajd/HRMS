"""Serializers for the Procurement (مدیریت خریدها) module."""
from rest_framework import serializers
from procurement.models import (
    SupplierCategory, Supplier, ItemCategory, UnitOfMeasure, Item,
    PurchaseRequest, PurchaseRequestLine, PurchaseOrder, PurchaseOrderLine,
    GoodsReceiptNote, GoodsReceiptNoteLine, PurchaseInvoice, PurchaseInvoiceLine,
    PurchasePayment, ProcurementApprovalPolicy,
    Inquiry, InquiryLine, InquirySupplier, Quotation, QuotationLine,
    ProformaInvoice, ProformaInvoiceLine, ProcurementGuarantee,
    ProcurementGuaranteeAction, PurchasePaymentAllocation, ProcurementDocument,
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


# ---------------------------------------------------------------------------
# استعلام / پیشنهاد قیمت / پیش‌فاکتور / تضامین / تخصیص پرداخت / اسناد
# ---------------------------------------------------------------------------
class InquiryLineSerializer(BaseModelSerializer):
    item_code = serializers.CharField(source='item.code', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)
    unit_label = serializers.CharField(source='unit.name', read_only=True)
    estimated_amount = serializers.FloatField(read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = InquiryLine
        fields = '__all__'


class InquirySupplierSerializer(BaseModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = InquirySupplier
        fields = '__all__'


class QuotationLineSerializer(BaseModelSerializer):
    item_code = serializers.CharField(source='item.code', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)
    unit_label = serializers.CharField(source='unit.name', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = QuotationLine
        fields = '__all__'


class QuotationSerializer(BaseModelSerializer):
    lines = QuotationLineSerializer(many=True, required=False)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    inquiry_number = serializers.CharField(source='inquiry.number', read_only=True)
    inquiry_subject = serializers.CharField(source='inquiry.subject', read_only=True)
    line_count = serializers.SerializerMethodField()

    class Meta(BaseModelSerializer.Meta):
        model = Quotation
        fields = '__all__'

    def get_line_count(self, obj):
        cache = getattr(obj, '_prefetched_objects_cache', None) or {}
        rows = cache.get('lines')
        return len(rows) if rows is not None else obj.lines.count()

    def _write_lines(self, obj, lines):
        from procurement.models import QuotationLine as Line

        obj.lines.all().delete()
        for index, line in enumerate(lines, start=1):
            line['line_no'] = line.get('line_no') or index
            Line.objects.create(quotation=obj, **line)

    def create(self, validated_data):
        from procurement.pricing import document_totals

        lines = validated_data.pop('lines', [])
        obj = Quotation.objects.create(**validated_data)
        self._write_lines(obj, lines)
        totals = document_totals(obj.subtotal, obj.discount, obj.vat_rate, obj.vat_amount or None)
        Quotation.objects.filter(pk=obj.pk).update(**totals)
        return Quotation.objects.get(pk=obj.pk)

    def update(self, instance, validated_data):
        from procurement.pricing import document_totals

        lines = validated_data.pop('lines', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if lines is not None:
            self._write_lines(instance, lines)
        totals = document_totals(
            instance.subtotal, instance.discount, instance.vat_rate, instance.vat_amount or None,
        )
        Quotation.objects.filter(pk=instance.pk).update(**totals)
        return Quotation.objects.get(pk=instance.pk)


class InquirySerializer(BaseModelSerializer):
    lines = InquiryLineSerializer(many=True, required=False)
    suppliers = InquirySupplierSerializer(many=True, read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    evaluation_model_label = serializers.CharField(source='get_evaluation_model_display', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    request_number = serializers.CharField(source='source_request.number', read_only=True)
    quotation_count = serializers.SerializerMethodField()
    estimated_total = serializers.SerializerMethodField()
    awarded_supplier = serializers.SerializerMethodField()

    class Meta(BaseModelSerializer.Meta):
        model = Inquiry
        fields = '__all__'

    def get_quotation_count(self, obj):
        cache = getattr(obj, '_prefetched_objects_cache', None) or {}
        rows = cache.get('quotations')
        return len(rows) if rows is not None else obj.quotations.count()

    def get_estimated_total(self, obj):
        cache = getattr(obj, '_prefetched_objects_cache', None) or {}
        rows = cache.get('lines') or []
        return float(sum(float(line.quantity or 0) * float(line.target_unit_price or 0) for line in rows))

    def get_awarded_supplier(self, obj):
        quotation = getattr(obj, 'awarded_quotation', None)
        return getattr(getattr(quotation, 'supplier', None), 'name', '') or ''

    def create(self, validated_data):
        from procurement.models import InquiryLine as Line

        lines = validated_data.pop('lines', [])
        obj = Inquiry.objects.create(**validated_data)
        for index, line in enumerate(lines, start=1):
            line['line_no'] = line.get('line_no') or index
            Line.objects.create(inquiry=obj, **line)
        return obj

    def update(self, instance, validated_data):
        from procurement.models import InquiryLine as Line

        lines = validated_data.pop('lines', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if lines is not None:
            instance.lines.all().delete()
            for index, line in enumerate(lines, start=1):
                line['line_no'] = line.get('line_no') or index
                Line.objects.create(inquiry=instance, **line)
        return instance


class ProformaInvoiceLineSerializer(BaseModelSerializer):
    item_code = serializers.CharField(source='item.code', read_only=True)
    unit_label = serializers.CharField(source='unit.name', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = ProformaInvoiceLine
        fields = '__all__'


class ProformaInvoiceSerializer(BaseModelSerializer):
    lines = ProformaInvoiceLineSerializer(many=True, required=False)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    order_number = serializers.CharField(source='order.number', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    converted_invoice_number = serializers.CharField(
        source='converted_invoice.number', read_only=True,
    )
    quotation_number = serializers.CharField(source='quotation.number', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = ProformaInvoice
        fields = '__all__'

    def _write_lines(self, obj, lines):
        obj.lines.all().delete()
        for index, line in enumerate(lines, start=1):
            line['line_no'] = line.get('line_no') or index
            ProformaInvoiceLine.objects.create(proforma=obj, **line)

    def create(self, validated_data):
        from procurement.pricing import document_totals

        lines = validated_data.pop('lines', [])
        obj = ProformaInvoice.objects.create(**validated_data)
        self._write_lines(obj, lines)
        totals = document_totals(obj.subtotal, obj.discount, obj.vat_rate, obj.vat_amount or None)
        ProformaInvoice.objects.filter(pk=obj.pk).update(**totals)
        return ProformaInvoice.objects.get(pk=obj.pk)

    def update(self, instance, validated_data):
        from procurement.pricing import document_totals

        lines = validated_data.pop('lines', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if lines is not None:
            self._write_lines(instance, lines)
        totals = document_totals(
            instance.subtotal, instance.discount, instance.vat_rate, instance.vat_amount or None,
        )
        ProformaInvoice.objects.filter(pk=instance.pk).update(**totals)
        return ProformaInvoice.objects.get(pk=instance.pk)


class ProcurementGuaranteeActionSerializer(BaseModelSerializer):
    action_label = serializers.CharField(source='get_action_display', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = ProcurementGuaranteeAction
        fields = '__all__'


class ProcurementGuaranteeSerializer(BaseModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    kind_label = serializers.CharField(source='get_kind_display', read_only=True)
    instrument_label = serializers.CharField(source='get_instrument_type_display', read_only=True)
    order_number = serializers.CharField(source='order.number', read_only=True)
    inquiry_number = serializers.CharField(source='inquiry.number', read_only=True)
    actions = ProcurementGuaranteeActionSerializer(many=True, read_only=True)
    valid_until = serializers.SerializerMethodField()
    due_date = serializers.SerializerMethodField()
    days_to_expiry = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    expiry_kind = serializers.SerializerMethodField()
    validity_years = serializers.SerializerMethodField()
    is_check = serializers.SerializerMethodField()

    class Meta(BaseModelSerializer.Meta):
        model = ProcurementGuarantee
        fields = '__all__'

    def _validity(self, obj):
        return obj.validity()

    def get_valid_until(self, obj):
        return self._validity(obj)['valid_until']

    def get_due_date(self, obj):
        return self._validity(obj)['due_date']

    def get_days_to_expiry(self, obj):
        return self._validity(obj)['days_to_expiry']

    def get_is_expired(self, obj):
        return self._validity(obj)['is_expired']

    def get_expiry_kind(self, obj):
        return self._validity(obj)['expiry_kind']

    def get_validity_years(self, obj):
        return self._validity(obj)['validity_years']

    def get_is_check(self, obj):
        return self._validity(obj)['is_check']


class PurchasePaymentAllocationSerializer(BaseModelSerializer):
    invoice_number = serializers.CharField(source='invoice.number', read_only=True)
    proforma_number = serializers.CharField(source='proforma.number', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = PurchasePaymentAllocation
        fields = '__all__'


class ProcurementDocumentSerializer(BaseModelSerializer):
    kind_label = serializers.CharField(source='get_kind_display', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta(BaseModelSerializer.Meta):
        model = ProcurementDocument
        fields = '__all__'

    def get_file_url(self, obj):
        if not obj.file:
            return ''
        request = self.context.get('request')
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url

