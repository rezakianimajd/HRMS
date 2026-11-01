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
    # آخرین مبلغ تجمعی هر «سطح» (کلید یکدست‌شده) در زنجیرهٔ قرارداد.
    level_prior = {}

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
                additions = _normalize_items(row.additions, abs(signed_work))
                deductions = _normalize_items(row.deductions, abs(signed_work))
                additions_total = sum(
                    (_decimal(item.get('amount')) for item in additions),
                    Decimal('0'),
                ) + _decimal(row.value_added_tax) + _decimal(row.other_additions)
                deductions_total = sum(
                    (_decimal(item.get('amount')) for item in deductions),
                    Decimal('0'),
                )
                net_amount = signed_work + additions_total - deductions_total
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
                    additions=additions,
                    deductions=deductions,
                    additions_total=additions_total,
                    deductions_total=deductions_total,
                    net_amount=net_amount,
                    updated_at=timezone.now(),
                )
                prior_adjustment = adjustment_amount
                prior_adjustment_foreign = adjustment_foreign_amount
                continue

            if row.kind == Statement.Kind.MULTI:
                # سطح سند مثل یک صورت‌وضعیت عادی محاسبه می‌شود؛ سطوح بخش‌های
                # مستقل کارکرد با زنجیرهٔ تجمعی و اضافات/کسورات اختیاری خودشان‌اند.
                own_previous = max(prior_amount, prior_work)
                own_amount = _decimal(row.amount)
                own_work = max(Decimal('0'), own_amount - own_previous)
                rate = _decimal(row.exchange_rate) or Decimal('1')
                own_work_foreign = (
                    (own_work / rate).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
                    if rate > 0 else own_work
                )
                own_foreign_amount = (
                    prior_foreign + own_work_foreign if rate > 1 else own_amount
                ).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)

                submitted_levels = row.levels if isinstance(row.levels, (list, tuple)) else []
                levels = []
                level_work_total = Decimal('0')
                level_work_foreign_total = Decimal('0')
                included_work_total = Decimal('0')
                for level in submitted_levels:
                    if not isinstance(level, dict):
                        continue
                    title = ' '.join(str(level.get('title') or '').replace('\u200c', ' ').split())
                    if not title:
                        continue
                    key = title.lower()
                    previous_rial, previous_foreign = level_prior.get(
                        key, (Decimal('0'), Decimal('0')),
                    )
                    level_rial = max(previous_rial, _decimal(level.get('amount')))
                    level_foreign = max(previous_foreign, _decimal(level.get('amount_foreign')))
                    level_work = level_rial - previous_rial
                    level_work_foreign = level_foreign - previous_foreign
                    # تیک «شامل اضافات و کسورات» فقط مبنا را بزرگ‌تر می‌کند.
                    includes_charges = bool(
                        level.get('includes_charges')
                        or level.get('includes_additions')
                        or level.get('includes_deductions')
                    )
                    levels.append({
                        'title': title,
                        'includes_charges': includes_charges,
                        'previous_amount': float(previous_rial),
                        'amount': float(level_rial),
                        'previous_foreign': float(previous_foreign),
                        'amount_foreign': float(level_foreign),
                        'work': float(level_work),
                        'work_foreign': float(level_work_foreign),
                    })
                    level_prior[key] = (level_rial, level_foreign)
                    level_work_total += level_work
                    level_work_foreign_total += level_work_foreign
                    if includes_charges:
                        included_work_total += level_work

                # اضافات/کسورات یک‌بار در سطح سند و بر مبنای کارکرد سطح اصلی
                # + کارکرد سطوح تیک‌خورده محاسبه می‌شوند.
                charges_base = own_work + included_work_total
                own_additions = _normalize_items(row.additions, charges_base)
                own_deductions = _normalize_items(row.deductions, charges_base)
                additions_total = sum(
                    (_decimal(item.get('amount')) for item in own_additions), Decimal('0'),
                ) + _decimal(row.value_added_tax) + _decimal(row.other_additions)
                deductions_total = sum(
                    (_decimal(item.get('amount')) for item in own_deductions), Decimal('0'),
                )

                total_work = own_work + level_work_total
                total_work_foreign = own_work_foreign + level_work_foreign_total
                Statement.objects.filter(pk=row.pk).update(
                    levels=levels,
                    amount=own_amount,
                    cumulative_previous_amount=own_previous,
                    work_done=total_work,
                    foreign_previous_amount=prior_foreign,
                    foreign_amount=own_foreign_amount,
                    foreign_work_done=total_work_foreign,
                    adjustment_previous_amount=prior_adjustment,
                    adjustment_work_done=Decimal('0'),
                    adjustment_amount=prior_adjustment,
                    adjustment_foreign_previous_amount=prior_adjustment_foreign,
                    adjustment_foreign_work_done=Decimal('0'),
                    adjustment_foreign_amount=prior_adjustment_foreign,
                    additions=own_additions,
                    deductions=own_deductions,
                    additions_total=additions_total,
                    deductions_total=deductions_total,
                    net_amount=total_work + additions_total - deductions_total,
                    updated_at=timezone.now(),
                )
                prior_amount = max(prior_amount, own_amount)
                prior_work += own_work
                prior_foreign = max(prior_foreign, own_foreign_amount)
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
