"""زیرساخت مشترک ویوست‌های مکاتبات.

شامل واردات مشترک، ثابت‌ها (وضعیت‌های نهایی/باز)، helperهای دسترسی و ارجاع و
``BaseLetterViewSet`` است. ماژول‌های دیگر بسته فقط از همین‌جا import می‌کنند تا
وابستگی‌ها یک‌طرفه بمانند.
"""
from rest_framework import viewsets, filters, parsers, serializers

from correspondences.permissions import DefinitionPermissionMixin


def _get_company(request):
    """شرکت/تننت فعال درخواست."""
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


def _company_scoped(queryset, request):
    """محدودکردن کوئری به شرکت جاری (چند‌مستاجری)."""
    company = _get_company(request)
    return queryset.filter(company=company) if company else queryset
from datetime import date as date_cls, timedelta  # noqa: E402

from django.db.models import Count, Q, Sum  # noqa: E402
from django.utils import timezone  # noqa: E402
from rest_framework.decorators import action  # noqa: E402
from rest_framework.response import Response  # noqa: E402

from correspondences.models import (  # noqa: E402
    CorrespondenceNameAlias, Correspondent, Letter, LetterAttachment, LetterCategory,
    LetterEvent, LetterReferral, LetterRequest, LetterRequestEvent, LetterRequestType,
    LetterSeries,
)
from correspondences.numbering import allocate_number, preview_number, request_number  # noqa: E402
from correspondences.numbering import preview_payload, sequence_start, sync_series_counter  # noqa: E402
from django.core.exceptions import PermissionDenied  # noqa: E402
from django.http import FileResponse, Http404  # noqa: E402
from rest_framework.permissions import AllowAny  # noqa: E402
from rest_framework_simplejwt.authentication import JWTAuthentication  # noqa: E402

from correspondences.downloads import issue_token, read_token  # noqa: E402
from correspondences.permissions import (  # noqa: E402
    READ_MENUS as perm_READ_MENUS,
    REQUESTS_MENUS,
    CorrespondencePermissionMixin,
    DefinitionPermissionMixin,
    can_download_attachment,
    can_read_confidential,
    confidential_letter_filter,
    has_permission as correspondence_has_permission,
    menus_for_direction,
    require as require_correspondence,
    referral_to_me_filter,
)
from correspondences.uploads import (  # noqa: E402
    content_type_of,
    is_inline_safe,
    stored_filename,
    validate_attachment,
)
from correspondences.serializers import (  # noqa: E402
    CorrespondenceNameAliasListSerializer, CorrespondenceNameAliasSerializer,
    CorrespondentSerializer, LetterAttachmentSerializer,
    LetterCategorySerializer, LetterEventSerializer, LetterListSerializer,
    LetterReferralSerializer,
    LetterRequestSerializer, LetterRequestTypeSerializer, LetterSeriesSerializer,
    LetterSerializer,
)
from rest_framework import status as http_status  # noqa: E402,F401

FINAL_STATUSES = ('closed', 'archived', 'canceled')
OPEN_REFERRAL_STATUSES = ('pending', 'in_progress')

try:  # تاریخ شمسی برای برچسب‌های گزارش
    from jdatetime import date as _jdate
except Exception:  # noqa: BLE001
    _jdate = None

JALALI_MONTHS = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]


def _truthy(value):
    return str(value).lower() in ('1', 'true', 'yes', 'on')


def _user_name(user):
    if not user:
        return ''
    return user.get_full_name() or user.get_username()


def _log_event(letter, action, user=None, note='', meta=None):
    return LetterEvent.objects.create(
        company=letter.company, letter=letter, action=action,
        actor=user if getattr(user, 'is_authenticated', False) else None,
        note=note or '', meta=meta or {},
    )


def _delete_media_file(name):
    """حذف فایل از رسانه (پس از حذف رکورد، برای جلوگیری از فایل‌های سرگردان)."""
    if not name:
        return
    from django.core.files.storage import default_storage

    try:
        if default_storage.exists(name):
            default_storage.delete(name)
    except Exception:                                  # noqa: BLE001 — حذف فایل نباید خطا بدهد
        pass


def _user_employee(user, company):
    """پرسنل متصل به کاربر جاری (از طریق UserProfile.employee_id)."""
    if not user or not getattr(user, 'is_authenticated', False) or not company:
        return None
    from employees.models import Employee

    profile = getattr(user, 'profile', None)
    employee_id = getattr(profile, 'employee_id', None)
    if not employee_id:
        return None
    return Employee.objects.filter(
        company=company, id=employee_id, is_active=True,
    ).select_related('department', 'job_title').first()


def _employee_of_user(user, company):
    """پرسنل متناظر با یک کاربر (برای ذخیرهٔ گیرندهٔ ارجاع)."""
    if not user:
        return None
    from employees.models import Employee

    profile = getattr(user, 'profile', None)
    employee_id = getattr(profile, 'employee_id', None)
    if employee_id:
        employee = Employee.objects.filter(
            company=company, id=employee_id, is_active=True,
        ).first()
        if employee:
            return employee
    full_name = (user.get_full_name() or '').strip()
    if not full_name:
        return None
    parts = full_name.split(' ', 1)
    first, last = parts[0], (parts[1] if len(parts) > 1 else '')
    qs = Employee.objects.filter(company=company, is_active=True, first_name=first)
    if last:
        qs = qs.filter(last_name=last)
    return qs.first()


def _my_name_variants(user, employee):
    """همهٔ شکل‌های نرمال‌شدهٔ نام کاربر/پرسنل (برای تطبیق ارجاع‌های متنی)."""
    from correspondences.matching import normalize_name

    variants = set()
    if employee:
        variants.add(normalize_name(getattr(employee, 'full_name', '')))
        variants.add(normalize_name(
            f"{getattr(employee, 'first_name', '')} {getattr(employee, 'last_name', '')}",
        ))
    full_name = ''
    if user is not None:
        try:
            full_name = user.get_full_name() or ''
        except Exception:                              # noqa: BLE001 — کاربر سفارشی
            full_name = ''
    if full_name:
        variants.add(normalize_name(full_name))
    if user is not None:
        variants.add(normalize_name(getattr(user, 'username', '')))
    return {value for value in variants if value}


def _raw_referral_names_for(company, normalized_names):
    """نام‌های خام ارجاع‌ها که نرمال‌شده‌شان با نام‌های من یکی است."""
    from correspondences.matching import normalize_name
    from correspondences.models import LetterReferral

    raw_names = LetterReferral.objects.filter(company=company).exclude(
        to_name='',
    ).values_list('to_name', flat=True).distinct()
    return [raw for raw in raw_names if normalize_name(raw) in normalized_names]


def _my_referral_filter(user, employee, company):
    """شرط «ارجاع‌های من»: کاربر، پرسنل، پرسنل‌های چندنفره و نام‌های متنی همنام."""
    target = Q(to_user=user)
    if employee:
        target = target | Q(to_employee=employee) | Q(to_employees=employee)
    names = _my_name_variants(user, employee)
    if names and company:
        raw_names = _raw_referral_names_for(company, names)
        if raw_names:
            target = target | Q(to_name__in=raw_names)
    return target


def _user_of_employee(employee):
    """کاربر سامانه‌ای که به این پرسنل وصل است (UserProfile.employee_id)."""
    if not employee:
        return None
    from core.models import UserProfile

    profile = UserProfile.objects.filter(employee_id=employee.id).select_related('user').first()
    return profile.user if profile and profile.user else None


def _create_referral(letter, request, parent=None):
    """ارجاع نامه از روی داده‌های درخواست. خروجی: (referral, error_response)."""
    data = request.data
    company = letter.company
    to_user_id = data.get('to_user') or None
    to_employee_id = data.get('to_employee') or None
    extra_employee_ids = data.get('to_employees') or []
    if isinstance(extra_employee_ids, str):
        extra_employee_ids = [item for item in extra_employee_ids.split(',') if item.strip()]
    extra_employee_ids = [
        int(item) for item in extra_employee_ids
        if str(item).strip().isdigit()
    ]
    to_name = (data.get('to_name') or '').strip()
    if not to_user_id and not to_employee_id and not to_name and not extra_employee_ids:
        return None, Response(
            {'detail': 'گیرندهٔ ارجاع (پرسنل، کاربر یا واحد) را مشخص کنید.'},
            status=http_status.HTTP_400_BAD_REQUEST,
        )
    to_user = None
    if to_user_id:
        from django.contrib.auth import get_user_model

        to_user = get_user_model().objects.filter(id=to_user_id).first()
        if not to_user:
            return None, Response({'detail': 'کاربر گیرنده یافت نشد.'},
                                  status=http_status.HTTP_400_BAD_REQUEST)
    to_employee = None
    if to_employee_id:
        from employees.models import Employee

        to_employee = Employee.objects.filter(
            company=company, id=to_employee_id, is_active=True,
        ).first()
        if not to_employee:
            return None, Response({'detail': 'پرسنل انتخاب‌شده یافت نشد.'},
                                  status=http_status.HTTP_400_BAD_REQUEST)
    if not to_employee and extra_employee_ids and not to_user_id and not to_name:
        # اگر فقط «نفرات دیگر» انتخاب شده باشند، اولین نفر گیرندهٔ اصلی می‌شود
        to_employee_id = extra_employee_ids[0]
        extra_employee_ids = extra_employee_ids[1:]
    if not to_employee and to_user:
        to_employee = _employee_of_user(to_user, company)
    if to_employee and not to_user:
        # اتصال به کاربر سامانه تا ارجاع در «کارتابل من» همان کاربر دیده شود.
        to_user = _user_of_employee(to_employee)
    purpose = data.get('purpose') or 'action'
    if purpose not in dict(LetterReferral.PURPOSES):
        purpose = 'action'
    due_date = data.get('due_date') or None
    if isinstance(due_date, str) and not due_date.strip():
        due_date = None
    instruction = (data.get('instruction') or '').strip()
    note = (data.get('note') or '').strip()
    last_seq = letter.referrals.order_by('-seq').values_list('seq', flat=True).first() or 0
    referral = LetterReferral.objects.create(
        company=company, letter=letter, seq=last_seq + 1, parent=parent,
        purpose=purpose, from_user=request.user,
        from_employee=_user_employee(request.user, company),
        to_user=to_user, to_employee=to_employee, to_name=to_name,
        referred_on=date_cls.today(), due_date=due_date or None,
        instruction=instruction, note=note, status='pending',
    )
    if letter.status in ('draft', 'registered'):
        letter.status = 'in_progress'
        letter.save(update_fields=['status', 'updated_at'])
    # گیرندگان دیگر (ارجاع هم‌زمان به چند نفر)
    if extra_employee_ids:
        from employees.models import Employee

        extra_ids = [
            emp_id for emp_id in dict.fromkeys(extra_employee_ids)
            if emp_id != (to_employee.id if to_employee else None)
        ]
        employees = Employee.objects.filter(company=company, id__in=extra_ids, is_active=True)
        referral.to_employees.set(employees)
    names = []
    primary_name = _user_name(to_user) or (to_employee.full_name if to_employee else '')
    if primary_name:
        names.append(primary_name)
    for first_name, last_name in referral.to_employees.values_list('first_name', 'last_name'):
        full_name = f'{first_name} {last_name}'.strip()
        if full_name and full_name not in names:
            names.append(full_name)
    target = '، '.join(names) or to_name
    _log_event(
        letter, 'referred', request.user,
        note=instruction or note,
        meta={'to': target, 'to_employee': to_employee_id or '',
              'purpose': purpose, 'due_date': str(due_date or ''),
              'instruction': instruction, 'note': note,
              'parent': parent.id if parent else ''},
    )
    return referral, None


class BaseLetterViewSet(viewsets.ModelViewSet):
    """پایهٔ ویوسِت‌های مکاتبات اداری (چند‌کاربری + دامنهٔ شرکت)."""

    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

    def get_queryset(self):
        qs = super().get_queryset().filter(is_active=True)
        company = _get_company(self.request)
        if company:
            qs = qs.filter(company=company)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=_get_company(self.request))


