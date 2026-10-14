"""Admin registration for the Settings app."""
from django.contrib import admin

from settings_app.models import (
    SystemSetting, CompanyProfile, StorageProfile, ArchiveFolder,
    Signatory, BaleContact, Addition, Deduction, Currency,
)


@admin.register(StorageProfile)
class StorageProfileAdmin(admin.ModelAdmin):
    list_display = ('module_name', 'module_key', 'root_folder', 'entity_folder_pattern', 'is_active')
    search_fields = ('module_name', 'module_key', 'root_folder')
    list_filter = ('is_active', 'include_company')


@admin.register(ArchiveFolder)
class ArchiveFolderAdmin(admin.ModelAdmin):
    list_display = ('label', 'profile', 'entity_type', 'entity_id', 'relative_path')
    search_fields = ('label', 'relative_path', 'entity_id')
    list_filter = ('entity_type',)


admin.site.register(SystemSetting)
admin.site.register(CompanyProfile)
admin.site.register(Signatory)
admin.site.register(BaleContact)
admin.site.register(Addition)
admin.site.register(Deduction)
admin.site.register(Currency)
