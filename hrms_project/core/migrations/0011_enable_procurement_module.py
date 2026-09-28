from django.db import migrations


def enable_procurement(apps, schema_editor):
    Application = apps.get_model('core', 'Application')
    Application.objects.update_or_create(
        slug='procurement',
        defaults={
            'title': 'خرید و تدارکات',
            'description': 'چرخهٔ کامل تدارکات: درخواست خرید، سفارش، رسید کالا، صورتحساب و پرداخت',
            'icon': '🛒',
            'color': '#f59e0b',
            'order': 6,
            'is_coming_soon': False,
            'is_active': True,
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_enable_accounting_module'),
    ]

    operations = [
        migrations.RunPython(enable_procurement),
    ]