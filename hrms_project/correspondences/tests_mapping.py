"""تست‌های موتور کارای اعمال نگاشت (بدون دیتابیس).

هدف: تضمین اینکه انتخاب ردیف‌ها بر اساس کش «مقادیر خام متمایز» انجام می‌شود
(نه اسکن کل جدول) و کلید کش به فیلترها وابسته است.
"""
from django.test import SimpleTestCase

from correspondences import mapping


class _FakeManager:
    """مدیر ساده‌شده که زنجیرهٔ filter/exclude/values_list/distinct را تقلید می‌کند."""

    def __init__(self, values):
        self.values = list(values)
        self.filter_calls = 0

    def filter(self, **_kwargs):
        self.filter_calls += 1
        return self

    def exclude(self, **_kwargs):
        return self

    def values_list(self, _field, flat=False):   # noqa: ARG002 — امضای جنگو
        return self

    def distinct(self):
        return list(self.values)


def _fake_model(values):
    manager = _FakeManager(values)
    meta = type('Meta', (), {'label': 'fake.Letter'})
    model = type('FakeLetter', (), {'objects': manager, '_meta': meta})
    return model, manager


class NameIndexTests(SimpleTestCase):
    """کش مقادیر خام و تطبیق نرمال‌شده."""

    def test_filters_key_is_stable_and_pk_based(self):
        first = mapping._filters_key({'company': 7, 'direction': 'incoming'})
        second = mapping._filters_key({'direction': 'incoming', 'company': 7})
        self.assertEqual(first, second)
        self.assertIn(('company', '7'), first)

    def test_values_matching_normalizes_names(self):
        model, _manager = _fake_model(['آقای حسینی', 'حسینی', 'شرکت الف', ''])
        index = {}
        matched = mapping._values_matching(index, model, 'sender_name', {'company': 1}, 'حسینی')
        self.assertEqual(matched, ['آقای حسینی', 'حسینی'])

    def test_raw_values_are_cached_per_filter_set(self):
        model, manager = _fake_model(['حسینی', 'شرکت الف'])
        index = {}
        mapping._values_matching(index, model, 'sender_name', {'company': 1}, 'حسینی')
        mapping._values_matching(index, model, 'sender_name', {'company': 1}, 'شرکت الف')
        self.assertEqual(manager.filter_calls, 1)

    def test_different_filters_trigger_a_new_query(self):
        model, manager = _fake_model(['حسینی'])
        index = {}
        mapping._values_matching(index, model, 'sender_name', {'company': 1}, 'حسینی')
        mapping._values_matching(
            index, model, 'sender_name', {'company': 1, 'direction': 'incoming'}, 'حسینی',
        )
        self.assertEqual(manager.filter_calls, 2)

    def test_empty_normalized_matches_nothing(self):
        model, manager = _fake_model(['حسینی'])
        index = {}
        self.assertEqual(
            mapping._values_matching(index, model, 'sender_name', {'company': 1}, ''),
            [],
        )
        self.assertEqual(manager.filter_calls, 0)

    def test_every_handler_accepts_the_shared_index(self):
        """همهٔ handlerها باید کش مشترک را بپذیرند (رگرسیون: _apply_party)."""
        import inspect

        handlers = (
            mapping._apply_employee, mapping._apply_party, mapping._apply_correspondent,
            mapping._apply_organization, mapping._apply_category,
        )
        for handler in handlers:
            self.assertIn('index', inspect.signature(handler).parameters, handler.__name__)


class ApplyBatchApiTests(SimpleTestCase):
    """اندپوینت/ماتریس اعمال گروهی."""

    def test_alias_viewset_exposes_apply_batch(self):
        from correspondences.views import CorrespondenceNameAliasViewSet

        self.assertTrue(hasattr(CorrespondenceNameAliasViewSet, 'apply_batch'))
        self.assertEqual(
            CorrespondenceNameAliasViewSet.permission_matrix['apply_batch'][0], 'edit',
        )

    def test_apply_batch_requires_scope_or_ids(self):
        self.assertTrue(callable(mapping.apply_batch))
        import inspect

        params = inspect.signature(mapping.apply_batch).parameters
        for name in ('alias_ids', 'scope', 'dry_run'):
            self.assertIn(name, params)

    def test_apply_all_reuses_shareable_index(self):
        """apply_all باید همهٔ نگاشت‌ها را با یک کش مشترک اجرا کند."""
        import inspect

        source = inspect.getsource(mapping.apply_all)
        self.assertIn('_run_aliases', source)
        run_source = inspect.getsource(mapping._run_aliases)
        self.assertIn('index = {}', run_source)
