from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contracts', '0002_contract_details'),
    ]

    operations = [
        migrations.AddField(
            model_name='guarantee',
            name='release_date',
            field=models.DateField(blank=True, null=True, verbose_name='تاریخ آزادسازی'),
        ),
        migrations.AddField(
            model_name='guarantee',
            name='note',
            field=models.TextField(blank=True, verbose_name='یادداشت'),
        ),
    ]