"""خرید — نوع طرف «تجمیعی» و پیش‌فرض کشور «ایران».

- ``person_type``: گزینهٔ ``aggregate`` («تجمیعی») اضافه شد؛ در این نوع فقط مبلغ
  الزامی است و سایر فیلدها اختیاری‌اند.
- ``country``: پیش‌فرض «ایران»؛ برای شخص خارجی قابل تغییر است.

کاملاً بازگشت‌پذیر؛ داده‌های قبلی حفظ می‌شوند.
"""
from django.db import migrations, models


def fill_default_country(apps, schema_editor):
    """پرکردن کشور خالی ردیف‌های غیرخارجی با «ایران»."""
    SeasonalTransaction = apps.get_model('accounting', 'SeasonalTransaction')
    SeasonalTransaction.objects.exclude(person_type='foreign').filter(country='').update(country='ایران')


def noop_reverse(apps, schema_editor):
    return None


class Migration(migrations.Migration):

    dependencies = [
        ('accounting', '0027_person_natural_split'),
    ]

    operations = [
        migrations.AlterField(
            model_name='seasonaltransaction',
            name='person_type',
            field=models.CharField(
                blank=True,
                choices=[
                    ('legal', 'شخص حقوقی'),
                    ('natural', 'شخص حقیقی'),
                    ('foreign', 'شخص خارجی'),
                    ('aggregate', 'تجمیعی'),
                ],
                default='', max_length=10, verbose_name='نوع شخص',
            ),
        ),
        migrations.AlterField(
            model_name='seasonaltransaction',
            name='country',
            field=models.CharField(
                blank=True, default='ایران',
                help_text='پیش‌فرض «ایران»؛ برای شخص خارجی قابل تغییر است.',
                max_length=60, verbose_name='کشور',
            ),
        ),
        migrations.RunPython(fill_default_country, noop_reverse),
    ]
