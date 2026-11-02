from django.db import migrations


def backfill_allocations(apps, schema_editor):
    """پیوندهای تک‌مقداری قدیمی پرداخت را به تخصیص تبدیل می‌کند.

    پیش از این مدل، هر پرداخت حداکثر به یک صورت‌وضعیت/فاکتور وصل بود و مبلغ
    پرداخت‌شدهٔ اسناد جایی ذخیره نمی‌شد. با یک ردیف تخصیص به‌اندازهٔ مبلغ
    پرداخت، «مانده»ی اسنادِ موجود بدون تغییر در داده‌های قبلی درست محاسبه می‌شود.
    """
    Payment = apps.get_model('contracts', 'Payment')
    PaymentAllocation = apps.get_model('contracts', 'PaymentAllocation')

    pending = []
    queryset = Payment.objects.exclude(payment_type='advance')
    for payment in queryset.iterator():
        if not (payment.statement_id or payment.invoice_id):
            continue
        pending.append(PaymentAllocation(
            company_id=payment.company_id,
            payment_id=payment.pk,
            statement_id=payment.statement_id,
            invoice_id=payment.invoice_id,
            amount=payment.amount or 0,
        ))
    if pending:
        PaymentAllocation.objects.bulk_create(pending, ignore_conflicts=True)


def drop_allocations(apps, schema_editor):
    apps.get_model('contracts', 'PaymentAllocation').objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('contracts', '0040_payment_allocations'),
    ]

    operations = [
        migrations.RunPython(backfill_allocations, drop_allocations),
    ]
