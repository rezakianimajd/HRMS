"""Serializers for the new payroll core."""
from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from payroll.engine.formula import FormulaError, validate_formula
from payroll.models import (
    EmployeeAdvance, EmployeeLoanInstallment, EmployeePayrollComponent,
    EmployeePayrollProfile, PayrollAccountMapping, PayrollAdjustment, PayrollBankFormat,
    PayrollChangeLog, PayrollComponent, PayrollComponentRule, PayrollCost,
    PayrollCostAllocation, PayrollEmployeeResult, PayrollInsuranceRate, PayrollItem,
    PayrollOvertime, PayrollPaymentBatch, PayrollPaymentBatchLine, PayrollPeriod,
    PayrollSettlement, PayrollSettings, PayrollTaxBracket,
)


def mask(value, keep=4):
    value = str(value or '')
    if not value:
        return ''
    if len(value) <= keep:
        return '*' * len(value)
    return '*' * max(0, len(value) - keep) + value[-keep:]


def validate_safe_formula(value):
    if not value:
        return value
    try:
        validate_formula(value)
    except FormulaError as exc:
        raise serializers.ValidationError(str(exc)) from exc
    return value


class PayrollSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollSettings
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class PayrollInsuranceRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollInsuranceRate
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class PayrollTaxBracketSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollTaxBracket
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def validate(self, attrs):
        lower = attrs.get('lower_bound', getattr(self.instance, 'lower_bound', 0))
        upper = attrs.get('upper_bound', getattr(self.instance, 'upper_bound', None))
        if upper is not None and upper < lower:
            raise serializers.ValidationError('سقف پله نمی‌تواند کمتر از کف باشد.')
        return attrs


class PayrollComponentSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    calc_type_display = serializers.CharField(source='get_calc_type_display', read_only=True)
    expense_account_code = serializers.CharField(source='expense_account.code', read_only=True)
    payable_account_code = serializers.CharField(source='payable_account.code', read_only=True)

    class Meta:
        model = PayrollComponent
        fields = '__all__'
        read_only_fields = ['id', 'company', 'is_builtin', 'created_at', 'updated_at']

    def validate_formula(self, value):
        return validate_safe_formula(value)


class PayrollComponentRuleSerializer(serializers.ModelSerializer):
    component_code = serializers.CharField(source='component.code', read_only=True)

    class Meta:
        model = PayrollComponentRule
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def validate_formula(self, value):
        return validate_safe_formula(value)


class EmployeePayrollProfileSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    department = serializers.CharField(source='employee.department.name', read_only=True)
    job_title = serializers.CharField(source='employee.job_title.name', read_only=True)

    class Meta:
        model = EmployeePayrollProfile
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class EmployeePayrollComponentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    component_title = serializers.CharField(source='component.title', read_only=True)
    component_code = serializers.CharField(source='component.code', read_only=True)

    class Meta:
        model = EmployeePayrollComponent
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class PayrollOvertimeSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = PayrollOvertime
        fields = '__all__'
        read_only_fields = ['id', 'company', 'approved_by', 'approved_at', 'created_at', 'updated_at']


class EmployeeAdvanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = EmployeeAdvance
        fields = '__all__'
        read_only_fields = [
            'id', 'company', 'approved_by', 'approved_at', 'deducted_amount',
            'last_deducted_period', 'created_at', 'updated_at',
        ]

    def validate(self, attrs):
        if attrs.get('installment_count', 1) < 1:
            raise serializers.ValidationError('تعداد اقساط باید حداقل ۱ باشد.')
        return attrs


class EmployeeLoanInstallmentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='loan.employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='loan.employee.employee_id', read_only=True)
    loan_amount = serializers.DecimalField(source='loan.amount', max_digits=18, decimal_places=2, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = EmployeeLoanInstallment
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class PayrollCostAllocationSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    cost_center_name = serializers.CharField(source='cost_center.name', read_only=True)

    class Meta:
        model = PayrollCostAllocation
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class PayrollCostSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    cost_center_name = serializers.CharField(source='cost_center.name', read_only=True)

    class Meta:
        model = PayrollCost
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class PayrollAccountMappingSerializer(serializers.ModelSerializer):
    code_display = serializers.CharField(source='get_code_display', read_only=True)
    account_code = serializers.CharField(source='account.code', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    journal_name = serializers.CharField(source='journal.name', read_only=True)

    class Meta:
        model = PayrollAccountMapping
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class PayrollBankFormatSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollBankFormat
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class PayrollPaymentBatchLineSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    employee_code = serializers.CharField(source='result.employee.employee_id', read_only=True)

    class Meta:
        model = PayrollPaymentBatchLine
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class PayrollPaymentBatchSerializer(serializers.ModelSerializer):
    format_name = serializers.CharField(source='format.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    file_url = serializers.SerializerMethodField()
    lines = PayrollPaymentBatchLineSerializer(many=True, read_only=True)

    class Meta:
        model = PayrollPaymentBatch
        fields = '__all__'
        read_only_fields = ['id', 'company', 'file', 'line_count', 'total_amount', 'generated_at',
                            'generated_by', 'created_at', 'updated_at']

    def get_file_url(self, obj):
        if not obj.file:
            return ''
        request = self.context.get('request')
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url


class PayrollItemSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)

    class Meta:
        model = PayrollItem
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class PayrollEmployeeResultListSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    period_label = serializers.CharField(source='period.label', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = PayrollEmployeeResult
        fields = [
            'id', 'employee', 'employee_name', 'employee_code', 'period', 'period_label',
            'status', 'status_display', 'base_salary', 'payable_days', 'overtime_hours',
            'gross_amount', 'insurance_employee', 'insurance_employer', 'tax_amount',
            'other_deductions', 'net_amount', 'employer_cost', 'total_cost', 'warnings',
            'project', 'cost_center', 'created_at',
        ]
        read_only_fields = fields


class PayrollEmployeeResultSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    period_label = serializers.CharField(source='period.label', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    bank_masked = serializers.SerializerMethodField()
    items = PayrollItemSerializer(many=True, read_only=True)

    class Meta:
        model = PayrollEmployeeResult
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def get_bank_masked(self, obj):
        bank = obj.bank_snapshot or {}
        return {
            'bank_name': bank.get('bank_name', ''),
            'account_number': mask(bank.get('account_number')),
            'sheba_number': mask(bank.get('sheba_number')),
            'card_number': mask(bank.get('card_number')),
        }


class PayrollPeriodSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    type_display = serializers.CharField(source='get_period_type_display', read_only=True)
    accounting_document_number = serializers.CharField(source='accounting_document.number', read_only=True)
    payment_request_number = serializers.CharField(source='payment_request.number', read_only=True)
    results_count = serializers.SerializerMethodField()
    calculated_by_name = serializers.CharField(source='calculated_by.get_full_name', read_only=True)

    class Meta:
        model = PayrollPeriod
        fields = '__all__'
        read_only_fields = [
            'id', 'company', 'status', 'calculated_at', 'calculated_by', 'reviewed_at',
            'reviewed_by', 'approved_at', 'approved_by', 'paid_at', 'paid_by', 'closed_at',
            'closed_by', 'employee_count', 'calculated_count', 'warning_count', 'error_count',
            'gross_amount', 'insurance_employee', 'insurance_employer', 'tax_amount',
            'other_deductions', 'net_amount', 'employer_cost', 'total_cost', 'paid_amount',
            'insurance_rate_snapshot', 'tax_rules_snapshot', 'accounting_document',
            'payment_request', 'created_at', 'updated_at',
        ]
        extra_kwargs = {
            'start_date': {'required': False},
            'end_date': {'required': False},
        }

    def get_results_count(self, obj):
        return obj.results.count()

    def validate(self, attrs):
        from payroll.engine.calendar import PayrollCalendarError, jalali_month_bounds

        if self.instance is None:
            year = attrs.get('year')
            month = attrs.get('month')
            if year and month and not attrs.get('start_date') and not attrs.get('end_date'):
                try:
                    start, end = jalali_month_bounds(year, month)
                except PayrollCalendarError as exc:
                    raise serializers.ValidationError(str(exc)) from exc
                attrs['start_date'], attrs['end_date'] = start, end
        start = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end = attrs.get('end_date', getattr(self.instance, 'end_date', None))
        if start and end and start > end:
            raise serializers.ValidationError('تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.')
        if not attrs.get('title'):
            year = attrs.get('year', getattr(self.instance, 'year', None))
            month = attrs.get('month', getattr(self.instance, 'month', None))
            if year:
                attrs['title'] = f'حقوق {year}/{month or "—"}'
        return attrs


class PayrollSettlementSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)

    class Meta:
        model = PayrollSettlement
        fields = '__all__'
        read_only_fields = [
            'id', 'company', 'status', 'service_years', 'leave_pay', 'severance',
            'loan_balance', 'advance_balance', 'gross_amount', 'net_amount', 'calculation',
            'approved_by', 'approved_at', 'paid_at', 'accounting_document', 'payment_request',
            'created_at', 'updated_at',
        ]


class PayrollAdjustmentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)

    class Meta:
        model = PayrollAdjustment
        fields = '__all__'
        read_only_fields = ['id', 'company', 'approved_by', 'approved_at', 'accounting_document',
                            'created_at', 'updated_at']


class PayrollChangeLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = PayrollChangeLog
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class PayrollPeriodListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    type_display = serializers.CharField(source='get_period_type_display', read_only=True)
    accounting_document_number = serializers.CharField(source='accounting_document.number', read_only=True)
    payment_request_number = serializers.CharField(source='payment_request.number', read_only=True)

    class Meta:
        model = PayrollPeriod
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']
