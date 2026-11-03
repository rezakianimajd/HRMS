"""ورود یک‌بارهٔ داده‌های تاریخی دفتر مکاتبات از بستهٔ JSON (خروجی اکسل).

این مایگریشن در هر اسکیمای شرکت (غیر از public) اجرا می‌شود و ردیف‌های
`correspondences/data/legacy_letters.json.gz` را به‌صورت تکرارناپذیر
(بر اساس `source_ref`) وارد می‌کند.
"""
import gzip
import hashlib
import json
from datetime import date
from decimal import Decimal
from pathlib import Path

from django.db import migrations
from django.utils import timezone

DATA_FILE = Path(__file__).resolve().parent.parent / 'data' / 'legacy_letters.json.gz'
BATCH = 250

CATEGORY_SEEDS = {
    'contract': ('قرارداد و الحاقیه', 'internal', '#f59e0b', 10),
}


def _iso(value):
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _rows():
    with gzip.open(DATA_FILE, 'rt', encoding='utf-8') as handle:
        return json.load(handle)


def _prepare(apps, company):
    Letter = apps.get_model('correspondences', 'Letter')
    LetterCategory = apps.get_model('correspondences', 'LetterCategory')
    Organization = apps.get_model('correspondences', 'Organization')

    categories = {row.code: row for row in LetterCategory.objects.filter(company=company)}
    for code, (name, direction, color, order) in CATEGORY_SEEDS.items():
        if code not in categories:
            categories[code] = LetterCategory.objects.create(
                company=company, code=code, name=name, direction=direction,
                color=color, order=order, description='ورود تاریخی',
            )

    org_cache = {row.name.strip(): row for row in Organization.objects.filter(company=company)}
    rows = _rows()
    wanted = {str(row.get('organization_name') or '').strip() for row in rows}
    wanted.discard('')
    new_orgs = []
    for name in wanted:
        if name in org_cache:
            continue
        digest = hashlib.sha1(name.encode('utf-8')).hexdigest()[:10].upper()
        new_orgs.append(Organization(
            company=company, name=name[:200], code=f'LEG-{digest}', type='other',
        ))
    if new_orgs:
        Organization.objects.bulk_create(new_orgs, batch_size=200, ignore_conflicts=True)
        for row in Organization.objects.filter(
            company=company, code__in=[item.code for item in new_orgs],
        ):
            org_cache[row.name.strip()] = row

    existing = set(Letter.objects.filter(company=company).values_list('source_ref', flat=True))
    pending = [row for row in rows if row.get('source_ref') not in existing]
    return categories, org_cache, rows, pending

def import_legacy(apps, schema_editor):
    schema = schema_editor.connection.schema_name
    if schema == 'public' or not DATA_FILE.exists():
        return
    Company = apps.get_model('core', 'Company')
    company = Company.objects.filter(schema_name=schema).first()
    if not company:
        return

    Letter = apps.get_model('correspondences', 'Letter')
    LetterEvent = apps.get_model('correspondences', 'LetterEvent')
    LetterReferral = apps.get_model('correspondences', 'LetterReferral')

    categories, org_cache, _rows_all, pending = _prepare(apps, company)
    if not pending:
        return
    now = timezone.now()

    def build(row):
        org_name = str(row.get('organization_name') or '').strip()
        amount = row.get('amount')
        status = row.get('status') or 'registered'
        return Letter(
            company=company,
            direction=row['direction'],
            number=(row.get('number') or '')[:60],
            subject=(row.get('subject') or 'بدون موضوع')[:500],
            summary=row.get('summary') or '',
            letter_date=_iso(row.get('letter_date')) or date(2024, 3, 20),
            received_date=_iso(row.get('received_date')),
            sent_date=_iso(row.get('sent_date')),
            organization=org_cache.get(org_name) if org_name else None,
            sender_name=(row.get('sender_name') or '')[:200],
            receiver_name=(row.get('receiver_name') or '')[:200],
            drafter_name=(row.get('drafter_name') or '')[:200],
            transmittal_no=(row.get('transmittal_no') or '')[:60],
            indicator_no=(row.get('indicator_no') or '')[:60],
            amount=Decimal(str(amount)) if amount not in (None, '') else None,
            currency='ریال',
            archive_ref=(row.get('archive_ref') or '')[:60],
            contract_number=(row.get('contract_number') or '')[:60],
            category=categories.get(row.get('category_code') or ''),
            status=status,
            priority='normal',
            confidentiality='normal',
            source_ref=row['source_ref'],
            tags=row.get('tags') or [],
            archived_at=now if status == 'archived' else None,
        )

    for start in range(0, len(pending), BATCH):
        Letter.objects.bulk_create(
            [build(row) for row in pending[start:start + BATCH]],
            batch_size=200, ignore_conflicts=True,
        )

    referrals = []
    events = []
    for start in range(0, len(pending), BATCH):
        chunk = pending[start:start + BATCH]
        refs = [row['source_ref'] for row in chunk]
        letters = {
            item.source_ref: item
            for item in Letter.objects.filter(company=company, source_ref__in=refs)
        }
        for row in chunk:
            letter = letters.get(row['source_ref'])
            if not letter:
                continue
            for index, referral in enumerate(row.get('referrals') or [], start=1):
                referrals.append(LetterReferral(
                    company=company, letter=letter, seq=index,
                    to_name=(referral.get('to_name') or '')[:200],
                    referred_on=_iso(referral.get('referred_on')) or letter.letter_date or now.date(),
                    status='done',
                    result_note='ارجاع تاریخی (واردشده از فایل اکسل)',
                    done_at=now,
                ))
            events.append(LetterEvent(
                company=company, letter=letter, action='created',
                note=f'ورود از فایل اکسل — شیت «{row.get("sheet", "")}»',
                meta={'source_ref': row['source_ref'], 'excel_row': row.get('excel_row')},
            ))
        if len(referrals) >= 500:
            LetterReferral.objects.bulk_create(referrals, batch_size=300)
            referrals = []
        if len(events) >= 500:
            LetterEvent.objects.bulk_create(events, batch_size=500)
            events = []
    if referrals:
        LetterReferral.objects.bulk_create(referrals, batch_size=300)
    if events:
        LetterEvent.objects.bulk_create(events, batch_size=500)


def remove_legacy(apps, schema_editor):
    schema = schema_editor.connection.schema_name
    if schema == 'public':
        return
    Company = apps.get_model('core', 'Company')
    company = Company.objects.filter(schema_name=schema).first()
    if not company:
        return
    Letter = apps.get_model('correspondences', 'Letter')
    Letter.objects.filter(
        company=company,
        source_ref__regex=r'^(incoming|outgoing|finance|university|contract|bank):',
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('correspondences', '0006_letter_drafter_name_letter_source_ref_and_more'),
    ]

    operations = [
        migrations.RunPython(import_legacy, remove_legacy),
    ]

