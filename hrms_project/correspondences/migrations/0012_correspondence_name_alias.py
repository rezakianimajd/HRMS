# Generated manually (Django 5.0.14) — نگاشت نام‌های مکاتبات به پرسنل/طرف حساب/مخاطب

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contracts', '0045_alter_guarantee_last_action_and_more'),
        ('correspondences', '0011_seed_letter_request_types'),
        ('employees', '0026_link_insurance_to_family'),
    ]

    operations = [
        migrations.CreateModel(
            name='CorrespondenceNameAlias',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True,
                                           serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True,
                                                     verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True,
                                                    verbose_name='تاریخ به‌روزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد',
                                                  verbose_name='فعال')),
                ('raw_name', models.CharField(max_length=200, verbose_name='نام خام (واردشده)')),
                ('normalized', models.CharField(blank=True, db_index=True, max_length=200,
                                                verbose_name='کلید نرمال‌شده')),
                ('scope', models.CharField(
                    choices=[('any', 'همهٔ فیلدها'), ('referral', 'گیرندهٔ ارجاع'),
                             ('sender', 'فرستنده'), ('receiver', 'گیرنده'),
                             ('delivery', 'تحویل‌دهنده'),
                             ('counterparty', 'طرف نامه (فرستندهٔ وارده / گیرندهٔ صادره)')],
                    default='any', max_length=20, verbose_name='دامنهٔ کاربرد')),
                ('target_kind', models.CharField(
                    choices=[('employee', 'پرسنل (منابع انسانی)'),
                             ('party', 'طرف حساب (مدیریت قراردادها)'),
                             ('correspondent', 'مخاطب مکاتبات')],
                    max_length=20, verbose_name='نوع مقصد')),
                ('note', models.TextField(blank=True, verbose_name='یادداشت')),
                ('applied_count', models.PositiveIntegerField(default=0,
                                                              verbose_name='تعداد اصلاح‌شده')),
                ('last_applied_at', models.DateTimeField(blank=True, null=True,
                                                         verbose_name='آخرین اعمال')),
                ('company', models.ForeignKey(db_constraint=False,
                                              on_delete=django.db.models.deletion.CASCADE,
                                              related_name='%(class)s_records',
                                              to='core.company', verbose_name='شرکت',
                                              help_text='شرکت مربوطه')),
                ('correspondent', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.CASCADE,
                    related_name='name_aliases', to='correspondences.correspondent',
                    verbose_name='مخاطب')),
                ('employee', models.ForeignKey(
                    blank=True, db_constraint=False, null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='correspondence_aliases', to='employees.employee',
                    verbose_name='پرسنل')),
                ('party', models.ForeignKey(
                    blank=True, db_constraint=False, null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='correspondence_aliases', to='contracts.contractparty',
                    verbose_name='طرف حساب')),
            ],
            options={
                'verbose_name': 'نگاشت نام مکاتبات',
                'verbose_name_plural': 'نگاشت نام‌های مکاتبات',
                'ordering': ['-applied_count', 'raw_name'],
                'unique_together': {('company', 'normalized', 'scope')},
                'indexes': [models.Index(fields=['company', 'scope', 'normalized'],
                                         name='corresponde_company_8466c4_idx')],
            },
        ),
    ]
