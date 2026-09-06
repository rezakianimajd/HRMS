"""Celery scheduled tasks for the Notification Center."""
from celery import shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)


@shared_task(name='notifications.tasks.sync_all_notifications')
def sync_all_notifications():
    """Run a full notification sync across all active tenants."""
    from notifications.sync_service import sync_all_companies

    total = sync_all_companies()
    logger.info(f'Notification sync completed: {total} notifications created.')
    return {'created': total}