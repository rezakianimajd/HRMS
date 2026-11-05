# Generated manually — ارجاع‌های بسته‌شده/تاریخی دیگر «دیده‌نشده» شمرده نشوند

from django.db import migrations
from django.utils import timezone

CLOSED_STATUSES = ('done', 'canceled', 'returned')


def mark_closed_as_seen(apps, schema_editor):
    """ارجاع‌هایی که وضعیتشان بسته است، «دیده‌شده» علامت می‌خورند.

    ارجاع‌های تاریخی واردشده از اکسل با وضعیت «اقدام شد» ثبت شده‌اند و بدون
    ``seen_at`` باعث می‌شدند شمارندهٔ «دیده‌نشده» کارتابل اشتباه پر شود.
    """
    LetterReferral = apps.get_model('correspondences', 'LetterReferral')
    LetterReferral.objects.filter(
        seen_at__isnull=True, status__in=CLOSED_STATUSES,
    ).update(seen_at=timezone.now())


class Migration(migrations.Migration):

    dependencies = [
        ('correspondences', '0013_letter_referral_multi_targets'),
    ]

    operations = [
        migrations.RunPython(mark_closed_as_seen, migrations.RunPython.noop),
    ]
