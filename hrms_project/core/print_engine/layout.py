"""قالب یکپارچهٔ سند چاپی (A4/A5، افقی/عمودی، RTL) با CSS چاپ حرفه‌ای."""
from core.print_engine.components import esc, fa_digits, watermark

PAPERS = {
    'A4': {'width': '210mm', 'height': '297mm'},
    'A5': {'width': '148mm', 'height': '210mm'},
    'A3': {'width': '297mm', 'height': '420mm'},
    'Letter': {'width': '8.5in', 'height': '11in'},
}

BASE_CSS = """
@page { size: %(paper)s %(orientation)s; margin: %(margin)s; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; direction: rtl; }
body {
  font-family: 'Vazirmatn', 'IRANSans', 'Tahoma', 'Segoe UI', sans-serif;
  font-size: %(font_size)spt; line-height: 1.75; color: #111827; background: #fff;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.pe-sheet { position: relative; padding: 4mm 2mm; }
.pe-watermark {
  position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: 90pt; font-weight: 900; color: rgba(15, 23, 42, 0.06);
  transform: rotate(-28deg); pointer-events: none; z-index: 0;
}
.pe-header {
  text-align: center; padding-bottom: 6px; margin-bottom: 10px;
}
.pe-header-center { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.pe-print-logo {
  max-height: 20mm; max-width: 62mm; object-fit: contain; display: block; margin: 0 auto 2px;
}
.pe-brand-name { font-size: 13pt; font-weight: 900; }
.pe-title { font-size: 13pt; font-weight: 900; margin-top: 4px; }
.pe-subtitle { font-size: 9.5pt; color: #475569; margin-top: 1px; }
.pe-badge {
  display: inline-block; border: 1px solid #0f172a; border-radius: 999px;
  padding: 1px 10px; font-size: 8.5pt; font-weight: 800; margin-top: 4px;
}
.pe-meta { display: flex; gap: 14px; font-size: 8.5pt; color: #334155; justify-content: center; }
.pe-header-contact {
  font-size: 8pt; color: #475569; text-align: center; margin: 4px 0 2px;
  word-break: break-word;
}
.pe-header-extra {
  font-size: 8.5pt; color: #0f172a; font-weight: 700; text-align: center;
  border: 1px dashed #cbd5e1; border-radius: 6px; padding: 2px 8px; margin-bottom: 8px;
}
.pe-print-title { font-size: 13pt; font-weight: 900; margin-bottom: 4px; }
.pe-print-sub { font-size: 9pt; color: #475569; margin-bottom: 10px; }
.pe-meta div { display: flex; gap: 4px; }
.pe-section { margin: 9px 0; page-break-inside: avoid; }
.pe-section-title {
  font-size: 10.5pt; font-weight: 900; border-right: 3px solid #0f172a;
  padding-right: 6px; margin-bottom: 5px;
}
.pe-fields { width: 100%%; border-collapse: collapse; table-layout: fixed; }
.pe-fields th, .pe-fields td { border: 1px solid #cbd5e1; padding: 3px 5px; font-size: 9pt; }
.pe-fields th.pe-label {
  width: 14%%; background: #f1f5f9; color: #475569; font-weight: 800; white-space: nowrap;
}
.pe-fields.pe-fields-custom th.pe-label { width: auto; }
.pe-fields td.pe-value { font-weight: 700; white-space: pre-wrap; word-break: break-word; }
.pe-table { width: 100%%; border-collapse: collapse; table-layout: fixed; }
.pe-table th {
  background: #0f172a; color: #fff; font-size: 8.5pt; padding: 4px 5px; font-weight: 800;
}
.pe-table.pe-table-light th {
  background: #e2e8f0; color: #0f172a; border: 1px solid #cbd5e1;
}
.pe-table.pe-table-light tfoot td { background: #f1f5f9; color: #0f172a; }
.pe-table td {
  border: 1px solid #cbd5e1; padding: 3px 5px; font-size: 8.5pt;
  word-break: break-word; vertical-align: middle;
}
.pe-table.pe-zebra tbody tr:nth-child(even) td { background: #f8fafc; }
.pe-table tfoot td { background: #e2e8f0; font-weight: 900; }
.pe-table thead { display: table-header-group; }
.pe-table tr { page-break-inside: avoid; }
.pe-amount-box {
  border: 1.5px solid #0f172a; border-radius: 8px; padding: 4px 10px;
  display: flex; justify-content: space-between; align-items: center; margin: 8px 0;
}
.pe-amount-words { font-size: 9pt; font-weight: 800; }
.pe-amount-value { font-size: 11pt; font-weight: 900; font-family: 'Consolas', monospace; }
.pe-note { font-size: 8.5pt; color: #475569; border: 1px dashed #94a3b8; padding: 4px 8px; border-radius: 6px; }
.pe-statement-page {
  display: flex; flex-direction: column; min-height: 172mm;
  page-break-after: always; break-after: page;
}
.pe-statement-page.pe-statement-page-first { min-height: 130mm; }
.pe-statement-page-last { page-break-after: auto; break-after: auto; }
.pe-statement-divider {
  height: 1px; margin: 7px 0 9px; border-radius: 999px;
  background: linear-gradient(90deg, transparent, #94a3b8 15%%, #0f172a 50%%, #94a3b8 85%%, transparent);
}
.pe-statement-totals { margin-top: auto; padding-top: 4px; page-break-inside: avoid; }
.pe-statement-totals-table td {
  background: #f8fafc; font-weight: 800; font-size: 8pt;
  padding: 4px 5px;
}
.pe-statement-totals-table td.pe-total-label { text-align: right; color: #334155; }
.pe-statement-totals-table td.pe-total-value { text-align: left; font-family: inherit; }
.pe-statement-totals-table tr.pe-grand-total td { background: #e2e8f0; color: #0f172a; }
.pe-sign-row { display: flex; gap: 10px; margin-top: 14px; page-break-inside: avoid; }
.pe-sign {
  flex: 1; border: 1px solid #94a3b8; border-radius: 8px; min-height: 60px;
  padding: 4px 8px; text-align: center;
}
.pe-sign-title { font-size: 8.5pt; font-weight: 800; color: #475569; }
.pe-sign-name { margin-top: 26px; font-size: 9pt; font-weight: 700; }
.pe-barcode { text-align: center; margin-top: 8px; }
.pe-barcode svg { max-height: 13mm; }
.pe-footer {
  position: fixed; bottom: 0; left: 0; right: 0; background: #fff;
  padding: 0; margin: 0; z-index: 5;
}
.pe-footer .pe-sign-row { margin-top: 0; gap: 8px; }
.pe-footer .pe-sign { min-height: 13mm; padding: 2px 6px; border-radius: 6px; }
.pe-footer .pe-sign-title { font-size: 7.5pt; }
.pe-footer .pe-sign-name { margin-top: 6px; font-size: 8pt; }
.pe-footer-meta { display: flex; gap: 10px; font-size: 7.5pt; color: #64748b; margin-top: 1mm; }
@counter-style pe-persian-page {
  system: numeric;
  symbols: '۰' '۱' '۲' '۳' '۴' '۵' '۶' '۷' '۸' '۹';
  suffix: '';
}
.pe-page-number::after { content: counter(page, pe-persian-page); }
@media screen { .pe-page-number::after { content: '۱'; } }
.pe-screen-toolbar {
  position: fixed; top: 8px; left: 8px; display: flex; gap: 6px; z-index: 20;
  background: #0f172a; padding: 6px; border-radius: 10px;
}
.pe-screen-toolbar button {
  font-family: inherit; font-size: 11px; font-weight: 800; border: 0; border-radius: 7px;
  padding: 6px 12px; cursor: pointer; background: #1e293b; color: #fff;
}
.pe-screen-toolbar button.primary { background: #0ea5e9; color: #04212f; }
@media screen {
  body { background: #e2e8f0; }
  .pe-sheet {
    width: %(paper_width)s; min-height: %(paper_height)s; margin: 16px auto;
    background: #fff; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18);
    padding: 12mm 10mm 16mm; position: relative;
  }
  .pe-footer { position: absolute; bottom: 0; }
}
@media print {
  .pe-screen-toolbar { display: none !important; }
  .pe-sheet { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
  .pe-footer { position: fixed; bottom: 0; }
}
"""


def _num_text(value, fallback=0):
    """نمایش تمیز عدد (بدون .0) برای استایل‌های inline."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        number = float(fallback)
    if number == int(number):
        return str(int(number))
    return f'{number:.2f}'.rstrip('0').rstrip('.')


def _page_margin(options):
    """حاشیهٔ صفحه؛ پایین صفحه برای پاورقی ثابت (امضاها) باز نگه داشته می‌شود."""
    margin = str(options.get('margin') or '10mm 9mm 12mm 9mm').strip()
    footer = options.get('footer') or {}
    if footer.get('enabled') is False:
        return margin
    bottom = str(options.get('margin_bottom') or '') or (
        '22mm' if footer.get('signatures', True) else '10mm'
    )
    parts = margin.split()
    if len(parts) >= 4:
        parts[2] = bottom
        return ' '.join(parts[:4])
    if len(parts) == 3:
        return f'{parts[0]} {parts[1]} {bottom} {parts[1]}'
    if len(parts) == 2:
        return f'{parts[0]} {parts[1]} {bottom} {parts[1]}'
    if len(parts) == 1:
        return f'{parts[0]} {parts[0]} {bottom} {parts[0]}'
    return f'10mm 9mm {bottom} 9mm'


def _css(options):
    """CSS نهایی با اندازهٔ کاغذ/حاشیه/فونت انتخابی."""
    paper = options.get('paper', 'A4')
    dimensions = PAPERS.get(paper, PAPERS['A4'])
    landscape = options.get('orientation') == 'landscape'
    width, height = dimensions['width'], dimensions['height']
    if landscape:
        width, height = height, width
    return BASE_CSS % {
        'paper': paper,
        'orientation': 'landscape' if landscape else 'portrait',
        'margin': _page_margin(options),
        'font_size': options.get('font_size', 9.5),
        'paper_width': width,
        'paper_height': height,
    }


def _header(document, options):
    """سربرگ: لوگوی شرکت (وسط) → نام شرکت → عنوان چاپ → خط جداکننده."""
    config = options.get('header') or {}
    if options.get('show_header') is False or config.get('enabled') is False:
        return ''
    company = document.get('company') or {}
    brand_name = company.get('name') or options.get('brand_name', '')
    logo_src = company.get('logo') or ''
    show_logo = config.get('show_logo', True) and bool(logo_src)
    title_text = document.get('title') or config.get('title') or 'سند'
    border = 'border-bottom:2px solid #0f172a;' if config.get('show_border', True) else 'border-bottom:0;'
    logo_width = config.get('logo_width', 28)
    logo_height = config.get('logo_height', 18)
    company_size = config.get('company_font_size', 13)
    title_size = config.get('title_font_size', 13)
    space_top = config.get('space_top', 0)
    space_bottom = config.get('space_bottom', 6)
    space_side = config.get('space_side', 0)
    logo_html = (
        f'<img class="pe-print-logo" src="{logo_src}" alt="{esc(brand_name)}" '
        f'style="width:{_num_text(logo_width)}mm;height:{_num_text(logo_height)}mm;'
        'max-width:100%;object-fit:contain;" />'
        if show_logo else ''
    )
    name_html = (
        f'<div class="pe-brand-name" style="font-size:{_num_text(company_size)}pt;">'
        f'{esc(brand_name)}</div>'
        if brand_name else ''
    )
    contacts = [
        ('نشانی', config.get('address')), ('تلفن', config.get('phone')),
        ('ایمیل', config.get('email')), ('وبگاه', config.get('website')),
    ]
    contact_text = ' · '.join(
        f'{label}: {fa_digits(value)}' for label, value in contacts if value
    )
    contact_html = f'<div class="pe-header-contact">{esc(contact_text)}</div>' if contact_text else ''
    extra_html = (
        f'<div class="pe-header-extra">{esc(fa_digits(config["extra"]))}</div>'
        if config.get('extra') else ''
    )
    padding = f'{_num_text(space_top)}mm {_num_text(space_side)}mm {_num_text(space_bottom)}mm'
    return (
        f'<header class="pe-header" style="{border}padding:{padding};">'
        '<div class="pe-header-center">'
        f'{logo_html}{name_html}'
        f'<div class="pe-title" style="font-size:{_num_text(title_size)}pt;">{esc(title_text)}</div>'
        '</div></header>'
        f'{contact_html}{extra_html}'
    )


def _footer(document, options):
    """پاورقی ثابت پایین صفحه: امضاها + متن/تاریخ/شمارهٔ صفحه."""
    config = options.get('footer') or {}
    if options.get('show_footer') is False or config.get('enabled') is False:
        return ''
    signatures = document.get('signatures') or ''
    show_signatures = config.get('signatures', True)
    signature_html = (
        f'<div class="pe-footer-sign">{signatures}</div>'
        if signatures and show_signatures else ''
    )
    bits = [esc(config.get('text') or ''), esc(document.get('footer_note', '')), esc(config.get('extra') or '')]
    show_page = config.get('show_page_number')
    if show_page is None:
        show_page = options.get('show_page_number', True)
    if show_page:
        page_text = options.get('page_number_text')
        bits.append(
            f'صفحهٔ {esc(page_text)}' if page_text
            else 'صفحهٔ <span class="pe-page-number"></span>'
        )
    align = config.get('align') or 'center'
    justify = {
        'right': 'flex-start',
        'center': 'center',
        'left': 'flex-end',
        'space-between': 'space-between',
    }.get(align, 'center')
    border = 'border-top:1px solid #cbd5e1;' if config.get('show_border', True) else 'border-top:0;'
    footer_font = config.get('font_size', 7.5)
    space_bottom = config.get('space_bottom', 2)
    return (
        f'<footer class="pe-footer" style="{border}padding-bottom:{_num_text(space_bottom)}mm;">'
        f'{signature_html}'
        f'<div class="pe-footer-meta" style="justify-content:{justify};font-size:{_num_text(footer_font)}pt;">'
        + ''.join(f'<div>{bit}</div>' for bit in bits if bit)
        + '</div></footer>'
    )


def render_document(document, options=None):
    """سند کامل HTML — ``document``: {title, subtitle, badge, meta, sections, ...}."""
    options = options or {}
    body_sections = ''
    for section in document.get('sections') or []:
        if not section:
            continue
        html_body = section.get('html') or ''
        if not html_body:
            continue
        title = section.get('title')
        title_html = f'<div class="pe-section-title">{esc(title)}</div>' if title else ''
        body_sections += f'<section class="pe-section">{title_html}{html_body}</section>'

    amount = document.get('amount_box')
    amount_html = ''
    if amount:
        amount_html = (
            '<div class="pe-amount-box">'
            f'<div class="pe-amount-words">{esc(amount.get("words", ""))}</div>'
            f'<div class="pe-amount-value">{esc(amount.get("value", ""))}</div>'
            '</div>'
        )

    note = document.get('note')
    note_html = f'<div class="pe-note">{esc(note)}</div>' if note else ''
    barcode_html = ''
    if document.get('barcode'):
        barcode_html = f'<div class="pe-barcode">{document["barcode"]}</div>'

    footer_html = _footer(document, options)
    footer_config = options.get('footer') or {}
    # امضاها داخل پاورقی ثابت رندر می‌شوند؛ تکرار در جریان متن لازم نیست.
    signatures_in_footer = bool(footer_html) and footer_config.get('signatures', True)
    signatures_html = '' if signatures_in_footer else (document.get('signatures') or '')

    return (
        '<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8">'
        f'<title>{esc(document.get("title", "چاپ"))}</title>'
        f'<style>{_css(options)}</style></head><body>'
        f'{watermark(document.get("watermark"))}'
        '<div class="pe-sheet">'
        f'{_header(document, options)}'
        f'{amount_html}{body_sections}{note_html}{barcode_html}'
        f'{signatures_html}'
        f'{footer_html}'
        '</div></body></html>'
    )


def page_label(options=None):
    """برچسب خوانا برای سرصفحهٔ گزارش/شرح چاپ."""
    options = options or {}
    paper = options.get('paper', 'A4')
    orientation = 'افقی' if options.get('orientation') == 'landscape' else 'عمودی'
    return f'{paper} · {orientation} · {fa_digits(options.get("copies", 1))} نسخه'
