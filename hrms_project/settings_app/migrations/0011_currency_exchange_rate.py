from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('settings_app', '0010_additions_deductions_currencies'),
    ]

    operations = [
        migrations.AddField(
            model_name='currency',
            name='exchange_rate',
            field=models.DecimalField(decimal_places=6, default=1, help_text='مقدار ریال به ازای هر واحد این ارز (ریال ایران = ۱)', max_digits=18, verbose_name='نرخ تبدیل به ریال'),
        ),
    ]