"""تست‌های ساختاری فهرست صورت‌وضعیت‌ها (بدون نیاز به دیتابیس).

باگ واقعی: فهرست بدون ORDER BY صفحه‌بندی می‌شد و با ۵۱۴ صورت‌وضعیت، صفحهٔ
۵۰۰تایی ردیف تازه (شمارهٔ ۰۳) را جا می‌گذاشت. این تست تضمین می‌کند ترتیب ثابت
و فیلتر مرتب‌سازی همیشه روی ویوست باقی بماند.
"""
from django.test import SimpleTestCase
from rest_framework import filters


class StatementListViewTests(SimpleTestCase):
    def setUp(self):
        from contracts.views import StatementViewSet

        self.viewset = StatementViewSet

    def test_statement_list_is_ordered_for_stable_pagination(self):
        self.assertEqual(self.viewset.ordering, ['-id'])

    def test_ordering_filter_is_enabled(self):
        backends = list(self.viewset.filter_backends)
        self.assertIn(filters.OrderingFilter, backends)
        self.assertIn(filters.SearchFilter, backends)

    def test_ordering_and_search_fields_cover_contract(self):
        self.assertIn('number', self.viewset.ordering_fields)
        self.assertIn('date', self.viewset.ordering_fields)
        self.assertIn('contract__number', self.viewset.search_fields)

    def test_contract_query_filter_is_documented(self):
        """پارامتر ``contract`` باید در get_queryset پشتیبانی شود."""
        import inspect

        source = inspect.getsource(self.viewset.get_queryset)
        self.assertIn("query_params.get('contract')", source)
