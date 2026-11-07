"""Serializers for the Treasury (خزانه‌داری) module."""
from rest_framework import serializers
from treasury.guards import ensure_amount, ensure_unique_check_number
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
    currency_display = serializers.CharField(source='get_currency_display', read_only=True)
    account_type_display = serializers.CharField(source='get_account_type_display', read_only=True)
    policy_display = serializers.CharField(
        source='get_negative_balance_policy_display', read_only=True,
    )
    bank_name = serializers.CharField(source='bank.name', read_only=True)
    branch_display = serializers.SerializerMethodField()
    responsible_name = serializers.SerializerMethodField()
    balance = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)
    is_cash = serializers.BooleanField(read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = TreasuryEntity
        fields = '__all__'

    def get_branch_display(self, obj):
        if obj.branch_id:
            return f'{obj.branch.name} ({obj.branch.code})' if obj.branch.code else obj.branch.name
        return obj.branch_name or ''

    def get_responsible_name(self, obj):
        return getattr(obj.responsible, 'full_name', '') or ''


class TreasuryTransactionSerializer(BaseModelSerializer):
    direction_display = serializers.CharField(source='get_direction_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    entity_name = serializers.CharField(source='entity.name', read_only=True)
    entity_code = serializers.CharField(source='entity.code', read_only=True)
    accounting_document_number = serializers.SerializerMethodField()

    class Meta(BaseModelSerializer.Meta):
        model = TreasuryTransaction
        fields = '__all__'

    def get_accounting_document_number(self, obj):
        document = getattr(obj, 'accounting_document', None)
        return getattr(document, 'number', '') if document else ''

    def validate_destination_iban(self, value):
        """شبا مقصد (در صورت وجود) باید mod 97 معتبر باشد."""
        from treasury.iban import is_valid

        if not value:
            return ''
        if not is_valid(value):
            raise serializers.ValidationError('شماره شبا مقصد معتبر نیست (کنترل رقم mod 97).')
        return value


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
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    party_account_name = serializers.CharField(source='party_account.name', read_only=True)
    is_open = serializers.BooleanField(read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = ReceivedCheck
        fields = '__all__'

    def validate(self, attrs):
        instance = self.instance
        ensure_amount(
            attrs.get('amount', getattr(instance, 'amount', 0)), 'مبلغ چک',
        )
        number = attrs.get('number', getattr(instance, 'number', ''))
        company = getattr(instance, 'company', None) or self.context.get('company')
        if number and company:
            ensure_unique_check_number(
                company, ReceivedCheck, number, exclude_id=getattr(instance, 'pk', None),
            )
        return attrs


class IssuedCheckSerializer(BaseModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    party_account_name = serializers.CharField(source='party_account.name', read_only=True)
    checkbook_bank = serializers.CharField(source='checkbook.bank_name', read_only=True)
    is_open = serializers.BooleanField(read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = IssuedCheck
        fields = '__all__'

    def validate(self, attrs):
        instance = self.instance
        ensure_amount(
            attrs.get('amount', getattr(instance, 'amount', 0)), 'مبلغ چک',
        )
        number = attrs.get('number', getattr(instance, 'number', ''))
        company = getattr(instance, 'company', None) or self.context.get('company')
        if number and company:
            ensure_unique_check_number(
                company, IssuedCheck, number, exclude_id=getattr(instance, 'pk', None),
            )
        return attrs
