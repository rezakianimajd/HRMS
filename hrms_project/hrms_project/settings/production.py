"""
Production settings for HRMS Project.
DO NOT use these settings in development.
"""
import os
from .base import *

# =============================================================================
# Core Security
# =============================================================================

DEBUG = False

# Allowed hosts - MUST be set via environment variable in production
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost').split(',')

# Secret key - MUST be overridden in production
SECRET_KEY = os.environ.get('SECRET_KEY')

# =============================================================================
# SSL & Security Headers
# =============================================================================

# Enable SSL/HSTS only when explicitly configured. For internal/IP deployments
# (no TLS cert), leave SSL_ENABLED unset or False to avoid redirect loops.
SSL_ENABLED = os.environ.get('SSL_ENABLED', 'False').lower() in ('true', '1', 'yes')

SECURE_SSL_REDIRECT = SSL_ENABLED
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 31536000 if SSL_ENABLED else 0  # 1 year only when TLS on
SECURE_HSTS_INCLUDE_SUBDOMAINS = SSL_ENABLED
SECURE_HSTS_PRELOAD = SSL_ENABLED
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SESSION_COOKIE_SECURE = SSL_ENABLED
CSRF_COOKIE_SECURE = SSL_ENABLED
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SECURE_REFERRER_POLICY = 'same-origin'

# =============================================================================
# CORS - Restrict in production
# =============================================================================

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = os.environ.get(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000'
).split(',')

# =============================================================================
# Database - Use environment variables
# =============================================================================

DATABASES = {
    'default': {
        'ENGINE': 'django_tenants.postgresql_backend',
        'NAME': os.environ.get('DB_NAME', 'hrms_db'),
        'USER': os.environ.get('DB_USER', 'hrms_user'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'CONN_MAX_AGE': 600,  # Persistent connections (10 min)
        'OPTIONS': {
            'connect_timeout': 10,
        },
    }
}

# =============================================================================
# Static & Media Files - Separate from code
# =============================================================================

STATIC_ROOT = os.environ.get('STATIC_ROOT', '/var/www/hrms/static/')
MEDIA_ROOT = os.environ.get('MEDIA_ROOT', '/var/www/hrms/media/')

# Static files storage for production (cache busting)
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage'

# =============================================================================
# Email Configuration (SMTP)
# =============================================================================

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() in ('true', '1', 'yes')
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@hrms.local')
SERVER_EMAIL = os.environ.get('SERVER_EMAIL', 'admin@hrms.local')
ADMINS = [('HRMS Admin', os.environ.get('ADMIN_EMAIL', 'admin@hrms.local'))]

# =============================================================================
# Cache - Redis
# =============================================================================

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.environ.get('REDIS_CACHE_URL', 'redis://localhost:6379/1'),
    }
}

# =============================================================================
# Celery - Redis broker
# =============================================================================

CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/2')
CELERY_TASK_ALWAYS_EAGER = False
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000

# =============================================================================
# Logging
# =============================================================================

LOGS_DIR = BASE_DIR / 'logs'
LOGS_DIR.mkdir(parents=True, exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{levelname}] {asctime} {module} {process:d} {thread:d} | {message}',
            'style': '{',
        },
        'simple': {
            'format': '[{levelname}] {asctime} | {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file_error': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOGS_DIR / 'error.log',
            'maxBytes': 10 * 1024 * 1024,  # 10 MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'file_warning': {
            'level': 'WARNING',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOGS_DIR / 'warning.log',
            'maxBytes': 10 * 1024 * 1024,
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'file_info': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOGS_DIR / 'info.log',
            'maxBytes': 50 * 1024 * 1024,  # 50 MB
            'backupCount': 5,
            'formatter': 'simple',
        },
        'console': {
            'level': 'WARNING',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file_error', 'file_warning', 'console'],
            'level': 'WARNING',
            'propagate': True,
        },
        'django.request': {
            'handlers': ['file_error', 'mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
        'hrms': {
            'handlers': ['file_info', 'file_error', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
}

# =============================================================================
# Base file storage path
# =============================================================================

BASE_FILE_STORAGE_PATH = os.environ.get('BASE_FILE_STORAGE_PATH', '/var/hr_data/')

# =============================================================================
# django-tenants settings
# =============================================================================

SHOW_PUBLIC_IF_NO_TENANT_FOUND = False
TENANT_CREATION_FAKES_MIGRATIONS = False

# =============================================================================
# Rate Limiting (using django-ratelimit)
# =============================================================================

RATELIMIT_ENABLE = True
RATELIMIT_USE_CACHE = 'default'
RATELIMIT_VIEW_RATE = '100/m'  # 100 requests per minute for general APIs