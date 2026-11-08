/**
 * موتور چاپ سمت کلاینت.
 *
 * دو سناریو را پوشش می‌دهد:
 * 1) ``printHtml``  — HTML کاملِ آماده از سرور (سند رسمی: نامه/فیش/گزارش‌های موتور چاپ)
 * 2) ``printElement`` — چاپ «ناحیه‌ای» از صفحهٔ فعلی (گزارش‌هایی که جدولشان در کلاینت است)
 *
 * همهٔ چاپ‌ها از یک iframe مخفی و یک CSS چاپ یکسان استفاده می‌کنند تا خروجی
 * در همهٔ ماژول‌ها یکدست باشد (بدون چاپ سایدبار/دکمه‌ها).
 */

const PRINT_FRAME_ID = 'hrms-print-frame';

/** CSS پایهٔ چاپ برای ناحیه‌ای که از دامنهٔ فعلی گرفته می‌شود. */
const ELEMENT_CSS = `
@page { size: %PAPER% %ORIENTATION%; margin: 10mm 9mm 12mm 9mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; direction: rtl; background: #fff; }
body {
  font-family: 'Vazirmatn', 'IRANSans', 'Tahoma', 'Segoe UI', sans-serif;
  font-size: 9.5pt; line-height: 1.7; color: #111827;
}
h1, h2, h3, h4 { margin: 0 0 6px; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th, td { border: 1px solid #cbd5e1; padding: 3px 5px; font-size: 8.5pt; word-break: break-word; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; }
th { background: #f1f5f9; font-weight: 800; }
.pe-print-title { font-size: 13pt; font-weight: 900; margin-bottom: 4px; }
.pe-print-sub { font-size: 9pt; color: #475569; margin-bottom: 10px; }
.pe-print-frame { padding: 0; }
@media print { .pe-no-print { display: none !important; } }
`;

const getFrame = () => {
  let frame = document.getElementById(PRINT_FRAME_ID);
  if (!frame) {
    frame = document.createElement('iframe');
    frame.id = PRINT_FRAME_ID;
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-9999px;top:0;';
    document.body.appendChild(frame);
  }
  return frame;
};

/** چاپ HTML کامل در iframe مخفی (بدون بلاک‌شدن پاپ‌آپ). */
export const printHtml = (html, { title = 'چاپ', onDone } = {}) => {
  if (!html) return;
  const frame = getFrame();
  const finish = () => {
    try {
      const win = frame.contentWindow;
      win.focus();
      win.print();
    } finally {
      onDone?.();
    }
  };
  frame.onload = () => {
    // یک تیک فرصت می‌دهیم فونت/استایل اعمال شود
    window.setTimeout(finish, 60);
  };
  frame.srcdoc = html;
  if (title) document.title = title;
};

/** ساخت سند HTML از یک ناحیهٔ DOM (با استایل‌های چاپ یکسان). */
export const buildElementDocument = (element, {
  title = '', subtitle = '', paper = 'A4', orientation = 'portrait',
} = {}) => {
  if (!element) return '';
  const css = ELEMENT_CSS
    .replace('%PAPER%', paper)
    .replace('%ORIENTATION%', orientation === 'landscape' ? 'landscape' : 'portrait');
  const header = title
    ? `<div class="pe-print-title">${title}</div>`
      + (subtitle ? `<div class="pe-print-sub">${subtitle}</div>` : '')
    : '';
  return `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8">`
    + `<title>${title || 'چاپ'}</title><style>${css}</style></head>`
    + `<body><div class="pe-print-frame">${header}${element.outerHTML}</div></body></html>`;
};

/** چاپ یک ناحیه از صفحه (ref یا عنصر DOM). */
export const printElement = (target, options = {}) => {
  const element = target?.current ?? target;
  if (!element) return;
  printHtml(buildElementDocument(element, options), options);
};

export default { buildElementDocument, printElement, printHtml };
