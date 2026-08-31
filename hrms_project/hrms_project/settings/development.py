"""
Development settings alias for HRMS Project.

HRMS is PostgreSQL-ONLY. There is intentionally no SQLite fallback anywhere.
In development you still MUST have a PostgreSQL database available (see base.py /
production.py for connection variables). This module simply re-exports production
settings so that no accidental SQLite mode can ever be selected.
"""
from .production import *

# Keep a normal development experience, but with the same PostgreSQL-only
# database configuration. Tweak these via environment variables.
DEBUG = True
ALLOWED_HOSTS = ['*']
CORS_ALLOW_ALL_ORIGINS = True
AUTH_PASSWORD_VALIDATORS = []