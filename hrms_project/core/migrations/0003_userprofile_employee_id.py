from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_rolepermission_remove_company_created_on_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='employee_id',
            field=models.PositiveIntegerField(
                blank=True,
                help_text='کاربر به کدام پرسنل متصل است؟ (برای اعلان‌های هدفمند)',
                null=True,
                verbose_name='شناسه پرسنل مرتبط',
            ),
        ),
    ]