"""Serializers برای هستهٔ گردش پرداخت خزانه (فاز ۱)."""
from rest_framework import serializers
from treasury.payment_models import (
    TreasuryPaymentType, TreasuryPaymentMethod,
    PaymentCommitment, PaymentRequest, PaymentOrder,
)


class BaseModelSerializer(serializers.ModelSerializer):
    class Meta:
        abstract = True
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class TreasuryPaymentTypeSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = TreasuryPaymentType
        fields = '__all__'


class TreasuryPaymentMethodSerializer(BaseModelSerializer):
    target_display = serializers.CharField(source='get_target_display', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = TreasuryPaymentMethod
        fields = '__all__'


class PaymentCommitmentSerializer(BaseModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    party_name = serializers.CharField(source='party.name', read_only=True)
    balance = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = PaymentCommitment
        fields = '__all__'


class PaymentRequestSerializer(BaseModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    party_name = serializers.CharField(source='party.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    contract_name = serializers.CharField(source='contract.subject', read_only=True)
    payment_type_name = serializers.CharField(source='payment_type.name', read_only=True)
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = PaymentRequest
        fields = '__all__'
        read_only_fields = BaseModelSerializer.Meta.read_only_fields + [
            'status', 'history', 'submitted_at', 'decided_at',
        ]


class PaymentOrderSerializer(BaseModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    instrument_display = serializers.CharField(source='get_instrument_display', read_only=True)
    entity_name = serializers.CharField(source='entity.name', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = PaymentOrder
        fields = '__all__'
        read_only_fields = BaseModelSerializer.Meta.read_only_fields + ['status', 'history']