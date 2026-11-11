"""پیوند کاربر سامانه به پروندهٔ پرسنلی (منابع انسانی).

پروندهٔ پرسنلی در اسکیمای هر شرکت ذخیره می‌شود ولی پروفایل کاربر در اسکیمای
public؛ به همین دلیل اتصال با شناسهٔ عددی (`UserProfile.employee_id`) نگه داشته
می‌شود و خواندن اطلاعات پرسنل با `schema_context` شرکتِ جاری انجام می‌شود.

هدف: آواتار کاربر (نوار کنار، فهرست کاربران و دیالوگ‌ها) بتواند عکس پرسنلی
و جنسیت واقعی فرد را نشان دهد؛ اگر کاربر به پرسنلی وصل نباشد، رابط کاربری بر
اساس جنسیت، آواتار آقا/خانم نمایش می‌دهد.
"""
try:  # pragma: no cover - در محیط غیر multi-tenant هم باید کار کند
    from django_tenants.utils import schema_context
except ImportError:  # pragma: no cover
    import contextlib

    @contextlib.contextmanager
    def schema_context(schema_name):
        yield


EMPTY_EMPLOYEE_PAYLOAD = {
    'employee_id': None,
    'employee_name': '',
    'employee_code': '',
    'employee_photo': None,
    'employee_gender': '',
    'employee_gender_display': '',
}


def company_of_profile(profile):
    """شرکتِ جاری کاربر و در غیر این صورت اولین شرکت او."""
    if profile is None:
        return None
    company = getattr(profile, 'current_company', None)
    if company is not None:
        return company
    try:
        return profile.companies.first()
    except Exception:  # noqa: BLE001 — بدون شرکت هم باید پاسخ معتبر داد
        return None


def _resolve_employee(employee_pk, company):
    from employees.models import Employee  # وارد کردن تنبل برای جلوگیری از چرخه

    schema_name = getattr(company, 'schema_name', None)
    if schema_name:
        # select_related تا FKها (عنوان شغلی/دپارتمان) داخل همان اسکیما لود شوند
        with schema_context(schema_name):
            return Employee.objects.select_related(
                'job_title', 'department',
            ).filter(id=employee_pk).first()
    return Employee.objects.select_related(
        'job_title', 'department',
    ).filter(id=employee_pk).first()


def employee_for_profile(profile):
    """پروندهٔ پرسنلی متصل به یک پروفایل کاربر (یا None)."""
    employee_pk = getattr(profile, 'employee_id', None)
    if not employee_pk:
        return None
    try:
        return _resolve_employee(employee_pk, company_of_profile(profile))
    except Exception:  # noqa: BLE001 — نبود جدول/اسکیما نباید فهرست کاربران را بشکند
        return None


def employee_exists(employee_pk, company):
    """آیا این شناسهٔ پرسنلی در شرکتِ کاربر وجود دارد؟"""
    if not employee_pk:
        return False
    try:
        return _resolve_employee(employee_pk, company) is not None
    except Exception:  # noqa: BLE001
        return False


def employee_link_payload(profile, request=None):
    """اطلاعات پرسنلِ متصل برای پاسخ‌های API (نام، کد، عکس و جنسیت)."""
    payload = dict(EMPTY_EMPLOYEE_PAYLOAD)
    payload['employee_id'] = getattr(profile, 'employee_id', None)
    employee = employee_for_profile(profile)
    if employee is None:
        return payload

    photo = None
    if getattr(employee, 'photo', None):
        try:
            photo = request.build_absolute_uri(employee.photo.url) if request else employee.photo.url
        except (ValueError, AttributeError):
            photo = None

    full_name = getattr(employee, 'full_name', '') or ' '.join(
        part for part in [employee.first_name, employee.last_name] if part
    ).strip()

    payload.update({
        'employee_id': employee.id,
        'employee_name': full_name,
        'employee_code': getattr(employee, 'employee_id', '') or '',
        'employee_photo': photo,
        'employee_gender': getattr(employee, 'gender', '') or '',
        'employee_gender_display': employee.get_gender_display() if employee.gender else '',
        'employee_position': _employee_position(employee),
        'employee_department': _employee_department(employee),
    })
    return payload


def employee_photo_map(user_ids, request=None):
    """نقشهٔ user_id → آدرس عکس پرسنلی (برای آواتار چت/کاربران).

    فقط دو کوئری برای کل فهرست (UserProfile + Employee) اجرا می‌شود؛ اگر کاربری
    به پروندهٔ پرسنلی وصل نباشد یا عکس نداشته باشد در نقشه نمی‌آید تا فرانت
    حرف اول نام را نشان دهد.
    """
    ids = []
    for value in user_ids or []:
        try:
            number = int(value)
        except (TypeError, ValueError):
            continue
        if number and number not in ids:
            ids.append(number)
    if not ids:
        return {}
    try:
        from core.models import UserProfile

        profiles = list(
            UserProfile.objects.filter(user_id__in=ids).only('user_id', 'employee_id')
        )
        employee_ids = [profile.employee_id for profile in profiles if profile.employee_id]
        if not employee_ids:
            return {}
        from employees.models import Employee

        photos = {}
        for employee in Employee.objects.filter(id__in=employee_ids).only('id', 'photo'):
            if not getattr(employee, 'photo', None):
                continue
            try:
                photos[employee.id] = (
                    request.build_absolute_uri(employee.photo.url) if request else employee.photo.url
                )
            except (ValueError, AttributeError):
                continue
        return {
            profile.user_id: photos[profile.employee_id]
            for profile in profiles
            if photos.get(profile.employee_id)
        }
    except Exception:  # noqa: BLE001 — نبود جدول/اسکیما نباید فهرست را بشکند
        return {}


def _employee_position(employee):
    """عنوان شغلی پرسنل (برای نمایش به‌عنوان نقش سازمانی)."""
    job_title = getattr(employee, 'job_title', None)
    if job_title is not None and not isinstance(job_title, str):
        return getattr(job_title, 'title', '') or getattr(job_title, 'name', '') or ''
    if isinstance(job_title, str) and job_title:
        return job_title
    return getattr(employee, 'position', '') or getattr(employee, 'title', '') or ''


def _employee_department(employee):
    """دپارتمان/واحد سازمانی پرسنل."""
    department = getattr(employee, 'department', None)
    if department is not None:
        return getattr(department, 'name', '') or ''
    return ''
