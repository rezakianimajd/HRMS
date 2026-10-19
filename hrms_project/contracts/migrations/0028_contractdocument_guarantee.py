# Generated for HRMS: attach PDF documents to individual guarantees.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contracts', '0027_contractdocument_addendum'),
    ]

    operations = [
        migrations.AddField(
            model_name='contractdocument',
            name='guarantee',
            field=models.ForeignKey(
                blank=True,
                help_text='در صورت پیوست بودن سند به یک تضمین، این فیلد پر می‌شود.',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='documents',
                to='contracts.guarantee',
                verbose_name='تضمین',
            ),
        ),
    ]
