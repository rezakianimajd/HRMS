"""Phase 0 — Project/Cost Control foundation models.

Every dimension is deliberately independent:
  * WBSNode  → WHERE the work happens (project-specific tree)
  * CBSNode  → WHAT kind of cost it is (company-level tree)
  * Resource → WHAT resource was consumed
  * OBSNode  → WHO is responsible (references orgchart/Position optionally)
  * CostSource → WHERE the cost event originated (master data)

This package intentionally contains NO integration into contracts/cost
transactions yet; those arrive in later phases via additive migrations.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel

# Phase 2 cost/progress models live in a separate module imported here so
# Django discovers them as part of this app.
from projects.cost_models import (  # noqa: F401
    BudgetLine, CommittedCost, CostTransaction, CostTransactionLine,
    ProgressStatement, ProgressStatementItem,
)

from django.core.exceptions import ValidationError


class ProjectType(BaseModel):
    """Generic project taxonomy (Construction, EPC, Procurement, ...)."""
    name = models.CharField(max_length=150, verbose_name=_('عنوان'))
    code = models.CharField(max_length=50, verbose_name=_('کد'))

    class Meta:
        verbose_name = _('نوع پروژه')
        verbose_name_plural = _('انواع پروژه')
        unique_together = [('company', 'code')]
        ordering = ['name']

    def __str__(self):
        return self.name


class Project(BaseModel):
    """The root business entity for execution & cost control."""

    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        ACTIVE = 'active', _('فعال')
        ON_HOLD = 'on_hold', _('متوقف')
        COMPLETED = 'completed', _('تکمیل‌شده')
        CLOSED = 'closed', _('بسته')

    code = models.CharField(max_length=50, verbose_name=_('کد پروژه'))
    name = models.CharField(max_length=250, verbose_name=_('نام پروژه'))
    project_type = models.ForeignKey(
        ProjectType, on_delete=models.PROTECT, related_name='projects', verbose_name=_('نوع پروژه'),
    )
    manager = models.ForeignKey(
        'employees.Employee', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='managed_projects', verbose_name=_('مدیر پروژه'),
    )
    client = models.CharField(max_length=250, blank=True, verbose_name=_('کارفرما'))
    location = models.CharField(max_length=250, blank=True, verbose_name=_('محل اجرا'))
    start_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ شروع'))
    end_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ پایان'))
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('پروژه')
        verbose_name_plural = _('پروژه‌ها')
        unique_together = [('company', 'code')]
        ordering = ['code']

    def __str__(self):
        return f'{self.code} - {self.name}'


# =============================================================================
# Phase 1 — Commercial structure: Price Lists + Contract items & mappings.
#
# NOTE: Amendment & Guarantee already exist in `contracts` as `Addendum` and
# `Guarantee`. To avoid duplicate models they are intentionally NOT recreated
# here; they will be linked/reused in later phases.
# =============================================================================

class PriceList(BaseModel):
    """A reference price basis (NOT a WBS, NOT a contract)."""
    name = models.CharField(max_length=200, verbose_name=_('نام فهرست‌بها'))
    code = models.CharField(max_length=50, verbose_name=_('کد'))
    discipline = models.CharField(max_length=100, blank=True, verbose_name=_('رشته / دیسیپلین'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('فهرست‌بها')
        verbose_name_plural = _('فهرست‌بهاها')
        unique_together = [('company', 'code')]
        ordering = ['code']

    def __str__(self):
        return f'{self.code} - {self.name}'


class PriceListVersion(BaseModel):
    """Year/version of a price list."""
    price_list = models.ForeignKey(PriceList, on_delete=models.CASCADE, related_name='versions', verbose_name=_('فهرست‌بها'))
    version = models.CharField(max_length=50, verbose_name=_('نسخه'))
    year = models.PositiveIntegerField(blank=True, null=True, verbose_name=_('سال'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('نسخه فهرست‌بها')
        verbose_name_plural = _('نسخه‌های فهرست‌بها')
        unique_together = [('price_list', 'version')]
        ordering = ['price_list', '-year', 'version']

    def __str__(self):
        return f'{self.price_list.code} - {self.version}'


class PriceListChapter(BaseModel):
    """A chapter/group inside a price list version."""
    version = models.ForeignKey(PriceListVersion, on_delete=models.CASCADE, related_name='chapters', verbose_name=_('نسخه'))
    code = models.CharField(max_length=50, verbose_name=_('کد'))
    name = models.CharField(max_length=200, verbose_name=_('عنوان'))

    class Meta:
        verbose_name = _('فصل فهرست‌بها')
        verbose_name_plural = _('فصل‌های فهرست‌بها')
        unique_together = [('version', 'code')]
        ordering = ['version', 'code']

    def __str__(self):
        return f'{self.version} :: {self.code} {self.name}'


class PriceListItem(BaseModel):
    """A single priced item in a price list chapter."""
    chapter = models.ForeignKey(PriceListChapter, on_delete=models.CASCADE, related_name='items', verbose_name=_('فصل'))
    code = models.CharField(max_length=50, verbose_name=_('کد'))
    description = models.TextField(blank=True, verbose_name=_('شرح'))
    unit = models.CharField(max_length=30, blank=True, verbose_name=_('واحد'))
    price = models.DecimalField(max_digits=18, decimal_places=4, default=0, verbose_name=_('نرخ'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('ردیف فهرست‌بها')
        verbose_name_plural = _('ردیف‌های فهرست‌بها')
        unique_together = [('chapter', 'code')]
        ordering = ['chapter', 'code']

    def __str__(self):
        return f'{self.code} - {self.description[:50]}'


class ContractItem(BaseModel):
    """An item / BOQ line under an existing contracts.Contract."""
    contract = models.ForeignKey(
        'contracts.Contract', on_delete=models.CASCADE, related_name='project_items',
        verbose_name=_('قرارداد'),
    )
    code = models.CharField(max_length=50, verbose_name=_('کد'))
    description = models.TextField(blank=True, verbose_name=_('شرح'))
    unit = models.CharField(max_length=30, blank=True, verbose_name=_('واحد'))
    quantity = models.DecimalField(max_digits=18, decimal_places=4, default=0, verbose_name=_('مقدار'))
    unit_price = models.DecimalField(max_digits=18, decimal_places=4, default=0, verbose_name=_('نرخ واحد'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('مبلغ'))

    class Meta:
        verbose_name = _('ردیف قرارداد / BOQ')
        verbose_name_plural = _('ردیف‌های قرارداد / BOQ')
        unique_together = [('contract', 'code')]
        ordering = ['contract', 'code']

    def __str__(self):
        return f'{self.contract_id} / {self.code}'


class ContractWBS(BaseModel):
    """M2M mapping linking a Contract to WBS nodes (a contract may span multiple WBS)."""
    contract = models.ForeignKey(
        'contracts.Contract', on_delete=models.CASCADE, related_name='wbs_links', verbose_name=_('قرارداد'),
    )
    wbs = models.ForeignKey('projects.WBSNode', on_delete=models.CASCADE, related_name='contract_links', verbose_name=_('گره WBS'))

    class Meta:
        verbose_name = _('نگاشت قرارداد-WBS')
        verbose_name_plural = _('نگاشت‌های قرارداد-WBS')
        unique_together = [('contract', 'wbs')]

    def __str__(self):
        return f'{self.contract_id} ↔ {self.wbs_id}'


class ContractPriceBasis(BaseModel):
    """M2M intermediary linking a Contract to a Price List / Pricing Method."""
    contract = models.ForeignKey(
        'contracts.Contract', on_delete=models.CASCADE, related_name='price_bases', verbose_name=_('قرارداد'),
    )
    price_list = models.ForeignKey(PriceList, on_delete=models.PROTECT, null=True, blank=True, related_name='contract_bases', verbose_name=_('فهرست‌بها'))
    price_list_version = models.ForeignKey(PriceListVersion, on_delete=models.SET_NULL, null=True, blank=True, related_name='contract_bases', verbose_name=_('نسخه فهرست‌بها'))
    pricing_method = models.CharField(max_length=50, blank=True, verbose_name=_('روش قیمت‌گذاری'))

    class Meta:
        verbose_name = _('مبنای قیمت قرارداد')
        verbose_name_plural = _('مبناهای قیمت قرارداد')
        ordering = ['contract']

    def __str__(self):
        return f'{self.contract_id} → {self.price_list or self.pricing_method}'


class ProjectPhase(BaseModel):
    """Lifecycle phase of a project (initiation, design, tender, ...)."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='phases', verbose_name=_('پروژه'))
    name = models.CharField(max_length=150, verbose_name=_('عنوان فاز'))
    sequence = models.PositiveIntegerField(default=0, verbose_name=_('ترتیب'))
    start_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ شروع'))
    end_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ پایان'))

    class Meta:
        verbose_name = _('فاز پروژه')
        verbose_name_plural = _('فازهای پروژه')
        unique_together = [('project', 'name')]
        ordering = ['sequence', 'name']

    def __str__(self):
        return f'{self.project.code} :: {self.name}'


class WBSNode(BaseModel):
    """Work Breakdown Structure — WHERE work happens (project-specific tree)."""

    class NodeType(models.TextChoices):
        PROJECT = 'project', _('پروژه')
        PHASE = 'phase', _('فاز')
        DELIVERABLE = 'deliverable', _('تحویل‌دادنی')
        CONTROL_ACCOUNT = 'control_account', _('حساب کنترلی')
        WORK_PACKAGE = 'work_package', _('بسته کاری')
        ACTIVITY = 'activity', _('فعالیت')
        MILESTONE = 'milestone', _('نقطه عطف')

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='wbs_nodes', verbose_name=_('پروژه'))
    code = models.CharField(max_length=50, verbose_name=_('کد'))
    name = models.CharField(max_length=250, verbose_name=_('نام'))
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='children', verbose_name=_('گره بالادستی'),
    )
    node_type = models.CharField(max_length=30, choices=NodeType.choices, default=NodeType.WORK_PACKAGE, verbose_name=_('نوع گره'))
    sequence = models.PositiveIntegerField(default=0, verbose_name=_('ترتیب'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('گره WBS')
        verbose_name_plural = _('ساختار شکست کار (WBS)')
        unique_together = [('project', 'code')]
        ordering = ['sequence', 'code']

    def __str__(self):
        return f'{self.project.code} / {self.code} - {self.name}'


class WBSTemplate(BaseModel):
    """Reusable WBS shape (for similar projects)."""
    name = models.CharField(max_length=200, verbose_name=_('نام قالب'))
    project_type = models.ForeignKey(
        ProjectType, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='wbs_templates', verbose_name=_('نوع پروژه'),
    )
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('قالب WBS')
        verbose_name_plural = _('قالب‌های WBS')
        ordering = ['name']

    def __str__(self):
        return self.name


class CBSNode(BaseModel):
    """Cost Breakdown Structure — WHAT kind of cost it is (company-level tree)."""

    class NodeType(models.TextChoices):
        COST_CLASS = 'cost_class', _('طبقه هزینه')
        COST_GROUP = 'cost_group', _('گروه هزینه')
        COST_CATEGORY = 'cost_category', _('دسته هزینه')
        COST_ELEMENT = 'cost_element', _('عنصر هزینه')

    code = models.CharField(max_length=50, verbose_name=_('کد'))
    name = models.CharField(max_length=200, verbose_name=_('نام'))
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='children', verbose_name=_('گره بالادستی'),
    )
    node_type = models.CharField(max_length=30, choices=NodeType.choices, default=NodeType.COST_CATEGORY, verbose_name=_('نوع گره'))
    sequence = models.PositiveIntegerField(default=0, verbose_name=_('ترتیب'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('گره CBS')
        verbose_name_plural = _('ساختار شکست هزینه (CBS)')
        unique_together = [('company', 'code')]
        ordering = ['sequence', 'code']

    def __str__(self):
        return f'{self.code} - {self.name}'


class ResourceCategory(BaseModel):
    """Top-level classification of a Resource (Material, Labor, Machinery, ...)."""
    name = models.CharField(max_length=150, verbose_name=_('عنوان'))
    code = models.CharField(max_length=50, verbose_name=_('کد'))

    class Meta:
        verbose_name = _('دسته منبع')
        verbose_name_plural = _('دسته‌های منبع')
        unique_together = [('company', 'code')]
        ordering = ['name']

    def __str__(self):
        return self.name


class Resource(BaseModel):
    """A resource consumed on a project (indep. of CBS)."""
    category = models.ForeignKey(ResourceCategory, on_delete=models.PROTECT, related_name='resources', verbose_name=_('دسته'))
    code = models.CharField(max_length=50, verbose_name=_('کد'))
    name = models.CharField(max_length=200, verbose_name=_('نام'))
    unit = models.CharField(max_length=30, blank=True, verbose_name=_('واحد'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('منبع')
        verbose_name_plural = _('منابع')
        unique_together = [('company', 'code')]
        ordering = ['code']

    def __str__(self):
        return f'{self.code} - {self.name}'


class CostSource(BaseModel):
    """Independent master data: origin of a cost event."""
    name = models.CharField(max_length=150, verbose_name=_('عنوان'))
    code = models.CharField(max_length=50, verbose_name=_('کد'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('منشأ هزینه')
        verbose_name_plural = _('منشأهای هزینه')
        unique_together = [('company', 'code')]
        ordering = ['code']

    def __str__(self):
        return self.name


class OBSNode(BaseModel):
    """Organizational Breakdown Structure — WHO is responsible.

    Deliberately independent of orgchart.Position (which is HR/org-chart focused).
    It may OPTIONALLY reference a Department / Position / Employee without
    duplicating the organization model.
    """
    code = models.CharField(max_length=50, verbose_name=_('کد'))
    name = models.CharField(max_length=200, verbose_name=_('نام'))
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='children', verbose_name=_('گره بالادستی'),
    )
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, null=True, blank=True,
        related_name='obs_nodes', verbose_name=_('پروژه'),
    )
    department = models.ForeignKey(
        'employees.Department', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='obs_nodes', verbose_name=_('دپارتمان مرجع'),
    )
    position = models.ForeignKey(
        'orgchart.Position', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='obs_nodes', verbose_name=_('پوزیشن مرجع'),
    )
    employee = models.ForeignKey(
        'employees.Employee', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='obs_nodes', verbose_name=_('مسئول مرجع'),
    )
    sequence = models.PositiveIntegerField(default=0, verbose_name=_('ترتیب'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('گره OBS')
        verbose_name_plural = _('ساختار شکست سازمانی (OBS)')
        unique_together = [('company', 'code')]
        ordering = ['sequence', 'code']

    def __str__(self):
        return f'{self.code} - {self.name}'