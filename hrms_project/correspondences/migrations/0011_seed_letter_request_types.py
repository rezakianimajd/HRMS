from django.db import migrations

REQUEST_TYPES = [
    ('مرخصی', 'leave', 'هتل', '#0ea5e9', False, 1, 1),
    ('وام / مساعده', 'loan', 'account_balance', '#b45309', True, 2, 2),
    ('گواهی اشتغال', 'certificate', 'badge', '#0f766e', False, 1, 3),
    ('ماموریت', 'mission', 'flight', '#7c3aed', False, 1, 4),
    ('اضافه‌کاری', 'overtime', 'schedule', '#0891b2', False, 1, 5),
    ('درخواست اداری', 'administrative', 'description', '#475569', False, 1, 6),
    ('سایر درخواست‌ها', 'other', 'help_outline', '#64748b', False, 1, 99),
]


def seed_request_types(apps, schema_editor):
    Company = apps.get_model('core', 'Company')
    LetterRequestType = apps.get_model('correspondences', 'LetterRequestType')

    for company in Company.objects.filter(is_active=True):
        for name, code, icon, color, needs_file, levels, order in REQUEST_TYPES:
            LetterRequestType.objects.update_or_create(
                company=company, code=code,
                defaults={
                    'name': name,
                    'icon': icon,
                    'color': color,
                    'requires_attachment': needs_file,
                    'approval_levels': levels,
                    'order': order,
                },
            )


def unseed_request_types(apps, schema_editor):
    LetterRequestType = apps.get_model('correspondences', 'LetterRequestType')
    LetterRequestType.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0017_enable_correspondence_module'),
        ('correspondences', '0010_letter_delivery_parties_and_workdesk'),
    ]

    operations = [
        migrations.RunPython(seed_request_types, unseed_request_types),
    ]
