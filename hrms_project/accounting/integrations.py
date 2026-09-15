"""Integration facade — how external modules publish financial events to accounting.

Each source module calls ``enqueue`` after persisting a business transaction.
This keeps source modules decoupled from the posting engine while still feeding
the central accounting queue (``SourceTransaction``) with an idempotent record.
"""
from accounting.models import SourceTransaction


def enqueue(*, company, source_module, source_type, source_id, payload=None):
    """Create an idempotent source-transaction entry (skip duplicates silently)."""
    if not company:
        return None
    obj, created = SourceTransaction.objects.get_or_create(
        company=company,
        source_module=source_module,
        source_id=str(source_id),
        defaults={
            'source_type': source_type,
            'payload': payload or {},
            'status': 'pending',
        },
    )
    return obj


def enqueue_pettycash_transaction(company, tx):
    """تنخواه -> صف ثبت حسابداری."""
    return enqueue(
        company=company,
        source_module='pettycash',
        source_type='transaction',
        source_id=str(tx.pk),
        payload={
            'entry_type': tx.entry_type,
            'amount': str(tx.amount),
            'title': tx.title,
            'category_code': tx.category.code if tx.category else None,
            'date': tx.date.isoformat() if tx.date else None,
        },
    )


def enqueue_contract_payment(company, payment):
    """پرداخت قرارداد -> صف ثبت حسابداری."""
    return enqueue(
        company=company,
        source_module='contracts',
        source_type='payment',
        source_id=str(payment.pk),
        payload={
            'amount': str(payment.amount),
            'date': payment.date.isoformat() if payment.date else None,
            'method': payment.method,
            'reference': payment.reference,
        },
    )


def enqueue_benefit_record(company, benefit):
    """مزایا (payroll) -> صف ثبت حسابداری."""
    return enqueue(
        company=company,
        source_module='payroll',
        source_type='benefit',
        source_id=str(benefit.pk),
        payload={
            'gross_amount': str(benefit.gross_amount),
            'reserved_tax': str(benefit.reserved_tax),
            'paid_amount': str(benefit.paid_amount),
            'benefit_type': benefit.benefit_type,
            'year': benefit.year,
            'month': benefit.month,
        },
    )