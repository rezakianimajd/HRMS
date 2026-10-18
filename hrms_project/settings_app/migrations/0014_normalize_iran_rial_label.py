from django.db import migrations, models


def normalize_irr_label(apps, schema_editor):
    Currency = apps.get_model('settings_app', 'Currency')
    Currency.objects.filter(code='IRR').update(name='ریال', symbol='ریال')
    Currency.objects.filter(name='ریال ایران').update(name='ریال')


class Migration(migrations.Migration):

    dependencies = [
        ('settings_app', '0013_employees_dependents_subfolder'),
    ]

    operations = [
        migrations.RunPython(normalize_irr_label, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='currency',
            name='exchange_rate',
            field=models.DecimalField(
                decimal_places=6,
                default=1,
                help_text='مقدار ریال به ازای هر واحد این ارز (ریال = ۱)',
                max_digits=18,
                verbose_name='نرخ تبدیل به ریال',
            ),
        ),
    ]
