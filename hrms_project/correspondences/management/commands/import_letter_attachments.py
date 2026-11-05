"""درون‌ریزی پیوست نامه‌ها از اکسل بر اساس هایپرلینک هر ردیف.

نمونهٔ اجرا (روی سرور، در پوشهٔ پروژه):

    python manage.py import_letter_attachments --file /path/to/incoming.xlsx \
        --company 1 --dry-run

    python manage.py import_letter_attachments --file /path/to/incoming.xlsx \
        --company 1 --sheet "نام های وارده" --kind letter

هر ردیف اکسل با کلیدهای «شماره اندیکاتور / شماره نامه / شناسه منبع / موضوع» به
نامهٔ متناظر وصل می‌شود و همهٔ هایپرلینک‌های آن ردیف به‌عنوان پیوست بارگذاری
می‌شوند. مسیرهای نسبی با ``--base-dir`` (یا پوشهٔ همان اکسل) حل می‌شوند.
"""
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from correspondences import attachment_import as importer

KEY_ALIASES = {
    'indicator': ('اندیکاتور', 'شماره اندیکاتور', 'indicator', 'indicator_no'),
    'number': ('شماره نامه', 'شماره', 'number'),
    'external': ('شماره نامه طرف مقابل', 'شماره نامه طرفین', 'external_number'),
    'source': ('شناسه منبع', 'کد ردیف', 'source_ref'),
    'subject': ('موضوع', 'موضوع نامه', 'subject'),
    'title': ('عنوان پیوست', 'عنوان فایل', 'title'),
}


def _normalize_header(value):
    return ' '.join(str(value or '').replace('ي', 'ی').replace('ك', 'ک').split()).lower()


def _pick(row_map, key):
    for alias in KEY_ALIASES[key]:
        value = row_map.get(_normalize_header(alias))
        if value not in (None, ''):
            return str(value).strip()
    return ''


class Command(BaseCommand):
    help = 'بارگذاری پیوست نامه‌ها از فایل اکسل با استفاده از هایپرلینک هر ردیف'

    def add_arguments(self, parser):
        parser.add_argument('--file', required=True, help='مسیر فایل اکسل')
        parser.add_argument('--company', default=None, help='شناسهٔ شرکت (در صورت نبود اسکیما)')
        parser.add_argument('--sheet', default=None, help='نام شیت (پیش‌فرض: اولین شیت)')
        parser.add_argument('--base-dir', default=None,
                            help='پوشهٔ مبنا برای مسیرهای نسبی (پیش‌فرض: پوشهٔ فایل اکسل)')
        parser.add_argument('--kind', default='letter',
                            help='نوع پیوست: letter | attachment | receipt | other')
        parser.add_argument('--limit', type=int, default=None, help='حداکثر تعداد ردیف')
        parser.add_argument('--dry-run', action='store_true', help='فقط گزارش، بدون ذخیره')
        parser.add_argument('--skip-missing', action='store_true',
                            help='ردیف‌هایی که نامه‌شان پیدا نشد فقط گزارش شوند')

    # ------------------------------------------------------------------ ابزار
    def _company(self, options):
        from core.models import Company

        if options.get('company'):
            company = Company.objects.filter(pk=options['company']).first()
            if not company:
                raise CommandError(f'شرکت با شناسهٔ {options["company"]} پیدا نشد.')
            return company
        company = Company.objects.filter(is_active=True).first()
        if not company:
            raise CommandError('هیچ شرکت فعالی وجود ندارد؛ از --company استفاده کنید.')
        return company

    def _find_letter(self, company, keys):
        from django.db.models import Q

        from correspondences.models import Letter

        base = Letter.objects.filter(company=company)
        for field in ('source_ref', 'indicator_no', 'number', 'external_number'):
            value = keys.get(field if field != 'source_ref' else 'source', '')
            if not value:
                continue
            match = base.filter(**{field: value}).first()
            if match:
                return match
        subject = keys.get('subject', '')
        if subject:
            return base.filter(
                Q(subject__iexact=subject) | Q(subject__icontains=subject[:60]),
            ).first()
        return None

    def _existing_titles(self, letter):
        titles = {(item.title or '').strip() for item in letter.attachments.all()}
        names = {Path(item.file.name).name for item in letter.attachments.all() if item.file}
        return titles | names

    # ------------------------------------------------------------------ اجرا
    def handle(self, *args, **options):
        from openpyxl import load_workbook

        from correspondences.models import LetterAttachment

        path = Path(options['file']).expanduser()
        if not path.exists():
            raise CommandError(f'فایل اکسل پیدا نشد: {path}')
        base_dir = Path(options['base_dir']).expanduser() if options['base_dir'] else path.parent
        kind_default = options['kind']

        workbook = load_workbook(path, data_only=True)
        sheet = workbook[options['sheet']] if options.get('sheet') else workbook.worksheets[0]
        company = self._company(options)

        header_row = None
        headers = {}
        for row_index in range(1, min(sheet.max_row, 12) + 1):
            values = [_normalize_header(cell.value) for cell in sheet[row_index]]
            known = KEY_ALIASES['number'] + KEY_ALIASES['indicator']
            if any(_normalize_header(alias) in values for alias in known):
                header_row = row_index
                headers = {value: index for index, value in enumerate(values) if value}
                break
        if header_row is None:
            raise CommandError('سرستون‌ها پیدا نشد؛ حداقل «شماره نامه» یا «اندیکاتور» لازم است.')

        stats = {'rows': 0, 'linked': 0, 'created': 0, 'skipped': 0,
                 'missing': 0, 'failed': 0, 'dry_run': bool(options['dry_run'])}

        with transaction.atomic():
            for row_index in range(header_row + 1, sheet.max_row + 1):
                if options['limit'] and stats['rows'] >= options['limit']:
                    break
                cells = list(sheet[row_index])
                row_map = {}
                for name, index in headers.items():
                    if index < len(cells):
                        row_map[name] = cells[index].value

                links = []
                for cell in cells:
                    target = ''
                    if getattr(cell, 'hyperlink', None) and cell.hyperlink.target:
                        target = cell.hyperlink.target
                    elif isinstance(cell.value, str) and importer.parse_link(cell.value)[0] != 'none':
                        target = cell.value
                    if not target:
                        continue
                    link_kind, value, _filename = importer.parse_link(target, base_dir)
                    if link_kind != 'none':
                        links.append((link_kind, value))
                if not links:
                    continue
                stats['rows'] += 1

                keys = {key: _pick(row_map, key) for key in
                        ('indicator', 'number', 'external', 'source', 'subject', 'title')}
                letter = self._find_letter(company, keys)
                if not letter:
                    stats['missing'] += 1
                    if not options['skip_missing']:
                        self.stderr.write(
                            f'  ردیف {row_index}: نامه پیدا نشد '
                            f'({keys["number"] or keys["indicator"] or keys["subject"]})',
                        )
                    continue
                stats['linked'] += 1
                existing = self._existing_titles(letter)

                for order, (link_kind, value) in enumerate(links, start=1):
                    try:
                        content, name = importer.read_bytes(link_kind, value)
                    except RuntimeError as exc:
                        stats['failed'] += 1
                        self.stderr.write(f'  ردیف {row_index}: {exc}')
                        continue
                    title = (keys['title'] or Path(name).stem or name)[:190]
                    if order > 1:
                        title = f'{title} ({order})'
                    if title in existing or name in existing:
                        stats['skipped'] += 1
                        continue
                    if options['dry_run']:
                        stats['created'] += 1
                        self.stdout.write(
                            f'  [dry-run] ردیف {row_index} → {letter.number or letter.id}: '
                            f'{name} ({len(content)} بایت)',
                        )
                        continue
                    attachment = LetterAttachment(
                        company=company, letter=letter, title=title,
                        kind=importer.guess_kind(name, kind_default), size=len(content),
                    )
                    attachment.file.save(name, ContentFile(content), save=False)
                    attachment.save()
                    existing.add(title)
                    existing.add(name)
                    stats['created'] += 1

            if options['dry_run']:
                transaction.set_rollback(True)

        self.stdout.write(self.style.SUCCESS(
            f'ردیف دارای لینک: {stats["rows"]} | نامهٔ شناسایی‌شده: {stats["linked"]} | '
            f'پیوست ثبت‌شده: {stats["created"]} | تکراری: {stats["skipped"]} | '
            f'نامهٔ پیدانشده: {stats["missing"]} | خطا: {stats["failed"]}'
            + ('  (اجرای آزمایشی: چیزی ذخیره نشد)' if stats['dry_run'] else ''),
        ))


