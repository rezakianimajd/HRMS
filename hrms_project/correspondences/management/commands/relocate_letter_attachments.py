"""انتقال پیوست‌های نامه به ساختار بایگانی ماژول «مکاتبات اداری».

پیوست‌هایی که در مسیر قدیمی ``correspondences/letters/<سال>/<ماه>/...`` ذخیره
شده‌اند به ``archive/company_<id>/correspondences/<سال شمسی>/`` منتقل می‌شوند تا
آمار «پوشه‌های بایگانی» در تنظیمات و کتابخانهٔ مدیریت اسناد حجم واقعی را
نشان دهد. اجرای دوباره بی‌خطر است (فایل‌های منتقل‌شده رد می‌شوند).
"""
from __future__ import annotations

import os

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from core.engines.archive_storage_engine import archive_engine, ArchiveStorageEngine
from correspondences.models import (
    CORRESPONDENCE_MODULE_KEY, LetterAttachment, letter_archive_year,
)

LEGACY_PREFIX = 'correspondences/'


def _unique_name(directory: str, filename: str) -> str:
    """نام یکتا در پوشهٔ مقصد (بدون بازنویسی فایل موجود)."""
    stem, ext = os.path.splitext(filename)
    candidate = filename
    index = 2
    while os.path.exists(os.path.join(directory, candidate)):
        candidate = f'{stem}-{index}{ext}'
        index += 1
    return candidate


class Command(BaseCommand):
    help = 'انتقال پیوست‌های نامه به ساختار بایگانی مکاتبات اداری'

    def add_arguments(self, parser):
        parser.add_argument('--schema', default=None,
                            help='نام اسکیمای شرکت (پیش‌فرض: همهٔ اسکیماها)')
        parser.add_argument('--company', type=int, default=None, help='شناسهٔ شرکت')
        parser.add_argument('--dry-run', action='store_true', help='فقط گزارش')
        parser.add_argument('--limit', type=int, default=None, help='حداکثر تعداد پیوست')
        parser.add_argument('--sync-dms', action='store_true',
                            help='پس از انتقال، بایگانی را در کتابخانهٔ اسناد ایندکس کن')

    # ------------------------------------------------------------------ ابزار
    def _company(self, options):
        from core.models import Company

        if options.get('company'):
            company = Company.objects.filter(pk=options['company']).first()
            if not company:
                raise CommandError(f'شرکت با شناسهٔ {options["company"]} پیدا نشد.')
            return company
        company = Company.objects.filter(is_active=True).first()
        if not company:
            raise CommandError('هیچ شرکت فعالی وجود ندارد؛ از --company استفاده کنید.')
        return company

    def _tenant_contexts(self, options):
        from contextlib import nullcontext

        try:
            from django.db import connection
            from django_tenants.utils import schema_context, get_tenant_model
        except Exception:  # noqa: BLE001 — نصب نبودن django-tenants
            return [(None, nullcontext())]

        if getattr(connection, 'schema_name', 'public') != 'public':
            return [(None, nullcontext())]

        wanted = (options.get('schema') or '').strip()
        if wanted:
            return [(wanted, schema_context(wanted))]
        try:
            names = list(
                get_tenant_model().objects.exclude(schema_name='public')
                .values_list('schema_name', flat=True),
            )
        except Exception:  # noqa: BLE001
            names = []
        return [(name, schema_context(name)) for name in names] or [(None, nullcontext())]

    def _profile(self, company):
        """پروفایل بایگانی مکاتبات را برمی‌گرداند (در صورت نبود می‌سازد)."""
        from settings_app.models import StorageProfile, default_storage_profiles

        profile = StorageProfile.objects.filter(
            company=company, module_key=CORRESPONDENCE_MODULE_KEY,
        ).first()
        if not profile:
            defaults = next(
                (item for item in default_storage_profiles()
                 if item['module_key'] == CORRESPONDENCE_MODULE_KEY),
                None,
            )
            if not defaults:
                raise CommandError('پروفایل پیش‌فرض مکاتبات پیدا نشد.')
            profile = StorageProfile.objects.create(company=company, **defaults)
            self.stdout.write(self.style.WARNING('پروفایل بایگانی مکاتبات ساخته شد.'))
        if not profile.entity_folder_pattern or profile.entity_folder_pattern == '{number}':
            profile.entity_folder_pattern = '{year}'
            profile.save(update_fields=['entity_folder_pattern'])
            self.stdout.write('الگوی پوشهٔ مکاتبات روی «{year}» تنظیم شد.')
        return profile

    def _target_path(self, profile, company_id, attachment, storage):
        """مسیر نسبی مقصد برای یک پیوست (بدون ساخت فایل)."""
        letter = attachment.letter
        label = ArchiveStorageEngine.render_pattern(
            profile.entity_folder_pattern,
            {'year': letter_archive_year(letter), 'number': getattr(letter, 'number', '') or '',
             'name': getattr(letter, 'subject', '') or '', 'id': getattr(letter, 'pk', '') or ''},
        ) or 'بدون_تاریخ'
        target_dir = archive_engine.entity_path(
            company_id, profile.root_folder, label, profile.include_company,
        )
        return target_dir, os.path.basename(attachment.file.name)

    def handle(self, *args, **options):
        dry_run = bool(options['dry_run'])
        company = self._company(options)
        for schema_name, context in self._tenant_contexts(options):
            if schema_name:
                self.stdout.write(self.style.MIGRATE_HEADING(f'--- اسکیما {schema_name} ---'))
            with context:
                self._relocate(options, company, dry_run)

    def _relocate(self, options, company, dry_run):
        from documents.management_sync import sync_archive_files

        profile = self._profile(company) if not dry_run else None
        company_id = company.pk
        stats = {'total': 0, 'moved': 0, 'skipped': 0, 'missing': 0, 'failed': 0}
        limit = options.get('limit')

        queryset = LetterAttachment.objects.select_related('letter').exclude(file='')
        if limit:
            queryset = queryset[:limit]

        for attachment in queryset.iterator(chunk_size=200):
            if limit and stats['total'] >= limit:
                break
            stats['total'] += 1
            storage = attachment.file.storage
            current = str(attachment.file.name or '')
            if current.startswith(f'archive/company_{company_id}/'):
                stats['skipped'] += 1
                continue
            if not current.startswith(LEGACY_PREFIX) and not current.startswith('archive/'):
                stats['skipped'] += 1
                continue

            try:
                source = storage.path(current)
            except Exception:  # noqa: BLE001 — پشتیبان‌های غیرفایل‌سیستمی
                stats['failed'] += 1
                continue
            if not os.path.isfile(source):
                stats['missing'] += 1
                self.stderr.write(f'  فایل یافت نشد: {current}')
                continue

            if dry_run:
                stats['moved'] += 1
                continue

            target_dir, filename = self._target_path(profile, company_id, attachment, storage)
            os.makedirs(target_dir, exist_ok=True)
            filename = _unique_name(target_dir, filename)
            destination = os.path.join(target_dir, filename)
            try:
                os.replace(source, destination)
            except OSError as exc:
                stats['failed'] += 1
                self.stderr.write(f'  انتقال ناموفق {current}: {exc}')
                continue

            relative = os.path.relpath(destination, archive_engine.media_root).replace('\\', '/')
            with transaction.atomic():
                attachment.file.name = relative
                try:
                    attachment.size = os.path.getsize(destination)
                except OSError:
                    pass
                attachment.save(update_fields=['file', 'size', 'updated_at'])
            stats['moved'] += 1

        self.stdout.write(self.style.SUCCESS(
            f'کل پیوست: {stats["total"]} | منتقل‌شده: {stats["moved"]} | '
            f'قبلاً منتقل: {stats["skipped"]} | فایل غایب: {stats["missing"]} | '
            f'خطا: {stats["failed"]}' + ('  (اجرای آزمایشی)' if dry_run else ''),
        ))

        if options.get('sync_dms') and not dry_run:
            total = 0
            for _attempt in range(6):
                result = sync_archive_files(company, max_files=50000)
                total += result.get('created', 0)
                if not result.get('created') or not result.get('truncated'):
                    break
            self.stdout.write(self.style.SUCCESS(
                f'ایندکس کتابخانهٔ اسناد: {total} سند تازه',
            ))
