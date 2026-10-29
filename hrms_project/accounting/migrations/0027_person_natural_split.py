"""خرید — تفکیک نام/نام خانوادگی حقیقی، مشمول‌بودن و نوع کالا/خدمات.

- ``first_name`` / ``last_name``: برای فروشندهٔ حقیقی نام و نام خانوادگی جدا ذخیره می‌شود.
- ``is_included``: در این نسخه همهٔ ردیف‌ها «مشمول» هستند (همیشه True).
- ``goods_service_type``: «سایر» برای همهٔ ردیف‌ها.
- ``economic_code``: منسوخ شد (حفظ دادهٔ قبلی، بدون استفاده در اعتبارسنجی/خروجی).

کاملاً بازگشت‌پذیر؛ داده‌های قبلی حفظ می‌شوند و نام حقیقی‌ها یک‌بار تفکیک می‌شود.
"""
from django.db import migrations, models


def split_natural_names(apps, schema_editor):
    """تفکیک «نام و نام خانوادگی» ردیف‌های حقیقی قبلی (آخرین فاصله = مرز)."""
    SeasonalTransaction = apps.get_model('accounting', 'SeasonalTransaction')
    for row in SeasonalTransaction.objects.filter(person_type='natural'):
        if row.first_name or row.last_name:
            continue
        parts = (row.name or '').strip().split()
        if not parts:
            continue
        row.first_name = ' '.join(parts[:-1])[:150]
        row.last_name = parts[-1][:150]
        row.save(update_fields=['first_name', 'last_name'])


def noop_reverse(apps, schema_editor):
    """بازگردانی داده لازم نیست؛ فیلدها در reverse حذف می‌شوند."""
    return None


class Migration(migrations.Migration):

    dependencies = [
        ('accounting', '0026_purchase_scope_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='seasonaltransaction',
            name='first_name',
            field=models.CharField(blank=True, max_length=150, verbose_name='نام (شخص حقیقی)'),
        ),
        migrations.AddField(
            model_name='seasonaltransaction',
            name='last_name',
            field=models.CharField(blank=True, max_length=150, verbose_name='نام خانوادگی (شخص حقیقی)'),
        ),
        migrations.AddField(
            model_name='seasonaltransaction',
            name='is_included',
            field=models.BooleanField(
                default=True,
                help_text='در این نسخه همهٔ ردیف‌ها مشمول هستند و این مقدار همیشه True است.',
                verbose_name='مشمول معاملات فصلی',
            ),
        ),
        migrations.AddField(
            model_name='seasonaltransaction',
            name='goods_service_type',
            field=models.CharField(
                choices=[('other', 'سایر')], default='other', max_length=20,
                verbose_name='نوع کالا یا خدمات',
            ),
        ),
        migrations.AlterField(
            model_name='seasonaltransaction',
            name='economic_code',
            field=models.CharField(
                blank=True,
                help_text='دیگر استفاده نمی‌شود؛ فقط برای حفظ داده‌های قبلی نگه داشته شده است.',
                max_length=20, verbose_name='شماره اقتصادی (منسوخ)',
            ),
        ),
        migrations.RunPython(split_natural_names, noop_reverse),
    ]
