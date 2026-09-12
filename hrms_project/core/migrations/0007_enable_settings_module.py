from django.db import migrations


def enable_settings(apps, schema_editor):
    Application = apps.get_model('core', 'Application')
    Application.objects.filter(slug='settings').update(
        is_coming_soon=False,
        is_active=True,
        order=12,
    )


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_application_is_coming_soon'),
    ]

    operations = [
        migrations.RunPython(enable_settings),
    ]