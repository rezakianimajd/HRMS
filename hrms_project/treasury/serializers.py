"""Serializers for the Treasury (خزانه‌داری) module."""
from rest_framework import serializers
from treasury.models import (
    TreasuryEntity, TreasuryTransaction, PayableItem,
    CheckBook, ReceivedCheck, IssuedCheck,
)


class BaseModelSerializer(serializers.ModelSerializer):
    class Meta:
        abstract = True
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class TreasuryEntitySerializer(BaseModelSerializer):
    entity_type_display = serializers.CharField(source='get_entity_type_display', read_only=True)
    balance = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = TreasuryEntity
        fields = '__all__'


class TreasuryTransactionSerializer(BaseModelSerializer):
    direction_display = serializers.CharField(source='get_direction_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    entity_name = serializers.CharField(source='entity.name', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = TreasuryTransaction
        fields = '__all__'


class PayableItemSerializer(BaseModelSerializer):
    source_type_display = serializers.CharField(source='get_source_type_display', read_only=True)
    balance = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = PayableItem
        fields = '__all__'


class CheckBookSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = CheckBook
        fields = '__all__'


class ReceivedCheckSerializer(BaseModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = ReceivedCheck
        fields = '__all__'


class IssuedCheckSerializer(BaseModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = IssuedCheck
        fields = '__all__'
