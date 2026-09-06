"""Models for the Correspondences module."""
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
