"""تست‌های آفلاین بخش دوم فاز ۲ — چرخهٔ صورتجلسه و محاسبات جریان نقدی."""
from datetime import date

from django.test import SimpleTestCase

from projects.cashflow import combine_months, month_label, monthly_spread
from projects.phase2_service import (
    SHEET_TRANSITIONS, can_transition_certificate, can_transition_sheet, sheet_next_statuses,
)


class SheetStateMachineTests(SimpleTestCase):

    def test_happy_path(self):
        self.assertTrue(can_transition_sheet('draft', 'submitted'))
        self.assertTrue(can_transition_sheet('submitted', 'checked'))
        self.assertTrue(can_transition_sheet('checked', 'approved'))
        self.assertTrue(can_transition_sheet('approved', 'certified'))

    def test_guards_block_bad_jumps(self):
        self.assertFalse(can_transition_sheet('draft', 'approved'))
        self.assertFalse(can_transition_sheet('submitted', 'certified'))
        self.assertFalse(can_transition_sheet('certified', 'approved'))
        self.assertFalse(can_transition_sheet('unknown', 'approved'))

    def test_rejected_returns_to_draft(self):
        self.assertTrue(can_transition_sheet('rejected', 'draft'))
        self.assertTrue(can_transition_sheet('cancelled', 'draft'))
        self.assertEqual(SHEET_TRANSITIONS['certified'], set())

    def test_next_statuses(self):
        self.assertEqual(sheet_next_statuses('submitted'), ['cancelled', 'checked', 'rejected'])
        self.assertEqual(sheet_next_statuses('checked'), ['approved', 'rejected'])

    def test_certificate_transitions(self):
        self.assertTrue(can_transition_certificate('draft', 'issued'))
        self.assertTrue(can_transition_certificate('issued', 'paid'))
        self.assertFalse(can_transition_certificate('paid', 'issued'))
        self.assertFalse(can_transition_certificate('cancelled', 'paid'))


class CashflowMathTests(SimpleTestCase):

    def test_spread_stays_in_single_jalali_month(self):
        # ۲۰۲۶-۰۴-۱۱ تا ۲۰۲۶-۰۴-۲۰ همه در فروردین ۱۴۰۵ (1405-01) است
        spread = monthly_spread([{'amount': 1000, 'start': date(2026, 4, 11), 'end': date(2026, 4, 20)}])
        self.assertEqual(len(spread), 1)
        self.assertAlmostEqual(spread['1405-01'], 1000, places=2)

    def test_spread_splits_across_two_jalali_months(self):
        # ۲۰۲۶-۰۴-۱۶ تا ۲۰۲۶-۰۴-۲۵ → ۵ روز فروردین + ۵ روز اردیبهشت
        spread = monthly_spread([{'amount': 1000, 'start': date(2026, 4, 16), 'end': date(2026, 4, 25)}])
        self.assertAlmostEqual(spread['1405-01'], 500, places=2)
        self.assertAlmostEqual(spread['1405-02'], 500, places=2)

    def test_spread_ignores_zero_amounts_and_missing_dates(self):
        spread = monthly_spread([
            {'amount': 0, 'start': date(2026, 4, 1), 'end': date(2026, 4, 5)},
            {'amount': 100, 'start': None, 'end': None},
        ])
        self.assertEqual(spread, {})

    def test_month_label(self):
        self.assertEqual(month_label('1405-02'), 'اردیبهشت 1405')
        self.assertEqual(month_label('invalid'), 'invalid')

    def test_combine_months_is_sorted_and_cumulative(self):
        rows = combine_months(
            inflow_planned={'1405-01': 100, '1405-02': 50},
            inflow_actual={'1405-01': 80},
            outflow_planned={'1405-01': 40, '1405-02': 20},
            outflow_actual={'1405-01': 30},
        )
        self.assertEqual([row['month'] for row in rows], ['1405-01', '1405-02'])
        self.assertEqual(rows[0]['net_planned'], 60)
        self.assertEqual(rows[1]['cum_inflow_planned'], 150)
        self.assertEqual(rows[1]['cum_outflow_planned'], 60)
        self.assertEqual(rows[1]['cum_net_planned'], 90)
        self.assertEqual(rows[0]['cum_net_actual'], 50)
        self.assertEqual(rows[1]['month_label'], 'اردیبهشت 1405')
