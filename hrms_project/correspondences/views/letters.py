"""دفتر نامه‌ها: انواع، سری‌ها، مخاطبین و ویوست اصلی نامه‌ها."""
from django.db.models import BigIntegerField, CharField, F, Func, Value
from django.db.models.functions import Cast, NullIf

from correspondences.views.base import (  # noqa: F401 — واردات مشترک

    AllowAny, Count, FileResponse, Http404, JWTAuthentication, PermissionDenied, Q, Response,
    Sum, action, date_cls, filters, http_status, parsers, serializers, timezone, timedelta,
    viewsets,
    CorrespondenceNameAlias, Correspondent, Letter, LetterAttachment, LetterCategory,
    LetterEvent, LetterReferral, LetterRequest, LetterRequestEvent, LetterRequestType,
    LetterSeries,
    allocate_number, preview_number, request_number,
    issue_token, read_token,
    REQUESTS_MENUS, CorrespondencePermissionMixin, DefinitionPermissionMixin,
    can_download_attachment, can_read_confidential, confidential_letter_filter,
    correspondence_has_permission, menus_for_direction, perm_READ_MENUS,
    referral_to_me_filter, require_correspondence,
    content_type_of, is_inline_safe, stored_filename, validate_attachment,
    CorrespondenceNameAliasListSerializer, CorrespondenceNameAliasSerializer,
    CorrespondentSerializer, LetterAttachmentSerializer, LetterCategorySerializer,
    LetterEventSerializer, LetterListSerializer, LetterReferralSerializer,
    LetterRequestSerializer, LetterRequestTypeSerializer, LetterSeriesSerializer,
    LetterSerializer,
    FINAL_STATUSES, OPEN_REFERRAL_STATUSES, JALALI_MONTHS, _jdate, BaseLetterViewSet,
    _company_scoped, _create_referral, _delete_media_file, _employee_of_user, _get_company,
    _log_event, _my_name_variants, _my_referral_filter, _raw_referral_names_for, _truthy,
    _user_employee, _user_name, _user_of_employee,
)


class LetterCategoryViewSet(DefinitionPermissionMixin, BaseLetterViewSet):
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

# ---------------------------------------------------------------------------
# مرتب‌سازی «شماره ثبت ورود به واحد» (ستون شمارهٔ ثبت دفتر وارده)
# ---------------------------------------------------------------------------
# مقادیر این فیلد متنی‌اند و ممکن است به شکل «1404/457» ثبت شوند؛ برای اینکه
# «آخرین شماره اول» بیاید، رقم‌ها استخراج و به عدد تبدیل می‌شوند. مقدار خالی
# یا بدون رقم به NULL تبدیل می‌شود تا همیشه ته فهرست بیفتد (nulls_last).
REG_NO_ORDERING_FIELDS = ('reg_no', 'unit_reg_no')
REG_NO_SORT_ANNOTATION = '_unit_reg_no_sort'


def reg_no_sort_expression():
    """عبارت عددی «شمارهٔ ثبت» برای مرتب‌سازی (PostgreSQL)."""
    digits = Func(
        F('unit_reg_no'),
        Value('[^0-9]'),
        Value(''),
        Value('g'),
        function='regexp_replace',
        output_field=CharField(),
    )
    return Cast(NullIf(digits, Value('')), output_field=BigIntegerField())


class LetterOrderingFilter(filters.OrderingFilter):
    """``OrderingFilter`` با پشتیبانی از مرتب‌سازی عددی «شمارهٔ ثبت».

    ``?ordering=-reg_no`` آخرین شمارهٔ ثبت را اول می‌آورد و نامه‌های بدون
    شماره را ته فهرست می‌گذارد؛ بقیهٔ فیلدها مثل قبل متنی مرتب می‌شوند.
    """

    def filter_queryset(self, request, queryset, view):
        ordering = self.get_ordering(request, queryset, view) or []
        reg_terms = [term for term in ordering if str(term).lstrip('-') in REG_NO_ORDERING_FIELDS]
        if not reg_terms:
            return queryset.order_by(*ordering) if ordering else queryset

        others = [term for term in ordering if term not in reg_terms]
        descending = str(reg_terms[0]).startswith('-')
        annotated = queryset.annotate(**{REG_NO_SORT_ANNOTATION: reg_no_sort_expression()})
        key = F(REG_NO_SORT_ANNOTATION)
        primary = key.desc(nulls_last=True) if descending else key.asc(nulls_last=True)
        return annotated.order_by(primary, *(others or ['-id']))


class LetterSeriesViewSet(DefinitionPermissionMixin, BaseLetterViewSet):
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


class CorrespondentViewSet(DefinitionPermissionMixin, BaseLetterViewSet):
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


class LetterViewSet(CorrespondencePermissionMixin, BaseLetterViewSet):
    """دفتر نامه‌های اداری: جستجو/فیلتر، ثبت شماره، ارجاع، پاسخ، بایگانی و آمار."""

    permission_label = 'مکاتبات'
    permission_matrix = {
        'list': ('view', 'letters'),
        'retrieve': ('view', 'letters'),
        'stats': ('view', 'letters'),
        'meta': ('view', 'letters'),
        'personnel': ('view', 'letters'),
        'parties': ('view', 'letters'),
        'number_preview': ('view', 'letters'),
        'create': ('create', 'letters'),
        'update': ('edit', 'letters'),
        'partial_update': ('edit', 'letters'),
        'destroy': ('delete', 'letters'),
        'register': ('edit', 'letters'),
        'archive': ('edit', 'letters'),
        'close': ('edit', 'letters'),
        'comment': ('edit', 'letters'),
        'refer': ('edit', 'letters'),
        'reply': ('create', 'letters'),
        'quick_party': ('create', 'fixed'),
        'export_excel': ('export', 'letters'),
    }

    serializer_class = LetterSerializer
    queryset = Letter.objects.all()

    def _letter_direction_for_request(self):
        pk = self.kwargs.get('pk')
        if not pk:
            return None
        return Letter.objects.filter(pk=pk).values_list('direction', flat=True).first()

    # جست‌وجوی جامع دستی انجام می‌شود تا نام ارجاع‌شدگان، طرف حساب، پیوست‌ها و
    # متن نامه هم پوشش داده شوند.
    filter_backends = [LetterOrderingFilter]
    ordering_fields = [
        'letter_date', 'received_date', 'effective_date', 'created_at', 'due_date',
        'priority', 'status', 'number',
        # «شماره ثبت ورود به واحد» — با ترتیب عددی (reg_no) یا متنی (unit_reg_no)
        'reg_no', 'unit_reg_no', 'unit_reg_date', 'company_reg_no',
    ]
    ordering = ['-effective_date', '-id']

    SEARCH_FIELDS = (
        'number', 'external_number', 'indicator_no', 'transmittal_no', 'subject', 'summary',
        'body', 'sender_name', 'sender_title', 'receiver_name', 'drafter_name',
        'contract_number', 'company_reg_no', 'unit_reg_no', 'unit_name', 'delivered_by_name',
        'tags', 'source_ref', 'archive_ref', 'entered_by_name', 'party_name',
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

    def destroy(self, request, *args, **kwargs):
        """حذف نامه + فایل‌های پیوست (مجوز «حذف» در ماتریس بررسی شده است)."""
        letter = self.get_object()
        file_names = [
            row.file.name for row in letter.attachments.all() if getattr(row, 'file', None)
        ]
        response = super().destroy(request, *args, **kwargs)
        for name in file_names:
            _delete_media_file(name)
        return response

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
        # actionهای «سبک» (فهرست/آمار/خروجی) prefetch سنگین نمی‌گیرند.
        heavy = self.action not in ('list', 'stats', 'export_excel')
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
        # نامه‌های «محرمانه/سری» فقط برای سازنده، تنظیم‌کننده، ارجاع‌شدگان و
        # دارندگان مجوز تأیید/ویرایش قابل مشاهده‌اند.
        qs = qs.filter(confidential_letter_filter(self.request.user))

        if heavy:
            from django.db.models import Prefetch

            from correspondences.models import LetterEvent

            qs = qs.prefetch_related(
                Prefetch(
                    'attachments',
                    queryset=LetterAttachment.objects.select_related('uploaded_by'),
                ),
                'referrals', 'referrals__to_user', 'referrals__to_employee',
                'referrals__to_employees',
                Prefetch(
                    'events',
                    queryset=LetterEvent.objects.select_related('actor'),
                ),
                'replies',
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
        # ترتیب پیش‌فرض: «تاریخ ورود» (وارده) → «تاریخ ارسال» (صادره) → «تاریخ نامه».
        from django.db.models.functions import Coalesce

        qs = qs.annotate(effective_date=Coalesce('received_date', 'sent_date', 'letter_date'))
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
        """فهرست یا بارگذاری پیوست‌های نامه (با اعتبارسنجی امن فایل)."""
        letter = self.get_object()
        if request.method.lower() == 'get':
            self.check_correspondence_permission('view', direction=letter.direction)
            serializer = LetterAttachmentSerializer(
                letter.attachments.all(), many=True, context={'request': request},
            )
            return Response(serializer.data)

        self.check_correspondence_permission('edit', direction=letter.direction)
        upload = request.FILES.get('file')
        if not upload:
            return Response({'detail': 'فایل پیوست ارسال نشده است.'},
                            status=http_status.HTTP_400_BAD_REQUEST)
        from django.core.exceptions import ValidationError as DjangoValidationError

        try:
            validate_attachment(upload)
        except DjangoValidationError as error:
            return Response(
                {'detail': '؛ '.join(error.messages)},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
        upload.name = stored_filename(upload)
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
        """آمار داشبورد: شمارش جهت‌ها/وضعیت‌ها، معوقات، ارجاعات من و روند ماهانه.

        بخش «شرکت‌محور» ۳۰ ثانیه در کش نگه داشته می‌شود (داشبورد و فهرست هر دو
        همین اندپوینت را صدا می‌زنند)؛ بخش «من» برای هر کاربر جدا محاسبه می‌شود.
        """
        from django.core.cache import cache

        company = _get_company(request)
        user = getattr(request, 'user', None)
        today = date_cls.today()

        sees_everything = bool(
            user and getattr(user, 'is_authenticated', False)
            and (
                getattr(user, 'is_superuser', False)
                or correspondence_has_permission(user, 'approve', menus=perm_READ_MENUS)
            )
        )
        payload = None
        cache_key = None
        if sees_everything:
            cache_key = (
                f'corr:stats:{getattr(company, "pk", "-")}:'
                f'{request.META.get("QUERY_STRING", "")}:{today.isoformat()}'
            )
            payload = cache.get(cache_key)
        if payload is None:
            payload = self._stats_global(request, today)
            if cache_key:
                cache.set(cache_key, payload, 30)

        my_referrals_total = 0
        my_referrals_overdue = 0
        if company and user and user.is_authenticated:
            my_referrals = LetterReferral.objects.filter(
                company=company, to_user=user, letter__is_active=True,
            ).exclude(status__in=('done', 'canceled', 'returned'))
            my_agg = my_referrals.aggregate(
                total=Count('id'),
                overdue=Count('id', filter=Q(due_date__lt=today)),
            )
            my_referrals_total = my_agg['total'] or 0
            my_referrals_overdue = my_agg['overdue'] or 0

        payload['totals'] = {
            **payload.get('totals', {}),
            'my_referrals': my_referrals_total,
            'my_overdue_referrals': my_referrals_overdue,
        }
        return Response(payload)

    def _stats_global(self, request, today):
        """آمار شرکت‌محور (بدون بخش شخصی) — قابل کش کردن."""
        from django.db.models.functions import TruncMonth

        qs = self.get_queryset()
        company = _get_company(request)

        # یک کوئری به‌جای سه کوئری برای تفکیک جهت/وضعیت/اولویت
        by_direction, by_status, by_priority = {}, {}, {}
        for row in qs.values('direction', 'status', 'priority').annotate(c=Count('id')).order_by():
            count = row['c']
            by_direction[row['direction']] = by_direction.get(row['direction'], 0) + count
            by_status[row['status']] = by_status.get(row['status'], 0) + count
            by_priority[row['priority']] = by_priority.get(row['priority'], 0) + count

        month_start = today.replace(day=1)

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

        return {
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
        }

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


