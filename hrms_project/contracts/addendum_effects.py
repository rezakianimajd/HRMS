"""محاسبهٔ «پروندهٔ مؤثر قرارداد» — اثر الحاقیه‌ها روی مبلغ، پیش‌پرداخت، مدت، تضمین و ...

قاعده‌ها از `addendum_schema.EFFECT_RULES` خوانده می‌شود (منبع واحد)، پس هر فیلد جدیدی که
در طرح موضوع‌ها اثر داشته باشد، بدون تغییر در این ماژول اعمال می‌شود. الحاقیه‌ها به ترتیب
تاریخ (و شناسه) اعمال می‌شوند تا نتیجهٔ نهایی همیشه یکتا و قابل ردیابی باشد.

خروجی شامل «مقدار پایه»، «مقدار مؤثر»، «تفاوت‌ها»، «ردیابی تغییرات هر الحاقیه» و هشدارهای
کیفی (مثلاً پیش‌پرداخت بیشتر از مبلغ قرارداد) است. هیچ‌کدام از مقادیر قرارداد **بازنویسی**
نمی‌شود؛ همه‌چیز مشتق‌شده و برگشت‌پذیر است.
"""
from datetime import date

from contracts.addendum_schema import (
    CONTRACT_TARGETS, EFFECT_RULES, normalize_subjects, subject_label, to_decimal,
)

DATE_TARGETS = {'end_date'}

# فیلدهای آینه‌ای روی مدل الحاقیه (برای سازگاری عقب‌رو و فیلترهای گزارشی)
MIRROR_FIELDS = (
    'amount_change', 'new_amount', 'percent_change', 'advance_change', 'new_advance_payment',
    'new_retention_percent', 'new_guarantee_amount', 'new_exchange_rate', 'new_end_date',
)


def _num(value):
    number = to_decimal(value)
    return float(number) if number is not None else None


def _iso(value):
    if not value:
        return None
    if isinstance(value, date):
        return value.isoformat()
    return str(value)


def _day(value):
    """تاریخ را (حتی اگر رشته باشد) به date تبدیل می‌کند."""
    if not value:
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _contract_rate(contract):
    currency = getattr(contract, 'currency', None)
    return _num(getattr(currency, 'exchange_rate', None))


def base_values(contract):
    """مقادیر پایهٔ پروندهٔ قرارداد (بدون الحاقیه)."""
    return {
        'amount': _num(getattr(contract, 'amount', None)),
        'advance_payment': _num(getattr(contract, 'advance_payment', None)),
        'retention_percent': _num(getattr(contract, 'retention_percent', None)),
        'guarantee_amount': _num(getattr(contract, 'guarantee_amount', None)),
        'end_date': _iso(getattr(contract, 'end_date', None)),
        'exchange_rate': _contract_rate(contract),
    }


def addendum_subjects(addendum):
    """موضوع‌های یک الحاقیه (با پشتیبان‌گیری از فیلد تک‌مقداری قدیمی)."""
    items = normalize_subjects(getattr(addendum, 'subjects', None))
    if not items:
        legacy = getattr(addendum, 'subject_type', '') or ''
        if legacy:
            items = normalize_subjects([legacy])
    return items


def addendum_effect_values(addendum):
    """مقادیر اثرگذار یک الحاقیه: از فیلدهای موضوع‌ها + ستون‌های آینه‌ای."""
    values = {}
    for item in addendum_subjects(addendum):
        for key, value in (item.get('fields') or {}).items():
            if key in EFFECT_RULES and value not in (None, ''):
                values[key] = value
    for key in MIRROR_FIELDS:
        if key in values:
            continue
        value = getattr(addendum, key, None)
        if value not in (None, ''):
            values[key] = value
    return values


def _apply(effective, values):
    """اعمال یک مجموعه مقدار روی پروندهٔ مؤثر؛ خروجی: فهرست تغییرات اعمال‌شده."""
    applied = []
    for key, raw in values.items():
        rule = EFFECT_RULES.get(key)
        if not rule:
            continue
        target, mode = rule['target'], rule['mode']
        label = CONTRACT_TARGETS.get(target, target)
        before = effective.get(target)
        if target in DATE_TARGETS:
            day = _day(raw)
            if day is None:
                continue
            effective[target] = day.isoformat()
            applied.append({
                'field': target, 'label': label, 'mode': mode, 'source_field': key,
                'source_label': rule['label'], 'from': before, 'to': day.isoformat(),
            })
            continue
        number = to_decimal(raw)
        if number is None:
            continue
        if mode == 'set':
            after = number
        else:
            current = to_decimal(before) if before is not None else to_decimal(0)
            after = (current or to_decimal(0)) + number
        effective[target] = float(after)
        applied.append({
            'field': target, 'label': label, 'mode': mode, 'source_field': key,
            'source_label': rule['label'], 'from': before, 'to': float(after),
            'delta': None if before is None else float(after - to_decimal(before)),
        })
    return applied


def _quality_warnings(contract, effective):
    """هشدارهای کیفی روی نتیجهٔ مؤثر."""
    warnings = []
    amount = effective.get('amount')
    advance = effective.get('advance_payment')
    retention = effective.get('retention_percent')
    start = _day(getattr(contract, 'start_date', None))
    end = _day(effective.get('end_date'))
    if amount is not None and amount < 0:
        warnings.append('مبلغ مؤثر قرارداد منفی است؛ تغییر مبلغ الحاقیه‌ها را بازبینی کنید.')
    if advance is not None and advance < 0:
        warnings.append('پیش‌پرداخت مؤثر منفی است؛ تغییر پیش‌پرداخت را بازبینی کنید.')
    if amount and advance is not None and advance > amount:
        warnings.append('پیش‌پرداخت مؤثر از مبلغ مؤثر قرارداد بیشتر است.')
    if retention is not None and not (0 <= retention <= 100):
        warnings.append('درصد حسن انجام کار مؤثر باید بین ۰ تا ۱۰۰ باشد.')
    if start and end and end < start:
        warnings.append('تاریخ پایان مؤثر پیش از تاریخ شروع قرارداد است.')
    return warnings



def compute_effects(contract, addendums=None):
    """اثر الحاقیه‌ها را روی پروندهٔ قرارداد محاسبه می‌کند (بدون تغییر دادهٔ اصلی)."""
    if addendums is None:
        addendums = _load_addendums(contract)
    rows = sorted(
        list(addendums),
        key=lambda item: (str(getattr(item, 'date', None) or ''), getattr(item, 'id', 0) or 0),
    )
    base = base_values(contract)
    effective = dict(base)
    per_addendum = []
    all_changes = []
    for addendum in rows:
        applied = _apply(effective, addendum_effect_values(addendum))
        if applied:
            all_changes.extend(applied)
        per_addendum.append({
            'id': getattr(addendum, 'id', None),
            'number': getattr(addendum, 'number', '') or '',
            'date': _iso(getattr(addendum, 'date', None)),
            'title': getattr(addendum, 'subject', '') or '',
            'subjects': [
                {'value': item['type'], 'label': subject_label(item['type'])}
                for item in addendum_subjects(addendum)
            ],
            'changes': applied,
        })
    deltas = {}
    for target in CONTRACT_TARGETS:
        if target in DATE_TARGETS:
            deltas[target] = None
            continue
        base_value = to_decimal(base.get(target)) if base.get(target) is not None else None
        final_value = to_decimal(effective.get(target)) if effective.get(target) is not None else None
        deltas[target] = None if (base_value is None and final_value is None) else float(
            (final_value or to_decimal(0)) - (base_value or to_decimal(0))
        )
    changed = [target for target, delta in deltas.items() if delta not in (None, 0.0)]
    changed += [target for target in DATE_TARGETS if base.get(target) != effective.get(target)]
    return {
        'base': base,
        'effective': effective,
        'deltas': deltas,
        'targets': CONTRACT_TARGETS,
        'changed': sorted(set(changed)),
        'changes': all_changes,
        'addendums': per_addendum,
        'addendum_count': len(rows),
        'warnings': _quality_warnings(contract, effective),
    }


def _load_addendums(contract):
    """الحاقیه‌های قرارداد (ایمن در برابر نبود رابطه/داده)."""
    manager = getattr(contract, 'addendums', None)
    fetcher = getattr(manager, 'all', None)
    if not callable(fetcher):
        return []
    try:
        return list(fetcher())
    except Exception:  # noqa: BLE001
        return []


def contract_effects(contract):
    """نسخهٔ عمومی برای ویوها."""
    return compute_effects(contract)


class DraftAddendum:
    """الحاقیهٔ ذخیره‌نشده (برای پیش‌نمایش زندهٔ اثر)."""

    def __init__(self, data):
        data = data or {}
        self.id = 0
        self.number = data.get('number') or ''
        self.date = data.get('date')
        self.subject = data.get('subject') or ''
        self.subjects = data.get('subjects') or (
            [data['subject_type']] if data.get('subject_type') else []
        )
        for field in MIRROR_FIELDS:
            setattr(self, field, data.get(field))


def effects_from_payload(contract, payload, existing_addendums=None, ignore_id=None):
    """اثر «پیش‌نویس» یک الحاقیه پیش از ذخیره (برای پیش‌نمایش در فرم).

    الحاقیهٔ در حال ویرایش (``ignore_id``) از محاسبه کنار گذاشته می‌شود تا اثر جدید
    جایگزین اثر قبلی شود، نه اینکه دو بار اعمال شود.
    """
    rows = [
        row for row in (existing_addendums if existing_addendums is not None
                        else _load_addendums(contract))
        if getattr(row, 'id', None) != ignore_id
    ]
    rows.append(DraftAddendum(payload))
    result = compute_effects(contract, rows)
    result['draft'] = True
    return result
