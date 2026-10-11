"""فاز ۲ — یکپارچگی خرید با پروژه: تعهد و هزینهٔ واقعی خودکار.

* تصویب «سفارش خرید» → ایجاد `CommittedCost` (تعهد) برای پروژهٔ مرتبط.
* ثبت «قبض انبار» → ایجاد `CostTransaction` + ردیف هزینه (هزینهٔ واقعی).

هر دو تابع **idempotent** هستند (استفاده از ارجاع یکتا روی سفارش/قبض) و خطای آن‌ها
جریان اصلی خرید را متوقف نمی‌کند.
"""
import logging

from django.db import transaction

logger = logging.getLogger('projects.integration')


def _company(obj):
    return getattr(obj, 'company', None)


@transaction.atomic
def sync_po_commitment(purchase_order, user=None):
    """ثبت تعهد پروژه از سفارش خرید تأییدشده (یک‌بار برای هر سفارش)."""
    project = getattr(purchase_order, 'project', None)
    if project is None:
        return None

    from projects.cost_models import CommittedCost

    reference = f'PO-{purchase_order.number or purchase_order.pk}'
    existing = CommittedCost.objects.filter(project=project, reference=reference).first()
    if existing:
        return existing

    user_obj = user if getattr(user, 'is_authenticated', False) else None
    commitment = CommittedCost.objects.create(
        company=_company(purchase_order),
        project=project,
        contract=None,
        wbs=getattr(purchase_order, 'wbs', None),
        cbs=getattr(purchase_order, 'cbs', None),
        description=f'سفارش خرید {purchase_order.number or purchase_order.pk} — '
                    f'{getattr(purchase_order, "supplier", "")}',
        amount=purchase_order.total or 0,
        date=purchase_order.date,
        reference=reference,
        created_by=user_obj,
        updated_by=user_obj,
    )
    logger.info('CommittedCost %s created from PO %s', commitment.pk, purchase_order.pk)
    return commitment


@transaction.atomic
def sync_grn_costs(goods_receipt, user=None):
    """ثبت هزینهٔ واقعی پروژه از قبض انبار ثبت‌شده (یک‌بار برای هر قبض)."""
    order = getattr(goods_receipt, 'order', None)
    project = getattr(order, 'project', None) if order else None
    if project is None:
        return None

    from projects.cost_models import CostTransaction, CostTransactionLine

    number = f'GRN-{goods_receipt.number or goods_receipt.pk}'
    existing = CostTransaction.objects.filter(project=project, number=number).first()
    if existing:
        return existing

    user_obj = user if getattr(user, 'is_authenticated', False) else None
    currency_code = 'IRR'
    if getattr(order, 'currency_id', None):
        currency_code = order.currency.code
    tx = CostTransaction.objects.create(
        company=_company(goods_receipt),
        project=project,
        number=number,
        date=goods_receipt.date,
        contract=None,
        currency=getattr(order, 'currency', None),
        currency_code=currency_code,
        description=f'رسید کالا از سفارش {order.number or order.pk}',
        purchase_reference=order.number or str(order.pk),
        warehouse_reference=goods_receipt.number or str(goods_receipt.pk),
        created_by=user_obj,
        updated_by=user_obj,
    )

    po_lines = {}
    for line in order.lines.all():
        po_lines[line.item_id] = line

    created_lines = 0
    for line in goods_receipt.lines.all():
        po_line = po_lines.get(line.item_id)
        unit_cost = float(getattr(po_line, 'unit_price', 0) or 0)
        quantity = float(line.quantity or 0)
        amount = round(quantity * unit_cost, 2)
        CostTransactionLine.objects.create(
            company=_company(goods_receipt),
            transaction=tx,
            wbs=getattr(getattr(po_line, 'order', None), 'wbs', None),
            resource=None,
            description=getattr(line.item, 'name', '') or str(line.item_id),
            quantity=quantity,
            unit=getattr(line.unit, 'name', '') if getattr(line, 'unit_id', None) else '',
            unit_cost=unit_cost,
            amount=amount,
            net_amount=amount,
            created_by=user_obj,
            updated_by=user_obj,
        )
        created_lines += 1

    logger.info('CostTransaction %s created from GRN %s with %s lines',
                tx.pk, goods_receipt.pk, created_lines)
    return tx
