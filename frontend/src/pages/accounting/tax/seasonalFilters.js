/**
 * مدل «فیلتر پیشرفته» برای صورت معاملات فصلی — توابع خالص (بدون React).
 *
 * ساختار درخت شرط با بک‌اند (`accounting.seasonal_reconcile`) یکی است:
 *
 *   { op: 'and' | 'or', items: [ { field, operator, value, value2 } | { op, items } ] }
 *
 * همان درخت هم برای فیلتر جدول در مرورگر و هم برای گزارش تحلیلی/پیوت/خروجی
 * سرور استفاده می‌شود تا نتیجهٔ نمایش و خروجی همیشه یکی باشد.
 */
import { formatPersianNumber, toEnglishDigits, toPersianDigits } from '../../../core/utils/numberUtils';
import { getJalaliParts } from '../../../core/utils/dateUtils';

export const PERSON_TYPE_LABELS = {
  legal: 'حقوقی',
  natural: 'حقیقی',
  foreign: 'خارجی',
  aggregate: 'تجمیعی',
};

export const STATUS_LABELS = { registered: 'درج‌شده', pending: 'درج‌نشده' };

export const FILTER_FIELDS = [
  { key: 'name', label: 'نام طرف معامله', type: 'text' },
  { key: 'national_id', label: 'شناسه / کد ملی', type: 'text' },
  { key: 'invoice_no', label: 'شمارهٔ فاکتور', type: 'text' },
  { key: 'invoice_date', label: 'تاریخ فاکتور', type: 'date' },
  { key: 'amount', label: 'مبلغ', type: 'money' },
  { key: 'vat', label: 'مالیات بر ارزش افزوده', type: 'money' },
  { key: 'vat_ratio', label: 'نسبت مالیات به مبلغ', type: 'ratio' },
  { key: 'kind', label: 'نوع معامله', type: 'kind' },
  { key: 'person_type', label: 'نوع طرف معامله', type: 'person' },
  { key: 'moadian_status', label: 'وضعیت سامانه مودیان', type: 'status' },
  { key: 'postal_code', label: 'کد پستی', type: 'text' },
  { key: 'city', label: 'شهر', type: 'text' },
  { key: 'province', label: 'استان', type: 'text' },
  { key: 'country', label: 'کشور', type: 'text' },
  { key: 'address', label: 'آدرس', type: 'text' },
  { key: 'description', label: 'شرح کالا / خدمات', type: 'text' },
  { key: 'aggregate', label: 'ردیف تجمیعی', type: 'bool' },
  { key: 'duplicate', label: 'شمارهٔ فاکتور تکراری', type: 'bool' },
];

export const FIELD_MAP = FILTER_FIELDS.reduce((acc, field) => ({ ...acc, [field.key]: field }), {});

export const OPERATOR_LABELS = {
  eq: 'برابر باشد با',
  ne: 'برابر نباشد با',
  contains: 'شامل باشد',
  starts_with: 'شروع شود با',
  in: 'یکی از',
  between: 'بین',
  gt: 'بزرگ‌تر از',
  gte: 'بزرگ‌تر یا مساوی',
  lt: 'کوچک‌تر از',
  lte: 'کوچک‌تر یا مساوی',
  empty: 'خالی باشد',
  not_empty: 'خالی نباشد',
  is_true: 'بله',
  is_false: 'خیر',
};

const TEXT_OPERATORS = ['contains', 'eq', 'ne', 'starts_with', 'in', 'empty', 'not_empty'];
const CHOICE_OPERATORS = ['eq', 'ne', 'in', 'empty', 'not_empty'];
const NUMBER_OPERATORS = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'between', 'empty', 'not_empty'];
const DATE_OPERATORS = ['eq', 'gt', 'gte', 'lt', 'lte', 'between', 'empty', 'not_empty'];
const BOOL_OPERATORS = ['is_true', 'is_false'];
const NO_VALUE_OPERATORS = ['empty', 'not_empty', 'is_true', 'is_false'];
const SEARCH_FIELDS = ['name', 'national_id', 'invoice_no', 'city', 'address', 'description'];
const KINDS = [1, 2, 3, 4, 5];

export const operatorsFor = (fieldKey) => {
  const type = FIELD_MAP[fieldKey]?.type || 'text';
  if (type === 'bool') return BOOL_OPERATORS;
  if (type === 'money' || type === 'ratio') return NUMBER_OPERATORS;
  if (type === 'date') return DATE_OPERATORS;
  if (type === 'kind' || type === 'person' || type === 'status') return CHOICE_OPERATORS;
  return TEXT_OPERATORS;
};

export const fieldChoices = (fieldKey) => {
  const type = FIELD_MAP[fieldKey]?.type;
  if (type === 'kind') {
    return KINDS.map((kind) => ({ value: String(kind), label: `نوع ${toPersianDigits(kind)}` }));
  }
  if (type === 'person') {
    return Object.entries(PERSON_TYPE_LABELS).map(([value, label]) => ({ value, label }));
  }
  if (type === 'status') {
    return Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));
  }
  return [];
};

export const needsValue = (operator) => !NO_VALUE_OPERATORS.includes(operator);

export const emptyExpression = () => ({ op: 'and', items: [] });

export const defaultCondition = (fieldKey = 'name') => {
  const operator = operatorsFor(fieldKey)[0];
  const choices = fieldChoices(fieldKey);
  return {
    field: fieldKey,
    operator,
    value: choices.length ? choices[0].value : '',
    value2: '',
  };
};
const cloneExpression = (expression) => ({
  op: expression.op === 'or' ? 'or' : 'and',
  items: (expression.items || []).map((item) => (
    item && Array.isArray(item.items)
      ? { op: item.op === 'or' ? 'or' : 'and', items: item.items.map((condition) => ({ ...condition })) }
      : { ...item }
  )),
});

const targetGroup = (expression, groupIndex) => (
  groupIndex == null || groupIndex < 0 ? expression : expression.items[groupIndex]
);

export const addCondition = (expression, groupIndex = -1) => {
  const next = cloneExpression(expression);
  const group = targetGroup(next, groupIndex);
  if (!group || !Array.isArray(group.items)) return next;
  group.items.push(defaultCondition('name'));
  return next;
};

export const addGroup = (expression) => {
  const next = cloneExpression(expression);
  next.items.push({ op: next.op === 'and' ? 'or' : 'and', items: [defaultCondition('amount')] });
  return next;
};

export const removeItem = (expression, groupIndex, index) => {
  const next = cloneExpression(expression);
  const group = targetGroup(next, groupIndex);
  if (!group || !Array.isArray(group.items)) return next;
  group.items.splice(index, 1);
  return next;
};

export const updateCondition = (expression, groupIndex, index, patch) => {
  const next = cloneExpression(expression);
  const group = targetGroup(next, groupIndex);
  if (!group || !Array.isArray(group.items) || !group.items[index]) return next;
  const current = group.items[index];
  const merged = { ...current, ...patch };
  if (patch.field && patch.field !== current.field) {
    merged.operator = operatorsFor(patch.field)[0];
    const choices = fieldChoices(patch.field);
    merged.value = choices.length ? choices[0].value : '';
    merged.value2 = '';
  }
  if (patch.operator) {
    if (['is_true', 'is_false'].includes(patch.operator)) merged.value = '';
    if (patch.operator !== 'between') merged.value2 = '';
  }
  group.items[index] = merged;
  return next;
};

export const setGroupOp = (expression, groupIndex, op) => {
  const next = cloneExpression(expression);
  const group = targetGroup(next, groupIndex);
  if (group) group.op = op === 'or' ? 'or' : 'and';
  return next;
};

export const countConditions = (expression) => {
  if (!expression || !Array.isArray(expression.items)) return 0;
  return expression.items.reduce((total, item) => (
    item && Array.isArray(item.items) ? total + countConditions(item) : total + 1
  ), 0);
};
const cleanText = (value) => String(value ?? '')
  .replace(/ي/g, 'ی')
  .replace(/ك/g, 'ک')
  .replace(/\u200c/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = toEnglishDigits(String(value)).replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** تاریخ (شمسی یا میلادی) → عدد قابل مقایسهٔ شمسی برای فیلتر بازه‌ای. */
const DATE_KEY_CACHE = new Map();
export const dateKey = (value) => {
  const text = toEnglishDigits(String(value ?? '').trim());
  if (!text) return null;
  if (DATE_KEY_CACHE.has(text)) return DATE_KEY_CACHE.get(text);
  const match = text.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/)
    || text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (!match) return null;
  const groups = match.slice(1).map(Number);
  const [year, month, day] = groups[0] > 1200 ? groups : [groups[2], groups[0], groups[1]];
  if (!year || !month || !day) return null;
  let key = year * 10000 + month * 100 + day;
  if (year > 1700) {
    /* مقدار میلادی (مثل خروجی تقویم شمسی صفحه) → کلید شمسی */
    const parts = getJalaliParts(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    key = parts && parts.length === 3 ? parts[0] * 10000 + parts[1] * 100 + parts[2] : null;
  }
  DATE_KEY_CACHE.set(text, key);
  return key;
};

const normalizeInvoiceKey = (value) => {
  const text = cleanText(value).replace(/[^0-9A-Za-z\u0600-\u06ff]/g, '');
  if (!text) return '';
  if (/^\d+$/.test(text)) return text.replace(/^0+/, '');
  return text.toLowerCase();
};

export const duplicateInvoiceKeys = (rows) => {
  const buckets = new Map();
  (rows || []).forEach((row) => {
    const key = normalizeInvoiceKey(row?.invoiceNo);
    if (!key) return;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  });
  return new Set([...buckets.entries()].filter(([, count]) => count > 1).map(([key]) => key));
};

export const rowValue = (row, field, context = {}) => {
  if (!row) return '';
  switch (field) {
    case 'kind': return Number(row.kind || 1);
    case 'person_type': return row.personType || '';
    case 'moadian_status': return row.status || 'pending';
    case 'invoice_date': return dateKey(row.invoiceDate);
    case 'amount': return toNumber(row.amount);
    case 'vat': return toNumber(row.vat);
    case 'vat_ratio': {
      const amount = toNumber(row.amount);
      return amount ? toNumber(row.vat) / amount : 0;
    }
    case 'aggregate': return (row.personType || '') === 'aggregate';
    case 'duplicate': return (context.duplicates || new Set()).has(normalizeInvoiceKey(row.invoiceNo));
    case 'description': return cleanText(row.description);
    case 'address': return cleanText(row.address);
    case 'name': return cleanText(row.name || [row.firstName, row.lastName].filter(Boolean).join(' '));
    case 'national_id': return cleanText(row.nationalId);
    case 'invoice_no': return cleanText(row.invoiceNo);
    case 'postal_code': return cleanText(row.postalCode);
    case 'city': return cleanText(row.city);
    case 'province': return cleanText(row.province);
    case 'country': return cleanText(row.country);
    default: return cleanText(row[field]);
  }
};

const asList = (value) => {
  if (Array.isArray(value)) return value.map((item) => cleanText(item)).filter(Boolean);
  return cleanText(value).split(/[،,;]/).map((item) => item.trim()).filter(Boolean);
};
const matchCondition = (actual, condition) => {
  const { operator, field } = condition;
  const value = condition.value;
  const value2 = condition.value2;

  if (operator === 'empty') return !actual && actual !== 0;
  if (operator === 'not_empty') return Boolean(actual) || actual === 0;
  if (operator === 'is_true') return Boolean(actual);
  if (operator === 'is_false') return !actual;

  const type = FIELD_MAP[field]?.type;
  if (type === 'money' || type === 'ratio' || type === 'kind') {
    const left = toNumber(actual);
    const right = toNumber(value);
    if (operator === 'between') return toNumber(value) <= left && left <= toNumber(value2);
    if (operator === 'eq') return left === right;
    if (operator === 'ne') return left !== right;
    if (operator === 'gt') return left > right;
    if (operator === 'gte') return left >= right;
    if (operator === 'lt') return left < right;
    if (operator === 'lte') return left <= right;
    if (operator === 'in') return asList(value).some((item) => toNumber(item) === left);
    return false;
  }

  if (type === 'date') {
    const left = actual == null ? null : Number(actual);
    const right = dateKey(value);
    if (operator === 'between') {
      const other = dateKey(value2);
      return left != null && right != null && other != null && right <= left && left <= other;
    }
    if (left == null || right == null) return false;
    if (operator === 'eq') return left === right;
    if (operator === 'ne') return left !== right;
    if (operator === 'gt') return left > right;
    if (operator === 'gte') return left >= right;
    if (operator === 'lt') return left < right;
    if (operator === 'lte') return left <= right;
    return false;
  }

  const text = cleanText(actual).toLowerCase();
  const needle = cleanText(value).toLowerCase();
  if (operator === 'contains') return Boolean(needle) && text.includes(needle);
  if (operator === 'starts_with') return Boolean(needle) && text.startsWith(needle);
  if (operator === 'in') return asList(value).some((item) => item.toLowerCase() === text);
  if (operator === 'between') return needle <= text && text <= cleanText(value2).toLowerCase();
  if (operator === 'eq') return text === needle;
  if (operator === 'ne') return text !== needle;
  return false;
};

const matchGroup = (group, row, context) => {
  const items = (group.items || []).filter(Boolean);
  if (!items.length) return true;
  const results = items.map((item) => (
    Array.isArray(item.items)
      ? matchGroup(item, row, context)
      : matchCondition(rowValue(row, item.field, context), item)
  ));
  return group.op === 'or' ? results.some(Boolean) : results.every(Boolean);
};
/** پاک‌سازی/اعتبارسنجی درخت شرط — آینهٔ `seasonal_reconcile.normalize_expression`. */
export const normalizeExpression = (expression) => {
  if (!expression || typeof expression !== 'object') return emptyExpression();
  const rawOp = String(expression.op || 'and').toLowerCase();
  const op = rawOp === 'or' || rawOp === 'any' ? 'or' : 'and';
  const rawItems = Array.isArray(expression.items) ? expression.items : [];
  const items = [];
  const missing = (value) => value === '' || value === undefined || value === null;
  rawItems.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    if (Array.isArray(item.items)) {
      const child = normalizeExpression(item);
      if (child.items.length) items.push(child);
      return;
    }
    const field = String(item.field || '').trim();
    const operator = String(item.operator || 'eq').trim().toLowerCase();
    if (!FIELD_MAP[field] || !operatorsFor(field).includes(operator)) return;
    const rawValue = typeof item.value === 'string' ? item.value.trim() : item.value;
    const rawValue2 = typeof item.value2 === 'string' ? item.value2.trim() : item.value2;
    if (!needsValue(operator)) {
      items.push({ field, operator, value: '', value2: '' });
      return;
    }
    if (operator === 'between') {
      if (missing(rawValue) || missing(rawValue2)) return;
      items.push({ field, operator, value: rawValue, value2: rawValue2 });
      return;
    }
    if (missing(rawValue)) return;
    items.push({ field, operator, value: rawValue, value2: '' });
  });
  return { op, items };
};

/** اعمال درخت شرط روی ردیف‌های رابط کاربری. */
export const evaluateExpression = (rows, expression, options = {}) => {
  const normalized = normalizeExpression(expression);
  const list = rows || [];
  if (!normalized.items.length) return [...list];
  const context = { duplicates: options.duplicates || duplicateInvoiceKeys(list) };
  return list.filter((row) => matchGroup(normalized, row, context));
};

export const combineExpressions = (...expressions) => {
  const items = [];
  expressions.forEach((expression) => {
    normalizeExpression(expression).items.forEach((item) => items.push(item));
  });
  return { op: 'and', items };
};

/** فیلترهای سریع نوار ابزار (نوع/وضعیت/جستجو) → درخت شرط. */
export const expressionFromSimple = ({ kind, status, personType, search } = {}) => {
  const items = [];
  if (kind !== undefined && kind !== null && kind !== '' && kind !== 'all') {
    items.push({ field: 'kind', operator: 'eq', value: String(kind), value2: '' });
  }
  if (status && status !== 'all') {
    items.push({ field: 'moadian_status', operator: 'eq', value: status, value2: '' });
  }
  if (personType && personType !== 'all') {
    items.push({ field: 'person_type', operator: 'eq', value: personType, value2: '' });
  }
  const term = cleanText(search);
  if (term) {
    items.push({
      op: 'or',
      items: SEARCH_FIELDS.map((field) => ({ field, operator: 'contains', value: term, value2: '' })),
    });
  }
  return { op: 'and', items };
};
const formatValue = (field, value) => {
  const type = FIELD_MAP[field]?.type;
  if (type === 'person') return PERSON_TYPE_LABELS[value] || value;
  if (type === 'status') return STATUS_LABELS[value] || value;
  if (type === 'kind') return `نوع ${toPersianDigits(value)}`;
  if (type === 'money' || type === 'ratio') return formatPersianNumber(toNumber(value));
  return String(value ?? '');
};

/** متن فارسی خوانا از درخت شرط (هم‌سو با `describe_expression` سرور). */
export const describeExpression = (expression) => {
  const normalized = normalizeExpression(expression);
  if (!normalized.items.length) return 'بدون فیلتر';
  const parts = normalized.items.map((item) => {
    if (Array.isArray(item.items)) {
      const inner = describeExpression(item);
      return inner === 'بدون فیلتر' ? '' : `(${inner})`;
    }
    const label = FIELD_MAP[item.field]?.label || item.field;
    const operator = OPERATOR_LABELS[item.operator] || item.operator;
    if (!needsValue(item.operator)) return `${label} ${operator}`;
    if (item.operator === 'between') {
      return `${label} ${operator} ${formatValue(item.field, item.value)} و ${formatValue(item.field, item.value2)}`;
    }
    if (item.operator === 'in') {
      const list = asList(item.value).map((value) => formatValue(item.field, value)).join('، ');
      return `${label} ${operator} ${list}`;
    }
    return `${label} ${operator} ${formatValue(item.field, item.value)}`;
  }).filter(Boolean);
  if (!parts.length) return 'بدون فیلتر';
  return parts.join(normalized.op === 'or' ? ' یا ' : ' و ');
};

/** شرط‌های آمادهٔ یک‌کلیکی. */
export const FILTER_PRESETS = [
  {
    key: 'big',
    label: 'خریدهای بالای ۱۰۰ میلیون',
    build: () => ({ op: 'and', items: [{ field: 'amount', operator: 'gte', value: '100000000', value2: '' }] }),
  },
  {
    key: 'pending',
    label: 'درج‌نشده در سامانه',
    build: () => ({ op: 'and', items: [{ field: 'moadian_status', operator: 'eq', value: 'pending', value2: '' }] }),
  },
  {
    key: 'no_invoice',
    label: 'بدون شمارهٔ فاکتور',
    build: () => ({ op: 'and', items: [{ field: 'invoice_no', operator: 'empty', value: '', value2: '' }] }),
  },
  {
    key: 'duplicate',
    label: 'فاکتورهای تکراری',
    build: () => ({ op: 'and', items: [{ field: 'duplicate', operator: 'is_true', value: '', value2: '' }] }),
  },
  {
    key: 'foreign',
    label: 'طرف خارجی',
    build: () => ({ op: 'and', items: [{ field: 'person_type', operator: 'eq', value: 'foreign', value2: '' }] }),
  },
  {
    key: 'no_desc',
    label: 'بدون شرح کالا',
    build: () => ({ op: 'and', items: [{ field: 'description', operator: 'empty', value: '', value2: '' }] }),
  },
];





