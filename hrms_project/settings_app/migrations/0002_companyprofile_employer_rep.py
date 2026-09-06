from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('settings_app', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='companyprofile',
            name='employer_rep_name',
            field=models.CharField(blank=True, max_length=200, verbose_name='نام نماینده حقوقی / مدیرعامل'),
        ),
        migrations.AddField(
            model_name='companyprofile',
            name='employer_rep_title',
            field=models.CharField(blank=True, max_length=100, verbose_name='سمت نماینده'),
        ),
        migrations.AddField(
            model_name='companyprofile',
            name='employer_rep_national_id',
            field=models.CharField(blank=True, max_length=20, verbose_name='کد ملی نماینده'),
        ),
    ]