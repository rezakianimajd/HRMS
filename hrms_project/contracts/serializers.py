"""Serializers for the Contracts module."""
from rest_framework import serializers
from contracts.models import (
    ContractParty, Contract, ContractDocument, Invoice, Statement,
    Addendum, Guarantee, Payment, ContractDispute,
    ContractTypeMaster, SupplierEvaluation,
    ContractTemplate, ContractDraft, ContractApproval,
    ContractApprovalWorkflow, ContractApprovalStep,
    ContractAuditLog,
)


class ContractTypeMasterSerializer(serializers.ModelSerializer):
    contracts_count = serializers.SerializerMethodField()

    class Meta:
        model = ContractTypeMaster
        fields = ['id', 'name', 'code', 'description', 'is_active', 'contracts_count']
        read_only_fields = ['id', 'company', 'created_at', 'updated_at', 'contracts_count']

    def get_contracts_count(self, obj):
        return obj.contracts.count() if hasattr(obj, 'contracts') else 0


class SupplierEvaluationSerializer(serializers.ModelSerializer):
    recommendation_display = serializers.CharField(source='get_recommendation_display', read_only=True)
    party_name = serializers.CharField(source='party.name', read_only=True)
    total_score = serializers.ReadOnlyField()

    class Meta:
        model = SupplierEvaluation
        fields = [
            'id', 'party', 'party_name', 'contract', 'evaluation_date', 'period',
            'quality_score', 'delivery_score', 'price_score', 'cooperation_score',
            'safety_score', 'total_score', 'recommendation', 'recommendation_display',
            'strengths', 'weaknesses', 'evaluator',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class ContractDisputeSerializer(serializers.ModelSerializer):
    dispute_type_display = serializers.CharField(source='get_dispute_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    contract_subject = serializers.CharField(source='contract.subject', read_only=True)

    class Meta:
        model = ContractDispute
        fields = [
            'id', 'contract', 'contract_subject', 'title', 'dispute_type', 'dispute_type_display',
            'severity', 'severity_display', 'status', 'status_display', 'claim_amount',
            'opened_date', 'resolved_date', 'description', 'resolution', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


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
    currency_name = serializers.CharField(source='currency.name', read_only=True)
    currency_symbol = serializers.CharField(source='currency.symbol', read_only=True)
    contract_subject = serializers.CharField(source='contract.subject', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'contract', 'contract_subject', 'number', 'subject', 'date', 'due_date',
            'currency', 'currency_name', 'currency_symbol',
            'amount', 'vat', 'total', 'is_paid', 'description',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class StatementSerializer(serializers.ModelSerializer):
    contract_number = serializers.CharField(source='contract.number', read_only=True)
    contract_subject = serializers.CharField(source='contract.subject', read_only=True)
    currency_name = serializers.CharField(source='currency.name', read_only=True)
    currency_symbol = serializers.CharField(source='currency.symbol', read_only=True)
    exchange_rate = serializers.DecimalField(source='currency.exchange_rate', max_digits=18, decimal_places=6, read_only=True)

    class Meta:
        model = Statement
        fields = [
            'id', 'contract', 'contract_number', 'contract_subject',
            'number', 'date', 'amount',
            'cumulative_previous_amount', 'work_done',
            'value_added_tax', 'other_additions',
            'additions', 'additions_total',
            'deductions', 'deductions_total', 'net_amount',
            'currency', 'currency_name', 'currency_symbol', 'exchange_rate',
            'is_approved', 'description',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class AddendumSerializer(serializers.ModelSerializer):
    currency_name = serializers.CharField(source='currency.name', read_only=True)
    currency_symbol = serializers.CharField(source='currency.symbol', read_only=True)
    contract_subject = serializers.CharField(source='contract.subject', read_only=True)

    class Meta:
        model = Addendum
        fields = [
            'id', 'contract', 'contract_subject', 'number', 'subject', 'date',
            'currency', 'currency_name', 'currency_symbol',
            'amount_change', 'percent_change', 'new_end_date',
            'change_description', 'provisions',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class GuaranteeSerializer(serializers.ModelSerializer):
    guarantee_type_display = serializers.CharField(source='get_guarantee_type_display', read_only=True)
    instrument_type_display = serializers.CharField(source='get_instrument_type_display', read_only=True)
    last_action_display = serializers.CharField(source='get_last_action_display', read_only=True)
    contract_subject = serializers.CharField(source='contract.subject', read_only=True)

    class Meta:
        model = Guarantee
        fields = [
            'id', 'contract', 'contract_subject', 'guarantee_type', 'guarantee_type_display',
            'instrument_type', 'instrument_type_display', 'number', 'amount',
            'issue_date', 'expiry_date', 'bank', 'is_released', 'release_date',
            'check_number', 'check_bank', 'check_due_date',
            'promissory_number', 'promissory_due_date',
            'guarantee_number', 'guarantee_expiry_date',
            'last_action', 'last_action_display', 'last_action_date', 'note',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class PaymentSerializer(serializers.ModelSerializer):
    currency_name = serializers.CharField(source='currency.name', read_only=True)
    currency_symbol = serializers.CharField(source='currency.symbol', read_only=True)
    contract_subject = serializers.CharField(source='contract.subject', read_only=True)
    invoice_number = serializers.CharField(source='invoice.number', read_only=True)
    statement_number = serializers.CharField(source='statement.number', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'contract', 'contract_subject', 'invoice', 'invoice_number', 'statement', 'statement_number',
            'date', 'currency', 'currency_name', 'currency_symbol',
            'amount', 'reference', 'method', 'note',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class ContractPartySerializer(serializers.ModelSerializer):
    party_type_display = serializers.CharField(source='get_party_type_display', read_only=True)
    person_type_display = serializers.CharField(source='get_person_type_display', read_only=True)
    company_type_display = serializers.CharField(source='get_company_type_display', read_only=True)
    contracts_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = ContractParty
        fields = [
            'id', 'name', 'person_type', 'person_type_display', 'party_type', 'party_type_display', 'national_id',
            'economic_code', 'registration_number', 'establishment_date', 'company_type', 'company_type_display',
            'registered_capital', 'phone', 'mobile', 'email',
            'address', 'contact_person', 'bank_name', 'account_number',
            'sheba_number', 'description',
            'ceo_name', 'ceo_phone', 'finance_manager_name', 'finance_manager_phone',
            'technical_contact_name', 'technical_contact_phone',
            'contracts_count',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class ContractAuditLogSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = ContractAuditLog
        fields = ['id', 'contract', 'user', 'action', 'action_display', 'field', 'old_value', 'new_value', 'created_at']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class ContractSerializer(serializers.ModelSerializer):
    contract_type_display = serializers.CharField(source='get_contract_type_display', read_only=True)
    contract_type_master_name = serializers.CharField(source='contract_type_master.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    guarantee_type_display = serializers.CharField(source='get_guarantee_type_display', read_only=True)
    party_name = serializers.CharField(source='party.name', read_only=True)
    signatory_name = serializers.CharField(source='signatory.full_name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    currency_name = serializers.CharField(source='currency.name', read_only=True)
    currency_symbol = serializers.CharField(source='currency.symbol', read_only=True)
    exchange_rate = serializers.DecimalField(source='currency.exchange_rate', max_digits=18, decimal_places=6, read_only=True)

    documents = ContractDocumentSerializer(many=True, read_only=True)
    invoices = InvoiceSerializer(many=True, read_only=True)
    statements = StatementSerializer(many=True, read_only=True)
    addendums = AddendumSerializer(many=True, read_only=True)
    guarantees = GuaranteeSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    audit_logs = ContractAuditLogSerializer(many=True, read_only=True)

    class Meta:
        model = Contract
        fields = [
            'id', 'number', 'subject', 'party', 'party_name', 'contract_type',
            'contract_type_display', 'contract_type_master', 'contract_type_master_name',
            'status', 'status_display', 'amount',
            'currency', 'currency_name', 'currency_symbol', 'exchange_rate',
            'start_date', 'end_date', 'signing_date', 'signatory', 'signatory_name',
            'guarantee_amount', 'guarantee_type', 'guarantee_type_display',
            'project', 'project_name', 'project_location', 'tender_number',
            'advance_payment', 'advance_payments', 'retention_percent', 'warranty_period',
            'payment_terms', 'delivery_terms', 'penalty_terms', 'insurance_terms',
            'description',
            'documents', 'invoices', 'statements', 'addendums', 'guarantees', 'payments', 'audit_logs',
            'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class ContractTemplateSerializer(serializers.ModelSerializer):
    contract_type_name = serializers.CharField(source='contract_type_master.name', read_only=True)

    class Meta:
        model = ContractTemplate
        fields = ['id', 'name', 'contract_type_master', 'contract_type_name', 'content', 'description', 'created_at']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class ContractApprovalSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ContractApproval
        fields = ['id', 'draft', 'step', 'approver', 'status', 'status_display', 'comment', 'acted_at']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class ContractDraftSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)
    contract_subject = serializers.CharField(source='contract.subject', read_only=True)
    approvals = ContractApprovalSerializer(many=True, read_only=True)

    class Meta:
        model = ContractDraft
        fields = [
            'id', 'title', 'template', 'template_name', 'contract', 'contract_subject',
            'content', 'status', 'status_display', 'submitted_by', 'submitted_at',
            'approvals', 'created_at', 'updated_at',
        ]
class ContractApprovalStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractApprovalStep
        fields = ['id', 'workflow', 'step', 'title', 'approver_role', 'min_amount', 'is_active']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class ContractApprovalWorkflowSerializer(serializers.ModelSerializer):
    contract_type_name = serializers.CharField(source='contract_type.name', read_only=True)
    steps = ContractApprovalStepSerializer(many=True, read_only=True)

    class Meta:
        model = ContractApprovalWorkflow
        fields = ['id', 'name', 'contract_type', 'contract_type_name', 'description', 'is_active', 'steps']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']