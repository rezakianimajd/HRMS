from django.contrib import admin
from projects.models import (
    ProjectType, Project, ProjectPhase, WBSNode, WBSTemplate, WBSTemplateNode, CBSNode,
    ResourceCategory, Resource, CostSource, OBSNode,
    PriceList, PriceListVersion, PriceListChapter, PriceListItem,
    ContractItem, ContractWBS, ContractPriceBasis,
    BudgetLine, CommittedCost, CostTransaction, CostTransactionLine,
    ProgressStatement, ProgressStatementItem,
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


class WBSTemplateNodeInline(admin.TabularInline):
    model = WBSTemplateNode
    extra = 1
    fields = ('parent', 'code', 'name', 'node_type', 'sequence')


WBSTemplateAdmin.inlines = [WBSTemplateNodeInline]


@admin.register(WBSTemplateNode)
class WBSTemplateNodeAdmin(admin.ModelAdmin):
    list_display = ['template', 'code', 'name', 'node_type', 'parent', 'sequence']
    list_filter = ['template', 'node_type']
    search_fields = ['code', 'name']


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


@admin.register(BudgetLine)
class BudgetLineAdmin(admin.ModelAdmin):
    list_display = ['project', 'wbs', 'cbs', 'description', 'amount']
    list_filter = ['project']
    search_fields = ['description']


@admin.register(CommittedCost)
class CommittedCostAdmin(admin.ModelAdmin):
    list_display = ['project', 'contract', 'contract_item', 'wbs', 'cbs', 'description', 'amount', 'date']
    list_filter = ['project']
    search_fields = ['description', 'reference']


@admin.register(CostTransaction)
class CostTransactionAdmin(admin.ModelAdmin):
    list_display = ['number', 'project', 'date', 'cost_source', 'currency', 'description']
    list_filter = ['project', 'cost_source']
    search_fields = ['number', 'description']


@admin.register(CostTransactionLine)
class CostTransactionLineAdmin(admin.ModelAdmin):
    list_display = ['transaction', 'wbs', 'cbs', 'resource', 'description', 'amount']
    list_filter = ['wbs', 'cbs', 'resource']


@admin.register(ProgressStatement)
class ProgressStatementAdmin(admin.ModelAdmin):
    list_display = ['number', 'project', 'contract', 'date', 'gross', 'net_payable', 'is_approved']
    list_filter = ['project', 'is_approved']
    search_fields = ['number']


@admin.register(ProgressStatementItem)
class ProgressStatementItemAdmin(admin.ModelAdmin):
    list_display = ['statement', 'contract_item', 'wbs', 'description', 'amount']


# ------------------------- فاز ۱: زمان‌بندی و منابع -------------------------
from projects.schedule_models import (  # noqa: E402
    Activity, ActivityProgress, ActivityRelationship, Baseline, BaselineActivity,
    CalendarException, ResourceAssignment, ResourceRate, WorkCalendar,
)


@admin.register(WorkCalendar)
class WorkCalendarAdmin(admin.ModelAdmin):
    list_display = ['name', 'project', 'code', 'hours_per_day', 'is_default']
    list_filter = ['project', 'is_default']
    search_fields = ['name', 'code']


@admin.register(CalendarException)
class CalendarExceptionAdmin(admin.ModelAdmin):
    list_display = ['calendar', 'date', 'is_working', 'hours', 'title']
    list_filter = ['calendar', 'is_working']
    search_fields = ['title']


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'project', 'activity_type', 'duration_days',
                    'early_start', 'early_finish', 'total_float', 'is_critical', 'percent_complete']
    list_filter = ['project', 'activity_type', 'is_critical']
    search_fields = ['code', 'name']
    readonly_fields = ['early_start', 'early_finish', 'late_start', 'late_finish',
                       'total_float', 'is_critical']


@admin.register(ActivityRelationship)
class ActivityRelationshipAdmin(admin.ModelAdmin):
    list_display = ['project', 'predecessor', 'successor', 'rel_type', 'lag_days']
    list_filter = ['project', 'rel_type']


@admin.register(Baseline)
class BaselineAdmin(admin.ModelAdmin):
    list_display = ['project', 'name', 'version', 'is_current', 'total_cost',
                    'start_date', 'end_date', 'created_at']
    list_filter = ['project', 'is_current']


@admin.register(BaselineActivity)
class BaselineActivityAdmin(admin.ModelAdmin):
    list_display = ['baseline', 'code', 'name', 'early_start', 'early_finish',
                    'duration_days', 'total_float', 'planned_cost']
    list_filter = ['baseline']


@admin.register(ResourceRate)
class ResourceRateAdmin(admin.ModelAdmin):
    list_display = ['resource', 'effective_from', 'rate', 'currency']
    list_filter = ['resource', 'currency']


@admin.register(ResourceAssignment)
class ResourceAssignmentAdmin(admin.ModelAdmin):
    list_display = ['activity', 'resource', 'units_per_day', 'unit_rate',
                    'planned_cost', 'actual_cost']
    list_filter = ['resource']


@admin.register(ActivityProgress)
class ActivityProgressAdmin(admin.ModelAdmin):
    list_display = ['activity', 'date', 'percent_complete', 'quantity']
    list_filter = ['date']

