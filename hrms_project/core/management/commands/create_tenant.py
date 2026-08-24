"""
Management command to create a new tenant (company).
Usage:
    python manage.py create_tenant --name="Company Name" --code="COMPANY_CODE" --domain="company.localhost"
"""
from django.core.management.base import BaseCommand, CommandError
from core.models import Company, Domain
from core.engines.company_engine import CompanyEngine


class Command(BaseCommand):
    help = 'Create a new tenant (company) with schema and domain'

    def add_arguments(self, parser):
        parser.add_argument(
            '--name',
            type=str,
            required=True,
            help='Company name',
        )
        parser.add_argument(
            '--code',
            type=str,
            required=True,
            help='Unique company code (used for schema name if not provided)',
        )
        parser.add_argument(
            '--schema-name',
            type=str,
            default=None,
            help='PostgreSQL schema name (auto-generated from code if not provided)',
        )
        parser.add_argument(
            '--domain',
            type=str,
            default=None,
            help='Primary domain for the tenant (e.g., company.localhost)',
        )
        parser.add_argument(
            '--email',
            type=str,
            default=None,
            help='Company email address',
        )
        parser.add_argument(
            '--phone',
            type=str,
            default=None,
            help='Company phone number',
        )
        parser.add_argument(
            '--address',
            type=str,
            default=None,
            help='Company address',
        )
        parser.add_argument(
            '--postal-code',
            type=str,
            default=None,
            help='Company postal code',
        )
        parser.add_argument(
            '--national-id',
            type=str,
            default=None,
            help='Company national ID',
        )
        parser.add_argument(
            '--economic-code',
            type=str,
            default=None,
            help='Company economic code',
        )
        parser.add_argument(
            '--registration-number',
            type=str,
            default=None,
            help='Company registration number',
        )

    def handle(self, *args, **options):
        name = options['name']
        code = options['code'].upper()
        schema_name = options['schema_name'] or code.lower().replace(' ', '_')
        domain = options['domain']

        # Check if tenant with same code already exists
        if Company.objects.filter(code=code).exists():
            raise CommandError(f"Tenant with code '{code}' already exists.")

        if Company.objects.filter(schema_name=schema_name).exists():
            raise CommandError(f"Tenant with schema name '{schema_name}' already exists.")

        self.stdout.write(self.style.NOTICE(f"Creating tenant: {name} (code: {code})"))
        self.stdout.write(f"  Schema name: {schema_name}")

        try:
            # Use CompanyEngine to create the company
            data = {
                'name': name,
                'code': code,
                'schema_name': schema_name,
                'email': options.get('email'),
                'phone': options.get('phone'),
                'address': options.get('address'),
                'postal_code': options.get('postal_code'),
                'national_id': options.get('national_id'),
                'economic_code': options.get('economic_code'),
                'registration_number': options.get('registration_number'),
            }
            # Remove None values
            data = {k: v for k, v in data.items() if v is not None}

            company = CompanyEngine.create_company(data)

            self.stdout.write(self.style.SUCCESS(f"✓ Tenant '{name}' created successfully with ID: {company.id}"))
            self.stdout.write(f"  Schema: {company.schema_name}")

            # Create domain if specified
            if domain:
                domain_obj = Domain.objects.create(
                    domain=domain,
                    tenant=company,
                    is_primary=True,
                )
                self.stdout.write(self.style.SUCCESS(f"✓ Domain '{domain}' created successfully"))
                self.stdout.write(f"  You can access the tenant at: http://{domain}:8000/")

            self.stdout.write(self.style.WARNING("\nNext steps:"))
            self.stdout.write("  1. Run: python manage.py migrate_schemas")
            self.stdout.write("  2. Create a superuser for this tenant (if needed)")
            self.stdout.write("  3. Start the server and access the tenant")

        except Exception as e:
            raise CommandError(f"Failed to create tenant: {e}")