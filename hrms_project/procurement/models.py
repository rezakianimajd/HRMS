"""خرید و تدارکات (Procure-to-Pay) — مدل‌های دامنه.

زنجیرهٔ کامل:
    تأمین‌کننده / کاتالوگ کالا → درخواست خرید (PR) → سفارش خرید (PO)
    → قبض انبار (GRN) → صورتحساب خرید → پرداخت
هر مرحله گردشکار تأیید و امکان اتصال به حسابداری را دارد.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


class SupplierCategory(BaseModel):
    """دستهٔ تأمین‌کننده (مواد اولیه، خدمات، تجهیزات و ...)."""
    code = models.CharField(max_length=30, verbose_name=_('کد'))
    name = models.CharField(max_length=150, verbose_name=_('عنوان'))

    class Meta:
        verbose_name = _('دستهٔ تأمین‌کننده')
        verbose_name_plural = _('دسته‌های تأمین‌کننده')
        unique_together = [('company', 'code')]
        ordering = ['name']

    def __str__(self):
        return self.name


class Supplier(BaseModel):
    """تأمین‌کننده / فروشنده با اطلاعات قانونی و ارزیابی."""
    class Status(models.TextChoices):
        ACTIVE = 'active', _('فعال')
        INACTIVE = 'inactive', _('غیرفعال')
        BLACKLISTED = 'blacklisted', _('لیست سیاه')

    code = models.CharField(max_length=30, verbose_name=_('کد تأمین‌کننده'))
    name = models.CharField(max_length=250, verbose_name=_('نام / عنوان'))
    category = models.ForeignKey(SupplierCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='suppliers', verbose_name=_('دسته'))
    national_id = models.CharField(max_length=20, blank=True, verbose_name=_('شناسه ملی / کد ثبت'))
    economic_code = models.CharField(max_length=20, blank=True, verbose_name=_('کد اقتصادی'))
    registration_number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره ثبت'))
    postal_code = models.CharField(max_length=10, blank=True, verbose_name=_('کد پستی'))
    tax_id = models.CharField(max_length=30, blank=True, verbose_name=_('شناسه مالیاتی'), help_text=_('برای معاملات فصلی / ارزش افزوده'))
    phone = models.CharField(max_length=20, blank=True, verbose_name=_('تلفن'))
    mobile = models.CharField(max_length=20, blank=True, verbose_name=_('موبایل'))
    email = models.EmailField(blank=True, verbose_name=_('ایمیل'))
    address = models.TextField(blank=True, verbose_name=_('آدرس'))
    contact_person = models.CharField(max_length=200, blank=True, verbose_name=_('شخص رابط'))
    bank_name = models.CharField(max_length=100, blank=True, verbose_name=_('بانک'))
    account_number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره حساب'))
    sheba_number = models.CharField(max_length=30, blank=True, verbose_name=_('شماره شبا'))
    credit_limit = models.DecimalField(max_digits=18, decimal_places=0, null=True, blank=True, verbose_name=_('سقف اعتبار (ریال)'))
    payment_terms = models.CharField(max_length=200, blank=True, verbose_name=_('شرایط پرداخت'))
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=0, verbose_name=_('امتیاز (۰-۵)'))
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.ACTIVE, verbose_name=_('وضعیت'))
    payable_account = models.ForeignKey('accounting.Account', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('حساب پرداختنی (بستانکار)'))
    auxiliary = models.ForeignKey('accounting.AuxiliaryAccount', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('تفصیلی مرتبط'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('تأمین‌کننده')
        verbose_name_plural = _('تأمین‌کنندگان')
        unique_together = [('company', 'code')]
        ordering = ['name']
        indexes = [models.Index(fields=['company', 'status'])]

    def __str__(self):
        return f'{self.code} - {self.name}'


class ItemCategory(BaseModel):
    code = models.CharField(max_length=30, verbose_name=_('کد'))
    name = models.CharField(max_length=150, verbose_name=_('عنوان'))
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children', verbose_name=_('دستهٔ بالادستی'))

    class Meta:
        verbose_name = _('دستهٔ کالا')
        verbose_name_plural = _('دسته‌های کالا')
        unique_together = [('company', 'code')]
        ordering = ['code']

    def __str__(self):
        return self.name


class UnitOfMeasure(BaseModel):
    code = models.CharField(max_length=20, verbose_name=_('کد'))
    name = models.CharField(max_length=60, verbose_name=_('عنوان'))

    class Meta:
        verbose_name = _('واحد سنجش')
        verbose_name_plural = _('واحدهای سنجش')
        unique_together = [('company', 'code')]
        ordering = ['code']

    def __str__(self):
        return self.name


class Item(BaseModel):
    class Nature(models.TextChoices):
        GOOD = 'good', _('کالا')
        SERVICE = 'service', _('خدمت')

    code = models.CharField(max_length=50, verbose_name=_('کد کالا'))
    name = models.CharField(max_length=250, verbose_name=_('عنوان'))
    category = models.ForeignKey(ItemCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='items', verbose_name=_('دسته'))
    unit = models.ForeignKey(UnitOfMeasure, on_delete=models.PROTECT, null=True, blank=True, related_name='items', verbose_name=_('واحد'))
    nature = models.CharField(max_length=10, choices=Nature.choices, default=Nature.GOOD, verbose_name=_('نوع'))
    min_stock = models.DecimalField(max_digits=18, decimal_places=3, default=0, verbose_name=_('حداقل موجودی'))
    max_stock = models.DecimalField(max_digits=18, decimal_places=3, default=0, verbose_name=_('حداکثر موجودی'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))
    expense_account = models.ForeignKey('accounting.Account', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('حساب هزینه/دارایی'))
    barcode = models.CharField(max_length=100, blank=True, verbose_name=_('بارکد'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))
    # مشخصات فنی و سیاست سفارش (مبنای استعلام و مقایسهٔ پیشنهادها)
    specification = models.TextField(blank=True, verbose_name=_('مشخصات فنی'))
    standard_unit_price = models.DecimalField(
        max_digits=18, decimal_places=0, default=0, verbose_name=_('قیمت استاندارد واحد'),
    )
    min_order_quantity = models.DecimalField(
        max_digits=18, decimal_places=3, default=0, verbose_name=_('حداقل مقدار سفارش'),
    )
    manufacturer = models.CharField(max_length=150, blank=True, verbose_name=_('سازنده / برند'))
    part_number = models.CharField(max_length=100, blank=True, verbose_name=_('پارت نامبر'))

    class Meta:
        verbose_name = _('کالا / خدمت')
        verbose_name_plural = _('کالاها و خدمات')
        unique_together = [('company', 'code')]
        ordering = ['code']

    def __str__(self):
        return f'{self.code} - {self.name}'


class PurchaseRequest(BaseModel):
    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        SUBMITTED = 'submitted', _('در انتظار تأیید')
        APPROVED = 'approved', _('تأییدشده')
        REJECTED = 'rejected', _('رد شده')
        ORDERED = 'ordered', _('تبدیل به سفارش')
        CANCELLED = 'cancelled', _('لغو شده')

    number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره درخواست'))
    requester = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', db_constraint=False, verbose_name=_('درخواست‌دهنده'))
    department = models.CharField(max_length=200, blank=True, verbose_name=_('واحد درخواست'))
    project = models.ForeignKey(
        'projects.Project', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='purchase_requests', verbose_name=_('پروژه'),
    )
    date = models.DateField(verbose_name=_('تاریخ درخواست'))
    required_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ نیاز'))
    description = models.TextField(blank=True, verbose_name=_('شرح'))
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    history = models.JSONField(default=list, blank=True, verbose_name=_('تاریخچهٔ چرخه'))
    submitted_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', db_constraint=False, verbose_name=_('ارسال‌کننده'))
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان ارسال'))

    class Meta:
        verbose_name = _('درخواست خرید')
        verbose_name_plural = _('درخواست‌های خرید')
        ordering = ['-date', '-created_at']
        indexes = [models.Index(fields=['company', 'status'])]

    def __str__(self):
        return f'{self.number or self.pk} - {self.description[:40]}'

    @property
    def total(self):
        return sum(float(l.amount or 0) for l in self.lines.all())


class PurchaseRequestLine(BaseModel):
    request = models.ForeignKey(PurchaseRequest, on_delete=models.CASCADE, related_name='lines', verbose_name=_('درخواست'))
    line_no = models.PositiveIntegerField(default=0, verbose_name=_('ردیف'))
    item = models.ForeignKey(Item, on_delete=models.PROTECT, related_name='pr_lines', verbose_name=_('کالا'))
    quantity = models.DecimalField(max_digits=18, decimal_places=3, verbose_name=_('تعداد'))
    unit = models.ForeignKey(UnitOfMeasure, on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('واحد'))
    estimated_unit_price = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('برآورد قیمت واحد'))
    amount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ کل'))
    description = models.TextField(blank=True, verbose_name=_('شرح'))

    class Meta:
        verbose_name = _('سطر درخواست خرید')
        verbose_name_plural = _('سطرهای درخواست خرید')
        ordering = ['line_no', 'id']

    def __str__(self):
        return f'{self.item.code} - {self.quantity}'


class PurchaseOrder(BaseModel):
    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        SUBMITTED = 'submitted', _('در انتظار تأیید')
        APPROVED = 'approved', _('تأییدشده')
        SENT = 'sent', _('ارسال به تأمین‌کننده')
        PARTIAL = 'partial', _('تحویل جزئی')
        RECEIVED = 'received', _('تحویل کامل')
        INVOICED = 'invoiced', _('صورتحساب شده')
        CLOSED = 'closed', _('بسته')
        CANCELLED = 'cancelled', _('لغو')

    number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره سفارش'))
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='purchase_orders', verbose_name=_('تأمین‌کننده'))
    source_request = models.ForeignKey(PurchaseRequest, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchase_orders', verbose_name=_('درخواست مبدأ'))
    # فاز ۲ — اتصال سفارش خرید به پروژه (مبنای تعهد و هزینهٔ واقعی پروژه)
    project = models.ForeignKey(
        'projects.Project', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='purchase_orders', verbose_name=_('پروژه'),
    )
    wbs = models.ForeignKey(
        'projects.WBSNode', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='purchase_orders', verbose_name=_('گره WBS'),
    )
    cbs = models.ForeignKey(
        'projects.CBSNode', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='purchase_orders', verbose_name=_('گره CBS'),
    )
    date = models.DateField(verbose_name=_('تاریخ سفارش'))
    expected_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ تحویل'))
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    subtotal = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('جمع خالص'))
    discount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('تخفیف'))
    vat_amount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('ارزش افزوده'))
    total = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ نهایی'))
    terms = models.TextField(blank=True, verbose_name=_('شرایط و توضیحات'))
    delivery_address = models.TextField(blank=True, verbose_name=_('آدرس تحویل'))
    payment_terms = models.CharField(max_length=200, blank=True, verbose_name=_('شرایط پرداخت'))
    history = models.JSONField(default=list, blank=True, verbose_name=_('تاریخچهٔ چرخه'))
    source_transaction = models.OneToOneField('accounting.SourceTransaction', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('تراکنش منبع حسابداری'))
    # منبع انتخاب تأمین‌کننده و ارز سفارش
    quotation = models.ForeignKey(
        'procurement.Quotation', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='purchase_orders', verbose_name=_('پیشنهاد قیمت مبدأ'),
    )
    currency = models.ForeignKey(
        'settings_app.Currency', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='purchase_orders', verbose_name=_('واحد ارز'),
    )
    exchange_rate = models.DecimalField(
        max_digits=18, decimal_places=6, null=True, blank=True, verbose_name=_('نرخ ارز'),
    )
    committed_cost = models.ForeignKey(
        'projects.CommittedCost', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='purchase_orders', verbose_name=_('تعهد ایجادشده در پروژه'),
    )

    class Meta:
        verbose_name = _('سفارش خرید')
        verbose_name_plural = _('سفارش‌های خرید')
        ordering = ['-date', '-created_at']
        indexes = [models.Index(fields=['company', 'supplier']), models.Index(fields=['company', 'status'])]

    def __str__(self):
        return f'{self.number or self.pk} - {self.supplier.name}'


class PurchaseOrderLine(BaseModel):
    order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='lines', verbose_name=_('سفارش'))
    line_no = models.PositiveIntegerField(default=0, verbose_name=_('ردیف'))
    item = models.ForeignKey(Item, on_delete=models.PROTECT, related_name='po_lines', verbose_name=_('کالا'))
    wbs = models.ForeignKey(
        'projects.WBSNode', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='purchase_order_lines', verbose_name=_('گره WBS'),
    )
    cbs = models.ForeignKey(
        'projects.CBSNode', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='purchase_order_lines', verbose_name=_('گره CBS'),
    )
    quantity = models.DecimalField(max_digits=18, decimal_places=3, verbose_name=_('تعداد'))
    received_quantity = models.DecimalField(max_digits=18, decimal_places=3, default=0, verbose_name=_('تعداد تحویل‌شده'))
    unit = models.ForeignKey(UnitOfMeasure, on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('واحد'))
    unit_price = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('قیمت واحد'))
    discount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('تخفیف'))
    amount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ کل'))
    description = models.TextField(blank=True, verbose_name=_('شرح'))

    class Meta:
        verbose_name = _('سطر سفارش خرید')
        verbose_name_plural = _('سطرهای سفارش خرید')
        ordering = ['line_no', 'id']

    def __str__(self):
        return f'{self.item.code} - {self.quantity}'


class GoodsReceiptNote(BaseModel):
    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        POSTED = 'posted', _('ثبت شده')
        CANCELLED = 'cancelled', _('لغو')

    number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره قبض انبار'))
    order = models.ForeignKey(PurchaseOrder, on_delete=models.PROTECT, related_name='receipts', verbose_name=_('سفارش خرید'))
    date = models.DateField(verbose_name=_('تاریخ رسید'))
    received_by = models.CharField(max_length=200, blank=True, verbose_name=_('تحویل‌گیرنده'))
    cost_transaction = models.ForeignKey(
        'projects.CostTransaction', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='goods_receipts', verbose_name=_('تراکنش هزینهٔ ایجادشده'),
    )
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    note = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('قبض انبار (رسید کالا)')
        verbose_name_plural = _('قبض‌های انبار')
        ordering = ['-date', '-created_at']
        indexes = [models.Index(fields=['company', 'order'])]

    def __str__(self):
        return f'{self.number or self.pk} - {self.order.number}'


class GoodsReceiptNoteLine(BaseModel):
    receipt = models.ForeignKey(GoodsReceiptNote, on_delete=models.CASCADE, related_name='lines', verbose_name=_('قبض انبار'))
    line_no = models.PositiveIntegerField(default=0, verbose_name=_('ردیف'))
    item = models.ForeignKey(Item, on_delete=models.PROTECT, related_name='grn_lines', verbose_name=_('کالا'))
    quantity = models.DecimalField(max_digits=18, decimal_places=3, verbose_name=_('تعداد دریافتی'))
    unit = models.ForeignKey(UnitOfMeasure, on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('واحد'))

    class Meta:
        verbose_name = _('سطر قبض انبار')
        verbose_name_plural = _('سطرهای قبض انبار')
        ordering = ['line_no', 'id']

    def __str__(self):
        return f'{self.item.code} - {self.quantity}'


class PurchaseInvoice(BaseModel):
    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        SUBMITTED = 'submitted', _('در انتظار تأیید')
        APPROVED = 'approved', _('تأییدشده')
        PAID = 'paid', _('پرداخت‌شده')
        CANCELLED = 'cancelled', _('لغو')

    number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره صورتحساب'))
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='invoices', verbose_name=_('تأمین‌کننده'))
    order = models.ForeignKey(PurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices', verbose_name=_('سفارش مرتبط'))
    date = models.DateField(verbose_name=_('تاریخ صدور'))
    due_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ سررسید'))
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    invoice_number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره فاکتور تأمین‌کننده'))
    subtotal = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('جمع خالص'))
    discount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('تخفیف'))
    vat_amount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('ارزش افزوده'))
    total = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ نهایی'))
    paid_amount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ پرداخت‌شده'))
    description = models.TextField(blank=True, verbose_name=_('شرح'))
    history = models.JSONField(default=list, blank=True, verbose_name=_('تاریخچهٔ چرخه'))
    source_transaction = models.OneToOneField('accounting.SourceTransaction', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('تراکنش منبع حسابداری'))
    # ارز، مالیات و وضعیت پرداخت فاکتور
    currency = models.ForeignKey(
        'settings_app.Currency', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='purchase_invoices', verbose_name=_('واحد ارز'),
    )
    exchange_rate = models.DecimalField(
        max_digits=18, decimal_places=6, null=True, blank=True, verbose_name=_('نرخ ارز'),
    )
    vat_rate = models.DecimalField(
        max_digits=6, decimal_places=2, default=0, verbose_name=_('نرخ ارزش افزوده (٪)'),
    )
    payment_status = models.CharField(
        max_length=15, default='unpaid', verbose_name=_('وضعیت پرداخت'),
        help_text=_('unpaid / partial / paid — با تخصیص پرداخت‌ها به‌روزرسانی می‌شود'),
    )

    class Meta:
        verbose_name = _('صورتحساب خرید')
        verbose_name_plural = _('صورتحساب‌های خرید')
        ordering = ['-date', '-created_at']
        indexes = [models.Index(fields=['company', 'supplier']), models.Index(fields=['company', 'status'])]

    def __str__(self):
        return f'{self.number or self.pk} - {self.supplier.name}'

    @property
    def balance(self):
        return float(self.total) - float(self.paid_amount)


class PurchaseInvoiceLine(BaseModel):
    invoice = models.ForeignKey(PurchaseInvoice, on_delete=models.CASCADE, related_name='lines', verbose_name=_('صورتحساب'))
    line_no = models.PositiveIntegerField(default=0, verbose_name=_('ردیف'))
    item = models.ForeignKey(Item, on_delete=models.PROTECT, null=True, blank=True, related_name='invoice_lines', verbose_name=_('کالا'))
    description = models.TextField(blank=True, verbose_name=_('شرح'))
    quantity = models.DecimalField(max_digits=18, decimal_places=3, default=1, verbose_name=_('تعداد'))
    unit = models.ForeignKey(UnitOfMeasure, on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('واحد'))
    unit_price = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('قیمت واحد'))
    amount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ'))
    account = models.ForeignKey('accounting.Account', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('کد معین'))
    auxiliary_1 = models.ForeignKey('accounting.AuxiliaryAccount', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('تفصیل یک'))
    auxiliary_2 = models.ForeignKey('accounting.AuxiliaryAccount', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('تفصیل دو'))
    auxiliary_3 = models.ForeignKey('accounting.AuxiliaryAccount', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('تفصیل سه'))

    class Meta:
        verbose_name = _('سطر صورتحساب خرید')
        verbose_name_plural = _('سطرهای صورتحساب خرید')
        ordering = ['line_no', 'id']

    def __str__(self):
        return f'{self.invoice_id} / {self.amount}'


class PurchasePayment(BaseModel):
    class Method(models.TextChoices):
        CASH = 'cash', _('نقد')
        TRANSFER = 'transfer', _('انتقال بانکی')
        CHEQUE = 'cheque', _('چک')
        OTHER = 'other', _('سایر')

    invoice = models.ForeignKey(PurchaseInvoice, on_delete=models.PROTECT, related_name='payments', verbose_name=_('صورتحساب'))
    date = models.DateField(verbose_name=_('تاریخ پرداخت'))
    amount = models.DecimalField(max_digits=18, decimal_places=0, verbose_name=_('مبلغ پرداخت'))
    method = models.CharField(max_length=15, choices=Method.choices, default=Method.TRANSFER, verbose_name=_('روش پرداخت'))
    reference = models.CharField(max_length=100, blank=True, verbose_name=_('شماره مرجع / چک'))
    bank = models.CharField(max_length=100, blank=True, verbose_name=_('بانک'))
    description = models.TextField(blank=True, verbose_name=_('شرح'))

    class Meta:
        verbose_name = _('پرداخت خرید')
        verbose_name_plural = _('پرداخت‌های خرید')
        ordering = ['-date', '-created_at']
        indexes = [models.Index(fields=['company', 'invoice'])]

    def __str__(self):
        return f'{self.invoice_id} - {self.amount} ({self.date})'


class ProcurementApprovalPolicy(BaseModel):
    name = models.CharField(max_length=100, verbose_name=_('عنوان سیاست'))
    single_level_limit = models.DecimalField(max_digits=18, decimal_places=0, default=50000000, verbose_name=_('سقف تأیید تک‌مرحله (ریال)'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('سیاست تأیید خرید')
        verbose_name_plural = _('سیاست‌های تأیید خرید')

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# مرحلهٔ استعلام (RFQ) و پیشنهاد قیمت (Quotation)
# ---------------------------------------------------------------------------
class Inquiry(BaseModel):
    """استعلام بها — دعوت تأمین‌کنندگان به ارائهٔ پیشنهاد برای یک نیاز."""

    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        SENT = 'sent', _('ارسال‌شده به تأمین‌کنندگان')
        OPEN = 'open', _('باز — در حال دریافت پیشنهاد')
        EVALUATING = 'evaluating', _('در حال ارزیابی')
        AWARDED = 'awarded', _('برنده انتخاب شد')
        CANCELLED = 'cancelled', _('لغو‌شده')

    class EvaluationModel(models.TextChoices):
        LOWEST_PRICE = 'lowest_price', _('کم‌ترین قیمت')
        TECHNICAL_FIRST = 'technical_first', _('ارزیابی فنی و سپس قیمت')
        SCORE = 'score', _('امتیاز ترکیبی')

    number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره استعلام'))
    subject = models.CharField(max_length=250, verbose_name=_('موضوع استعلام'))
    source_request = models.ForeignKey(
        PurchaseRequest, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='inquiries', verbose_name=_('درخواست خرید مبدأ'),
    )
    project = models.ForeignKey(
        'projects.Project', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='inquiries', verbose_name=_('پروژه'),
    )
    department = models.CharField(max_length=200, blank=True, verbose_name=_('واحد درخواست‌کننده'))
    requested_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', db_constraint=False, verbose_name=_('درخواست‌دهنده'),
    )
    date = models.DateField(verbose_name=_('تاریخ استعلام'))
    deadline = models.DateField(null=True, blank=True, verbose_name=_('مهلت دریافت پیشنهاد'))
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'),
    )
    evaluation_model = models.CharField(
        max_length=20, choices=EvaluationModel.choices,
        default=EvaluationModel.LOWEST_PRICE, verbose_name=_('روش ارزیابی'),
    )
    currency = models.ForeignKey(
        'settings_app.Currency', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='inquiries', verbose_name=_('واحد ارز'),
    )
    awarded_quotation = models.ForeignKey(
        'procurement.Quotation', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('پیشنهاد برنده'),
    )
    description = models.TextField(blank=True, verbose_name=_('شرح / مشخصات کلی'))
    terms = models.TextField(blank=True, verbose_name=_('شرایط استعلام'))
    history = models.JSONField(default=list, blank=True, verbose_name=_('تاریخچهٔ چرخه'))

    class Meta:
        verbose_name = _('استعلام بها')
        verbose_name_plural = _('استعلام‌های بها')
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['company', 'deadline']),
        ]

    def __str__(self):
        return f'{self.number or self.pk} - {self.subject[:40]}'


class InquiryLine(BaseModel):
    """سطر استعلام: کالا/خدمت با مشخصات فنی و مقدار موردنیاز."""

    inquiry = models.ForeignKey(
        Inquiry, on_delete=models.CASCADE, related_name='lines', verbose_name=_('استعلام'),
    )
    line_no = models.PositiveIntegerField(default=0, verbose_name=_('ردیف'))
    item = models.ForeignKey(
        Item, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='inquiry_lines', verbose_name=_('کالا / خدمت'),
    )
    description = models.TextField(blank=True, verbose_name=_('شرح'))
    specification = models.TextField(blank=True, verbose_name=_('مشخصات فنی'))
    quantity = models.DecimalField(max_digits=18, decimal_places=3, default=1, verbose_name=_('مقدار'))
    unit = models.ForeignKey(
        UnitOfMeasure, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('واحد'),
    )
    target_unit_price = models.DecimalField(
        max_digits=18, decimal_places=0, default=0, verbose_name=_('قیمت هدف (برآورد)'),
    )
    wbs = models.ForeignKey(
        'projects.WBSNode', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('گره WBS'),
    )
    cbs = models.ForeignKey(
        'projects.CBSNode', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('گره CBS'),
    )
    note = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('سطر استعلام')
        verbose_name_plural = _('سطرهای استعلام')
        ordering = ['line_no', 'id']

    def __str__(self):
        return f'{self.inquiry_id} / {self.line_no}'

    @property
    def estimated_amount(self):
        return float(self.quantity or 0) * float(self.target_unit_price or 0)


class InquirySupplier(BaseModel):
    """تأمین‌کنندهٔ دعوت‌شده به یک استعلام."""

    class Status(models.TextChoices):
        INVITED = 'invited', _('دعوت‌شده')
        SENT = 'sent', _('ارسال‌شده')
        RESPONDED = 'responded', _('پیشنهاد داده')
        DECLINED = 'declined', _('عذرخواهی')
        EXCLUDED = 'excluded', _('کنار گذاشته‌شده')

    inquiry = models.ForeignKey(
        Inquiry, on_delete=models.CASCADE, related_name='suppliers', verbose_name=_('استعلام'),
    )
    supplier = models.ForeignKey(
        Supplier, on_delete=models.CASCADE, related_name='inquiry_invitations',
        verbose_name=_('تأمین‌کننده'),
    )
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.INVITED, verbose_name=_('وضعیت'),
    )
    sent_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان ارسال'))
    note = models.CharField(max_length=250, blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('تأمین‌کنندهٔ استعلام')
        verbose_name_plural = _('تأمین‌کنندگان استعلام')
        unique_together = [('inquiry', 'supplier')]
        ordering = ['id']

    def __str__(self):
        return f'{self.inquiry_id} - {self.supplier_id}'


class Quotation(BaseModel):
    """پیشنهاد قیمت یک تأمین‌کننده در پاسخ به استعلام."""

    class Status(models.TextChoices):
        RECEIVED = 'received', _('دریافت‌شده')
        EVALUATED = 'evaluated', _('ارزیابی‌شده')
        WINNER = 'winner', _('برنده')
        REJECTED = 'rejected', _('رد‌شده')
        EXPIRED = 'expired', _('منقضی')
        CANCELLED = 'cancelled', _('لغو‌شده')

    inquiry = models.ForeignKey(
        Inquiry, on_delete=models.CASCADE, related_name='quotations', verbose_name=_('استعلام'),
    )
    supplier = models.ForeignKey(
        Supplier, on_delete=models.PROTECT, related_name='quotations', verbose_name=_('تأمین‌کننده'),
    )
    number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره پیشنهاد'))
    date = models.DateField(verbose_name=_('تاریخ پیشنهاد'))
    validity_date = models.DateField(
        null=True, blank=True, verbose_name=_('اعتبار پیشنهاد تا'),
    )
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.RECEIVED, verbose_name=_('وضعیت'),
    )
    currency = models.ForeignKey(
        'settings_app.Currency', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='quotations', verbose_name=_('واحد ارز'),
    )
    exchange_rate = models.DecimalField(
        max_digits=18, decimal_places=6, null=True, blank=True, verbose_name=_('نرخ ارز'),
    )
    subtotal = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('جمع خالص'))
    discount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('تخفیف'))
    vat_rate = models.DecimalField(max_digits=6, decimal_places=2, default=0, verbose_name=_('نرخ ارزش افزوده (٪)'))
    vat_amount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('ارزش افزوده'))
    total = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ نهایی'))
    delivery_days = models.PositiveIntegerField(default=0, verbose_name=_('زمان تحویل (روز)'))
    payment_terms = models.CharField(max_length=200, blank=True, verbose_name=_('شرایط پرداخت'))
    warranty_months = models.PositiveIntegerField(default=0, verbose_name=_('دورهٔ تضمین (ماه)'))
    technical_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=0, verbose_name=_('امتیاز فنی (۰-۱۰۰)'),
    )
    is_winner = models.BooleanField(default=False, verbose_name=_('برندهٔ استعلام'))
    awarded_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان انتخاب'))
    note = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('پیشنهاد قیمت')
        verbose_name_plural = _('پیشنهادهای قیمت')
        ordering = ['total', 'delivery_days', 'id']
        indexes = [
            models.Index(fields=['company', 'inquiry']),
            models.Index(fields=['company', 'status']),
        ]

    def __str__(self):
        return f'{self.number or self.pk} - {self.supplier.name}'

    @property
    def supplier_name(self):
        return getattr(self.supplier, 'name', '') or ''



class QuotationLine(BaseModel):
    """سطر پیشنهاد قیمت (به‌ازای هر سطر استعلام)."""

    quotation = models.ForeignKey(
        Quotation, on_delete=models.CASCADE, related_name='lines', verbose_name=_('پیشنهاد'),
    )
    inquiry_line = models.ForeignKey(
        InquiryLine, on_delete=models.CASCADE, related_name='quotation_lines',
        verbose_name=_('سطر استعلام'),
    )
    line_no = models.PositiveIntegerField(default=0, verbose_name=_('ردیف'))
    item = models.ForeignKey(
        Item, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('کالا / خدمت'),
    )
    description = models.TextField(blank=True, verbose_name=_('شرح'))
    quantity = models.DecimalField(max_digits=18, decimal_places=3, default=1, verbose_name=_('مقدار'))
    unit = models.ForeignKey(
        UnitOfMeasure, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('واحد'),
    )
    unit_price = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('قیمت واحد'))
    discount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('تخفیف'))
    amount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ'))
    lead_time_days = models.PositiveIntegerField(default=0, verbose_name=_('زمان تحویل (روز)'))
    compliance = models.CharField(
        max_length=20, blank=True, verbose_name=_('انطباق فنی'),
        help_text=_('مثلاً: مطابق مشخصات / با انحراف / نامنطبق'),
    )
    note = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('سطر پیشنهاد قیمت')
        verbose_name_plural = _('سطرهای پیشنهاد قیمت')
        ordering = ['line_no', 'id']

    def __str__(self):
        return f'{self.quotation_id} / {self.line_no}'

    def save(self, *args, **kwargs):
        from procurement.pricing import line_amount

        self.amount = line_amount(self.quantity, self.unit_price, self.discount)
        super().save(*args, **kwargs)



class ProformaInvoice(BaseModel):
    """پیش‌فاکتور تأمین‌کننده (قابل تبدیل به صورتحساب خرید)."""

    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        SENT = 'sent', _('ارسال‌شده')
        ACCEPTED = 'accepted', _('پذیرفته‌شده')
        REJECTED = 'rejected', _('رد‌شده')
        CONVERTED = 'converted', _('تبدیل‌شده به فاکتور')
        CANCELLED = 'cancelled', _('لغو‌شده')

    number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره پیش‌فاکتور'))
    supplier = models.ForeignKey(
        Supplier, on_delete=models.PROTECT, related_name='proforma_invoices',
        verbose_name=_('تأمین‌کننده'),
    )
    order = models.ForeignKey(
        PurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='proformas', verbose_name=_('سفارش خرید'),
    )
    quotation = models.ForeignKey(
        Quotation, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='proformas', verbose_name=_('پیشنهاد قیمت مبدأ'),
    )
    proforma_number = models.CharField(
        max_length=50, blank=True, verbose_name=_('شماره پیش‌فاکتور تأمین‌کننده'),
    )
    date = models.DateField(verbose_name=_('تاریخ صدور'))
    valid_until = models.DateField(null=True, blank=True, verbose_name=_('اعتبار تا'))
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'),
    )
    currency = models.ForeignKey(
        'settings_app.Currency', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='proforma_invoices', verbose_name=_('واحد ارز'),
    )
    exchange_rate = models.DecimalField(
        max_digits=18, decimal_places=6, null=True, blank=True, verbose_name=_('نرخ ارز'),
    )
    subtotal = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('جمع خالص'))
    discount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('تخفیف'))
    vat_rate = models.DecimalField(max_digits=6, decimal_places=2, default=0, verbose_name=_('نرخ ارزش افزوده (٪)'))
    vat_amount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('ارزش افزوده'))
    total = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ نهایی'))
    terms = models.TextField(blank=True, verbose_name=_('شرایط'))
    description = models.TextField(blank=True, verbose_name=_('شرح'))
    converted_invoice = models.ForeignKey(
        PurchaseInvoice, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='proforma_source', verbose_name=_('فاکتور ایجادشده'),
    )
    history = models.JSONField(default=list, blank=True, verbose_name=_('تاریخچهٔ چرخه'))

    class Meta:
        verbose_name = _('پیش‌فاکتور خرید')
        verbose_name_plural = _('پیش‌فاکتورهای خرید')
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['company', 'supplier']),
        ]

    def __str__(self):
        return f'{self.number or self.pk} - {self.supplier.name}'


class ProformaInvoiceLine(BaseModel):
    """سطر پیش‌فاکتور."""

    proforma = models.ForeignKey(
        ProformaInvoice, on_delete=models.CASCADE, related_name='lines',
        verbose_name=_('پیش‌فاکتور'),
    )
    line_no = models.PositiveIntegerField(default=0, verbose_name=_('ردیف'))
    item = models.ForeignKey(
        Item, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('کالا / خدمت'),
    )
    description = models.TextField(blank=True, verbose_name=_('شرح'))
    quantity = models.DecimalField(max_digits=18, decimal_places=3, default=1, verbose_name=_('مقدار'))
    unit = models.ForeignKey(
        UnitOfMeasure, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('واحد'),
    )
    unit_price = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('قیمت واحد'))
    discount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('تخفیف'))
    amount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ'))
    note = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('سطر پیش‌فاکتور')
        verbose_name_plural = _('سطرهای پیش‌فاکتور')
        ordering = ['line_no', 'id']

    def __str__(self):
        return f'{self.proforma_id} / {self.line_no}'

    def save(self, *args, **kwargs):
        from procurement.pricing import line_amount

        self.amount = line_amount(self.quantity, self.unit_price, self.discount)
        super().save(*args, **kwargs)



class ProcurementGuarantee(BaseModel):
    """تضامین خرید: شرکت در استعلام، حسن انجام تعهدات، پیش‌پرداخت و ...

    اعتبار با همان قاعدهٔ ماژول قراردادها محاسبه می‌شود
    (`contracts.guarantee_validity`): برای چک‌محورها ۵ سال از تاریخ صدور و
    «سررسید» فقط یک هشدار عملیاتی است.
    """

    class Kind(models.TextChoices):
        BID = 'bid', _('تضمین شرکت در استعلام')
        PERFORMANCE = 'performance', _('حسن انجام تعهدات')
        ADVANCE = 'advance', _('پیش‌پرداخت')
        PAYMENT = 'payment', _('حسن پرداخت')
        WARRANTY = 'warranty', _('دورهٔ تضمین')
        OTHER = 'other', _('سایر')

    class InstrumentType(models.TextChoices):
        CHECK = 'check', _('چک')
        PROMISSORY = 'promissory', _('سفته')
        BANK_GUARANTEE = 'bank_guarantee', _('ضمانت‌نامه بانکی')
        CASH_DEPOSIT = 'cash_deposit', _('وجه نقد / سپرده')
        OTHER = 'other', _('سایر')

    class LifecycleAction(models.TextChoices):
        RETURNED = 'returned', _('استرداد')
        RELEASED = 'released', _('آزادسازی')
        EXECUTED = 'executed', _('اجرا / ضبط')
        CANCELED = 'canceled', _('ابطال')
        EXTENDED = 'extended', _('تمدید')

    number = models.CharField(max_length=100, blank=True, verbose_name=_('شماره تضمین'))
    kind = models.CharField(
        max_length=20, choices=Kind.choices, default=Kind.PERFORMANCE, verbose_name=_('نوع تضمین'),
    )
    instrument_type = models.CharField(
        max_length=20, choices=InstrumentType.choices, default=InstrumentType.CHECK,
        verbose_name=_('نوع ابزار'),
    )
    supplier = models.ForeignKey(
        Supplier, on_delete=models.PROTECT, related_name='guarantees', verbose_name=_('تأمین‌کننده'),
    )
    inquiry = models.ForeignKey(
        Inquiry, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='guarantees', verbose_name=_('استعلام'),
    )
    order = models.ForeignKey(
        PurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='guarantees', verbose_name=_('سفارش خرید'),
    )
    invoice = models.ForeignKey(
        PurchaseInvoice, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='guarantees', verbose_name=_('صورتحساب'),
    )
    proforma = models.ForeignKey(
        ProformaInvoice, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='guarantees', verbose_name=_('پیش‌فاکتور'),
    )
    amount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ (ریال)'))
    bank = models.CharField(max_length=100, blank=True, verbose_name=_('بانک / مرجع صدور'))
    issue_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ صدور'))
    expiry_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ سررسید / انقضا'))
    check_due_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ سررسید چک'))
    guarantee_expiry_date = models.DateField(
        null=True, blank=True, verbose_name=_('تاریخ انقضای ضمانت‌نامه'),
    )
    is_released = models.BooleanField(default=False, verbose_name=_('آزاد شده'))
    release_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ آزادسازی'))
    last_action = models.CharField(
        max_length=20, choices=LifecycleAction.choices, blank=True, verbose_name=_('آخرین اقدام'),
    )
    last_action_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ آخرین اقدام'))
    project = models.ForeignKey(
        'projects.Project', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='procurement_guarantees', verbose_name=_('پروژه'),
    )
    note = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('تضمین خرید')
        verbose_name_plural = _('تضامین خرید')
        ordering = ['-issue_date', '-created_at']
        indexes = [
            models.Index(fields=['company', 'supplier']),
            models.Index(fields=['company', 'kind']),
        ]

    def __str__(self):
        return f'{self.number or self.pk} - {self.supplier_id}'

    def validity(self):
        """محاسبهٔ اعتبار (همان قاعدهٔ قراردادها؛ چک ۵ سال از صدور)."""
        from contracts.guarantee_validity import guarantee_validity

        return guarantee_validity(self)


class ProcurementGuaranteeAction(BaseModel):
    """اقدام چرخهٔ عمر تضمین خرید (استرداد/آزادسازی/اجرا/ابطال/تمدید)."""

    guarantee = models.ForeignKey(
        ProcurementGuarantee, on_delete=models.CASCADE, related_name='actions',
        verbose_name=_('تضمین'),
    )
    action = models.CharField(
        max_length=20, choices=ProcurementGuarantee.LifecycleAction.choices,
        verbose_name=_('اقدام'),
    )
    date = models.DateField(verbose_name=_('تاریخ'))
    previous_amount = models.DecimalField(
        max_digits=18, decimal_places=0, null=True, blank=True, verbose_name=_('مبلغ قبلی'),
    )
    new_amount = models.DecimalField(
        max_digits=18, decimal_places=0, null=True, blank=True, verbose_name=_('مبلغ جدید'),
    )
    previous_expiry_date = models.DateField(null=True, blank=True, verbose_name=_('انقضای قبلی'))
    new_expiry_date = models.DateField(null=True, blank=True, verbose_name=_('انقضای جدید'))
    note = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('اقدام تضمین خرید')
        verbose_name_plural = _('اقدامات تضامین خرید')
        ordering = ['-date', '-id']

    def __str__(self):
        return f'{self.guarantee_id} - {self.action}'



class PurchasePaymentAllocation(BaseModel):
    """تخصیص یک پرداخت به فاکتور/پیش‌پرداخت (پرداخت چندفاکتوری)."""

    payment = models.ForeignKey(
        PurchasePayment, on_delete=models.CASCADE, related_name='allocations',
        verbose_name=_('پرداخت'),
    )
    invoice = models.ForeignKey(
        PurchaseInvoice, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='allocations', verbose_name=_('صورتحساب'),
    )
    proforma = models.ForeignKey(
        ProformaInvoice, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='allocations', verbose_name=_('پیش‌فاکتور'),
    )
    amount = models.DecimalField(max_digits=18, decimal_places=0, default=0, verbose_name=_('مبلغ تخصیص'))
    note = models.CharField(max_length=250, blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('تخصیص پرداخت خرید')
        verbose_name_plural = _('تخصیص‌های پرداخت خرید')
        ordering = ['id']

    def __str__(self):
        return f'{self.payment_id} → {self.invoice_id or self.proforma_id}'


class ProcurementDocument(BaseModel):
    """پیوست سند خرید (استعلام، پیشنهاد، پیش‌فاکتور، فاکتور، تضمین، رسید)."""

    class Kind(models.TextChoices):
        INQUIRY = 'inquiry', _('مدارک استعلام')
        QUOTATION = 'quotation', _('پیشنهاد تأمین‌کننده')
        PROFORMA = 'proforma', _('پیش‌فاکتور')
        INVOICE = 'invoice', _('صورتحساب')
        GUARANTEE = 'guarantee', _('تضمین')
        RECEIPT = 'receipt', _('رسید انبار')
        CONTRACT = 'contract', _('قرارداد / سفارش')
        OTHER = 'other', _('سایر')

    kind = models.CharField(
        max_length=20, choices=Kind.choices, default=Kind.OTHER, verbose_name=_('نوع سند'),
    )
    title = models.CharField(max_length=250, verbose_name=_('عنوان'))
    file = models.FileField(upload_to='procurement/%Y/%m', verbose_name=_('فایل'))
    size = models.PositiveIntegerField(default=0, verbose_name=_('حجم (بایت)'))
    inquiry = models.ForeignKey(
        Inquiry, on_delete=models.CASCADE, null=True, blank=True,
        related_name='documents', verbose_name=_('استعلام'),
    )
    quotation = models.ForeignKey(
        Quotation, on_delete=models.CASCADE, null=True, blank=True,
        related_name='documents', verbose_name=_('پیشنهاد'),
    )
    order = models.ForeignKey(
        PurchaseOrder, on_delete=models.CASCADE, null=True, blank=True,
        related_name='documents', verbose_name=_('سفارش'),
    )
    proforma = models.ForeignKey(
        ProformaInvoice, on_delete=models.CASCADE, null=True, blank=True,
        related_name='documents', verbose_name=_('پیش‌فاکتور'),
    )
    invoice = models.ForeignKey(
        PurchaseInvoice, on_delete=models.CASCADE, null=True, blank=True,
        related_name='documents', verbose_name=_('صورتحساب'),
    )
    guarantee = models.ForeignKey(
        ProcurementGuarantee, on_delete=models.CASCADE, null=True, blank=True,
        related_name='documents', verbose_name=_('تضمین'),
    )
    uploaded_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', db_constraint=False, verbose_name=_('بارگذارنده'),
    )
    note = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('سند خرید')
        verbose_name_plural = _('اسناد خرید')
        ordering = ['-created_at']
        indexes = [models.Index(fields=['company', 'kind'])]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if self.file and not self.size:
            try:
                self.size = self.file.size
            except (OSError, ValueError):
                self.size = 0
        super().save(*args, **kwargs)

