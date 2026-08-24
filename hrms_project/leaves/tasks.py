"""
Celery scheduled tasks for the Leaves module.
- update_leave_balances: Runs yearly on Farvardin 1st to reset leave balances.
- send_leave_expiry_alert: Runs daily to check for upcoming expiry of leaves.
"""
from celery import shared_task
from celery.utils.log import get_task_logger
from datetime import date
from django.conf import settings
from core.models import Company

logger = get_task_logger(__name__)


@shared_task(name='leaves.tasks.update_leave_balances')
def update_leave_balances():
    """
    Yearly task: Reset/update leave balances for all employees across all tenants.
    Runs on Farvardin 1st (March 21).
    """
    logger.info("Starting yearly leave balance update...")

    default_days = getattr(settings, 'LEAVE_DEFAULT_TOTAL_DAYS', 30)
    updated_count = 0
    failed_tenants = []

    # Iterate over all active companies (tenants)
    for company in Company.objects.filter(is_active=True):
        try:
            # Switch to tenant schema
            from django.db import connection
            connection.set_tenant(company)

            # Import tenant model here to avoid shared-schema conflicts
            from leaves.models import LeaveBalance

            # Reset annual leave for all active employees
            # This sets remaining_days to the default total and resets used_days to 0
            balances_updated = LeaveBalance.objects.filter(is_active=True).update(
                total_days=default_days,
                used_days=0,
                remaining_days=default_days,
            )
            updated_count += balances_updated
            logger.info(f"Tenant '{company.schema_name}': {balances_updated} balances updated.")

        except Exception as e:
            logger.error(f"Failed to update balances for tenant '{company.schema_name}': {e}")
            failed_tenants.append(company.schema_name)

    logger.info(f"Yearly leave balance update completed. {updated_count} balances updated. "
                 f"Failed tenants: {failed_tenants if failed_tenants else 'None'}")

    return {
        'updated_count': updated_count,
        'failed_tenants': failed_tenants,
    }


@shared_task(name='leaves.tasks.send_leave_expiry_alert')
def send_leave_expiry_alert():
    """
    Daily task: Check for employees whose remaining leave days are about to expire.
    Sends alerts if END_OF_YEAR - today <= LEAVE_ALERT_DAYS_BEFORE_EXPIRY.
    Runs every day at 8:00 AM.
    """
    logger.info("Starting daily leave expiry alert check...")
    from datetime import date, timedelta

    alert_days = getattr(settings, 'LEAVE_ALERT_DAYS_BEFORE_EXPIRY', 30)
    today = date.today()

    # Calculate the end of the current Persian year (approx March 20)
    # Simplified: if today is after March 20, next year's March 20; else current year's March 20
    current_year = today.year
    if today.month > 3 or (today.month == 3 and today.day >= 21):
        year_end = date(current_year + 1, 3, 20)
    else:
        year_end = date(current_year, 3, 20)

    days_until_year_end = (year_end - today).days
    alert_threshold = min(alert_days, days_until_year_end)

    alert_count = 0

    for company in Company.objects.filter(is_active=True):
        try:
            from django.db import connection
            connection.set_tenant(company)
            from leaves.models import LeaveBalance
            from employees.models import Employee

            # Find employees with remaining leave that will expire
            balances = LeaveBalance.objects.select_related('employee').filter(
                is_active=True,
                remaining_days__gt=0,
            )

            for balance in balances:
                employee = balance.employee
                if employee and employee.status == 'active':
                    # TODO: In future, send actual email/SMS notification
                    logger.info(
                        f"[TENANT: {company.schema_name}] "
                        f"Leave expiry alert: Employee {employee.full_name} "
                        f"({employee.employee_id}) has {balance.remaining_days} "
                        f"remaining leave days. Year ends in {days_until_year_end} days."
                    )
                    alert_count += 1

        except Exception as e:
            logger.error(f"Failed to check expiry for tenant '{company.schema_name}': {e}")

    logger.info(f"Daily leave expiry alert completed. {alert_count} alerts generated.")
    return {'alert_count': alert_count}