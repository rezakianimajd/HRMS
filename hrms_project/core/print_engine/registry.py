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


def _company_info(company):
    if not company:
        return {}
    name = getattr(company, 'name', '') or ''
    return {
        'name': name,
        'subtitle': getattr(company, 'code', '') or '',
        'logo_text': name[:2],
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


def build_payslip(payload, options, request=None):
    """فیش حقوقی (سند سروری با سرصفحهٔ برند، مبلغ به حروف و بارکد)."""
    from core.print_engine.builders.payslip import load_payslip

    return load_payslip(payload, options, request)


def build_voucher(payload, options, request=None):
    """فیش دریافت / حواله پرداخت / رسید انتقال خزانه‌داری."""
    from core.print_engine.builders.voucher import load_voucher

    return load_voucher(payload, options, request)


DOCUMENTS.update({'payslip': build_payslip, 'voucher': build_voucher})


def render(document_key, payload, options=None, request=None):
    """سند کامل HTML برای یک نوع سند."""
    builder = DOCUMENTS.get(document_key)
    if not builder:
        raise PrintError(f'نوع سند «{document_key}» پشتیبانی نمی‌شود.', 400)
    return render_document(builder(payload or {}, options or {}, request=request), options or {})


def available_documents():
    return [
        {'key': 'letter', 'label': 'نامهٔ اداری'},
        {'key': 'table', 'label': 'گزارش جدولی'},
        {'key': 'payslip', 'label': 'فیش حقوقی'},
        {'key': 'voucher', 'label': 'سند خزانه‌داری'},
        {'key': 'custom', 'label': 'سند آماده (HTML)'},
    ]
