# Generated manually (Django 5.0.14) — مقصد «سازمان» در نگاشت نام‌ها

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('correspondences', '0014_mark_closed_referrals_seen'),
    ]

    operations = [
        migrations.AddField(
            model_name='correspondencenamealias',
            name='organization',
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.CASCADE,
                related_name='name_aliases', to='correspondences.organization',
                verbose_name='سازمان',
            ),
        ),
        migrations.AlterField(
            model_name='correspondencenamealias',
            name='target_kind',
            field=models.CharField(
                choices=[('employee', 'پرسنل (منابع انسانی)'),
                         ('party', 'طرف حساب (مدیریت قراردادها)'),
                         ('correspondent', 'مخاطب مکاتبات'),
                         ('organization', 'سازمان (تعاریف مکاتبات)')],
                max_length=20, verbose_name='نوع مقصد',
            ),
        ),
        migrations.AlterField(
            model_name='correspondencenamealias',
            name='scope',
            field=models.CharField(
                choices=[('any', 'همهٔ فیلدها'), ('referral', 'گیرندهٔ ارجاع'),
                         ('sender', 'فرستنده / ارسال‌کننده'), ('receiver', 'گیرنده'),
                         ('delivery', 'تحویل‌دهنده'),
                         ('counterparty', 'طرف حساب نامه (وارده/صادره)'),
                         ('referral_target', 'گیرندهٔ ارجاع (طرف حساب)'),
                         ('contact', 'مخاطب نامه'), ('organization', 'سازمان طرف نامه')],
                default='any', max_length=20, verbose_name='دامنهٔ کاربرد',
            ),
        ),
    ]
