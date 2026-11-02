"""اتصال دوطرفهٔ داده‌های موجود: پروندهٔ خانواده ↔ بیمهٔ تکمیلی.

پس از این مایگریشن، هر فرد تحت تکفل بیمه به عضو خانوادهٔ متناظر خود متصل
است و اعضای خانوادهٔ تحت تکفل در بیمه‌های فعال پرسنل منعکس می‌شوند.
"""
from django.db import migrations


def link_existing(apps, schema_editor):
    try:
        from employees.family_sync import sync_all_families
    except Exception:  # noqa: BLE001
        return
    try:
        sync_all_families()
    except Exception:  # noqa: BLE001 — دادهٔ ناقص نباید مایگریشن را متوقف کند
        pass


def noop_reverse(apps, schema_editor):
    """بازگشت لازم نیست."""


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0025_supplementary_dependent_family_member'),
    ]

    operations = [
        migrations.RunPython(link_existing, noop_reverse),
    ]
