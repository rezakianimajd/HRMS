"""Payroll dashboards and reconciliation reports (aggregation only)."""
from __future__ import annotations

from decimal import Decimal

from django.db.models import Count, Sum

from payroll.models import PayrollCost, PayrollEmployeeResult, PayrollPaymentBatch, PayrollPeriod


def _money(value):
    return str(value or Decimal('0'))


def dashboard_payload(company):
    periods = PayrollPeriod.objects.filter(company=company).order_by('-year', '-month', '-id')
    current = periods.first()
    previous = periods.exclude(pk=current.pk).first() if current else None
    status_counts = {
        row['status']: row['count']
        for row in periods.values('status').annotate(count=Count('id'))
    }
    trend = [
        {
            'id': row.pk, 'label': row.label, 'status': row.status,
            'gross': _money(row.gross_amount), 'net': _money(row.net_amount),
            'employer_cost': _money(row.employer_cost), 'total_cost': _money(row.total_cost),
            'employees': row.employee_count,
        }
        for row in periods[:6]
    ]
    warnings = []
    if current:
        warnings = list(current.results.filter(
            status=PayrollEmployeeResult.Status.WARNING,
        ).values('id', 'employee__first_name', 'employee__last_name', 'warnings')[:20])
    return {
        'current_period': {
            'id': current.pk, 'label': current.label, 'status': current.status,
            'status_display': current.get_status_display(), 'year': current.year,
            'month': current.month, 'start_date': current.start_date,
            'end_date': current.end_date, 'employee_count': current.employee_count,
            'calculated_count': current.calculated_count, 'warning_count': current.warning_count,
            'error_count': current.error_count, 'gross': _money(current.gross_amount),
            'insurance_employee': _money(current.insurance_employee),
            'insurance_employer': _money(current.insurance_employer),
            'tax': _money(current.tax_amount), 'other_deductions': _money(current.other_deductions),
            'net': _money(current.net_amount), 'employer_cost': _money(current.employer_cost),
            'total_cost': _money(current.total_cost), 'paid': _money(current.paid_amount),
            'has_accounting': bool(current.accounting_document_id),
            'has_payment_request': bool(current.payment_request_id),
            'accounting_document_id': current.accounting_document_id,
            'payment_request_id': current.payment_request_id,
        } if current else None,
        'previous_period': {
            'id': previous.pk, 'label': previous.label,
            'net': _money(previous.net_amount), 'gross': _money(previous.gross_amount),
        } if previous else None,
        'status_counts': status_counts,
        'trend': trend,
        'warnings': warnings,
        'payroll_count': periods.count(),
        'pending_periods': periods.filter(status__in=(
            PayrollPeriod.Status.OPEN, PayrollPeriod.Status.CALCULATED,
            PayrollPeriod.Status.UNDER_REVIEW, PayrollPeriod.Status.APPROVED,
            PayrollPeriod.Status.PAYMENT_PENDING,
        )).count(),
    }


def reconciliation_payload(period):
    batches = list(period.payment_batches.filter(
        status__in=(PayrollPaymentBatch.Status.GENERATED, PayrollPaymentBatch.Status.SUBMITTED,
                    PayrollPaymentBatch.Status.PAID),
    ))
    batch_total = sum((row.total_amount or Decimal('0') for row in batches), Decimal('0'))
    accounting_total = Decimal('0')
    if period.accounting_document_id:
        accounting_total = period.accounting_document.lines.aggregate(
            total=Sum('debit'),
        )['total'] or Decimal('0')
    requested = period.payment_request.approved_amount if period.payment_request_id else Decimal('0')
    return {
        'period': {'id': period.pk, 'label': period.label, 'status': period.status},
        'payroll': {
            'gross': _money(period.gross_amount), 'net': _money(period.net_amount),
            'insurance_employee': _money(period.insurance_employee),
            'insurance_employer': _money(period.insurance_employer),
            'tax': _money(period.tax_amount), 'other_deductions': _money(period.other_deductions),
        },
        'accounting': {
            'document_id': period.accounting_document_id,
            'debit_total': _money(accounting_total),
            'difference': _money(accounting_total - period.gross_amount - period.insurance_employer),
        },
        'treasury': {
            'payment_request_id': period.payment_request_id,
            'requested': _money(requested),
            'paid': _money(period.paid_amount),
            'difference': _money(requested - period.net_amount),
        },
        'bank': {
            'batch_count': len(batches), 'total': _money(batch_total),
            'difference': _money(batch_total - period.net_amount),
        },
        'unpaid': _money(period.net_amount - period.paid_amount),
    }


def cost_summary(period):
    rows = PayrollCost.objects.filter(period=period).values(
        'project__id', 'project__code', 'project__name',
        'cost_center__id', 'cost_center__code', 'cost_center__name',
    ).annotate(amount=Sum('amount'))
    return [
        {
            'project_id': row['project__id'], 'project_code': row['project__code'],
            'project_name': row['project__name'],
            'cost_center_id': row['cost_center__id'],
            'cost_center_code': row['cost_center__code'],
            'cost_center_name': row['cost_center__name'],
            'amount': _money(row['amount']),
        }
        for row in rows.order_by('-amount')
    ]


def reports_summary(company):
    rows = PayrollPeriod.objects.filter(company=company).order_by('-year', '-month', '-id')[:12]
    return {
        'periods': [
            {
                'id': row.pk, 'label': row.label, 'status': row.status,
                'employee_count': row.employee_count, 'gross': _money(row.gross_amount),
                'net': _money(row.net_amount), 'insurance_employee': _money(row.insurance_employee),
                'insurance_employer': _money(row.insurance_employer), 'tax': _money(row.tax_amount),
                'employer_cost': _money(row.employer_cost), 'total_cost': _money(row.total_cost),
            }
            for row in rows
        ],
        'by_department': [
            {
                'department': row['snapshot__department'] or 'بدون واحد',
                'amount': _money(row['amount']),
            }
            for row in PayrollEmployeeResult.objects.filter(company=company).values(
                'snapshot__department',
            ).annotate(amount=Sum('net_amount')).order_by('-amount')[:20]
        ],
    }
