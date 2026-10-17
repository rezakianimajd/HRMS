"""انتقال فایل‌های موجود به ساختار بایگانی ماژول‌ها.

Usage:
    python manage.py archive_existing_files            # پیش‌نمایش
    python manage.py archive_existing_files --apply    # اجرای واقعی
    python manage.py archive_existing_files --module employees --apply
"""
import os
import shutil

from django.core.management.base import BaseCommand

from core.engines.archive_storage_engine import ArchiveStorageEngine, archive_engine
from settings_app.models import StorageProfile


class Command(BaseCommand):
    help = 'انتقال فایل‌های موجود (مدارک پرسنل/قرارداد/سازمانی) به ساختار archive/...'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true', help='اجرای واقعی (پیش‌فرض فقط نمایش)')
        parser.add_argument('--module', default='', help='محدود کردن: employees | contracts | organization')

    def handle(self, *args, **options):
        apply = options['apply']
        only = options.get('module') or ''
        self.stdout.write('حالت: ' + ('اجرای واقعی' if apply else 'پیش‌نمایش (برای اجرا --apply)'))

        stats = {'moved': 0, 'skipped': 0, 'missing': 0, 'errors': 0}
        if only in ('', 'employees'):
            self._process_documents(stats, apply)
        if only in ('', 'contracts'):
            self._process_contracts(stats, apply)
        if only in ('', 'organization'):
            self._process_org_docs(stats, apply)

        self.stdout.write(self.style.SUCCESS(
            f"انجام شد — منتقل: {stats['moved']} | ردشده: {stats['skipped']} | "
            f"ناموجود: {stats['missing']} | خطا: {stats['errors']}"
        ))

    # ------------------------------------------------------------ helpers
    def _profile(self, company_id, module_key):
        return StorageProfile.objects.filter(
            company_id=company_id, module_key=module_key, is_active=True
        ).first()

    def _label(self, profile, fields):
        return ArchiveStorageEngine.render_pattern(profile.entity_folder_pattern, fields)

    def _move(self, obj, module_key, label, stats, apply):
        if not obj.file or not obj.file.name:
            return
        profile = self._profile(obj.company_id, module_key)
        if not profile or not label:
            stats['skipped'] += 1
            return

        target_dir = archive_engine.entity_path(
            obj.company_id, profile.root_folder, label, profile.include_company
        )
        filename = os.path.basename(str(obj.file.name))
        target_rel = os.path.relpath(
            os.path.join(target_dir, filename), archive_engine.media_root
        ).replace('\\', '/')

        if str(obj.file.name).replace('\\', '/') == target_rel:
            stats['skipped'] += 1
            return

        source_abs = os.path.join(archive_engine.media_root, str(obj.file.name))
        if not os.path.exists(source_abs):
            stats['missing'] += 1
            self.stderr.write(f'  [ناموجود] {obj.file.name}')
            return

        final_rel = target_rel
        counter = 2
        while os.path.exists(os.path.join(archive_engine.media_root, final_rel)):
            stem, ext = os.path.splitext(target_rel)
            final_rel = f'{stem}_{counter}{ext}'
            counter += 1

        self.stdout.write(f'  {obj.file.name}  ->  {final_rel}')
        if not apply:
            stats['skipped'] += 1
            return

        try:
            os.makedirs(target_dir, exist_ok=True)
            shutil.move(source_abs, os.path.join(archive_engine.media_root, final_rel))
            obj.file.name = final_rel
            obj.save(update_fields=['file'])
            stats['moved'] += 1
        except Exception as exc:  # noqa: BLE001
            stats['errors'] += 1
            self.stderr.write(f'  [خطا] {exc}')

    # ------------------------------------------------------------ processors
    def _process_documents(self, stats, apply):
        from documents.models import Document

        self.stdout.write(self.style.MIGRATE_HEADING('مدارک پرسنل'))
        profile = StorageProfile.objects.filter(module_key='hr.employees', is_active=True).first()
        if not profile:
            self.stderr.write('  [ردشده] پروفایل بایگانی «پرسنل» تعریف نشده است.')
            return

        for doc in Document.objects.select_related('employee').iterator():
            emp = doc.employee
            label = self._label(profile, {
                'code': getattr(emp, 'employee_id', '') or '',
                'name': getattr(emp, 'first_name', '') or '',
                'last_name': getattr(emp, 'last_name', '') or '',
                'id': emp.pk,
                'national_id': getattr(emp, 'national_id', '') or '',
            })
            self._move(doc, 'hr.employees', label, stats, apply)

    def _process_contracts(self, stats, apply):
        from contracts.models import ContractDocument

        self.stdout.write(self.style.MIGRATE_HEADING('مدارک قراردادها'))
        profile = StorageProfile.objects.filter(module_key='hrms.contracts', is_active=True).first()
        if not profile:
            self.stderr.write('  [ردشده] پروفایل بایگانی «قراردادها» تعریف نشده است.')
            return

        for doc in ContractDocument.objects.select_related('contract').iterator():
            contract = doc.contract
            label = self._label(profile, {
                'number': getattr(contract, 'number', '') or '',
                'name': getattr(contract, 'subject', '') or '',
                'id': contract.pk,
            })
            self._move(doc, 'hrms.contracts', label, stats, apply)

    def _process_org_docs(self, stats, apply):
        from documents.models import OrganizationDocument

        self.stdout.write(self.style.MIGRATE_HEADING('اسناد سازمانی'))
        profile = StorageProfile.objects.filter(
            module_key='hrms.organization_documents', is_active=True
        ).first()
        if not profile:
            self.stderr.write('  [ردشده] پروفایل بایگانی «اسناد سازمانی» تعریف نشده است.')
            return

        for doc in OrganizationDocument.objects.iterator():
            try:
                category = doc.get_category_display()
            except Exception:  # noqa: BLE001
                category = 'عمومی'
            label = self._label(profile, {'category': category, 'name': category, 'id': doc.pk})
            self._move(doc, 'hrms.organization_documents', label, stats, apply)

