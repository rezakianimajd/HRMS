"""تطبیق «شماره ثبت» نامه‌های وارده با شیت اندیکاتور (بدون وابستگی به دیتابیس).

در شیت «نام های وارده» فایل اندیکاتور:

* ستون **«ردیف»**  → ``company_reg_no`` (شماره ثبت ورود به شرکت / مؤسسه)
* ستون **«ردیف۲»** → ``unit_reg_no``    (شماره ثبت ورود به واحد)

این ماژول ردیف‌های اکسل را به نامه‌های وارده تطبیق می‌دهد و فهرست
به‌روزرسانی‌ها/تعارض‌ها را می‌سازد تا management command فقط آن را اعمال کند.
تطبیق به‌ترتیب اولویت: ``source_ref`` → شماره+تاریخ ورود → شمارهٔ یکتا →
تاریخ+موضوع → موضوع یکتا.
"""
from __future__ import annotations

import datetime
import re

try:  # jdatetime در بک‌اند موجود است
    import jdatetime
except Exception:  # noqa: BLE001
    jdatetime = None

FA_TO_EN = str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789')

CLEAN_RE = re.compile(r'[\s\u200c\u200f\u200e\.\,\:\;\(\)\-_/\\،؛؟!«»"\'\[\]…]+')


def digits(value) -> str:
    """ارقام فارسی/عربی → لاتین."""
    return str(value or '').translate(FA_TO_EN)


def normalize_number(value) -> str:
    """شمارهٔ نامه برای مقایسه (بدون فاصله و نویسهٔ جهت‌دهی)."""
    text = digits(value)
    text = text.replace('\u200c', '').replace('\u200e', '').replace('\u200f', '')
    return re.sub(r'\s+', '', text).strip()


def normalize_text(value, size: int = 32) -> str:
    """موضوع برای مقایسه: فقط حروف/ارقام و ۳۲ نویسهٔ اول."""
    return CLEAN_RE.sub('', digits(value))[:size]


def number_signature(value) -> str:
    """امضای شمارهٔ چندقسمتی مستقل از ترتیب بخش‌ها («1405/پ9/1427» ≡ «1427/پ9/1405»)."""
    text = normalize_number(value)
    if not text:
        return ''
    parts = [part for part in re.split(r'[/\\\-\s]+', text) if part]
    if len(parts) < 2:
        return ''
    return '|'.join(sorted(parts))


def to_jalali_text(value) -> str:
    """تاریخ ISO میلادی (یا شمسی متنی) → «YYYY/MM/DD» شمسی برای مقایسه."""
    text = str(value or '').strip()
    if not text:
        return ''
    if re.fullmatch(r'\d{4}/\d{1,2}/\d{1,2}', digits(text)):
        year, month, day = digits(text).split('/')
        return f'{int(year):04d}/{int(month):02d}/{int(day):02d}'
    if jdatetime is None:
        return ''
    try:
        date = jdatetime.date.fromgregorian(date=datetime.date.fromisoformat(text[:10]))
        return f'{date.year:04d}/{date.month:02d}/{date.day:02d}'
    except Exception:  # noqa: BLE001
        return ''


def excel_row_payload(raw: dict) -> dict:
    """آماده‌سازی یک ردیف خام اکسل برای تطبیق."""
    return {
        'excel_row': raw.get('excel_row'),
        'company_reg_no': digits(raw.get('company_reg_no') or '').strip(),
        'unit_reg_no': digits(raw.get('unit_reg_no') or '').strip(),
        'number': str(raw.get('number') or ''),
        'received_date': digits(raw.get('received_date') or '').strip(),
        'subject': str(raw.get('subject') or ''),
    }


def build_indexes(excel_rows):
    """ایندکس‌های تطبیق برای ردیف‌های اکسل."""
    rows = [excel_row_payload(raw) for raw in excel_rows]
    for row in rows:
        row['_number'] = normalize_number(row['number'])
        row['_subject'] = normalize_text(row['subject'])
    indexes = {
        'source': {f"incoming:{row['excel_row']}": row for row in rows},
        'number_date': {},
        'number': {},
        'signature': {},
        'date': {},
        'date_subject': {},
        'subject': {},
    }
    for row in rows:
        if row['_number']:
            indexes['number_date'].setdefault((row['_number'], row['received_date']), []).append(row)
            indexes['number'].setdefault(row['_number'], []).append(row)
            signature = number_signature(row['_number'])
            if signature:
                indexes['signature'].setdefault(signature, []).append(row)
        if row['received_date']:
            indexes['date'].setdefault(row['received_date'], []).append(row)
        if row['_subject']:
            indexes['date_subject'].setdefault((row['received_date'], row['_subject']), []).append(row)
            indexes['subject'].setdefault(row['_subject'], []).append(row)
    return indexes, rows


def match_letter(indexes, letter):
    """ردیف اکسل متناظر با یک نامه و روش تطبیق (یا ``(None, '')``)."""
    number = normalize_number(letter.get('number')) or normalize_number(letter.get('external_number'))
    date = to_jalali_text(letter.get('received_date')) or to_jalali_text(letter.get('letter_date'))
    subject = normalize_text(letter.get('subject'))

    row = indexes['source'].get(letter.get('source_ref') or '')
    if row:
        return row, 'source_ref'

    if number:
        candidates = indexes['number_date'].get((number, date)) or []
        if len(candidates) == 1:
            return candidates[0], 'number+date'
        candidates = indexes['number'].get(number) or []
        if len(candidates) == 1:
            return candidates[0], 'number'
        signature = number_signature(number)
        if signature:
            candidates = indexes['signature'].get(signature) or []
            if len(candidates) == 1:
                return candidates[0], 'number-segments'
    if date and subject:
        candidates = indexes['date_subject'].get((date, subject)) or []
        if len(candidates) == 1:
            return candidates[0], 'date+subject'
        # موضوع کوتاه‌شده در دیتابیس معمولاً پیشوند موضوع کامل اکسل است
        if len(subject) >= 8:
            hits = [
                row for row in indexes['date'].get(date) or []
                if row['_subject'] and (
                    row['_subject'].startswith(subject) or subject.startswith(row['_subject'])
                ) and min(len(row['_subject']), len(subject)) >= 8
            ]
            if len(hits) == 1:
                return hits[0], 'date+subject-prefix'
    if subject:
        candidates = indexes['subject'].get(subject) or []
        if len(candidates) == 1:
            return candidates[0], 'subject'
    return None, ''


def build_updates(letters, excel_rows, overwrite: bool = False):
    """ساخت فهرست به‌روزرسانی‌ها، تعارض‌ها و نامه‌های بدون تطبیق.

    ورودی ``letters`` ردیف‌های دیکشنری‌شدهٔ نامه‌ها (شامل ``id``) و
    ``excel_rows`` ردیف‌های شیت اندیکاتور هستند. با ``overwrite=True``
    مقادیر متفاوت هم با اکسل جایگزین می‌شوند (پیش‌فرض: فقط خالی‌ها پر می‌شود).
    """
    indexes, _rows = build_indexes(excel_rows)
    updates, conflicts, unmatched = [], [], []
    stats = {'matched': 0, 'unmatched': 0, 'updates': 0, 'conflicts': 0}
    by_method = {}

    for letter in letters:
        row, method = match_letter(indexes, letter)
        if not row:
            stats['unmatched'] += 1
            unmatched.append({
                'id': letter.get('id'),
                'number': letter.get('number') or '',
                'received_date': str(letter.get('received_date') or ''),
                'subject': str(letter.get('subject') or '')[:80],
                'source_ref': letter.get('source_ref') or '',
            })
            continue
        stats['matched'] += 1
        by_method[method] = by_method.get(method, 0) + 1

        change = {'id': letter.get('id'), 'excel_row': row['excel_row'], 'how': method}
        touched = False
        for field in ('company_reg_no', 'unit_reg_no'):
            excel_value = row[field]
            if not excel_value:
                continue
            current = digits(letter.get(field) or '').strip()
            if current == excel_value:
                continue
            if current and not overwrite:
                conflicts.append({
                    'id': letter.get('id'), 'excel_row': row['excel_row'],
                    'field': field, 'current': current, 'excel': excel_value,
                })
                continue
            change[field] = excel_value
            touched = True
        if touched:
            updates.append(change)

    stats['updates'] = len(updates)
    stats['conflicts'] = len(conflicts)
    stats['by_method'] = by_method
    return {'updates': updates, 'conflicts': conflicts, 'unmatched': unmatched, 'stats': stats}

