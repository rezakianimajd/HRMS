"""
Development settings for HRMS Project - SQLite for Windows testing.
Multi-tenancy is DISABLED in this mode (SQLite does not support schemas).
For production with multi-tenancy, use PostgreSQL + production.py.
"""
from .base import *

DEBUG = True
ALLOWED_HOSTS = ['*']
CORS_ALLOW_ALL_ORIGINS = True
AUTH_PASSWORD_VALIDATORS = []
DEBUG_PROPAGATE_EXCEPTIONS = True

# =============================================================================
# Database - SQLite for easy Windows testing (no PostgreSQL needed)
# =============================================================================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# =============================================================================
# Remove django_tenants (SQLite doesn't support PostgreSQL schemas)
# =============================================================================
INSTALLED_APPS = [app for app in INSTALLED_APPS if app != 'django_tenants']
TENANT_MODEL = None
TENANT_DOMAIN_MODEL = None
DATABASE_ROUTERS = []

# Remove TenantMiddleware (depends on django_tenants)
if 'django_tenants.middleware.TenantMiddleware' in MIDDLEWARE:
    MIDDLEWARE.remove('django_tenants.middleware.TenantMiddleware')

# Add custom tenant middleware (falls back to first company in SQLite mode)
MIDDLEWARE.insert(0, 'core.middleware.tenant_middleware.CustomTenantMiddleware')

# =============================================================================
# Celery - run tasks synchronously (no Redis needed on Windows)
# =============================================================================
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# =============================================================================
# Email - print to console instead of sending (no SMTP needed)
# =============================================================================
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# =============================================================================
# Debug info
# =============================================================================
import sys
print("=" * 60, file=sys.stderr)
print("  HRMS Development Mode (SQLite)", file=sys.stderr)
print("  Multi-tenancy DISABLED", file=sys.stderr)
print("  Celery tasks run synchronously", file=sys.stderr)
print("  Email printed to console", file=sys.stderr)
print("=" * 60, file=sys.stderr)

# =============================================================================
# Python 3.14+ compatibility fix for Django admin template rendering
# Python 3.14 changed super() behavior which breaks Django's BaseContext.__copy__
# See: https://code.djangoproject.com/ticket/36031
# =============================================================================
import django.template.context
_original_basecontext_copy = django.template.context.BaseContext.__copy__

def _fixed_basecontext_copy(self):
    """Fixed __copy__ for Python 3.14+ compatibility."""
    import copy as _copy_mod
    duplicate = _copy_mod.copy(self)  # Use module-level copy, not super().__copy__
    # Manually set dicts if super().__copy__ failed
    if not hasattr(duplicate, 'dicts'):
        object.__setattr__(duplicate, 'dicts', self.dicts[:])
    else:
        duplicate.dicts = self.dicts[:]
    return duplicate

django.template.context.BaseContext.__copy__ = _fixed_basecontext_copy
print("  Python 3.14+ admin compatibility patch applied", file=sys.stderr)
