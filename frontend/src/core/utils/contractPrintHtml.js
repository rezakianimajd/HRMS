/**
 * Build a print-ready, professional HTML document for a contract.
 * Typography: Vazirmatn, font-size 10pt, articles bold, header centered,
 * optional signature image.
 */

import { parseContractText } from './contractTextParser';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>');
}

export function buildContractPrintHtml({ textValue, logoUrl, companyName, companyAddress, signatureImageUrl, reportTitle }) {
  const blocks = parseContractText(textValue);

  let bodyHtml = '';

  blocks.forEach((b) => {
    if (b.type === 'header') {
      bodyHtml += `<div style="text-align:center;font-weight:900;font-size:16px;color:#1a2744;margin:8px 0 14px;">${esc(b.text)}</div>`;
    } else if (b.type === 'article') {
      bodyHtml += `<div style="font-weight:800;font-size:10pt;margin:12px 0 4px;color:#222;">${esc(b.title)}${b.subtitle ? '— ' + esc(b.subtitle) : ''}</div>`;
    } else if (b.type === 'signature') {
      bodyHtml += `<div style="margin-top:18px;font-weight:800;display:flex;justify-content:space-between;">${esc(b.text)}</div>`;
    } else {
      bodyHtml += `<div style="margin:0 0 8px;font-size:10pt;line-height:2;text-align:justify;">${esc(b.text)}</div>`;
    }
  });

  const headerHtml = `
    <div style="text-align:center;margin-bottom:10px;">
      ${logoUrl ? `<img src="${esc(logoUrl)}" style="max-height:75px;display:inline-block;margin:0 auto;" />` : ''}
      ${companyName ? `<div style="font-weight:900;font-size:14pt;margin-top:4px;color:#111;">${esc(companyName)}</div>` : ''}
      ${companyAddress ? `<div style="font-size:9pt;color:#555;direction:rtl;">${esc(companyAddress)}</div>` : ''}
    </div>
  `;

  const signatureHtml = signatureImageUrl
    ? `<div style="display:flex;justify-content:space-between;margin-top:36px;align-items:center;font-weight:700;">
        <div>
          <div style="font-weight:800;margin-bottom:6px;">${companyName ? 'امضا و مهر ' + esc(companyName || '') : ''}</div>
          <img src="${esc(signatureImageUrl)}" style="max-height:95px;max-width:220px;" />
          <div style="font-size:9pt;border-top:1px solid #999;margin-top:4px;"></div>
        </div>
      </div>`
    : '';

  return `<!doctype html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>${esc(reportTitle || 'قرارداد')}</title>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700;900&display=swap" rel="stylesheet">
<style>
  @page { margin: 28px 36px; }
  body { font-family:'Vazirmatn',Tahoma,sans-serif; direction:rtl; font-size:10pt; line-height:2; color:#1a1a1a;
         padding: 0; margin: 0 auto; max-width: 820px; text-align: justify; }
  .page { padding: 12px 4px; }
</style></head><body><div class="page">${headerHtml}<hr style="border:none;border-top:1px solid #d8d8d8;margin:8px 0 16px;" />${bodyHtml}${signatureHtml}</div></body></html>`;
}