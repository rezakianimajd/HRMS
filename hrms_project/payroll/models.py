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
        choices=BenefitType.choices,
        verbose_name=_('نوع مزایای رفاهی'),
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
        return f"{self.employee.full_name} - {self.get_benefit_type_display()} ({self.year}/{self.get_month_display()})"


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
