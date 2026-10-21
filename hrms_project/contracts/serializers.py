"""Serializers for the Contracts module."""
from decimal import Decimal

from django.db.models import Q, Sum
from rest_framework import serializers
from contracts.models import (
    ContractParty, Contract, ContractDocument, Invoice, Statement,
    Addendum, Guarantee, Payment, PaymentAttachment, ContractDispute,
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
    addendum_number = serializers.SerializerMethodField()
    addendum_subject = serializers.SerializerMethodField()
    guarantee_number = serializers.SerializerMethodField()
    statement_number = serializers.SerializerMethodField()

    class Meta:
        model = ContractDocument
        fields = [
            'id', 'contract', 'addendum', 'addendum_number', 'addendum_subject',
            'guarantee', 'guarantee_number', 'statement', 'statement_number',
            'title', 'file', 'file_url', 'uploaded_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'uploaded_at', 'created_at', 'updated_at']

    def validate(self, attrs):
        contract = attrs.get('contract', getattr(self.instance, 'contract', None))
        addendum = attrs.get('addendum', getattr(self.instance, 'addendum', None))
        guarantee = attrs.get('guarantee', getattr(self.instance, 'guarantee', None))
        statement = attrs.get('statement', getattr(self.instance, 'statement', None))
        upload = attrs.get('file')
        if addendum and contract and addendum.contract_id != contract.pk:
            raise serializers.ValidationError({'addendum': 'الحاقیه به این قرارداد تعلق ندارد.'})
        if guarantee and contract and guarantee.contract_id != contract.pk:
            raise serializers.ValidationError({'guarantee': 'تضمین به این قرارداد تعلق ندارد.'})
        if statement and contract and statement.contract_id != contract.pk:
            raise serializers.ValidationError({'statement': 'صورت‌وضعیت به این قرارداد تعلق ندارد.'})
        if upload and (addendum or guarantee):
            name = str(getattr(upload, 'name', '') or '').lower()
            content_type = str(getattr(upload, 'content_type', '') or '').lower()
            if not name.endswith('.pdf') or (
                content_type
                and not content_type.startswith('application/pdf')
                and content_type not in ('application/x-pdf', 'application/octet-stream')
            ):
                raise serializers.ValidationError({'file': 'برای الحاقیه فقط فایل PDF مجاز است.'})
            if getattr(upload, 'size', 0) > 25 * 1024 * 1024:
                raise serializers.ValidationError({'file': 'حجم فایل پیوست نباید بیشتر از ۲۵ مگابایت باشد.'})
        return attrs

    def get_addendum_number(self, obj):
        return obj.addendum.number if obj.addendum_id else None

    def get_addendum_subject(self, obj):
        return obj.addendum.subject if obj.addendum_id else None

    def get_guarantee_number(self, obj):
        if not obj.guarantee_id:
            return None
        return obj.guarantee.number or obj.guarantee.guarantee_number or obj.guarantee.check_number or ''

    def get_statement_number(self, obj):
        return obj.statement.number if obj.statement_id else None

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
    exchange_rate = serializers.DecimalField(max_digits=18, decimal_places=6, required=False, allow_null=True)
    documents = ContractDocumentSerializer(many=True, read_only=True)

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
            'is_approved', 'description', 'documents',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def _previous_cumulative(self, contract, statement_date):
        """مبلغ تجمیعی آخرین صورت‌وضعیت قبل از این دوره (بر اساس تاریخ و شناسه)."""
        if not contract:
            return Decimal('0')
        qs = Statement.objects.filter(contract=contract)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
            if statement_date:
                qs = qs.filter(
                    Q(date__lt=statement_date)
                    | Q(date=statement_date, pk__lt=self.instance.pk)
                )
        elif statement_date:
            qs = qs.filter(date__lte=statement_date)
        previous = qs.order_by('-date', '-pk').only('amount').first()
        prior_work = qs.aggregate(total=Sum('work_done'))['total'] or 0
        previous_amount = Decimal(previous.amount or 0) if previous else Decimal('0')
        return max(previous_amount, Decimal(str(prior_work or 0)))

    def validate(self, attrs):
        """مبلغ تجمعی دوره قبل و کارکرد دوره را در سمت سرور معتبر می‌کند.

        کلاینت ممکن است لیست کهنه‌ای داشته باشد یا دو صورت‌وضعیت هم‌تاریخ
        باشند؛ بنابراین مبنای «دوره قبل» را همین‌جا از دیتابیس تعیین می‌کنیم.
        """
        instance = self.instance
        if instance is not None and not any(
            key in attrs for key in ('amount', 'date', 'contract', 'additions', 'deductions', 'value_added_tax', 'other_additions')
        ):
            return attrs
        contract = attrs.get('contract') or getattr(instance, 'contract', None)
        statement_date = attrs.get('date') or getattr(instance, 'date', None)
        previous = self._previous_cumulative(contract, statement_date)
        amount_value = attrs.get('amount', getattr(instance, 'amount', 0))
        try:
            amount = Decimal(str(amount_value or 0))
        except Exception:  # noqa: BLE001
            amount = Decimal('0')
        if amount < previous:
            raise serializers.ValidationError({
                'amount': 'مبلغ تجمعی این صورت‌وضعیت نمی‌تواند کمتر از مبلغ تجمعی دوره قبل باشد.',
            })
        attrs['cumulative_previous_amount'] = previous
        attrs['work_done'] = amount - previous
        additions = attrs.get('additions') or getattr(instance, 'additions', []) or []
        deductions = attrs.get('deductions') or getattr(instance, 'deductions', []) or []
        additions_total = sum(
            (Decimal(str(item.get('amount') or 0)) for item in additions if isinstance(item, dict)),
            Decimal('0'),
        ) + Decimal(str(attrs.get('value_added_tax', getattr(instance, 'value_added_tax', 0)) or 0)) + Decimal(
            str(attrs.get('other_additions', getattr(instance, 'other_additions', 0)) or 0)
        )
        deductions_total = sum(
            (Decimal(str(item.get('amount') or 0)) for item in deductions if isinstance(item, dict)),
            Decimal('0'),
        )
        attrs['additions_total'] = additions_total
        attrs['deductions_total'] = deductions_total
        attrs['net_amount'] = amount - previous + additions_total - deductions_total
        return attrs


class AddendumSerializer(serializers.ModelSerializer):
    currency_name = serializers.CharField(source='currency.name', read_only=True)
    currency_symbol = serializers.CharField(source='currency.symbol', read_only=True)
    contract_subject = serializers.CharField(source='contract.subject', read_only=True)
    subject_type_display = serializers.CharField(source='get_subject_type_display', read_only=True)
    subject_label = serializers.CharField(read_only=True)
    subjects_display = serializers.CharField(read_only=True)
    subjects_detail = serializers.SerializerMethodField()
    effect = serializers.SerializerMethodField()
    documents = ContractDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Addendum
        fields = [
            'id', 'contract', 'contract_subject', 'number',
            'subject_type', 'subject_type_display', 'subject_label',
            'subjects', 'subjects_display', 'subjects_detail',
            'subject', 'date',
            'currency', 'currency_name', 'currency_symbol',
            'amount_change', 'percent_change', 'new_amount',
            'advance_change', 'new_advance_payment', 'new_retention_percent',
            'new_guarantee_amount', 'new_exchange_rate',
            'new_end_date', 'change_description', 'provisions',
            'effect', 'documents',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at',
                            'subject_label', 'subjects_display', 'subjects_detail', 'effect']

    def get_subjects_detail(self, obj):
        """موضوع‌های انتخاب‌شده با عنوان و فیلدهای پرشده (برای نمایش/ویرایش)."""
        from contracts.addendum_schema import SUBJECT_INDEX

        rows = []
        for item in obj.subjects or []:
            if not isinstance(item, dict):
                continue
            subject = SUBJECT_INDEX.get(item.get('type'))
            if not subject:
                continue
            fields = item.get('fields') or {}
            rows.append({
                'type': subject['value'],
                'label': subject['label'],
                'group': subject['group'],
                'group_label': subject.get('group_label', ''),
                'fields': fields,
                'filled': [
                    {'key': spec['key'], 'label': spec['label'], 'type': spec['type'],
                     'value': fields.get(spec['key'])}
                    for spec in subject['fields']
                    if fields.get(spec['key']) not in (None, '')
                ],
            })
        return rows

    def get_effect(self, obj):
        """اثر این الحاقیه بر پروندهٔ قرارداد (فقط تغییرات اعمال‌شدهٔ خودش)."""
        from contracts.addendum_effects import addendum_effect_values, _apply
        from contracts.addendum_effects import base_values

        contract = getattr(obj, 'contract', None)
        if contract is None:
            return None
        effective = base_values(contract)
        applied = _apply(effective, addendum_effect_values(obj))
        return {
            'changes': applied,
            'preview': effective,
            'has_effect': bool(applied),
        }

    def validate(self, attrs):
        from contracts.addendum_schema import validate_subjects

        subjects = attrs.get('subjects', getattr(self.instance, 'subjects', None))
        errors = validate_subjects(subjects)
        if errors:
            raise serializers.ValidationError({'subjects': errors})
        if not subjects and attrs.get('subject_type'):
            attrs['subjects'] = [{'type': attrs['subject_type'], 'fields': {}}]
        return attrs


class GuaranteeSerializer(serializers.ModelSerializer):
    guarantee_type_display = serializers.CharField(source='get_guarantee_type_display', read_only=True)
    instrument_type_display = serializers.CharField(source='get_instrument_type_display', read_only=True)
    last_action_display = serializers.CharField(source='get_last_action_display', read_only=True)
    contract_subject = serializers.CharField(source='contract.subject', read_only=True)
    contract_guarantee_label = serializers.SerializerMethodField()
    documents = ContractDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Guarantee
        fields = [
            'id', 'contract', 'contract_subject', 'contract_guarantee_index', 'contract_guarantee_label',
            'guarantee_type', 'guarantee_type_display',
            'instrument_type', 'instrument_type_display', 'number', 'amount',
            'issue_date', 'expiry_date', 'bank', 'is_released', 'release_date',
            'check_number', 'check_bank', 'check_due_date',
            'promissory_number', 'promissory_due_date',
            'guarantee_number', 'guarantee_expiry_date',
            'last_action', 'last_action_display', 'last_action_date', 'note', 'documents',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def get_contract_guarantee_label(self, obj):
        items = obj.contract.guarantee_items if obj.contract else []
        index = obj.contract_guarantee_index
        if index is None or not isinstance(items, list) or index < 0 or index >= len(items):
            return ''
        item = items[index] or {}
        labels = dict(Guarantee.GuaranteeType.choices)
        label = labels.get(item.get('type'), item.get('type') or '')
        if item.get('percent'):
            label += f" — {item['percent']}٪"
        elif item.get('amount'):
            label += f" — {item['amount']}"
        if item.get('note'):
            label += f" — {item['note']}"
        return label


class PaymentAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()
    size = serializers.SerializerMethodField()

    class Meta:
        model = PaymentAttachment
        fields = ['id', 'payment', 'title', 'file', 'file_url', 'file_name', 'size', 'uploaded_at']
        read_only_fields = ['id', 'company', 'uploaded_at', 'file_url', 'file_name', 'size']

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.file.url) if request else obj.file.url

    def get_file_name(self, obj):
        try:
            return obj.file.name.rsplit('/', 1)[-1]
        except Exception:  # noqa: BLE001
            return ''

    def get_size(self, obj):
        try:
            return obj.file.size
        except Exception:  # noqa: BLE001
            return 0

    def validate_payment(self, value):
        request = self.context.get('request')
        company = getattr(request, 'tenant', None) or getattr(request, 'company', None) if request else None
        if company and value.company_id != company.id:
            raise serializers.ValidationError('پرداخت انتخاب‌شده متعلق به این شرکت نیست.')
        return value

    def validate_file(self, value):
        if value and value.size > 25 * 1024 * 1024:
            raise serializers.ValidationError('حجم فایل پیوست نباید بیشتر از ۲۵ مگابایت باشد.')
        return value


class PaymentSerializer(serializers.ModelSerializer):
    currency_name = serializers.CharField(source='currency.name', read_only=True)
    currency_symbol = serializers.CharField(source='currency.symbol', read_only=True)
    contract_subject = serializers.CharField(source='contract.subject', read_only=True)
    invoice_number = serializers.CharField(source='invoice.number', read_only=True)
    statement_number = serializers.CharField(source='statement.number', read_only=True)
    attachments = PaymentAttachmentSerializer(many=True, read_only=True)
    attachment_count = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'contract', 'contract_subject', 'invoice', 'invoice_number', 'statement', 'statement_number',
            'date', 'currency', 'currency_name', 'currency_symbol',
            'amount', 'reference', 'method', 'note',
            'attachments', 'attachment_count',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at', 'attachments', 'attachment_count']

    def get_attachment_count(self, obj):
        return obj.attachments.count()


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
    currency_code = serializers.CharField(source='currency.code', read_only=True)
    exchange_rate = serializers.DecimalField(source='currency.exchange_rate', max_digits=18, decimal_places=6, read_only=True)

    # مبلغ/پایان مؤثر با احتساب الحاقیه‌ها (برای فهرست قراردادها — بدون N+1)
    effective_amount = serializers.SerializerMethodField()
    effective_end_date = serializers.SerializerMethodField()
    has_addendum = serializers.SerializerMethodField()

    project_allocations_display = serializers.SerializerMethodField()
    guarantee_items_display = serializers.SerializerMethodField()

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
            'currency', 'currency_name', 'currency_symbol', 'currency_code', 'exchange_rate',
            'start_date', 'end_date', 'signing_date', 'signatory', 'signatory_name',
            'effective_amount', 'effective_end_date', 'has_addendum',
            'guarantee_amount', 'guarantee_type', 'guarantee_type_display', 'guarantee_items', 'guarantee_items_display',
            'project', 'project_name', 'project_location', 'tender_number', 'project_allocations', 'project_allocations_display',
            'advance_payment', 'advance_payments', 'retention_percent', 'warranty_period',
            'payment_terms', 'delivery_terms', 'penalty_terms', 'insurance_terms',
            'description',
            'documents', 'invoices', 'statements', 'addendums', 'guarantees', 'payments', 'audit_logs',
            'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def _contract_effects(self, obj):
        """اثر الحاقیه‌ها با کش روی نمونه (سه فیلد مؤثر، یک‌بار محاسبه می‌شوند)."""
        cached = getattr(obj, '_contract_effects_cache', None)
        if cached is None:
            from contracts.addendum_effects import contract_effects

            try:
                cached = contract_effects(obj)
            except Exception:  # noqa: BLE001 — دادهٔ ناسازگار نباید فهرست را بشکند
                cached = {}
            obj._contract_effects_cache = cached
        return cached

    def get_effective_amount(self, obj):
        """مبلغ قرارداد با احتساب الحاقیه‌ها (None = بدون تغییر نسبت به مبلغ پایه)."""
        effective = self._contract_effects(obj).get('effective') or {}
        value = effective.get('amount')
        return float(value) if value is not None else None

    def get_effective_end_date(self, obj):
        """تاریخ پایان مؤثر با احتساب الحاقیه‌های تمدید."""
        effective = self._contract_effects(obj).get('effective') or {}
        return effective.get('end_date') or None

    def get_has_addendum(self, obj):
        return bool(self._contract_effects(obj).get('addendum_count'))

    def get_project_allocations_display(self, obj):
        allocs = obj.project_allocations or []
        if not allocs:
            return []
        from projects.models import Project
        ids = [a.get('project') for a in allocs if isinstance(a, dict) and a.get('project')]
        names = dict(Project.objects.filter(id__in=ids).values_list('id', 'name'))
        return [
            {**a, 'project_name': names.get(a.get('project'), f"پروژه #{a.get('project')}")}
            for a in allocs if isinstance(a, dict)
        ]

    def get_guarantee_items_display(self, obj):
        kind_labels = dict(Contract.GuaranteeKind.choices)
        items = obj.guarantee_items or []
        return [
            {**g, 'type_label': kind_labels.get(g.get('type'), g.get('type', '—'))}
            for g in items if isinstance(g, dict)
        ]


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