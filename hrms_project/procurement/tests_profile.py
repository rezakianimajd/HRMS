"""تست‌های تجمیع «پروندهٔ خرید» (بدون دیتابیس)."""
from datetime import date, timedelta

from django.test import SimpleTestCase

from procurement import profile as prof

TODAY = date(2026, 11, 8)


def _doc(amount=1000, group='rial', **overrides):
    document = {
        'id': overrides.pop('id', 1),
        'number': overrides.pop('number', 'PO-1'),
        'date': overrides.pop('date', TODAY.isoformat()),
        'amount': amount,
        'rial_amount': amount if group == 'rial' else amount * 500,
        'group': group,
        'status': overrides.pop('status', 'sent'),
        'status_label': overrides.pop('status_label', 'ارسال به تأمین‌کننده'),
    }
    document.update(overrides)
    return document


class SupplierSummaryTests(SimpleTestCase):
    def test_orders_invoices_and_collection_rate(self):
        orders = [
            _doc(1000, id=1, status='sent'),
            _doc(2000, id=2, status='closed'),
            _doc(500, id=3, status='cancelled'),
        ]
        invoices = [
            _doc(800, id=11, status='approved', paid_amount=300, overdue=True, payment_status='partial'),
            _doc(200, id=12, status='paid', paid_amount=200, overdue=False, payment_status='paid'),
        ]
        payments = [{'amount': 300, 'date': TODAY.isoformat()}, {'amount': 200, 'date': TODAY.isoformat()}]

        summary = prof.supplier_summary(orders, invoices, payments, [], [], [], today=TODAY)

        self.assertEqual(summary['orders']['count'], 3)
        self.assertEqual(summary['orders']['amount'], 3500)
        self.assertEqual(summary['orders']['average'], round(3500 / 3, 2))
        self.assertEqual(summary['orders']['open_count'], 1)
        self.assertEqual(summary['orders']['open_amount'], 1000)
        self.assertEqual(summary['invoices']['invoiced'], 1000)
        self.assertEqual(summary['invoices']['paid'], 500)
        self.assertEqual(summary['invoices']['balance'], 500)
        self.assertEqual(summary['invoices']['overdue_count'], 1)
        self.assertEqual(summary['invoices']['unpaid_count'], 1)
        self.assertEqual(summary['payments']['count'], 2)
        self.assertEqual(summary['payments']['amount'], 500)
        self.assertEqual(summary['collection_rate'], 50.0)
        self.assertEqual(summary['last_activity'], TODAY.isoformat())

    def test_currency_mix_and_quotations(self):
        orders = [
            _doc(1000, group='rial', id=1),
            _doc(10, group='foreign', id=2, currency='USD'),
        ]
        quotations = [
            {'total': 100, 'rial_amount': 100, 'date': '2026-10-01', 'is_winner': True},
            {'total': 200, 'rial_amount': 200, 'date': '2026-10-02', 'is_winner': False},
        ]

        summary = prof.supplier_summary(orders, [], [], [], [], quotations, today=TODAY)

        self.assertEqual(summary['orders']['rial_count'], 1)
        self.assertEqual(summary['orders']['foreign_count'], 1)
        self.assertEqual(summary['orders']['foreign_amount'], 5000)
        self.assertEqual(summary['orders']['by_currency'][0]['currency'], 'USD')
        self.assertEqual(summary['quotations']['count'], 2)
        self.assertEqual(summary['quotations']['won_count'], 1)

    def test_empty_portfolio_has_zero_metrics(self):
        summary = prof.supplier_summary([], [], [], [], [], [], today=TODAY)

        self.assertEqual(summary['orders']['count'], 0)
        self.assertEqual(summary['orders']['average'], 0)
        self.assertEqual(summary['collection_rate'], 0)
        self.assertIsNone(summary['last_activity'])


class GuaranteeStateTests(SimpleTestCase):
    def test_check_validity_and_released(self):
        checks = [
            # چک با سررسید گذشته اما در ۵ سال اعتبار → منقضی نیست
            {'amount': 100, 'instrument_type': 'check',
             'issue_date': TODAY - timedelta(days=365 * 5) + timedelta(days=10),
             'expiry_date': TODAY - timedelta(days=60), 'is_released': False},
            # ضمانت‌نامهٔ منقضی
            {'amount': 50, 'instrument_type': 'bank_guarantee',
             'guarantee_expiry_date': TODAY - timedelta(days=3), 'is_released': False},
            # آزادشده
            {'amount': 30, 'instrument_type': 'check', 'issue_date': TODAY, 'is_released': True},
        ]

        state = prof.guarantee_state(checks, today=TODAY)

        self.assertEqual(state['count'], 3)
        self.assertEqual(state['active_count'], 2)
        self.assertEqual(state['active_amount'], 150)
        self.assertEqual(state['expired_count'], 1)
        self.assertEqual(state['released_count'], 1)
        self.assertEqual(state['amount'], 180)


class TimelineTests(SimpleTestCase):
    def test_events_are_merged_sorted_and_without_dates_dropped(self):
        orders = [_doc(1000, id=1, date='2026-09-01', number='PO-100')]
        invoices = [_doc(800, id=11, date='2026-10-05', number='INV-1', status_label='تأییدشده')]
        payments = [{'id': 21, 'date': '2026-10-10', 'amount': 300, 'invoice_number': 'INV-1',
                     'method_label': 'انتقال بانکی'}]
        guarantees = [{'id': 31, 'issue_date': '2026-08-01', 'number': 'G-1',
                       'kind_label': 'حسن انجام تعهدات', 'amount': 50}]
        documents = [{'id': 41, 'title': 'سند استعلام', 'kind_label': 'مدارک استعلام',
                      'created_at': '2026-10-12'}]

        timeline = prof.build_timeline(orders, invoices, payments, guarantees, (), documents)

        self.assertEqual(
            [item['date'] for item in timeline],
            ['2026-10-12', '2026-10-10', '2026-10-05', '2026-09-01', '2026-08-01'],
        )
        self.assertEqual(timeline[0]['kind'], 'document')
        self.assertEqual(timeline[1]['amount'], 300)
        self.assertEqual(timeline[2]['detail'], 'تأییدشده')
        self.assertEqual(prof.build_timeline([{'date': None}], (), (), (), (), ()), [])
