"""محاسبهٔ زنجیره‌ای صورت‌وضعیت‌های یک قرارداد.

هنگام ویرایش تاریخ یا مبلغ یک صورت‌وضعیت، فقط همان رکورد محاسبه نمی‌شود؛
«مبلغ تجمعی دوره قبل» و کارکرد همهٔ دوره‌های بعدی هم باید دوباره ساخته شود.
این ماژول همان قاعدهٔ سریالایزر را به‌صورت یک‌جا روی کل زنجیره اعمال می‌کند.
"""
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone

from contracts.models import Statement


def _decimal(value):
    try:
        return Decimal(str(value or 0))
    except Exception:  # noqa: BLE001
        return Decimal('0')


def _normalize_items(items, work):
    normalized = []
    for item in items if isinstance(items, (list, tuple)) else []:
        if not isinstance(item, dict):
            continue
        percent = _decimal(item.get('percent'))
        amount = _decimal(item.get('amount'))
        if percent > 0 and item.get('mode') != 'amount':
            amount = (work * percent / 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP)
        normalized.append({
            **item,
            'percent': float(percent),
            'amount': float(amount),
        })
    return normalized


def recalculate_contract_statements(contract):
    """بازمحاسبهٔ previous/work/net همهٔ صورت‌وضعیت‌های یک قرارداد.

    ترتیب زنجیره، ترتیب ثبت (شناسه) است. تاریخ برای نمایش/فیلتر است و
    ویرایش آن نباید مبلغ تجمعی دورهٔ قبل را صفر کند.
    """
    if not contract:
        return
    rows = list(Statement.objects.filter(contract=contract).order_by('pk'))
    prior_amount = Decimal('0')
    prior_work = Decimal('0')

    with transaction.atomic():
        for row in rows:
            amount = _decimal(row.amount)
            previous = max(prior_amount, prior_work)
            work = max(Decimal('0'), amount - previous)
            additions = _normalize_items(row.additions, work)
            deductions = _normalize_items(row.deductions, work)
            additions_total = sum(
                (_decimal(item.get('amount')) for item in additions),
                Decimal('0'),
            ) + _decimal(row.value_added_tax) + _decimal(row.other_additions)
            deductions_total = sum(
                (_decimal(item.get('amount')) for item in deductions),
                Decimal('0'),
            )
            net_amount = work + additions_total - deductions_total

            Statement.objects.filter(pk=row.pk).update(
                cumulative_previous_amount=previous,
                work_done=work,
                additions=additions,
                deductions=deductions,
                additions_total=additions_total,
                deductions_total=deductions_total,
                net_amount=net_amount,
                updated_at=timezone.now(),
            )

            # مبنا برای دورهٔ بعد، همین مقادیر تازه‌محاسبه‌شده است.
            prior_amount = amount
            prior_work += work
