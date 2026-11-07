"""Views for the Correspondences module."""
from rest_framework import viewsets, filters, parsers
from correspondences.models import IncomingLetter, OutgoingLetter, Announcement, Form, Organization, OrganizationalLetter
from correspondences.serializers import (
    IncomingLetterSerializer, OutgoingLetterSerializer,
    AnnouncementSerializer, FormSerializer,
    OrganizationSerializer, OrganizationalLetterSerializer,
)


def _get_company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class BaseCorrespondenceViewSet(viewsets.ModelViewSet):
    """Base ViewSet with multi-tenant filtering."""
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    ordering = ['-date']
    search_fields = ['number', 'subject', 'sender']

    def get_queryset(self):
        qs = super().get_queryset()
        company = _get_company(self.request)
        if company:
            qs = qs.filter(company=company)
        return qs

    def _set_employees_and_archive(self, instance, data):
        """
        Save related persons (M2M) AND mirror letters into the company
        archive (OrganizationDocument) so the letter appears both on each
        employee's profile and in "بایگانی اسناد سازمان".
        """
        from employees.models import Employee
        from documents.models import OrganizationDocument

        company = instance.company
        ids = []
        raw = data.get('employees') if isinstance(data, dict) else None
        if raw is None:
            raw = data.get('employees')
        if raw:
            if isinstance(raw, str):
                raw = [x.strip() for x in raw.split(',') if x.strip()]
            ids = [int(x) for x in raw if str(x).isdigit()]

        employees = list(Employee.objects.filter(company=company, id__in=ids))
        instance.employees.set(ids)

        subject = getattr(instance, 'subject', None) or getattr(instance, 'title', None) or ''
        number = getattr(instance, 'number', '')
        letter_date = getattr(instance, 'date', None)
        description = getattr(instance, 'description', '') or ''

        for emp in employees:
            OrganizationDocument.objects.create(
                company=company,
                employee=emp,
                title=f"نامه: {subject} ({number})",
                category=OrganizationDocument.ArchiveCategory.HR_DOC,
                reference_number=number,
                issue_date=letter_date,
                file=instance.file if getattr(instance, 'file', None) else None,
                description=description,
                tags='مکاتبات',
            )

    def perform_create(self, serializer):
        company = _get_company(self.request)
        data = self.request.data
        instance = serializer.save(company=company)
        # For incoming/outgoing letters -> mirror into archive + employee profile
        if hasattr(instance, 'employees'):
            self._set_employees_and_archive(instance, data)
        return instance

    def perform_update(self, serializer):
        instance = serializer.save()
        data = self.request.data
        if 'employees' in data and hasattr(instance, 'employees'):
            self._set_employees_and_archive(instance, data)
        return instance

class IncomingLetterViewSet(BaseCorrespondenceViewSet):
    serializer_class = IncomingLetterSerializer
    queryset = IncomingLetter.objects.all()
    search_fields = ['number', 'subject', 'sender']


class OutgoingLetterViewSet(BaseCorrespondenceViewSet):
    serializer_class = OutgoingLetterSerializer
    queryset = OutgoingLetter.objects.all()
    search_fields = ['number', 'subject', 'receiver']


class AnnouncementViewSet(BaseCorrespondenceViewSet):
    serializer_class = AnnouncementSerializer
    queryset = Announcement.objects.all()
    search_fields = ['number', 'title']


class FormViewSet(BaseCorrespondenceViewSet):
    serializer_class = FormSerializer
    queryset = Form.objects.all()
    search_fields = ['name', 'code', 'category']
    ordering = ['name']


class OrganizationViewSet(BaseCorrespondenceViewSet):
    serializer_class = OrganizationSerializer
    queryset = Organization.objects.all()
    search_fields = ['name', 'code', 'type']
    ordering = ['name']


class OrganizationalLetterViewSet(BaseCorrespondenceViewSet):
    serializer_class = OrganizationalLetterSerializer
    queryset = OrganizationalLetter.objects.all()
    search_fields = ['number', 'subject']
    ordering = ['-date']


# ---------------------------------------------------------------------------
# مکاتبات اداری حرفه‌ای — دفتر وارده/صادره، ارجاع، پیوست و تاریخچه
# ---------------------------------------------------------------------------
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
from correspondences.serializers import (  # noqa: E402
    CorrespondenceNameAliasSerializer, CorrespondentSerializer, LetterAttachmentSerializer,
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


class LetterCategoryViewSet(BaseLetterViewSet):
    serializer_class = LetterCategorySerializer
    queryset = LetterCategory.objects.all()
    search_fields = ['name', 'code', 'description']
    ordering = ['order', 'name']

    def get_queryset(self):
        qs = super().get_queryset().annotate(letter_count=Count('letters'))
        direction = self.request.query_params.get('direction')
        if direction:
            qs = qs.filter(Q(direction=direction) | Q(direction='both'))
        return qs


class LetterSeriesViewSet(BaseLetterViewSet):
    serializer_class = LetterSeriesSerializer
    queryset = LetterSeries.objects.all()
    search_fields = ['title', 'prefix']
    ordering = ['-is_default', 'title']

    @action(detail=True, methods=['get'], url_path='preview')
    def preview(self, request, pk=None):
        series = self.get_object()
        letter_date = request.query_params.get('letter_date')
        parsed = None
        if letter_date:
            try:
                parsed = date_cls.fromisoformat(letter_date[:10])
            except ValueError:
                parsed = None
        return Response({'number': preview_number(series, parsed)})


class CorrespondentViewSet(BaseLetterViewSet):
    serializer_class = CorrespondentSerializer
    queryset = Correspondent.objects.all()
    search_fields = ['name', 'title', 'code', 'national_id', 'phone', 'mobile', 'email',
                     'organization__name']
    ordering = ['name']

    def get_queryset(self):
        qs = super().get_queryset().select_related('organization').annotate(
            letter_count=Count('letters'),
        )
        kind = self.request.query_params.get('kind')
        if kind:
            qs = qs.filter(kind=kind)
        organization = self.request.query_params.get('organization')
        if organization:
            qs = qs.filter(organization_id=organization)
        return qs


class LetterViewSet(BaseLetterViewSet):
    """دفتر نامه‌های اداری: جستجو/فیلتر، ثبت شماره، ارجاع، پاسخ، بایگانی و آمار."""

    serializer_class = LetterSerializer
    queryset = Letter.objects.all()
    # جست‌وجوی جامع دستی انجام می‌شود تا نام ارجاع‌شدگان، طرف حساب، پیوست‌ها و
    # متن نامه هم پوشش داده شوند.
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['letter_date', 'created_at', 'due_date', 'priority', 'status', 'number']
    ordering = ['-letter_date', '-id']

    SEARCH_FIELDS = (
        'number', 'external_number', 'indicator_no', 'transmittal_no', 'subject', 'summary',
        'body', 'sender_name', 'sender_title', 'receiver_name', 'drafter_name',
        'contract_number', 'company_reg_no', 'unit_reg_no', 'unit_name', 'delivered_by_name',
        'tags', 'source_ref', 'archive_ref', 'entered_by_name',
        'organization__name', 'correspondent__name', 'sender_organization__name',
        'sender_party__name', 'party_account__name',
        'sender_employee__first_name', 'sender_employee__last_name',
        'receiver_employee__first_name', 'receiver_employee__last_name',
        'delivered_by__first_name', 'delivered_by__last_name',
        'drafter__first_name', 'drafter__last_name',
        'entered_by__first_name', 'entered_by__last_name',
    )
    SEARCH_JOIN_FIELDS = (
        'referrals__to_name', 'referrals__instruction', 'referrals__note',
        'referrals__result', 'referrals__response', 'referrals__margin_note',
        'referrals__to_user__first_name', 'referrals__to_user__last_name',
        'referrals__to_user__username',
        'referrals__to_employee__first_name', 'referrals__to_employee__last_name',
        'referrals__to_employees__first_name', 'referrals__to_employees__last_name',
        'attachments__title',
    )

    def get_serializer_class(self):
        if self.action == 'list':
            return LetterListSerializer
        return LetterSerializer

    def _apply_search(self, qs, term):
        """جست‌وجوی همه‌جانبه در شماره، موضوع، متن، طرف حساب و ارجاعات.

        برای سرعت، ارجاعات و پیوست‌ها با زیرکوئری (``IN``) جست‌وجو می‌شوند نه با
        join؛ این کار از تکثیر ردیف‌ها و ``DISTINCT`` سنگین جلوگیری می‌کند.
        """
        term = str(term or '').strip()
        if not term:
            return qs
        condition = Q()
        for field in self.SEARCH_FIELDS:
            condition |= Q(**{f'{field}__icontains': term})

        referral_condition = Q()
        attachment_condition = Q()
        for field in self.SEARCH_JOIN_FIELDS:
            if field.startswith('attachments__'):
                attachment_condition |= Q(
                    **{f'{field.replace("attachments__", "", 1)}__icontains': term},
                )
            else:
                referral_condition |= Q(
                    **{f'{field.replace("referrals__", "", 1)}__icontains': term},
                )

        referral_ids = LetterReferral.objects.filter(
            referral_condition,
        ).values('letter_id') if referral_condition else LetterReferral.objects.none().values('letter_id')
        attachment_ids = LetterAttachment.objects.filter(
            attachment_condition,
        ).values('letter_id') if attachment_condition else LetterAttachment.objects.none().values('letter_id')

        return qs.filter(
            condition | Q(id__in=referral_ids) | Q(id__in=attachment_ids),
        )

    def get_queryset(self):
        params = self.request.query_params
        heavy = self.action != 'list'
        # فقط کلیدهای خارجیِ لازم برای هر حالت join می‌شوند؛ joinهای سنگین
        # (پرسنل/کاربر/پاسخ) در فهرست حذف می‌شوند تا جست‌وجوی ۲۰ ردیف سریع بماند.
        related = [
            'organization', 'sender_organization', 'correspondent', 'category', 'series',
            'sender_party', 'party_account', 'entered_by',
        ]
        if heavy:
            related += ['drafter', 'created_by', 'reply_to',
                        'sender_employee', 'receiver_employee', 'delivered_by']
        qs = super().get_queryset().select_related(*related)

        if heavy:
            qs = qs.prefetch_related(
                'attachments', 'referrals', 'referrals__to_user', 'referrals__to_employee',
                'referrals__to_employees', 'events', 'replies',
            )
        else:
            from django.db.models import Prefetch

            qs = qs.prefetch_related(
                Prefetch(
                    'attachments',
                    queryset=LetterAttachment.objects.only(
                        'id', 'letter_id', 'title', 'kind', 'file', 'size',
                    ),
                ),
                Prefetch(
                    'referrals',
                    queryset=LetterReferral.objects.select_related('to_user', 'to_employee'),
                ),
            )

        params = self.request.query_params
        qs = self._apply_view_filters(qs, params)
        return self._apply_search(qs, params.get('search') or params.get('q'))

    def _apply_view_filters(self, qs, params):
        user = getattr(self.request, 'user', None)
        needs_distinct = False

        direction = params.get('direction')
        if direction:
            qs = qs.filter(direction=direction)

        for field in ('category', 'series', 'priority', 'confidentiality', 'organization',
                      'correspondent', 'sender_organization', 'delivery_type',
                      'sender_employee', 'receiver_employee', 'sender_party', 'party_account'):
            value = params.get(field)
            if value:
                qs = qs.filter(**{f'{field}_id': value})

        entry_method = params.get('entry_method')
        if entry_method:
            qs = qs.filter(entry_method=entry_method)

        # همهٔ نامه‌های یک طرف حساب (طرف حساب نامه یا ارسال‌کننده) — برای پروندهٔ قرارداد
        party_id = params.get('party')
        if party_id:
            qs = qs.filter(
                Q(party_account_id=party_id) | Q(sender_party_id=party_id),
            )

        status_param = params.get('status')
        if status_param:
            values = [item for item in status_param.split(',') if item]
            if values:
                qs = qs.filter(status__in=values)

        archived = params.get('archived')
        if archived is not None and archived != '':
            if _truthy(archived):
                qs = qs.filter(status='archived')
            else:
                qs = qs.exclude(status='archived')

        if _truthy(params.get('overdue')):
            qs = qs.filter(due_date__lt=date_cls.today()).exclude(status__in=FINAL_STATUSES)

        date_from = params.get('date_from')
        date_to = params.get('date_to')
        if date_from:
            qs = qs.filter(letter_date__gte=date_from)
        if date_to:
            qs = qs.filter(letter_date__lte=date_to)

        if _truthy(params.get('has_attachments')):
            qs = qs.filter(id__in=LetterAttachment.objects.values('letter_id'))
        elif str(params.get('has_attachments', '')).lower() in ('0', 'false', 'no', 'off'):
            qs = qs.exclude(id__in=LetterAttachment.objects.values('letter_id'))

        scope = params.get('scope')
        if scope == 'mine' and user and user.is_authenticated:
            qs = qs.filter(Q(created_by=user) | Q(drafter=user) | Q(referrals__to_user=user))
            needs_distinct = True
        elif scope == 'referred' and user and user.is_authenticated:
            qs = qs.filter(
                referrals__to_user=user, referrals__status__in=OPEN_REFERRAL_STATUSES,
            )
            needs_distinct = True

        return qs.distinct() if needs_distinct else qs

    # ------------------------------------------------------------------ ساخت
    def _payload_register_flag(self):
        data = self.request.data
        try:
            return _truthy(data.get('register'))
        except AttributeError:
            return False

    def _default_series(self, direction, company):
        return LetterSeries.objects.filter(
            company=company, direction=direction, is_default=True, is_active=True,
        ).first() or LetterSeries.objects.filter(
            company=company, direction=direction, is_active=True,
        ).order_by('id').first()

    def _resolve_series(self, direction, company, series_id=None):
        if series_id:
            series = LetterSeries.objects.filter(
                company=company, id=series_id, is_active=True,
            ).first()
            if series:
                return series
        return self._default_series(direction, company)

    def perform_create(self, serializer):
        company = _get_company(self.request)
        user = getattr(self.request, 'user', None)
        letter = serializer.save(
            company=company,
            created_by=user if getattr(user, 'is_authenticated', False) else None,
            drafter=serializer.validated_data.get('drafter')
            or (user if getattr(user, 'is_authenticated', False) else None),
        )
        if self._payload_register_flag() or (self.request.data.get('number') and not letter.number):
            self._assign_number(letter, user)
        _log_event(letter, 'created', user, note=f'ثبت نامه: {letter.subject}')
        if letter.number:
            _log_event(letter, 'registered', user, note=f'شماره نامه: {letter.number}')

    def _assign_number(self, letter, user=None, series_id=None):
        """تخصیص شماره از سری (در صورت خالی بودن شماره)."""
        company = letter.company
        series = self._resolve_series(letter.direction, company, series_id or letter.series_id)
        if series:
            letter.series = series
            if not letter.number:
                letter.number = allocate_number(series, letter.letter_date)
        if letter.status == 'draft':
            letter.status = 'registered'
        if letter.direction == 'incoming' and not letter.received_date:
            letter.received_date = date_cls.today()
        if letter.direction == 'outgoing' and not letter.sent_date:
            letter.sent_date = date_cls.today()
        letter.save()
        return letter

    # ------------------------------------------------------------------ اقدامات
    @action(detail=True, methods=['post'])
    def register(self, request, pk=None):
        """ثبت شمارهٔ نامه از سری پیش‌فرض/انتخابی و تغییر وضعیت به «ثبت‌شده»."""
        letter = self.get_object()
        if letter.status == 'archived':
            return Response({'detail': 'نامهٔ بایگانی‌شده قابل ثبت شماره نیست.'},
                            status=http_status.HTTP_400_BAD_REQUEST)
        series_id = request.data.get('series') or None
        before = letter.number
        self._assign_number(letter, request.user, series_id)
        if not letter.number:
            return Response({'detail': 'سری شماره‌گذاری یافت نشد؛ ابتدا سری تعریف کنید.'},
                            status=http_status.HTTP_400_BAD_REQUEST)
        _log_event(letter, 'registered', request.user,
                   note=f'شماره نامه: {letter.number}',
                   meta={'previous_number': before, 'number': letter.number})
        return Response(self.get_serializer(letter).data)

    @action(detail=True, methods=['post'])
    def refer(self, request, pk=None):
        """ارجاع نامه به کاربر/پرسنل/واحد همراه با دستور، مهلت اقدام و نوع ارجاع."""
        letter = self.get_object()
        referral, error = _create_referral(letter, request)
        if error:
            return error
        return Response({
            'letter': self.get_serializer(letter).data,
            'referral': LetterReferralSerializer(referral, context={'request': request}).data,
        }, status=http_status.HTTP_201_CREATED)


    @action(detail=True, methods=['post'])
    def reply(self, request, pk=None):
        """ایجاد نامهٔ پاسخ (پیش‌نویس) و اتصال آن به نامهٔ فعلی."""
        letter = self.get_object()
        user = request.user
        direction = request.data.get('direction') or (
            'outgoing' if letter.direction == 'incoming' else 'incoming'
        )
        payload = {
            'direction': direction,
            'subject': request.data.get('subject') or f'رد: {letter.subject}',
            'letter_date': request.data.get('letter_date') or date_cls.today().isoformat(),
            'organization': request.data.get('organization') or letter.organization_id,
            'correspondent': request.data.get('correspondent') or letter.correspondent_id,
            'priority': request.data.get('priority') or letter.priority,
            'confidentiality': request.data.get('confidentiality') or letter.confidentiality,
            'summary': request.data.get('summary') or '',
            'body': request.data.get('body') or '',
            'contract_number': letter.contract_number,
            'indicator_no': request.data.get('indicator_no') or '',
            'transmittal_no': request.data.get('transmittal_no') or '',
            'reply_to': letter.id,
            'status': 'draft',
        }
        if direction == 'outgoing':
            payload['receiver_name'] = request.data.get('receiver_name') or letter.sender_name
        else:
            payload['sender_name'] = request.data.get('sender_name') or letter.receiver_name
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        reply = serializer.instance
        letter.status = 'answered'
        letter.save(update_fields=['status', 'updated_at'])
        _log_event(letter, 'replied', user,
                   note=f'پاسخ: {reply.number or "پیش‌نویس"}', meta={'reply_id': reply.id})
        return Response(self.get_serializer(reply).data, status=http_status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        letter = self.get_object()
        letter.status = 'archived'
        letter.archived_at = timezone.now()
        if request.data.get('archive_ref'):
            letter.archive_ref = request.data.get('archive_ref')
        letter.save(update_fields=['status', 'archived_at', 'archive_ref', 'updated_at'])
        _log_event(letter, 'archived', request.user,
                   note=request.data.get('note') or 'بایگانی نامه')
        return Response(self.get_serializer(letter).data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        letter = self.get_object()
        letter.status = 'closed'
        letter.closed_at = timezone.now()
        letter.save(update_fields=['status', 'closed_at', 'updated_at'])
        _log_event(letter, 'closed', request.user,
                   note=request.data.get('note') or 'بستن پروندهٔ نامه')
        return Response(self.get_serializer(letter).data)

    @action(detail=True, methods=['get', 'post'])
    def attachments(self, request, pk=None):
        """فهرست یا بارگذاری پیوست‌های نامه."""
        letter = self.get_object()
        if request.method.lower() == 'get':
            serializer = LetterAttachmentSerializer(
                letter.attachments.all(), many=True, context={'request': request},
            )
            return Response(serializer.data)
        upload = request.FILES.get('file')
        if not upload:
            return Response({'detail': 'فایل پیوست ارسال نشده است.'},
                            status=http_status.HTTP_400_BAD_REQUEST)
        attachment = LetterAttachment.objects.create(
            company=letter.company, letter=letter,
            title=request.data.get('title') or getattr(upload, 'name', ''),
            kind=request.data.get('kind') or 'attachment',
            file=upload, size=getattr(upload, 'size', 0),
            uploaded_by=request.user,
        )
        _log_event(letter, 'attached', request.user, note=attachment.title,
                   meta={'attachment_id': attachment.id})
        return Response(
            LetterAttachmentSerializer(attachment, context={'request': request}).data,
            status=http_status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    def comment(self, request, pk=None):
        letter = self.get_object()
        note = (request.data.get('note') or '').strip()
        if not note:
            return Response({'detail': 'متن یادداشت خالی است.'},
                            status=http_status.HTTP_400_BAD_REQUEST)
        _log_event(letter, 'commented', request.user, note=note)
        return Response(self.get_serializer(letter).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """آمار داشبورد: شمارش جهت‌ها/وضعیت‌ها، معوقات، ارجاعات من و روند ماهانه."""
        from django.db.models.functions import TruncMonth

        qs = self.get_queryset()
        today = date_cls.today()
        company = _get_company(request)
        user = getattr(request, 'user', None)

        # یک کوئری به‌جای سه کوئری برای تفکیک جهت/وضعیت/اولویت
        by_direction, by_status, by_priority = {}, {}, {}
        for row in qs.values('direction', 'status', 'priority').annotate(c=Count('id')).order_by():
            count = row['c']
            by_direction[row['direction']] = by_direction.get(row['direction'], 0) + count
            by_status[row['status']] = by_status.get(row['status'], 0) + count
            by_priority[row['priority']] = by_priority.get(row['priority'], 0) + count

        month_start = today.replace(day=1)

        my_referrals = LetterReferral.objects.none()
        if company and user and user.is_authenticated:
            my_referrals = LetterReferral.objects.filter(
                company=company, to_user=user, letter__is_active=True,
            ).exclude(status__in=('done', 'canceled', 'returned'))

        six_months_ago = today - timedelta(days=185)
        trend_rows = (
            qs.filter(letter_date__gte=six_months_ago)
            .annotate(bucket=TruncMonth('letter_date'))
            .values('bucket', 'direction')
            .annotate(c=Count('id'))
            .order_by('bucket')
        )
        trend_map = {}
        for row in trend_rows:
            bucket = row['bucket']
            if bucket:
                day = bucket.date() if hasattr(bucket, 'date') else bucket
                if _jdate is not None:
                    jalali = _jdate.fromgregorian(date=day)
                    key = f'{jalali.year:04d}-{jalali.month:02d}'
                    label = f'{JALALI_MONTHS[jalali.month - 1]} {jalali.year}'
                else:
                    key = day.strftime('%Y-%m')
                    label = key
            else:
                key, label = '—', '—'
            entry = trend_map.setdefault(
                key, {'incoming': 0, 'outgoing': 0, 'internal': 0, 'label': label},
            )
            entry[row['direction']] = row['c']
        trend = [
            {
                'period': key,
                'label': trend_map[key].get('label', key),
                'incoming': trend_map[key].get('incoming', 0),
                'outgoing': trend_map[key].get('outgoing', 0),
                'internal': trend_map[key].get('internal', 0),
            }
            for key in sorted(trend_map)
        ]

        top_organizations = list(
            qs.exclude(organization__isnull=True)
            .values('organization__name')
            .annotate(c=Count('id'))
            .order_by('-c')[:5]
        )

        # --- آمار کاربردی داشبورد (شمارش‌ها در کمترین تعداد کوئری) ----------
        totals_agg = qs.aggregate(
            all_count=Count('id'),
            open_count=Count('id', filter=~Q(status__in=FINAL_STATUSES)),
            overdue_count=Count(
                'id', filter=Q(due_date__lt=today) & ~Q(status__in=FINAL_STATUSES),
            ),
            due_soon_count=Count(
                'id',
                filter=Q(due_date__gte=today, due_date__lte=today + timedelta(days=7))
                & ~Q(status__in=FINAL_STATUSES),
            ),
            incoming_month=Count('id', filter=Q(direction='incoming', letter_date__gte=month_start)),
            outgoing_month=Count('id', filter=Q(direction='outgoing', letter_date__gte=month_start)),
        )
        attachment_agg = qs.aggregate(
            with_attachments=Count('id', filter=Q(attachments__isnull=False), distinct=True),
            incoming_with=Count(
                'id', filter=Q(direction='incoming', attachments__isnull=False), distinct=True,
            ),
        )
        without_attachments = max(
            0, by_direction.get('incoming', 0) - attachment_agg['incoming_with'],
        )
        by_category = list(
            qs.exclude(category__isnull=True)
            .values('category_id', 'category__name')
            .annotate(c=Count('id'))
            .order_by('-c')[:5]
        )
        referral_counts = {}
        referral_overdue = 0
        if company:
            referral_qs = LetterReferral.objects.filter(
                company=company, letter__is_active=True,
            )
            for row in referral_qs.values('status').annotate(c=Count('id')).order_by():
                referral_counts[row['status']] = row['c']
            referral_overdue = referral_qs.filter(
                due_date__lt=today,
            ).exclude(status__in=('done', 'canceled', 'returned')).count()

        my_referrals_total = 0
        my_referrals_overdue = 0
        if company and user and user.is_authenticated:
            my_agg = my_referrals.aggregate(
                total=Count('id'),
                overdue=Count('id', filter=Q(due_date__lt=today)),
            )
            my_referrals_total = my_agg['total'] or 0
            my_referrals_overdue = my_agg['overdue'] or 0

        return Response({
            'totals': {
                'all': totals_agg['all_count'] or 0,
                'incoming': by_direction.get('incoming', 0),
                'outgoing': by_direction.get('outgoing', 0),
                'internal': by_direction.get('internal', 0),
                'open': totals_agg['open_count'] or 0,
                'overdue': totals_agg['overdue_count'] or 0,
                'due_soon': totals_agg['due_soon_count'] or 0,
                'drafts': by_status.get('draft', 0),
                'archived': by_status.get('archived', 0),
                'incoming_this_month': totals_agg['incoming_month'] or 0,
                'outgoing_this_month': totals_agg['outgoing_month'] or 0,
                'urgent': by_priority.get('urgent', 0) + by_priority.get('high', 0),
                'with_attachments': attachment_agg['with_attachments'] or 0,
                'without_attachments': without_attachments,
                'my_referrals': my_referrals_total,
                'my_overdue_referrals': my_referrals_overdue,
            },
            'by_status': by_status,
            'by_direction': by_direction,
            'by_priority': by_priority,
            'by_category': by_category,
            'referrals': {
                'by_status': referral_counts,
                'overdue': referral_overdue,
                'open': sum(
                    count for status, count in referral_counts.items()
                    if status not in ('done', 'canceled', 'returned')
                ),
            },
            'trend': trend,
            'top_organizations': top_organizations,
            'recent': {
                'incoming': list(
                    qs.filter(direction='incoming').values(
                        'id', 'number', 'subject', 'letter_date', 'status', 'priority',
                        'organization__name',
                    )[:6]
                ),
                'outgoing': list(
                    qs.filter(direction='outgoing').values(
                        'id', 'number', 'subject', 'letter_date', 'status', 'priority',
                        'organization__name',
                    )[:6]
                ),
                'overdue': list(
                    qs.filter(due_date__lt=today).exclude(status__in=FINAL_STATUSES).values(
                        'id', 'number', 'subject', 'due_date', 'status', 'direction',
                        'organization__name',
                    )[:6]
                ),
            },
        })

    # ------------------------------------------------------------------ گزارش‌ها

    @action(detail=False, methods=['get'], url_path='number-preview')
    def number_preview(self, request):
        direction = request.query_params.get('direction') or 'outgoing'
        series_id = request.query_params.get('series')
        company = _get_company(request)
        series = self._resolve_series(direction, company, series_id)
        letter_date = request.query_params.get('letter_date')
        parsed = None
        if letter_date:
            try:
                parsed = date_cls.fromisoformat(letter_date[:10])
            except ValueError:
                parsed = None
        return Response({
            'series': LetterSeriesSerializer(series).data if series else None,
            'number': preview_number(series, parsed) if series else '',
        })

    @action(detail=False, methods=['get'])
    def meta(self, request):
        """گزینه‌های استاندارد فرم + سری‌های پیش‌فرض هر جهت."""
        company = _get_company(request)
        series_rows = LetterSeries.objects.filter(company=company, is_active=True)
        defaults = {}
        for direction in ('incoming', 'outgoing', 'internal'):
            series = self._default_series(direction, company)
            defaults[direction] = {
                'series': series.id if series else None,
                'number_preview': preview_number(series) if series else '',
            }
        return Response({
            'directions': [{'value': v, 'label': l} for v, l in Letter.DIRECTION_CHOICES],
            'statuses': [{'value': v, 'label': l} for v, l in Letter.STATUS_CHOICES],
            'priorities': [{'value': v, 'label': l} for v, l in Letter.PRIORITY_CHOICES],
            'confidentialities': [
                {'value': v, 'label': l} for v, l in Letter.CONFIDENTIALITY_CHOICES
            ],
            'entry_methods': [
                {'value': v, 'label': l} for v, l in Letter.ENTRY_METHODS
            ],
            'delivery_types': [
                {'value': v, 'label': l} for v, l in Letter.DELIVERY_TYPES
            ],
            'referral_purposes': [
                {'value': v, 'label': l} for v, l in LetterReferral.PURPOSES
            ],
            'categories': LetterCategorySerializer(
                LetterCategory.objects.filter(company=company, is_active=True), many=True,
            ).data if company else [],
            'series': LetterSeriesSerializer(series_rows, many=True).data,
            'defaults': defaults,
        })

    @action(detail=False, methods=['get'])
    def personnel(self, request):
        """جستجوی پرسنل (منابع انسانی) برای فیلدهای فرستنده/گیرنده/تحویل‌دهنده و ارجاع."""
        company = _get_company(request)
        if not company:
            return Response([])
        from employees.models import Employee

        qs = Employee.objects.filter(company=company, is_active=True).select_related(
            'department', 'job_title',
        )
        q = (request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(
                Q(first_name__icontains=q) | Q(last_name__icontains=q)
                | Q(employee_id__icontains=q) | Q(national_id__icontains=q)
                | Q(department__name__icontains=q)
                | Q(job_title__name__icontains=q)
            )
        try:
            limit = min(50, max(1, int(request.query_params.get('limit') or 20)))
        except (TypeError, ValueError):
            limit = 20
        rows = [
            {
                'id': emp.id,
                'employee_id': emp.employee_id,
                'full_name': emp.full_name,
                'label': f'{emp.full_name} ({emp.employee_id})' if emp.employee_id else emp.full_name,
                'department': getattr(emp.department, 'name', '') or '',
                'job_title': getattr(emp.job_title, 'name', '') or '',
                'mobile': emp.mobile or '',
            }
            for emp in qs.order_by('first_name', 'last_name')[:limit]
        ]
        return Response(rows)

    @action(detail=False, methods=['get'])
    def parties(self, request):
        """جستجوی طرف‌های حساب/قرارداد (مدیریت قراردادها) برای ارسال‌کننده و طرف حساب."""
        company = _get_company(request)
        from contracts.models import ContractParty

        qs = ContractParty.objects.filter(is_active=True)
        if company:
            qs = qs.filter(company=company)
        q = (request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(
                Q(name__icontains=q) | Q(national_id__icontains=q)
                | Q(registration_number__icontains=q)
                | Q(economic_code__icontains=q)
                | Q(contact_person__icontains=q)
                | Q(mobile__icontains=q) | Q(phone__icontains=q)
            )
        try:
            limit = min(50, max(1, int(request.query_params.get('limit') or 20)))
        except (TypeError, ValueError):
            limit = 20
        rows = [
            {
                'id': party.id,
                'name': party.name,
                'label': party.name,
                'party_type': party.party_type,
                'party_type_display': party.get_party_type_display(),
                'person_type': party.person_type,
                'national_id': party.national_id or '',
                'contact_person': party.contact_person or '',
                'mobile': party.mobile or '',
            }
            for party in qs.order_by('name')[:limit]
        ]
        return Response(rows)

    @action(detail=False, methods=['post'], url_path='quick-party')
    def quick_party(self, request):
        """ثبت سریع طرف حساب جدید (در صورت نبود در مدیریت قراردادها)."""
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({'detail': 'نام طرف حساب را وارد کنید.'},
                            status=http_status.HTTP_400_BAD_REQUEST)
        company = _get_company(request)
        from contracts.models import ContractParty

        party = ContractParty.objects.filter(company=company, name__iexact=name).first()
        created = False
        if not party:
            party = ContractParty.objects.create(
                company=company, name=name,
                party_type=request.data.get('party_type') or 'other',
            )
            created = True
        return Response({
            'id': party.id,
            'name': party.name,
            'label': party.name,
            'created': created,
        }, status=http_status.HTTP_201_CREATED if created else http_status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='export-excel')
    def export_excel(self, request):
        from django.http import HttpResponse

        from correspondences.excel_export import build_letters_workbook

        queryset = self.filter_queryset(self.get_queryset())[:5000]
        workbook = build_letters_workbook(queryset)
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        filename = f"correspondence-{date_cls.today().isoformat()}.xlsx"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        workbook.save(response)
        return response


class LetterReferralViewSet(BaseLetterViewSet):
    """ارجاعات نامه‌ها: کارتابل من، مشاهده، حاشیه، دستور، ارجاع بعدی و تکمیل اقدام."""

    serializer_class = LetterReferralSerializer
    queryset = LetterReferral.objects.all()
    search_fields = [
        'letter__number', 'letter__subject', 'letter__sender_name', 'to_name',
        'instruction', 'note', 'margin_note', 'result_note', 'result',
        'to_employee__first_name', 'to_employee__last_name',
        'to_employees__first_name', 'to_employees__last_name',
    ]
    ordering_fields = ['referred_on', 'due_date', 'status', 'seq']
    ordering = ['-referred_on', '-id']

    def get_queryset(self):
        qs = super().get_queryset().select_related(
            'letter', 'from_user', 'to_user', 'answered_by',
            'to_employee', 'from_employee', 'letter__category', 'letter__organization',
        ).prefetch_related('to_employees').distinct()
        params = self.request.query_params
        user = getattr(self.request, 'user', None)
        company = _get_company(self.request)
        employee = _user_employee(user, company)
        if _truthy(params.get('mine')) and user and user.is_authenticated:
            employee = _user_employee(user, company) or _employee_of_user(user, company)
            qs = qs.filter(_my_referral_filter(user, employee, company)).distinct()
        letter_id = params.get('letter')
        if letter_id:
            qs = qs.filter(letter_id=letter_id)
        status_param = params.get('status')
        if status_param:
            values = [item for item in status_param.split(',') if item]
            if values:
                qs = qs.filter(status__in=values)
        purpose = params.get('purpose')
        if purpose:
            qs = qs.filter(purpose=purpose)
        if _truthy(params.get('open_only')):
            qs = qs.filter(status__in=OPEN_REFERRAL_STATUSES)
        if _truthy(params.get('overdue')):
            qs = qs.filter(due_date__lt=date_cls.today()).exclude(
                status__in=('done', 'canceled', 'returned'),
            )
        direction = params.get('direction')
        if direction:
            qs = qs.filter(letter__direction=direction)
        return qs

    @action(detail=False, methods=['get'])
    def cartable(self, request):
        """کارتابل من: ارجاعات کاربر/پرسنل او + شمارش‌ها (اقدام/اطلاع/معوق)."""
        company = _get_company(request)
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return Response({'counts': {}, 'results': [], 'total': 0})
        employee = _user_employee(user, company) or _employee_of_user(user, company)
        base = LetterReferral.objects.filter(
            company=company, letter__is_active=True,
        ).select_related(
            'letter', 'from_user', 'to_user', 'to_employee', 'from_employee',
            'letter__category',
        ).prefetch_related('to_employees')
        target = _my_referral_filter(user, employee, company)
        base = base.filter(target).distinct()

        open_qs = base.filter(status__in=OPEN_REFERRAL_STATUSES)
        counts = {
            'total': base.count(),
            'action': base.filter(purpose='action').count(),
            'info': base.filter(purpose='info').count(),
            'comment': base.filter(purpose='comment').count(),
            'pending': open_qs.count(),
            'done': base.filter(status='done').count(),
            'closed': base.exclude(status__in=OPEN_REFERRAL_STATUSES).count(),
            'overdue': open_qs.filter(due_date__lt=date_cls.today()).count(),
            # «دیده‌نشده» فقط برای ارجاع‌های باز معنا دارد؛ ارجاع‌های تمام‌شده
            # (مثل ارجاع‌های تاریخی واردشده از اکسل) نباید شمارنده را بالا ببرند.
            'unseen': open_qs.filter(seen_at__isnull=True).count(),
            'unseen_all': base.filter(seen_at__isnull=True).count(),
        }

        qs = base
        status_param = request.query_params.get('status')
        if status_param == 'open':
            qs = qs.filter(status__in=OPEN_REFERRAL_STATUSES)
        elif status_param:
            values = [item for item in status_param.split(',') if item]
            if values:
                qs = qs.filter(status__in=values)
        purpose = request.query_params.get('purpose')
        if purpose:
            qs = qs.filter(purpose=purpose)
        if _truthy(request.query_params.get('overdue')):
            qs = qs.filter(status__in=OPEN_REFERRAL_STATUSES,
                           due_date__lt=date_cls.today())
        if _truthy(request.query_params.get('unseen')):
            qs = qs.filter(seen_at__isnull=True)
        search = (request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(letter__number__icontains=search) | Q(letter__subject__icontains=search)
                | Q(letter__sender_name__icontains=search)
                | Q(instruction__icontains=search) | Q(note__icontains=search)
                | Q(to_name__icontains=search)
                | Q(to_employee__first_name__icontains=search)
                | Q(to_employee__last_name__icontains=search)
            )
        try:
            limit = min(200, max(1, int(request.query_params.get('limit') or 50)))
        except (TypeError, ValueError):
            limit = 50
        try:
            offset = max(0, int(request.query_params.get('offset') or 0))
        except (TypeError, ValueError):
            offset = 0
        qs = qs.order_by('-referred_on', '-id')
        total = qs.count()
        rows = qs[offset:offset + limit]
        return Response({
            'counts': counts,
            'total': total,
            'results': LetterReferralSerializer(
                rows, many=True, context={'request': request},
            ).data,
        })

    @action(detail=True, methods=['post'])
    def seen(self, request, pk=None):
        """علامت‌گذاری ارجاع به‌عنوان مشاهده‌شده (رسید مطالعه)."""
        referral = self.get_object()
        if not referral.seen_at:
            referral.seen_at = timezone.now()
            referral.save(update_fields=['seen_at', 'updated_at'])
            _log_event(
                referral.letter, 'referral_seen', request.user,
                note='ارجاع مشاهده شد.', meta={'referral_id': referral.id},
            )
        return Response(self.get_serializer(referral).data)

    @action(detail=True, methods=['post'])
    def note(self, request, pk=None):
        """ثبت حاشیه/یادداشت روی ارجاع (بدون تغییر وضعیت)."""
        referral = self.get_object()
        text = (request.data.get('note') or request.data.get('margin_note') or '').strip()
        if not text:
            return Response({'detail': 'متن حاشیه را وارد کنید.'},
                            status=http_status.HTTP_400_BAD_REQUEST)
        referral.margin_note = (
            f'{referral.margin_note}\n{text}'.strip() if referral.margin_note else text
        )
        if not referral.seen_at:
            referral.seen_at = timezone.now()
        referral.save(update_fields=['margin_note', 'seen_at', 'updated_at'])
        _log_event(
            referral.letter, 'referral_note', request.user, note=text[:500],
            meta={'referral_id': referral.id},
        )
        return Response(self.get_serializer(referral).data)

    @action(detail=True, methods=['post'])
    def instruction(self, request, pk=None):
        """ثبت/ویرایش دستور روی ارجاع."""
        referral = self.get_object()
        text = (request.data.get('instruction') or '').strip()
        if not text:
            return Response({'detail': 'متن دستور را وارد کنید.'},
                            status=http_status.HTTP_400_BAD_REQUEST)
        referral.instruction = text
        if not referral.seen_at:
            referral.seen_at = timezone.now()
        referral.save(update_fields=['instruction', 'seen_at', 'updated_at'])
        _log_event(
            referral.letter, 'referral_note', request.user,
            note=f'دستور: {text[:480]}',
            meta={'referral_id': referral.id, 'kind': 'instruction'},
        )
        return Response(self.get_serializer(referral).data)

    @action(detail=True, methods=['post'])
    def forward(self, request, pk=None):
        """ارجاع به سطح بعد (با حفظ زنجیرهٔ ارجاع) و بستن ارجاع جاری."""
        referral = self.get_object()
        child, error = _create_referral(referral.letter, request, parent=referral)
        if error:
            return error
        referral.status = 'forwarded'
        referral.done_at = timezone.now()
        if not referral.seen_at:
            referral.seen_at = timezone.now()
        referral.save(update_fields=['status', 'done_at', 'seen_at', 'updated_at'])
        _log_event(
            referral.letter, 'referral_forwarded', request.user,
            note=(request.data.get('instruction') or '')[:500],
            meta={'referral_id': referral.id, 'child_id': child.id},
        )
        return Response({
            'referral': self.get_serializer(referral).data,
            'child': LetterReferralSerializer(child, context={'request': request}).data,
        }, status=http_status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        referral = serializer.instance
        previous_status = referral.status
        data = serializer.validated_data
        new_status = data.get('status', previous_status)
        extra = {}
        if data.get('response') or data.get('result'):
            extra.setdefault('answered_by', self.request.user)
            extra.setdefault('answered_on', date_cls.today())
            if previous_status not in ('done', 'returned', 'canceled'):
                extra['status'] = new_status = 'done'
        if new_status in ('done', 'returned') and not referral.done_at:
            extra['done_at'] = timezone.now()
        serializer.save(**extra)
        changed = new_status != previous_status or extra.get('answered_by')
        if changed:
            summary = '، '.join(
                part for part in (
                    f'وضعیت: {new_status}' if new_status != previous_status else '',
                    f'پاسخ: {data.get("response")}' if data.get('response') else '',
                    f'نتیجه: {data.get("result")}' if data.get('result') else '',
                ) if part
            )
            _log_event(
                referral.letter, 'referral_done', self.request.user,
                note=summary[:500],
                meta={'referral_id': referral.id, 'status': new_status},
            )

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """ثبت پاسخ و نتیجهٔ یک ارجاع (اقدام انجام‌شده)."""
        referral = self.get_object()
        response = (request.data.get('response') or '').strip()
        result = (request.data.get('result') or '').strip()
        result_note = (request.data.get('result_note') or '').strip()
        if not response and not result and not result_note:
            return Response(
                {'detail': 'حداقل پاسخ یا نتیجهٔ اقدام را وارد کنید.'},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
        answered_on = request.data.get('answered_on') or date_cls.today().isoformat()
        referral.response = response
        referral.result = result
        if result_note:
            referral.result_note = result_note
        referral.answered_on = answered_on
        referral.answered_by = request.user if getattr(request.user, 'is_authenticated', False) else None
        referral.status = 'done'
        referral.done_at = timezone.now()
        referral.save()
        _log_event(
            referral.letter, 'referral_done', request.user,
            note=(result or response or result_note)[:500],
            meta={'referral_id': referral.id, 'action': 'complete', 'answered_on': str(answered_on)},
        )
        return Response(LetterReferralSerializer(referral, context={'request': request}).data)


class CorrespondenceNameAliasViewSet(BaseLetterViewSet):
    """نگاشت نام‌های خام (اکسل) به پرسنل / طرف حساب / مخاطب."""

    serializer_class = CorrespondenceNameAliasSerializer
    queryset = CorrespondenceNameAlias.objects.all()
    search_fields = ['raw_name', 'normalized', 'note']
    ordering = ['-applied_count', 'raw_name']

    def get_queryset(self):
        qs = super().get_queryset().select_related(
            'employee', 'party', 'correspondent', 'organization',
        )
        params = self.request.query_params
        if params.get('target_kind'):
            qs = qs.filter(target_kind=params['target_kind'])
        if params.get('scope'):
            qs = qs.filter(scope=params['scope'])
        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['company'] = _get_company(self.request)
        return context

    # ------------------------------------------------------------------ ابزار
    def _company(self):
        return _get_company(self.request)

    def _employee_candidates(self, company):
        from employees.models import Employee

        return list(
            Employee.objects.filter(company=company, is_active=True).select_related(
                'department', 'job_title',
            ),
        )

    def _party_candidates(self, company):
        from contracts.models import ContractParty

        return list(ContractParty.objects.filter(company=company, is_active=True))

    def _organization_candidates(self, company):
        return list(Organization.objects.filter(company=company, is_active=True))

    def _correspondent_candidates(self, company):
        return list(Correspondent.objects.filter(company=company, is_active=True))

    def _suggestions_for(self, raw, kind=None, employees=None, parties=None,
                         organizations=None, correspondents=None, limit=4):
        """کاندیدهای پیشنهادی برای یک نام خام."""
        from correspondences import matching

        company = self._company()
        rows = []
        if kind in (None, '', 'employee'):
            pool = employees if employees is not None else self._employee_candidates(company)
            for match in matching.best_matches(
                raw, pool, limit=limit, key=lambda emp: emp.full_name,
            ):
                employee = match['item']
                rows.append({
                    'kind': 'employee',
                    'id': employee.id,
                    'label': employee.full_name
                             + (f' ({employee.employee_id})' if employee.employee_id else ''),
                    'secondary': ' · '.join(filter(None, [
                        getattr(employee.department, 'name', ''),
                        getattr(employee.job_title, 'name', ''),
                    ])),
                    'score': match['score'],
                })
        if kind in (None, '', 'party'):
            pool = parties if parties is not None else self._party_candidates(company)
            for match in matching.best_matches(
                raw, pool, limit=limit, key=lambda party: party.name,
            ):
                party = match['item']
                rows.append({
                    'kind': 'party',
                    'id': party.id,
                    'label': party.name,
                    'secondary': party.get_party_type_display(),
                    'score': match['score'],
                })
        if kind in (None, '', 'organization'):
            pool = (organizations if organizations is not None
                    else self._organization_candidates(company))
            for match in matching.best_matches(
                raw, pool, limit=limit, key=lambda org: org.name,
            ):
                organization = match['item']
                rows.append({
                    'kind': 'organization',
                    'id': organization.id,
                    'label': organization.name,
                    'secondary': organization.get_type_display(),
                    'score': match['score'],
                })
        if kind in (None, '', 'correspondent'):
            pool = (correspondents if correspondents is not None
                    else self._correspondent_candidates(company))
            for match in matching.best_matches(
                raw, pool, limit=limit, key=lambda item: item.name,
            ):
                correspondent = match['item']
                rows.append({
                    'kind': 'correspondent',
                    'id': correspondent.id,
                    'label': correspondent.name,
                    'secondary': correspondent.get_kind_display(),
                    'score': match['score'],
                })
        rows.sort(key=lambda item: item['score'], reverse=True)
        return rows[:limit]

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """خلاصهٔ وضعیت نگاشت: تعداد نگاشت‌ها و نام‌های باقی‌مانده."""
        from correspondences import matching

        company = self._company()
        if not company:
            return Response({'aliases': 0, 'unmapped': 0, 'applied': 0, 'names': 0})
        qs = CorrespondenceNameAlias.objects.filter(company=company, is_active=True)
        rows = list(qs.values('target_kind', 'scope', 'normalized', 'applied_count'))
        covered = {(row['scope'], row['normalized']) for row in rows}
        any_covered = {row['normalized'] for row in rows if row['scope'] == 'any'}
        samples = matching.iter_name_samples(company)
        keys = {(sample['scope'], sample['normalized']) for sample in samples}
        remaining = {
            key for key in keys
            if key not in covered and key[1] not in any_covered
        }
        return Response({
            'aliases': len(rows),
            'by_kind': {
                kind: sum(1 for row in rows if row['target_kind'] == kind)
                for kind in ('employee', 'party', 'correspondent', 'organization')
            },
            'applied': sum(row['applied_count'] or 0 for row in rows),
            'names': len(keys),
            'unmapped': len(remaining),
        })

    @action(detail=False, methods=['get'])
    def unmapped(self, request):
        """نام‌های موجود در داده‌ها که هنوز نگاشت نشده‌اند + پیشنهاد."""
        from correspondences import matching

        company = self._company()
        if not company:
            return Response([])
        rows = list(CorrespondenceNameAlias.objects.filter(
            company=company, is_active=True,
        ).values('scope', 'normalized'))
        covered = {(row['scope'], row['normalized']) for row in rows}
        any_covered = {row['normalized'] for row in rows if row['scope'] == 'any'}
        try:
            limit = min(200, max(1, int(request.query_params.get('limit') or 60)))
        except (TypeError, ValueError):
            limit = 60

        employees = self._employee_candidates(company)
        parties = self._party_candidates(company)
        organizations = self._organization_candidates(company)
        correspondents = self._correspondent_candidates(company)
        aggregated = {}
        for sample in matching.iter_name_samples(company):
            key = (sample['scope'], sample['normalized'])
            if key in covered or sample['normalized'] in any_covered:
                continue
            entry = aggregated.setdefault(sample['normalized'], {
                'raw_name': sample['raw'], 'normalized': sample['normalized'],
                'count': 0, 'scopes': [],
            })
            entry['count'] += sample['count']
            if sample['scope'] not in entry['scopes']:
                entry['scopes'].append(sample['scope'])
        ordered = sorted(aggregated.values(), key=lambda item: item['count'], reverse=True)
        for row in ordered[:limit]:
            row['suggestions'] = self._suggestions_for(
                row['raw_name'], None, employees=employees, parties=parties,
                organizations=organizations, correspondents=correspondents,
                limit=6,
            )
        return Response(ordered[:limit])

    @action(detail=False, methods=['get'])
    def suggestions(self, request):
        """پیشنهاد پرسنل/طرف حساب برای یک نام (اتوکامپلیت)."""
        from correspondences import matching

        company = self._company()
        raw = (request.query_params.get('q') or '').strip()
        kind = request.query_params.get('kind') or ''
        if not company or not raw:
            return Response([])
        query = matching.normalize_name(raw)
        employees = [
            emp for emp in self._employee_candidates(company)
            if not query or query in matching.normalize_name(emp.full_name)
            or any(query in matching.normalize_name(part)
                   for part in (emp.first_name, emp.last_name, emp.employee_id))
        ][:80]
        parties = [
            party for party in self._party_candidates(company)
            if not query or query in matching.normalize_name(party.name)
        ][:80]
        organizations = [
            org for org in self._organization_candidates(company)
            if not query or query in matching.normalize_name(org.name)
        ][:80]
        correspondents = [
            item for item in self._correspondent_candidates(company)
            if not query or query in matching.normalize_name(item.name)
        ][:80]
        return Response(self._suggestions_for(
            raw, kind or None, employees=employees, parties=parties,
            organizations=organizations, correspondents=correspondents, limit=8,
        ))

    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        """اعمال یک نگاشت روی داده‌های موجود (با پشتیبانی از dry-run)."""
        from correspondences import mapping

        alias = self.get_object()
        dry_run = str(request.data.get('dry_run') or '').lower() in ('1', 'true', 'yes')
        result = mapping.apply_alias(alias, dry_run=dry_run)
        alias.refresh_from_db()
        result['alias_data'] = CorrespondenceNameAliasSerializer(
            alias, context=self.get_serializer_context(),
        ).data
        return Response(result)

    @action(detail=False, methods=['post'], url_path='apply-all')
    def apply_all(self, request):
        """اعمال همهٔ نگاشت‌ها روی داده‌های موجود."""
        from correspondences import mapping

        company = self._company()
        if not company:
            return Response({'detail': 'شرکت مشخص نیست.'},
                            status=http_status.HTTP_400_BAD_REQUEST)
        dry_run = str(request.data.get('dry_run') or '').lower() in ('1', 'true', 'yes')
        return Response(mapping.apply_all(company, dry_run=dry_run))


class LetterAttachmentViewSet(BaseLetterViewSet):

    serializer_class = LetterAttachmentSerializer
    queryset = LetterAttachment.objects.all()
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset().select_related('letter', 'uploaded_by')
        letter_id = self.request.query_params.get('letter')
        if letter_id:
            qs = qs.filter(letter_id=letter_id)
        return qs

    def perform_create(self, serializer):
        upload = self.request.FILES.get('file')
        serializer.save(
            company=_get_company(self.request),
            size=getattr(upload, 'size', 0),
            uploaded_by=getattr(self.request, 'user', None),
        )


class LetterRequestTypeViewSet(BaseLetterViewSet):
    """انواع درخواست کارتابل (مرخصی، وام، گواهی اشتغال ...)."""

    serializer_class = LetterRequestTypeSerializer
    queryset = LetterRequestType.objects.all()
    search_fields = ['name', 'code', 'description']
    ordering = ['order', 'name']


class LetterRequestViewSet(BaseLetterViewSet):
    """کارتابل درخواست‌های پرسنل: ثبت، مشاهده، ارجاع، تأیید/رد و لغو."""

    serializer_class = LetterRequestSerializer
    queryset = LetterRequest.objects.all()
    search_fields = ['number', 'subject', 'description', 'requester_name',
                     'request_type__name']
    ordering_fields = ['created_at', 'requested_on', 'due_date', 'status', 'priority']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset().select_related(
            'request_type', 'requester', 'requester_employee',
            'current_assignee', 'current_assignee_employee',
        ).prefetch_related('events')
        params = self.request.query_params
        user = getattr(self.request, 'user', None)
        company = _get_company(self.request)
        employee = _user_employee(user, company)

        scope = params.get('scope')
        if scope == 'mine' and user and user.is_authenticated:
            qs = qs.filter(requester=user)
        elif scope == 'assigned' and user and user.is_authenticated:
            target = Q(current_assignee=user)
            if employee:
                target = target | Q(current_assignee_employee=employee)
            qs = qs.filter(target)

        request_type = params.get('request_type')
        if request_type:
            qs = qs.filter(request_type_id=request_type)
        status_param = params.get('status')
        if status_param:
            values = [item for item in status_param.split(',') if item]
            if values:
                qs = qs.filter(status__in=values)
        if _truthy(params.get('open_only')):
            qs = qs.filter(status__in=LetterRequest.OPEN_STATUSES)
        if _truthy(params.get('overdue')):
            qs = qs.filter(status__in=LetterRequest.OPEN_STATUSES,
                           due_date__lt=date_cls.today())
        search = (params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(number__icontains=search) | Q(subject__icontains=search)
                | Q(description__icontains=search)
                | Q(requester_name__icontains=search)
                | Q(request_type__name__icontains=search)
            )
        return qs.distinct()

    def _log_request(self, instance, action, note='', meta=None):
        LetterRequestEvent.objects.create(
            company=instance.company, request=instance, action=action,
            actor=(self.request.user
                   if getattr(self.request.user, 'is_authenticated', False) else None),
            note=note or '', meta=meta or {},
        )

    def perform_create(self, serializer):
        company = _get_company(self.request)
        user = getattr(self.request, 'user', None)
        employee = _user_employee(user, company)
        request_type = serializer.validated_data.get('request_type')
        status = self.request.data.get('status') or 'submitted'
        if status not in dict(LetterRequest.STATUS_CHOICES):
            status = 'submitted'
        instance = serializer.save(
            company=company,
            number=request_number(company),
            requester=user if getattr(user, 'is_authenticated', False) else None,
            requester_employee=employee,
            requester_name=employee.full_name if employee else _user_name(user),
            request_type_title=(request_type.name if request_type else ''),
            requested_on=serializer.validated_data.get('requested_on') or date_cls.today(),
            total_steps=(request_type.approval_levels if request_type else 1) or 1,
            status=status,
        )
        self._log_request(
            instance, 'created', note=instance.subject[:200],
            meta={'request_type': instance.request_type_id or '', 'status': instance.status},
        )






    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """ثبت نهایی درخواست پیش‌نویس."""
        instance = self.get_object()
        if instance.status != 'draft':
            return Response({'detail': 'این درخواست قبلاً ثبت شده است.'},
                            status=http_status.HTTP_400_BAD_REQUEST)
        instance.status = 'submitted'
        instance.requested_on = instance.requested_on or date_cls.today()
        instance.save(update_fields=['status', 'requested_on', 'updated_at'])
        self._log_request(instance, 'submitted', note=instance.subject[:200])
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """تأیید درخواست در گام جاری."""
        instance = self.get_object()
        if instance.status in ('approved', 'rejected', 'canceled'):
            return Response({'detail': 'این درخواست بسته شده است.'},
                            status=http_status.HTTP_400_BAD_REQUEST)
        note = (request.data.get('decision_note') or request.data.get('note') or '').strip()
        instance.status = 'approved'
        instance.decided_on = date_cls.today()
        instance.decision_note = note
        instance.current_step = instance.total_steps or 1
        instance.closed_at = timezone.now()
        instance.save(update_fields=[
            'status', 'decided_on', 'decision_note', 'current_step', 'closed_at', 'updated_at',
        ])
        self._log_request(instance, 'approved', note=note)
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """رد درخواست."""
        instance = self.get_object()
        if instance.status in ('approved', 'rejected', 'canceled'):
            return Response({'detail': 'این درخواست بسته شده است.'},
                            status=http_status.HTTP_400_BAD_REQUEST)
        note = (request.data.get('decision_note') or request.data.get('note') or '').strip()
        instance.status = 'rejected'
        instance.decided_on = date_cls.today()
        instance.decision_note = note
        instance.closed_at = timezone.now()
        instance.save(update_fields=[
            'status', 'decided_on', 'decision_note', 'closed_at', 'updated_at',
        ])
        self._log_request(instance, 'rejected', note=note)
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """لغو درخواست توسط درخواست‌دهنده."""
        instance = self.get_object()
        if instance.status in ('approved', 'rejected', 'canceled'):
            return Response({'detail': 'امکان لغو این درخواست وجود ندارد.'},
                            status=http_status.HTTP_400_BAD_REQUEST)
        note = (request.data.get('note') or '').strip()
        instance.status = 'canceled'
        instance.decision_note = note or instance.decision_note
        instance.closed_at = timezone.now()
        instance.save(update_fields=['status', 'decision_note', 'closed_at', 'updated_at'])
        self._log_request(instance, 'canceled', note=note)
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """ارجاع درخواست به کارشناس/پرسنل بعدی (آمادهٔ گردش‌کار چندسطحی)."""
        instance = self.get_object()
        to_employee_id = request.data.get('to_employee') or None
        to_user_id = request.data.get('to_user') or None
        note = (request.data.get('note') or '').strip()
        if not to_employee_id and not to_user_id:
            return Response({'detail': 'گیرندهٔ ارجاع را مشخص کنید.'},
                            status=http_status.HTTP_400_BAD_REQUEST)
        from django.contrib.auth import get_user_model

        from employees.models import Employee

        employee = None
        if to_employee_id:
            employee = Employee.objects.filter(
                company=instance.company, id=to_employee_id, is_active=True,
            ).first()
        user = None
        if to_user_id:
            user = get_user_model().objects.filter(id=to_user_id).first()
        if not employee and user:
            employee = _employee_of_user(user, instance.company)
        instance.current_assignee = user
        instance.current_assignee_employee = employee
        if instance.status in ('submitted', 'draft'):
            instance.status = 'in_review'
        instance.save(update_fields=[
            'current_assignee', 'current_assignee_employee', 'status', 'updated_at',
        ])
        self._log_request(
            instance, 'assigned', note=note,
            meta={'to_employee': to_employee_id or '', 'to_user': to_user_id or ''},
        )
        return Response(self.get_serializer(instance).data)

