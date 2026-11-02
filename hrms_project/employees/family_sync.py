"""همگام‌سازی «پروندهٔ خانوادهٔ پرسنل» با افراد تحت تکفل بیمهٔ تکمیلی.

منبع اصلی داده در این ماژول، پروندهٔ پرسنلی (بخش خانواده) است:
- هر عضو خانواده که «تحت تکفل» باشد، در بیمه‌های تکمیلی فعال همان پرسنل
  به‌صورت خودکار منعکس می‌شود (`sync_insurance_from_family`).
- رکوردهای قدیمی بیمه که پیش‌تر در پرونده نبوده‌اند، یک‌بار به پرونده
  منتقل می‌شوند (`sync_employee_family_from_insurance`).

برای جلوگیری از حلقهٔ سیگنال‌ها از یک نگهبان re-entrancy (thread-local)
استفاده می‌شود؛ هر عملیات همگام‌سازی که خودش باعث ذخیرهٔ مدل مقابل شود،
سیگنال‌های تودرتو را نادیده می‌گیرد.
"""
from __future__ import annotations

import logging
import threading
from contextlib import contextmanager

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from employees.models import EmployeeFamilyMember, SupplementaryInsurance, SupplementaryInsuranceDependent

logger = logging.getLogger('employees')

_state = threading.local()

RELATION_MAP = {
    'spouse': EmployeeFamilyMember.Relation.SPOUSE,
    'child': EmployeeFamilyMember.Relation.CHILD,
    'father': EmployeeFamilyMember.Relation.FATHER,
    'mother': EmployeeFamilyMember.Relation.MOTHER,
    'sibling': EmployeeFamilyMember.Relation.SIBLING,
    'other': EmployeeFamilyMember.Relation.OTHER,
}

# نگاشت معکوس برای نوشتن در بیمهٔ تکمیلی (نسبت‌های خانواده → نسبت‌های بیمه)
INSURANCE_RELATION_MAP = {
    EmployeeFamilyMember.Relation.SPOUSE: 'spouse',
    EmployeeFamilyMember.Relation.CHILD: 'child',
    EmployeeFamilyMember.Relation.FATHER: 'father',
    EmployeeFamilyMember.Relation.MOTHER: 'mother',
    EmployeeFamilyMember.Relation.SIBLING: 'other',
    EmployeeFamilyMember.Relation.OTHER: 'other',
}


@contextmanager
def sync_guard():
    """اجازهٔ اجرای همگام‌سازی را فقط یک‌بار در هر زنجیرهٔ فراخوانی می‌دهد."""
    if getattr(_state, 'active', False):
        yield False
        return
    _state.active = True
    try:
        yield True
    finally:
        _state.active = False


def is_syncing() -> bool:
    return bool(getattr(_state, 'active', False))


def dependent_source_key(dependent) -> str:
    """کلید یکتای منبع برای هر فرد تحت تکفل (پایدار در برابر ویرایش)."""
    dependent_pk = getattr(dependent, 'pk', None) or getattr(dependent, 'id', None)
    return f'supp-ins-{dependent.insurance_id}-{dependent_pk}'


def family_source_key(member) -> str:
    """کلید منبع برای رکورد بیمه‌ای که از پروندهٔ خانواده ساخته می‌شود."""
    return f'family-{member.pk}'


def _active_insurances(employee):
    today = timezone.localdate()
    return SupplementaryInsurance.objects.filter(employee_id=employee.pk).filter(
        Q(end_date__isnull=True) | Q(end_date__gte=today),
    )


def _family_defaults_from_dependent(dependent) -> dict:
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
    """انتقال/به‌روزرسانی افراد تحت تکفل بیمه در پروندهٔ خانواده (مسیر سازگاری)."""
    summary = {'created': 0, 'updated': 0, 'total': 0, 'removed': 0, 'linked': 0}
    if employee is None:
        return summary

    queryset = SupplementaryInsuranceDependent.objects.filter(
        insurance__employee_id=employee.pk,
    ).select_related('insurance', 'family_member')
    if insurance is not None:
        queryset = queryset.filter(insurance_id=getattr(insurance, 'pk', insurance))

    seen_keys = set()
    for dependent in queryset:
        key = dependent_source_key(dependent)
        seen_keys.add(key)
        defaults = _family_defaults_from_dependent(dependent)
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
                current = getattr(existing, field)
                if value not in ('', None) and current != value:
                    setattr(existing, field, value)
                    changed = True
            if changed:
                existing.save()
                summary['updated'] += 1
            member = existing
        else:
            member = EmployeeFamilyMember.objects.create(
                employee_id=employee.pk,
                company_id=company_id,
                source_key=key,
                **defaults,
            )
            summary['created'] += 1
        summary['total'] += 1

        # اتصال رکورد بیمه به عضو خانوادهٔ متناظر (منبع واحد برای گزارش‌ها)
        if dependent.family_member_id != member.pk:
            dependent.family_member = member
            dependent.save(update_fields=['family_member'])
            summary['linked'] += 1

    stale = EmployeeFamilyMember.objects.filter(
        employee_id=employee.pk,
        source=EmployeeFamilyMember.Source.SUPPLEMENTARY_INSURANCE,
    ).exclude(source_key__in=seen_keys)
    if stale.exists():
        summary['removed'] = stale.count()
        stale.delete()

    return summary


@transaction.atomic
def sync_insurance_from_family(member) -> dict:
    """انعکاس عضو خانوادهٔ تحت تکفل در بیمه‌های تکمیلی فعال همان پرسنل."""
    summary = {'created': 0, 'updated': 0, 'removed': 0, 'insurances': 0}
    if member is None or not getattr(member, 'pk', None):
        return summary
    if not member.is_active or not member.is_dependent:
        return remove_insurance_dependents_for_family(member)

    employee = member.employee
    base = {
        'first_name': (member.first_name or '').strip() or 'بدون نام',
        'last_name': (member.last_name or '').strip(),
        'relation': INSURANCE_RELATION_MAP.get(member.relation, 'other'),
        'national_id': (member.national_id or '').strip() or None,
        'birth_date': member.birth_date,
    }
    for insurance in _active_insurances(employee):
        summary['insurances'] += 1
        existing = SupplementaryInsuranceDependent.objects.filter(
            insurance=insurance, family_member=member,
        ).first()
        if existing:
            changed = False
            for field, value in base.items():
                if value not in ('', None) and getattr(existing, field) != value:
                    setattr(existing, field, value)
                    changed = True
            if changed:
                existing.save()
                summary['updated'] += 1
            continue

        # رکورد بیمه‌ای که پیش‌تر دستی با همین مشخصات ثبت شده، دوباره ساخته
        # نمی‌شود؛ فقط به عضو خانواده متصل می‌شود.
        orphan = SupplementaryInsuranceDependent.objects.filter(
            insurance=insurance,
            family_member__isnull=True,
            first_name=base['first_name'],
            last_name=base['last_name'],
        ).first()
        if orphan:
            orphan.family_member = member
            for field, value in base.items():
                if value not in ('', None):
                    setattr(orphan, field, value)
            orphan.save()
            summary['updated'] += 1
            continue

        SupplementaryInsuranceDependent.objects.create(
            insurance=insurance,
            family_member=member,
            **base,
        )
        summary['created'] += 1
    return summary


@transaction.atomic
def remove_insurance_dependents_for_family(member) -> dict:
    """حذف پوشش‌های بیمه‌ای متناظر با عضو خانواده‌ای که حذف/غیرفعال شده است."""
    summary = {'created': 0, 'updated': 0, 'removed': 0, 'insurances': 0}
    if member is None or not getattr(member, 'pk', None):
        return summary
    queryset = SupplementaryInsuranceDependent.objects.filter(family_member=member)
    summary['removed'] = queryset.count()
    if summary['removed']:
        queryset.delete()
    return summary


def remove_family_member_for_dependent(dependent) -> int:
    """حذف رکورد خانوادگی متناظر با فرد تحت تکفل حذف‌شده."""
    if dependent is None or not getattr(dependent, 'pk', None):
        return 0
    return EmployeeFamilyMember.objects.filter(
        source_key=dependent_source_key(dependent),
    ).delete()[0]


def sync_all_families(company_id=None) -> dict:
    """همگام‌سازی گروهی دوطرفه (مایگریشن داده یا دستور مدیریتی)."""
    from employees.models import Employee

    totals = {
        'created': 0, 'updated': 0, 'total': 0, 'removed': 0,
        'linked': 0, 'mirrored': 0, 'employees': 0,
    }
    employees = Employee.objects.all()
    if company_id:
        employees = employees.filter(company_id=company_id)
    with sync_guard():
        for employee in employees.iterator():
            try:
                summary = sync_employee_family_from_insurance(employee)
            except Exception:  # noqa: BLE001 — یک پرسنل نباید کل همگام‌سازی را بشکند
                logger.exception('family sync failed for employee %s', employee.pk)
                continue
            if summary['total'] or summary['removed']:
                totals['employees'] += 1
            for key in ('created', 'updated', 'total', 'removed', 'linked'):
                totals[key] += summary[key]
            members = EmployeeFamilyMember.objects.filter(employee_id=employee.pk, is_active=True)
            for member in members:
                try:
                    mirror = sync_insurance_from_family(member)
                except Exception:  # noqa: BLE001
                    logger.exception('insurance mirror failed for member %s', member.pk)
                    continue
                totals['mirrored'] += mirror['created'] + mirror['updated']
    return totals

