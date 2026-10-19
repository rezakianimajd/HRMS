import notesContent from './financialNotesContent.json';
import {
  classifyBalanceGroups, groupTotalValue, normText,
} from './financialStatementsTemplate';

/**
 * یادداشت‌های توضیحی صورت‌های مالی — بر پایهٔ ۳۸۴-v1 (صفحات ۱۰ تا ۵۷).
 *
 * اصل حاکم: هر جدول یادداشت از همان گروه‌های حساب ساخته می‌شود که ردیف متناظر
 * در صورت‌های مالی اساسی از آن ساخته شده است. بنابراین جمع یادداشت و جمع صورت
 * مالی همیشه یکی است و کاربر فقط در صورت نیاز مقدار را ویرایش می‌کند.
 */

const num = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;
const sum = (values) => round(values.reduce((total, value) => total + (Number(value) || 0), 0));
const hasValue = (values) => Object.values(values || {}).some(
  (value) => value !== null && value !== undefined && value !== '' && Math.abs(Number(value)) >= 0.01,
);

const matches = (text, patterns) => {
  const value = normText(text);
  return patterns.some((pattern) => value.includes(normText(pattern)));
};

const groupKey = (group) => `${group?.code || ''}|${group?.name || ''}`;
const groupValue = (group, absolute = false) => {
  const value = groupTotalValue(group);
  return absolute ? Math.abs(value) : value;
};

export const NOTE_AMOUNT_COLUMNS = [
  { key: 'current', label: 'سال جاری', short: 'جاری' },
  { key: 'prior', label: 'سال قبل', short: 'سال قبل' },
  { key: 'opening', label: 'ابتدای دوره', short: 'ابتدای دوره' },
];

const META = (page, number, title, short, extra = {}) => ({
  id: `note-${page}`,
  kind: 'note',
  page,
  number,
  title,
  short,
  noteRefs: number,
  group: 'یادداشت‌های توضیحی',
  icon: 'notes',
  subtitle: 'افشای تکمیلی و جزئیات حساب‌ها',
  ...extra,
});



export const NOTE_PAGE_META = [
  META('10', '۱-۲', 'تاریخچه و فعالیت شرکت', 'تاریخچه و فعالیت', { alwaysShow: true }),
  META('11', '۲', 'آثار گذار استانداردهای حسابداری', 'آثار گذار استانداردها', { alwaysShow: true }),
  META('12', '۳-۱', 'مبانی اندازه‌گیری و ارزش منصفانه', 'مبانی اندازه‌گیری', { alwaysShow: true }),
  META('13', '۳-۲ تا ۳-۴', 'شناخت درآمد و گزارش‌گری بخش‌ها', 'شناخت درآمد و بخش‌ها', { alwaysShow: true }),
  META('14', '۳-۵ تا ۳-۷', 'تسعیر ارز، مخارج تأمین مالی و دارایی‌های ثابت', 'تسعیر ارز و دارایی‌ها', { alwaysShow: true }),
  META('15', '۳-۷', 'روش‌های استهلاک دارایی‌های ثابت', 'روش‌های استهلاک', { alwaysShow: true }),
  META('16', '۳-۹ و ۳-۱۰', 'سرمایه‌گذاری در املاک و دارایی‌های نامشهود', 'املاک و نامشهود', { alwaysShow: true }),
  META('17', '۳-۱۱ و ۳-۱۲', 'کاهش ارزش و موجودی مواد و کالا', 'کاهش ارزش و موجودی', { alwaysShow: true }),
  META('18', '۳-۱۴', 'ذخایر و مزایای پایان خدمت', 'ذخایر و مزایا', { alwaysShow: true }),
  META('19', '۳-۱۵ و ۳-۱۶', 'سرمایه‌گذاری‌ها و ابزارهای مالی', 'سرمایه‌گذاری‌ها', { alwaysShow: true }),
  META('20', '۳-۱۷ و ۳-۱۸', 'سهام خزانه، مالیات و قضاوت‌های مدیریت', 'سهام خزانه و مالیات', { alwaysShow: true }),
  META('21', '۴ و ۵', 'درآمدهای عملیاتی', 'درآمدهای عملیاتی', { requires: ['revenue'] }),
  META('22', '۵-۲ و ۵-۳', 'درآمد ارائه خدمات و تفکیک مشتریان', 'درآمد خدمات', { requires: ['revenue'] }),
  META('23', '۵-۴', 'مقایسه درآمد و بهای تمام‌شده', 'درآمد و بهای تمام‌شده', { requires: ['revenue'] }),
  META('24', '۶', 'گزارش‌گری بر حسب قسمت‌ها', 'گزارش‌گری بخش‌ها', { requires: ['revenue'] }),
  META('25', '۷', 'بهای تمام‌شده درآمدهای عملیاتی', 'بهای تمام‌شده', { requires: ['cost'] }),
  META('26', '۸ و ۹', 'هزینه‌های فروش، اداری و عمومی', 'هزینه‌های عملیاتی', { requires: ['expense'] }),
  META('27', '۱۰ تا ۱۲', 'سایر درآمدها، هزینه‌ها و هزینه مالی', 'سایر درآمد و هزینه', { requires: ['expense'] }),
  META('28', '۱۳', 'سایر درآمدها و هزینه‌های غیرعملیاتی', 'غیرعملیاتی', { requires: ['expense'] }),
  META('29', '۱۴', 'عملیات متوقف‌شده', 'عملیات متوقف‌شده', { requires: ['discontinued'] }),
  META('30', '۱۵', 'سود هر سهم', 'سود هر سهم', { requires: ['netProfit'] }),
  META('31', '۱۶', 'دارایی‌های ثابت مشهود', 'دارایی‌های ثابت', { requires: ['fixedAssets'] }),
  META('32', '۱۶', 'گردش دارایی‌های ثابت مشهود', 'گردش دارایی‌های ثابت', { requires: ['fixedAssets'] }),
  META('33', '۱۶-۱ و ۱۶-۲', 'تعهدات و وثایق دارایی‌های ثابت', 'وثایق دارایی‌های ثابت', { requires: ['fixedAssets'] }),
  META('34', '۱۶-۴ و ۱۷', 'دارایی در جریان تکمیل و سرمایه‌گذاری در املاک', 'دارایی در جریان تکمیل', { requires: ['fixedAssets', 'investmentProperty'] }),
  META('35', '۱۸', 'دارایی‌های نامشهود', 'دارایی‌های نامشهود', { requires: ['intangible'] }),
  META('36', '۱۹', 'سرمایه‌گذاری‌های بلندمدت', 'سرمایه‌گذاری بلندمدت', { requires: ['investments'] }),
  META('37', '۱۹-۲ و ۱۹-۳', 'سرمایه‌گذاری در اوراق و سپرده‌ها', 'اوراق و سپرده‌ها', { requires: ['investments'] }),
  META('38', '۲۰', 'دریافتنی‌های تجاری و سایر دریافتنی‌ها', 'دریافتنی‌ها', { requires: ['receivables'] }),
  META('39', '۲۰-۲', 'دریافتنی‌های بلندمدت', 'دریافتنی بلندمدت', { requires: ['longReceivables'] }),
  META('40', '۲۰-۴ و ۲۰-۵', 'ساختار سنی و کاهش ارزش دریافتنی‌ها', 'سن و کاهش ارزش دریافتنی', { requires: ['receivables'] }),
  META('41', '۲۱ و ۲۲', 'سایر دارایی‌ها و پیش‌پرداخت‌ها', 'سایر دارایی‌ها', { requires: ['otherAssets', 'prepayments'] }),
  META('42', '۲۳', 'موجودی مواد و کالا', 'موجودی مواد و کالا', { requires: ['inventory'] }),
  META('43', '۲۴ و ۲۵', 'دارایی‌های قرارداد و سرمایه‌گذاری کوتاه‌مدت', 'دارایی قرارداد و سرمایه‌گذاری کوتاه', { requires: ['contractAssets', 'shortInvestments'] }),
  META('44', '۲۶ و ۲۷', 'موجودی نقد و دارایی‌های نگهداری‌شده برای فروش', 'موجودی نقد', { requires: ['cash', 'heldForSale'] }),
  META('45', '۲۸', 'سرمایه', 'سرمایه', { requires: ['capital'] }),
  META('46', '۲۹ تا ۳۲', 'افزایش سرمایه، صرف سهام و اندوخته‌ها', 'سرمایه و اندوخته‌ها', { requires: ['equityExtras'] }),
  META('47', '۳۳', 'سهام خزانه', 'سهام خزانه', { requires: ['treasury'] }),
  META('48', '۳۴', 'پرداختنی‌های تجاری و سایر پرداختنی‌های جاری', 'پرداختنی‌های جاری', { requires: ['payables'] }),
  META('49', '۳۴-۲', 'پرداختنی‌های تجاری و سایر پرداختنی‌های غیرجاری', 'پرداختنی‌های غیرجاری', { requires: ['longPayables'] }),
  META('50', '۳۵', 'تسهیلات مالی', 'تسهیلات مالی', { requires: ['facilities'] }),
  META('51', '۳۵-۱', 'تسهیلات به تفکیک تأمین‌کننده', 'تسهیلات به تفکیک تأمین‌کننده', { requires: ['facilities'] }),
  META('52', '۳۵-۱-۱', 'زمان‌بندی پرداخت تسهیلات', 'زمان‌بندی تسهیلات', { requires: ['facilities'] }),
  META('53', '۳۵-۵ و ۳۵-۶', 'اوراق مشارکت و تسویه تسهیلات', 'اوراق و تسویه تسهیلات', { requires: ['facilities'] }),
  META('54', '۳۵-۹', 'تغییرات بدهی‌های تأمین مالی', 'تغییرات بدهی تأمین مالی', { requires: ['facilities'] }),
  META('55', '۳۶', 'مالیات پرداختنی', 'مالیات پرداختنی', { requires: ['tax'] }),
  META('56', '۳۶-۳ و ۳۶-۴', 'اجزای هزینه مالیات بر درآمد', 'اجزای هزینه مالیات', { requires: ['tax'] }),
  META('57', '۳۶-۵', 'تطبیق هزینه مالیات بر درآمد', 'تطبیق مالیات', { requires: ['tax'] }),
  META('58', '۳۷', 'ذخیره مزایای پایان خدمت کارکنان', 'مزایای پایان خدمت', { requires: ['employeeBenefits'], supplemental: true }),
  META('59', '۳۸', 'سود سهام پرداختنی', 'سود سهام پرداختنی', { requires: ['dividends'], supplemental: true }),
  META('60', '۳۹', 'ذخایر', 'ذخایر', { requires: ['provisions'], supplemental: true }),
  META('61', '۴۰', 'بدهی‌های ناشی از قرارداد', 'بدهی قرارداد', { requires: ['contractLiabilities'], supplemental: true }),
  META('62', '۴۱', 'پیش‌دریافت‌ها', 'پیش‌دریافت‌ها', { requires: ['advances'], supplemental: true }),
  META('63', '۴۲', 'سایر بدهی‌های جاری و غیرجاری', 'سایر بدهی‌ها', { requires: ['otherLiabilities'], supplemental: true }),
];

const contentFor = (page) => notesContent?.[page]?.paragraphs || [];

const groupRows = (rows = []) => {
  const buckets = {};
  rows.forEach((row) => {
    const key = `${row.group_code || ''}|${row.group || 'سایر'}`;
    const bucket = buckets[key] || (buckets[key] = {
      code: row.group_code || '', name: row.group || 'سایر حساب‌ها', total: 0, rows: [],
    });
    bucket.total += Number(row.balance || 0);
    bucket.rows.push(row);
  });
  return Object.values(buckets).map((bucket) => ({
    ...bucket, total: round(bucket.total),
  }));
};

const pnlGroups = (statement, key) => {
  if (Array.isArray(statement?.[key]) && statement[key].length) return statement[key];
  const rowsKey = key.replace('_groups', '_rows');
  return groupRows(statement?.[rowsKey] || []);
};

const classifyPnl = (api, prior) => {
  const inc = api?.income_statement || {};
  const pinc = prior?.income_statement || {};
  const revenue = pnlGroups(inc, 'revenue_groups');
  const previousRevenue = pnlGroups(pinc, 'revenue_groups');
  const cost = pnlGroups(inc, 'cost_groups');
  const previousCost = pnlGroups(pinc, 'cost_groups');
  const expense = pnlGroups(inc, 'expense_groups');
  const previousExpense = pnlGroups(pinc, 'expense_groups');

  const revenueOperating = [];
  const otherIncome = [];
  revenue.forEach((group) => {
    if (matches(group.name, ['سایر', 'غیرعملیاتی', 'سود فروش', 'سود سرمایه', 'سود سپرده'])) {
      otherIncome.push(group);
    } else {
      revenueOperating.push(group);
    }
  });

  const previousOperating = [];
  const previousOtherIncome = [];
  previousRevenue.forEach((group) => {
    if (matches(group.name, ['سایر', 'غیرعملیاتی', 'سود فروش', 'سود سرمایه', 'سود سپرده'])) {
      previousOtherIncome.push(group);
    } else {
      previousOperating.push(group);
    }
  });

  const splitExpense = (groups) => {
    const result = {
      sga: [], impairment: [], other: [], finance: [], nonOperating: [], tax: [],
    };
    groups.forEach((group) => {
      if (matches(group.name, ['مالیات'])) result.tax.push(group);
      else if (matches(group.name, ['کاهش ارزش', 'مشکوک'])) result.impairment.push(group);
      else if (matches(group.name, ['مالی', 'بهره', 'کارمزد', 'تسهیلات'])) result.finance.push(group);
      else if (matches(group.name, ['غیرعملیاتی'])) result.nonOperating.push(group);
      else if (matches(group.name, ['سایر'])) result.other.push(group);
      else result.sga.push(group);
    });
    return result;
  };

  return {
    revenue, previousRevenue, revenueOperating, previousOperating,
    otherIncome, previousOtherIncome, cost, previousCost,
    expense, previousExpense,
    expenseSplit: splitExpense(expense),
    previousExpenseSplit: splitExpense(previousExpense),
    netProfit: num(inc.net_profit),
    previousNetProfit: num(pinc.net_profit),
    revenueTotal: num(inc.revenue_total ?? inc.revenue),
    previousRevenueTotal: num(pinc.revenue_total ?? pinc.revenue),
    costTotal: num(inc.cost_total ?? inc.cost_of_sales),
    previousCostTotal: num(pinc.cost_total ?? pinc.cost_of_sales),
    expenseTotal: num(inc.expense_total ?? inc.expenses),
    previousExpenseTotal: num(pinc.expense_total ?? pinc.expenses),
  };
};

const emptyTotals = () => ({ current: 0, prior: 0, opening: 0 });

const buildBalanceTable = ({
  id, title, sections, ctx, includeAccounts = false, absolute = false,
}) => {
  const rows = [];
  sections.forEach((section) => {
    const data = {
      current: ctx.classification.current[section.side]?.[section.rowId] || [],
      prior: ctx.classification.prior[section.side]?.[section.rowId] || [],
      opening: ctx.classification.opening[section.side]?.[section.rowId] || [],
    };
    const merged = new Map();
    Object.entries(data).forEach(([yearKey, groups]) => {
      groups.forEach((group) => {
        const key = groupKey(group);
        const rec = merged.get(key) || {
          key, group, values: emptyTotals(), sources: {},
        };
        rec.values[yearKey] = groupValue(group, section.absolute || absolute);
        rec.sources[yearKey] = group;
        if (!rec.group.rows?.length && group.rows?.length) rec.group = group;
        merged.set(key, rec);
      });
    });
    if (!merged.size) return;
    if (sections.length > 1) {
      rows.push({ id: `${id}-${section.rowId}`, kind: 'section', label: section.label });
    }
    [...merged.values()]
      .sort((a, b) => String(a.group.code || '').localeCompare(String(b.group.code || '')))
      .forEach((rec, index) => {
        rows.push({
          id: `${id}-${section.rowId}-${index}`,
          kind: 'item',
          code: rec.group.code,
          label: rec.group.name,
          values: rec.values,
        });
        if (!includeAccounts) return;
        const currentRows = rec.sources.current?.rows || [];
        const priorRows = rec.sources.prior?.rows || [];
        const openingRows = rec.sources.opening?.rows || [];
        const accountKeys = new Set([
          ...currentRows.map((row) => String(row.code)),
          ...priorRows.map((row) => String(row.code)),
          ...openingRows.map((row) => String(row.code)),
        ]);
        [...accountKeys].sort().forEach((code) => {
          const cur = currentRows.find((row) => String(row.code) === code);
          const pri = priorRows.find((row) => String(row.code) === code);
          const opn = openingRows.find((row) => String(row.code) === code);
          rows.push({
            id: `${id}-${section.rowId}-${index}-${code}`,
            kind: 'item',
            child: true,
            code,
            label: (cur || pri || opn)?.name || code,
            values: {
              current: cur ? Number(cur.balance || 0) : 0,
              prior: pri ? Number(pri.balance || 0) : 0,
              opening: opn ? Number(opn.balance || 0) : 0,
            },
          });
        });
      });
  });
  const items = rows.filter((row) => row.kind === 'item' && !row.child);
  const total = items.reduce((acc, row) => {
    Object.keys(acc).forEach((key) => { acc[key] += Number(row.values?.[key] || 0); });
    return acc;
  }, emptyTotals());
  if (items.length) {
    rows.push({
      id: `${id}-total`, kind: 'total', label: 'جمع',
      values: { current: round(total.current), prior: round(total.prior), opening: round(total.opening) },
    });
  }
  return {
    id, title, columns: NOTE_AMOUNT_COLUMNS, rows,
    expense: sections.some((section) => section.expense),
    hasData: rows.some((row) => row.kind === 'item' && hasValue(row.values)),
  };
};

const buildPnlTable = ({
  id, title, groups = [], previousGroups = [], total, previousTotal,
  filter, expense = false,
}) => {
  const keep = (group) => !filter || filter(group);
  const rows = [];
  const merged = new Map();
  groups.filter(keep).forEach((group) => {
    merged.set(groupKey(group), { group, current: groupValue(group), prior: null });
  });
  previousGroups.filter(keep).forEach((group) => {
    const key = groupKey(group);
    const rec = merged.get(key) || { group, current: null, prior: null };
    rec.prior = groupValue(group);
    merged.set(key, rec);
  });
  [...merged.values()]
    .sort((a, b) => String(a.group.code || '').localeCompare(String(b.group.code || '')))
    .forEach((rec, index) => {
      rows.push({
        id: `${id}-${index}`, kind: 'item', code: rec.group.code, label: rec.group.name,
        values: { current: rec.current, prior: rec.prior },
      });
    });
  if (!rows.length && (Number(total) || Number(previousTotal))) {
    rows.push({
      id: `${id}-summary`, kind: 'item', label: title,
      values: { current: total, prior: previousTotal },
    });
  }
  if (rows.length) {
    rows.push({
      id: `${id}-total`, kind: 'total', label: 'جمع',
      values: {
        current: sum(rows.map((row) => row.values.current)),
        prior: sum(rows.map((row) => row.values.prior)),
      },
    });
  }
  return {
    id, title, columns: NOTE_AMOUNT_COLUMNS.slice(0, 2), rows, expense,
    hasData: rows.some((row) => row.kind === 'item' && hasValue(row.values)),
  };
};


const buildFixedAssetMovement = (ctx) => {
  const table = buildBalanceTable({
    id: 'note-32-detail',
    title: 'گردش دارایی‌های ثابت مشهود',
    sections: [{ side: 'assets', rowId: 'fixed_assets', label: 'دارایی‌های ثابت مشهود' }],
    ctx,
  });
  const rows = table.rows.map((row) => {
    if (row.kind === 'section') return row;
    return {
      ...row,
      values: {
        opening: row.values.opening,
        change: round((row.values.current || 0) - (row.values.opening || 0)),
        closing: row.values.current,
      },
    };
  });
  return {
    ...table,
    id: 'note-32',
    columns: [
      { key: 'opening', label: 'مانده ابتدای دوره', short: 'ابتدای دوره' },
      { key: 'change', label: 'افزایش / کاهش خالص', short: 'تغییر' },
      { key: 'closing', label: 'مانده پایان دوره', short: 'پایان دوره' },
    ],
    rows,
    hasData: rows.some((row) => row.kind === 'item' && hasValue(row.values)),
  };
};

const buildEpsTable = (ctx) => {
  const currentCapital = ctx.classification.current.equity.share_capital || [];
  const priorCapital = ctx.classification.prior.equity.share_capital || [];
  const capital = sum(currentCapital.map((group) => groupValue(group)));
  const previousCapital = sum(priorCapital.map((group) => groupValue(group)));
  const shares = capital ? capital / 1000 : null;
  const previousShares = previousCapital ? previousCapital / 1000 : null;
  const currentEps = shares ? round((ctx.pnl.netProfit || 0) / shares) : null;
  const priorEps = previousShares ? round((ctx.pnl.previousNetProfit || 0) / previousShares) : null;
  const rows = [
    {
      id: 'eps-profit', kind: 'item', label: 'سود خالص قابل انتساب به سهامداران',
      values: { current: ctx.pnl.netProfit, prior: ctx.pnl.previousNetProfit },
    },
    {
      id: 'eps-shares', kind: 'item', label: 'تعداد سهام (بر پایهٔ ارزش اسمی ۱٬۰۰۰ ریال)',
      values: { current: shares, prior: previousShares },
    },
    {
      id: 'eps-base', kind: 'total', label: 'سود پایه هر سهم (ریال)',
      values: { current: currentEps, prior: priorEps },
    },
  ];
  return {
    id: 'note-30', title: 'سود پایه هر سهم', columns: NOTE_AMOUNT_COLUMNS.slice(0, 2),
    rows, recalcTotal: false, hasData: hasValue({ current: currentEps, prior: priorEps }),
  };
};

const buildTaxReconciliation = (ctx) => {
  const taxExpense = sum((ctx.pnl.expenseSplit.tax || []).map((group) => groupValue(group)));
  const previousTaxExpense = sum((ctx.pnl.previousExpenseSplit.tax || []).map((group) => groupValue(group)));
  const pbt = (ctx.pnl.netProfit || 0) + taxExpense;
  const previousPbt = (ctx.pnl.previousNetProfit || 0) + previousTaxExpense;
  const rate = 0.25;
  const rows = [
    { id: 'tax-pbt', kind: 'item', label: 'سود قبل از مالیات', values: { current: round(pbt), prior: round(previousPbt) } },
    { id: 'tax-rate', kind: 'item', label: 'نرخ مالیات قابل اعمال', values: { current: rate, prior: rate }, percent: true },
    { id: 'tax-expected', kind: 'item', label: 'مالیات محاسبه‌شده بر پایهٔ نرخ قانونی', values: { current: round(pbt * rate), prior: round(previousPbt * rate) } },
    { id: 'tax-actual', kind: 'item', label: 'هزینه مالیات شناسایی‌شده', values: { current: taxExpense, prior: previousTaxExpense } },
    { id: 'tax-difference', kind: 'total', label: 'تفاوت (اثر معافیت‌ها و تفاوت‌های دائمی)', values: { current: round(taxExpense - pbt * rate), prior: round(previousTaxExpense - previousPbt * rate) } },
  ];
  return {
    id: 'note-57', title: 'تطبیق هزینه مالیات بر درآمد', columns: NOTE_AMOUNT_COLUMNS.slice(0, 2),
    rows, recalcTotal: false, hasData: hasValue({ current: taxExpense, prior: previousTaxExpense }),
  };
};


const tablesForPage = (page, ctx) => {
  const pnl = ctx.pnl;
  const balance = (id, title, sections, extra = {}) => buildBalanceTable({
    id, title, sections, ctx, ...extra,
  });
  switch (page) {
    case '21':
      return [buildPnlTable({
        id: 'note-21-revenue', title: 'درآمدهای عملیاتی به تفکیک گروه حساب',
        groups: pnl.revenueOperating.length ? pnl.revenueOperating : pnl.revenue,
        previousGroups: pnl.previousOperating.length ? pnl.previousOperating : pnl.previousRevenue,
        total: pnl.revenueTotal, previousTotal: pnl.previousRevenueTotal,
      })];
    case '22':
      return [buildPnlTable({
        id: 'note-22-revenue', title: 'درآمد ارائه خدمات و فروش به تفکیک گروه',
        groups: pnl.revenueOperating, previousGroups: pnl.previousOperating,
        total: pnl.revenueTotal, previousTotal: pnl.previousRevenueTotal,
      })];
    case '23':
      return [
        buildPnlTable({
          id: 'note-23-revenue', title: 'درآمدهای عملیاتی',
          groups: pnl.revenueOperating, previousGroups: pnl.previousOperating,
          total: pnl.revenueTotal, previousTotal: pnl.previousRevenueTotal,
        }),
        buildPnlTable({
          id: 'note-23-cost', title: 'بهای تمام‌شده درآمدهای عملیاتی', expense: true,
          groups: pnl.cost, previousGroups: pnl.previousCost,
          total: pnl.costTotal, previousTotal: pnl.previousCostTotal,
        }),
      ];
    case '24':
      return [buildPnlTable({
        id: 'note-24-segments', title: 'درآمد عملیاتی به تفکیک قسمت‌های تجاری',
        groups: pnl.revenueOperating.length ? pnl.revenueOperating : pnl.revenue,
        previousGroups: pnl.previousOperating.length ? pnl.previousOperating : pnl.previousRevenue,
        total: pnl.revenueTotal, previousTotal: pnl.previousRevenueTotal,
      })];
    case '25':
      return [buildPnlTable({
        id: 'note-25-cost', title: 'بهای تمام‌شده درآمدهای عملیاتی', expense: true,
        groups: pnl.cost, previousGroups: pnl.previousCost,
        total: pnl.costTotal, previousTotal: pnl.previousCostTotal,
      })];
    case '26':
      return [
        buildPnlTable({
          id: 'note-26-sga', title: 'هزینه‌های فروش، اداری و عمومی', expense: true,
          groups: pnl.expenseSplit.sga, previousGroups: pnl.previousExpenseSplit.sga,
        }),
        buildPnlTable({
          id: 'note-26-impairment', title: 'زیان کاهش ارزش دریافتنی‌ها', expense: true,
          groups: pnl.expenseSplit.impairment, previousGroups: pnl.previousExpenseSplit.impairment,
        }),
      ];
    case '27':
      return [
        buildPnlTable({
          id: 'note-27-other-income', title: 'سایر درآمدها',
          groups: pnl.otherIncome, previousGroups: pnl.previousOtherIncome,
        }),
        buildPnlTable({
          id: 'note-27-other-expense', title: 'سایر هزینه‌ها', expense: true,
          groups: pnl.expenseSplit.other, previousGroups: pnl.previousExpenseSplit.other,
        }),
        buildPnlTable({
          id: 'note-27-finance', title: 'هزینه‌های مالی', expense: true,
          groups: pnl.expenseSplit.finance, previousGroups: pnl.previousExpenseSplit.finance,
        }),
      ];
    case '28':
      return [buildPnlTable({
        id: 'note-28-nonoperating', title: 'سایر درآمدها و هزینه‌های غیرعملیاتی', expense: true,
        groups: pnl.expenseSplit.nonOperating, previousGroups: pnl.previousExpenseSplit.nonOperating,
      })];
    case '30':
      return [buildEpsTable(ctx)];
    case '31':
      return [balance('note-31-fa', 'دارایی‌های ثابت مشهود', [
        { side: 'assets', rowId: 'fixed_assets', label: 'دارایی‌های ثابت مشهود' },
      ], { includeAccounts: true })];
    case '32':
      return [buildFixedAssetMovement(ctx)];
    case '34':
      return [
        balance('note-34-fa', 'دارایی در جریان تکمیل', [
          { side: 'assets', rowId: 'fixed_assets', label: 'دارایی‌های ثابت مشهود' },
        ], { includeAccounts: true }),
        balance('note-34-ip', 'سرمایه‌گذاری در املاک', [
          { side: 'assets', rowId: 'investment_property', label: 'سرمایه‌گذاری در املاک' },
        ], { includeAccounts: true }),
      ];

    case '35':
      return [balance('note-35-intangible', 'دارایی‌های نامشهود', [
        { side: 'assets', rowId: 'intangible_assets', label: 'دارایی‌های نامشهود' },
      ], { includeAccounts: true })];
    case '36':
      return [balance('note-36-investments', 'سرمایه‌گذاری‌های بلندمدت', [
        { side: 'assets', rowId: 'long_term_investments', label: 'سرمایه‌گذاری‌های بلندمدت' },
      ], { includeAccounts: true })];
    case '37':
      return [
        balance('note-37-long', 'سرمایه‌گذاری‌های بلندمدت', [
          { side: 'assets', rowId: 'long_term_investments', label: 'سرمایه‌گذاری‌های بلندمدت' },
        ]),
        balance('note-37-short', 'سرمایه‌گذاری‌های کوتاه‌مدت', [
          { side: 'assets', rowId: 'short_term_investments', label: 'سرمایه‌گذاری‌های کوتاه‌مدت' },
        ]),
      ];
    case '38':
      return [balance('note-38-receivables', 'دریافتنی‌های تجاری و سایر دریافتنی‌ها', [
        { side: 'assets', rowId: 'trade_receivables', label: 'دریافتنی‌های جاری' },
      ], { includeAccounts: true })];
    case '39':
      return [balance('note-39-long-receivables', 'دریافتنی‌های بلندمدت', [
        { side: 'assets', rowId: 'long_term_receivables', label: 'دریافتنی‌های بلندمدت' },
      ], { includeAccounts: true })];
    case '40':
      return [balance('note-40-receivables', 'دریافتنی‌های تجاری و سایر دریافتنی‌ها', [
        { side: 'assets', rowId: 'trade_receivables', label: 'دریافتنی‌های جاری' },
        { side: 'assets', rowId: 'long_term_receivables', label: 'دریافتنی‌های بلندمدت' },
      ], { includeAccounts: true })];
    case '41':
      return [
        balance('note-41-other', 'سایر دارایی‌ها', [
          { side: 'assets', rowId: 'other_noncurrent_assets', label: 'سایر دارایی‌های غیرجاری' },
          { side: 'assets', rowId: 'other_current_assets', label: 'سایر دارایی‌های جاری' },
        ]),
        balance('note-41-prepayments', 'پیش‌پرداخت‌ها', [
          { side: 'assets', rowId: 'prepayments', label: 'پیش‌پرداخت‌ها' },
        ], { includeAccounts: true }),
      ];
    case '42':
      return [balance('note-42-inventory', 'موجودی مواد و کالا', [
        { side: 'assets', rowId: 'inventory', label: 'موجودی مواد و کالا' },
      ], { includeAccounts: true })];
    case '43':
      return [
        balance('note-43-contract', 'دارایی‌های حاصل از قرارداد', [
          { side: 'assets', rowId: 'contract_assets', label: 'دارایی‌های حاصل از قرارداد' },
        ]),
        balance('note-43-short-invest', 'سرمایه‌گذاری‌های کوتاه‌مدت', [
          { side: 'assets', rowId: 'short_term_investments', label: 'سرمایه‌گذاری‌های کوتاه‌مدت' },
        ]),
      ];
    case '44':
      return [
        balance('note-44-cash', 'موجودی نقد', [
          { side: 'assets', rowId: 'cash', label: 'موجودی نقد و بانک' },
        ], { includeAccounts: true }),
        balance('note-44-held', 'دارایی‌های غیرجاری نگهداری‌شده برای فروش', [
          { side: 'assets', rowId: 'assets_held_for_sale', label: 'دارایی‌های نگهداری‌شده برای فروش' },
        ]),
      ];
    case '45':
      return [balance('note-45-capital', 'سرمایه', [
        { side: 'equity', rowId: 'share_capital', label: 'سرمایه' },
      ], { includeAccounts: true })];
    case '46':
      return [balance('note-46-equity', 'افزایش سرمایه، صرف سهام و اندوخته‌ها', [
        { side: 'equity', rowId: 'capital_in_progress', label: 'افزایش سرمایه در جریان' },
        { side: 'equity', rowId: 'share_premium', label: 'صرف سهام' },
        { side: 'equity', rowId: 'treasury_premium', label: 'صرف سهام خزانه' },
        { side: 'equity', rowId: 'legal_reserve', label: 'اندوخته قانونی' },
        { side: 'equity', rowId: 'other_reserves', label: 'سایر اندوخته‌ها' },
        { side: 'equity', rowId: 'revaluation_surplus', label: 'مازاد تجدید ارزیابی' },
        { side: 'equity', rowId: 'retained_earnings', label: 'سود انباشته' },
        { side: 'equity', rowId: 'other_equity', label: 'سایر اقلام حقوق مالکانه' },
      ])];
    case '47':
      return [balance('note-47-treasury', 'سهام خزانه', [
        { side: 'equity', rowId: 'treasury_shares', label: 'سهام خزانه', expense: true },
      ], { absolute: true })];

    case '48':
      return [balance('note-48-payables', 'پرداختنی‌های تجاری و سایر پرداختنی‌های جاری', [
        { side: 'liabilities', rowId: 'trade_payables', label: 'پرداختنی‌های جاری' },
      ], { includeAccounts: true })];
    case '49':
      return [balance('note-49-long-payables', 'پرداختنی‌های تجاری و سایر پرداختنی‌های غیرجاری', [
        { side: 'liabilities', rowId: 'long_term_payables', label: 'پرداختنی‌های غیرجاری' },
      ], { includeAccounts: true })];
    case '50':
    case '51':
    case '52':
    case '53':
    case '54':
      return [balance(`note-${page}-facilities`, 'تسهیلات مالی و بدهی‌های تأمین مالی', [
        { side: 'liabilities', rowId: 'long_term_facilities', label: 'تسهیلات مالی بلندمدت' },
        { side: 'liabilities', rowId: 'short_term_facilities', label: 'تسهیلات مالی جاری' },
      ], { includeAccounts: true })];
    case '55':
      return [balance('note-55-tax', 'مالیات پرداختنی و مالیات انتقالی', [
        { side: 'liabilities', rowId: 'tax_payable', label: 'مالیات پرداختنی' },
        { side: 'assets', rowId: 'deferred_tax_asset', label: 'دارایی مالیات انتقالی' },
        { side: 'liabilities', rowId: 'deferred_tax_liability', label: 'بدهی مالیات انتقالی' },
      ], { includeAccounts: true })];
    case '56':
      return [buildPnlTable({
        id: 'note-56-tax-expense', title: 'اجزای هزینه مالیات بر درآمد', expense: true,
        groups: pnl.expenseSplit.tax, previousGroups: pnl.previousExpenseSplit.tax,
      })];
    case '57':
      return [buildTaxReconciliation(ctx)];
    case '58':
      return [balance('note-58-employee', 'ذخیره مزایای پایان خدمت کارکنان', [
        { side: 'liabilities', rowId: 'employee_benefits', label: 'ذخیره مزایای پایان خدمت' },
      ], { includeAccounts: true })];
    case '59':
      return [balance('note-59-dividends', 'سود سهام پرداختنی', [
        { side: 'liabilities', rowId: 'dividends_payable', label: 'سود سهام پرداختنی' },
      ], { includeAccounts: true })];
    case '60':
      return [balance('note-60-provisions', 'ذخایر', [
        { side: 'liabilities', rowId: 'provisions', label: 'ذخایر' },
      ], { includeAccounts: true })];
    case '61':
      return [balance('note-61-contract-liabilities', 'بدهی‌های ناشی از قرارداد', [
        { side: 'liabilities', rowId: 'contract_liabilities', label: 'بدهی‌های ناشی از قرارداد' },
      ], { includeAccounts: true })];
    case '62':
      return [balance('note-62-advances', 'پیش‌دریافت‌ها', [
        { side: 'liabilities', rowId: 'advances', label: 'پیش‌دریافت‌ها' },
      ], { includeAccounts: true })];
    case '63':
      return [balance('note-63-other-liabilities', 'سایر بدهی‌های جاری و غیرجاری', [
        { side: 'liabilities', rowId: 'other_current_liabilities', label: 'سایر بدهی‌های جاری' },
        { side: 'liabilities', rowId: 'other_noncurrent_liabilities', label: 'سایر بدهی‌های غیرجاری' },
        { side: 'liabilities', rowId: 'liabilities_held_for_sale', label: 'بدهی‌های مرتبط با دارایی‌های نگهداری‌شده برای فروش' },
      ], { includeAccounts: true })];
    default:
      return [];
  }
};

const bucketHasValue = (groups) => (groups || []).some(
  (group) => Math.abs(groupValue(group)) >= 0.01,
);

const flagsFor = (ctx) => {
  const assets = ctx.classification.current.assets || {};
  const liabilities = ctx.classification.current.liabilities || {};
  const equity = ctx.classification.current.equity || {};
  return {
    revenue: Math.abs(ctx.pnl.revenueTotal || 0) >= 0.01,
    cost: Math.abs(ctx.pnl.costTotal || 0) >= 0.01,
    expense: Math.abs(ctx.pnl.expenseTotal || 0) >= 0.01,
    netProfit: Math.abs(ctx.pnl.netProfit || 0) >= 0.01,
    discontinued: false,
    fixedAssets: bucketHasValue(assets.fixed_assets),
    investmentProperty: bucketHasValue(assets.investment_property),
    intangible: bucketHasValue(assets.intangible_assets),
    investments: bucketHasValue(assets.long_term_investments) || bucketHasValue(assets.short_term_investments),
    receivables: bucketHasValue(assets.trade_receivables) || bucketHasValue(assets.long_term_receivables),
    longReceivables: bucketHasValue(assets.long_term_receivables),
    otherAssets: bucketHasValue(assets.other_noncurrent_assets) || bucketHasValue(assets.other_current_assets),
    prepayments: bucketHasValue(assets.prepayments),
    inventory: bucketHasValue(assets.inventory),
    contractAssets: bucketHasValue(assets.contract_assets),
    shortInvestments: bucketHasValue(assets.short_term_investments),
    cash: bucketHasValue(assets.cash),
    heldForSale: bucketHasValue(assets.assets_held_for_sale),
    capital: bucketHasValue(equity.share_capital),
    equityExtras: [
      'capital_in_progress', 'share_premium', 'treasury_premium',
      'legal_reserve', 'other_reserves', 'revaluation_surplus', 'retained_earnings', 'other_equity',
    ].some((key) => bucketHasValue(equity[key])),
    treasury: bucketHasValue(equity.treasury_shares),
    payables: bucketHasValue(liabilities.trade_payables),
    longPayables: bucketHasValue(liabilities.long_term_payables),
    facilities: bucketHasValue(liabilities.long_term_facilities) || bucketHasValue(liabilities.short_term_facilities),
    tax: bucketHasValue(liabilities.tax_payable)
      || bucketHasValue(assets.deferred_tax_asset)
      || bucketHasValue(liabilities.deferred_tax_liability)
      || (ctx.pnl.expenseSplit.tax || []).length > 0,
    employeeBenefits: bucketHasValue(liabilities.employee_benefits),
    dividends: bucketHasValue(liabilities.dividends_payable),
    provisions: bucketHasValue(liabilities.provisions),
    contractLiabilities: bucketHasValue(liabilities.contract_liabilities),
    advances: bucketHasValue(liabilities.advances),
    otherLiabilities: bucketHasValue(liabilities.other_current_liabilities)
      || bucketHasValue(liabilities.other_noncurrent_liabilities)
      || bucketHasValue(liabilities.liabilities_held_for_sale),
  };
};


export const buildNotePages = ({
  api, prior, balanceData, priorBalanceData, openingBalanceData, companyName = 'شرکت جاری',
}) => {
  const classification = {
    current: classifyBalanceGroups(balanceData),
    prior: classifyBalanceGroups(priorBalanceData),
    opening: classifyBalanceGroups(openingBalanceData),
  };
  const pnl = classifyPnl(api, prior);
  const ctx = { api, prior, classification, pnl };
  const flags = flagsFor(ctx);
  return NOTE_PAGE_META
    .map((meta) => {
      const tables = (tablesForPage(meta.page, ctx) || []).filter(Boolean);
      const tableData = tables.some((table) => table.hasData);
      const required = (meta.requires || []).some((key) => flags[key]);
      return {
        ...meta,
        paragraphs: contentFor(meta.page).map((paragraph) => paragraph
          .replace(/شرکت نمونه \(سهامی عام\)/g, () => companyName)
          .replace(/شرکت نمونه/g, () => companyName)),
        tables,
        hasData: tableData,
        visible: Boolean(meta.alwaysShow || tableData || required),
      };
    })
    .filter((page) => page.visible);
};

export const applyNoteOverrides = (pages, noteValues = {}, notesText = {}) => pages.map((page) => ({
  ...page,
  paragraphs: page.paragraphs.map((paragraph, index) => (
    notesText?.[`${page.page}:${index}`] ?? paragraph
  )),
  tables: page.tables.map((table) => {
    const tableOverrides = noteValues?.[page.page]?.[table.id] || {};
    const rows = table.rows.map((row) => {
      const rowOverrides = tableOverrides[row.id];
      return {
        ...row,
        values: { ...(row.values || {}), ...(rowOverrides || {}) },
      };
    });
    if (table.recalcTotal === false) return { ...table, rows };
    const items = rows.filter((row) => row.kind === 'item' && !row.child);
    const totalRow = rows.find((row) => row.kind === 'total');
    if (totalRow) {
      const totals = { ...totalRow.values };
      Object.keys(totals).forEach((key) => {
        totals[key] = round(items.reduce((value, row) => value + Number(row.values?.[key] || 0), 0));
      });
      totalRow.values = totals;
    }
    return { ...table, rows };
  }),
}));

