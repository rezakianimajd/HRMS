"""تست‌های واحد ماژول برنامه‌ریزی شخصی (بدون دیتابیس)."""
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from planning import services
from planning.models import PlanningShare, Task


class PlanningCryptoTests(SimpleTestCase):
    @override_settings(SECRET_KEY='unit-test-secret-key')
    def test_note_body_round_trip(self):
        plain = 'یادآوری: مالیات قرارداد ۱۲۵ را بررسی کن.'
        cipher = services.encrypt_text(plain)
        self.assertNotEqual(cipher, plain)
        self.assertEqual(services.decrypt_text(cipher), plain)


class PlanningPermissionTests(SimpleTestCase):
    def test_item_models_cover_note_and_task(self):
        self.assertEqual(
            set(services.ITEM_MODELS), {PlanningShare.ItemKind.NOTE, PlanningShare.ItemKind.TASK},
        )

    def test_permission_for_unknown_kind_returns_none(self):
        user = SimpleNamespace(pk=1, is_superuser=False)
        self.assertIsNone(services.permission_for(user, 'unknown', 5))

    def test_upcoming_summary_for_anonymous_user(self):
        user = SimpleNamespace(is_authenticated=False, pk=None)
        self.assertEqual(services.upcoming_summary(user)['planning'], 0)


class TaskModelLogicTests(SimpleTestCase):
    def test_overdue_flag_is_safe_without_database(self):
        task = Task(status=Task.Status.TODO)
        task.due_date = None
        self.assertFalse(task.is_overdue)
        task.status = Task.Status.DONE
        self.assertFalse(task.is_overdue)

    def test_share_notification_is_best_effort(self):
        """نبود جدول اعلان نباید اشتراک‌گذاری را بشکند."""
        item = SimpleNamespace(pk=3, title='بررسی مالیات', is_shared=False,
                               save=lambda **_: None)
        user = SimpleNamespace(pk=9)
        shared_by = SimpleNamespace(pk=1, get_full_name=lambda: 'مدیر', get_username=lambda: 'admin')
        share = SimpleNamespace(shared_with=user)
        with patch('django.contrib.auth.get_user_model') as user_model, \
                patch('planning.services.PlanningShare.objects.update_or_create',
                      return_value=(share, True)), \
                patch('planning.services._notify_share') as notify:
            user_model.return_value.objects.filter.return_value = [user]
            shares = services.share_item(
                SimpleNamespace(pk=1), item, PlanningShare.ItemKind.TASK, shared_by,
                user_ids=[9],
            )
        self.assertEqual(len(shares), 1)
        notify.assert_called_once()
