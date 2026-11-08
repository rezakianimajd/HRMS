"""موتور «نواقص قراردادها» — بررسی کامل بودن پروندهٔ هر قرارداد.

توابع این ماژول **خالص** هستند (بدون دیتابیس) و از ردیف‌های تختِ
``Contract.objects.values(...)`` + شمارش‌ها تغذیه می‌شوند؛ بنابراین اندپوینت
`GET /api/external-contracts/completeness/` با ۳ کوئری کل صفحه را می‌سازد و
قاعده‌ها هم بدون PostgreSQL قابل تست‌اند.

هر نقص: ``code`` (شناسهٔ یکتا)، ``label`` (متن فارسی)، ``severity``
(``high``/``medium``/``low``) و ``group`` (``fields``/``documents``/``dates``/
``financial``/``project``/``guarantees``).
"""
from datetime import date

SEVERITY_ORDER = {'high': 3, 'medium': 2, 'low': 1}
SEVERITY_LABELS = {'high': 'بحرانی', 'medium': 'متوسط', 'low': 'کم'}
SEVERITY_PENALTY = {'high': 12, 'medium': 6, 'low': 2}

GROUP_LABELS = {
    'fields': 'فیلدهای ناقص',
    'documents': 'مدارک',
    'dates': 'تاریخ‌ها',
    'financial': 'مالی',
    'project': 'پروژه و درصد تخصیص',
    'guarantees': 'تضامین',
    'party': 'طرف حساب',
}

# قاعده‌های فیلدهای خالی: (field, code, label, severity, group)
FIELD_RULES = (
    ('number', 'missing_number', 'شماره قرارداد ثبت نشده است', 'high', 'fields'),
    ('amount', 'missing_amount', 'مبلغ قرارداد ثبت نشده است', 'high', 'financial'),
    ('start_date', 'missing_start_date', 'تاریخ شروع قرارداد ثبت نشده است', 'high', 'dates'),
    ('end_date', 'missing_end_date', 'تاریخ پایان قرارداد ثبت نشده است', 'high', 'dates'),
    ('signing_date', 'missing_signing_date', 'تاریخ امضای قرارداد ثبت نشده است', 'medium', 'dates'),
    ('signatory', 'missing_signatory', 'امضاکنندهٔ مجاز انتخاب نشده است', 'medium', 'fields'),
    ('currency', 'missing_currency', 'واحد ارز قرارداد انتخاب نشده است', 'medium', 'fields'),
    ('payment_terms', 'missing_payment_terms', 'شرایط و نحوهٔ پرداخت خالی است', 'medium', 'financial'),
    ('penalty_terms', 'missing_penalty_terms', 'شرایط جریمه / وجه التزام خالی است', 'medium', 'fields'),
    ('insurance_terms', 'missing_insurance_terms', 'شرایط بیمه خالی است', 'low', 'fields'),
    ('delivery_terms', 'missing_delivery_terms', 'شرایط تحویل خالی است', 'low', 'fields'),
    ('category', 'missing_category', 'طبقه‌بندی قرارداد خالی است', 'low', 'fields'),
    ('project_location', 'missing_project_location', 'محل اجرا / تحویل خالی است', 'low', 'fields'),
    ('description', 'missing_description', 'توضیحات قرارداد خالی است', 'low', 'fields'),
    ('retention_percent', 'missing_retention', 'درصد حسن انجام کار تعیین نشده است', 'low', 'financial'),
    ('advance_payment', 'missing_advance', 'مبلغ پیش‌پرداخت تعیین نشده است', 'low', 'financial'),
)

PARTY_RULES = (
    ('party_national_id', 'party_missing_national_id',
     'شناسهٔ ملی / کد ثبت طرف حساب ثبت نشده است', 'medium', 'party'),
    ('party_economic_code', 'party_missing_economic_code',
     'کد اقتصادی طرف حساب ثبت نشده است', 'low', 'party'),
)

RULE_CATALOG = [
    {'code': code, 'label': label, 'severity': severity, 'group': group}
    for _field, code, label, severity, group in FIELD_RULES
] + [
    {'code': code, 'label': label, 'severity': severity, 'group': group}
    for _field, code, label, severity, group in PARTY_RULES
] + [
    {'code': 'no_project', 'label': 'قرارداد به هیچ پروژه‌ای تخصیص نیافته است',
     'severity': 'medium', 'group': 'project'},
    {'code': 'project_share_missing', 'label': 'درصد تخصیص پروژه مشخص نشده است',
     'severity': 'high', 'group': 'project'},
    {'code': 'project_share_invalid', 'label': 'جمع درصدهای تخصیص پروژه ۱۰۰٪ نیست',
     'severity': 'medium', 'group': 'project'},
    {'code': 'no_documents', 'label': 'هیچ مدرکی برای قرارداد بارگذاری نشده است',
     'severity': 'high', 'group': 'documents'},
    {'code': 'no_contract_document', 'label': 'سند قرارداد / امضاشده در مدارک نیست',
     'severity': 'medium', 'group': 'documents'},
    {'code': 'end_before_start', 'label': 'تاریخ پایان قبل از تاریخ شروع است',
     'severity': 'high', 'group': 'dates'},
    {'code': 'signing_after_start', 'label': 'تاریخ امضا بعد از تاریخ شروع است',
     'severity': 'low', 'group': 'dates'},
    {'code': 'expired_but_active', 'label': 'قرارداد باز است اما تاریخ پایان آن گذشته',
     'severity': 'high', 'group': 'dates'},
    {'code': 'tender_number_missing', 'label': 'برای قرارداد مناقصه، شمارهٔ مناقصه ثبت نشده',
     'severity': 'medium', 'group': 'fields'},
    {'code': 'no_financial_documents', 'label': 'هیچ صورت‌وضعیت یا فاکتوری ثبت نشده است',
     'severity': 'medium', 'group': 'financial'},
    {'code': 'invoice_over_amount', 'label': 'جمع فاکتورها از مبلغ قرارداد بیشتر است',
     'severity': 'medium', 'group': 'financial'},
    {'code': 'guarantee_missing', 'label': 'تضمین لازم تعیین شده اما تضمینی ثبت نشده است',
     'severity': 'high', 'group': 'guarantees'},
    {'code': 'guarantee_undefined', 'label': 'مبلغ یا اقلام تضمین قرارداد تعیین نشده است',
     'severity': 'medium', 'group': 'guarantees'},
]

RULE_BY_CODE = {rule['code']: rule for rule in RULE_CATALOG}

OPEN_STATUSES = ('draft', 'active', 'suspended')


def _num(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _text(value):
    return str(value or '').strip()


def _day(value):
    if not value:
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def _allocations(row):
    """تخصیص پروژه‌ها به شکل [(شناسهٔ پروژه, درصد)]."""
    result = []
    for item in row.get('project_allocations') or []:
        if not isinstance(item, dict):
            continue
        project = item.get('project')
        if project in (None, ''):
            continue
        result.append((project, _num(item.get('percentage'))))
    return result


def _issue(code, detail=None):
    rule = RULE_BY_CODE.get(code)
    if not rule:
        return None
    issue = dict(rule)
    if detail:
        issue['detail'] = detail
    return issue


def contract_issues(row, today=None):
    """فهرست نواقص یک قرارداد (مرتب‌شده از بحرانی به کم)."""
    today = today or date.today()
    issues = []

    # ۱) فیلدهای خالی
    for field, code, _label, _severity, _group in FIELD_RULES:
        value = row.get(field)
        empty = value is None or value == '' or (isinstance(value, str) and not value.strip())
        if field == 'guarantee_amount':
            empty = empty and not (row.get('guarantee_items') or [])
        if empty:
            issues.append(_issue(code))
    for field, code, _label, _severity, _group in PARTY_RULES:
        if row.get('party_id') and not _text(row.get(field)):
            issues.append(_issue(code))

    if row.get('contract_type') == 'tender' and not _text(row.get('tender_number')):
        issues.append(_issue('tender_number_missing'))

    # ۲) پروژه و درصد تخصیص
    allocations = _allocations(row)
    if row.get('project_id') or allocations:
        total_percent = sum(percent for _project, percent in allocations)
        if not allocations:
            issues.append(_issue('project_share_missing'))
        elif abs(total_percent - 100) > 0.01:
            issues.append(_issue('project_share_invalid', f'جمع درصدها: {total_percent:g}٪'))
    elif row.get('status') in ('active', 'suspended', 'completed'):
        issues.append(_issue('no_project'))

    # ۳) مدارک
    documents_count = int(row.get('documents_count') or 0)
    titles = [str(title or '') for title in (row.get('document_titles') or [])]
    if documents_count == 0:
        issues.append(_issue('no_documents'))
    elif not any(('قرارداد' in title) or ('امضا' in title) or ('مورد' in title) for title in titles):
        issues.append(_issue('no_contract_document'))

    # ۴) تاریخ‌ها
    start = _day(row.get('start_date'))
    end = _day(row.get('end_date'))
    signing = _day(row.get('signing_date'))
    if start and end and end < start:
        issues.append(_issue('end_before_start'))
    if start and signing and signing > start:
        issues.append(_issue('signing_after_start'))
    if end and end < today and row.get('status') in ('active', 'suspended'):
        issues.append(_issue('expired_but_active'))

    # ۵) مالی و تضامین
    if row.get('amount') and not (int(row.get('statements_count') or 0)
                                  or int(row.get('invoices_count') or 0)):
        issues.append(_issue('no_financial_documents'))
    invoices_total = _num(row.get('invoices_total'))
    amount = _num(row.get('amount'))
    if amount and invoices_total > amount:
        issues.append(_issue('invoice_over_amount',
                             f'فاکتورها: {invoices_total:,.0f} / قرارداد: {amount:,.0f}'))
    guarantee_needed = bool(row.get('guarantee_amount')) or bool(row.get('guarantee_items') or [])
    if guarantee_needed and not int(row.get('guarantees_count') or 0):
        issues.append(_issue('guarantee_missing'))
    if not guarantee_needed and not int(row.get('guarantees_count') or 0):
        issues.append(_issue('guarantee_undefined'))

    issues = [issue for issue in issues if issue]
    issues.sort(key=lambda item: (-SEVERITY_ORDER.get(item['severity'], 0), item['code']))
    return issues


def contract_score(issues):
    """امتیاز سلامت قرارداد از ۰ تا ۱۰۰ (هر نقص وزن خودش را دارد)."""
    penalty = sum(SEVERITY_PENALTY.get(issue['severity'], 0) for issue in issues)
    return max(0, 100 - penalty)


def max_severity(issues):
    if not issues:
        return None
    return max((issue['severity'] for issue in issues), key=lambda item: SEVERITY_ORDER.get(item, 0))


def _matches(row, codes, severity, group, search):
    issues = row['issues']
    if codes and not any(issue['code'] in codes for issue in issues):
        return False
    if severity and not any(issue['severity'] == severity for issue in issues):
        return False
    if group and not any(issue['group'] == group for issue in issues):
        return False
    if search:
        haystack = ' '.join((
            str(row.get('number') or ''), str(row.get('subject') or ''),
            str(row.get('party_name') or ''), str(row.get('project_name') or ''),
        ))
        if search not in haystack:
            return False
    return True


def build_completeness(rows, today=None, codes=None, severity=None, group=None,
                       search=None, limit=500):
    """payload صفحهٔ «نواقص قراردادها» (خالص و قابل تست)."""
    today = today or date.today()
    search_text = (search or '').strip()
    code_filter = set(codes or [])

    contracts = []
    for row in rows:
        issues = contract_issues(row, today=today)
        contracts.append({
            'id': row.get('id'),
            'number': row.get('number') or '',
            'subject': row.get('subject') or '',
            'party_name': row.get('party_name') or '',
            'status': row.get('status') or '',
            'status_label': row.get('status_label') or '',
            'contract_type': row.get('contract_type') or '',
            'contract_type_label': row.get('contract_type_label') or '',
            'amount': _num(row.get('amount')),
            'end_date': str(row.get('end_date') or '')[:10] or None,
            'project_name': row.get('project_name') or '',
            'documents_count': int(row.get('documents_count') or 0),
            'issues': issues,
            'issue_count': len(issues),
            'max_severity': max_severity(issues),
            'score': contract_score(issues),
        })

    filtered = [
        item for item in contracts
        if _matches(item, code_filter, severity, group, search_text)
    ]
    # اولویت نمایش: بحرانی‌ترها و پرنقص‌ترها
    filtered.sort(key=lambda item: (
        -SEVERITY_ORDER.get(item['max_severity'] or 'low', 0),
        -item['issue_count'],
        item['score'],
        str(item['number']),
    ))

    by_code = {}
    by_group = {}
    severity_counts = {'high': 0, 'medium': 0, 'low': 0}
    for item in contracts:
        for issue in item['issues']:
            entry = by_code.setdefault(issue['code'], {
                'code': issue['code'], 'label': issue['label'],
                'severity': issue['severity'], 'group': issue['group'], 'count': 0,
            })
            entry['count'] += 1
            group_entry = by_group.setdefault(issue['group'], {
                'group': issue['group'],
                'label': GROUP_LABELS.get(issue['group'], issue['group']),
                'count': 0,
            })
            group_entry['count'] += 1
        for item_severity in {issue['severity'] for issue in item['issues']}:
            severity_counts[item_severity] += 1

    with_issues = len([item for item in contracts if item['issues']])
    total = len(contracts)
    avg_score = round(sum(item['score'] for item in contracts) / total, 1) if total else 100.0

    return {
        'generated_at': today.isoformat(),
        'total_contracts': total,
        'filtered_total': len(filtered),
        'summary': {
            'with_issues': with_issues,
            'clean': total - with_issues,
            'avg_score': avg_score,
            'issues_total': sum(item['issue_count'] for item in contracts),
            'severity': severity_counts,
            'by_code': sorted(by_code.values(), key=lambda item: (-item['count'], item['code'])),
            'by_group': sorted(by_group.values(), key=lambda item: -item['count']),
            'group_labels': GROUP_LABELS,
            'severity_labels': SEVERITY_LABELS,
        },
        'contracts': filtered[:limit],
        'rules': RULE_CATALOG,
    }
