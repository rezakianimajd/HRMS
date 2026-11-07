"""Serializers برای Master Data خزانه (بانک، شعبه، پایانه، شماره‌گذاری)."""
from rest_framework import serializers

from treasury.master_models import Bank, BankBranch, POSTerminal
from treasury.numbering import DOC_KINDS, TreasuryNumberingSetting, preview_numbers


class BaseModelSerializer(serializers.ModelSerializer):
    class Meta:
        abstract = True
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class BankSerializer(BaseModelSerializer):
    branch_count = serializers.SerializerMethodField()

    class Meta(BaseModelSerializer.Meta):
        model = Bank
        fields = '__all__'
        read_only_fields = BaseModelSerializer.Meta.read_only_fields + ['branch_count']

    def get_branch_count(self, obj):
        """از annotate ویوسِت خوانده می‌شود؛ در پاسخ create/update محاسبه می‌شود."""
        value = getattr(obj, 'branch_count', None)
        if value is not None:
            return value
        return obj.branches.count()


class BankBranchSerializer(BaseModelSerializer):
    bank_name = serializers.CharField(source='bank.name', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = BankBranch
        fields = '__all__'


class POSTerminalSerializer(BaseModelSerializer):
    bank_name = serializers.CharField(source='bank.name', read_only=True)
    entity_name = serializers.CharField(source='entity.name', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = POSTerminal
        fields = '__all__'

    def validate(self, attrs):
        terminal = attrs.get('terminal_number') or getattr(self.instance, 'terminal_number', '')
        if not terminal:
            raise serializers.ValidationError({'terminal_number': 'شماره پایانه الزامی است.'})
        return attrs


class TreasuryNumberingSettingSerializer(BaseModelSerializer):
    """تنظیمات شماره‌گذاری (یک ردیف برای هر شرکت) + پیش‌نمایش شماره‌ها."""

    preview = serializers.SerializerMethodField(read_only=True)
    doc_kinds = serializers.SerializerMethodField(read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = TreasuryNumberingSetting
        fields = '__all__'

    def get_preview(self, obj):
        return preview_numbers(obj.company)

    def get_doc_kinds(self, obj):
        return [{'key': key, 'label': label} for key, label in DOC_KINDS.items()]

    def validate_padding(self, value):
        if not 1 <= int(value) <= 12:
            raise serializers.ValidationError('تعداد رقم باید بین ۱ و ۱۲ باشد.')
        return value
