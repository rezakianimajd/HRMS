"""Phase 0 — ارز تراکنش هزینه: از رشتهٔ آزاد به ارجاع به `settings_app.Currency`.

مراحل:
  1) نام فیلد قدیمی `currency` به `currency_code` تغییر می‌کند (دادهٔ میراثی حفظ می‌شود).
  2) فیلد جدید `currency` به‌صورت FK اضافه می‌شود.
  3) دادهٔ موجود به ارز متناظر نگاشت می‌شود (ارز ناموجود برای همان شرکت ساخته می‌شود).
"""
from django.db import migrations, models
import django.db.models.deletion


def map_legacy_currency(apps, schema_editor):
    """نگاشت کد ارز رشته‌ای به رکورد Currency همان شرکت."""
    CostTransaction = apps.get_model('projects', 'CostTransaction')
    Currency = apps.get_model('settings_app', 'Currency')

    rows = (
        CostTransaction.objects
        .exclude(company_id__isnull=True)
        .values_list('company_id', 'currency_code')
        .distinct()
    )
    cache = {}
    for company_id, raw in rows:
        code = (raw or '').strip().upper() or 'IRR'
        key = (company_id, code)
        currency = cache.get(key)
        if currency is None:
            currency = Currency.objects.filter(company_id=company_id, code__iexact=code).first()
            if currency is None:
                currency = Currency.objects.create(
                    company_id=company_id, code=code, name=code, symbol=code,
                )
            cache[key] = currency
        CostTransaction.objects.filter(
            company_id=company_id, currency_code=raw,
        ).update(currency=currency)


def unmap_legacy_currency(apps, schema_editor):
    """برگشت: کد ارز از FK به فیلد رشته‌ای کپی می‌شود."""
    CostTransaction = apps.get_model('projects', 'CostTransaction')
    for row in CostTransaction.objects.exclude(currency__isnull=True).select_related('currency'):
        CostTransaction.objects.filter(pk=row.pk).update(currency_code=row.currency.code)


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0003_budgetline_committedcost_costtransaction_and_more'),
        ('settings_app', '0011_currency_exchange_rate'),
    ]

    operations = [
        migrations.RenameField(
            model_name='costtransaction',
            old_name='currency',
            new_name='currency_code',
        ),
        migrations.AlterField(
            model_name='costtransaction',
            name='currency_code',
            field=models.CharField(
                blank=True, default='IRR', max_length=10,
                verbose_name='کد ارز (میراثی)',
            ),
        ),
        migrations.AddField(
            model_name='costtransaction',
            name='currency',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='cost_transactions',
                to='settings_app.currency',
                verbose_name='ارز',
            ),
        ),
        migrations.RunPython(map_legacy_currency, unmap_legacy_currency),
    ]
