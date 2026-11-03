"""ورود داده‌های دفتر مکاتبات از فایل اکسل اندیکاتور مالی.

نمونه‌ها::

    # تحلیل بدون ثبت (پیشنهادی برای بررسی)
    python manage.py import_legacy_correspondence --file /path/x.xlsx --dry-run

    # ثبت واقعی در اسکیمای شرکت فعال
    python manage.py import_legacy_correspondence --file /path/x.xlsx --schema hrms_company

    # ساخت بستهٔ داده برای استقرار (JSON فشرده)
    python manage.py import_legacy_correspondence --file /path/x.xlsx \\
        --export-json correspondences/data/legacy_letters.json.gz
"""
import gzip
import json
import os
from datetime import date

from django.core.management.base import BaseCommand, CommandError
from django.db import connection

from correspondences import legacy


class Command(BaseCommand):
    help = 'ورود نامه‌های تاریخی از فایل اکسل واحد مکاتبات (idempotent)'

    def add_arguments(self, parser):
        parser.add_argument('--file', required=False, help='مسیر فایل اکسل')
        parser.add_argument('--bundle', default=None,
                            help='مسیر بستهٔ JSON گز (به‌جای اکسل)')
        parser.add_argument('--sheet', action='append', default=None,
                            help='فقط شیت‌های مشخص (قابل تکرار)')
        parser.add_argument('--limit', type=int, default=None,
                            help='حداکثر ردیف از هر شیت (برای آزمایش)')
        parser.add_argument('--fallback-date', default='1403/01/01',
                            help='تاریخ جایگزین ردیف‌های بدون تاریخ (شمسی)')
        parser.add_argument('--company', default=None,
                            help='شناسه شرکت؛ پیش‌فرض: شرکت اسکیمای فعال')
        parser.add_argument('--schema', default=None, help='نام اسکیمای شرکت (django-tenants)')
        parser.add_argument('--export-json', default=None,
                            help='نوشتن ردیف‌های نرمال‌شده در فایل JSON (gz)')
        parser.add_argument('--dry-run', action='store_true', help='فقط تحلیل و آمار')
        parser.add_argument('--no-events', action='store_true', help='بدون ثبت رویداد تاریخچه')

    def handle(self, *args, **options):
        path = options['file']
        bundle = options.get('bundle')
        if not path and not bundle:
            raise CommandError('یکی از --file یا --bundle الزامی است.')
        if path and not os.path.exists(path):
            raise CommandError(f'فایل پیدا نشد: {path}')
        fallback = legacy.parse_jalali(options['fallback_date'])
        if not fallback:
            raise CommandError('تاریخ جایگزین معتبر نیست (نمونه: 1403/01/01)')

        if bundle:
            if not os.path.exists(bundle):
                raise CommandError(f'بستهٔ داده پیدا نشد: {bundle}')
            rows = legacy.load_bundle(bundle)
        else:
            rows = legacy.iter_legacy_rows(
                path, sheets=options.get('sheet'), limit_per_sheet=options.get('limit'),
            )
            rows = list(legacy.apply_fallback_dates(rows, fallback))
        stats = legacy.summarize(rows)
        self.stdout.write(f'ردیف‌های قابل ورود: {stats["total"]}')
        for sheet, count in stats['by_sheet'].items():
            self.stdout.write(f'   - {sheet}: {count}')
        self.stdout.write(f'   ارجاع‌ها: {stats["referrals"]} | بدون شماره: '
                          f'{stats["total"] - stats["with_number"]} | تاریخ جایگزین: '
                          f'{stats["date_fallback"]}')

        export_path = options.get('export_json')
        if export_path:
            self._export(rows, export_path)

        if options['dry_run']:
            return

        company = self._resolve_company(options)
        if company is None:
            raise CommandError('شرکت/اسکیمای هدف پیدا نشد؛ از --company یا --schema استفاده کنید.')

        result = legacy.import_rows(
            rows, company,
            dry_run=False,
            create_events=not options['no_events'],
            logger=self.stdout.write,
        )
        self.stdout.write(self.style.SUCCESS(
            f'پایان ورود: {result["created"]} نامه جدید، {result["referrals_created"]} ارجاع، '
            f'{result["events_created"]} رویداد، {result["skipped"]} تکراری.'
        ))

    def _resolve_company(self, options):
        from core.models import Company

        company_id = options.get('company')
        if company_id:
            return Company.objects.filter(pk=company_id).first()
        schema = options.get('schema') or connection.schema_name
        return Company.objects.filter(schema_name=schema).first()

    def _export(self, rows, export_path):
        payload = []
        for row in rows:
            item = dict(row)
            for key in ('letter_date', 'received_date', 'sent_date'):
                if item.get(key):
                    item[key] = item[key].isoformat()
            item['referrals'] = [
                {
                    'to_name': referral.get('to_name'),
                    'referred_on': referral['referred_on'].isoformat()
                    if referral.get('referred_on') else None,
                }
                for referral in (item.get('referrals') or [])
            ]
            if item.get('amount') is not None:
                item['amount'] = str(item['amount'])
            payload.append(item)
        target = export_path
        os.makedirs(os.path.dirname(target) or '.', exist_ok=True)
        with gzip.open(target, 'wt', encoding='utf-8') as handle:
            json.dump(payload, handle, ensure_ascii=False)
        size = os.path.getsize(target)
        self.stdout.write(self.style.SUCCESS(
            f'بستهٔ داده نوشته شد: {target} ({size / 1024:.1f} کیلوبایت، {len(payload)} ردیف)'
        ))
