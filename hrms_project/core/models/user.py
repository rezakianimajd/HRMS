"""
Extended User model with RBAC roles and multi-company access.
"""
from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _
from core.models.tenant import Company


class UserProfile(models.Model):
    """Extended profile for Django User with RBAC and multi-tenant support."""

    class Role(models.TextChoices):
        SUPER_ADMIN = 'super_admin', _('مدیر ارشد سیستم')
        HR_MANAGER = 'hr_manager', _('مدیر منابع انسانی')
        HR_SPECIALIST = 'hr_specialist', _('کارشناس منابع انسانی')
        DEPARTMENT_HEAD = 'department_head', _('مدیر دپارتمان')
        EMPLOYEE = 'employee', _('کارمند')

    # Default permissions used when no override exists in RolePermission.
    ROLE_DEFAULTS = {
        'super_admin': {
            'can_manage_companies': True,
            'can_manage_users': True,
            'can_manage_roles': True,
            'can_edit_settings': True,
            'can_view_all_employees': True,
            'can_add_employee': True,
            'can_change_employee': True,
            'can_delete_employee': True,
            'can_view_sensitive_data': True,
            'can_manage_documents': True,
            'can_delete_documents': True,
            'can_approve_documents': True,
            'can_publish_documents': True,
            'can_approve_leaves': True,
            'can_view_audit_logs': True,
            'can_manage_updates': True,
        },
        'hr_manager': {
            'can_manage_users': True,
            'can_manage_roles': True,
            'can_edit_settings': True,
            'can_view_all_employees': True,
            'can_add_employee': True,
            'can_change_employee': True,
            'can_delete_employee': True,
            'can_view_sensitive_data': True,
            'can_manage_documents': True,
            'can_delete_documents': True,
            'can_approve_documents': True,
            'can_publish_documents': True,
            'can_approve_leaves': True,
            'can_view_audit_logs': True,
            'can_manage_updates': False,
        },
        'hr_specialist': {
            'can_view_all_employees': True,
            'can_add_employee': True,
            'can_change_employee': True,
            'can_delete_employee': False,
            'can_view_sensitive_data': True,
            'can_manage_documents': True,
            'can_delete_documents': False,
            'can_approve_documents': False,
            'can_publish_documents': False,
            'can_approve_leaves': True,
            'can_view_audit_logs': False,
            'can_manage_updates': False,
        },
        'department_head': {
            'can_view_all_employees': False,
            'can_add_employee': False,
            'can_change_employee': False,
            'can_delete_employee': False,
            'can_view_sensitive_data': False,
            'can_manage_documents': False,
            'can_delete_documents': False,
            'can_approve_leaves': True,
            'can_view_audit_logs': False,
            'can_manage_updates': False,
        },
        'employee': {
            'can_view_all_employees': False,
            'can_add_employee': False,
            'can_change_employee': False,
            'can_delete_employee': False,
            'can_view_sensitive_data': False,
            'can_manage_documents': False,
            'can_delete_documents': False,
            'can_approve_leaves': False,
            'can_view_audit_logs': False,
            'can_manage_updates': False,
        },
    }

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name=_('کاربر'),
    )
    role = models.CharField(
        max_length=50,
        default=Role.EMPLOYEE,
        verbose_name=_('نقش'),
        help_text=_('کد نقش از فهرست نقش‌ها (سیستمی یا سفارشی) — بدون محدودیت choices.'),
    )
    companies = models.ManyToManyField(
        Company,
        blank=True,
        related_name='users',
        verbose_name=_('شرکت‌های قابل دسترس'),
    )
    current_company = models.ForeignKey(
        Company,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='active_users',
        verbose_name=_('شرکت جاری'),
    )
    applications = models.ManyToManyField(
        'core.Application',
        blank=True,
        related_name='users',
        verbose_name=_('سامانه‌های مجاز'),
    )
    current_application = models.ForeignKey(
        'core.Application',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='active_users',
        verbose_name=_('سامانهٔ جاری'),
    )
    phone = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        verbose_name=_('تلفن'),
    )
    # Link to an Employee (plain integer, NOT a FK — Employee lives in each
    # tenant schema while UserProfile lives in the public schema). Used for
    # role-aware, per-employee targeting of approvals/notifications.
    employee_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name=_('شناسه پرسنل مرتبط'),
        help_text=_('کاربر به کدام پرسنل متصل است؟ (برای اعلان‌های هدفمند)'),
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('تاریخ ایجاد'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('تاریخ به‌روزرسانی'))

    class Meta:
        verbose_name = _('پروفایل کاربر')
        verbose_name_plural = _('پروفایل‌های کاربران')

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"

    def _effective_permissions(self):
        """Return role permissions, applying any saved RolePermission override."""
        base_role = self.role
        try:
            from core.models.user import AccessRole
            role_obj = AccessRole.objects.filter(code=self.role).first()
            if role_obj and role_obj.base_role:
                base_role = role_obj.base_role
        except Exception:
            pass
        defaults = self.ROLE_DEFAULTS.get(base_role, {})
        try:
            from core.models.user import RolePermission
            override = RolePermission.objects.filter(role=self.role).first()
            if override:
                legacy_only = {
                    key: value for key, value in (override.permissions or {}).items()
                    if '.' not in key
                }
                return {**defaults, **legacy_only}
        except Exception:
            pass
        return defaults

    @property
    def is_super_admin(self):
        return self.role == self.Role.SUPER_ADMIN

    @property
    def is_hr_manager(self):
        return self.role in (self.Role.SUPER_ADMIN, self.Role.HR_MANAGER)

    @property
    def can_manage_roles(self):
        # مدیر ارشد/منابع انسانی، یا نقشی که صریحاً این مجوز را دارد.
        return bool(self._effective_permissions().get('can_manage_roles', False)) or self.is_hr_manager

    @property
    def can_edit_settings(self):
        return self._effective_permissions().get('can_edit_settings', False)

    @property
    def can_manage_users(self):
        return self._effective_permissions().get('can_manage_users', False)

    @property
    def can_manage_updates(self):
        """Only roles explicitly granted the key may upload/apply updates."""
        return self._effective_permissions().get('can_manage_updates', False)


class RolePermission(models.Model):
    """Persisted permission overrides per role.

    If no row exists for a role, UserProfile.ROLE_DEFAULTS are used.
    """

    role = models.CharField(
        max_length=30,
        unique=True,
        verbose_name=_('نقش'),
    )
    permissions = models.JSONField(
        default=dict,
        verbose_name=_('دسترسی‌ها'),
    )
    applications = models.JSONField(
        default=list,
        blank=True,
        verbose_name=_('سامانه‌های مجاز'),
        help_text=_('لیست شناسه (slug) سامانه‌هایی که این نقش به آن‌ها دسترسی دارد. خالی یعنی استفاده از پیش‌فرض نقش.'),
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('تاریخ ایجاد'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('تاریخ به‌روزرسانی'))

    class Meta:
        verbose_name = _('دسترسی نقش')
        verbose_name_plural = _('دسترسی‌های نقش')

    def __str__(self):
        return self.role

    @classmethod
    def get_for_role(cls, role):
        base_role = role
        try:
            role_obj = AccessRole.objects.filter(code=role).first()
            if role_obj and role_obj.base_role:
                base_role = role_obj.base_role
        except Exception:
            pass
        defaults = UserProfile.ROLE_DEFAULTS.get(base_role, {})
        try:
            override = cls.objects.get(role=role)
            legacy_only = {
                key: value for key, value in (override.permissions or {}).items()
                if '.' not in key
            }
            return {**defaults, **legacy_only}
        except cls.DoesNotExist:
            return defaults

    @classmethod
    def get_application_slugs(cls, role):
        """Return the list of allowed application slugs for a role.

        Uses the persisted override when present (even if empty list = deny all
        modules), otherwise falls back to ROLE_APPLICATION_DEFAULTS.
        """
        try:
            override = cls.objects.get(role=role)
            return list(override.applications or [])
        except cls.DoesNotExist:
            pass
        default = ROLE_APPLICATION_DEFAULTS.get(role, [])
        if default == '*':
            return '*'
        return list(default)


class AccessRole(models.Model):
    """نقش دسترسی (سیستمی یا سفارشی) — منبع فهرست نقش‌ها در صفحهٔ کاربران و نقش‌ها.

    مجوزهای ریز هر نقش در ``RolePermission.permissions`` با کلیدهای
    ``<module>.<menu>.<action>`` ذخیره می‌شود؛ این مدل فقط «فرادادهٔ نقش» است
    (نام نمایشی، توضیح، پایهٔ ارث‌بری و ترتیب نمایش).
    """

    code = models.CharField(max_length=50, unique=True, verbose_name=_('کد نقش'))
    name = models.CharField(max_length=120, verbose_name=_('نام نقش'))
    description = models.CharField(max_length=250, blank=True, verbose_name=_('توضیح'))
    base_role = models.CharField(
        max_length=30, default='employee', verbose_name=_('نقش پایه (ارث‌بری پیش‌فرض)'),
        help_text=_('پیش‌فرض‌های لایهٔ قدیمی از این نقش گرفته می‌شود.'),
    )
    color = models.CharField(max_length=20, blank=True, default='#64748b',
                             verbose_name=_('رنگ نمایشی'))
    icon = models.CharField(max_length=40, blank=True, verbose_name=_('آیکون'))
    is_system = models.BooleanField(default=False, verbose_name=_('نقش سیستمی (غیرقابل حذف)'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))
    sort_order = models.SmallIntegerField(default=100, verbose_name=_('ترتیب نمایش'))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('تاریخ ایجاد'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('تاریخ به‌روزرسانی'))

    class Meta:
        verbose_name = _('نقش دسترسی')
        verbose_name_plural = _('نقش‌های دسترسی')
        ordering = ['sort_order', 'name']

    def __str__(self):
        return f'{self.name} ({self.code})'

    @classmethod
    def ensure_system_roles(cls):
        """ساخت/به‌روزرسانی نقش‌های سیستمی (idempotent)."""
        system_roles = [
            ('super_admin', 'مدیر ارشد سیستم', 'دسترسی کامل به همهٔ ماژول‌ها و تنظیمات', 'super_admin', '#8b5cf6', 10),
            ('hr_manager', 'مدیر منابع انسانی', 'مدیریت پرسنل، اسناد و تنظیمات منابع انسانی', 'hr_manager', '#6366f1', 20),
            ('hr_specialist', 'کارشناس منابع انسانی', 'ثبت و ویرایش اطلاعات پرسنلی و مدارک', 'hr_specialist', '#3b82f6', 30),
            ('department_head', 'مدیر دپارتمان', 'مشاهدهٔ واحد خود و تأیید مرخصی/درخواست‌ها', 'department_head', '#f59e0b', 40),
            ('employee', 'کارمند', 'دسترسی شخصی (کارتابل، حضور و غیاب، مرخصی)', 'employee', '#64748b', 50),
        ]
        for code, name, description, base, color, order in system_roles:
            cls.objects.update_or_create(
                code=code,
                defaults={
                    'name': name,
                    'description': description,
                    'base_role': base,
                    'color': color,
                    'is_system': True,
                    'is_active': True,
                    'sort_order': order,
                },
            )


# Define RBAC permissions per role
ROLE_PERMISSIONS = {
    'super_admin': {
        'can_manage_companies': True,
        'can_manage_users': True,
        'can_edit_settings': True,
        'can_view_all_employees': True,
        'can_add_employee': True,
        'can_change_employee': True,
        'can_delete_employee': True,
        'can_view_sensitive_data': True,
        'can_manage_documents': True,
        'can_delete_documents': True,
        'can_approve_documents': True,
        'can_publish_documents': True,
        'can_approve_leaves': True,
        'can_view_audit_logs': True,
    },
    'hr_manager': {
        'can_manage_users': True,
        'can_edit_settings': True,
        'can_view_all_employees': True,
        'can_add_employee': True,
        'can_change_employee': True,
        'can_delete_employee': True,
        'can_view_sensitive_data': True,
        'can_manage_documents': True,
        'can_delete_documents': True,
        'can_approve_documents': True,
        'can_publish_documents': True,
        'can_approve_leaves': True,
        'can_view_audit_logs': True,
    },
    'hr_specialist': {
        'can_view_all_employees': True,
        'can_add_employee': True,
        'can_change_employee': True,
        'can_delete_employee': False,
        'can_view_sensitive_data': True,
        'can_manage_documents': True,
        'can_delete_documents': False,
        'can_approve_documents': False,
        'can_publish_documents': False,
        'can_approve_leaves': True,
        'can_view_audit_logs': False,
    },
    'department_head': {
        'can_view_all_employees': False,  # Only own department
        'can_add_employee': False,
        'can_change_employee': False,
        'can_delete_employee': False,
        'can_view_sensitive_data': False,  # Data masking
        'can_manage_documents': False,
        'can_delete_documents': False,
        'can_approve_leaves': True,  # Only own department
        'can_view_audit_logs': False,
    },
    'employee': {
        'can_view_all_employees': False,
        'can_add_employee': False,
        'can_change_employee': False,
        'can_delete_employee': False,
        'can_view_sensitive_data': False,
        'can_manage_documents': False,
        'can_delete_documents': False,
        'can_approve_leaves': False,
        'can_view_audit_logs': False,
    },
}

# Module (Application) access granted by default per role.
# A role maps to a set of application slugs. Super admin implicitly gets ALL
# modules (handled separately in the access helpers). Other roles have no
# implicit module grants unless an admin explicitly assigns them in the UI.
ROLE_APPLICATION_DEFAULTS = {
    'super_admin': '*',
    'hr_manager': [],
    'hr_specialist': [],
    'department_head': [],
    'employee': [],
}