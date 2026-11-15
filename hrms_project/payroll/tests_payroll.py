"""DB-free tests for payroll formula/calculation/calendar primitives."""
from decimal import Decimal

from django.test import SimpleTestCase

from payroll.engine import calculator
from payroll.engine.calendar import PayrollCalendarError, jalali_month_bounds, months_between
from payroll.engine.formula import FormulaError, evaluate, validate_formula


class FormulaEngineTests(SimpleTestCase):
    def test_arithmetic_and_functions(self):
        self.assertEqual(evaluate('BASE_SALARY + 100', {'BASE_SALARY': 900}), Decimal('1000'))
        self.assertEqual(evaluate('SUM(10, 20, 30)', {}), Decimal('60'))
        self.assertEqual(evaluate('ROUND(10 / 3, 0)', {}), Decimal('3'))
        self.assertEqual(evaluate('IF(1 > 0, 5, 9)', {}), Decimal('5'))
        self.assertEqual(evaluate('MAX(2, 8) - MIN(2, 8)', {}), Decimal('6'))

    def test_unknown_variable_is_zero(self):
        self.assertEqual(evaluate('MISSING_CODE + 5', {}), Decimal('5'))

    def test_unsafe_formula_rejected(self):
        for formula in ('__import__("os")', 'os.system("x")', '[x for x in y]', 'a.b'):
            with self.assertRaises(FormulaError):
                validate_formula(formula)

    def test_division_by_zero_rejected(self):
        with self.assertRaises(FormulaError):
            evaluate('10 / 0', {})


class CalculatorTests(SimpleTestCase):
    def test_insurance_rates_and_ceiling(self):
        result = calculator.insurance_amounts(1000, 7, 23, min_base=0, max_base=900)
        self.assertEqual(result['base'], Decimal('900'))
        self.assertEqual(result['employee'], Decimal('63'))
        self.assertEqual(result['employer'], Decimal('207'))

    def test_progressive_tax(self):
        brackets = [
            {'lower_bound': 0, 'upper_bound': 100, 'rate': 10},
            {'lower_bound': 100, 'upper_bound': None, 'rate': 20},
        ]
        result = calculator.progressive_tax(300, brackets, exemption=0)
        self.assertEqual(result['amount'], Decimal('50'))  # 100*10% + 200*20%

    def test_tax_respects_exemption_and_insurance(self):
        brackets = [{'lower_bound': 0, 'upper_bound': None, 'rate': 10}]
        result = calculator.progressive_tax(1000, brackets, exemption=200, insurance_deduction=100)
        self.assertEqual(result['taxable'], Decimal('700'))
        self.assertEqual(result['amount'], Decimal('70'))

    def test_overtime_and_rounding(self):
        self.assertEqual(calculator.overtime_amount(3000, 30, 8, 4, 1.4), Decimal('70'))
        self.assertEqual(calculator.round_money(Decimal('1004'), Decimal('10')), Decimal('1000'))

    def test_summarize_lines(self):
        result = calculator.summarize_lines([
            {'kind': 'earning', 'amount': 100, 'is_insurable': True, 'is_taxable': True},
            {'kind': 'earning', 'amount': 50, 'is_insurable': False, 'is_taxable': True},
            {'kind': 'deduction', 'amount': 10},
            {'kind': 'employer_cost', 'amount': 23},
        ])
        self.assertEqual(result['earnings'], Decimal('150'))
        self.assertEqual(result['insurance_base'], Decimal('100'))
        self.assertEqual(result['taxable_base'], Decimal('150'))
        self.assertEqual(result['employer_costs'], Decimal('23'))


class PayrollCalendarTests(SimpleTestCase):
    def test_month_bounds_are_contiguous(self):
        start, end = jalali_month_bounds(1405, 1)
        self.assertLessEqual(start, end)
        self.assertEqual((end - start).days + 1, 31)

    def test_invalid_month(self):
        with self.assertRaises(PayrollCalendarError):
            jalali_month_bounds(1405, 13)

    def test_months_between(self):
        start, _ = jalali_month_bounds(1405, 11)
        _, end = jalali_month_bounds(1406, 2)
        rows = months_between(start, end)
        self.assertEqual(rows[0], (1405, 11))
        self.assertEqual(rows[-1], (1406, 2))
        self.assertEqual(len(rows), 4)
