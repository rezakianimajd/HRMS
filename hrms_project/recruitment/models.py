"""Recruitment & candidate pipeline models."""
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


class JobRequisition(BaseModel):
    """An approved hiring request (job opening)."""

    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        OPEN = 'open', _('باز')
        ON_HOLD = 'on_hold', _('متوقف')
        CLOSED = 'closed', _('بسته')

    title = models.CharField(max_length=200, verbose_name=_('عنوان شغلی'))
    department = models.ForeignKey(
        'employees.Department', on_delete=models.PROTECT,
        null=True, blank=True, related_name='requisitions', verbose_name=_('دپارتمان'),
    )
    job_title = models.ForeignKey(
        'employees.JobTitle', on_delete=models.PROTECT,
        null=True, blank=True, related_name='requisitions', verbose_name=_('عنوان سازمانی'),
    )
    work_location = models.ForeignKey(
        'employees.WorkLocation', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='requisitions', verbose_name=_('محل خدمت'),
    )
    headcount = models.PositiveIntegerField(default=1, verbose_name=_('تعداد نیروی مورد نیاز'))
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    reason = models.TextField(blank=True, verbose_name=_('دلیل استخدام'))
    responsibilities = models.TextField(blank=True, verbose_name=_('شرح وظایف'))
    requirements = models.TextField(blank=True, verbose_name=_('شرایط احراز'))
    requested_by = models.CharField(max_length=200, blank=True, verbose_name=_('درخواست‌دهنده'))
    requested_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ درخواست'))
    budget_salary = models.DecimalField(max_digits=15, decimal_places=0, null=True, blank=True, verbose_name=_('سقف پیشنهادی حقوق'))

    class Meta:
        verbose_name = _('درخواست استخدام')
        verbose_name_plural = _('درخواست‌های استخدام')
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Candidate(BaseModel):
    """A candidate within the hiring pipeline."""

    class Stage(models.TextChoices):
        APPLIED = 'applied', _('دریافت رزومه')
        SCREENING = 'screening', _('غربالگری')
        INTERVIEW = 'interview', _('مصاحبه')
        ASSESSMENT = 'assessment', _('ارزیابی فنی')
        OFFER = 'offer', _('پیشنهاد همکاری')
        HIRED = 'hired', _('استخدام شده')
        REJECTED = 'rejected', _('رد شده')

    requisition = models.ForeignKey(
        JobRequisition, on_delete=models.CASCADE, related_name='candidates', verbose_name=_('درخواست استخدام'),
    )
    first_name = models.CharField(max_length=100, verbose_name=_('نام'))
    last_name = models.CharField(max_length=100, verbose_name=_('نام خانوادگی'))
    national_id = models.CharField(max_length=10, blank=True, verbose_name=_('کد ملی'))
    mobile = models.CharField(max_length=15, blank=True, verbose_name=_('موبایل'))
    email = models.EmailField(blank=True, verbose_name=_('ایمیل'))
    resume = models.FileField(upload_to='candidate_resumes/', null=True, blank=True, verbose_name=_('رزومه'))
    stage = models.CharField(max_length=20, choices=Stage.choices, default=Stage.APPLIED, verbose_name=_('مرحله'))
    rating = models.PositiveSmallIntegerField(default=0, verbose_name=_('امتیاز (۰-۱۰۰)'))
    notes = models.TextField(blank=True, verbose_name=_('یادداشت'))
    source = models.CharField(max_length=100, blank=True, verbose_name=_('منبع جذب'))
    expected_salary = models.DecimalField(max_digits=15, decimal_places=0, null=True, blank=True, verbose_name=_('حقوق پیشنهادی متقاضی'))

    class Meta:
        verbose_name = _('کاندید')
        verbose_name_plural = _('کاندیدها')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.first_name} {self.last_name}'


class Interview(BaseModel):
    """An interview/assessment event for a candidate."""

    class Outcome(models.TextChoices):
        PASS = 'pass', _('قبول')
        FAIL = 'fail', _('رد')
        PENDING = 'pending', _('در انتظار')

    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='interviews', verbose_name=_('کاندید'))
    interviewer = models.CharField(max_length=200, blank=True, verbose_name=_('مصاحبه‌کننده'))
    interview_date = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان مصاحبه'))
    outcome = models.CharField(max_length=20, choices=Outcome.choices, default=Outcome.PENDING, verbose_name=_('نتیجه'))
    score = models.PositiveSmallIntegerField(default=0, verbose_name=_('امتیاز (۰-۱۰۰)'))
    comments = models.TextField(blank=True, verbose_name=_('نظرات'))

    class Meta:
        verbose_name = _('مصاحبه')
        verbose_name_plural = _('مصاحبه‌ها')
        ordering = ['-interview_date']

    def __str__(self):
        return f'{self.candidate} — {self.get_outcome_display()}'