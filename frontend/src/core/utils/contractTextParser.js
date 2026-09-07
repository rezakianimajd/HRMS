/**
 * Parse the raw contract text (as rendered by contract_engine.render_contract)
 * into structured blocks so a professional PDF/print layout can be produced:
 *
 *   { header: 'قرارداد کار مدت معین' }  → centered + bold title
 *   { article: 'ماده ۱- ...' }           → bold article line
 *   { body: '...' }                     → normal justified 10px text
 *
 * This lets us apply typographic design (Vazirmatn, 10px font) without
 * relying on a heavyweight DOM-to-PDF dependency.
 */

const ARTICLE_RE = /^\s*(ماده\s*\d+)\s*-?\s*(.*)$/;

export function parseContractText(raw) {
  if (!raw) return [];
  const lines = String(raw).split('\n');
  const blocks = [];
  let pendingBody = [];

  const flushBody = () => {
    if (pendingBody.length) {
      blocks.push({ type: 'body', text: pendingBody.join('\n').trim() });
      pendingBody = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Main title "قرارداد کار مدت معین" → header
    if (line.includes('قرارداد کار مدت معین')) {
      flushBody();
      blocks.push({ type: 'header', text: line });
      continue;
    }

    const m = line.match(ARTICLE_RE);
    if (m) {
      flushBody();
      blocks.push({ type: 'article', title: m[1], subtitle: m[2] });
      continue;
    }

    // Signature line at bottom
    if (line.includes('نام و نام خانوادگی کارپذیر') || line.includes('مدیرعامل')) {
      flushBody();
      blocks.push({ type: 'signature', text: line });
      continue;
    }

    pendingBody.push(line);
  }
  flushBody();

  return blocks;
}