"""Normalize legacy guarantee data into the contract's guarantee_items list.

The contract form and the guarantee coverage report use ``guarantee_items`` as the
only source of truth. Older records may still have ``guarantee_type`` /
``guarantee_amount`` on the contract, or guarantees with a missing/wrong
``contract_guarantee_index``. This module is deliberately database-free so the
normalization rules can be tested without PostgreSQL.
"""
from copy import deepcopy

from contracts.models import Contract


def _number(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _valid_type(raw, labels, by_label):
    value = str(raw or '').strip()
    if value in labels:
        return value
    return by_label.get(value, 'other')


def normalize_contract_guarantees(contract, guarantees=None):
    """Return normalized items, legacy fields and guarantee links.

    The returned dictionary has:
      items: normalized ``guarantee_items``
      guarantee_type / guarantee_amount: cleaned legacy fields
      links: {guarantee_id: new_index}
      changes: human-readable list of applied repairs
    """
    labels = dict(Contract.GuaranteeKind.choices)
    by_label = {label: code for code, label in labels.items()}
    guarantees = list(guarantees or [])
    items = []
    changes = []

    for raw in (getattr(contract, 'guarantee_items', None) or []):
        if not isinstance(raw, dict):
            continue
        item = deepcopy(raw)
        item['type'] = _valid_type(item.get('type') or item.get('guarantee_type'), labels, by_label)
        if item.get('guarantee_type') and 'type' not in raw:
            item.pop('guarantee_type', None)
        items.append(item)

    # Older contracts may only have the two primary fields. Convert them once
    # so the contract form can manage the guarantee as a normal item.
    primary_type = getattr(contract, 'guarantee_type', '') or ''
    primary_amount = getattr(contract, 'guarantee_amount', None)
    if not items and primary_type and primary_amount:
        items.append({
            'type': _valid_type(primary_type, labels, by_label),
            'amount': str(primary_amount),
            'percent': '',
            'note': 'تضمین اصلی قرارداد (مهاجرت داده)',
        })
        changes.append('primary_guarantee_migrated_to_item')

    # A guarantee item with no amount/percent but linked guarantees can derive
    # its amount from those guarantees (e.g. legacy "other" rows).
    for index, item in enumerate(items):
        if _number(item.get('amount')) or _number(item.get('percent')):
            continue
        linked = [
            guarantee for guarantee in guarantees
            if guarantee.guarantee_type == item['type']
            and (
                _index_of(guarantee) == index
                or _index_of(guarantee) is None
                or _index_of(guarantee) < 0
                or _index_of(guarantee) >= len(items)
            )
        ]
        linked_total = sum(_number(guarantee.amount) for guarantee in linked)
        if linked_total:
            item['amount'] = str(int(round(linked_total)))
            changes.append(f'item_{index}_amount_filled')

    # Every contract with items should no longer expose the old primary fields;
    # otherwise the report/admin can show a third, non-existent requirement.
    if items and (primary_type or primary_amount):
        changes.append('legacy_primary_cleared')

    links = {}
    for guarantee in guarantees:
        current = _index_of(guarantee)
        candidates = [i for i, item in enumerate(items) if item['type'] == guarantee.guarantee_type]
        if current is not None and 0 <= current < len(items) and items[current]['type'] == guarantee.guarantee_type:
            continue
        if not candidates:
            continue
        amount = _number(guarantee.amount)
        exact = next(
            (i for i in candidates if abs(_number(items[i].get('amount')) - amount) < 0.5),
            None,
        )
        target = exact if exact is not None else min(
            candidates,
            key=lambda index: abs(_number(items[index].get('amount')) - amount),
        )
        links[guarantee.id] = target
        changes.append(f'guarantee_{guarantee.id}_linked_to_{target}')

    return {
        'items': items,
        'guarantee_type': '' if items else primary_type,
        'guarantee_amount': None if items else primary_amount,
        'links': links,
        'changes': changes,
    }


def _index_of(guarantee):
    try:
        return int(guarantee.contract_guarantee_index)
    except (TypeError, ValueError):
        return None
