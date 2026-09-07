from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('settings_app', '0005_balecontact'),
    ]

    operations = [
        migrations.AddField(
            model_name='balecontact',
            name='tag',
            field=models.CharField(blank=True, help_text='برچسب (مثلاً مشتری، هیئت‌مدیره، قرارداد)', max_length=100, null=True, verbose_name='برچسب'),
        ),
        migrations.AddField(
            model_name='balecontact',
            name='country_code',
            field=models.CharField(blank=True, default='+98', max_length=10, null=True, verbose_name='کد کشور'),
        ),
    ]