from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0011_add_hr_request'),
    ]

    operations = [
        migrations.AddField(
            model_name='contractversion',
            name='signed_by',
            field=models.CharField(blank=True, max_length=200, verbose_name='امضای دیجیتال (نام امضاکننده)'),
        ),
        migrations.AddField(
            model_name='contractversion',
            name='signed_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='زمان امضای دیجیتال'),
        ),
    ]