"""تست‌های DB-free زنجیرهٔ دوره‌ای صورت‌وضعیت.

سناریوی واقعی: قرارداد C-KPSMI-05-073 یک صورت‌وضعیت شمارهٔ ۱۴ با مبلغ تجمعی
۱۱۹٬۴۱۸٬۷۴۹٬۴۲۰ ریال داشت و ثبت صورت‌وضعیت شمارهٔ ۱ خطای «مبلغ تجمعی کمتر از
دوره قبل» می‌داد؛ چون «دورهٔ قبل» بر اساس شناسه (pk) تعیین می‌شد.
"""
from decimal import Decimal
from types import SimpleNamespace
from unittest import mock

from django.test import SimpleTestCase

from contracts.models import Statement
from contracts.serializers import StatementSerializer, previous_level_cumulatives
from contracts.statement_chain import chain_mode, order_statements, previous_rows


class StatementChainTests(SimpleTestCase):
    """قاعدهٔ «دورهٔ قبل» در تابع‌های خالص."""

    def test_first_period_after_number_14_has_no_previous(self):
        rows = [{
            'id': 548, 'number': '14', 'amount': Decimal('119418749420'),
            'work_done': Decimal('119418749420'),
        }]
        self.assertEqual(previous_rows(rows, number='01'), [])
        self.assertEqual(previous_rows(rows, number='1'), [])

    def test_later_period_sees_only_smaller_numbers(self):
        rows = [
            {'id': 11, 'number': '03', 'amount': 300},
            {'id': 10, 'number': '02', 'amount': 200},
            {'id': 9, 'number': '01', 'amount': 100},
        ]
        prior = previous_rows(rows, number='04')
        self.assertEqual([row['number'] for row in prior], ['01', '02', '03'])

    def test_new_period_with_same_number_falls_back_to_id_order(self):
        rows = [
            {'id': 11, 'number': '03', 'amount': 300},
            {'id': 12, 'number': '04', 'amount': 400},
        ]
        self.assertEqual(chain_mode(rows, number='04'), 'pk')
        self.assertEqual([row['id'] for row in previous_rows(rows, number='04')], [11, 12])

    def test_updating_a_row_excludes_itself(self):
        rows = [
            {'id': 9, 'number': '01', 'amount': 100},
            {'id': 10, 'number': '02', 'amount': 200},
        ]
        prior = previous_rows(rows, number='02', pk=10)
        self.assertEqual([row['id'] for row in prior], [9])

    def test_mixed_numbers_fall_back_to_id_order(self):
        rows = [{'id': 5, 'number': ''}, {'id': 2, 'number': '02'}]
        self.assertEqual(chain_mode(rows, number='03'), 'pk')
        self.assertEqual([row['id'] for row in previous_rows(rows, number='03')], [2, 5])

    def test_duplicate_numbers_fall_back_to_id_order(self):
        rows = [{'id': 5, 'number': '02'}, {'id': 2, 'number': '02'}]
        self.assertEqual(chain_mode(rows, number='03'), 'pk')
        self.assertEqual([row['id'] for row in previous_rows(rows, number='03')], [2, 5])

    def test_missing_number_falls_back_to_id_order(self):
        rows = [{'id': 5, 'number': '02'}, {'id': 2, 'number': '01'}]
        self.assertEqual(chain_mode(rows, number=''), 'pk')
        self.assertEqual([row['id'] for row in previous_rows(rows, number='')], [2, 5])

    def test_order_statements_uses_numbers_when_unique_numeric(self):
        rows = [
            SimpleNamespace(pk=548, number='14'),
            SimpleNamespace(pk=600, number='01'),
        ]
        self.assertEqual([row.pk for row in order_statements(rows)], [600, 548])

    def test_order_statements_falls_back_to_pk(self):
        rows = [SimpleNamespace(pk=9, number=''), SimpleNamespace(pk=4, number='02')]
        self.assertEqual([row.pk for row in order_statements(rows)], [4, 9])


class _FakeStatementQuerySet:
    """کوئری‌ست ساده برای تست متدهای سریالایزر بدون دیتابیس."""

    def __init__(self, rows):
        self._rows = rows

    def values(self, *fields, **kwargs):  # noqa: ARG002
        return [dict(row) for row in self._rows]


class StatementPreviousCumulativeTests(SimpleTestCase):
    """«مبلغ تجمعی دوره قبل» باید شماره‌محور باشد، نه شناسه‌محور."""

    contract = SimpleNamespace(pk=92)

    def _rows(self):
        return [{
            'id': 548,
            'number': '14',
            'kind': Statement.Kind.MULTI,
            'amount': Decimal('119418749420'),
            'work_done': Decimal('119418749420'),
            'foreign_amount': Decimal('119418749420.0000'),
            'adjustment_amount': Decimal('0'),
            'adjustment_foreign_amount': Decimal('0'),
            'levels': [{'title': 'حق الزحمه', 'amount': 10747687448, 'amount_foreign': 10747687448}],
        }]

    def _serializer(self):
        serializer = StatementSerializer()
        patcher = mock.patch.object(
            Statement.objects, 'filter', return_value=_FakeStatementQuerySet(self._rows()),
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        return serializer

    def test_first_period_ignores_later_statement(self):
        serializer = self._serializer()
        self.assertEqual(serializer._previous_cumulative(self.contract, '01'), Decimal('0'))
        self.assertEqual(serializer._previous_foreign_cumulative(self.contract, '01'), Decimal('0'))
        self.assertEqual(
            serializer._previous_adjustment_cumulative(self.contract, '01'),
            (Decimal('0'), Decimal('0')),
        )

    def test_later_period_uses_previous_cumulative(self):
        serializer = self._serializer()
        self.assertEqual(
            serializer._previous_cumulative(self.contract, '15'), Decimal('119418749420'),
        )
        self.assertEqual(
            serializer._previous_foreign_cumulative(self.contract, '15'),
            Decimal('119418749420.0000'),
        )

    def test_level_cumulatives_follow_period_order(self):
        with mock.patch.object(
            Statement.objects, 'filter', return_value=_FakeStatementQuerySet(self._rows()),
        ):
            self.assertEqual(previous_level_cumulatives(self.contract, number='01'), {})
            self.assertEqual(
                previous_level_cumulatives(self.contract, number='15'),
                {'حق الزحمه': (Decimal('10747687448'), Decimal('10747687448'))},
            )
