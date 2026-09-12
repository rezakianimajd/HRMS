from django.db import migrations


def seed_applications(apps, schema_editor):
    Application = apps.get_model('core', 'Application')
    # Only fields available at this migration point (no is_coming_soon yet).
    active = [
        {
            'slug': 'hrms',
            'title': 'منابع انسانی',
            'description': 'پرسنل، حضور و غیاب، مرخصی، حقوق، مکاتبات و داشبورد',
            'icon': '👥',
            'color': '#6366f1',
            'order': 1,
        },
        {
            'slug': 'contracts',
            'title': 'مدیریت قراردادها',
            'description': 'قراردادهای برون‌سازمانی، فاکتور، صورت‌وضعیت، تضامین و پرداخت',
            'icon': '📄',
            'color': '#f59e0b',
            'order': 2,
        },
    ]
    for cfg in active:
        Application.objects.update_or_create(slug=cfg['slug'], defaults=cfg)


def remove_applications(apps, schema_editor):
    Application = apps.get_model('core', 'Application')
    Application.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_application_userprofile_apps'),
    ]

    operations = [
        migrations.RunPython(seed_applications, remove_applications),
    ]