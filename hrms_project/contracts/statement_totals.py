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
    # آخرین مبلغ تجمعی هر «بند» (کلید یکدست‌شده) در زنجیرهٔ قرارداد.
    band_prior = {}

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
                submitted_bands = row.bands if isinstance(row.bands, (list, tuple)) else []
                bands = []
                total_previous = Decimal('0')
                total_amount = Decimal('0')
                total_previous_foreign = Decimal('0')
                total_foreign = Decimal('0')
                total_work = Decimal('0')
                total_work_foreign = Decimal('0')
                for band in submitted_bands:
                    if not isinstance(band, dict):
                        continue
                    title = ' '.join(str(band.get('title') or '').replace('\u200c', ' ').split())
                    if not title:
                        continue
                    key = title.lower()
                    previous_rial, previous_foreign = band_prior.get(
                        key, (Decimal('0'), Decimal('0')),
                    )
                    band_rial = max(previous_rial, _decimal(band.get('amount')))
                    band_foreign = max(previous_foreign, _decimal(band.get('amount_foreign')))
                    band_work = band_rial - previous_rial
                    band_work_foreign = band_foreign - previous_foreign
                    bands.append({
                        **band,
                        'title': title,
                        'previous_amount': float(previous_rial),
                        'amount': float(band_rial),
                        'previous_foreign': float(previous_foreign),
                        'amount_foreign': float(band_foreign),
                        'work': float(band_work),
                        'work_foreign': float(band_work_foreign),
                    })
                    band_prior[key] = (band_rial, band_foreign)
                    total_previous += previous_rial
                    total_amount += band_rial
                    total_previous_foreign += previous_foreign
                    total_foreign += band_foreign
                    total_work += band_work
                    total_work_foreign += band_work_foreign

                additions = _normalize_items(row.additions, total_work)
                deductions = _normalize_items(row.deductions, total_work)
                additions_total = sum(
                    (_decimal(item.get('amount')) for item in additions),
                    Decimal('0'),
                ) + _decimal(row.value_added_tax) + _decimal(row.other_additions)
                deductions_total = sum(
                    (_decimal(item.get('amount')) for item in deductions),
                    Decimal('0'),
                )
                Statement.objects.filter(pk=row.pk).update(
                    bands=bands,
                    amount=total_amount,
                    cumulative_previous_amount=total_previous,
                    work_done=total_work,
                    foreign_previous_amount=total_previous_foreign,
                    foreign_amount=total_foreign,
                    foreign_work_done=total_work_foreign,
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
                    net_amount=total_work + additions_total - deductions_total,
                    updated_at=timezone.now(),
                )
                prior_amount = max(prior_amount, total_amount)
                prior_work += total_work
                prior_foreign = max(prior_foreign, total_foreign)
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
