"""ساخت فهرست (manifest) پیوست نامه‌ها از اکسل هایپرلینک‌دار + کپی فایل‌ها.

این اسکریپت روی رایانه‌ای اجرا می‌شود که به فایل اکسل و پوشهٔ اسکن‌ها دسترسی دارد
(ویندوز / درایو شبکه‌ای). فایل‌های پیدا‌شده با نام امن (ASCII) در پوشهٔ خروجی کپی
می‌شوند و یک ``manifest.json`` ساخته می‌شود که فرمان
``manage.py import_letter_attachments --manifest`` روی سرور آن را می‌خواند.

نمونه:

    python scripts/export_letter_attachments.py \
        --excel "Z:/Group/Accounting/اندیکاتور مالی.xlsx" \
        --sheet "نام های وارده" \
        --out  C:/temp/letters-pack \
        --fallback-dir "Z:/Everyone"

    # فقط بررسی، بدون کپی فایل‌ها:
    python scripts/export_letter_attachments.py --excel ... --dry-run
"""
import argparse
import json
import shutil
import sys
from pathlib import Path

try:
    from openpyxl import load_workbook
except ImportError:                                     # pragma: no cover
    sys.exit('openpyxl نصب نیست: pip install openpyxl')

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'hrms_project'))

from correspondences import attachment_import as importer  # noqa: E402
from correspondences import legacy  # noqa: E402

MAX_COL = 40
KEY_COLUMNS = {
    'number': ('شماره نامه', 'شماره'),
    'indicator': ('اندیکاتور', 'شماره اندیکاتور'),
    'external': ('شماره نامه طرف مقابل', 'شماره نامه طرفین'),
    'subject': ('موضوع', 'موضوع نامه'),
}



def normalize(value):
    return ' '.join(str(value or '').replace('ي', 'ی').replace('ك', 'ک').split()).lower()


def main(argv=None):
    parser = argparse.ArgumentParser(description='ساخت فهرست پیوست‌های نامه از اکسل هایپرلینک‌دار')
    parser.add_argument('--excel', required=True, help='مسیر فایل اکسل')
    parser.add_argument('--sheet', default=None, help='نام شیت (پیش‌فرض: اولین شیت)')
    parser.add_argument('--out', default=None, help='پوشهٔ خروجی برای فایل‌ها و manifest.json')
    parser.add_argument('--base-dir', default=None, help='مبنای مسیرهای نسبی (پیش‌فرض: پوشهٔ اکسل)')
    parser.add_argument('--fallback-dir', action='append', default=[],
                        help='پوشهٔ جانشین برای لینک‌های شکسته (قابل تکرار)')
    parser.add_argument('--limit', type=int, default=None, help='حداکثر تعداد ردیف')
    parser.add_argument('--rows', default=None,
                        help='فقط ردیف‌های مشخص (مثلاً 95,319,320)')
    parser.add_argument('--dry-run', action='store_true', help='فقط گزارش، بدون کپی فایل')
    args = parser.parse_args(argv)

    excel = Path(args.excel).expanduser()
    if not excel.exists():
        raise SystemExit(f'فایل اکسل پیدا نشد: {excel}')
    base_dir = Path(args.base_dir).expanduser() if args.base_dir else excel.parent
    out_dir = Path(args.out).expanduser() if args.out else (excel.parent / 'letters-pack')
    files_dir = out_dir / 'files'

    workbook = load_workbook(excel, data_only=True)
    wanted = (args.sheet or '').strip()
    sheet = next((item for item in workbook.worksheets if item.title.strip() == wanted),
                 None) if wanted else workbook.worksheets[0]
    if sheet is None:
        raise SystemExit(f'شیت پیدا نشد: {args.sheet}')
    sheet_code = legacy.SHEET_CODES.get(sheet.title.strip(), 'incoming')

    header_row = 1
    headers = {}
    for row_index in range(1, min(sheet.max_row, 12) + 1):
        row_cells = next(sheet.iter_rows(min_row=row_index, max_row=row_index, max_col=MAX_COL))
        values = [normalize(cell.value) for cell in row_cells]
        if any(normalize(alias) in values for alias in KEY_COLUMNS['number']):
            header_row = row_index
            headers = {value: index for index, value in enumerate(values) if value}
            break

    def pick(row_map, key):
        for alias in KEY_COLUMNS[key]:
            value = row_map.get(normalize(alias))
            if value not in (None, ''):
                return str(value).strip()
        return ''

    items = []
    only_rows = {
        int(part) for part in str(args.rows or '').replace(' ', '').split(',') if part.strip().isdigit()
    }
    stats = {'rows': 0, 'files_ok': 0, 'files_missing': 0, 'bytes': 0, 'no_key': 0}
    if not args.dry_run:
        files_dir.mkdir(parents=True, exist_ok=True)
    # --- پیمایش ردیف‌ها و ساخت فهرست ---

    for row_index in range(header_row + 1, sheet.max_row + 1):
        if args.limit and stats['rows'] >= args.limit:
            break
        if only_rows and row_index not in only_rows:
            continue
        cells = list(next(sheet.iter_rows(min_row=row_index, max_row=row_index, max_col=MAX_COL)))
        if not any(cell.value not in (None, '') for cell in cells):
            continue
        row_map = {}
        for name, index in headers.items():
            if index < len(cells):
                row_map[name] = cells[index].value

        links = []
        for cell in cells:
            target = getattr(getattr(cell, 'hyperlink', None), 'target', None) or ''
            if not target and isinstance(cell.value, str) \
                    and importer.looks_like_link(cell.value):
                target = cell.value
            if target:
                links.append(target)
        if not links:
            continue

        keys = {key: pick(row_map, key) for key in KEY_COLUMNS}
        if not any(keys.values()):
            stats['no_key'] += 1
            continue
        stats['rows'] += 1

        entry = {
            'source_ref': f'{sheet_code}:{row_index}',
            'number': keys['number'],
            'indicator': keys['indicator'],
            'external': keys['external'],
            'subject': keys['subject'],
            'title': keys['subject'],
            'files': [],
        }
        for target in links:
            kind, value, filename = importer.parse_link(target, base_dir)
            source = Path(value)
            if kind == 'file' and not source.is_file():
                found = importer.find_by_tail(target, args.fallback_dir)
                if found:
                    source = Path(found)
            if kind == 'file' and not source.is_file():
                stats['files_missing'] += 1
                print(f'  [missing] row {row_index}: {value}')
                continue
            if kind != 'file':
                stats['files_missing'] += 1
                print(f'  [url] row {row_index}: {value}')
                continue
            stats['files_ok'] += 1
            stats['bytes'] += source.stat().st_size
            stored = f"f{len(items):05d}_{len(entry['files']) + 1}{source.suffix.lower()}"
            destination = files_dir / stored
            if not args.dry_run and not (
                destination.is_file() and destination.stat().st_size == source.stat().st_size
            ):
                shutil.copy2(source, destination)
            entry['files'].append({
                'path': f'files/{stored}',
                'name': importer.safe_filename(filename or source.name),
                'title': keys['subject'] or Path(filename or source.name).stem,
                'source': str(source),
            })
        if entry['files']:
            items.append(entry)

    payload = {
        'excel': str(excel),
        'sheet': sheet.title.strip(),
        'sheet_code': sheet_code,
        'generated_files': stats['files_ok'],
        'items': items,
    }
    if not args.dry_run:
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / 'manifest.json').write_text(
            json.dumps(payload, ensure_ascii=False, indent=1), encoding='utf-8',
        )

    print('--- summary ---')
    print('rows with links:', stats['rows'])
    print('files found:', stats['files_ok'], '| missing:', stats['files_missing'],
          '| rows without letter keys:', stats['no_key'])
    print('total MB:', round(stats['bytes'] / 1024 / 1024, 1))
    print('letters in manifest:', len(items))
    if not args.dry_run:
        print('manifest:', out_dir / 'manifest.json')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
