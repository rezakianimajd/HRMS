"""فاز ۲ (بخش دوم) — صورتجلسهٔ اندازه‌گیری، گواهی پرداخت و تخصیص هزینهٔ منابع.

* `MeasurementSheet` / `MeasurementSheetLine` → اندازه‌گیری مقداری کارکرد و چرخهٔ تأیید
  (تهیه → ارسال → تأیید مشاور → تأیید کارفرما → صدور گواهی)
* `PaymentCertificate` → گواهی پرداخت با اتصال به صورت‌وضعیت/فاکتور/پرداخت قرارداد
* `CostAllocation` → تخصیص حقوق، تجهیزات و ... روی WBS/فعالیت و تبدیل به هزینهٔ واقعی
"""
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models.audit_mixin import (
    AllObjectsManager, AuditableModel, SoftDeleteManager,
)
from core.models.base_model import BaseModel


class MeasurementSheet(BaseModel, AuditableModel):
    """صورتجلسهٔ اندازه‌گیری کارکرد (مبنای صورت‌وضعیت و گواهی پرداخت)."""
    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        SUBMITTED = 'submitted', _('ارسال‌شده')
        CHECKED = 'checked', _('تأیید مشاور')
        APPROVED = 'approved', _('تأیید کارفرما')
        REJECTED = 'rejected', _('رد شده')
        CERTIFIED = 'certified', _('گواهی‌شده')
        CANCELLED = 'cancelled', _('لغو شده')

    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='measurement_sheets',
        verbose_name=_('پروژه'),
    )
    contract = models.ForeignKey(
        'contracts.Contract', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='measurement_sheets', verbose_name=_('قرارداد'),
    )
    number = models.CharField(max_length=50, verbose_name=_('شمارهٔ صورتجلسه'))
    title = models.CharField(max_length=250, blank=True, verbose_name=_('عنوان'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))
    date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ'))
    period_from = models.DateField(null=True, blank=True, verbose_name=_('از تاریخ'))
    period_to = models.DateField(null=True, blank=True, verbose_name=_('تا تاریخ'))

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'),
    )
    prepared_by_name = models.CharField(max_length=200, blank=True, verbose_name=_('تهیه‌کننده'))
    checked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='checked_measurement_sheets', verbose_name=_('تأییدکنندهٔ مشاور'),
    )
    checked_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان تأیید مشاور'))
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_measurement_sheets', verbose_name=_('تأییدکنندهٔ کارفرما'),
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان تأیید کارفرما'))
    decision_note = models.TextField(blank=True, verbose_name=_('یادداشت تصمیم'))

    gross_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('جمع کارکرد'))
    retention_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name=_('درصد حسن انجام کار'))
    retention_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('کسور حسن انجام کار'))
    insurance_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('بیمه'))
    tax_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('مالیات'))
    other_deductions = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('سایر کسورات'))
    net_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('مبلغ قابل پرداخت'))

    statement = models.ForeignKey(
        'contracts.Statement', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='measurement_sheets', verbose_name=_('صورت‌وضعیت ایجادشده'),
    )

    class Meta:
        verbose_name = _('صورتجلسهٔ اندازه‌گیری')
        verbose_name_plural = _('صورتجلسات اندازه‌گیری')
        unique_together = [('project', 'number')]
        ordering = ['-date', '-id']
        indexes = [models.Index(fields=['project', 'status'], name='ms_proj_status_idx')]

    def __str__(self):
        return f'{self.number} — {self.title or self.project.code}'


class MeasurementSheetLine(BaseModel):
    """خط اندازه‌گیری: مقدار دوره، مقدار تجمعی و مبلغ."""
    sheet = models.ForeignKey(
        MeasurementSheet, on_delete=models.CASCADE, related_name='lines', verbose_name=_('صورتجلسه'),
    )
    line_no = models.PositiveIntegerField(default=0, verbose_name=_('ردیف'))
    contract_item = models.ForeignKey(
        'projects.ContractItem', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='measurement_lines', verbose_name=_('ردیف قرارداد'),
    )
    wbs = models.ForeignKey(
        'projects.WBSNode', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='measurement_lines', verbose_name=_('گره WBS'),
    )
    description = models.CharField(max_length=250, blank=True, verbose_name=_('شرح'))
    unit = models.CharField(max_length=30, blank=True, verbose_name=_('واحد'))
    unit_price = models.DecimalField(max_digits=18, decimal_places=4, default=0, verbose_name=_('نرخ واحد'))
    previous_quantity = models.DecimalField(max_digits=18, decimal_places=4, default=0, verbose_name=_('مقدار قبلی'))
    current_quantity = models.DecimalField(max_digits=18, decimal_places=4, default=0, verbose_name=_('مقدار این دوره'))
    cumulative_quantity = models.DecimalField(max_digits=18, decimal_places=4, default=0, verbose_name=_('مقدار تجمعی'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('مبلغ'))

    class Meta:
        verbose_name = _('خط صورتجلسهٔ اندازه‌گیری')
        verbose_name_plural = _('خطوط صورتجلسات اندازه‌گیری')
        ordering = ['sheet', 'line_no', 'id']

    def __str__(self):
        return f'{self.sheet.number} :: {self.description or self.id}'


class PaymentCertificate(BaseModel, AuditableModel):
    """گواهی پرداخت — خروجی تأییدشدهٔ صورتجلسه و مبنای پرداخت به پیمانکار."""
    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        ISSUED = 'issued', _('صادرشده')
        PAID = 'paid', _('پرداخت‌شده')
        CANCELLED = 'cancelled', _('لغو شده')

    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='payment_certificates',
        verbose_name=_('پروژه'),
    )
    contract = models.ForeignKey(
        'contracts.Contract', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payment_certificates', verbose_name=_('قرارداد'),
    )
    sheet = models.ForeignKey(
        MeasurementSheet, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='certificates', verbose_name=_('صورتجلسه'),
    )
    statement = models.ForeignKey(
        'contracts.Statement', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payment_certificates', verbose_name=_('صورت‌وضعیت'),
    )
    invoice = models.ForeignKey(
        'contracts.Invoice', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payment_certificates', verbose_name=_('فاکتور'),
    )
    payable_item = models.ForeignKey(
        'treasury.PayableItem', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payment_certificates', verbose_name=_('قلم پرداختنی خزانه'),
    )
    contract_payment = models.ForeignKey(
        'contracts.Payment', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payment_certificates', verbose_name=_('پرداخت ثبت‌شده'),
    )
    number = models.CharField(max_length=50, verbose_name=_('شمارهٔ گواهی'))
    date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ صدور'))
    due_date = models.DateField(null=True, blank=True, verbose_name=_('سررسید'))
    gross = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('کارکرد'))
    deductions = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('کسورات'))
    net_payable = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('قابل پرداخت'))
    paid_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('پرداخت‌شده'))
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'),
    )
    note = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('گواهی پرداخت')
        verbose_name_plural = _('گواهی‌های پرداخت')
        unique_together = [('project', 'number')]
        ordering = ['-date', '-id']

    def __str__(self):
        return f'{self.number} — {self.net_payable}'


class CostAllocation(BaseModel, AuditableModel):
    """تخصیص هزینهٔ منابع (حقوق، تجهیزات، مواد) روی WBS/فعالیت و تبدیل به هزینهٔ واقعی."""
    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Kind(models.TextChoices):
        LABOR = 'labor', _('حقوق و دستمزد')
        EQUIPMENT = 'equipment', _('ماشین‌آلات و تجهیزات')
        MATERIAL = 'material', _('مواد و مصالح')
        OTHER = 'other', _('سایر')

    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='cost_allocations',
        verbose_name=_('پروژه'),
    )
    wbs = models.ForeignKey(
        'projects.WBSNode', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cost_allocations', verbose_name=_('گره WBS'),
    )
    activity = models.ForeignKey(
        'Activity', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cost_allocations', verbose_name=_('فعالیت'),
    )
    cost_source = models.ForeignKey(
        'projects.CostSource', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cost_allocations', verbose_name=_('منشأ هزینه'),
    )
    kind = models.CharField(
        max_length=20, choices=Kind.choices, default=Kind.LABOR, verbose_name=_('نوع'),
    )
    employee = models.ForeignKey(
        'employees.Employee', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cost_allocations', verbose_name=_('کارمند'),
    )
    resource = models.ForeignKey(
        'projects.Resource', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cost_allocations', verbose_name=_('منبع (ماشین/تجهیز)'),
    )
    title = models.CharField(max_length=250, verbose_name=_('عنوان'))
    date = models.DateField(verbose_name=_('تاریخ'))
    quantity = models.DecimalField(
        max_digits=18, decimal_places=4, default=0, verbose_name=_('مقدار (ساعت/روز)'),
    )
    unit = models.CharField(max_length=30, blank=True, verbose_name=_('واحد'))
    rate = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('نرخ واحد'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('مبلغ'))
    note = models.CharField(max_length=250, blank=True, verbose_name=_('توضیحات'))
    cost_transaction = models.ForeignKey(
        'projects.CostTransaction', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cost_allocations', verbose_name=_('تراکنش هزینهٔ ایجادشده'),
    )

    class Meta:
        verbose_name = _('تخصیص هزینهٔ منابع')
        verbose_name_plural = _('تخصیص هزینه‌های منابع')
        ordering = ['-date', '-id']
        indexes = [models.Index(fields=['project', 'kind'], name='alloc_proj_kind_idx')]

    def __str__(self):
        return f'{self.get_kind_display()} — {self.title}'


