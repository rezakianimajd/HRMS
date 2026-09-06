"""Contract engine — renders a standard 14-article fixed-term contract
from employee + contract-version data, and exposes the fillable fields.

The template mirrors the company's real contract (Z:/ ... 015.رضا کیانی مجد.docx).
"""
from datetime import date


def _fa_price(value):
    """Format a number with Persian digits + thousand separators (no decimals)."""
    if value in (None, ''):
        return '۰'
    try:
        n = int(value)
    except (TypeError, ValueError):
        return '۰'
    digits = '۰۱۲۳۴۵۶۷۸۹'
    return ''.join(digits[int(c)] if c.isdigit() else c for c in f'{n:,}')


def _fa_date(d):
    """Convert a Gregorian date to a Jalali YYYY/MM/DD string (fa digits)."""
    if not d:
        return ''
    import jdatetime as jd
    j = jd.date.fromgregorian(date=d)
    digits = '۰۱۲۳۴۵۶۷۸۹'
    def fa(x):
        return ''.join(digits[int(c)] if c.isdigit() else c for c in str(x))
    return f'{fa(j.year)}/{fa(str(j.month).zfill(2))}/{fa(str(j.day).zfill(2))}'


DEFAULT_ARTICLES = [
    {
        'no': 'ماده 1- طرفین قرارداد',
        'body': (
            '1-1: {company_name} به نشانی: {company_address} به نمایندگی {employer_rep} با سمت مدیر عامل.\n\n'
            '2-1: {employee_side} که در این قرارداد به اختصار (کارپذیر) نامیده می شود.'
        ),
    },
    {
        'no': 'ماده 2- شغل، وظیفه و مسئولیت ها',
        'body': (
            'جایگاه سازمانی کارپذیر در آغاز این قرارداد به عنوان {job_title} تعیین گردیده است و وظایف '
            'به تبع شغل و اختیارات و مسئولیت‌های این جایگاه در شرح وظایف و شناسنامه‌های شغلی که به صورت '
            'جداگانه اطلاع‌رسانی و ارائه می‌شود، خواهد بود.\n\n'
            'تغییرات بعدی وظایف و مسئولیت‌ها در مدت اعتبار قرارداد به اطلاع کارپذیر خواهد رسید.'
        ),
    },
    {
        'no': 'ماده 3- محل خدمت',
        'body': (
            'کارپذیر برای کار در {work_location} استخدام و چنانچه به هر دليل کارفرما خواهان ادامه همكاري '
            'در پروژه‌اي ديگر در تهران يا شهرستان باشد، مراتب را حداکثر ظرف مدت 5 روز به وی ابلاغ نماید. '
            'خودداری از حضور در محل جدید اعلام شده به منزله ترک کار از ناحیه کارپذیر موضوع ماده 25 قانون کار '
            'است و در این صورت مؤسسه می تواند قرارداد را فسخ و یا برابر با ماده 27 قانون کار با وی رفتار نماید.'
        ),
    },
    {
        'no': 'ماده 4- مدت قرارداد',
        'body': (
            'مدت اجرای اين قرارداد از تاريخ {start_date} لغایت آخر وقت اداری مورخ {end_date} بوده و با پایان '
            'مدت، قرارداد حاضر با توجه به بند ("د" و "ه") ماده 21 قانون کار خاتمه یافته تلقی می شود.'
        ),
    },
    {
        'no': 'ماده 5- حقوق، مزايا و حق السعی',
        'body': (
            'به استناد ماده 34 قانون كار، حقوق پایه ماهیانه کارپذیر {base_salary} ریال به انضمام سایر مزایا '
            'مشتمل بر حق جذب {attraction_allowance} ریال، فوق العاده شغل {job_allowance} ریال، حق مسکن '
            '{housing_allowance} ریال، حق بن و خواربار {meal_voucher} ریال، ایاب و ذهاب {travel_cost} ریال، '
            'حق عائله‌مندی {family_allowance} ریال و حق اولاد {children_allowance} ریال است.\n\n'
            '1-5: پرداخت مبالغ مذكور بعد از وضع كسور قانوني (حق بيمه، ماليات بر درآمد، مساعده و وام) صورت ميگيرد.\n'
            '2-5: مصوبات قانوني در مورد افزايش دستمزد و سنوات يا مزاياي قانوني جنبي از تاريخ لازم الاجراء شدن اعمال مي گردد.'
        ),
    },
    {
        'no': 'ماده 6- عیدی و پاداش سالانه',
        'body': (
            'به موجب ماده واحده قانون مربوط به تعیین عیدی و پاداش سالانه کارگران قانون کار مصوب 06/12/1370 '
            'مجلس شورای اسلامی، به ازای یک سال کار، معادل 60 روز و برای کار کمتر از یک سال، به نسبت دوره زمانی '
            'کارکرد در سال، از ماخذ مزد پایه به عنوان عیدی و پاداش سالانه محاسبه و به کارپذیر پرداخت خواهد شد.'
        ),
    },
    {
        'no': 'ماده 7- ساعات كاري',
        'body': (
            'ساعات كار طبق قانون كار تعيين و شروع و خاتمه آن در فصول مختلف در اختيار كارفرما است. '
            'ساعات كار شركت از ساعت 8 الی 17 خواهد بود و کارپذیر متعهد مي شود كه چنانچه كارفرما، ضروري بداند '
            'اضافه‌كاري را انجام دهد و اين اضافه‌كاري شامل كار در روزهاي تعطيل هم مي شود که طبق قانون کار پرداخت مي گردد.\n\n'
            '1-7: چنانچه به هر دليل كارفرما ساعت كار را از صبح به عصر و از روز به شب تعيين نمايد همکار بايد تغيير ساعت را پذيرفته و ادعائي نسبت به تغيير شرايط نخواهد داشت.'
        ),
    },
    {
        'no': 'ماده 8- تعطیلات و مرخصی استحقاقی',
        'body': (
            'مرخصی استحقاقی برابر مفاد ماده 64 قانون به میزان جمعاً یک ماه (با احتساب 4 روز جمعه و 26 روز کاری) '
            'در سال به نسبت کارکرد سالیانه خواهد بود. کارپذیر باید درخواست خود را به‌صورت مکتوب ارائه و پس از تعیین '
            'جانشین و کسب موافقت مسئول مربوط، جز در موارد اضطراری و ماه‌های شلوغ‌کار، به تشخیص مدیریت از مرخصی استفاده کند.'
        ),
    },
    {
        'no': 'ماده 9- رازداری و امانتداری',
        'body': (
            'کارپذیر متعهد است خدمات موضوع ماده 2 قرارداد را با کمال دقت و به نحو مطلوب انجام دهد و در مورد منافع '
            'مؤسسه، اطلاعات، اموال، اسناد، مدارک، وجوه بانک و طرف های حساب مؤسسه که به مناسبت شغل خود به طور امانت '
            'برای انجام کار در اختیار دارد با به هر نحو دیگری به آن دست‌رسی دارد، رعایت رازداری و امانت را بنماید.'
        ),
    },
    {
        'no': 'ماده 10- مسكن و غذا',
        'body': (
            'هزینه اياب‌و‌ذهاب، غذا و اسکان کارپذیر بعهده كارفرما نمي باشد. (مگر با توافق طرفين. همچنین حق مسکن '
            'با‌توجه‌به مصوبات قانونی قابل پرداخت است.)'
        ),
    },
    {
        'no': 'ماده 11- رعايت ضوابط و مقررات',
        'body': (
            'کارپذیر متعهد به رعايت مقررات و آئين‌نامه‌هاي داخلي كارگاه و همچنين رعايت نظم و حفظ شئون اسلامي و اخلاقي است '
            'و همچنين مكلف است كه رعايت بهداشت فردي را بنمايد.\n\n'
            'در صورت عدم موارد فوق كارفرما مجاز به اعمال ماده 27 قانون کار خواهد بود. (طبق آیین‌نامه انضباطی و داخلی شرکت)'
        ),
    },
    {
        'no': 'ماده 12- شرايط فسخ قرارداد',
        'body': (
            'اين قرارداد در موارد ذيل توسط هر يك از طرفين قابل‌فسخ است:\n'
            '1-12: در صورتی که اطلاعات و مدارک پرسنلی ارائه شده از طرف کارپذیر خلاف واقع و جعلی باشد.\n'
            '12-2: در صورتی که اعتیاد کارپذیر برای کارفرما محرز گردد.\n'
            '12-3: هرگاه کارپذیر در انجام وظایف محوله قصور نموده و یا مقررات جاری محیط کار را رعایت ننماید.\n'
            '12-4: هر گونه بی‌مبالاتی (بی‌انضباطی، تخلف، اخلال و ...) که از طرف کارپذیر بروز دهد.\n'
            '12-5: عدم رعايت مقررات حفاظتي و ايمني آیين‌نامه داخلي كارگاه، افشای مسائل شرکت.\n'
            '12-6: ترک کار کارپذیر در صورتی که بیش از 3 روز متوالی (بدون احتساب روزهای تعطیل) و 5 روز متناوب بدون هماهنگی باشد.\n'
            '12-7: تشخیص مؤسسه مبنی بر اینکه اقدامات کارپذیر از نظر تطابق با موارد قرارداد، شرح خدمات پیوست و یا از نظر کیفیت و کمیت در وضع مطلوب نبوده یا پیشرفت لازم را نداشته باشد.\n'
            '12-8: چنانچه کارپذیر مایل به ادامه همکاری نباشد.'
        ),
    },
    {
        'no': 'ماده 13- ساير موارد',
        'body': (
            '1-13: انعقاد اين قرارداد، هيچ‌گونه حقي مبني بر تمديد قرارداد و يا استخدام دائم و يا حقوق بيش از ميزان تعيين شده در قانون كار و مصوبات جانبي آن براي کارپذیر ايجاد ننموده و فقط براي مدت مندرج در ماده 4 قرارداد معتبر است.\n\n'
            '2-13: همکار مكلف است در صورت تغيير محل سكونت، نشانی جديد را به كارفرما ارائه نمايد. در غير اين صورت نشاني در صفحه 1 اين قرارداد به‌عنوان آدرس قانوني همکار تلقي مي گردد.\n\n'
            '3-13: پرداخت دستمزد ايام بيماري، تابع ضوابط مندرج در قانون تأمین اجتماعي است.\n\n'
            '4-13: به موجب ماده 148 قانون کار، کارپذیر از تاریخ شروع به کار در مؤسسه، نزد سازمان تامین اجتماعی بیمه است و مؤسسه حق بیمه سهم کارپذیر را همه ماهه کسر و به‌ اضافه سهم خود به سازمان تامین اجتماعی واریز خواهد کرد.\n\n'
            '5-13: در ساير موارد پيش‌بيني‌نشده در قرارداد، مقررات قانون كار حاكم است.'
        ),
    },
    {
        'no': 'ماده 14- نسخ',
        'body': (
            'قرارداد حاضر براساس مقررات قانون کار و اصلاحات موضوع بند الف ماده 8 قانون رفع برخی از موانع تولید و سرمایه گذاری صنعتی مصوب 25/08/1387 مجمع تشخیص مصلحت نظام، در 14 ماده و در 2 نسخه به طور منجز، تنظیم، امضای و مبادله شد.'
        ),
    },
]


def _get_profile(company):
    """Return the CompanyProfile for the tenant (or None)."""
    if company is None:
        return None
    try:
        return company.profile
    except Exception:
        return None


def render_contract(contract, company=None):
    """Render the standard contract text as a single string."""
    emp = contract.employee
    profile = _get_profile(company)

    company_name = (
        (getattr(profile, 'legal_name', '') or getattr(profile, 'company_name', ''))
        or (getattr(company, 'name', '') if company else '')
        or 'مؤسسه ...'
    )
    company_address = (
        getattr(profile, 'address', '')
        or (getattr(company, 'address', '') if company else '')
        or '...'
    )
    employer_rep = (
        getattr(profile, 'employer_rep_name', '') or 'حسین سلیمانی'
    )
    employer_rep_title = getattr(profile, 'employer_rep_title', '') or 'مدیر عامل'

    # Employee side: full name + father + birth cert + birth info + national id + address
    employee_side = (
        f'آقای {emp.full_name} فرزند {emp.father_name or "..."} '
        f'به شماره شناسنامه {emp.birth_certificate_number or "..."} '
        f'متولد {_fa_date(emp.birth_date) or "..."} شهر {emp.birth_place or "..."} '
        f'و کد ملی {emp.national_id or "..."} به نشانی {emp.address or "..."}'
    )

    values = {
        'company_name': company_name,
        'company_address': company_address,
        'employer_rep': employer_rep,
        'employee_side': employee_side,
        'employer_rep_title': employer_rep_title,
        'job_title': emp.job_title.name if emp.job_title else 'کارشناس',
        'work_location': emp.work_location.name if emp.work_location else 'دفتر مرکزی',
        'start_date': _fa_date(contract.start_date),
        'end_date': _fa_date(contract.end_date),
        'base_salary': _fa_price(contract.base_salary),
        'attraction_allowance': _fa_price(contract.attraction_allowance),
        'job_allowance': _fa_price(contract.job_allowance),
        'housing_allowance': _fa_price(contract.housing_allowance),
        'meal_voucher': _fa_price(contract.meal_voucher),
        'travel_cost': _fa_price(contract.travel_cost),
        'family_allowance': _fa_price(contract.family_allowance),
        'children_allowance': _fa_price(contract.children_allowance),
    }

    parts = ['قرارداد کار مدت معین', '', '']
    for article in DEFAULT_ARTICLES:
        parts.append(article['no'])
        parts.append(article['body'].format(**values))
        parts.append('')
    parts.append('')
    parts.append(f'{employer_rep_title}                                                                 نام و نام خانوادگی کارپذیر')

    return '\n'.join(parts)
