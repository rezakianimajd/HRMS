"""Configurable payroll bank-payment file generation."""
from __future__ import annotations

import csv
import io
from decimal import Decimal

from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone

from payroll.models import PayrollPaymentBatch, PayrollPaymentBatchLine, PayrollPeriod
from payroll.services import PayrollError, log_change

DEFAULT_FIELDS = ['beneficiary_name', 'national_id', 'bank_name', 'account_number', 'iban', 'amount']

FIELD_LABELS = {
    'beneficiary_name': 'نام ذی‌نفع',
    'national_id': 'کد ملی',
    'bank_name': 'بانک',
    'account_number': 'شماره حساب',
    'iban': 'شبا',
    'amount': 'مبلغ',
    'employee_code': 'کد پرسنلی',
}


def _value(row, field):
    if field == 'amount':
        return str(row.amount)
    if field == 'employee_code':
        return row.result.snapshot.get('employee_code', '') if row.result_id else ''
    return getattr(row, field, '') or ''


def generate_batch(period, bank_format, user=None, request=None):
    if period.status not in (
        PayrollPeriod.Status.APPROVED, PayrollPeriod.Status.PAYMENT_PENDING, PayrollPeriod.Status.PAID,
    ):
        raise PayrollError('برای تولید فایل پرداخت، دوره باید تأیید شده باشد.')
    results = period.results.filter(net_amount__gt=0).select_related('employee')
    if not results.exists():
        raise PayrollError('نتیجهٔ حقوقی برای پرداخت وجود ندارد.')
    with transaction.atomic():
        batch = PayrollPaymentBatch.objects.create(
            company=period.company, period=period, format=bank_format,
            code=f'PAY-{period.pk}-{timezone.now().strftime("%Y%m%d%H%M%S")}',
            status=PayrollPaymentBatch.Status.DRAFT,
            generated_by=user if getattr(user, 'is_authenticated', False) else None,
        )
        lines = []
        for result in results:
            bank = result.bank_snapshot or {}
            line = PayrollPaymentBatchLine.objects.create(
                company=period.company, batch=batch, result=result,
                beneficiary_name=result.snapshot.get('full_name') or result.employee.full_name,
                national_id=result.snapshot.get('national_id', ''),
                bank_name=bank.get('bank_name', ''),
                account_number=bank.get('account_number', ''),
                iban=bank.get('sheba_number', ''),
                amount=result.net_amount,
                status=PayrollPaymentBatchLine.Status.PENDING,
            )
            if not line.account_number and not line.iban:
                line.status = PayrollPaymentBatchLine.Status.ERROR
                line.error = 'شماره حساب/شبا ثبت نشده است.'
                line.save(update_fields=['status', 'error'])
            lines.append(line)
        fields = bank_format.line_fields or DEFAULT_FIELDS
        output = io.StringIO()
        writer = csv.writer(output, delimiter=bank_format.delimiter or ',')
        if bank_format.header_fields:
            writer.writerow([FIELD_LABELS.get(key, key) for key in bank_format.header_fields])
        elif bank_format.format_type == bank_format.FormatType.CSV:
            writer.writerow([FIELD_LABELS.get(key, key) for key in fields])
        for line in lines:
            writer.writerow([_value(line, key) for key in fields])
        filename = f'{period.company.code or "company"}-payroll-{period.year}-{period.month or 0}.csv'
        batch.file.save(filename, ContentFile(output.getvalue().encode(bank_format.encoding or 'utf-8-sig')), save=False)
        batch.line_count = len(lines)
        batch.total_amount = sum((line.amount for line in lines), Decimal('0'))
        batch.status = PayrollPaymentBatch.Status.GENERATED
        batch.generated_at = timezone.now()
        batch.save()
        for line in lines:
            if line.status == PayrollPaymentBatchLine.Status.PENDING:
                line.status = PayrollPaymentBatchLine.Status.GENERATED
        PayrollPaymentBatchLine.objects.bulk_update(
            [line for line in lines if line.status == PayrollPaymentBatchLine.Status.GENERATED],
            ['status'],
        )
        log_change(period.company, user, 'generate_bank_file', 'PayrollPaymentBatch', batch.pk,
                   new={'lines': batch.line_count, 'total': str(batch.total_amount)},
                   period=period, request=request)
    return batch


def mark_batch_paid(batch, user=None, request=None):
    if batch.status not in (PayrollPaymentBatch.Status.GENERATED, PayrollPaymentBatch.Status.SUBMITTED):
        raise PayrollError('وضعیت دستهٔ پرداخت برای ثبت پرداخت مجاز نیست.')
    with transaction.atomic():
        batch.lines.update(status=PayrollPaymentBatchLine.Status.PAID)
        batch.status = PayrollPaymentBatch.Status.PAID
        batch.save(update_fields=['status', 'updated_at'])
        log_change(batch.company, user, 'bank_paid', 'PayrollPaymentBatch', batch.pk, period=batch.period,
                   request=request)
    return batch
