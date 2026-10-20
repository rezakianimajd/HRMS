from django.db import migrations


def enable_document_management(apps, schema_editor):
    Application = apps.get_model('core', 'Application')
    Application.objects.update_or_create(
        slug='documents',
        defaults={
            'title': 'مدیریت اسناد و مدارک',
            'description': 'کتابخانه مرکزی اسناد، پوشه‌بندی، نسخه‌بندی، محرمانگی و تاریخچه فعالیت',
            'icon': '📁',
            'color': '#0f766e',
            'order': 3,
            'is_coming_soon': False,
            'is_active': True,
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0015_updatesettings_notify_bale_and_more'),
    ]

    operations = [
        migrations.RunPython(enable_document_management),
    ]
