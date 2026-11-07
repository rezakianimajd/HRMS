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


class CorrespondenceSearchProviderTests(SimpleTestCase):
    """جست‌وجوی نوار کنار باید نامه، طرف حساب و ارجاع‌شدگان را هم پیدا کند."""

    def _provider(self):
        return next(
            provider for provider in module_search.PROVIDERS['correspondence']
            if provider.model == 'correspondences.Letter'
        )

    def test_letter_provider_is_registered_first(self):
        first = module_search.PROVIDERS['correspondence'][0]
        self.assertEqual(first.model, 'correspondences.Letter')
        self.assertTrue(first.distinct)
        self.assertIn('subject', first.fields)
        self.assertIn('summary', first.fields)

    def test_provider_extra_query_covers_parties_referrals_and_attachments(self):
        condition = str(self._provider().extra_q('احمدی'))

        for field in (
            'party_account__name', 'organization__name', 'sender_party__name',
            'referrals__to_name', 'referrals__to_employee__first_name',
            'referrals__instruction', 'attachments__title',
        ):
            self.assertIn(field, condition)

    def test_provider_links_to_the_letters_page(self):
        path = self._provider().path(
            SimpleNamespace(number='1404/1', subject='موضوع آزمایشی'),
        )
        self.assertIn('/correspondence/letters?q=', path)

    def test_name_mapping_provider_opens_the_standalone_page(self):
        provider = next(
            provider for provider in module_search.PROVIDERS['correspondence']
            if provider.model == 'correspondences.CorrespondenceNameAlias'
        )
        self.assertTrue(provider.distinct)
        self.assertIn('raw_name', provider.fields)
        path = provider.path(SimpleNamespace(raw_name='خ.حسینی'))
        self.assertTrue(path.startswith('/correspondence/name-mapping?q='), path)
        condition = str(provider.extra_q('حسینی'))
        for field in ('employee__last_name', 'party__name', 'correspondent__name',
                      'organization__name', 'category__name'):
            self.assertIn(field, condition)
