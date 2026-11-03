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
    Correspondent, Letter, LetterAttachment, LetterCategory, LetterEvent, LetterReferral,
    LetterSeries,
)
from correspondences.numbering import allocate_number, preview_number  # noqa: E402
from correspondences.serializers import (  # noqa: E402
    CorrespondentSerializer, LetterAttachmentSerializer, LetterCategorySerializer,
    LetterEventSerializer, LetterReferralSerializer, LetterSeriesSerializer, LetterSerializer,
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
    search_fields = [
        'number', 'external_number', 'indicator_no', 'transmittal_no', 'subject', 'summary',
        'sender_name', 'sender_title', 'receiver_name', 'drafter_name', 'contract_number',
        'company_reg_no', 'unit_reg_no', 'unit_name',
        'organization__name', 'correspondent__name', 'sender_organization__name',
    ]
    ordering_fields = ['letter_date', 'created_at', 'due_date', 'priority', 'status', 'number']
    ordering = ['-letter_date', '-id']

    def get_queryset(self):
        qs = super().get_queryset().select_related(
            'organization', 'sender_organization', 'correspondent', 'category', 'series',
            'drafter', 'created_by', 'entered_by', 'reply_to',
        ).prefetch_related('attachments', 'referrals', 'events', 'replies')
        params = self.request.query_params
        user = getattr(self.request, 'user', None)

        direction = params.get('direction')
        if direction:
            qs = qs.filter(direction=direction)

        for field in ('category', 'series', 'priority', 'confidentiality', 'organization',
                      'correspondent', 'sender_organization'):
            value = params.get(field)
            if value:
                qs = qs.filter(**{f'{field}_id': value})

        entry_method = params.get('entry_method')
        if entry_method:
            qs = qs.filter(entry_method=entry_method)

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
            qs = qs.filter(attachments__isnull=False)

        scope = params.get('scope')
        if scope == 'mine' and user and user.is_authenticated:
            qs = qs.filter(Q(created_by=user) | Q(drafter=user) | Q(referrals__to_user=user))
        elif scope == 'referred' and user and user.is_authenticated:
            qs = qs.filter(
                referrals__to_user=user, referrals__status__in=OPEN_REFERRAL_STATUSES,
            )

        return qs.distinct()

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
        """ارجاع نامه به کاربر/واحد همراه با دستور، مهلت اقدام و توضیح."""
        letter = self.get_object()
        to_user_id = request.data.get('to_user') or None
        to_name = (request.data.get('to_name') or '').strip()
        if not to_user_id and not to_name:
            return Response({'detail': 'گیرندهٔ ارجاع (کاربر یا واحد) را مشخص کنید.'},
                            status=http_status.HTTP_400_BAD_REQUEST)
        company = letter.company
        to_user = None
        if to_user_id:
            from django.contrib.auth import get_user_model

            to_user = get_user_model().objects.filter(id=to_user_id).first()
        if to_user_id and not to_user:
            return Response({'detail': 'کاربر گیرنده یافت نشد.'},
                            status=http_status.HTTP_400_BAD_REQUEST)
        due_date = request.data.get('due_date') or None
        if isinstance(due_date, str) and not due_date.strip():
            due_date = None
        instruction = (request.data.get('instruction') or '').strip()
        note = (request.data.get('note') or '').strip()
        last_seq = letter.referrals.order_by('-seq').values_list('seq', flat=True).first() or 0
        referral = LetterReferral.objects.create(
            company=company, letter=letter, seq=last_seq + 1,
            from_user=request.user, to_user=to_user, to_name=to_name,
            referred_on=date_cls.today(), due_date=due_date or None,
            instruction=instruction, note=note, status='pending',
        )
        if letter.status in ('draft', 'registered'):
            letter.status = 'in_progress'
        letter.save(update_fields=['status', 'updated_at'])
        _log_event(
            letter, 'referred', request.user,
            note=instruction or note,
            meta={'to': _user_name(to_user) or to_name, 'due_date': str(due_date or ''),
                  'instruction': instruction, 'note': note},
        )
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
        open_qs = qs.exclude(status__in=FINAL_STATUSES)

        by_direction = {row['direction']: row['c'] for row in
                        qs.values('direction').annotate(c=Count('id'))}
        by_status = {row['status']: row['c'] for row in
                     qs.values('status').annotate(c=Count('id'))}
        by_priority = {row['priority']: row['c'] for row in
                       qs.values('priority').annotate(c=Count('id'))}

        month_start = today.replace(day=1)
        overdue_qs = qs.filter(due_date__lt=today).exclude(status__in=FINAL_STATUSES)

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

        return Response({
            'totals': {
                'all': qs.count(),
                'incoming': by_direction.get('incoming', 0),
                'outgoing': by_direction.get('outgoing', 0),
                'internal': by_direction.get('internal', 0),
                'open': open_qs.count(),
                'overdue': overdue_qs.count(),
                'drafts': by_status.get('draft', 0),
                'archived': by_status.get('archived', 0),
                'incoming_this_month': qs.filter(
                    direction='incoming', letter_date__gte=month_start,
                ).count(),
                'outgoing_this_month': qs.filter(
                    direction='outgoing', letter_date__gte=month_start,
                ).count(),
                'urgent': by_priority.get('urgent', 0) + by_priority.get('high', 0),
                'my_referrals': my_referrals.count(),
                'my_overdue_referrals': my_referrals.filter(due_date__lt=today).count(),
            },
            'by_status': by_status,
            'by_direction': by_direction,
            'by_priority': by_priority,
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
            'categories': LetterCategorySerializer(
                LetterCategory.objects.filter(company=company, is_active=True), many=True,
            ).data if company else [],
            'series': LetterSeriesSerializer(series_rows, many=True).data,
            'defaults': defaults,
        })

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
    """ارجاعات نامه‌ها: کارتابل من، تکمیل اقدام و ثبت نتیجه."""

    serializer_class = LetterReferralSerializer
    queryset = LetterReferral.objects.all()
    search_fields = ['letter__number', 'letter__subject', 'to_name', 'note', 'result_note']
    ordering_fields = ['referred_on', 'due_date', 'status', 'seq']
    ordering = ['-referred_on', '-id']

    def get_queryset(self):
        qs = super().get_queryset().select_related('letter', 'from_user', 'to_user', 'answered_by')
        params = self.request.query_params
        user = getattr(self.request, 'user', None)
        if _truthy(params.get('mine')) and user and user.is_authenticated:
            qs = qs.filter(to_user=user)
        letter_id = params.get('letter')
        if letter_id:
            qs = qs.filter(letter_id=letter_id)
        status_param = params.get('status')
        if status_param:
            values = [item for item in status_param.split(',') if item]
            if values:
                qs = qs.filter(status__in=values)
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






