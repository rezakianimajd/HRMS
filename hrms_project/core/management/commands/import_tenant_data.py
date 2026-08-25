"""
Import a tenant data JSON (created by export_tenant_data) into a target
tenant schema on the production PostgreSQL database.

Usage (on the Ubuntu server, PostgreSQL + django_tenants):
    DJANGO_SETTINGS_MODULE=hrms_project.settings.production \
    python manage.py import_tenant_data hrms_tenant_data.json \
        --schema=yourco --company-code=YOURCO

IMPORTANT:
    * Run this AFTER `create_tenant` and `migrate_schemas`.
    * Copy uploaded media files (employee_photos, company_logos,
      correspondences/...) to MEDIA_ROOT separately (rsync).
    * The target Company must already exist with the given --company-code.

This importer remaps primary keys (the dev SQLite IDs differ from the
postgres IDs) and rewires every Company foreign key to the target tenant.
"""
import contextlib
import json

from django.apps import apps
from django.core.management.base import BaseCommand, CommandError
from django.db import models as django_models

from core.models import Company

try:
    from django_tenants.utils import schema_context
except ImportError:  # pragma: no cover - non-tenant fallback
    schema_context = None


class Command(BaseCommand):
    help = 'Import exported tenant data into a tenant schema'

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

    def add_arguments(self, parser):
        parser.add_argument('file', help='Path to the exported JSON file')
        parser.add_argument(
            '--schema',
            required=True,
            help='Target tenant schema name (e.g. yourco)',
        )
        parser.add_argument(
            '--company-code',
            required=True,
            help='Target company code (e.g. YOURCO)',
        )

    def handle(self, *args, **options):
        file_path = options['file']
        schema = options['schema']
        company_code = options['company_code'].upper()

        if schema_context is None:
            self.stdout.write(self.style.WARNING(
                'django_tenants utils are not available; importing into the '
                'default schema. This is only expected for a non-tenant dev DB.'
            ))

        with open(file_path, 'r', encoding='utf-8') as fh:
            payload = json.load(fh)

        objects = payload.get('objects', [])
        if not objects:
            raise CommandError(f'No objects found in {file_path}')

        # Group serialized objects by model (lower-case labels).
        by_model = {}
        for obj in objects:
            by_model.setdefault(obj['model'], []).append(obj)

        try:
            company = Company.objects.get(code__iexact=company_code)
        except Company.DoesNotExist:
            raise CommandError(
                f"Company with code '{company_code}' does not exist. "
                f"Run create_tenant first."
            )

        self.stdout.write(self.style.NOTICE(
            f'Importing into schema "{schema}" for company "{company.name}"'
        ))

        context = schema_context(schema) if schema_context else contextlib.nullcontext()

        id_map = {}   # (label_lower, old_pk) -> new_pk
        summary = {}

        with context:
            for label in self.MODEL_LABELS:
                label_lower = label.lower()
                records = by_model.get(label_lower, [])
                if not records:
                    summary[label] = 0
                    continue

                model = apps.get_model(label)
                records_sorted = sorted(records, key=self._sort_key(label_lower))
                created = 0

                for rec in records_sorted:
                    old_pk = rec.get('pk')
                    fields = rec.get('fields', {})

                    m2m_data = {}
                    instance = model()

                    for fname, raw in fields.items():
                        try:
                            field = model._meta.get_field(fname)
                        except Exception:
                            # Unknown/legacy field in export; ignore safely.
                            continue

                        value = self._coerce(field, raw)

                        if field.many_to_many:
                            m2m_data[fname] = raw or []
                            continue

                        if field.is_relation and raw is not None:
                            value = self._resolve_fk(
                                field, raw, company.pk, id_map
                            )

                        setattr(instance, fname, value)

                    instance.save()

                    if old_pk is not None:
                        id_map[(label_lower, old_pk)] = instance.pk

                    # Resolve many-to-many references now that the instance
                    # has a primary key and related models were imported.
                    for m2m_name, old_pks in m2m_data.items():
                        m2m_field = model._meta.get_field(m2m_name)
                        rel_label = m2m_field.related_model._meta.label_lower
                        new_ids = []
                        for opk in old_pks:
                            nid = id_map.get((rel_label, opk))
                            if nid is not None:
                                new_ids.append(nid)
                        if new_ids:
                            getattr(instance, m2m_name).set(new_ids)

                    created += 1

                summary[label] = created

        self.stdout.write(self.style.SUCCESS('Import completed.'))
        for label, count in summary.items():
            self.stdout.write(f'  {label}: {count}')

        self.stdout.write(self.style.WARNING(
            'Remember to copy media files to MEDIA_ROOT (e.g. rsync '
            'employee_photos/, company_logos/, correspondences/).'
        ))

    # ------------------------------------------------------------------
    @staticmethod
    def _sort_key(label_lower):
        def key(rec):
            if label_lower == 'orgchart.position':
                return (rec.get('fields', {}).get('level', 0), rec.get('pk') or 0)
            return (rec.get('pk') or 0,)
        return key

    @staticmethod
    def _coerce(field, value):
        """Convert serialized JSON values to the correct Python type."""
        if value is None:
            return None
        if isinstance(field, (
            django_models.DateField,
            django_models.DateTimeField,
            django_models.DecimalField,
            django_models.BooleanField,
        )):
            try:
                return field.to_python(value)
            except Exception:
                return value
        return value

    @staticmethod
    def _resolve_fk(field, raw_pk, company_pk, id_map):
        """Return the new PK for a FK reference."""
        rel_model = field.related_model
        if rel_model is Company:
            return company_pk
        key = (rel_model._meta.label_lower, raw_pk)
        return id_map.get(key)