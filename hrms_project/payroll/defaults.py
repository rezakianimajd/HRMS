"""Default payroll components (structure, never legal rates)."""
from payroll.models import PayrollComponent, PayrollSettings

BUILTIN_COMPONENTS = [
    {
        'code': 'BASE_SALARY', 'title': 'حقوق پایه', 'kind': 'earning', 'category': 'base',
        'calc_type': 'fixed', 'priority': 10, 'is_insurable': True, 'is_taxable': True,
    },
    {
        'code': 'HOUSING_ALLOWANCE', 'title': 'حق مسکن', 'kind': 'earning', 'category': 'allowance',
        'calc_type': 'fixed', 'priority': 20, 'is_insurable': True, 'is_taxable': True,
    },
    {
        'code': 'FOOD_ALLOWANCE', 'title': 'بن/کمک‌هزینه اقلام مصرفی', 'kind': 'earning',
        'category': 'allowance', 'calc_type': 'fixed', 'priority': 21,
        'is_insurable': False, 'is_taxable': False,
    },
    {
        'code': 'SENIORITY_ALLOWANCE', 'title': 'پایه سنوات', 'kind': 'earning', 'category': 'allowance',
        'calc_type': 'fixed', 'priority': 22, 'is_insurable': True, 'is_taxable': True,
    },
    {
        'code': 'ATTRACTION_ALLOWANCE', 'title': 'حق جذب', 'kind': 'earning', 'category': 'allowance',
        'calc_type': 'fixed', 'priority': 23, 'is_insurable': True, 'is_taxable': True,
    },
    {
        'code': 'JOB_ALLOWANCE', 'title': 'فوق‌العاده شغل', 'kind': 'earning', 'category': 'allowance',
        'calc_type': 'fixed', 'priority': 24, 'is_insurable': True, 'is_taxable': True,
    },
    {
        'code': 'OTHER_ALLOWANCE', 'title': 'سایر مزایای ثابت', 'kind': 'earning', 'category': 'allowance',
        'calc_type': 'fixed', 'priority': 25, 'is_insurable': True, 'is_taxable': True,
    },
    {
        'code': 'SUPERVISION_ALLOWANCE', 'title': 'حق سرپرستی', 'kind': 'earning', 'category': 'allowance',
        'calc_type': 'fixed', 'priority': 26, 'is_insurable': True, 'is_taxable': True,
    },
    {
        'code': 'HARDSHIP_ALLOWANCE', 'title': 'سختی کار', 'kind': 'earning', 'category': 'allowance',
        'calc_type': 'fixed', 'priority': 27, 'is_insurable': True, 'is_taxable': True,
    },
    {
        'code': 'WORKSHOP_MISSION', 'title': 'ماموریت کارگاهی', 'kind': 'earning', 'category': 'allowance',
        'calc_type': 'fixed', 'priority': 28, 'is_insurable': True, 'is_taxable': True,
    },
    {
        'code': 'MARRIAGE_ALLOWANCE', 'title': 'حق تأهل', 'kind': 'earning', 'category': 'allowance',
        'calc_type': 'fixed', 'priority': 29, 'is_insurable': True, 'is_taxable': True,
    },
    {
        'code': 'CHILD_ALLOWANCE', 'title': 'حق اولاد', 'kind': 'earning', 'category': 'allowance',
        'calc_type': 'fixed', 'priority': 30, 'is_insurable': True, 'is_taxable': True,
    },
    {
        'code': 'TRAVEL_ALLOWANCE', 'title': 'هزینه سفر', 'kind': 'earning', 'category': 'allowance',
        'calc_type': 'fixed', 'priority': 31, 'is_insurable': False, 'is_taxable': False,
    },
    {
        'code': 'PHONE_ALLOWANCE', 'title': 'هزینه تلفن', 'kind': 'earning', 'category': 'allowance',
        'calc_type': 'fixed', 'priority': 32, 'is_insurable': False, 'is_taxable': False,
    },
    {
        'code': 'OVERTIME', 'title': 'اضافه‌کاری', 'kind': 'earning', 'category': 'overtime',
        'calc_type': 'overtime', 'priority': 40, 'is_insurable': True, 'is_taxable': True,
    },
    {
        'code': 'EMPLOYEE_INSURANCE', 'title': 'بیمه سهم کارمند', 'kind': 'deduction',
        'category': 'insurance', 'calc_type': 'insurance', 'priority': 80,
        'is_insurable': False, 'is_taxable': False,
    },
    {
        'code': 'INCOME_TAX', 'title': 'مالیات حقوق', 'kind': 'deduction', 'category': 'tax',
        'calc_type': 'tax', 'priority': 90, 'is_insurable': False, 'is_taxable': False,
    },
    {
        'code': 'LOAN_INSTALLMENT', 'title': 'قسط وام', 'kind': 'deduction', 'category': 'loan',
        'calc_type': 'loan', 'priority': 91, 'is_insurable': False, 'is_taxable': False,
    },
    {
        'code': 'ADVANCE', 'title': 'مساعده', 'kind': 'deduction', 'category': 'advance',
        'calc_type': 'advance', 'priority': 92, 'is_insurable': False, 'is_taxable': False,
    },
    {
        'code': 'OTHER_DEDUCTION', 'title': 'سایر کسورات', 'kind': 'deduction', 'category': 'other',
        'calc_type': 'manual', 'priority': 99, 'is_insurable': False, 'is_taxable': False,
    },
    {
        'code': 'EMPLOYER_INSURANCE', 'title': 'بیمه سهم کارفرما', 'kind': 'employer_cost',
        'category': 'insurance', 'calc_type': 'insurance', 'priority': 120,
        'is_insurable': False, 'is_taxable': False,
    },
]


def ensure_payroll_settings(company):
    if company is None:
        return None
    settings, _ = PayrollSettings.objects.get_or_create(company=company)
    return settings


def ensure_default_components(company):
    """Create missing built-in components without overwriting user changes."""
    if company is None:
        return []
    existing = set(
        PayrollComponent.objects.filter(company=company, is_builtin=True).values_list('code', flat=True)
    )
    created = []
    for row in BUILTIN_COMPONENTS:
        if row['code'] in existing:
            continue
        component = PayrollComponent(company=company, is_builtin=True, **row)
        component.save()
        created.append(component)
    return created
