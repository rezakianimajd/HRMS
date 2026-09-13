# Generated manually — statement financial breakdown fields.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contracts', '0007_supplierevaluation_contracttypemaster'),
    ]

    operations = [
        migrations.AddField(
            model_name='statement',
            name='cumulative_previous_amount',
            field=models.DecimalField(decimal_places=0, default=0, max_digits=18, verbose_name='مبلغ تجمعی صورت‌وضعیت قبلی (ریال)'),
        ),
        migrations.AddField(
            model_name='statement',
            name='deductions',
            field=models.JSONField(blank=True, default=list, verbose_name='کسورات'),
        ),
        migrations.AddField(
            model_name='statement',
            name='deductions_total',
            field=models.DecimalField(decimal_places=0, default=0, max_digits=18, verbose_name='جمع کسورات (ریال)'),
        ),
        migrations.AddField(
            model_name='statement',
            name='net_amount',
            field=models.DecimalField(decimal_places=0, default=0, max_digits=18, verbose_name='مبلغ قابل پرداخت (ریال)'),
        ),
        migrations.AddField(
            model_name='statement',
            name='other_additions',
            field=models.DecimalField(decimal_places=0, default=0, max_digits=18, verbose_name='سایر اضافات (ریال)'),
        ),
        migrations.AddField(
            model_name='statement',
            name='value_added_tax',
            field=models.DecimalField(decimal_places=0, default=0, max_digits=18, verbose_name='اضافات - ارزش افزوده (ریال)'),
        ),
        migrations.AddField(
            model_name='statement',
            name='work_done',
            field=models.DecimalField(decimal_places=0, default=0, max_digits=18, verbose_name='کارکرد دوره (ریال)'),
        ),
        migrations.AlterField(
            model_name='statement',
            name='amount',
            field=models.DecimalField(decimal_places=0, default=0, max_digits=18, verbose_name='مبلغ تجمعی این صورت‌وضعیت (ریال)'),
        ),
    ]