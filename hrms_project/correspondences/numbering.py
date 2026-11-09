"""شماره‌گذاری خودکار نامه‌ها (گروه شماره‌گذاری + جهت + سال شمسی).

قالب شماره از بخش‌ها ساخته می‌شود؛ توکن‌ها:

    {prefix}  پیشوند گروه (مثل «ص م» یا «دانشگاه»)
    {seq}     شمارهٔ سری با صفر پیشرو (بر اساس padding)
    {year}    سال شمسی کامل (1405)
    {yy}      دو رقم آخر سال شمسی (05)
    {month}   ماه شمسی دو رقمی
    {day}     روز ماه شمسی دو رقمی

نمونه‌ها:
    >>> render_number('{prefix}/{year}/{seq}', prefix='ص م', year=1405, seq=7, padding=3)
    'ص م/1405/007'
    >>> render_number('{seq}', year=1405, seq=12, padding=4)
    '0012'
    >>> render_number('{prefix}-{yy}-{seq}', prefix='دانشگاه', year=1405, seq=3, padding=2)
    'دانشگاه-05-03'

شمارش از ``start_number`` شروع می‌شود و در صورت ``reset_yearly`` با تغییر سال
شمسی به همان ``start_number`` برمی‌گردد. ``end_number`` سقف اختیاری است و فقط
هشدار می‌دهد (شماره‌گذاری متوقف نمی‌شود).
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

TOKENS = ('prefix', 'seq', 'year', 'yy', 'month', 'day')

_SEPARATORS = ('/', '-', '.')
_DEFAULT_START = 1


class NumberingError(ValueError):
    """خطای اعتبارسنجی الگو یا شماره‌گذاری."""


def jalali_parts(value=None):
    """(سال، ماه، روز) شمسی یک تاریخ؛ پیش‌فرض: امروز."""
    value = value or date.today()
    if jdate is None:
        return (getattr(value, 'year', None), getattr(value, 'month', None),
                getattr(value, 'day', None))
    try:
        converted = jdate.fromgregorian(date=value)
        return converted.year, converted.month, converted.day
    except Exception:  # noqa: BLE001
        return (getattr(value, 'year', None), getattr(value, 'month', None),
                getattr(value, 'day', None))


def jalali_year(value=None):
    """سال شمسی یک تاریخ (پیش‌فرض: امروز)."""
    return jalali_parts(value)[0]


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


def template_tokens(template):
    """توکن‌های استفاده‌شده در قالب (برای اعتبارسنجی و راهنمای UI)."""
    return [token for token in re.findall(r'\{(\w+)\}', template or '') if token in TOKENS]


def validate_template(template):
    """قالب باید حداقل {seq} داشته باشد و توکن ناشناخته نداشته باشد."""
    text = (template or '').strip()
    if not text:
        raise NumberingError('قالب شماره خالی است.')
    unknown = [token for token in re.findall(r'\{(\w+)\}', text) if token not in TOKENS]
    if unknown:
        raise NumberingError(f'توکن ناشناخته در قالب: {", ".join(unknown)}')
    if 'seq' not in template_tokens(text):
        raise NumberingError('قالب شماره باید شامل {seq} باشد.')
    return text


def render_number(template, *, prefix='', year=None, seq=1, padding=3, month=None, day=None):
    """ساخت شماره از قالب؛ بخش‌های خالی به‌صورت خودکار حذف می‌شوند."""
    template = (template or '').strip() or DEFAULT_TEMPLATES['outgoing']
    jy, jm, jd = jalali_parts()
    year = year or jy
    month = month or jm or 1
    day = day or jd or 1
    try:
        seq_int = int(seq)
    except (TypeError, ValueError):
        seq_int = 1
    padding = max(0, min(int(padding or 0), 10))
    number = (
        template
        .replace('{prefix}', str(prefix or '').strip())
        .replace('{seq}', str(seq_int).zfill(padding))
        .replace('{year}', str(year))
        .replace('{yy}', str(year)[-2:])
        .replace('{month}', str(int(month)).zfill(2))
        .replace('{day}', str(int(day)).zfill(2))
    )
    return _clean_separators(number)


def sequence_start(series):
    """شماره شروع معتبر یک گروه (حداقل ۱)."""
    try:
        return max(_DEFAULT_START, int(getattr(series, 'start_number', _DEFAULT_START) or _DEFAULT_START))
    except (TypeError, ValueError):
        return _DEFAULT_START


def current_sequence(series, letter_date=None):
    """شماره‌ای که در نوبت بعدی استفاده می‌شود (با احترام به شمارش سالانه)."""
    start = sequence_start(series)
    try:
        next_seq = max(start, int(getattr(series, 'next_number', start) or start))
    except (TypeError, ValueError):
        next_seq = start
    year = jalali_year(letter_date)
    if getattr(series, 'reset_yearly', False) and series.last_year and series.last_year != year:
        return start
    return next_seq


def preview_number(series, letter_date=None, seq=None):
    """شمارهٔ بعدی یک گروه بدون مصرف شمارنده (برای پیشنهاد در فرم)."""
    if series is None:
        return ''
    year = jalali_year(letter_date)
    next_seq = current_sequence(series, letter_date) if seq is None else seq
    return render_number(
        getattr(series, 'template', '') or DEFAULT_TEMPLATES.get(series.direction, ''),
        prefix=series.prefix, year=year, seq=next_seq, padding=series.padding,
    )


def preview_payload(series, letter_date=None):
    """پیشنهاد کامل برای UI: شماره، شمارهٔ سری، شروع/بعدی و هشدار سقف."""
    if series is None:
        return {'number': '', 'seq': None, 'start_number': None, 'next_number': None,
                'end_number': None, 'exhausted': False}
    seq = current_sequence(series, letter_date)
    end_number = getattr(series, 'end_number', None)
    return {
        'number': preview_number(series, letter_date, seq),
        'seq': seq,
        'start_number': sequence_start(series),
        'next_number': seq,
        'end_number': end_number,
        'exhausted': bool(end_number and seq > int(end_number)),
    }


def allocate_number(series, letter_date=None):
    """مصرف اتمیک شمارندهٔ گروه و برگرداندن شمارهٔ نهایی."""
    from django.db import transaction

    if series is None:
        return ''
    year = jalali_year(letter_date)
    with transaction.atomic():
        model = type(series)
        current = model.objects.select_for_update().get(pk=series.pk)
        next_seq = current_sequence(current, letter_date)
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


def _sequence_regex(template):
    """ساخت regex از قالب برای استخراج شمارهٔ سری از یک شمارهٔ ثبت‌شده."""
    pattern = ''
    for part in re.split(r'(\{\w+\})', template or ''):
        if not part:
            continue
        if part == '{seq}':
            pattern += r'(?P<seq>\d+)'
        elif re.fullmatch(r'\{\w+\}', part):
            pattern += r'[^/\-\.\s]+'
        else:
            pattern += re.escape(part)
    return re.compile(f'^{pattern}$')


def extract_sequence(number, template=''):
    """شمارهٔ سری موجود در یک شماره (مثلاً «ص م/1405/012» → 12).

    اگر شماره با قالب گروه تطبیق نداشته باشد، آخرین گروه رقمی برگردانده می‌شود.
    """
    text = str(number or '').strip()
    if not text:
        return None
    if template:
        try:
            match = _sequence_regex(template).match(text)
        except re.error:
            match = None
        if match:
            try:
                return int(match.group('seq'))
            except (TypeError, ValueError):
                return None
    groups = re.findall(r'\d+', text)
    return int(groups[-1]) if groups else None


def sync_series_counter(series, number, letter_date=None):
    """هم‌گام‌سازی شمارنده با شمارهٔ دستی: اگر کاربر جلوتر شماره داده، بپر جلو."""
    if series is None:
        return series
    seq = extract_sequence(number, getattr(series, 'template', ''))
    if seq is None:
        return series
    next_seq = int(getattr(series, 'next_number', 1) or 1)
    if seq >= next_seq:
        series.next_number = seq + 1
        series.last_year = jalali_year(letter_date) or series.last_year
        series.save(update_fields=['next_number', 'last_year', 'updated_at'])
    return series


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

