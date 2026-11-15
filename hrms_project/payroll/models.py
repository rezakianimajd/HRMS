"""Models for the Payroll module."""
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base_model import BaseModel


class EmployeeTransaction(BaseModel):
    """
    Unified model for all employee transactions:
    - Leave (مرخصی)
    - Absence (غیبت)
    - Welfare benefit (مزایای رفاهی)
    - Paid salary (حقوق پرداختی)
    - Deduction (کسورات)
    """

    class TransactionType(models.TextChoices):
        LEAVE = 'leave', _('مرخصی')
        ABSENCE = 'absence', _('غیبت')
        BENEFIT = 'benefit', _('مزایای رفاهی')
        SALARY = 'salary', _('حقوق پرداختی')
        DEDUCTION = 'deduction', _('کسورات')

    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='transactions',
        verbose_name=_('پرسنل'),
    )
    transaction_type = models.CharField(
        max_length=20,
        choices=TransactionType.choices,
        verbose_name=_('نوع تراکنش'),
    )
    sub_type = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_('زیرنوع'),
        help_text=_('مثلاً: مرخصی استحقاقی، استعلاجی، عیدی، مالیات'),
    )
    title = models.CharField(
        max_length=200,
        blank=True,
        verbose_name=_('عنوان'),
        help_text=_('عنوان اختیاری تراکنش'),
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        default=0,
        verbose_name=_('مبلغ (ریال)'),
        help_text=_('برای حقوق، مزایا، کسورات'),
    )
    quantity = models.DecimalField(
        max_digits=8,
        decimal_places=1,
        default=0,
        verbose_name=_('مقدار'),
        help_text=_('روز برای مرخصی/غیبت، تعداد برای مزایا'),
    )
    date = models.DateField(
        verbose_name=_('تاریخ'),
    )
    start_date = models.DateField(
        blank=True,
        null=True,
        verbose_name=_('تاریخ شروع'),
        help_text=_('برای مرخصی/غیبت چندروزه'),
    )
    end_date = models.DateField(
        blank=True,
        null=True,
        verbose_name=_('تاریخ پایان'),
        help_text=_('برای مرخصی/غیبت چندروزه'),
    )
    period = models.CharField(
        max_length=20,
        blank=True,
        verbose_name=_('دوره'),
        help_text=_('مثلاً: ۱۴۰۴/۰۶ برای حقوق ماهانه'),
    )
    reference_number = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_('شماره مرجع / فیش'),
    )
    description = models.TextField(
        blank=True,
        verbose_name=_('توضیحات'),
    )

    class Meta:
        verbose_name = _('تراکنش پرسنلی')
        verbose_name_plural = _('تراکنش‌های پرسنلی')
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['company', 'employee', 'transaction_type']),
            models.Index(fields=['company', 'transaction_type']),
            models.Index(fields=['company', 'date']),
        ]

    def __str__(self):
        return f"{self.get_transaction_type_display()} - {self.employee.full_name} ({self.date})"


class SalaryRecord(BaseModel):
    """
    Comprehensive monthly salary record for an employee.
    Organized by year and month. Contains all earning and deduction items.
    """

    class Month(models.TextChoices):
        FARVARDIN = '1', _('فروردین')
        ORDIBEHESHT = '2', _('اردیبهشت')
        KHORDAD = '3', _('خرداد')
        TIR = '4', _('تیر')
        MORDAD = '5', _('مرداد')
        SHAHRIVAR = '6', _('شهریور')
        MEHR = '7', _('مهر')
        ABAN = '8', _('آبان')
        AZAR = '9', _('آذر')
        DEY = '10', _('دی')
        BAHMAN = '11', _('بهمن')
        ESFAND = '12', _('اسفند')

    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='salary_records',
        verbose_name=_('پرسنل'),
    )
    year = models.PositiveIntegerField(verbose_name=_('سال'))
    month = models.CharField(
        max_length=2,
        choices=Month.choices,
        verbose_name=_('ماه'),
    )

    # --- Work & hours ---
    work_days = models.DecimalField(max_digits=6, decimal_places=1, default=0, verbose_name=_('کارکرد (روز)'))
    overtime_hours = models.DecimalField(max_digits=6, decimal_places=1, default=0, verbose_name=_('ساعت اضافه‌کار'))

    # --- Earnings ---
    base_salary = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('حقوق پایه'))
    overtime_pay = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('اضافه‌کاری'))
    night_shift = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('شب‌کاری'))
    shift_work = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('نوبت‌کاری'))
    attraction_allowance = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('حق جذب'))
    supervision_allowance = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('حق سرپرستی'))
    workshop_mission = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('ماموریت کارگاهی'))
    seniority_base = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('پایه سنوات'))
    job_allowance = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('فوق‌العاده شغل'))
    hardship_allowance = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('سختی کار'))
    travel_cost = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('هزینه سفر'))
    housing_allowance = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('حق مسکن'))
    marriage_allowance = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('حق تأهل'))
    children_allowance = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('حق اولاد'))
    meal_voucher = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('بن کارکنان'))
    deferred_salary_1 = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('حقوق معوقه ۱'))
    deferred_salary_2 = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('حقوق معوقه ۲'))
    bonus_reserve = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('عیدی و ذخیره'))
    other_benefits = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('سایر مزایا'))
    mission_days = models.DecimalField(max_digits=6, decimal_places=1, default=0, verbose_name=_('روز مأموریت'))
    mission_allowance = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('حق مأموریت'))

    # --- Computed totals ---
    total_benefits = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('جمع حقوق و مزایا'))

    # --- Insurance ---
    insurance_subject = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('مشمول بیمه'))
    employer_insurance = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('حق بیمه سهم کارفرما'))
    employee_insurance = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('حق بیمه سهم پرسنل'))

    # --- Deductions ---
    tax = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('مالیات'))
    advance = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('مساعده'))
    supplementary_insurance = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('بیمه تکمیلی'))
    employee_loan = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('وام کارکنان'))
    work_deduction = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('کسر کار'))
    total_deductions = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('جمع کسور'))

    # --- Net ---
    net_payable = models.DecimalField(max_digits=15, decimal_places=0, default=0, verbose_name=_('قابل پرداخت'))

    class Meta:
        verbose_name = _('فیش حقوقی')
        verbose_name_plural = _('فیش‌های حقوقی')
        ordering = ['-year', '-month', 'employee__employee_id']
        unique_together = [('company', 'employee', 'year', 'month')]
        indexes = [
            models.Index(fields=['company', 'year', 'month']),
            models.Index(fields=['company', 'employee']),
        ]

    def __str__(self):
        return f"{self.employee.full_name} - {self.year}/{self.get_month_display()}"

    def calculate_totals(self):
        """Compute total benefits, deductions, and net payable."""
        earning_fields = [
            'base_salary', 'overtime_pay', 'night_shift', 'shift_work',
            'attraction_allowance', 'supervision_allowance', 'workshop_mission',
            'seniority_base', 'job_allowance', 'hardship_allowance', 'travel_cost',
            'housing_allowance', 'marriage_allowance', 'children_allowance',
            'meal_voucher', 'deferred_salary_1', 'deferred_salary_2',
            'bonus_reserve', 'other_benefits', 'mission_allowance',
        ]
        deduction_fields = [
            'employee_insurance', 'tax', 'advance', 'supplementary_insurance',
            'employee_loan', 'work_deduction',
        ]
        self.total_benefits = sum(getattr(self, f) or 0 for f in earning_fields)
        self.total_deductions = sum(getattr(self, f) or 0 for f in deduction_fields)
        self.net_payable = self.total_benefits - self.total_deductions
        return self


class BenefitRecord(BaseModel):
    """
    Welfare benefit record for an employee, organized by year and month.
    """

    class Month(models.TextChoices):
        FARVARDIN = '1', _('فروردین')
        ORDIBEHESHT = '2', _('اردیبهشت')
        KHORDAD = '3', _('خرداد')
        TIR = '4', _('تیر')
        MORDAD = '5', _('مرداد')
        SHAHRIVAR = '6', _('شهریور')
        MEHR = '7', _('مهر')
        ABAN = '8', _('آبان')
        AZAR = '9', _('آذر')
        DEY = '10', _('دی')
        BAHMAN = '11', _('بهمن')
        ESFAND = '12', _('اسفند')

    class BenefitType(models.TextChoices):
        PERFORMANCE = 'performance', _('کارانه')
        EID_FITR = 'eid_fitr', _('عید سعید فطر')
        EID_ADHA = 'eid_adha', _('عید سعید قربان')
        EID_GHADIR = 'eid_ghadir', _('عید سعید غدیر خم')
        IMAM_REZA_BIRTHDAY = 'imam_reza_birthday', _('تولد امام رضا (ع)')
        SPORTS_ALLOWANCE = 'sports_allowance', _('کمک هزینه ورزش')
        YALDA_NIGHT = 'yalda_night', _('شب یلدا')
        BAHMAN_22 = 'bahman_22', _('۲۲ بهمن')
        EID_MABATH = 'eid_mabath', _('عید مبعث')
        NOWRUZ_BASKET = 'nowruz_basket', _('سبد نوروزی')
        FATIMA_BIRTHDAY = 'fatima_birthday', _('تولد حضرت زهرا (س) و روز زن')
        ALI_BIRTHDAY = 'ali_birthday', _('تولد حضرت علی (ع) و روز مرد')
        ALLOWANCE = 'allowance', _('کمک هزینه')
        BIRTHDAY = 'birthday', _('زادروز')
        RAMADAN_BASKET = 'ramadan_basket', _('سبد ماه مبارک رمضان')

    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='benefit_records',
        verbose_name=_('پرسنل'),
    )
    year = models.PositiveIntegerField(verbose_name=_('سال'))
    month = models.CharField(
        max_length=2,
        choices=Month.choices,
        verbose_name=_('ماه'),
    )
    benefit_type = models.CharField(
        max_length=30,
        verbose_name=_('نوع مزایای رفاهی'),
        help_text=_('کد نوع مزایا از تعاریف اولیهٔ منابع انسانی'),
    )
    gross_amount = models.DecimalField(
        max_digits=15, decimal_places=0, default=0,
        verbose_name=_('مبلغ ناخالص'),
    )
    reserved_tax = models.DecimalField(
        max_digits=15, decimal_places=0, default=0,
        verbose_name=_('مالیات ذخیره شده'),
    )
    paid_amount = models.DecimalField(
        max_digits=15, decimal_places=0, default=0,
        verbose_name=_('مبلغ پرداخت شده'),
    )

    class Meta:
        verbose_name = _('مزایا')
        verbose_name_plural = _('مزایا')
        ordering = ['-year', '-month', 'employee__employee_id']
        unique_together = [('company', 'employee', 'year', 'month', 'benefit_type')]
        indexes = [
            models.Index(fields=['company', 'year', 'month']),
            models.Index(fields=['company', 'employee']),
            models.Index(fields=['company', 'benefit_type']),
        ]

    def __str__(self):
        return f"{self.employee.full_name} - {self.benefit_type} ({self.year}/{self.get_month_display()})"


class BenefitTypeDefinition(BaseModel):
    """تعریف نوع مزایای رفاهی: کد، عنوان و تاریخ پیشنهادی پرداخت.

    این مدل «منبع یگانه» گزینه‌های فیلد «نوع مزایا» در صفحهٔ پرداخت مزایا و
    مبنای یادآوری تاریخ‌های نزدیک در داشبورد منابع انسانی است.
    """

    code = models.CharField(
        max_length=30,
        verbose_name=_('کد'),
        help_text=_('کد یکتا برای استفاده در رکوردهای پرداخت (مثلاً performance)'),
    )
    title = models.CharField(
        max_length=150,
        verbose_name=_('نوع مزایا'),
    )
    suggested_date = models.DateField(
        blank=True,
        null=True,
        verbose_name=_('تاریخ پیشنهادی'),
        help_text=_('تاریخ پیشنهادی پرداخت این نوع مزایا (هر سال تکرار می‌شود)'),
    )
    note = models.CharField(
        max_length=250,
        blank=True,
        verbose_name=_('توضیحات'),
    )

    class Meta:
        verbose_name = _('نوع مزایا')
        verbose_name_plural = _('انواع مزایا')
        ordering = ['title']
        constraints = [
            models.UniqueConstraint(fields=['company', 'code'], name='unique_company_benefit_type_code'),
        ]

    def __str__(self):
        return f'{self.code} - {self.title}'


class EmployeeLoan(BaseModel):
    """
    Loan / facility given to an employee.
    Records total amount, instalments, status and purpose so HR can manage
    loans across the company and track outstanding balances.
    """

    class LoanType(models.TextChoices):
        QARZ = 'qarz', _('وام قرض‌الحسنه')
        CAR = 'car', _('وام خودرو')
        HOUSING = 'housing', _('وام مسکن')
        URGENT = 'urgent', _('وام ضروری')
        OTHER = 'other', _('سایر')

    class LoanStatus(models.TextChoices):
        ACTIVE = 'active', _('فعال')
        PAID = 'paid', _('تسویه‌شده')
        CANCELLED = 'cancelled', _('لغو شده')

    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='loans',
        verbose_name=_('پرسنل'),
    )
    loan_type = models.CharField(
        max_length=30,
        choices=LoanType.choices,
        default=LoanType.QARZ,
        verbose_name=_('نوع وام'),
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        verbose_name=_('مبلغ کل وام'),
    )
    installment_count = models.PositiveIntegerField(
        default=1,
        verbose_name=_('تعداد اقساط'),
    )
    installment_amount = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        default=0,
        verbose_name=_('مبلغ هر قسط'),
    )
    grant_date = models.DateField(
        verbose_name=_('تاریخ اعطای وام'),
    )
    due_date = models.DateField(
        null=True,
        blank=True,
        verbose_name=_('تاریخ سررسید/تسویه'),
        help_text=_('اختیاری — تاریخ نهایی تسویه'),
    )
    status = models.CharField(
        max_length=20,
        choices=LoanStatus.choices,
        default=LoanStatus.ACTIVE,
        verbose_name=_('وضعیت'),
    )
    description = models.TextField(
        blank=True,
        verbose_name=_('شرح / کاربری'),
    )

    class Meta:
        verbose_name = _('وام و تسهیلات')
        verbose_name_plural = _('وام‌ها و تسهیلات')
        ordering = ['-grant_date']

    def __str__(self):
        return f"{self.employee.full_name} - {self.get_loan_type_display()} ({self.amount})"


# =============================================================================
# Payroll core — period, components, legal rules, results and integrations
# =============================================================================
# Additive models: legacy SalaryRecord / BenefitRecord remain for history.
# Employee/HR is the single master source of identity and employment data.


class PayrollSettings(BaseModel):
    """Configurable payroll policy (no legal rates are hard-coded in code)."""

    work_days_per_month = models.DecimalField(
        max_digits=5, decimal_places=1, default=30, verbose_name=_('روز کاری ماه'),
    )
    work_hours_per_day = models.DecimalField(
        max_digits=5, decimal_places=2, default=8, verbose_name=_('ساعت کاری روز'),
    )
    overtime_rate = models.DecimalField(
        max_digits=6, decimal_places=3, default=1.4, verbose_name=_('ضریب اضافه‌کاری'),
    )
    night_rate = models.DecimalField(
        max_digits=6, decimal_places=3, default=1.35, verbose_name=_('ضریب شب‌کاری'),
    )
    holiday_rate = models.DecimalField(
        max_digits=6, decimal_places=3, default=2, verbose_name=_('ضریب تعطیل‌کاری'),
    )
    shift_rate = models.DecimalField(
        max_digits=6, decimal_places=3, default=1.1, verbose_name=_('ضریب نوبت‌کاری'),
    )
    insurance_employee_rate = models.DecimalField(
        max_digits=6, decimal_places=2, default=0, verbose_name=_('نرخ بیمه سهم کارمند (٪)'),
    )
    insurance_employer_rate = models.DecimalField(
        max_digits=6, decimal_places=2, default=0, verbose_name=_('نرخ بیمه سهم کارفرما (٪)'),
    )
    insurance_min_base = models.DecimalField(
        max_digits=18, decimal_places=2, default=0, verbose_name=_('کف مبنای بیمه'),
    )
    insurance_max_base = models.DecimalField(
        max_digits=18, decimal_places=2, default=0,
        verbose_name=_('سقف مبنای بیمه'), help_text=_('صفر یعنی بدون سقف'),
    )
    tax_exemption_monthly = models.DecimalField(
        max_digits=18, decimal_places=2, default=0, verbose_name=_('معافیت مالیاتی ماهانه'),
    )
    tax_deduct_employee_insurance = models.BooleanField(
        default=True, verbose_name=_('کسر بیمهٔ سهم کارمند از مبنای مالیات'),
    )
    include_unapproved_overtime = models.BooleanField(
        default=False, verbose_name=_('احتساب اضافه‌کاری تأییدنشده'),
    )
    annual_leave_days = models.DecimalField(
        max_digits=5, decimal_places=1, default=30, verbose_name=_('مرخصی استحقاقی سالانه (روز)'),
    )
    rounding_step = models.DecimalField(
        max_digits=8, decimal_places=2, default=1, verbose_name=_('گام گرد کردن مبالغ'),
    )
    require_bank_account = models.BooleanField(
        default=True, verbose_name=_('الزام اطلاعات بانکی برای پرداخت'),
    )
    large_change_threshold = models.DecimalField(
        max_digits=6, decimal_places=2, default=30,
        verbose_name=_('آستانهٔ هشدار تغییر حقوق (٪)'),
    )
    note = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('تنظیمات حقوق و دستمزد')
        verbose_name_plural = _('تنظیمات حقوق و دستمزد')
        constraints = [
            models.UniqueConstraint(fields=['company'], name='uniq_payroll_settings_company'),
        ]

    def __str__(self):
        return f'تنظیمات حقوق — {self.company}'


class PayrollInsuranceRate(BaseModel):
    """Effective-dated social insurance rates (employee/employer)."""

    effective_from = models.DateField(verbose_name=_('معتبر از'))
    effective_to = models.DateField(null=True, blank=True, verbose_name=_('معتبر تا'))
    employee_rate = models.DecimalField(
        max_digits=6, decimal_places=2, verbose_name=_('نرخ سهم کارمند (٪)'),
    )
    employer_rate = models.DecimalField(
        max_digits=6, decimal_places=2, verbose_name=_('نرخ سهم کارفرما (٪)'),
    )
    min_base = models.DecimalField(
        max_digits=18, decimal_places=2, default=0, verbose_name=_('کف مبنا'),
    )
    max_base = models.DecimalField(
        max_digits=18, decimal_places=2, default=0, verbose_name=_('سقف مبنا'),
    )
    description = models.CharField(max_length=250, blank=True, verbose_name=_('شرح'))

    class Meta:
        verbose_name = _('نرخ بیمه')
        verbose_name_plural = _('نرخ‌های بیمه')
        ordering = ['-effective_from']
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'effective_from'], name='uniq_payroll_insurance_effective',
            ),
            models.CheckConstraint(
                check=models.Q(employee_rate__gte=0) & models.Q(employer_rate__gte=0),
                name='payroll_insurance_rates_nonnegative',
            ),
        ]

    def __str__(self):
        return f'بیمه از {self.effective_from} — {self.employee_rate}/{self.employer_rate}٪'


class PayrollTaxBracket(BaseModel):
    """Progressive income-tax bracket; rules are versioned by effective date."""

    effective_from = models.DateField(verbose_name=_('معتبر از'))
    effective_to = models.DateField(null=True, blank=True, verbose_name=_('معتبر تا'))
    lower_bound = models.DecimalField(
        max_digits=18, decimal_places=2, default=0, verbose_name=_('از مبلغ'),
    )
    upper_bound = models.DecimalField(
        max_digits=18, decimal_places=2, null=True, blank=True,
        verbose_name=_('تا مبلغ'), help_text=_('خالی یعنی بدون سقف'),
    )
    rate = models.DecimalField(
        max_digits=6, decimal_places=3, verbose_name=_('نرخ (٪)'),
    )
    description = models.CharField(max_length=250, blank=True, verbose_name=_('شرح'))

    class Meta:
        verbose_name = _('پلهٔ مالیات')
        verbose_name_plural = _('پله‌های مالیات')
        ordering = ['effective_from', 'lower_bound']
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'effective_from', 'lower_bound'],
                name='uniq_payroll_tax_bracket',
            ),
            models.CheckConstraint(
                check=models.Q(rate__gte=0), name='payroll_tax_rate_nonnegative',
            ),
        ]

    def __str__(self):
        upper = self.upper_bound if self.upper_bound is not None else '∞'
        return f'{self.lower_bound} — {upper}: {self.rate}٪'


class PayrollComponent(BaseModel):
    """Component-based payroll definition (earning, deduction or employer cost)."""

    class Kind(models.TextChoices):
        EARNING = 'earning', _('دریافتی')
        DEDUCTION = 'deduction', _('کسورات')
        EMPLOYER_COST = 'employer_cost', _('هزینهٔ کارفرما')
        INFO = 'info', _('اطلاعاتی')

    class Category(models.TextChoices):
        BASE = 'base', _('حقوق پایه')
        ALLOWANCE = 'allowance', _('مزایا و کمک‌هزینه')
        OVERTIME = 'overtime', _('اضافه‌کاری')
        SHIFT = 'shift', _('نوبت/شب‌کاری')
        INSURANCE = 'insurance', _('بیمه')
        TAX = 'tax', _('مالیات')
        LOAN = 'loan', _('وام')
        ADVANCE = 'advance', _('مساعده')
        LEAVE = 'leave', _('مرخصی/غیبت')
        BONUS = 'bonus', _('پاداش')
        OTHER = 'other', _('سایر')

    class CalcType(models.TextChoices):
        FIXED = 'fixed', _('مبلغ ثابت')
        FORMULA = 'formula', _('فرمول')
        PERCENT = 'percent', _('درصدی')
        ATTENDANCE = 'attendance', _('بر اساس کارکرد')
        OVERTIME = 'overtime', _('اضافه‌کاری')
        INSURANCE = 'insurance', _('بیمه')
        TAX = 'tax', _('مالیات')
        LOAN = 'loan', _('وام')
        ADVANCE = 'advance', _('مساعده')
        MANUAL = 'manual', _('دستی')

    code = models.CharField(max_length=40, verbose_name=_('کد مؤلفه'))
    title = models.CharField(max_length=150, verbose_name=_('عنوان'))
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.EARNING, verbose_name=_('نوع'))
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER, verbose_name=_('دسته'))
    calc_type = models.CharField(max_length=20, choices=CalcType.choices, default=CalcType.FIXED, verbose_name=_('نوع محاسبه'))
    formula = models.TextField(blank=True, verbose_name=_('فرمول'))
    priority = models.PositiveIntegerField(default=100, verbose_name=_('اولویت محاسبه'))
    is_insurable = models.BooleanField(default=True, verbose_name=_('مشمول بیمه'))
    is_taxable = models.BooleanField(default=True, verbose_name=_('مشمول مالیات'))
    is_benefit = models.BooleanField(default=True, verbose_name=_('مشمول مزایا'))
    affects_cost = models.BooleanField(default=True, verbose_name=_('مؤثر در بهای تمام‌شده'))
    allocatable_to_project = models.BooleanField(default=True, verbose_name=_('قابل تخصیص به پروژه'))
    allocatable_to_cost_center = models.BooleanField(default=True, verbose_name=_('قابل تخصیص به مرکز هزینه'))
    min_amount = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True, verbose_name=_('کف مبلغ'))
    max_amount = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True, verbose_name=_('سقف مبلغ'))
    expense_account = models.ForeignKey(
        'accounting.Account', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_expense_components', verbose_name=_('حساب هزینه'),
    )
    payable_account = models.ForeignKey(
        'accounting.Account', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_payable_components', verbose_name=_('حساب پرداختنی'),
    )
    is_builtin = models.BooleanField(default=False, verbose_name=_('مؤلفهٔ سیستمی'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    class Meta:
        verbose_name = _('مؤلفهٔ حقوق')
        verbose_name_plural = _('مؤلفه‌های حقوق')
        ordering = ['priority', 'code']
        constraints = [
            models.UniqueConstraint(fields=['company', 'code'], name='uniq_payroll_component_code'),
        ]

    def __str__(self):
        return f'{self.code} — {self.title}'


class PayrollComponentRule(BaseModel):
    """Effective-dated amount/rate/formula for a payroll component."""

    component = models.ForeignKey(
        PayrollComponent, on_delete=models.CASCADE, related_name='rules', verbose_name=_('مؤلفه'),
    )
    effective_from = models.DateField(verbose_name=_('معتبر از'))
    effective_to = models.DateField(null=True, blank=True, verbose_name=_('معتبر تا'))
    amount = models.DecimalField(
        max_digits=18, decimal_places=2, default=0, verbose_name=_('مبلغ ثابت'),
    )
    rate = models.DecimalField(
        max_digits=10, decimal_places=4, default=0, verbose_name=_('درصد/ضریب'),
    )
    formula = models.TextField(blank=True, verbose_name=_('فرمول جایگزین'))
    min_amount = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True, verbose_name=_('کف'))
    max_amount = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True, verbose_name=_('سقف'))
    config = models.JSONField(default=dict, blank=True, verbose_name=_('پیکربندی'))
    description = models.CharField(max_length=250, blank=True, verbose_name=_('شرح'))

    class Meta:
        verbose_name = _('قاعدهٔ مؤلفه')
        verbose_name_plural = _('قواعد مؤلفه‌ها')
        ordering = ['-effective_from']
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'component', 'effective_from'],
                name='uniq_payroll_component_rule',
            ),
        ]

    def __str__(self):
        return f'{self.component.code} — {self.effective_from}'


class EmployeePayrollProfile(BaseModel):
    """Effective salary profile. HR remains the master of employee identity."""

    class Status(models.TextChoices):
        ACTIVE = 'active', _('فعال')
        SUSPENDED = 'suspended', _('تعلیق')
        TERMINATED = 'terminated', _('پایان همکاری')

    employee = models.ForeignKey(
        'employees.Employee', on_delete=models.CASCADE,
        related_name='payroll_profiles', verbose_name=_('پرسنل'),
    )
    effective_from = models.DateField(verbose_name=_('معتبر از'))
    effective_to = models.DateField(null=True, blank=True, verbose_name=_('معتبر تا'))
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.ACTIVE, verbose_name=_('وضعیت'))
    base_salary = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('حقوق پایه'))
    housing_allowance = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('حق مسکن'))
    food_allowance = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('بن/کمک‌هزینه اقلام مصرفی'))
    seniority_allowance = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('پایه سنوات'))
    attraction_allowance = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('حق جذب'))
    job_allowance = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('فوق‌العاده شغل'))
    other_allowance = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('سایر مزایای ثابت'))
    insurance_eligible = models.BooleanField(default=True, verbose_name=_('مشمول بیمه'))
    tax_eligible = models.BooleanField(default=True, verbose_name=_('مشمول مالیات'))
    direct_labor = models.BooleanField(default=True, verbose_name=_('نیروی کار مستقیم'))
    default_project = models.ForeignKey(
        'projects.Project', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_profiles', verbose_name=_('پروژهٔ پیش‌فرض'),
    )
    default_cost_center = models.ForeignKey(
        'accounting.CostCenter', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_profiles', verbose_name=_('مرکز هزینهٔ پیش‌فرض'),
    )
    project_percent = models.DecimalField(
        max_digits=6, decimal_places=2, default=0, verbose_name=_('درصد تخصیص به پروژه'),
    )
    notes = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('پروفایل حقوقی پرسنل')
        verbose_name_plural = _('پروفایل‌های حقوقی پرسنل')
        ordering = ['employee', '-effective_from']
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'employee', 'effective_from'],
                name='uniq_payroll_profile_employee_effective',
            ),
        ]

    def __str__(self):
        return f'{self.employee.full_name} — از {self.effective_from}'


class EmployeePayrollComponent(BaseModel):
    """Employee-level fixed/formula component assignment."""

    employee = models.ForeignKey(
        'employees.Employee', on_delete=models.CASCADE,
        related_name='payroll_components', verbose_name=_('پرسنل'),
    )
    component = models.ForeignKey(
        PayrollComponent, on_delete=models.CASCADE,
        related_name='employee_assignments', verbose_name=_('مؤلفه'),
    )
    amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('مبلغ'))
    rate = models.DecimalField(max_digits=10, decimal_places=4, default=0, verbose_name=_('درصد/ضریب'))
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name=_('مقدار'))
    formula = models.TextField(blank=True, verbose_name=_('فرمول اختصاصی'))
    effective_from = models.DateField(verbose_name=_('معتبر از'))
    effective_to = models.DateField(null=True, blank=True, verbose_name=_('معتبر تا'))
    note = models.CharField(max_length=250, blank=True, verbose_name=_('توضیح'))

    class Meta:
        verbose_name = _('مؤلفهٔ اختصاصی پرسنل')
        verbose_name_plural = _('مؤلفه‌های اختصاصی پرسنل')
        ordering = ['employee', 'component']
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'employee', 'component', 'effective_from'],
                name='uniq_employee_payroll_component',
            ),
        ]

    def __str__(self):
        return f'{self.employee.full_name} — {self.component.title} ({self.amount})'


class PayrollPeriod(BaseModel):
    """A payroll cycle with a strict workflow and immutable historical totals."""

    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        OPEN = 'open', _('باز')
        CALCULATING = 'calculating', _('در حال محاسبه')
        CALCULATED = 'calculated', _('محاسبه‌شده')
        UNDER_REVIEW = 'under_review', _('در حال بررسی')
        APPROVED = 'approved', _('تأییدشده')
        PAYMENT_PENDING = 'payment_pending', _('در انتظار پرداخت')
        PAID = 'paid', _('پرداخت‌شده')
        CLOSED = 'closed', _('بسته‌شده')
        CANCELLED = 'cancelled', _('لغو‌شده')

    class PeriodType(models.TextChoices):
        MONTHLY = 'monthly', _('ماهانه')
        SETTLEMENT = 'settlement', _('تسویه حساب')
        ADJUSTMENT = 'adjustment', _('اصلاحی')
        OTHER = 'other', _('سایر')

    year = models.PositiveIntegerField(verbose_name=_('سال شمسی'))
    month = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name=_('ماه شمسی'))
    title = models.CharField(max_length=200, blank=True, verbose_name=_('عنوان دوره'))
    period_type = models.CharField(
        max_length=15, choices=PeriodType.choices, default=PeriodType.MONTHLY, verbose_name=_('نوع دوره'),
    )
    start_date = models.DateField(verbose_name=_('تاریخ شروع'))
    end_date = models.DateField(verbose_name=_('تاریخ پایان'))
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'),
    )
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))
    # __PERIOD_FIELDS__
    calculated_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان محاسبه'))
    calculated_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', db_constraint=False, verbose_name=_('محاسبه‌کننده'),
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان بررسی'))
    reviewed_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', db_constraint=False, verbose_name=_('بررسی‌کننده'),
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان تأیید'))
    approved_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', db_constraint=False, verbose_name=_('تأییدکننده'),
    )
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان پرداخت'))
    paid_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', db_constraint=False, verbose_name=_('پرداخت‌کننده'),
    )
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان بستن'))
    closed_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', db_constraint=False, verbose_name=_('بستن‌کننده'),
    )
    employee_count = models.PositiveIntegerField(default=0, verbose_name=_('تعداد کارکنان'))
    calculated_count = models.PositiveIntegerField(default=0, verbose_name=_('تعداد محاسبه‌شده'))
    warning_count = models.PositiveIntegerField(default=0, verbose_name=_('تعداد هشدار'))
    error_count = models.PositiveIntegerField(default=0, verbose_name=_('تعداد خطا'))
    gross_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name=_('جمع ناخالص'))
    insurance_employee = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name=_('بیمهٔ سهم کارمند'))
    insurance_employer = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name=_('بیمهٔ سهم کارفرما'))
    tax_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name=_('مالیات'))
    other_deductions = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name=_('سایر کسورات'))
    net_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name=_('خالص پرداختی'))
    employer_cost = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name=_('هزینهٔ کارفرما'))
    total_cost = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name=_('کل هزینهٔ نیروی کار'))
    paid_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name=_('مبلغ پرداخت‌شده'))
    # __PERIOD_FIELDS_2__
    insurance_rate_snapshot = models.JSONField(default=dict, blank=True, verbose_name=_('نرخ بیمهٔ دوره'))
    tax_rules_snapshot = models.JSONField(default=list, blank=True, verbose_name=_('قواعد مالیات دوره'))
    accounting_document = models.ForeignKey(
        'accounting.AccountingDocument', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_periods', verbose_name=_('سند حسابداری'),
    )
    payment_request = models.ForeignKey(
        'treasury.PaymentRequest', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_periods', verbose_name=_('درخواست پرداخت'),
    )
    payment_reference = models.CharField(max_length=100, blank=True, verbose_name=_('شماره مرجع پرداخت'))
    notes = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('دورهٔ حقوق')
        verbose_name_plural = _('دوره‌های حقوق')
        ordering = ['-year', '-month', '-id']
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'year', 'month', 'period_type'],
                condition=models.Q(month__isnull=False),
                name='uniq_payroll_period_company_month',
            ),
        ]
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['company', 'year', 'month']),
        ]

    def __str__(self):
        return self.title or f'{self.year}/{self.month or "—"}'

    @property
    def label(self):
        return self.title or f'{self.year}/{self.month or "—"}'


class PayrollEmployeeResult(BaseModel):
    """Snapshot of one employee's payroll in one period (audit-safe)."""

    class Status(models.TextChoices):
        CALCULATED = 'calculated', _('محاسبه‌شده')
        WARNING = 'warning', _('نیازمند بررسی')
        REVIEWED = 'reviewed', _('بررسی‌شده')
        APPROVED = 'approved', _('تأییدشده')
        PAID = 'paid', _('پرداخت‌شده')

    period = models.ForeignKey(
        PayrollPeriod, on_delete=models.CASCADE, related_name='results', verbose_name=_('دوره'),
    )
    employee = models.ForeignKey(
        'employees.Employee', on_delete=models.PROTECT,
        related_name='payroll_results', verbose_name=_('پرسنل'),
    )
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.CALCULATED, verbose_name=_('وضعیت'))
    snapshot = models.JSONField(default=dict, blank=True, verbose_name=_('عکس وضعیت'))
    bank_snapshot = models.JSONField(default=dict, blank=True, verbose_name=_('عکس اطلاعات بانکی'))
    base_salary = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('حقوق پایه'))
    work_days = models.DecimalField(max_digits=6, decimal_places=2, default=0, verbose_name=_('روز کاری'))
    payable_days = models.DecimalField(max_digits=6, decimal_places=2, default=0, verbose_name=_('روز قابل پرداخت'))
    absence_days = models.DecimalField(max_digits=6, decimal_places=2, default=0, verbose_name=_('روز غیبت'))
    unpaid_leave_days = models.DecimalField(max_digits=6, decimal_places=2, default=0, verbose_name=_('مرخصی بدون حقوق'))
    overtime_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0, verbose_name=_('ساعت اضافه‌کاری'))
    gross_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name=_('جمع ناخالص'))
    insurance_base = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name=_('مبنای بیمه'))
    insurance_employee = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name=_('بیمهٔ سهم کارمند'))
    insurance_employer = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name=_('بیمهٔ سهم کارفرما'))
    tax_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name=_('مالیات'))
    other_deductions = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name=_('سایر کسورات'))
    net_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name=_('خالص پرداختی'))
    employer_cost = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name=_('هزینهٔ کارفرما'))
    total_cost = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name=_('کل هزینه'))
    warnings = models.JSONField(default=list, blank=True, verbose_name=_('هشدارها'))
    cost_center = models.ForeignKey(
        'accounting.CostCenter', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_results', verbose_name=_('مرکز هزینه'),
    )
    project = models.ForeignKey(
        'projects.Project', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_results', verbose_name=_('پروژه'),
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان تأیید'))
    approved_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', db_constraint=False, verbose_name=_('تأییدکننده'),
    )
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان پرداخت'))
    payment_reference = models.CharField(max_length=100, blank=True, verbose_name=_('مرجع پرداخت'))

    class Meta:
        verbose_name = _('نتیجهٔ حقوق پرسنل')
        verbose_name_plural = _('نتایج حقوق پرسنل')
        ordering = ['employee__employee_id']
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'period', 'employee'], name='uniq_payroll_result_employee_period',
            ),
        ]
        indexes = [
            models.Index(fields=['company', 'period', 'status']),
            models.Index(fields=['company', 'employee']),
        ]

    def __str__(self):
        return f'{self.employee.full_name} — {self.period.label}'


class PayrollItem(BaseModel):
    """A single earning/deduction/employer-cost line of a payroll result."""

    class Kind(models.TextChoices):
        EARNING = 'earning', _('دریافتی')
        DEDUCTION = 'deduction', _('کسورات')
        EMPLOYER_COST = 'employer_cost', _('هزینهٔ کارفرما')
        INFO = 'info', _('اطلاعاتی')

    result = models.ForeignKey(
        PayrollEmployeeResult, on_delete=models.CASCADE, related_name='items', verbose_name=_('نتیجهٔ حقوق'),
    )
    component = models.ForeignKey(
        PayrollComponent, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_items', verbose_name=_('مؤلفه'),
    )
    code = models.CharField(max_length=50, verbose_name=_('کد'))
    title = models.CharField(max_length=200, verbose_name=_('عنوان'))
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.EARNING, verbose_name=_('نوع'))
    quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0, verbose_name=_('مقدار'))
    rate = models.DecimalField(max_digits=18, decimal_places=4, default=0, verbose_name=_('نرخ'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('مبلغ'))
    is_insurable = models.BooleanField(default=False, verbose_name=_('مشمول بیمه'))
    is_taxable = models.BooleanField(default=False, verbose_name=_('مشمول مالیات'))
    project = models.ForeignKey(
        'projects.Project', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_items', verbose_name=_('پروژه'),
    )
    cost_center = models.ForeignKey(
        'accounting.CostCenter', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_items', verbose_name=_('مرکز هزینه'),
    )
    expense_account = models.ForeignKey(
        'accounting.Account', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('حساب هزینه'),
    )
    payable_account = models.ForeignKey(
        'accounting.Account', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('حساب پرداختنی'),
    )
    source_type = models.CharField(max_length=40, blank=True, verbose_name=_('نوع منبع'))
    source_id = models.CharField(max_length=64, blank=True, verbose_name=_('شناسهٔ منبع'))
    description = models.CharField(max_length=250, blank=True, verbose_name=_('شرح'))

    class Meta:
        verbose_name = _('سطر حقوق')
        verbose_name_plural = _('سطرهای حقوق')
        ordering = ['id']
        indexes = [models.Index(fields=['company', 'result', 'kind'])]

    def __str__(self):
        return f'{self.code} — {self.amount}'


class PayrollOvertime(BaseModel):
    """Approved overtime/night/holiday work feeding payroll."""

    class Kind(models.TextChoices):
        OVERTIME = 'overtime', _('اضافه‌کاری')
        NIGHT = 'night', _('شب‌کاری')
        HOLIDAY = 'holiday', _('تعطیل‌کاری')
        SHIFT = 'shift', _('نوبت‌کاری')
        MISSION = 'mission', _('مأموریت')

    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        SUBMITTED = 'submitted', _('ثبت‌شده')
        APPROVED = 'approved', _('تأییدشده')
        REJECTED = 'rejected', _('رد‌شده')
        PROCESSED = 'processed', _('پردازش‌شده')

    employee = models.ForeignKey(
        'employees.Employee', on_delete=models.CASCADE,
        related_name='payroll_overtimes', verbose_name=_('پرسنل'),
    )
    date = models.DateField(verbose_name=_('تاریخ'))
    start_time = models.TimeField(null=True, blank=True, verbose_name=_('ساعت شروع'))
    end_time = models.TimeField(null=True, blank=True, verbose_name=_('ساعت پایان'))
    hours = models.DecimalField(max_digits=7, decimal_places=2, verbose_name=_('تعداد ساعت'))
    kind = models.CharField(max_length=15, choices=Kind.choices, default=Kind.OVERTIME, verbose_name=_('نوع'))
    multiplier = models.DecimalField(
        max_digits=6, decimal_places=3, null=True, blank=True, verbose_name=_('ضریب'),
    )
    amount = models.DecimalField(
        max_digits=18, decimal_places=2, null=True, blank=True, verbose_name=_('مبلغ'),
        help_text=_('خالی = محاسبهٔ خودکار از نرخ ساعتی پایه'),
    )
    period = models.ForeignKey(
        PayrollPeriod, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='overtimes', verbose_name=_('دورهٔ حقوق'),
    )
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    approved_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', db_constraint=False, verbose_name=_('تأییدکننده'),
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان تأیید'))
    note = models.CharField(max_length=250, blank=True, verbose_name=_('توضیح'))

    class Meta:
        verbose_name = _('اضافه‌کاری/کار اضافی')
        verbose_name_plural = _('اضافه‌کاری و کار اضافی')
        ordering = ['-date', 'employee__employee_id']
        indexes = [
            models.Index(fields=['company', 'employee', 'date']),
            models.Index(fields=['company', 'status', 'period']),
        ]

    def __str__(self):
        return f'{self.employee.full_name} — {self.date} ({self.hours}h)'


class EmployeeAdvance(BaseModel):
    """Employee advance (مساعده) with controlled payroll deduction."""

    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        APPROVED = 'approved', _('تأییدشده')
        PAID = 'paid', _('پرداخت‌شده')
        SETTLED = 'settled', _('تسویه‌شده')
        REJECTED = 'rejected', _('رد‌شده')

    employee = models.ForeignKey(
        'employees.Employee', on_delete=models.CASCADE,
        related_name='payroll_advances', verbose_name=_('پرسنل'),
    )
    date = models.DateField(verbose_name=_('تاریخ پرداخت'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, verbose_name=_('مبلغ مساعده'))
    installment_count = models.PositiveIntegerField(default=1, verbose_name=_('تعداد اقساط'))
    installment_amount = models.DecimalField(
        max_digits=18, decimal_places=2, default=0, verbose_name=_('مبلغ هر قسط'),
    )
    deducted_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('کسرشده'))
    remaining_amount = models.DecimalField(
        max_digits=18, decimal_places=2, default=0, verbose_name=_('مانده'),
    )
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    reason = models.CharField(max_length=250, blank=True, verbose_name=_('علت'))
    approved_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', db_constraint=False, verbose_name=_('تأییدکننده'),
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان تأیید'))
    last_deducted_period = models.ForeignKey(
        PayrollPeriod, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='advance_deductions', verbose_name=_('آخرین دورهٔ کسر'),
    )
    note = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('مساعدهٔ پرسنل')
        verbose_name_plural = _('مساعده‌های پرسنل')
        ordering = ['-date', '-id']
        indexes = [models.Index(fields=['company', 'employee', 'status'])]

    def save(self, *args, **kwargs):
        if not self.remaining_amount and self.amount is not None:
            self.remaining_amount = self.amount
        if not self.installment_amount and self.installment_count:
            self.installment_amount = (self.amount or 0) / self.installment_count
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.employee.full_name} — {self.amount}'


class EmployeeLoanInstallment(BaseModel):
    """Installment schedule of an existing EmployeeLoan, linked to payroll."""

    class Status(models.TextChoices):
        PENDING = 'pending', _('در انتظار')
        PAID = 'paid', _('پرداخت‌شده')
        CANCELLED = 'cancelled', _('لغو‌شده')

    loan = models.ForeignKey(
        EmployeeLoan, on_delete=models.CASCADE,
        related_name='installments', verbose_name=_('وام'),
    )
    sequence = models.PositiveIntegerField(verbose_name=_('شمارهٔ قسط'))
    due_date = models.DateField(verbose_name=_('سررسید'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, verbose_name=_('مبلغ قسط'))
    paid_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('پرداخت‌شده'))
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING, verbose_name=_('وضعیت'))
    payroll_period = models.ForeignKey(
        PayrollPeriod, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='loan_installments', verbose_name=_('دورهٔ حقوق'),
    )
    note = models.CharField(max_length=250, blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('قسط وام')
        verbose_name_plural = _('اقساط وام')
        ordering = ['loan', 'sequence']
        constraints = [
            models.UniqueConstraint(fields=['company', 'loan', 'sequence'], name='uniq_loan_installment'),
        ]

    def __str__(self):
        return f'{self.loan.employee.full_name} — قسط {self.sequence}'


class PayrollCostAllocation(BaseModel):
    """Employee cost split across projects / cost centers."""

    employee = models.ForeignKey(
        'employees.Employee', on_delete=models.CASCADE,
        related_name='payroll_cost_allocations', verbose_name=_('پرسنل'),
    )
    project = models.ForeignKey(
        'projects.Project', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_cost_allocations', verbose_name=_('پروژه'),
    )
    cost_center = models.ForeignKey(
        'accounting.CostCenter', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_cost_allocations', verbose_name=_('مرکز هزینه'),
    )
    percentage = models.DecimalField(max_digits=6, decimal_places=2, verbose_name=_('درصد'))
    effective_from = models.DateField(verbose_name=_('معتبر از'))
    effective_to = models.DateField(null=True, blank=True, verbose_name=_('معتبر تا'))
    is_direct = models.BooleanField(default=True, verbose_name=_('مستقیم'))
    note = models.CharField(max_length=250, blank=True, verbose_name=_('توضیح'))

    class Meta:
        verbose_name = _('تخصیص هزینهٔ حقوق')
        verbose_name_plural = _('تخصیص‌های هزینهٔ حقوق')
        ordering = ['employee', '-percentage']
        constraints = [
            models.CheckConstraint(
                check=models.Q(percentage__gte=0) & models.Q(percentage__lte=100),
                name='payroll_allocation_percentage_range',
            ),
        ]

    def __str__(self):
        return f'{self.employee.full_name} — {self.percentage}٪'


class PayrollCost(BaseModel):
    """Costing feed: actual labour cost per employee/component/project."""

    period = models.ForeignKey(
        PayrollPeriod, on_delete=models.CASCADE, related_name='costs', verbose_name=_('دوره'),
    )
    result = models.ForeignKey(
        PayrollEmployeeResult, on_delete=models.CASCADE, related_name='costs', verbose_name=_('نتیجه'),
    )
    employee = models.ForeignKey(
        'employees.Employee', on_delete=models.PROTECT, related_name='payroll_costs', verbose_name=_('پرسنل'),
    )
    component = models.ForeignKey(
        PayrollComponent, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_costs', verbose_name=_('مؤلفه'),
    )
    code = models.CharField(max_length=50, verbose_name=_('کد'))
    title = models.CharField(max_length=200, verbose_name=_('عنوان'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, verbose_name=_('مبلغ'))
    project = models.ForeignKey(
        'projects.Project', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_costs', verbose_name=_('پروژه'),
    )
    cost_center = models.ForeignKey(
        'accounting.CostCenter', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_costs', verbose_name=_('مرکز هزینه'),
    )
    activity = models.CharField(max_length=150, blank=True, verbose_name=_('فعالیت'))
    is_direct = models.BooleanField(default=True, verbose_name=_('مستقیم'))
    is_employer_cost = models.BooleanField(default=False, verbose_name=_('هزینهٔ کارفرما'))
    date = models.DateField(verbose_name=_('تاریخ'))

    class Meta:
        verbose_name = _('هزینهٔ حقوق')
        verbose_name_plural = _('هزینه‌های حقوق')
        ordering = ['-date', 'employee__employee_id']
        indexes = [
            models.Index(fields=['company', 'period']),
            models.Index(fields=['company', 'project']),
        ]

    def __str__(self):
        return f'{self.employee.full_name} — {self.title} ({self.amount})'


class PayrollAccountMapping(BaseModel):
    """Central mapping of payroll events to accounting accounts (no hard-coded codes)."""

    class Event(models.TextChoices):
        SALARY_EXPENSE = 'salary_expense', _('هزینهٔ حقوق و مزایا')
        EMPLOYER_INSURANCE_EXPENSE = 'employer_insurance_expense', _('هزینهٔ بیمهٔ کارفرما')
        EMPLOYEE_INSURANCE_PAYABLE = 'employee_insurance_payable', _('بیمهٔ پرداختنی (سهم کارمند)')
        EMPLOYER_INSURANCE_PAYABLE = 'employer_insurance_payable', _('بیمهٔ پرداختنی (سهم کارفرما)')
        TAX_PAYABLE = 'tax_payable', _('مالیات پرداختنی')
        NET_PAYABLE = 'net_payable', _('حقوق پرداختنی')
        OTHER_DEDUCTION_PAYABLE = 'other_deduction_payable', _('سایر کسورات پرداختنی')
        SETTLEMENT_EXPENSE = 'settlement_expense', _('هزینهٔ تسویه حساب')

    code = models.CharField(max_length=40, choices=Event.choices, verbose_name=_('رویداد'))
    title = models.CharField(max_length=150, blank=True, verbose_name=_('عنوان'))
    account = models.ForeignKey(
        'accounting.Account', on_delete=models.PROTECT, related_name='payroll_mappings', verbose_name=_('حساب'),
    )
    journal = models.ForeignKey(
        'accounting.Journal', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_mappings', verbose_name=_('دفتر روزنامه'),
    )
    requires_project = models.BooleanField(default=False, verbose_name=_('نیازمند پروژه'))
    requires_cost_center = models.BooleanField(default=False, verbose_name=_('نیازمند مرکز هزینه'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))
    description = models.CharField(max_length=250, blank=True, verbose_name=_('شرح'))

    class Meta:
        verbose_name = _('نگاشت حساب حقوق')
        verbose_name_plural = _('نگاشت‌های حساب حقوق')
        ordering = ['code']
        constraints = [
            models.UniqueConstraint(fields=['company', 'code'], name='uniq_payroll_account_mapping'),
        ]

    def __str__(self):
        return f'{self.get_code_display()} → {self.account.code}'


class PayrollBankFormat(BaseModel):
    """Configurable bank payment-file format (no bank format hard-coded)."""

    class FormatType(models.TextChoices):
        CSV = 'csv', _('CSV')
        FIXED = 'fixed', _('طول ثابت')
        EXCEL = 'excel', _('Excel')

    code = models.CharField(max_length=30, verbose_name=_('کد قالب'))
    name = models.CharField(max_length=150, verbose_name=_('نام قالب'))
    bank_name = models.CharField(max_length=100, blank=True, verbose_name=_('بانک'))
    version = models.CharField(max_length=30, blank=True, verbose_name=_('نسخه'))
    format_type = models.CharField(max_length=10, choices=FormatType.choices, default=FormatType.CSV, verbose_name=_('نوع فایل'))
    delimiter = models.CharField(max_length=5, default=',', verbose_name=_('جداکننده'))
    encoding = models.CharField(max_length=20, default='utf-8-sig', verbose_name=_('کدگذاری'))
    header_fields = models.JSONField(
        default=list, blank=True, verbose_name=_('ستون‌های سربرگ'),
        help_text=_('فهرست کلیدها؛ خالی یعنی بدون سربرگ.'),
    )
    line_fields = models.JSONField(
        default=list, blank=True, verbose_name=_('ستون‌های سطر'),
        help_text=_('کلیدها: beneficiary_name, iban, account_number, bank_name, amount, national_id, employee_code'),
    )
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))
    description = models.CharField(max_length=250, blank=True, verbose_name=_('شرح'))

    class Meta:
        verbose_name = _('قالب فایل پرداخت بانکی')
        verbose_name_plural = _('قالب‌های فایل پرداخت بانکی')
        ordering = ['bank_name', 'code']
        constraints = [
            models.UniqueConstraint(fields=['company', 'code'], name='uniq_payroll_bank_format'),
        ]

    def __str__(self):
        return f'{self.bank_name} — {self.name}'


def payroll_payment_batch_upload_path(instance, filename):
    return f'payroll/payment_batches/{instance.company_id}/{filename}'


class PayrollPaymentBatch(BaseModel):
    """A generated bank payment batch for one payroll period."""

    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        GENERATED = 'generated', _('فایل تولیدشده')
        SUBMITTED = 'submitted', _('ارسال‌شده به بانک')
        PAID = 'paid', _('پرداخت‌شده')
        CANCELLED = 'cancelled', _('لغو‌شده')

    period = models.ForeignKey(
        PayrollPeriod, on_delete=models.PROTECT, related_name='payment_batches', verbose_name=_('دوره'),
    )
    format = models.ForeignKey(
        PayrollBankFormat, on_delete=models.PROTECT, related_name='batches', verbose_name=_('قالب'),
    )
    code = models.CharField(max_length=50, blank=True, verbose_name=_('کد دسته'))
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    file = models.FileField(
        upload_to=payroll_payment_batch_upload_path, null=True, blank=True, verbose_name=_('فایل پرداخت'),
    )
    line_count = models.PositiveIntegerField(default=0, verbose_name=_('تعداد سطر'))
    total_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name=_('جمع مبلغ'))
    generated_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان تولید'))
    generated_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', db_constraint=False, verbose_name=_('تولیدکننده'),
    )
    note = models.TextField(blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('دستهٔ پرداخت حقوق')
        verbose_name_plural = _('دسته‌های پرداخت حقوق')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.period.label} — {self.format.name}'


class PayrollPaymentBatchLine(BaseModel):
    """One beneficiary row in a payroll payment batch."""

    class Status(models.TextChoices):
        PENDING = 'pending', _('در انتظار')
        GENERATED = 'generated', _('تولیدشده')
        PAID = 'paid', _('پرداخت‌شده')
        ERROR = 'error', _('خطا')

    batch = models.ForeignKey(
        PayrollPaymentBatch, on_delete=models.CASCADE, related_name='lines', verbose_name=_('دسته'),
    )
    result = models.ForeignKey(
        PayrollEmployeeResult, on_delete=models.CASCADE, related_name='payment_lines', verbose_name=_('نتیجه'),
    )
    beneficiary_name = models.CharField(max_length=200, verbose_name=_('نام ذی‌نفع'))
    national_id = models.CharField(max_length=20, blank=True, verbose_name=_('کد ملی'))
    bank_name = models.CharField(max_length=100, blank=True, verbose_name=_('بانک'))
    account_number = models.CharField(max_length=50, blank=True, verbose_name=_('شماره حساب'))
    iban = models.CharField(max_length=34, blank=True, verbose_name=_('شبا'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, verbose_name=_('مبلغ'))
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING, verbose_name=_('وضعیت'))
    error = models.CharField(max_length=250, blank=True, verbose_name=_('خطا'))

    class Meta:
        verbose_name = _('سطر پرداخت حقوق')
        verbose_name_plural = _('سطرهای پرداخت حقوق')
        ordering = ['batch', 'beneficiary_name']
        constraints = [
            models.UniqueConstraint(fields=['company', 'batch', 'result'], name='uniq_payroll_batch_result'),
        ]

    def __str__(self):
        return f'{self.beneficiary_name} — {self.amount}'


class PayrollSettlement(BaseModel):
    """End-of-service settlement (تسویه حساب) with full audit trail."""

    class Kind(models.TextChoices):
        RESIGNATION = 'resignation', _('استعفا')
        TERMINATION = 'termination', _('پایان همکاری')
        RETIREMENT = 'retirement', _('بازنشستگی')
        CONTRACT_END = 'contract_end', _('پایان قرارداد')
        OTHER = 'other', _('سایر')

    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        CALCULATED = 'calculated', _('محاسبه‌شده')
        APPROVED = 'approved', _('تأییدشده')
        PAID = 'paid', _('پرداخت‌شده')
        CANCELLED = 'cancelled', _('لغو‌شده')

    employee = models.ForeignKey(
        'employees.Employee', on_delete=models.PROTECT,
        related_name='payroll_settlements', verbose_name=_('پرسنل'),
    )
    date = models.DateField(verbose_name=_('تاریخ تسویه'))
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.RESIGNATION, verbose_name=_('نوع'))
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    service_years = models.DecimalField(max_digits=6, decimal_places=2, default=0, verbose_name=_('سابقه (سال)'))
    leave_days = models.DecimalField(max_digits=6, decimal_places=1, default=0, verbose_name=_('روز مرخصی قابل پرداخت'))
    leave_pay = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('بازخرید مرخصی'))
    severance = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('سنوات'))
    eid_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('عیدی'))
    other_earnings = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('سایر مزایا'))
    loan_balance = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('مانده وام'))
    advance_balance = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('مانده مساعده'))
    other_deductions = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('سایر کسورات'))
    gross_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('جمع مطالبات'))
    net_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name=_('خالص تسویه'))
    calculation = models.JSONField(default=dict, blank=True, verbose_name=_('جزئیات محاسبه'))
    notes = models.TextField(blank=True, verbose_name=_('یادداشت'))
    approved_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', db_constraint=False, verbose_name=_('تأییدکننده'),
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان تأیید'))
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان پرداخت'))
    accounting_document = models.ForeignKey(
        'accounting.AccountingDocument', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_settlements', verbose_name=_('سند حسابداری'),
    )
    payment_request = models.ForeignKey(
        'treasury.PaymentRequest', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_settlements', verbose_name=_('درخواست پرداخت'),
    )

    class Meta:
        verbose_name = _('تسویه حساب پرسنل')
        verbose_name_plural = _('تسویه‌حساب‌های پرسنل')
        ordering = ['-date', '-id']
        indexes = [models.Index(fields=['company', 'employee', 'status'])]

    def __str__(self):
        return f'{self.employee.full_name} — {self.date}'


class PayrollAdjustment(BaseModel):
    """Correction for a closed/paid payroll period (never silent edits)."""

    class Kind(models.TextChoices):
        EARNING = 'earning', _('دریافتی')
        DEDUCTION = 'deduction', _('کسورات')

    class Status(models.TextChoices):
        DRAFT = 'draft', _('پیش‌نویس')
        APPROVED = 'approved', _('تأییدشده')
        APPLIED = 'applied', _('اعمال‌شده')
        CANCELLED = 'cancelled', _('لغو‌شده')

    employee = models.ForeignKey(
        'employees.Employee', on_delete=models.PROTECT,
        related_name='payroll_adjustments', verbose_name=_('پرسنل'),
    )
    original_period = models.ForeignKey(
        PayrollPeriod, on_delete=models.PROTECT, related_name='adjustments_from', verbose_name=_('دورهٔ اصلی'),
    )
    target_period = models.ForeignKey(
        PayrollPeriod, on_delete=models.PROTECT, related_name='adjustments_to', verbose_name=_('دورهٔ اعمال'),
    )
    kind = models.CharField(max_length=15, choices=Kind.choices, default=Kind.EARNING, verbose_name=_('نوع'))
    title = models.CharField(max_length=200, verbose_name=_('عنوان اصلاح'))
    amount = models.DecimalField(max_digits=18, decimal_places=2, verbose_name=_('مبلغ'))
    reason = models.TextField(verbose_name=_('علت اصلاح'))
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))
    approved_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', db_constraint=False, verbose_name=_('تأییدکننده'),
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان تأیید'))
    accounting_document = models.ForeignKey(
        'accounting.AccountingDocument', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_adjustments', verbose_name=_('سند حسابداری'),
    )

    class Meta:
        verbose_name = _('اصلاح حقوق')
        verbose_name_plural = _('اصلاحات حقوق')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.employee.full_name} — {self.title}'


class PayrollChangeLog(BaseModel):
    """Fine-grained payroll audit (user/action/object/old/new/reason/IP)."""

    period = models.ForeignKey(
        PayrollPeriod, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='change_logs', verbose_name=_('دوره'),
    )
    object_type = models.CharField(max_length=50, verbose_name=_('نوع شیء'))
    object_id = models.CharField(max_length=64, blank=True, verbose_name=_('شناسه'))
    action = models.CharField(max_length=30, verbose_name=_('عملیات'))
    old_value = models.JSONField(default=dict, blank=True, verbose_name=_('مقدار قبلی'))
    new_value = models.JSONField(default=dict, blank=True, verbose_name=_('مقدار جدید'))
    reason = models.TextField(blank=True, verbose_name=_('علت'))
    user = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', db_constraint=False, verbose_name=_('کاربر'),
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name=_('آدرس IP'))

    class Meta:
        verbose_name = _('تاریخچهٔ تغییر حقوق')
        verbose_name_plural = _('تاریخچهٔ تغییرات حقوق')
        ordering = ['-created_at']
        indexes = [models.Index(fields=['company', 'period', 'created_at'])]

    def __str__(self):
        return f'{self.action} — {self.object_type}/{self.object_id}'
