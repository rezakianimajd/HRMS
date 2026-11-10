/**
 * زنجیرهٔ دوره‌ای صورت‌وضعیت‌ها — آینهٔ `contracts/statement_chain.py` در بک‌اند.
 *
 * قاعده: اگر همهٔ اسناد قرارداد (به‌همراه سند جاری) شمارهٔ عددی یکتا داشته باشند،
 * «دورهٔ قبل» بر اساس شماره تعیین می‌شود؛ پس سند شمارهٔ ۱ بعد از سند شمارهٔ ۱۴
 * «دورهٔ قبل» ندارد و مبلغ تجمعی‌اش با مبلغ سند ۱۴ مقایسه نمی‌شود. در غیر این
 * صورت ترتیب ثبت (شناسه) مثل قبل ملاک است.
 */
import { rowMetrics } from './StatementWorkspaceUI';
import { rateOfStatement } from './statementCurrency';
import { isAdjustmentKind, isMultiKind } from './statementKinds';

const num = (value) => Math.max(0, Number(value) || 0);

/** شمارهٔ عددی سند؛ اگر شماره عددی نباشد null. */
export const statementNumberValue = (value) => {
  const text = String(value ?? '').trim();
  return /^\d+$/.test(text) ? Number(text) : null;
};

/** اسناد «دورهٔ قبل» نسبت به سند جاری (صعودی). */
export const previousPeriodRows = (rows, { excludeId = null, number = null } = {}) => {
  const list = (Array.isArray(rows) ? rows : [])
    .filter((row) => String(row?.id || '') !== String(excludeId || ''));
  const numbers = list.map((row) => statementNumberValue(row?.number));
  const currentNumber = statementNumberValue(number);
  const numberMode = currentNumber != null
    && numbers.every((value) => value != null)
    && new Set([...numbers, currentNumber]).size === numbers.length + 1;
  const byId = (a, b) => Number(a?.id || 0) - Number(b?.id || 0);
  if (numberMode) {
    return list
      .filter((row) => statementNumberValue(row?.number) < currentNumber)
      .sort((a, b) => (
        (statementNumberValue(a?.number) - statementNumberValue(b?.number)) || byId(a, b)
      ));
  }
  if (!excludeId) return [...list].sort(byId);
  return list
    .filter((row) => Number(row?.id || 0) < Number(excludeId))
    .sort(byId);
};

/** مبنای «مبلغ تجمعی دوره قبل» در فرم. */
export const previousCumulativeFor = (rows, { excludeId = null, number = null } = {}) => {
  const chain = (Array.isArray(rows) ? rows : []).filter((row) => !isAdjustmentKind(row));
  const prior = previousPeriodRows(chain, { excludeId, number });
  if (!prior.length) return null;
  const last = prior[prior.length - 1];
  return Math.max(
    num(last?.amount),
    prior.reduce((sum, row) => sum + rowMetrics(row).work, 0),
  );
};

/** تجمع ارزی دوره‌های قبل؛ کارکرد هر دوره با نرخ تاریخی خودش. */
export const foreignCumulativeFor = (rows, { beforeId = null, number = null } = {}) => (
  previousPeriodRows(
    (Array.isArray(rows) ? rows : []).filter((row) => !isAdjustmentKind(row)),
    { excludeId: beforeId, number },
  )
    .reduce((sum, row) => {
      const rate = rateOfStatement(row, 1);
      const work = num(row.work_done) || rowMetrics(row).work;
      return sum + (rate > 1 ? work / rate : work);
    }, 0)
);

/** تجمع تعدیل‌های ریالی (علامت‌دار) تا پیش از سند جاری. */
export const adjustmentCumulativeFor = (rows, { excludeId = null, number = null } = {}) => (
  previousPeriodRows(
    (Array.isArray(rows) ? rows : []).filter(isAdjustmentKind),
    { excludeId, number },
  )
    .reduce((sum, row) => sum + num(row.adjustment_work_done ?? row.work_done), 0)
);

/** تجمع تعدیل‌های ارزی (علامت‌دار) تا پیش از سند جاری. */
export const adjustmentForeignCumulativeFor = (
  rows, { excludeId = null, number = null } = {},
) => (
  previousPeriodRows(
    (Array.isArray(rows) ? rows : []).filter(isAdjustmentKind),
    { excludeId, number },
  )
    .reduce((sum, row) => sum + num(row.adjustment_foreign_work_done ?? row.foreign_work_done), 0)
);

/** آیا قرارداد سند چند سطحی دارد؟ (پس از آن، اسناد جدید باید چند سطحی باشند) */
export const contractHasMultiLevels = (rows) => (Array.isArray(rows) ? rows : [])
  .some((row) => isMultiKind(row));

/** سطوح آخرین سند چند سطحی «دورهٔ قبل» را برای انتقال به سند جدید آماده می‌کند. */
export const seedLevelsFrom = (rows, number = null) => {
  const chain = (Array.isArray(rows) ? rows : []).filter((row) => !isAdjustmentKind(row));
  const prior = previousPeriodRows(chain, { number }).filter((row) => isMultiKind(row));
  const last = prior[prior.length - 1];
  if (!last) return [];
  return (Array.isArray(last.levels) ? last.levels : []).map((level) => ({
    title: level.title || '',
    amount: Number(level.amount) || 0,
    amount_foreign: Number(level.amount_foreign) || 0,
    includes_charges: Boolean(
      level.includes_charges ?? level.includes_additions ?? level.includes_deductions,
    ),
  }));
};
