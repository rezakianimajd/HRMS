"""Serializerهای مغایرت بانکی (ردیف‌های گردش)."""
from rest_framework import serializers

from treasury.guards import ensure_amount
from treasury.reconciliation_models import TreasuryStatementLine


class TreasuryStatementLineSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    direction_display = serializers.CharField(source='get_direction_display', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    entity_name = serializers.CharField(source='entity.name', read_only=True)
    entity_code = serializers.CharField(source='entity.code', read_only=True)
    matched_number = serializers.CharField(
        source='matched_transaction.number', read_only=True, default='',
    )

    class Meta:
        model = TreasuryStatementLine
        fields = '__all__'
        read_only_fields = [
            'id', 'company', 'status', 'matched_transaction', 'matched_at',
            'created_at', 'updated_at',
        ]

    def validate(self, attrs):
        ensure_amount(attrs.get('amount', getattr(self.instance, 'amount', 0)),
                      'مبلغ گردش')
        return attrs
