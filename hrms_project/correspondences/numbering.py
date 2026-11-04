"""شماره‌گذاری خودکار نامه‌ها (تفکیک‌شده بر اساس سری/جهت/سال شمسی).

قالب شماره سه توکن دارد:

    {prefix}  پیشوند سری (مثل «ص م»)
    {year}    سال شمسی تاریخ نامه
    {seq}     شمارهٔ سری با صفر پیشرو (بر اساس `padding`)

نمونه‌ها:
    >>> render_number('{prefix}/{year}/{seq}', prefix='ص م', year=1405, seq=7, padding=3)
    'ص م/1405/007'
    >>> render_number('{prefix}-{seq}', prefix='', year=1405, seq=12, padding=2)
    '12'
"""
import re
from datetime import date

try:  # jdatetime در بک‌اند موجود است؛ در تست‌های سبک هم بدون آن کار می‌کنیم
    from jdatetime import date as jdate
except Exception:  # noqa: BLE001
    jdate = None

DEFAULT_TEMPLATES = {
    'incoming': '{prefix}/{year}/{seq}',
    'outgoing': '{prefix}/{year}/{seq}',
    'internal': '{prefix}/{year}/{seq}',
}

_SEPARATORS = ('/', '-', '.')


def jalali_year(value=None):
    """سال شمسی یک تاریخ (پیش‌فرض: امروز)."""
    value = value or date.today()
    if jdate is None:
        return value.year if hasattr(value, 'year') else None
    try:
        return jdate.fromgregorian(date=value).year
    except Exception:  # noqa: BLE001
        return getattr(value, 'year', None)


def _clean_separators(text):
    """حذف بخش‌های خالی شماره: «ص/1405/» → «ص/1405»."""
    for sep in _SEPARATORS:
        pattern = re.escape(sep) + r'{2,}'
        text = re.sub(pattern, sep, text)
    text = text.strip()
    for sep in _SEPARATORS:
        while text.startswith(sep):
            text = text[len(sep):]
        while text.endswith(sep):
            text = text[:-len(sep)]
        text = text.replace(f' {sep}', sep).replace(f'{sep} ', sep)
    return re.sub(r'\s{2,}', ' ', text).strip()


def render_number(template, *, prefix='', year=None, seq=1, padding=3):
    """ساخت شماره از قالب؛ بخش‌های خالی به‌صورت خودکار حذف می‌شوند."""
    template = (template or '').strip() or DEFAULT_TEMPLATES['outgoing']
    year = year or jalali_year()
    try:
        seq_int = int(seq)
    except (TypeError, ValueError):
        seq_int = 1
    padding = max(0, min(int(padding or 0), 10))
    number = (
        template
        .replace('{prefix}', str(prefix or '').strip())
        .replace('{year}', str(year))
        .replace('{seq}', str(seq_int).zfill(padding))
    )
    return _clean_separators(number)


def preview_number(series, letter_date=None, seq=None):
    """شمارهٔ بعدی یک سری بدون مصرف شمارنده (برای نمایش در فرم)."""
    if series is None:
        return ''
    year = jalali_year(letter_date)
    next_seq = series.next_number if seq is None else seq
    if getattr(series, 'reset_yearly', False) and series.last_year and series.last_year != year:
        next_seq = 1
    return render_number(
        getattr(series, 'template', '') or DEFAULT_TEMPLATES.get(series.direction, ''),
        prefix=series.prefix, year=year, seq=next_seq, padding=series.padding,
    )


def allocate_number(series, letter_date=None):
    """مصرف اتمیک شمارندهٔ سری و برگرداندن شمارهٔ نهایی."""
    from django.db import transaction

    if series is None:
        return ''
    year = jalali_year(letter_date)
    with transaction.atomic():
        model = type(series)
        current = model.objects.select_for_update().get(pk=series.pk)
        next_seq = current.next_number or 1
        if current.reset_yearly and current.last_year and current.last_year != year:
            next_seq = 1
        number = render_number(
            current.template or DEFAULT_TEMPLATES.get(current.direction, ''),
            prefix=current.prefix, year=year, seq=next_seq, padding=current.padding,
        )
        current.next_number = next_seq + 1
        current.last_year = year
        current.save(update_fields=['next_number', 'last_year', 'updated_at'])
        series.next_number = current.next_number
        series.last_year = current.last_year
    return number


def request_number(company, when=None, prefix='درخ'):
    """شمارهٔ بعدی درخواست کارتابل: «درخ/1405/0001» (سالانه)."""
    from django.db import transaction

    from correspondences.models import LetterRequest

    year = jalali_year(when)
    head = f'{prefix}/{year}/'
    with transaction.atomic():
        last = (
            LetterRequest.objects.filter(company=company, number__startswith=head)
            .order_by('-id').values_list('number', flat=True).first()
        )
        try:
            seq = int(str(last).rsplit('/', 1)[-1]) + 1 if last else 1
        except (TypeError, ValueError):
            seq = LetterRequest.objects.filter(
                company=company, number__startswith=head,
            ).count() + 1
    return f'{head}{seq:04d}'

