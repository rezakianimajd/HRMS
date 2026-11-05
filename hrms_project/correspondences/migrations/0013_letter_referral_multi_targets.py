# Generated manually (Django 5.0.14) — ارجاع چندنفره و نگاشت چندمقصدی

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('correspondences', '0012_correspondence_name_alias'),
        ('employees', '0026_link_insurance_to_family'),
    ]

    operations = [
        migrations.AddField(
            model_name='letterreferral',
            name='to_employees',
            field=models.ManyToManyField(
                blank=True, db_constraint=False,
                help_text='برای ارجاع‌هایی که هم‌زمان به چند نفر ارجاع داده شده‌اند',
                related_name='multi_letter_referrals', to='employees.employee',
                verbose_name='ارجاع‌شونده‌های دیگر (پرسنل)',
            ),
        ),
        migrations.AddField(
            model_name='correspondencenamealias',
            name='order',
            field=models.PositiveSmallIntegerField(
                default=0,
                help_text='در نگاشت‌های چندنفره، مقصد با ترتیب کمتر «گیرندهٔ اصلی» است.',
                verbose_name='ترتیب',
            ),
        ),
        migrations.AlterUniqueTogether(
            name='correspondencenamealias',
            unique_together=set(),
        ),
        migrations.AlterModelOptions(
            name='correspondencenamealias',
            options={
                'ordering': ['normalized', 'scope', 'order', 'id'],
                'verbose_name': 'نگاشت نام مکاتبات',
                'verbose_name_plural': 'نگاشت نام‌های مکاتبات',
            },
        ),
    ]
