"""
Signals for audit logging on Employee and related models.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth.models import User
from employees.models import (
    Employee, Department, WorkLocation, JobTitle, InsuranceList,
    SupplementaryInsuranceDependent,
)
from core.models.audit_log import AuditLog


def get_client_ip(request=None):
    """Helper to extract IP from request if available."""
    return None  # Will be handled by middleware


@receiver(post_save, sender=Employee)
def log_employee_save(sender, instance, created, **kwargs):
    """Log CREATE or UPDATE on Employee."""
    action = 'CREATE' if created else 'UPDATE'
    try:
        AuditLog.objects.create(
            user=None,  # Will be set by middleware
            company=instance.company,
            action=action,
            model_name='Employee',
            object_id=str(instance.id),
            changes={
                'employee_id': instance.employee_id,
                'full_name': instance.full_name,
                'status': instance.status,
            },
            description=f"Employee {instance.full_name} ({instance.employee_id}) {'created' if created else 'updated'}",
        )
    except Exception:
        pass  # Audit failure should not break main operation


@receiver(post_save, sender=SupplementaryInsuranceDependent)
def sync_family_after_dependent_save(sender, instance, **kwargs):
    """انتقال خودکار فرد تحت تکفل بیمهٔ تکمیلی به پروندهٔ خانوادهٔ پرسنل."""
    try:
        from employees.family_sync import sync_employee_family_from_insurance
        insurance = getattr(instance, 'insurance', None)
        employee = getattr(insurance, 'employee', None)
        if employee is not None:
            sync_employee_family_from_insurance(employee, insurance=insurance)
    except Exception:  # noqa: BLE001 — خطای همگام‌سازی نباید ذخیرهٔ بیمه را بشکند
        pass


@receiver(post_delete, sender=SupplementaryInsuranceDependent)
def sync_family_after_dependent_delete(sender, instance, **kwargs):
    """حذف رکورد خانوادگی متناظر وقتی فرد تحت تکفل بیمه حذف می‌شود."""
    try:
        from employees.family_sync import (
            remove_family_member_for_dependent, sync_employee_family_from_insurance,
        )
        remove_family_member_for_dependent(instance)
        insurance = getattr(instance, 'insurance', None)
        employee = getattr(insurance, 'employee', None)
        if employee is not None:
            sync_employee_family_from_insurance(employee, insurance=insurance)
    except Exception:  # noqa: BLE001
        pass


@receiver(post_delete, sender=Employee)
def log_employee_delete(sender, instance, **kwargs):
    """Log DELETE (or soft-delete) on Employee."""
    try:
        AuditLog.objects.create(
            user=None,
            company=instance.company,
            action='DELETE',
            model_name='Employee',
            object_id=str(instance.id),
            changes={'employee_id': instance.employee_id, 'full_name': instance.full_name},
            description=f"Employee {instance.full_name} ({instance.employee_id}) deleted",
        )
    except Exception:
        pass