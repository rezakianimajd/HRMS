"""Models for the Correspondences module."""
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


class IncomingLetter(BaseModel):
    """نامه وارده"""
    number = models.CharField(max_length=50, verbose_name=_('شماره نامه'))
    date = models.DateField(verbose_name=_('تاریخ نامه'))
    sender = models.CharField(max_length=200, verbose_name=_('فرستنده'))
    subject = models.CharField(max_length=500, verbose_name=_('موضوع'))
    employees = models.ManyToManyField(
        'employees.Employee', blank=True,
        related_name='incoming_letters', verbose_name=_('پرسنل مرتبط'),
    )
    priority = models.CharField(max_length=20, default='normal', choices=[
        ('low', _('کم')), ('normal', _('عادی')), ('high', _('زیاد')), ('urgent', _('فوری')),
    ], verbose_name=_('اولویت'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))
    file = models.FileField(upload_to='correspondences/incoming/', blank=True, null=True, verbose_name=_('فایل پیوست'))

    class Meta:
        verbose_name = _('نامه وارده')
        verbose_name_plural = _('نامه‌های وارده')
        ordering = ['-date']

    def __str__(self):
        return f"{self.number} - {self.subject}"


class OutgoingLetter(BaseModel):
    """نامه صادره"""
    number = models.CharField(max_length=50, verbose_name=_('شماره نامه'))
    date = models.DateField(verbose_name=_('تاریخ نامه'))
    receiver = models.CharField(max_length=200, verbose_name=_('گیرنده'))
    subject = models.CharField(max_length=500, verbose_name=_('موضوع'))
    employees = models.ManyToManyField(
        'employees.Employee', blank=True,
        related_name='outgoing_letters', verbose_name=_('پرسنل مرتبط'),
    )
    priority = models.CharField(max_length=20, default='normal', choices=[
        ('low', _('کم')), ('normal', _('عادی')), ('high', _('زیاد')), ('urgent', _('فوری')),
    ], verbose_name=_('اولویت'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))
    file = models.FileField(upload_to='correspondences/outgoing/', blank=True, null=True, verbose_name=_('فایل پیوست'))

    class Meta:
        verbose_name = _('نامه صادره')
        verbose_name_plural = _('نامه‌های صادره')
        ordering = ['-date']

    def __str__(self):
        return f"{self.number} - {self.subject}"


class Announcement(BaseModel):
    """ابلاغ"""
    number = models.CharField(max_length=50, verbose_name=_('شماره ابلاغ'))
    date = models.DateField(verbose_name=_('تاریخ ابلاغ'))
    title = models.CharField(max_length=300, verbose_name=_('عنوان'))
    employees = models.ManyToManyField('employees.Employee', blank=True, verbose_name=_('گیرندگان ابلاغ'))
    type = models.CharField(max_length=30, default='general', choices=[
        ('appointment', _('انتصاب')), ('promotion', _('ارتقا')), ('warning', _('تذکر')),
        ('appreciation', _('تقدیر')), ('general', _('عمومی')),
    ], verbose_name=_('نوع ابلاغ'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))
    file = models.FileField(upload_to='correspondences/announcements/', blank=True, null=True, verbose_name=_('فایل پیوست'))

    class Meta:
        verbose_name = _('ابلاغ')
        verbose_name_plural = _('ابلاغ‌ها')
        ordering = ['-date']

    def __str__(self):
        return f"{self.number} - {self.title}"


class Form(BaseModel):
    """فرم"""
    name = models.CharField(max_length=200, verbose_name=_('نام فرم'))
    code = models.CharField(max_length=50, verbose_name=_('کد فرم'))
    category = models.CharField(max_length=50, blank=True, verbose_name=_('دسته‌بندی'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))
    file = models.FileField(upload_to='correspondences/forms/', blank=True, null=True, verbose_name=_('فایل فرم'))

    class Meta:
        verbose_name = _('فرم')
        verbose_name_plural = _('فرم‌ها')
        ordering = ['name']

    def __str__(self):
        return f"{self.code} - {self.name}"


class Organization(BaseModel):
    """سازمان/نهاد خارجی (اداره مالیات، تأمین اجتماعی، ...)."""
    name = models.CharField(max_length=200, verbose_name=_('نام سازمان'))
    code = models.CharField(max_length=50, verbose_name=_('کد'))
    type = models.CharField(max_length=50, default='government', choices=[
        ('tax', _('اداره مالیات')),
        ('social_security', _('تأمین اجتماعی')),
        ('insurance', _('بیمه')),
        ('court', _('دادگستری / مراجع قضایی')),
        ('bank', _('بانک')),
        ('government', _('سازمان دولتی')),
        ('other', _('سایر')),
    ], verbose_name=_('نوع سازمان'))
    phone = models.CharField(max_length=20, blank=True, verbose_name=_('تلفن'))
    email = models.EmailField(blank=True, verbose_name=_('ایمیل'))
    address = models.TextField(blank=True, verbose_name=_('آدرس'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('سازمان')
        verbose_name_plural = _('سازمان‌ها')
        unique_together = [('company', 'code')]
        ordering = ['name']

    def __str__(self):
        return self.name


class OrganizationalLetter(BaseModel):
    """مکاتبه سازمانی (ابلاغ، اطلاع رسانی، بازداشت نامه، ...) با سازمان خارجی."""
    number = models.CharField(max_length=50, verbose_name=_('شماره نامه'))
    date = models.DateField(verbose_name=_('تاریخ نامه'))
    organization = models.ForeignKey(
        Organization, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='letters', verbose_name=_('سازمان'),
    )
    letter_type = models.CharField(max_length=30, default='notice', choices=[
        ('notice', _('اطلاع رسانی')),
        ('edict', _('ابلاغ')),
        ('seizure', _('بازداشت نامه')),
        ('summons', _('احضاریه')),
        ('warning', _('هشدار / تذکر')),
        ('request', _('درخواست')),
        ('response', _('پاسخ')),
        ('other', _('سایر')),
    ], verbose_name=_('نوع مکاتبه'))
    subject = models.CharField(max_length=500, verbose_name=_('موضوع'))
    employee = models.ForeignKey(
        'employees.Employee', on_delete=models.SET_NULL, null=True, blank=True,
        verbose_name=_('پرسنل مرتبط'),
    )
    priority = models.CharField(max_length=20, default='normal', choices=[
        ('low', _('کم')), ('normal', _('عادی')), ('high', _('زیاد')), ('urgent', _('فوری')),
    ], verbose_name=_('اولویت'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))
    file = models.FileField(upload_to='correspondences/organizational/', blank=True, null=True, verbose_name=_('فایل پیوست'))

    class Meta:
        verbose_name = _('مکاتبه سازمانی')
        verbose_name_plural = _('مکاتبات سازمانی')
        ordering = ['-date']

    def __str__(self):
        return f"{self.number} - {self.subject}"

# ---------------------------------------------------------------------------
# مکاتبات اداری حرفه‌ای (دفتر وارده/صادره، ارجاع چندسطحی، پیوست، تاریخچه)
# ---------------------------------------------------------------------------


class LetterCategory(BaseModel):
    """نوع/دستهٔ مکاتبه (مثل «درخواست»، «ابلاغ»، «پاسخ»، «بخشنامه»)."""

    DIRECTIONS = [
        ('incoming', _('وارده')),
        ('outgoing', _('صادره')),
        ('internal', _('داخلی')),
        ('both', _('وارده و صادره')),
    ]

    name = models.CharField(max_length=150, verbose_name=_('عنوان نوع'))
    code = models.CharField(max_length=40, verbose_name=_('کد'))
    direction = models.CharField(
        max_length=20, default='both', choices=DIRECTIONS, verbose_name=_('جهت مکاتبه'),
    )
    color = models.CharField(max_length=20, blank=True, default='#0ea5e9', verbose_name=_('رنگ'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))
    order = models.PositiveIntegerField(default=0, verbose_name=_('ترتیب'))

    class Meta:
        verbose_name = _('نوع مکاتبه')
        verbose_name_plural = _('انواع مکاتبه')
        unique_together = [('company', 'code')]
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class LetterSeries(BaseModel):
    """سری شماره‌گذاری نامه (شمارهٔ اندیکاتور/صادره/وارده)."""

    DIRECTIONS = [
        ('incoming', _('وارده')),
        ('outgoing', _('صادره')),
        ('internal', _('داخلی')),
    ]

    title = models.CharField(max_length=150, verbose_name=_('عنوان سری'))
    direction = models.CharField(max_length=20, choices=DIRECTIONS, verbose_name=_('جهت مکاتبه'))
    prefix = models.CharField(max_length=40, blank=True, verbose_name=_('پیشوند'),
                              help_text=_('مثال: ص م — در شماره درج می‌شود'))
    template = models.CharField(
        max_length=80, default='{prefix}/{year}/{seq}', verbose_name=_('قالب شماره'),
        help_text=_('توکن‌های مجاز: {prefix} {year} {seq}'),
    )
    next_number = models.PositiveIntegerField(default=1, verbose_name=_('شمارهٔ بعدی'))
    padding = models.PositiveSmallIntegerField(default=3, verbose_name=_('تعداد رقم'),
                                               help_text=_('مثال: ۳ → 007'))
    reset_yearly = models.BooleanField(default=True, verbose_name=_('شمارش سالانه از یک شروع شود'))
    last_year = models.PositiveIntegerField(null=True, blank=True, verbose_name=_('آخرین سال شمسی'))
    is_default = models.BooleanField(default=False, verbose_name=_('سری پیش‌فرض این جهت'))

    class Meta:
        verbose_name = _('سری شماره‌گذاری')
        verbose_name_plural = _('سری‌های شماره‌گذاری')
        ordering = ['-is_default', 'title']

    def __str__(self):
        return self.title


class Correspondent(BaseModel):
    """مخاطب مکاتبه: شخص یا سازمان (طرف نامه)."""

    KINDS = [('organization', _('سازمان')), ('person', _('شخص'))]

    kind = models.CharField(max_length=20, default='organization', choices=KINDS,
                            verbose_name=_('نوع مخاطب'))
    name = models.CharField(max_length=200, verbose_name=_('نام'))
    title = models.CharField(max_length=150, blank=True, verbose_name=_('سمت / عنوان'))
    organization = models.ForeignKey(
        Organization, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='correspondents', verbose_name=_('سازمان'),
    )
    code = models.CharField(max_length=50, blank=True, verbose_name=_('کد'))
    national_id = models.CharField(max_length=20, blank=True, verbose_name=_('کد ملی / شناسه ملی'))
    phone = models.CharField(max_length=30, blank=True, verbose_name=_('تلفن'))
    mobile = models.CharField(max_length=30, blank=True, verbose_name=_('همراه'))
    email = models.EmailField(blank=True, verbose_name=_('ایمیل'))
    address = models.TextField(blank=True, verbose_name=_('آدرس'))
    notes = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('مخاطب')
        verbose_name_plural = _('مخاطبین')
        unique_together = [('company', 'code')]
        ordering = ['name']

    def __str__(self):
        return self.name



class Letter(BaseModel):
    """مکاتبهٔ اداری (وارده / صادره / داخلی) با ارجاع، پیوست و تاریخچه."""

    DIRECTION_CHOICES = [
        ('incoming', _('وارده')),
        ('outgoing', _('صادره')),
        ('internal', _('داخلی')),
    ]
    STATUS_CHOICES = [
        ('draft', _('پیش‌نویس')),
        ('registered', _('ثبت‌شده')),
        ('in_progress', _('در جریان')),
        ('answered', _('پاسخ داده‌شده')),
        ('closed', _('بسته‌شده')),
        ('archived', _('بایگانی‌شده')),
        ('canceled', _('لغوشده')),
    ]
    PRIORITY_CHOICES = [
        ('low', _('کم')),
        ('normal', _('عادی')),
        ('high', _('زیاد')),
        ('urgent', _('فوری')),
    ]
    CONFIDENTIALITY_CHOICES = [
        ('normal', _('عادی')),
        ('confidential', _('محرمانه')),
        ('secret', _('سری')),
    ]

    direction = models.CharField(max_length=20, choices=DIRECTION_CHOICES, verbose_name=_('جهت'))
    number = models.CharField(max_length=60, blank=True, verbose_name=_('شماره نامه'))
    external_number = models.CharField(max_length=60, blank=True, verbose_name=_('شماره نامه طرف مقابل'))
    indicator_no = models.CharField(max_length=60, blank=True, verbose_name=_('شماره اندیکاتور'))
    transmittal_no = models.CharField(max_length=60, blank=True, verbose_name=_('ترنسمیتال'))
    series = models.ForeignKey(
        LetterSeries, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='letters', verbose_name=_('سری شماره‌گذاری'),
    )
    category = models.ForeignKey(
        LetterCategory, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='letters', verbose_name=_('نوع مکاتبه'),
    )
    subject = models.CharField(max_length=500, verbose_name=_('موضوع'))
    summary = models.TextField(blank=True, verbose_name=_('خلاصه / چکیده'))
    body = models.TextField(blank=True, verbose_name=_('متن نامه'))

    letter_date = models.DateField(verbose_name=_('تاریخ نامه'))
    received_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ ورود'))
    sent_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ ارسال'))
    due_date = models.DateField(null=True, blank=True, verbose_name=_('مهلت پاسخ'),
                               help_text=_('برای پیگیری معوقات'))

    organization = models.ForeignKey(
        Organization, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='office_letters', verbose_name=_('سازمان'),
    )
    correspondent = models.ForeignKey(
        Correspondent, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='letters', verbose_name=_('مخاطب'),
    )
    sender_name = models.CharField(max_length=200, blank=True, verbose_name=_('فرستنده'))
    receiver_name = models.CharField(max_length=200, blank=True, verbose_name=_('گیرنده'))
    drafter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='drafted_letters', verbose_name=_('تنظیم‌کننده نامه'),
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_letters', verbose_name=_('ثبت‌کننده'),
    )

    priority = models.CharField(max_length=20, default='normal', choices=PRIORITY_CHOICES,
                                verbose_name=_('اولویت'))
    confidentiality = models.CharField(max_length=20, default='normal',
                                       choices=CONFIDENTIALITY_CHOICES, verbose_name=_('محرمانگی'))
    status = models.CharField(max_length=20, default='draft', choices=STATUS_CHOICES,
                              verbose_name=_('وضعیت'))

    amount = models.DecimalField(max_digits=18, decimal_places=0, null=True, blank=True,
                                 verbose_name=_('مبلغ'))
    currency = models.CharField(max_length=20, blank=True, default='ریال', verbose_name=_('ارز'))
    archive_ref = models.CharField(max_length=60, blank=True, verbose_name=_('شماره بایگانی'))
    contract_number = models.CharField(max_length=60, blank=True, verbose_name=_('شماره قرارداد مرتبط'))
    tags = models.JSONField(default=list, blank=True, verbose_name=_('برچسب‌ها'))

    reply_to = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='replies', verbose_name=_('پاسخ به نامه'),
    )
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان بستن'))
    archived_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان بایگانی'))

    class Meta:
        verbose_name = _('نامه')
        verbose_name_plural = _('نامه‌های اداری')
        ordering = ['-letter_date', '-id']
        indexes = [
            models.Index(fields=['company', 'direction', 'status']),
            models.Index(fields=['company', 'letter_date']),
            models.Index(fields=['company', 'due_date']),
        ]

    def __str__(self):
        return f"{self.number or 'بدون شماره'} - {self.subject}"

    @property
    def is_overdue(self):
        from datetime import date as _date
        if not self.due_date or self.status in ('closed', 'archived', 'canceled', 'answered'):
            return False
        return self.due_date < _date.today()

    @property
    def days_to_due(self):
        from datetime import date as _date
        if not self.due_date:
            return None
        return (self.due_date - _date.today()).days



class LetterAttachment(BaseModel):
    """پیوست نامه (فایل اسکن، تصویر، رسید...)."""

    KINDS = [
        ('letter', _('اصل نامه')),
        ('attachment', _('پیوست')),
        ('receipt', _('رسید / توزیع')),
        ('other', _('سایر')),
    ]

    letter = models.ForeignKey(Letter, on_delete=models.CASCADE, related_name='attachments',
                               verbose_name=_('نامه'))
    title = models.CharField(max_length=200, blank=True, verbose_name=_('عنوان'))
    kind = models.CharField(max_length=20, default='attachment', choices=KINDS,
                            verbose_name=_('نوع فایل'))
    file = models.FileField(upload_to='correspondences/letters/%Y/%m/', verbose_name=_('فایل'))
    size = models.PositiveIntegerField(default=0, verbose_name=_('حجم (بایت)'))
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='letter_attachments', verbose_name=_('بارگذارنده'),
    )

    class Meta:
        verbose_name = _('پیوست نامه')
        verbose_name_plural = _('پیوست‌های نامه')
        ordering = ['-created_at']

    def __str__(self):
        return self.title or (self.file.name if self.file else 'پیوست')


class LetterReferral(BaseModel):
    """ارجاع نامه به یک واحد/شخص (چند سطحی، با مهلت و نتیجه)."""

    STATUS_CHOICES = [
        ('pending', _('در انتظار اقدام')),
        ('in_progress', _('در حال اقدام')),
        ('done', _('اقدام شد')),
        ('returned', _('برگشت داده شد')),
        ('canceled', _('لغو')),
    ]

    letter = models.ForeignKey(Letter, on_delete=models.CASCADE, related_name='referrals',
                               verbose_name=_('نامه'))
    seq = models.PositiveSmallIntegerField(default=1, verbose_name=_('سطح ارجاع'))
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='sent_referrals', verbose_name=_('ارجاع‌دهنده'),
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='received_referrals', verbose_name=_('ارجاع‌شونده'),
    )
    to_name = models.CharField(max_length=200, blank=True, verbose_name=_('واحد / شخص خارج از سامانه'))
    referred_on = models.DateField(verbose_name=_('تاریخ ارجاع'))
    due_date = models.DateField(null=True, blank=True, verbose_name=_('مهلت اقدام'))
    note = models.TextField(blank=True, verbose_name=_('دستور / توضیح'))
    status = models.CharField(max_length=20, default='pending', choices=STATUS_CHOICES,
                              verbose_name=_('وضعیت'))
    result_note = models.TextField(blank=True, verbose_name=_('نتیجهٔ اقدام'))
    done_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان اقدام'))

    class Meta:
        verbose_name = _('ارجاع نامه')
        verbose_name_plural = _('ارجاعات نامه')
        ordering = ['letter', 'seq']
        indexes = [models.Index(fields=['company', 'status', 'due_date'])]

    def __str__(self):
        target = self.to_user or self.to_name or '—'
        return f"{self.letter_id} → {target}"

    @property
    def is_overdue(self):
        from datetime import date as _date
        if not self.due_date or self.status in ('done', 'canceled', 'returned'):
            return False
        return self.due_date < _date.today()


class LetterEvent(BaseModel):
    """تاریخچهٔ اقدامات روی نامه (ایجاد، ثبت شماره، ارجاع، پاسخ، بایگانی...)."""

    ACTIONS = [
        ('created', _('ایجاد')),
        ('updated', _('ویرایش')),
        ('registered', _('ثبت شماره')),
        ('referred', _('ارجاع')),
        ('referral_done', _('اقدام ارجاع')),
        ('replied', _('پاسخ')),
        ('attached', _('پیوست')),
        ('status_changed', _('تغییر وضعیت')),
        ('archived', _('بایگانی')),
        ('closed', _('بسته شد')),
        ('commented', _('یادداشت')),
    ]

    letter = models.ForeignKey(Letter, on_delete=models.CASCADE, related_name='events',
                               verbose_name=_('نامه'))
    action = models.CharField(max_length=30, choices=ACTIONS, verbose_name=_('اقدام'))
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='letter_events', verbose_name=_('اقدام‌کننده'),
    )
    note = models.TextField(blank=True, verbose_name=_('توضیح'))
    meta = models.JSONField(default=dict, blank=True, verbose_name=_('اطلاعات تکمیلی'))

    class Meta:
        verbose_name = _('رویداد نامه')
        verbose_name_plural = _('رویدادهای نامه')
        ordering = ['-created_at', '-id']

    def __str__(self):
        return f"{self.letter_id} - {self.get_action_display()}"

