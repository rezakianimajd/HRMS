"""
Celery configuration for HRMS Project.
"""
import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hrms_project.settings.production')

# Create Celery app
app = Celery('hrms_project')

# Load configuration from Django settings, using the 'CELERY' namespace
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks from all registered Django apps
app.autodiscover_tasks()

# =============================================================================
# Periodic Tasks (Celery Beat Schedule)
# =============================================================================

app.conf.beat_schedule = {
    # Task 1: Update leave balances every year on Farvardin 1st (approx March 21)
    # Uses jdatetime-style scheduling; runs at 00:01 on 1st day of Farvardin
    'update-leave-balances-yearly': {
        'task': 'leaves.tasks.update_leave_balances',
        'schedule': crontab(hour=0, minute=1, day_of_month=21, month_of_year=3),
        'options': {'queue': 'hrms_default'},
    },

    # Task 2: Send leave expiry alert every day at 8:00 AM Tehran time
    'send-leave-expiry-alert-daily': {
        'task': 'leaves.tasks.send_leave_expiry_alert',
        'schedule': crontab(hour=8, minute=0),
        'options': {'queue': 'hrms_default'},
    },

    # Optional: Clean up expired tokens daily at 3:00 AM
    'cleanup-expired-tokens': {
        'task': 'core.tasks.cleanup_expired_tokens',
        'schedule': crontab(hour=3, minute=0),
        'options': {'queue': 'hrms_default'},
    },

    # Notification Center sync — every 30 minutes so the bell stays fresh.
    'sync-all-notifications': {
        'task': 'notifications.tasks.sync_all_notifications',
        'schedule': crontab(minute='*/30'),
        'options': {'queue': 'hrms_default'},
    },
}

# =============================================================================
# Task Routing
# =============================================================================

app.conf.task_routes = {
    'leaves.tasks.*': {'queue': 'hrms_default'},
    'attendance.tasks.*': {'queue': 'hrms_default'},
    'core.tasks.*': {'queue': 'hrms_default'},
    'notifications.tasks.*': {'queue': 'hrms_default'},
}

# =============================================================================
# Task retry settings
# =============================================================================

app.conf.task_acks_late = True
app.conf.task_reject_on_worker_lost = True
app.conf.task_default_retry_delay = 60  # 1 minute
app.conf.task_max_retries = 3