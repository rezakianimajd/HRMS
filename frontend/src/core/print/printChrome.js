/**
 * «پوستهٔ چاپ» سمت کلاینت — سربرگ/پاورقی ثابت برای همهٔ چاپ‌های ناحیه‌ای.
 *
 * چاپ‌های سروری (نامه، فیش، سند خزانه، فهرست مکاتبات) همین سربرگ/پاورقی را از
 * موتور چاپ می‌گیرند؛ این ماژول همان ظاهر را برای گزارش‌هایی می‌سازد که در
 * کلاینت با ``printElement`` چاپ می‌شوند تا تنظیمات «ظاهر → چاپ» همه‌جا اعمال شود.
 */
import axiosInstance from '../api/axiosConfig';
import { DEFAULT_PRINT_SETTINGS, normalizePrintSettings } from '../theme/printSettings';

let cache = { at: 0, settings: null, branding: null };

export const resetPrintChromeCache = () => { cache = { at: 0, settings: null, branding: null }; };

/** تنظیمات چاپ شرکت + برند (لوگو/نام حقوقی) با کش کوتاه. */
export const loadPrintChrome = async ({ force = false } = {}) => {
  const now = Date.now();
  if (!force && cache.settings && now - cache.at < 60_000) return cache;
  try {
    const [appearance, branding] = await Promise.all([
      axiosInstance.get('/settings/appearance/'),
      axiosInstance.get('/company/branding/'),
    ]);
    cache = {
      at: now,
      settings: normalizePrintSettings(appearance?.data?.print),
      branding: branding?.data || {},
    };
  } catch (error) {
    cache = {
      at: now,
      settings: cache.settings || DEFAULT_PRINT_SETTINGS,
      branding: cache.branding || {},
    };
  }
  return cache;
};

const escapeHtml = (value) => String(value ?? '').replace(
  /[&<>"]/g,
  (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]),
);

const num = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return String(Math.round(number * 100) / 100).replace(/\.0+$/, '');
};

const marginWithFooter = (settings) => {
  const margin = String(settings?.margin || '10mm 9mm 12mm 9mm').trim();
  const footer = settings?.footer || {};
  if (footer.enabled === false) return margin;
  const bottom = footer.signatures === false ? '10mm' : '22mm';
  const parts = margin.split(/\s+/).filter(Boolean);
  if (parts.length >= 4) return `${parts[0]} ${parts[1]} ${bottom} ${parts[3]}`;
  if (parts.length === 3) return `${parts[0]} ${parts[1]} ${bottom} ${parts[1]}`;
  if (parts.length === 2) return `${parts[0]} ${parts[1]} ${bottom} ${parts[1]}`;
  if (parts.length === 1) return `${parts[0]} ${parts[0]} ${bottom} ${parts[0]}`;
  return `10mm 9mm ${bottom} 9mm`;
};

const chromeCss = (settings, paper, orientation) => {
  const header = settings.header || {};
  const footer = settings.footer || {};
  return `
@page { size: ${paper} ${orientation}; margin: ${marginWithFooter(settings)}; }
html, body { margin: 0; padding: 0; direction: rtl; background: #fff; }
body { font-family: 'Vazirmatn', 'IRANSans', 'Tahoma', 'Segoe UI', sans-serif; color: #111827; }
.pe-doc-header {
  text-align: center;
  padding: ${num(header.space_top)}mm ${num(header.space_side)}mm ${num(header.space_bottom)}mm;
  margin-bottom: 4mm;
  ${header.show_border === false ? '' : 'border-bottom: 2px solid #0f172a;'}
}
.pe-doc-header .pe-logo {
  display: block; margin: 0 auto 2px;
  width: ${num(header.logo_width)}mm; height: ${num(header.logo_height)}mm; object-fit: contain;
}
.pe-doc-header .pe-company { font-size: ${num(header.company_font_size)}pt; font-weight: 900; }
.pe-doc-header .pe-title {
  font-size: ${num(header.title_font_size)}pt; font-weight: 900; margin-top: 2mm;
}
.pe-doc-footer {
  position: fixed; bottom: 0; left: 0; right: 0; background: #fff; z-index: 5; margin: 0;
  padding-bottom: ${num(footer.space_bottom)}mm;
  ${footer.show_border === false ? '' : 'border-top: 1px solid #cbd5e1;'}
}
.pe-doc-footer .pe-sign-row { display: flex; gap: 2mm; margin-top: 1mm; }
.pe-doc-footer .pe-sign {
  flex: 1; border: 1px solid #94a3b8; border-radius: 2mm; min-height: 13mm;
  padding: 1mm 2mm; text-align: center; font-size: ${num(footer.font_size)}pt;
}
.pe-doc-footer .pe-sign-name { margin-top: 4mm; }
.pe-doc-footer .pe-meta {
  display: flex; gap: 3mm; color: #64748b; font-size: ${num(footer.font_size)}pt; margin-top: 1mm;
}
.pe-doc-footer .pe-page::after { content: counter(page); }
.pe-doc-content { padding-bottom: 2mm; }
@media screen {
  body { background: #e2e8f0; }
  .pe-doc-sheet {
    background: #fff; margin: 16px auto; padding: 12mm 10mm 18mm; position: relative;
    min-height: 240mm; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18);
  }
  .pe-doc-footer { position: absolute; }
}
@media print {
  .pe-doc-sheet { margin: 0; padding: 0; box-shadow: none; min-height: 0; }
  .pe-doc-footer { position: fixed; }
}
`;
};


/** محتوای HTML آمادهٔ چاپ کلاینتی را با سربرگ/پاورقی تنظیمات ترکیب می‌کند. */
export const buildChromeDocument = ({
  contentHtml = '', styles = '', title = '', paper = 'A4', orientation = 'portrait',
  settings = DEFAULT_PRINT_SETTINGS, branding = {},
}) => {
  const header = settings?.header || {};
  const footer = settings?.footer || {};
  const logo = header.show_logo === false ? '' : (branding?.logo_url || '');
  const company = String(branding?.legal_name || branding?.name || '').trim();
  const headerHtml = header.enabled === false ? '' : `
    <header class="pe-doc-header">
      ${logo ? `<img class="pe-logo" src="${escapeHtml(logo)}" alt="${escapeHtml(company)}" />` : ''}
      ${company ? `<div class="pe-company">${escapeHtml(company)}</div>` : ''}
      ${title ? `<div class="pe-title">${escapeHtml(title)}</div>` : ''}
    </header>`;
  const signatureHtml = footer.signatures === false ? '' : `
    <div class="pe-sign-row">
      <div class="pe-sign"><div class="pe-sign-title">تهیه‌کننده</div><div class="pe-sign-name"></div></div>
      <div class="pe-sign"><div class="pe-sign-title">تأییدکننده</div><div class="pe-sign-name"></div></div>
      <div class="pe-sign"><div class="pe-sign-title">مهر و امضا</div><div class="pe-sign-name"></div></div>
    </div>`;
  const metaBits = [
    footer.text ? escapeHtml(footer.text) : '',
    footer.extra ? escapeHtml(footer.extra) : '',
    footer.show_page_number === false ? '' : 'صفحهٔ <span class="pe-page"></span>',
  ].filter(Boolean);
  const footerHtml = footer.enabled === false ? '' : `
    <footer class="pe-doc-footer">
      ${signatureHtml}
      <div class="pe-meta">${metaBits.map((bit) => `<div>${bit}</div>`).join('')}</div>
    </footer>`;
  return `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8">`
    + `<title>${escapeHtml(title || 'چاپ')}</title>`
    + `<style>${styles}\n${chromeCss(settings, paper, orientation)}</style></head>`
    + `<body><div class="pe-doc-sheet">${headerHtml}`
    + `<div class="pe-doc-content">${contentHtml}</div>${footerHtml}</div></body></html>`;
};

export default buildChromeDocument;

