"""معاملات فصلی خرید — جهت معامله، عوارض و کشور (فاز ۱ تکمیلی).

کاملاً بازگشت‌پذیر: افزودن «جهت معامله» (خرید/فروش) برای توسعهٔ مستقل فروش،
«عوارض» و «کشور» برای پوشش فیلدهای خرید و نوع شخص خارجی، و تغییر محدودیت
یکتایی به (گزارش، جهت، ردیف) تا شماره‌گذاری خرید و فروش مستقل باشد.
"""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounting', '0025_seasonal_reports'),
    ]

    operations = [
        migrations.AddField(
            model_name='seasonaltransaction',
            name='direction',
            field=models.CharField(
                choices=[('purchase', 'خرید'), ('sale', 'فروش')],
                default='purchase', max_length=10, verbose_name='جهت معامله',
            ),
        ),
        migrations.AddField(
            model_name='seasonaltransaction',
            name='duties',
            field=models.DecimalField(
                decimal_places=0, default=0, max_digits=18, verbose_name='عوارض',
            ),
        ),
        migrations.AddField(
            model_name='seasonaltransaction',
            name='country',
            field=models.CharField(blank=True, max_length=60, verbose_name='کشور'),
        ),
        migrations.AlterField(
            model_name='seasonaltransaction',
            name='person_type',
            field=models.CharField(
                blank=True,
                choices=[('legal', 'شخص حقوقی'), ('natural', 'شخص حقیقی'), ('foreign', 'شخص خارجی')],
                default='', max_length=10, verbose_name='نوع شخص',
            ),
        ),
        migrations.RemoveConstraint(
            model_name='seasonaltransaction',
            name='uniq_seasonal_row_no',
        ),
        migrations.RemoveIndex(
            model_name='seasonaltransaction',
            name='seasonal_row_order_idx',
        ),
        migrations.AddIndex(
            model_name='seasonaltransaction',
            index=models.Index(
                fields=['report', 'direction', 'line_no'], name='seasonal_row_order_idx',
            ),
        ),
        migrations.AddConstraint(
            model_name='seasonaltransaction',
            constraint=models.UniqueConstraint(
                fields=('report', 'direction', 'line_no'), name='uniq_seasonal_row_no',
            ),
        ),
    ]
