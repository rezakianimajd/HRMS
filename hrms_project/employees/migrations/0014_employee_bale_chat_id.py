from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0013_contractversion_benefits_text'),
    ]

    operations = [
        migrations.AddField(
            model_name='employee',
            name='bale_chat_id',
            field=models.CharField(blank=True, help_text='برای ارسال پیام خصوصی از طریق ربات بله', max_length=100, null=True, verbose_name='شناسه گفتگوی بله (chat_id)'),
        ),
    ]