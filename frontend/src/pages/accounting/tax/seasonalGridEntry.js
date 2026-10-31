import { toEnglishDigits } from '../../../core/utils/numberUtils';
import { toGregorian } from '../../../core/utils/dateUtils';

/* فیلدهای گرید به ترتیب ستون‌ها (برای چسباندن بدون سرسطر) */
export const GRID_FIELDS = [
  'name', 'firstName', 'lastName', 'personType', 'nationalId', 'postalCode', 'country',
  'city', 'address', 'description', 'amount', 'vat', 'kind', 'invoiceDate', 'invoiceNo', 'status',
];

export const FIELD_LABELS = {
  name: 'نام شرکت / عنوان',
  firstName: 'نام',
  lastName: 'نام خانوادگی',
  personType: 'نوع فروشنده',
  nationalId: 'شناسه ملی / کد ملی',
  postalCode: 'کد پستی',
  country: 'کشور',
  city: 'شهر',
  address: 'آدرس',
  description: 'شرح کالا / خدمات',
  amount: 'مبلغ',
  vat: 'مالیات بر ارزش افزوده',
  kind: 'نوع معامله',
  invoiceDate: 'تاریخ فاکتور',
  invoiceNo: 'شماره فاکتور',
  status: 'وضعیت سامانه مودیان',
};

/* مترادف‌های شناسایی سرسطر هنگام چسباندن از اکسل */
const ALIASES = {
  name: ['نام شرکت', 'عنوان', 'نام شرکت / عنوان', 'نام و نام خانوادگی', 'طرف حساب', 'نام طرف', 'فروشنده'],
  firstName: ['نام'],
  lastName: ['نام خانوادگی', 'فامیل'],
  personType: ['نوع فروشنده', 'نوع طرف', 'نوع شخص'],
  nationalId: ['شناسه ملی', 'کد ملی', 'شناسه/کد ملی', 'شناسه ملی / کد ملی', 'کد اقتصادی', 'شماره اقتصادی'],
  postalCode: ['کد پستی'],
  country: ['کشور'],
  city: ['شهر'],
  address: ['آدرس', 'نشانی'],
  description: ['شرح کالا', 'شرح کالا / خدمات', 'شرح', 'توضیحات'],
  amount: ['مبلغ', 'مبلغ خرید', 'مبلغ خرید (ریال)', 'بدهکار'],
  vat: ['مالیات', 'ارزش افزوده', 'مالیات بر ارزش افزوده'],
  kind: ['نوع', 'نوع معامله'],
  invoiceDate: ['تاریخ فاکتور', 'تاریخ', 'تاریخ سند'],
  invoiceNo: ['شماره فاکتور', 'شماره', 'شماره سند', 'فاکتور'],
  status: ['وضعیت', 'وضعیت سامانه مودیان', 'مودیان'],
};

const normalizeHeader = (value) => toEnglishDigits(String(value ?? ''))
  .replace(/[\u200c\u200f\u200e]/g, ' ')
  .replace(/[ي]/g, 'ی').replace(/[ك]/g, 'ک')
  .replace(/[*:()]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/* تشخیص فیلد از روی عنوان ستون */
export const matchField = (header) => {
  const title = normalizeHeader(header);
  if (!title) return null;
  for (const [field, aliases] of Object.entries(ALIASES)) {
    if (aliases.some((alias) => normalizeHeader(alias) === title)) return field;
  }
  for (const [field, aliases] of Object.entries(ALIASES)) {
    if (aliases.some((alias) => title.startsWith(normalizeHeader(alias))
      || title.includes(normalizeHeader(alias)))) {
      return field;
    }
  }
  return null;
};

/* جدا کردن سطر با پشتیبانی از نقل‌قول (سلول چندخطی) */
const splitLine = (line, delimiter) => {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
};

/* متن چسبانده‌شده (TSV/CSV) → ماتریس رشته‌ها + تشخیص سرسطر */
export const parseClipboardMatrix = (text) => {
  const raw = String(text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!raw.trim()) return { matrix: [], hasHeader: false, delimiter: '\t' };
  const lines = raw.split('\n').filter((line) => line.trim() !== '');
  const delimiter = lines.some((line) => line.includes('\t')) ? '\t'
    : (lines.some((line) => line.includes(';')) ? ';' : ',');
  const matrix = lines.map((line) => splitLine(line, delimiter));
  const firstRow = matrix[0] || [];
  const matches = firstRow.filter((cell) => matchField(cell)).length;
  const hasHeader = matches >= Math.min(2, firstRow.length)
    && firstRow.some((cell) => !/^[\d\s.,/-]+$/.test(String(cell)));
  return { matrix, hasHeader, delimiter };
};

/* نگاشت ستون‌ها: از سرسطر، وگرنه بر اساس ترتیب ستون‌های گرید */
export const detectMapping = (matrix, hasHeader) => {
  const width = Math.max(0, ...matrix.map((row) => row.length));
  const header = hasHeader ? (matrix[0] || []) : [];
  const mapping = [];
  for (let index = 0; index < width; index += 1) {
    const mapped = hasHeader ? matchField(header[index]) : null;
    mapping.push(mapped || (hasHeader ? null : (GRID_FIELDS[index] || null)));
  }
  return mapping;
};

const TYPE_MAP = {
  حقوقی: 'legal', حقیقی: 'natural', خارجی: 'foreign', تجمیعی: 'aggregate',
  legal: 'legal', natural: 'natural', foreign: 'foreign', aggregate: 'aggregate',
};

const STATUS_REGISTERED = /(درج\s*شده|ثبت\s*شده|registered|بله|yes)/i;

const parseAmountCell = (value) => {
  const text = toEnglishDigits(String(value ?? '')).replace(/[^\d.-]/g, '');
  return text ? String(Number(text) || 0) : '';
};

const parseDateCell = (value) => {
  const text = toEnglishDigits(String(value ?? '')).trim();
  if (!text) return { value: '', warning: '' };
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return { value: text, warning: '' };
  const jalali = text.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/);
  if (jalali) {
    const gregorian = toGregorian(`${jalali[1]}/${String(jalali[2]).padStart(2, '0')}/${String(jalali[3]).padStart(2, '0')}`);
    if (/^\d{4}-\d{2}-\d{2}$/.test(gregorian)) return { value: gregorian, warning: '' };
  }
  return { value: '', warning: `تاریخ نامعتبر: «${text}»` };
};

/* ماتریس + نگاشت → ردیف‌های آمادهٔ گرید + هشدارها */
export const buildRowsFromMatrix = ({ matrix, hasHeader, mapping }, makeRow) => {
  const body = hasHeader ? matrix.slice(1) : matrix;
  const rows = [];
  const warnings = [];
  body.forEach((cells, rowIndex) => {
    if (!cells.some((cell) => String(cell ?? '').trim())) return;
    const row = { ...makeRow(), personType: '' };
    mapping.forEach((field, columnIndex) => {
      if (!field) return;
      const raw = cells[columnIndex];
      if (raw === undefined) return;
      switch (field) {
        case 'amount':
        case 'vat':
          row[field] = parseAmountCell(raw);
          break;
        case 'nationalId':
        case 'postalCode':
          row[field] = toEnglishDigits(String(raw ?? '')).replace(/\D/g, '');
          break;
        case 'kind': {
          const kind = Number(toEnglishDigits(String(raw ?? '')).replace(/\D/g, ''));
          row.kind = kind >= 1 && kind <= 5 ? kind : 1;
          break;
        }
        case 'invoiceDate': {
          const parsed = parseDateCell(raw);
          row.invoiceDate = parsed.value;
          if (parsed.warning) warnings.push(`ردیف ${rowIndex + 1}: ${parsed.warning}`);
          break;
        }
        case 'status':
          row.status = STATUS_REGISTERED.test(String(raw ?? '').trim()) ? 'registered' : 'pending';
          break;
        case 'personType': {
          const key = TYPE_MAP[String(raw ?? '').trim()]
            || TYPE_MAP[String(raw ?? '').trim().toLowerCase()];
          if (key) row.personType = key;
          break;
        }
        default:
          row[field] = String(raw ?? '').trim();
      }
    });
    if (!row.personType) row.personType = row.firstName || row.lastName ? 'natural' : 'legal';
    if (!row.amount && !row.name && !row.firstName && !row.lastName) {
      warnings.push(`ردیف ${rowIndex + 1}: نه نام دارد نه مبلغ؛ نادیده گرفته شد.`);
      return;
    }
    if (row.nationalId && ![10, 11].includes(row.nationalId.length)) {
      warnings.push(`ردیف ${rowIndex + 1}: طول شناسه/کد ملی ${row.nationalId.length} رقم است.`);
    }
    if (row.postalCode && row.postalCode.length !== 10) {
      warnings.push(`ردیف ${rowIndex + 1}: کد پستی باید ۱۰ رقم باشد (${row.postalCode.length} رقم).`);
    }
    rows.push(row);
  });
  return { rows, warnings };
};

/* ردیف‌های گرید → TSV برای کپی در اکسل */
export const rowsToTsv = (rows) => {
  const header = GRID_FIELDS.map((field) => FIELD_LABELS[field]).join('\t');
  const body = rows.map((row) => GRID_FIELDS.map((field) => {
    const value = row[field];
    if (field === 'kind') return String(value || 1);
    if (field === 'status') return value === 'registered' ? 'درج‌شده' : 'درج‌نشده';
    if (field === 'personType') {
      return { legal: 'حقوقی', natural: 'حقیقی', foreign: 'خارجی', aggregate: 'تجمیعی' }[value] || '';
    }
    return String(value ?? '');
  }).join('\t')).join('\n');
  return `${header}\n${body}`;
};


