"""کاربردهای تخصصی نگاشت نام در ماژول مکاتبات.

هر «کاربرد» (purpose) می‌گوید یک نگاشت روی کدام بخش از داده‌های مکاتبات اثر
می‌گذارد (ارجاع، فرستنده، گیرنده، طرف حساب، موضوع …)، چه نوع مقصدی برای آن
معنا دارد و آیا «نگاشت دو مسیره» (اعمال هم‌زمان روی نامه‌های ارسالی و
دریافتی) برای آن مجاز است.

این ماژول هیچ مدلی را import نمی‌کند تا از import چرخه‌ای با ``models``
جلوگیری شود؛ برچسب‌های فارسی دامنه‌ها از ``CorrespondenceNameAlias.SCOPES``
خوانده می‌شوند (منبع یکتا) و این‌جا فقط فراداده‌های تخصصی نگهداری می‌شود.
"""

# جداکنندهٔ مقصدهای چندگانه در جدول («ارجاع شده برای دو شخص»)
TARGET_SEPARATOR = ' — '
EMPTY_LABEL = '—'

PURPOSES = [
    {
        'key': 'referral',
        'group': 'ارجاع',
        'description': 'نام گیرندهٔ ارجاع را به پرسنل منابع انسانی متصل می‌کند '
                       '(ارجاعات چندنفره پشتیبانی می‌شود).',
        'target_kinds': ('employee',),
        'paired': None,
    },
    {
        'key': 'referral_target',
        'group': 'ارجاع',
        'description': 'گیرندهٔ ارجاعی که پرسنل نیست؛ به طرف حساب یا مخاطب متصل می‌شود.',
        'target_kinds': ('party', 'correspondent'),
        'paired': None,
    },
    {
        'key': 'sender',
        'group': 'طرفین نامه',
        'description': 'نام فرستندهٔ نامه (ستون فرستنده/ارسال‌کننده) را به مقصد متصل می‌کند.',
        'target_kinds': ('employee', 'party', 'organization', 'correspondent'),
        'paired': 'receiver',
    },
    {
        'key': 'receiver',
        'group': 'طرفین نامه',
        'description': 'نام گیرندهٔ نامه (نامهٔ صادره/داخلی) را به مقصد متصل می‌کند.',
        'target_kinds': ('employee', 'party', 'organization', 'correspondent'),
        'paired': 'sender',
    },
    {
        'key': 'counterparty',
        'group': 'طرفین نامه',
        'description': 'نام طرف حساب نامهٔ وارده و صادره را به طرف حساب مدیریت قراردادها متصل می‌کند.',
        'target_kinds': ('party', 'organization'),
        'paired': None,
    },
    {
        'key': 'delivery',
        'group': 'طرفین نامه',
        'description': 'نام تحویل‌دهندهٔ نامه یا مرسوله را به پرسنل متصل می‌کند.',
        'target_kinds': ('employee',),
        'paired': None,
    },
    {
        'key': 'contact',
        'group': 'مخاطبین و سازمان‌ها',
        'description': 'نام مخاطب/شخص طرف نامه را به مخاطبین یا سازمان‌های تعاریف متصل می‌کند.',
        'target_kinds': ('correspondent', 'organization'),
        'paired': None,
    },
    {
        'key': 'organization',
        'group': 'مخاطبین و سازمان‌ها',
        'description': 'نام سازمان طرف نامه را به سازمان‌های تعریف‌شدهٔ مکاتبات متصل می‌کند.',
        'target_kinds': ('organization',),
        'paired': None,
    },
    {
        'key': 'subject',
        'group': 'موضوع',
        'description': 'موضوع‌های تکراری نامه را به یک «نوع مکاتبه» متصل می‌کند؛ '
                       'روی نامه‌هایی اعمال می‌شود که موضوع آن‌ها عیناً همین متن است و '
                       'نوع مکاتبه ندارند.',
        'target_kinds': ('category',),
        'paired': None,
    },
    {
        'key': 'any',
        'group': 'عمومی',
        'description': 'نگاشت عمومی؛ وقتی برای دامنهٔ مشخصی نگاشت نباشد، این مورد استفاده می‌شود.',
        'target_kinds': ('employee', 'party', 'correspondent', 'organization', 'category'),
        'paired': None,
    },
]

PURPOSE_BY_KEY = {purpose['key']: purpose for purpose in PURPOSES}

# «نگاشت دو مسیره» فقط برای دامنه‌هایی معنا دارد که طرف مقابل دارند
PAIRED_SCOPES = {
    purpose['key']: purpose['paired']
    for purpose in PURPOSES
    if purpose.get('paired')
}


def paired_scope(scope):
    """دامنهٔ طرف مقابل (مثلاً sender ↔ receiver) یا ``None``."""
    return PAIRED_SCOPES.get(scope)


def can_be_bidirectional(scope):
    """آیا «نگاشت دو مسیره» برای این دامنه معنا دارد؟"""
    return bool(paired_scope(scope))


def purposes_payload(counts=None, labels=None):
    """فرادادهٔ کاربردها برای فرانت (لیست JSON-safe)."""
    counts = counts or {}
    labels = labels or {}
    rows = []
    for purpose in PURPOSES:
        key = purpose['key']
        rows.append({
            'key': key,
            'label': labels.get(key, key),
            'group': purpose['group'],
            'description': purpose['description'],
            'target_kinds': list(purpose['target_kinds']),
            'paired': purpose['paired'],
            'bidirectional': bool(purpose['paired']),
            'count': counts.get(key, 0) or 0,
        })
    return rows


def purpose_groups():
    """کاربردها گروه‌بندی‌شده برای انتخاب‌گر جدول/فرم."""
    groups = []
    index = {}
    for purpose in purposes_payload():
        title = purpose['group']
        if title not in index:
            index[title] = {'title': title, 'keys': []}
            groups.append(index[title])
        index[title]['keys'].append(purpose['key'])
    return groups


def target_kinds_for(scope):
    """نوع مقصدهای مجاز برای یک دامنه (خالی = همهٔ انواع)."""
    purpose = PURPOSE_BY_KEY.get(scope)
    return tuple(purpose['target_kinds']) if purpose else ()


def resolve_scopes(scope, bidirectional=False, scope_map=None):
    """دامنه‌های مؤثر یک نگاشت روی داده‌ها.

    ``scope_map`` همان نقشه‌های ``EMPLOYEE_SCOPES``/``PARTY_SCOPES``/… در
    ``correspondences.mapping`` است: برای هر دامنه می‌گوید کدام فیلدهای نامه
    تحت تأثیر قرار می‌گیرند. با «دو مسیره» شدن، دامنهٔ طرف مقابل هم اضافه می‌شود.
    """
    scope_map = scope_map or {}
    scopes = list(scope_map.get(scope, scope_map.get('any', ())))
    if bidirectional:
        pair = paired_scope(scope)
        if pair:
            for extra in scope_map.get(pair, ()):
                if extra not in scopes:
                    scopes.append(extra)
    return tuple(scopes)


def join_target_labels(labels):
    """برچسب مقصدهای چندگانه با خط تیره.

    نمونه: ``['سیده زهرا حسینی', 'مریم رضایی']`` → ``'سیده زهرا حسینی — مریم رضایی'``
    (تکراری‌ها حذف می‌شوند؛ فهرست خالی ``'—'`` می‌دهد.)
    """
    clean = []
    for label in labels or ():
        text = str(label or '').strip()
        if text and text not in clean:
            clean.append(text)
    return TARGET_SEPARATOR.join(clean) if clean else EMPTY_LABEL
