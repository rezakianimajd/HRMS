"""پاک‌سازی اعضای تکراری خانواده و اتصال افراد تحت تکفل بیمه."""
from django.core.management.base import BaseCommand
from django.db import transaction
from django_tenants.utils import get_tenant_model, schema_context

from employees.family_dedupe import dedupe_company


class Command(BaseCommand):
    help = 'ادغام اعضای تکراری خانواده و اتصال افراد تحت تکفل بیمه به پروندهٔ خانواده.'

    def add_arguments(self, parser):
        parser.add_argument('--schema', dest='schema', default='', help='نام schema (مثلاً kpsmi)')
        parser.add_argument('--apply', action='store_true', help='اعمال تغییرات (پیش‌فرض: فقط بررسی)')

    def handle(self, *args, **options):
        schema = (options.get('schema') or '').strip()
        apply_changes = bool(options.get('apply'))
        tenants = (
            get_tenant_model().objects.filter(schema_name=schema)
            if schema else get_tenant_model().objects.exclude(schema_name='public')
        )
        for tenant in tenants:
            with schema_context(tenant.schema_name):
                with transaction.atomic():
                    totals = dedupe_company()
                    if not apply_changes:
                        transaction.set_rollback(True)
                prefix = 'APPLIED' if apply_changes else 'DRY-RUN'
                self.stdout.write(
                    f'[{prefix}] {tenant.schema_name}: '
                    f'employees={totals["employees"]} merged={totals["merged"]} '
                    f'created={totals["created"]} linked={totals["linked"]} '
                    f'removed_insurance_duplicates={totals["removed_insurance_duplicates"]}'
                )
