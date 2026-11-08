"""تست‌های تجمیع داشبورد خرید (بدون دیتابیس)."""
from datetime import date, timedelta

from django.test import SimpleTestCase

from procurement import dashboard as dash

TODAY = date(2026, 11, 8)


def _order(**overrides):
    row = {
        'id': 1, 'number': 'PO-1', 'status': 'sent', 'date': TODAY,
        'expected_date': None, 'total': 1000000, 'exchange_rate': None,
        'supplier_name': 'تأمین‌کننده الف', 'currency_code': 'IRR',
        'currency_name': 'ریال', 'project_name': 'پروژه یک',
    }
    row.update(overrides)
    return row


def _document(row):
    document = dash.normalize_document(row)
    document['expected_date'] = dash.iso(row.get('expected_date'))
    return document


class MonthBucketTests(SimpleTestCase):
    def test_six_months_are_ordered_and_cross_year_boundary(self):
        buckets = dash.month_buckets(6, today=date(2026, 2, 15))
        self.assertEqual(
            buckets,
            ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02'],
        )

    def test_month_key_accepts_string_and_date(self):
        self.assertEqual(dash.month_key('2026-11-08'), '2026-11')
        self.assertEqual(dash.month_key(TODAY), '2026-11')
        self.assertEqual(dash.month_key(None), '')


class CurrencyGroupTests(SimpleTestCase):
    def test_rial_codes_and_names(self):
        self.assertEqual(dash.currency_group('IRR'), 'rial')
        self.assertEqual(dash.currency_group('irt'), 'rial')
        self.assertEqual(dash.currency_group('', 'تومان'), 'rial')

    def test_foreign_codes(self):
        self.assertEqual(dash.currency_group('USD', 'دلار آمریکا'), 'foreign')
        self.assertEqual(dash.currency_group('EUR'), 'foreign')

    def test_falls_back_to_exchange_rate(self):
        self.assertEqual(dash.currency_group(None, None, 850000), 'foreign')
        self.assertEqual(dash.currency_group(None, None, 1), 'rial')


class NormalizeDocumentTests(SimpleTestCase):
    def test_rial_document_keeps_amount(self):
        document = _document(_order())
        self.assertEqual(document['group'], 'rial')
        self.assertEqual(document['amount'], 1000000)
        self.assertEqual(document['rial_amount'], 1000000)
        self.assertEqual(document['month'], '2026-11')

    def test_foreign_document_uses_exchange_rate_for_rial_equivalent(self):
        document = _document(_order(currency_code='USD', currency_name='دلار', exchange_rate=600000))
        self.assertEqual(document['group'], 'foreign')
        self.assertEqual(document['rial_amount'], 600000 * 1000000)


class MonthlySeriesTests(SimpleTestCase):
    def test_rows_land_in_the_right_buckets_and_out_of_range_is_ignored(self):
        buckets = dash.month_buckets(3, today=TODAY)  # 2026-09 .. 2026-11
        orders = [
            _document(_order(date=date(2026, 11, 2))),
            _document(_order(date=date(2026, 10, 5), total=500)),
            _document(_order(date=date(2025, 1, 1), total=999)),
        ]
        invoices = [_document(_order(date=date(2026, 11, 3), total=250, status='approved'))]
        payments = [{'date': '2026-11-04', 'amount': 100}]

        series = dash.build_monthly(orders, invoices, payments, buckets)

        self.assertEqual([row['month'] for row in series], buckets)
        self.assertEqual(series[-1]['orders'], 1)
        self.assertEqual(series[-1]['order_amount'], 1000000)
        self.assertEqual(series[-1]['invoice_amount'], 250)
        self.assertEqual(series[-1]['payment_amount'], 100)
        self.assertEqual(series[1]['orders'], 1)
        self.assertEqual(series[1]['order_amount'], 500)
        self.assertEqual(series[0]['orders'], 0)


class StatusBreakdownTests(SimpleTestCase):
    def test_counts_follow_model_choice_order_and_include_unknowns(self):
        rows = [{'status': 'sent'}, {'status': 'sent'}, {'status': 'draft'}, {'status': 'legacy'}]
        choices = [('draft', 'پیش‌نویس'), ('sent', 'ارسال'), ('closed', 'بسته')]

        result = dash.status_breakdown(rows, choices)

        self.assertEqual([item['key'] for item in result], ['draft', 'sent', 'legacy'])
        self.assertEqual(result[1]['count'], 2)
        self.assertEqual(result[1]['percent'], 50.0)
        self.assertEqual(result[2]['label'], 'legacy')


class DueOrderTests(SimpleTestCase):
    def test_upcoming_and_overdue_open_orders_only(self):
        orders = [
            _document(_order(id=1, expected_date=TODAY + timedelta(days=3))),
            _document(_order(id=2, expected_date=TODAY - timedelta(days=2))),
            _document(_order(id=3, expected_date=TODAY + timedelta(days=40))),
            _document(_order(id=4, status='closed', expected_date=TODAY)),
            _document(_order(id=5, expected_date=None)),
        ]

        rows = dash.due_orders(orders, today=TODAY, days=14)

        self.assertEqual([row['id'] for row in rows], [2, 1])
        self.assertEqual(rows[0]['days'], -2)
        self.assertEqual(rows[1]['days'], 3)


class GuaranteeSummaryTests(SimpleTestCase):
    def test_check_validity_rule_and_released_items(self):
        near_validity_end = TODAY - timedelta(days=365 * 5) + timedelta(days=200)
        rows = [
            # چک با سررسید گذشته اما در ۵ سال اعتبار (طبق قانون منقضی نیست)
            {'amount': 100, 'instrument_type': 'check', 'issue_date': near_validity_end,
             'expiry_date': TODAY - timedelta(days=60), 'is_released': False,
             'kind': 'performance', 'kind_label': 'حسن انجام تعهدات'},
            # ضمانت‌نامهٔ منقضی
            {'amount': 50, 'instrument_type': 'bank_guarantee',
             'issue_date': TODAY - timedelta(days=400),
             'guarantee_expiry_date': TODAY - timedelta(days=5), 'is_released': False,
             'kind': 'advance', 'kind_label': 'پیش‌پرداخت'},
            # آزادشده
            {'amount': 30, 'instrument_type': 'check', 'issue_date': TODAY,
             'is_released': True, 'kind': 'performance', 'kind_label': 'حسن انجام تعهدات'},
        ]

        summary = dash.guarantee_summary(rows, today=TODAY)

        self.assertEqual(summary['total'], 3)
        self.assertEqual(summary['active'], 2)
        self.assertEqual(summary['released'], 1)
        self.assertEqual(summary['expired'], 1)
        self.assertEqual(summary['active_amount'], 150)
        self.assertEqual(summary['released_amount'], 30)
        self.assertEqual(summary['kinds'][0]['key'], 'performance')
        self.assertEqual(summary['kinds'][0]['count'], 2)


class BuildDashboardTests(SimpleTestCase):
    def test_totals_groups_and_collection_rate(self):
        orders = [
            _document(_order(id=1, status='sent', total=1000)),
            _document(_order(id=2, status='closed', total=100, exchange_rate=500,
                             currency_code='USD', currency_name='دلار')),
            _document(_order(id=3, status='cancelled', total=999)),
        ]
        invoices = [
            {**_document(_order(date=TODAY, total=800)), 'paid_amount': 300, 'overdue': True},
            {**_document(_order(date=TODAY, total=100, exchange_rate=500,
                                currency_code='USD', currency_name='دلار')),
             'paid_amount': 50000, 'overdue': False},
        ]
        inquiries = [{'status': 'open'}, {'status': 'awarded'}]

        payload = dash.build_dashboard(
            {'orders': len(orders)}, orders, invoices, [], inquiries, [],
            order_status_choices=[('draft', 'پیش‌نویس'), ('sent', 'ارسال'),
                                  ('cancelled', 'لغو'), ('closed', 'بسته')],
            inquiry_status_choices=[('open', 'باز'), ('awarded', 'برنده')],
            today=TODAY,
        )

        totals = payload['totals']
        self.assertEqual(totals['order_amount'], 1000 + 50000)
        self.assertEqual(totals['invoiced'], 800 + 50000)
        self.assertEqual(totals['paid'], 300 + 50000)
        self.assertEqual(totals['outstanding'], 500)
        self.assertAlmostEqual(totals['collection_rate'], 99.0, places=1)
        self.assertEqual(totals['overdue_invoices'], 1)
        self.assertEqual(totals['open_orders'], 1)
        self.assertEqual(totals['open_inquiries'], 1)
        self.assertEqual(totals['rial_count'], 1)
        self.assertEqual(totals['foreign_count'], 1)

        self.assertEqual(payload['groups']['rial']['invoiced'], 800)
        self.assertEqual(payload['groups']['foreign']['paid'], 50000)
        self.assertEqual(payload['by_currency'][0]['currency'], 'USD')
        self.assertEqual([item['key'] for item in payload['order_status']], ['sent', 'cancelled', 'closed'])
        self.assertEqual(payload['top_suppliers'][0]['name'], 'تأمین‌کننده الف')
        card_ids = [card['id'] for card in payload['orders']]
        self.assertNotIn(3, card_ids)
        self.assertEqual(len(payload['monthly']), dash.MONTHS)
