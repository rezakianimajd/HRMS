"""
Models for the Employees module.
"""
from datetime import date
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


class Department(BaseModel):
    """
    Department / Organizational Unit.
    Supports hierarchical structure via self-referential parent.
    """
    name = models.CharField(
        max_length=200,
        verbose_name=_('نام دپارتمان'),
    )
    code = models.CharField(
        max_length=50,
        verbose_name=_('کد دپارتمان'),
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children',
        verbose_name=_('دپارتمان بالادستی'),
    )

    class Meta:
        verbose_name = _('دپارتمان')
        verbose_name_plural = _('دپارتمان‌ها')
        unique_together = [('company', 'code')]
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class WorkLocation(BaseModel):
    """
    Work Location / Site / Branch.
    """
    name = models.CharField(
        max_length=200,
        verbose_name=_('نام محل استقرار'),
    )
    code = models.CharField(
        max_length=50,
        verbose_name=_('کد محل'),
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name=_('توضیحات'),
    )

    class Meta:
        verbose_name = _('محل استقرار')
        verbose_name_plural = _('محل‌های استقرار')
        unique_together = [('company', 'code')]
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class JobTitle(BaseModel):
    """
    Job Title / Position with hierarchy support.
    """
    class Level(models.TextChoices):
        EXECUTIVE = 'executive', _('مدیریتی')
        EXPERT = 'expert', _('کارشناسی')
        OPERATIONAL = 'operational', _('عملیاتی')

    name = models.CharField(
        max_length=200,
        verbose_name=_('عنوان شغلی'),
    )
    code = models.CharField(
        max_length=50,
        verbose_name=_('کد شغل'),
    )
    level = models.CharField(
        max_length=20,
        choices=Level.choices,
        default=Level.EXPERT,
        verbose_name=_('سطح شغلی'),
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children',
        verbose_name=_('عنوان شغلی بالادستی'),
    )

    class Meta:
        verbose_name = _('عنوان شغلی')
        verbose_name_plural = _('عناوین شغلی')
        unique_together = [('company', 'code')]
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.get_level_display()})"


class ContractType(BaseModel):
    """
    Contract type (قرارداد) - dynamic, user-definable.
    """
    name = models.CharField(
        max_length=200,
        verbose_name=_('نام نوع قرارداد'),
    )
    code = models.CharField(
        max_length=50,
        verbose_name=_('کد'),
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name=_('توضیحات'),
    )

    class Meta:
        verbose_name = _('نوع قرارداد')
        verbose_name_plural = _('انواع قرارداد')
        unique_together = [('company', 'code')]
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class InsuranceList(BaseModel):
    """
    Insurance / Workshop list for social security.
    """
    name = models.CharField(
        max_length=200,
        verbose_name=_('نام لیست بیمه'),
    )
    code = models.CharField(
        max_length=50,
        verbose_name=_('کد کارگاهی'),
        help_text=_('کد کارگاهی در سازمان تأمین اجتماعی'),
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name=_('توضیحات'),
    )

    class Meta:
        verbose_name = _('لیست بیمه')
        verbose_name_plural = _('لیست‌های بیمه')
        unique_together = [('company', 'code')]
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class Employee(BaseModel):
    """
    Main Employee model with full personal, contact, and employment information.
    """
    # =========================================================================
    # Gender & Marital Status Choices
    # =========================================================================
    class Gender(models.TextChoices):
        MALE = 'male', _('مرد')
        FEMALE = 'female', _('زن')

    class MaritalStatus(models.TextChoices):
        SINGLE = 'single', _('مجرد')
        MARRIED = 'married', _('متأهل')
        DIVORCED = 'divorced', _('مطلقه')
        WIDOWED = 'widowed', _('همسر فوت‌شده')

    class EmploymentStatus(models.TextChoices):
        ACTIVE = 'active', _('شاغل')
        LEAVE = 'leave', _('مرخصی طولانی‌مدت')
        RETIRED = 'retired', _('بازنشسته')
        TERMINATED = 'terminated', _('اخراج')
        DECEASED = 'deceased', _('فوت')

    class WorkShift(models.TextChoices):
        MORNING = 'morning', _('صبح')
        EVENING = 'evening', _('عصر')
        ROTATING = 'rotating', _('شیفتی')
        IRREGULAR = 'irregular', _('نامنظم')

    # =========================================================================
    # الف) اطلاعات پایه (Personal Info)
    # =========================================================================
    first_name = models.CharField(
        max_length=50,
        verbose_name=_('نام'),
    )
    last_name = models.CharField(
        max_length=50,
        verbose_name=_('نام خانوادگی'),
    )
    photo = models.ImageField(
        upload_to='employee_photos/',
        blank=True,
        null=True,
        verbose_name=_('عکس پرسنلی'),
    )
    national_id = models.CharField(
        max_length=10,
        verbose_name=_('کد ملی'),
    )
    birth_date = models.DateField(
        verbose_name=_('تاریخ تولد'),
    )
    birth_place = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_('محل تولد'),
    )
    gender = models.CharField(
        max_length=10,
        choices=Gender.choices,
        blank=True,
        null=True,
        verbose_name=_('جنسیت'),
    )
    marital_status = models.CharField(
        max_length=20,
        choices=MaritalStatus.choices,
        blank=True,
        null=True,
        verbose_name=_('وضعیت تأهل'),
    )
    children_count = models.PositiveIntegerField(
        default=0,
        verbose_name=_('تعداد فرزندان'),
    )
    spouse_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_('نام همسر'),
    )
    father_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_('نام پدر'),
    )
    birth_certificate_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name=_('شماره شناسنامه'),
    )
    national_id_serial = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name=_('سریال شناسنامه'),
    )
    national_id_place = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_('محل صدور شناسنامه'),
    )
    national_id_date = models.DateField(
        blank=True,
        null=True,
        verbose_name=_('تاریخ صدور شناسنامه'),
    )

    # =========================================================================
    # ب) اطلاعات تماس و آدرس (Contact Info)
    # =========================================================================
    phone = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        verbose_name=_('تلفن ثابت'),
    )
    mobile = models.CharField(
        max_length=15,
        verbose_name=_('موبایل'),
    )
    email = models.EmailField(
        blank=True,
        null=True,
        verbose_name=_('ایمیل'),
    )
    address = models.TextField(
        blank=True,
        null=True,
        verbose_name=_('آدرس'),
    )
    city = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_('شهر'),
    )
    postal_code = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        verbose_name=_('کد پستی'),
    )
    emergency_contact_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_('نام فرد مورد تماس اضطراری'),
    )
    emergency_contact_phone = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        verbose_name=_('تلفن اضطراری'),
    )

    # =========================================================================
    # ج) اطلاعات شغلی (Employment Info)
    # =========================================================================
    employee_id = models.CharField(
        max_length=20,
        verbose_name=_('کد پرسنلی'),
    )
    hire_date = models.DateField(
        verbose_name=_('تاریخ استخدام'),
    )
    probation_end_date = models.DateField(
        blank=True,
        null=True,
        verbose_name=_('تاریخ پایان دوره آزمایشی'),
    )
    official_date = models.DateField(
        blank=True,
        null=True,
        verbose_name=_('تاریخ رسمی شدن'),
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='employees',
        verbose_name=_('دپارتمان'),
    )
    job_title = models.ForeignKey(
        JobTitle,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='employees',
        verbose_name=_('عنوان شغلی'),
    )
    work_location = models.ForeignKey(
        WorkLocation,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='employees',
        verbose_name=_('محل استقرار'),
    )
    insurance_list = models.ForeignKey(
        InsuranceList,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='employees',
        verbose_name=_('لیست بیمه'),
    )
    insurance_number = models.CharField(
        max_length=30,
        blank=True,
        null=True,
        verbose_name=_('شماره بیمه'),
    )
    contract_type = models.ForeignKey(
        ContractType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employees',
        verbose_name=_('نوع قرارداد'),
    )
    contract_start_date = models.DateField(
        blank=True,
        null=True,
        verbose_name=_('تاریخ شروع قرارداد'),
    )
    contract_end_date = models.DateField(
        blank=True,
        null=True,
        verbose_name=_('تاریخ پایان قرارداد'),
    )
    status = models.CharField(
        max_length=20,
        choices=EmploymentStatus.choices,
        default=EmploymentStatus.ACTIVE,
        verbose_name=_('وضعیت'),
    )
    status_change_date = models.DateField(
        blank=True,
        null=True,
        verbose_name=_('تاریخ تغییر وضعیت'),
    )
    work_shift = models.CharField(
        max_length=20,
        choices=WorkShift.choices,
        blank=True,
        null=True,
        verbose_name=_('نوبت کاری'),
    )
    work_start_time = models.CharField(
        max_length=5,
        blank=True,
        null=True,
        verbose_name=_('ساعت شروع کار'),
        help_text=_('فرمت ۲۴ ساعته: مثال ۰۸:۰۰'),
    )
    work_end_time = models.CharField(
        max_length=5,
        blank=True,
        null=True,
        verbose_name=_('ساعت پایان کار'),
        help_text=_('فرمت ۲۴ ساعته: مثال ۱۶:۰۰'),
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name=_('توضیحات'),
    )

    # =========================================================================
    # Evaluation fields (امتیازدهی و ارزیابی کارکنان)
    # =========================================================================
    class EducationLevel(models.TextChoices):
        UNDER_DIPLOMA = 'under_diploma', _('زیر دیپلم')
        DIPLOMA = 'diploma', _('دیپلم')
        ASSOCIATE = 'associate', _('کاردانی')
        BACHELOR = 'bachelor', _('کارشناسی')
        MASTER = 'master', _('کارشناسی ارشد')
        PHD = 'phd', _('دکتری')

    education_level = models.CharField(
        max_length=20,
        choices=EducationLevel.choices,
        blank=True,
        null=True,
        verbose_name=_('میزان تحصیلات'),
    )
    education_field = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name=_('رشته / مدرک تحصیلی'),
    )
    education_place = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name=_('محل اخذ مدرک تحصیلی'),
    )

    class UniversityType(models.TextChoices):
        STATE = 'state', _('دولتی')
        AZAD = 'azad', _('آزاد')
        PAYAM = 'payam_noor', _('پیام نور')
        NONPROFIT = 'nonprofit', _('غیرانتفاعی')
        TECHNICAL = 'technical', _('فنی و حرفه‌ای')
        OTHER = 'other', _('سایر')

    university_type = models.CharField(
        max_length=20,
        choices=UniversityType.choices,
        blank=True,
        null=True,
        verbose_name=_('نوع دانشگاه'),
    )

    distance_to_work_km = models.PositiveIntegerField(
        default=0,
        verbose_name=_('مسافت خانه تا محل کار (کیلومتر)'),
    )

    class HousingType(models.TextChoices):
        OWNED = 'owned', _('شخصی')
        MORTGAGE = 'mortgage', _('رهن')
        RENTAL = 'rental', _('اجاره')

    housing_type = models.CharField(
        max_length=20,
        choices=HousingType.choices,
        blank=True,
        null=True,
        verbose_name=_('نوع مسکن'),
    )
    has_car = models.BooleanField(
        default=False,
        verbose_name=_('دارای خودروی شخصی'),
    )
    performance_score = models.DecimalField(
        max_digits=5,
        decimal_places=1,
        blank=True,
        null=True,
        verbose_name=_('نمره عملکرد'),
        help_text=_('۰ تا ۱۰۰ — از ارزیابی‌های دوره‌ای'),
    )
    satisfaction_score = models.DecimalField(
        max_digits=5,
        decimal_places=1,
        blank=True,
        null=True,
        verbose_name=_('نمره رضایت شغلی'),
        help_text=_('۰ تا ۱۰۰ — از پرسشنامه‌های ارزیابی'),
    )

    # =========================================================================
    # اطلاعات بانکی (Banking Info)
    # =========================================================================
    bank_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_('بانک'),
    )
    account_number = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name=_('شماره حساب'),
    )
    sheba_number = models.CharField(
        max_length=30,
        blank=True,
        null=True,
        verbose_name=_('شماره شبا'),
    )

    # =========================================================================
    # Meta & Constraints
    # =========================================================================
    class Meta:
        verbose_name = _('پرسنل')
        verbose_name_plural = _('پرسنل')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['company', 'department']),
            models.Index(fields=['company', 'employee_id']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'national_id'],
                name='unique_company_national_id',
            ),
            models.UniqueConstraint(
                fields=['company', 'employee_id'],
                name='unique_company_employee_id',
            ),
            models.UniqueConstraint(
                fields=['company', 'mobile'],
                name='unique_company_mobile',
            ),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.employee_id})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class WorkExperience(BaseModel):
    """
    سوابق کاری پیشین کارمند (خارج از سازمان فعلی).
    """
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='work_experiences',
        verbose_name=_('پرسنل'),
    )
    company_name = models.CharField(
        max_length=200,
        verbose_name=_('نام شرکت / سازمان'),
    )
    job_title = models.CharField(
        max_length=200,
        blank=True,
        verbose_name=_('عنوان شغلی'),
    )
    start_date = models.DateField(
        verbose_name=_('تاریخ شروع'),
    )
    end_date = models.DateField(
        blank=True,
        null=True,
        verbose_name=_('تاریخ پایان'),
    )
    description = models.TextField(
        blank=True,
        verbose_name=_('شرح وظایف / توضیحات'),
    )

    class Meta:
        verbose_name = _('سابقه کاری')
        verbose_name_plural = _('سوابق کاری')
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.employee.full_name} - {self.company_name} ({self.start_date})"

    @property
    def duration_years(self):
        """مدت این سابقه به سال.
        سابقه پیش‌گفته مربوط به «قبل از استخدام» است؛ در نتیجه حتی اگر
        تاریخ پایانی ثبت نشده باشد، سقف آن تاریخ استخدامِ کارمند است.
        """
        end = self.end_date or (self.employee.hire_date or date.today())
        if self.employee.hire_date and end > self.employee.hire_date:
            end = self.employee.hire_date
        days = (end - self.start_date).days
        return max(0, round(days / 365.25, 1))


class EmployeePenalty(BaseModel):
    """
    جرائم / کسورات انضباطی کارمند (برای امتیازدهی).
    """
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='penalties',
        verbose_name=_('پرسنل'),
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        default=0,
        verbose_name=_('مبلغ جریمه (ریال)'),
    )
    reason = models.CharField(
        max_length=200,
        blank=True,
        verbose_name=_('دلیل جریمه'),
    )
    date = models.DateField(
        verbose_name=_('تاریخ جریمه'),
    )

    class Meta:
        verbose_name = _('جریمه پرسنلی')
        verbose_name_plural = _('جرائم پرسنلی')
        ordering = ['-date']

    def __str__(self):
        return f"{self.employee.full_name} - {self.amount} ({self.date})"


class EmploymentChange(BaseModel):
    """
    Employment change history (job title, department, location, salary, contract).
    Mirrors "Job Change History" from large HR suites.
    """

    class ChangeType(models.TextChoices):
        HIRE = 'hire', _('استخدام')
        PROMOTION = 'promotion', _('ارتقا / ترفیع')
        DEMOTION = 'demotion', _('تنزل مقام')
        JOB_TITLE_CHANGE = 'job_title_change', _('تغییر عنوان شغلی')
        DEPARTMENT_CHANGE = 'department_change', _('تغییر دپارتمان')
        LOCATION_CHANGE = 'location_change', _('تغییر محل کار')
        SALARY_INCREASE = 'salary_increase', _('افزایش حقوق')
        SALARY_DECREASE = 'salary_decrease', _('کاهش حقوق')
        CONTRACT_RENEWAL = 'contract_renewal', _('تمدید قرارداد')
        CONTRACT_TERMINATION = 'contract_termination', _('پایان قرارداد')
        STATUS_CHANGE = 'status_change', _('تغییر وضعیت استخدامی')
        OTHER = 'other', _('سایر')

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='employment_changes',
        verbose_name=_('پرسنل'),
    )
    change_type = models.CharField(
        max_length=30,
        choices=ChangeType.choices,
        verbose_name=_('نوع تغییر'),
    )
    effective_date = models.DateField(verbose_name=_('تاریخ اعمال تغییر'))
    year = models.PositiveIntegerField(verbose_name=_('سال تغییر'))
    old_value = models.CharField(max_length=200, blank=True, verbose_name=_('مقدار قبلی'))
    new_value = models.CharField(max_length=200, blank=True, verbose_name=_('مقدار جدید'))
    amount = models.DecimalField(
        max_digits=15, decimal_places=0, null=True, blank=True,
        verbose_name=_('مبلغ تغییر (ریال)'),
        help_text=_('برای تغییرات حقوقی'),
    )
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('تغییر شغلی')
        verbose_name_plural = _('تغییرات شغلی')
        ordering = ['-effective_date', '-created_at']
        indexes = [
            models.Index(fields=['company', 'employee', 'year']),
            models.Index(fields=['company', 'change_type']),
        ]

    def __str__(self):
        return f"{self.employee.full_name} - {self.get_change_type_display()} ({self.effective_date})"


class ContractVersion(BaseModel):
    """
    Versioned employment contracts, grouped by year.
    Mirrors "versioned documents" in enterprise systems.
    """

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='contract_versions',
        verbose_name=_('پرسنل'),
    )
    version = models.PositiveIntegerField(default=1, verbose_name=_('نسخه قرارداد'))
    year = models.PositiveIntegerField(verbose_name=_('سال قرارداد'))
    contract_type = models.ForeignKey(
        ContractType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contract_versions',
        verbose_name=_('نوع قرارداد'),
    )
    start_date = models.DateField(verbose_name=_('تاریخ شروع'))
    end_date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ پایان'))
    base_salary = models.DecimalField(
        max_digits=15, decimal_places=0, null=True, blank=True,
        verbose_name=_('حقوق پایه (ریال)'),
    )
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('نسخه قرارداد')
        verbose_name_plural = _('نسخه‌های قرارداد')
        ordering = ['-year', '-version']
        unique_together = [('company', 'employee', 'year', 'version')]
        indexes = [
            models.Index(fields=['company', 'employee', 'year']),
        ]

    def __str__(self):
        return f"{self.employee.full_name} - نسخه {self.version} ({self.year})"


class SupplementaryInsurance(BaseModel):
    """
    بیمه تکمیلی کارکنان (درمان، بازنشستگی تکمیلی و ...).
    """
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='supplementary_insurances',
        verbose_name=_('پرسنل'),
    )
    insurance_name = models.CharField(
        max_length=200,
        verbose_name=_('نام بیمه تکمیلی'),
    )
    insurance_type = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_('نوع بیمه تکمیلی'),
    )
    plan = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name=_('طرح انتخابی'),
    )
    start_date = models.DateField(
        verbose_name=_('تاریخ شروع'),
    )
    end_date = models.DateField(
        blank=True,
        null=True,
        verbose_name=_('تاریخ خاتمه'),
    )
    monthly_amount = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        default=0,
        verbose_name=_('مبلغ ماهانه (ریال)'),
    )
    total_amount = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        default=0,
        verbose_name=_('مبلغ کل (ریال)'),
    )

    class Meta:
        verbose_name = _('بیمه تکمیلی')
        verbose_name_plural = _('بیمه‌های تکمیلی')
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.employee.full_name} - {self.insurance_name}"


class SupplementaryInsuranceDependent(models.Model):
    """
    افراد تحت تکفل بیمه تکمیلی.
    """
    insurance = models.ForeignKey(
        SupplementaryInsurance,
        on_delete=models.CASCADE,
        related_name='dependents',
        verbose_name=_('بیمه تکمیلی'),
    )
    first_name = models.CharField(
        max_length=100,
        verbose_name=_('نام'),
    )
    last_name = models.CharField(
        max_length=100,
        verbose_name=_('نام خانوادگی'),
    )
    relation = models.CharField(
        max_length=50,
        verbose_name=_('نسبت'),
        choices=[
            ('spouse', _('همسر')),
            ('child', _('فرزند')),
            ('father', _('پدر')),
            ('mother', _('مادر')),
            ('other', _('سایر')),
        ],
    )

    class Meta:
        verbose_name = _('فرد تحت تکفل')
        verbose_name_plural = _('افراد تحت تکفل')
        ordering = ['id']

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.get_relation_display()})"
