"""همگام‌سازی اعضای خانوادهٔ پرسنل با افراد تحت تکفل بیمهٔ تکمیلی.

افراد تحت تکفلی که در ماژول بیمهٔ تکمیلی ثبت می‌شوند، به‌صورت خودکار در بخش
«خانواده» پروندهٔ پرسنلی همان فرد بازتاب داده می‌شوند. این ماژول تنها نقطهٔ
نوشتنِ این همگام‌سازی است تا هم سیگنال‌ها، هم اکشن API و هم مایگریشن داده از
یک منطق یکسان استفاده کنند.
"""
from __future__ import annotations

import logging

from django.db import transaction

from employees.models import EmployeeFamilyMember, SupplementaryInsuranceDependent

logger = logging.getLogger('employees')

# نسبت‌های بیمهٔ تکمیلی که معادل مستقیم در پروندهٔ خانواده دارند.
RELATION_MAP = {
    'spouse': EmployeeFamilyMember.Relation.SPOUSE,
    'child': EmployeeFamilyMember.Relation.CHILD,
    'father': EmployeeFamilyMember.Relation.FATHER,
    'mother': EmployeeFamilyMember.Relation.MOTHER,
    'sibling': EmployeeFamilyMember.Relation.SIBLING,
    'other': EmployeeFamilyMember.Relation.OTHER,
}


def dependent_source_key(dependent) -> str:
    """کلید یکتای منبع برای هر فرد تحت تکفل (پایدار در برابر ویرایش)."""
    dependent_pk = getattr(dependent, 'pk', None) or getattr(dependent, 'id', None)
    return f'supp-ins-{dependent.insurance_id}-{dependent_pk}'


def _defaults_from_dependent(dependent) -> dict:
    return {
        'first_name': (dependent.first_name or '').strip() or 'بدون نام',
        'last_name': (dependent.last_name or '').strip(),
        'relation': RELATION_MAP.get(dependent.relation, EmployeeFamilyMember.Relation.OTHER),
        'national_id': (dependent.national_id or '').strip() or None,
        'birth_date': dependent.birth_date,
        'is_dependent': True,
        'source': EmployeeFamilyMember.Source.SUPPLEMENTARY_INSURANCE,
    }


@transaction.atomic
def sync_employee_family_from_insurance(employee, insurance=None) -> dict:
    """کپی/به‌روزرسانی افراد تحت تکفل بیمهٔ تکمیلی در پروندهٔ خانواده.

    عملیات idempotent است: رکوردهای ساخته‌شده پیش‌تر فقط با اطلاعات تازه
    به‌روزرسانی می‌شوند و رکوردهای دستی کاربر دست‌نخورده می‌مانند.
    """
    summary = {'created': 0, 'updated': 0, 'total': 0, 'removed': 0}
    if employee is None:
        return summary

    queryset = SupplementaryInsuranceDependent.objects.filter(
        insurance__employee_id=employee.pk,
    ).select_related('insurance')
    if insurance is not None:
        queryset = queryset.filter(insurance_id=getattr(insurance, 'pk', insurance))

    seen_keys = set()
    for dependent in queryset:
        key = dependent_source_key(dependent)
        seen_keys.add(key)
        defaults = _defaults_from_dependent(dependent)
        company_id = getattr(dependent.insurance, 'company_id', None) or employee.company_id
        existing = EmployeeFamilyMember.objects.filter(
            employee_id=employee.pk, source_key=key,
        ).first()
        if existing:
            if not existing.is_active:
                # کاربر این عضو را از پرونده حذف کرده است؛ دوباره ساخته نمی‌شود.
                continue
            changed = False
            for field, value in defaults.items():
                if getattr(existing, field) != value and value not in ('', None):
                    setattr(existing, field, value)
                    changed = True
            if changed:
                existing.save()
                summary['updated'] += 1
        else:
            EmployeeFamilyMember.objects.create(
                employee_id=employee.pk,
                company_id=company_id,
                source_key=key,
                **defaults,
            )
            summary['created'] += 1
        summary['total'] += 1

    # اعضایی که قبلاً از بیمه آمده‌اند و دیگر در بیمه وجود ندارند حذف می‌شوند.
    stale = EmployeeFamilyMember.objects.filter(
        employee_id=employee.pk,
        source=EmployeeFamilyMember.Source.SUPPLEMENTARY_INSURANCE,
    ).exclude(source_key__in=seen_keys)
    if stale.exists():
        summary['removed'] = stale.count()
        stale.delete()

    return summary


def remove_family_member_for_dependent(dependent) -> int:
    """حذف رکورد خانوادگی متناظر با فرد تحت تکفل حذف‌شده."""
    if dependent is None or not getattr(dependent, 'pk', None):
        return 0
    return EmployeeFamilyMember.objects.filter(
        source_key=dependent_source_key(dependent),
    ).delete()[0]


def sync_all_families(company_id=None) -> dict:
    """همگام‌سازی گروهی (برای مایگریشن داده یا دستور مدیریتی)."""
    from employees.models import Employee

    totals = {'created': 0, 'updated': 0, 'total': 0, 'removed': 0, 'employees': 0}
    employees = Employee.objects.all()
    if company_id:
        employees = employees.filter(company_id=company_id)
    for employee in employees.iterator():
        try:
            summary = sync_employee_family_from_insurance(employee)
        except Exception:  # noqa: BLE001 — یک پرسنل نباید کل همگام‌سازی را بشکند
            logger.exception('family sync failed for employee %s', employee.pk)
            continue
        if summary['total'] or summary['removed']:
            totals['employees'] += 1
        for key in ('created', 'updated', 'total', 'removed'):
            totals[key] += summary[key]
    return totals
