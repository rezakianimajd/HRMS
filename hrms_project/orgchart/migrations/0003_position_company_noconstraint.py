import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orgchart', '0002_position_occupants'),
    ]

    operations = [
        migrations.AlterField(
            model_name='position',
            name='company',
            field=models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت'),
        ),
    ]