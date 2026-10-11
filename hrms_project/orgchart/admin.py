"""پنل ادمین چارت سازمانی (orgchart)."""
from django.contrib import admin

from orgchart.models import Position


@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    list_display = ('title', 'code', 'department', 'parent', 'level', 'is_active')
    list_filter = ('is_active', 'department')
    search_fields = ('title', 'code')
    list_select_related = ('department', 'parent')
    ordering = ('code',)
