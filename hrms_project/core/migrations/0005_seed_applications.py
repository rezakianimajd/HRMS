from django.db import migrations


def seed_applications(apps, schema_editor):
    Application = apps.get_model('core', 'Application')
    apps_to_create = [
        {
            'slug': 'hrms',
            'title': 'مدیریت منابع انسانی',
            'description': 'پرسنل، حضور و غیاب، مرخصی، مالی، مکاتبات و داشبورد',
            'icon': 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
            'color': '#6366f1',
            'order': 1,
        },
        {
            'slug': 'contracts',
            'title': 'مدیریت قراردادها',
            'description': 'قراردادها، نسخه‌بندی، امضای دیجیتال و صاحبان امضا',
            'icon': 'https://cdn-icons-png.flaticon.com/512/2991/2991106.png',
            'color': '#f59e0b',
            'order': 2,
        },
    ]
    for cfg in apps_to_create:
        Application.objects.get_or_create(slug=cfg['slug'], defaults=cfg)


def remove_applications(apps, schema_editor):
    Application = apps.get_model('core', 'Application')
    Application.objects.filter(slug__in=['hrms', 'contracts']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_application_userprofile_apps'),
    ]

    operations = [
        migrations.RunPython(seed_applications, remove_applications),
    ]