"""
Management command to run migrations on all tenant schemas.
Usage:
    python manage.py migrate_schemas
    python manage.py migrate_schemas --schema=specific_schema_name
"""
from django.core.management.base import BaseCommand, CommandError
from django.core.management import call_command
from django.db import connection
from core.models import Company


class Command(BaseCommand):
    help = 'Run migrations on all tenant schemas (or a specific one)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--schema',
            type=str,
            default=None,
            help='Run migrations only on a specific schema name',
        )
        parser.add_argument(
            '--app',
            type=str,
            default=None,
            help='Run migrations only for a specific app',
        )
        parser.add_argument(
            '--fake',
            action='store_true',
            default=False,
            help='Mark migrations as run without actually executing them',
        )

    def handle(self, *args, **options):
        schema_name = options.get('schema')
        app_label = options.get('app')
        fake = options.get('fake', False)

        if schema_name:
            # Migrate only a specific schema
            companies = Company.objects.filter(schema_name=schema_name)
            if not companies.exists():
                raise CommandError(f"Schema '{schema_name}' not found.")
        else:
            # Migrate all active schemas
            companies = Company.objects.filter(is_active=True)

        if not companies.exists():
            self.stdout.write(self.style.WARNING("No active tenants found to migrate."))
            return

        self.stdout.write(self.style.NOTICE(f"\nFound {companies.count()} tenant(s) to migrate.\n"))

        success_count = 0
        failed_schemas = []

        for company in companies:
            self.stdout.write(f"Migrating schema: {company.schema_name} (Company: {company.name})")
            try:
                # Set search path to the tenant schema
                with connection.cursor() as cursor:
                    cursor.execute(f"SET search_path TO \"{company.schema_name}\"")

                # Run migrations
                migrate_args = []
                migrate_kwargs = {
                    'verbosity': 0,
                    'interactive': False,
                    'run_syncdb': False,
                }

                if app_label:
                    migrate_args.append(app_label)

                if fake:
                    migrate_kwargs['fake'] = True

                call_command('migrate', *migrate_args, **migrate_kwargs)

                # Reset search path to public
                with connection.cursor() as cursor:
                    cursor.execute("SET search_path TO public")

                self.stdout.write(self.style.SUCCESS(f"  ✓ {company.schema_name} migrated successfully"))
                success_count += 1

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  ✗ {company.schema_name} failed: {e}"))
                failed_schemas.append(company.schema_name)
                # Reset search path
                try:
                    with connection.cursor() as cursor:
                        cursor.execute("SET search_path TO public")
                except Exception:
                    pass

        # Summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS(f"Migration summary:"))
        self.stdout.write(f"  Successful: {success_count}")
        self.stdout.write(f"  Failed: {len(failed_schemas)}")

        if failed_schemas:
            self.stdout.write(self.style.ERROR(f"  Failed schemas: {', '.join(failed_schemas)}"))
            raise CommandError("Some schema migrations failed. Check the logs above.")