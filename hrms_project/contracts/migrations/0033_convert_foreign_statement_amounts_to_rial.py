from decimal import Decimal, ROUND_HALF_UP

from django.db import migrations


MONEY_FIELDS = (
    'amount',
    'cumulative_previous_amount',
    'work_done',
    'value_added_tax',
    'other_additions',
    'additions_total',
    'deductions_total',
    'net_amount',
)


def _to_rial(value, rate):
    try:
        amount = Decimal(str(value or 0))
    except Exception:  # noqa: BLE001
        amount = Decimal('0')
    return (amount * rate).quantize(Decimal('1'), rounding=ROUND_HALF_UP)


def convert_foreign_statement_amounts(apps, schema_editor):
    """تبدیل مبالغ ارزیِ ذخیره‌شدهٔ قدیمی به ریال.

    پیش از این اصلاح، مبالغ قراردادهای ارزی بدون تبدیل در فیلدهای ریالی
    ذخیره می‌شدند. فقط رکوردهایی تبدیل می‌شوند که مبلغشان در مقایسه با مبلغ
    قرارداد، در محدودهٔ یک مبلغ ارزی است؛ رکوردهایی که از قبل ریالی هستند
    (مبلغ بسیار بزرگ‌تر از مبلغ قرارداد) دست‌نخورده می‌مانند.
    """
    Statement = apps.get_model('contracts', 'Statement')
    rows = (
        Statement.objects
        .select_related('contract', 'currency')
        .exclude(currency__isnull=True)
        .exclude(exchange_rate__isnull=True)
    )
    for statement in rows.iterator():
        currency_code = str(getattr(statement.currency, 'code', '') or '').upper()
        rate = statement.exchange_rate or Decimal('0')
        amount = statement.amount or Decimal('0')
        if currency_code == 'IRR' or rate <= 1 or amount <= 0:
            continue
        contract_amount = getattr(statement.contract, 'amount', None) or Decimal('0')
        # مبلغی که از ده برابر مبلغ قرارداد بزرگ‌تر است، تقریباً قطعاً ریالی است.
        if contract_amount > 0 and amount > contract_amount * 10:
            continue

        statement.amount = _to_rial(statement.amount, rate)
        statement.cumulative_previous_amount = _to_rial(statement.cumulative_previous_amount, rate)
        statement.work_done = _to_rial(statement.work_done, rate)
        statement.value_added_tax = _to_rial(statement.value_added_tax, rate)
        statement.other_additions = _to_rial(statement.other_additions, rate)
        statement.additions_total = _to_rial(statement.additions_total, rate)
        statement.deductions_total = _to_rial(statement.deductions_total, rate)
        statement.net_amount = _to_rial(statement.net_amount, rate)

        for field in ('additions', 'deductions'):
            items = []
            for item in (getattr(statement, field) or []):
                if isinstance(item, dict):
                    items.append({**item, 'amount': float(_to_rial(item.get('amount'), rate))})
                else:
                    items.append(item)
            setattr(statement, field, items)

        statement.save(update_fields=list(MONEY_FIELDS) + ['additions', 'deductions'])


class Migration(migrations.Migration):

    dependencies = [
        ('contracts', '0032_recalculate_statement_totals'),
    ]

    operations = [
        migrations.RunPython(convert_foreign_statement_amounts, migrations.RunPython.noop),
    ]
