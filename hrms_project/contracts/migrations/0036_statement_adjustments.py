from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contracts', '0035_normalize_statement_numbers'),
    ]

    operations = [
        migrations.AddField(
            model_name='statement',
            name='kind',
            field=models.CharField(
                choices=[('statement', 'صورت‌وضعیت'), ('increase', 'تعدیل افزایشی'), ('decrease', 'تعدیل کاهشی')],
                default='statement', help_text='صورت‌وضعیت عادی، تعدیل افزایشی یا تعدیل کاهشی',
                max_length=20, verbose_name='نوع سند',
            ),
        ),
        migrations.AddField(
            model_name='statement',
            name='adjustment_previous_amount',
            field=models.DecimalField(decimal_places=0, default=0, max_digits=18, verbose_name='تعدیل تجمعی دوره قبل (ریال)'),
        ),
        migrations.AddField(
            model_name='statement',
            name='adjustment_work_done',
            field=models.DecimalField(decimal_places=0, default=0, max_digits=18, verbose_name='تعدیل این دوره (ریال)'),
        ),
        migrations.AddField(
            model_name='statement',
            name='adjustment_amount',
            field=models.DecimalField(decimal_places=0, default=0, max_digits=18, verbose_name='تعدیل تجمعی (ریال)'),
        ),
        migrations.AddField(
            model_name='statement',
            name='adjustment_foreign_previous_amount',
            field=models.DecimalField(decimal_places=4, default=0, max_digits=18, verbose_name='تعدیل تجمعی ارزی دوره قبل'),
        ),
        migrations.AddField(
            model_name='statement',
            name='adjustment_foreign_work_done',
            field=models.DecimalField(decimal_places=4, default=0, max_digits=18, verbose_name='تعدیل ارزی این دوره'),
        ),
        migrations.AddField(
            model_name='statement',
            name='adjustment_foreign_amount',
            field=models.DecimalField(decimal_places=4, default=0, max_digits=18, verbose_name='تعدیل تجمعی ارزی'),
        ),
    ]
