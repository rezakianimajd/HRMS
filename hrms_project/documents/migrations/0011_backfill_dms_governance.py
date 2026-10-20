"""بک‌فیل داده‌های مدیریت اسناد پس از Migration ساختاری 0010.

این عملیات عمداً از 0010 جدا شده است؛ PostgreSQL اجازه نمی‌دهد در همان
تراکنشی که رکوردها به‌روزرسانی می‌شوند، ایندکس جدید ساخته شود
(خطای ``pending trigger events``). Migration ساختاری ابتدا ایندکس‌ها را
می‌سازد و این Migration سپس داده‌های قبلی را سازگار می‌کند.
"""
from django.db import migrations


def backfill_governance(apps, schema_editor):
    """اسناد قدیمی کنترل‌شدهٔ جدید محسوب نمی‌شوند و وضعیت آن‌ها حفظ می‌شود."""
    ManagedDocument = apps.get_model('documents', 'ManagedDocument')

    ManagedDocument.objects.filter(is_indexed=True).update(
        is_controlled=False,
        workflow_status='published',
    )
    ManagedDocument.objects.filter(
        is_indexed=True, metadata={},
    ).update(metadata={'legacy_indexed': True, 'source': 'archive_sync'})

    ManagedDocument.objects.filter(is_indexed=False).update(is_controlled=False)
    ManagedDocument.objects.filter(status='draft').update(workflow_status='draft')
    ManagedDocument.objects.filter(status='archived').update(
        workflow_status='archived',
    )
    ManagedDocument.objects.exclude(status__in=['draft', 'archived']).update(
        workflow_status='published',
    )


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ('documents', '0010_dms_governance_metadata'),
    ]

    operations = [
        migrations.RunPython(backfill_governance, migrations.RunPython.noop),
    ]
