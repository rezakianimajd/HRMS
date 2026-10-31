"""حذف ستون «عوارض» (شهرداری) — فقط مالیات بر ارزش افزوده می‌ماند.

کاملاً بازگشت‌پذیر: در reverse، ستون با پیش‌فرض صفر باز می‌گردد.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounting', '0028_aggregate_party_and_default_country'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='seasonaltransaction',
            name='duties',
        ),
    ]
