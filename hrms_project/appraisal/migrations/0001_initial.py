import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0003_userprofile_employee_id'),
        ('employees', '0015_contractversion_signature_image'),
    ]

    operations = [
        migrations.CreateModel(
            name='AppraisalCycle',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به‌روزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('title', models.CharField(max_length=200, verbose_name='عنوان دوره')),
                ('cycle_type', models.CharField(blank=True, max_length=50, verbose_name='نوع دوره')),
                ('start_date', models.DateField(blank=True, null=True, verbose_name='تاریخ شروع')),
                ('end_date', models.DateField(blank=True, null=True, verbose_name='تاریخ پایان')),
                ('status', models.CharField(choices=[('draft', 'پیش‌نویس'), ('active', 'فعال'), ('closed', 'بسته')], default='draft', max_length=20, verbose_name='وضعیت')),
                ('description', models.TextField(blank=True, verbose_name='توضیحات')),
                ('weights', models.JSONField(blank=True, default=dict, verbose_name='وزن معیارها')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
            ],
            options={
                'verbose_name': 'دوره ارزیابی',
                'verbose_name_plural': 'دوره‌های ارزیابی',
                'ordering': ['-start_date'],
            },
        ),
        migrations.CreateModel(
            name='AppraisalRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به‌روزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('total_score', models.DecimalField(decimal_places=1, default=0, max_digits=5, verbose_name='امتیاز نهایی (۰-۱۰۰)')),
                ('breakdown', models.JSONField(blank=True, default=dict, verbose_name='تفکیک امتیاز معیارها')),
                ('self_score', models.DecimalField(blank=True, decimal_places=1, max_digits=5, null=True, verbose_name='خودارزیابی')),
                ('manager_score', models.DecimalField(blank=True, decimal_places=1, max_digits=5, null=True, verbose_name='امتیاز مدیر')),
                ('goals', models.JSONField(blank=True, default=list, verbose_name='اهداف / OKR')),
                ('strengths', models.TextField(blank=True, verbose_name='نقاط قوت')),
                ('improvements', models.TextField(blank=True, verbose_name='نقاط بهبود')),
                ('comments', models.TextField(blank=True, verbose_name='نظر نهایی')),
                ('reviewed_by', models.CharField(blank=True, max_length=200, verbose_name='ارزیاب')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
                ('cycle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='records', to='appraisal.appraisalcycle', verbose_name='دوره ارزیابی')),
                ('employee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='appraisals', to='employees.employee', verbose_name='پرسنل')),
            ],
            options={
                'verbose_name': 'سابقه ارزیابی',
                'verbose_name_plural': 'سوابق ارزیابی',
                'ordering': ['-cycle__start_date', '-created_at'],
                'unique_together': {('company', 'cycle', 'employee')},
            },
        ),
    ]