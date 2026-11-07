"""Seed قالب‌های «حواله بین‌بانکی (شبا)» و «فیش نقدی» بر پایهٔ الگوی فیش بانک پاسارگاد."""
from django.db import migrations

TEMPLATES = [
    ('interbank', 'حواله بین‌بانکی (شبا) — الگوی بانک پاسارگاد', 'A4'),
    ('cash', 'فیش نقدی — الگوی بانک پاسارگاد', 'A5'),
]


def seed(apps, schema_editor):
    Company = apps.get_model('core', 'Company')
    Template = apps.get_model('treasury', 'TreasuryPrintTemplate')

    from treasury.print_templates import default_templates

    defaults = {row['kind']: row for row in default_templates()}
    for company in Company.objects.filter(is_active=True).iterator():
        for kind, title, paper in TEMPLATES:
            payload = defaults.get(kind, {})
            Template.objects.get_or_create(
                company=company,
                kind=kind,
                name=title,
                defaults={
                    'body': payload.get('body', '{{number}}'),
                    'paper': paper,
                    'is_default': True,
                    'note': 'چیدمان بر اساس فرم‌های بانک پاسارگاد',
                },
            )


def unseed(apps, schema_editor):
    Template = apps.get_model('treasury', 'TreasuryPrintTemplate')
    Template.objects.filter(kind__in=[row[0] for row in TEMPLATES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('treasury', '0011_treasurytransaction_destination_account_number_and_more'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
