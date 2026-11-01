"""Serializers for the Petty Cash module."""
from django.utils import timezone
from rest_framework import serializers
from pettycash.models import (
    PettyCashFund, PettyCashTransaction, PettyCashCategory,
    PettyCashExpenseStatement, PettyCashExpenseStatementLine,
    PettyCashApprovalPolicy, PettyCashApprovalStep,
    PettyCashExpenseAttachment, PettyCashSettings,
    PettyCashRequest, PettyCashSettlement,
)



class PettyCashCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PettyCashCategory
        fields = ['id', 'name', 'code', 'budget_monthly', 'is_active', 'created_at']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class PettyCashTransactionSerializer(serializers.ModelSerializer):
    entry_type_display = serializers.CharField(source='get_entry_type_display', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    receipt_url = serializers.SerializerMethodField()
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    cost_center_name = serializers.CharField(source='cost_center.name', read_only=True)
    statement_number = serializers.CharField(source='statement.number', read_only=True)
    voided_by_name = serializers.CharField(source='voided_by.username', read_only=True)

    class Meta:
        model = PettyCashTransaction
        fields = [
            'id', 'fund', 'entry_type', 'entry_type_display',
            'category', 'category_name', 'amount', 'title', 'date',
            'receipt', 'receipt_url', 'description',
            'is_archived', 'archived_at', 'created_at',
            'payment_method', 'payment_method_display', 'reference', 'counterparty',
            'project', 'project_name', 'cost_center', 'cost_center_name',
            'statement', 'statement_number', 'settlement',
            'is_void', 'voided_at', 'voided_by', 'voided_by_name', 'void_reason',
            'created_by',
        ]
        read_only_fields = [
            'id', 'company', 'is_active', 'created_at', 'updated_at',
            'statement', 'settlement', 'is_void', 'voided_at', 'voided_by', 'void_reason',
            'created_by',
        ]

    def get_receipt_url(self, obj):
        if obj.receipt:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.receipt.url) if request else obj.receipt.url
        return None

    def validate(self, attrs):
        from pettycash.services import PettyCashError, assert_period_open, money
        fund = attrs.get('fund') or getattr(self.instance, 'fund', None)
        amount = attrs.get('amount') or getattr(self.instance, 'amount', None)
        date = attrs.get('date') or getattr(self.instance, 'date', None)
        if self.instance and self.instance.statement_id:
            raise serializers.ValidationError(
                'این حرکت مالی به یک صورت هزینه متصل است و قابل ویرایش نیست؛ برای اصلاح از ابطال استفاده کنید.'
            )
        if money(amount) <= 0:
            raise serializers.ValidationError({'amount': 'مبلغ باید بزرگ‌تر از صفر باشد.'})
        if fund and date:
            try:
                assert_period_open(fund.company, date)
            except PettyCashError as exc:
                raise serializers.ValidationError({'date': str(exc)})
        return attrs




class PettyCashApprovalStepSerializer(serializers.ModelSerializer):
    decision_display = serializers.CharField(source='get_decision_display', read_only=True)
    approver_name = serializers.CharField(source='approver.username', read_only=True)

    class Meta:
        model = PettyCashApprovalStep
        fields = [
            'id', 'statement', 'request', 'settlement', 'approver', 'approver_name',
            'step_no', 'decision', 'decision_display', 'comment', 'decided_at',
        ]

    def validate(self, attrs):
        targets = [attrs.get('statement'), attrs.get('request'), attrs.get('settlement')]
        targets = [t for t in targets if t is not None]
        if len(targets) != 1:
            raise serializers.ValidationError(
                'هر مرحلهٔ تأیید باید دقیقاً به یکی از صورت هزینه، درخواست یا تسویه متصل باشد.'
            )
        return attrs


class PettyCashExpenseAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)

    class Meta:
        model = PettyCashExpenseAttachment
        fields = ['id', 'line', 'file', 'file_url', 'title', 'kind', 'kind_display', 'created_at']
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.file.url) if request else obj.file.url
        return None



class PettyCashApprovalPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = PettyCashApprovalPolicy
        fields = ['id', 'name', 'single_level_limit', 'is_active']
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class PettyCashExpenseStatementLineSerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source='account.code', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    attachment_url = serializers.SerializerMethodField()
    attachments = PettyCashExpenseAttachmentSerializer(many=True, read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    cost_center_name = serializers.CharField(source='cost_center.name', read_only=True)
    contract_code = serializers.CharField(source='contract.code', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    net_amount_display = serializers.SerializerMethodField()

    class Meta:
        model = PettyCashExpenseStatementLine
        fields = [
            'id', 'statement', 'line_no', 'account', 'account_code', 'account_name',
            'auxiliary_1', 'auxiliary_2', 'auxiliary_3',
            'invoice_number', 'supplier', 'expense_date', 'description',
            'attachment', 'attachment_url', 'attachments', 'debit',
            'net_amount', 'net_amount_display', 'vat_amount', 'tax_amount',
            'category', 'category_name', 'project', 'project_name',
            'cost_center', 'cost_center_name', 'contract', 'contract_code',
        ]
        extra_kwargs = {'statement': {'read_only': True}}

    def get_attachment_url(self, obj):
        if obj.attachment:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.attachment.url) if request else obj.attachment.url
        return None

    def get_net_amount_display(self, obj):
        return obj.computed_net



class PettyCashExpenseStatementSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    fund_title = serializers.CharField(source='fund.title', read_only=True)
    custodian_name = serializers.CharField(source='custodian.full_name', read_only=True)
    total = serializers.DecimalField(max_digits=18, decimal_places=0, read_only=True)
    net_total = serializers.DecimalField(max_digits=18, decimal_places=0, read_only=True)
    tax_total = serializers.DecimalField(max_digits=18, decimal_places=0, read_only=True)
    lines = PettyCashExpenseStatementLineSerializer(many=True, required=False)
    approval_steps = PettyCashApprovalStepSerializer(many=True, read_only=True)
    submitted_by_name = serializers.CharField(source='submitted_by.username', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.username', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    cost_center_name = serializers.CharField(source='cost_center.name', read_only=True)
    is_editable = serializers.BooleanField(read_only=True)
    is_settled = serializers.BooleanField(read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    class Meta:
        model = PettyCashExpenseStatement
        fields = [
            'id', 'fund', 'fund_title', 'custodian', 'custodian_name', 'number',
            'date', 'description', 'status', 'status_display', 'history', 'total', 'lines',
            'net_total', 'tax_total',
            'submitted_by', 'submitted_by_name', 'submitted_at',
            'approved_by', 'approved_by_name', 'approved_at',
            'approval_steps', 'is_deleted', 'deleted_at', 'created_at',
            'project', 'project_name', 'cost_center', 'cost_center_name',
            'payment_method', 'payment_method_display', 'due_date', 'settled_at',
            'is_editable', 'is_settled',
        ]
        read_only_fields = [
            'id', 'company', 'is_active', 'created_at', 'updated_at',
            'custodian', 'status', 'history',
        ]

    def validate(self, attrs):
        from pettycash.services import PettyCashError, assert_period_open
        fund = attrs.get('fund') or getattr(self.instance, 'fund', None)
        date = attrs.get('date') or getattr(self.instance, 'date', None)
        if self.instance and not self.instance.is_editable:
            raise serializers.ValidationError(
                'صورت هزینه در وضعیت «%s» قابل ویرایش نیست.' % self.instance.get_status_display()
            )
        if fund and date:
            try:
                assert_period_open(fund.company, date)
            except PettyCashError as exc:
                raise serializers.ValidationError({'date': str(exc)})
        return attrs

    def create(self, validated_data):
        from pettycash.services import next_statement_number
        lines = validated_data.pop('lines', [])
        company = validated_data.pop('company', None)
        fund = validated_data.get('fund')
        if not validated_data.get('number'):
            validated_data['number'] = next_statement_number(company, validated_data.get('date'))
        if not validated_data.get('due_date') and validated_data.get('date') and fund:
            days = fund.settlement_days or 30
            validated_data['due_date'] = validated_data['date'] + timezone.timedelta(days=days)
        st = PettyCashExpenseStatement.objects.create(company=company, **validated_data)
        for i, line in enumerate(lines, start=1):
            line.pop('statement', None)
            line.pop('company', None)
            attachment = line.pop('attachment', None)
            extra_files = line.pop('attachments', None)
            ln = PettyCashExpenseStatementLine.objects.create(
                statement=st, company=company, line_no=i, **line,
            )
            if attachment:
                ln.attachment = attachment
                ln.save(update_fields=['attachment'])
            for extra in (extra_files or []):
                if hasattr(extra, 'read'):
                    PettyCashExpenseAttachment.objects.create(
                        company=company, line=ln, file=extra,
                        title=getattr(extra, 'name', '')[:200],
                    )
        return st

    def update(self, instance, validated_data):
        from pettycash.services import next_statement_number
        lines = validated_data.pop('lines', None)
        company = validated_data.pop('company', None) or instance.company
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if not instance.number:
            instance.number = next_statement_number(company, instance.date)
        instance.save()
        if lines is not None:
            instance.lines.all().delete()
            for i, line in enumerate(lines, start=1):
                line.pop('statement', None)
                line.pop('company', None)
                attachment = line.pop('attachment', None)
                extra_files = line.pop('attachments', None)
                ln = PettyCashExpenseStatementLine.objects.create(
                    statement=instance, company=company, line_no=i, **line,
                )
                if attachment:
                    ln.attachment = attachment
                    ln.save(update_fields=['attachment'])
                for extra in (extra_files or []):
                    if hasattr(extra, 'read'):
                        PettyCashExpenseAttachment.objects.create(
                            company=company, line=ln, file=extra,
                            title=getattr(extra, 'name', '')[:200],
                        )
        return instance



class PettyCashFundSerializer(serializers.ModelSerializer):
    custodian_name = serializers.CharField(source='custodian.full_name', read_only=True)
    custodian_code = serializers.CharField(source='custodian.employee_id', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    balance = serializers.DecimalField(max_digits=18, decimal_places=0, read_only=True)
    usage_percent = serializers.FloatField(read_only=True)
    imprest_status = serializers.SerializerMethodField()
    allowed_projects = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    allowed_cost_centers = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    allowed_accounts = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = PettyCashFund
        fields = [
            'id', 'code', 'title', 'custodian', 'custodian_name', 'custodian_code',
            'general_account', 'account', 'auxiliary_1', 'auxiliary_2', 'auxiliary_3',
            'opening_balance', 'limit', 'status', 'status_display', 'balance',
            'budget_monthly', 'is_reconciled', 'reconciled_at',
            'archived_at', 'description', 'created_at',
            'kind', 'kind_display', 'fixed_amount', 'settlement_days',
            'start_date', 'end_date', 'payment_methods',
            'allowed_projects', 'allowed_cost_centers', 'allowed_accounts',
            'advance_account', 'usage_percent', 'imprest_status',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at', 'balance']

    def get_imprest_status(self, obj):
        from pettycash.services import imprest_status
        try:
            return imprest_status(obj)
        except Exception:  # noqa: BLE001
            return {}

    def validate(self, attrs):
        if attrs.get('limit') is not None and attrs.get('opening_balance') is not None:
            if attrs['limit'] < attrs['opening_balance']:
                raise serializers.ValidationError(
                    {'limit': 'سقف تنخواه نمی‌تواند کمتر از اعتبار اولیه باشد.'}
                )
        start = attrs.get('start_date') or getattr(self.instance, 'start_date', None)
        end = attrs.get('end_date') or getattr(self.instance, 'end_date', None)
        if start and end and end < start:
            raise serializers.ValidationError({'end_date': 'تاریخ پایان باید بعد از تاریخ شروع باشد.'})
        return attrs


class PettyCashSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PettyCashSettings
        fields = [
            'id', 'number_prefix', 'default_settlement_days', 'default_limit',
            'max_single_payment', 'require_attachment', 'require_invoice_number',
            'enforce_segregation_of_duties', 'allow_negative_balance',
            'low_balance_alert_ratio', 'payment_methods', 'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']

    def validate_payment_methods(self, value):
        valid = {code for code, _label in PettyCashFund.PAYMENT_METHOD_CHOICES}
        unknown = [code for code in (value or []) if code not in valid]
        if unknown:
            raise serializers.ValidationError(f'روش پرداخت نامعتبر: {", ".join(unknown)}')
        return value


class PettyCashRequestSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    fund_title = serializers.CharField(source='fund.title', read_only=True)
    custodian_name = serializers.CharField(source='custodian.full_name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    cost_center_name = serializers.CharField(source='cost_center.name', read_only=True)
    attachment_url = serializers.SerializerMethodField()
    approval_steps = PettyCashApprovalStepSerializer(many=True, read_only=True)
    requester_name = serializers.CharField(source='requester.username', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.username', read_only=True)

    class Meta:
        model = PettyCashRequest
        fields = [
            'id', 'number', 'kind', 'kind_display', 'fund', 'fund_title',
            'custodian', 'custodian_name', 'department', 'project', 'project_name',
            'cost_center', 'cost_center_name', 'account', 'amount', 'reason',
            'needed_date', 'due_date', 'attachment', 'attachment_url',
            'status', 'status_display', 'requester', 'requester_name',
            'submitted_by', 'submitted_at', 'approved_by', 'approved_by_name', 'approved_at',
            'decision_note', 'resulting_transaction', 'history',
            'approval_steps', 'created_at',
        ]
        read_only_fields = [
            'id', 'company', 'is_active', 'created_at', 'updated_at', 'status',
            'submitted_by', 'submitted_at', 'approved_by', 'approved_at',
            'decision_note', 'resulting_transaction', 'history',
        ]

    def get_attachment_url(self, obj):
        if obj.attachment:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.attachment.url) if request else obj.attachment.url
        return None

    def validate(self, attrs):
        from pettycash.services import PettyCashError, money
        fund = attrs.get('fund') or getattr(self.instance, 'fund', None)
        kind = attrs.get('kind') or getattr(self.instance, 'kind', None)
        amount = attrs.get('amount')
        if amount is not None and money(amount) < 0:
            raise serializers.ValidationError({'amount': 'مبلغ درخواست نمی‌تواند منفی باشد.'})
        fund_required = (
            PettyCashRequest.Kind.RECHARGE, PettyCashRequest.Kind.LIMIT_INCREASE,
            PettyCashRequest.Kind.EXTEND, PettyCashRequest.Kind.CLOSE,
            PettyCashRequest.Kind.CUSTODIAN_CHANGE,
        )
        if kind in fund_required and not fund:
            raise serializers.ValidationError({'fund': 'برای این نوع درخواست، انتخاب تنخواه الزامی است.'})
        amount_required = (
            PettyCashRequest.Kind.FUND, PettyCashRequest.Kind.RECHARGE,
            PettyCashRequest.Kind.ADHOC, PettyCashRequest.Kind.MISSION,
        )
        if kind in amount_required and money(amount) <= 0:
            raise serializers.ValidationError({'amount': 'مبلغ درخواست باید بزرگ‌تر از صفر باشد.'})
        if self.instance and self.instance.status != PettyCashRequest.Status.DRAFT:
            raise serializers.ValidationError('فقط درخواست پیش‌نویس قابل ویرایش است.')
        try:
            if fund and kind == PettyCashRequest.Kind.FUND:
                from pettycash.services import assert_charge_allowed
                assert_charge_allowed(fund, amount)
        except PettyCashError as exc:
            raise serializers.ValidationError({'amount': str(exc)})
        return attrs

    def create(self, validated_data):
        from pettycash.services import next_request_number
        company = validated_data.pop('company', None)
        request_user = self.context.get('request')
        user = getattr(request_user, 'user', None)
        if not validated_data.get('number'):
            validated_data['number'] = next_request_number(company, validated_data.get('needed_date'))
        fund = validated_data.get('fund')
        if fund and not validated_data.get('custodian'):
            validated_data['custodian'] = fund.custodian
        if user is not None and getattr(user, 'is_authenticated', False):
            validated_data.setdefault('requester', user)
        return PettyCashRequest.objects.create(company=company, **validated_data)



class PettyCashSettlementSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    fund_title = serializers.CharField(source='fund.title', read_only=True)
    custodian_name = serializers.CharField(source='custodian.full_name', read_only=True)
    statement_numbers = serializers.SerializerMethodField()
    approval_steps = PettyCashApprovalStepSerializer(many=True, read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.username', read_only=True)
    balance_difference = serializers.DecimalField(max_digits=18, decimal_places=0, read_only=True)

    class Meta:
        model = PettyCashSettlement
        fields = [
            'id', 'number', 'fund', 'fund_title', 'custodian', 'custodian_name',
            'date', 'period_from', 'period_to', 'statements', 'statement_numbers',
            'cash_counted', 'expenses_total', 'rejected_total', 'returned_amount',
            'shortage', 'overage', 'recharge_amount', 'is_full', 'notes',
            'status', 'status_display', 'submitted_by', 'submitted_at',
            'approved_by', 'approved_by_name', 'approved_at', 'history',
            'balance_difference', 'approval_steps', 'created_at',
        ]
        read_only_fields = [
            'id', 'company', 'is_active', 'created_at', 'updated_at',
            'expenses_total', 'rejected_total', 'returned_amount', 'shortage',
            'overage', 'recharge_amount', 'status', 'submitted_by', 'submitted_at',
            'approved_by', 'approved_at', 'history',
        ]

    def get_statement_numbers(self, obj):
        return [s.number or s.pk for s in obj.statements.all()]

    def validate(self, attrs):
        from pettycash.services import PettyCashError, assert_period_open
        fund = attrs.get('fund') or getattr(self.instance, 'fund', None)
        date = attrs.get('date') or getattr(self.instance, 'date', None)
        statements = attrs.get('statements')
        if self.instance and self.instance.status not in (
            PettyCashSettlement.Status.DRAFT, PettyCashSettlement.Status.REJECTED,
        ):
            raise serializers.ValidationError('این تسویه در وضعیت جاری قابل ویرایش نیست.')
        if fund and date:
            try:
                assert_period_open(fund.company, date)
            except PettyCashError as exc:
                raise serializers.ValidationError({'date': str(exc)})
        for st in (statements or []):
            if fund and st.fund_id != fund.id:
                raise serializers.ValidationError(
                    {'statements': 'همهٔ صورت‌های انتخاب‌شده باید متعلق به همین تنخواه باشند.'}
                )
            if st.is_deleted:
                raise serializers.ValidationError(
                    {'statements': 'صورت حذف‌شده را نمی‌توان تسویه کرد.'}
                )
        return attrs

    def _apply_totals(self, settlement):
        from pettycash.services import settlement_summary
        summary = settlement_summary(
            settlement.fund, list(settlement.statements.all()), settlement.cash_counted,
        )
        for field in (
            'expenses_total', 'rejected_total', 'returned_amount',
            'shortage', 'overage', 'recharge_amount',
        ):
            setattr(settlement, field, summary[field])
        settlement.save(update_fields=[
            'expenses_total', 'rejected_total', 'returned_amount',
            'shortage', 'overage', 'recharge_amount', 'updated_at',
        ])
        return settlement

    def create(self, validated_data):
        from pettycash.services import next_settlement_number
        company = validated_data.pop('company', None)
        statements = validated_data.pop('statements', [])
        fund = validated_data.get('fund')
        if not validated_data.get('number'):
            validated_data['number'] = next_settlement_number(company, validated_data.get('date'))
        if fund and not validated_data.get('custodian'):
            validated_data['custodian'] = fund.custodian
        settlement = PettyCashSettlement.objects.create(company=company, **validated_data)
        if statements:
            settlement.statements.set(statements)
        return self._apply_totals(settlement)

    def update(self, instance, validated_data):
        statements = validated_data.pop('statements', None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        if statements is not None:
            instance.statements.set(statements)
        return self._apply_totals(instance)

