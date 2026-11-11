"""تست‌های اتصال نامه به طرف حساب (بدون نیاز به دیتابیس)."""
from types import SimpleNamespace

from django.test import SimpleTestCase

from correspondences.party_link import match_party, normalize_party_name


class PartyNameNormalizationTests(SimpleTestCase):
    def test_zwnj_and_whitespace_are_normalized(self):
        self.assertEqual(
            normalize_party_name('شرکت  توسعه\u200cساختمان   کیسون '),
            'شرکت توسعه ساختمان کیسون',
        )

    def test_case_is_ignored(self):
        self.assertEqual(normalize_party_name('ABC Co'), 'abc co')

    def test_empty_values(self):
        self.assertEqual(normalize_party_name(None), '')
        self.assertEqual(normalize_party_name('   '), '')


class PartyMatchTests(SimpleTestCase):
    def setUp(self):
        self.parties = [
            SimpleNamespace(id=1, name='شرکت کیسون'),
            SimpleNamespace(id=2, name='شرکت  آذر ۷۹'),
            SimpleNamespace(id=3, name='شرکت آذر 79'),
        ]

    def test_exact_match_with_normalization(self):
        self.assertEqual(match_party('شرکت کیسون', self.parties).id, 1)
        self.assertEqual(match_party(' شرکت  کیسون ', self.parties).id, 1)

    def test_no_partial_match(self):
        self.assertIsNone(match_party('شرکت کیسون پترو', self.parties))

    def test_empty_name_returns_none(self):
        self.assertIsNone(match_party('', self.parties))
