from django.contrib import admin
from projects.models import (
    ProjectType, Project, ProjectPhase, WBSNode, WBSTemplate, CBSNode,
    ResourceCategory, Resource, CostSource, OBSNode,
    PriceList, PriceListVersion, PriceListChapter, PriceListItem,
    ContractItem, ContractWBS, ContractPriceBasis,
)


@admin.register(ProjectType)
class ProjectTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'code']


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'project_type', 'manager', 'status', 'start_date', 'end_date']
    list_filter = ['status', 'project_type']
    search_fields = ['code', 'name', 'client']


@admin.register(ProjectPhase)
class ProjectPhaseAdmin(admin.ModelAdmin):
    list_display = ['project', 'name', 'sequence']


@admin.register(WBSNode)
class WBSNodeAdmin(admin.ModelAdmin):
    list_display = ['project', 'code', 'name', 'node_type', 'parent', 'sequence', 'is_active']
    list_filter = ['project', 'node_type']
    search_fields = ['code', 'name']


@admin.register(WBSTemplate)
class WBSTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'project_type', 'is_active']


@admin.register(CBSNode)
class CBSNodeAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'node_type', 'parent', 'sequence', 'is_active']
    list_filter = ['node_type']
    search_fields = ['code', 'name']


@admin.register(ResourceCategory)
class ResourceCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'code']


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'category', 'unit', 'is_active']
    list_filter = ['category']
    search_fields = ['code', 'name']


@admin.register(CostSource)
class CostSourceAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'is_active']


@admin.register(OBSNode)
class OBSNodeAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'project', 'department', 'position', 'employee', 'parent', 'is_active']
    list_filter = ['project']
    search_fields = ['code', 'name']


@admin.register(PriceList)
class PriceListAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'discipline', 'is_active']
    search_fields = ['code', 'name']


@admin.register(PriceListVersion)
class PriceListVersionAdmin(admin.ModelAdmin):
    list_display = ['price_list', 'version', 'year', 'is_active']


@admin.register(PriceListChapter)
class PriceListChapterAdmin(admin.ModelAdmin):
    list_display = ['version', 'code', 'name']


@admin.register(PriceListItem)
class PriceListItemAdmin(admin.ModelAdmin):
    list_display = ['chapter', 'code', 'description', 'unit', 'price', 'is_active']
    search_fields = ['code', 'description']


@admin.register(ContractItem)
class ContractItemAdmin(admin.ModelAdmin):
    list_display = ['contract', 'code', 'description', 'unit', 'quantity', 'unit_price', 'amount']
    list_filter = ['contract']
    search_fields = ['code', 'description']


@admin.register(ContractWBS)
class ContractWBSAdmin(admin.ModelAdmin):
    list_display = ['contract', 'wbs']


@admin.register(ContractPriceBasis)
class ContractPriceBasisAdmin(admin.ModelAdmin):
    list_display = ['contract', 'price_list', 'price_list_version', 'pricing_method']
