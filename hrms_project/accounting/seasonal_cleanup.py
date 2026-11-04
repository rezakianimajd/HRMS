"""بازگردانی ردیف‌هایی که از «جاافتاده‌های» مغایرت‌گیری به جدول فصلی اضافه شده‌اند.

هنگام مغایرت‌گیری، ردیف‌های «فقط در دفاتر» می‌توانند با یک کلیک به جدول اضافه شوند.
اگر این کار اشتباه انجام شود، باید بتوان همین ردیف‌ها را حذف کرد **بدون آن‌که
ردیف‌های دستیِ کاربر آسیب ببینند**. برای همین فقط ردیف‌هایی حذف می‌شوند که
هم شمارهٔ فاکتور (یا شناسهٔ ملی/نام در نبود شمارهٔ فاکتور) و هم مبلغ و مالیات آن‌ها
دقیقاً با ردیف‌های «فقط در دفاتر» همان اجرای مغایرت‌گیری برابر باشد.
"""
from decimal import Decimal

from django.db import transaction
from django.db.models import F

from accounting.models import SeasonalTransaction
from accounting.seasonal_reconcile import normalize_id, normalize_invoice, normalize_name


def _decimal(value):
    try:
        return Decimal(str(value or 0))
    except (TypeError, ValueError):
        return Decimal('0')


def suggested_keys(run):
    """کلید ردیف‌های «فقط در دفاتر» از جزئیات یک اجرای مغایرت‌گیری."""
    if run is None:
        return []
    items = ((run.detail or {}).get('items') or [])
    keys = []
    for item in items:
        if not isinstance(item, dict) or item.get('kind') != 'missing_in_seasonal':
            continue
        ledger = item.get('ledger') or {}
        keys.append({
            'invoice_no': normalize_invoice(ledger.get('invoice_no')),
            'national_id': normalize_id(ledger.get('national_id')),
            'name': normalize_name(ledger.get('party_name')),
            'amount': _decimal(ledger.get('amount')),
            'vat': _decimal(ledger.get('vat')),
            'file_row': ledger.get('file_row'),
        })
    return keys


def _key_matches_row(key, row):
    """آیا این ردیف جدول با یکی از ردیف‌های «جاافتاده» یکی است؟"""
    invoice = normalize_invoice(row.invoice_no)
    if key['invoice_no'] and invoice:
        if invoice != key['invoice_no']:
            return False
    else:
        # بدون شمارهٔ فاکتور: شناسهٔ ملی و نام باید بخوانند
        if key['national_id'] and normalize_id(row.national_id) != key['national_id']:
            return False
        if key['name'] and normalize_name(row.name) != key['name']:
            return False
        if not key['national_id'] and not key['name']:
            return False
    return _decimal(row.amount) == key['amount'] and _decimal(row.vat) == key['vat']


def match_suggested_rows(report, keys, direction=SeasonalTransaction.Direction.PURCHASE):
    """ردیف‌های جدول که با کلیدهای داده‌شده مطابقت دارند (بدون حذف)."""
    if not keys:
        return []
    rows = list(SeasonalTransaction.objects.filter(report=report, direction=direction)
                .order_by('line_no', 'id'))
    matched = []
    used = set()
    for index, row in enumerate(rows):
        for key_index, key in enumerate(keys):
            if key_index in used:
                continue
            if _key_matches_row(key, row):
                matched.append(row)
                used.add(key_index)
                break
    return matched


def _renumber(report, direction):
    """شماره‌گذاری پیوستهٔ ردیف‌های یک جهت پس از حذف."""
    qs = SeasonalTransaction.objects.filter(report=report, direction=direction)
    rows = list(qs.order_by('line_no', 'id'))
    # جابه‌جایی موقت برای جلوگیری از تضاد محدودیت یگانگی (report, direction, line_no)
    qs.update(line_no=F('line_no') + 100000)
    for index, row in enumerate(rows, start=1):
        SeasonalTransaction.objects.filter(pk=row.pk).update(line_no=index)
    return len(rows)


def remove_suggested_rows(report, keys, direction=SeasonalTransaction.Direction.PURCHASE,
                          dry_run=False):
    """حذف ردیف‌های مطابق با «جاافتاده‌ها» و بازشماره‌گذاری جدول."""
    matched = match_suggested_rows(report, keys, direction)
    if dry_run or not matched:
        return {
            'matched': matched,
            'deleted': 0,
            'remaining': SeasonalTransaction.objects.filter(
                report=report, direction=direction,
            ).count(),
        }
    with transaction.atomic():
        ids = [row.pk for row in matched]
        SeasonalTransaction.objects.filter(pk__in=ids).delete()
        remaining = _renumber(report, direction)
    return {'matched': matched, 'deleted': len(ids), 'remaining': remaining}
