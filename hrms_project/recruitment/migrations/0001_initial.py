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
            name='JobRequisition',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به‌روزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('title', models.CharField(max_length=200, verbose_name='عنوان شغلی')),
                ('headcount', models.PositiveIntegerField(default=1, verbose_name='تعداد نیروی مورد نیاز')),
                ('status', models.CharField(choices=[('draft', 'پیش‌نویس'), ('open', 'باز'), ('on_hold', 'متوقف'), ('closed', 'بسته')], default='draft', max_length=20, verbose_name='وضعیت')),
                ('reason', models.TextField(blank=True, verbose_name='دلیل استخدام')),
                ('responsibilities', models.TextField(blank=True, verbose_name='شرح وظایف')),
                ('requirements', models.TextField(blank=True, verbose_name='شرایط احراز')),
                ('requested_by', models.CharField(blank=True, max_length=200, verbose_name='درخواست‌دهنده')),
                ('requested_date', models.DateField(blank=True, null=True, verbose_name='تاریخ درخواست')),
                ('budget_salary', models.DecimalField(blank=True, decimal_places=0, max_digits=15, null=True, verbose_name='سقف پیشنهادی حقوق')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
                ('department', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='requisitions', to='employees.department', verbose_name='دپارتمان')),
                ('job_title', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='requisitions', to='employees.jobtitle', verbose_name='عنوان سازمانی')),
                ('work_location', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='requisitions', to='employees.worklocation', verbose_name='محل خدمت')),
            ],
            options={
                'verbose_name': 'درخواست استخدام',
                'verbose_name_plural': 'درخواست‌های استخدام',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Candidate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به‌روزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('first_name', models.CharField(max_length=100, verbose_name='نام')),
                ('last_name', models.CharField(max_length=100, verbose_name='نام خانوادگی')),
                ('national_id', models.CharField(blank=True, max_length=10, verbose_name='کد ملی')),
                ('mobile', models.CharField(blank=True, max_length=15, verbose_name='موبایل')),
                ('email', models.EmailField(blank=True, max_length=254, verbose_name='ایمیل')),
                ('resume', models.FileField(blank=True, null=True, upload_to='candidate_resumes/', verbose_name='رزومه')),
                ('stage', models.CharField(choices=[('applied', 'دریافت رزومه'), ('screening', 'غربالگری'), ('interview', 'مصاحبه'), ('assessment', 'ارزیابی فنی'), ('offer', 'پیشنهاد همکاری'), ('hired', 'استخدام شده'), ('rejected', 'رد شده')], default='applied', max_length=20, verbose_name='مرحله')),
                ('rating', models.PositiveSmallIntegerField(default=0, verbose_name='امتیاز (۰-۱۰۰)')),
                ('notes', models.TextField(blank=True, verbose_name='یادداشت')),
                ('source', models.CharField(blank=True, max_length=100, verbose_name='منبع جذب')),
                ('expected_salary', models.DecimalField(blank=True, decimal_places=0, max_digits=15, null=True, verbose_name='حقوق پیشنهادی متقاضی')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
                ('requisition', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='candidates', to='recruitment.jobrequisition', verbose_name='درخواست استخدام')),
            ],
            options={
                'verbose_name': 'کاندید',
                'verbose_name_plural': 'کاندیدها',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Interview',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به‌روزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('interviewer', models.CharField(blank=True, max_length=200, verbose_name='مصاحبه‌کننده')),
                ('interview_date', models.DateTimeField(blank=True, null=True, verbose_name='زمان مصاحبه')),
                ('outcome', models.CharField(choices=[('pass', 'قبول'), ('fail', 'رد'), ('pending', 'در انتظار')], default='pending', max_length=20, verbose_name='نتیجه')),
                ('score', models.PositiveSmallIntegerField(default=0, verbose_name='امتیاز (۰-۱۰۰)')),
                ('comments', models.TextField(blank=True, verbose_name='نظرات')),
                ('candidate', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='interviews', to='recruitment.candidate', verbose_name='کاندید')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
            ],
            options={
                'verbose_name': 'مصاحبه',
                'verbose_name_plural': 'مصاحبه‌ها',
                'ordering': ['-interview_date'],
            },
        ),
    ]