"""Serializers for the Correspondences module."""
from functools import lru_cache
from urllib.parse import quote

from django.urls import reverse
from rest_framework import serializers

from correspondences.downloads import issue_token
from correspondences.matching import normalize_name
from correspondences.models import IncomingLetter, OutgoingLetter, Announcement, Form, Organization, OrganizationalLetter


@lru_cache(maxsize=1)
def _download_path_template():
    """قالب مسیر دانلود پیوست — ``reverse`` فقط **یک بار** اجرا می‌شود.

    حلقهٔ ``reverse`` در URLconf بزرگ پروژه برای هر پیوست ~۳۰ms هزینه داشت و
    serialize فهرست ۲۰ ردیفی را از ~۴۰ms به ~۷۰۰ms می‌برد.
    """
    try:
        return reverse('letter-attachment-download', args=[0])
    except Exception:                              # noqa: BLE001 — مسیر تعریف نشده
        return ''


def attachment_download_path(attachment_id):
    template = _download_path_template()
    if not template:
        return ''
    placeholder = '/0/download/'
    if placeholder in template:
        return template.replace(placeholder, f'/{attachment_id}/download/', 1)
    return template.replace('/0/', f'/{attachment_id}/', 1)


def _clean(data):
    """Drop empty-string values and file URL strings (not real uploads)."""
    cleaned = {}
    for k, v in data.items():
        if v == '' or v is None:
            continue
        if k == 'file' and isinstance(v, str):
            continue
        cleaned[k] = v
    return cleaned


def _employee_label(employee):
    """«نام و نام خانوادگی (کد پرسنلی)» برای نمایش در جدول و کارتابل."""
    if not employee:
        return ''
    name = getattr(employee, 'full_name', '') or ''
    code = getattr(employee, 'employee_id', '') or ''
    return f'{name} ({code})' if code else name


class IncomingLetterSerializer(serializers.ModelSerializer):
    employee_names = serializers.SerializerMethodField()
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model = IncomingLetter
        fields = '__all__'
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def get_employee_names(self, obj):
        return [e.full_name for e in obj.employees.all()]

    def to_internal_value(self, data):
        return super().to_internal_value(_clean(data))


class OutgoingLetterSerializer(serializers.ModelSerializer):
    employee_names = serializers.SerializerMethodField()
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model = OutgoingLetter
        fields = '__all__'
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def get_employee_names(self, obj):
        return [e.full_name for e in obj.employees.all()]

    def to_internal_value(self, data):
        return super().to_internal_value(_clean(data))


class AnnouncementSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Announcement
        fields = '__all__'
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        return super().to_internal_value(_clean(data))


class FormSerializer(serializers.ModelSerializer):
    class Meta:
        model = Form
        fields = '__all__'
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        return super().to_internal_value(_clean(data))


class OrganizationSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Organization
        fields = '__all__'
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        return super().to_internal_value(_clean(data))


class OrganizationalLetterSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    letter_type_display = serializers.CharField(source='get_letter_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model = OrganizationalLetter
        fields = '__all__'
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        return super().to_internal_value(_clean(data))


# ---------------------------------------------------------------------------
# مکاتبات اداری حرفه‌ای
# ---------------------------------------------------------------------------


class LetterCategorySerializer(serializers.ModelSerializer):
    direction_display = serializers.CharField(source='get_direction_display', read_only=True)
    letter_count = serializers.SerializerMethodField()

    class Meta:
        from correspondences.models import LetterCategory

        model = LetterCategory
        fields = [
            'id', 'name', 'code', 'direction', 'direction_display', 'color', 'description',
            'order', 'is_active', 'letter_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'letter_count']

    def get_letter_count(self, obj):
        return getattr(obj, 'letter_count', None) or obj.letters.count()


class LetterSeriesSerializer(serializers.ModelSerializer):
    direction_display = serializers.CharField(source='get_direction_display', read_only=True)
    preview = serializers.SerializerMethodField()
    letter_count = serializers.SerializerMethodField()
    last_number = serializers.IntegerField(
        write_only=True, required=False, min_value=1,
        help_text='آخرین شمارهٔ مصرف‌شده؛ شمارنده از شمارهٔ بعدی ادامه می‌دهد',
    )

    class Meta:
        from correspondences.models import LetterSeries

        model = LetterSeries
        fields = [
            'id', 'title', 'direction', 'direction_display', 'prefix', 'template',
            'start_number', 'next_number', 'end_number', 'padding', 'reset_yearly',
            'last_year', 'is_default', 'description', 'preview', 'last_number',
            'letter_count', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'last_year', 'preview', 'letter_count', 'created_at', 'updated_at',
        ]

    def get_preview(self, obj):
        from correspondences.numbering import preview_number

        return preview_number(obj)

    def get_letter_count(self, obj):
        count = getattr(obj, 'letter_count', None)
        return count if count is not None else obj.letters.count()

    def validate_template(self, value):
        from correspondences.numbering import NumberingError, validate_template

        try:
            return validate_template(value)
        except NumberingError as exc:
            raise serializers.ValidationError(str(exc)) from exc

    def validate(self, attrs):
        instance = self.instance
        start = attrs.get('start_number', getattr(instance, 'start_number', 1) or 1)
        end = attrs.get('end_number', getattr(instance, 'end_number', None))

        if attrs.get('last_number') is not None:
            attrs['next_number'] = int(attrs['last_number']) + 1
        elif 'start_number' in attrs:
            current_next = attrs.get('next_number', getattr(instance, 'next_number', start) or start)
            if current_next < start:
                attrs['next_number'] = start

        if end is not None and start and int(end) < int(start):
            raise serializers.ValidationError(
                {'end_number': 'شمارهٔ پایان نمی‌تواند کوچک‌تر از شمارهٔ شروع باشد.'},
            )
        return attrs


class CorrespondentSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    letter_count = serializers.SerializerMethodField()

    class Meta:
        from correspondences.models import Correspondent

        model = Correspondent
        fields = [
            'id', 'kind', 'kind_display', 'name', 'title', 'organization', 'organization_name',
            'code', 'national_id', 'phone', 'mobile', 'email', 'address', 'notes',
            'letter_count', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'letter_count',
                            'organization_name', 'kind_display']

    def get_letter_count(self, obj):
        return getattr(obj, 'letter_count', None) or obj.letters.count()


class CorrespondenceNameAliasSerializer(serializers.ModelSerializer):
    """نگاشت نام خام به پرسنل / طرف حساب / مخاطب / سازمان / نوع مکاتبه."""

    employee_name = serializers.SerializerMethodField()
    party_name = serializers.SerializerMethodField()
    correspondent_name = serializers.SerializerMethodField()
    organization_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    target_label = serializers.CharField(read_only=True)
    target_kind_display = serializers.CharField(source='get_target_kind_display', read_only=True)
    scope_display = serializers.CharField(source='get_scope_display', read_only=True)
    applied_scopes = serializers.ReadOnlyField()

    class Meta:
        from correspondences.models import CorrespondenceNameAlias

        model = CorrespondenceNameAlias
        fields = '__all__'
        read_only_fields = [
            'id', 'company', 'normalized', 'applied_count', 'last_applied_at',
            'is_active', 'created_at', 'updated_at',
        ]

    def get_employee_name(self, obj):
        if not obj.employee_id:
            return ''
        return getattr(obj.employee, 'employee_id', '') and (
            f"{obj.employee.full_name} ({obj.employee.employee_id})"
        ) or obj.employee.full_name

    def get_party_name(self, obj):
        return obj.party.name if obj.party_id else ''

    def get_correspondent_name(self, obj):
        return obj.correspondent.name if obj.correspondent_id else ''

    def get_organization_name(self, obj):
        return obj.organization.name if obj.organization_id else ''

    def get_category_name(self, obj):
        return obj.category.name if obj.category_id else ''

    def validate(self, attrs):
        from correspondences.alias_purposes import can_be_bidirectional

        target_kind = attrs.get('target_kind') or getattr(self.instance, 'target_kind', '')
        employee = attrs.get('employee', getattr(self.instance, 'employee', None))
        party = attrs.get('party', getattr(self.instance, 'party', None))
        correspondent = attrs.get(
            'correspondent', getattr(self.instance, 'correspondent', None),
        )
        organization = attrs.get(
            'organization', getattr(self.instance, 'organization', None),
        )
        category = attrs.get('category', getattr(self.instance, 'category', None))
        if target_kind == 'employee' and not employee:
            raise serializers.ValidationError({'employee': 'پرسنل مقصد را انتخاب کنید.'})
        if target_kind == 'party' and not party:
            raise serializers.ValidationError({'party': 'طرف حساب مقصد را انتخاب کنید.'})
        if target_kind == 'correspondent' and not correspondent:
            raise serializers.ValidationError(
                {'correspondent': 'مخاطب مقصد را انتخاب کنید.'},
            )
        if target_kind == 'organization' and not organization:
            raise serializers.ValidationError(
                {'organization': 'سازمان مقصد را انتخاب کنید.'},
            )
        if target_kind == 'category' and not category:
            raise serializers.ValidationError(
                {'category': 'نوع مکاتبهٔ مقصد را انتخاب کنید.'},
            )
        scope = attrs.get('scope') or getattr(self.instance, 'scope', 'any')
        bidirectional = attrs.get(
            'bidirectional', getattr(self.instance, 'bidirectional', False),
        )
        if bidirectional and not can_be_bidirectional(scope):
            raise serializers.ValidationError({
                'bidirectional': 'این نگاشت دو مسیره معنا ندارد؛ '
                                 'دامنهٔ فرستنده یا گیرنده را انتخاب کنید.',
            })
        raw_name = attrs.get('raw_name') or getattr(self.instance, 'raw_name', '')
        normalized = normalize_name(raw_name)
        if not normalized:
            raise serializers.ValidationError({'raw_name': 'نام خام معتبر نیست.'})

        # چند مقصد برای یک نام مجاز است (ارجاع به چند نفر) اما مقصد تکراری نه
        from correspondences.models import CorrespondenceNameAlias

        company = getattr(self.instance, 'company', None) or self.context.get('company')
        if company:
            duplicates = CorrespondenceNameAlias.objects.filter(
                company=company, scope=scope, normalized=normalized,
                target_kind=target_kind,
            )
            if employee:
                duplicates = duplicates.filter(employee=employee)
            elif party:
                duplicates = duplicates.filter(party=party)
            elif correspondent:
                duplicates = duplicates.filter(correspondent=correspondent)
            elif organization:
                duplicates = duplicates.filter(organization=organization)
            elif category:
                duplicates = duplicates.filter(category=category)
            if self.instance:
                duplicates = duplicates.exclude(pk=self.instance.pk)
            if duplicates.exists():
                raise serializers.ValidationError({
                    'raw_name': 'این مقصد برای همین نام قبلاً ثبت شده است؛ مقصد دیگری انتخاب کنید.',
                })
        return attrs


class CorrespondenceNameAliasListSerializer(serializers.ModelSerializer):
    """نسخهٔ سبک فهرست نگاشت‌ها (بدون یادداشت و فیلدهای محاسباتی سنگین).

    همهٔ FKهای برچسب‌ساز در ``get_queryset`` با ``select_related`` خوانده
    می‌شوند؛ بنابراین هر ردیف کوئری اضافه نمی‌زند.
    """

    target_label = serializers.CharField(read_only=True)
    target_kind_display = serializers.CharField(source='get_target_kind_display', read_only=True)
    scope_display = serializers.CharField(source='get_scope_display', read_only=True)
    applied_scopes = serializers.ReadOnlyField()

    class Meta:
        from correspondences.models import CorrespondenceNameAlias

        model = CorrespondenceNameAlias
        fields = [
            'id', 'raw_name', 'normalized', 'scope', 'scope_display', 'target_kind',
            'target_kind_display', 'target_label', 'applied_scopes', 'bidirectional',
            'order', 'applied_count', 'last_applied_at', 'is_active',
        ]


class AttachmentUrlMixin:
    """آدرس امن دانلود/پیش‌نمایش پیوست (توکن امضاشده، بدون افشای مسیر فایل)."""

    def attachment_urls(self, obj):
        request = self.context.get('request')
        if not request or not getattr(obj, 'pk', None):
            return '', ''
        path = attachment_download_path(obj.pk)
        if not path:
            return '', ''
        token = issue_token(getattr(request, 'user', None), obj.pk)
        base = request.build_absolute_uri(path)
        query = f't={quote(token, safe="")}' if token else ''
        download = f'{base}?{query}' if query else base
        preview = f'{download}{"&" if query else "?"}inline=1'
        return download, preview


class LetterAttachmentSerializer(AttachmentUrlMixin, serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    file_url = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()
    preview_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        from correspondences.models import LetterAttachment

        model = LetterAttachment
        fields = [
            'id', 'letter', 'title', 'kind', 'kind_display', 'file', 'file_url',
            'download_url', 'preview_url', 'size', 'uploaded_by', 'uploaded_by_name',
            'created_at',
        ]
        read_only_fields = ['id', 'size', 'uploaded_by', 'created_at', 'file_url',
                            'download_url', 'preview_url', 'kind_display',
                            'uploaded_by_name']
        extra_kwargs = {'file': {'required': True}}

    def get_file_url(self, obj):
        if not obj.file:
            return ''
        request = self.context.get('request')
        try:
            url = obj.file.url
        except ValueError:
            return ''
        return request.build_absolute_uri(url) if request else url

    def get_download_url(self, obj):
        return self.attachment_urls(obj)[0]

    def get_preview_url(self, obj):
        return self.attachment_urls(obj)[1]

    def get_uploaded_by_name(self, obj):
        user = obj.uploaded_by
        if not user:
            return ''
        return user.get_full_name() or user.get_username()


class LetterAttachmentBriefSerializer(AttachmentUrlMixin, serializers.ModelSerializer):
    """نسخهٔ سبک پیوست برای فهرست نامه‌ها (بدون فیلدهای سنگین)."""

    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    file_url = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()
    preview_url = serializers.SerializerMethodField()

    class Meta:
        from correspondences.models import LetterAttachment

        model = LetterAttachment
        fields = ['id', 'title', 'kind', 'kind_display', 'file_url', 'download_url',
                  'preview_url', 'size']
        read_only_fields = fields

    def get_file_url(self, obj):
        if not obj.file:
            return ''
        request = self.context.get('request')
        try:
            url = obj.file.url
        except ValueError:
            return ''
        return request.build_absolute_uri(url) if request else url

    def get_download_url(self, obj):
        return self.attachment_urls(obj)[0] or self.get_file_url(obj)

    def get_preview_url(self, obj):
        return self.attachment_urls(obj)[1] or self.get_file_url(obj)


class LetterReferralBriefSerializer(serializers.ModelSerializer):
    """نسخهٔ سبک ارجاع (برای خلاصهٔ آخرین ارجاع در فهرست)."""

    status_display = serializers.CharField(source='get_status_display', read_only=True)
    purpose_display = serializers.CharField(source='get_purpose_display', read_only=True)
    to_user_name = serializers.SerializerMethodField()
    to_employee_name = serializers.CharField(source='to_employee.full_name', read_only=True)
    target_label = serializers.SerializerMethodField()

    class Meta:
        from correspondences.models import LetterReferral

        model = LetterReferral
        fields = [
            'id', 'seq', 'status', 'status_display', 'purpose', 'purpose_display',
            'to_name', 'to_user_name', 'to_employee_name', 'target_label',
            'referred_on', 'due_date', 'instruction',
        ]
        read_only_fields = fields

    def get_to_user_name(self, obj):
        user = obj.to_user
        if not user:
            return ''
        return user.get_full_name() or user.get_username()

    def get_target_label(self, obj):
        """برچسب گیرنده بدون خواندن M2M (برای جلوگیری از کوئری به‌ازای هر ردیف)."""
        names = []
        if obj.to_user_id:
            names.append(self.get_to_user_name(obj))
        if obj.to_employee_id and obj.to_employee:
            names.append(obj.to_employee.full_name)
        if not names and obj.to_name:
            names.append(obj.to_name)
        unique = list(dict.fromkeys(name for name in names if name))
        return '، '.join(unique) if unique else '—'


class LetterReferralSerializer(serializers.ModelSerializer):
    from_user_name = serializers.SerializerMethodField()
    to_user_name = serializers.SerializerMethodField()
    answered_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    purpose_display = serializers.CharField(source='get_purpose_display', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    letter_number = serializers.CharField(source='letter.number', read_only=True)
    letter_subject = serializers.CharField(source='letter.subject', read_only=True)
    letter_direction = serializers.CharField(source='letter.direction', read_only=True)
    letter_priority = serializers.CharField(source='letter.priority', read_only=True)
    letter_status = serializers.CharField(source='letter.status', read_only=True)
    to_employee_name = serializers.CharField(source='to_employee.full_name', read_only=True)
    to_employee_code = serializers.CharField(source='to_employee.employee_id', read_only=True)
    to_employees_names = serializers.SerializerMethodField()
    from_employee_name = serializers.CharField(source='from_employee.full_name', read_only=True)
    target_label = serializers.CharField(read_only=True)

    class Meta:
        from correspondences.models import LetterReferral

        model = LetterReferral
        fields = [
            'id', 'letter', 'letter_number', 'letter_subject', 'letter_direction',
            'letter_priority', 'letter_status', 'seq', 'parent', 'purpose', 'purpose_display',
            'from_user', 'from_user_name', 'from_employee', 'from_employee_name',
            'to_user', 'to_user_name', 'to_employee', 'to_employee_name', 'to_employee_code',
            'to_employees', 'to_employees_names',
            'to_name', 'target_label', 'referred_on', 'due_date', 'instruction', 'note',
            'margin_note', 'seen_at', 'status', 'status_display', 'response', 'result',
            'result_note', 'answered_on', 'answered_by', 'answered_by_name', 'done_at',
            'is_overdue', 'created_at',
        ]
        read_only_fields = [
            'id', 'seq', 'referred_on', 'done_at', 'created_at', 'answered_by_name',
            'from_user_name', 'to_user_name', 'status_display', 'purpose_display',
            'is_overdue', 'letter_number', 'letter_subject', 'letter_direction',
            'letter_priority', 'letter_status', 'to_employee_name', 'to_employee_code',
            'from_employee_name', 'target_label', 'to_employees_names',
        ]

    def get_to_employees_names(self, obj):
        return [employee.full_name for employee in obj.to_employees.all()]

    @staticmethod
    def _name(user):
        if not user:
            return ''
        return user.get_full_name() or user.get_username()

    def get_from_user_name(self, obj):
        return self._name(obj.from_user)

    def get_to_user_name(self, obj):
        return self._name(obj.to_user) or _employee_label(obj.to_employee)

    def get_answered_by_name(self, obj):
        return self._name(obj.answered_by)


class LetterEventSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    actor_name = serializers.SerializerMethodField()

    class Meta:
        from correspondences.models import LetterEvent

        model = LetterEvent
        fields = ['id', 'letter', 'action', 'action_display', 'actor', 'actor_name', 'note',
                  'meta', 'created_at']
        read_only_fields = fields

    def get_actor_name(self, obj):
        user = obj.actor
        if not user:
            return ''
        return user.get_full_name() or user.get_username()


class LetterSerializer(serializers.ModelSerializer):
    """سریالایزر کامل نامه: مشخصات + ارجاعات + پیوست‌ها + تاریخچه + فیلدهای محاسباتی."""

    direction_display = serializers.CharField(source='get_direction_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    confidentiality_display = serializers.CharField(
        source='get_confidentiality_display', read_only=True,
    )
    category_title = serializers.CharField(source='category.name', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)
    series_title = serializers.CharField(source='series.title', read_only=True)
    contract_title = serializers.CharField(source='contract.subject', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    correspondent_name = serializers.CharField(source='correspondent.name', read_only=True)
    sender_organization_name = serializers.CharField(
        source='sender_organization.name', read_only=True,
    )
    delivery_type_display = serializers.CharField(
        source='get_delivery_type_display', read_only=True,
    )
    delivered_by_label = serializers.SerializerMethodField()
    sender_employee_label = serializers.SerializerMethodField()
    receiver_employee_label = serializers.SerializerMethodField()
    sender_party_name = serializers.CharField(source='sender_party.name', read_only=True)
    party_account_name = serializers.CharField(source='party_account.name', read_only=True)
    sender_label = serializers.SerializerMethodField()
    party_label = serializers.SerializerMethodField()
    receiver_label = serializers.SerializerMethodField()
    entry_method_display = serializers.CharField(
        source='get_entry_method_display', read_only=True,
    )
    entered_by_label = serializers.SerializerMethodField()
    drafter_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    reply_number = serializers.CharField(source='reply_to.number', read_only=True)
    attachments = LetterAttachmentSerializer(many=True, read_only=True)
    referrals = LetterReferralSerializer(many=True, read_only=True)
    events = LetterEventSerializer(many=True, read_only=True)
    attachment_count = serializers.SerializerMethodField()
    referral_count = serializers.SerializerMethodField()
    reply_count = serializers.SerializerMethodField()
    pending_referrals = serializers.SerializerMethodField()
    last_referral = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)
    days_to_due = serializers.IntegerField(read_only=True)

    class Meta:
        from correspondences.models import Letter

        model = Letter
        fields = [
            'id', 'direction', 'direction_display', 'number', 'external_number', 'indicator_no',
            'transmittal_no', 'series', 'series_title', 'category', 'category_title', 'category_color',
            'subject', 'summary', 'body',
            'letter_date', 'received_date', 'sent_date', 'due_date',
            'entry_method', 'entry_method_display', 'entry_time', 'entered_by', 'entered_by_label',
            'entered_by_name', 'company_reg_no', 'company_reg_date', 'unit_reg_no',
            'unit_reg_date', 'unit_name',
            'organization', 'organization_name', 'correspondent', 'correspondent_name',
            'sender_organization', 'sender_organization_name', 'sender_title',
            'sender_name', 'receiver_name', 'drafter', 'drafter_name', 'source_ref', 'created_by',
            'sender_employee', 'sender_employee_label', 'receiver_employee',
            'receiver_employee_label', 'sender_party', 'sender_party_name', 'party_account',
            'party_account_name', 'party_name', 'sender_kind', 'sender_label', 'party_label',
            'receiver_label',
            'delivery_type', 'delivery_type_display', 'delivered_by', 'delivered_by_label',
            'delivered_by_name',
            'created_by_name', 'priority', 'priority_display', 'confidentiality',
            'confidentiality_display', 'status', 'status_display',
            'amount', 'currency', 'archive_ref', 'contract_number', 'contract',
            'contract_title', 'tags',
            'reply_to', 'reply_number', 'closed_at', 'archived_at',
            'attachments', 'referrals', 'events',
            'attachment_count', 'referral_count', 'reply_count', 'pending_referrals',
            'last_referral', 'is_overdue', 'days_to_due', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_by', 'created_by_name', 'closed_at', 'archived_at',
            'direction_display', 'status_display', 'priority_display', 'confidentiality_display',
            'category_title', 'category_color', 'series_title', 'organization_name',
            'correspondent_name', 'sender_organization_name', 'entry_method_display',
            'entered_by_label', 'drafter_name', 'reply_number', 'source_ref', 'attachment_count',
            'contract_title',
            'referral_count', 'reply_count', 'pending_referrals', 'last_referral',
            'is_overdue', 'days_to_due', 'created_at', 'updated_at',
            'delivery_type_display', 'delivered_by_label', 'sender_employee_label',
            'receiver_employee_label', 'sender_party_name', 'party_account_name',
            'sender_label', 'party_label', 'receiver_label',
        ]

    @staticmethod
    def _user_name(user):
        if not user:
            return ''
        return user.get_full_name() or user.get_username()

    def get_entered_by_label(self, obj):
        return obj.entered_by_name or self._user_name(obj.entered_by)

    def get_drafter_name(self, obj):
        return obj.drafter_name or self._user_name(obj.drafter)

    def get_created_by_name(self, obj):
        return self._user_name(obj.created_by)

    def get_delivered_by_label(self, obj):
        return obj.delivered_by_name or _employee_label(obj.delivered_by)

    def get_sender_employee_label(self, obj):
        return _employee_label(obj.sender_employee)

    def get_receiver_employee_label(self, obj):
        return _employee_label(obj.receiver_employee)

    def get_sender_label(self, obj):
        return obj.sender_display()

    def get_party_label(self, obj):
        return obj.party_display

    def get_receiver_label(self, obj):
        return obj.receiver_display()

    def get_attachment_count(self, obj):
        cached = getattr(obj, '_prefetched_objects_cache', {}).get('attachments')
        return len(cached) if cached is not None else obj.attachments.count()

    def get_referral_count(self, obj):
        cached = getattr(obj, '_prefetched_objects_cache', {}).get('referrals')
        return len(cached) if cached is not None else obj.referrals.count()

    def get_reply_count(self, obj):
        cached = getattr(obj, '_prefetched_objects_cache', {}).get('replies')
        return len(cached) if cached is not None else obj.replies.count()

    def get_pending_referrals(self, obj):
        cached = getattr(obj, '_prefetched_objects_cache', {}).get('referrals')
        rows = cached if cached is not None else obj.referrals.all()
        return sum(1 for row in rows if row.status in ('pending', 'in_progress'))

    def get_last_referral(self, obj):
        cached = getattr(obj, '_prefetched_objects_cache', {}).get('referrals')
        rows = list(cached) if cached is not None else list(obj.referrals.all())
        if not rows:
            return None
        latest = max(rows, key=lambda row: (row.seq or 0, row.id or 0))
        return LetterReferralSerializer(latest, context=self.context).data

    def to_internal_value(self, data):
        return super().to_internal_value(_clean(data))

    def validate(self, attrs):
        direction = attrs.get('direction', getattr(self.instance, 'direction', None))
        category = attrs.get('category', getattr(self.instance, 'category', None))
        if category and direction and category.direction not in ('both', direction):
            raise serializers.ValidationError(
                {'category': 'این نوع مکاتبه با جهت انتخاب‌شده هم‌خوان نیست.'}
            )
        amount = attrs.get('amount', getattr(self.instance, 'amount', None))
        if amount is not None and amount < 0:
            raise serializers.ValidationError({'amount': 'مبلغ نمی‌تواند منفی باشد.'})
        return attrs


class LetterListSerializer(LetterSerializer):
    """فهرست سبک نامه‌ها برای جدول‌ها.

    برخلاف ``LetterSerializer`` متن کامل نامه، تاریخچه، ارجاعات کامل و فیلدهای
    پرهزینه (پرسنل/کاربران/پاسخ) را برنمی‌گرداند؛ در نتیجه هم حجم پاسخ و هم
    تعداد joinها و کوئری‌های جدول صفحه‌بندی‌شده به‌شدت کم می‌شود.
    """

    attachments = LetterAttachmentBriefSerializer(many=True, read_only=True)
    last_referral = serializers.SerializerMethodField()

    class Meta(LetterSerializer.Meta):
        fields = [
            'id', 'direction', 'direction_display', 'number', 'external_number',
            'indicator_no', 'transmittal_no', 'series', 'category',
            'category_title', 'subject', 'summary',
            'letter_date', 'received_date', 'sent_date', 'due_date',
            'entry_method', 'entry_method_display', 'entry_time',
            'entered_by_label', 'entered_by_name', 'company_reg_no', 'company_reg_date',
            'unit_reg_no', 'unit_reg_date', 'unit_name',
            'organization', 'organization_name', 'correspondent', 'correspondent_name',
            'sender_organization', 'sender_organization_name', 'sender_title',
            'sender_name', 'receiver_name', 'contract_number',
            'sender_party', 'party_account', 'party_account_name', 'sender_party_name',
            'party_name', 'sender_kind',
            'delivery_type', 'delivery_type_display', 'delivered_by_name',
            'priority', 'priority_display', 'confidentiality', 'confidentiality_display',
            'status', 'status_display', 'amount', 'currency', 'archive_ref', 'tags',
            'attachments', 'attachment_count', 'referral_count',
            'last_referral', 'is_overdue', 'days_to_due', 'is_active',
            'created_at', 'updated_at',
            'sender_label', 'party_label', 'receiver_label',
        ]
        read_only_fields = LetterSerializer.Meta.read_only_fields

    def get_sender_label(self, obj):
        """نسخهٔ سبک: بدون خواندن FK پرسنل."""
        return obj.sender_display(include_employee=False)

    def get_receiver_label(self, obj):
        return obj.receiver_display(include_employee=False)

    def get_last_referral(self, obj):
        cached = getattr(obj, '_prefetched_objects_cache', {}).get('referrals')
        rows = list(cached) if cached is not None else []
        if not rows:
            return None
        latest = max(rows, key=lambda row: (row.seq or 0, row.id or 0))
        return LetterReferralBriefSerializer(latest, context=self.context).data


class LetterRequestTypeSerializer(serializers.ModelSerializer):
    """نوع درخواست کارتابل (مرخصی، وام، گواهی اشتغال ...)."""

    class Meta:
        from correspondences.models import LetterRequestType

        model = LetterRequestType
        fields = [
            'id', 'code', 'name', 'icon', 'color', 'description', 'requires_attachment',
            'approval_levels', 'order', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class LetterRequestEventSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    actor_name = serializers.SerializerMethodField()

    class Meta:
        from correspondences.models import LetterRequestEvent

        model = LetterRequestEvent
        fields = ['id', 'request', 'action', 'action_display', 'actor', 'actor_name',
                  'note', 'meta', 'created_at']
        read_only_fields = fields

    def get_actor_name(self, obj):
        user = obj.actor
        if not user:
            return ''
        return user.get_full_name() or user.get_username()


class LetterRequestSerializer(serializers.ModelSerializer):
    """درخواست کارتابل: مشخصات، گردش‌کار و تاریخچه."""

    request_type_title_display = serializers.CharField(
        source='request_type.name', read_only=True,
    )
    request_type_color = serializers.CharField(source='request_type.color', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    requester_employee_name = serializers.CharField(
        source='requester_employee.full_name', read_only=True,
    )
    requester_employee_code = serializers.CharField(
        source='requester_employee.employee_id', read_only=True,
    )
    requester_display = serializers.SerializerMethodField()
    assignee_name = serializers.SerializerMethodField()
    is_open = serializers.BooleanField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    events = LetterRequestEventSerializer(many=True, read_only=True)

    class Meta:
        from correspondences.models import LetterRequest

        model = LetterRequest
        fields = [
            'id', 'number', 'request_type', 'request_type_title', 'request_type_title_display',
            'request_type_color', 'subject', 'description', 'requester', 'requester_name',
            'requester_employee', 'requester_employee_name', 'requester_employee_code',
            'requester_display', 'status', 'status_display', 'priority', 'priority_display',
            'requested_on', 'due_date', 'payload', 'current_step', 'total_steps',
            'current_assignee', 'current_assignee_employee', 'assignee_name',
            'decided_on', 'decision_note', 'attachment', 'closed_at',
            'is_open', 'is_overdue', 'events', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'number', 'requester', 'requester_name', 'current_step', 'decided_on',
            'closed_at', 'is_open', 'is_overdue', 'events', 'created_at', 'updated_at',
            'request_type_color', 'status_display', 'priority_display',
            'requester_employee_name', 'requester_employee_code', 'requester_display',
            'assignee_name', 'request_type_title_display',
        ]

    @staticmethod
    def _user_name(user):
        if not user:
            return ''
        return user.get_full_name() or user.get_username()

    def get_requester_display(self, obj):
        return _employee_label(obj.requester_employee) or obj.requester_name \
            or self._user_name(obj.requester)

    def get_assignee_name(self, obj):
        return _employee_label(obj.current_assignee_employee) or self._user_name(obj.current_assignee)

    def to_internal_value(self, data):
        return super().to_internal_value(_clean(data))

    def validate(self, attrs):
        request_type = attrs.get('request_type', getattr(self.instance, 'request_type', None))
        attachment = attrs.get('attachment', getattr(self.instance, 'attachment', None))
        if request_type and request_type.requires_attachment and not attachment:
            raise serializers.ValidationError({'attachment': 'این نوع درخواست نیازمند پیوست است.'})
        return attrs

