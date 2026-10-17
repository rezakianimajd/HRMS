"""تست بایگانی مدارک پرسنل — به‌ویژه زیرپوشهٔ «افراد تحت تکفل».

بدون دیتابیس اجرا می‌شود (SimpleTestCase)؛ فقط منطق مسیرسازی و تشخیص
نوع مدرک بررسی می‌گردد.
"""
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from documents.models import (
    DEPENDENTS_FOLDER, DocumentType, document_upload_path, is_dependent_label,
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
