"""Run due Bale schedules and automatic birthday messages.

Usage:
    python manage.py run_bale_tasks --tenants

Designed to be executed on a cron (e.g. every 10 minutes) or manually.
"""
from django.core.management.base import BaseCommand
from django.db import connection

from core.models import Company


class Command(BaseCommand):
    help = 'Run due Bale schedules and automatic birthday messages for all tenants.'

    def handle(self, *args, **options):
        from notifications.scheduling import run_due_schedules, run_birthday_messages

        total = 0
        errors = []
        for company in Company.objects.filter(is_active=True):
            try:
                connection.set_tenant(company)
                run_birthday_messages(company)
                total += run_due_schedules(company)
            except Exception as exc:
                errors.append(f'{company.schema_name}: {exc}')

        connection.set_schema_to_public()
        self.stdout.write(self.style.SUCCESS(f'Executed {total} due schedule(s).'))
        for err in errors:
            self.stdout.write(self.style.ERROR(err))