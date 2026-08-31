from django.db import models
from django.utils.translation import gettext_lazy as _
from django_tenants.models import TenantMixin, DomainMixin


class Company(TenantMixin):
    """
    Company model representing a tenant in the multi-tenant system.
    Each company gets its own PostgreSQL schema via django_tenants.
    """
    name = models.CharField(
        max_length=200,
        verbose_name=_('نام شرکت'),
        help_text=_('نام کامل شرکت'),
    )
    code = models.CharField(
        max_length=50,
        unique=True,
        verbose_name=_('کد شرکت'),
        help_text=_('کد یکتای شرکت'),
    )
    email = models.EmailField(
        blank=True,
        null=True,
        verbose_name=_('ایمیل'),
        help_text=_('آدرس ایمیل شرکت'),
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name=_('تلفن'),
        help_text=_('شماره تماس شرکت'),
    )
    address = models.TextField(
        blank=True,
        null=True,
        verbose_name=_('آدرس'),
        help_text=_('آدرس پستی شرکت'),
    )
    postal_code = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name=_('کد پستی'),
        help_text=_('کد پستی شرکت'),
    )
    national_id = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name=_('شناسه ملی'),
        help_text=_('شماره شناسه ملی شرکت'),
    )
    economic_code = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name=_('کد اقتصادی'),
        help_text=_('کد اقتصادی شرکت'),
    )
    registration_number = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name=_('شماره ثبت'),
        help_text=_('شماره ثبت شرکت'),
    )
    logo = models.ImageField(
        upload_to='company_logos/',
        blank=True,
        null=True,
        verbose_name=_('لوگو'),
        help_text=_('لوگوی شرکت'),
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name=_('فعال'),
        help_text=_('وضعیت فعال بودن شرکت'),
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('تاریخ ایجاد'),
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_('تاریخ به‌روزرسانی'),
    )

    auto_create_schema = True
    auto_drop_schema = True

    class Meta:
        verbose_name = _('شرکت')
        verbose_name_plural = _('شرکت‌ها')
        ordering = ['name']

    def __str__(self):
        return self.name


class Domain(DomainMixin):
    """
    Domain model for managing tenant domains.
    Each tenant can have multiple domains.
    """
    tenant = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='domains',
    )

    class Meta:
        verbose_name = _('دامنه')
        verbose_name_plural = _('دامنه‌ها')

    def __str__(self):
        return self.domain