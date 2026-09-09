"""Serializers for the Contracts module."""
from rest_framework import serializers
from contracts.models import (
    ContractParty, Contract, ContractDocument, Invoice, Statement,
    Addendum, Guarantee, Payment,
)


class ContractDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ContractDocument
        fields = ['id', 'contract', 'title', 'file', 'file_url', 'uploaded_at']
        read_only_fields = ['id', 'company', 'is_active', 'uploaded_at', 'created_at', 'updated_at']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.file.url) if request else obj.file.url
        return None


class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = ['id', 'contract', 'number', 'date', 'amount', 'vat', 'total', 'is_paid', 'description']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class StatementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Statement
        fields = ['id', 'contract', 'number', 'date', 'amount', 'is_approved', 'description']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class AddendumSerializer(serializers.ModelSerializer):
    class Meta:
        model = Addendum
        fields = ['id', 'contract', 'number', 'date', 'change_description', 'amount_change', 'new_end_date']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class GuaranteeSerializer(serializers.ModelSerializer):
    guarantee_type_display = serializers.CharField(source='get_guarantee_type_display', read_only=True)
    contract_subject = serializers.CharField(source='contract.subject', read_only=True)

    class Meta:
        model = Guarantee
        fields = [
            'id', 'contract', 'contract_subject', 'guarantee_type', 'guarantee_type_display', 'number',
            'amount', 'issue_date', 'expiry_date', 'bank', 'is_released',
            'release_date', 'note',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'contract', 'invoice', 'date', 'amount', 'reference', 'method']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class ContractPartySerializer(serializers.ModelSerializer):
    party_type_display = serializers.CharField(source='get_party_type_display', read_only=True)
    contracts_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = ContractParty
        fields = [
            'id', 'name', 'party_type', 'party_type_display', 'national_id',
            'economic_code', 'registration_number', 'phone', 'mobile', 'email',
            'address', 'contact_person', 'bank_name', 'account_number',
            'sheba_number', 'description', 'contracts_count',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class ContractSerializer(serializers.ModelSerializer):
    contract_type_display = serializers.CharField(source='get_contract_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    party_name = serializers.CharField(source='party.name', read_only=True)
    signatory_name = serializers.CharField(source='signatory.full_name', read_only=True)

    documents = ContractDocumentSerializer(many=True, read_only=True)
    invoices = InvoiceSerializer(many=True, read_only=True)
    statements = StatementSerializer(many=True, read_only=True)
    addendums = AddendumSerializer(many=True, read_only=True)
    guarantees = GuaranteeSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Contract
        fields = [
            'id', 'number', 'subject', 'party', 'party_name', 'contract_type',
            'contract_type_display', 'status', 'status_display', 'amount',
            'start_date', 'end_date', 'signing_date', 'signatory', 'signatory_name',
            'guarantee_amount',
            'category', 'project_name', 'project_location', 'tender_number',
            'advance_payment', 'retention_percent', 'warranty_period',
            'payment_terms', 'delivery_terms', 'penalty_terms', 'insurance_terms',
            'description',
            'documents', 'invoices', 'statements', 'addendums', 'guarantees', 'payments',
            'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']