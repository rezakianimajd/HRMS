from datetime import date
from types import SimpleNamespace

from django.test import SimpleTestCase

from contracts.payment_report import matches_search, payment_report_row, report_summary


def _contract(**overrides):
    data = {
        'id': 1,
        'number': 'C-1',
        'subject': 'قرارداد نمونه',
        'advance_payment': 1000,
        'project_id': 10,
        'project_allocations': [{'project': '20', 'percentage': 50}],
        'party': SimpleNamespace(name='شرکت نمونه'),
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def _statement(identifier, net):
    return SimpleNamespace(id=identifier, net_amount=net, amount=0)


def _invoice(identifier, total):
    return SimpleNamespace(id=identifier, total=total, amount=0)


def _payment(payment_type, amount, day):
    return SimpleNamespace(payment_type=payment_type, amount=amount, date=day)


def _allocation(amount, kind='net', statement_id=None, invoice_id=None):
    return SimpleNamespace(
        amount=amount, kind=kind, statement_id=statement_id, invoice_id=invoice_id,
    )


class ContractPaymentReportTests(SimpleTestCase):
    def test_row_calculates_advance_claims_paid_and_last_payment(self):
        row = payment_report_row(
            _contract(),
            payments=[
                _payment('advance', 300, date(2026, 4, 1)),
                _payment('normal', 500, date(2026, 5, 2)),
            ],
            allocations=[
                _allocation(400, statement_id=1),
                _allocation(300, invoice_id=1),
                _allocation(100, kind='retention', statement_id=1),
            ],
            statements=[_statement(1, 1000), _statement(2, 500)],
            invoices=[_invoice(1, 800)],
            project_names={10: 'پروژه اصلی', 20: 'پروژه دوم'},
        )
        self.assertEqual(row['advance_contract'], '1000')
        self.assertEqual(row['advance_paid'], '300')
        self.assertEqual(row['advance_balance'], '700')
        self.assertEqual(row['paid_total'], '700')  # retention پرداخت نقدی نیست
        self.assertEqual(row['payable_claims'], '1600')
        self.assertEqual(row['last_payment_date'], '2026-05-02')
        self.assertEqual(row['projects'], ['پروژه اصلی', 'پروژه دوم'])
        self.assertEqual(row['projects_display'], 'پروژه اصلی، پروژه دوم')

    def test_search_uses_party_number_subject_and_projects(self):
        row = payment_report_row(
            _contract(),
            project_names={10: 'پروژه اصلی'},
        )
        self.assertTrue(matches_search(row, 'شرکت نمونه'))
        self.assertTrue(matches_search(row, 'C-1'))
        self.assertTrue(matches_search(row, 'پروژه اصلی'))
        self.assertFalse(matches_search(row, 'قرارداد دیگر'))

    def test_summary_sums_all_money_columns(self):
        rows = [
            payment_report_row(_contract(), project_names={10: 'پروژه'}),
            payment_report_row(_contract(id=2, advance_payment=2000), project_names={10: 'پروژه'}),
        ]
        summary = report_summary(rows)
        self.assertEqual(summary['contract_count'], 2)
        self.assertEqual(summary['advance_contract'], '3000')
        self.assertEqual(summary['advance_paid'], '0')
