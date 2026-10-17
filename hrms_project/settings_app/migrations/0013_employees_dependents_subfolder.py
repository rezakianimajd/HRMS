# افزودن زیرپوشهٔ «افراد تحت تکفل» به پروفایل بایگانی پرسنل
from django.db import migrations

DEPENDENTS_FOLDER = 'افراد تحت تکفل'
MODULE_KEY = 'hr.employees'


def add_dependents_subfolder(apps, schema_editor):
    StorageProfile = apps.get_model('settings_app', 'StorageProfile')
    for profile in StorageProfile.objects.filter(module_key=MODULE_KEY).only('id', 'subfolders'):
        subfolders = list(profile.subfolders or [])
        if DEPENDENTS_FOLDER in subfolders:
            continue
        # قبل از «سایر» اضافه می‌شود تا ترتیب پوشه‌ها منطقی بماند
        if 'سایر' in subfolders:
            subfolders.insert(subfolders.index('سایر'), DEPENDENTS_FOLDER)
        else:
            subfolders.append(DEPENDENTS_FOLDER)
        StorageProfile.objects.filter(pk=profile.pk).update(subfolders=subfolders)


def remove_dependents_subfolder(apps, schema_editor):
    StorageProfile = apps.get_model('settings_app', 'StorageProfile')
    for profile in StorageProfile.objects.filter(module_key=MODULE_KEY).only('id', 'subfolders'):
        subfolders = [s for s in (profile.subfolders or []) if s != DEPENDENTS_FOLDER]
        StorageProfile.objects.filter(pk=profile.pk).update(subfolders=subfolders)


class Migration(migrations.Migration):

    dependencies = [
        ('settings_app', '0012_storageprofile_archivefolder'),
    ]

    operations = [
        migrations.RunPython(add_dependents_subfolder, remove_dependents_subfolder),
    ]
