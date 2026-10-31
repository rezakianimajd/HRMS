"""گزارش‌گیری تحلیلی و مغایرت‌گیری «اکسل دفاتر» برای صورت معاملات فصلی (خرید).

سه بخش اصلی:

- ``build_analytics``: کارت‌های شاخص، توزیع‌ها، پارتو طرف‌ها، کیفیت داده.
- ``read_ledger_rows``: خواندن فایل دفاتر (xlsx/xlsm/csv/tsv) با تشخیص خودکار
  ستون‌ها از روی مترادف‌های فارسی و امکان نگاشت دستی.
- ``reconcile``: موتور تطبیق چندمرحله‌ای (blocking + scoring + انتساب یک‌به‌یک)
  با خروجی قابل توضیح: هر مغایرت دلیل و درصد اطمینان دارد.
"""
from __future__ import annotations

import csv
import io
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation

from accounting import seasonal_rules
from accounting.models import SeasonalTransaction

PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'
_LEGAL_SUFFIXES = {
    'شركت', 'شرکت', 'سهامی', 'خاص', 'عام', 'مسئولیت', 'محدود', 'تعاونی', 'تولیدی',
    'صنعتی', 'تجاری', 'بازرگانی', 'گروه', 'هلدینگ', 'آقای', 'خانم', 'جناب',
}


def to_latin_digits(value) -> str:
    """ارقام فارسی/عربی → لاتین."""
    text = '' if value is None else str(value)
    table = {ord(char): str(index) for index, char in enumerate(PERSIAN_DIGITS)}
    table.update({ord(char): str(index) for index, char in enumerate(ARABIC_DIGITS)})
    return text.translate(table)


def normalize_text(value) -> str:
    """یکسان‌سازی حروف فارسی، حذف نویسه‌های کنترلی و فشرده‌کردن فاصله‌ها."""
    if value is None:
        return ''
    text = unicodedata.normalize('NFKC', to_latin_digits(value))
    text = text.replace('ي', 'ی').replace('ك', 'ک').replace('ۀ', 'ه').replace('ة', 'ه')
    text = text.replace('\u200c', ' ').replace('\u200f', ' ').replace('\u200e', ' ')
    text = re.sub(r'[\u064b-\u065f\u0670]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def name_tokens(value) -> list:
    """توکن‌های معنادار نام (بدون پسوندهای حقوقی و بدون تک‌حرفی‌ها)."""
    text = normalize_text(value).lower()
    text = re.sub(r'[^\w\s\u0600-\u06ff]', ' ', text)
    return [token for token in text.split() if len(token) > 1 and token not in _LEGAL_SUFFIXES]


def normalize_name(value) -> str:
    """کلید مقایسهٔ نام: توکن‌های مرتب‌شده (بی‌توجه به ترتیب و پسوند حقوقی)."""
    return ' '.join(sorted(name_tokens(value)))


def normalize_id(value) -> str:
    """شناسه/کد ملی: فقط ارقام (پرفروش‌ترین خطای ورود، خط تیره و فاصله است)."""
    return re.sub(r'\D', '', to_latin_digits(value))


def normalize_invoice(value) -> str:
    """شمارهٔ فاکتور: ارقام لاتین، حذف جداکننده و صفرهای ابتدایی («۰» = بدون شماره)."""
    text = re.sub(r'[^0-9A-Za-z\u0600-\u06ff]', '', normalize_text(value))
    if not text:
        return ''
    if text.isdigit():
        stripped = text.lstrip('0')
        return stripped or ''          # «0» یا «000» یعنی شمارهٔ فاکتور ثبت نشده
    return text.lower()


def parse_amount(value) -> Decimal:
    """مبلغ → Decimal (پشتیبانی از «۱٬۲۳۴٬۰۰۰»، «(۱۲۰۰)» و «۱۲۳۴ ریال»)."""
    if value is None or value == '':
        return Decimal('0')
    if isinstance(value, Decimal):
        return value
    if isinstance(value, (int, float)):
        try:
            return Decimal(str(round(float(value), 2)))
        except (InvalidOperation, ValueError):
            return Decimal('0')
    text = normalize_text(value)
    negative = text.startswith('-') or (text.startswith('(') and text.endswith(')'))
    cleaned = re.sub(r'[^0-9.\-]', '', to_latin_digits(text)).replace('-', '')
    if cleaned.count('.') > 1:
        parts = cleaned.split('.')
        cleaned = ''.join(parts[:-1]) + '.' + parts[-1]
    try:
        amount = Decimal(cleaned or '0')
    except InvalidOperation:
        return Decimal('0')
    return -amount if negative else amount


def parse_date(value):
    """تاریخ → date؛ پشتیبانی از شمسی (۱۴۰۵/۰۱/۲۱)، میلادی و تاریخ‌های Excel."""
    if value in (None, ''):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = normalize_text(value)
    if not text:
        return None
    match = re.match(r'^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})', text)
    if match:
        year, month, day = (int(part) for part in match.groups())
    else:
        reverse = re.match(r'^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})', text)
        if not reverse:
            return None
        first, second, year = (int(part) for part in reverse.groups())
        month, day = second, first
    if 1200 <= year <= 1599:
        try:
            import jdatetime

            return jdatetime.date(year, month, day).togregorian()
        except Exception:
            return None
    try:
        return date(year, month, day)
    except ValueError:
        return None


def jaro_winkler(left: str, right: str, prefix_scale: float = 0.1) -> float:
    """شباهت Jaro-Winkler (۰..۱) — مناسب نام‌های با غلط تایپی جزئی."""
    if not left and not right:
        return 1.0
    if not left or not right:
        return 0.0
    if left == right:
        return 1.0
    len_left, len_right = len(left), len(right)
    window = max(0, max(len_left, len_right) // 2 - 1)
    left_matches = [False] * len_left
    right_matches = [False] * len_right
    matches = 0
    for index in range(len_left):
        start = max(0, index - window)
        end = min(index + window + 1, len_right)
        for other in range(start, end):
            if right_matches[other] or left[index] != right[other]:
                continue
            left_matches[index] = True
            right_matches[other] = True
            matches += 1
            break
    if not matches:
        return 0.0
    transpositions = 0
    pointer = 0
    for index in range(len_left):
        if not left_matches[index]:
            continue
        while pointer < len_right and not right_matches[pointer]:
            pointer += 1
        if pointer < len_right and left[index] != right[pointer]:
            transpositions += 1
        pointer += 1
    transpositions //= 2
    jaro = (matches / len_left + matches / len_right
            + (matches - transpositions) / matches) / 3
    prefix = 0
    for index in range(min(4, len_left, len_right)):
        if left[index] != right[index]:
            break
        prefix += 1
    return min(1.0, jaro + prefix * prefix_scale * (1 - jaro))


def token_set_ratio(left: str, right: str) -> float:
    """شباهت مجموعهٔ توکن‌ها (بی‌توجه به ترتیب و کلمات اضافه)."""
    left_tokens = set(name_tokens(left))
    right_tokens = set(name_tokens(right))
    if not left_tokens or not right_tokens:
        return 0.0
    intersection = len(left_tokens & right_tokens)
    if not intersection:
        return 0.0
    precision = intersection / len(left_tokens)
    recall = intersection / len(right_tokens)
    return 2 * precision * recall / (precision + recall)


def name_similarity(left: str, right: str) -> float:
    """ترکیب دو معیار: مجموعهٔ توکن‌ها + Jaro-Winkler روی نام مرتب‌شده."""
    if not left or not right:
        return 0.0
    return round(max(token_set_ratio(left, right), jaro_winkler(normalize_name(left), normalize_name(right))), 4)


# ---------------------------------------------------------------------------
# گزارش تحلیلی
# ---------------------------------------------------------------------------
def _jalali_text(value) -> str:
    if not value:
        return ''
    try:
        import jdatetime

        jalali = jdatetime.date.fromgregorian(date=value)
        return f'{jalali.year:04d}/{jalali.month:02d}/{jalali.day:02d}'
    except Exception:
        return ''


def _month_label(value) -> tuple:
    """کلید و برچسب ماه شمسی برای نمودار روند."""
    if not value:
        return ('none', 'بدون تاریخ')
    try:
        import jdatetime

        jalali = jdatetime.date.fromgregorian(date=value)
        return (f'{jalali.year:04d}-{jalali.month:02d}', f'{jalali.year:04d}/{jalali.month:02d}')
    except Exception:
        return ('none', 'بدون تاریخ')


def _rows_for(report, direction):
    return list(report.transactions.filter(direction=direction).order_by('line_no', 'id'))


def _clean_filters(filters):
    """فیلترهای گزارش: نوع معامله، وضعیت مودیان، نوع طرف و جستجوی متنی."""
    filters = filters or {}

    def pick(*keys):
        for key in keys:
            value = filters.get(key)
            if value not in (None, '', 'all', 'ALL'):
                return value
        return None

    kind = pick('kind', 'transaction_kind')
    try:
        kind = int(kind) if kind is not None else None
    except (TypeError, ValueError):
        kind = None
    if kind is not None and kind not in (1, 2, 3, 4, 5):
        kind = None

    status = pick('moadian_status', 'status', 'registered')
    if status not in (None, 'registered', 'pending'):
        status = None

    person_type = pick('person_type')
    allowed_types = {value for value, _label in seasonal_rules.PERSON_TYPES}
    if person_type not in allowed_types:
        person_type = None

    search = normalize_text(filters.get('search') or '').strip()
    return {
        'kind': kind,
        'moadian_status': status,
        'person_type': person_type,
        'search': search,
    }


def filters_from_query(params):
    """QueryString درخواست → فیلترهای استاندارد گزارش."""
    if hasattr(params, 'dict'):
        params = params.dict()
    return _clean_filters(params)


def _apply_filters(rows, filters):
    result = rows
    if filters.get('kind'):
        result = [row for row in result if int(row.kind or 1) == int(filters['kind'])]
    if filters.get('moadian_status'):
        status = filters['moadian_status']
        result = [row for row in result
                  if (row.moadian_status or 'pending') == status]
    if filters.get('person_type'):
        result = [row for row in result if (row.person_type or '') == filters['person_type']]
    if filters.get('search'):
        term = filters['search'].lower()
        result = [row for row in result if term in ' '.join(str(value or '') for value in [
            row.name, row.first_name, row.last_name, row.national_id, row.invoice_no,
            row.city, row.address, row.goods_service_desc,
        ]).lower()]
    return result


def filtered_rows(report, direction, filters=None):
    """ردیف‌های همان گزارش بعد از اعمال فیلتر (برای نمایش و خروجی)."""
    cleaned = _clean_filters(filters)
    return _apply_filters(_rows_for(report, direction), cleaned)


def _filter_options(rows):
    """گزینه‌های فیلتر با تعداد هر گزینه (از کل ردیف‌های فصل)."""
    kind_counts, status_counts, type_counts = {}, {}, {}
    for row in rows:
        kind = int(row.kind or 1)
        kind_counts[kind] = kind_counts.get(kind, 0) + 1
        status = row.moadian_status or 'pending'
        status_counts[status] = status_counts.get(status, 0) + 1
        person_type = row.person_type or 'unknown'
        type_counts[person_type] = type_counts.get(person_type, 0) + 1
    labels = dict(seasonal_rules.PERSON_TYPES)
    return {
        'kind': [{'value': kind, 'label': f'نوع {kind}', 'count': kind_counts[kind]}
                 for kind in sorted(kind_counts)],
        'moadian_status': [
            {'value': 'registered', 'label': 'درج‌شده در سامانه', 'count': status_counts.get('registered', 0)},
            {'value': 'pending', 'label': 'درج‌نشده در سامانه', 'count': status_counts.get('pending', 0)},
        ],
        'person_type': [{'value': key, 'label': labels.get(key, 'نامشخص'), 'count': value}
                        for key, value in sorted(type_counts.items(), key=lambda item: -item[1])],
        'total': len(rows),
    }




def _share(value, total) -> float:
    return round(float(value) / float(total), 4) if total else 0.0


def build_analytics(report, direction=seasonal_rules.DIRECTION, filters=None):
    """کارت‌های شاخص، توزیع‌ها، پارتو طرف‌ها و یافته‌های کیفیت داده (با فیلتر)."""
    cleaned_filters = _clean_filters(filters)
    base_rows = _rows_for(report, direction)
    rows = _apply_filters(base_rows, cleaned_filters)
    count = len(rows)
    amount = sum((row.amount or 0) for row in rows)
    vat = sum((row.vat or 0) for row in rows)
    registered = sum(1 for row in rows if row.moadian_status == SeasonalTransaction.MoadianStatus.REGISTERED)

    person_types, kinds, months, statuses, parties = {}, {}, {}, {}, {}
    for row in rows:
        type_key = row.person_type or 'unknown'
        bucket = person_types.setdefault(type_key, {'count': 0, 'amount': Decimal('0')})
        bucket['count'] += 1
        bucket['amount'] += row.amount or 0

        kind_key = int(row.kind or 1)
        kind_bucket = kinds.setdefault(kind_key, {'count': 0, 'amount': Decimal('0'), 'vat': Decimal('0')})
        kind_bucket['count'] += 1
        kind_bucket['amount'] += row.amount or 0
        kind_bucket['vat'] += row.vat or 0

        status_key = row.moadian_status or 'pending'
        status_bucket = statuses.setdefault(status_key, {'count': 0, 'amount': Decimal('0')})
        status_bucket['count'] += 1
        status_bucket['amount'] += row.amount or 0

        month_key, month_label = _month_label(row.invoice_date)
        month_bucket = months.setdefault(month_key, {'label': month_label, 'count': 0, 'amount': Decimal('0')})
        month_bucket['count'] += 1
        month_bucket['amount'] += row.amount or 0

        party_key = normalize_name(row.name) or normalize_id(row.national_id) or f'row-{row.id}'
        party_bucket = parties.setdefault(party_key, {
            'name': str(row.name or '').strip() or 'بدون نام',
            'person_type': row.person_type or 'unknown',
            'national_id': row.national_id or '',
            'count': 0,
            'amount': Decimal('0'),
        })
        party_bucket['count'] += 1
        party_bucket['amount'] += row.amount or 0
        if not party_bucket['national_id'] and row.national_id:
            party_bucket['national_id'] = row.national_id

    person_list = [{
        'key': key,
        'label': dict(seasonal_rules.PERSON_TYPES).get(key, 'نامشخص'),
        'count': value['count'],
        'amount': float(value['amount']),
        'share': _share(value['amount'], amount),
    } for key, value in person_types.items()]
    person_list.sort(key=lambda item: item['amount'], reverse=True)

    kind_list = [{
        'key': key,
        'label': f'نوع {key}',
        'count': value['count'],
        'amount': float(value['amount']),
        'vat': float(value['vat']),
        'share': _share(value['amount'], amount),
    } for key, value in sorted(kinds.items())]

    month_list = [{
        'key': key,
        'label': value['label'],
        'count': value['count'],
        'amount': float(value['amount']),
    } for key, value in sorted(months.items(), key=lambda item: item[0])]

    ranked_parties = sorted(parties.values(), key=lambda item: item['amount'], reverse=True)
    cumulative = Decimal('0')
    top_payload = []
    for index, party in enumerate(ranked_parties[:25], start=1):
        cumulative += party['amount']
        top_payload.append({
            'rank': index,
            'name': party['name'],
            'person_type': party['person_type'],
            'person_type_label': dict(seasonal_rules.PERSON_TYPES).get(party['person_type'], 'نامشخص'),
            'national_id': party['national_id'],
            'count': party['count'],
            'amount': float(party['amount']),
            'share': _share(party['amount'], amount),
            'cumulative_share': _share(cumulative, amount),
        })

    shares = [_share(party['amount'], amount) for party in ranked_parties]
    hhi = round(sum(share * share for share in shares), 4)
    pareto = 0
    running = 0.0
    for share in shares:
        running += share
        pareto += 1
        if running >= 0.8:
            break

    missing_postal = sum(1 for row in rows if not (row.postal_code or '').strip())
    missing_date = sum(1 for row in rows if not row.invoice_date)
    missing_invoice = sum(1 for row in rows if not (row.invoice_no or '').strip())
    aggregate_rows = sum(1 for row in rows if row.person_type == SeasonalTransaction.PersonType.AGGREGATE)
    foreign_rows = sum(1 for row in rows if row.person_type == SeasonalTransaction.PersonType.FOREIGN)
    vat_ratio = round(float(vat) / float(amount), 4) if amount else 0.0

    insights = _build_insights(
        count=count, registered=registered, shares=shares, parties=len(ranked_parties),
        pareto=pareto, missing_postal=missing_postal, missing_invoice=missing_invoice,
        missing_date=missing_date, aggregate_rows=aggregate_rows, foreign_rows=foreign_rows,
        vat_ratio=vat_ratio, has_amount=bool(amount),
    )

    period_start, period_end = (report.period_range or (None, None))
    return {
        'direction': direction,
        'filters': cleaned_filters,
        'active_filters': bool(cleaned_filters['kind'] or cleaned_filters['moadian_status']
                               or cleaned_filters['person_type'] or cleaned_filters['search']),
        'filter_options': _filter_options(base_rows),
        'unfiltered': {
            'count': len(base_rows),
            'amount': float(sum((row.amount or 0) for row in base_rows)),
            'vat': float(sum((row.vat or 0) for row in base_rows)),
        },
        'report': {
            'id': report.pk,
            'fiscal_year': getattr(report.fiscal_year, 'name', ''),
            'quarter': report.quarter,
            'quarter_label': str(report.get_quarter_display()),
            'status': report.status,
            'status_label': str(report.get_status_display()),
        },
        'period': {
            'start': period_start.isoformat() if period_start else '',
            'end': period_end.isoformat() if period_end else '',
            'start_jalali': _jalali_text(period_start),
            'end_jalali': _jalali_text(period_end),
        },
        'totals': {
            'count': count,
            'amount': float(amount),
            'vat': float(vat),
            'total': float(amount + vat),
            'average_invoice': float(amount / count) if count else 0.0,
            'registered': registered,
            'pending': count - registered,
            'registered_ratio': round(registered / count, 4) if count else 0.0,
            'vat_ratio': vat_ratio,
        },
        'by_person_type': person_list,
        'by_kind': kind_list,
        'by_month': month_list,
        'by_status': [{
            'key': key,
            'label': 'درج‌شده' if key == 'registered' else 'درج‌نشده',
            'count': value['count'],
            'amount': float(value['amount']),
            'share': _share(value['amount'], amount),
        } for key, value in statuses.items()],
        'top_parties': top_payload,
        'concentration': {
            'parties': len(ranked_parties),
            'hhi': hhi,
            'top1_share': shares[0] if shares else 0.0,
            'top5_share': round(sum(shares[:5]), 4),
            'pareto_parties': pareto,
            'pareto_ratio': _share(pareto, len(ranked_parties)) if ranked_parties else 0.0,
        },
        'quality': {
            'missing_postal_code': missing_postal,
            'missing_invoice_date': missing_date,
            'missing_invoice_no': missing_invoice,
            'aggregate_rows': aggregate_rows,
            'foreign_rows': foreign_rows,
        },
        'insights': insights,
        'ruleset': {'version': seasonal_rules.RULESET_VERSION, 'status': seasonal_rules.RULESET_STATUS},
    }


def _build_insights(*, count, registered, shares, parties, pareto, missing_postal,
                    missing_invoice, missing_date, aggregate_rows, foreign_rows,
                    vat_ratio, has_amount):
    """یافته‌های خودکار و قابل اقدام (هر یافته: سطح، عنوان، توضیح)."""
    insights = []
    if not count:
        insights.append({'level': 'info', 'title': 'گزارش خالی است',
                         'detail': 'هنوز ردیفی برای این فصل ثبت نشده است؛ ابتدا داده وارد کنید.'})
        return insights
    if shares and shares[0] >= 0.3:
        insights.append({'level': 'warning', 'title': 'تمرکز بالای خرید',
                         'detail': f'بیش از {round(shares[0] * 100)}٪ مبلغ خرید از یک طرف معامله است؛ '
                                   'ریسک تمرکز را بررسی کنید.'})
    if shares:
        insights.append({'level': 'info', 'title': 'تحلیل پارتو (۸۰/۲۰)',
                         'detail': f'{pareto} طرف معامله از {parties} طرف، ۸۰٪ مبلغ خرید را تشکیل می‌دهند.'})
    if registered < count:
        insights.append({'level': 'warning', 'title': 'فاکتورهای درج‌نشده در سامانه مودیان',
                         'detail': f'{count - registered} ردیف از {count} ردیف در سامانه مودیان درج نشده است.'})
    if missing_postal:
        insights.append({'level': 'warning', 'title': 'کد پستی ناقص',
                         'detail': f'{missing_postal} ردیف کد پستی ندارد؛ تکمیل آن دقت مغایرت‌گیری را بالا می‌برد.'})
    if missing_invoice:
        insights.append({'level': 'info', 'title': 'شمارهٔ فاکتور ناقص',
                         'detail': f'{missing_invoice} ردیف بدون شمارهٔ فاکتور است؛ تطبیق آن‌ها فقط از روی '
                                   'نام و مبلغ انجام می‌شود.'})
    if missing_date:
        insights.append({'level': 'info', 'title': 'تاریخ فاکتور ناقص',
                         'detail': f'{missing_date} ردیف تاریخ فاکتور ندارد و در روند ماهانه زیر «بدون تاریخ» آمده است.'})
    if has_amount and (vat_ratio > 0.11 or 0 < vat_ratio < 0.09):
        insights.append({'level': 'warning', 'title': 'نرخ مؤثر ارزش افزوده غیرمعمول',
                         'detail': f'نسبت مالیات به مبلغ خرید {round(vat_ratio * 100, 2)}٪ است؛ نرخ استاندارد ۱۰٪ '
                                   'است و انحراف می‌تواند ناشی از کالاهای معاف باشد.'})
    if aggregate_rows:
        insights.append({'level': 'info', 'title': 'ردیف‌های تجمیعی',
                         'detail': f'{aggregate_rows} ردیف «تجمیعی» (تنها با مبلغ) ثبت شده است؛ این ردیف‌ها در '
                                   'مغایرت‌گیری فقط با مبلغ قابل تطبیق‌اند.'})
    if foreign_rows:
        insights.append({'level': 'info', 'title': 'فروشندهٔ خارجی',
                         'detail': f'{foreign_rows} ردیف فروشندهٔ خارجی دارد؛ شناسهٔ ملی برای آن‌ها الزامی نیست.'})
    if count < 10:
        insights.append({'level': 'info', 'title': 'حجم کم ردیف‌ها',
                         'detail': 'تعداد ردیف‌های این فصل کم است؛ پیش از ارسال، کامل‌بودن آن را بررسی کنید.'})
    return insights


# ---------------------------------------------------------------------------
# خواندن فایل دفاتر (اکسل/CSV) و تشخیص ستون‌ها
# ---------------------------------------------------------------------------
COLUMN_ALIASES = {
    'invoice_no': [
        'شماره فاکتور', 'شماره صورتحساب', 'شماره صورت حساب', 'شماره سند', 'شماره سند حسابداری',
        'شماره برگه', 'فاکتور', 'invoice', 'invoice no', 'invoice_no', 'bill no',
    ],
    'invoice_date': [
        'تاریخ فاکتور', 'تاریخ صورتحساب', 'تاریخ صورت حساب', 'تاریخ سند', 'تاریخ برگه',
        'تاریخ', 'date', 'invoice date', 'invoice_date',
    ],
    'party_name': [
        'نام طرف', 'طرف حساب', 'نام طرف حساب', 'نام فروشنده', 'فروشنده', 'نام تامین کننده',
        'تامین کننده', 'شرح حساب', 'تفضیلی', 'نام حساب', 'نام', 'party', 'vendor', 'supplier',
        'name', 'account',
    ],
    'national_id': [
        'شناسه ملی', 'کد ملی', 'شماره ملی', 'شماره اقتصادی', 'کد اقتصادی', 'کد فراگیر',
        'national id', 'national_id', 'economic code',
    ],
    'amount': [
        'مبلغ خرید', 'مبلغ فاکتور', 'مبلغ', 'بدهکار', 'خرید', 'مبلغ ناخالص', 'مبلغ کل خرید',
        'amount', 'debit', 'purchase',
    ],
    'vat': [
        'مالیات بر ارزش افزوده', 'ارزش افزوده', 'مالیات', 'vat', 'tax',
    ],
    'total': [
        'جمع کل', 'جمع', 'مبلغ نهایی', 'بستانکار', 'total', 'credit',
    ],
}

_ALIAS_LOOKUP = {
    re.sub(r'[\s_\-().]+', '', normalize_text(alias)).lower(): field
    for field, aliases in COLUMN_ALIASES.items()
    for alias in aliases
}

SUPPORTED_SUFFIXES = ('.xlsx', '.xlsm', '.csv', '.tsv', '.txt')


@dataclass
class LedgerReadResult:
    """نتیجهٔ خواندن فایل دفاتر به‌همراه نگاشت ستون‌ها برای شفافیت."""

    source: str = ''
    sheet: str = ''
    header_row: int = 0
    mapping: dict = field(default_factory=dict)
    headers: list = field(default_factory=list)
    rows: list = field(default_factory=list)
    skipped: int = 0
    warnings: list = field(default_factory=list)

    def as_dict(self):
        return {
            'source': self.source,
            'sheet': self.sheet,
            'header_row': self.header_row,
            'mapping': {key: self.headers[index] if index < len(self.headers) else ''
                        for key, index in self.mapping.items()},
            'headers': self.headers,
            'rows': len(self.rows),
            'skipped': self.skipped,
            'warnings': self.warnings,
        }


def _match_field(header):
    """نام ستون → فیلد استاندارد (مترادف‌های فارسی/انگلیسی)."""
    key = re.sub(r'[\s_\-().]+', '', normalize_text(header)).lower()
    if not key:
        return None
    if key in _ALIAS_LOOKUP:
        return _ALIAS_LOOKUP[key]
    for alias, field_name in _ALIAS_LOOKUP.items():
        if len(alias) >= 5 and (key.startswith(alias) or alias in key):
            return field_name
    return None


def _detect_header(matrix, explicit=None):
    """بهترین سطر سرصفحه را برمی‌گرداند؛ نگاشت دستی اولویت دارد."""
    best = (0, {}, [], 0)
    for index, row in enumerate(matrix[:25]):
        headers = [normalize_text(cell) for cell in row]
        mapping = {}
        for position, header in enumerate(headers):
            name = (explicit or {}).get(header) or _match_field(header)
            if name and name not in mapping:
                mapping[name] = position
        score = len(mapping)
        if score > best[0]:
            best = (score, mapping, headers, index)
    return best


def _readable(file_obj):
    """جریان قابل‌جابه‌جایی برای خواندن (openpyxl به seek نیاز دارد)."""
    if hasattr(file_obj, 'seek') and hasattr(file_obj, 'read'):
        try:
            file_obj.seek(0)
            return file_obj
        except (OSError, ValueError):
            pass
    data = file_obj.read() if hasattr(file_obj, 'read') else file_obj
    if isinstance(data, bytes):
        return io.BytesIO(data)
    return io.BytesIO(str(data).encode('utf-8'))


def _read_matrix(file_obj):
    """ماتریس خام فایل + نام منبع + نام شیت (xlsx/xlsm/csv/tsv)."""
    name = getattr(file_obj, 'name', '') or 'ledger'
    suffix = ('.' + name.rsplit('.', 1)[-1].lower()) if '.' in name else ''
    if suffix in ('.xlsx', '.xlsm'):
        from openpyxl import load_workbook

        workbook = load_workbook(_readable(file_obj), read_only=True, data_only=True)
        best = (0, '', None)
        try:
            for sheet_name in workbook.sheetnames:
                sheet = workbook[sheet_name]
                matrix = [list(row) for row in sheet.iter_rows(values_only=True)]
                score = _detect_header(matrix)[0]
                if score > best[0]:
                    best = (score, sheet_name, matrix)
                if score >= 4:
                    break
        finally:
            workbook.close()
        if best[2] is None:
            raise ValueError('هیچ شیتی در فایل پیدا نشد.')
        return best[2], name, best[1]

    if suffix in ('.csv', '.tsv', '.txt'):
        raw = file_obj.read() if hasattr(file_obj, 'read') else file_obj
        if isinstance(raw, bytes):
            text = None
            for encoding in ('utf-8-sig', 'utf-8', 'cp1256'):
                try:
                    text = raw.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue
            if text is None:
                raise ValueError('کدگذاری فایل خوانده نشد؛ آن را با UTF-8 ذخیره کنید.')
        else:
            text = str(raw)
        delimiter = '\t' if suffix == '.tsv' else None
        if delimiter is None:
            try:
                delimiter = csv.Sniffer().sniff(text[:4096], delimiters=',;\t|').delimiter
            except csv.Error:
                delimiter = ','
        matrix = [list(row) for row in csv.reader(io.StringIO(text), delimiter=delimiter)]
        return matrix, name, ''

    raise ValueError(
        'فقط فایل‌های xlsx، xlsm، csv و tsv پشتیبانی می‌شوند؛ '
        'فایل‌های قدیمی xls را با «Save As» به xlsx تبدیل کنید.'
    )


def _cell(row, mapping, field_name):
    index = mapping.get(field_name)
    if index is None or index >= len(row):
        return None
    return row[index]


def read_ledger_rows(file_obj, mapping=None, max_rows=50000):
    """فایل دفاتر → ردیف‌های استاندارد (شمارهٔ فاکتور، تاریخ، طرف، مبلغ، مالیات)."""
    matrix, source, sheet = _read_matrix(file_obj)
    score, column_map, headers, header_row = _detect_header(matrix, mapping)
    if score < 2 or ('amount' not in column_map and 'total' not in column_map):
        raise ValueError(
            'ستون «مبلغ» در فایل پیدا نشد. سرصفحه‌هایی مثل «مبلغ»، «بدهکار» یا «مبلغ فاکتور» لازم است.'
        )

    rows, skipped, warnings = [], 0, []
    for offset, raw in enumerate(matrix[header_row + 1:], start=header_row + 2):
        if not raw or not any(str(cell).strip() for cell in raw if cell not in (None, '')):
            continue
        party = _cell(raw, column_map, 'party_name')
        amount = parse_amount(_cell(raw, column_map, 'amount'))
        total_amount = parse_amount(_cell(raw, column_map, 'total'))
        vat_value = parse_amount(_cell(raw, column_map, 'vat'))
        if not amount and total_amount and not vat_value:
            amount = total_amount
        invoice_no = normalize_text(_cell(raw, column_map, 'invoice_no'))
        national_id = normalize_id(_cell(raw, column_map, 'national_id'))
        invoice_date = parse_date(_cell(raw, column_map, 'invoice_date'))
        if not any([party, invoice_no, amount, vat_value, national_id]):
            skipped += 1
            continue
        if not amount and not total_amount:
            skipped += 1
            continue
        rows.append({
            'index': len(rows) + 1,
            'file_row': offset,
            'invoice_no': invoice_no,
            'invoice_no_key': normalize_invoice(invoice_no),
            'invoice_date': invoice_date,
            'party_name': normalize_text(party),
            'name_key': normalize_name(party),
            'national_id': national_id,
            'amount': amount,
            'vat': vat_value,
            'total': total_amount or (amount + vat_value),
        })
        if len(rows) >= max_rows:
            warnings.append(f'فقط {max_rows} ردیف اول خوانده شد؛ فایل را تقسیم کنید.')
            break

    if not rows:
        raise ValueError('هیچ ردیف داده‌ای در فایل پیدا نشد (سطرهای خالی یا بدون مبلغ).')
    if 'party_name' not in column_map:
        warnings.append('ستون «نام طرف/فروشنده» پیدا نشد؛ تطبیق فقط از روی شمارهٔ فاکتور و مبلغ انجام می‌شود.')
    if 'invoice_no' not in column_map:
        warnings.append('ستون «شمارهٔ فاکتور» پیدا نشد؛ تطبیق از روی نام و مبلغ انجام می‌شود.')
    if 'invoice_date' not in column_map:
        warnings.append('ستون «تاریخ» پیدا نشد؛ مغایرت تاریخ بررسی نمی‌شود.')

    return LedgerReadResult(
        source=source,
        sheet=sheet or '',
        header_row=header_row + 1,
        mapping=column_map,
        headers=headers,
        rows=rows,
        skipped=skipped,
        warnings=warnings,
    )


# ---------------------------------------------------------------------------
# موتور مغایرت‌گیری
# ---------------------------------------------------------------------------
@dataclass
class MatchOptions:
    """پارامترهای قابل تنظیم موتور تطبیق."""

    amount_tolerance: Decimal = Decimal('1000')
    amount_tolerance_pct: float = 0.001
    date_window_days: int = 3
    name_threshold: float = 0.86
    min_score: float = 0.55

    @classmethod
    def from_payload(cls, payload):
        payload = payload or {}

        def number(key, default, cast):
            try:
                value = payload.get(key)
                return cast(value) if value not in (None, '') else default
            except (TypeError, ValueError):
                return default

        return cls(
            amount_tolerance=number('amount_tolerance', Decimal('1000'), lambda v: Decimal(str(v))),
            amount_tolerance_pct=number('amount_tolerance_pct', 0.001, float),
            date_window_days=max(0, number('date_window_days', 3, int)),
            name_threshold=min(0.99, max(0.5, number('name_threshold', 0.86, float))),
            min_score=min(0.9, max(0.2, number('min_score', 0.55, float))),
        )

    def as_dict(self):
        return {
            'amount_tolerance': float(self.amount_tolerance),
            'amount_tolerance_pct': self.amount_tolerance_pct,
            'date_window_days': self.date_window_days,
            'name_threshold': self.name_threshold,
            'min_score': self.min_score,
        }


def _seasonal_records(report, direction):
    records = []
    for row in _rows_for(report, direction):
        name = row.name or ' '.join(part for part in [row.first_name, row.last_name] if part)
        records.append({
            'id': row.id,
            'line_no': row.line_no,
            'invoice_no': row.invoice_no or '',
            'invoice_no_key': normalize_invoice(row.invoice_no),
            'invoice_date': row.invoice_date,
            'party_name': normalize_text(name),
            'name_key': normalize_name(name),
            'national_id': normalize_id(row.national_id),
            'amount': row.amount or Decimal('0'),
            'vat': row.vat or Decimal('0'),
            'total': (row.amount or 0) + (row.vat or 0),
            'person_type': row.person_type,
            'kind': int(row.kind or 1),
        })
    return records


def _tolerance(seasonal_amount, options):
    base = options.amount_tolerance
    if options.amount_tolerance_pct:
        scaled = Decimal(str(abs(float(seasonal_amount)) * options.amount_tolerance_pct))
        return max(base, scaled)
    return base


def _score_pair(seasonal, ledger, options):
    """امتیاز یک جفت + شواهد (برای توضیح‌پذیری و نمایش در رابط کاربری)."""
    invoice_exact = bool(seasonal['invoice_no_key']) and seasonal['invoice_no_key'] == ledger['invoice_no_key']
    id_exact = bool(seasonal['national_id']) and seasonal['national_id'] == ledger['national_id']
    similarity = name_similarity(seasonal['party_name'], ledger['party_name'])
    amount_delta = ledger['amount'] - seasonal['amount']
    tolerance = _tolerance(seasonal['amount'], options)
    if amount_delta == 0:
        amount_state = 'equal'
    elif abs(amount_delta) <= tolerance:
        amount_state = 'within_tolerance'
    else:
        amount_state = 'different'
    date_days = None
    date_state = 'unknown'
    if seasonal['invoice_date'] and ledger['invoice_date']:
        date_days = (ledger['invoice_date'] - seasonal['invoice_date']).days
        if date_days == 0:
            date_state = 'equal'
        elif abs(date_days) <= options.date_window_days:
            date_state = 'near'
        else:
            date_state = 'different'
    vat_state = 'equal' if seasonal['vat'] == ledger['vat'] else 'different'

    score = 0.0
    if invoice_exact:
        score += 0.45
    if id_exact:
        score += 0.22
    score += 0.20 * similarity
    if amount_state == 'equal':
        score += 0.15
    elif amount_state == 'within_tolerance':
        score += 0.10 * (1 - float(abs(amount_delta)) / float(tolerance + 1))
    if date_state == 'equal':
        score += 0.10
    elif date_state == 'near':
        score += 0.06
    if vat_state == 'equal':
        score += 0.05

    # سقف امتیاز متناسب با شواهدِ موجود است (نه یک عدد ثابت)، تا ردیف‌های بدون
    # شمارهٔ فاکتور یا بدون شناسه هم بتوانند با نام/مبلغ به‌درستی تطبیق شوند.
    max_score = 0.20 + 0.15 + 0.05
    if seasonal['invoice_no_key'] and ledger['invoice_no_key']:
        max_score += 0.45
    if seasonal['national_id'] and ledger['national_id']:
        max_score += 0.22
    if seasonal['invoice_date'] and ledger['invoice_date']:
        max_score += 0.10

    gate = (
        invoice_exact
        or (id_exact and amount_state != 'different')
        or (similarity >= options.name_threshold and amount_state != 'different')
    )
    confidence = round(min(1.0, score / max_score), 4) if max_score else 0.0
    strong_key = (invoice_exact and amount_state != 'different') or (id_exact and amount_state == 'equal')
    accepted = gate and (confidence >= options.min_score or strong_key)
    return {
        'accepted': accepted,
        'confidence': confidence,
        'evidence': {
            'invoice_exact': invoice_exact,
            'national_id_exact': id_exact,
            'name_similarity': round(similarity, 4),
            'amount_state': amount_state,
            'amount_delta': float(amount_delta),
            'amount_tolerance': float(tolerance),
            'date_state': date_state,
            'date_days': date_days,
            'vat_state': vat_state,
        },
    }


FIELD_LABELS = {
    'amount': 'مبلغ',
    'vat': 'مالیات بر ارزش افزوده',
    'invoice_date': 'تاریخ فاکتور',
    'party_name': 'نام طرف معامله',
    'invoice_no': 'شمارهٔ فاکتور',
    'national_id': 'شناسه/کد ملی',
}


def _build_index(seasonal_records):
    """ایندکس‌های blocking: شمارهٔ فاکتور، شناسهٔ ملی و توکن‌های نام."""
    by_invoice, by_id, by_token = {}, {}, {}
    for record in seasonal_records:
        if record['invoice_no_key']:
            by_invoice.setdefault(record['invoice_no_key'], []).append(record)
        if record['national_id']:
            by_id.setdefault(record['national_id'], []).append(record)
        for token in name_tokens(record['party_name'])[:3]:
            by_token.setdefault(token, []).append(record)
    return by_invoice, by_id, by_token


def _candidates(index, ledger_row, limit=60, bucket_limit=40):
    """کاندیدهای یک ردیف دفاتر (بدون مقایسهٔ تمام‌به‌تمام)."""
    by_invoice, by_id, by_token = index
    found = {}
    if ledger_row['invoice_no_key']:
        for record in by_invoice.get(ledger_row['invoice_no_key'], []):
            found[record['id']] = record
    if ledger_row['national_id']:
        for record in by_id.get(ledger_row['national_id'], []):
            found[record['id']] = record
    for token in name_tokens(ledger_row['party_name'])[:3]:
        for record in by_token.get(token, [])[:bucket_limit]:
            found.setdefault(record['id'], record)
    return list(found.values())[:limit]


def _build_pairs(seasonal_records, ledger_rows, options):
    index = _build_index(seasonal_records)
    pairs = []
    for ledger_row in ledger_rows:
        for record in _candidates(index, ledger_row):
            result = _score_pair(record, ledger_row, options)
            if not result['accepted']:
                continue
            pairs.append({
                'seasonal_id': record['id'],
                'ledger_index': ledger_row['index'],
                'confidence': result['confidence'],
                'evidence': result['evidence'],
            })
    pairs.sort(key=lambda item: (item['confidence'], item['evidence']['invoice_exact']), reverse=True)
    return pairs


def _differences(record, ledger_row, evidence):
    """اختلاف‌های قابل نمایش هر جفت (با شدت و مقدار دو طرف)."""
    differences = []
    if evidence['amount_state'] == 'different':
        differences.append({
            'field': 'amount', 'label': FIELD_LABELS['amount'], 'severity': 'error',
            'seasonal': float(record['amount']), 'ledger': float(ledger_row['amount']),
            'delta': evidence['amount_delta'],
        })
    elif evidence['amount_state'] == 'within_tolerance' and evidence['amount_delta']:
        differences.append({
            'field': 'amount', 'label': f'{FIELD_LABELS["amount"]} (اختلاف جزئی)', 'severity': 'warning',
            'seasonal': float(record['amount']), 'ledger': float(ledger_row['amount']),
            'delta': evidence['amount_delta'],
        })
    if evidence['date_state'] == 'different':
        differences.append({
            'field': 'invoice_date', 'label': FIELD_LABELS['invoice_date'], 'severity': 'warning',
            'seasonal': record['invoice_date'].isoformat() if record['invoice_date'] else '',
            'ledger': ledger_row['invoice_date'].isoformat() if ledger_row['invoice_date'] else '',
            'delta_days': evidence['date_days'],
        })
    if evidence['vat_state'] == 'different':
        differences.append({
            'field': 'vat', 'label': FIELD_LABELS['vat'], 'severity': 'warning',
            'seasonal': float(record['vat']), 'ledger': float(ledger_row['vat']),
            'delta': float(ledger_row['vat'] - record['vat']),
        })
    if evidence['name_similarity'] < 0.999:
        differences.append({
            'field': 'party_name', 'label': FIELD_LABELS['party_name'],
            'severity': 'info' if evidence['name_similarity'] >= 0.86 else 'warning',
            'seasonal': record['party_name'], 'ledger': ledger_row['party_name'],
            'similarity': evidence['name_similarity'],
        })
    if not evidence['invoice_exact']:
        differences.append({
            'field': 'invoice_no', 'label': FIELD_LABELS['invoice_no'], 'severity': 'warning',
            'seasonal': record['invoice_no'], 'ledger': ledger_row['invoice_no'],
        })
    if record['national_id'] and ledger_row['national_id'] and not evidence['national_id_exact']:
        differences.append({
            'field': 'national_id', 'label': FIELD_LABELS['national_id'], 'severity': 'warning',
            'seasonal': record['national_id'], 'ledger': ledger_row['national_id'],
        })
    return differences


def _seasonal_payload(record):
    return {
        'id': record['id'],
        'line_no': record['line_no'],
        'invoice_no': record['invoice_no'],
        'invoice_date': record['invoice_date'].isoformat() if record['invoice_date'] else '',
        'party_name': record['party_name'],
        'national_id': record['national_id'],
        'amount': float(record['amount']),
        'vat': float(record['vat']),
        'total': float(record['total']),
        'person_type': record['person_type'],
        'kind': record['kind'],
    }


def _ledger_payload(row):
    return {
        'index': row['index'],
        'file_row': row['file_row'],
        'invoice_no': row['invoice_no'],
        'invoice_date': row['invoice_date'].isoformat() if row['invoice_date'] else '',
        'party_name': row['party_name'],
        'national_id': row['national_id'],
        'amount': float(row['amount']),
        'vat': float(row['vat']),
        'total': float(row['total']),
    }


def _suggested_row(row):
    """ردیف پیشنهادی برای افزودن به جدول فصلی (هم‌شکل با گرید فرانت)."""
    return {
        'name': row['party_name'],
        'personType': 'legal' if len(row['national_id']) == 11 else 'natural',
        'nationalId': row['national_id'],
        'postalCode': '',
        'country': 'ایران',
        'city': '',
        'address': '',
        'description': '',
        'amount': str(int(row['amount'])),
        'vat': str(int(row['vat'])),
        'kind': 1,
        'invoiceDate': row['invoice_date'].isoformat() if row['invoice_date'] else '',
        'invoiceNo': row['invoice_no'],
        'status': 'pending',
        'source': 'ledger',
    }


ITEM_LABELS = {
    'matched': 'تطبیق کامل',
    'difference': 'اختلاف جزئی',
    'amount_mismatch': 'مغایرت مبلغ',
    'missing_in_ledger': 'فقط در فصلی',
    'missing_in_seasonal': 'فقط در دفاتر',
}

_ITEM_ORDER = {
    'amount_mismatch': 0,
    'difference': 1,
    'missing_in_seasonal': 2,
    'missing_in_ledger': 3,
    'matched': 4,
}


def _duplicate_keys(rows, key='invoice_no_key'):
    buckets = {}
    for row in rows:
        value = row.get(key)
        if value:
            buckets.setdefault(value, []).append(row)
    return {value: len(items) for value, items in buckets.items() if len(items) > 1}


def _item(record, row, differences, confidence, evidence, kind, severity):
    labels = [difference['label'] for difference in differences
              if difference['severity'] in ('error', 'warning')]
    return {
        'key': f'm-{record["id"]}-{row["index"]}',
        'kind': kind,
        'kind_label': ITEM_LABELS[kind],
        'severity': severity,
        'confidence': confidence,
        'evidence': evidence,
        'seasonal': _seasonal_payload(record),
        'ledger': _ledger_payload(row),
        'differences': differences,
        'message': ITEM_LABELS[kind] if not labels else f'{ITEM_LABELS[kind]}: {"، ".join(labels)}',
    }


def _only_item(record, row, kind, message, severity):
    return {
        'key': f's-{record["id"]}' if record else f'l-{row["index"]}',
        'kind': kind,
        'kind_label': ITEM_LABELS[kind],
        'severity': severity,
        'confidence': 0.0,
        'evidence': {},
        'seasonal': _seasonal_payload(record) if record else None,
        'ledger': _ledger_payload(row) if row else None,
        'differences': [],
        'message': message,
    }


def _totals_of(values):
    return {
        'count': len(values),
        'amount': float(sum((value['amount'] for value in values), Decimal('0'))),
        'vat': float(sum((value['vat'] for value in values), Decimal('0'))),
        'total': float(sum((value['total'] for value in values), Decimal('0'))),
    }


def _match_items(seasonal, ledger, options):
    """جفت‌های قطعی‌شده (یک‌به‌یک) + مجموعهٔ شناسه‌های استفاده‌شده."""
    pairs = _build_pairs(seasonal, ledger, options)
    records_by_id = {record['id']: record for record in seasonal}
    rows_by_index = {row['index']: row for row in ledger}
    used_seasonal, used_ledger, items = set(), set(), []
    for pair in pairs:
        if pair['seasonal_id'] in used_seasonal or pair['ledger_index'] in used_ledger:
            continue
        used_seasonal.add(pair['seasonal_id'])
        used_ledger.add(pair['ledger_index'])
        record = records_by_id[pair['seasonal_id']]
        row = rows_by_index[pair['ledger_index']]
        differences = _differences(record, row, pair['evidence'])
        severities = {difference['severity'] for difference in differences}
        if 'error' in severities:
            kind, severity = 'amount_mismatch', 'error'
        elif 'warning' in severities:
            kind, severity = 'difference', 'warning'
        else:
            kind, severity = 'matched', 'info'
        items.append(_item(record, row, differences, pair['confidence'], pair['evidence'], kind, severity))
    return items, used_seasonal, used_ledger, records_by_id, rows_by_index


def _summary_of(seasonal, ledger, items, used_seasonal, used_ledger, records_by_id, rows_by_index):
    """خلاصهٔ کنترلی مغایرت‌گیری (جمع‌ها، پوشش، اختلاف‌ها، تکراری‌ها)."""
    seasonal_totals = _totals_of(seasonal)
    ledger_totals = _totals_of(ledger)
    matched = [item for item in items if item['kind'] in ('matched', 'difference', 'amount_mismatch')]
    matched_seasonal = [records_by_id[int(item['seasonal']['id'])] for item in matched]
    matched_ledger = [rows_by_index[int(item['ledger']['index'])] for item in matched]
    average_confidence = (round(sum(item['confidence'] for item in matched) / len(matched), 4)
                          if matched else 0.0)

    def count_kind(kind):
        return len([item for item in items if item['kind'] == kind])

    return {
        'seasonal': seasonal_totals,
        'ledger': ledger_totals,
        'matched': {**_totals_of(matched_seasonal), 'average_confidence': average_confidence},
        'matched_ledger': _totals_of(matched_ledger),
        'only_in_seasonal': _totals_of([record for record in seasonal if record['id'] not in used_seasonal]),
        'only_in_ledger': _totals_of([row for row in ledger if row['index'] not in used_ledger]),
        'differences': {
            'amount': sum(1 for item in matched if item['evidence'].get('amount_state') == 'different'),
            'amount_minor': sum(1 for item in matched
                                if item['evidence'].get('amount_state') == 'within_tolerance'
                                and item['evidence'].get('amount_delta')),
            'date': sum(1 for item in matched if item['evidence'].get('date_state') == 'different'),
            'vat': sum(1 for item in matched if item['evidence'].get('vat_state') == 'different'),
            'party': sum(1 for item in matched if item['evidence'].get('name_similarity', 1) < 0.86),
            'invoice': sum(1 for item in matched if not item['evidence'].get('invoice_exact')),
        },
        'amount_delta': float(seasonal_totals['amount'] - ledger_totals['amount']),
        'vat_delta': float(seasonal_totals['vat'] - ledger_totals['vat']),
        'coverage': {
            'seasonal_matched_ratio': round(len(matched) / len(seasonal), 4) if seasonal else 0.0,
            'ledger_matched_ratio': round(len(matched) / len(ledger), 4) if ledger else 0.0,
        },
        'duplicates': {'seasonal': _duplicate_keys(seasonal), 'ledger': _duplicate_keys(ledger)},
        'counts': {
            'items': len(items),
            'matched': count_kind('matched'),
            'difference': count_kind('difference'),
            'amount_mismatch': count_kind('amount_mismatch'),
            'missing_in_seasonal': count_kind('missing_in_seasonal'),
            'missing_in_ledger': count_kind('missing_in_ledger'),
            'errors': len([item for item in items if item['severity'] == 'error']),
            'warnings': len([item for item in items if item['severity'] == 'warning']),
        },
    }


def reconcile(report, ledger_rows, options=None, direction=seasonal_rules.DIRECTION, source_info=None):
    """تطبیق ردیف‌های فصلی با فایل دفاتر و ساخت گزارش مغایرت قابل توضیح.

    مراحل: blocking (فهرست کاندیدها) → scoring (شواهد وزن‌دار) → انتساب یک‌به‌یک
    حریصانه بر اساس اطمینان → طبقه‌بندی (تطبیق/اختلاف جزئی/مغایرت مبلغ/فقط یک طرف).
    """
    options = options or MatchOptions()
    seasonal = _seasonal_records(report, direction)
    ledger = [dict(row) for row in ledger_rows]

    items, used_seasonal, used_ledger, records_by_id, rows_by_index = _match_items(
        seasonal, ledger, options,
    )
    for record in seasonal:
        if record['id'] in used_seasonal:
            continue
        items.append(_only_item(record, None, 'missing_in_ledger',
                                'این ردیف در فایل دفاتر پیدا نشد.', 'warning'))

    suggested_rows = []
    for row in ledger:
        if row['index'] in used_ledger:
            continue
        suggested_rows.append(_suggested_row(row))
        items.append(_only_item(None, row, 'missing_in_seasonal',
                                'این ردیف در گزارش فصلی ثبت نشده است.', 'error'))

    items.sort(key=lambda item: (
        _ITEM_ORDER.get(item['kind'], 9),
        -float((item['seasonal'] or item['ledger'] or {}).get('amount') or 0),
    ))
    summary = _summary_of(seasonal, ledger, items, used_seasonal, used_ledger,
                          records_by_id, rows_by_index)
    return {
        'direction': direction,
        'report': {
            'id': report.pk,
            'fiscal_year': getattr(report.fiscal_year, 'name', ''),
            'quarter': report.quarter,
            'quarter_label': str(report.get_quarter_display()),
        },
        'source': source_info or {},
        'options': options.as_dict(),
        'summary': summary,
        'items': items,
        'suggested_rows': suggested_rows[:500],
        'ruleset': {'version': seasonal_rules.RULESET_VERSION, 'status': seasonal_rules.RULESET_STATUS},
    }


# ---------------------------------------------------------------------------
# خروجی اکسل مغایرت‌گیری
# ---------------------------------------------------------------------------
def _num(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


RECON_HEADERS = [
    'ردیف', 'نوع مغایرت', 'شدت', 'اطمینان', 'نام طرف (فصلی)', 'نام طرف (دفاتر)',
    'شمارهٔ فاکتور (فصلی)', 'شمارهٔ فاکتور (دفاتر)', 'تاریخ فصلی', 'تاریخ دفاتر',
    'مبلغ فصلی', 'مبلغ دفاتر', 'اختلاف مبلغ', 'مالیات فصلی', 'مالیات دفاتر', 'شرح مغایرت',
]


def _sheet_items(workbook, title, items, styles):
    from openpyxl.utils import get_column_letter

    head_font, head_fill, border, center, right = styles
    sheet = workbook.create_sheet(title)
    sheet.sheet_view.rightToLeft = True
    sheet.append(RECON_HEADERS)
    for index, header in enumerate(RECON_HEADERS, start=1):
        cell = sheet.cell(row=1, column=index)
        cell.font = head_font
        cell.fill = head_fill
        cell.alignment = center
        cell.border = border
        sheet.column_dimensions[get_column_letter(index)].width = max(12, min(34, len(header) + 6))
    for row_number, item in enumerate(items, start=2):
        seasonal = item.get('seasonal') or {}
        ledger = item.get('ledger') or {}
        sheet.append([
            row_number - 1,
            item.get('kind_label', ''),
            {'error': 'خطا', 'warning': 'هشدار'}.get(item.get('severity'), 'اطلاع'),
            item.get('confidence', 0),
            seasonal.get('party_name', ''),
            ledger.get('party_name', ''),
            seasonal.get('invoice_no', ''),
            ledger.get('invoice_no', ''),
            seasonal.get('invoice_date', ''),
            ledger.get('invoice_date', ''),
            _num(seasonal.get('amount')),
            _num(ledger.get('amount')),
            _num(ledger.get('amount')) - _num(seasonal.get('amount')),
            _num(seasonal.get('vat')),
            _num(ledger.get('vat')),
            item.get('message', ''),
        ])
        for column in (11, 12, 13, 14, 15):
            sheet.cell(row=row_number, column=column).number_format = '#,##0'
        for column in (5, 6, 7, 8, 9, 10, 16):
            sheet.cell(row=row_number, column=column).alignment = right
        for column in (1, 2, 3, 4):
            sheet.cell(row=row_number, column=column).alignment = center
    sheet.freeze_panes = 'A2'
    sheet.auto_filter.ref = f'A1:P{max(1, len(items) + 1)}'
    return sheet


def build_reconciliation_workbook(result):
    """اکسل مغایرت‌گیری: خلاصه، مغایرت‌ها، فقط دفاتر، فقط فصلی، تطبیق‌شده، نگاشت ستون‌ها."""
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

    workbook = Workbook()
    styles = (
        Font(bold=True, color='FFFFFF'),
        PatternFill('solid', fgColor='B45309'),
        Border(*[Side(style='thin', color='CBD5E1')] * 4),
        Alignment(horizontal='center', vertical='center', wrap_text=True),
        Alignment(horizontal='right', vertical='center', wrap_text=False),
    )
    head_font, head_fill, _border, center, _right = styles

    summary = result.get('summary', {})
    source = result.get('source', {})
    report = result.get('report', {})
    seasonal_totals = summary.get('seasonal', {})
    ledger_totals = summary.get('ledger', {})
    matched = summary.get('matched', {})
    only_seasonal = summary.get('only_in_seasonal', {})
    only_ledger = summary.get('only_in_ledger', {})
    differences = summary.get('differences', {})
    counts = summary.get('counts', {})

    sheet = workbook.active
    sheet.title = 'خلاصه'
    sheet.sheet_view.rightToLeft = True
    sheet.append(['گزارش مغایرت‌گیری صورت معاملات فصلی خرید'])
    sheet['A1'].font = Font(bold=True, size=13)
    sheet.append([])
    for label, value in [
        ('سال مالی', report.get('fiscal_year', '')),
        ('فصل', report.get('quarter_label', '')),
        ('فایل دفاتر', source.get('source', '')),
        ('شیت', source.get('sheet', '')),
        ('سطر سرصفحه', source.get('header_row', '')),
        ('تعداد ردیف فایل', source.get('rows', ledger_totals.get('count', 0))),
        ('تاریخ اجرا', datetime.now().strftime('%Y-%m-%d %H:%M')),
        ('', ''),
        ('ردیف‌های فصلی', seasonal_totals.get('count', 0)),
        ('مبلغ فصلی', seasonal_totals.get('amount', 0)),
        ('ردیف‌های دفاتر', ledger_totals.get('count', 0)),
        ('مبلغ دفاتر', ledger_totals.get('amount', 0)),
        ('تطبیق‌یافته', matched.get('count', 0)),
        ('مبلغ تطبیق‌یافته', matched.get('amount', 0)),
        ('میانگین اطمینان تطبیق', matched.get('average_confidence', 0)),
        ('اختلاف مبلغ کل (فصلی − دفاتر)', summary.get('amount_delta', 0)),
        ('اختلاف ارزش افزوده (فصلی − دفاتر)', summary.get('vat_delta', 0)),
        ('فقط در فصلی', only_seasonal.get('count', 0)),
        ('مبلغ فقط در فصلی', only_seasonal.get('amount', 0)),
        ('فقط در دفاتر', only_ledger.get('count', 0)),
        ('مبلغ فقط در دفاتر', only_ledger.get('amount', 0)),
        ('مغایرت مبلغ', differences.get('amount', 0)),
        ('اختلاف تاریخ', differences.get('date', 0)),
        ('اختلاف ارزش افزوده', differences.get('vat', 0)),
        ('اختلاف نام طرف', differences.get('party', 0)),
        ('تطبیق بدون شمارهٔ فاکتور یکسان', differences.get('invoice', 0)),
        ('خطاها', counts.get('errors', 0)),
        ('هشدارها', counts.get('warnings', 0)),
        ('نسخهٔ قواعد', result.get('ruleset', {}).get('version', '')),
    ]:
        sheet.append([label, value])
    sheet.column_dimensions['A'].width = 40
    sheet.column_dimensions['B'].width = 30

    items = result.get('items', [])
    _sheet_items(workbook, 'مغایرت‌ها',
                 [item for item in items if item['kind'] in ('amount_mismatch', 'difference')], styles)
    _sheet_items(workbook, 'فقط در فصلی',
                 [item for item in items if item['kind'] == 'missing_in_ledger'], styles)
    _sheet_items(workbook, 'فقط در دفاتر',
                 [item for item in items if item['kind'] == 'missing_in_seasonal'], styles)
    _sheet_items(workbook, 'تطبیق‌شده', [item for item in items if item['kind'] == 'matched'], styles)

    mapping = workbook.create_sheet('نگاشت ستون‌ها')
    mapping.sheet_view.rightToLeft = True
    mapping.append(['فیلد استاندارد', 'ستون در فایل'])
    for index in (1, 2):
        cell = mapping.cell(row=1, column=index)
        cell.font = head_font
        cell.fill = head_fill
        cell.alignment = center
    for field_name, column_name in (source.get('mapping') or {}).items():
        mapping.append([FIELD_LABELS.get(field_name, field_name), column_name])
    mapping.column_dimensions['A'].width = 28
    mapping.column_dimensions['B'].width = 34

    sheet.append([])
    sheet.append(['هشدارهای خواندن فایل'])
    sheet.cell(row=sheet.max_row, column=1).font = Font(bold=True)
    for warning in (source.get('warnings') or ['—']):
        sheet.append(['', warning])

    return workbook


















# ---------------------------------------------------------------------------
# خروجی اکسل گزارش تحلیلی (با فیلتر)
# ---------------------------------------------------------------------------
ANALYTICS_ROW_HEADERS = [
    'ردیف', 'نوع طرف معامله', 'نام طرف', 'شناسه/کد ملی', 'شمارهٔ فاکتور', 'تاریخ فاکتور',
    'مبلغ', 'مالیات بر ارزش افزوده', 'جمع کل', 'نوع معامله', 'وضعیت سامانه مودیان', 'شرح کالا/خدمات',
]


def _filters_text(filters):
    parts = []
    if filters.get('kind'):
        parts.append(f'نوع معامله = {filters["kind"]}')
    if filters.get('moadian_status'):
        parts.append('وضعیت مودیان = '
                     + ('درج‌شده' if filters['moadian_status'] == 'registered' else 'درج‌نشده'))
    if filters.get('person_type'):
        parts.append('نوع طرف = ' + dict(seasonal_rules.PERSON_TYPES).get(filters['person_type'], ''))
    if filters.get('search'):
        parts.append(f'جستجو = {filters["search"]}')
    return ' · '.join(parts) or 'بدون فیلتر'


def _workbook_styles():
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

    return {
        'head_font': Font(bold=True, color='FFFFFF'),
        'head_fill': PatternFill('solid', fgColor='0F766E'),
        'border': Border(*[Side(style='thin', color='CBD5E1')] * 4),
        'center': Alignment(horizontal='center', vertical='center', wrap_text=True),
        'right': Alignment(horizontal='right', vertical='center'),
    }


def build_analytics_workbook(analytics, rows):
    """اکسل گزارش تحلیلی فیلترشده: خلاصه، ماهانه، توزیع‌ها، طرف‌ها، ردیف‌ها."""
    from openpyxl import Workbook
    from openpyxl.styles import Font
    from openpyxl.utils import get_column_letter

    styles = _workbook_styles()
    head_font, head_fill, border, center = (
        styles['head_font'], styles['head_fill'], styles['border'], styles['center'],
    )

    workbook = Workbook()
    summary = workbook.active
    summary.title = 'خلاصه'
    summary.sheet_view.rightToLeft = True
    summary.append(['گزارش تحلیلی صورت معاملات فصلی خرید'])
    summary['A1'].font = Font(bold=True, size=13)
    summary.append([])
    totals = analytics.get('totals', {})
    report = analytics.get('report', {})
    period = analytics.get('period', {})
    unfiltered = analytics.get('unfiltered', {})
    filters = analytics.get('filters', {})
    for label, value in [
        ('سال مالی', report.get('fiscal_year', '')),
        ('فصل', report.get('quarter_label', '')),
        ('بازهٔ فصل', f'{period.get("start_jalali", "")} تا {period.get("end_jalali", "")}'),
        ('فیلتر اعمال‌شده', _filters_text(filters)),
        ('تاریخ اجرا', datetime.now().strftime('%Y-%m-%d %H:%M')),
        ('', ''),
        ('تعداد ردیف (فیلترشده)', totals.get('count', 0)),
        ('تعداد کل فصل', unfiltered.get('count', 0)),
        ('جمع مبلغ خرید', totals.get('amount', 0)),
        ('جمع مالیات بر ارزش افزوده', totals.get('vat', 0)),
        ('جمع کل', totals.get('total', 0)),
        ('نرخ مؤثر ارزش افزوده', totals.get('vat_ratio', 0)),
        ('میانگین مبلغ فاکتور', totals.get('average_invoice', 0)),
        ('درج‌شده در سامانه مودیان', totals.get('registered', 0)),
        ('شاخص تمرکز HHI', analytics.get('concentration', {}).get('hhi', 0)),
        ('سهم بزرگ‌ترین طرف', analytics.get('concentration', {}).get('top1_share', 0)),
        ('نسخهٔ قواعد', analytics.get('ruleset', {}).get('version', '')),
    ]:
        summary.append([label, value])
    summary.column_dimensions['A'].width = 34
    summary.column_dimensions['B'].width = 34

    def add_sheet(title, headers, data, widths=None, number_columns=()):
        target = workbook.create_sheet(title)
        target.sheet_view.rightToLeft = True
        target.append(headers)
        for index, header in enumerate(headers, start=1):
            cell = target.cell(row=1, column=index)
            cell.font = head_font
            cell.fill = head_fill
            cell.alignment = center
            cell.border = border
            target.column_dimensions[get_column_letter(index)].width = (
                (widths or {}).get(index) or max(12, min(34, len(str(header)) + 6))
            )
        for row_number, values in enumerate(data, start=2):
            target.append(values)
            for column in number_columns:
                target.cell(row=row_number, column=column).number_format = '#,##0'
        target.freeze_panes = 'A2'
        if data:
            target.auto_filter.ref = f'A1:{get_column_letter(len(headers))}{len(data) + 1}'
        return target

    add_sheet('ماهانه', ['ماه شمسی', 'تعداد ردیف', 'مبلغ'], [
        [entry['label'], entry['count'], entry['amount']] for entry in analytics.get('by_month', [])
    ], number_columns=(3,))
    add_sheet('نوع معامله', ['نوع', 'تعداد ردیف', 'مبلغ', 'مالیات'],
              [[entry['label'], entry['count'], entry['amount'], entry.get('vat', 0)]
               for entry in analytics.get('by_kind', [])], number_columns=(3, 4))
    add_sheet('نوع طرف معامله', ['نوع طرف', 'تعداد ردیف', 'مبلغ', 'سهم'],
              [[entry['label'], entry['count'], entry['amount'], entry.get('share', 0)]
               for entry in analytics.get('by_person_type', [])], number_columns=(3, 4))
    add_sheet('وضعیت مودیان', ['وضعیت', 'تعداد ردیف', 'مبلغ', 'سهم'],
              [[entry['label'], entry['count'], entry['amount'], entry.get('share', 0)]
               for entry in analytics.get('by_status', [])], number_columns=(3, 4))
    add_sheet('طرف‌های برتر',
              ['رتبه', 'نام طرف', 'نوع', 'شناسه/کد ملی', 'تعداد فاکتور', 'مبلغ', 'سهم', 'سهم تجمعی'],
              [[party['rank'], party['name'], party['person_type_label'], party['national_id'],
                party['count'], party['amount'], party['share'], party['cumulative_share']]
               for party in analytics.get('top_parties', [])], number_columns=(6, 7, 8))

    label_of_type = dict(seasonal_rules.PERSON_TYPES)
    add_sheet('ردیف‌ها', ANALYTICS_ROW_HEADERS, [
        [
            index,
            label_of_type.get(row.person_type, ''),
            row.name or ' '.join(part for part in [row.first_name, row.last_name] if part),
            row.national_id or '',
            row.invoice_no or '',
            _jalali_text(row.invoice_date),
            float(row.amount or 0),
            float(row.vat or 0),
            float((row.amount or 0) + (row.vat or 0)),
            int(row.kind or 1),
            'درج‌شده' if row.moadian_status == SeasonalTransaction.MoadianStatus.REGISTERED else 'درج‌نشده',
            row.goods_service_desc or '',
        ]
        for index, row in enumerate(rows, start=1)
    ], widths={3: 30, 12: 40}, number_columns=(7, 8, 9))

    summary.append([])
    summary.append(['یافته‌های گزارش'])
    for insight in analytics.get('insights', []) or [{'title': '—', 'detail': '—'}]:
        summary.append([insight.get('title', ''), insight.get('detail', '')])

    return workbook


