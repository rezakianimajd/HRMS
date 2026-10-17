"""انتقال فایل‌های موجود به ساختار بایگانی ماژول‌ها.

مدارک افراد تحت تکفل (بر اساس «زیرپوشهٔ بایگانی» نوع مدرک یا نام/عنوان مدرک)
به زیرپوشهٔ «افراد تحت تکفل» داخل پوشهٔ همان پرسنل منتقل می‌شوند.

Usage:
    python manage.py archive_existing_files            # پیش‌نمایش
    python manage.py archive_existing_files --apply    # اجرای واقعی
    python manage.py archive_existing_files --module employees --apply
"""
import os
import shutil

from django.core.management.base import BaseCommand

from core.engines.archive_storage_engine import ArchiveStorageEngine, archive_engine
from documents.models import DEPENDENTS_FOLDER, is_dependent_label
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
        for schema, ctx in self._contexts():
            with ctx:
                if schema:
                    self.stdout.write(self.style.MIGRATE_HEADING(f'--- schema: {schema}'))
                self._run(stats, apply, only)

        self.stdout.write(self.style.SUCCESS(
            f"انجام شد — منتقل: {stats['moved']} | ردشده: {stats['skipped']} | "
            f"ناموجود: {stats['missing']} | خطا: {stats['errors']}"
        ))

    def _run(self, stats, apply, only):
        """اجرای پردازش‌ها در schema فعلی."""
        if only in ('', 'employees'):
            self._process_documents(stats, apply)
            self._process_employee_assets(stats, apply)
        if only in ('', 'contracts'):
            self._process_contracts(stats, apply)
        if only in ('', 'organization'):
            self._process_org_docs(stats, apply)

    def _contexts(self):
        """
        فهرست (نام schema، context) برای اجرا.

        در حالت چند‌مستأجری (django-tenants) اگر روی schema «public» اجرا شویم،
        دستور روی همهٔ شرکت‌ها تکرار می‌شود؛ جدول‌های ماژول‌ها فقط در schema هر
        شرکت وجود دارند. اگر با tenant_command اجرا شده باشیم، فقط همان schema.
        """
        from contextlib import nullcontext

        try:
            from django.db import connection
            from django_tenants.utils import get_tenant_model, schema_context
        except Exception:  # noqa: BLE001 — نصب نبودن django-tenants
            return [(None, nullcontext())]

        if getattr(connection, 'schema_name', 'public') != 'public':
            return [(None, nullcontext())]

        try:
            names = list(
                get_tenant_model().objects.exclude(schema_name='public')
                .values_list('schema_name', flat=True)
            )
        except Exception:  # noqa: BLE001
            names = []

        if not names:
            return [(None, nullcontext())]
        return [(name, schema_context(name)) for name in names]

    # ------------------------------------------------------------ helpers
    def _profile(self, company_id, module_key):
        try:
            return StorageProfile.objects.filter(
                company_id=company_id, module_key=module_key, is_active=True
            ).first()
        except Exception:  # noqa: BLE001 — جدول در این schema وجود ندارد
            return None

    def _label(self, profile, fields):
        return ArchiveStorageEngine.render_pattern(profile.entity_folder_pattern, fields)

    def _move(self, obj, module_key, fields, stats, apply, field='file', subfolder=''):
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

        if callable(subfolder):
            try:
                subfolder = subfolder() or ''
            except Exception:  # noqa: BLE001 — نوع مدرک ناقص نباید مهاجرت را بشکند
                subfolder = ''
        safe_sub = archive_engine.sanitize(subfolder) if subfolder else ''

        target_dir = archive_engine.entity_path(
            obj.company_id, profile.root_folder, label, profile.include_company
        )
        if safe_sub:
            target_dir = os.path.join(target_dir, safe_sub)
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

        def folder_for(doc):
            """زیرپوشهٔ بایگانی مدرک: «افراد تحت تکفل» برای مدارک وابستگان."""
            try:
                folder = doc.document_type.archive_subfolder
            except Exception:  # noqa: BLE001
                folder = ''
            if not folder and is_dependent_label(doc.title, doc.description):
                folder = DEPENDENTS_FOLDER
            return folder

        try:
            docs = Document.objects.select_related('employee', 'document_type').iterator()
            for doc in docs:
                self._move(
                    doc, 'hr.employees', lambda d=doc: fields_for(d), stats, apply,
                    subfolder=lambda d=doc: folder_for(d),
                )
        except Exception as exc:  # noqa: BLE001 — جدول در این schema موجود نیست
            self.stderr.write(f'  [ردشده] مدارک پرسنل: {exc}')

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

        try:
            for emp in Employee.objects.iterator():
                self._move(emp, 'hr.employees', lambda e=emp: fields_for(e), stats, apply, field='photo')
        except Exception as exc:  # noqa: BLE001
            self.stderr.write(f'  [ردشده] عکس پرسنل: {exc}')

        try:
            for version in ContractVersion.objects.select_related('employee').iterator():
                self._move(version, 'hr.employees', lambda v=version: fields_for(v.employee),
                           stats, apply, field='signature_image')
        except Exception as exc:  # noqa: BLE001
            self.stderr.write(f'  [ردشده] تصویر امضا: {exc}')

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

        try:
            for doc in ContractDocument.objects.select_related('contract').iterator():
                self._move(doc, 'hrms.contracts', lambda d=doc: fields_for(d), stats, apply)
        except Exception as exc:  # noqa: BLE001
            self.stderr.write(f'  [ردشده] مدارک قراردادها: {exc}')

    def _process_org_docs(self, stats, apply):
        from documents.models import OrganizationDocument

        self.stdout.write(self.style.MIGRATE_HEADING('اسناد سازمانی'))

        def fields_for(doc):
            try:
                category = doc.get_category_display()
            except Exception:  # noqa: BLE001
                category = 'عمومی'
            return {'category': category, 'name': category, 'id': doc.pk}

        def employee_fields(doc):
            emp = doc.employee
            return {
                'code': getattr(emp, 'employee_id', '') or '',
                'name': getattr(emp, 'first_name', '') or '',
                'last_name': getattr(emp, 'last_name', '') or '',
                'id': emp.pk,
                'national_id': getattr(emp, 'national_id', '') or '',
            }

        try:
            docs = OrganizationDocument.objects.select_related('employee').iterator()
            for doc in docs:
                if doc.employee_id and doc.is_dependent:
                    # سند تحت تکفل → پروندهٔ همان پرسنل، زیرپوشهٔ «افراد تحت تکفل»
                    self._move(
                        doc, 'hr.employees', lambda d=doc: employee_fields(d),
                        stats, apply, subfolder=DEPENDENTS_FOLDER,
                    )
                else:
                    self._move(
                        doc, 'hrms.organization_documents',
                        lambda d=doc: fields_for(d), stats, apply,
                    )
        except Exception as exc:  # noqa: BLE001
            self.stderr.write(f'  [ردشده] اسناد سازمانی: {exc}')

