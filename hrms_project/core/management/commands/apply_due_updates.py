"""Run scheduled update installations whose time has come.

Invoked every couple of minutes by ``hrms-update-schedule.timer``:

    python manage.py apply_due_updates [--dry-run]

Only one update can be queued at a time; if a run is already in progress the
command exits silently so the next tick can retry.
"""
from pathlib import Path

from django.core.management.base import BaseCommand
from django.utils import timezone

from core import updates_service as svc
from core.models import UpdateRun, UpdateSchedule


class Command(BaseCommand):
    help = 'اجرای زمان‌بندی‌های به‌روزرسانی که موعدشان رسیده است'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='فقط نمایش، بدون اجرا')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()

        due = list(
            UpdateSchedule.objects
            .filter(status=UpdateSchedule.Status.PENDING, scheduled_for__lte=now)
            .select_related('release', 'created_by')
        )
        if not due:
            self.stdout.write('هیچ زمان‌بندی سررسیدی وجود ندارد.')
            return

        if UpdateRun.objects.filter(status=UpdateRun.Status.RUNNING).exists() or svc.queue_file().exists():
            self.stdout.write('یک به‌روزرسانی در حال اجراست؛ این نوبت رد شد.')
            return

        for schedule in due:
            release = schedule.release
            if release is None or not Path(release.artifact_path).exists():
                schedule.status = UpdateSchedule.Status.FAILED
                schedule.note = 'فایل بسته روی سرور پیدا نشد.'
                schedule.save(update_fields=['status', 'note'])
                self.stderr.write(f'[skip] بستهٔ زمان‌بندی #{schedule.id} موجود نیست.')
                continue

            if dry_run:
                self.stdout.write(f'[dry-run] نسخهٔ {release.version} در {schedule.scheduled_for} اجرا می‌شد.')
                continue

            try:
                run, _broadcast = svc.enqueue_apply(
                    release, user=schedule.created_by, countdown=30,
                )
            except Exception as exc:  # noqa: BLE001
                schedule.status = UpdateSchedule.Status.FAILED
                schedule.note = str(exc)[:500]
                schedule.save(update_fields=['status', 'note'])
                self.stderr.write(f'[error] {release.version}: {exc}')
                continue

            schedule.status = UpdateSchedule.Status.QUEUED
            schedule.queued_run = run
            schedule.save(update_fields=['status', 'queued_run'])
            self.stdout.write(self.style.SUCCESS(
                f'نسخهٔ {release.version} در صف اجرا قرار گرفت (run #{run.id}).'
            ))
            break  # one update per tick
