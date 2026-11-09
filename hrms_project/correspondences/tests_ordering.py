"""تست‌های بدون دیتابیس برای مرتب‌سازی «شمارهٔ ثبت» دفتر وارده.

قاعدهٔ کسب‌وکار: ستون «شماره ثبت» (``unit_reg_no``) به‌صورت **عددی** مرتب
می‌شود تا همیشه آخرین شماره اول باشد؛ نامه‌های بدون شماره ته فهرست می‌آیند
(``nulls_last``). این تست‌ها SQL ساخته‌شده و انتخاب ترتیب را بررسی می‌کنند
بدون نیاز به PostgreSQL در حال اجرا.
"""
from types import SimpleNamespace

from django.test import SimpleTestCase

from correspondences.views.letters import (
    REG_NO_ORDERING_FIELDS, REG_NO_SORT_ANNOTATION, LetterOrderingFilter,
    reg_no_sort_expression,
)


def make_view(ordering_fields, default_ordering):
    return SimpleNamespace(ordering_fields=ordering_fields, ordering=default_ordering)


def make_request(ordering=None):
    params = {} if ordering is None else {'ordering': ordering}
    return SimpleNamespace(query_params=params)


def normalize(terms):
    """ترتیب‌ها را به رشتهٔ خوانا تبدیل می‌کند (``-field`` / ``field``)."""
    result = []
    for term in terms:
        if isinstance(term, str):
            result.append(term)
            continue
        name = term.expression.name if hasattr(term, 'expression') else str(term)
        result.append(f'{"-" if term.descending else ""}{name}')
    return result


class RegNoSortExpressionTests(SimpleTestCase):

    def test_expression_is_numeric_and_null_safe(self):
        from correspondences.models import Letter

        queryset = Letter.objects.annotate(sort_key=reg_no_sort_expression())
        sql = str(queryset.query)
        self.assertIn('regexp_replace', sql.lower())
        self.assertIn('NULLIF', sql.upper())
        self.assertIn('bigint', sql.lower())

    def test_expression_strips_non_digits(self):
        """الگوی regex فقط رقم‌ها را نگه می‌دارد و پرچم global فعال است."""
        from correspondences.models import Letter

        queryset = Letter.objects.annotate(sort_key=reg_no_sort_expression())
        sql, params = queryset.query.sql_with_params()
        self.assertIn('regexp_replace', sql.lower())
        self.assertIn('[^0-9]', params)
        self.assertIn('g', params)


class LetterOrderingTests(SimpleTestCase):

    def setUp(self):
        from django.db.models.functions import Coalesce

        from correspondences.models import Letter

        # همان annotation ویوست برای ترتیب پیش‌فرض (effective_date)
        self.queryset = Letter.objects.annotate(
            effective_date=Coalesce('received_date', 'sent_date', 'letter_date'),
        )
        self.view = make_view(
            ['number', 'received_date', 'reg_no', 'unit_reg_no'], ['-effective_date', '-id'],
        )

    def _ordered(self, ordering):
        filtered = LetterOrderingFilter().filter_queryset(
            make_request(ordering), self.queryset, self.view,
        )
        return filtered, normalize(filtered.query.order_by)

    def test_desc_reg_no_puts_last_first(self):
        filtered, terms = self._ordered('-reg_no')
        self.assertEqual(terms[0], f'-{REG_NO_SORT_ANNOTATION}')
        self.assertEqual(terms[1:], ['-id'])
        self.assertIn(REG_NO_SORT_ANNOTATION, filtered.query.annotations)

    def test_desc_puts_empty_values_last(self):
        """نامه‌های بدون شمارهٔ ثبت نباید بالای فهرست بیایند."""
        filtered = LetterOrderingFilter().filter_queryset(
            make_request('-reg_no'), self.queryset, self.view,
        )
        self.assertTrue(filtered.query.order_by[0].nulls_last)

    def test_asc_reg_no(self):
        filtered, terms = self._ordered('reg_no')
        self.assertEqual(terms[0], REG_NO_SORT_ANNOTATION)
        # نامه‌های بدون شماره در هر دو جهت ته فهرست می‌مانند
        self.assertTrue(filtered.query.order_by[0].nulls_last)

    def test_unit_reg_no_alias_uses_numeric_sort(self):
        _, terms = self._ordered('-unit_reg_no')
        self.assertEqual(terms[0], f'-{REG_NO_SORT_ANNOTATION}')

    def test_extra_terms_are_kept_after_reg_no(self):
        _, terms = self._ordered('-reg_no,-received_date')
        self.assertEqual(terms, [f'-{REG_NO_SORT_ANNOTATION}', '-received_date'])

    def test_other_fields_keep_plain_ordering(self):
        filtered, terms = self._ordered('-received_date')
        self.assertEqual(terms, ['-received_date'])
        self.assertNotIn(REG_NO_SORT_ANNOTATION, filtered.query.annotations)

    def test_default_ordering_applies_without_param(self):
        filtered = LetterOrderingFilter().filter_queryset(make_request(), self.queryset, self.view)
        self.assertEqual(normalize(filtered.query.order_by), ['-effective_date', '-id'])


class OrderingFieldsDeclarationTests(SimpleTestCase):

    def test_viewset_accepts_reg_no_fields(self):
        from correspondences.views.letters import LetterViewSet

        for field in ('reg_no', 'unit_reg_no', 'unit_reg_date', 'company_reg_no'):
            self.assertIn(field, LetterViewSet.ordering_fields)

    def test_viewset_uses_letter_ordering_filter(self):
        from correspondences.views.letters import LetterViewSet

        self.assertIn(LetterOrderingFilter, LetterViewSet.filter_backends)
        self.assertEqual(LetterViewSet.ordering, ['-effective_date', '-id'])

    def test_reg_fields_constant(self):
        self.assertEqual(REG_NO_ORDERING_FIELDS, ('reg_no', 'unit_reg_no'))
