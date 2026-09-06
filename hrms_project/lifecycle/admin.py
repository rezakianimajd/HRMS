from django.contrib import admin
from lifecycle.models import Asset, LifecycleChecklist, ChecklistItem, CalendarEvent


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ('name', 'asset_type', 'employee', 'status', 'assigned_date', 'returned_date')
    list_filter = ('asset_type', 'status')
    search_fields = ('name', 'serial_number', 'employee__first_name', 'employee__last_name')


@admin.register(LifecycleChecklist)
class LifecycleChecklistAdmin(admin.ModelAdmin):
    list_display = ('employee', 'kind', 'created_at')
    list_filter = ('kind',)
    search_fields = ('employee__first_name', 'employee__last_name')


@admin.register(ChecklistItem)
class ChecklistItemAdmin(admin.ModelAdmin):
    list_display = ('title', 'checklist', 'is_completed', 'completed_at')
    list_filter = ('is_completed',)
    search_fields = ('title',)


@admin.register(CalendarEvent)
class CalendarEventAdmin(admin.ModelAdmin):
    list_display = ('title', 'event_date', 'event_type', 'employee')
    list_filter = ('event_type',)
    search_fields = ('title', 'description')