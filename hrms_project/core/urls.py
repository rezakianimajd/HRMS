"""
URL configuration for the core app.
"""
from django.urls import path
from core import views
from core import application_views
from core import system_views
from core import updates_views

urlpatterns = [
    # Health & version (public, no auth — used by monitoring and the updater)
    path('health/', system_views.health_view, name='api-health'),
    path('system/version/', system_views.version_view, name='api-system-version'),

    # Platform-wide announcements
    path('system/broadcast/', system_views.broadcast_active, name='api-broadcast-active'),
    path('system/broadcast/<int:broadcast_id>/ack/', system_views.broadcast_ack, name='api-broadcast-ack'),

    # In-app updates (upload + verification + history)
    path('system/updates/status/', updates_views.updates_status, name='api-updates-status'),
    path('system/updates/upload/init/', updates_views.upload_init, name='api-updates-upload-init'),
    path('system/updates/upload/<str:upload_id>/chunk/', updates_views.upload_chunk, name='api-updates-upload-chunk'),
    path('system/updates/upload/<str:upload_id>/complete/', updates_views.upload_complete, name='api-updates-upload-complete'),
    path('system/updates/upload/<str:upload_id>/', updates_views.upload_abort, name='api-updates-upload-abort'),
    path('system/updates/releases/', updates_views.releases_list, name='api-updates-releases'),
    path('system/updates/releases/<int:release_id>/', updates_views.release_detail, name='api-updates-release-detail'),
    path('system/updates/releases/<int:release_id>/apply/', updates_views.release_apply, name='api-updates-release-apply'),
    path('system/updates/runs/', updates_views.runs_list, name='api-updates-runs'),
    path('system/updates/runs/<int:run_id>/', updates_views.run_detail, name='api-updates-run-detail'),

    # Authentication
    path('auth/login/', views.login_view, name='api-login'),
    path('auth/logout/', views.logout_view, name='api-logout'),
    path('auth/me/', views.me_view, name='api-me'),

    # Public login helpers (list users & companies for the login screen)
    path('auth/login-users/', views.login_users_view, name='api-login-users'),
    path('auth/login-companies/', views.login_companies_view, name='api-login-companies'),

    # Companies
    path('companies/', views.company_list_view, name='api-company-list'),
    path('companies/<int:company_id>/', views.company_detail_view, name='api-company-detail'),
    path('companies/current/', views.current_company_view, name='api-company-current'),
    path('companies/switch/', views.switch_company_view, name='api-company-switch'),

    # Languages
    path('languages/', views.language_list_view, name='api-language-list'),
    path('languages/current/', views.current_language_view, name='api-language-current'),
    path('languages/switch/', views.switch_language_view, name='api-language-switch'),

    # Audit Logs
    path('audit-logs/', views.audit_log_list_view, name='api-audit-logs'),

    # Applications (multi-app platform)
    path('applications/', application_views.applications_view, name='api-applications'),
    path('applications/catalog/', application_views.applications_catalog_view, name='api-applications-catalog'),
    path('applications/switch/', application_views.switch_application_view, name='api-applications-switch'),

    # Users & roles
    path('users/', views.users_view, name='api-users'),
    path('users/create/', views.user_create_view, name='api-user-create'),
    path('users/<int:user_id>/role/', views.user_set_role_view, name='api-user-set-role'),
    path('users/<int:user_id>/applications/', views.user_set_applications_view, name='api-user-set-applications'),
    path('users/<int:user_id>/delete/', views.user_delete_view, name='api-user-delete'),
    path('users/roles/', views.user_roles_view, name='api-user-roles'),
    path('users/roles/<str:role>/save/', views.user_role_save_view, name='api-user-role-save'),
]
