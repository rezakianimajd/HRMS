"""تکمیل اطلاعات ورود (ساعت و ثبت‌کننده) برای نامه‌های واردشده از اکسل."""
import gzip
import json
from datetime import time
from pathlib import Path

from django.db import migrations

DATA_FILE = Path(__file__).resolve().parent.parent / 'data' / 'legacy_letters.json.gz'


def backfill_entry_details(apps, schema_editor):
    schema = schema_editor.connection.schema_name
    if schema == 'public' or not DATA_FILE.exists():
        return
    Company = apps.get_model('core', 'Company')
    company = Company.objects.filter(schema_name=schema).first()
    if not company:
        return
    with gzip.open(DATA_FILE, 'rt', encoding='utf-8') as handle:
        rows = json.load(handle)
    payload = {
        row['source_ref']: row
        for row in rows
        if row.get('entry_time') or row.get('entered_by_name')
    }
    if not payload:
        return

    Letter = apps.get_model('correspondences', 'Letter')
    refs = list(payload.keys())
    for start in range(0, len(refs), 300):
        chunk = refs[start:start + 300]
        pending = []
        for letter in Letter.objects.filter(company=company, source_ref__in=chunk):
            row = payload.get(letter.source_ref)
            if not row:
                continue
            changed = False
            if not letter.entry_time and row.get('entry_time'):
                try:
                    letter.entry_time = time.fromisoformat(str(row['entry_time']))
                    changed = True
                except ValueError:
                    pass
            if not letter.entered_by_name and row.get('entered_by_name'):
                letter.entered_by_name = str(row['entered_by_name'])[:200]
                changed = True
            if changed:
                pending.append(letter)
        if pending:
            Letter.objects.bulk_update(pending, ['entry_time', 'entered_by_name'], batch_size=200)


class Migration(migrations.Migration):

    dependencies = [
        ('correspondences', '0008_letter_company_reg_date_letter_company_reg_no_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_entry_details, migrations.RunPython.noop),
    ]
