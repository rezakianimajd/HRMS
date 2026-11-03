"""Serializers for the Correspondences module."""
from rest_framework import serializers
from correspondences.models import IncomingLetter, OutgoingLetter, Announcement, Form, Organization, OrganizationalLetter


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

    class Meta:
        from correspondences.models import LetterSeries

        model = LetterSeries
        fields = [
            'id', 'title', 'direction', 'direction_display', 'prefix', 'template',
            'next_number', 'padding', 'reset_yearly', 'last_year', 'is_default',
            'preview', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'last_year', 'preview', 'created_at', 'updated_at']

    def get_preview(self, obj):
        from correspondences.numbering import preview_number

        return preview_number(obj)


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


class LetterAttachmentSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    file_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        from correspondences.models import LetterAttachment

        model = LetterAttachment
        fields = [
            'id', 'letter', 'title', 'kind', 'kind_display', 'file', 'file_url', 'size',
            'uploaded_by', 'uploaded_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'size', 'uploaded_by', 'created_at', 'file_url',
                            'kind_display', 'uploaded_by_name']
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

    def get_uploaded_by_name(self, obj):
        user = obj.uploaded_by
        if not user:
            return ''
        return user.get_full_name() or user.get_username()


class LetterReferralSerializer(serializers.ModelSerializer):
    from_user_name = serializers.SerializerMethodField()
    to_user_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    letter_number = serializers.CharField(source='letter.number', read_only=True)
    letter_subject = serializers.CharField(source='letter.subject', read_only=True)

    class Meta:
        from correspondences.models import LetterReferral

        model = LetterReferral
        fields = [
            'id', 'letter', 'letter_number', 'letter_subject', 'seq', 'from_user', 'from_user_name',
            'to_user', 'to_user_name', 'to_name', 'referred_on', 'due_date', 'note', 'status',
            'status_display', 'result_note', 'done_at', 'is_overdue', 'created_at',
        ]
        read_only_fields = ['id', 'seq', 'referred_on', 'done_at', 'created_at',
                            'from_user_name', 'to_user_name', 'status_display', 'is_overdue',
                            'letter_number', 'letter_subject']

    @staticmethod
    def _name(user):
        if not user:
            return ''
        return user.get_full_name() or user.get_username()

    def get_from_user_name(self, obj):
        return self._name(obj.from_user)

    def get_to_user_name(self, obj):
        return self._name(obj.to_user)


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
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    correspondent_name = serializers.CharField(source='correspondent.name', read_only=True)
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
            'organization', 'organization_name', 'correspondent', 'correspondent_name',
            'sender_name', 'receiver_name', 'drafter', 'drafter_name', 'created_by',
            'created_by_name', 'priority', 'priority_display', 'confidentiality',
            'confidentiality_display', 'status', 'status_display',
            'amount', 'currency', 'archive_ref', 'contract_number', 'tags',
            'reply_to', 'reply_number', 'closed_at', 'archived_at',
            'attachments', 'referrals', 'events',
            'attachment_count', 'referral_count', 'reply_count', 'pending_referrals',
            'last_referral', 'is_overdue', 'days_to_due', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_by', 'created_by_name', 'closed_at', 'archived_at',
            'direction_display', 'status_display', 'priority_display', 'confidentiality_display',
            'category_title', 'category_color', 'series_title', 'organization_name',
            'correspondent_name', 'drafter_name', 'reply_number', 'attachment_count',
            'referral_count', 'reply_count', 'pending_referrals', 'last_referral',
            'is_overdue', 'days_to_due', 'created_at', 'updated_at',
        ]

    @staticmethod
    def _user_name(user):
        if not user:
            return ''
        return user.get_full_name() or user.get_username()

    def get_drafter_name(self, obj):
        return self._user_name(obj.drafter)

    def get_created_by_name(self, obj):
        return self._user_name(obj.created_by)

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


