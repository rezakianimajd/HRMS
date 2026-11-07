"""Serializers برای عملیات خزانه (فاز ۲)."""
from rest_framework import serializers

from treasury.guards import (
    ensure_amount, ensure_currency, ensure_entity_direction, ensure_unique_reference,
)
from treasury.operation_models import (
    Receipt, AdvanceAccount, AdvanceSettlement, TreasuryTransfer, TreasuryGuarantee,
)


class BaseModelSerializer(serializers.ModelSerializer):
    class Meta:
        abstract = True
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class ReceiptSerializer(BaseModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    method_display = serializers.CharField(source='get_method_display', read_only=True)
    party_name = serializers.CharField(source='party.name', read_only=True)
    entity_name = serializers.CharField(source='entity.name', read_only=True)
    entity_code = serializers.CharField(source='entity.code', read_only=True)
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True)
    terminal_number = serializers.CharField(source='terminal.terminal_number', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    contract_title = serializers.CharField(source='contract.subject', read_only=True)
    cost_center_name = serializers.CharField(source='cost_center.name', read_only=True)
    amount_base = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)
    accounting_document_number = serializers.SerializerMethodField()

    class Meta(BaseModelSerializer.Meta):
        model = Receipt
        fields = '__all__'
        read_only_fields = BaseModelSerializer.Meta.read_only_fields + ['status', 'history']

    def get_accounting_document_number(self, obj):
        document = getattr(obj, 'accounting_document', None)
        return getattr(document, 'number', '') if document else ''

    def validate(self, attrs):
        instance = self.instance
        amount = attrs.get('amount', getattr(instance, 'amount', 0))
        ensure_amount(amount, 'مبلغ دریافت')
        ensure_currency(
            attrs.get('currency', getattr(instance, 'currency', 'IRR')),
            attrs.get('exchange_rate', getattr(instance, 'exchange_rate', 1)),
        )
        entity = attrs.get('entity', getattr(instance, 'entity', None))
        if entity is not None:
            ensure_entity_direction(entity, 'receipt')
        reference = attrs.get(
            'reference_no', getattr(instance, 'reference_no', ''),
        )
        company = getattr(instance, 'company', None) or self.context.get('company')
        if reference and company:
            ensure_unique_reference(
                company, Receipt, reference,
                field='reference_no', exclude_id=getattr(instance, 'pk', None),
            )
        return attrs


class AdvanceSettlementSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = AdvanceSettlement
        fields = '__all__'


class AdvanceAccountSerializer(BaseModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    party_name = serializers.CharField(source='party.name', read_only=True)
    settled_amount = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)
    balance = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = AdvanceAccount
        fields = '__all__'
        read_only_fields = BaseModelSerializer.Meta.read_only_fields + ['status']


class TreasuryTransferSerializer(BaseModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    source_name = serializers.CharField(source='source.name', read_only=True)
    destination_name = serializers.CharField(source='destination.name', read_only=True)
    source_code = serializers.CharField(source='source.code', read_only=True)
    destination_code = serializers.CharField(source='destination.code', read_only=True)
    accounting_document_number = serializers.SerializerMethodField()

    class Meta(BaseModelSerializer.Meta):
        model = TreasuryTransfer
        fields = '__all__'
        read_only_fields = BaseModelSerializer.Meta.read_only_fields + ['status', 'history']

    def get_accounting_document_number(self, obj):
        document = getattr(obj, 'accounting_document', None)
        return getattr(document, 'number', '') if document else ''

    def validate(self, attrs):
        instance = self.instance
        amount = attrs.get('amount', getattr(instance, 'amount', 0))
        ensure_amount(amount, 'مبلغ انتقال')
        source = attrs.get('source', getattr(instance, 'source', None))
        destination = attrs.get('destination', getattr(instance, 'destination', None))
        if source and destination and source.pk == destination.pk:
            raise serializers.ValidationError({'destination': 'حساب مبدأ و مقصد نباید یکی باشد.'})
        if source is not None:
            ensure_entity_direction(source, 'transfer')
        reference = attrs.get('reference_no', getattr(instance, 'reference_no', ''))
        company = getattr(instance, 'company', None) or self.context.get('company')
        if reference and company:
            ensure_unique_reference(
                company, TreasuryTransfer, reference,
                field='reference_no', exclude_id=getattr(instance, 'pk', None),
            )
        return attrs


class TreasuryGuaranteeSerializer(BaseModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    days_to_expiry = serializers.IntegerField(read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = TreasuryGuarantee
        fields = '__all__'
        read_only_fields = BaseModelSerializer.Meta.read_only_fields + ['status', 'release_date']
