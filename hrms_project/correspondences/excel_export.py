"""خروجی اکسل دفتر مکاتبات (هم‌ساخت با دفتر اکسل واحد مکاتبات).

ستون‌ها بر اساس نیاز واقعی واحد مکاتبات انتخاب شده‌اند: شماره نامه، شماره اندیکاتور،
ترنسمیتال، تاریخ نامه/ورود/ارسال، طرف مکاتبه، موضوع، تنظیم‌کننده، آخرین ارجاع،
مهلت پاسخ، وضعیت و تعداد پیوست.
"""
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from django.db.models import Prefetch

try:
    from jdatetime import date as jdate
except Exception:  # noqa: BLE001
    jdate = None

HEADERS = [
    ('ردیف', 6),
    ('شماره نامه', 18),
    ('شماره اندیکاتور', 16),
    ('ترنسمیتال', 16),
    ('جهت', 10),
    ('تاریخ نامه', 12),
    ('تاریخ ورود', 12),
    ('تاریخ ارسال', 12),
    ('سازمان / طرف مکاتبه', 30),
    ('فرستنده', 20),
    ('گیرنده', 20),
    ('موضوع', 55),
    ('نوع مکاتبه', 16),
    ('تنظیم‌کننده', 18),
    ('آخرین ارجاع به', 20),
    ('مهلت پاسخ', 12),
    ('وضعیت', 14),
    ('اولویت', 10),
    ('مبلغ', 16),
    ('پیوست', 8),
    ('شماره قرارداد', 16),
    ('توضیحات', 40),
]


PERSIAN_DIGITS = str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹')


def _jalali(value):
    if not value:
        return ''
    if jdate is None:
        text = value.isoformat()
    else:
        try:
            text = jdate.fromgregorian(date=value).strftime('%Y/%m/%d')
        except Exception:  # noqa: BLE001
            text = value.isoformat()
    return text.translate(PERSIAN_DIGITS)


def _user_name(user):
    if not user:
        return ''
    return user.get_full_name() or user.get_username()


def build_letters_workbook(queryset):
    """ساخت Workbook اکسل از مجموعهٔ نامه‌ها."""
    from correspondences.models import LetterAttachment, LetterReferral

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = 'دفتر مکاتبات'
    sheet.rightToLeft = True

    header_font = Font(bold=True, color='FFFFFF', size=10)
    header_fill = PatternFill('solid', fgColor='0F766E')
    for index, (title, width) in enumerate(HEADERS, start=1):
        cell = sheet.cell(row=1, column=index, value=title)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center', vertical='center')
        sheet.column_dimensions[get_column_letter(index)].width = width
    sheet.freeze_panes = 'A2'

    rows = queryset.select_related(
        'organization', 'correspondent', 'category', 'drafter',
    ).prefetch_related(
        Prefetch(
            'attachments',
            queryset=LetterAttachment.objects.only('id', 'letter_id'),
        ),
        Prefetch(
            'referrals',
            queryset=LetterReferral.objects.select_related('to_user').defer(
                'instruction', 'note', 'margin_note', 'response', 'result', 'result_note',
            ),
        ),
    )
    for number, letter in enumerate(rows, start=1):
        referrals = list(letter.referrals.all())
        last_referral = max(referrals, key=lambda row: (row.seq or 0, row.id or 0)) if referrals else None
        target = ''
        if last_referral:
            target = _user_name(last_referral.to_user) or last_referral.to_name or ''
        values = [
            number,
            letter.number or '',
            letter.indicator_no or '',
            letter.transmittal_no or '',
            letter.get_direction_display(),
            _jalali(letter.letter_date),
            _jalali(letter.received_date),
            _jalali(letter.sent_date),
            letter.party_display,
            letter.sender_name or '',
            letter.receiver_name or '',
            letter.subject or '',
            letter.category.name if letter.category else '',
            _user_name(letter.drafter),
            target,
            _jalali(letter.due_date),
            letter.get_status_display(),
            letter.get_priority_display(),
            float(letter.amount) if letter.amount is not None else '',
            letter.attachments.count(),
            letter.contract_number or '',
            letter.summary or '',
        ]
        sheet.append(values)

    for row in sheet.iter_rows(min_row=2, max_row=sheet.max_row):
        for cell in row:
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=False)
    return workbook
