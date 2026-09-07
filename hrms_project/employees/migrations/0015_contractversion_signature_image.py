from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0014_employee_bale_chat_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='contractversion',
            name='signature_image',
            field=models.ImageField(blank=True, null=True, upload_to='signatures/', verbose_name='تصویر امضا / مهر'),
        ),
    ]