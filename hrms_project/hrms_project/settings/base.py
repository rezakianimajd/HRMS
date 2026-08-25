"""
Django base settings for HRMS Project.
Multi-Tenant, Multi-Language HR Management System.
"""
import os
from pathlib import Path
from datetime import timedelta

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load environment variables from .env (if present) so that
# plain `python manage.py` commands also pick up production values.
try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / '.env')
except ImportError:
    pass

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-hrms-dev-key-change-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'True').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '*').split(',')

# =============================================================================
# Application definition
# =============================================================================

# django_tenants MUST come before django.contrib.admin
SHARED_APPS = [
    'django_tenants',                  # Multi-tenancy support
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.auth',
    'core',                            # Core app (shared models: Company, Domain)
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
]

TENANT_APPS = [
    'django.contrib.admin',
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'employees',
    'documents',
    'leaves',
    'attendance',
    'payroll',
    'orgchart',
    'settings_app',                    # Renamed from 'settings' to avoid conflict
    'correspondences',
    'core',                            # For tenant-specific models
]

INSTALLED_APPS = SHARED_APPS + [app for app in TENANT_APPS if app not in SHARED_APPS]

# Tenant model
TENANT_MODEL = 'core.Company'
TENANT_DOMAIN_MODEL = 'core.Domain'

# Database router for multi-tenancy
DATABASE_ROUTERS = ['django_tenants.routers.TenantSyncRouter']

# =============================================================================
# Middleware
# =============================================================================

MIDDLEWARE = [
    'django_tenants.middleware.TenantMiddleware',   # First: detect tenant from host/domain
    'core.middleware.language_middleware.LanguageMiddleware',
    'core.middleware.audit_middleware.AuditMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'hrms_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'hrms_project.wsgi.application'

# =============================================================================
# Database
# https://docs.djangoproject.com/en/5.0/ref/settings/#databases
# Using PostgreSQL with django_tenants backend
# =============================================================================

DATABASES = {
    'default': {
        'ENGINE': 'django_tenants.postgresql_backend',
        'NAME': os.environ.get('DB_NAME', 'hrms_db'),
        'USER': os.environ.get('DB_USER', 'hrms_user'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'hrms_password'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# =============================================================================
# Password validation
# =============================================================================

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# =============================================================================
# Internationalization
# https://docs.djangoproject.com/en/5.0/topics/i18n/
# =============================================================================

LANGUAGE_CODE = 'fa'
TIME_ZONE = 'Asia/Tehran'
USE_I18N = True
USE_TZ = True

LANGUAGES = [
    ('fa', 'فارسی'),
    ('en', 'English'),
]

LOCALE_PATHS = [
    BASE_DIR / 'locale',
]

# =============================================================================
# Static files (CSS, JavaScript, Images)
# =============================================================================

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

# =============================================================================
# Media files (Uploads)
# =============================================================================

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Base file storage path for employee files
BASE_FILE_STORAGE_PATH = os.environ.get('BASE_FILE_STORAGE_PATH', '/var/hr_data/')

# =============================================================================
# Default primary key field type
# =============================================================================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# =============================================================================
# Django REST Framework
# =============================================================================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
}

# =============================================================================
# Simple JWT Settings
# =============================================================================

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'JTI_CLAIM': 'jti',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# =============================================================================
# CORS Headers
# =============================================================================

CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]

# =============================================================================
# Search Settings
# =============================================================================

SEARCH_MIN_QUERY_LENGTH = 2  # حداقل تعداد کاراکتر برای شروع جستجو
SEARCH_RESULTS_PER_PAGE = 20  # تعداد نتایج در هر صفحه
SEARCH_ENABLE_FUZZY = True  # فعال‌سازی جستجوی فازی (Trigram Similarity)

# =============================================================================
# OrgChart Settings
# =============================================================================

ORG_CHART_MAX_DEPTH = 10  # حداکثر عمق درخت سازمانی
ORG_CHART_ENABLE_DRAG_DROP = True  # فعال‌سازی جابجایی گره‌ها (فقط ادمین)

# =============================================================================
# Leave Settings
# =============================================================================

LEAVE_DEFAULT_TOTAL_DAYS = 30  # تعداد روز مرخصی استحقاقی پیش‌فرض در سال
LEAVE_ALERT_DAYS_BEFORE_EXPIRY = 30  # چند روز قبل از پایان سال، هشدار ارسال شود؟

# =============================================================================
# Attendance Settings
# =============================================================================

ATTENDANCE_WORK_DAYS_PER_MONTH = 22  # میانگین روزهای کاری در ماه (برای محاسبات)

# =============================================================================
# Celery Configuration
# =============================================================================

CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Asia/Tehran'
CELERY_ENABLE_UTC = False
CELERY_DEFAULT_QUEUE = 'hrms_default'
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# =============================================================================
# django-tenants public schema settings
# =============================================================================

SHOW_PUBLIC_IF_NO_TENANT_FOUND = True
TENANT_CREATION_FAKES_MIGRATIONS = False

# =============================================================================
# Session & Auth settings
# =============================================================================

LOGIN_URL = '/api/auth/login/'
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG