from django.db import migrations


def enable_treasury(apps, schema_editor):
    Application = apps.get_model('core', 'Application')
    Application.objects.update_or_create(
        slug='treasury',
        defaults={
            'title': 'خزانه‌داری',
            'description': 'مدیریت وجوه نقد، بانک و صندوق، تراکنش‌ها و قابل‌پرداخت‌ها',
            'icon': '🏦',
            'color': '#14b8a6',
            'order': 7,
            'is_coming_soon': False,
            'is_active': True,
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_enable_procurement_module'),
    ]

    operations = [
        migrations.RunPython(enable_treasury),
    ]