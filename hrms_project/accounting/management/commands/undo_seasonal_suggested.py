from django.core.management.base import BaseCommand, CommandError

from accounting import seasonal_cleanup
from accounting.models import (
    SeasonalReconciliation, SeasonalReport, SeasonalTransaction,
)


class Command(BaseCommand):
    help = (
        'حذف ردیف‌هایی که از «جاافتاده‌های» مغایرت‌گیری به جدول معاملات فصلی اضافه '
        'شده‌اند (ردیف‌های دستی کاربر دست‌نخورده می‌مانند).'
    )

    def add_arguments(self, parser):
        parser.add_argument('--report', type=int, required=True, help='شناسهٔ گزارش فصلی')
        parser.add_argument('--run', type=int, help='شناسهٔ اجرای مغایرت‌گیری (پیش‌فرض: آخرین اجرا)')
        parser.add_argument('--company', type=int, help='شناسهٔ شرکت (برای اطمینان)')
        parser.add_argument('--dry-run', action='store_true', help='فقط پیش‌نمایش؛ چیزی حذف نمی‌شود')

    def handle(self, *args, **options):
        report = SeasonalReport.objects.filter(pk=options['report'])
        if options.get('company'):
            report = report.filter(company_id=options['company'])
        report = report.first()
        if report is None:
            raise CommandError('گزارش فصلی با این شناسه پیدا نشد.')
        if report.is_locked:
            raise CommandError('این فصل ارسال شده است و قابل ویرایش نیست.')

        direction = SeasonalTransaction.Direction.PURCHASE
        runs = SeasonalReconciliation.objects.filter(report=report, direction=direction)
        run = (runs.filter(pk=options['run']).first() if options.get('run')
               else runs.order_by('-created_at').first())
        if run is None:
            raise CommandError('اجرای مغایرت‌گیری برای این گزارش پیدا نشد.')

        keys = seasonal_cleanup.suggested_keys(run)
        if not keys:
            self.stdout.write(self.style.WARNING('این اجرا ردیف «فقط در دفاتر» ندارد.'))
            return

        outcome = seasonal_cleanup.remove_suggested_rows(
            report, keys, direction, dry_run=options['dry_run'],
        )
        for row in outcome['matched']:
            self.stdout.write(
                f'- ردیف {row.line_no}: {row.name or "—"} | فاکتور {row.invoice_no or "—"} | '
                f'مبلغ {row.amount} | مالیات {row.vat}'
            )
        prefix = 'پیش‌نمایش' if options['dry_run'] else 'حذف شد'
        self.stdout.write(self.style.SUCCESS(
            f'{prefix}: {len(outcome["matched"])} ردیف از {len(keys)} ردیف جاافتاده — '
            f'باقی‌ماندهٔ جدول: {outcome["remaining"]}'
        ))
