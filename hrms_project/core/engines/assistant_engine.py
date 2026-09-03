"""
HR Assistant Engine — hybrid approach:
  1) Intent + Entity + SQL  (precise answers for structured data)
  2) Lightweight semantic retrieval (char n-gram TF-IDF, no heavy deps)
     for RAG over documents / knowledge base
  3) Risk-of-resignation scoring

100% offline, pure Python, near-zero latency, negligible footprint.
No torch, no external model download.
"""
import re
import math
from collections import defaultdict
from datetime import date, timedelta
from django.db.models import Sum
from core.engines.analytics_engine import AnalyticsEngine  # multi-step analytic intents


# ---------------------------------------------------------------------------
# 1. Text normalization (Persian/Arabic normalization + ZWNJ + digits)
# ---------------------------------------------------------------------------
_DIGIT_MAP = str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789')
_CHAR_MAP = str.maketrans({
    'ي': 'ی', 'ك': 'ک', 'ۀ': 'ه', 'آ': 'ا', 'أ': 'ا', 'إ': 'ا', 'ة': 'ه',
    'ؤ': 'و', 'ئ': 'ی',
})


def normalize(text):
    """
    Normalize Persian/Arabic text to a canonical searchable form.
      * maps Arabic chars (ي,ك,ة,أ...) to Persian
      * converts Persian/Arabic digits to English
      * replaces ZWNJ (نیمفاصله) with a space
      * removes punctuation, collapses whitespace
    """
    if not text:
        return ''
    s = str(text).translate(_CHAR_MAP).translate(_DIGIT_MAP)
    # ZWNJ: ‌ is a separator between morphemes; replacing by nothing joins
    # incorrectly (میکنم vs می کنم), replacing by space keeps tokens aligned.
    s = s.replace('\u200c', ' ')
    s = s.lower()
    s = re.sub(r'[^\w\s]', ' ', s, flags=re.UNICODE)
    s = re.sub(r'\s+', ' ', s).strip()
    return s


# ---------------------------------------------------------------------------
# 2. Field-intent synonyms (the "training" data)
# ---------------------------------------------------------------------------
FIELD_SYNONYMS = {
    'hire_date':      ['استخدام', 'شروع به کار', 'تاریخ ورود', 'ورود به شرکت', 'کی اومد', 'کی استخدام شد', 'چه زمانی استخدام', 'تاریخ شروع کار', 'کی استخدام شده', 'سابقه حضور', 'از کی اینجاست', 'کی وارد شرکت شد', 'چند وقته اینجاست'],
    'address':        ['آدرس', 'نشانی', 'محل سکونت', 'کجا زندگی', 'کجاست خونه', 'کجا ساکنه', 'محل اقامت', 'خانه اش کجاست', 'آدرس خونه'],
    'mobile':         ['موبایل', 'تلفن', 'شماره تماس', 'شماره موبایل', 'تماس', 'چطوری باهاش تماس بگیرم', 'شماره اش', 'همراه'],
    'birth_date':     ['تولد', 'متولد', 'تاریخ تولد', 'کی به دنیا اومده', 'زادروز', 'تولدش کیه', 'چندماهی متولد شده'],
    'department':     ['دپارتمان', 'بخش', 'واحد', 'کدوم دپارتمان', 'اداره', 'کدوم بخش', 'دپارتمانتش کجاست', 'محل کار سازمانی'],
    'job_title':      ['عنوان شغلی', 'سمت', 'شغل', 'پست', 'سمتش چیه', 'چی کاره', 'شغلش چیه', 'عنوان سازمانی', 'نقشش'],
    'contract':       ['قرارداد', 'پایان قرارداد', 'نوع قرارداد', 'انقضا', 'قراردادش کی تموم میشه', 'تمدید قرارداد', 'تاریخ اتمام قرارداد', 'قراردادش چیه'],
    'benefit':        ['مزایای رفاهی', 'مزایا', 'کارانه', 'عیدی', 'بن کار', 'بن ', 'وام', 'هدیه', 'کمک هزینه', 'رفاهی', 'پاداش', 'سبد', 'مناسبت', 'پاداش پایان سال', 'مزایای این ماه'],
    'payroll':        ['حقوق', 'دریافت', 'پرداخت', 'فیش', 'کسور', 'خالص', 'دریافتی', 'حقوقش چقدره', 'مبلغ حقوق', 'فیش حقوقی', 'چقدر حقوق میگیره', 'دستمزد', 'حقوق ماه '],
    'work_days':      ['کارکرد', 'روز کار', 'کار کرده', 'چند روز کار', 'روزهای کاری', 'کارکرد ماه', 'چند روز حضور داشته', 'حضور کار'],
    'documents':      ['مدرک', 'سند', 'مدارک', 'مدرکش', 'مدارکش چیه', 'چه مدارکی داره', 'اسناد'],
    'national_id':     ['کد ملی', 'شماره ملی', 'کدملیش چیه'],
    'employee_id':     ['کد پرسنلی', 'شماره پرسنلی', 'کد پرسنلیش', 'شماره کارمندیش'],
    'gender':          ['جنسیت', 'مرد', 'زن', 'آقا', 'خانم', 'مذکر', 'مونث'],
    'marital_status':  ['تاهل', 'مجرد', 'متاهل', 'وضعیت تاهل', 'ازدواج کرده', 'وضعیت تاهلش'],
    'children':        ['فرزند', 'بچه', 'تعداد بچه', 'چند تا بچه داره', 'فرزند داره', 'تعداد فرزندان'],
    'age':             ['سن', 'چند سالش', 'چند سالشه', 'سنش چقدره', 'چند سال داره', 'چه سالی به دنیا اومده'],
    'education':       ['تحصیلات', 'مدرک تحصیلی', 'رشته', 'لیسانس', 'فوق لیسانس', 'دکتری', 'دیپلم', 'کاردانی', 'کارشناسی ارشد', 'مقطع تحصیلی', 'تحصیلاتش چیه', 'رشته تحصیلی'],
    'city':            ['شهر', 'اهل کجا', 'ساکن کجا', 'کدوم شهر', 'شهر محل سکونت', 'اهل کدوم شهره'],
    'distance':        ['مسافت', 'فاصله', 'راه تا محل کار', 'کیلومتر تا محل کار', 'چند کیلومتر فاصله داره', 'دورش از شرکت'],
    'performance':     ['عملکرد', 'پرفورمنس', 'نمره ارزیابی', 'نمره عملکرد', 'عملکردش چطوره', 'ارزیابی عملکرد', 'نمره ارزیابی‌اش'],
    'satisfaction':    ['رضایت', 'رضایت شغلی', 'نمره رضایت', 'چقدر راضیه', 'رضایتش از کار'],
    'work_experience': ['سابقه کار', 'سابقه کاری', 'سوابق کاری', 'سابقه قبل از استخدام', 'تجربه کاری', 'چند سال سابقه داره'],
    'work_hours':      ['ساعت کاری', 'ساعت شروع', 'ساعت پایان', 'ساعت ورود', 'ساعت خروج', 'شیفت کاری', 'ساعت کاریش چیه', 'چه ساعتی میاد', 'چند شیفت کار میکنه'],
    'score':           ['امتیاز', 'نمره کل', 'ارزیابی کلی', 'امتیازدهی', 'رتبه', 'نمره نهایی', 'امتیاز کلی'],
    'leave':           ['مرخصی', 'مانده مرخصی', 'مصرفی مرخصی', 'مرخصی استحقاقی', 'مرخصی استعلاجی', 'چند روز مرخصی', 'چقدر مرخصی داره', 'بدهی مرخصی', 'تعادل مرخصی'],
    'penalty':         ['جریمه', 'جرائم', 'کسری', 'توبیخ', 'دیرکرد جریمه', 'چقدر جریمه شده', 'جرائم انضباطی'],
}

# general intents (no specific employee)
GENERAL_INTENTS = [
    ('total_employees',  ['چند پرسنل', 'تعداد پرسنل', 'چند نفر پرسنل', 'تعداد کارمند', 'چند کارمند', 'تعداد کارمندا', 'چند نفر نیرو', 'مجموع کارکنان', 'چند نفر اینجا کار می کنند', 'چند نفر استخدام دارید', 'چند نفر نیروی فعال']),
    ('turnover',         ['نرخ خروج', 'ترک خدمت', 'اخراج', 'بازنشستگی', 'نرخ ترک', 'خروجی کارمند', 'چه کسایی رفتن', 'چند نفر اخراج شدن']),
    ('birthdays',        ['تولد ۷ روز', 'تولد هفت روز', 'تولدهای آینده', 'تولد این هفته', 'چه کسانی تولد دارند', 'تولد کی هاس', 'تولد چه کسی نزدیکه', 'تولدهای پیش رو']),
    ('contracts',        ['قرارداد در شرف', 'قراردادهای در حال', 'پایان قراردادها', 'قرارداد کی تموم میشه', 'چه کسانی قراردادشون تموم میشه']),
    ('documents_total',  ['چند مدرک', 'تعداد مدارک', 'چند تا سند', 'تعداد اسناد']),
    ('resignation_risk', ['احتمال استعفا', 'ریسک خروج', 'ریسک استعفا', 'احتمال خروج', 'چه کسانی ممکن است استعفا', 'چه کسی استعفا میدهد', 'چه کسانی در معرض ترک هستند']),
    ('correspondences',  ['مکاتبات', 'نامه وارده', 'نامه صادره', 'ابلاغ', 'فرم', 'چند تا نامه', 'مکاتبات اخیر']),
    ('salary_total',     ['جمع حقوق', 'مجموع حقوق', 'کل حقوق', 'مجموع پرداخت', 'هزینه حقوق کل', 'کل حقوق پرداختی']),
    ('greeting',         ['سلام', 'درود', 'هی', 'خوبی', 'سلام به تو', 'هی ربات']),
    ('thanks',           ['ممنون', 'تشکر', 'مرسی', 'سپاس', 'دمت گرم']),
    ('scoring',          ['امتیاز کارکنان', 'رتبه بندی کارکنان', 'بهترین کارمند', 'برترین کارمند', 'ارزیابی کارکنان', 'امتیازدهی کارکنان', 'رتبه بندی نیروها', 'بهترین نیرو']),
    ('chart',            ['نمودار', 'چارت', 'دیاگرام', 'نمودار پرسنل', 'نمودار دپارتمان', 'نمودار جنسیت', 'نمودار عنوان', 'نمودار محل', 'نمودار بده']),
]


def detect_field(norm_q):
    """Return the best matching field intent name for a normalized query."""
    for field, phrases in FIELD_SYNONYMS.items():
        for p in phrases:
            if p in norm_q:
                return field
    return None


def detect_general_intent(norm_q):
    for intent, phrases in GENERAL_INTENTS:
        for p in phrases:
            if p in norm_q:
                return intent
    return None


# ---------------------------------------------------------------------------
# 3. Employee extraction with fuzzy name matching (char n-gram dice)
# ---------------------------------------------------------------------------
def _ngrams(s, n=3):
    s = ' ' + s + ' '
    return {s[i:i+n] for i in range(max(1, len(s) - n + 1))}


def _dice(a, b):
    ga, gb = _ngrams(a), _ngrams(b)
    if not ga or not gb:
        return 0.0
    return (2.0 * len(ga & gb)) / (len(ga) + len(gb))


def extract_employee(norm_q, employees):
    """Find the employee mentioned in the question, else None."""
    if not employees:
        return None

    # 1) exact employee_id / national_id
    for e in employees:
        if e.get('employee_id') and normalize(e['employee_id']) in norm_q:
            return e
        if e.get('national_id') and normalize(e['national_id']) in norm_q:
            return e

    # 2) fuzzy name matching (first/last/full)
    best, best_score = None, 0.0
    for e in employees:
        full = normalize(e.get('full_name', ''))
        first = normalize(e.get('first_name', ''))
        last = normalize(e.get('last_name', ''))
        score = max(
            _dice(norm_q, full),
            _dice(norm_q, first) if first else 0,
            _dice(norm_q, last) * 0.8 if last else 0,
        )
        # boost if a full token matches
        if first and first in norm_q:
            score += 0.3
        if last and last in norm_q:
            score += 0.3
        if score > best_score:
            best, best_score = e, score

    return best if best_score >= 0.35 else None


# ---------------------------------------------------------------------------
# 4. Lightweight semantic index (RAG) — char trigram TF-IDF + cosine
# ---------------------------------------------------------------------------
class SemanticIndex:
    """Tiny, dependency-free TF-IDF retriever over a small corpus."""

    def __init__(self, docs):
        # docs: list of {"id": ..., "text": ...}
        self.docs = docs
        self.df = defaultdict(int)
        self.doc_vecs = []
        self.build()

    def build(self):
        self.doc_tokens = []
        for d in self.docs:
            tokens = list(_ngrams(normalize(d['text']), n=3))
            self.doc_tokens.append(tokens)
            for t in set(tokens):
                self.df[t] += 1
        self.n_docs = max(1, len(self.docs))
        self.idf = {t: math.log(1 + (self.n_docs / (1 + self.df[t]))) for t in self.df}
        for tokens in self.doc_tokens:
            self.doc_vecs.append(self._vec(tokens))

    def _vec(self, tokens):
        tf = defaultdict(int)
        for t in tokens:
            tf[t] += 1
        norm = math.sqrt(sum((c * self.idf.get(t, 0)) ** 2 for t, c in tf.items())) or 1
        return {t: (c * self.idf.get(t, 0)) / norm for t, c in tf.items()}

    def search(self, query, top_k=5, threshold=0.05):
        q_tokens = list(_ngrams(normalize(query), n=3))
        q_vec = self._vec(q_tokens)
        scored = []
        for i, dv in enumerate(self.doc_vecs):
            dot = sum(w * dv.get(t, 0) for t, w in q_vec.items())
            if dot >= threshold:
                scored.append((dot, self.docs[i]))
        scored.sort(key=lambda x: -x[0])
        return [d for _, d in scored[:top_k]]


# ---------------------------------------------------------------------------
# 5. Main answer engine
# ---------------------------------------------------------------------------
class AssistantEngine:
    """Hybrid HR assistant."""

    MONTHS = {
        '1': 'فروردین', '2': 'اردیبهشت', '3': 'خرداد', '4': 'تیر',
        '5': 'مرداد', '6': 'شهریور', '7': 'مهر', '8': 'آبان',
        '9': 'آذر', '10': 'دی', '11': 'بهمن', '12': 'اسفند',
    }

    @staticmethod
    def answer(query, company=None):
        """Answer a free-text question using structured data + retrieval."""
        from employees.models import Employee
        from payroll.models import SalaryRecord, BenefitRecord
        from documents.models import Document

        q = normalize(query)
        if not q:
            return {'answer': 'سوالی ننوشته‌اید.', 'type': 'none'}

        # Quick help / capabilities summary
        if ('کمک' in q and 'کنی' in q) or ('چه کارهایی' in q) or ('چه قابلیت' in q) or ('help' in q) or ('راهنما' in q):
            return {
                'answer': (
                    'می‌توانم از شما بپرسم:\n'
                    '• «آدرس [نام]»، «تاریخ استخدام [نام]»، «موبایل [نام]»\n'
                    '• «حقوق [نام]»، «کارکرد [نام]», «مزایای [نام]»\n'
                    '• «مانده مرخصی [نام]»، «مدارک [نام]»، «جرائم [نام]»\n'
                    '• «چند پرسنل فعال؟»، «نرخ ترک خدمت امسال؟»\n'
                    '• «احتمال استعفا چه کسانی بیشتره؟»\n'
                    '• «نمودار دپارتمان»، «رتبه‌بندی کارکنان»'
                ),
                'type': 'help',
            }

        # Load employees into memory once
        emp_qs = Employee.objects.select_related(
            'department', 'job_title', 'work_location', 'contract_type'
        )
        if company:
            emp_qs = emp_qs.filter(company=company, is_active=True)

        employees = [
            {
                'id': e.id,
                'first_name': e.first_name,
                'last_name': e.last_name,
                'full_name': e.full_name,
                'employee_id': e.employee_id,
                'national_id': e.national_id,
                'mobile': e.mobile,
                'address': e.address,
                'birth_date': e.birth_date,
                'hire_date': e.hire_date,
                'gender': e.get_gender_display(),
                'marital_status': e.get_marital_status_display(),
                'children_count': e.children_count,
                'status': e.get_status_display(),
                'department_name': e.department.name if e.department else '',
                'job_title_name': e.job_title.name if e.job_title else '',
                'work_location_name': e.work_location.name if e.work_location else '',
                'contract_type_name': e.contract_type.name if e.contract_type else '',
                'contract_start_date': e.contract_start_date,
                'contract_end_date': e.contract_end_date,
                # New evaluation fields
                'city': e.city,
                'education_level': e.get_education_level_display() or '',
                'education_field': e.education_field,
                'distance_to_work_km': e.distance_to_work_km,
                'housing_type': e.get_housing_type_display() or '',
                'has_car': e.has_car,
                'performance_score': e.performance_score,
                'satisfaction_score': e.satisfaction_score,
                'work_start_time': e.work_start_time,
                'work_end_time': e.work_end_time,
            }
            for e in emp_qs
        ]

        # ---- 0) resignation risk (general) ----
        if detect_general_intent(q) == 'resignation_risk':
            return AssistantEngine._resignation_risk(company, employees, q)

        # ---- 1) specific employee questions ----
        emp = extract_employee(q, employees)
        if emp:
            # پرسش مرکب: حقوق + کارکرد + مزایا / غیبت / مرخصی در یک سؤال
            if AssistantEngine._is_compound(q):
                return AssistantEngine._answer_employee_combined(q, emp, company)
            field = detect_field(q)
            return AssistantEngine._answer_employee(q, emp, field, company)

        # ---- 2) general intents ----
        intent = detect_general_intent(q)
        if intent:
            return AssistantEngine._answer_general(q, intent, company, employees)

        # ---- 3) Advanced multi-step analytics (cross-cutting) ----
        anal = AnalyticsEngine.detect(q, company=company)
        if anal:
            return anal

        # ---- 4) RAG over documents + knowledge base (semantic fallback) ----
        rag = AssistantEngine._rag_search(q, company)
        if rag:
            return {'answer': rag, 'type': 'rag'}

        return {
            'answer': (
                'من این سوال را دقیقاً متوجه نشدم. می‌توانید درباره مواردی مثل '
                '«تاریخ استخدام [نام]»، «آدرس [نام]»، «کارکرد ماه گذشته [نام]»، '
                '«مدارک [نام]»، «حقوق [نام]»، «احتمال استعفا چه کسانی؟» و ... بپرسید.'
            ),
            'type': 'fallback',
        }

    # -- specific employee ----------------------------------------------------
    @staticmethod
    def _answer_employee(q, emp, field, company):
        from payroll.models import SalaryRecord, BenefitRecord
        from documents.models import Document

        name = emp['full_name']

        if field in ('birth_date', 'age'):
            if emp['birth_date']:
                if field == 'age':
                    age = AssistantEngine._age(emp['birth_date'])
                    return {'answer': f'{name} حدود {age} سال دارد.', 'type': 'employee'}
                return {'answer': f'تاریخ تولد {name}: {AssistantEngine._jalali(emp["birth_date"])} است.', 'type': 'employee'}
            return {'answer': f'تاریخ تولد {name} ثبت نشده است.', 'type': 'employee'}

        if field == 'hire_date':
            if emp['hire_date']:
                return {'answer': f'تاریخ استخدام {name}: {AssistantEngine._jalali(emp["hire_date"])} است.', 'type': 'employee'}
            return {'answer': f'تاریخ استخدام {name} ثبت نشده است.', 'type': 'employee'}

        if field == 'address':
            if emp['address']:
                return {'answer': f'آدرس {name}: {emp["address"]} است.', 'type': 'employee'}
            return {'answer': f'آدرسی برای {name} ثبت نشده است.', 'type': 'employee'}

        if field == 'mobile':
            if emp['mobile']:
                return {'answer': f'شماره موبایل {name}: {AssistantEngine._fa_num(emp["mobile"])}', 'type': 'employee'}
            return {'answer': f'موبایلی برای {name} ثبت نشده است.', 'type': 'employee'}

        if field == 'national_id':
            return {'answer': f'کد ملی {name}: {AssistantEngine._fa_num(emp["national_id"]) or "ثبت نشده"}.', 'type': 'employee'}
        if field == 'employee_id':
            return {'answer': f'کد پرسنلی {name}: {AssistantEngine._fa_num(emp["employee_id"])}.', 'type': 'employee'}

        if field == 'department':
            return {'answer': f'{name} در دپارتمان «{emp["department_name"] or "نامشخص"}» است.', 'type': 'employee'}
        if field == 'job_title':
            return {'answer': f'عنوان شغلی {name}: «{emp["job_title_name"] or "نامشخص"}».', 'type': 'employee'}
        if field == 'gender':
            return {'answer': f'جنسیت {name}: {emp["gender"] or "نامشخص"}.', 'type': 'employee'}
        if field == 'marital_status':
            return {'answer': f'وضعیت تأهل {name}: {emp["marital_status"] or "نامشخص"}.', 'type': 'employee'}
        if field == 'children':
            return {'answer': f'{name} دارای {AssistantEngine._fa_num(emp["children_count"] or 0)} فرزند است.', 'type': 'employee'}

        if field == 'education':
            parts = []
            if emp['education_level']:
                parts.append(f'میزان تحصیلات: {emp["education_level"]}')
            if emp['education_field']:
                parts.append(f'رشته / مدرک تحصیلی: {emp["education_field"]}')
            return {'answer': (f'تحصیلات {name}:\n' + '\n'.join(parts)) if parts else f'تحصیلات {name} ثبت نشده است.', 'type': 'employee'}

        if field == 'city':
            return {'answer': f'شهر محل سکونت {name}: {emp["city"] or "ثبت نشده"}.', 'type': 'employee'}

        if field == 'distance':
            return {'answer': f'مسافت خانه تا محل کار {name}: {AssistantEngine._fa_num(emp["distance_to_work_km"] or 0)} کیلومتر.', 'type': 'employee'}

        if field == 'performance':
            return {'answer': f'نمره عملکرد {name}: {AssistantEngine._fa_num(emp["performance_score"]) if emp["performance_score"] is not None else "ثبت نشده"} (از ۱۰۰).', 'type': 'employee'}

        if field == 'satisfaction':
            return {'answer': f'نمره رضایت شغلی {name}: {AssistantEngine._fa_num(emp["satisfaction_score"]) if emp["satisfaction_score"] is not None else "ثبت نشده"} (از ۱۰۰).', 'type': 'employee'}

        if field == 'work_hours':
            start = AssistantEngine._fa_num(emp['work_start_time']) if emp['work_start_time'] else 'ثبت نشده'
            end = AssistantEngine._fa_num(emp['work_end_time']) if emp['work_end_time'] else 'ثبت نشده'
            return {'answer': f'ساعت کاری {name}: از {start} تا {end}.', 'type': 'employee'}

        if field == 'work_experience':
            return AssistantEngine._answer_employee_work_experience(q, emp, company)

        if field == 'score':
            return AssistantEngine._answer_employee_score(emp, company)

        if field == 'contract':
            parts = []
            if emp['contract_type_name']:
                parts.append(f'نوع قرارداد: {emp["contract_type_name"]}')
            if emp['contract_start_date']:
                parts.append(f'شروع: {AssistantEngine._jalali(emp["contract_start_date"])}')
            if emp['contract_end_date']:
                parts.append(f'پایان: {AssistantEngine._jalali(emp["contract_end_date"])}')
            return {'answer': (f'قرارداد {name}:\n' + '\n'.join(parts)) if parts else f'قراردادی برای {name} ثبت نشده است.', 'type': 'employee'}

        # welfare benefits — full history with year/latest/type
        if field == 'benefit':
            return AssistantEngine._answer_employee_benefit(q, emp, company)

        # payroll / work_days — full history with year/month extraction
        if field in ('payroll', 'work_days'):
            return AssistantEngine._answer_employee_payroll(q, emp, field, company)

        # leave (مرخصی) — mask/مصرفی
        if field == 'leave':
            return AssistantEngine._answer_employee_leave(q, emp, company)

        # penalty (جرائم) — list + sum
        if field == 'penalty':
            return AssistantEngine._answer_employee_penalty(q, emp, company)

        # documents of the employee
        if field == 'documents':
            D = Document.objects.filter(employee_id=emp['id'], is_active=True)
            if company:
                D = D.filter(company=company)
            docs = list(D.select_related('document_type'))
            if not docs:
                return {'answer': f'مدرکی برای {name} ثبت نشده است.', 'type': 'employee'}
            lines = [f'مدارک {name}:']
            for d in docs:
                dt = d.document_type.name if d.document_type else 'بدون نوع'
                lines.append(f'• {d.title} ({dt})')
            return {'answer': '\n'.join(lines), 'type': 'employee'}

        # fallback: full profile
        return AssistantEngine._profile(emp)

    # -- general intents ------------------------------------------------------
    @staticmethod
    def _answer_general(q, intent, company, employees):
        from payroll.models import SalaryRecord
        from correspondences.models import IncomingLetter, OutgoingLetter, Announcement, Form
        from documents.models import Document

        total = len(employees)

        if intent == 'greeting':
            return {'answer': 'سلام! از من درباره هر پرسنل، تاریخ استخدام، آدرس، مدارک، کارکرد، حقوق و حتی احتمال استعفا بپرسید.', 'type': 'general'}
        if intent == 'thanks':
            return {'answer': 'خواهش می‌کنم! اگر سوال دیگری دارید در خدمتم. 😊', 'type': 'general'}
        if intent == 'total_employees':
            return {'answer': f'در حال حاضر {AssistantEngine._fa_num(total)} پرسنل فعال ثبت شده است.', 'type': 'general'}

        if intent == 'turnover':
            today = date.today()
            from employees.models import Employee
            eq = Employee.objects.filter(is_active=True)
            if company:
                eq = eq.filter(company=company)
            term_q = eq.filter(status__in=['terminated', 'retired'], status_change_date__year=today.year).count()
            cnt = eq.count()
            rate = round(term_q / cnt * 100, 2) if cnt else 0
            return {'answer': f'نرخ ترک خدمت امسال {AssistantEngine._fa_num(rate)}٪ است ({AssistantEngine._fa_num(term_q)} خروج از {AssistantEngine._fa_num(cnt)} نفر).', 'type': 'general'}

        if intent == 'birthdays':
            from jdatetime import date as jdate, timedelta as jtd
            from employees.models import Employee
            eq = Employee.objects.filter(is_active=True, birth_date__isnull=False)
            if company:
                eq = eq.filter(company=company)
            today_j = jdate.today()
            found = []
            for e in eq:
                gj = jdate.fromgregorian(date=e.birth_date)
                for off in range(0, 8):
                    t = today_j + jtd(days=off)
                    if t.month == gj.month and t.day == gj.day:
                        found.append((e.full_name, off))
                        break
            if not found:
                return {'answer': 'در ۷ روز آینده تولدی ثبت نشده است.', 'type': 'general'}
            found.sort(key=lambda x: x[1])
            lines = ['تولدهای ۷ روز آینده:']
            for nm, off in found:
                when = 'امروز 🎂' if off == 0 else f'{AssistantEngine._fa_num(off)} روز دیگر'
                lines.append(f'• {nm} ({when})')
            return {'answer': '\n'.join(lines), 'type': 'general'}

        if intent == 'contracts':
            from employees.models import Employee
            today = date.today()
            eq = Employee.objects.filter(is_active=True, contract_end_date__isnull=False,
                                         contract_end_date__gte=today,
                                         contract_end_date__lte=today + timedelta(days=90))
            if company:
                eq = eq.filter(company=company)
            lst = list(eq)
            if not lst:
                return {'answer': 'در ۹۰ روز آینده قراردادی منقضی نمی‌شود.', 'type': 'general'}
            lines = [f'{AssistantEngine._fa_num(len(lst))} قرارداد در شرف انقضا:']
            for e in lst[:8]:
                lines.append(f'• {e.full_name} ({AssistantEngine._jalali(e.contract_end_date)})')
            return {'answer': '\n'.join(lines), 'type': 'general'}

        if intent == 'documents_total':
            D = Document.objects.filter(is_active=True)
            if company:
                D = D.filter(company=company)
            exp = D.filter(expiry_date__lt=date.today()).count()
            return {'answer': f'در مجموع {AssistantEngine._fa_num(D.count())} مدرک ثبت شده است ({AssistantEngine._fa_num(exp)} مدرک منقضی).', 'type': 'general'}

        if intent == 'correspondences':
            def _c(m):
                qs = m.objects
                if company:
                    qs = qs.filter(company=company)
                return qs.count()
            return {'answer': (
                f'در سیستم: {AssistantEngine._fa_num(_c(IncomingLetter))} نامه وارده، '
                f'{AssistantEngine._fa_num(_c(OutgoingLetter))} نامه صادره، '
                f'{AssistantEngine._fa_num(_c(Announcement))} ابلاغ و '
                f'{AssistantEngine._fa_num(_c(Form))} فرم ثبت شده است.'
            ), 'type': 'general'}

        if intent == 'salary_total':
            S = SalaryRecord.objects
            if company:
                S = S.filter(company=company)
            total = S.aggregate(s=Sum('net_payable'))['s'] or 0
            ded = S.aggregate(s=Sum('total_deductions'))['s'] or 0
            return {'answer': f'جمع حقوق پرداختی {AssistantEngine._fa_num(total)} ریال و جمع کسورات {AssistantEngine._fa_num(ded)} ریال است.', 'type': 'general'}

        if intent == 'scoring':
            return AssistantEngine._answer_scoring(company)

        if intent == 'chart':
            return AssistantEngine._answer_chart(q)

        return {'answer': 'می‌توانم درباره این موضوع کمک کنم؛ لطفاً دقیق‌تر بپرسید.', 'type': 'general'}

    # -- RAG ------------------------------------------------------------------
    @staticmethod
    def _rag_search(q, company):
        from documents.models import Document
        from employees.models import Employee

        docs_qs = Document.objects.filter(is_active=True).select_related('employee', 'document_type')
        if company:
            docs_qs = docs_qs.filter(company=company)
        docs = list(docs_qs)

        corpus = []
        for d in docs:
            corpus.append({
                'id': f'doc-{d.id}',
                'text': f'{d.title} {d.document_type.name if d.document_type else ""} {d.description or ""} {d.employee.full_name if d.employee else ""}',
                'meta': {
                    'title': d.title,
                    'doc_type': d.document_type.name if d.document_type else '',
                    'employee_name': d.employee.full_name if d.employee else '',
                },
            })

        if not corpus:
            return None

        idx = SemanticIndex(corpus)
        hits = idx.search(q, top_k=3, threshold=0.06)
        if not hits:
            return None

        lines = ['نزدیک‌ترین مدارک یافت‌شده:']
        for h in hits:
            m = h['meta']
            lines.append(f'• {m["title"]} ({m["doc_type"]}) — {m["employee_name"]}')
        return '\n'.join(lines)

    # -- resignation risk -----------------------------------------------------
    @staticmethod
    def _resignation_risk(company, employees, q):
        """ریسک استعفا بر اساس همه پارامترها (رضایت، عملکرد، کارکرد، غیبت، جرائم، قرارداد و ...)."""
        from payroll.models import SalaryRecord, EmployeeTransaction
        from employees.models import EmployeePenalty, EmploymentChange

        today = date.today()
        prev_year, prev_month = AssistantEngine._prev_jalali_month()

        scored = []
        for de in employees:
            reasons = []
            risk = 0

            # 1) قرارداد در شرف انقضا / منقضی
            if de['contract_end_date']:
                days = (de['contract_end_date'] - today).days
                if 0 <= days <= 60:
                    risk += 30
                    reasons.append(f'قرارداد تا {AssistantEngine._fa_num(days)} روز دیگر تمام می‌شود')
                elif days < 0:
                    risk += 20
                    reasons.append('قرارداد منقضی شده')

            # 2) رضایت شغلی پایین
            if de['satisfaction_score'] is not None:
                sat = float(de['satisfaction_score'])
                if sat < 50:
                    risk += 25
                    reasons.append(f'رضایت شغلی پایین ({AssistantEngine._fa_num(sat)}٪)')

            # 3) عملکرد پایین
            if de['performance_score'] is not None:
                perf = float(de['performance_score'])
                if perf < 50:
                    risk += 20
                    reasons.append(f'عملکرد پایین ({AssistantEngine._fa_num(perf)}٪)')

            # 4) کارکرد کم / اضافه‌کاری سنگین
            rec = SalaryRecord.objects.filter(employee_id=de['id'], year=prev_year, month=str(prev_month))
            if company:
                rec = rec.filter(company=company)
            rec = rec.first()
            if rec:
                if float(rec.work_days or 0) < 15:
                    risk += 15
                    reasons.append(f'کارکرد ماه گذشته کم ({AssistantEngine._fa_num(rec.work_days)} روز)')
                if rec.overtime_hours and float(rec.overtime_hours or 0) > 30:
                    risk += 8
                    reasons.append('اضافه‌کاری سنگین')
            else:
                risk += 5
                reasons.append('فیش ماه گذشته ثبت نشده')

            # 5) غیبت زیاد
            abs_q = EmployeeTransaction.objects.filter(employee_id=de['id'], transaction_type='absence')
            if company:
                abs_q = abs_q.filter(company=company)
            abs_days = sum(float(t.quantity or 0) for t in abs_q)
            if abs_days > 5:
                risk += 15
                reasons.append(f'غیبت زیاد ({AssistantEngine._fa_num(round(abs_days, 1))} روز)')

            # 6) جرائم
            pen_q = EmployeePenalty.objects.filter(employee_id=de['id'])
            if company:
                pen_q = pen_q.filter(company=company)
            pen_count = pen_q.count()
            if pen_count > 0:
                risk += pen_count * 5
                reasons.append(f'{AssistantEngine._fa_num(pen_count)} مورد جریمه')

            # 7) مسافت زیاد — اگر خودرو شخصی دارد، تأثیر کمتر میشود
            dist = int(de['distance_to_work_km'] or 0)
            if dist > 50:
                if de.get('has_car'):
                    risk += 4
                    reasons.append(f'مسافت زیاد ({AssistantEngine._fa_num(dist)} کیلومتر) — ولی خودرو شخصی دارد')
                else:
                    risk += 10
                    reasons.append(f'مسافت زیاد بدون خودرو شخصی ({AssistantEngine._fa_num(dist)} کیلومتر)')

            # 8) نوع قرارداد غیردائم
            ct = de['contract_type_name'] or ''
            if ct and ('دائم' not in ct and 'permanent' not in ct.lower()):
                risk += 10
                reasons.append(f'قرارداد {ct} (غیردائم)')

            # 9) کاهش حقوق اخیر
            ch = EmploymentChange.objects.filter(employee_id=de['id'])
            if company:
                ch = ch.filter(company=company)
            salary_decs = ch.filter(change_type='salary_decrease').count()
            if salary_decs > 0:
                risk += 15
                reasons.append(f'{AssistantEngine._fa_num(salary_decs)} کاهش حقوق')

            # 10) بدون افزایش حقوق در ۲ سال اخیر
            incs = ch.filter(change_type='salary_increase').count()
            if incs == 0 and de['hire_date'] and (today.year - de['hire_date'].year) >= 2:
                risk += 5
                reasons.append('بدون افزایش حقوق در ۲ سال اخیر')

            # 11) وفاداری (سابقه طولانی)
            if de['hire_date']:
                years = today.year - de['hire_date'].year
                if years >= 5:
                    risk -= 15
                    reasons.append('سابقه بالای ۵ سال (وفاداری)')

            risk = max(0, min(100, risk))
            if risk >= 20 or (len(reasons) >= 1 and risk >= 10):
                scored.append({'employee': de, 'risk': risk, 'reasons': reasons})

        scored.sort(key=lambda x: -x['risk'])

        if not scored:
            return {'answer': 'با داده‌های فعلی، کارمند پرریسکی شناسایی نشد.', 'type': 'risk'}

        lines = ['⚠️ پرسنل با بیشترین احتمال استعفا (بر اساس همه پارامترها):']
        for s in scored[:8]:
            lines.append(f'• {s["employee"]["full_name"]} — ریسک {AssistantEngine._fa_num(s["risk"])}٪')
            for r in s['reasons']:
                lines.append(f'    ↳ {r}')
        return {'answer': '\n'.join(lines), 'type': 'risk'}

    # -- profile --------------------------------------------------------------
    @staticmethod
    def _profile(emp):
        lines = [f'👤 {emp["full_name"]}']
        if emp['employee_id']:
            lines.append(f'کد پرسنلی: {AssistantEngine._fa_num(emp["employee_id"])}')
        if emp['national_id']:
            lines.append(f'کد ملی: {AssistantEngine._fa_num(emp["national_id"])}')
        if emp['department_name']:
            lines.append(f'دپارتمان: {emp["department_name"]}')
        if emp['job_title_name']:
            lines.append(f'عنوان شغلی: {emp["job_title_name"]}')
        if emp['work_location_name']:
            lines.append(f'محل استقرار: {emp["work_location_name"]}')
        if emp['gender']:
            lines.append(f'جنسیت: {emp["gender"]}')
        if emp['status']:
            lines.append(f'وضعیت: {emp["status"]}')
        if emp['birth_date']:
            lines.append(f'تولد: {AssistantEngine._jalali(emp["birth_date"])}')
        if emp['hire_date']:
            lines.append(f'استخدام: {AssistantEngine._jalali(emp["hire_date"])}')
        if emp['mobile']:
            lines.append(f'موبایل: {AssistantEngine._fa_num(emp["mobile"])}')
        if emp['address']:
            lines.append(f'آدرس: {emp["address"]}')
        if emp['contract_type_name']:
            lines.append(f'نوع قرارداد: {emp["contract_type_name"]}')
        if emp['contract_end_date']:
            lines.append(f'پایان قرارداد: {AssistantEngine._jalali(emp["contract_end_date"])}')
        return {'answer': '\n'.join(lines), 'type': 'profile'}

    # -- scoring answers ------------------------------------------------------
    @staticmethod
    def _answer_employee_score(emp, company):
        """Answer an employee's evaluation score using ScoringEngine."""
        from employees.models import Employee
        from employees.engines.scoring_engine import ScoringEngine

        e = Employee.objects.filter(id=emp['id']).first()
        if not e:
            return {'answer': 'پرسنل یافت نشد.', 'type': 'employee'}

        result = ScoringEngine().score_employee(e, company=company)
        lines = [
            f'🏆 ارزیابی {result["full_name"]}',
            f'امتیاز کل: {AssistantEngine._fa_num(result["total_score"])} از ۱۰۰ ({result["grade"]["label"]})',
            '',
            'جزئیات امتیاز:',
        ]
        label_map = {
            'performance': 'عملکرد',
            'satisfaction': 'رضایت شغلی',
            'education': 'تحصیلات',
            'attendance': 'حضور و کارکرد',
            'discipline': 'انضباط',
            'distance': 'مسافت',
            'experience': 'سابقه',
            'salary_growth': 'افزایش حقوق',
            'benefits': 'مزایا',
            'mission': 'مأموریت',
            'contract': 'قرارداد',
            'shift': 'نوبت کاری',
        }
        for k, v in result['breakdown'].items():
            lines.append(f'• {label_map.get(k, k)}: {AssistantEngine._fa_num(v)}')
        if result['reasons']:
            lines.append('')
            lines.append('نکات:')
            for r in result['reasons']:
                lines.append(f'• {r}')
        return {'answer': '\n'.join(lines), 'type': 'employee'}

    @staticmethod
    def _answer_scoring(company):
        """Answer a general scoring/ranking question."""
        from employees.models import Employee
        from employees.engines.scoring_engine import ScoringEngine

        qs = Employee.objects.select_related('department', 'job_title', 'contract_type')
        if company:
            qs = qs.filter(company=company, is_active=True)

        engine = ScoringEngine()
        scored = engine.score_all(list(qs), company=company)

        if not scored:
            return {'answer': 'کارمندی برای ارزیابی پیدا نشد.', 'type': 'scoring'}

        lines = ['🏆 رتبه‌بندی کارکنان (بر اساس امتیاز ارزیابی):']
        for i, s in enumerate(scored[:10], 1):
            lines.append(f'{AssistantEngine._fa_num(i)}. {s["full_name"]} — {AssistantEngine._fa_num(s["total_score"])} ({s["grade"]["label"]})')
        return {'answer': '\n'.join(lines), 'type': 'scoring'}

    @staticmethod
    def _answer_chart(q):
        """Return a chart image (SVG) URL as the answer."""
        if 'جنسیت' in q or 'زن' in q or 'مرد' in q:
            subject = 'gender'
            chart_type = 'donut'
        elif 'دپارتمان' in q or 'بخش' in q:
            subject = 'departments'
            chart_type = 'bar'
        elif 'عنوان' in q or 'سمت' in q or 'شغل' in q:
            subject = 'job_titles'
            chart_type = 'bar'
        elif 'محل' in q or 'شعبه' in q or 'مکان' in q:
            subject = 'locations'
            chart_type = 'bar'
        else:
            subject = 'departments'
            chart_type = 'bar'

        url = f'/assistant/chart/?chart_type={chart_type}&subject={subject}'
        return {
            'answer': 'نمودار مورد نظر شما:',
            'type': 'chart',
            'chart_url': url,
            'subject': subject,
            'chart_type': chart_type,
        }

    # -- helpers --------------------------------------------------------------
    @staticmethod
    def _fa_num(n):
        if n is None:
            return '۰'
        digits = '۰۱۲۳۴۵۶۷۸۹'
        return ''.join(digits[int(c)] if c.isdigit() else c for c in str(n))

    @staticmethod
    def _jalali(d):
        from jdatetime import date as jdate
        if not d:
            return '—'
        j = jdate.fromgregorian(date=d)
        return f'{AssistantEngine._fa_num(j.year)}/{AssistantEngine._fa_num(j.month)}/{AssistantEngine._fa_num(j.day)}'

    @staticmethod
    def _month_name(m):
        return AssistantEngine.MONTHS.get(str(m), str(m))

    @staticmethod
    def _prev_jalali_month():
        from jdatetime import date as jdate
        t = jdate.today() - timedelta(days=30)
        return int(t.year), int(t.month)

    @staticmethod
    def _age(birth):
        today = date.today()
        return max(0, today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day)))

    @staticmethod
    def _answer_employee_payroll(q, emp, field, company):
        """Full-history payroll/work_days answer with year/latest parsing."""
        from payroll.models import SalaryRecord, BenefitRecord

        name = emp['full_name']

        # Extract a 4-digit year (Persian digits already normalized)
        year_match = re.search(r'\b(\d{4})\b', q)
        year = int(year_match.group(1)) if year_match else None

        # Detect "آخرین" (latest) intent
        latest = ('اخرین' in q) or ('اخر' in q) or ('جدیدترین' in q)

        Q = SalaryRecord.objects.filter(employee_id=emp['id'])
        B = BenefitRecord.objects.filter(employee_id=emp['id'])
        if company:
            Q = Q.filter(company=company)
            B = B.filter(company=company)

        if year:
            Q = Q.filter(year=year)
            B = B.filter(year=year)

        # ---- 1) آخرین ----
        if latest:
            rec = Q.order_by('-year', '-month').first()
            if not rec:
                return {'answer': f'هیچ فیش حقوقی برای {name} ثبت نشده است.', 'type': 'employee'}

            month_label = AssistantEngine._month_name(rec.month)

            if field == 'work_days':
                return {'answer': (
                    f'آخرین کارکرد {name}: ماه {month_label} سال {AssistantEngine._fa_num(rec.year)}، '
                    f'به میزان {AssistantEngine._fa_num(rec.work_days)} روز.'
                ), 'type': 'employee'}

            # payroll latest full summary
            ben_sum = B.filter(year=rec.year, month=rec.month).aggregate(s=Sum('paid_amount'))['s'] or 0
            lines = [
                f'💰 آخرین دریافتی {name} (ماه {month_label} سال {AssistantEngine._fa_num(rec.year)}):',
                f'کارکرد: {AssistantEngine._fa_num(rec.work_days)} روز',
                f'جمع حقوق و مزایا: {AssistantEngine._fa_num(rec.total_benefits)} ریال',
                f'مزایای رفاهی: {AssistantEngine._fa_num(ben_sum)} ریال',
                f'کسورات: {AssistantEngine._fa_num(rec.total_deductions)} ریال',
                f'خالص پرداختی: {AssistantEngine._fa_num(rec.net_payable)} ریال',
            ]
            return {'answer': '\n'.join(lines), 'type': 'employee'}

        # ---- 2) سال مشخص ----
        if year:
            records = list(Q.order_by('month'))
            if not records:
                return {'answer': f'برای {name} در سال {AssistantEngine._fa_num(year)} فیش حقوقی ثبت نشده است.', 'type': 'employee'}

            if field == 'work_days':
                total = sum(float(r.work_days or 0) for r in records)
                lines = [f'📅 کارکرد {name} در سال {AssistantEngine._fa_num(year)}:']
                for r in records:
                    lines.append(f'• {AssistantEngine._month_name(r.month)}: {AssistantEngine._fa_num(r.work_days)} روز')
                lines.append(f'— جمع کل: {AssistantEngine._fa_num(round(total, 1))} روز')
                return {'answer': '\n'.join(lines), 'type': 'employee'}

            # payroll year summary
            total_net = sum(float(r.net_payable or 0) for r in records)
            total_benefits = sum(float(r.total_benefits or 0) for r in records)
            total_ded = sum(float(r.total_deductions or 0) for r in records)
            ben_sum = B.aggregate(s=Sum('paid_amount'))['s'] or 0
            lines = [
                f'💰 جمع دریافتی {name} در سال {AssistantEngine._fa_num(year)}:',
                f'جمع حقوق و مزایا: {AssistantEngine._fa_num(total_benefits)} ریال',
                f'مزایای رفاهی: {AssistantEngine._fa_num(ben_sum)} ریال',
                f'جمع کسورات: {AssistantEngine._fa_num(total_ded)} ریال',
                f'جمع خالص پرداختی: {AssistantEngine._fa_num(total_net)} ریال',
            ]
            return {'answer': '\n'.join(lines), 'type': 'employee'}

        # ---- 3) کل دوره (همه تاریخ‌ها) ----
        records = list(Q.order_by('year', 'month'))
        if not records:
            return {'answer': f'برای {name} فیش حقوقی ثبت نشده است.', 'type': 'employee'}

        if field == 'work_days':
            by_year = defaultdict(float)
            for r in records:
                by_year[r.year] += float(r.work_days or 0)
            total = sum(by_year.values())
            lines = [f'📅 کارکرد {name} (کل دوره):']
            for y in sorted(by_year):
                lines.append(f'• سال {AssistantEngine._fa_num(y)}: {AssistantEngine._fa_num(round(by_year[y], 1))} روز')
            lines.append(f'— جمع کل: {AssistantEngine._fa_num(round(total, 1))} روز')
            return {'answer': '\n'.join(lines), 'type': 'employee'}

        # payroll all-time
        by_year_net = defaultdict(float)
        for r in records:
            by_year_net[r.year] += float(r.net_payable or 0)
        total_net = sum(by_year_net.values())
        total_benefits = sum(float(r.total_benefits or 0) for r in records)
        total_ded = sum(float(r.total_deductions or 0) for r in records)
        ben_sum = B.aggregate(s=Sum('paid_amount'))['s'] or 0
        lines = [f'💰 جمع کل دریافتی {name} (کل دوره) به تفکیک سال (خالص):']
        for y in sorted(by_year_net):
            lines.append(f'• سال {AssistantEngine._fa_num(y)}: {AssistantEngine._fa_num(by_year_net[y])} ریال')
        lines.append('—')
        lines.append(f'جمع خالص پرداختی: {AssistantEngine._fa_num(total_net)} ریال')
        lines.append(f'جمع حقوق و مزایا: {AssistantEngine._fa_num(total_benefits)} ریال')
        lines.append(f'مزایای رفاهی: {AssistantEngine._fa_num(ben_sum)} ریال')
        lines.append(f'جمع کسورات: {AssistantEngine._fa_num(total_ded)} ریال')
        return {'answer': '\n'.join(lines), 'type': 'employee'}

    @staticmethod
    def _answer_employee_benefit(q, emp, company):
        """Full-history welfare benefit answers with year/latest parsing."""
        from payroll.models import BenefitRecord

        name = emp['full_name']

        year_match = re.search(r'\b(\d{4})\b', q)
        year = int(year_match.group(1)) if year_match else None
        latest = ('اخرین' in q) or ('اخر' in q) or ('جدیدترین' in q)

        B = BenefitRecord.objects.filter(employee_id=emp['id'])
        if company:
            B = B.filter(company=company)

        if year:
            B = B.filter(year=year)

        # ---- 1) آخرین ----
        if latest:
            rec = B.order_by('-year', '-month').first()
            if not rec:
                return {'answer': f'هیچ مزایای رفاهی برای {name} ثبت نشده است.', 'type': 'employee'}
            return {'answer': (
                f'🎁 آخرین مزایای رفاهی {name}: {rec.get_benefit_type_display()} '
                f'(ماه {AssistantEngine._month_name(rec.month)} سال {AssistantEngine._fa_num(rec.year)})، '
                f'مبلغ ناخالص {AssistantEngine._fa_num(rec.gross_amount)} ریال، '
                f'مالیات {AssistantEngine._fa_num(rec.reserved_tax)} ریال، '
                f'پرداختی {AssistantEngine._fa_num(rec.paid_amount)} ریال.'
            ), 'type': 'employee'}

        # ---- 2) سال مشخص ----
        if year:
            records = list(B.order_by('month', 'benefit_type'))
            if not records:
                return {'answer': f'برای {name} در سال {AssistantEngine._fa_num(year)} مزایای رفاهی ثبت نشده است.', 'type': 'employee'}
            lines = [f'🎁 مزایای رفاهی {name} در سال {AssistantEngine._fa_num(year)}:']
            total = 0
            for r in records:
                lines.append(f'• {AssistantEngine._month_name(r.month)} — {r.get_benefit_type_display()}: {AssistantEngine._fa_num(r.paid_amount)} ریال')
                total += float(r.paid_amount or 0)
            lines.append(f'— جمع کل: {AssistantEngine._fa_num(round(total))} ریال')
            return {'answer': '\n'.join(lines), 'type': 'employee'}

        # ---- 3) کل دوره ----
        records = list(B.order_by('year', 'month'))
        if not records:
            return {'answer': f'برای {name} مزایای رفاهی ثبت نشده است.', 'type': 'employee'}

        by_year = defaultdict(float)
        for r in records:
            by_year[r.year] += float(r.paid_amount or 0)

        lines = [f'🎁 جمع کل مزایای رفاهی {name} به تفکیک سال:']
        for y in sorted(by_year):
            lines.append(f'• سال {AssistantEngine._fa_num(y)}: {AssistantEngine._fa_num(round(by_year[y]))} ریال')
        total = sum(by_year.values())
        lines.append(f'— جمع کل: {AssistantEngine._fa_num(round(total))} ریال')
        return {'answer': '\n'.join(lines), 'type': 'employee'}

    @staticmethod
    def _answer_employee_work_experience(q, emp, company):
        """10-question workout for work experience (سابقه کار)."""
        from django.db.models import Sum as DSum
        from employees.models import WorkExperience

        name = emp['full_name']
        W = WorkExperience.objects.filter(employee_id=emp['id'])
        if company:
            W = W.filter(company=company)
        all_exp = list(W)
        if not all_exp:
            return {'answer': f'سابقه کاری پیش از استخدام برای {name} ثبت نشده است.', 'type': 'employee'}

        # helper to compute total prior years (capped at hire date)
        def total_years():
            return sum(w.duration_years or 0 for w in all_exp)

        # 1) سابقه چنده؟ (کل)
        if ('کل' in q or 'جمع' in q or 'چند سال' in q or 'چقدر سابقه' in q) and not ('شرکت' in q or 'کجا' in q or 'اولین' in q or 'آخرین' in q or 'بیشتر' in q or 'طولانی' in q):
            ty = total_years()
            return {'answer': f'مجموع سابقه کاری پیش از استخدام {name}: {AssistantEngine._fa_num(round(ty, 1))} سال.', 'type': 'employee'}

        # 2) چند شرکت / چند جا کار کرده
        if 'چند شرکت' in q or 'چند جا' in q or 'چند سازمان' in q or 'تعداد شرکت' in q:
            return {'answer': f'{name} در {AssistantEngine._fa_num(len(all_exp))} سازمان/شرکت سابقه کاری دارد.', 'type': 'employee'}

        # 3) اولین سابقه
        if 'اولین' in q or 'اول' in q:
            first = sorted(all_exp, key=lambda w: w.start_date)[0]
            return {'answer': f'اولین سابقه کاری {name}: «{first.company_name}» ({first.job_title or "بدون سمت"}) از {AssistantEngine._jalali(first.start_date)}.', 'type': 'employee'}

        # 4) آخرین سابقه (قبل از استخدام)
        if 'آخرین' in q or 'اخرین' in q:
            last = sorted(all_exp, key=lambda w: w.end_date or w.start_date)[-1]
            end = AssistantEngine._jalali(last.end_date) if last.end_date else 'تاکنون'
            return {'answer': f'آخرین سابقه کاری {name} قبل از استخدام: «{last.company_name}» ({last.job_title or "بدون سمت"}) تا {end}.', 'type': 'employee'}

        # 5) طولانی‌ترین سابقه
        if 'طولانی' in q or 'بیشترین سابقه' in q or 'بیشتر سابقه' in q:
            longest = max(all_exp, key=lambda w: w.duration_years)
            return {'answer': f'طولانی‌ترین سابقه {name}: «{longest.company_name}» به مدت {AssistantEngine._fa_num(round(longest.duration_years, 1))} سال.', 'type': 'employee'}

        # 6) سابقه در یک سال مشخص (یا بازه)
        year_match = re.search(r'\b(\d{4})\b', q)
        if year_match:
            y = int(year_match.group(1))
            in_year = [w for w in all_exp if (w.start_date.year <= y <= (w.end_date.year if w.end_date else y))]
            if not in_year:
                return {'answer': f'{name} در سال {AssistantEngine._fa_num(y)} سابقه کاری فعال ثبت نشده است.', 'type': 'employee'}
            lines = [f'سوابق فعال {name} در سال {AssistantEngine._fa_num(y)}:']
            for w in in_year:
                lines.append(f'• {w.company_name} ({w.job_title or "بدون سمت"})')
            return {'answer': '\n'.join(lines), 'type': 'employee'}

        # 7) سمت/عنوان شغلی در سابقه‌ها
        if 'سمت' in q or 'عنوان شغلی' in q or 'شغل' in q:
            jobs = [f'{w.company_name}: {w.job_title or "نامشخص"}' for w in all_exp]
            return {'answer': f'عناوین شغلی {name} در سوابق کاری:\n' + '\n'.join(f'• {j}' for j in jobs), 'type': 'employee'}

        # 8) شرح وظایف
        if 'شرح' in q or 'وظایف' in q or 'توضیح سابقه' in q:
            lines = [f'شرح سوابق کاری {name}:']
            for w in all_exp:
                lines.append(f'• {w.company_name}: {w.description or "توضیحی ثبت نشده"}')
            return {'answer': '\n'.join(lines), 'type': 'employee'}

        # 9) مقایسه سابقه‌ها (بیشترین/کمترین مبلغ — n/a؛ بر اساس مدت)
        if 'مقایسه' in q or 'کدام بیشتر' in q:
            if len(all_exp) == 1:
                return {'answer': f'{name} فقط یک سابقه کاری دارد: {all_exp[0].company_name}.', 'type': 'employee'}
            lines = [f'مقایسه سوابق {name} (بر اساس مدت):']
            for w in all_exp:
                lines.append(f'• {w.company_name} — {AssistantEngine._fa_num(round(w.duration_years, 1))} سال')
            return {'answer': '\n'.join(lines), 'type': 'employee'}

        # 10) وجود سابقه (بله/خیر)
        if 'سابقه داره' in q or 'سابقه دارد' in q or 'سابقه ای دارد' in q or 'سابقه ای داره' in q:
            return {'answer': f'بله، {name} دارای {AssistantEngine._fa_num(len(all_exp))} سابقه کاری ثبت‌شده است.', 'type': 'employee'}

        # default: full list
        lines = [f'سوابق کاری پیشین {name}:']
        for w in all_exp:
            end = AssistantEngine._jalali(w.end_date) if w.end_date else 'تاکنون'
            lines.append(f'• {w.company_name} ({w.job_title or "بدون سمت"}) — {AssistantEngine._jalali(w.start_date)} تا {end} ({AssistantEngine._fa_num(round(w.duration_years, 1))} سال)')
        ty = total_years()
        lines.append(f'— مجموع سابقه: {AssistantEngine._fa_num(round(ty, 1))} سال')
        return {'answer': '\n'.join(lines), 'type': 'employee'}

    # -- leave (مرخصی) ---------------------------------------------------------
    @staticmethod
    def _answer_employee_leave(q, emp, company):
        from payroll.models import EmployeeTransaction

        name = emp['full_name']
        year_match = re.search(r'\b(\d{4})\b', q)
        year = int(year_match.group(1)) if year_match else None

        T = EmployeeTransaction.objects.filter(employee_id=emp['id'], transaction_type='leave')
        if company:
            T = T.filter(company=company)
        if year:
            T = T.filter(date__year=year)

        records = list(T.order_by('date'))
        total_days = sum(float(t.quantity or 0) for t in records)

        if 'مانده' in q or 'باقیمانده' in q:
            from django.conf import settings
            default_annual = getattr(settings, 'LEAVE_DEFAULT_TOTAL_DAYS', 30)
            bal = default_annual - total_days
            return {'answer': (
                f'مانده مرخصی {name}: {AssistantEngine._fa_num(round(max(0, bal), 1))} روز '
                f'(سهم سالانه {AssistantEngine._fa_num(default_annual)} روز، مصرف‌شده {AssistantEngine._fa_num(round(total_days, 1))} روز).'
            ), 'type': 'employee'}

        if not records:
            return {'answer': f'مرخصی برای {name} ثبت نشده است.', 'type': 'employee'}

        by_year = defaultdict(float)
        for t in records:
            by_year[t.date.year] += float(t.quantity or 0)

        lines = [f'🌴 مرخصی‌های {name} به تفکیک سال:']
        for y in sorted(by_year):
            lines.append(f'• سال {AssistantEngine._fa_num(y)}: {AssistantEngine._fa_num(round(by_year[y], 1))} روز')
        lines.append(f'— جمع کل: {AssistantEngine._fa_num(round(total_days, 1))} روز')
        return {'answer': '\n'.join(lines), 'type': 'employee'}

    # -- penalty (جرائم) -------------------------------------------------------
    @staticmethod
    def _answer_employee_penalty(q, emp, company):
        from employees.models import EmployeePenalty

        name = emp['full_name']
        P = EmployeePenalty.objects.filter(employee_id=emp['id'])
        if company:
            P = P.filter(company=company)

        records = list(P.order_by('-date'))
        if not records:
            return {'answer': f'جریمه‌ای برای {name} ثبت نشده است.', 'type': 'employee'}

        total_amount = sum(float(p.amount or 0) for p in records)

        lines = [f'⚠️ جرائم {name} ({AssistantEngine._fa_num(len(records))} مورد):']
        for p in records:
            reason = p.reason or 'بدون دلیل'
            lines.append(f'• {AssistantEngine._fa_num(p.amount)} ریال — {reason} ({AssistantEngine._jalali(p.date)})')
        lines.append(f'— جمع جرائم: {AssistantEngine._fa_num(round(total_amount))} ریال')
        return {'answer': '\n'.join(lines), 'type': 'employee'}

    # -- combined (compound) question -----------------------------------------
    @staticmethod
    def _is_compound(q):
        """Detect a question asking for multiple things at once (حقوق + کارکرد + مزایا/غیبت/مرخصی)."""
        keywords = ['حقوق', 'کارکرد', 'مزایا', 'دریافتی', 'پرداخت', 'غیبت', 'مرخصی', 'کسور']
        hits = sum(1 for k in keywords if k in q)
        return hits >= 2

    @staticmethod
    def _answer_employee_combined(q, emp, company):
        """Answer compound questions combining payroll/work_days/benefits/leave/absence."""
        from payroll.models import SalaryRecord, BenefitRecord, EmployeeTransaction

        name = emp['full_name']
        year_match = re.search(r'\b(\d{4})\b', q)
        year = int(year_match.group(1)) if year_match else None

        lines = [f'📊 گزارش ترکیبی {name}:']

        if 'کارکرد' in q:
            Q = SalaryRecord.objects.filter(employee_id=emp['id'])
            if company:
                Q = Q.filter(company=company)
            if year:
                Q = Q.filter(year=year)
            total_work = sum(float(r.work_days or 0) for r in Q)
            lines.append(f'• کارکرد: {AssistantEngine._fa_num(round(total_work, 1))} روز' if total_work else '• کارکرد: ثبت نشده')

        if any(k in q for k in ['حقوق', 'دریافتی', 'پرداخت', 'کسور', 'خالص']):
            Q = SalaryRecord.objects.filter(employee_id=emp['id'])
            if company:
                Q = Q.filter(company=company)
            if year:
                Q = Q.filter(year=year)
            total_net = sum(float(r.net_payable or 0) for r in Q)
            total_ded = sum(float(r.total_deductions or 0) for r in Q)
            if total_net:
                lines.append(f'• جمع خالص دریافت: {AssistantEngine._fa_num(round(total_net))} ریال')
                lines.append(f'• جمع کسورات: {AssistantEngine._fa_num(round(total_ded))} ریال')
            else:
                lines.append('• دریافتی: ثبت نشده')

        if 'مزایا' in q:
            B = BenefitRecord.objects.filter(employee_id=emp['id'])
            if company:
                B = B.filter(company=company)
            if year:
                B = B.filter(year=year)
            total_b = sum(float(b.paid_amount or 0) for b in B)
            lines.append(f'• مزایای رفاهی: {AssistantEngine._fa_num(round(total_b))} ریال' if total_b else '• مزایای رفاهی: ثبت نشده')

        if 'غیبت' in q:
            T = EmployeeTransaction.objects.filter(employee_id=emp['id'], transaction_type='absence')
            if company:
                T = T.filter(company=company)
            if year:
                T = T.filter(date__year=year)
            total_abs = sum(float(t.quantity or 0) for t in T)
            lines.append(f'• غیبت: {AssistantEngine._fa_num(round(total_abs, 1))} روز' if total_abs else '• غیبت: ثبت نشده')

        if 'مرخصی' in q:
            T = EmployeeTransaction.objects.filter(employee_id=emp['id'], transaction_type='leave')
            if company:
                T = T.filter(company=company)
            if year:
                T = T.filter(date__year=year)
            total_leave = sum(float(t.quantity or 0) for t in T)
            lines.append(f'• مرخصی: {AssistantEngine._fa_num(round(total_leave, 1))} روز' if total_leave else '• مرخصی: ثبت نشده')

        return {'answer': '\n'.join(lines), 'type': 'employee'}
