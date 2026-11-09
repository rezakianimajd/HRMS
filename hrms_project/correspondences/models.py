"""Models for the Correspondences module."""
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel

CORRESPONDENCE_MODULE_KEY = 'hrms.correspondence'


def letter_archive_year(letter) -> str:
    """سال شمسی نامه برای پوشهٔ بایگانی (مثلاً 1404)."""
    value = (
        getattr(letter, 'letter_date', None)
        or getattr(letter, 'received_date', None)
        or getattr(letter, 'sent_date', None)
    )
    if not value:
        return 'بدون_تاریخ'
    try:
        import jdatetime

        return str(jdatetime.date.fromgregorian(date=value).year)
    except Exception:  # noqa: BLE001 — نبود jdatetime نباید آپلود را بشکند
        return str(getattr(value, 'year', '') or 'بدون_تاریخ')


def letter_attachment_upload_path(instance, filename):
    """مسیر پیوست نامه در بایگانی ماژول مکاتبات.

    ساختار: ``archive/company_<id>/correspondences/<سال شمسی>/<فایل>``

    اگر پروفایل بایگانی ماژول فعال نباشد، مسیر قدیمی
    ``correspondences/letters/<فایل>`` برگردانده می‌شود تا آپلود هرگز از کار
    نیفتد.
    """
    letter = getattr(instance, 'letter', None)
    company_id = (
        getattr(instance, 'company_id', None)
        or getattr(letter, 'company_id', None)
    )
    fields = {
        'year': letter_archive_year(letter),
        'number': (getattr(letter, 'number', '') or '').strip(),
        'name': getattr(letter, 'subject', '') or '',
        'id': getattr(letter, 'pk', '') or '',
    }
    try:
        from core.engines.archive_storage_engine import resolve_upload_path

        return resolve_upload_path(
            company_id, CORRESPONDENCE_MODULE_KEY, fields, filename,
            fallback_dir='correspondences/letters',
        )
    except Exception:  # noqa: BLE001 — نبود جدول تنظیمات نباید آپلود را بشکند
        return f'correspondences/letters/{filename}'


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
    """گروه شماره‌گذاری نامه (شمارهٔ اندیکاتور/صادره/وارده).

    هر شرکت می‌تواند چند «گروه شماره‌گذاری» بسازد (مثلاً مکاتبات مؤسسه و مکاتبات
    دانشگاه) و در دیالوگ ورود نامه گروه را انتخاب کند. الگوی شماره از بخش‌ها
    ساخته می‌شود (حروف فارسی، سال/ماه شمسی، جداکننده و شمارهٔ سری) و می‌تواند
    تک‌قسمتی (``{seq}``) یا چندقسمتی (``{prefix}/{year}/{seq}``) باشد.
    """

    DIRECTIONS = [
        ('incoming', _('وارده')),
        ('outgoing', _('صادره')),
        ('internal', _('داخلی')),
    ]

    title = models.CharField(max_length=150, verbose_name=_('عنوان گروه شماره‌گذاری'))
    direction = models.CharField(max_length=20, choices=DIRECTIONS, verbose_name=_('جهت مکاتبه'))
    prefix = models.CharField(max_length=40, blank=True, verbose_name=_('پیشوند'),)
    template = models.CharField(
        max_length=80, default='{prefix}/{year}/{seq}', verbose_name=_('قالب شماره'),
        help_text=_('توکن‌ها: {prefix} {seq} {year} {yy} {month} {day}'),
    )
    start_number = models.PositiveIntegerField(
        default=1, verbose_name=_('شماره شروع'),
        help_text=_('شمارش (و شمارش سالانه) از این شماره آغاز می‌شود'),
    )
    next_number = models.PositiveIntegerField(default=1, verbose_name=_('شمارهٔ بعدی'))
    end_number = models.PositiveIntegerField(
        null=True, blank=True, verbose_name=_('تا شماره'),
        help_text=_('سقف اختیاری؛ گذشتن از آن فقط هشدار می‌دهد'),
    )
    padding = models.PositiveSmallIntegerField(default=3, verbose_name=_('تعداد رقم'),
                                               help_text=_('مثال: ۳ → 007'))
    reset_yearly = models.BooleanField(default=True, verbose_name=_('شمارش سالانه از نو شروع شود'))
    last_year = models.PositiveIntegerField(null=True, blank=True, verbose_name=_('آخرین سال شمسی'))
    is_default = models.BooleanField(default=False, verbose_name=_('گروه پیش‌فرض این جهت'))
    description = models.CharField(max_length=255, blank=True, verbose_name=_('توضیح / کاربرد'))

    class Meta:
        verbose_name = _('گروه شماره‌گذاری')
        verbose_name_plural = _('گروه‌های شماره‌گذاری')
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



class CorrespondenceNameAlias(BaseModel):
    """نگاشت نام خام (مثلاً از اکسل) به پرسنل / طرف حساب / مخاطب.

    مثال: «خ.حسینی» → پرسنل «سیده زهرا حسینی». پس از ثبت، هنگام ورود داده‌های
    اکسل خودکار اعمال می‌شود و با دکمهٔ «اعمال روی داده‌های موجود» ردیف‌های قبلی
    هم اصلاح و به پرسنل/طرف حساب متصل می‌شوند.
    """

    TARGET_KINDS = [
        ('employee', _('پرسنل (منابع انسانی)')),
        ('party', _('طرف حساب (مدیریت قراردادها)')),
        ('correspondent', _('مخاطب مکاتبات')),
        ('organization', _('سازمان (تعاریف مکاتبات)')),
        ('category', _('نوع مکاتبه (تعاریف مکاتبات)')),
    ]
    SCOPES = [
        ('any', _('همهٔ فیلدها')),
        ('referral', _('گیرندهٔ ارجاع')),
        ('sender', _('فرستنده / ارسال‌کننده')),
        ('receiver', _('گیرنده')),
        ('delivery', _('تحویل‌دهنده')),
        ('counterparty', _('طرف حساب نامه (وارده/صادره)')),
        ('referral_target', _('گیرندهٔ ارجاع (طرف حساب)')),
        ('contact', _('مخاطب نامه')),
        ('organization', _('سازمان طرف نامه')),
        ('subject', _('موضوع نامه / نوع مکاتبه')),
    ]

    raw_name = models.CharField(max_length=200, verbose_name=_('نام خام (واردشده)'))
    normalized = models.CharField(max_length=200, blank=True, db_index=True,
                                  verbose_name=_('کلید نرمال‌شده'))
    scope = models.CharField(max_length=20, default='any', choices=SCOPES,
                             verbose_name=_('دامنهٔ کاربرد'))
    target_kind = models.CharField(max_length=20, choices=TARGET_KINDS,
                                   verbose_name=_('نوع مقصد'))
    employee = models.ForeignKey(
        'employees.Employee', on_delete=models.CASCADE, null=True, blank=True,
        related_name='correspondence_aliases', db_constraint=False,
        verbose_name=_('پرسنل'),
    )
    party = models.ForeignKey(
        'contracts.ContractParty', on_delete=models.CASCADE, null=True, blank=True,
        related_name='correspondence_aliases', db_constraint=False,
        verbose_name=_('طرف حساب'),
    )
    correspondent = models.ForeignKey(
        Correspondent, on_delete=models.CASCADE, null=True, blank=True,
        related_name='name_aliases', verbose_name=_('مخاطب'),
    )
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, null=True, blank=True,
        related_name='name_aliases', verbose_name=_('سازمان'),
    )
    category = models.ForeignKey(
        'correspondences.LetterCategory', on_delete=models.CASCADE, null=True, blank=True,
        related_name='name_aliases', verbose_name=_('نوع مکاتبه'),
        help_text=_('برای نگاشت «موضوع نامه»: نوع مکاتبه‌ای که به نامه‌ها متصل می‌شود.'),
    )
    bidirectional = models.BooleanField(
        default=False, verbose_name=_('نگاشت دو مسیره'),
        help_text=_('هم روی نامه‌های ارسالی و هم دریافتی اعمال شود '
                    '(فقط برای دامنه‌های فرستنده/گیرنده).'),
    )
    note = models.TextField(blank=True, verbose_name=_('یادداشت'))
    order = models.PositiveSmallIntegerField(
        default=0, verbose_name=_('ترتیب'),
        help_text=_('در نگاشت‌های چندنفره، مقصد با ترتیب کمتر «گیرندهٔ اصلی» است.'),
    )
    applied_count = models.PositiveIntegerField(default=0, verbose_name=_('تعداد اصلاح‌شده'))
    last_applied_at = models.DateTimeField(null=True, blank=True, verbose_name=_('آخرین اعمال'))

    class Meta:
        verbose_name = _('نگاشت نام مکاتبات')
        verbose_name_plural = _('نگاشت نام‌های مکاتبات')
        ordering = ['normalized', 'scope', 'order', 'id']
        indexes = [models.Index(fields=['company', 'scope', 'normalized'])]

    def __str__(self):
        return f'{self.raw_name} → {self.target_label}'

    def clean(self):
        from django.core.exceptions import ValidationError

        from correspondences.alias_purposes import can_be_bidirectional
        from correspondences.matching import normalize_name

        super().clean()
        self.normalized = normalize_name(self.raw_name)
        if not self.normalized:
            raise ValidationError({'raw_name': _('نام خام معتبر نیست.')})
        targets = {
            'employee': self.employee_id,
            'party': self.party_id,
            'correspondent': self.correspondent_id,
            'organization': self.organization_id,
            'category': self.category_id,
        }
        if not targets.get(self.target_kind):
            raise ValidationError({'target_kind': _('مقصد نگاشت را انتخاب کنید.')})
        if self.bidirectional and not can_be_bidirectional(self.scope):
            raise ValidationError({
                'bidirectional': _('«نگاشت دو مسیره» فقط برای فرستنده و گیرندهٔ نامه معنا دارد.'),
            })

    @property
    def applied_scopes(self):
        """دامنه‌هایی که این نگاشت روی آن‌ها اثر می‌گذارد (با احتساب دو مسیره)."""
        from correspondences.alias_purposes import paired_scope

        scopes = [self.scope]
        if self.bidirectional:
            pair = paired_scope(self.scope)
            if pair and pair not in scopes:
                scopes.append(pair)
        return scopes

    @property
    def target_ids(self):
        return {
            'employee': self.employee_id,
            'party': self.party_id,
            'correspondent': self.correspondent_id,
            'organization': self.organization_id,
            'category': self.category_id,
        }

    def save(self, *args, **kwargs):
        from correspondences.matching import normalize_name

        self.normalized = normalize_name(self.raw_name)
        for kind, field in (('employee', 'employee'), ('party', 'party'),
                            ('correspondent', 'correspondent'),
                            ('organization', 'organization'),
                            ('category', 'category')):
            if self.target_kind != kind:
                setattr(self, f'{field}_id', None)
        if self._state.adding and not self.order and self.company_id and self.normalized:
            self.order = CorrespondenceNameAlias.objects.filter(
                company_id=self.company_id, normalized=self.normalized, scope=self.scope,
            ).count()
        return super().save(*args, **kwargs)

    @property
    def target_label(self):
        """برچسب خوانا برای مقصد نگاشت."""
        if self.target_kind == 'employee' and self.employee_id:
            name = getattr(self.employee, 'full_name', '') or ''
            code = getattr(self.employee, 'employee_id', '') or ''
            return f'{name} ({code})' if code else name
        if self.target_kind == 'party' and self.party_id:
            return self.party.name
        if self.target_kind == 'correspondent' and self.correspondent_id:
            return self.correspondent.name
        if self.target_kind == 'organization' and self.organization_id:
            return self.organization.name
        if self.target_kind == 'category' and self.category_id:
            return self.category.name
        return '—'


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
    ENTRY_METHODS = [
        ('automation', _('اتوماسیون')),
        ('manual', _('دستی')),
        ('email', _('پست الکترونیک')),
        ('post', _('پست / مرسوله')),
        ('other', _('سایر')),
    ]
    DELIVERY_TYPES = [
        ('in_person', _('حضوری / دستی')),
        ('post', _('پست / مرسوله')),
        ('email', _('پست الکترونیک')),
        ('fax', _('دورنگار')),
        ('courier', _('پیک')),
        ('scanner', _('اسکنر / بارگذاری')),
        ('automation', _('اتوماسیون اداری')),
        ('other', _('سایر')),
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

    letter_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ نامه'))
    received_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ ورود'))
    sent_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ ارسال'))
    due_date = models.DateField(null=True, blank=True, verbose_name=_('مهلت پاسخ'),
                               help_text=_('برای پیگیری معوقات'))

    # --- نحوهٔ ورود و دو شمارهٔ ثبت (دفتر وارده) ---
    entry_method = models.CharField(
        max_length=20, default='manual', choices=ENTRY_METHODS, verbose_name=_('نحوهٔ ورود'),
    )
    entry_time = models.TimeField(null=True, blank=True, verbose_name=_('ساعت ورود'))
    entered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='entered_letters', verbose_name=_('ثبت‌کنندهٔ ورود'),
    )
    entered_by_name = models.CharField(
        max_length=200, blank=True, verbose_name=_('نام ثبت‌کنندهٔ ورود'),
        help_text=_('اگر ثبت‌کننده کاربر سامانه نیست'),
    )
    company_reg_no = models.CharField(
        max_length=60, blank=True, verbose_name=_('شماره ثبت ورود به شرکت'),
    )
    company_reg_date = models.DateField(
        null=True, blank=True, verbose_name=_('تاریخ ثبت ورود به شرکت'),
    )
    unit_reg_no = models.CharField(
        max_length=60, blank=True, verbose_name=_('شماره ثبت ورود به واحد'),
    )
    unit_reg_date = models.DateField(
        null=True, blank=True, verbose_name=_('تاریخ ثبت ورود به واحد'),
    )
    unit_name = models.CharField(max_length=150, blank=True, verbose_name=_('واحد ثبت‌کننده'))

    # --- تحویل نامه (نوع تحویل، تحویل‌دهنده) ---
    delivery_type = models.CharField(
        max_length=20, default='in_person', choices=DELIVERY_TYPES,
        verbose_name=_('نوع تحویل'),
    )
    delivered_by = models.ForeignKey(
        'employees.Employee', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='delivered_office_letters', db_constraint=False,
        verbose_name=_('تحویل‌دهنده'),
    )
    delivered_by_name = models.CharField(
        max_length=200, blank=True, verbose_name=_('نام تحویل‌دهنده (متن آزاد)'),
    )

    organization = models.ForeignKey(
        Organization, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='office_letters', verbose_name=_('طرف حساب (سازمان)'),
    )
    correspondent = models.ForeignKey(
        Correspondent, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='letters', verbose_name=_('مخاطب'),
    )
    sender_organization = models.ForeignKey(
        Organization, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='sent_letters', verbose_name=_('سازمان ارسال‌کننده'),
    )
    sender_name = models.CharField(max_length=200, blank=True, verbose_name=_('نام ارسال‌کننده'))
    sender_title = models.CharField(max_length=150, blank=True, verbose_name=_('سمت ارسال‌کننده'))
    receiver_name = models.CharField(max_length=200, blank=True, verbose_name=_('گیرنده'))

    # --- پرسنل مرتبط (فرستنده/گیرنده/تحویل‌دهنده) و طرف‌های قرارداد ---
    sender_employee = models.ForeignKey(
        'employees.Employee', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='sent_office_letters', db_constraint=False,
        verbose_name=_('فرستنده (پرسنل)'),
    )
    receiver_employee = models.ForeignKey(
        'employees.Employee', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='received_office_letters', db_constraint=False,
        verbose_name=_('گیرنده (پرسنل)'),
    )
    sender_party = models.ForeignKey(
        'contracts.ContractParty', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='sent_letters', db_constraint=False,
        verbose_name=_('ارسال‌کننده (طرف حساب)'),
    )
    party_account = models.ForeignKey(
        'contracts.ContractParty', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='office_letters', db_constraint=False,
        verbose_name=_('طرف حساب'),
    )
    party_name = models.CharField(
        max_length=250, blank=True, verbose_name=_('طرف حساب (متن آزاد)'),
        help_text=_('برای شرکت‌هایی که هنوز در مدیریت قراردادها ثبت نشده‌اند؛ '
                    'بعداً از «نگاشت نام‌ها» به طرف حساب قراردادها وصل می‌شود.'),
    )
    sender_kind = models.CharField(
        max_length=10, default='employee', blank=True,
        choices=(('employee', _('پرسنل')), ('party', _('شرکت / طرف حساب'))),
        verbose_name=_('نوع فرستنده'),
        help_text=_('پرسنل داخلی یا شرکت/طرف حساب؛ برای شرکت‌های بدون قرارداد «شرکت» انتخاب می‌شود.'),
    )
    drafter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='drafted_letters', verbose_name=_('تنظیم‌کننده نامه'),
    )
    drafter_name = models.CharField(
        max_length=200, blank=True, verbose_name=_('نام تنظیم‌کننده (متن آزاد)'),
        help_text=_('برای مواردی که تنظیم‌کننده کاربر سامانه نیست'),
    )
    source_ref = models.CharField(
        max_length=120, blank=True, verbose_name=_('شناسه منبع'),
        help_text=_('برای ورود داده‌های تاریخی و جلوگیری از تکرار'),
    )
    contract = models.ForeignKey(
        'contracts.Contract', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='office_letters', db_constraint=False,
        verbose_name=_('قرارداد مرتبط (مدیریت قراردادها)'),
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
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'source_ref'],
                condition=~models.Q(source_ref=''),
                name='uniq_letter_company_source_ref',
            ),
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

    # ------------------------------------------------------------------
    # برچسب‌های یکتا (منبع واحد برای API، اکسل و جست‌وجو)
    # ------------------------------------------------------------------
    @property
    def party_display(self):
        """«طرف مکاتبه»: طرف حساب قراردادها → نام آزاد → سازمان → مخاطب."""
        if self.party_account_id:
            return self.party_account.name
        if self.party_name:
            return self.party_name
        if self.organization_id:
            return self.organization.name
        if self.correspondent_id:
            return self.correspondent.name
        return ''

    def sender_display(self, include_employee=True):
        """برچسب فرستنده (پرسنل فقط در حالت سنگین خوانده می‌شود)."""
        if self.sender_party_id:
            return self.sender_party.name
        if self.sender_organization_id:
            return self.sender_organization.name
        if include_employee and self.sender_employee_id:
            return getattr(self.sender_employee, 'full_name', '') or ''
        return self.sender_name or ''

    def receiver_display(self, include_employee=True):
        """برچسب گیرنده (پرسنل فقط در حالت سنگین خوانده می‌شود)."""
        if include_employee and self.receiver_employee_id:
            return getattr(self.receiver_employee, 'full_name', '') or ''
        return self.receiver_name or ''



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
    file = models.FileField(upload_to=letter_attachment_upload_path, verbose_name=_('فایل'))
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
        ('forwarded', _('ارجاع داده شد')),
        ('done', _('اقدام شد')),
        ('returned', _('برگشت داده شد')),
        ('canceled', _('لغو')),
    ]
    PURPOSES = [
        ('action', _('اقدام / انجام کار')),
        ('info', _('اطلاع / مشاهده')),
        ('comment', _('اظهارنظر')),
    ]

    letter = models.ForeignKey(Letter, on_delete=models.CASCADE, related_name='referrals',
                               verbose_name=_('نامه'))
    seq = models.PositiveSmallIntegerField(default=1, verbose_name=_('سطح ارجاع'))
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='children', verbose_name=_('ارجاع والد'),
    )
    purpose = models.CharField(
        max_length=20, default='action', choices=PURPOSES, verbose_name=_('نوع ارجاع'),
        help_text=_('اقدام (نیازمند انجام کار) یا اطلاع (صرفاً مشاهده)'),
    )
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='sent_referrals', verbose_name=_('ارجاع‌دهنده'),
    )
    from_employee = models.ForeignKey(
        'employees.Employee', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='sent_letter_referrals', db_constraint=False,
        verbose_name=_('ارجاع‌دهنده (پرسنل)'),
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='received_referrals', verbose_name=_('ارجاع‌شونده'),
    )
    to_employee = models.ForeignKey(
        'employees.Employee', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='letter_referrals', db_constraint=False,
        verbose_name=_('ارجاع‌شونده (پرسنل)'),
    )
    to_employees = models.ManyToManyField(
        'employees.Employee', blank=True,
        related_name='multi_letter_referrals', db_constraint=False,
        verbose_name=_('ارجاع‌شونده‌های دیگر (پرسنل)'),
        help_text=_('برای ارجاع‌هایی که هم‌زمان به چند نفر ارجاع داده شده‌اند'),
    )
    to_name = models.CharField(max_length=200, blank=True, verbose_name=_('واحد / شخص خارج از سامانه'))
    referred_on = models.DateField(verbose_name=_('تاریخ ارجاع'))
    due_date = models.DateField(null=True, blank=True, verbose_name=_('مهلت اقدام'))
    instruction = models.TextField(
        blank=True, verbose_name=_('دستور / اقدام درخواستی'),
        help_text=_('دستور مقام ارجاع‌دهنده به گیرندهٔ ارجاع'),
    )
    note = models.TextField(blank=True, verbose_name=_('توضیح ارجاع'))
    margin_note = models.TextField(blank=True, verbose_name=_('حاشیه / یادداشت گیرنده'))
    seen_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان مشاهده'))
    status = models.CharField(max_length=20, default='pending', choices=STATUS_CHOICES,
                              verbose_name=_('وضعیت'))
    response = models.TextField(blank=True, verbose_name=_('پاسخ / جوابیهٔ اقدام‌کننده'))
    result = models.TextField(blank=True, verbose_name=_('نتیجهٔ نهایی'))
    result_note = models.TextField(blank=True, verbose_name=_('یادداشت نتیجه'))
    answered_on = models.DateField(null=True, blank=True, verbose_name=_('تاریخ پاسخ'))
    answered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='answered_referrals', verbose_name=_('پاسخ‌دهنده'),
    )
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

    @property
    def target_label(self):
        """نام گیرنده(های) ارجاع: کاربر، پرسنل (چند نفر) یا واحد خارج از سامانه."""
        names = []
        if self.to_user_id:
            names.append(self.to_user.get_full_name() or self.to_user.get_username())
        if self.to_employee_id:
            names.append(self.to_employee.full_name)
        if self.pk:
            names.extend(
                emp.full_name for emp in self.to_employees.all()
                if emp.id != self.to_employee_id
            )
        if not names and self.to_name:
            names.append(self.to_name)
        unique = list(dict.fromkeys(name for name in names if name))
        return '، '.join(unique) if unique else '—'


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
        ('referral_seen', _('مشاهدهٔ ارجاع')),
        ('referral_note', _('حاشیهٔ ارجاع')),
        ('referral_forwarded', _('ارجاع به سطح بعد')),
        ('request_created', _('ثبت درخواست')),
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


# ---------------------------------------------------------------------------
# کارتابل درخواست‌ها (مرخصی، وام، گواهی اشتغال ...) — آماده برای گردش‌کار
# ---------------------------------------------------------------------------


class LetterRequestType(BaseModel):
    """نوع درخواست کارتابل؛ تعریف‌ها قابل توسعه‌اند (مرخصی، وام، ...)."""

    code = models.CharField(max_length=40, verbose_name=_('کد'))
    name = models.CharField(max_length=150, verbose_name=_('عنوان'))
    icon = models.CharField(max_length=40, blank=True, default='', verbose_name=_('آیکون'))
    color = models.CharField(max_length=20, blank=True, default='#0ea5e9', verbose_name=_('رنگ'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))
    requires_attachment = models.BooleanField(default=False, verbose_name=_('نیازمند پیوست'))
    approval_levels = models.PositiveSmallIntegerField(default=1, verbose_name=_('تعداد سطوح تأیید'))
    order = models.PositiveIntegerField(default=0, verbose_name=_('ترتیب'))

    class Meta:
        verbose_name = _('نوع درخواست')
        verbose_name_plural = _('انواع درخواست')
        unique_together = [('company', 'code')]
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class LetterRequest(BaseModel):
    """درخواست اداری پرسنل در کارتابل مکاتبات (مرخصی/وام/گواهی/...)."""

    STATUS_CHOICES = [
        ('draft', _('پیش‌نویس')),
        ('submitted', _('ثبت‌شده / در انتظار بررسی')),
        ('in_review', _('در حال بررسی')),
        ('approved', _('تأییدشده')),
        ('rejected', _('ردشده')),
        ('canceled', _('لغوشده')),
    ]
    PRIORITY_CHOICES = Letter.PRIORITY_CHOICES
    OPEN_STATUSES = ('draft', 'submitted', 'in_review')

    number = models.CharField(max_length=60, blank=True, verbose_name=_('شماره درخواست'))
    request_type = models.ForeignKey(
        LetterRequestType, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='requests', verbose_name=_('نوع درخواست'),
    )
    request_type_title = models.CharField(
        max_length=150, blank=True, verbose_name=_('عنوان نوع (در زمان ثبت)'),
    )
    subject = models.CharField(max_length=300, verbose_name=_('موضوع'))
    description = models.TextField(blank=True, verbose_name=_('شرح درخواست'))
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='letter_requests', verbose_name=_('درخواست‌دهنده'),
    )
    requester_employee = models.ForeignKey(
        'employees.Employee', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='letter_requests', db_constraint=False,
        verbose_name=_('پرسنل درخواست‌دهنده'),
    )
    requester_name = models.CharField(max_length=200, blank=True, verbose_name=_('نام درخواست‌دهنده'))
    status = models.CharField(
        max_length=20, default='submitted', choices=STATUS_CHOICES, verbose_name=_('وضعیت'),
    )
    priority = models.CharField(
        max_length=20, default='normal', choices=PRIORITY_CHOICES, verbose_name=_('اولویت'),
    )
    requested_on = models.DateField(null=True, blank=True, verbose_name=_('تاریخ درخواست'))
    due_date = models.DateField(null=True, blank=True, verbose_name=_('مهلت بررسی'))
    payload = models.JSONField(
        default=dict, blank=True, verbose_name=_('اطلاعات تکمیلی'),
        help_text=_('فیلدهای اختصاصی هر نوع درخواست (مثلاً تعداد روز مرخصی یا مبلغ وام)'),
    )

    # --- زمینهٔ گردش‌کار (برای اتوماسیون آینده) ---
    current_step = models.PositiveSmallIntegerField(default=1, verbose_name=_('گام جاری'))
    total_steps = models.PositiveSmallIntegerField(default=1, verbose_name=_('تعداد گام‌ها'))
    current_assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_letter_requests', verbose_name=_('کارشناس جاری'),
    )
    current_assignee_employee = models.ForeignKey(
        'employees.Employee', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_letter_requests', db_constraint=False,
        verbose_name=_('پرسنل مسئول جاری'),
    )
    decided_on = models.DateField(null=True, blank=True, verbose_name=_('تاریخ تصمیم'))
    decision_note = models.TextField(blank=True, verbose_name=_('یادداشت تصمیم'))
    attachment = models.FileField(
        upload_to='correspondences/requests/%Y/%m/', null=True, blank=True,
        verbose_name=_('پیوست'),
    )
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان بستن'))

    class Meta:
        verbose_name = _('درخواست کارتابل')
        verbose_name_plural = _('درخواست‌های کارتابل')
        ordering = ['-created_at', '-id']
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['company', 'requester']),
        ]

    def __str__(self):
        return f"{self.number or 'بدون شماره'} - {self.subject}"

    @property
    def is_open(self):
        return self.status in self.OPEN_STATUSES

    @property
    def is_overdue(self):
        from datetime import date as _date
        if not self.due_date or self.status not in self.OPEN_STATUSES:
            return False
        return self.due_date < _date.today()


class LetterRequestEvent(BaseModel):
    """تاریخچهٔ درخواست کارتابل (ایجاد، ارجاع، یادداشت، تأیید/رد)."""

    ACTIONS = [
        ('created', _('ایجاد')),
        ('submitted', _('ثبت')),
        ('assigned', _('ارجاع')),
        ('noted', _('یادداشت')),
        ('approved', _('تأیید')),
        ('rejected', _('رد')),
        ('returned', _('برگشت')),
        ('canceled', _('لغو')),
    ]

    request = models.ForeignKey(
        LetterRequest, on_delete=models.CASCADE, related_name='events',
        verbose_name=_('درخواست'),
    )
    action = models.CharField(max_length=30, choices=ACTIONS, verbose_name=_('اقدام'))
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='letter_request_events', verbose_name=_('اقدام‌کننده'),
    )
    note = models.TextField(blank=True, verbose_name=_('توضیح'))
    meta = models.JSONField(default=dict, blank=True, verbose_name=_('اطلاعات تکمیلی'))

    class Meta:
        verbose_name = _('رویداد درخواست')
        verbose_name_plural = _('رویدادهای درخواست')
        ordering = ['-created_at', '-id']

    def __str__(self):
        return f"{self.request_id} - {self.get_action_display()}"

