import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('settings_app', '0002_companyprofile_employer_rep'),
    ]

    operations = [
        migrations.AlterField(
            model_name='systemsetting',
            name='company',
            field=models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت'),
        ),
        migrations.AlterField(
            model_name='companyprofile',
            name='company',
            field=models.OneToOneField(db_constraint=False, on_delete=django.db.models.deletion.CASCADE, related_name='profile', to='core.company', verbose_name='شرکت'),
        ),
    ]