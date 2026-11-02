"""seed انواع مزایای پیش‌فرض برای همهٔ شرکت‌های موجود."""
from django.db import migrations

DEFAULT_BENEFIT_TYPES = [
    ('performance', 'کارانه'),
    ('eid_fitr', 'عید سعید فطر'),
    ('eid_adha', 'عید سعید قربان'),
    ('eid_ghadir', 'عید سعید غدیر خم'),
    ('imam_reza_birthday', 'تولد امام رضا (ع)'),
    ('sports_allowance', 'کمک هزینه ورزش'),
    ('yalda_night', 'شب یلدا'),
    ('bahman_22', '۲۲ بهمن'),
    ('eid_mabath', 'عید مبعث'),
    ('nowruz_basket', 'سبد نوروزی'),
    ('fatima_birthday', 'تولد حضرت زهرا (س) و روز زن'),
    ('ali_birthday', 'تولد حضرت علی (ع) و روز مرد'),
    ('allowance', 'کمک هزینه'),
    ('birthday', 'زادروز'),
    ('ramadan_basket', 'سبد ماه مبارک رمضان'),
]


def seed_benefit_types(apps, schema_editor):
    Company = apps.get_model('core', 'Company')
    BenefitTypeDefinition = apps.get_model('payroll', 'BenefitTypeDefinition')

    for company in Company.objects.all():
        existing = set(
            BenefitTypeDefinition.objects.filter(company=company).values_list('code', flat=True),
        )
        rows = [
            BenefitTypeDefinition(company=company, code=code, title=title)
            for code, title in DEFAULT_BENEFIT_TYPES
            if code not in existing
        ]
        if rows:
            BenefitTypeDefinition.objects.bulk_create(rows, ignore_conflicts=True)


def unseed_benefit_types(apps, schema_editor):
    BenefitTypeDefinition = apps.get_model('payroll', 'BenefitTypeDefinition')
    codes = [code for code, _title in DEFAULT_BENEFIT_TYPES]
    BenefitTypeDefinition.objects.filter(code__in=codes, suggested_date__isnull=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('payroll', '0006_benefit_type_definitions'),
        ('core', '0016_enable_document_management_module'),
    ]

    operations = [
        migrations.RunPython(seed_benefit_types, unseed_benefit_types),
    ]
