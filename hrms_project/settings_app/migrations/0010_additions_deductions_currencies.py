from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('settings_app', '0009_alter_companyprofile_storage_path_correspondences_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Addition',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به\u200cروزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('code', models.CharField(max_length=50, verbose_name='کد')),
                ('description', models.CharField(max_length=200, verbose_name='شرح')),
                ('default_percent', models.DecimalField(decimal_places=2, default=0, max_digits=5, verbose_name='درصد پیش\u200cفرض')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
            ],
            options={
                'verbose_name': 'اضافه',
                'verbose_name_plural': 'اضافات',
                'ordering': ['code'],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Deduction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به\u200cروزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('code', models.CharField(max_length=50, verbose_name='کد')),
                ('description', models.CharField(max_length=200, verbose_name='شرح')),
                ('default_percent', models.DecimalField(decimal_places=2, default=0, max_digits=5, verbose_name='درصد پیش\u200cفرض')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
            ],
            options={
                'verbose_name': 'کسور',
                'verbose_name_plural': 'کسورات',
                'ordering': ['code'],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Currency',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به\u200cروزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('code', models.CharField(max_length=10, verbose_name='کد ارز')),
                ('name', models.CharField(max_length=100, verbose_name='نام ارز')),
                ('symbol', models.CharField(max_length=20, verbose_name='نماد')),
                ('country_code', models.CharField(blank=True, help_text='ISO-3166 alpha-2 برای نمایش پرچم (مثلاً IR، US، EU)', max_length=10, verbose_name='کد کشور')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
            ],
            options={
                'verbose_name': 'ارز',
                'verbose_name_plural': 'ارزها',
                'ordering': ['code'],
                'unique_together': {('company', 'code')},
                'abstract': False,
            },
        ),
    ]