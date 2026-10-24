from types import SimpleNamespace

from django.test import SimpleTestCase
from unittest.mock import patch

from core import module_search


class ModuleSearchTests(SimpleTestCase):
    def test_hr_search_accepts_model_instances_from_global_search(self):
        employee = SimpleNamespace(
            pk=7,
            full_name='کارمند آزمایشی',
            department=SimpleNamespace(name='منابع انسانی'),
            job_title=SimpleNamespace(name='کارشناس'),
        )
        document = SimpleNamespace(
            pk=11,
            title='قرارداد آزمایشی',
            employee=employee,
            document_type=SimpleNamespace(name='قرارداد'),
        )

        class FakeSearchEngine:
            @staticmethod
            def global_search(query, company=None):
                return {
                    'employees': [employee],
                    'documents': [document],
                    'letters': [],
                    'hr_requests': [],
                    'leave_requests': [],
                    'salary_records': [],
                }

        with patch.object(module_search, 'SearchEngine', FakeSearchEngine):
            results = module_search._hr_results('آزمایشی', None)

        self.assertTrue(results)
        self.assertEqual(results[0]['id'], 'employee-7')
        self.assertIn('/employees/7', results[0]['path'])
        self.assertEqual(results[1]['id'], 'document-11')

    def test_hr_search_returns_empty_on_engine_error(self):
        class BrokenSearchEngine:
            @staticmethod
            def global_search(query, company=None):
                raise RuntimeError('simulated search failure')

        with patch.object(module_search, 'SearchEngine', BrokenSearchEngine):
            self.assertEqual(module_search._hr_results('آزمایشی', None), [])
