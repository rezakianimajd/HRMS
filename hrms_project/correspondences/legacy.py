"""ورود داده‌های تاریخی واحد مکاتبات از فایل اکسل (اندیکاتور مالی).

این ماژول دو بخش دارد:

1) **تحلیل و نرمال‌سازی** (بدون دیتابیس): توابع `parse_*` هر شیت را به یک دیکشنری
   استاندارد تبدیل می‌کنند. تاریخ‌های شمسی، مبلغ‌های دارای جداکننده، ستون‌های
   جابه‌جاشده و ارجاع‌های چندستونی همین‌جا حل می‌شوند.
2) **درج در دیتابیس**: تابع `import_rows` با `bulk_create` و کلید یکتای
   `source_ref` داده‌ها را به‌صورت تکرارناپذیر وارد می‌کند.
"""
import re
from datetime import date, datetime, time
from decimal import Decimal, InvalidOperation

import openpyxl

try:  # تبدیل تاریخ شمسی؛ در بک‌اند نصب است
    from jdatetime import date as jdate
except Exception:  # noqa: BLE001
    jdate = None

SHEET_INCOMING = 'نام های وارده'
SHEET_CONTRACT = 'قرارداد'
SHEET_OUTGOING = 'نام های صادره'
SHEET_FINANCE = 'نامه صادره مالی'
SHEET_UNIVERSITY = 'ارسالی ها به دانشگاه'
SHEET_BANK = 'امور بانکداری پاسارگاد'

SHEET_CODES = {
    SHEET_INCOMING: 'incoming',
    SHEET_CONTRACT: 'contract',
    SHEET_OUTGOING: 'outgoing',
    SHEET_FINANCE: 'finance',
    SHEET_UNIVERSITY: 'university',
    SHEET_BANK: 'bank',
}

DATE_SLASH = re.compile(r'^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$')
DATE_COMPACT = re.compile(r'^(\d{8})$')
TIME_PREFIX = re.compile(r'^\s*\d{1,2}:\d{2}\s*')
CONTRACT_NO = re.compile(r'\bC-[A-Za-z0-9\-_]+', re.IGNORECASE)
CONTRACT_NO_ALT = re.compile(r'\b\d{2,4}\s*/\s*[^\s/]{1,3}\s*/\s*\d{2,6}\b')


def clean_text(value):
    """متن یکدست: حذف فاصله‌های اضافی و نویسه‌های کنترلی."""
    if value is None:
        return ''
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    text = str(value).replace('\u200c', '\u200c').replace('\xa0', ' ')
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def parse_jalali(value):
    """تبدیل تاریخ شمسی (1404/06/15 یا 14040603 یا datetime) به تاریخ میلادی."""
    if value is None or value == '':
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = clean_text(value).replace(' ', '')
    if not text:
        return None
    match = DATE_SLASH.match(text)
    if not match:
        match = DATE_COMPACT.match(text)
        if match:
            raw = match.group(1)
            parts = (raw[:4], raw[4:6], raw[6:])
        else:
            return None
    else:
        parts = match.groups()
    try:
        year, month, day = (int(part) for part in parts)
    except (TypeError, ValueError):
        return None
    if not 1200 <= year <= 1600 or not 1 <= month <= 12 or not 1 <= day <= 31:
        return None
    if jdate is None:
        return None
    try:
        return jdate(year, month, day).togregorian()
    except Exception:  # noqa: BLE001
        return None


def parse_amount(value):
    """مبلغ را از متن‌هایی مثل «۲۲۳,۵۰۸,۰۰۰» یا «2235080000 ریال» بیرون می‌کشد."""
    if value is None or value == '':
        return None
    if isinstance(value, (int, float, Decimal)):
        try:
            return Decimal(str(int(value)))
        except (InvalidOperation, ValueError):
            return None
    digits = re.sub(r'[^\d]', '', str(value))
    if not digits:
        return None
    try:
        return Decimal(digits)
    except InvalidOperation:
        return None


def looks_like_date(value):
    return parse_jalali(value) is not None


def looks_like_contract(value):
    text = clean_text(value)
    if not text:
        return False
    return bool(CONTRACT_NO.search(text) or CONTRACT_NO_ALT.match(text))


def strip_time(value):
    """ستون «ساعت» اغلب «14:35 آقای ...» است؛ نام شخص را برمی‌گرداند."""
    text = TIME_PREFIX.sub('', clean_text(value))
    return text.strip(' -')


TIME_VALUE = re.compile(r'(?<!\d)(\d{1,2}):(\d{2})(?!\d)')


def parse_entry_time(value):
    """از ستون «ساعت» هم ساعت ورود و هم نام ثبت‌کننده را بیرون می‌کشد."""
    text = clean_text(value)
    if not text:
        return None, ''
    match = TIME_VALUE.search(text)
    if match:
        hour, minute = int(match.group(1)), int(match.group(2))
        if 0 <= hour <= 23 and 0 <= minute <= 59:
            person = clean_text(f'{text[:match.start()]} {text[match.end():]}').strip(' -')
            return time(hour, minute), person
        return None, ''
    if text.isdigit() and len(text) <= 2 and int(text) <= 23:
        return time(int(text), 0), ''
    return None, text


def first_date(*values):
    for value in values:
        parsed = parse_jalali(value)
        if parsed:
            return parsed
    return None

REFERRAL_SLOTS = (
    (11, 10),
    (13, 12),
    (15, 14),
    (16, 17),
    (19, 18),
)


def _cell(row, index):
    if index >= len(row):
        return ''
    value = row[index]
    if value is None:
        return ''
    return value


def _text(row, index):
    return clean_text(_cell(row, index))


def _row_tag(sheet_code, excel_row):
    return f'legacy:{sheet_code}:{excel_row}'


def parse_incoming_row(row, excel_row):
    """شیت «نام های وارده» → نامهٔ وارده + ارجاع‌های چندسطحی."""
    received = parse_jalali(_cell(row, 3))
    letter_date = parse_jalali(_cell(row, 7)) or received
    subject = _text(row, 6)
    number = _text(row, 4)
    if not subject and not number:
        return None
    entry_time, entered_by = parse_entry_time(_cell(row, 0))
    referrals = []
    for target_col, date_col in REFERRAL_SLOTS:
        target = _text(row, target_col)
        if not target:
            continue
        referrals.append({
            'to_name': target,
            'referred_on': parse_jalali(_cell(row, date_col)),
        })
    return {
        'source_ref': f'incoming:{excel_row}',
        'direction': 'incoming',
        'number': number,
        'subject': subject or f'نامه وارده شماره {number}',
        'letter_date': letter_date,
        'received_date': received,
        'entry_method': 'manual',
        'entry_time': entry_time,
        'entered_by_name': entered_by,
        'sender_name': _text(row, 8),
        'receiver_name': _text(row, 9),
        'organization_name': _text(row, 5),
        'tags': [_row_tag('incoming', excel_row), f"legacy-row:{_text(row, 1)}"],
        'summary': '',
        'referrals': referrals,
        # داده‌های تاریخی: ارجاع‌ها با وضعیت «اقدام‌شده» ثبت می‌شوند تا کارتابل باز نکنند.
        'status': 'registered',
    }


def parse_contract_row(row, excel_row):
    """شیت «قرارداد» → ردیف بایگانی قرارداد/الحاقیه."""
    letter_date = first_date(_cell(row, 1), _cell(row, 3), _cell(row, 5))
    subject = _text(row, 4) or _text(row, 3) or _text(row, 2)
    if not subject:
        return None
    company_cell = _text(row, 2)
    company_name = '' if looks_like_date(company_cell) or looks_like_contract(company_cell) else company_cell
    contract_no = ''
    for candidate in (_text(row, 3), _text(row, 2), subject):
        if looks_like_contract(candidate):
            match = CONTRACT_NO.search(candidate) or CONTRACT_NO_ALT.search(candidate)
            contract_no = match.group(0) if match else candidate
            break
    return {
        'source_ref': f'contract:{excel_row}',
        'direction': 'internal',
        'number': '',
        'subject': subject,
        'letter_date': letter_date,
        'organization_name': company_name,
        'contract_number': contract_no,
        'archive_ref': contract_no,
        'status': 'archived',
        'category_code': 'contract',
        'tags': [_row_tag('contract', excel_row), f'contract:{contract_no}'],
        'summary': '',
        'referrals': [],
    }


def parse_outgoing_row(row, excel_row, sheet_code='outgoing'):
    """شیت‌های «نام های صادره» و «نامه صادره مالی»."""
    number = _text(row, 3)
    subject = _text(row, 4)
    if subject == 'خالی':
        subject = ''
    if not subject and not number:
        return None
    receiver = _text(row, 5)
    tags = [_row_tag(sheet_code, excel_row)]
    incoming_ref = _text(row, 0)
    if incoming_ref:
        tags.append(f'legacy-incoming:{incoming_ref}')
    return {
        'source_ref': f'{sheet_code}:{excel_row}',
        'direction': 'outgoing',
        'number': number,
        'subject': subject or f'نامه صادره شماره {number}',
        'letter_date': parse_jalali(_cell(row, 2)),
        'receiver_name': receiver,
        'organization_name': receiver,
        'drafter_name': _text(row, 6),
        'transmittal_no': _text(row, 1),
        'indicator_no': _text(row, 9),
        'summary': _text(row, 10),
        'status': 'registered',
        'tags': tags,
        'referrals': [],
    }


def parse_university_row(row, excel_row):
    """شیت «ارسالی ها به دانشگاه» → نامهٔ صادرهٔ مالی با مبلغ."""
    subject = _text(row, 4)
    amount = parse_amount(_cell(row, 5))
    serial = _text(row, 0)
    if not subject and amount is None:
        return None
    receiver = _text(row, 6) or 'دانشگاه خاتم'
    summary = _text(row, 11)
    raw_amount = _cell(row, 5)
    if amount is None and clean_text(raw_amount):
        summary = f'{summary} — مبلغ در فایل اصلی: {clean_text(raw_amount)}'.strip(' —')
    return {
        'source_ref': f'university:{excel_row}',
        'direction': 'outgoing',
        'number': '',
        'subject': subject or f'ارسالی مالی شماره {serial}',
        'letter_date': first_date(_cell(row, 3), _cell(row, 2)),
        'sent_date': parse_jalali(_cell(row, 2)),
        'receiver_name': receiver,
        'organization_name': receiver,
        'sender_name': _text(row, 7),
        'transmittal_no': _text(row, 1),
        'indicator_no': _text(row, 10),
        'amount': amount,
        'archive_ref': serial and f'ارسالی-{serial}',
        'category_code': 'finance',
        'summary': summary,
        'status': 'registered',
        'tags': [_row_tag('university', excel_row), f'legacy-serial:{serial}'],
        'referrals': [],
    }


def parse_finance_row(row, excel_row):
    """شیت «نامه صادره مالی» (ردیف‌های خالی/خالیِ متنی نادیده گرفته می‌شوند)."""
    parsed = parse_outgoing_row(row, excel_row, sheet_code='finance')
    if not parsed:
        return None
    parsed['category_code'] = 'finance'
    return parsed


def parse_bank_row(row, excel_row):
    """شیت «امور بانکداری پاسارگاد» → نامهٔ وارده با موضوع/توضیحات ترکیبی."""
    description = _text(row, 6)
    number = _text(row, 4)
    if not description and not number:
        return None
    party = _text(row, 5)
    note = strip_time(_cell(row, 1))
    entry_time, entered_by = parse_entry_time(_cell(row, 1))
    tags = [_row_tag('bank', excel_row)]
    if note:
        tags.append(f'legacy-time:{note}')
    return {
        'source_ref': f'bank:{excel_row}',
        'direction': 'incoming',
        'number': number,
        'subject': description or f'مکاتبه بانکی شماره {number}',
        'letter_date': first_date(_cell(row, 3), _cell(row, 2)),
        'received_date': parse_jalali(_cell(row, 2)),
        'entry_method': 'manual',
        'entry_time': entry_time,
        'entered_by_name': entered_by or note,
        'organization_name': party,
        'receiver_name': note,
        'summary': description,
        'status': 'registered',
        'tags': tags,
        'referrals': [],
    }


PARSERS = {
    SHEET_INCOMING: parse_incoming_row,
    SHEET_CONTRACT: parse_contract_row,
    SHEET_OUTGOING: parse_outgoing_row,
    SHEET_FINANCE: parse_finance_row,
    SHEET_UNIVERSITY: parse_university_row,
    SHEET_BANK: parse_bank_row,
}


def iter_legacy_rows(path, sheets=None, limit_per_sheet=None):
    """خواندن فایل اکسل و برگرداندن ردیف‌های نرمال‌شده (بدون دیتابیس)."""
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    allowed = set(sheets) if sheets else None
    for sheet_name in workbook.sheetnames:
        canonical = sheet_name.strip()
        parser = PARSERS.get(canonical)
        if not parser or (allowed and canonical not in allowed):
            continue
        sheet = workbook[sheet_name]
        produced = 0
        for index, row in enumerate(sheet.iter_rows(values_only=True)):
            if index == 0:
                continue  # سرستون‌ها
            if canonical == SHEET_FINANCE and index == 1:
                continue  # سرستون دوم این شیت
            source = list(row)
            parsed = parser(source, index + 1)
            if not parsed:
                continue
            parsed.setdefault('sheet', canonical)
            parsed.setdefault('sheet_code', SHEET_CODES[canonical])
            parsed.setdefault('excel_row', index + 1)
            yield parsed
            produced += 1
            if limit_per_sheet and produced >= limit_per_sheet:
                break


def apply_fallback_dates(rows, fallback_date):
    """ردیف‌های بدون تاریخ را با تاریخ پایه (اول دوره) تکمیل می‌کند."""
    for row in rows:
        if not row.get('letter_date'):
            row['letter_date'] = fallback_date
            row['legacy_date_fallback'] = True
        yield row


def summarize(rows):
    """آمار تعداد ردیف‌ها به تفکیک شیت/جهت و ارجاع‌ها."""
    stats = {'total': 0, 'by_sheet': {}, 'by_direction': {}, 'referrals': 0,
             'with_number': 0, 'with_amount': 0, 'date_fallback': 0}
    for row in rows:
        stats['total'] += 1
        sheet = row.get('sheet', '?')
        stats['by_sheet'][sheet] = stats['by_sheet'].get(sheet, 0) + 1
        direction = row.get('direction', '?')
        stats['by_direction'][direction] = stats['by_direction'].get(direction, 0) + 1
        stats['referrals'] += len(row.get('referrals') or [])
        if row.get('number'):
            stats['with_number'] += 1
        if row.get('amount') is not None:
            stats['with_amount'] += 1
        if row.get('legacy_date_fallback'):
            stats['date_fallback'] += 1
    return stats


CATEGORY_SEEDS = {
    'contract': {'name': 'قرارداد و الحاقیه', 'direction': 'internal', 'color': '#f59e0b',
                 'order': 10, 'description': 'ردیف‌های دفتر قرارداد (ورود تاریخی)'},
}


def _ensure_categories(company):
    from correspondences.models import LetterCategory

    existing = {row.code: row for row in LetterCategory.objects.filter(company=company)}
    for code, defaults in CATEGORY_SEEDS.items():
        if code not in existing:
            existing[code] = LetterCategory.objects.create(
                company=company, code=code,
                name=defaults['name'], direction=defaults['direction'],
                color=defaults.get('color', '#0ea5e9'), order=defaults.get('order', 100),
                description=defaults.get('description', ''),
            )
    return existing


def _ensure_organizations(company, names, cache, logger=None):
    """ساخت سازمان‌های جدید برای نام‌های تازه (کش‌دار و تکرارناپذیر)."""
    import hashlib

    from correspondences.models import Organization

    wanted = {clean_text(name) for name in names}
    wanted.discard('')
    missing = [name for name in wanted if name not in cache]
    if not missing:
        return cache
    existing = {
        row.name.strip(): row
        for row in Organization.objects.filter(company=company, name__in=missing)
    }
    cache.update(existing)
    to_create = []
    for name in missing:
        if name in cache:
            continue
        digest = hashlib.sha1(name.encode('utf-8')).hexdigest()[:10].upper()
        to_create.append(Organization(
            company=company, name=name[:200], code=f'LEG-{digest}', type='other',
        ))
    if to_create:
        Organization.objects.bulk_create(to_create, batch_size=200, ignore_conflicts=True)
        for row in Organization.objects.filter(
            company=company, code__in=[item.code for item in to_create],
        ):
            cache[row.name.strip()] = row
        if logger:
            logger(f'سازمان‌های جدید: {len(to_create)}')
    return cache


def load_bundle(path):
    """خواندن بستهٔ JSON فشرده (خروجی `--export-json`) و تبدیل به ساختار داخلی."""
    import gzip
    import json

    with gzip.open(path, 'rt', encoding='utf-8') as handle:
        rows = json.load(handle)
    parsed = []
    for row in rows:
        item = dict(row)
        for key in ('letter_date', 'received_date', 'sent_date'):
            if item.get(key):
                try:
                    item[key] = date.fromisoformat(str(item[key])[:10])
                except ValueError:
                    item[key] = None
        amount = item.get('amount')
        if amount not in (None, ''):
            try:
                item['amount'] = Decimal(str(amount))
            except InvalidOperation:
                item['amount'] = None
        entry_time = item.get('entry_time')
        if entry_time:
            try:
                item['entry_time'] = time.fromisoformat(str(entry_time))
            except ValueError:
                item['entry_time'] = None
        referrals = []
        for referral in item.get('referrals') or []:
            referred_on = referral.get('referred_on')
            if referred_on:
                try:
                    referred_on = date.fromisoformat(str(referred_on)[:10])
                except ValueError:
                    referred_on = None
            referrals.append({'to_name': referral.get('to_name'), 'referred_on': referred_on})
        item['referrals'] = referrals
        parsed.append(item)
    return parsed


def import_rows(rows, company, *, dry_run=False, create_events=True, logger=print):
    """درج ردیف‌های نرمال‌شده در دیتابیس (تکرارناپذیر بر اساس `source_ref`)."""
    from django.utils import timezone

    from correspondences.models import Letter, LetterEvent, LetterReferral

    rows = list(rows)
    stats = summarize(rows)
    stats.update({'created': 0, 'skipped': 0, 'referrals_created': 0, 'events_created': 0})
    if dry_run:
        if logger:
            logger(f'[dry-run] {stats["total"]} ردیف آمادهٔ ورود: {stats["by_sheet"]}')
            logger(f'[dry-run] ارجاع‌ها: {stats["referrals"]} | بدون شماره: '
                   f'{stats["total"] - stats["with_number"]} | تاریخ جایگزین: {stats["date_fallback"]}')
        return stats

    categories = _ensure_categories(company)
    existing_refs = set(
        Letter.objects.filter(company=company).values_list('source_ref', flat=True)
    )
    org_cache = {}
    pending = [row for row in rows if row['source_ref'] not in existing_refs]
    stats['skipped'] = len(rows) - len(pending)

    org_names = {row.get('organization_name') for row in pending if row.get('organization_name')}
    _ensure_organizations(company, org_names, org_cache, logger=logger)

    now = timezone.now()
    created_refs = []
    batch = []

    def flush():
        if not batch:
            return
        Letter.objects.bulk_create(batch, batch_size=200, ignore_conflicts=True)
        created_refs.extend(item.source_ref for item in batch)
        batch.clear()

    for row in pending:
        org = org_cache.get(clean_text(row.get('organization_name'))) if row.get('organization_name') else None
        letter = Letter(
            company=company,
            direction=row['direction'],
            number=(row.get('number') or '')[:60],
            subject=(row.get('subject') or 'بدون موضوع')[:500],
            summary=row.get('summary') or '',
            letter_date=row['letter_date'],
            received_date=row.get('received_date'),
            sent_date=row.get('sent_date'),
            entry_method=row.get('entry_method') or 'manual',
            entry_time=row.get('entry_time'),
            entered_by_name=(row.get('entered_by_name') or '')[:200],
            organization=org,
            sender_name=(row.get('sender_name') or '')[:200],
            receiver_name=(row.get('receiver_name') or '')[:200],
            drafter_name=(row.get('drafter_name') or '')[:200],
            transmittal_no=(row.get('transmittal_no') or '')[:60],
            indicator_no=(row.get('indicator_no') or '')[:60],
            amount=row.get('amount'),
            currency='ریال',
            archive_ref=(row.get('archive_ref') or '')[:60],
            contract_number=(row.get('contract_number') or '')[:60],
            category=categories.get(row.get('category_code') or ''),
            status=row.get('status') or 'registered',
            priority='normal',
            confidentiality='normal',
            source_ref=row['source_ref'],
            tags=row.get('tags') or [],
            archived_at=now if row.get('status') == 'archived' else None,
        )
        batch.append(letter)
        if len(batch) >= 250:
            flush()
    flush()
    stats['created'] = len(created_refs)

    letters = {
        item.source_ref: item
        for item in Letter.objects.filter(company=company, source_ref__in=created_refs)
    }
    referrals = []
    for row in pending:
        letter = letters.get(row['source_ref'])
        if not letter:
            continue
        for index, referral in enumerate(row.get('referrals') or [], start=1):
            referrals.append(LetterReferral(
                company=company, letter=letter, seq=index,
                to_name=(referral.get('to_name') or '')[:200],
                referred_on=referral.get('referred_on') or letter.letter_date,
                status='done',
                result_note='ارجاع تاریخی (واردشده از فایل اکسل)',
                done_at=now,
            ))
    if referrals:
        LetterReferral.objects.bulk_create(referrals, batch_size=300)
        stats['referrals_created'] = len(referrals)

    if create_events and letters:
        events = []
        for row in pending:
            letter = letters.get(row['source_ref'])
            if not letter:
                continue
            events.append(LetterEvent(
                company=company, letter=letter, action='created',
                note=f'ورود از فایل اکسل — شیت «{row.get("sheet", "")}»',
                meta={'source_ref': row['source_ref'], 'excel_row': row.get('excel_row')},
            ))
        if events:
            LetterEvent.objects.bulk_create(events, batch_size=500)
            stats['events_created'] = len(events)

    if logger:
        logger(f'ثبت شد: {stats["created"]} نامه، {stats["referrals_created"]} ارجاع، '
               f'{stats["events_created"]} رویداد (تکراری: {stats["skipped"]})')
    return stats

