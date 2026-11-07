"""انتقال «ثبت‌کنندهٔ ورود» قدیمی به «تحویل‌دهنده» (نام تحویل‌دهنده)."""
from django.db import migrations
from django.db.models import F


def backfill(apps, schema_editor):
    Letter = apps.get_model('correspondences', 'Letter')
    rows = Letter.objects.filter(delivered_by__isnull=True, delivered_by_name='')
    rows.exclude(entered_by_name='').update(delivered_by_name=F('entered_by_name'))


def unbackfill(apps, schema_editor):
    """بازگشت‌ناپذیر (دادهٔ اصلی حفظ می‌شود) — no-op."""
    return


class Migration(migrations.Migration):

    dependencies = [
        ('correspondences', '0018_letter_contract'),
    ]

    operations = [
        migrations.RunPython(backfill, unbackfill),
    ]
