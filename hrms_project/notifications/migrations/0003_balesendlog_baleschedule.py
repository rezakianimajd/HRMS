from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0002_baletemplate'),
    ]

    operations = [
        migrations.CreateModel(
            name='BaleSendLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به\u200cروزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('subject', models.CharField(blank=True, max_length=200, verbose_name='موضوع')),
                ('text', models.TextField(verbose_name='متن ارسال\u200cشده')),
                ('chat_id', models.CharField(max_length=100, verbose_name='chat_id گیرنده')),
                ('recipient_name', models.CharField(blank=True, max_length=200, verbose_name='نام گیرنده')),
                ('status', models.CharField(choices=[('sent', 'ارسال موفق'), ('failed', 'ناموفق')], max_length=10, verbose_name='وضعیت')),
                ('error', models.TextField(blank=True, verbose_name='خطا')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
                ('template', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='logs', to='notifications.baletemplate', verbose_name='قالب')),
            ],
            options={
                'verbose_name': 'تاریخچه ارسال بله',
                'verbose_name_plural': 'تاریخچه ارسال\u200cهای بله',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='BaleSchedule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به\u200cروزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('title', models.CharField(max_length=200, verbose_name='عنوان برنامه')),
                ('text', models.TextField(verbose_name='متن پیام')),
                ('frequency', models.CharField(choices=[('once', 'یک\u200cبار'), ('daily', 'روزانه'), ('weekly', 'هفتگی'), ('monthly', 'ماهانه')], default='once', max_length=10, verbose_name='تکرار')),
                ('scheduled_at', models.DateTimeField(verbose_name='زمان اجرا')),
                ('chat_ids', models.TextField(help_text='chat_id ها با کاما جدا شوند؛ خالی = همه\u200cگیرندگان', verbose_name='لیست گیرندگان')),
                ('status', models.CharField(choices=[('pending', 'در انتظار'), ('done', 'انجام شده'), ('cancelled', 'لغو شده')], default='pending', max_length=10, verbose_name='وضعیت')),
                ('last_run_at', models.DateTimeField(blank=True, null=True, verbose_name='آخرین اجرا')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
                ('template', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='schedules', to='notifications.baletemplate', verbose_name='قالب')),
            ],
            options={
                'verbose_name': 'زمان\u200cبندی ارسال بله',
                'verbose_name_plural': 'زمان\u200cبندی\u200cهای ارسال بله',
                'ordering': ['scheduled_at'],
            },
        ),
    ]