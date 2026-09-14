from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0016_add_card_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='employee',
            name='is_record_complete',
            field=models.BooleanField(default=False, help_text='در صورت فعال بودن، به‌جای درصد تکمیل، عنوان «پرونده کامل» نمایش داده می‌شود', verbose_name='پرونده کامل'),
        ),
    ]