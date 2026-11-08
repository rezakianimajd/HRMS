"""کارتابل درخواست‌های پرسنل."""
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


class LetterRequestTypeViewSet(BaseLetterViewSet):
    """انواع درخواست کارتابل (مرخصی، وام، گواهی اشتغال ...)."""

    serializer_class = LetterRequestTypeSerializer
    queryset = LetterRequestType.objects.all()
    search_fields = ['name', 'code', 'description']
    ordering = ['order', 'name']


class LetterRequestViewSet(CorrespondencePermissionMixin, BaseLetterViewSet):
    """کارتابل درخواست‌های پرسنل: ثبت، مشاهده، ارجاع، تأیید/رد و لغو."""

    permission_label = 'درخواست‌های کارتابل مکاتبات'
    permission_matrix = {
        'update': ('edit', 'requests'),
        'partial_update': ('edit', 'requests'),
        'destroy': ('delete', 'requests'),
        'approve': ('approve', 'requests'),
        'reject': ('approve', 'requests'),
        'assign': ('approve', 'requests'),
    }

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

        # کاربران بدون مجوز «مشاهدهٔ کارتابل درخواست‌ها» فقط درخواست‌های خودشان را می‌بینند
        if not correspondence_has_permission(user, 'view', menus=REQUESTS_MENUS):
            if user and user.is_authenticated:
                qs = qs.filter(requester=user)
            else:
                qs = qs.none()

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






    def _require_own_request(self, instance):
        """لغو/ثبت درخواست فقط توسط درخواست‌دهنده یا دارندهٔ مجوز ویرایش."""
        user = getattr(self.request, 'user', None)
        if instance.requester_id and instance.requester_id == getattr(user, 'id', None):
            return
        require_correspondence(
            user, 'edit', menus=REQUESTS_MENUS, label='درخواست‌های کارتابل',
        )

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """ثبت نهایی درخواست پیش‌نویس."""
        instance = self.get_object()
        self._require_own_request(instance)
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
        self._require_own_request(instance)
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

