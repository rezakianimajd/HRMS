from django.urls import path
from settings_app import views
from settings_app import user_views
from settings_app import import_views
from settings_app import backup_views

urlpatterns = [
    # Company profile (must come before <str:key> to avoid conflict)
    path('settings/company-profile/', views.company_profile_view, name='api-company-profile'),
    path('settings/company-profile/update/', views.company_profile_update, name='api-company-profile-update'),
    path('settings/company-profile/logo/', views.company_logo_upload, name='api-company-logo-upload'),

    # Settings list & update
    path('settings/', views.settings_list, name='api-settings-list'),
    path('settings/<str:key>/', views.settings_update, name='api-settings-update'),

    # Roles & permissions
    path('roles/', user_views.roles_list, name='api-roles-list'),
    path('roles/<str:role>/', user_views.roles_update, name='api-roles-update'),

    # User management
    path('users/', user_views.users_list, name='api-users-list'),
    path('users/create/', user_views.users_create, name='api-users-create'),
    path('users/<int:user_id>/', user_views.users_update, name='api-users-update'),
    path('users/<int:user_id>/delete/', user_views.users_delete, name='api-users-delete'),
    path('users/companies/', user_views.companies_list, name='api-users-companies'),

    # Import
    path('import/types/', import_views.import_types, name='api-import-types'),
    path('import/template/<str:import_type>/', import_views.import_template, name='api-import-template'),
    path('import/upload/', import_views.import_upload, name='api-import-upload'),

    # Backup / Restore / Wipe
    path('backup/list/', backup_views.backup_list, name='api-backup-list'),
    path('backup/create/', backup_views.backup_create, name='api-backup-create'),
    path('backup/restore/<str:filename>/', backup_views.backup_restore, name='api-backup-restore'),
    path('backup/wipe/', backup_views.wipe_data, name='api-backup-wipe'),
]
