"""Serializers for the Accounting module."""
from rest_framework import serializers
from accounting.models import (
    Branch, FiscalYear, FiscalPeriod, AccountingBook,
    AccountType, AccountGroup, Account, AuxiliaryAccount,
    AccountingDimension, DimensionValue, CostCenter,
    Journal, AccountingDocument, AccountingDocumentLine,
    AccountingDocumentDimension, AccountingSequence,
    SourceTransaction, PostingBatch, PostingTemplate, PostingTemplateLine,
    AccountingSettings,
)


class BaseModelSerializer(serializers.ModelSerializer):
    class Meta:
        abstract = True
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class BranchSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = Branch
        fields = '__all__'


class FiscalYearSerializer(BaseModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = FiscalYear
        fields = ['id', 'name', 'start_date', 'end_date', 'status', 'status_display', 'is_current']


class FiscalPeriodSerializer(BaseModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = FiscalPeriod
        fields = ['id', 'fiscal_year', 'code', 'start_date', 'end_date', 'status', 'status_display']


class AccountingBookSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = AccountingBook
        fields = '__all__'


class AccountTypeSerializer(BaseModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = AccountType
        fields = ['id', 'code', 'name', 'category', 'category_display', 'default_nature', 'is_active']


class AccountGroupSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = AccountGroup
        fields = '__all__'


class AccountSerializer(BaseModelSerializer):
    nature_display = serializers.CharField(source='get_nature_display', read_only=True)
    full_code = serializers.CharField(read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = Account
        fields = '__all__'


class AuxiliaryAccountSerializer(BaseModelSerializer):
    aux_type_display = serializers.CharField(source='get_aux_type_display', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = AuxiliaryAccount
        fields = '__all__'


class AccountingDimensionSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = AccountingDimension
        fields = '__all__'


class DimensionValueSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = DimensionValue
        fields = '__all__'


class CostCenterSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = CostCenter
        fields = '__all__'


class JournalSerializer(BaseModelSerializer):
    journal_type_display = serializers.CharField(source='get_journal_type_display', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = Journal
        fields = '__all__'


class AccountingDocumentLineSerializer(BaseModelSerializer):
    account_code = serializers.CharField(source='account.code', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = AccountingDocumentLine
        fields = [
            'id', 'document', 'account', 'account_code', 'account_name', 'auxiliary',
            'line_no', 'description', 'debit', 'credit', 'currency', 'exchange_rate',
            'base_amount', 'reference', 'cost_center', 'project', 'contract', 'employee',
        ]


class AccountingDocumentSerializer(BaseModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total_debit = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)
    total_credit = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)
    is_balanced = serializers.BooleanField(read_only=True)
    lines = AccountingDocumentLineSerializer(many=True, read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = AccountingDocument
        fields = '__all__'


class AccountingSequenceSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = AccountingSequence
        fields = '__all__'


class SourceTransactionSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = SourceTransaction
        fields = '__all__'


class PostingTemplateSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = PostingTemplate
        fields = '__all__'


class AccountingSettingsSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = AccountingSettings
        fields = '__all__'