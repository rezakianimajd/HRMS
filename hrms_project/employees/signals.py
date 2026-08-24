"""
Signals for audit logging on Employee and related models.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth.models import User
from employees.models import Employee, Department, WorkLocation, JobTitle, InsuranceList
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