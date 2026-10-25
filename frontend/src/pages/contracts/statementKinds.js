import { formatStatementNumber, toPersianDigits } from '../../core/utils/numberUtils';

export const STATEMENT_KIND_STATEMENT = 'statement';
export const STATEMENT_KIND_INCREASE = 'increase';
export const STATEMENT_KIND_DECREASE = 'decrease';

export const STATEMENT_KIND_META = {
  [STATEMENT_KIND_STATEMENT]: {
    key: STATEMENT_KIND_STATEMENT,
    label: 'صورت‌وضعیت',
    shortLabel: 'عادی',
    color: '#2563eb',
    isAdjustment: false,
    sign: 1,
  },
  [STATEMENT_KIND_INCREASE]: {
    key: STATEMENT_KIND_INCREASE,
    label: 'تعدیل افزایشی',
    shortLabel: 'افزایشی',
    color: '#15803d',
    isAdjustment: true,
    sign: 1,
  },
  [STATEMENT_KIND_DECREASE]: {
    key: STATEMENT_KIND_DECREASE,
    label: 'تعدیل کاهشی',
    shortLabel: 'کاهشی',
    color: '#be123c',
    isAdjustment: true,
    sign: -1,
  },
};

export const statementKindOf = (value) => {
  const key = typeof value === 'string' ? value : value?.kind;
  return STATEMENT_KIND_META[key] || STATEMENT_KIND_META[STATEMENT_KIND_STATEMENT];
};

export const isAdjustmentKind = (value) => statementKindOf(value).isAdjustment;

export const statementKindLabel = (row) => statementKindOf(row).label;

/** عنوان یکپارچهٔ سند برای لیست، کارت، جزئیات، پرداخت و اسناد. */
export const statementDisplayTitle = (row, { fallbackId = false } = {}) => {
  const meta = statementKindOf(row);
  const number = formatStatementNumber(row?.number);
  if (number) return `${meta.label} ${number}`;
  if (fallbackId && row?.id) return `${meta.label} #${toPersianDigits(row.id)}`;
  return meta.label;
};

/** شمارهٔ خالی/استانداردشده برای استفاده در فیلد شماره. */
export const statementNumberLabel = (row) => formatStatementNumber(row?.number);

/** آخرین صورت‌وضعیت عادی (بدون تعدیل) برای مبلغ تجمعی مبنا. */
export const latestNormalStatement = (statements = []) => (
  (Array.isArray(statements) ? statements : [])
    .filter((row) => !isAdjustmentKind(row))
    .sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
    .slice(-1)[0] || null
);

/** جمع تعدیل‌های افزایشی/کاهشی؛ مبالغ برگشتی همیشه مثبت‌اند. */
export const adjustmentSummaryOf = (statements = []) => {
  const rows = (Array.isArray(statements) ? statements : []).filter(isAdjustmentKind);
  return rows.reduce((summary, row) => {
    const meta = statementKindOf(row);
    const rial = Math.abs(Number(row.adjustment_work_done ?? row.work_done ?? 0) || 0);
    const foreign = Math.abs(
      Number(row.adjustment_foreign_work_done ?? row.foreign_work_done ?? 0) || 0,
    );
    summary.count += 1;
    if (meta.key === STATEMENT_KIND_INCREASE) {
      summary.increase += rial;
      summary.increaseForeign += foreign;
      summary.net += rial;
      summary.netForeign += foreign;
    } else {
      summary.decrease += rial;
      summary.decreaseForeign += foreign;
      summary.net -= rial;
      summary.netForeign -= foreign;
    }
    return summary;
  }, {
    count: 0,
    increase: 0,
    decrease: 0,
    net: 0,
    increaseForeign: 0,
    decreaseForeign: 0,
    netForeign: 0,
  });
};
