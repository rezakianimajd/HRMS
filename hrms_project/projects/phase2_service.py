"""سرویس فاز ۲ (بخش دوم) — گردش صورتجلسه، گواهی پرداخت و تخصیص هزینهٔ منابع.

چرخهٔ صورتجلسهٔ اندازه‌گیری (قابل تست بدون دیتابیس):

    draft → submitted → checked → approved → certified
                  ↘ rejected ↙                ↘ cancelled
"""
from datetime import date, timedelta

from django.db import transaction
from django.utils import timezone

from projects import audit
from projects.phase2_models import CostAllocation, MeasurementSheet, PaymentCertificate

SHEET_TRANSITIONS = {
    'draft': {'submitted', 'cancelled'},
    'submitted': {'checked', 'rejected', 'cancelled'},
    'checked': {'approved', 'rejected'},
    'approved': {'certified', 'cancelled'},
    'rejected': {'draft'},
    'certified': set(),
    'cancelled': {'draft'},
}

CERT_TRANSITIONS = {
    'draft': {'issued', 'cancelled'},
    'issued': {'paid', 'cancelled'},
    'paid': set(),
    'cancelled': {'draft'},
}


def _f(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _user_or_none(user):
    return user if getattr(user, 'is_authenticated', False) else None


def sheet_next_statuses(status):
    return sorted(SHEET_TRANSITIONS.get(status, set()))


def can_transition_sheet(current, target):
    return target in SHEET_TRANSITIONS.get(current, set())


def can_transition_certificate(current, target):
    return target in CERT_TRANSITIONS.get(current, set())


def recalculate_sheet(sheet):
    """بازمحاسبهٔ جمع کارکرد و کسورات از خطوط اندازه‌گیری."""
    gross = 0.0
    for line in sheet.lines.all():
        amount = _f(line.amount)
        if not amount and line.current_quantity and line.unit_price:
            amount = _f(line.current_quantity) * _f(line.unit_price)
        gross += amount

    percent = _f(sheet.retention_percent)
    if percent == 0 and sheet.contract_id:
        percent = _f(getattr(sheet.contract, 'retention_percent', 0))
    retention = round(gross * percent / 100.0, 2)

    deductions = retention + _f(sheet.insurance_amount) + _f(sheet.tax_amount) + _f(sheet.other_deductions)
    sheet.gross_amount = round(gross, 2)
    sheet.retention_percent = percent
    sheet.retention_amount = retention
    sheet.net_amount = round(gross - deductions, 2)
    sheet.save(update_fields=[
        'gross_amount', 'retention_percent', 'retention_amount', 'net_amount', 'updated_at',
    ])
    return sheet


def _transition_sheet(sheet, target, user=None, note='', stamp_checked=False, stamp_approved=False):
    if not can_transition_sheet(sheet.status, target):
        raise ValueError('این تغییر وضعیت برای صورتجلسه مجاز نیست.')
    sheet.status = target
    fields = ['status', 'updated_at']
    if note:
        sheet.decision_note = note
        fields.append('decision_note')
    if target == 'submitted':
        sheet.prepared_by_name = sheet.prepared_by_name or getattr(user, 'username', '')
        fields.append('prepared_by_name')
    if stamp_checked:
        sheet.checked_by = _user_or_none(user)
        sheet.checked_at = timezone.now()
        fields += ['checked_by', 'checked_at']
    if stamp_approved:
        sheet.approved_by = _user_or_none(user)
        sheet.approved_at = timezone.now()
        fields += ['approved_by', 'approved_at']
    sheet.save(update_fields=list(set(fields)))
    audit.log_object(user, sheet, 'UPDATE', description=f'صورتجلسه → {target}')
    return sheet


def submit_sheet(sheet, user=None, note=''):
    recalculate_sheet(sheet)
    return _transition_sheet(sheet, 'submitted', user, note)


def check_sheet(sheet, user=None, note=''):
    """تأیید مشاور."""
    return _transition_sheet(sheet, 'checked', user, note, stamp_checked=True)


def approve_sheet(sheet, user=None, note=''):
    """تأیید کارفرما."""
    return _transition_sheet(sheet, 'approved', user, note, stamp_approved=True)


def reject_sheet(sheet, user=None, note=''):
    return _transition_sheet(sheet, 'rejected', user, note)


@transaction.atomic
def create_certificate(sheet, user=None, number=None, due_date=None):
    """صدور گواهی پرداخت از صورتجلسهٔ تأییدشده (+ صورت‌وضعیت قرارداد در صورت وجود)."""
    if sheet.status != MeasurementSheet.Status.APPROVED:
        raise ValueError('فقط صورتجلسهٔ «تأیید کارفرما» قابل صدور گواهی است.')
    recalculate_sheet(sheet)

    deductions = (
        _f(sheet.retention_amount) + _f(sheet.insurance_amount)
        + _f(sheet.tax_amount) + _f(sheet.other_deductions)
    )
    issue_date = sheet.date or date.today()

    certificate = PaymentCertificate.objects.create(
        company=sheet.company,
        project=sheet.project,
        contract=sheet.contract,
        sheet=sheet,
        number=number or f'PC-{sheet.number}',
        date=issue_date,
        due_date=due_date or (issue_date + timedelta(days=30)),
        gross=sheet.gross_amount,
        deductions=round(deductions, 2),
        net_payable=sheet.net_amount,
        status=PaymentCertificate.Status.DRAFT,
        created_by=_user_or_none(user),
        updated_by=_user_or_none(user),
    )

    if sheet.contract_id:
        from contracts.models import Statement

        statement = Statement.objects.create(
            company=sheet.company,
            contract=sheet.contract,
            number=f'PC-{sheet.number}',
            date=certificate.date,
            amount=sheet.gross_amount,
            work_done=sheet.gross_amount,
            additions_total=0,
            deductions_total=round(deductions, 2),
            net_amount=sheet.net_amount,
            is_approved=True,
            description=f'صورت‌وضعیت خودکار از صورتجلسهٔ {sheet.number}',
        )
        certificate.statement = statement
        certificate.save(update_fields=['statement', 'updated_at'])
        sheet.statement = statement

    sheet.status = MeasurementSheet.Status.CERTIFIED
    sheet.save(update_fields=['statement', 'status', 'updated_at'])
    audit.log_object(user, certificate, 'CREATE', description='صدور گواهی پرداخت')
    return certificate


def issue_certificate(certificate, user=None):
    if not can_transition_certificate(certificate.status, 'issued'):
        raise ValueError('این گواهی قابل صدور نیست.')
    certificate.status = PaymentCertificate.Status.ISSUED
    certificate.save(update_fields=['status', 'updated_at'])
    audit.log_object(user, certificate, 'UPDATE', description='صدور گواهی پرداخت')
    return certificate


def register_certificate_payment(certificate, user=None, amount=None, date_value=None,
                                reference='', method=''):
    """ثبت پرداخت روی گواهی + ساخت «پرداخت قراردادی» در ماژول قراردادها."""
    if not certificate.contract_id:
        raise ValueError('برای ثبت پرداخت، گواهی باید به یک قرارداد متصل باشد.')
    from contracts.models import Payment

    amount_value = _f(amount) or _f(certificate.net_payable)
    remaining = _f(certificate.net_payable) - _f(certificate.paid_amount)
    if amount_value <= 0:
        raise ValueError('مبلغ پرداخت باید بزرگ‌تر از صفر باشد.')
    if amount_value > remaining + 0.001:
        raise ValueError('مبلغ پرداخت از ماندهٔ گواهی بیشتر است.')

    payment = Payment.objects.create(
        company=certificate.company,
        contract=certificate.contract,
        statement=certificate.statement,
        date=date_value or date.today(),
        amount=amount_value,
        reference=reference or certificate.number,
        method=method or '',
        note=f'پرداخت گواهی {certificate.number}',
    )
    certificate.contract_payment = payment
    certificate.paid_amount = round(_f(certificate.paid_amount) + amount_value, 2)
    certificate.status = (
        PaymentCertificate.Status.PAID
        if certificate.paid_amount + 0.001 >= _f(certificate.net_payable)
        else PaymentCertificate.Status.ISSUED
    )
    certificate.save(update_fields=['contract_payment', 'paid_amount', 'status', 'updated_at'])
    audit.log_object(user, certificate, 'UPDATE', description='ثبت پرداخت گواهی')
    return payment


@transaction.atomic
def post_allocation(allocation, user=None):
    """تبدیل تخصیص هزینهٔ منبع (حقوق/تجهیزات/مواد) به «تراکنش هزینه» پروژه (idempotent)."""
    from projects.cost_models import CostTransaction, CostTransactionLine
    from projects.jalali_utils import jalali_key

    if allocation.cost_transaction_id:
        return allocation.cost_transaction

    month_key = jalali_key(allocation.date) or str(allocation.date)[:7]
    number = f'ALLOC-{month_key}'
    user_obj = _user_or_none(user)

    tx = CostTransaction.objects.filter(project_id=allocation.project_id, number=number).first()
    if tx is None:
        tx = CostTransaction.objects.create(
            company=allocation.company,
            project=allocation.project,
            number=number,
            date=allocation.date,
            cost_source=allocation.cost_source,
            currency_code='IRR',
            description=f'تخصیص هزینهٔ منابع ماه {month_key}',
            payroll_reference=number if allocation.kind == CostAllocation.Kind.LABOR else '',
            document_reference=number,
            created_by=user_obj,
            updated_by=user_obj,
        )

    amount = _f(allocation.amount) or round(_f(allocation.quantity) * _f(allocation.rate), 2)
    CostTransactionLine.objects.create(
        company=allocation.company,
        transaction=tx,
        wbs=allocation.wbs,
        resource=allocation.resource,
        description=allocation.title,
        quantity=allocation.quantity or 0,
        unit=allocation.unit or '',
        unit_cost=allocation.rate or 0,
        amount=amount,
        net_amount=amount,
        created_by=user_obj,
        updated_by=user_obj,
    )
    allocation.cost_transaction = tx
    allocation.save(update_fields=['cost_transaction', 'updated_at'])

    if allocation.activity_id:
        activity = allocation.activity
        activity.actual_cost = round(_f(activity.actual_cost) + amount, 2)
        activity.save(update_fields=['actual_cost'])

    audit.log_object(user, allocation, 'UPDATE', description='ثبت هزینهٔ تخصیص‌یافته')
    return tx


