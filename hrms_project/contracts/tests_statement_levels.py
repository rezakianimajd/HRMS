"""تست‌های قواعد سطوح صورت‌وضعیت (بدون نیاز به دیتابیس)."""
from django.test import SimpleTestCase

from contracts.statement_levels import level_charge_flags, level_payload


class LevelChargeFlagsTests(SimpleTestCase):
    def test_legacy_flag_enables_both(self):
        self.assertEqual(level_charge_flags({'includes_charges': True}), (True, True))
        self.assertEqual(level_charge_flags({'includes_charges': False}), (False, False))
        self.assertEqual(level_charge_flags({}), (False, False))

    def test_explicit_flags_win_over_legacy(self):
        self.assertEqual(
            level_charge_flags({
                'includes_charges': True,
                'includes_additions': False,
                'includes_deductions': True,
            }),
            (False, True),
        )

    def test_only_deductions(self):
        level = {'includes_additions': False, 'includes_deductions': True}
        self.assertEqual(level_charge_flags(level), (False, True))

    def test_only_additions(self):
        level = {'includes_additions': True, 'includes_deductions': False}
        self.assertEqual(level_charge_flags(level), (True, False))

    def test_partial_new_keys_fall_back_to_legacy(self):
        self.assertEqual(
            level_charge_flags({'includes_charges': True, 'includes_additions': False}),
            (False, True),
        )
        self.assertEqual(
            level_charge_flags({'includes_charges': False, 'includes_deductions': True}),
            (False, True),
        )

    def test_invalid_level(self):
        self.assertEqual(level_charge_flags(None), (False, False))
        self.assertEqual(level_charge_flags('x'), (False, False))


class LevelPayloadTests(SimpleTestCase):
    def test_payload_keeps_legacy_flag_only_when_both_are_enabled(self):
        both = level_payload('خرید', includes_additions=True, includes_deductions=True)
        self.assertEqual(both['includes_additions'], True)
        self.assertEqual(both['includes_deductions'], True)
        self.assertEqual(both['includes_charges'], True)

    def test_single_flag_does_not_set_legacy_field(self):
        additions = level_payload('خرید', includes_additions=True, includes_deductions=False)
        self.assertFalse(additions['includes_charges'])
        deductions = level_payload('خرید', includes_additions=False, includes_deductions=True)
        self.assertFalse(deductions['includes_charges'])
        self.assertEqual(deductions['title'], 'خرید')

    def test_payload_values_are_booleans(self):
        payload = level_payload('x', includes_additions=1, includes_deductions=0)
        self.assertIs(payload['includes_additions'], True)
        self.assertIs(payload['includes_deductions'], False)
        self.assertIs(payload['includes_charges'], False)
