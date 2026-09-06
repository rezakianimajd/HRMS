"""Celery scheduled tasks for the Notification Center."""
from celery import shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)


@shared_task(name='notifications.tasks.sync_all_notifications')
def sync_all_notifications():
    """Run a full notification sync across all active tenants."""
    from notifications.sync_service import sync_all_companies

    result = sync_all_companies()
    created = result.get('created', 0)
    errors = result.get('errors', [])
    if errors:
        logger.error(f'Notification sync errors: {errors}')
    logger.info(f'Notification sync completed: {created} notifications created.')
    return {'created': created, 'errors': errors}
