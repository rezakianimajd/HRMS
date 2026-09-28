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
    requester = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('درخواست‌دهنده'))
    department = models.CharField(max_length=200, blank=True, verbose_name=_('واحد درخواست'))
    date = models.DateField(verbose_name=_('تاریخ درخواست'))
    required_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ نیاز'))
    description = models.TextField(blank=True, verbose_name=_('شرح'))
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    history = models.JSONField(default=list, blank=True, verbose_name=_('تاریخچهٔ چرخه'))
    submitted_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name=_('ارسال‌کننده'))
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