"""Seed قالب‌های پیش‌فرض چاپ خزانه + تنظیمات هر شرکت."""
from django.db import migrations

TEMPLATES = [
    ('receipt', 'فیش دریافت — قالب استاندارد', 'A5'),
    ('payment', 'فیش پرداخت — قالب استاندارد', 'A5'),
    ('bank_order', 'دستور پرداخت بین‌بانکی — استاندارد', 'A4'),
]


def seed(apps, schema_editor):
    Company = apps.get_model('core', 'Company')
    Template = apps.get_model('treasury', 'TreasuryPrintTemplate')
    Settings = apps.get_model('treasury', 'TreasurySettings')

    # بدنهٔ پیش‌فرض از ماژول زنده خوانده می‌شود (نسخهٔ واحد قالب)
    from treasury.print_templates import default_templates

    defaults = {row['kind']: row for row in default_templates()}
    for company in Company.objects.filter(is_active=True).iterator():
        Settings.objects.get_or_create(company=company)
        for kind, title, paper in TEMPLATES:
            payload = defaults.get(kind, {})
            Template.objects.get_or_create(
                company=company, kind=kind, name=title,
                defaults={
                    'body': payload.get('body', '{{number}}'),
                    'paper': paper,
                    'is_default': True,
                },
            )


def unseed(apps, schema_editor):
    Template = apps.get_model('treasury', 'TreasuryPrintTemplate')
    Template.objects.filter(kind__in=[row[0] for row in TEMPLATES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('treasury', '0009_treasurynumberingsetting_bank_order_prefix_and_more'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
