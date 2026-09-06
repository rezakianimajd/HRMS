import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0002_rolepermission_remove_company_created_on_and_more'),
        ('employees', '0011_add_hr_request'),
    ]

    operations = [
        migrations.CreateModel(
            name='Asset',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به\u200cروزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('name', models.CharField(max_length=200, verbose_name='نام دارایی')),
                ('asset_type', models.CharField(choices=[('laptop', 'لپ\u200cتاپ'), ('phone', 'موبایل'), ('desk', 'میز کار'), ('monitor', 'مانیتور'), ('key', 'کلید'), ('other', 'سایر')], default='other', max_length=20, verbose_name='نوع دارایی')),
                ('serial_number', models.CharField(blank=True, max_length=100, verbose_name='سریال / شناسه')),
                ('assigned_date', models.DateField(blank=True, null=True, verbose_name='تاریخ واگذاری')),
                ('return_due_date', models.DateField(blank=True, null=True, verbose_name='تاریخ بازگشت مورد انتظار')),
                ('returned_date', models.DateField(blank=True, null=True, verbose_name='تاریخ تحویل')),
                ('status', models.CharField(choices=[('assigned', 'واگذارشده'), ('returned', 'تحویل\u200cشده'), ('lost', 'مفقود'), ('damaged', 'آسیب\u200cدیده')], default='assigned', max_length=20, verbose_name='وضعیت')),
                ('notes', models.TextField(blank=True, verbose_name='یادداشت')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
                ('employee', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assets', to='employees.employee', verbose_name='پرسنل واگذارشده')),
            ],
            options={
                'verbose_name': 'دارایی',
                'verbose_name_plural': 'اموال و تجهیزات',
                'ordering': ['-assigned_date', '-created_at'],
                'indexes': [
                    models.Index(fields=['company', 'employee'], name='lifecycle_asset_company_employee_idx'),
                    models.Index(fields=['company', 'status'], name='lifecycle_asset_company_status_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='CalendarEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به\u200cروزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('title', models.CharField(max_length=250, verbose_name='عنوان')),
                ('event_date', models.DateField(verbose_name='تاریخ رویداد')),
                ('event_type', models.CharField(choices=[('custom', 'رویداد عمومی'), ('birthday', 'تولد'), ('leave', 'مرخصی'), ('contract_end', 'پایان قرارداد')], default='custom', max_length=20, verbose_name='نوع رویداد')),
                ('description', models.TextField(blank=True, verbose_name='توضیحات')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
                ('employee', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='calendar_events', to='employees.employee', verbose_name='پرسنل مرتبط')),
            ],
            options={
                'verbose_name': 'رویداد تقویم',
                'verbose_name_plural': 'رویدادهای تقویم',
                'ordering': ['event_date', 'id'],
                'indexes': [
                    models.Index(fields=['company', 'event_date'], name='lifecycle_event_company_date_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='LifecycleChecklist',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به\u200cروزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('kind', models.CharField(choices=[('onboarding', 'خوش\u200cآمدگویی / ورود'), ('offboarding', 'خروج / تسویه')], max_length=20, verbose_name='نوع چک\u200cلیست')),
                ('progress_note', models.TextField(blank=True, verbose_name='توضیح پیشرفت')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
                ('employee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='checklists', to='employees.employee', verbose_name='پرسنل')),
            ],
            options={
                'verbose_name': 'چک\u200cلیست چرخه عمر',
                'verbose_name_plural': 'چک\u200cلیست\u200cهای چرخه عمر',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ChecklistItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به\u200cروزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('title', models.CharField(max_length=250, verbose_name='عنوان وظیفه')),
                ('is_completed', models.BooleanField(default=False, verbose_name='انجام شده')),
                ('completed_at', models.DateField(blank=True, null=True, verbose_name='تاریخ انجام')),
                ('checklist', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='lifecycle.lifecyclechecklist', verbose_name='چک\u200cلیست')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
            ],
            options={
                'verbose_name': 'اقلام چک\u200cلیست',
                'verbose_name_plural': 'اقلام چک\u200cلیست',
                'ordering': ['id'],
            },
        ),
    ]