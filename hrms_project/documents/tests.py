"""تست بایگانی مدارک پرسنل — به‌ویژه زیرپوشهٔ «افراد تحت تکفل».

بدون دیتابیس اجرا می‌شود (SimpleTestCase)؛ فقط منطق مسیرسازی و تشخیص
نوع مدرک بررسی می‌گردد.
"""
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from documents.models import (
    DEPENDENTS_FOLDER, DocumentFolder, DocumentType, OrganizationDocument,
    document_upload_path, is_dependent_label, managed_document_version_upload_path,
    organization_document_upload_path,
)


class DependentLabelTests(SimpleTestCase):
    """تشخیص خودکار انواع مدرک مرتبط با افراد تحت تکفل."""

    def test_persian_dependent_labels(self):
        for label in (
            'مدارک افراد تحت تکفل',
            'شناسنامه همسر',
            'شناسنامه فرزند',
            'مدارک تحت پوشش بیمه',
        ):
            self.assertTrue(is_dependent_label(label), label)

    def test_english_dependent_codes(self):
        for code in ('DEPENDENT_ID', 'SPOUSE_ID', 'CHILD_BIRTH'):
            self.assertTrue(is_dependent_label('', code), code)

    def test_regular_labels_are_not_dependent(self):
        for label in ('کارت ملی', 'مدرک تحصیلی', 'قرارداد', 'گواهی اشتغال'):
            self.assertFalse(is_dependent_label(label), label)


class DocumentTypeFolderTests(SimpleTestCase):
    """زیرپوشهٔ مؤثر هر نوع مدرک."""

    def test_explicit_archive_folder_wins(self):
        doc_type = DocumentType(
            name='شناسنامه همسر', code='SPOUSE_ID', archive_folder='مدارک خانواده',
        )
        self.assertEqual(doc_type.archive_subfolder, 'مدارک خانواده')

    def test_dependent_type_falls_back_to_standard_folder(self):
        doc_type = DocumentType(name='شناسنامه فرزند', code='CHILD_ID')
        self.assertEqual(doc_type.archive_subfolder, DEPENDENTS_FOLDER)

    def test_regular_type_has_no_subfolder(self):
        doc_type = DocumentType(name='کارت ملی', code='NATIONAL_ID')
        self.assertEqual(doc_type.archive_subfolder, '')


class DocumentUploadPathTests(SimpleTestCase):
    """مسیر آپلود مدارک: قرار گرفتن مدارک تحت تکفل در پوشهٔ مخصوص."""

    @staticmethod
    def _instance(doc_type):
        employee = SimpleNamespace(
            pk=7, employee_id='EMP001', first_name='علی',
            last_name='محمدی', national_id='0012345678',
        )
        return SimpleNamespace(
            company_id=3, employee_id=7, employee=employee, document_type=doc_type,
        )

    @patch('core.engines.archive_storage_engine.resolve_upload_path')
    def test_dependent_document_uses_dependents_folder(self, mocked):
        mocked.return_value = 'archive/company_3/employees/EMP001_محمدی/افراد_تحت_تکفل/x.pdf'
        doc_type = DocumentType(name='شناسنامه فرزند', code='CHILD_ID')

        document_upload_path(self._instance(doc_type), 'scan.pdf')

        call_args = mocked.call_args
        self.assertEqual(call_args.args[1], 'hr.employees')
        self.assertEqual(call_args.kwargs['subfolder'], DEPENDENTS_FOLDER)
        self.assertIn(DEPENDENTS_FOLDER, call_args.kwargs['fallback_dir'])

    @patch('core.engines.archive_storage_engine.resolve_upload_path')
    def test_dependent_title_uses_dependents_folder(self, mocked):
        """حتی با نوع مدرک عمومی، عنوان «شناسنامه همسر» باید به پوشهٔ وابستگان برود."""
        mocked.return_value = 'archive/x.pdf'
        doc_type = DocumentType(name='سایر', code='OTHER')
        instance = self._instance(doc_type)
        instance.title = 'شناسنامه همسر'
        instance.description = ''

        document_upload_path(instance, 'scan.pdf')

        self.assertEqual(mocked.call_args.kwargs['subfolder'], DEPENDENTS_FOLDER)

    @patch('core.engines.archive_storage_engine.resolve_upload_path')
    def test_regular_document_has_no_subfolder(self, mocked):
        mocked.return_value = 'archive/company_3/employees/EMP001_محمدی/x.pdf'
        doc_type = DocumentType(name='کارت ملی', code='NATIONAL_ID')

        document_upload_path(self._instance(doc_type), 'card.pdf')

        call_args = mocked.call_args
        self.assertEqual(call_args.kwargs['subfolder'], '')
        self.assertNotIn(DEPENDENTS_FOLDER, call_args.kwargs['fallback_dir'])


class OrganizationDependentPathTests(SimpleTestCase):
    """اسناد سازمانی متصل به پرسنل که مربوط به افراد تحت تکفل هستند."""

    @staticmethod
    def _employee():
        from employees.models import Employee
        return Employee(
            pk=7, employee_id='EMP001', first_name='علی',
            last_name='محمدی', national_id='0012345678',
        )

    def _instance(self, title, dependent_related=False):
        doc = OrganizationDocument(
            company_id=3, employee_id=7, title=title,
            category=OrganizationDocument.ArchiveCategory.HR_DOC,
            dependent_related=dependent_related,
        )
        doc.employee = self._employee()
        return doc

    @patch('core.engines.archive_storage_engine.resolve_upload_path')
    def test_dependent_org_document_goes_to_employee_folder(self, mocked):
        mocked.return_value = 'archive/x.pdf'
        doc = self._instance('شناسنامه فرزند')

        organization_document_upload_path(doc, 'child.pdf')

        call_args = mocked.call_args
        self.assertEqual(call_args.args[1], 'hr.employees')
        self.assertEqual(call_args.kwargs['subfolder'], DEPENDENTS_FOLDER)

    @patch('core.engines.archive_storage_engine.resolve_upload_path')
    def test_flagged_org_document_goes_to_employee_folder(self, mocked):
        mocked.return_value = 'archive/x.pdf'
        doc = self._instance('مدرک پیوست', dependent_related=True)

        organization_document_upload_path(doc, 'x.pdf')

        self.assertEqual(mocked.call_args.kwargs['subfolder'], DEPENDENTS_FOLDER)

    @patch('core.engines.archive_storage_engine.resolve_upload_path')
    def test_regular_org_document_stays_in_organization_archive(self, mocked):
        mocked.return_value = 'archive/x.pdf'
        doc = self._instance('قرارداد پشتیبانی سالانه')

        organization_document_upload_path(doc, 'contract.pdf')

        call_args = mocked.call_args
        self.assertEqual(call_args.args[1], 'hrms.organization_documents')
        self.assertEqual(call_args.kwargs['subfolder'], '')


class DocumentManagementTests(SimpleTestCase):
    """مسیر بایگانی و پوشه‌بندی درختی ماژول مدیریت اسناد."""

    def test_folder_path_includes_ancestors(self):
        root = DocumentFolder(name='قراردادها')
        root.pk = 1
        child = DocumentFolder(name='قراردادهای جاری', parent=root)
        child.pk = 2
        grandchild = DocumentFolder(name='۱۴۰۵', parent=child)
        grandchild.pk = 3

        self.assertEqual(grandchild.path, 'قراردادها / قراردادهای جاری / ۱۴۰۵')

    @patch('core.engines.archive_storage_engine.resolve_upload_path')
    def test_managed_version_uses_documents_module_profile(self, mocked):
        mocked.return_value = 'archive/company_3/documents/x.pdf'
        folder = SimpleNamespace(name='قراردادهای جاری', path='قراردادها / قراردادهای جاری')
        document = SimpleNamespace(
            pk=5, folder=folder, title='قرارداد پیمانکاری',
            reference_number='REF-1405-001',
        )
        version = SimpleNamespace(company_id=3, document=document)

        managed_document_version_upload_path(version, 'contract.pdf')

        call_args = mocked.call_args
        self.assertEqual(call_args.args[0], 3)
        self.assertEqual(call_args.args[1], 'hr.documents.management')
        self.assertEqual(call_args.args[2]['folder'], 'قراردادها / قراردادهای جاری')
        self.assertEqual(call_args.args[2]['category'], 'قراردادهای جاری')
        self.assertEqual(call_args.args[2]['id'], 5)
        self.assertEqual(call_args.kwargs['fallback_dir'], 'document_management')

    def test_company_document_folder_catalog(self):
        from documents.management_folders import (
            COMPANY_DOCUMENTS_FOLDER, COMPANY_DOCUMENT_SUBFOLDERS,
        )

        self.assertEqual(COMPANY_DOCUMENTS_FOLDER, 'مدارک و مستندات شرکت')
        names = [name for name, _color in COMPANY_DOCUMENT_SUBFOLDERS]
        for expected in ('روزنامه‌های رسمی', 'مدارک هیئت مدیره', 'مدارک ثبت شرکت'):
            self.assertIn(expected, names)

    def test_default_documents_storage_profile_is_registered(self):
        from settings_app.models import default_storage_profiles

        profile = next(
            item for item in default_storage_profiles()
            if item['module_key'] == 'hr.documents.management'
        )
        self.assertEqual(profile['root_folder'], 'documents')
        self.assertEqual(profile['entity_folder_pattern'], '{folder}_{name}')
        self.assertIn('نسخه‌ها', profile['subfolders'])
        self.assertEqual(profile['max_file_size_mb'], 50)

    @patch('core.engines.archive_storage_engine.resolve_upload_path')
    def test_managed_version_survives_missing_folder(self, mocked):
        mocked.return_value = 'archive/company_3/documents/x.pdf'
        document = SimpleNamespace(
            pk=6, folder=None, title='سند بدون پوشه',
            reference_number='',
        )
        version = SimpleNamespace(company_id=3, document=document)

        managed_document_version_upload_path(version, 'scan.pdf')

        self.assertEqual(mocked.call_args.args[2]['folder'], 'عمومی')
        self.assertEqual(mocked.call_args.args[2]['category'], 'عمومی')



class DocumentManagementWorkflowTests(SimpleTestCase):
    """قواعد گردش‌کار نباید امکان انتشار بدون تأیید را بدهد."""

    def test_draft_cannot_jump_to_published(self):
        from documents.management_workflow import can_transition

        self.assertTrue(can_transition('draft', 'in_review'))
        self.assertFalse(can_transition('draft', 'published'))
        self.assertFalse(can_transition('draft', 'approved'))

    def test_review_can_approve_or_reject(self):
        from documents.management_workflow import can_transition

        self.assertTrue(can_transition('in_review', 'approved'))
        self.assertTrue(can_transition('in_review', 'rejected'))
        self.assertFalse(can_transition('in_review', 'published'))

    def test_only_approved_can_be_published(self):
        from documents.management_workflow import can_transition

        self.assertTrue(can_transition('approved', 'published'))
        self.assertFalse(can_transition('rejected', 'published'))
        self.assertFalse(can_transition('withdrawn', 'published'))

    def test_published_can_be_revised_withdrawn_or_superseded(self):
        from documents.management_workflow import can_transition

        self.assertTrue(can_transition('published', 'draft'))
        self.assertTrue(can_transition('published', 'withdrawn'))
        self.assertTrue(can_transition('published', 'superseded'))
        self.assertFalse(can_transition('published', 'approved'))

    def test_controlled_published_document_is_not_directly_editable(self):
        from documents.models import ManagedDocument

        document = ManagedDocument(
            title='آیین‌نامه', workflow_status='published', is_controlled=True,
        )
        self.assertFalse(document.is_editable_in_workflow)
        document.workflow_status = 'draft'
        self.assertTrue(document.is_editable_in_workflow)


    def test_workflow_permissions_are_separate(self):
        from core.models.user import ROLE_PERMISSIONS, UserProfile
        from core.engines.permission_engine import ALL_PERMISSIONS

        for role in ('super_admin', 'hr_manager'):
            self.assertTrue(UserProfile.ROLE_DEFAULTS[role]['can_approve_documents'])
            self.assertTrue(UserProfile.ROLE_DEFAULTS[role]['can_publish_documents'])
            self.assertTrue(ROLE_PERMISSIONS[role]['can_approve_documents'])
            self.assertTrue(ROLE_PERMISSIONS[role]['can_publish_documents'])
        self.assertIn('can_approve_documents', ALL_PERMISSIONS)
        self.assertIn('can_publish_documents', ALL_PERMISSIONS)
        self.assertFalse(UserProfile.ROLE_DEFAULTS['hr_specialist']['can_approve_documents'])


class DocumentManagementUrlTests(SimpleTestCase):
    """مسیرهای API ماژول مدیریت اسناد در دسترس باشند."""

    def test_management_endpoints_reverse(self):
        from django.urls import reverse

        self.assertEqual(reverse('document-folder-list'), '/api/document-management/folders/')
        self.assertEqual(reverse('managed-document-list'), '/api/document-management/documents/')
        self.assertEqual(reverse('document-activity-list'), '/api/document-management/activities/')
        self.assertEqual(reverse('document-management-stats'), '/api/document-management/stats/')
        self.assertEqual(reverse('document-management-menu'), '/api/document-management/menu/')
        self.assertEqual(reverse('document-management-sync-storage'), '/api/document-management/sync-storage/')
        self.assertEqual(
            reverse('managed-document-restore-version', args=[1]),
            '/api/document-management/documents/1/restore-version/',
        )
        self.assertEqual(
            reverse('managed-document-workflow', args=[1]),
            '/api/document-management/documents/1/workflow/',
        )
        self.assertEqual(
            reverse('managed-document-content', args=[1]),
            '/api/document-management/documents/1/content/',
        )
