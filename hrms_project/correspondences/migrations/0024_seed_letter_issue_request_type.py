from django.db import migrations


def seed_letter_issue_type(apps, schema_editor):
    LetterRequestType = apps.get_model('correspondences', 'LetterRequestType')
    Company = apps.get_model('core', 'Company')
    company = Company.objects.filter(schema_name=schema_editor.connection.schema_name).first()
    if not company:
        return
    LetterRequestType.objects.update_or_create(
        company_id=company.pk,
        code='letter_issue',
        defaults={
            'name': 'درخواست صدور نامه',
            'icon': 'mail',
            'color': '#0ea5e9',
            'description': 'درخواست صدور و ارسال نامه با موضوع، متن و گیرندهٔ مشخص',
            'requires_attachment': False,
            'approval_levels': 1,
            'order': 5,
        },
    )


def remove_letter_issue_type(apps, schema_editor):
    LetterRequestType = apps.get_model('correspondences', 'LetterRequestType')
    LetterRequestType.objects.filter(code='letter_issue').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('correspondences', '0023_alter_letterevent_action'),
    ]

    operations = [
        migrations.RunPython(seed_letter_issue_type, remove_letter_issue_type),
    ]
