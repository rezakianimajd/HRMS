from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0015_contractversion_signature_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='employee',
            name='card_bank_name',
            field=models.CharField(blank=True, help_text='نام بانک صادرکنندهٔ بن‌کارت', max_length=100, null=True, verbose_name='بانک (بن‌کارت)'),
        ),
        migrations.AddField(
            model_name='employee',
            name='card_number',
            field=models.CharField(blank=True, help_text='۱۶ رقم — با خط تیره به‌صورت ۴ رقم ۴ رقم نمایش داده می‌شود', max_length=19, null=True, verbose_name='شماره بن‌کارت'),
        ),
        migrations.AddField(
            model_name='employee',
            name='card_expiry_date',
            field=models.DateField(blank=True, null=True, verbose_name='تاریخ انقضای بن‌کارت'),
        ),
    ]