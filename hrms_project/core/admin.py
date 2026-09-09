from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _
from core.models import Company, Domain, AuditLog
from core.models.user import UserProfile


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'schema_name', 'email', 'phone', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'code', 'schema_name', 'email']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        (_('اطلاعات پایه'), {
            'fields': ('name', 'code', 'schema_name', 'is_active')
        }),
        (_('اطلاعات تماس'), {
            'fields': ('email', 'phone', 'address', 'postal_code')
        }),
        (_('اطلاعات حقوقی'), {
            'fields': ('national_id', 'economic_code', 'registration_number')
        }),
        (_('لوگو و سایر'), {
            'fields': ('logo', 'created_at', 'updated_at')
        }),
    )


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    fk_name = 'user'
    extra = 0


class CustomUserAdmin(DjangoUserAdmin):
    inlines = [UserProfileInline]
    list_display = ['username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active']


admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'phone', 'created_at']
    list_filter = ['role']
    search_fields = ['user__username', 'phone']
    filter_horizontal = ['companies']


@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ['domain', 'tenant', 'is_primary']
    list_filter = ['is_primary']
    search_fields = ['domain', 'tenant__name']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'company', 'action', 'model_name', 'object_id', 'timestamp', 'ip_address']
    list_filter = ['action', 'company', 'timestamp']
    search_fields = ['user__username', 'model_name', 'object_id', 'description']
    readonly_fields = ['user', 'company', 'action', 'model_name', 'object_id', 'changes', 'description', 'timestamp', 'ip_address']
    date_hierarchy = 'timestamp'