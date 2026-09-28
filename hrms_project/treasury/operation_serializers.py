"""Serializers برای عملیات خزانه (فاز ۲)."""
from rest_framework import serializers
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

    class Meta(BaseModelSerializer.Meta):
        model = Receipt
        fields = '__all__'
        read_only_fields = BaseModelSerializer.Meta.read_only_fields + ['status', 'history']


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

    class Meta(BaseModelSerializer.Meta):
        model = TreasuryTransfer
        fields = '__all__'
        read_only_fields = BaseModelSerializer.Meta.read_only_fields + ['status', 'history']


class TreasuryGuaranteeSerializer(BaseModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    days_to_expiry = serializers.IntegerField(read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = TreasuryGuarantee
        fields = '__all__'
        read_only_fields = BaseModelSerializer.Meta.read_only_fields + ['status', 'release_date']
