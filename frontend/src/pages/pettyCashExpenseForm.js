/** ابزارهای خالص فرم «صورت ریز هزینهٔ تنخواه» (قابل تست بدون UI). */
import { toPersianDigits } from '../core/utils/numberUtils';

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'نقد' },
  { value: 'card', label: 'کارت' },
  { value: 'bank_transfer', label: 'انتقال بانکی' },
  { value: 'cheque', label: 'چک' },
  { value: 'other', label: 'سایر' },
];

export const today = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

export const emptyLine = () => ({
  account: '', aux1: '', aux2: '', aux3: '',
  invoice_number: '', expense_date: today(), supplier: '', desc: '',
  debit: '', vat_amount: '', tax_amount: '', attachment: null,
});

export const hasLineData = (line) => Boolean(
  line.account || line.debit || line.desc || line.invoice_number || line.supplier || line.attachment
);

export const lineIssues = (line) => {
  const issues = [];
  if (!line.account) issues.push({ text: 'کد معین انتخاب نشده است', hard: true });
  if (!(Number(line.debit) > 0)) issues.push({ text: 'مبلغ ردیف صفر است', hard: true });
  if (!line.invoice_number) issues.push({ text: 'شماره فاکتور خالی است', hard: false });
  if (!line.attachment) issues.push({ text: 'پیوست فاکتور/رسید ندارد', hard: false });
  return issues;
};

export const fillLines = (lines) => lines.filter(hasLineData);

export const totalsOf = (lines) => {
  const filled = fillLines(lines);
  const gross = filled.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const vat = filled.reduce((sum, line) => sum + (Number(line.vat_amount) || 0), 0);
  const tax = filled.reduce((sum, line) => sum + (Number(line.tax_amount) || 0), 0);
  return {
    count: filled.length,
    gross,
    vat,
    tax,
    net: Math.max(gross - vat - tax, 0),
  };
};

export const faSep = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const negative = raw.startsWith('-');
  const [integer, decimal] = raw.replace('-', '').split('.');
  const withSep = (integer || '').replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return `${negative ? '-' : ''}${toPersianDigits(withSep)}${decimal ? `٫${toPersianDigits(decimal)}` : ''}`;
};

/**
 * ساخت FormData سازگار با DRF.
 *
 * DRF برای لیست‌های تودرتو در multipart فقط قالب HTML را می‌شناسد:
 * ``lines[0]account`` — نه ``lines[0].account``. همین تفاوت باعث می‌شد
 * سطرها هنگام ذخیره نادیده گرفته شوند.
 */
export const buildStatementFormData = ({ header, lines }) => {
  const form = new FormData();
  form.append('fund', header.fund || '');
  form.append('date', header.date || '');
  form.append('description', header.description || '');
  form.append('payment_method', header.payment_method || 'cash');
  if (header.project) form.append('project', header.project);
  if (header.cost_center) form.append('cost_center', header.cost_center);

  const rows = fillLines(lines);
  rows.forEach((line, index) => {
    const gross = Number(line.debit) || 0;
    const vat = Number(line.vat_amount) || 0;
    const tax = Number(line.tax_amount) || 0;
    form.append(`lines[${index}]account`, line.account || '');
    form.append(`lines[${index}]auxiliary_1`, line.aux1 || '');
    form.append(`lines[${index}]auxiliary_2`, line.aux2 || '');
    form.append(`lines[${index}]auxiliary_3`, line.aux3 || '');
    form.append(`lines[${index}]invoice_number`, line.invoice_number || '');
    form.append(`lines[${index}]supplier`, line.supplier || '');
    form.append(`lines[${index}]expense_date`, line.expense_date || header.date || '');
    form.append(`lines[${index}]description`, line.desc || '');
    form.append(`lines[${index}]debit`, String(gross));
    form.append(`lines[${index}]vat_amount`, String(vat));
    form.append(`lines[${index}]tax_amount`, String(tax));
    form.append(`lines[${index}]net_amount`, String(Math.max(gross - vat - tax, 0)));
    if (line.attachment) form.append(`lines[${index}]attachment`, line.attachment);
  });
  return form;
};
