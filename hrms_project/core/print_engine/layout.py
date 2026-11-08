"""قالب یکپارچهٔ سند چاپی (A4/A5، افقی/عمودی، RTL) با CSS چاپ حرفه‌ای."""
from core.print_engine.components import esc, fa_digits, jalali, watermark

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
  display: flex; align-items: flex-start; gap: 10px;
  border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 10px;
}
.pe-brand { display: flex; align-items: center; gap: 8px; min-width: 0; }
.pe-logo {
  width: 44px; height: 44px; border-radius: 10px; display: grid; place-items: center;
  background: #0f172a; color: #fff; font-size: 15pt; font-weight: 900; flex: 0 0 auto;
}
.pe-brand-name { font-size: 12.5pt; font-weight: 900; }
.pe-brand-sub { font-size: 8.5pt; color: #475569; }
.pe-title-block { flex: 1; text-align: center; }
.pe-title { font-size: 14pt; font-weight: 900; }
.pe-subtitle { font-size: 9.5pt; color: #475569; margin-top: 2px; }
.pe-badge {
  display: inline-block; border: 1px solid #0f172a; border-radius: 999px;
  padding: 1px 10px; font-size: 8.5pt; font-weight: 800; margin-top: 4px;
}
.pe-meta { display: flex; gap: 14px; font-size: 8.5pt; color: #334155; white-space: nowrap; }
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
.pe-fields td.pe-value { font-weight: 700; white-space: pre-wrap; word-break: break-word; }
.pe-table { width: 100%%; border-collapse: collapse; table-layout: fixed; }
.pe-table th {
  background: #0f172a; color: #fff; font-size: 8.5pt; padding: 4px 5px; font-weight: 800;
}
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
  position: fixed; bottom: 0; left: 0; right: 0; display: flex; gap: 10px;
  justify-content: space-between; font-size: 7.5pt; color: #64748b;
  border-top: 1px solid #cbd5e1; padding-top: 3px;
}
.pe-page-number::after { content: counter(page); }
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
    padding: 12mm 10mm;
  }
}
@media print {
  .pe-screen-toolbar { display: none !important; }
  .pe-sheet { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
  .pe-footer { position: fixed; }
}
"""


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
        'margin': options.get('margin', '10mm 9mm 12mm 9mm'),
        'font_size': options.get('font_size', 9.5),
        'paper_width': width,
        'paper_height': height,
    }


def _header(document, options):
    if options.get('show_header') is False:
        return ''
    company = document.get('company') or {}
    brand_name = company.get('name') or options.get('brand_name', '')
    brand_sub = company.get('subtitle') or options.get('brand_subtitle', '')
    logo_text = (company.get('logo_text') or brand_name[:2] or 'K').strip()
    meta_bits = ''.join(
        f'<div><span>{esc(label)}:</span><strong>{esc(value)}</strong></div>'
        for label, value in (document.get('meta') or [])
        if value
    )
    badge = f'<div class="pe-badge">{esc(document["badge"])}</div>' if document.get('badge') else ''
    brand = ''
    if brand_name:
        brand = (
            '<div class="pe-brand">'
            f'<div class="pe-logo">{esc(logo_text)}</div>'
            '<div><div class="pe-brand-name">'
            f'{esc(brand_name)}</div>'
            f'<div class="pe-brand-sub">{esc(brand_sub)}</div></div>'
            '</div>'
        )
    return (
        '<header class="pe-header">'
        f'{brand}<div class="pe-title-block">'
        f'<div class="pe-title">{esc(document.get("title", "سند"))}</div>'
        f'<div class="pe-subtitle">{esc(document.get("subtitle", ""))}</div>'
        f'{badge}</div>'
        f'<div class="pe-meta">{meta_bits}</div>'
        '</header>'
    )


def _footer(document, options):
    if options.get('show_footer') is False:
        return ''
    bits = [esc(document.get('footer_note', ''))]
    printed_at = jalali(document.get('printed_on'))
    if printed_at and options.get('show_printed_at', True):
        bits.append(f'تاریخ چاپ: {printed_at}')
    if options.get('show_page_number', True):
        bits.append('صفحهٔ <span class="pe-page-number"></span>')
    return (
        '<footer class="pe-footer">'
        + ''.join(f'<div>{bit}</div>' for bit in bits if bit)
        + '</footer>'
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

    return (
        '<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8">'
        f'<title>{esc(document.get("title", "چاپ"))}</title>'
        f'<style>{_css(options)}</style></head><body>'
        f'{watermark(document.get("watermark"))}'
        '<div class="pe-sheet">'
        f'{_header(document, options)}'
        f'{amount_html}{body_sections}{note_html}{barcode_html}'
        f'{document.get("signatures") or ""}'
        f'{_footer(document, options)}'
        '</div></body></html>'
    )


def page_label(options=None):
    """برچسب خوانا برای سرصفحهٔ گزارش/شرح چاپ."""
    options = options or {}
    paper = options.get('paper', 'A4')
    orientation = 'افقی' if options.get('orientation') == 'landscape' else 'عمودی'
    return f'{paper} · {orientation} · {fa_digits(options.get("copies", 1))} نسخه'
