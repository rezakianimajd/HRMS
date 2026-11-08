"""تست‌های موتور «نواقص قراردادها» (بدون دیتابیس)."""
from datetime import date, timedelta

from django.test import SimpleTestCase

from contracts import completeness as comp

TODAY = date(2026, 11, 8)


def _row(**overrides):
    """قرارداد «کامل» — هیچ نقصی ندارد؛ هر تست یک فیلد را خالی می‌کند."""
    row = {
        'id': 1, 'number': 'C-1', 'subject': 'قرارداد نمونه', 'status': 'active',
        'status_label': 'در حال اجرا', 'contract_type': 'purchase', 'contract_type_label': 'خرید',
        'party_id': 5, 'party_name': 'شرکت الف',
        'party_national_id': '10101010101', 'party_economic_code': '411111111111',
        'amount': 1000, 'currency': 2,
        'start_date': date(2026, 1, 1), 'end_date': date(2026, 12, 31),
        'signing_date': date(2025, 12, 25), 'signatory': 3,
        'project_id': 9, 'project_name': 'پروژه یک',
        'project_allocations': [{'project': 9, 'percentage': 100}],
        'guarantee_amount': 100, 'guarantee_items': [{'type': 'performance', 'amount': 100}],
        'payment_terms': '۳۰ روزه', 'penalty_terms': 'روزانه', 'insurance_terms': 'تأمین',
        'delivery_terms': 'در محل', 'category': 'خدمات', 'project_location': 'تهران',
        'description': 'توضیح', 'tender_number': '', 'retention_percent': 5, 'advance_payment': 10,
        'documents_count': 1, 'document_titles': ['قرارداد امضاشده'],
        'invoices_count': 0, 'statements_count': 1, 'guarantees_count': 1, 'invoices_total': 0,
    }
    row.update(overrides)
    return row


def _codes(row):
    return {issue['code'] for issue in comp.contract_issues(row, today=TODAY)}


class CleanContractTests(SimpleTestCase):
    def test_complete_contract_has_no_issues_and_full_score(self):
        issues = comp.contract_issues(_row(), today=TODAY)

        self.assertEqual(issues, [])
        self.assertEqual(comp.contract_score(issues), 100)


class FieldRuleTests(SimpleTestCase):
    def test_missing_critical_fields_are_reported(self):
        codes = _codes(_row(number='', amount=None, start_date=None, end_date=None))

        self.assertIn('missing_number', codes)
        self.assertIn('missing_amount', codes)
        self.assertIn('missing_start_date', codes)
        self.assertIn('missing_end_date', codes)

    def test_missing_terms_and_optional_fields(self):
        codes = _codes(_row(payment_terms='', penalty_terms='', category='', description='',
                            retention_percent=None, advance_payment=None))

        self.assertIn('missing_payment_terms', codes)
        self.assertIn('missing_penalty_terms', codes)
        self.assertIn('missing_category', codes)
        self.assertIn('missing_description', codes)
        self.assertIn('missing_retention', codes)
        self.assertIn('missing_advance', codes)

    def test_party_identity_gaps(self):
        codes = _codes(_row(party_national_id='', party_economic_code=''))

        self.assertIn('party_missing_national_id', codes)
        self.assertIn('party_missing_economic_code', codes)

    def test_tender_requires_tender_number(self):
        codes = _codes(_row(contract_type='tender', tender_number=''))

        self.assertIn('tender_number_missing', codes)
        self.assertNotIn('tender_number_missing', _codes(_row(contract_type='tender', tender_number='T-1')))


class ProjectRuleTests(SimpleTestCase):
    def test_project_without_allocation_percentage(self):
        codes = _codes(_row(project_allocations=[]))

        self.assertIn('project_share_missing', codes)

    def test_allocation_percentages_must_sum_to_hundred(self):
        codes = _codes(_row(project_allocations=[
            {'project': 9, 'percentage': 60}, {'project': 10, 'percentage': 30},
        ]))

        self.assertIn('project_share_invalid', codes)
        self.assertNotIn('project_share_missing', codes)

    def test_contract_without_any_project(self):
        codes = _codes(_row(project_id=None, project_allocations=[], project_name=''))

        self.assertIn('no_project', codes)


class DocumentRuleTests(SimpleTestCase):
    def test_no_documents(self):
        codes = _codes(_row(documents_count=0, document_titles=[]))

        self.assertIn('no_documents', codes)
        self.assertNotIn('no_contract_document', codes)

    def test_documents_without_contract_title(self):
        codes = _codes(_row(document_titles=['فاکتور خرید']))

        self.assertIn('no_contract_document', codes)
        self.assertNotIn('no_documents', codes)


class DateRuleTests(SimpleTestCase):
    def test_end_before_start(self):
        codes = _codes(_row(start_date=date(2026, 6, 1), end_date=date(2026, 5, 1)))

        self.assertIn('end_before_start', codes)

    def test_signing_after_start(self):
        codes = _codes(_row(start_date=date(2026, 1, 1), signing_date=date(2026, 2, 1)))

        self.assertIn('signing_after_start', codes)

    def test_open_contract_with_past_end_date(self):
        codes = _codes(_row(status='active', end_date=TODAY - timedelta(days=30)))

        self.assertIn('expired_but_active', codes)
        self.assertNotIn('expired_but_active',
                         _codes(_row(status='completed', end_date=TODAY - timedelta(days=30))))


class FinancialRuleTests(SimpleTestCase):
    def test_contract_amount_without_statements_or_invoices(self):
        codes = _codes(_row(statements_count=0, invoices_count=0))

        self.assertIn('no_financial_documents', codes)

    def test_invoices_more_than_contract_amount(self):
        codes = _codes(_row(invoices_total=1500))

        self.assertIn('invoice_over_amount', codes)
        issue = next(item for item in comp.contract_issues(_row(invoices_total=1500), today=TODAY)
                     if item['code'] == 'invoice_over_amount')
        self.assertIn('detail', issue)

    def test_guarantee_defined_but_not_registered(self):
        codes = _codes(_row(guarantees_count=0))

        self.assertIn('guarantee_missing', codes)
        self.assertNotIn('guarantee_undefined', codes)

    def test_guarantee_not_defined_at_all(self):
        codes = _codes(_row(guarantee_amount=None, guarantee_items=[], guarantees_count=0))

        self.assertIn('guarantee_undefined', codes)
        self.assertNotIn('guarantee_missing', codes)


class ScoreTests(SimpleTestCase):
    def test_score_drops_with_severity_weight(self):
        high_only = [comp.RULE_BY_CODE['no_documents']]
        medium_only = [comp.RULE_BY_CODE['missing_signing_date']]

        self.assertEqual(comp.contract_score(high_only), 88)
        self.assertEqual(comp.contract_score(medium_only), 94)
        self.assertEqual(comp.contract_score(high_only * 12), 0)

    def test_max_severity_picks_the_worst(self):
        issues = comp.contract_issues(_row(documents_count=0, description=''), today=TODAY)

        self.assertEqual(comp.max_severity(issues), 'high')
        self.assertEqual(comp.max_severity([]), None)


class BuildCompletenessTests(SimpleTestCase):
    def _rows(self):
        return [
            _row(id=1, number='C-1'),
            _row(id=2, number='C-2', documents_count=0, document_titles=[],
                 project_allocations=[], amount=None),
            _row(id=3, number='C-3', description='', category='', insurance_terms=''),
        ]

    def test_summary_filters_and_order(self):
        payload = comp.build_completeness(self._rows(), today=TODAY)

        self.assertEqual(payload['total_contracts'], 3)
        self.assertEqual(payload['filtered_total'], 3)
        self.assertEqual(payload['summary']['clean'], 1)
        self.assertEqual(payload['summary']['with_issues'], 2)
        self.assertEqual(payload['summary']['severity']['high'], 1)
        self.assertEqual(payload['summary']['severity']['low'], 1)
        self.assertEqual(payload['summary']['issues_total'], 6)
        # قرارداد با نقص بحرانی اول نمایش داده می‌شود
        self.assertEqual(payload['contracts'][0]['id'], 2)
        self.assertEqual(payload['contracts'][0]['max_severity'], 'high')
        self.assertEqual(payload['contracts'][0]['score'], 64)
        self.assertTrue(payload['rules'])

    def test_filter_by_code_severity_group_and_search(self):
        rows = self._rows()

        by_code = comp.build_completeness(rows, today=TODAY, codes=['no_documents'])
        self.assertEqual([item['id'] for item in by_code['contracts']], [2])

        by_severity = comp.build_completeness(rows, today=TODAY, severity='low')
        self.assertEqual([item['id'] for item in by_severity['contracts']], [3])

        by_group = comp.build_completeness(rows, today=TODAY, group='project')
        self.assertEqual([item['id'] for item in by_group['contracts']], [2])

        by_search = comp.build_completeness(rows, today=TODAY, search='C-3')
        self.assertEqual([item['id'] for item in by_search['contracts']], [3])

    def test_by_code_and_by_group_counts(self):
        payload = comp.build_completeness(self._rows(), today=TODAY)
        codes = {item['code']: item['count'] for item in payload['summary']['by_code']}
        groups = {item['group']: item['count'] for item in payload['summary']['by_group']}

        self.assertEqual(codes['no_documents'], 1)
        self.assertEqual(codes['project_share_missing'], 1)
        self.assertEqual(codes['missing_description'], 1)
        self.assertEqual(groups['documents'], 1)
        self.assertEqual(groups['project'], 1)
