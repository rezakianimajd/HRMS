"""رجیستری اسناد چاپی — نگاشت «نوع سند» به سازندهٔ محتوا.

انواع پشتیبانی‌شده:

- ``letter``  — نامهٔ اداری مکاتبات (شماره‌ها، طرفین، موضوع/متن، ارجاعات، پیوست‌ها)
- ``table``   — گزارش جدولی عمومی (همهٔ صفحات گزارش)
- ``custom``  — HTML آمادهٔ یک ماژول (برای مهاجرت تدریجی مثل فیش خزانه‌داری)
"""
from core.print_engine import components as pe
from core.print_engine.layout import render_document

DOCUMENTS = {}


class PrintError(Exception):
    """خطای قابل نمایش چاپ (۴۰۰/۴۰۳/۴۰۴)."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


def _module_codes(user, module):
    from core.engines.permission_engine import fine_permissions_for

    prefix = f'{module}.'
    return {
        code for code, value in (fine_permissions_for(user) or {}).items()
        if value and str(code).startswith(prefix)
    }


def can_print(user, module):
    """آیا کاربر مجاز به چاپ این ماژول است؟ (سازگار با کاربران بدون کد ریز)"""
    from core.engines.permission_engine import module_action_granted

    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_superuser', False):
        return True
    if module_action_granted(user, module, ('view', 'export')):
        return True
    # کاربری که هیچ کد ریز این ماژول را ندارد (نقش قدیمی) مسدود نمی‌شود
    return not _module_codes(user, module)


def _logo_data_uri(logo):
    """لوگوی شرکت به‌صورت data-URI برای چاپ (بدون نیاز به شبکه/مسیر نسبی)."""
    if not logo:
        return ''
    try:
        import base64
        import os

        path = logo.path
        if not path or not os.path.exists(path):
            return ''
        if os.path.getsize(path) > 2 * 1024 * 1024:
            return ''
        extension = (os.path.splitext(path)[1] or '').lower().lstrip('.')
        mime = {
            'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
            'webp': 'image/webp', 'gif': 'image/gif', 'svg': 'image/svg+xml',
        }.get(extension, 'image/png')
        with open(path, 'rb') as handle:
            encoded = base64.b64encode(handle.read()).decode('ascii')
        return f'data:{mime};base64,{encoded}'
    except Exception:  # noqa: BLE001 — نبود/خرابی لوگو نباید چاپ را بشکند
        return ''


def _company_info(company):
    if not company:
        return {}
    name = ''
    logo = None
    try:
        from settings_app.models import CompanyProfile

        profile = CompanyProfile.objects.filter(company=company).first()
        if profile:
            name = (profile.legal_name or '').strip()
            logo = profile.logo or None
    except Exception:  # noqa: BLE001 — اسکیمای بدون پروفایل هم باید چاپ شود
        pass
    if not name:
        name = getattr(company, 'name', '') or ''
    if logo is None:
        logo = getattr(company, 'logo', None)
    return {
        'name': name,
        'subtitle': getattr(company, 'code', '') or '',
        'logo': _logo_data_uri(logo),
    }


def build_letter(payload, options, request=None):
    """نامهٔ اداری → سند چاپی."""
    from correspondences.models import Letter

    company = getattr(request, 'tenant', None) or getattr(request, 'company', None)
    queryset = Letter.objects.select_related(
        'category', 'series', 'organization', 'correspondent', 'sender_party',
        'party_account', 'sender_organization', 'sender_employee', 'receiver_employee',
    )
    if company:
        queryset = queryset.filter(company=company)
    letter = queryset.filter(pk=payload.get('id')).first()
    if not letter:
        raise PrintError('نامهٔ موردنظر یافت نشد.', 404)
    if not can_print(getattr(request, 'user', None), 'correspondence'):
        raise PrintError('برای چاپ مکاتبات مجوز لازم را ندارید.', 403)

    sections = [
        {'title': 'شماره‌ها و تاریخ‌ها', 'html': pe.field_grid([
            ('شماره نامه', letter.number or '—'),
            ('شمارهٔ اندیکاتور', letter.indicator_no),
            ('ترنسمیتال', letter.transmittal_no),
            ('شمارهٔ طرف مقابل', letter.external_number),
            ('تاریخ نامه', pe.jalali(letter.letter_date)),
            ('تاریخ ورود', pe.jalali(letter.received_date)),
            ('تاریخ ارسال', pe.jalali(letter.sent_date)),
            ('مهلت پاسخ', pe.jalali(letter.due_date)),
        ])},
        {'title': 'طرفین مکاتبه', 'html': pe.field_grid([
            ('فرستنده', letter.sender_display()),
            ('گیرنده', letter.receiver_display()),
            ('طرف مکاتبه', letter.party_display),
            ('مخاطب', getattr(letter.correspondent, 'name', '') or ''),
            ('نوع مکاتبه', getattr(letter.category, 'name', '') or ''),
            ('سری شماره‌گذاری', getattr(letter.series, 'title', '') or ''),
            ('تحویل‌دهنده', letter.delivered_by_name
             or getattr(letter.delivered_by, 'full_name', '') or ''),
            ('واحد ثبت‌کننده', letter.unit_name),
            ('شمارهٔ ثبت شرکت', letter.company_reg_no),
        ])},
    ]
    body_text = (letter.body or '').strip()
    extra = ''
    if letter.summary:
        extra += f'<div style="margin-top:6px">{pe.esc(letter.summary)}</div>'
    if body_text:
        extra += f'<div style="margin-top:8px;white-space:pre-wrap">{pe.esc(body_text)}</div>'
    sections.append({
        'title': 'موضوع و متن',
        'html': (
            '<div class="pe-note" style="border-style:solid">'
            f'<strong>{pe.esc(letter.subject)}</strong>{extra}</div>'
        ),
    })

    referral_rows = [
        {
            'seq': pe.fa_digits(row.seq),
            'target': row.target_label,
            'on': pe.jalali(row.referred_on),
            'status': row.get_status_display(),
            'instruction': row.instruction or row.note or '',
        }
        for row in letter.referrals.select_related('to_user', 'to_employee').all()
    ]
    if referral_rows:
        sections.append({'title': 'ارجاعات', 'html': pe.data_table([
            {'key': 'seq', 'label': 'سطح', 'align': 'center', 'width': '8%'},
            {'key': 'target', 'label': 'ارجاع‌شونده', 'width': '30%'},
            {'key': 'on', 'label': 'تاریخ', 'align': 'center', 'width': '14%'},
            {'key': 'status', 'label': 'وضعیت', 'align': 'center', 'width': '14%'},
            {'key': 'instruction', 'label': 'دستور / اقدام', 'width': '34%'},
        ], referral_rows)})

    attachments = list(letter.attachments.all())
    if attachments:
        items = ''.join(
            f'<li>{pe.esc(item.title or item.get_kind_display())}</li>' for item in attachments
        )
        sections.append({
            'title': f'پیوست‌ها ({pe.fa_digits(len(attachments))})',
            'html': f'<ol style="margin:0;padding-inline-start:18px;font-size:9pt">{items}</ol>',
        })

    return {
        'title': f'نامهٔ {letter.get_direction_display()}',
        'subtitle': letter.subject,
        'badge': letter.get_status_display(),
        'company': _company_info(company),
        'meta': [('شماره', letter.number or '—')],
        'sections': sections,
        'amount_box': (
            {'words': pe.amount_words(letter.amount), 'value': pe.money(letter.amount)}
            if letter.amount else None
        ),
        'barcode': pe.barcode(letter.number or f'L-{letter.pk}'),
        'signatures': pe.signatures([
            {'title': 'تنظیم‌کننده', 'name': letter.drafter_name or ''},
            {'title': 'رئیس دبیرخانه'},
            {'title': 'مهر و امضا'},
        ]),
        'watermark': 'پیش‌نویس' if letter.status == 'draft' else '',
        'printed_on': payload.get('printed_on'),
    }


def build_table(payload, options, request=None):
    """گزارش جدولی عمومی (همهٔ صفحات گزارش)."""
    module = payload.get('module') or 'hrms'
    if not can_print(getattr(request, 'user', None), module):
        raise PrintError('برای چاپ این گزارش مجوز لازم را ندارید.', 403)
    columns = payload.get('columns') or []
    rows = payload.get('rows') or []
    if not columns:
        raise PrintError('ستون‌های گزارش مشخص نشده است.')
    company = getattr(request, 'tenant', None) or getattr(request, 'company', None)
    sections = []
    filters_note = payload.get('filters_note') or ''
    if filters_note:
        sections.append({
            'title': 'شرایط گزارش',
            'html': f'<div class="pe-note">{pe.esc(filters_note)}</div>',
        })
    sections.append({
        'title': payload.get('section_title') or '',
        'html': pe.data_table(columns, rows, {
            'total_row': payload.get('total_row'),
            'zebra': payload.get('zebra', True),
        }),
    })
    return {
        'title': payload.get('title') or 'گزارش',
        'subtitle': payload.get('subtitle') or '',
        'badge': payload.get('badge') or '',
        'company': _company_info(company),
        'meta': [('تعداد سطر', pe.fa_digits(len(rows)))],
        'sections': sections,
        'note': payload.get('note') or '',
        'signatures': pe.signatures([
            {'title': 'تهیه‌کننده'}, {'title': 'تأییدکننده'}, {'title': 'مهر و امضا'},
        ]),
        'printed_on': payload.get('printed_on'),
    }


def build_custom(payload, options, request=None):
    """HTML آمادهٔ یک ماژول (مهاجرت تدریجی چاپ‌های موجود)."""
    module = payload.get('module') or ''
    if module and not can_print(getattr(request, 'user', None), module):
        raise PrintError('برای چاپ این سند مجوز لازم را ندارید.', 403)
    html_body = payload.get('html') or ''
    if not html_body:
        raise PrintError('محتوای سند خالی است.')
    company = getattr(request, 'tenant', None) or getattr(request, 'company', None)
    return {
        'title': payload.get('title') or 'سند',
        'subtitle': payload.get('subtitle') or '',
        'badge': payload.get('badge') or '',
        'company': _company_info(company),
        'meta': payload.get('meta') or [],
        'sections': [{'title': payload.get('section_title') or '', 'html': html_body}],
        'note': payload.get('note') or '',
        'signatures': pe.signatures(payload.get('signatures') or []),
        'printed_on': payload.get('printed_on'),
    }


DOCUMENTS.update({'letter': build_letter, 'table': build_table, 'custom': build_custom})


LETTER_LIST_COLUMNS = [
    {'key': 'number', 'label': 'شماره نامه', 'weight': 10, 'align': 'center'},
    {'key': 'unit_reg_no', 'label': 'شماره ثبت', 'weight': 8, 'align': 'center'},
    {'key': 'company_reg_no', 'label': 'شماره ثبت شرکت', 'weight': 8, 'align': 'center'},
    {'key': 'external_number', 'label': 'شماره طرف مقابل', 'weight': 9, 'align': 'center'},
    {'key': 'indicator_no', 'label': 'شماره اندیکاتور', 'weight': 9, 'align': 'center'},
    {'key': 'transmittal_no', 'label': 'ترنسمیتال', 'weight': 8, 'align': 'center'},
    {'key': 'direction', 'label': 'جهت', 'weight': 7, 'align': 'center'},
    {'key': 'letter_date', 'label': 'تاریخ نامه', 'weight': 9, 'align': 'center'},
    {'key': 'received_date', 'label': 'تاریخ ورود', 'weight': 9, 'align': 'center'},
    {'key': 'sent_date', 'label': 'تاریخ ارسال', 'weight': 9, 'align': 'center'},
    {'key': 'due_date', 'label': 'مهلت پاسخ', 'weight': 9, 'align': 'center'},
    {'key': 'unit_reg_date', 'label': 'تاریخ ثبت (واحد)', 'weight': 9, 'align': 'center'},
    {'key': 'category', 'label': 'نوع مکاتبه', 'weight': 9},
    {'key': 'series', 'label': 'سری شماره‌گذاری', 'weight': 9},
    {'key': 'subject', 'label': 'موضوع', 'weight': 22},
    {'key': 'summary', 'label': 'خلاصه / چکیده', 'weight': 20},
    {'key': 'body', 'label': 'متن نامه', 'weight': 26},
    {'key': 'party', 'label': 'طرف مکاتبه', 'weight': 16},
    {'key': 'sender', 'label': 'فرستنده', 'weight': 14},
    {'key': 'receiver', 'label': 'گیرنده', 'weight': 14},
    {'key': 'organization', 'label': 'سازمان', 'weight': 14},
    {'key': 'correspondent', 'label': 'مخاطب', 'weight': 13},
    {'key': 'sender_title', 'label': 'سمت ارسال‌کننده', 'weight': 12},
    {'key': 'delivery_type', 'label': 'نوع تحویل', 'weight': 10, 'align': 'center'},
    {'key': 'delivered_by', 'label': 'تحویل‌دهنده / ثبت‌کننده', 'weight': 14},
    {'key': 'entered_by', 'label': 'ثبت‌کنندهٔ ورود', 'weight': 13},
    {'key': 'drafter', 'label': 'تنظیم‌کننده', 'weight': 13},
    {'key': 'priority', 'label': 'اولویت', 'weight': 8, 'align': 'center'},
    {'key': 'confidentiality', 'label': 'محرمانگی', 'weight': 9, 'align': 'center'},
    {'key': 'status', 'label': 'وضعیت', 'weight': 9, 'align': 'center'},
    {'key': 'amount', 'label': 'مبلغ', 'weight': 12, 'align': 'center'},
    {'key': 'currency', 'label': 'ارز', 'weight': 7, 'align': 'center'},
    {'key': 'archive_ref', 'label': 'شماره بایگانی', 'weight': 9, 'align': 'center'},
    {'key': 'contract_number', 'label': 'شماره قرارداد', 'weight': 10, 'align': 'center'},
    {'key': 'tags', 'label': 'برچسب‌ها', 'weight': 12},
    {'key': 'attachments', 'label': 'تعداد پیوست', 'weight': 7, 'align': 'center'},
    {'key': 'referrals', 'label': 'تعداد ارجاع', 'weight': 7, 'align': 'center'},
    {'key': 'entry_method', 'label': 'نحوهٔ ثبت', 'weight': 9, 'align': 'center'},
    {'key': 'entry_time', 'label': 'ساعت ورود', 'weight': 7, 'align': 'center'},
    {'key': 'created_at', 'label': 'تاریخ ثبت رکورد', 'weight': 10, 'align': 'center'},
]

DEFAULT_LETTER_LIST_COLUMNS = [
    'number', 'letter_date', 'direction', 'subject', 'party', 'status', 'attachments',
]


def column_catalog():
    """فهرست ستون‌های قابل انتخاب برای قالب چاپ هر سند."""
    return {
        'letter-list': [{'key': col['key'], 'label': col['label']} for col in LETTER_LIST_COLUMNS],
    }


def _clip(value, limit=180):
    text = ' '.join(str(value or '').replace('\u200c', ' ').split())
    if not text:
        return '—'
    return text if len(text) <= limit else f'{text[:limit]}…'


def _person_name(user):
    if not user:
        return ''
    try:
        return (user.get_full_name() or '').strip() or user.get_username()
    except Exception:  # noqa: BLE001
        return ''


def _letter_row(letter):
    """همهٔ مقادیر قابل چاپِ یک نامه (کلیدها همان LETTER_LIST_COLUMNS)."""
    def display(field, getter):
        return getter() if getattr(letter, field, '') else '—'

    delivered = letter.delivered_by_name or _person_name(getattr(letter, 'delivered_by', None))
    return {
        'number': letter.number or letter.unit_reg_no or '—',
        'unit_reg_no': letter.unit_reg_no or '—',
        'company_reg_no': letter.company_reg_no or '—',
        'external_number': letter.external_number or '—',
        'indicator_no': letter.indicator_no or '—',
        'transmittal_no': letter.transmittal_no or '—',
        'direction': letter.get_direction_display(),
        'letter_date': pe.jalali(letter.letter_date),
        'received_date': pe.jalali(letter.received_date),
        'sent_date': pe.jalali(letter.sent_date),
        'due_date': pe.jalali(letter.due_date),
        'unit_reg_date': pe.jalali(letter.unit_reg_date),
        'category': getattr(letter.category, 'name', '') or '—',
        'series': getattr(letter.series, 'title', '') or '—',
        'subject': letter.subject or '—',
        'summary': _clip(letter.summary, 220),
        'body': _clip(letter.body, 260),
        'party': letter.party_display or '—',
        'sender': _sender_label(letter),
        'receiver': _receiver_label(letter),
        'organization': getattr(letter.organization, 'name', '') or '—',
        'correspondent': getattr(letter.correspondent, 'name', '') or '—',
        'sender_title': letter.sender_title or '—',
        'delivery_type': display('delivery_type', letter.get_delivery_type_display),
        'delivered_by': delivered or '—',
        'entered_by': letter.entered_by_name or _person_name(getattr(letter, 'entered_by', None)) or '—',
        'drafter': letter.drafter_name or _person_name(getattr(letter, 'drafter', None)) or '—',
        'priority': display('priority', letter.get_priority_display),
        'confidentiality': display('confidentiality', letter.get_confidentiality_display),
        'status': letter.get_status_display(),
        'amount': pe.money(letter.amount) if letter.amount else '—',
        'currency': letter.currency or '—',
        'archive_ref': letter.archive_ref or '—',
        'contract_number': letter.contract_number or '—',
        'tags': '، '.join(str(tag) for tag in (letter.tags or [])) or '—',
        'attachments': pe.fa_digits(getattr(letter, 'attachment_count', 0) or 0),
        'referrals': pe.fa_digits(getattr(letter, 'referral_count', 0) or 0),
        'entry_method': display('entry_method', letter.get_entry_method_display),
        'entry_time': letter.entry_time.strftime('%H:%M') if letter.entry_time else '—',
        'created_at': pe.jalali(letter.created_at.date()) if letter.created_at else '—',
    }


def _sender_label(letter):
    try:
        return letter.sender_display(include_employee=False) or '—'
    except Exception:  # noqa: BLE001
        try:
            return letter.sender_display() or '—'
        except Exception:  # noqa: BLE001
            return letter.sender_name or '—'


def _receiver_label(letter):
    try:
        return letter.receiver_display() or '—'
    except Exception:  # noqa: BLE001
        return letter.receiver_name or '—'


def _letter_columns(payload, options):
    """ستون‌های انتخابی (payload یا تنظیمات) با عرض متناسب."""
    selected = payload.get('columns')
    if not isinstance(selected, (list, tuple)) or not selected:
        raw = (options or {}).get('columns')
        if isinstance(raw, (list, tuple)):
            selected = raw
        elif isinstance(raw, dict):
            selected = raw.get('letter-list')
    by_key = {column['key']: column for column in LETTER_LIST_COLUMNS}
    if not isinstance(selected, (list, tuple)) or not selected:
        keys = list(DEFAULT_LETTER_LIST_COLUMNS)
    else:
        keys = [str(key) for key in selected if str(key) in by_key]
        keys = keys or list(DEFAULT_LETTER_LIST_COLUMNS)
    chosen = [by_key[key] for key in keys]
    total = sum(column.get('weight', 10) for column in chosen) or 1
    return [
        {
            'key': column['key'],
            'label': column['label'],
            'align': column.get('align', 'right'),
            'width': f'{100 * column.get("weight", 10) / total:.1f}%',
        }
        for column in chosen
    ]


def build_letter_list(payload, options, request=None):
    """فهرست مکاتبات برای چاپ — ردیف‌های انتخاب‌شده یا یک فهرست فیلترشده."""
    from django.db.models import Count, Q

    from correspondences.models import Letter

    if not can_print(getattr(request, 'user', None), 'correspondence'):
        raise PrintError('برای چاپ مکاتبات مجوز لازم را ندارید.', 403)
    company = getattr(request, 'tenant', None) or getattr(request, 'company', None)
    queryset = Letter.objects.select_related(
        'category', 'series', 'party_account', 'correspondent', 'organization',
        'sender_party', 'sender_organization', 'sender_employee', 'receiver_employee',
        'entered_by', 'drafter', 'delivered_by',
    ).annotate(attachment_count=Count('attachments', distinct=True))
    if company:
        queryset = queryset.filter(company=company)
    queryset = queryset.filter(is_active=True)

    ids = payload.get('ids') or []
    if isinstance(ids, (str, int)):
        ids = str(ids).replace('،', ',').split(',')
    clean_ids = []
    for value in ids:
        try:
            number = int(str(value).strip())
        except (TypeError, ValueError):
            continue
        if number and number not in clean_ids:
            clean_ids.append(number)
    clean_ids = clean_ids[:300]

    filters_note = []
    if clean_ids:
        queryset = queryset.filter(pk__in=clean_ids)
        filters_note.append(f'ردیف‌های انتخاب‌شده ({pe.fa_digits(len(clean_ids))})')
    else:
        direction = payload.get('direction') or ''
        if direction in dict(Letter.DIRECTION_CHOICES):
            queryset = queryset.filter(direction=direction)
            filters_note.append(f'جهت: {dict(Letter.DIRECTION_CHOICES).get(direction, direction)}')
        status = payload.get('status') or ''
        if status in dict(Letter.STATUS_CHOICES):
            queryset = queryset.filter(status=status)
            filters_note.append(f'وضعیت: {dict(Letter.STATUS_CHOICES).get(status, status)}')
        search = (payload.get('search') or '').strip()
        if search:
            queryset = queryset.filter(
                Q(subject__icontains=search) | Q(number__icontains=search)
                | Q(party_name__icontains=search) | Q(description__icontains=search),
            )
            filters_note.append(f'جست‌وجو: {search}')
    if payload.get('filters_note'):
        filters_note.append(str(payload['filters_note']))

    queryset = queryset.annotate(referral_count=Count('referrals', distinct=True))
    queryset = queryset.order_by('-id')[:300]
    rows = []
    direction = payload.get('direction') or ''
    direction_titles = {
        'incoming': 'فهرست نامه‌های وارده',
        'outgoing': 'فهرست نامه‌های صادره',
        'internal': 'فهرست نامه‌های داخلی',
    }
    for letter in queryset:
        rows.append(_letter_row(letter))

    columns = _letter_columns(payload, options)
    return {
        'title': payload.get('title') or direction_titles.get(direction) or 'فهرست مکاتبات اداری',
        # زیرعنوان و متادیتا (تعداد ردیف/فیلترها) عمداً در سربرگ چاپ نمی‌آید.
        'subtitle': '',
        'badge': payload.get('badge') or '',
        'company': _company_info(company),
        'meta': [],
        'sections': [{
            'title': payload.get('section_title') or '',
            'html': pe.data_table(columns, rows, {'zebra': True}),
        }],
        'note': payload.get('note') or '',
        'signatures': pe.signatures([
            {'title': 'تهیه‌کننده'}, {'title': 'تأییدکننده'}, {'title': 'مهر و امضا'},
        ]) if payload.get('show_signatures', True) else '',
        'printed_on': payload.get('printed_on'),
    }


DOCUMENTS.update({'letter-list': build_letter_list})


def build_payslip(payload, options, request=None):
    """فیش حقوقی (سند سروری با سرصفحهٔ برند، مبلغ به حروف و بارکد)."""
    from core.print_engine.builders.payslip import load_payslip

    return load_payslip(payload, options, request)


def build_voucher(payload, options, request=None):
    """فیش دریافت / حواله پرداخت / رسید انتقال خزانه‌داری."""
    from core.print_engine.builders.voucher import load_voucher

    return load_voucher(payload, options, request)


def build_petty_statement(payload, options, request=None):
    """صورت ریز هزینهٔ تنخواه."""
    from core.print_engine.builders.petty_statement import load_statement

    return load_statement(payload, options, request)


DOCUMENTS.update({
    'payslip': build_payslip,
    'voucher': build_voucher,
    'petty-statement': build_petty_statement,
})


def _render_options(options, request):
    """تنظیمات چاپ شرکت (سربرگ/پاورقی/کاغذ) + گزینه‌های صریح همان چاپ."""
    from settings_app.print_settings import print_settings_for

    company = getattr(request, 'tenant', None) or getattr(request, 'company', None)
    base = print_settings_for(company)
    explicit = options if isinstance(options, dict) else {}
    merged = dict(base)
    for key, value in explicit.items():
        if key in ('header', 'footer'):
            continue
        if value is not None:
            merged[key] = value
    for key in ('header', 'footer'):
        if isinstance(explicit.get(key), dict):
            merged[key] = {**base.get(key, {}), **explicit[key]}
    return merged


def render(document_key, payload, options=None, request=None):
    """سند کامل HTML برای یک نوع سند."""
    builder = DOCUMENTS.get(document_key)
    if not builder:
        raise PrintError(f'نوع سند «{document_key}» پشتیبانی نمی‌شود.', 400)
    from datetime import date as date_cls

    merged = _render_options(options, request)
    clean_payload = dict(payload or {})
    clean_payload.setdefault('printed_on', date_cls.today().isoformat())
    return render_document(builder(clean_payload, merged, request=request), merged)


def available_documents():
    return [
        {'key': 'letter', 'label': 'نامهٔ اداری'},
        {'key': 'letter-list', 'label': 'فهرست مکاتبات'},
        {'key': 'table', 'label': 'گزارش جدولی'},
        {'key': 'payslip', 'label': 'فیش حقوقی'},
        {'key': 'voucher', 'label': 'سند خزانه‌داری'},
        {'key': 'petty-statement', 'label': 'صورت ریز هزینهٔ تنخواه'},
        {'key': 'custom', 'label': 'سند آماده (HTML)'},
    ]
