"""تفکیک تیک «شامل اضافات و کسورات» سطوح به دو تیک مستقل.

دادهٔ قبلی: هر سطح فقط ``includes_charges`` داشت. برای اینکه صورت‌وضعیت‌های
قدیمی خراب نشوند، اگر آن تیک فعال بوده **هر دو** تیک جدید فعال می‌شوند و اگر
غیرفعال بوده هر دو غیرفعال می‌مانند. کلید قدیمی برای سازگاری حفظ می‌شود.
"""
from django.db import migrations


def split_flags(apps, schema_editor):
    Statement = apps.get_model('contracts', 'Statement')
    updates = []
    for row in Statement.objects.exclude(levels=[]).only('id', 'levels').iterator():
        levels = row.levels if isinstance(row.levels, list) else []
        changed = False
        next_levels = []
        for level in levels:
            if not isinstance(level, dict):
                next_levels.append(level)
                continue
            legacy = bool(level.get('includes_charges'))
            additions = level.get('includes_additions')
            deductions = level.get('includes_deductions')
            includes_additions = legacy if additions is None else bool(additions)
            includes_deductions = legacy if deductions is None else bool(deductions)
            if (
                level.get('includes_additions') != includes_additions
                or level.get('includes_deductions') != includes_deductions
                or level.get('includes_charges') != (includes_additions and includes_deductions)
            ):
                level = {
                    **level,
                    'includes_additions': includes_additions,
                    'includes_deductions': includes_deductions,
                    'includes_charges': includes_additions and includes_deductions,
                }
                changed = True
            next_levels.append(level)
        if changed:
            updates.append((row.pk, next_levels))
    for pk, levels in updates:
        Statement.objects.filter(pk=pk).update(levels=levels)
    return len(updates)


def noop(apps, schema_editor):
    """بازگشت لازم نیست؛ کلید قدیمی دست‌نخورده می‌ماند."""


class Migration(migrations.Migration):

    dependencies = [
        ('contracts', '0045_alter_guarantee_last_action_and_more'),
    ]

    operations = [
        migrations.RunPython(split_flags, noop),
    ]
