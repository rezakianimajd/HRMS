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
            self._process_employee_assets(stats, apply)
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

    def _move(self, obj, module_key, fields, stats, apply, field='file'):
        current = getattr(obj, field, None)
        if not current or not getattr(current, 'name', None):
            return
        profile = self._profile(obj.company_id, module_key)
        if not profile:
            stats['skipped'] += 1
            return
        label = self._label(profile, fields())
        if not label:
            stats['skipped'] += 1
            return

        target_dir = archive_engine.entity_path(
            obj.company_id, profile.root_folder, label, profile.include_company
        )
        filename = os.path.basename(str(current.name))
        target_rel = os.path.relpath(
            os.path.join(target_dir, filename), archive_engine.media_root
        ).replace('\\', '/')

        if str(current.name).replace('\\', '/') == target_rel:
            stats['skipped'] += 1
            return

        source_abs = os.path.join(archive_engine.media_root, str(current.name))
        if not os.path.exists(source_abs):
            stats['missing'] += 1
            self.stderr.write(f'  [ناموجود] {current.name}')
            return

        final_rel = target_rel
        counter = 2
        while os.path.exists(os.path.join(archive_engine.media_root, final_rel)):
            stem, ext = os.path.splitext(target_rel)
            final_rel = f'{stem}_{counter}{ext}'
            counter += 1

        self.stdout.write(f'  {current.name}  ->  {final_rel}')
        if not apply:
            stats['skipped'] += 1
            return

        try:
            os.makedirs(target_dir, exist_ok=True)
            shutil.move(source_abs, os.path.join(archive_engine.media_root, final_rel))
            setattr(obj, field, final_rel)
            obj.save(update_fields=[field])
            stats['moved'] += 1
        except Exception as exc:  # noqa: BLE001
            stats['errors'] += 1
            self.stderr.write(f'  [خطا] {exc}')

    # ------------------------------------------------------------ processors
    def _process_documents(self, stats, apply):
        from documents.models import Document

        self.stdout.write(self.style.MIGRATE_HEADING('مدارک پرسنل'))

        def fields_for(doc):
            emp = doc.employee
            return {
                'code': getattr(emp, 'employee_id', '') or '',
                'name': getattr(emp, 'first_name', '') or '',
                'last_name': getattr(emp, 'last_name', '') or '',
                'id': emp.pk,
                'national_id': getattr(emp, 'national_id', '') or '',
            }

        for doc in Document.objects.select_related('employee').iterator():
            self._move(doc, 'hr.employees', lambda d=doc: fields_for(d), stats, apply)

    def _process_employee_assets(self, stats, apply):
        """عکس پرسنل و تصویر امضای نسخهٔ قرارداد."""
        from employees.models import ContractVersion, Employee

        self.stdout.write(self.style.MIGRATE_HEADING('عکس و امضای پرسنل'))

        def fields_for(employee):
            return {
                'code': getattr(employee, 'employee_id', '') or '',
                'name': getattr(employee, 'first_name', '') or '',
                'last_name': getattr(employee, 'last_name', '') or '',
                'id': employee.pk,
                'national_id': getattr(employee, 'national_id', '') or '',
            }

        for emp in Employee.objects.iterator():
            self._move(emp, 'hr.employees', lambda e=emp: fields_for(e), stats, apply, field='photo')

        for version in ContractVersion.objects.select_related('employee').iterator():
            self._move(version, 'hr.employees', lambda v=version: fields_for(v.employee),
                       stats, apply, field='signature_image')

    def _process_contracts(self, stats, apply):
        from contracts.models import ContractDocument

        self.stdout.write(self.style.MIGRATE_HEADING('مدارک قراردادها'))

        def fields_for(doc):
            contract = doc.contract
            return {
                'number': getattr(contract, 'number', '') or '',
                'name': getattr(contract, 'subject', '') or '',
                'id': contract.pk,
            }

        for doc in ContractDocument.objects.select_related('contract').iterator():
            self._move(doc, 'hrms.contracts', lambda d=doc: fields_for(d), stats, apply)

    def _process_org_docs(self, stats, apply):
        from documents.models import OrganizationDocument

        self.stdout.write(self.style.MIGRATE_HEADING('اسناد سازمانی'))

        def fields_for(doc):
            try:
                category = doc.get_category_display()
            except Exception:  # noqa: BLE001
                category = 'عمومی'
            return {'category': category, 'name': category, 'id': doc.pk}

        for doc in OrganizationDocument.objects.iterator():
            self._move(doc, 'hrms.organization_documents',
                       lambda d=doc: fields_for(d), stats, apply)

