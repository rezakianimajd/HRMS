"""Effective-dated payroll configuration lookups."""
from decimal import Decimal

from django.db.models import Q

from payroll.models import PayrollInsuranceRate, PayrollSettings, PayrollTaxBracket


def effective_insurance_rate(company, on_date):
    queryset = PayrollInsuranceRate.objects.filter(
        company=company, effective_from__lte=on_date,
    ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=on_date)).order_by('-effective_from')
    return queryset.first()


def effective_tax_brackets(company, on_date):
    return list(
        PayrollTaxBracket.objects.filter(company=company, effective_from__lte=on_date)
        .filter(Q(effective_to__isnull=True) | Q(effective_to__gte=on_date))
        .order_by('lower_bound')
    )


def insurance_values(settings, rate):
    """Effective insurance values, preferring an effective-dated rate row."""
    if rate is not None:
        return {
            'employee_rate': rate.employee_rate,
            'employer_rate': rate.employer_rate,
            'min_base': rate.min_base,
            'max_base': rate.max_base,
            'source': 'rate',
        }
    return {
        'employee_rate': settings.insurance_employee_rate if settings else Decimal('0'),
        'employer_rate': settings.insurance_employer_rate if settings else Decimal('0'),
        'min_base': settings.insurance_min_base if settings else Decimal('0'),
        'max_base': settings.insurance_max_base if settings else Decimal('0'),
        'source': 'settings',
    }


def get_payroll_settings(company):
    if company is None:
        return None
    settings, _ = PayrollSettings.objects.get_or_create(company=company)
    return settings
