from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('contracts', '0008_statement_financial_fields'),
        ('settings_app', '0011_currency_exchange_rate'),
    ]

    operations = [
        migrations.AddField(
            model_name='contract',
            name='currency',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='external_contracts', to='settings_app.currency', verbose_name='واحد ارز'),
        ),
        migrations.AddField(
            model_name='statement',
            name='currency',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='statements', to='settings_app.currency', verbose_name='واحد ارز'),
        ),
        migrations.AddField(
            model_name='statement',
            name='additions',
            field=models.JSONField(blank=True, default=list, verbose_name='اضافات'),
        ),
        migrations.AddField(
            model_name='statement',
            name='additions_total',
            field=models.DecimalField(decimal_places=0, default=0, max_digits=18, verbose_name='جمع اضافات (ریال)'),
        ),
    ]
