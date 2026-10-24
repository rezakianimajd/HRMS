/** ابزارهای خالصِ صفحهٔ بایگانی اسناد قرارداد. */
import { toPersianDigits } from '../../core/utils/numberUtils';

export const DOC_ACCENT = '#0f766e';

export const FILE_TYPE_META = {
  pdf: { key: 'pdf', label: 'PDF', color: '#be123c', iconKey: 'pdf' },
  image: { key: 'image', label: 'تصویر', color: '#0d9488', iconKey: 'image' },
  word: { key: 'word', label: 'Word', color: '#2563eb', iconKey: 'word' },
  excel: { key: 'excel', label: 'Excel', color: '#059669', iconKey: 'excel' },
  powerpoint: { key: 'powerpoint', label: 'PowerPoint', color: '#ea580c', iconKey: 'powerpoint' },
  archive: { key: 'archive', label: 'بستهٔ فشرده', color: '#7c3aed', iconKey: 'archive' },
  other: { key: 'other', label: 'فایل', color: '#64748b', iconKey: 'other' },
};

export const RELATION_META = {
  contract: { key: 'contract', label: 'مستندات قرارداد', color: DOC_ACCENT, iconKey: 'contract' },
  addendum: { key: 'addendum', label: 'الحاقیه', color: '#7c3aed', iconKey: 'addendum' },
  guarantee: { key: 'guarantee', label: 'تضمین', color: '#b45309', iconKey: 'guarantee' },
  statement: { key: 'statement', label: 'صورت‌وضعیت', color: '#2563eb', iconKey: 'statement' },
};

export const RELATION_ORDER = ['contract', 'addendum', 'guarantee', 'statement'];

export const fileExtension = (value) => {
  if (value && typeof value === 'object' && value.file_extension) {
    const explicit = String(value.file_extension).toLowerCase();
    return explicit.startsWith('.') ? explicit : `.${explicit}`;
  }
  const name = typeof value === 'string'
    ? value
    : (value?.file_name || value?.file_url || value?.file || value?.title || '');
  const match = String(name || '').match(/(\.[a-z0-9]{2,6})(?:$|\?)/i);
  return match ? match[1].toLowerCase() : '';
};

export const fileMeta = (value) => {
  const ext = fileExtension(value);
  if (ext === '.pdf') return FILE_TYPE_META.pdf;
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].includes(ext)) return FILE_TYPE_META.image;
  if (['.doc', '.docx', '.rtf', '.odt'].includes(ext)) return FILE_TYPE_META.word;
  if (['.xls', '.xlsx', '.csv', '.ods'].includes(ext)) return FILE_TYPE_META.excel;
  if (['.ppt', '.pptx'].includes(ext)) return FILE_TYPE_META.powerpoint;
  if (['.zip', '.rar', '.7z'].includes(ext)) return FILE_TYPE_META.archive;
  return FILE_TYPE_META.other;
};

export const relationKeyOf = (row = {}) => {
  const hasValue = (value) => value !== '' && value !== null && value !== undefined;
  if (hasValue(row.addendum) || hasValue(row.addendum_number)) return 'addendum';
  if (hasValue(row.guarantee) || hasValue(row.guarantee_number)) return 'guarantee';
  if (hasValue(row.statement) || hasValue(row.statement_number)) return 'statement';
  return 'contract';
};

export const relationMetaOf = (row = {}) => RELATION_META[relationKeyOf(row)] || RELATION_META.contract;

export const relationTargetLabel = (row = {}) => {
  const key = relationKeyOf(row);
  if (key === 'addendum') {
    return [row.addendum_number, row.addendum_subject].filter(Boolean).join(' — ') || 'الحاقیه';
  }
  if (key === 'guarantee') return row.guarantee_number || 'تضمین';
  if (key === 'statement') return row.statement_number ? `صورت‌وضعیت ${row.statement_number}` : 'صورت‌وضعیت';
  return 'مستندات عمومی قرارداد';
};

export const documentTitleForFile = (file, baseTitle = '', multiple = false) => {
  const stem = String(file?.name || 'سند')
    .replace(/\.[^.]+$/, '')
    .trim();
  const base = String(baseTitle || '').trim();
  if (!multiple) return (base || stem || 'سند قرارداد').slice(0, 200);
  return (base ? `${base} — ${stem || 'سند'}` : (stem || 'سند قرارداد')).slice(0, 200);
};

export const formatFileSize = (bytes) => {
  const size = Number(bytes) || 0;
  if (size <= 0) return '—';
  if (size < 1024) return `${toPersianDigits(size)} B`;
  if (size < 1024 * 1024) return `${toPersianDigits(Math.max(1, Math.round(size / 1024)))} KB`;
  return `${toPersianDigits((size / 1024 / 1024).toFixed(2))} MB`;
};

export const documentSearchText = (row = {}) => [
  row.title, row.file_name, row.contract_number, row.contract_subject,
  row.contract_party_name, row.addendum_number, row.addendum_subject,
  row.guarantee_number, row.statement_number,
].filter(Boolean).join(' ').toLowerCase();

export const matchesDocumentSearch = (row, query) => {
  const term = String(query || '').trim().toLowerCase();
  if (!term) return true;
  return documentSearchText(row).includes(term);
};

export const countByRelation = (documents = []) => {
  const counts = { all: documents.length, contract: 0, addendum: 0, guarantee: 0, statement: 0 };
  documents.forEach((row) => {
    const key = relationKeyOf(row);
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
};

export const countByFileType = (documents = []) => documents.reduce((counts, row) => {
  const key = fileMeta(row).key;
  counts[key] = (counts[key] || 0) + 1;
  return counts;
}, {});

export const relationOptionLabel = (type, item = {}) => {
  if (type === 'addendum') return [item.number, item.subject].filter(Boolean).join(' — ') || 'الحاقیه';
  if (type === 'guarantee') {
    return [item.number || item.guarantee_number || item.check_number, item.guarantee_type_display]
      .filter(Boolean).join(' — ') || 'تضمین';
  }
  if (type === 'statement') return item.number ? `صورت‌وضعیت ${item.number}` : 'صورت‌وضعیت';
  return item.subject || item.number || 'قرارداد';
};
