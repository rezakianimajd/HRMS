# Generated for HRMS: attach PDF documents to individual contract addendums.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contracts', '0026_guarantee_contract_guarantee_index'),
    ]

    operations = [
        migrations.AddField(
            model_name='contractdocument',
            name='addendum',
            field=models.ForeignKey(
                blank=True,
                help_text='در صورت پیوست بودن سند به یک الحاقیه، این فیلد پر می‌شود.',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='documents',
                to='contracts.addendum',
                verbose_name='الحاقیه',
            ),
        ),
    ]
