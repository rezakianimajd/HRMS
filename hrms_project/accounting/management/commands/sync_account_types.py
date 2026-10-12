"""
همگام‌سازی نوع/ماهیت حساب‌ها با والد و گروه (رفع ناهمگونی «همه دارایی»).

usage:
    python manage.py sync_account_types                 # پیش‌نمایش همهٔ شرکت‌ها
    python manage.py sync_account_types --company-id 1  # پیش‌نمایش یک شرکت
    python manage.py sync_account_types --apply        # اعمال تغییرات
    python manage.py sync_account_types --apply --fix-groups
"""
from django.core.management.base import BaseCommand
from django.db import connection

from core.models import Company
from accounting.maintenance import sync_account_types, analyze_account_types

CATEGORY_LABELS = {
    'asset': 'دارایی',
    'liability': 'بدهی',
    'equity': 'حقوق صاحبان سهام',
    'revenue': 'درآمد',
    'expense': 'هزینه',
    'cost_of_sales': 'بهای تمام‌شده',
}


class Command(BaseCommand):
    help = 'همگام‌سازی نوع و ماهیت حساب‌ها با والد/گروه (رفع ناهمگونی کدینگ)'

    def add_arguments(self, parser):
        parser.add_argument('--company-id', type=int, default=None, help='شناسهٔ شرکت (پیش‌فرض: همه)')
        parser.add_argument('--apply', action='store_true', default=False, help='اعمال تغییرات (پیش‌فرض پیش‌نمایش)')
        parser.add_argument('--fix-groups', action='store_true', default=False, help='اصلاح نوع گروه‌های ناهمگون بر پایهٔ نام')

    def handle(self, *args, **options):
        companies = Company.objects.all()
        if options['company_id']:
            companies = companies.filter(id=options['company_id'])
        if not companies.exists():
            self.stdout.write(self.style.WARNING('شرکتی یافت نشد.'))
            return

        for company in companies:
            try:
                connection.set_tenant(company)
            except Exception:
                pass

            runner = sync_account_types if options['apply'] else analyze_account_types
            report = runner(company, fix_groups=options['fix_groups'])

            self.stdout.write('')
            self.stdout.write(self.style.MIGRATE_HEADING(f'شرکت: {company.name} ({company.schema_name})'))
            self.stdout.write(f"  حساب‌ها: {report['accounts_total']} | ناهمگون: {report['accounts_mismatched']}"
                              f" | ماهیت ناهمگون: {report['nature_mismatched']}"
                              f" | گروه ناهمگون: {len(report['groups_to_fix'])}")
            for category, count in (report['summary_by_category'] or {}).items():
                label = CATEGORY_LABELS.get(category, category)
                self.stdout.write(f"    - به «{label}»: {count} حساب")

            for row in report['changes'][:20]:
                self.stdout.write(
                    f"    • {row['code']} {row['name']}  [{row['current_type_name']} → {row['new_type_name']}]"
                    f"  منبع: {row['source']}  گروه: {row['group_name']}"
                )

            if options['apply']:
                self.stdout.write(self.style.SUCCESS(
                    f"  ✓ اعمال شد: {report['accounts_updated']} حساب"
                    + (f" و {report['groups_updated']} گروه" if options['fix_groups'] else '')
                ))
            else:
                self.stdout.write(self.style.WARNING('  (حالت پیش‌نمایش — برای اعمال از --apply استفاده کنید)'))
