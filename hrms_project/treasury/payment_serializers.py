"""Serializers برای هستهٔ گردش پرداخت خزانه (فاز ۱)."""
from decimal import Decimal

from rest_framework import serializers

from treasury.guards import (
    ensure_amount, ensure_currency, ensure_entity_direction, ensure_payment_limit,
    ensure_unique_reference,
)
from treasury.payment_models import (
    TreasuryPaymentType, TreasuryPaymentMethod,
    PaymentCommitment, PaymentDeduction, PaymentRequest, PaymentOrder,
)


class PaymentDeductionSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    party_name = serializers.CharField(source='party.name', read_only=True)

    class Meta:
        model = PaymentDeduction
        fields = ['id', 'kind', 'kind_display', 'title', 'party', 'party_name',
                  'amount', 'percent', 'note']
        read_only_fields = ['id', 'kind_display', 'party_name']

    def validate_amount(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError('مبلغ کسور باید بزرگ‌تر از صفر باشد.')
        return value


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
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    requirements = serializers.ReadOnlyField()

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
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    party_name = serializers.CharField(source='party.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    contract_name = serializers.CharField(source='contract.subject', read_only=True)
    payment_type_name = serializers.CharField(source='payment_type.name', read_only=True)
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True)
    deductions = PaymentDeductionSerializer(many=True, required=False)
    deductions_total = serializers.DecimalField(
        max_digits=18, decimal_places=2, read_only=True,
    )
    net_amount = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = PaymentRequest
        fields = '__all__'
        read_only_fields = BaseModelSerializer.Meta.read_only_fields + [
            'status', 'history', 'submitted_at', 'decided_at',
        ]

    @staticmethod
    def _save_deductions(instance, rows):
        if rows is None:
            return
        instance.deductions.all().delete()
        for row in rows:
            PaymentDeduction.objects.create(
                company=instance.company, request=instance, **row,
            )

    def _validate_deductions(self, deductions, amount):
        if deductions is None:
            return
        total = sum((Decimal(str(row.get('amount') or 0)) for row in deductions), Decimal('0'))
        if amount is not None and total > Decimal(str(amount)):
            raise serializers.ValidationError({
                'deductions': 'جمع کسورات نمی‌تواند از مبلغ درخواست بیشتر باشد.',
            })

    def create(self, validated_data):
        deductions = validated_data.pop('deductions', None)
        instance = super().create(validated_data)
        self._save_deductions(instance, deductions)
        return instance

    def update(self, instance, validated_data):
        deductions = validated_data.pop('deductions', None)
        instance = super().update(instance, validated_data)
        self._save_deductions(instance, deductions)
        return instance

    def validate(self, attrs):
        deductions = attrs.get('deductions')
        amount = attrs.get('amount', getattr(self.instance, 'amount', None))
        self._validate_deductions(deductions, amount)
        return attrs


class PaymentOrderSerializer(BaseModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    instrument_display = serializers.CharField(source='get_instrument_display', read_only=True)
    entity_name = serializers.CharField(source='entity.name', read_only=True)
    entity_code = serializers.CharField(source='entity.code', read_only=True)
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True)
    request_number = serializers.CharField(source='request.number', read_only=True)
    beneficiary_name = serializers.CharField(source='request.party.name', read_only=True)
    accounting_document_number = serializers.SerializerMethodField()

    class Meta(BaseModelSerializer.Meta):
        model = PaymentOrder
        fields = '__all__'
        read_only_fields = BaseModelSerializer.Meta.read_only_fields + ['status', 'history']

    def get_accounting_document_number(self, obj):
        document = getattr(obj, 'accounting_document', None)
        return getattr(document, 'number', '') if document else ''

    def validate(self, attrs):
        instance = self.instance
        amount = attrs.get('amount', getattr(instance, 'amount', 0))
        ensure_amount(amount, 'مبلغ پرداخت')
        ensure_currency(
            attrs.get('currency', getattr(instance, 'currency', 'IRR')),
            attrs.get('exchange_rate', getattr(instance, 'exchange_rate', 1)),
        )
        entity = attrs.get('entity', getattr(instance, 'entity', None))
        if entity is not None:
            ensure_entity_direction(entity, 'payment')
            ensure_payment_limit(entity, amount)
        tracking = attrs.get('tracking_number', getattr(instance, 'tracking_number', ''))
        company = getattr(instance, 'company', None) or self.context.get('company')
        if tracking and company:
            ensure_unique_reference(
                company, PaymentOrder, tracking,
                field='tracking_number', exclude_id=getattr(instance, 'pk', None),
            )
        return attrs
