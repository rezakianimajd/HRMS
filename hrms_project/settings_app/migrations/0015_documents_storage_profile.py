from django.db import migrations

DOCUMENTS_PROFILE = {
    'module_key': 'hr.documents.management',
    'module_name': 'مدیریت اسناد و مدارک',
    'root_folder': 'documents',
    'entity_folder_pattern': '{folder}_{name}',
    'subfolders': ['نسخه‌ها', 'پیوست‌ها', 'فایل‌های موقت'],
    'allowed_extensions': [
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.txt', '.csv', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
        '.zip', '.rar',
    ],
    'max_file_size_mb': 50,
    'include_company': True,
    'color': '#0f766e',
    'icon': 'folder_copy',
    'sort_order': 9,
    'description': 'پروفایل بایگانی کتابخانهٔ مرکزی مدیریت اسناد و مدارک',
}


def seed_documents_profile(apps, schema_editor):
    StorageProfile = apps.get_model('settings_app', 'StorageProfile')
    tenant = getattr(schema_editor.connection, 'tenant', None)
    company_id = getattr(tenant, 'pk', None)
    if not company_id:
        return
    defaults = {
        key: value for key, value in DOCUMENTS_PROFILE.items()
        if key != 'module_key'
    }
    StorageProfile.objects.get_or_create(
        company_id=company_id,
        module_key=DOCUMENTS_PROFILE['module_key'],
        defaults=defaults,
    )


def remove_documents_profile(apps, schema_editor):
    StorageProfile = apps.get_model('settings_app', 'StorageProfile')
    StorageProfile.objects.filter(
        module_key=DOCUMENTS_PROFILE['module_key']
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('settings_app', '0014_normalize_iran_rial_label'),
    ]

    operations = [
        migrations.RunPython(seed_documents_profile, remove_documents_profile),
    ]
