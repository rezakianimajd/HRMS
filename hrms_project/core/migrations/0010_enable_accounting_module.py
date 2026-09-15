from django.db import migrations


def enable_accounting(apps, schema_editor):
    Application = apps.get_model('core', 'Application')
    Application.objects.update_or_create(
        slug='accounting',
        defaults={
            'title': 'حسابداری',
            'description': 'هسته مالی مرکزی EBP — اسناد، سرفصل حساب‌ها و گزارش‌های مالی',
            'icon': '🧮',
            'color': '#3b82f6',
            'order': 5,
            'is_coming_soon': False,
            'is_active': True,
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0009_enable_pettycash_module'),
    ]

    operations = [
        migrations.RunPython(enable_accounting),
    ]