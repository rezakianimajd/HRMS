from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contracts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='contract',
            name='category',
            field=models.CharField(blank=True, max_length=50, verbose_name='طبقه‌بندی قرارداد'),
        ),
        migrations.AddField(
            model_name='contract',
            name='project_name',
            field=models.CharField(blank=True, max_length=300, verbose_name='نام پروژه / طرح'),
        ),
        migrations.AddField(
            model_name='contract',
            name='project_location',
            field=models.CharField(blank=True, max_length=300, verbose_name='محل اجرا / تحویل'),
        ),
        migrations.AddField(
            model_name='contract',
            name='tender_number',
            field=models.CharField(blank=True, max_length=100, verbose_name='شماره مناقصه / استعلام'),
        ),
        migrations.AddField(
            model_name='contract',
            name='advance_payment',
            field=models.DecimalField(blank=True, decimal_places=0, max_digits=18, null=True, verbose_name='پیش‌پرداخت (ریال)'),
        ),
        migrations.AddField(
            model_name='contract',
            name='retention_percent',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True, verbose_name='درصد حسن انجام کار'),
        ),
        migrations.AddField(
            model_name='contract',
            name='warranty_period',
            field=models.CharField(blank=True, max_length=100, verbose_name='دوره گارانتی / تضمین کیفیت'),
        ),
        migrations.AddField(
            model_name='contract',
            name='payment_terms',
            field=models.TextField(blank=True, verbose_name='شرایط و نحوه پرداخت'),
        ),
        migrations.AddField(
            model_name='contract',
            name='delivery_terms',
            field=models.TextField(blank=True, verbose_name='شرایط تحویل'),
        ),
        migrations.AddField(
            model_name='contract',
            name='penalty_terms',
            field=models.TextField(blank=True, verbose_name='شرایط وجه التزام / جریمه تأخیر'),
        ),
        migrations.AddField(
            model_name='contract',
            name='insurance_terms',
            field=models.TextField(blank=True, verbose_name='شرایط بیمه'),
        ),
    ]