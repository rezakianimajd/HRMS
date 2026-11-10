"""تست‌های ماژول اعلان (بدون دیتابیس)."""
from types import SimpleNamespace

from django.test import SimpleTestCase

from notifications.models import Notification
from notifications.views import (
    PERSONAL_CATEGORIES, apply_notification_visibility,
)


class NotificationVisibilityTests(SimpleTestCase):
    """اعلان‌های چت/برنامه‌ریزی فقط برای گیرندهٔ خودشان است."""

    def test_personal_categories_cover_chat_and_planning(self):
        for category in ('chat_message', 'chat_mention', 'chat_member_added',
                         'planning_share', 'planning_due'):
            self.assertIn(category, PERSONAL_CATEGORIES)

    def test_superuser_scope_still_excludes_other_peoples_personal_rows(self):
        user = SimpleNamespace(pk=1, is_superuser=True, is_authenticated=True)
        sql = str(apply_notification_visibility(Notification.objects.all(), user).query).upper()
        self.assertIn('NOT', sql)
        for category in ('CHAT_MESSAGE', 'CHAT_MENTION', 'PLANNING_SHARE'):
            self.assertIn(category, sql)

    def test_regular_user_only_sees_own_notifications(self):
        user = SimpleNamespace(pk=7, is_superuser=False, is_authenticated=True, profile=None)
        sql = str(apply_notification_visibility(Notification.objects.all(), user).query)
        self.assertIn('"user_id" = 7', sql)

    def test_hr_admin_sees_global_and_own(self):
        profile = SimpleNamespace(role='hr_manager')
        user = SimpleNamespace(pk=9, is_superuser=False, is_authenticated=True, profile=profile)
        sql = str(apply_notification_visibility(Notification.objects.all(), user).query)
        self.assertIn('"user_id" IS NULL', sql)
        self.assertIn('"user_id" = 9', sql)
