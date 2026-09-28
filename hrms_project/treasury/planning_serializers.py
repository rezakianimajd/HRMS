"""Serializers برای فاز ۳ خزانه (مغایرت و گزارش)."""
from rest_framework import serializers
from treasury.planning_models import TreasuryReconciliation


class BaseModelSerializer(serializers.ModelSerializer):
    class Meta:
        abstract = True
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class TreasuryReconciliationSerializer(BaseModelSerializer):
    entity_name = serializers.CharField(source='entity.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = TreasuryReconciliation
        fields = '__all__'
        read_only_fields = BaseModelSerializer.Meta.read_only_fields + [
            'status', 'book_balance', 'difference',
        ]