"""Serializers دستور پرداخت بین‌بانکی (پایا/ساتنا)."""
from rest_framework import serializers

from treasury import iban as iban_utils
from treasury.bank_order_models import BankPaymentOrder


class BankPaymentOrderSerializer(serializers.ModelSerializer):
    transfer_type_display = serializers.CharField(source='get_transfer_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    source_entity_name = serializers.CharField(source='source_entity.name', read_only=True)
    source_entity_code = serializers.CharField(source='source_entity.code', read_only=True)
    source_entity_balance = serializers.DecimalField(
        source='source_entity.balance', max_digits=18, decimal_places=2, read_only=True,
    )
    source_entity_sheba = serializers.CharField(source='source_entity.sheba_number', read_only=True)
    amount_words = serializers.CharField(read_only=True)
    destination_iban_pretty = serializers.CharField(read_only=True)
    source_iban_pretty = serializers.CharField(read_only=True)

    class Meta:
        model = BankPaymentOrder
        fields = '__all__'
        read_only_fields = [
            'id', 'company', 'number', 'status', 'history', 'destination_bank_code',
            'destination_bank_name', 'created_at', 'updated_at',
        ]

    def validate(self, attrs):
        instance = self.instance
        destination = iban_utils.normalize(
            attrs.get('destination_iban', getattr(instance, 'destination_iban', '')),
        )
        source = iban_utils.normalize(
            attrs.get('source_iban', getattr(instance, 'source_iban', '')),
        )
        if not iban_utils.is_valid(destination):
            raise serializers.ValidationError(
                {'destination_iban': 'شماره شبای مقصد معتبر نیست (IR + ۲۴ رقم).'},
            )
        if source and not iban_utils.is_valid(source):
            raise serializers.ValidationError(
                {'source_iban': 'شماره شبای مبدأ معتبر نیست (IR + ۲۴ رقم).'},
            )
        if source and source == destination:
            raise serializers.ValidationError(
                {'destination_iban': 'شبا مبدأ و مقصد نباید یکی باشد.'},
            )
        amount = attrs.get('amount', getattr(instance, 'amount', 0))
        if not amount or amount <= 0:
            raise serializers.ValidationError({'amount': 'مبلغ باید بزرگ‌تر از صفر باشد.'})
        return attrs
