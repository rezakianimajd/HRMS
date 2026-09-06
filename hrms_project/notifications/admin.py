from django.contrib import admin
from notifications.models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'priority', 'user_id', 'is_read', 'created_at')
    list_filter = ('category', 'priority', 'is_read')
    search_fields = ('title', 'body')