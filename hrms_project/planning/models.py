"""مدل‌های ماژول «برنامه‌ریزی شخصی» (یادداشت‌ها و وظایف).

- ``Note``          : یادداشت شخصی (متن رمزنگاری‌شده) با رنگ/سنجاق/برچسب/چک‌لیست
- ``Task``          : وظیفهٔ شخصی با وضعیت، اولویت، سررسید و یادآور
- ``PlanningShare`` : اشتراک‌گذاری یک یادداشت/وظیفه با یک یا چند کاربر

هر آیتم مالک دارد؛ اشتراک‌گذاری فقط دسترسی می‌دهد و مالکیت را تغییر نمی‌دهد.
"""
from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.models.base_model import BaseModel


def _user_fk(related_name, verbose_name, on_delete=models.SET_NULL):
    return models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=on_delete, null=True, blank=True,
        related_name=related_name, db_constraint=False, verbose_name=verbose_name,
    )


class Note(BaseModel):
    """یادداشت شخصی؛ متن برای محرمانگی رمزنگاری می‌شود."""

    owner = _user_fk('planning_notes', _('مالک'), on_delete=models.CASCADE)
    title = models.CharField(max_length=200, verbose_name=_('عنوان'))
    body = models.TextField(blank=True, verbose_name=_('متن (رمزنگاری‌شده)'))
    color = models.CharField(max_length=20, blank=True, verbose_name=_('رنگ'))
    tags = models.JSONField(default=list, blank=True, verbose_name=_('برچسب‌ها'))
    checklist = models.JSONField(default=list, blank=True, verbose_name=_('چک‌لیست'),
                                 help_text=_('[{"text": "...", "done": false}]'))
    is_pinned = models.BooleanField(default=False, verbose_name=_('سنجاق‌شده'))
    is_shared = models.BooleanField(default=False, verbose_name=_('به اشتراک گذاشته شده'))
    related_module = models.CharField(max_length=40, blank=True, verbose_name=_('ماژول مرتبط'))
    related_object_type = models.CharField(max_length=60, blank=True,
                                           verbose_name=_('نوع موجودیت مرتبط'))
    related_object_id = models.CharField(max_length=60, blank=True,
                                         verbose_name=_('شناسهٔ موجودیت مرتبط'))
    related_label = models.CharField(max_length=200, blank=True,
                                     verbose_name=_('برچسب موجودیت مرتبط'))

    class Meta:
        verbose_name = _('یادداشت')
        verbose_name_plural = _('یادداشت‌ها')
        ordering = ['-is_pinned', '-updated_at']
        indexes = [models.Index(fields=['company', 'owner', '-updated_at'])]

    def __str__(self):
        return self.title


class Task(BaseModel):
    """وظیفهٔ شخصی (قابل اشتراک با همکاران)."""

    class Status(models.TextChoices):
        TODO = 'todo', _('انجام‌نشده')
        DOING = 'doing', _('در حال انجام')
        DONE = 'done', _('انجام‌شده')
        CANCELLED = 'cancelled', _('لغو‌شده')

    class Priority(models.TextChoices):
        LOW = 'low', _('کم')
        NORMAL = 'normal', _('معمولی')
        HIGH = 'high', _('زیاد')
        URGENT = 'urgent', _('فوری')

    owner = _user_fk('planning_tasks', _('مالک'), on_delete=models.CASCADE)
    title = models.CharField(max_length=220, verbose_name=_('عنوان'))
    description = models.TextField(blank=True, verbose_name=_('توضیح (رمزنگاری‌شده)'))
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.TODO,
                              verbose_name=_('وضعیت'))
    priority = models.CharField(max_length=12, choices=Priority.choices, default=Priority.NORMAL,
                                verbose_name=_('اولویت'))
    due_date = models.DateField(null=True, blank=True, db_index=True, verbose_name=_('سررسید'))
    due_time = models.TimeField(null=True, blank=True, verbose_name=_('ساعت'))
    reminder_at = models.DateTimeField(null=True, blank=True, verbose_name=_('یادآور'))
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name=_('زمان انجام'))
    checklist = models.JSONField(default=list, blank=True, verbose_name=_('چک‌لیست'))
    tags = models.JSONField(default=list, blank=True, verbose_name=_('برچسب‌ها'))
    is_pinned = models.BooleanField(default=False, verbose_name=_('سنجاق‌شده'))
    is_shared = models.BooleanField(default=False, verbose_name=_('به اشتراک گذاشته شده'))
    related_module = models.CharField(max_length=40, blank=True, verbose_name=_('ماژول مرتبط'))
    related_object_type = models.CharField(max_length=60, blank=True,
                                           verbose_name=_('نوع موجودیت مرتبط'))
    related_object_id = models.CharField(max_length=60, blank=True,
                                         verbose_name=_('شناسهٔ موجودیت مرتبط'))
    related_label = models.CharField(max_length=200, blank=True,
                                     verbose_name=_('برچسب موجودیت مرتبط'))
    source_message = models.PositiveBigIntegerField(
        null=True, blank=True, verbose_name=_('پیام مبدأ چت'),
        help_text=_('اگر این وظیفه از یک پیام چت ساخته شده باشد.'),
    )
    assignee_groups = models.ManyToManyField(
        'planning.PlanningGroup', blank=True, related_name='tasks',
        verbose_name=_('گروه‌های مسئول'),
    )

    class Meta:
        verbose_name = _('وظیفه')
        verbose_name_plural = _('وظایف')
        ordering = ['-is_pinned', 'status', 'due_date', '-created_at']
        indexes = [
            models.Index(fields=['company', 'owner', 'status']),
            models.Index(fields=['company', 'due_date']),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if self.status == self.Status.DONE and not self.completed_at:
            self.completed_at = timezone.now()
        elif self.status != self.Status.DONE:
            self.completed_at = None
        super().save(*args, **kwargs)

    @property
    def is_overdue(self):
        if not self.due_date or self.status in (self.Status.DONE, self.Status.CANCELLED):
            return False
        return self.due_date < timezone.localdate()


class PlanningShare(BaseModel):
    """اشتراک‌گذاری یادداشت/وظیفه با کاربر دیگر یا «محول‌کردن» وظیفه."""

    class ItemKind(models.TextChoices):
        NOTE = 'note', _('یادداشت')
        TASK = 'task', _('وظیفه')

    class Permission(models.TextChoices):
        VIEW = 'view', _('فقط مشاهده')
        EDIT = 'edit', _('مشاهده و ویرایش')

    class Role(models.TextChoices):
        ASSIGNEE = 'assignee', _('مسئول انجام')
        EDITOR = 'editor', _('همکار ویرایش')
        VIEWER = 'viewer', _('مشاهده‌کننده')

    item_kind = models.CharField(max_length=10, choices=ItemKind.choices,
                                 verbose_name=_('نوع آیتم'))
    item_id = models.PositiveIntegerField(verbose_name=_('شناسهٔ آیتم'))
    shared_by = _user_fk('planning_shares_made', _('اشتراک‌گذارنده'))
    shared_with = _user_fk('planning_shares_received', _('کاربر دریافت‌کننده'),
                           on_delete=models.CASCADE)
    permission = models.CharField(max_length=10, choices=Permission.choices,
                                  default=Permission.VIEW, verbose_name=_('سطح دسترسی'))
    role = models.CharField(max_length=12, choices=Role.choices, default=Role.VIEWER,
                            verbose_name=_('نقش'))
    group = models.ForeignKey(
        'planning.PlanningGroup', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='shares', db_constraint=False, verbose_name=_('گروه مبدأ'),
        help_text=_('اگر این دسترسی از یک گروه آمده باشد.'),
    )

    class Meta:
        verbose_name = _('اشتراک‌گذاری')
        verbose_name_plural = _('اشتراک‌گذاری‌ها')
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['item_kind', 'item_id', 'shared_with'], name='uniq_planning_share',
            ),
        ]
        indexes = [models.Index(fields=['company', 'shared_with', 'item_kind'])]

    def __str__(self):
        return f'{self.get_item_kind_display()} #{self.item_id}'



class PlanningGroup(BaseModel):
    """گروه کاربران برای محول‌کردن سریع یادداشت/وظیفه (مثلاً «تیم مالی»)."""

    name = models.CharField(max_length=120, verbose_name=_('نام گروه'))
    description = models.CharField(max_length=200, blank=True, verbose_name=_('توضیح'))
    color = models.CharField(max_length=20, blank=True, verbose_name=_('رنگ'))
    created_by = _user_fk('planning_groups', _('سازنده'))

    class Meta:
        verbose_name = _('گروه برنامه‌ریزی')
        verbose_name_plural = _('گروه‌های برنامه‌ریزی')
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'name'], name='uniq_planning_group_name',
            ),
        ]

    def __str__(self):
        return self.name


class PlanningGroupMember(BaseModel):
    """عضویت یک کاربر در یک گروه برنامه‌ریزی."""

    group = models.ForeignKey(PlanningGroup, on_delete=models.CASCADE,
                              related_name='member_rows', verbose_name=_('گروه'))
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name='planning_group_memberships', db_constraint=False,
                             verbose_name=_('کاربر'))

    class Meta:
        verbose_name = _('عضو گروه برنامه‌ریزی')
        verbose_name_plural = _('اعضای گروه برنامه‌ریزی')
        ordering = ['id']
        constraints = [
            models.UniqueConstraint(fields=['group', 'user'], name='uniq_planning_group_member'),
        ]

    def __str__(self):
        return f'{self.group_id} · {self.user_id}'

