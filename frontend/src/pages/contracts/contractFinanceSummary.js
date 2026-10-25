import { rateOfStatement } from './statementCurrency';
import { adjustmentSummaryOf, isAdjustmentKind } from './statementKinds';

const n = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const titleOf = (item) => String(item?.title || item?.description || '')
  .replace(/\u200c/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const sumItems = (items, predicate = () => true) => (Array.isArray(items) ? items : [])
  .filter((item) => predicate(titleOf(item)))
  .reduce((sum, item) => sum + n(item.amount), 0);

/**
 * تفکیک مالی یک صورت‌وضعیت. مبالغ ذخیره‌شده در دیتابیس ریالی‌اند و
 * معادل ارزی بر اساس نرخ همان دوره محاسبه می‌شود.
 */
export const statementFinanceOf = (row = {}, fallbackRate = 1) => {
  const rate = rateOfStatement(row, fallbackRate);
  const deductions = Array.isArray(row.deductions) ? row.deductions : [];
  const additions = Array.isArray(row.additions) ? row.additions : [];
  const retention = sumItems(deductions, (title) => title.includes('حسن'));
  const prepayment = sumItems(deductions, (title) => title.includes('پیش پرداخت') || title.includes('پیشپرداخت'));
  const insurance = sumItems(deductions, (title) => title.includes('بیمه'));
  const materials = sumItems(deductions, (title) => title.includes('مصالح'));
  const statementAdvance = sumItems(deductions, (title) => title.includes('علی الحساب') && title.includes('صورت وضعیت'));
  const otherAdvances = sumItems(
    deductions,
    (title) => title.includes('علی الحساب') && !title.includes('صورت وضعیت'),
  );
  const categorizedDeductions = retention + prepayment + insurance + materials + statementAdvance + otherAdvances;
  const deductionsTotal = Math.max(
    n(row.deductions_total),
    deductions.reduce((sum, item) => sum + n(item.amount), 0),
    categorizedDeductions,
  );
  const vatFromAdditions = sumItems(
    additions,
    (title) => title.includes('ارزش افزوده') || title.includes('مالیات'),
  );
  const vat = n(row.value_added_tax) || vatFromAdditions;
  const additionsTotal = Math.max(
    n(row.additions_total),
    additions.reduce((sum, item) => sum + n(item.amount), 0) + n(row.value_added_tax) + n(row.other_additions),
  );
  const otherAdditions = Math.max(0, additionsTotal - vat);
  const work = n(row.work_done) || Math.max(0, n(row.amount) - n(row.cumulative_previous_amount));
  const net = n(row.net_amount) || Math.max(0, work + additionsTotal - deductionsTotal);
  const otherDeductions = Math.max(0, deductionsTotal - categorizedDeductions);
  const isAdjustment = isAdjustmentKind(row);
  return {
    row,
    rate,
    hasForeign: rate > 1,
    isAdjustment,
    kind: row.kind || 'statement',
    amount: n(row.amount),
    previous: n(row.cumulative_previous_amount),
    work,
    additionsTotal,
    deductionsTotal,
    vat,
    retention,
    prepayment,
    insurance,
    materials,
    statementAdvance,
    otherAdvances,
    otherDeductions,
    otherAdditions,
    net,
    adjustmentWork: n(row.adjustment_work_done),
    adjustmentAmount: n(row.adjustment_amount),
    foreignAmount: row.foreign_amount != null ? n(row.foreign_amount) : (rate > 1 ? n(row.amount) / rate : n(row.amount)),
    foreignPrevious: row.foreign_previous_amount != null ? n(row.foreign_previous_amount) : (rate > 1 ? n(row.cumulative_previous_amount) / rate : n(row.cumulative_previous_amount)),
    foreignWork: row.foreign_work_done != null ? n(row.foreign_work_done) : (rate > 1 ? work / rate : work),
    adjustmentForeignWork: n(row.adjustment_foreign_work_done),
    adjustmentForeignAmount: n(row.adjustment_foreign_amount),
  };
};

const SUM_KEYS = [
  'amount', 'previous', 'work', 'additionsTotal', 'deductionsTotal', 'vat',
  'retention', 'prepayment', 'insurance', 'materials', 'statementAdvance',
  'otherAdvances', 'otherDeductions', 'otherAdditions', 'net',
];

export const summarizeStatementFinance = (statements = [], fallbackRate = 1) => {
  const items = (Array.isArray(statements) ? statements : [])
    .map((row) => statementFinanceOf(row, fallbackRate))
    .sort((a, b) => Number(a.row?.id || 0) - Number(b.row?.id || 0));
  const latest = items[items.length - 1] || null;
  const latestNormal = [...items].reverse().find((item) => !item.isAdjustment) || latest;
  const adjustments = adjustmentSummaryOf(statements);
  const rial = SUM_KEYS.reduce((totals, key) => ({
    ...totals,
    [key]: key === 'amount'
      ? (latestNormal?.amount || 0)
      : key === 'previous'
        ? (latestNormal?.previous || 0)
        : items.reduce((sum, item) => sum + item[key], 0),
  }), {});
  const foreign = SUM_KEYS.reduce((totals, key) => ({
    ...totals,
    [key]: key === 'amount'
      ? (latestNormal?.foreignAmount || 0)
      : key === 'previous'
        ? (latestNormal?.foreignPrevious || 0)
        : items.reduce((sum, item) => {
          if (key === 'work') return sum + item.foreignWork;
          return sum + (item.hasForeign ? item[key] / item.rate : item[key]);
        }, 0),
  }), {});
  return {
    items,
    count: items.length,
    normalCount: items.filter((item) => !item.isAdjustment).length,
    hasForeign: items.some((item) => item.hasForeign),
    adjustments,
    rial,
    foreign,
  };
};

export const contractRateOf = (contract, statements = []) => {
  const latestForeign = [...(Array.isArray(statements) ? statements : [])]
    .filter((row) => Number(row.exchange_rate) > 1)
    .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))[0];
  return rateOfStatement(
    latestForeign || {},
    contract?.exchange_rate || contract?.currency_exchange_rate || 1,
  );
};

export const dualMoney = (rialValue, rate, currency, formatter = (value) => String(value)) => {
  const rial = n(rialValue);
  const r = Number(rate) > 1 ? Number(rate) : 1;
  if (r > 1) {
    return {
      rial,
      foreign: rial / r,
      primary: `${formatter(rial / r)} ${currency}`,
      secondary: `${formatter(rial)} ریال`,
    };
  }
  return { rial, foreign: rial, primary: `${formatter(rial)} ریال`, secondary: '' };
};
