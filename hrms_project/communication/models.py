"""مدل‌های ماژول «گفتگوی سازمانی» (Chat).

اصل معماری: چت **مالک داده‌های کسب‌وکار نیست**؛ فقط به رکوردهای سایر ماژول‌ها
Reference می‌دهد (``MessageEntityRef``) و «لایهٔ ارتباطی» روی داده‌های Kian است.

- ``Conversation``       : گفتگو (خصوصی / گروهی / کانال / سیستمی)
- ``ConversationMember`` : عضویت، نقش، شمارندهٔ خوانده‌شده و تنظیم اعلان
- ``Message``            : پیام با بدنهٔ **رمزنگاری‌شده** + ایندکس کور برای جست‌وجو
- ``MessageAttachment``  : پیوست (با ارجاع اختیاری به سند DMS برای جلوگیری از تکرار فایل)
- ``MessageEntityRef``   : ارجاع به قرارداد/پروژه/سند/مکاتبه/… بدون کپی داده
- ``MessageMention``     : منشن کاربران
- ``MessageReceipt``     : وضعیت تحویل/خواندن هر کاربر
- ``ChatAuditLog``       : تاریخچهٔ ویرایش/حذف (قابل حسابرسی)
- ``ChatEvent``          : Outbox رویدادها برای Real-time (امروز Poll، بعداً Channels)
"""
from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.models.base_model import BaseModel


def _user_fk(related_name, verbose_name):
    return models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name=related_name, db_constraint=False, verbose_name=verbose_name,
    )


class Conversation(BaseModel):
    """یک گفتگو؛ نوع آن رفتار مجوز و نمایش را تعیین می‌کند."""

    class Kind(models.TextChoices):
        DIRECT = 'direct', _('خصوصی')
        GROUP = 'group', _('گروهی')
        CHANNEL = 'channel', _('کانال')
        SYSTEM = 'system', _('سیستمی')

    class Status(models.TextChoices):
        ACTIVE = 'active', _('فعال')
        ARCHIVED = 'archived', _('بایگانی‌شده')
        CLOSED = 'closed', _('بسته‌شده')

    class PostPolicy(models.TextChoices):
        MEMBERS = 'members', _('همهٔ اعضا')
        ADMINS = 'admins', _('فقط مدیران')

    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.GROUP,
                            verbose_name=_('نوع گفتگو'))
    title = models.CharField(max_length=180, blank=True, verbose_name=_('عنوان'))
    description = models.TextField(blank=True, verbose_name=_('توضیح'))
    color = models.CharField(max_length=20, blank=True, verbose_name=_('رنگ'))
    icon = models.CharField(max_length=40, blank=True, verbose_name=_('آیکن'))
    is_public = models.BooleanField(
        default=False, verbose_name=_('عمومی'),
        help_text=_('کانال عمومی: کاربران می‌توانند خودشان عضو شوند.'),
    )
    post_policy = models.CharField(
        max_length=12, choices=PostPolicy.choices, default=PostPolicy.MEMBERS,
        verbose_name=_('چه کسی می‌تواند پیام بفرستد'),
    )
    # پیوند با موجودیت کسب‌وکار (اختیاری) — چت داده را کپی نمی‌کند.
    related_module = models.CharField(max_length=40, blank=True, db_index=True,
                                      verbose_name=_('ماژول مرتبط'))
    related_object_type = models.CharField(max_length=60, blank=True,
                                           verbose_name=_('نوع موجودیت مرتبط'))
    related_object_id = models.CharField(max_length=60, blank=True,
                                         verbose_name=_('شناسهٔ موجودیت مرتبط'))
    related_label = models.CharField(max_length=200, blank=True,
                                     verbose_name=_('برچسب موجودیت مرتبط'))

    created_by = _user_fk('created_chat_conversations', _('سازنده'))
    last_message_at = models.DateTimeField(null=True, blank=True, db_index=True,
                                           verbose_name=_('آخرین پیام'))
    message_count = models.PositiveIntegerField(default=0, verbose_name=_('تعداد پیام'))
    direct_key = models.CharField(
        max_length=64, blank=True, db_index=True, verbose_name=_('کلید گفتگوی خصوصی'),
        help_text=_('شناسه‌های مرتب‌شدهٔ دو کاربر؛ برای جلوگیری از گفتگوی تکراری.'),
    )
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ACTIVE,
                              verbose_name=_('وضعیت'))
    settings = models.JSONField(default=dict, blank=True, verbose_name=_('تنظیمات'),
                                help_text=_('مثلاً retention_days برای نگهداری پیام‌ها.'))

    class Meta:
        verbose_name = _('گفتگو')
        verbose_name_plural = _('گفتگوها')
        ordering = ['-last_message_at', '-created_at']
        indexes = [
            models.Index(fields=['company', 'kind']),
            models.Index(fields=['company', 'related_module', 'related_object_id']),
        ]

    def __str__(self):
        return self.title or f'گفتگو #{self.pk}'

    @property
    def display_title(self):
        return self.title or f'گفتگو #{self.pk}'


class ConversationMember(BaseModel):
    """عضویت کاربر در گفتگو + وضعیت خواندن و اعلان."""

    class Role(models.TextChoices):
        OWNER = 'owner', _('مالک')
        ADMIN = 'admin', _('مدیر')
        MEMBER = 'member', _('عضو')
        GUEST = 'guest', _('ميهمان')

    class Notify(models.TextChoices):
        ALL = 'all', _('همهٔ پیام‌ها')
        MENTIONS = 'mentions', _('فقط منشن‌ها')
        MUTED = 'muted', _('بی‌صدا')

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE,
                                     related_name='members', verbose_name=_('گفتگو'))
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name='chat_memberships', db_constraint=False,
                             verbose_name=_('کاربر'))
    role = models.CharField(max_length=12, choices=Role.choices, default=Role.MEMBER,
                            verbose_name=_('نقش'))
    joined_at = models.DateTimeField(default=timezone.now, verbose_name=_('تاریخ عضویت'))
    last_read_message = models.ForeignKey(
        'communication.Message', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', db_constraint=False, verbose_name=_('آخرین پیام خوانده‌شده'),
    )
    last_read_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان آخرین خواندن'))
    notify = models.CharField(max_length=12, choices=Notify.choices, default=Notify.ALL,
                              verbose_name=_('اعلان'))
    muted_until = models.DateTimeField(null=True, blank=True, verbose_name=_('بی‌صدا تا'))
    is_pinned = models.BooleanField(default=False, verbose_name=_('سنجاق‌شده'))
    is_archived = models.BooleanField(default=False, verbose_name=_('بایگانی‌شده'))

    class Meta:
        verbose_name = _('عضو گفتگو')
        verbose_name_plural = _('اعضای گفتگو')
        ordering = ['joined_at']
        constraints = [
            models.UniqueConstraint(fields=['conversation', 'user'], name='uniq_chat_member'),
        ]

    def __str__(self):
        return f'{self.conversation_id} · {self.user_id}'

    @property
    def is_privileged(self):
        return self.role in (self.Role.OWNER, self.Role.ADMIN)



class Message(BaseModel):
    """یک پیام؛ ``body`` همیشه **رمزنگاری‌شده** ذخیره می‌شود."""

    class Kind(models.TextChoices):
        TEXT = 'text', _('متن')
        SYSTEM = 'system', _('سیستمی')
        FILE = 'file', _('فایل')
        EVENT = 'event', _('رویداد')

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE,
                                     related_name='messages', verbose_name=_('گفتگو'))
    sender = _user_fk('chat_messages', _('فرستنده'))
    sender_name = models.CharField(
        max_length=150, blank=True, verbose_name=_('نام فرستنده'),
        help_text=_('برای پیام‌های سیستمی یا وقتی کاربر حذف شده باشد.'),
    )
    kind = models.CharField(max_length=12, choices=Kind.choices, default=Kind.TEXT,
                            verbose_name=_('نوع پیام'))
    body = models.TextField(verbose_name=_('متن (رمزنگاری‌شده)'))
    body_length = models.PositiveIntegerField(default=0, verbose_name=_('طول متن'))
    search_tokens = models.TextField(
        blank=True, verbose_name=_('ایندکس کور جست‌وجو'),
        help_text=_('HMAC واژه‌ها؛ متن اصلی قابل بازیابی نیست ولی جست‌وجو ممکن است.'),
    )
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True,
                                 related_name='replies', db_constraint=False,
                                 verbose_name=_('پاسخ به'))
    thread_root = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='thread_messages', db_constraint=False,
                                    verbose_name=_('ریشهٔ رشته'))
    edited_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان ویرایش'))
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True,
                                      verbose_name=_('زمان حذف'))
    deleted_by = _user_fk('deleted_chat_messages', _('حذف‌کننده'))
    is_pinned = models.BooleanField(default=False, verbose_name=_('سنجاق‌شده'))
    metadata = models.JSONField(default=dict, blank=True, verbose_name=_('فراداده'))

    class Meta:
        verbose_name = _('پیام')
        verbose_name_plural = _('پیام‌ها')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['conversation', '-created_at']),
            models.Index(fields=['conversation', 'is_pinned']),
        ]

    def __str__(self):
        return f'پیام #{self.pk}'


class MessageAttachment(BaseModel):
    """پیوست پیام؛ اگر سند از قبل در DMS است فقط ارجاع داده می‌شود."""

    class Kind(models.TextChoices):
        IMAGE = 'image', _('تصویر')
        PDF = 'pdf', _('PDF')
        DOCUMENT = 'document', _('سند')
        ARCHIVE = 'archive', _('آرشیو')
        OTHER = 'other', _('سایر')

    message = models.ForeignKey(Message, on_delete=models.CASCADE,
                                related_name='attachments', verbose_name=_('پیام'))
    file = models.FileField(
        upload_to='communication.uploads.chat_attachment_upload_path', blank=True, null=True,
        verbose_name=_('فایل'),
    )
    document = models.ForeignKey(
        'documents.ManagedDocument', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='chat_attachments', db_constraint=False,
        verbose_name=_('سند کتابخانه'),
        help_text=_('اگر فایل از قبل در DMS است، به همان سند ارجاع داده می‌شود.'),
    )
    title = models.CharField(max_length=200, blank=True, verbose_name=_('عنوان'))
    original_name = models.CharField(max_length=255, blank=True, verbose_name=_('نام فایل'))
    mime_type = models.CharField(max_length=120, blank=True, verbose_name=_('نوع MIME'))
    size = models.PositiveIntegerField(default=0, verbose_name=_('حجم (بایت)'))
    kind = models.CharField(max_length=12, choices=Kind.choices, default=Kind.OTHER,
                            verbose_name=_('نوع'))
    metadata = models.JSONField(default=dict, blank=True, verbose_name=_('فراداده'))

    class Meta:
        verbose_name = _('پیوست پیام')
        verbose_name_plural = _('پیوست‌های پیام')
        ordering = ['id']

    def __str__(self):
        return self.title or self.original_name or f'پیوست #{self.pk}'


class MessageEntityRef(BaseModel):
    """ارجاع پیام به رکورد سایر ماژول‌ها (بدون کپی داده)."""

    message = models.ForeignKey(Message, on_delete=models.CASCADE,
                                related_name='entity_refs', verbose_name=_('پیام'))
    module = models.CharField(max_length=40, db_index=True, verbose_name=_('ماژول'))
    object_type = models.CharField(max_length=60, blank=True, verbose_name=_('نوع موجودیت'))
    object_id = models.CharField(max_length=60, blank=True, verbose_name=_('شناسه'))
    label = models.CharField(max_length=200, blank=True, verbose_name=_('برچسب نمایشی'))
    url = models.CharField(max_length=300, blank=True, verbose_name=_('مسیر مقصد'))
    metadata = models.JSONField(default=dict, blank=True, verbose_name=_('فراداده'))

    class Meta:
        verbose_name = _('ارجاع موجودیت پیام')
        verbose_name_plural = _('ارجاع‌های موجودیت پیام')
        ordering = ['id']

    def __str__(self):
        return f'{self.module}:{self.label or self.object_id}'



class MessageMention(BaseModel):
    """منشن یک کاربر در پیام."""

    message = models.ForeignKey(Message, on_delete=models.CASCADE,
                                related_name='mentions', verbose_name=_('پیام'))
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name='chat_mentions', db_constraint=False,
                             verbose_name=_('کاربر'))
    is_notified = models.BooleanField(default=False, verbose_name=_('اعلان داده شد'))

    class Meta:
        verbose_name = _('منشن')
        verbose_name_plural = _('منشن‌ها')
        constraints = [
            models.UniqueConstraint(fields=['message', 'user'], name='uniq_message_mention'),
        ]


class MessageReceipt(BaseModel):
    """وضعیت تحویل/خواندن پیام برای هر کاربر (در گروه: «چند نفر دیدند»)."""

    message = models.ForeignKey(Message, on_delete=models.CASCADE,
                                related_name='receipts', verbose_name=_('پیام'))
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name='chat_receipts', db_constraint=False,
                             verbose_name=_('کاربر'))
    delivered_at = models.DateTimeField(null=True, blank=True, verbose_name=_('تحویل'))
    read_at = models.DateTimeField(null=True, blank=True, verbose_name=_('خوانده شد'))

    class Meta:
        verbose_name = _('رسید پیام')
        verbose_name_plural = _('رسیدهای پیام')
        constraints = [
            models.UniqueConstraint(fields=['message', 'user'], name='uniq_message_receipt'),
        ]


class ChatAuditLog(BaseModel):
    """تاریخچهٔ تغییرات پیام/گفتگو (ویرایش، حذف، عضویت) برای حسابرسی."""

    class Action(models.TextChoices):
        CREATE = 'create', _('ایجاد')
        EDIT = 'edit', _('ویرایش')
        DELETE = 'delete', _('حذف')
        RESTORE = 'restore', _('بازگردانی')
        MEMBER_ADD = 'member_add', _('افزودن عضو')
        MEMBER_REMOVE = 'member_remove', _('حذف عضو')
        READ = 'read', _('خواندن')

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE,
                                     related_name='audit_logs', verbose_name=_('گفتگو'))
    message = models.ForeignKey(Message, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='audit_logs', db_constraint=False,
                                verbose_name=_('پیام'))
    actor = _user_fk('chat_audit_actions', _('اقدام‌کننده'))
    action = models.CharField(max_length=20, choices=Action.choices, verbose_name=_('اقدام'))
    old_value = models.TextField(blank=True, verbose_name=_('مقدار قبلی'))
    new_value = models.TextField(blank=True, verbose_name=_('مقدار جدید'))
    metadata = models.JSONField(default=dict, blank=True, verbose_name=_('فراداده'))

    class Meta:
        verbose_name = _('تاریخچهٔ چت')
        verbose_name_plural = _('تاریخچهٔ چت')
        ordering = ['-created_at']


class ChatEvent(BaseModel):
    """Outbox رویداد برای Real-time؛ سرویس publisher آن را پر می‌کند.

    امروز کلاینت با Polling (``GET /api/chat/events/?since=``) می‌خواند؛ فردا با
    Django Channels همان رویدادها push می‌شوند و لایهٔ دامنه تغییر نمی‌کند.
    """

    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, null=True, blank=True,
        related_name='events', verbose_name=_('گفتگو'),
    )
    event_type = models.CharField(max_length=40, db_index=True, verbose_name=_('نوع رویداد'))
    payload = models.JSONField(default=dict, blank=True, verbose_name=_('داده'))
    audience = models.JSONField(default=list, blank=True,
                                verbose_name=_('گیرندگان'),
                                help_text=_('شناسهٔ کاربران؛ خالی = همهٔ اعضای گفتگو'))

    class Meta:
        verbose_name = _('رویداد چت')
        verbose_name_plural = _('رویدادهای چت')
        ordering = ['id']
        indexes = [models.Index(fields=['company', 'id'])]

