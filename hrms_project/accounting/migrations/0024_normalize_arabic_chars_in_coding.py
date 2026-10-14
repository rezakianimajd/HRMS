"""یکسان‌سازی حروف عربی «ي/ك/ى» به «ی/ک» در تمام کدینگ حسابداری (داده‌های موجود).

همین قاعده در سطح مدل هم فعال است (`PersianNormalizedMixin`) تا رکوردهای جدید از ابتدا
درست ذخیره شوند؛ این مهاجرت داده‌های قبلی را اصلاح می‌کند. حذف/بازگردانی ندارد
(تبدیل یک‌طرفه و بی‌خطر است).
"""
from django.db import migrations, models as dj_models

# مدل‌های «کدینگ» و متنی حسابداری که باید یکسان‌سازی شوند
MODELS = [
    'Branch', 'FiscalYear', 'FiscalPeriod', 'AccountingBook',
    'AccountType', 'AccountGroup', 'Account',
    'AuxiliaryCategory', 'AuxiliaryAccount',
    'AccountingDimension', 'DimensionValue', 'CostCenter', 'Journal',
    'AccountingDocument', 'AccountingDocumentLine',
    'PostingTemplate', 'PostingTemplateLine',
    'BankStatement', 'BankStatementLine',
    'AccountingSequence', 'ApprovalPolicy', 'ApprovalStep',
    'CodingConfig', 'AccountingSettings', 'FinancialStatementApproval',
]

EXCLUDED_FIELDS = {'nature', 'status', 'debit', 'credit', 'category', 'default_nature'}


def _text_fields(model):
    names = []
    for field in model._meta.concrete_fields:
        if not isinstance(field, (dj_models.CharField, dj_models.TextField)):
            continue
        if field.choices or field.attname in EXCLUDED_FIELDS:
            continue
        names.append(field.attname)
    return names


def normalize_coding(apps, schema_editor):
    from accounting.text_normalization import normalize_persian

    for name in MODELS:
        model = apps.get_model('accounting', name)
        fields = _text_fields(model)
        if not fields:
            continue
        for obj in model.objects.all().iterator():
            changed = []
            for field in fields:
                value = getattr(obj, field, None)
                if not isinstance(value, str) or not value:
                    continue
                fixed = normalize_persian(value)
                if fixed != value:
                    setattr(obj, field, fixed)
                    changed.append(field)
            if changed:
                try:
                    obj.save(update_fields=changed)
                except Exception:      # noqa: BLE001 — تعارض یکتایی/خطای ردیف: ردیف بعدی
                    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounting', '0023_coding_locked_fields'),
    ]

    operations = [
        migrations.RunPython(normalize_coding, migrations.RunPython.noop),
    ]
