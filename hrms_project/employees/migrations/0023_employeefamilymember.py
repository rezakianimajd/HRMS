# Generated for the employee family section (پروندهٔ پرسنلی ← خانواده)
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0022_supplementary_dependent_identity'),
    ]

    operations = [
        migrations.CreateModel(
            name='EmployeeFamilyMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به‌روزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('first_name', models.CharField(max_length=100, verbose_name='نام')),
                ('last_name', models.CharField(blank=True, max_length=100, null=True, verbose_name='نام خانوادگی')),
                ('relation', models.CharField(
                    choices=[
                        ('spouse', 'همسر'), ('child', 'فرزند'), ('father', 'پدر'),
                        ('mother', 'مادر'), ('sibling', 'خواهر / برادر'), ('other', 'سایر'),
                    ],
                    default='spouse', max_length=20, verbose_name='نسبت',
                )),
                ('national_id', models.CharField(
                    blank=True, help_text='کد ملی ده‌رقمی (اختیاری)', max_length=10,
                    null=True, verbose_name='کد ملی',
                )),
                ('birth_date', models.DateField(blank=True, null=True, verbose_name='تاریخ تولد')),
                ('phone', models.CharField(blank=True, max_length=25, null=True, verbose_name='تلفن همراه')),
                ('is_dependent', models.BooleanField(
                    default=True, help_text='آیا این عضو خانواده تحت تکفل پرسنل است؟', verbose_name='تحت تکفل',
                )),
                ('source', models.CharField(
                    choices=[('manual', 'ثبت دستی'), ('supplementary_insurance', 'بیمه تکمیلی')],
                    default='manual', max_length=30, verbose_name='منبع ثبت',
                )),
                ('source_key', models.CharField(
                    blank=True, help_text='برای جلوگیری از ثبت تکراری اعضای منتقل‌شده از بیمهٔ تکمیلی',
                    max_length=120, null=True, verbose_name='کلید منبع',
                )),
                ('notes', models.TextField(blank=True, null=True, verbose_name='توضیحات')),
                ('company', models.ForeignKey(
                    db_constraint=False, on_delete=django.db.models.deletion.CASCADE,
                    related_name='%(class)s_records', to='core.company',
                    verbose_name='شرکت', help_text='شرکت مربوطه',
                )),
                ('employee', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE, related_name='family_members',
                    to='employees.employee', verbose_name='پرسنل',
                )),
            ],
            options={
                'verbose_name': 'عضو خانواده',
                'verbose_name_plural': 'اعضای خانواده',
                'ordering': ['relation', 'first_name', 'last_name'],
            },
        ),
        migrations.AddConstraint(
            model_name='employeefamilymember',
            constraint=models.UniqueConstraint(
                fields=('employee', 'source_key'), name='uniq_employee_family_source_key',
            ),
        ),
    ]
