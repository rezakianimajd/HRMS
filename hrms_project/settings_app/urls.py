from django.urls import path, include
from rest_framework.routers import DefaultRouter
from settings_app import views
from settings_app import user_views
from settings_app import import_views
from settings_app import backup_views
from settings_app.bale_views import BaleContactViewSet
from settings_app.signatory_views import SignatoryViewSet
from settings_app.definition_views import AdditionViewSet, DeductionViewSet, CurrencyViewSet
from settings_app import archive_views

router = DefaultRouter()
router.register(r'bale-contacts', BaleContactViewSet, basename='bale-contact')
router.register(r'signatories', SignatoryViewSet, basename='signatory')
router.register(r'additions', AdditionViewSet, basename='addition')
router.register(r'deductions', DeductionViewSet, basename='deduction')
router.register(r'currencies', CurrencyViewSet, basename='currency')

urlpatterns = [
    path('', include(router.urls)),
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

    # Storage & Archive (بایگانی فایل بر اساس ماژول)
    path('storage/overview/', archive_views.storage_overview, name='api-storage-overview'),
    path('storage/media-info/', archive_views.media_info, name='api-storage-media-info'),
    path('storage/profiles/', archive_views.storage_profiles, name='api-storage-profiles'),
    path('storage/profiles/<int:profile_id>/', archive_views.storage_profile_detail, name='api-storage-profile-detail'),
    path('storage/profiles/<int:profile_id>/build/', archive_views.storage_profile_build, name='api-storage-profile-build'),
    path('storage/profiles/<int:profile_id>/folders/', archive_views.storage_profile_folders, name='api-storage-profile-folders'),
    path('storage/profiles/<int:profile_id>/reset/', archive_views.storage_profile_reset, name='api-storage-profile-reset'),
    path('storage/folders/<int:folder_id>/', archive_views.storage_folder_delete, name='api-storage-folder-delete'),
    path('storage/browse/', archive_views.storage_browse, name='api-storage-browse'),
    path('storage/files/', archive_views.storage_file_delete, name='api-storage-file-delete'),
    path('storage/ensure/', archive_views.storage_ensure_entity, name='api-storage-ensure'),
]
