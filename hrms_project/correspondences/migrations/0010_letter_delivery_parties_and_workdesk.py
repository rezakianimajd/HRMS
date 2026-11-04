# Generated manually (Django 5.0.14) — پرسنل/طرف حساب، تحویل نامه و کارتابل درخواست‌ها

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contracts', '0045_alter_guarantee_last_action_and_more'),
        ('correspondences', '0009_backfill_legacy_entry_details'),
        ('employees', '0026_link_insurance_to_family'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='letter',
            name='delivery_type',
            field=models.CharField(choices=[('in_person', 'حضوری / دستی'), ('post', 'پست / مرسوله'), ('email', 'پست الکترونیک'), ('fax', 'دورنگار'), ('courier', 'پیک'), ('scanner', 'اسکنر / بارگذاری'), ('automation', 'اتوماسیون اداری'), ('other', 'سایر')], default='in_person', max_length=20, verbose_name='نوع تحویل'),
        ),
        migrations.AddField(
            model_name='letter',
            name='delivered_by',
            field=models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='delivered_office_letters', to='employees.employee', verbose_name='تحویل‌دهنده'),
        ),
        migrations.AddField(
            model_name='letter',
            name='delivered_by_name',
            field=models.CharField(blank=True, max_length=200, verbose_name='نام تحویل‌دهنده (متن آزاد)'),
        ),
        migrations.AddField(
            model_name='letter',
            name='sender_employee',
            field=models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sent_office_letters', to='employees.employee', verbose_name='فرستنده (پرسنل)'),
        ),
        migrations.AddField(
            model_name='letter',
            name='receiver_employee',
            field=models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='received_office_letters', to='employees.employee', verbose_name='گیرنده (پرسنل)'),
        ),
        migrations.AddField(
            model_name='letter',
            name='sender_party',
            field=models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sent_letters', to='contracts.contractparty', verbose_name='ارسال‌کننده (طرف حساب)'),
        ),
        migrations.AddField(
            model_name='letter',
            name='party_account',
            field=models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='office_letters', to='contracts.contractparty', verbose_name='طرف حساب'),
        ),
        migrations.AddField(
            model_name='letterreferral',
            name='parent',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='children', to='correspondences.letterreferral', verbose_name='ارجاع والد'),
        ),
        migrations.AddField(
            model_name='letterreferral',
            name='purpose',
            field=models.CharField(choices=[('action', 'اقدام / انجام کار'), ('info', 'اطلاع / مشاهده'), ('comment', 'اظهارنظر')], default='action', help_text='اقدام (نیازمند انجام کار) یا اطلاع (صرفاً مشاهده)', max_length=20, verbose_name='نوع ارجاع'),
        ),
        migrations.AddField(
            model_name='letterreferral',
            name='from_employee',
            field=models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sent_letter_referrals', to='employees.employee', verbose_name='ارجاع‌دهنده (پرسنل)'),
        ),
        migrations.AddField(
            model_name='letterreferral',
            name='to_employee',
            field=models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='letter_referrals', to='employees.employee', verbose_name='ارجاع‌شونده (پرسنل)'),
        ),
        migrations.AddField(
            model_name='letterreferral',
            name='margin_note',
            field=models.TextField(blank=True, verbose_name='حاشیه / یادداشت گیرنده'),
        ),
        migrations.AddField(
            model_name='letterreferral',
            name='seen_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='زمان مشاهده'),
        ),
        migrations.AlterField(
            model_name='letterreferral',
            name='status',
            field=models.CharField(choices=[('pending', 'در انتظار اقدام'), ('in_progress', 'در حال اقدام'), ('forwarded', 'ارجاع داده شد'), ('done', 'اقدام شد'), ('returned', 'برگشت داده شد'), ('canceled', 'لغو')], default='pending', max_length=20, verbose_name='وضعیت'),
        ),
        migrations.AlterField(
            model_name='letterevent',
            name='action',
            field=models.CharField(choices=[('created', 'ایجاد'), ('updated', 'ویرایش'), ('registered', 'ثبت شماره'), ('referred', 'ارجاع'), ('referral_done', 'اقدام ارجاع'), ('replied', 'پاسخ'), ('attached', 'پیوست'), ('status_changed', 'تغییر وضعیت'), ('archived', 'بایگانی'), ('closed', 'بسته شد'), ('commented', 'یادداشت'), ('referral_seen', 'مشاهدهٔ ارجاع'), ('referral_note', 'حاشیهٔ ارجاع'), ('referral_forwarded', 'ارجاع به سطح بعد'), ('request_created', 'ثبت درخواست')], max_length=30, verbose_name='اقدام'),
        ),
        migrations.CreateModel(
            name='LetterRequestType',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به‌روزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('code', models.CharField(max_length=40, verbose_name='کد')),
                ('name', models.CharField(max_length=150, verbose_name='عنوان')),
                ('icon', models.CharField(blank=True, default='', max_length=40, verbose_name='آیکون')),
                ('color', models.CharField(blank=True, default='#0ea5e9', max_length=20, verbose_name='رنگ')),
                ('description', models.TextField(blank=True, verbose_name='توضیحات')),
                ('requires_attachment', models.BooleanField(default=False, verbose_name='نیازمند پیوست')),
                ('approval_levels', models.PositiveSmallIntegerField(default=1, verbose_name='تعداد سطوح تأیید')),
                ('order', models.PositiveIntegerField(default=0, verbose_name='ترتیب')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
            ],
            options={
                'verbose_name': 'نوع درخواست',
                'verbose_name_plural': 'انواع درخواست',
                'ordering': ['order', 'name'],
                'unique_together': {('company', 'code')},
            },
        ),
        migrations.CreateModel(
            name='LetterRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به‌روزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('number', models.CharField(blank=True, max_length=60, verbose_name='شماره درخواست')),
                ('request_type_title', models.CharField(blank=True, max_length=150, verbose_name='عنوان نوع (در زمان ثبت)')),
                ('subject', models.CharField(max_length=300, verbose_name='موضوع')),
                ('description', models.TextField(blank=True, verbose_name='شرح درخواست')),
                ('requester_name', models.CharField(blank=True, max_length=200, verbose_name='نام درخواست‌دهنده')),
                ('status', models.CharField(choices=[('draft', 'پیش‌نویس'), ('submitted', 'ثبت‌شده / در انتظار بررسی'), ('in_review', 'در حال بررسی'), ('approved', 'تأییدشده'), ('rejected', 'ردشده'), ('canceled', 'لغوشده')], default='submitted', max_length=20, verbose_name='وضعیت')),
                ('priority', models.CharField(choices=[('low', 'کم'), ('normal', 'عادی'), ('high', 'زیاد'), ('urgent', 'فوری')], default='normal', max_length=20, verbose_name='اولویت')),
                ('requested_on', models.DateField(blank=True, null=True, verbose_name='تاریخ درخواست')),
                ('due_date', models.DateField(blank=True, null=True, verbose_name='مهلت بررسی')),
                ('payload', models.JSONField(blank=True, default=dict, help_text='فیلدهای اختصاصی هر نوع درخواست (مثلاً تعداد روز مرخصی یا مبلغ وام)', verbose_name='اطلاعات تکمیلی')),
                ('current_step', models.PositiveSmallIntegerField(default=1, verbose_name='گام جاری')),
                ('total_steps', models.PositiveSmallIntegerField(default=1, verbose_name='تعداد گام‌ها')),
                ('decided_on', models.DateField(blank=True, null=True, verbose_name='تاریخ تصمیم')),
                ('decision_note', models.TextField(blank=True, verbose_name='یادداشت تصمیم')),
                ('attachment', models.FileField(blank=True, null=True, upload_to='correspondences/requests/%Y/%m/', verbose_name='پیوست')),
                ('closed_at', models.DateTimeField(blank=True, null=True, verbose_name='زمان بستن')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
                ('current_assignee', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_letter_requests', to=settings.AUTH_USER_MODEL, verbose_name='کارشناس جاری')),
                ('current_assignee_employee', models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_letter_requests', to='employees.employee', verbose_name='پرسنل مسئول جاری')),
                ('request_type', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='requests', to='correspondences.letterrequesttype', verbose_name='نوع درخواست')),
                ('requester', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='letter_requests', to=settings.AUTH_USER_MODEL, verbose_name='درخواست‌دهنده')),
                ('requester_employee', models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='letter_requests', to='employees.employee', verbose_name='پرسنل درخواست‌دهنده')),
            ],
            options={
                'verbose_name': 'درخواست کارتابل',
                'verbose_name_plural': 'درخواست‌های کارتابل',
                'ordering': ['-created_at', '-id'],
                'indexes': [models.Index(fields=['company', 'status'], name='corresponde_company_a98481_idx'), models.Index(fields=['company', 'requester'], name='corresponde_company_ee93b9_idx')],
            },
        ),
        migrations.CreateModel(
            name='LetterRequestEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به‌روزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('action', models.CharField(choices=[('created', 'ایجاد'), ('submitted', 'ثبت'), ('assigned', 'ارجاع'), ('noted', 'یادداشت'), ('approved', 'تأیید'), ('rejected', 'رد'), ('returned', 'برگشت'), ('canceled', 'لغو')], max_length=30, verbose_name='اقدام')),
                ('note', models.TextField(blank=True, verbose_name='توضیح')),
                ('meta', models.JSONField(blank=True, default=dict, verbose_name='اطلاعات تکمیلی')),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='letter_request_events', to=settings.AUTH_USER_MODEL, verbose_name='اقدام‌کننده')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
                ('request', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='events', to='correspondences.letterrequest', verbose_name='درخواست')),
            ],
            options={
                'verbose_name': 'رویداد درخواست',
                'verbose_name_plural': 'رویدادهای درخواست',
                'ordering': ['-created_at', '-id'],
            },
        ),
    ]
