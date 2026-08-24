"""
Celery tasks for the Core module.
"""
from celery import shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)


@shared_task(name='core.tasks.cleanup_expired_tokens')
def cleanup_expired_tokens():
    """
    Daily task: Clean up expired JWT refresh tokens from the database.
    Uses the outstanding token model from simplejwt if blacklist app is enabled.
    """
    logger.info("Starting cleanup of expired tokens...")

    try:
        from rest_framework_simplejwt.token_blacklist.models import (
            OutstandingToken, BlacklistedToken
        )

        # Delete blacklisted tokens older than 30 days
        from datetime import timedelta
        from django.utils import timezone

        cutoff = timezone.now() - timedelta(days=30)
        deleted, _ = OutstandingToken.objects.filter(
            expires_at__lt=timezone.now(),
            created_at__lt=cutoff,
        ).delete()

        logger.info(f"Cleanup completed. {deleted} expired tokens removed.")
        return {'deleted_count': deleted}

    except ImportError:
        logger.info("Token blacklist app not enabled. Skipping token cleanup.")
        return {'deleted_count': 0}
    except Exception as e:
        logger.error(f"Error during token cleanup: {e}")
        return {'deleted_count': 0, 'error': str(e)}