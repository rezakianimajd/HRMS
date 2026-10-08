"""نگاشت و ایمپورت داده — منطق تطبیق فازی و ساخت اسناد حسابداری."""
import difflib
from datetime import datetime, date
from decimal import Decimal, InvalidOperation

from accounting.models import (
    AccountGroup, Account, AuxiliaryAccount,
    AccountingDocument, AccountingDocumentLine,
)
from datamapping.models import MappingEntry


# -----------------------------------------------------------------------------
# نرمال‌سازی متن فارسی برای تطبیق فازی
# -----------------------------------------------------------------------------
_REPLACEMENTS = {
    'ي': 'ی', 'ك': 'ک', 'ة': 'ه', 'ۀ': 'ه', 'ؤ': 'و', 'أ': 'ا', 'إ': 'ا',
    'آ': 'ا', 'ئ': 'ی', 'ء': '', 'ّ': '', 'ً': '', 'ٌ': '', 'ٍ': '', 'َ': '',
    'ُ': '', 'ِ': '', 'ْ': '', 'ٓ': '', 'ٔ': '', 'ٰ': '', '۰': '0', '۱': '1',
    '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8',
    '۹': '9', '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5',
    '٦': '6', '٧': '7', '٨': '8', '٩': '9',
}


def normalize(text):
    """حذف اعراب، یکسان‌سازی نویسه‌های فارسی/عربی و فاصله‌ها."""
    if text is None:
        return ''
    s = str(text).strip().lower()
    for a, b in _REPLACEMENTS.items():
        s = s.replace(a, b)
    # حذف نیم‌فاصله و هر فاصلهٔ اضافی
    s = s.replace('\u200c', '').replace('\u200f', '').replace('\u00a0', ' ')
    s = ''.join(ch for ch in s if not ch.isspace())
    return s


def similarity(a, b):
    """امتیاز شباهت ۰ تا ۱ بین دو رشته."""
    a, b = normalize(a), normalize(b)
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    return difflib.SequenceMatcher(None, a, b).ratio()


def find_best_match(source_name, source_code, candidates, threshold=0.55):
    """بهترین گزینهٔ تطبیق را بر اساس کد/عنوان برمی‌گرداند: (candidate, score)."""
    best = None
    best_score = 0.0
    code = str(source_code or '').strip()
    for c in candidates:
        score = 0.0
        if code and str(c.code).strip() == code:
            score = 1.0
        else:
            name_score = similarity(source_name, c.name)
            code_score = similarity(code, c.code) if code else 0.0
            score = max(name_score, code_score)
        if score > best_score:
            best, best_score = c, score
    if best is None or best_score < threshold:
        return None, best_score
    return best, best_score


def get_candidates(level, company):
    """لیست کاندیدهای تطبیق برای یک سطح کدینگ."""
    if level == MappingEntry.Level.GROUP:
        return list(AccountGroup.objects.filter(company=company, is_active=True))
    if level == MappingEntry.Level.GENERAL:
        return list(Account.objects.filter(company=company, is_active=True, parent__isnull=True))
    if level == MappingEntry.Level.SUBSIDIARY:
        return list(Account.objects.filter(company=company, is_active=True, parent__isnull=False))
    if level == MappingEntry.Level.AUXILIARY:
        return list(AuxiliaryAccount.objects.filter(company=company, is_active=True))
    return []


# -----------------------------------------------------------------------------
# خواندن اکسل
# -----------------------------------------------------------------------------
def parse_excel_rows(file, expected_headers=None):
    """خواندن اکسل و برگرداندن لیست dict بر اساس هدرها (ترجمهٔ فارسی به انگلیسی)."""
    import openpyxl
    wb = openpyxl.load_workbook(file, read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [str(h).strip() if h is not None else '' for h in rows[0]]

    header_map = {}
    if expected_headers:
        for eng, fa in expected_headers.items():
            idx = None
            for i, h in enumerate(headers):
                if normalize(h) == normalize(fa):
                    idx = i
                    break
            if idx is not None:
                header_map[eng] = idx
    else:
        header_map = {i: i for i in range(len(headers))}

    data = []
    for row in rows[1:]:
        if not any(row):
            continue
        entry = {}
        for eng, idx in header_map.items():
            val = row[idx] if idx < len(row) else None
            if isinstance(val, datetime):
                val = val.strftime('%Y-%m-%d')
            if isinstance(val, date):
                val = val.strftime('%Y-%m-%d')
            entry[eng] = val if val is not None else ''
        if any(entry.values()):
            data.append(entry)
    return data


def to_decimal(value):
    """تبدیل امن مبلغ به Decimal."""
    if value in (None, ''):
        return Decimal('0')
    s = str(value).strip().replace(',', '').replace('٬', '').replace('،', '')
    if not s:
        return Decimal('0')
    try:
        return Decimal(s)
    except InvalidOperation:
        try:
            return Decimal(s.replace(' ', ''))
        except InvalidOperation:
            return Decimal('0')
