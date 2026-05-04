"""
Django settings for Party Hall SaaS Platform
Backend: Django 5.2 + PostgreSQL 16 + PostGIS + DRF + JWT + Channels
Supports: Local Docker | Railway (cloud) | Vercel frontend + Cloudinary media
"""
import environ
import dj_database_url
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(DEBUG=(bool, True))
environ.Env.read_env(BASE_DIR / '.env')

SECRET_KEY = env('SECRET_KEY')
DEBUG = env('DEBUG')
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1', '10.2.0.2', '192.168.1.102', '*'])

# ============================================================
# INSTALLED APPS
# ============================================================
INSTALLED_APPS = [
    'daphne',  # Must be at the top for Channels
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',  # Enabled: works with local DB
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    'channels',  # Django Channels for real-time WebSocket
    # Cloud storage (only activated when CLOUDINARY_URL env var is set)
    'cloudinary_storage',
    'cloudinary',
    # Our apps
    'accounts',
    'halls',
    'bookings',
    'payments',
    'reviews',
    'subscriptions',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Serve static files without a separate CDN
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'
AUTH_USER_MODEL = 'accounts.User'

# ASGI application (required for Django Channels)
ASGI_APPLICATION = 'config.asgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
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

WSGI_APPLICATION = 'config.wsgi.application'

# ============================================================
# DATABASE — PostgreSQL (Docker locally, Railway in production)
# Railway auto-injects DATABASE_URL; local Docker uses individual vars.
# ============================================================
_database_url = env('DATABASE_URL', default=None)
if _database_url:
    DATABASES = {'default': dj_database_url.parse(_database_url, conn_max_age=600)}
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': env('DB_NAME', default='partyhub_db'),
            'USER': env('DB_USER', default='partyhub'),
            'PASSWORD': env('DB_PASSWORD', default='partyhub_pass'),
            'HOST': env('DB_HOST', default='localhost'),
            'PORT': env('DB_PORT', default='5432'),
        }
    }

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ============================================================
# DJANGO CHANNELS — Redis Channel Layer (real-time slot locking)
# ============================================================
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [env('REDIS_URL', default='redis://localhost:6379/0')],
        },
    },
}

# ============================================================
# DJANGO REST FRAMEWORK
# ============================================================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# ============================================================
# JWT SETTINGS (Issue #1 Fix)
# ============================================================
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',

    # Cookie settings
    # In production (DEBUG=False): Secure=True + SameSite=None needed for
    # cross-domain cookies (Vercel frontend → Railway backend)
    'AUTH_COOKIE': 'ph_access',
    'AUTH_COOKIE_REFRESH': 'ph_refresh',
    'AUTH_COOKIE_PATH': '/',
    'AUTH_COOKIE_HTTP_ONLY': True,
    'AUTH_COOKIE_SECURE': not DEBUG,
    'AUTH_COOKIE_SAMESITE': 'None' if not DEBUG else 'Lax',
}

# ============================================================
# CORS — Allow Next.js frontend (local + Vercel production)
# ============================================================
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:3003',
    'http://10.2.0.2:3000',
    'http://10.2.0.2:3001',
    'http://192.168.1.102:3000',
    'http://192.168.1.102:3001',
])

# Allow any *.vercel.app and custom domain in production
CORS_ALLOWED_ORIGIN_REGEXES = [
    r'^https://.*\.vercel\.app$',
    r'^https://partyhall.*$',
]

CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://192.168.1.102:3000',
])

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept', 'accept-encoding', 'authorization', 'cache-control',
    'content-type', 'origin', 'user-agent', 'x-csrftoken', 'x-requested-with',
]

PAYMENT_GATEWAY = env('PAYMENT_GATEWAY', default='dummy')

RAZORPAY_KEY_ID = env('RAZORPAY_KEY_ID', default='')
RAZORPAY_KEY_SECRET = env('RAZORPAY_KEY_SECRET', default='')
RAZORPAY_WEBHOOK_SECRET = env('RAZORPAY_WEBHOOK_SECRET', default='')

CASHFREE_APP_ID = env('CASHFREE_APP_ID', default='')
CASHFREE_SECRET_KEY = env('CASHFREE_SECRET_KEY', default='')
CASHFREE_ENV = env('CASHFREE_ENV', default='sandbox')

SPECTACULAR_SETTINGS = {
    'TITLE': 'Party Hall SaaS API',
    'DESCRIPTION': 'REST API for Party Hall booking platform — Django 5.2 + PostgreSQL 16 + PostGIS + Channels',
    'VERSION': '2.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
# WhiteNoise: compressed + cached static files for Railway/cloud hosting
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ── Media / File Storage ──────────────────────────────────────────────────────
# Local (Docker): files stored on disk at /media/
# Production (Railway + Cloudinary): files uploaded to Cloudinary CDN
_cloudinary_url = env('CLOUDINARY_URL', default=None)
if _cloudinary_url:
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
    CLOUDINARY_STORAGE = {'CLOUDINARY_URL': _cloudinary_url}
    MEDIA_URL = '/media/'   # kept for URL reversal; actual files are on Cloudinary CDN
else:
    MEDIA_URL = '/media/'
    MEDIA_ROOT = BASE_DIR / 'media'

FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:3000')
