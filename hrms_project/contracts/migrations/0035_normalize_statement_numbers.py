from django.db import migrations

_DIGIT_MAP = str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789')


def normalize_number(value):
    text = str(value or '').translate(_DIGIT_MAP).strip()
    if not text:
        return ''
    if text.isdigit():
        digits = text.lstrip('0') or '0'
        return digits.zfill(2)
    return text


def normalize_statement_numbers(apps, schema_editor):
    Statement = apps.get_model('contracts', 'Statement')
    for statement in Statement.objects.exclude(number='').only('id', 'number').iterator():
        normalized = normalize_number(statement.number)
        if normalized != statement.number:
            Statement.objects.filter(pk=statement.pk).update(number=normalized)


class Migration(migrations.Migration):

    dependencies = [
        ('contracts', '0034_statement_foreign_totals'),
    ]

    operations = [
        migrations.RunPython(normalize_statement_numbers, migrations.RunPython.noop),
    ]
