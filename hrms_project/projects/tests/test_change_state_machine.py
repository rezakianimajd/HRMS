"""تست چرخهٔ وضعیت تغییر پروژه (فاز ۲) — بدون دیتابیس."""
from django.test import SimpleTestCase

from projects.change_service import ALLOWED_TRANSITIONS, can_transition, next_statuses


class ChangeOrderStateMachineTests(SimpleTestCase):

    def test_draft_can_be_submitted_or_cancelled(self):
        self.assertTrue(can_transition('draft', 'submitted'))
        self.assertTrue(can_transition('draft', 'cancelled'))
        self.assertFalse(can_transition('draft', 'approved'))
        self.assertFalse(can_transition('draft', 'applied'))

    def test_submitted_needs_decision(self):
        self.assertTrue(can_transition('submitted', 'approved'))
        self.assertTrue(can_transition('submitted', 'rejected'))
        self.assertFalse(can_transition('submitted', 'applied'))

    def test_only_approved_can_be_applied(self):
        self.assertTrue(can_transition('approved', 'applied'))
        self.assertFalse(can_transition('rejected', 'applied'))
        self.assertFalse(can_transition('applied', 'approved'))

    def test_rejected_can_return_to_draft(self):
        self.assertTrue(can_transition('rejected', 'draft'))
        self.assertTrue(can_transition('cancelled', 'draft'))

    def test_applied_is_terminal(self):
        self.assertEqual(ALLOWED_TRANSITIONS['applied'], set())
        self.assertEqual(next_statuses('applied'), [])

    def test_next_statuses_are_sorted_lists(self):
        self.assertEqual(next_statuses('draft'), ['cancelled', 'submitted'])
        self.assertEqual(next_statuses('submitted'), ['approved', 'cancelled', 'rejected'])
        self.assertEqual(next_statuses('approved'), ['applied', 'cancelled'])

    def test_unknown_status_has_no_transition(self):
        self.assertFalse(can_transition('unknown', 'approved'))
        self.assertEqual(next_statuses('unknown'), [])
