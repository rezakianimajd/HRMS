"""بازمحاسبهٔ صورت‌وضعیت‌های موجود پس از اصلاح منطق مبلغ تجمعی دوره قبل."""
from decimal import Decimal, ROUND_HALF_UP

from django.db import migrations
from django.utils import timezone


def _decimal(value):
    try:
        return Decimal(str(value or 0))
    except Exception:  # noqa: BLE001
        return Decimal('0')


def _normalize_items(items, work):
    result = []
    for item in items if isinstance(items, (list, tuple)) else []:
        if not isinstance(item, dict):
            continue
        percent = _decimal(item.get('percent'))
        amount = _decimal(item.get('amount'))
        if percent > 0 and item.get('mode') != 'amount':
            amount = (work * percent / 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP)
        result.append({**item, 'percent': float(percent), 'amount': float(amount)})
    return result


def recalculate_existing_statements(apps, schema_editor):
    Statement = apps.get_model('contracts', 'Statement')
    contract_ids = list(
        Statement.objects.order_by()
        .values_list('contract_id', flat=True)
        .distinct()
    )
    now = timezone.now()
    for contract_id in contract_ids:
        rows = list(Statement.objects.filter(contract_id=contract_id).order_by('pk'))
        prior_amount = Decimal('0')
        prior_work = Decimal('0')
        for row in rows:
            amount = _decimal(row.amount)
            previous = max(prior_amount, prior_work)
            work = max(Decimal('0'), amount - previous)
            additions = _normalize_items(row.additions, work)
            deductions = _normalize_items(row.deductions, work)
            additions_total = sum(
                (_decimal(item.get('amount')) for item in additions),
                Decimal('0'),
            ) + _decimal(row.value_added_tax) + _decimal(row.other_additions)
            deductions_total = sum(
                (_decimal(item.get('amount')) for item in deductions),
                Decimal('0'),
            )
            Statement.objects.filter(pk=row.pk).update(
                cumulative_previous_amount=previous,
                work_done=work,
                additions=additions,
                deductions=deductions,
                additions_total=additions_total,
                deductions_total=deductions_total,
                net_amount=work + additions_total - deductions_total,
                updated_at=now,
            )
            prior_amount = amount
            prior_work += work


class Migration(migrations.Migration):
    dependencies = [
        ('contracts', '0031_contractaccountmapping'),
    ]

    operations = [
        migrations.RunPython(recalculate_existing_statements, migrations.RunPython.noop),
    ]
