"""تست دیتابیسی کیفیت و HSE (فاز ۳ بخش دوم) — اجرا روی سرور (PostgreSQL).

گردش کار بازرسی → NCR → کسرکار و رویداد HSE به‌همراه شاخص‌های پایان‌به‌پایان.
"""
from datetime import date, timedelta

from django.test import TestCase
from django.utils import timezone

from projects.quality_models import HSEIncident, Inspection, NCR, PunchItem, QualityPlan, QualityPlanItem
from projects.quality_service import (
    close_hse_incident, complete_inspection, project_quality_kpis, set_hse_status,
    set_ncr_status, set_punch_status, verify_punch_item,
)
from projects.tests.base import ProjectTestMixin


class QualityFlowTests(ProjectTestMixin, TestCase):

    def setUp(self):
        self.make_project()
        self.plan = QualityPlan.objects.create(
            company=self.company, project=self.project, number='ITP-01',
            title='طرح بازرسی کارهای عمرانی', revision='00',
            status=QualityPlan.Status.ACTIVE,
        )
        self.item = QualityPlanItem.objects.create(
            company=self.company, plan=self.plan, item_no='1',
            description='بازرسی آرماتوربندی فونداسیون',
            inspection_type=QualityPlanItem.InspectionType.SITE,
            point_type=QualityPlanItem.PointType.HOLD,
        )
        self.inspection = Inspection.objects.create(
            company=self.company, project=self.project, plan_item=self.item,
            number='INS-01', title='بازرسی آرماتور فونداسیون', date=date(2026, 5, 10),
            inspector_name='مشاور', location='محور A',
        )

    def test_inspection_pass_marks_plan_item_passed(self):
        inspection, ncr = complete_inspection(self.inspection, None, result='pass')
        self.inspection.refresh_from_db()
        self.item.refresh_from_db()
        self.assertEqual(self.inspection.status, Inspection.Status.DONE)
        self.assertEqual(self.inspection.result, 'pass')
        self.assertEqual(self.item.status, QualityPlanItem.Status.PASSED)
        self.assertIsNone(ncr)
        self.assertEqual(NCR.objects.count(), 0)

    def test_inspection_fail_creates_ncr_and_marks_item_failed(self):
        inspection, ncr = complete_inspection(
            self.inspection, None, result='fail', remarks='پوشش آرماتور ناکافی',
        )
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, QualityPlanItem.Status.FAILED)
        self.assertIsNotNone(ncr)
        self.assertEqual(ncr.number, 'NCR-INS-01')
        self.assertEqual(ncr.source, NCR.Source.INSPECTION)
        self.assertEqual(ncr.status, NCR.Status.OPEN)
        self.assertEqual(ncr.detected_date, date(2026, 5, 10))

    def test_cannot_create_duplicate_ncr_for_same_inspection(self):
        complete_inspection(self.inspection, None, result='fail')
        with self.assertRaises(ValueError):
            complete_inspection(self.inspection, None, result='fail')

    def test_ncr_lifecycle_sets_closed_date(self):
        _, ncr = complete_inspection(self.inspection, None, result='fail')
        set_ncr_status(ncr, None, NCR.Status.CORRECTING, note='شروع اصلاح')
        set_ncr_status(ncr, None, NCR.Status.VERIFYING)
        set_ncr_status(ncr, None, NCR.Status.CLOSED)
        ncr.refresh_from_db()
        self.assertEqual(ncr.status, NCR.Status.CLOSED)
        self.assertEqual(ncr.closed_date, timezone.localdate())
        with self.assertRaises(ValueError):
            set_ncr_status(ncr, None, NCR.Status.OPEN)     # closed → open مجاز نیست
        set_ncr_status(ncr, None, NCR.Status.VERIFYING)    # فقط بازگشت به «در حال تأیید»
        ncr.refresh_from_db()
        self.assertIsNone(ncr.closed_date)

    def test_punch_lifecycle_records_dates(self):
        item = PunchItem.objects.create(
            company=self.company, project=self.project, number='PL-01',
            description='رنگ‌آمیزی ناقص دیوار', due_date=timezone.localdate() - timedelta(days=2),
        )
        set_punch_status(item, None, PunchItem.Status.IN_PROGRESS)
        set_punch_status(item, None, PunchItem.Status.FIXED)
        item.refresh_from_db()
        self.assertEqual(item.fixed_date, timezone.localdate())
        verify_punch_item(item, None, verified_by_name='مشاور')
        item.refresh_from_db()
        self.assertEqual(item.status, PunchItem.Status.VERIFIED)
        self.assertEqual(item.verified_date, timezone.localdate())
        self.assertEqual(item.verified_by_name, 'مشاور')

    def test_hse_lifecycle(self):
        incident = HSEIncident.objects.create(
            company=self.company, project=self.project, number='HSE-01',
            title='سقوط از ارتفاع کم', incident_type=HSEIncident.IncidentType.NEAR_MISS,
            date=timezone.localdate(), man_hours=10_000,
        )
        set_hse_status(incident, None, HSEIncident.Status.INVESTIGATING)
        close_hse_incident(incident, None)
        incident.refresh_from_db()
        self.assertEqual(incident.status, HSEIncident.Status.CLOSED)
        self.assertEqual(incident.closed_date, timezone.localdate())
        with self.assertRaises(ValueError):
            set_hse_status(incident, None, HSEIncident.Status.OPEN)

    def test_project_kpis_end_to_end(self):
        complete_inspection(self.inspection, None, result='fail')
        PunchItem.objects.create(
            company=self.company, project=self.project, number='PL-02',
            description='کسرکار نهایی', status=PunchItem.Status.VERIFIED, cost=2_000_000,
        )
        PunchItem.objects.create(
            company=self.company, project=self.project, number='PL-03',
            description='کسرکار باز', status=PunchItem.Status.OPEN,
            due_date=timezone.localdate() - timedelta(days=1),
        )
        HSEIncident.objects.create(
            company=self.company, project=self.project, number='HSE-02',
            title='شبه‌حادثهٔ محل', incident_type=HSEIncident.IncidentType.NEAR_MISS,
            date=timezone.localdate(), man_hours=5_000,
        )
        kpis = project_quality_kpis(self.project)
        self.assertEqual(kpis['plans']['total'], 1)
        self.assertEqual(kpis['plans']['failed'], 1)
        self.assertEqual(kpis['inspections']['failed'], 1)
        self.assertEqual(kpis['ncr']['total'], 1)
        self.assertEqual(kpis['ncr']['open'], 1)
        self.assertEqual(kpis['punch']['total'], 2)
        self.assertEqual(kpis['punch']['verified'], 1)
        self.assertEqual(kpis['punch']['overdue'], 1)
        self.assertEqual(kpis['punch']['cost'], 2_000_000.0)
        self.assertEqual(kpis['hse']['total'], 1)
        self.assertEqual(kpis['hse']['man_hours'], 5_000)
