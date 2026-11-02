"""انتقال یک‌بارهٔ افراد تحت تکفل بیمهٔ تکمیلی به بخش «خانواده» پروندهٔ پرسنلی."""
from django.db import migrations


def backfill_family_members(apps, schema_editor):
    try:
        from employees.family_sync import sync_all_families
    except Exception:  # noqa: BLE001
        return
    try:
        sync_all_families()
    except Exception:  # noqa: BLE001 — داده‌های ناقص نباید مایگریشن را متوقف کند
        pass


def noop_reverse(apps, schema_editor):
    """بازگشت لازم نیست؛ رکوردهای ساخته‌شده با حذف جدول از بین می‌روند."""


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0023_employeefamilymember'),
    ]

    operations = [
        migrations.RunPython(backfill_family_members, noop_reverse),
    ]
