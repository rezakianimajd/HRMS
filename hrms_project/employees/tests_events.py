"""تست‌های خالص گزارش رویدادهای منابع انسانی (بدون دیتابیس)."""
from datetime import date
from types import SimpleNamespace

from django.test import SimpleTestCase

from employees import events


def employee(**overrides):
    base = dict(
        id=1, first_name='مریم', last_name='احمدی', full_name='مریم احمدی',
        employee_id='1001', mobile='09120000000', gender='female',
        birth_date=date(1990, 5, 20), hire_date=date(2018, 3, 1),
        contract_end_date=date(2027, 3, 1),
        department=SimpleNamespace(name='واحد اداری'),
        job_title=SimpleNamespace(name='کارشناس'),
    )
    base.update(overrides)
    return SimpleNamespace(**base)


def dependent(**overrides):
    base = dict(
        id=11, first_name='علی', last_name='احمدی', relation='child',
        birth_date=date(2015, 6, 15), is_dependent=True, employee=employee(),
    )
    base.update(overrides)
    return SimpleNamespace(**base)


class EventHelperTests(SimpleTestCase):
    def test_next_anniversary_and_age(self):
        today = date(2026, 5, 10)
        self.assertEqual(events.next_anniversary(date(1990, 5, 20), today), date(2026, 5, 20))
        self.assertEqual(events.next_anniversary(date(1990, 5, 9), today), date(2027, 5, 9))
        self.assertEqual(events.age_on(date(1990, 5, 20), date(2026, 5, 10)), 35)
        self.assertEqual(events.age_on(date(1990, 5, 20), date(2026, 5, 20)), 36)

    def test_birthday_rows_for_employee_and_dependent(self):
        rows, summary = events.collect_event_rows(
            [employee()], [dependent()],
            kinds=['employee_birthday', 'dependent_birthday'],
            today=date(2026, 5, 10),
        )
        self.assertEqual(len(rows), 2)
        self.assertEqual({row['kind'] for row in rows}, {'employee_birthday', 'dependent_birthday'})
        child = next(row for row in rows if row['kind'] == 'dependent_birthday')
        self.assertEqual(child['person_name'], 'علی احمدی')
        self.assertEqual(child['relation_label'], 'فرزند')
        self.assertEqual(child['employee_name'], 'مریم احمدی')
        self.assertEqual(child['event_date'], '2026-06-15')
        self.assertEqual(summary['total'], 2)
        self.assertEqual(summary['dependents'], 1)
        self.assertEqual(summary['employees'], 1)

    def test_contract_end_and_filters(self):
        rows, summary = events.collect_event_rows(
            [employee(), employee(id=2, employee_id='1002', full_name='سعید رضایی',
                                  birth_date=date(1985, 5, 1), contract_end_date=date(2026, 6, 1))],
            [dependent()],
            kinds=['contract_end'],
            within_days=60,
            today=date(2026, 5, 10),
        )
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['employee_code'], '1002')
        self.assertEqual(rows[0]['kind'], 'contract_end')
        self.assertEqual(summary['contract_end_90'], 1)

    def test_scope_relation_employee_and_search_filters(self):
        rows, _ = events.collect_event_rows(
            [employee()], [dependent()],
            kinds=['employee_birthday', 'dependent_birthday'],
            scope='dependents', relation='child', employee=1,
            search='علی', today=date(2026, 5, 10),
        )
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['person_type'], 'dependent')
        rows, _ = events.collect_event_rows(
            [employee()], [dependent()],
            kinds=['employee_birthday', 'dependent_birthday'],
            month=3, today=date(2026, 5, 10),
        )
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['event_month'], 3)

    def test_excel_workbook_is_generated(self):
        from employees.events_export import build_events_workbook

        rows, _ = events.collect_event_rows(
            [employee()], [dependent()],
            kinds=['employee_birthday', 'dependent_birthday'],
            today=date(2026, 5, 10),
        )
        content = build_events_workbook(rows)
        self.assertTrue(content.startswith(b'PK'))
        self.assertGreater(len(content), 2000)
