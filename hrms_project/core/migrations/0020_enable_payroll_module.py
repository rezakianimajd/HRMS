from django.db import migrations


def enable_payroll(apps, schema_editor):
    Application = apps.get_model('core', 'Application')
    Application.objects.update_or_create(
        slug='payroll',
        defaults={
            'title': 'حقوق و دستمزد',
            'description': 'دوره‌های حقوق، محاسبهٔ مؤلفه‌محور، بیمه و مالیات، فیش حقوقی، پرداخت و بهای تمام‌شده',
            'icon': '💳',
            'color': '#3b82f6',
            'order': 4,
            'is_coming_soon': False,
            'is_active': True,
        },
    )


def disable_payroll(apps, schema_editor):
    Application = apps.get_model('core', 'Application')
    Application.objects.filter(slug='payroll').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0019_useraccess'),
    ]

    operations = [
        migrations.RunPython(enable_payroll, disable_payroll),
    ]
