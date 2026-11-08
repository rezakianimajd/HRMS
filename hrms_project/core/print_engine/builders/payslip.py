"""فیش حقوقی — سند سروری موتور چاپ."""
from core.print_engine import components as pe
from core.print_engine.registry import PrintError, can_print

EARNINGS_LABELS = [
    ('base_salary', 'حقوق پایه'),
    ('overtime_pay', 'اضافه‌کاری'),
    ('night_shift', 'شب‌کاری'),
    ('shift_work', 'نوبت‌کاری'),
    ('attraction_allowance', 'حق جذب'),
    ('supervision_allowance', 'حق سرپرستی'),
    ('workshop_mission', 'ماموریت کارگاهی'),
    ('seniority_base', 'پایه سنوات'),
    ('job_allowance', 'فوق‌العاده شغل'),
    ('hardship_allowance', 'سختی کار'),
    ('travel_cost', 'هزینه سفر'),
    ('housing_allowance', 'حق مسکن'),
    ('marriage_allowance', 'حق تأهل'),
    ('children_allowance', 'حق اولاد'),
    ('meal_voucher', 'بن کارکنان'),
    ('deferred_salary_1', 'حقوق معوقه ۱'),
    ('deferred_salary_2', 'حقوق معوقه ۲'),
    ('bonus_reserve', 'عیدی و ذخیره'),
    ('other_benefits', 'سایر مزایا'),
    ('mission_allowance', 'حق مأموریت'),
]

DEDUCTION_LABELS = [
    ('employee_insurance', 'حق بیمه سهم پرسنل'),
    ('tax', 'مالیات'),
    ('advance', 'مساعده'),
    ('supplementary_insurance', 'بیمه تکمیلی'),
    ('employee_loan', 'وام کارکنان'),
    ('work_deduction', 'کسر کار'),
]

MONEY_COLUMNS = [
    {'key': 'label', 'label': 'شرح', 'width': '62%'},
    {'key': 'amount', 'label': 'مبلغ (ریال)', 'format': 'money', 'unit': '',
     'align': 'left', 'width': '38%'},
]


def _amount(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def payslip_document(data):
    """ساختار سند «فیش حقوقی» از دادهٔ آماده (بدون دیتابیس)."""
    employee = data.get('employee') or {}
    earnings = [row for row in (data.get('earnings') or []) if _amount(row.get('amount'))]
    deductions = [row for row in (data.get('deductions') or []) if _amount(row.get('amount'))]
    total_benefits = _amount(data.get('total_benefits')) or sum(
        _amount(row.get('amount')) for row in earnings
    )
    total_deductions = _amount(data.get('total_deductions')) or sum(
        _amount(row.get('amount')) for row in deductions
    )
    net_payable = _amount(data.get('net_payable')) or (total_benefits - total_deductions)

    earnings_table = pe.data_table(MONEY_COLUMNS, earnings, {
        'zebra': False,
        'total_row': {'label': 'جمع حقوق و مزایا', 'colspan': 1,
                      'value': pe.money(total_benefits, with_unit=False)},
    })
    deductions_table = pe.data_table(MONEY_COLUMNS, deductions, {
        'zebra': False,
        'total_row': {'label': 'جمع کسورات', 'colspan': 1,
                      'value': pe.money(total_deductions, with_unit=False)},
    })

    identity = pe.field_grid([
        ('نام و نام خانوادگی', employee.get('name', '')),
        ('کد پرسنلی', pe.fa_digits(employee.get('code') or '')),
        ('کد ملی', pe.fa_digits(employee.get('national_id') or '')),
        ('سمت', employee.get('position', '')),
        ('واحد سازمانی', employee.get('department', '')),
        ('شماره حساب / شبا', employee.get('bank_account', '')),
    ])
    work = pe.field_grid([
        ('کارکرد (روز)', pe.fa_digits(data.get('work_days') or 0)),
        ('اضافه‌کار (ساعت)', pe.fa_digits(data.get('overtime_hours') or 0)),
        ('مشمول بیمه', pe.money(data.get('insurance_subject'), with_unit=False)),
        ('حق بیمه سهم کارفرما', pe.money(data.get('employer_insurance'), with_unit=False)),
    ], columns=2)

    return {
        'title': 'فیش حقوقی',
        'subtitle': data.get('period_label') or '',
        'badge': data.get('status_label') or '',
        'company': data.get('company') or {},
        'meta': [
            ('دوره', data.get('period_label') or ''),
            ('شماره پرسنلی', pe.fa_digits(employee.get('code') or '')),
        ],
        'sections': [
            {'title': 'مشخصات پرسنل', 'html': identity},
            {'title': 'کارکرد و بیمه', 'html': work},
            {
                'title': 'حقوق، مزایا و کسورات',
                'html': (
                    '<div style="display:flex;gap:6px;align-items:flex-start">'
                    f'<div style="flex:1;min-width:0">{earnings_table}</div>'
                    f'<div style="flex:1;min-width:0">{deductions_table}</div>'
                    '</div>'
                ),
            },
        ],
        'amount_box': {
            'words': data.get('net_words') or pe.amount_words(net_payable),
            'value': pe.money(net_payable),
        },
        'note': data.get('note') or '',
        'barcode': pe.barcode(data.get('barcode_value') or ''),
        'signatures': pe.signatures([
            {'title': 'تهیه‌کننده'},
            {'title': 'واحد مالی'},
            {'title': 'مهر و امضا'},
        ]),
        'printed_on': data.get('printed_on'),
    }


def _employee_brief(employee):
    if not employee:
        return {}
    department = getattr(employee, 'department', None)
    return {
        'name': getattr(employee, 'full_name', '') or '',
        'code': (getattr(employee, 'employee_id', '')
                 or getattr(employee, 'personnel_code', '') or ''),
        'national_id': getattr(employee, 'national_id', '') or '',
        'position': getattr(employee, 'position', '') or getattr(employee, 'job_title', '') or '',
        'department': getattr(department, 'name', '') or '',
        'bank_account': (getattr(employee, 'sheba_number', '')
                         or getattr(employee, 'bank_account', '') or ''),
    }


def load_payslip(payload, options=None, request=None):
    """خواندن فیش حقوقی از دیتابیس و ساخت سند چاپی."""
    from payroll.models import SalaryRecord

    if not can_print(getattr(request, 'user', None), 'hrms'):
        raise PrintError('برای چاپ فیش حقوقی مجوز لازم را ندارید.', 403)

    company = getattr(request, 'tenant', None) or getattr(request, 'company', None)
    queryset = SalaryRecord.objects.select_related('employee', 'employee__department')
    if company:
        queryset = queryset.filter(company=company)
    record = queryset.filter(pk=payload.get('id')).first()
    if not record:
        raise PrintError('فیش حقوقی موردنظر یافت نشد.', 404)

    return payslip_document({
        'company': {
            'name': getattr(company, 'name', '') or '',
            'subtitle': getattr(company, 'code', '') or '',
        },
        'employee': _employee_brief(getattr(record, 'employee', None)),
        'period_label': f'{pe.fa_digits(record.year)} — {record.get_month_display()}',
        'work_days': record.work_days,
        'overtime_hours': record.overtime_hours,
        'insurance_subject': record.insurance_subject,
        'employer_insurance': record.employer_insurance,
        'earnings': [
            {'label': label, 'amount': getattr(record, field, 0) or 0}
            for field, label in EARNINGS_LABELS
        ],
        'deductions': [
            {'label': label, 'amount': getattr(record, field, 0) or 0}
            for field, label in DEDUCTION_LABELS
        ],
        'total_benefits': record.total_benefits,
        'total_deductions': record.total_deductions,
        'net_payable': record.net_payable,
        'note': 'این فیش بدون مهر و امضای واحد مالی فاقد اعتبار است.',
        'barcode_value': f'PAY-{record.pk}-{record.year}-{record.month}',
        'printed_on': payload.get('printed_on'),
    })
