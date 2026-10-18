"""وضعیت تأمین «تضامین» قرارداد.

اقلام تضمینی که قرارداد **مورد نیاز** دانسته است (`Contract.guarantee_items` و فیلد اصلی
`guarantee_type`/`guarantee_amount`) با **تضامین ثبت‌شده** (`Guarantee`) تطبیق داده می‌شود و
برای هر قلم مشخص می‌گردد: چه مقدار تضمین تعریف شده، چه مقدار اورده/ثبت شده، چه مقدار کم
است، و تضامین وابسته به آن کدام‌اند (شماره، ابزار، مبلغ، سررسید، آزادشده یا نه).

خروجی برای نمایش گرافیکی در «پروندهٔ قرارداد» ساخته شده است: درصد پوشش هر قلم، وضعیت
(تأمین‌شده / ناقص / تأمین‌نشده)، تضامین مازادِ بدون تعریف و هشدارهای سررسید نزدیک.
"""
from datetime import date

EXPIRY_SOON_DAYS = 30
TOLERANCE = 1  # ریال — اختلاف جزئی گرد کردن


def _num(value):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number


def _day(value):
    if not value:
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _iso(value):
    day = _day(value)
    return day.isoformat() if day else None


def _display(obj, attr):
    getter = getattr(obj, f'get_{attr}_display', None)
    if callable(getter):
        try:
            return getter()
        except Exception:  # noqa: BLE001
            return ''
    return ''


def guarantee_payload(guarantee):
    """نمایش فشردهٔ یک تضمین برای فهرست‌های پرونده."""
    expiry = _day(getattr(guarantee, 'expiry_date', None))
    days_left = (expiry - date.today()).days if expiry else None
    return {
        'id': getattr(guarantee, 'id', None),
        'contract_guarantee_index': getattr(guarantee, 'contract_guarantee_index', None),
        'number': getattr(guarantee, 'number', '') or '',
        'type': getattr(guarantee, 'guarantee_type', '') or '',
        'type_label': _display(guarantee, 'guarantee_type'),
        'instrument': getattr(guarantee, 'instrument_type', '') or '',
        'instrument_label': _display(guarantee, 'instrument_type'),
        'amount': _num(getattr(guarantee, 'amount', None)) or 0.0,
        'bank': getattr(guarantee, 'bank', '') or '',
        'issue_date': _iso(getattr(guarantee, 'issue_date', None)),
        'expiry_date': _iso(expiry),
        'days_to_expiry': days_left,
        'is_released': bool(getattr(guarantee, 'is_released', False)),
        'release_date': _iso(getattr(guarantee, 'release_date', None)),
        'note': getattr(guarantee, 'note', '') or '',
    }


def _requirements(contract, effective_amount):
    """اقلام تضمین مورد نیاز قرارداد (از JSON اقلام + فیلد اصلی قرارداد)."""
    from contracts.models import Contract

    labels = dict(Contract.GuaranteeKind.choices)
    by_label = {label: code for code, label in labels.items()}
    rows = []
    seen_types = set()

    for index, item in enumerate((getattr(contract, 'guarantee_items', None) or [])):
        if not isinstance(item, dict):
            continue
        raw = item.get('type') or item.get('guarantee_type') or 'other'
        # داده‌های قدیمی ممکن است برچسب فارسی را ذخیره کرده باشند
        kind = raw if raw in labels else by_label.get(raw, 'other')
        percent = _num(item.get('percent'))
        amount = _num(item.get('amount'))
        if not amount and percent and effective_amount:
            amount = round(effective_amount * percent / 100.0, 2)
        rows.append({
            'index': index,
            'type': kind,
            'label': labels.get(kind, kind),
            'note': item.get('note') or '',
            'percent': percent,
            'required': amount or 0.0,
            'source': 'items',
        })
        seen_types.add(kind)

    primary_type = getattr(contract, 'guarantee_type', '') or ''
    primary_amount = _num(getattr(contract, 'guarantee_amount', None))
    if primary_type and primary_amount and primary_type not in seen_types:
        rows.append({
            'index': None,
            'type': primary_type,
            'label': labels.get(primary_type, primary_type),
            'note': 'تضمین اصلی قرارداد',
            'percent': None,
            'required': primary_amount,
            'source': 'contract',
        })
        seen_types.add(primary_type)

    return rows


def _load_guarantees(contract, guarantees):
    if guarantees is not None:
        return list(guarantees)
    fetcher = getattr(getattr(contract, 'guarantees', None), 'all', None)
    if not callable(fetcher):
        return []
    try:
        return list(fetcher())
    except Exception:  # noqa: BLE001
        return []


def _effective_amount(contract, effective_amount):
    if effective_amount is not None:
        return _num(effective_amount)
    try:
        from contracts.addendum_effects import contract_effects

        return _num(contract_effects(contract)['effective'].get('amount'))
    except Exception:  # noqa: BLE001
        return _num(getattr(contract, 'amount', None))



def guarantee_compliance(contract, guarantees=None, effective_amount=None):
    """گزارش وضعیت تأمین تضامین قرارداد (برای نمایش گرافیکی در پرونده)."""
    effective_amount = _effective_amount(contract, effective_amount)
    items = [guarantee_payload(row) for row in _load_guarantees(contract, guarantees)]
    # ترتیب نمایش: تضامین فعال اول (به ترتیب سررسید)، سپس آزادشده‌ها
    items.sort(key=lambda row: (
        row['is_released'],
        str(row['expiry_date'] or ''),
        row['id'] or 0,
    ))
    requirements = _requirements(contract, effective_amount)
    warnings = []

    used_ids = set()
    requirements_by_index = {
        requirement['index']: requirement
        for requirement in requirements
        if requirement.get('index') is not None
    }
    matched_by_requirement = {id(requirement): [] for requirement in requirements}

    # ۱) تضمین‌هایی که به ردیف مشخصی از اقلام قرارداد وصل شده‌اند، دقیقاً زیر همان قلم می‌نشینند.
    for row in items:
        index = row.get('contract_guarantee_index')
        if index is None:
            continue
        requirement = requirements_by_index.get(index)
        if requirement is None:
            continue
        matched_by_requirement[id(requirement)].append(row)
        used_ids.add(row['id'])

    # ۲) تضمین‌های بدون ارتباط (دادهٔ قبلی) بر اساس نوع و ظرفیت باقی‌ماندهٔ همان قلم تطبیق می‌شوند.
    for row in items:
        if row.get('contract_guarantee_index') is not None or row['id'] in used_ids:
            continue
        candidates = [requirement for requirement in requirements if requirement['type'] == row['type']]
        if not candidates:
            continue
        chosen = None
        for requirement in candidates:
            active_amount = sum(
                item['amount'] for item in matched_by_requirement[id(requirement)]
                if not item['is_released']
            )
            if requirement['required'] > active_amount + TOLERANCE:
                chosen = requirement
                break
        chosen = chosen or candidates[0]
        matched_by_requirement[id(chosen)].append(row)
        used_ids.add(row['id'])

    for requirement in requirements:
        matched = matched_by_requirement[id(requirement)]
        active = [row for row in matched if not row['is_released']]
        released = [row for row in matched if row['is_released']]
        provided = round(sum(row['amount'] for row in active), 2)
        released_total = round(sum(row['amount'] for row in released), 2)
        required = round(requirement['required'] or 0.0, 2)
        balance = round(max(required - provided, 0.0), 2)
        if required > 0:
            coverage = round(min(provided / required * 100.0, 100.0), 1)
        else:
            coverage = 100.0 if provided else 0.0

        if required > 0 and provided >= required - TOLERANCE:
            status, status_label = 'provided', 'تأمین شده'
        elif required > 0 and provided > 0:
            status, status_label = 'partial', 'ناقص — نیازمند تکمیل'
        elif required > 0:
            status, status_label = 'missing', 'تأمین نشده'
        elif provided > 0:
            status, status_label = 'provided', 'تأمین شده (بدون مبلغ تعریف‌شده)'
        else:
            status, status_label = 'missing', 'بدون مبلغ تعریف‌شده'

        requirement.update({
            'provided': provided,
            'released_total': released_total,
            'balance': balance,
            'coverage_percent': coverage,
            'status': status,
            'status_label': status_label,
            'items': matched,
            'provided_count': len(active),
            'released_count': len(released),
        })

        label = requirement['label']
        if status == 'partial':
            warnings.append(f'تضمین «{label}» کامل تأمین نشده است؛ کمبود {balance:,.0f}.')
        elif status == 'missing':
            warnings.append(f'تضمین «{label}» هنوز اورده/ثبت نشده است.')
        if released_total > 0 and status != 'provided':
            warnings.append(
                f'در تضمین «{label}» مبلغ {released_total:,.0f} آزاد شده و پوشش را کم کرده است.'
            )
        for row in active:
            name = row['number'] or row['instrument_label'] or row['type_label']
            if row['days_to_expiry'] is not None and row['days_to_expiry'] < 0:
                warnings.append(f'تضمین {name} منقضی شده است.')
            elif row['days_to_expiry'] is not None and row['days_to_expiry'] <= EXPIRY_SOON_DAYS:
                warnings.append(f'تضمین {name} تا {row["days_to_expiry"]} روز دیگر منقضی می‌شود.')

    unrequired = [row for row in items if row['id'] not in used_ids]
    required_total = round(sum(row['required'] for row in requirements), 2)
    provided_total = round(sum(row['provided'] for row in requirements), 2)
    released_total = round(sum(row['released_total'] for row in requirements), 2)

    return {
        'effective_amount': effective_amount or 0.0,
        'requirements': requirements,
        'unrequired': unrequired,
        'summary': {
            'required_total': required_total,
            'provided_total': provided_total,
            'released_total': released_total,
            'balance_total': round(max(required_total - provided_total, 0.0), 2),
            'coverage_percent': round(provided_total / required_total * 100.0, 1)
                if required_total else (100.0 if provided_total else 0.0),
            'required_count': len(requirements),
            'provided_count': len([row for row in requirements if row['status'] == 'provided']),
            'partial_count': len([row for row in requirements if row['status'] == 'partial']),
            'missing_count': len([row for row in requirements if row['status'] == 'missing']),
            'registered_count': len(items),
            'unrequired_count': len(unrequired),
        },
        'warnings': warnings,
    }

