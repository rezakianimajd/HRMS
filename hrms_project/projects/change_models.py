"""فاز ۲ — تغییر پروژه (Change Order) و اثر آن بر هزینه/زمان.

* `ChangeOrder` → درخواست تغییر با اثر ریالی و زمانی + چرخهٔ وضعیت
* `ChangeOrderLine` → خطوط اثر روی WBS/CBS
* `ChangeOrderApproval` → تاریخچهٔ تصمیم‌ها (چه‌کسی/چه‌زمانی/چه‌تصمیمی)

اعمال تغییر (تأییدشده) در `projects/change_service.py` انجام می‌شود:
ایجاد ردیف بودجه، تمدید پایان پروژه و (در صورت اتصال به قرارداد) ساخت الحاقیه.
"""
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models.audit_mixin import (
    AllObjectsManager, AuditableModel, SoftDeleteManager,
)
from core.models.base_model import BaseModel


class ChangeOrder(BaseModel, AuditableModel):
    """درخواست تغییر پروژه (Variation / Change Order)."""
    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        SUBMITTED = 'submitted', _('در انتظار تأیید')
        APPROVED = 'approved', _('تأییدشده')
        REJECTED = 'rejected', _('رد شده')
        APPLIED = 'applied', _('اعمال‌شده')
        CANCELLED = 'cancelled', _('لغو شده')

    class Cause(models.TextChoices):
        OWNER = 'owner', _('درخواست کارفرما')
        DESIGN = 'design', _('تغییر طراحی')
        SITE = 'site', _('شرایط کارگاه')
        REGULATION = 'regulation', _('الزامات قانونی')
        SCOPE = 'scope', _('تغییر دامنه')
        OTHER = 'other', _('سایر')

    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='change_orders',
        verbose_name=_('پروژه'),
    )
    contract = models.ForeignKey(
        'contracts.Contract', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='project_change_orders', verbose_name=_('قرارداد مرتبط'),
    )
    number = models.CharField(max_length=50, verbose_name=_('شمارهٔ تغییر'))
    title = models.CharField(max_length=250, verbose_name=_('عنوان تغییر'))
    subject = models.CharField(max_length=300, blank=True, verbose_name=_('موضوع'))
    cause = models.CharField(
        max_length=20, choices=Cause.choices, default=Cause.OTHER, verbose_name=_('علت'),
    )
    description = models.TextField(blank=True, verbose_name=_('شرح تغییر'))
    request_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ درخواست'))
    decided_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ تصمیم'))

    time_impact_days = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, verbose_name=_('اثر زمانی (روز)'),
    )
    cost_impact = models.DecimalField(
        max_digits=18, decimal_places=2, default=0, verbose_name=_('اثر ریالی'),
    )
    currency = models.ForeignKey(
        'settings_app.Currency', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='project_change_orders', verbose_name=_('ارز'),
    )

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'),
    )
    requested_by = models.CharField(max_length=200, blank=True, verbose_name=_('درخواست‌دهنده'))
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='decided_change_orders', verbose_name=_('تصمیم‌گیرنده'),
    )
    decision_note = models.TextField(blank=True, verbose_name=_('یادداشت تصمیم'))

    applied = models.BooleanField(default=False, verbose_name=_('اعمال شده'))
    applied_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان اعمال'))
    applied_budget_line = models.ForeignKey(
        'projects.BudgetLine', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='change_orders', verbose_name=_('ردیف بودجهٔ ایجادشده'),
    )
    created_addendum = models.ForeignKey(
        'contracts.Addendum', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='project_change_orders', verbose_name=_('الحاقیهٔ ایجادشده'),
    )

    class Meta:
        verbose_name = _('تغییر پروژه')
        verbose_name_plural = _('تغییرات پروژه')
        unique_together = [('project', 'number')]
        ordering = ['-request_date', '-id']
        indexes = [
            models.Index(fields=['project', 'status'], name='co_proj_status_idx'),
        ]

    def __str__(self):
        return f'{self.number} — {self.title}'


class ChangeOrderLine(BaseModel):
    """خط اثر تغییر روی WBS/CBS (مبنای ایجاد ردیف بودجه در زمان اعمال)."""
    change_order = models.ForeignKey(
        ChangeOrder, on_delete=models.CASCADE, related_name='lines', verbose_name=_('تغییر'),
    )
    wbs = models.ForeignKey(
        'projects.WBSNode', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='change_order_lines', verbose_name=_('گره WBS'),
    )
    cbs = models.ForeignKey(
        'projects.CBSNode', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='change_order_lines', verbose_name=_('گره CBS'),
    )
    cost_source = models.ForeignKey(
        'projects.CostSource', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='change_order_lines', verbose_name=_('منشأ هزینه'),
    )
    description = models.CharField(max_length=250, blank=True, verbose_name=_('شرح'))
    unit = models.CharField(max_length=30, blank=True, verbose_name=_('واحد'))
    quantity = models.DecimalField(max_digits=18, decimal_places=4, default=0, verbose_name=_('مقدار'))
    unit_price = models.DecimalField(max_digits=18, decimal_places=4, default=0, verbose_name=_('نرخ واحد'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('مبلغ'))

    class Meta:
        verbose_name = _('خط تغییر پروژه')
        verbose_name_plural = _('خطوط تغییرات پروژه')
        ordering = ['change_order', 'id']

    def __str__(self):
        return f'{self.change_order.number} :: {self.description or self.id}'


class ChangeOrderApproval(BaseModel):
    """تاریخچهٔ گردش تغییر: ارسال، تأیید، رد و اعمال."""

    class Action(models.TextChoices):
        SUBMITTED = 'submitted', _('ارسال برای تأیید')
        APPROVED = 'approved', _('تأیید')
        REJECTED = 'rejected', _('رد')
        APPLIED = 'applied', _('اعمال')
        CANCELLED = 'cancelled', _('لغو')

    change_order = models.ForeignKey(
        ChangeOrder, on_delete=models.CASCADE, related_name='approvals', verbose_name=_('تغییر'),
    )
    action = models.CharField(max_length=20, choices=Action.choices, verbose_name=_('اقدام'))
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='change_order_actions', verbose_name=_('اقدام‌کننده'),
    )
    actor_name = models.CharField(max_length=150, blank=True, verbose_name=_('نام اقدام‌کننده'))
    comment = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('گردش تغییر پروژه')
        verbose_name_plural = _('گردش تغییرات پروژه')
        ordering = ['change_order', 'created_at']

    def __str__(self):
        return f'{self.change_order.number} :: {self.action}'

