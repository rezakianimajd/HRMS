"""Phase 2 — Cost Control & Progress models.

These are deliberately separate dimensions:
  * BudgetLine        → planned cost (budget)
  * CommittedCost     → committed cost (real commitment events)
  * CostTransaction   → header of an actual cost event
  * CostTransactionLine → multi-dimensional line of actual cost
  * ProgressStatement / ProgressStatementItem → commercial progress value
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


class BudgetLine(BaseModel):
    """A planned cost line (budget) attachable to a project / WBS / CBS."""
    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='budget_lines', verbose_name=_('پروژه'),
    )
    wbs = models.ForeignKey(
        'projects.WBSNode', on_delete=models.PROTECT, null=True, blank=True,
        related_name='budget_lines', verbose_name=_('گره WBS'),
    )
    cbs = models.ForeignKey(
        'projects.CBSNode', on_delete=models.PROTECT, null=True, blank=True,
        related_name='budget_lines', verbose_name=_('گره CBS'),
    )
    cost_source = models.ForeignKey(
        'projects.CostSource', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='budget_lines', verbose_name=_('منشأ هزینه'),
    )
    description = models.CharField(max_length=250, blank=True, verbose_name=_('شرح'))
    quantity = models.DecimalField(max_digits=18, decimal_places=4, default=0, verbose_name=_('مقدار'))
    unit = models.CharField(max_length=30, blank=True, verbose_name=_('واحد'))
    unit_cost = models.DecimalField(max_digits=18, decimal_places=4, default=0, verbose_name=_('نرخ واحد'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('مبلغ بودجه'))

    class Meta:
        verbose_name = _('ردیف بودجه')
        verbose_name_plural = _('بودجه')
        ordering = ['project', 'id']

    def __str__(self):
        return f'{self.project.code} :: {self.description or self.id}'


class CommittedCost(BaseModel):
    """A real commitment event (PO, subcontract, contract award)."""
    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='committed_costs', verbose_name=_('پروژه'),
    )
    contract = models.ForeignKey(
        'contracts.Contract', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='committed_costs', verbose_name=_('قرارداد'),
    )
    contract_item = models.ForeignKey(
        'projects.ContractItem', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='committed_costs', verbose_name=_('ردیف قرارداد'),
    )
    wbs = models.ForeignKey(
        'projects.WBSNode', on_delete=models.PROTECT, null=True, blank=True,
        related_name='committed_costs', verbose_name=_('گره WBS'),
    )
    cbs = models.ForeignKey(
        'projects.CBSNode', on_delete=models.PROTECT, null=True, blank=True,
        related_name='committed_costs', verbose_name=_('گره CBS'),
    )
    description = models.CharField(max_length=250, blank=True, verbose_name=_('شرح'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('مبلغ تعهد'))
    date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ تعهد'))
    reference = models.CharField(max_length=100, blank=True, verbose_name=_('شماره مرجع'))

    class Meta:
        verbose_name = _('تعهد هزینه')
        verbose_name_plural = _('تعهدات هزینه')
        ordering = ['-date', 'project']

    def __str__(self):
        return f'{self.project.code} :: {self.description or self.id}'


class CostTransaction(BaseModel):
    """Header of an actual cost event."""
    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='cost_transactions', verbose_name=_('پروژه'),
    )
    number = models.CharField(max_length=100, blank=True, verbose_name=_('شماره سند'))
    date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ'))
    cost_source = models.ForeignKey(
        'projects.CostSource', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cost_transactions', verbose_name=_('منشأ هزینه'),
    )
    contract = models.ForeignKey(
        'contracts.Contract', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cost_transactions', verbose_name=_('قرارداد'),
    )
    currency = models.CharField(max_length=10, default='IRR', verbose_name=_('ارز'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))
    accounting_reference = models.CharField(max_length=100, blank=True, verbose_name=_('مرجع حسابداری'))
    purchase_reference = models.CharField(max_length=100, blank=True, verbose_name=_('مرجع خرید'))
    warehouse_reference = models.CharField(max_length=100, blank=True, verbose_name=_('مرجع انبار'))
    payroll_reference = models.CharField(max_length=100, blank=True, verbose_name=_('مرجع حقوق'))
    document_reference = models.CharField(max_length=100, blank=True, verbose_name=_('مرجع سند'))

    class Meta:
        verbose_name = _('تراکنش هزینه')
        verbose_name_plural = _('تراکنش‌های هزینه')
        ordering = ['-date', 'project']

    def __str__(self):
        return f'{self.number or self.id} - {self.project.code}'


class CostTransactionLine(BaseModel):
    """Multi-dimensional line of a cost transaction."""
    transaction = models.ForeignKey(CostTransaction, on_delete=models.CASCADE, related_name='lines', verbose_name=_('تراکنش'))
    wbs = models.ForeignKey(
        'projects.WBSNode', on_delete=models.PROTECT, null=True, blank=True,
        related_name='cost_lines', verbose_name=_('گره WBS'),
    )
    cbs = models.ForeignKey(
        'projects.CBSNode', on_delete=models.PROTECT, null=True, blank=True,
        related_name='cost_lines', verbose_name=_('گره CBS'),
    )
    resource = models.ForeignKey(
        'projects.Resource', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cost_lines', verbose_name=_('منبع'),
    )
    contract_item = models.ForeignKey(
        'projects.ContractItem', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cost_lines', verbose_name=_('ردیف قرارداد'),
    )
    price_basis = models.ForeignKey(
        'projects.ContractPriceBasis', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cost_lines', verbose_name=_('مبنای قیمت'),
    )
    obs = models.ForeignKey(
        'projects.OBSNode', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cost_lines', verbose_name=_('مسئول (OBS)'),
    )
    description = models.CharField(max_length=250, blank=True, verbose_name=_('شرح'))
    quantity = models.DecimalField(max_digits=18, decimal_places=4, default=0, verbose_name=_('مقدار'))
    unit = models.CharField(max_length=30, blank=True, verbose_name=_('واحد'))
    unit_cost = models.DecimalField(max_digits=18, decimal_places=4, default=0, verbose_name=_('نرخ واحد'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('مبلغ'))
    tax = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('مالیات'))
    discount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('تخفیف'))
    net_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('مبلغ خالص'))

    class Meta:
        verbose_name = _('ردیف تراکنش هزینه')
        verbose_name_plural = _('ردیف‌های تراکنش هزینه')
        ordering = ['transaction', 'id']

    def __str__(self):
        return f'{self.transaction_id} :: {self.description or self.id}'


class ProgressStatement(BaseModel):
    """Commercial progress statement header (NOT actual cost)."""
    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='progress_statements', verbose_name=_('پروژه'),
    )
    contract = models.ForeignKey(
        'contracts.Contract', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='progress_statements', verbose_name=_('قرارداد'),
    )
    number = models.CharField(max_length=100, blank=True, verbose_name=_('شماره صورت‌وضعیت'))
    date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ'))
    gross = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('مبلغ ناخالص'))
    retention = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('کسور حسن انجام کار'))
    insurance = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('بیمه'))
    tax = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('مالیات'))
    adjustment = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('تعدیلات'))
    net_payable = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('قابل پرداخت'))
    is_approved = models.BooleanField(default=False, verbose_name=_('تأیید شده'))

    class Meta:
        verbose_name = _('صورت‌وضعیت')
        verbose_name_plural = _('صورت‌وضعیت‌ها')
        ordering = ['-date', 'project']

    def __str__(self):
        return f'{self.number or self.id} - {self.project.code}'


class ProgressStatementItem(BaseModel):
    """Line of a progress statement (quantity + progress, not just amount)."""
    statement = models.ForeignKey(ProgressStatement, on_delete=models.CASCADE, related_name='items', verbose_name=_('صورت‌وضعیت'))
    contract_item = models.ForeignKey(
        'projects.ContractItem', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='progress_items', verbose_name=_('ردیف قرارداد'),
    )
    wbs = models.ForeignKey(
        'projects.WBSNode', on_delete=models.PROTECT, null=True, blank=True,
        related_name='progress_items', verbose_name=_('گره WBS'),
    )
    description = models.CharField(max_length=250, blank=True, verbose_name=_('شرح'))
    unit = models.CharField(max_length=30, blank=True, verbose_name=_('واحد'))
    unit_price = models.DecimalField(max_digits=18, decimal_places=4, default=0, verbose_name=_('نرخ واحد'))
    previous_quantity = models.DecimalField(max_digits=18, decimal_places=4, default=0, verbose_name=_('مقدار قبلی'))
    current_quantity = models.DecimalField(max_digits=18, decimal_places=4, default=0, verbose_name=_('مقدار فعلی'))
    cumulative_quantity = models.DecimalField(max_digits=18, decimal_places=4, default=0, verbose_name=_('مقدار تجمعی'))
    progress_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name=_('درصد پیشرفت'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('مبلغ'))

    class Meta:
        verbose_name = _('ردیف صورت‌وضعیت')
        verbose_name_plural = _('ردیف‌های صورت‌وضعیت')
        ordering = ['statement', 'id']

    def __str__(self):
        return f'{self.statement_id} :: {self.description or self.id}'