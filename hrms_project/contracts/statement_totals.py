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
    prior_foreign = Decimal('0')
    prior_adjustment = Decimal('0')
    prior_adjustment_foreign = Decimal('0')

    with transaction.atomic():
        for row in rows:
            is_adjustment = row.kind in (Statement.Kind.INCREASE, Statement.Kind.DECREASE)
            if is_adjustment:
                base_amount = max(prior_amount, prior_work)
                base_foreign = prior_foreign
                signed_work = _decimal(row.adjustment_work_done)
                if not signed_work:
                    signed_work = _decimal(row.work_done)
                signed_work = signed_work.quantize(Decimal('1'))
                signed_foreign = _decimal(row.adjustment_foreign_work_done)
                if not signed_foreign:
                    signed_foreign = _decimal(row.foreign_work_done)
                signed_foreign = signed_foreign.quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
                adjustment_amount = prior_adjustment + signed_work
                adjustment_foreign_amount = prior_adjustment_foreign + signed_foreign
                Statement.objects.filter(pk=row.pk).update(
                    amount=base_amount,
                    cumulative_previous_amount=base_amount,
                    work_done=signed_work,
                    foreign_previous_amount=base_foreign,
                    foreign_work_done=signed_foreign,
                    foreign_amount=base_foreign,
                    adjustment_previous_amount=prior_adjustment,
                    adjustment_work_done=signed_work,
                    adjustment_amount=adjustment_amount,
                    adjustment_foreign_previous_amount=prior_adjustment_foreign,
                    adjustment_foreign_work_done=signed_foreign,
                    adjustment_foreign_amount=adjustment_foreign_amount,
                    additions=[],
                    deductions=[],
                    additions_total=Decimal('0'),
                    deductions_total=Decimal('0'),
                    net_amount=signed_work,
                    updated_at=timezone.now(),
                )
                prior_adjustment = adjustment_amount
                prior_adjustment_foreign = adjustment_foreign_amount
                continue

            amount = _decimal(row.amount)
            previous = max(prior_amount, prior_work)
            work = max(Decimal('0'), amount - previous)
            rate = _decimal(row.exchange_rate) or Decimal('1')
            work_foreign = (work / rate).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP) if rate > 0 else work
            foreign_amount = (prior_foreign + work_foreign).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
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
                foreign_previous_amount=prior_foreign,
                foreign_work_done=work_foreign,
                foreign_amount=foreign_amount,
                adjustment_previous_amount=prior_adjustment,
                adjustment_work_done=Decimal('0'),
                adjustment_amount=prior_adjustment,
                adjustment_foreign_previous_amount=prior_adjustment_foreign,
                adjustment_foreign_work_done=Decimal('0'),
                adjustment_foreign_amount=prior_adjustment_foreign,
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
            prior_foreign = foreign_amount
