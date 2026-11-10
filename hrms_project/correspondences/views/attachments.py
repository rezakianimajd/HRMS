"""پیوست‌های نامه: بارگذاری امن، دانلود با توکن و حذف."""
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
from django.http import StreamingHttpResponse

from correspondences.downloads import PREVIEW_HEADERS, iter_chunks, parse_range


class LetterAttachmentViewSet(CorrespondencePermissionMixin, BaseLetterViewSet):
    """پیوست‌های نامه: فهرست، بارگذاری امن، دانلود با توکن و حذف با مجوز."""

    permission_label = 'پیوست مکاتبات'
    permission_matrix = {
        'list': ('view', 'attachments'),
        'retrieve': ('view', 'attachments'),
        'create': ('edit', 'attachments'),
        'update': ('edit', 'attachments'),
        'partial_update': ('edit', 'attachments'),
        'destroy': ('delete', 'attachments'),
    }

    serializer_class = LetterAttachmentSerializer
    queryset = LetterAttachment.objects.all()
    ordering = ['-created_at']

    def _letter_direction_for_request(self):
        letter_id = None
        if self.action == 'create':
            letter_id = (getattr(self.request, 'data', {}) or {}).get('letter')
        else:
            pk = self.kwargs.get('pk')
            if pk:
                letter_id = LetterAttachment.objects.filter(pk=pk).values_list(
                    'letter_id', flat=True,
                ).first()
        if not letter_id:
            return None
        return Letter.objects.filter(pk=letter_id).values_list(
            'direction', flat=True,
        ).first()

    def get_queryset(self):
        qs = super().get_queryset().select_related('letter', 'uploaded_by')
        qs = qs.filter(confidential_letter_filter(self.request.user, prefix='letter__'))
        letter_id = self.request.query_params.get('letter')
        if letter_id:
            qs = qs.filter(letter_id=letter_id)
        return qs

    def perform_create(self, serializer):
        from django.core.exceptions import ValidationError as DjangoValidationError

        upload = self.request.FILES.get('file')
        try:
            validate_attachment(upload)
        except DjangoValidationError as error:
            raise serializers.ValidationError({'file': error.messages}) from error
        upload.name = stored_filename(upload)
        serializer.save(
            company=_get_company(self.request),
            size=getattr(upload, 'size', 0),
            uploaded_by=getattr(self.request, 'user', None),
        )

    def perform_destroy(self, instance):
        file_name = instance.file.name if getattr(instance, 'file', None) else ''
        super().perform_destroy(instance)
        _delete_media_file(file_name)

    @action(
        detail=True, methods=['get'], url_path='download',
        permission_classes=[AllowAny], authentication_classes=[JWTAuthentication],
    )
    def download(self, request, pk=None):
        """دانلود/پیش‌نمایش پیوست با توکن امضاشده یا JWT (کنترل محرمانگی و مجوز)."""
        attachment = LetterAttachment.objects.select_related('letter').filter(pk=pk).first()
        company = _get_company(request)
        if not attachment or (
            company and attachment.letter.company_id != getattr(company, 'pk', company)
        ):
            raise Http404('پیوست یافت نشد.')

        user = request.user if getattr(request.user, 'is_authenticated', False) else None
        if user is None:
            data = read_token(request.query_params.get('t'))
            if not data:
                raise PermissionDenied('لینک دانلود نامعتبر یا منقضی شده است.')
            user_id, attachment_id = data
            if attachment_id != attachment.pk:
                raise PermissionDenied('لینک دانلود با این پیوست هم‌خوان نیست.')
            from django.contrib.auth import get_user_model

            user = get_user_model().objects.filter(pk=user_id, is_active=True).first()
            if user is None:
                raise PermissionDenied('کاربر لینک دانلود معتبر نیست.')

        if not can_read_confidential(user, attachment.letter):
            raise PermissionDenied('دسترسی به فایل نامهٔ محرمانه/سری مجاز نیست.')
        if not can_download_attachment(user, attachment):
            raise PermissionDenied('برای دریافت این پیوست مجوز «مشاهده» لازم است.')

        storage_name = getattr(attachment.file, 'name', '') or ''
        if not storage_name:
            raise Http404('فایل روی سرور یافت نشد.')
        try:
            handle = attachment.file.open('rb')
        except Exception as error:                      # noqa: BLE001 — فایل جابه‌جا شده
            raise Http404('فایل روی سرور یافت نشد.') from error

        inline = _truthy(request.query_params.get('inline')) and is_inline_safe(storage_name)
        file_name = storage_name.rsplit('/', 1)[-1] or 'attachment'
        content_type = content_type_of(file_name)
        try:
            size = attachment.file.size
        except (OSError, ValueError):
            size = 0

        # نمایشگر PDF مرورگر برای فایل بزرگ درخواست بازه‌ای (Range) می‌فرستد
        chunk = parse_range(request.headers.get('Range'), size) if inline else None
        if chunk:
            start, end = chunk
            handle.seek(start)
            response = StreamingHttpResponse(
                iter_chunks(handle, end - start + 1),
                status=206, content_type=content_type,
            )
            response['Content-Range'] = f'bytes {start}-{end}/{size}'
            response['Content-Length'] = str(end - start + 1)
            if not inline:
                response['Content-Disposition'] = f'attachment; filename="{file_name}"'
        else:
            response = FileResponse(handle, as_attachment=not inline, filename=file_name)
            response['Content-Type'] = content_type
            if not inline:
                response['Content-Disposition'] = f'attachment; filename="{file_name}"'

        response['X-Content-Type-Options'] = 'nosniff'
        response['Accept-Ranges'] = 'bytes'
        response['Cache-Control'] = 'private, max-age=600'
        for header, value in PREVIEW_HEADERS.items():
            response[header] = value
        return response


