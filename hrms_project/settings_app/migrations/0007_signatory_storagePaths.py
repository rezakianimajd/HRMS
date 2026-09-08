from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('settings_app', '0006_balecontact_tag_category'),
    ]

    operations = [
        migrations.AddField(
            model_name='companyprofile',
            name='base_storage_path',
            field=models.CharField(blank=True, help_text='ریشهٔ همهٔ فایل‌های آپلودی (مثال: /var/hr_data)', max_length=500, verbose_name='مسیر پایه ذخیره‌سازی'),
        ),
        migrations.AddField(
            model_name='companyprofile',
            name='storage_path_correspondences',
            field=models.CharField(blank=True, help_text='پوشهٔ نامه‌ها و مکاتبات', max_length=500, verbose_name='مسیر مکاتبات'),
        ),
        migrations.AddField(
            model_name='companyprofile',
            name='storage_path_documents',
            field=models.CharField(blank=True, help_text='پوشهٔ اسناد سازمان', max_length=500, verbose_name='مسیر بایگانی اسناد'),
        ),
        migrations.AddField(
            model_name='companyprofile',
            name='storage_path_employees',
            field=models.CharField(blank=True, help_text='پوشهٔ مدارک پرسنلی (نسبی به مسیر پایه)', max_length=500, verbose_name='مسیر مدارک پرسنل'),
        ),
        migrations.CreateModel(
            name='Signatory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به‌روزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('full_name', models.CharField(max_length=200, verbose_name='نام و نام خانوادگی')),
                ('position', models.CharField(blank=True, max_length=200, verbose_name='سمت / عنوان')),
                ('national_id', models.CharField(blank=True, max_length=20, verbose_name='کد ملی')),
                ('signature_image', models.ImageField(blank=True, null=True, upload_to='signatory_samples/', verbose_name='نمونه امضا')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
            ],
            options={
                'verbose_name': 'صاحب امضا',
                'verbose_name_plural': 'صاحبان امضا',
                'ordering': ['full_name'],
            },
        ),
    ]