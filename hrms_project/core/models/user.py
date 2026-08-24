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

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name=_('کاربر'),
    )
    role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.EMPLOYEE,
        verbose_name=_('نقش'),
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
    phone = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        verbose_name=_('تلفن'),
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('تاریخ ایجاد'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('تاریخ به‌روزرسانی'))

    class Meta:
        verbose_name = _('پروفایل کاربر')
        verbose_name_plural = _('پروفایل‌های کاربران')

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"

    @property
    def is_super_admin(self):
        return self.role == self.Role.SUPER_ADMIN

    @property
    def is_hr_manager(self):
        return self.role in (self.Role.SUPER_ADMIN, self.Role.HR_MANAGER)

    @property
    def can_edit_settings(self):
        return self.role in (self.Role.SUPER_ADMIN, self.Role.HR_MANAGER)

    @property
    def can_manage_users(self):
        return self.role in (self.Role.SUPER_ADMIN, self.Role.HR_MANAGER)


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