"""ارجاعات نامه‌ها و کارتابل شخصی."""
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


class LetterReferralViewSet(CorrespondencePermissionMixin, BaseLetterViewSet):
    """ارجاعات نامه‌ها: کارتابل من، مشاهده، حاشیه، دستور، ارجاع بعدی و تکمیل اقدام."""

    permission_label = 'ارجاع مکاتبات'
    permission_matrix = {
        'list': ('view', 'referrals'),
        'retrieve': ('view', 'referrals'),
        'update': ('edit', 'referrals'),
        'partial_update': ('edit', 'referrals'),
        'destroy': ('delete', 'referrals'),
    }

    def _letter_direction_for_request(self):
        pk = self.kwargs.get('pk')
        if not pk:
            return None
        return LetterReferral.objects.filter(pk=pk).values_list(
            'letter__direction', flat=True,
        ).first()

    def _referral_assigned_to_me(self, referral):
        """آیا این ارجاع به کاربر/پرسنل جاری است؟ (کاربر، پرسنل، چندنفره، نام متنی)"""
        from correspondences.matching import normalize_name
        from correspondences.permissions import employee_of, my_name_variants

        user = self.request.user
        if referral.to_user_id and referral.to_user_id == user.id:
            return True
        employee_id = employee_of(user)
        if employee_id:
            if referral.to_employee_id == employee_id:
                return True
            if referral.to_employees.filter(id=employee_id).exists():
                return True
        to_name = (referral.to_name or '').strip()
        if to_name and normalize_name(to_name) in my_name_variants(user):
            return True
        return False

    def _require_referral_access(self, referral, action='edit'):
        """ارجاع را فقط صاحب آن، سازنده/تنظیم‌کنندهٔ نامه یا دارندهٔ مجوز لمس می‌کند."""
        user = self.request.user
        if self._referral_assigned_to_me(referral):
            return
        letter = referral.letter
        if letter.created_by_id == user.id or letter.drafter_id == user.id:
            return
        require_correspondence(
            user, action,
            menus=menus_for_direction(letter.direction),
            label='ارجاع مکاتبات',
        )

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
        qs = qs.filter(confidential_letter_filter(self.request.user, prefix='letter__'))
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
        ).filter(
            confidential_letter_filter(user, prefix='letter__'),
        ).select_related(
            'letter', 'from_user', 'to_user', 'to_employee', 'from_employee',
            'letter__category',
        ).prefetch_related('to_employees')
        target = _my_referral_filter(user, employee, company)
        base = base.filter(target).distinct()

        today = date_cls.today()
        open_status = Q(status__in=OPEN_REFERRAL_STATUSES)
        # همهٔ شمارنده‌ها در یک کوئری (قبلاً ۱۰ کوئری جدا بود و هر ۳۰ ثانیه از سایدبار صدا می‌شد)
        aggregated = base.aggregate(
            total=Count('id'),
            action=Count('id', filter=Q(purpose='action')),
            info=Count('id', filter=Q(purpose='info')),
            comment=Count('id', filter=Q(purpose='comment')),
            pending=Count('id', filter=open_status),
            done=Count('id', filter=Q(status='done')),
            closed=Count('id', filter=~open_status),
            overdue=Count('id', filter=open_status & Q(due_date__lt=today)),
            # «دیده‌نشده» فقط برای ارجاع‌های باز معنا دارد؛ ارجاع‌های تمام‌شده
            # (مثل ارجاع‌های تاریخی واردشده از اکسل) نباید شمارنده را بالا ببرند.
            unseen=Count('id', filter=open_status & Q(seen_at__isnull=True)),
            unseen_all=Count('id', filter=Q(seen_at__isnull=True)),
        )
        counts = {key: value or 0 for key, value in aggregated.items()}

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
        self._require_referral_access(referral, 'view')
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
        self._require_referral_access(referral, 'view')
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
        self._require_referral_access(referral, 'edit')
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
        self._require_referral_access(referral, 'edit')
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
        self._require_referral_access(referral, 'edit')
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
        self._require_referral_access(referral, 'edit')
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


