"""
Export tenant business data (SQLite dev DB) to a portable JSON file.

Usage (on your Windows/dev machine, SQLite):
    python manage.py export_tenant_data --output hrms_tenant_data.json

The produced file is later imported on the Ubuntu server with:
    python manage.py import_tenant_data --file hrms_tenant_data.json \
        --schema=yourco --company-code=YOURCO

The export deliberately EXCLUDES shared/system tables (auth.*, contenttypes,
sessions, admin.logentry, core.Company, core.Domain, core.UserProfile,
core.AuditLog). The target Company/Superuser are created separately on the
server (create_tenant + createsuperuser).
"""
import json

from django.apps import apps
from django.core import serializers
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Export tenant business data to a UTF-8 JSON file'

    # Ordered list to respect foreign-key dependencies during import.
    MODEL_LABELS = [
        'employees.Department',
        'employees.WorkLocation',
        'employees.JobTitle',
        'employees.ContractType',
        'employees.InsuranceList',
        'employees.Employee',
        'employees.WorkExperience',
        'employees.EmployeePenalty',
        'employees.EmploymentChange',
        'employees.ContractVersion',
        'documents.DocumentType',
        'documents.Document',
        'payroll.EmployeeTransaction',
        'payroll.SalaryRecord',
        'payroll.BenefitRecord',
        'orgchart.Position',
        'correspondences.Organization',
        'correspondences.IncomingLetter',
        'correspondences.OutgoingLetter',
        'correspondences.Announcement',
        'correspondences.Form',
        'correspondences.OrganizationalLetter',
        'settings_app.SystemSetting',
        'settings_app.CompanyProfile',
    ]

    # For self-referencing trees, keep a parent-before-child order.
    ORDERING_OVERRIDES = {
        'orgchart.Position': ['level', 'id'],
    }

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            default='hrms_tenant_data.json',
            help='Output JSON file path (default: hrms_tenant_data.json)',
        )
        parser.add_argument(
            '--indent',
            type=int,
            default=2,
            help='JSON indentation (default: 2)',
        )

    def handle(self, *args, **options):
        output_path = options['output']
        indent = options['indent']

        objects = []
        counts = {}

        for label in self.MODEL_LABELS:
            model = apps.get_model(label)
            ordering = self.ORDERING_OVERRIDES.get(label, ['id'])
            qs = model.objects.all().order_by(*ordering)
            count = qs.count()
            counts[label] = count
            objects.extend(list(qs))

        if not objects:
            self.stdout.write(self.style.WARNING('No tenant data found to export.'))
            return

        # Serialize to JSON string (default serializer is ASCII-safe).
        data = serializers.serialize('json', objects, indent=indent)
        parsed = json.loads(data)

        payload = {
            '_meta': {
                'generated_by': 'export_tenant_data',
                'model_order': self.MODEL_LABELS,
                'counts': counts,
            },
            'objects': parsed,
        }

        with open(output_path, 'w', encoding='utf-8') as fh:
            json.dump(payload, fh, ensure_ascii=False, indent=indent)

        self.stdout.write(self.style.SUCCESS(
            f'Exported {len(parsed)} objects to {output_path}'
        ))
        for label, count in counts.items():
            self.stdout.write(f'  {label}: {count}')