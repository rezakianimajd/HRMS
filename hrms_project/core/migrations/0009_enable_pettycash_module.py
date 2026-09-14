from django.db import migrations


def enable_pettycash(apps, schema_editor):
    Application = apps.get_model('core', 'Application')
    Application.objects.update_or_create(
        slug='pettycash',
        defaults={
            'title': 'تنخواه',
            'description': 'مدیریت تنخواه‌داران، تراکنش‌ها، دفتر حساب و بایگانی',
            'icon': '💳',
            'color': '#f59e0b',
            'order': 4,
            'is_coming_soon': False,
            'is_active': True,
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_enable_projects_module'),
    ]

    operations = [
        migrations.RunPython(enable_pettycash),
    ]