"""محاسبات مالی خرید و تدارکات (خالص، بدون دیتابیس).

- ``lines_total`` جمع سطرها
- ``document_totals`` جمع خالص/تخفیف/ارزش افزوده/مبلغ نهایی یک سند
- ``compare_quotations`` ماتریس مقایسهٔ پیشنهادهای یک استعلام + رتبه‌بندی
- ``payment_status_of`` وضعیت پرداخت فاکتور (پرداخت‌نشده/جزئی/کامل) در برابر مبلغ قابل پرداخت
- ``awarded_quotation_id`` انتخاب ارزان‌ترین پیشنهاد واجد شرایط
"""
from decimal import Decimal, InvalidOperation

ZERO = Decimal('0')


def _dec(value):
    if value in (None, ''):
        return ZERO
    try:
        return Decimal(str(value).replace(',', '').replace('٬', ''))
    except (InvalidOperation, ValueError):
        return ZERO


def line_amount(quantity, unit_price, discount=0):
    """مبلغ سطر = تعداد × قیمت واحد − تخفیف (منفی نمی‌شود)."""
    amount = _dec(quantity) * _dec(unit_price) - _dec(discount)
    return max(amount, ZERO)


def lines_total(lines, amount_key='amount'):
    return sum((_dec((line or {}).get(amount_key)) for line in lines or []), ZERO)


def document_totals(subtotal, discount=0, vat_rate=0, vat_amount=None):
    """جمع‌های سند؛ اگر ``vat_amount`` داده نشود از نرخ محاسبه می‌شود."""
    subtotal = _dec(subtotal)
    discount = _dec(discount)
    net = max(subtotal - discount, ZERO)
    if vat_amount in (None, ''):
        vat = (net * _dec(vat_rate) / Decimal('100')).quantize(Decimal('1'))
    else:
        vat = _dec(vat_amount)
    return {
        'subtotal': subtotal,
        'discount': discount,
        'vat_amount': vat,
        'total': net + vat,
    }


def payment_status_of(total, paid):
    """وضعیت پرداخت فاکتور بر اساس مبلغ نهایی و پرداخت‌شده."""
    total, paid = _dec(total), _dec(paid)
    if total <= 0:
        return 'unpaid'
    if paid <= 0:
        return 'unpaid'
    if paid >= total:
        return 'paid'
    return 'partial'


def quotation_rank_key(quotation):
    """کلید مرتب‌سازی پیشنهادها: مبلغ نهایی (کم‌ترین) و سپس زمان تحویل.

    پیشنهادهای رد‌شده/منقضی در انتها می‌آیند.
    """
    status = (quotation or {}).get('status') or ''
    blocked = 1 if status in ('rejected', 'cancelled', 'expired') else 0
    total = _dec((quotation or {}).get('total'))
    delivery = _dec((quotation or {}).get('delivery_days'))
    return (blocked, float(total), float(delivery))


def compare_quotations(lines, quotations):
    """ماتریس مقایسهٔ پیشنهادها برای یک استعلام.

    ``lines``: [{'id', 'line_no', 'description', 'quantity', 'unit_label'}]
    ``quotations``: [{'id', 'supplier_name', 'number', 'status', 'currency_label',
                      'total', 'delivery_days', 'validity_date',
                      'lines': [{'inquiry_line': id, 'unit_price', 'amount'}]}]

    خروجی: ``{'rows': [...], 'suppliers': [...], 'best': {...}}``
    """
    suppliers = []
    price_index = {}
    for quotation in quotations or []:
        by_line = {}
        for line in quotation.get('lines') or []:
            key = line.get('inquiry_line') or line.get('line_id') or line.get('id')
            by_line[key] = line
            price_index.setdefault(key, {})[quotation.get('id')] = _dec(line.get('unit_price'))
        suppliers.append({
            'id': quotation.get('id'),
            'supplier': quotation.get('supplier_name') or '',
            'number': quotation.get('number') or '',
            'status': quotation.get('status') or '',
            'currency': quotation.get('currency_label') or '',
            'total': _dec(quotation.get('total')),
            'delivery_days': quotation.get('delivery_days'),
            'validity_date': quotation.get('validity_date'),
            'lines': by_line,
        })

    rows = []
    for line in lines or []:
        key = line.get('id')
        prices = price_index.get(key, {})
        numeric = [value for value in prices.values() if value > 0]
        lowest = min(numeric) if numeric else None
        cells = []
        for supplier in suppliers:
            price = prices.get(supplier['id'])
            cells.append({
                'quotation': supplier['id'],
                'unit_price': price,
                'is_lowest': bool(price and lowest and price == lowest),
                'has_offer': price is not None,
            })
        rows.append({
            'id': key,
            'line_no': line.get('line_no'),
            'description': line.get('description') or '',
            'quantity': _dec(line.get('quantity')),
            'unit': line.get('unit_label') or '',
            'cells': cells,
            'lowest_price': lowest,
        })

    ranked = sorted(suppliers, key=quotation_rank_key)
    for position, supplier in enumerate(ranked, start=1):
        supplier['rank'] = position
    ranked_ids = [supplier['id'] for supplier in ranked]
    for supplier in suppliers:
        supplier['rank'] = ranked_ids.index(supplier['id']) + 1 if supplier['id'] in ranked_ids else None

    best = next(
        (supplier for supplier in ranked
         if supplier['status'] not in ('rejected', 'cancelled', 'expired')),
        None,
    )
    return {
        'rows': rows,
        'suppliers': suppliers,
        'best': {
            'id': best['id'],
            'supplier': best['supplier'],
            'total': best['total'],
            'delivery_days': best['delivery_days'],
        } if best else None,
    }
