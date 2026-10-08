from django.contrib import admin
from datamapping.models import MappingSource, MappingEntry


@admin.register(MappingSource)
class MappingSourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'is_active')
    search_fields = ('name',)


@admin.register(MappingEntry)
class MappingEntryAdmin(admin.ModelAdmin):
    list_display = ('level', 'source_code', 'source_name', 'target_name', 'status', 'match_score')
    list_filter = ('level', 'status')
    search_fields = ('source_code', 'source_name')
