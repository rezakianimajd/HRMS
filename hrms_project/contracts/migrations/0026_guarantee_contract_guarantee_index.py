# Generated for HRMS: link a guarantee to a contract guarantee item

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contracts', '0025_alter_contractdocument_file'),
    ]

    operations = [
        migrations.AddField(
            model_name='guarantee',
            name='contract_guarantee_index',
            field=models.PositiveIntegerField(
                blank=True,
                help_text='اندیس ضمانت انتخاب‌شده در فهرست guarantee_items قرارداد',
                null=True,
                verbose_name='ردیف ضمانت قرارداد',
            ),
        ),
    ]
