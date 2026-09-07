from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('settings_app', '0003_company_fields_noconstraint'),
    ]

    operations = [
        migrations.AddField(
            model_name='companyprofile',
            name='notify_email_enabled',
            field=models.BooleanField(default=True, verbose_name='ارسال ایمیل فعال'),
        ),
        migrations.AddField(
            model_name='companyprofile',
            name='notify_bale_enabled',
            field=models.BooleanField(default=False, verbose_name='ارسال پیام بله فعال'),
        ),
        migrations.AddField(
            model_name='companyprofile',
            name='bale_token',
            field=models.CharField(blank=True, max_length=200, verbose_name='توکن ربات بله'),
        ),
        migrations.AddField(
            model_name='companyprofile',
            name='bale_chat_id',
            field=models.CharField(blank=True, max_length=100, verbose_name='شناسه گفتگوی بله (chat_id)'),
        ),
    ]