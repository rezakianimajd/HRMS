from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contracts', '0003_guarantee_release'),
    ]

    operations = [
        migrations.AddField(
            model_name='guarantee',
            name='instrument_type',
            field=models.CharField(choices=[('check', 'چک'), ('promissory', 'سفته'), ('bank_guarantee', 'ضمانت‌نامه بانکی'), ('check_and_guarantee', 'چک + ضمانت‌نامه'), ('promissory_and_guarantee', 'سفته + ضمانت‌نامه')], default='check', max_length=40, verbose_name='نوع ابزار تضمین'),
        ),
        migrations.AddField(
            model_name='guarantee',
            name='check_number',
            field=models.CharField(blank=True, max_length=100, verbose_name='شماره چک'),
        ),
        migrations.AddField(
            model_name='guarantee',
            name='check_bank',
            field=models.CharField(blank=True, max_length=100, verbose_name='بانک چک'),
        ),
        migrations.AddField(
            model_name='guarantee',
            name='check_due_date',
            field=models.DateField(blank=True, null=True, verbose_name='تاریخ سررسید چک'),
        ),
        migrations.AddField(
            model_name='guarantee',
            name='promissory_number',
            field=models.CharField(blank=True, max_length=100, verbose_name='شماره سفته'),
        ),
        migrations.AddField(
            model_name='guarantee',
            name='promissory_due_date',
            field=models.DateField(blank=True, null=True, verbose_name='تاریخ سررسید سفته'),
        ),
        migrations.AddField(
            model_name='guarantee',
            name='guarantee_number',
            field=models.CharField(blank=True, max_length=100, verbose_name='شماره ضمانت‌نامه'),
        ),
        migrations.AddField(
            model_name='guarantee',
            name='guarantee_expiry_date',
            field=models.DateField(blank=True, null=True, verbose_name='تاریخ انقضای ضمانت‌نامه'),
        ),
        migrations.AddField(
            model_name='guarantee',
            name='last_action',
            field=models.CharField(blank=True, choices=[('returned', 'استرداد'), ('executed', 'اجرا / ضبط'), ('canceled', 'ابطال'), ('extended', 'تمدید')], max_length=20, verbose_name='آخرین اقدام'),
        ),
        migrations.AddField(
            model_name='guarantee',
            name='last_action_date',
            field=models.DateField(blank=True, null=True, verbose_name='تاریخ آخرین اقدام'),
        ),
    ]