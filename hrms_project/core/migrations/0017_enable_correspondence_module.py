from django.db import migrations


def enable_correspondence(apps, schema_editor):
    Application = apps.get_model('core', 'Application')
    Application.objects.update_or_create(
        slug='correspondence',
        defaults={
            'title': 'مکاتبات اداری',
            'description': 'دفتر وارده و صادره، ارجاع چندسطحی، پیگرد پاسخ، بایگانی و گزارش مکاتبات',
            'icon': '📨',
            'color': '#0ea5e9',
            'order': 9,
            'is_coming_soon': False,
            'is_active': True,
        },
    )


def disable_correspondence(apps, schema_editor):
    Application = apps.get_model('core', 'Application')
    Application.objects.filter(slug='correspondence').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0016_enable_document_management_module'),
    ]

    operations = [
        migrations.RunPython(enable_correspondence, disable_correspondence),
    ]
