"""فاز ۰ — زیرساخت حسابرسی و حذف نرم برای رکوردهای مالی حساس.

* `AuditableModel`: سه فیلد حسابرسی (`created_by`, `updated_by`, `deleted_at`).
* `SoftDeleteQuerySet` / `SoftDeleteManager`: حذف نرم به‌جای حذف فیزیکی.
* `ActiveSoftDeleteManager`: مدیر پیش‌فرض که رکوردهای حذف‌شده را پنهان می‌کند.

این ماژول عمداً از `BaseModel` جدا است تا تغییرات فقط در دامنهٔ هدف (مدل‌های
مالی پروژه) اعمال شود و مایگریشن‌های سایر اپ‌ها دست‌نخورده بمانند.
"""
from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class SoftDeleteQuerySet(models.QuerySet):
    """QuerySet با حذف نرم."""

    def delete(self):
        return super().update(deleted_at=timezone.now())

    def hard_delete(self):
        return super().delete()

    def alive(self):
        return self.filter(deleted_at__isnull=True)

    def dead(self):
        return self.filter(deleted_at__isnull=False)


class SoftDeleteManager(models.Manager):
    """مدیر پیش‌فرض: فقط رکوردهای حذف‌نشده."""

    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).filter(deleted_at__isnull=True)


class AllObjectsManager(models.Manager):
    """مدیر کامل (شامل حذف‌شده‌ها) — برای گزارش‌های تاریخی."""

    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db)


class AuditableModel(models.Model):
    """فیلدهای حسابرسی + حذف نرم (انتزاعی)."""

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='%(class)s_created', verbose_name=_('ایجادکننده'),
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='%(class)s_updated', verbose_name=_('آخرین ویرایش‌کننده'),
    )
    deleted_at = models.DateTimeField(
        null=True, blank=True, db_index=True, verbose_name=_('تاریخ حذف (نرم)'),
    )

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        """حذف نرم — رکورد مالی هرگز فیزیکی پاک نمی‌شود."""
        self.deleted_at = timezone.now()
        self.save(update_fields=['deleted_at'])

    def hard_delete(self, using=None, keep_parents=False):
        return super().delete(using=using, keep_parents=keep_parents)

    def restore(self):
        self.deleted_at = None
        self.save(update_fields=['deleted_at'])
