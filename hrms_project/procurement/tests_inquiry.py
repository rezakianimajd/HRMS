"""تست‌های محاسبات خرید/تدارکات (بدون دیتابیس)."""
from decimal import Decimal

from django.test import SimpleTestCase

from procurement import pricing


class LineAndTotalsTests(SimpleTestCase):
    def test_line_amount_handles_discount_and_negatives(self):
        self.assertEqual(pricing.line_amount(3, 1000, 500), Decimal('2500'))
        self.assertEqual(pricing.line_amount(2, 1000, 5000), Decimal('0'))
        self.assertEqual(pricing.line_amount('2.5', '400'), Decimal('1000.0'))

    def test_lines_total_sums_rows(self):
        rows = [{'amount': 1000}, {'amount': '2500'}, {'amount': None}]
        self.assertEqual(pricing.lines_total(rows), Decimal('3500'))

    def test_document_totals_computes_vat_from_rate(self):
        totals = pricing.document_totals(1000000, 50000, vat_rate=10)
        self.assertEqual(totals['subtotal'], Decimal('1000000'))
        self.assertEqual(totals['discount'], Decimal('50000'))
        self.assertEqual(totals['vat_amount'], Decimal('95000'))
        self.assertEqual(totals['total'], Decimal('1045000'))

    def test_document_totals_accepts_explicit_vat(self):
        totals = pricing.document_totals(500, 0, vat_rate=9, vat_amount=120)
        self.assertEqual(totals['vat_amount'], Decimal('120'))
        self.assertEqual(totals['total'], Decimal('620'))

    def test_payment_status(self):
        self.assertEqual(pricing.payment_status_of(1000, 0), 'unpaid')
        self.assertEqual(pricing.payment_status_of(1000, 400), 'partial')
        self.assertEqual(pricing.payment_status_of(1000, 1000), 'paid')
        self.assertEqual(pricing.payment_status_of(0, 0), 'unpaid')


class ComparisonTests(SimpleTestCase):
    def _payload(self):
        lines = [
            {'id': 1, 'line_no': 1, 'description': 'لپ‌تاپ', 'quantity': 2, 'unit_label': 'عدد'},
            {'id': 2, 'line_no': 2, 'description': 'مانیتور', 'quantity': 3, 'unit_label': 'عدد'},
        ]
        quotations = [
            {
                'id': 10, 'supplier_name': 'الف', 'number': 'Q-1', 'status': 'received',
                'total': 900, 'delivery_days': 10,
                'lines': [
                    {'inquiry_line': 1, 'unit_price': 200},
                    {'inquiry_line': 2, 'unit_price': 150},
                ],
            },
            {
                'id': 11, 'supplier_name': 'ب', 'number': 'Q-2', 'status': 'received',
                'total': 800, 'delivery_days': 20,
                'lines': [
                    {'inquiry_line': 1, 'unit_price': 250},
                    {'inquiry_line': 2, 'unit_price': 100},
                ],
            },
            {
                'id': 12, 'supplier_name': 'ج', 'number': 'Q-3', 'status': 'rejected',
                'total': 500, 'delivery_days': 5,
                'lines': [{'inquiry_line': 1, 'unit_price': 50}],
            },
        ]
        return lines, quotations

    def test_lowest_price_marked_per_line(self):
        lines, quotations = self._payload()
        result = pricing.compare_quotations(lines, quotations)
        self.assertEqual(len(result['rows']), 2)
        first_row = result['rows'][0]
        self.assertEqual(first_row['lowest_price'], Decimal('50'))
        flags = {cell['quotation']: cell['is_lowest'] for cell in first_row['cells']}
        self.assertTrue(flags[12])
        self.assertFalse(flags[10])

    def test_missing_offer_is_reported(self):
        lines, quotations = self._payload()
        result = pricing.compare_quotations(lines, quotations)
        second_row = result['rows'][1]
        cells = {cell['quotation']: cell for cell in second_row['cells']}
        self.assertFalse(cells[12]['has_offer'])
        self.assertIsNone(cells[12]['unit_price'])

    def test_best_quotation_skips_rejected(self):
        lines, quotations = self._payload()
        result = pricing.compare_quotations(lines, quotations)
        # ارزان‌ترین پیشنهاد رد شده است؛ برنده باید «ب» باشد (۸۰۰ < ۹۰۰)
        self.assertEqual(result['best']['id'], 11)
        ranks = {row['id']: row['rank'] for row in result['suppliers']}
        self.assertEqual(ranks[11], 1)
        self.assertEqual(ranks[10], 2)
        self.assertEqual(ranks[12], 3)

    def test_empty_comparison(self):
        result = pricing.compare_quotations([], [])
        self.assertEqual(result['rows'], [])
        self.assertEqual(result['suppliers'], [])
        self.assertIsNone(result['best'])
