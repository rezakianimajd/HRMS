"""Serializers for the Accounting module."""
from rest_framework import serializers
from accounting.models import (
    Branch, FiscalYear, FiscalPeriod, AccountingBook,
    AccountType, AccountGroup, Account, AuxiliaryAccount,
    AccountingDimension, DimensionValue, CostCenter,
    Journal, AccountingDocument, AccountingDocumentLine,
    AccountingDocumentDimension, AccountingSequence,
    SourceTransaction, PostingBatch, PostingTemplate, PostingTemplateLine,
    AccountingSettings, CodingConfig,
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
        extra_kwargs = {'document': {'read_only': True}}


class AccountingDocumentSerializer(BaseModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total_debit = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)
    total_credit = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)
    is_balanced = serializers.BooleanField(read_only=True)
    lines = AccountingDocumentLineSerializer(many=True, required=False)
    journal_name = serializers.CharField(source='journal.name', read_only=True)
    period_code = serializers.CharField(source='period.code', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = AccountingDocument
        fields = '__all__'

    def create(self, validated_data):
        lines = validated_data.pop('lines', [])
        company = validated_data.pop('company', None)
        doc = AccountingDocument.objects.create(company=company, **validated_data)
        for i, line in enumerate(lines, start=1):
            line.pop('document', None)
            line.pop('company', None)
            AccountingDocumentLine.objects.create(document=doc, company=company, line_no=line.get('line_no', i), **line)
        return doc

    def update(self, instance, validated_data):
        lines = validated_data.pop('lines', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if lines is not None:
            instance.lines.all().delete()
            for i, line in enumerate(lines, start=1):
                line.pop('document', None)
                line.pop('company', None)
                AccountingDocumentLine.objects.create(
                    document=instance, company=instance.company_id, line_no=line.get('line_no', i), **line,
                )
        return instance

class AccountingSequenceSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = AccountingSequence
        fields = '__all__'


class SourceTransactionSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = SourceTransaction
        fields = '__all__'


class PostingTemplateLineSerializer(BaseModelSerializer):
    account_code = serializers.CharField(source='account.code', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = PostingTemplateLine
        fields = [
            'id', 'template', 'account', 'account_code', 'account_name', 'side',
            'amount_expression', 'default_dimension', 'line_no',
        ]
        extra_kwargs = {'template': {'read_only': True}}


class PostingTemplateSerializer(BaseModelSerializer):
    lines = PostingTemplateLineSerializer(many=True, required=False)

    class Meta(BaseModelSerializer.Meta):
        model = PostingTemplate
        fields = '__all__'

    def create(self, validated_data):
        lines = validated_data.pop('lines', [])
        company = validated_data.pop('company', None)
        tpl = PostingTemplate.objects.create(company=company, **validated_data)
        for i, line in enumerate(lines, start=1):
            line.pop('template', None)
            line.pop('company', None)
            PostingTemplateLine.objects.create(template=tpl, company=company, line_no=line.get('line_no', i), **line)
        return tpl

    def update(self, instance, validated_data):
        lines = validated_data.pop('lines', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if lines is not None:
            instance.lines.all().delete()
            for i, line in enumerate(lines, start=1):
                line.pop('template', None)
                line.pop('company', None)
                PostingTemplateLine.objects.create(
                    template=instance, company=instance.company_id, line_no=line.get('line_no', i), **line,
                )
        return instance


class AccountingSettingsSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = AccountingSettings
        fields = '__all__'


class CodingConfigSerializer(BaseModelSerializer):
    level_display = serializers.CharField(source='get_level_display', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = CodingConfig
        fields = [
            'id', 'level', 'level_display', 'prefix', 'start_number',
            'end_number', 'min_length', 'max_length', 'is_active',
        ]
