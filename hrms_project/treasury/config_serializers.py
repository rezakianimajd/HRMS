"""Serializerهای قالب چاپ، تنظیمات خزانه و قواعد تأیید."""
from rest_framework import serializers

from treasury.approval_models import TreasuryApprovalRule, TreasurySettings
from treasury.print_templates import TreasuryPrintTemplate, placeholders_for


class TreasuryPrintTemplateSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    placeholders = serializers.SerializerMethodField()

    class Meta:
        model = TreasuryPrintTemplate
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def get_placeholders(self, obj):
        return placeholders_for(obj.kind)

    def validate_body(self, value):
        if not str(value or '').strip():
            raise serializers.ValidationError('بدنهٔ قالب خالی است.')
        if '{{' not in value:
            raise serializers.ValidationError(
                'قالب باید حداقل یک جای‌نگهدار مانند {{number}} داشته باشد.',
            )
        return value


class TreasurySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreasurySettings
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class TreasuryApprovalRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreasuryApprovalRule
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def validate(self, attrs):
        instance = self.instance
        min_amount = attrs.get('min_amount', getattr(instance, 'min_amount', 0))
        max_amount = attrs.get('max_amount', getattr(instance, 'max_amount', None))
        if max_amount is not None and min_amount is not None and max_amount < min_amount:
            raise serializers.ValidationError(
                {'max_amount': 'سقف بازه نباید کمتر از کف بازه باشد.'},
            )
        return attrs
