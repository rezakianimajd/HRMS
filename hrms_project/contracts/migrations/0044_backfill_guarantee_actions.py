"""ثبت اولیهٔ تاریخچه برای تضامین موجود (بر اساس آخرین اقدام ثبت‌شده).

برای تضامینی که پیش از این قابلیت، تمدید/تقلیل/استرداد روی آن‌ها انجام شده،
یک ردیف تاریخچه با تاریخ آخرین اقدام ساخته می‌شود تا شمارش اقدامات از صفر
شروع نشود.
"""
from django.db import migrations


def backfill_actions(apps, schema_editor):
    Guarantee = apps.get_model('contracts', 'Guarantee')
    GuaranteeAction = apps.get_model('contracts', 'GuaranteeAction')

    valid = {'extended', 'reduced', 'returned', 'executed', 'canceled'}
    for guarantee in Guarantee.objects.exclude(last_action='').iterator():
        if guarantee.last_action not in valid:
            continue
        exists = GuaranteeAction.objects.filter(
            guarantee_id=guarantee.pk, action=guarantee.last_action,
        ).exists()
        if exists:
            continue
        GuaranteeAction.objects.create(
            company_id=guarantee.company_id,
            guarantee_id=guarantee.pk,
            action=guarantee.last_action,
            date=guarantee.last_action_date,
            new_amount=guarantee.amount,
            new_expiry_date=guarantee.expiry_date,
            new_number=guarantee.number or '',
            note='ثبت اولیه از آخرین اقدام موجود در سیستم',
        )


def noop_reverse(apps, schema_editor):
    """بازگشت لازم نیست."""


class Migration(migrations.Migration):

    dependencies = [
        ('contracts', '0043_alter_guarantee_instrument_type_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_actions, noop_reverse),
    ]
