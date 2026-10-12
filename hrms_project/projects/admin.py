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


# ------------------------- فاز ۲: تغییرات پروژه -------------------------
from projects.change_models import (  # noqa: E402
    ChangeOrder, ChangeOrderApproval, ChangeOrderLine,
)


class ChangeOrderLineInline(admin.TabularInline):
    model = ChangeOrderLine
    extra = 1
    fields = ('wbs', 'cbs', 'cost_source', 'description', 'unit', 'quantity', 'unit_price', 'amount')


@admin.register(ChangeOrder)
class ChangeOrderAdmin(admin.ModelAdmin):
    list_display = ['number', 'title', 'project', 'status', 'cost_impact',
                    'time_impact_days', 'applied', 'request_date']
    list_filter = ['project', 'status', 'cause', 'applied']
    search_fields = ['number', 'title', 'subject']
    inlines = [ChangeOrderLineInline]
    readonly_fields = ['applied', 'applied_at', 'applied_budget_line', 'created_addendum']


@admin.register(ChangeOrderLine)
class ChangeOrderLineAdmin(admin.ModelAdmin):
    list_display = ['change_order', 'wbs', 'cbs', 'description', 'quantity', 'unit_price', 'amount']
    list_filter = ['change_order']


@admin.register(ChangeOrderApproval)
class ChangeOrderApprovalAdmin(admin.ModelAdmin):
    list_display = ['change_order', 'action', 'actor_name', 'created_at']
    list_filter = ['action']


# ------------------- فاز ۲ (بخش دوم): صورتجلسه/گواهی/تخصیص -------------------
from projects.phase2_models import (  # noqa: E402
    CostAllocation, MeasurementSheet, MeasurementSheetLine, PaymentCertificate,
)


class MeasurementSheetLineInline(admin.TabularInline):
    model = MeasurementSheetLine
    extra = 1
    fields = ('line_no', 'contract_item', 'wbs', 'description', 'unit', 'unit_price',
              'previous_quantity', 'current_quantity', 'cumulative_quantity', 'amount')


@admin.register(MeasurementSheet)
class MeasurementSheetAdmin(admin.ModelAdmin):
    list_display = ['number', 'title', 'project', 'contract', 'date', 'status',
                    'gross_amount', 'net_amount', 'checked_by', 'approved_by']
    list_filter = ['project', 'status', 'contract']
    search_fields = ['number', 'title']
    inlines = [MeasurementSheetLineInline]
    readonly_fields = ['gross_amount', 'retention_amount', 'net_amount', 'statement',
                       'checked_at', 'approved_at']


@admin.register(MeasurementSheetLine)
class MeasurementSheetLineAdmin(admin.ModelAdmin):
    list_display = ['sheet', 'line_no', 'description', 'unit', 'current_quantity',
                    'cumulative_quantity', 'amount']
    list_filter = ['sheet']


@admin.register(PaymentCertificate)
class PaymentCertificateAdmin(admin.ModelAdmin):
    list_display = ['number', 'project', 'contract', 'sheet', 'date', 'due_date',
                    'gross', 'deductions', 'net_payable', 'paid_amount', 'status']
    list_filter = ['project', 'status', 'contract']
    search_fields = ['number']


@admin.register(CostAllocation)
class CostAllocationAdmin(admin.ModelAdmin):
    list_display = ['title', 'project', 'kind', 'wbs', 'employee', 'resource',
                    'date', 'quantity', 'rate', 'amount', 'cost_transaction']
    list_filter = ['project', 'kind']
    search_fields = ['title', 'note']


# ------------------- فاز ۳ (بخش اول): رجیستر ریسک -------------------
from projects.risk_models import (  # noqa: E402
    Risk, RiskAction, RiskCategory, RiskReview,
)


@admin.register(RiskCategory)
class RiskCategoryAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'discipline', 'is_active']
    list_filter = ['is_active', 'discipline']
    search_fields = ['code', 'name']


class RiskActionInline(admin.TabularInline):
    model = RiskAction
    extra = 1
    fields = ('title', 'owner', 'owner_name', 'start_date', 'due_date', 'status', 'cost',
              'sort_order')


class RiskReviewInline(admin.TabularInline):
    model = RiskReview
    extra = 0
    readonly_fields = ['probability', 'impact', 'score', 'residual_score', 'status',
                       'reviewer_name']
    fields = ('date', 'reviewer', 'reviewer_name', 'probability', 'impact', 'score',
              'residual_score', 'status', 'note', 'next_review_date')


@admin.register(Risk)
class RiskAdmin(admin.ModelAdmin):
    list_display = ['number', 'title', 'project', 'category', 'risk_type', 'probability',
                    'impact_cost', 'score', 'level', 'status', 'owner', 'due_date',
                    'expected_cost']
    list_filter = ['project', 'status', 'level', 'risk_type', 'category']
    search_fields = ['number', 'title', 'description', 'owner_name']
    readonly_fields = ['score', 'level', 'expected_cost', 'residual_score', 'residual_cost',
                       'closed_date']
    inlines = [RiskActionInline, RiskReviewInline]


@admin.register(RiskAction)
class RiskActionAdmin(admin.ModelAdmin):
    list_display = ['title', 'risk', 'owner', 'owner_name', 'start_date', 'due_date',
                    'completed_at', 'status', 'cost']
    list_filter = ['status', 'risk__project']
    search_fields = ['title', 'owner_name']


@admin.register(RiskReview)
class RiskReviewAdmin(admin.ModelAdmin):
    list_display = ['risk', 'date', 'reviewer_name', 'probability', 'impact', 'score',
                    'residual_score', 'status', 'next_review_date']
    list_filter = ['status', 'risk__project']
    search_fields = ['reviewer_name', 'note']


# ------------------- فاز ۳ (بخش دوم): کیفیت و HSE -------------------
from projects.quality_models import (  # noqa: E402
    HSEIncident, Inspection, NCR, PunchItem, QualityPlan, QualityPlanItem,
)


class QualityPlanItemInline(admin.TabularInline):
    model = QualityPlanItem
    extra = 1
    fields = ('item_no', 'description', 'wbs', 'activity', 'inspection_type', 'point_type',
              'reference', 'frequency', 'responsible_name', 'planned_date', 'status', 'sort_order')


@admin.register(QualityPlan)
class QualityPlanAdmin(admin.ModelAdmin):
    list_display = ['number', 'title', 'project', 'revision', 'date', 'status',
                    'prepared_by_name', 'approved_by_name']
    list_filter = ['project', 'status']
    search_fields = ['number', 'title']
    inlines = [QualityPlanItemInline]


@admin.register(QualityPlanItem)
class QualityPlanItemAdmin(admin.ModelAdmin):
    list_display = ['plan', 'item_no', 'description', 'inspection_type', 'point_type',
                    'responsible_name', 'planned_date', 'status']
    list_filter = ['status', 'inspection_type', 'point_type', 'plan__project']
    search_fields = ['item_no', 'description', 'reference']


@admin.register(Inspection)
class InspectionAdmin(admin.ModelAdmin):
    list_display = ['number', 'project', 'plan_item', 'date', 'inspector_name', 'status',
                    'result', 'report_ref']
    list_filter = ['project', 'status', 'result']
    search_fields = ['number', 'title', 'inspector_name', 'location']


class PunchItemInline(admin.TabularInline):
    model = PunchItem
    extra = 0
    fields = ('number', 'description', 'location', 'priority', 'status', 'responsible_name',
              'due_date', 'cost')


@admin.register(NCR)
class NCRAdmin(admin.ModelAdmin):
    list_display = ['number', 'title', 'project', 'severity', 'source', 'discipline', 'status',
                    'detected_date', 'due_date', 'closed_date', 'responsible_name', 'cost_impact']
    list_filter = ['project', 'status', 'severity', 'source']
    search_fields = ['number', 'title', 'description', 'responsible_name']
    readonly_fields = ['closed_date', 'closed_by']
    inlines = [PunchItemInline]


@admin.register(PunchItem)
class PunchItemAdmin(admin.ModelAdmin):
    list_display = ['number', 'description', 'project', 'location', 'discipline', 'priority',
                    'status', 'responsible_name', 'due_date', 'fixed_date', 'verified_date', 'cost']
    list_filter = ['project', 'status', 'priority']
    search_fields = ['number', 'description', 'location', 'responsible_name']


@admin.register(HSEIncident)
class HSEIncidentAdmin(admin.ModelAdmin):
    list_display = ['number', 'title', 'project', 'incident_type', 'severity', 'status', 'date',
                    'lost_days', 'man_hours', 'location', 'reported_by_name']
    list_filter = ['project', 'incident_type', 'severity', 'status']
    search_fields = ['number', 'title', 'location', 'involved_persons', 'reported_by_name']



