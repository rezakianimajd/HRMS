"""گزارش پرداخت‌ها و مطالبات قراردادها (منطق خالص و قابل تست).

این ماژول هیچ کوئری‌ای اجرا نمی‌کند؛ ویو داده‌های موردنیاز را دسته‌ای
می‌خواند و این توابع ردیف‌های گزارش را می‌سازند.
"""
from collections import defaultdict
from datetime import date
from decimal import Decimal

from contracts.serializers import invoice_payable_amount, statement_payable_amount


def _decimal(value):
    if value in (None, ''):
        return Decimal('0')
    return Decimal(str(value))


def _text(value):
    return str(value if value is not None else '')


def _date_text(value):
    if not value:
        return ''
    if isinstance(value, (date,)):
        return value.isoformat()
    return str(value)


def _normalize(value):
    return str(value or '').replace('\u200c', ' ').replace('ي', 'ی').replace('ك', 'ک').strip().lower()


def project_names_of(contract, project_names=None):
    """نام پروژهٔ اصلی و پروژه‌های تخصیص‌یافته، بدون تکرار."""
    names = project_names or {}
    result = []
    main_id = getattr(contract, 'project_id', None)
    if main_id and names.get(main_id):
        result.append(names[main_id])
    for item in (getattr(contract, 'project_allocations', None) or []):
        if not isinstance(item, dict):
            continue
        project_id = item.get('project') or item.get('project_id')
        if project_id and names.get(project_id):
            result.append(names[project_id])
    # پروژه‌های JSON ممکن است با شناسهٔ عددی/متنی ذخیره شده باشند.
    for key, name in names.items():
        if str(key) in {
            str(item.get('project') or item.get('project_id'))
            for item in (getattr(contract, 'project_allocations', None) or [])
            if isinstance(item, dict)
        }:
            result.append(name)
    fallback_name = getattr(contract, 'project_name', '') or ''
    if fallback_name:
        result.append(fallback_name)
    unique = []
    for name in result:
        if name and name not in unique:
            unique.append(name)
    return unique


def payment_report_row(contract, payments=(), allocations=(), statements=(), invoices=(), project_names=None):
    """یک ردیف گزارش برای یک قرارداد.

    ``payments`` و ``allocations`` قبلاً بر اساس قرارداد فیلتر شده‌اند.
    مبلغ پرداخت‌شدهٔ اسناد فقط تخصیص‌های ``kind='net'`` را حساب می‌کند؛
    سپردهٔ حسن انجام کار/بیمه پرداخت نقدی به پیمانکار نیست.
    """
    advance_contract = _decimal(getattr(contract, 'advance_payment', 0))
    advance_paid = sum(
        (_decimal(getattr(payment, 'amount', 0)) for payment in payments
         if (getattr(payment, 'payment_type', '') or getattr(payment, 'type', '')) == 'advance'),
        Decimal('0'),
    )
    paid_by_statement = defaultdict(Decimal)
    paid_by_invoice = defaultdict(Decimal)
    paid_total = Decimal('0')
    for allocation in allocations:
        if (getattr(allocation, 'kind', 'net') or 'net') != 'net':
            continue
        amount = _decimal(getattr(allocation, 'amount', 0))
        paid_total += amount
        statement_id = getattr(allocation, 'statement_id', None)
        invoice_id = getattr(allocation, 'invoice_id', None)
        if statement_id:
            paid_by_statement[statement_id] += amount
        elif invoice_id:
            paid_by_invoice[invoice_id] += amount

    payable_claims = Decimal('0')
    for statement in statements:
        payable = statement_payable_amount(statement)
        if payable <= 0:
            continue
        paid = paid_by_statement.get(getattr(statement, 'id', None), Decimal('0'))
        payable_claims += max(Decimal('0'), payable - paid)
    for invoice in invoices:
        payable = invoice_payable_amount(invoice)
        if payable <= 0:
            continue
        paid = paid_by_invoice.get(getattr(invoice, 'id', None), Decimal('0'))
        payable_claims += max(Decimal('0'), payable - paid)

    payment_dates = [
        getattr(payment, 'date', None)
        for payment in payments
        if getattr(payment, 'date', None)
    ]
    last_payment = max(payment_dates) if payment_dates else None
    projects = project_names_of(contract, project_names)
    return {
        'id': getattr(contract, 'id', None),
        'party_name': getattr(getattr(contract, 'party', None), 'name', '') or '',
        'contract_number': getattr(contract, 'number', '') or '',
        'projects': projects,
        'projects_display': '، '.join(projects),
        'subject': getattr(contract, 'subject', '') or '',
        'advance_contract': _text(advance_contract),
        'advance_paid': _text(advance_paid),
        'advance_balance': _text(advance_contract - advance_paid),
        'payable_claims': _text(payable_claims),
        'paid_total': _text(paid_total),
        'last_payment_date': _date_text(last_payment),
    }


def matches_search(row, term):
    term = _normalize(term)
    if not term:
        return True
    haystack = ' '.join([
        row.get('party_name', ''),
        row.get('contract_number', ''),
        row.get('subject', ''),
        row.get('projects_display', ''),
    ])
    haystack = _normalize(haystack)
    return all(part in haystack for part in term.split())


def report_summary(rows):
    def total(key):
        return str(sum((_decimal(row.get(key)) for row in rows), Decimal('0')))

    return {
        'contract_count': len(rows),
        'advance_contract': total('advance_contract'),
        'advance_paid': total('advance_paid'),
        'advance_balance': total('advance_balance'),
        'payable_claims': total('payable_claims'),
        'paid_total': total('paid_total'),
    }
