"""پاک‌سازی و یکپارچه‌سازی اعضای خانواده (منبع واحد اطلاعات).

- اعضای تکراری پروندهٔ خانواده (هم‌نام/هم‌نسبت یا هم‌کد ملی) ادغام می‌شوند.
- افراد تحت تکفل بیمهٔ تکمیلی به عضو خانوادهٔ متناظر وصل می‌شوند؛
  اگر عضوی وجود نداشته باشد از روی بیمه ساخته می‌شود.
- پوشش‌های بیمه‌ای تکراری برای یک عضو در یک بیمه حذف می‌شوند.
- پیوست بیمه در صورت خالی‌بودن به عضو خانواده منتقل می‌شود.
"""
from __future__ import annotations

import re

from django.db import transaction

from employees.models import Employee, EmployeeFamilyMember, SupplementaryInsuranceDependent


def _norm(value):
    text = str(value or '').strip().lower()
    text = text.replace('ي', 'ی').replace('ك', 'ک').replace('ۀ', 'ه')
    return re.sub(r'\s+', ' ', text)


def _member_key(member):
    national_id = _norm(member.national_id)
    if national_id:
        return f'id:{national_id}'
    return f'name:{_norm(member.first_name)}|{_norm(member.last_name)}|{member.relation}'


def _copy_attachment(source, target):
    if getattr(source, 'attachment', None) and not getattr(target, 'attachment', None):
        target.attachment.name = source.attachment.name
        target.save(update_fields=['attachment'])
        return True
    return False


def _merge_member(keep, duplicate):
    """انتقال پوشش‌های بیمه و فیلدهای خالی از رکورد تکراری به رکورد اصلی."""
    for dependent in SupplementaryInsuranceDependent.objects.filter(family_member=duplicate):
        same = SupplementaryInsuranceDependent.objects.filter(
            insurance_id=dependent.insurance_id, family_member=keep,
        ).exclude(pk=dependent.pk).first()
        if same:
            _copy_attachment(dependent, same)
            dependent.delete()
        else:
            dependent.family_member = keep
            dependent.save(update_fields=['family_member'])
    for field in ('national_id', 'birth_date', 'phone', 'notes'):
        if not getattr(keep, field, None) and getattr(duplicate, field, None):
            setattr(keep, field, getattr(duplicate, field))
    keep.save()
    _copy_attachment(duplicate, keep)
    duplicate.delete()


def _link_unlinked_dependents(employee, members):
    by_national = {_norm(item.national_id): item for item in members if item.national_id}
    by_name = {
        f'{_norm(item.first_name)}|{_norm(item.last_name)}|{item.relation}': item
        for item in members
    }
    for dependent in SupplementaryInsuranceDependent.objects.filter(
        insurance__employee_id=employee.pk, family_member__isnull=True,
    ).select_related('insurance'):
        member = by_national.get(_norm(dependent.national_id)) if dependent.national_id else None
        member = member or by_name.get(
            f'{_norm(dependent.first_name)}|{_norm(dependent.last_name)}|{dependent.relation}'
        )
        if member is None:
            member = EmployeeFamilyMember.objects.create(
                company_id=employee.company_id,
                employee=employee,
                first_name=(dependent.first_name or '').strip() or 'بدون نام',
                last_name=(dependent.last_name or '').strip(),
                relation=dependent.relation or EmployeeFamilyMember.Relation.OTHER,
                national_id=dependent.national_id,
                birth_date=dependent.birth_date,
                is_dependent=True,
            )
            members.append(member)
        dependent.family_member = member
        dependent.save(update_fields=['family_member'])
        _copy_attachment(dependent, member)


def dedupe_employee(employee):
    summary = {'merged': 0, 'linked': 0, 'created': 0, 'removed_insurance_duplicates': 0}
    members = list(EmployeeFamilyMember.objects.filter(employee=employee, is_active=True))
    groups = {}
    for member in members:
        groups.setdefault(_member_key(member), []).append(member)

    for group in groups.values():
        if len(group) < 2:
            continue
        # رکورد دارای پوشش بیمه‌ای/پیوست/قدیمی‌تر به‌عنوان اصلی انتخاب می‌شود
        group.sort(key=lambda item: (
            -SupplementaryInsuranceDependent.objects.filter(family_member=item).count(),
            0 if item.attachment else 1,
            item.pk,
        ))
        keep = group[0]
        for duplicate in group[1:]:
            _merge_member(keep, duplicate)
            summary['merged'] += 1

    members = list(EmployeeFamilyMember.objects.filter(employee=employee, is_active=True))
    before = len(members)
    _link_unlinked_dependents(employee, members)
    summary['created'] = len(members) - before
    summary['linked'] = SupplementaryInsuranceDependent.objects.filter(
        insurance__employee_id=employee.pk, family_member__isnull=False,
    ).count()

    seen = set()
    for dependent in SupplementaryInsuranceDependent.objects.filter(
        insurance__employee_id=employee.pk,
    ).select_related('insurance', 'family_member').order_by('pk'):
        key = (dependent.insurance_id, dependent.family_member_id)
        if dependent.family_member_id is None or key not in seen:
            if dependent.family_member_id is not None:
                seen.add(key)
            continue
        _copy_attachment(dependent, dependent.family_member)
        dependent.delete()
        summary['removed_insurance_duplicates'] += 1

    return summary


@transaction.atomic
def dedupe_company(company_id=None):
    totals = {
        'employees': 0, 'merged': 0, 'linked': 0,
        'created': 0, 'removed_insurance_duplicates': 0,
    }
    employees = Employee.objects.all()
    if company_id:
        employees = employees.filter(company_id=company_id)
    for employee in employees.iterator():
        summary = dedupe_employee(employee)
        if any(summary.values()):
            totals['employees'] += 1
        for key in ('merged', 'linked', 'created', 'removed_insurance_duplicates'):
            totals[key] += summary[key]
    return totals
