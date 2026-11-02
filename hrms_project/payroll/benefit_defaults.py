"""انواع مزایای پیش‌فرض (همان فهرست قبلیِ hardcode شده) برای ساخت تعاریف اولیه."""

DEFAULT_BENEFIT_TYPES = [
    ('performance', 'کارانه'),
    ('eid_fitr', 'عید سعید فطر'),
    ('eid_adha', 'عید سعید قربان'),
    ('eid_ghadir', 'عید سعید غدیر خم'),
    ('imam_reza_birthday', 'تولد امام رضا (ع)'),
    ('sports_allowance', 'کمک هزینه ورزش'),
    ('yalda_night', 'شب یلدا'),
    ('bahman_22', '۲۲ بهمن'),
    ('eid_mabath', 'عید مبعث'),
    ('nowruz_basket', 'سبد نوروزی'),
    ('fatima_birthday', 'تولد حضرت زهرا (س) و روز زن'),
    ('ali_birthday', 'تولد حضرت علی (ع) و روز مرد'),
    ('allowance', 'کمک هزینه'),
    ('birthday', 'زادروز'),
    ('ramadan_basket', 'سبد ماه مبارک رمضان'),
]


def ensure_default_benefit_types(company):
    """اگر شرکت هنوز تعریفی ندارد، انواع پیش‌فرض را یک‌بار می‌سازد."""
    from payroll.models import BenefitTypeDefinition

    if company is None:
        return 0
    existing = set(
        BenefitTypeDefinition.objects.filter(company=company).values_list('code', flat=True),
    )
    rows = [
        BenefitTypeDefinition(company=company, code=code, title=title)
        for code, title in DEFAULT_BENEFIT_TYPES
        if code not in existing
    ]
    if not rows:
        return 0
    BenefitTypeDefinition.objects.bulk_create(rows)
    return len(rows)
