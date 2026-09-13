from django.db import migrations


def enable_projects(apps, schema_editor):
    Application = apps.get_model('core', 'Application')
    Application.objects.filter(slug='projects').update(
        is_coming_soon=False,
        is_active=True,
        order=3,
    )


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0007_enable_settings_module'),
    ]

    operations = [
        migrations.RunPython(enable_projects),
    ]