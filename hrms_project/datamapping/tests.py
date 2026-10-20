from django.test import SimpleTestCase

from datamapping.views import _normalize_import_doc_key


class ImportDocumentKeyTests(SimpleTestCase):
    def test_numeric_excel_key_is_stable(self):
        self.assertEqual(_normalize_import_doc_key('2.0'), '2')
        self.assertEqual(_normalize_import_doc_key(2), '2')

    def test_text_key_and_empty_values(self):
        self.assertEqual(_normalize_import_doc_key('  1405/12  '), '1405/12')
        self.assertEqual(_normalize_import_doc_key(None), '')
