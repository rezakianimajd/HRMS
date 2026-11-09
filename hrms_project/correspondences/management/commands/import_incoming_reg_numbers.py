"""همگام‌سازی «شماره ثبت» نامه‌های وارده از شیت اندیکاتور اکسل.

ستون «ردیف» شیت «نام های وارده» → ``company_reg_no`` (شماره ثبت ورود به شرکت)
و ستون «ردیف۲» → ``unit_reg_no`` (شماره ثبت ورود به واحد).

نمونه:
    python manage.py import_incoming_reg_numbers --schema kpsmi --dry-run
    python manage.py import_incoming_reg_numbers --schema kpsmi --overwrite
"""
from openpyxl import load_workbook

from django.core.management.base import BaseCommand
from django.db import transaction
from django_tenants.utils import schema_context

from correspondences.reg_numbers import build_updates

DEFAULT_PATH = r'Z:\Group\Accounting\اندیکاتور مالی.xlsx'
DEFAULT_SHEET = 'نام های وارده '

# ستون‌های شیت اندیکاتور (۱-based: ردیف=2، ردیف۲=3، تاریخ ورود=4، شماره=5، موضوع=7)
COL_ROW_NO = 1
COL_ROW_NO2 = 2
COL_RECEIVED = 3
COL_NUMBER = 4
COL_SUBJECT = 6


def _text(value):
    if value is None:
        return ''
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    return str(value).strip()


class Command(BaseCommand):
    help = 'شماره ثبت ورود به شرکت/واحد نامه‌های وارده را از فایل اندیکاتور پر می‌کند.'

    def add_arguments(self, parser):
        parser.add_argument('--path', default=DEFAULT_PATH, help='مسیر فایل اکسل اندیکاتور')
        parser.add_argument('--sheet', default=DEFAULT_SHEET, help='نام شیت نامه‌های وارده')
        parser.add_argument('--schema', default='kpsmi', help='schema شرکت (tenant)')
        parser.add_argument('--limit', type=int, default=0, help='حداکثر ردیف اکسل (۰ = همه)')
        parser.add_argument('--dry-run', action='store_true', help='فقط گزارش، بدون ذخیره')
        parser.add_argument('--overwrite', action='store_true',
                            help='مقادیر متفاوت را هم با اکسل جایگزین کن')

    def handle(self, *args, **options):
        path = options['path']
        sheet_name = options['sheet']
        limit = options['limit']
        dry_run = options['dry_run']
        overwrite = options['overwrite']

        workbook = load_workbook(path, read_only=True, data_only=True)
        if sheet_name not in workbook.sheetnames:
            self.stderr.write(f'شیت «{sheet_name}» یافت نشد. شیت‌ها: {workbook.sheetnames}')
            return
        sheet = workbook[sheet_name]

        excel_rows = []
        for index, row in enumerate(
            sheet.iter_rows(min_row=2, max_row=sheet.max_row, min_col=1, max_col=11,
                            values_only=True),
            start=2,
        ):
            if limit and len(excel_rows) >= limit:
                break
            values = list(row) + [''] * (11 - len(row))
            number = _text(values[COL_NUMBER])
            subject = _text(values[COL_SUBJECT])
            if not number and not subject:
                continue
            excel_rows.append({
                'excel_row': index,
                'company_reg_no': _text(values[COL_ROW_NO]),
                'unit_reg_no': _text(values[COL_ROW_NO2]),
                'number': number,
                'received_date': _text(values[COL_RECEIVED]),
                'subject': subject,
            })
        workbook.close()

        with schema_context(options['schema']):
            from correspondences.models import Letter

            letters = list(
                Letter.objects.filter(direction='incoming').values(
                    'id', 'number', 'external_number', 'received_date', 'letter_date',
                    'subject', 'company_reg_no', 'unit_reg_no', 'source_ref',
                )
            )
            result = build_updates(letters, excel_rows, overwrite=overwrite)
            stats = result['stats']
            self.stdout.write(
                f"excel rows: {len(excel_rows)} | letters: {len(letters)} | stats: {stats}"
            )

            if dry_run:
                for row in result['updates'][:10]:
                    self.stdout.write(f'  [dry] {row}')
                for row in result['conflicts'][:10]:
                    self.stdout.write(f'  [conflict] {row}')
                if result['unmatched']:
                    self.stdout.write(f"  unmatched: {len(result['unmatched'])}")
                    for row in result['unmatched'][:5]:
                        self.stdout.write(f'  [unmatched] {row}')
                self.stdout.write(self.style.WARNING('dry-run: هیچ تغییری ذخیره نشد.'))
                return

            if not result['updates']:
                self.stdout.write(self.style.SUCCESS('چیزی برای به‌روزرسانی نبود.'))
                return

            objects = [
                Letter(
                    pk=row['id'],
                    company_reg_no=row.get('company_reg_no') or '',
                    unit_reg_no=row.get('unit_reg_no') or '',
                )
                for row in result['updates']
            ]
            # مقادیر پرنشدهٔ همین اجرا باید همان مقدار قبلی DB بمانند
            current = {
                row['id']: row for row in letters
            }
            for obj in objects:
                if not obj.company_reg_no:
                    obj.company_reg_no = current[obj.pk]['company_reg_no'] or ''
                if not obj.unit_reg_no:
                    obj.unit_reg_no = current[obj.pk]['unit_reg_no'] or ''
            with transaction.atomic():
                Letter.objects.bulk_update(
                    objects, ['company_reg_no', 'unit_reg_no'], batch_size=500,
                )
            self.stdout.write(self.style.SUCCESS(
                f"{len(objects)} نامه به‌روزرسانی شد "
                f"(تعارض‌های نگه‌داشته‌شده: {len(result['conflicts'])})."
            ))
