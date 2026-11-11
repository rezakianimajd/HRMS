"""قواعد مشترک «سطوح کارکرد» صورت‌وضعیت چند سطحی (خالص و قابل تست).

هر سطح دو تیک مستقل دارد:

* ``includes_additions`` — کارکرد این سطح در **مبنای اضافات** شمرده شود.
* ``includes_deductions`` — کارکرد این سطح در **مبنای کسورات** شمرده شود.

اسناد قدیمی فقط یک تیک «شامل اضافات و کسورات» (``includes_charges``) داشتند؛
برای اینکه دادهٔ قبلی خراب نشود، وقتی کلید جدید موجود نباشد همان مقدار قدیمی
برای هر دو تیک در نظر گرفته می‌شود.
"""
from __future__ import annotations


def level_charge_flags(level):
    """(شامل اضافات, شامل کسورات) برای یک سطح از صورت‌وضعیت."""
    if not isinstance(level, dict):
        return (False, False)
    legacy = bool(level.get('includes_charges'))
    additions = level.get('includes_additions')
    deductions = level.get('includes_deductions')
    includes_additions = legacy if additions is None else bool(additions)
    includes_deductions = legacy if deductions is None else bool(deductions)
    return (includes_additions, includes_deductions)


def level_payload(title, *, includes_additions, includes_deductions):
    """برچسب‌های استاندارد یک سطح برای ذخیره (شامل کلید قدیمی برای سازگاری)."""
    return {
        'title': title,
        'includes_additions': bool(includes_additions),
        'includes_deductions': bool(includes_deductions),
        # فقط وقتی هر دو فعال باشند «شامل اضافات و کسورات» معنا دارد.
        'includes_charges': bool(includes_additions) and bool(includes_deductions),
    }
