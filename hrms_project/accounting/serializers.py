"""Serializers for the Accounting module."""
from rest_framework import serializers
from accounting.maintenance import infer_category_from_name
from accounting.models import (
    Branch, FiscalYear, FiscalPeriod, AccountingBook,
    AccountType, AccountGroup, Account, AuxiliaryAccount, AuxiliaryCategory,
    AccountingDimension, DimensionValue, CostCenter,
    Journal, AccountingDocument, AccountingDocumentLine,
    AccountingDocumentDimension, AccountingSequence,
    SourceTransaction, PostingBatch, PostingTemplate, PostingTemplateLine,
    AccountingSettings, CodingConfig, BankStatement, BankStatementLine, BankReconciliation,
    ApprovalPolicy, ApprovalStep, FinancialStatementApproval,
    SeasonalReport, SeasonalTransaction,
)


class BaseModelSerializer(serializers.ModelSerializer):
    class Meta:
        abstract = True
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        """یکسان‌سازی متن فارسی («ي/ك» → «ی/ک») در همهٔ رشته‌های ورودی، حتی JSONهای تودرتو."""
        from accounting.text_normalization import normalize_persian_deep

        if isinstance(data, dict):
            data = {key: normalize_persian_deep(value) for key, value in data.items()}
        elif hasattr(data, 'setlist'):          # QueryDict (فرم‌ها)
            data = data.copy()
            for key in list(data.keys()):
                data.setlist(key, [normalize_persian_deep(value) for value in data.getlist(key)])
        return super().to_internal_value(data)


def user_full_name(user):
    """نام و نام خانوادگی کاربر؛ در نبود نام، نام کاربری (برای ستون «تهیه‌کننده»)."""
    if not user:
        return ''
    full = ' '.join(part for part in [user.first_name, user.last_name] if part).strip()
    return full or user.username or ''


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


class FinancialStatementApprovalSerializer(BaseModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    statement_type_display = serializers.CharField(source='get_statement_type_display', read_only=True)
    fiscal_year_name = serializers.CharField(source='fiscal_year.name', read_only=True)
    is_final = serializers.SerializerMethodField()

    class Meta(BaseModelSerializer.Meta):
        model = FinancialStatementApproval
        fields = [
            'id', 'statement_type', 'statement_type_display', 'fiscal_year', 'fiscal_year_name',
            'as_of_date', 'period_from', 'period_to', 'status', 'status_display',
            'auditor_name', 'audit_firm', 'reference_no', 'approved_at', 'opinion_note',
            'note', 'prepared_by_name', 'is_final', 'created_at',
        ]

    def get_is_final(self, obj):
        """آیا این رکورد یک تأیید نهایی (و نه رد/در انتظار) است؟"""
        return obj.status in (
            FinancialStatementApproval.Status.APPROVED,
            FinancialStatementApproval.Status.APPROVED_WITH_COMMENTS,
        )


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
    account_type_name = serializers.CharField(source='account_type.name', read_only=True)
    category = serializers.CharField(source='account_type.category', read_only=True)
    suggested_category = serializers.SerializerMethodField()

    class Meta(BaseModelSerializer.Meta):
        model = AccountGroup
        fields = '__all__'

    def get_suggested_category(self, obj):
        """طبقهٔ پیشنهادی بر پایهٔ نام گروه (هشدار ناهمگونی نام و نوع)."""
        return infer_category_from_name(obj.name)


class AccountSerializer(BaseModelSerializer):
    nature_display = serializers.CharField(source='get_nature_display', read_only=True)
    full_code = serializers.CharField(read_only=True)
    account_type_name = serializers.CharField(source='account_type.name', read_only=True)
    account_type_category = serializers.CharField(source='account_type.category', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)
    group_type_name = serializers.CharField(source='group.account_type.name', read_only=True)
    group_type_category = serializers.CharField(source='group.account_type.category', read_only=True)
    parent_code = serializers.CharField(source='parent.code', read_only=True)
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    parent_type_name = serializers.CharField(source='parent.account_type.name', read_only=True)
    parent_type_category = serializers.CharField(source='parent.account_type.category', read_only=True)
    type_mismatch = serializers.SerializerMethodField()

    class Meta(BaseModelSerializer.Meta):
        model = Account
        fields = '__all__'
        extra_kwargs = {
            'account_type': {'required': False},
            'auxiliary_category_1': {'required': False},
            'auxiliary_category_2': {'required': False},
            'auxiliary_category_3': {'required': False},
        }

    def get_type_mismatch(self, obj):
        """آیا نوع حساب با والد/گروه آن ناهمگون است؟ (عارضهٔ «همه دارایی»)."""
        current = getattr(obj.account_type, 'category', None)
        if not current:
            return False
        if obj.parent_id and obj.parent is not None and obj.parent.account_type_id:
            return obj.parent.account_type.category != current
        if obj.group_id and obj.group is not None and obj.group.account_type_id:
            expected = obj.group.account_type.category
            name_category = infer_category_from_name(obj.group.name)
            if name_category and name_category != expected:
                expected = name_category
            return expected != current
        return False

class AuxiliaryCategorySerializer(BaseModelSerializer):
    source_display = serializers.CharField(source='get_source_display', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = AuxiliaryCategory
        fields = ['id', 'code', 'name', 'source', 'source_display', 'is_active', 'sort_order']


class AuxiliaryAccountSerializer(BaseModelSerializer):
    aux_type_display = serializers.CharField(source='get_aux_type_display', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    contract_name = serializers.CharField(source='contract.subject', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    party_name = serializers.CharField(source='party.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    treasury_entity_name = serializers.CharField(source='treasury_entity.name', read_only=True)
    person_type_display = serializers.CharField(source='get_person_type_display', read_only=True)

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

    invoice_type_display = serializers.CharField(source='get_invoice_type_display', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = AccountingDocumentLine
        fields = [
            'id', 'document', 'account', 'account_code', 'account_name', 'auxiliary',
            'auxiliary_1', 'auxiliary_2', 'auxiliary_3', 'maturity_date',
            'line_no', 'description', 'debit', 'credit', 'currency', 'exchange_rate',
            'base_amount', 'reference',
            'vat_rate', 'vat_amount', 'invoice_number', 'invoice_type', 'invoice_type_display',
            'party_tax_id', 'party_national_id', 'party_postal_code', 'season_flag',
            'cost_center', 'project', 'contract', 'employee',
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
    fiscal_year_name = serializers.CharField(source='fiscal_year.name', read_only=True)
    prepared_by_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    issues_count = serializers.IntegerField(read_only=True)
    open_issues_count = serializers.IntegerField(read_only=True)

    def get_prepared_by_name(self, obj):
        """نام و نام خانوادگی کاربری که سند را ثبت/تهیه کرده است."""
        return user_full_name(obj.created_by)

    def get_created_by_name(self, obj):
        return user_full_name(obj.created_by)

    class Meta(BaseModelSerializer.Meta):
        model = AccountingDocument
        fields = '__all__'
        # نواقص سند فقط از طریق اکشن‌های اختصاصی تغییر می‌کند
        # (issue_add / issue_toggle / issue_remove) تا تاریخچه ثبت شود.
        extra_kwargs = {'issues': {'read_only': True}}

    def create(self, validated_data):
        from django.utils import timezone
        lines = validated_data.pop('lines', [])
        company = validated_data.pop('company', None)
        user = self.context['request'].user if 'request' in self.context else None
        # وضعیت فقط از مسیر اکشن‌های چرخهٔ سند تغییر می‌کند؛ ساخت API همیشه پیش‌نویس است.
        validated_data['status'] = 'draft'
        validated_data['is_locked'] = False
        doc = AccountingDocument.objects.create(company=company, **validated_data)
        doc.history = [{'step': 'created', 'by': user.username if user else '', 'note': 'ایجاد سند', 'at': timezone.now().isoformat()}]
        doc.save(update_fields=['history'])
        for i, line in enumerate(lines, start=1):
            line.pop('document', None)
            line.pop('company', None)
            AccountingDocumentLine.objects.create(document=doc, company=company, line_no=line.get('line_no', i), **line)
        return doc

    def update(self, instance, validated_data):
        from django.utils import timezone
        if instance.is_locked or instance.status in ('posted', 'locked', 'reversed'):
            raise serializers.ValidationError({
                'error': 'سند ثبت/قفل‌شده قابل ویرایش نیست؛ از برگشت سند استفاده کنید.',
            })
        # وضعیت و قفل فقط با اکشن‌های submit/approve/post/lock/reverse تغییر می‌کند.
        validated_data.pop('status', None)
        validated_data.pop('is_locked', None)
        lines = validated_data.pop('lines', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        user = self.context['request'].user if 'request' in self.context else None
        hist = list(instance.history or [])
        hist.append({'step': 'edited', 'by': user.username if user else '', 'note': 'ویرایش سند', 'at': timezone.now().isoformat()})
        instance.history = hist
        instance.save()
        if lines is not None:
            instance.lines.all().delete()
            for i, line in enumerate(lines, start=1):
                line.pop('document', None)
                line.pop('company', None)
                AccountingDocumentLine.objects.create(
                    document=instance, company=instance.company, line_no=line.get('line_no', i), **line,
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
    description_template = serializers.JSONField(required=False)

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
                    template=instance, company=instance.company, line_no=line.get('line_no', i), **line,
                )
        return instance


class AccountingSettingsSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = AccountingSettings
        fields = '__all__'


class BankStatementLineSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = BankStatementLine
        fields = ['id', 'statement', 'date', 'description', 'amount', 'currency', 'matched']
        extra_kwargs = {'statement': {'read_only': True}}


class BankStatementSerializer(BaseModelSerializer):
    account_code = serializers.CharField(source='account.code', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    lines = BankStatementLineSerializer(many=True, required=False)

    class Meta(BaseModelSerializer.Meta):
        model = BankStatement
        fields = ['id', 'account', 'account_code', 'account_name', 'statement_date', 'reference', 'opening_balance', 'closing_balance', 'lines']

    def create(self, validated_data):
        lines = validated_data.pop('lines', [])
        st = BankStatement.objects.create(**validated_data)
        for line in lines:
            line.pop('statement', None)
            BankStatementLine.objects.create(statement=st, **line)
        return st


class ApprovalStepSerializer(BaseModelSerializer):
    decision_display = serializers.CharField(source='get_decision_display', read_only=True)
    approver_name = serializers.CharField(source='approver.username', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = ApprovalStep
        fields = ['id', 'document', 'approver', 'approver_name', 'step_no', 'decision', 'decision_display', 'comment', 'decided_at']
        extra_kwargs = {'document': {'read_only': True}}


class ApprovalPolicySerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = ApprovalPolicy
        fields = ['id', 'name', 'single_level_limit', 'is_active']


class BankReconciliationSerializer(BaseModelSerializer):
    account_code = serializers.CharField(source='account.code', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = BankReconciliation
        fields = ['id', 'account', 'account_code', 'account_name', 'as_of', 'statement_balance', 'book_balance', 'difference']


class CodingConfigSerializer(BaseModelSerializer):
    level_display = serializers.CharField(source='get_level_display', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = CodingConfig
        fields = [
            'id', 'level', 'level_display', 'prefix', 'start_number',
            'end_number', 'min_length', 'max_length', 'is_active',
        ]


# ---------------------------------------------------------------------------
# Seasonal transactions (ماده ۱۶۹ مکرر)
# ---------------------------------------------------------------------------

class SeasonalTransactionSerializer(BaseModelSerializer):
    total = serializers.SerializerMethodField()
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    moadian_status_display = serializers.CharField(source='get_moadian_status_display', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = SeasonalTransaction
        fields = [
            'id', 'line_no', 'name', 'person_type', 'economic_code', 'national_id',
            'postal_code', 'province', 'city', 'address', 'goods_service_desc',
            'amount', 'vat', 'total', 'kind', 'kind_display', 'invoice_date',
            'invoice_no', 'moadian_status', 'moadian_status_display', 'moadian_uid',
            'currency_code', 'fx_rate', 'source', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'line_no', 'source', 'created_at', 'updated_at', 'company']

    def get_total(self, obj):
        return str(obj.total)

    def validate_amount(self, value):
        if value is None or value < 0:
            raise serializers.ValidationError('مبلغ نمی‌تواند منفی باشد.')
        return value

    def validate_vat(self, value):
        if value is None or value < 0:
            raise serializers.ValidationError('مالیات بر ارزش افزوده نمی‌تواند منفی باشد.')
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        amount = attrs.get('amount', getattr(self.instance, 'amount', 0)) or 0
        vat = attrs.get('vat', getattr(self.instance, 'vat', 0)) or 0
        if vat and amount and vat > amount:
            raise serializers.ValidationError({'vat': 'مالیات بر ارزش افزوده از مبلغ معامله بیشتر است.'})
        invoice_date = attrs.get('invoice_date', getattr(self.instance, 'invoice_date', None))
        report = attrs.get('report', getattr(self.instance, 'report', None))
        if report and invoice_date:
            start, end = report.period_range
            if not (start <= invoice_date <= end):
                raise serializers.ValidationError({
                    'invoice_date': 'تاریخ فاکتور بیرون از بازهٔ این فصل است.',
                })
        for field, length in (('economic_code', 11), ('postal_code', 10)):
            code = attrs.get(field)
            if code and (not str(code).isdigit() or len(str(code)) > length):
                raise serializers.ValidationError({field: f'فقط رقم مجاز است (حداکثر {length} رقم).'})
        return attrs

class SeasonalReportSerializer(BaseModelSerializer):
    """گزارش فصلی + ردیف‌ها + جمع‌های کنترل."""

    fiscal_year_name = serializers.CharField(source='fiscal_year.name', read_only=True)
    quarter_display = serializers.CharField(source='get_quarter_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    period_start = serializers.DateField(read_only=True)
    period_end = serializers.DateField(read_only=True)
    is_locked = serializers.BooleanField(read_only=True)
    rows_count = serializers.SerializerMethodField()
    control_totals = serializers.SerializerMethodField()
    transactions = SeasonalTransactionSerializer(many=True, read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = SeasonalReport
        fields = [
            'id', 'fiscal_year', 'fiscal_year_name', 'quarter', 'quarter_display',
            'status', 'status_display', 'notes', 'submitted_at', 'submission_ref',
            'period_start', 'period_end', 'is_locked', 'rows_count', 'control_totals',
            'transactions', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at', 'submitted_at']

    def get_rows_count(self, obj):
        return obj.transactions.count()

    def get_control_totals(self, obj):
        from accounting.seasonal import control_totals

        return control_totals(obj)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        company = self.context.get('company')
        fiscal_year = attrs.get('fiscal_year', getattr(self.instance, 'fiscal_year', None))
        quarter = attrs.get('quarter', getattr(self.instance, 'quarter', None))
        if company and fiscal_year and quarter:
            existing = SeasonalReport.objects.filter(
                company=company, fiscal_year=fiscal_year, quarter=quarter,
            ).exclude(pk=getattr(self.instance, 'pk', None))
            if existing.exists():
                raise serializers.ValidationError(
                    {'quarter': 'برای این سال مالی و فصل، گزارش دیگری ثبت شده است.'},
                )
        return attrs


class SeasonalRowsWriteSerializer(serializers.Serializer):
    """بدنهٔ ذخیرهٔ گروهی ردیف‌ها: ``{'rows': [...]}``."""

    rows = serializers.ListField(child=serializers.DictField(), allow_empty=True)

