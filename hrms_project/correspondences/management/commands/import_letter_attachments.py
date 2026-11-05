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
        parser.add_argument('--file', default=None, help='مسیر فایل اکسل')
        parser.add_argument('--manifest', default=None,
                            help='مسیر فایل JSON خروجی اسکریپت export_letter_attachments')
        parser.add_argument('--company', default=None, help='شناسهٔ شرکت (در صورت نبود اسکیما)')
        parser.add_argument('--sheet', default=None, help='نام شیت (پیش‌فرض: اولین شیت)')
        parser.add_argument('--sheet-code', default=None, dest='sheet_code',
                            help='کد شیت برای تطبیق شناسهٔ منبع (پیش‌فرض از نام شیت حدس زده می‌شود)')
        parser.add_argument('--schema', default=None,
                            help='نام اسکیمای شرکت (پیش‌فرض: همهٔ اسکیماها)')
        parser.add_argument('--fallback-dir', default=None, dest='fallback_dir',
                            help='پوشهٔ جانشین برای لینک‌های شکسته (چند مقدار با کاما)')
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

    def _sheet_code(self, title):
        """کد شیت بر اساس نام آن (هم‌خوان با ``legacy.SHEET_CODES``)."""
        from correspondences import legacy

        canonical = str(title or '').strip()
        return legacy.SHEET_CODES.get(canonical, canonical.replace(' ', '-') or 'sheet')

    def _tenant_contexts(self, options):
        """لیست ``(schema_name, context)`` برای اجرای دستور در هر شرکت."""
        from contextlib import nullcontext

        try:
            from django.db import connection
            from django_tenants.utils import schema_context
        except Exception:  # noqa: BLE001 — نصب نبودن django-tenants
            return [(None, nullcontext())]

        if getattr(connection, 'schema_name', 'public') != 'public':
            return [(None, nullcontext())]

        wanted = (options.get('schema') or '').strip()
        if wanted:
            return [(wanted, schema_context(wanted))]
        from django_tenants.utils import get_tenant_model

        try:
            names = list(
                get_tenant_model().objects.exclude(schema_name='public')
                .values_list('schema_name', flat=True),
            )
        except Exception:  # noqa: BLE001
            names = []
        return [(name, schema_context(name)) for name in names] or [(None, nullcontext())]

    def handle(self, *args, **options):
        raw_dirs = options.get('fallback_dir') or ''
        options['fallback_dirs'] = [item.strip() for item in str(raw_dirs).split(',') if item.strip()]
        if options.get('manifest'):
            if options.get('file'):
                raise CommandError('فقط یکی از --file یا --manifest را بدهید.')
        elif not options.get('file'):
            raise CommandError('یکی از --file یا --manifest الزامی است.')

        company = self._company(options)
        for schema_name, context in self._tenant_contexts(options):
            if schema_name:
                self.stdout.write(self.style.MIGRATE_HEADING(f'--- اسکیما {schema_name} ---'))
            with context:
                if options.get('manifest'):
                    self._handle_manifest(options, company)
                else:
                    self._handle_excel(options, company)

    def _handle_manifest(self, options, company):
        """اجرای درون‌ریزی از فهرست آماده‌شده (JSON) بدون نیاز به اکسل."""
        import json

        from correspondences.models import LetterAttachment

        path = Path(options['manifest']).expanduser()
        if not path.exists():
            raise CommandError(f'فایل فهرست پیدا نشد: {path}')
        payload = json.loads(path.read_text(encoding='utf-8'))
        items = payload.get('items') or []
        if not items:
            raise CommandError('فهرست خالی است.')

        base_dir = path.parent

        stats = {'items': 0, 'linked': 0, 'created': 0, 'skipped': 0,
                 'missing': 0, 'failed': 0, 'no_file': 0, 'dry_run': bool(options['dry_run'])}
        limit = options.get('limit')

        with transaction.atomic():
            for item in items:
                if limit and stats['items'] >= limit:
                    break
                stats['items'] += 1
                keys = {
                    'source': str(item.get('source_ref') or '').strip(),
                    'number': str(item.get('number') or '').strip(),
                    'indicator': str(item.get('indicator') or '').strip(),
                    'external': str(item.get('external') or '').strip(),
                    'subject': str(item.get('subject') or '').strip(),
                    'title': str(item.get('title') or '').strip(),
                }
                letter = self._find_letter(company, keys)
                if not letter:
                    stats['missing'] += 1
                    if not options['skip_missing']:
                        self.stderr.write(f'  {keys["source"]}: نامه پیدا نشد '
                                          f'({keys["number"] or keys["subject"][:40]})')
                    continue
                stats['linked'] += 1
                existing = self._existing_titles(letter)
                for order, entry in enumerate(item.get('files') or [], start=1):
                    relative = entry.get('path') or ''
                    if not relative:
                        continue
                    source = Path(relative)
                    if not source.is_absolute():
                        source = base_dir / relative
                    if not source.exists():
                        stats['no_file'] += 1
                        self.stderr.write(f'  {keys["source"]}: فایل یافت نشد {source}')
                        continue
                    name = importer.safe_filename(entry.get('name') or source.name)
                    title = (entry.get('title') or keys['title'] or Path(name).stem or name)[:190]
                    if order > 1:
                        title = f'{title} ({order})'
                    if title in existing or name in existing:
                        stats['skipped'] += 1
                        continue
                    if options['dry_run']:
                        stats['created'] += 1
                        self.stdout.write(f'  [dry-run] {keys["source"]} → '
                                          f'{letter.number or letter.id}: {name}')
                        continue
                    try:
                        content, _resolved = importer.read_bytes('file', str(source))
                    except RuntimeError as exc:
                        stats['failed'] += 1
                        self.stderr.write(f'  {keys["source"]}: {exc}')
                        continue
                    attachment = LetterAttachment(
                        company=company, letter=letter, title=title,
                        kind=entry.get('kind') or importer.guess_kind(name, options['kind']),
                        size=len(content),
                    )
                    attachment.file.save(name, ContentFile(content), save=False)
                    attachment.save()
                    existing.add(title)
                    existing.add(name)
                    stats['created'] += 1

            if options['dry_run']:
                transaction.set_rollback(True)

        self.stdout.write(self.style.SUCCESS(
            f'ردیف فهرست: {stats["items"]} | نامهٔ شناسایی‌شده: {stats["linked"]} | '
            f'پیوست ثبت‌شده: {stats["created"]} | تکراری: {stats["skipped"]} | '
            f'نامهٔ پیدانشده: {stats["missing"]} | فایل غایب: {stats["no_file"]} | '
            f'خطا: {stats["failed"]}'
            + ('  (اجرای آزمایشی: چیزی ذخیره نشد)' if stats['dry_run'] else ''),
        ))

    def _handle_excel(self, options, company):
        from openpyxl import load_workbook

        from correspondences.models import LetterAttachment

        path = Path(options['file']).expanduser()
        if not path.exists():
            raise CommandError(f'فایل اکسل پیدا نشد: {path}')
        base_dir = Path(options['base_dir']).expanduser() if options['base_dir'] else path.parent
        kind_default = options['kind']

        workbook = load_workbook(path, data_only=True)
        wanted = (options.get('sheet') or '').strip()
        sheet = next(
            (item for item in workbook.worksheets if item.title.strip() == wanted),
            workbook.worksheets[0],
        ) if wanted else workbook.worksheets[0]
        sheet_code = (options.get('sheet_code') or '').strip() or self._sheet_code(sheet.title)

        header_row = None
        headers = {}
        for row_index in range(1, min(sheet.max_row, 12) + 1):
            row_cells = next(sheet.iter_rows(min_row=row_index, max_row=row_index, max_col=40))
            values = [_normalize_header(cell.value) for cell in row_cells]
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
                cells = list(next(sheet.iter_rows(min_row=row_index, max_row=row_index, max_col=40)))
                row_map = {}
                for name, index in headers.items():
                    if index < len(cells):
                        row_map[name] = cells[index].value

                links = []
                for cell in cells:
                    target = ''
                    if getattr(cell, 'hyperlink', None) and cell.hyperlink.target:
                        target = cell.hyperlink.target
                    elif isinstance(cell.value, str) and importer.looks_like_link(cell.value):
                        target = cell.value
                    if not target:
                        continue
                    link_kind, value, _filename = importer.parse_link(target, base_dir)
                    if link_kind == 'file' and not Path(value).exists():
                        fallback = importer.find_by_tail(target, options.get('fallback_dirs') or [])
                        if fallback:
                            value = fallback
                    if link_kind != 'none':
                        links.append((link_kind, value))
                if not links:
                    continue
                stats['rows'] += 1

                keys = {key: _pick(row_map, key) for key in
                        ('indicator', 'number', 'external', 'subject', 'title')}
                keys['source'] = f'{sheet_code}:{row_index}'
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


