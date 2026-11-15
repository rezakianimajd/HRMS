"""تست‌های واحد ماژول برنامه‌ریزی شخصی (بدون دیتابیس)."""
from datetime import date
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from planning import query, services
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


class AssignmentMetadataTests(SimpleTestCase):
    """نقش‌ها و گروه‌های محول‌کردن وظیفه."""

    def test_assignee_role_is_defined(self):
        self.assertEqual(PlanningShare.Role.ASSIGNEE, 'assignee')
        self.assertIn('assignee', dict(PlanningShare.Role.choices))

    def test_assignee_groups_reads_task_relation(self):
        fake_group = SimpleNamespace(pk=3, name='تیم مالی', color='#0ea5e9')

        class _Manager:
            @staticmethod
            def all():
                return [fake_group]

        task = SimpleNamespace(assignee_groups=_Manager())
        self.assertEqual(services.assignee_groups(task), [
            {'id': 3, 'name': 'تیم مالی', 'color': '#0ea5e9'},
        ])

    def test_group_member_ids_is_empty_without_groups(self):
        self.assertEqual(services.group_member_ids(SimpleNamespace(pk=1), []), [])


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


class PlanningQueryHelperTests(SimpleTestCase):
    """پارس فیلتر/مرتب‌سازی/خلاصهٔ فهرست‌ها (بدون دیتابیس)."""

    def test_csv_list_filters_unknown_values(self):
        self.assertEqual(
            query.csv_list('todo, UNKNOWN ,done,todo', query.TASK_STATUSES),
            ['todo', 'done'],
        )
        self.assertEqual(query.csv_list('', query.TASK_STATUSES), [])

    def test_int_list_ignores_invalid_tokens(self):
        self.assertEqual(query.int_list('3, x,5,3'), [3, 5])
        self.assertEqual(query.int_list(None), [])

    def test_task_filters_open_and_status_precedence(self):
        filters = query.task_filters({'open': '1'})
        self.assertEqual(filters['status__in'], ['todo', 'doing'])
        filters = query.task_filters({'open': '1', 'status': 'done'})
        self.assertEqual(filters['status__in'], ['done'])

    def test_task_filters_due_presets(self):
        today = date(2026, 11, 15)
        self.assertEqual(query.task_filters({'due': 'today'}, today)['due_date'], today)
        self.assertEqual(
            query.task_filters({'due': 'overdue'}, today)['due_date__lt'], today,
        )
        week = query.task_filters({'due': 'week'}, today)['due_date__range']
        self.assertEqual(week, (today, date(2026, 11, 22)))
        self.assertEqual(
            query.task_filters({'due_from': '2026-11-01', 'due_to': '2026-11-30'}, today),
            {'due_date__range': (date(2026, 11, 1), date(2026, 11, 30))},
        )

    def test_task_filters_tag_group_and_pinned(self):
        filters = query.task_filters({'tag': 'مالی', 'group': '2,4', 'pinned': 'true'})
        self.assertEqual(filters['tags__icontains'], 'مالی')
        self.assertEqual(filters['assignee_groups__id__in'], [2, 4])
        self.assertTrue(filters['is_pinned'])

    def test_note_filters_and_ordering(self):
        filters = query.note_filters({'color': '#6366F1', 'tag': 'قرارداد', 'pinned': '1'})
        self.assertEqual(filters['color__iexact'], '#6366F1')
        self.assertEqual(filters['tags__icontains'], 'قرارداد')
        self.assertTrue(filters['is_pinned'])
        self.assertEqual(
            query.note_ordering('title'), ['-is_pinned', 'title'],
        )
        self.assertEqual(
            query.note_ordering('unknown-value'), ['-is_pinned', '-updated_at'],
        )

    def test_task_ordering_includes_priority_rank(self):
        self.assertIn('priority_rank', query.task_ordering('priority'))
        self.assertEqual(
            query.task_ordering(None), ['-is_pinned', 'due_date', '-created_at'],
        )

    def test_summary_payload_counts_and_completion(self):
        payload = query.summary_payload(
            note_total=4, note_pinned=1,
            status_counts={'todo': 3, 'doing': 1, 'done': 4, 'cancelled': 2},
            due_today=2, overdue=1, shared_notes=2, shared_tasks=3,
            today=date(2026, 11, 15),
        )
        self.assertEqual(payload['tasks'], 10)
        self.assertEqual(payload['open_tasks'], 4)
        self.assertEqual(payload['done_tasks'], 4)
        self.assertEqual(payload['completion_rate'], 40)
        self.assertEqual(payload['due_today'], 2)
        self.assertEqual(payload['shared_notes'], 2)
        self.assertEqual(payload['notes_shared_with_me'], 2)
        self.assertEqual(payload['today'], '2026-11-15')

    def test_summary_payload_is_safe_without_tasks(self):
        payload = query.summary_payload()
        self.assertEqual(payload['tasks'], 0)
        self.assertEqual(payload['completion_rate'], 0)
        self.assertEqual(payload['todo'], 0)
