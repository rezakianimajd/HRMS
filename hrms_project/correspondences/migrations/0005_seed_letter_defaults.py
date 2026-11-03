from django.db import migrations

CATEGORIES = [
    ('درخواست', 'request', 'both', '#0ea5e9', 1),
    ('پاسخ / ارسال', 'reply', 'both', '#0f766e', 2),
    ('ابلاغ / بخشنامه', 'circular', 'both', '#7c3aed', 3),
    ('معرفی‌نامه', 'introduction', 'outgoing', '#0891b2', 4),
    ('نامه مالی', 'finance', 'both', '#b45309', 5),
    ('اطلاعیه', 'notice', 'both', '#475569', 6),
    ('سایر', 'other', 'both', '#64748b', 99),
]

SERIES = [
    ('وارده پیش‌فرض', 'incoming', 'و', '{prefix}/{year}/{seq}', True),
    ('صادره پیش‌فرض', 'outgoing', 'ص', '{prefix}/{year}/{seq}', True),
    ('داخلی پیش‌فرض', 'internal', 'د', '{prefix}/{year}/{seq}', True),
]


def seed_defaults(apps, schema_editor):
    Company = apps.get_model('core', 'Company')
    LetterCategory = apps.get_model('correspondences', 'LetterCategory')
    LetterSeries = apps.get_model('correspondences', 'LetterSeries')

    for company in Company.objects.filter(is_active=True):
        for name, code, direction, color, order in CATEGORIES:
            LetterCategory.objects.update_or_create(
                company=company, code=code,
                defaults={'name': name, 'direction': direction, 'color': color, 'order': order},
            )
        for title, direction, prefix, template, is_default in SERIES:
            LetterSeries.objects.update_or_create(
                company=company, title=title, direction=direction,
                defaults={
                    'prefix': prefix,
                    'template': template,
                    'is_default': is_default,
                },
            )


def unseed_defaults(apps, schema_editor):
    LetterCategory = apps.get_model('correspondences', 'LetterCategory')
    LetterSeries = apps.get_model('correspondences', 'LetterSeries')
    LetterCategory.objects.all().delete()
    LetterSeries.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0017_enable_correspondence_module'),
        ('correspondences', '0004_correspondent_letter_letterattachment_lettercategory_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_defaults, unseed_defaults),
    ]
