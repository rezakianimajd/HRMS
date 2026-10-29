# Generated for صورت معاملات فصلی (ماده ۱۶۹ مکرر) — phase 1

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounting', '0024_normalize_arabic_chars_in_coding'),
        ('core', '0013_rolepermission_applications'),
    ]

    operations = [
        migrations.CreateModel(
            name='SeasonalReport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به\u200cروزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('quarter', models.PositiveSmallIntegerField(choices=[(1, 'سه\u200cماهه اول'), (2, 'سه\u200cماهه دوم'), (3, 'سه\u200cماهه سوم'), (4, 'سه\u200cماهه چهارم')], default=1, verbose_name='فصل')),
                ('status', models.CharField(choices=[('draft', 'پیش\u200cنویس'), ('ready', 'آمادهٔ ارسال'), ('submitted', 'ارسال\u200cشده')], default='draft', max_length=12, verbose_name='وضعیت')),
                ('notes', models.TextField(blank=True, verbose_name='یادداشت')),
                ('submitted_at', models.DateTimeField(blank=True, null=True, verbose_name='زمان ارسال')),
                ('submission_ref', models.CharField(blank=True, max_length=120, verbose_name='شمارهٔ پیگیری / رسید')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
                ('fiscal_year', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='seasonal_reports', to='accounting.fiscalyear', verbose_name='سال مالی')),
            ],
            options={
                'verbose_name': 'صورت معاملات فصلی',
                'verbose_name_plural': 'صورت\u200cهای معاملات فصلی',
                'ordering': ['-fiscal_year__start_date', 'quarter'],
                'constraints': [models.UniqueConstraint(fields=('company', 'fiscal_year', 'quarter'), name='uniq_seasonal_report_period')],
            },
        ),
        migrations.CreateModel(
            name='SeasonalTransaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به\u200cروزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('line_no', models.PositiveIntegerField(default=0, verbose_name='ردیف')),
                ('name', models.CharField(max_length=250, verbose_name='نام / عنوان طرف معامله')),
                ('person_type', models.CharField(blank=True, choices=[('legal', 'شخص حقوقی'), ('natural', 'شخص حقیقی')], default='', max_length=10, verbose_name='نوع شخص')),
                ('economic_code', models.CharField(blank=True, max_length=20, verbose_name='شماره اقتصادی')),
                ('national_id', models.CharField(blank=True, max_length=20, verbose_name='شناسه ملی / کد ملی')),
                ('postal_code', models.CharField(blank=True, max_length=10, verbose_name='کد پستی')),
                ('province', models.CharField(blank=True, max_length=60, verbose_name='استان')),
                ('city', models.CharField(blank=True, max_length=100, verbose_name='شهر')),
                ('address', models.TextField(blank=True, verbose_name='آدرس')),
                ('goods_service_desc', models.CharField(blank=True, max_length=300, verbose_name='شرح کالا / خدمات')),
                ('amount', models.DecimalField(decimal_places=0, default=0, max_digits=18, verbose_name='مبلغ (ریال)')),
                ('vat', models.DecimalField(decimal_places=0, default=0, max_digits=18, verbose_name='مالیات بر ارزش افزوده')),
                ('kind', models.PositiveSmallIntegerField(choices=[(1, 'نوع ۱'), (2, 'نوع ۲'), (3, 'نوع ۳'), (4, 'نوع ۴'), (5, 'نوع ۵')], default=1, verbose_name='نوع معامله')),
                ('invoice_date', models.DateField(blank=True, null=True, verbose_name='تاریخ فاکتور')),
                ('invoice_no', models.CharField(blank=True, max_length=50, verbose_name='شماره فاکتور')),
                ('moadian_status', models.CharField(choices=[('registered', 'درج\u200cشده در سامانه مودیان'), ('pending', 'درج\u200cنشده در سامانه')], default='pending', max_length=10, verbose_name='وضعیت در سامانه مودیان')),
                ('moadian_uid', models.CharField(blank=True, max_length=120, verbose_name='شناسهٔ یکتای صورتحساب')),
                ('currency_code', models.CharField(blank=True, max_length=10, verbose_name='ارز (صادرات/واردات)')),
                ('fx_rate', models.DecimalField(decimal_places=6, default=1, max_digits=18, verbose_name='نرخ ارز')),
                ('source', models.CharField(choices=[('manual', 'ورود دستی'), ('ledger', 'از اسناد حسابداری')], default='manual', max_length=10, verbose_name='منبع ردیف')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
                ('report', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transactions', to='accounting.seasonalreport', verbose_name='گزارش فصلی')),
                ('source_line', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='seasonal_rows', to='accounting.accountingdocumentline', verbose_name='سطر سند مبنا')),
            ],
            options={
                'verbose_name': 'ردیف معاملات فصلی',
                'verbose_name_plural': 'ردیف‌های معاملات فصلی',
                'ordering': ['line_no', 'id'],
                'indexes': [
                    models.Index(fields=['report', 'line_no'], name='seasonal_row_order_idx'),
                    models.Index(fields=['report', 'economic_code'], name='seasonal_row_party_idx'),
                ],
                'constraints': [models.UniqueConstraint(fields=('report', 'line_no'), name='uniq_seasonal_row_no')],
            },
        ),
    ]
