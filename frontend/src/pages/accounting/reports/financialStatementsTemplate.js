import { formatPersianNumber, toEnglishDigits } from '../../../core/utils/numberUtils';

/**
 * ساختار صورت‌های مالی بر پایهٔ الگوی رسمی سازمان حسابرسی (فایل 384-v1).
 * هر ردیف یا مقدار خودکار از دفاتر دارد (source) یا با فرمول از ردیف‌های
 * دیگر محاسبه می‌شود (formula). مقادیر قابل ویرایش در state صفحه نگهداری
 * می‌شوند و جمع‌های فرمولی به‌صورت زنده بازمحاسبه می‌شوند.
 */

const section = (id, label, extra = {}) => ({ id, label, kind: 'section', ...extra });
const item = (id, label, extra = {}) => ({ id, label, kind: 'item', indent: 1, ...extra });
const subtotal = (id, label, formula, extra = {}) => ({ id, label, kind: 'subtotal', formula, ...extra });
const total = (id, label, formula, extra = {}) => ({ id, label, kind: 'total', formula, ...extra });

export const REPORT_TITLE = 'صورت‌های مالی';
export const REPORT_EDITION = 'ویرایش ۱۴۰۵';

export const AMOUNT_COLUMNS = [
  { key: 'current', label: 'سال جاری', short: 'جاری' },
  { key: 'prior', label: 'سال قبل (تجدید ارائه شده)', short: 'سال قبل' },
];

export const BALANCE_COLUMNS = [
  { key: 'current', label: 'پایان سال جاری', short: 'پایان سال' },
  { key: 'prior', label: 'پایان سال قبل', short: 'سال قبل' },
  { key: 'opening', label: 'ابتدای سال قبل', short: 'ابتدای دوره' },
];

export const EQUITY_COLUMNS = [
  { key: 'capital', label: 'سرمایه', short: 'سرمایه' },
  { key: 'capital_in_progress', label: 'افزایش سرمایه در جریان', short: 'سرمایه در جریان' },
  { key: 'share_premium', label: 'صرف سهام', short: 'صرف سهام' },
  { key: 'treasury_premium', label: 'صرف سهام خزانه', short: 'صرف خزانه' },
  { key: 'legal_reserve', label: 'اندوخته قانونی', short: 'اندوخته قانونی' },
  { key: 'other_reserves', label: 'سایر اندوخته‌ها', short: 'سایر اندوخته‌ها' },
  { key: 'revaluation', label: 'مازاد تجدید ارزیابی', short: 'تجدید ارزیابی' },
  { key: 'retained', label: 'سود انباشته', short: 'سود انباشته' },
  { key: 'treasury_shares', label: 'سهام خزانه', short: 'سهام خزانه' },
  { key: 'total', label: 'جمع کل', short: 'جمع', totalColumn: true },
];

export const REPORT_PAGES = [
  {
    id: 'cover', kind: 'cover', title: 'جلد گزارش', short: 'جلد', page: '—',
    group: 'مقدمه', icon: 'book', subtitle: 'شناسنامهٔ صورت‌های مالی',
  },
  {
    id: 'toc', kind: 'toc', title: 'فهرست اجزای صورت‌های مالی', short: 'فهرست', page: '۱',
    group: 'مقدمه', icon: 'list', subtitle: 'راهنمای صفحات و یادداشت‌ها',
  },
  {
    id: 'income', kind: 'statement', statement: 'income', title: 'صورت سود و زیان', short: 'سود و زیان', page: '۲',
    group: 'صورت‌های مالی اساسی', icon: 'income', subtitle: 'عملکرد مالی دوره',
    noteRefs: '۵، ۷، ۸، ۹، ۱۰، ۱۱، ۱۲، ۱۳، ۱۴، ۱۵',
  },
  {
    id: 'comprehensive', kind: 'statement', statement: 'comprehensive', title: 'صورت سود و زیان جامع', short: 'سود جامع', page: '۳',
    group: 'صورت‌های مالی اساسی', icon: 'comprehensive', subtitle: 'سود خالص و سایر اقلام سود و زیان جامع',
    noteRefs: '۱۶، ۴۰',
  },
  {
    id: 'balance-assets', kind: 'statement', statement: 'balanceAssets', title: 'صورت وضعیت مالی — دارایی‌ها', short: 'دارایی‌ها', page: '۴',
    group: 'صورت‌های مالی اساسی', icon: 'assets', subtitle: 'منابع اقتصادی و مصارف سرمایه',
    noteRefs: '۱۶ تا ۲۷، ۳۵',
  },
  {
    id: 'balance-liabilities', kind: 'statement', statement: 'balanceLiabilities', title: 'صورت وضعیت مالی — حقوق مالکانه و بدهی‌ها', short: 'بدهی و حقوق', page: '۵',
    group: 'صورت‌های مالی اساسی', icon: 'liabilities', subtitle: 'تعهدات و حقوق صاحبان سهام',
    noteRefs: '۲۸ تا ۴۱',
  },
  {
    id: 'equity', kind: 'statement', statement: 'equity', title: 'صورت تغییرات در حقوق مالکانه', short: 'تغییرات حقوق', page: '۶-۷',
    group: 'صورت‌های مالی اساسی', icon: 'equity', subtitle: 'حرکت اقلام حقوق صاحبان سهام',
    noteRefs: '۲۸ تا ۳۳، ۴۰',
  },
  {
    id: 'cashflow', kind: 'statement', statement: 'cashflow', title: 'صورت جریان‌های نقدی', short: 'جریان نقد', page: '۸-۹',
    group: 'صورت‌های مالی اساسی', icon: 'cash', subtitle: 'جریان‌های عملیاتی، سرمایه‌گذاری و تأمین مالی',
    noteRefs: '۴۳، ۴۴',
  },
  {
    id: 'notes', kind: 'notes', title: 'فهرست یادداشت‌های توضیحی', short: 'یادداشت‌ها', page: '۱۰-۵۷+',
    group: 'یادداشت‌ها', icon: 'notes', subtitle: 'افشای تکمیلی، جداول و رویه‌های حسابداری',
    noteRefs: 'صفحات ۱۰ تا ۵۷',
  },
];

export const STATEMENTS = {
  income: {
    title: 'صورت سود و زیان',
    columns: AMOUNT_COLUMNS,
    unit: 'مبالغ به ریال',
    rows: [
      section('continuing', 'عملیات در حال تداوم', { standard: 'پ ۱-۵۲' }),
      item('revenue', 'درآمدهای عملیاتی', { note: '۵', standard: 'الف ۱-۸۳' }),
      item('cogs', 'بهای تمام‌شده درآمدهای عملیاتی', { note: '۷', standard: '۱-۹۷', expense: true }),
      subtotal('gross_profit', 'سود ناخالص', [
        { id: 'revenue', sign: 1 }, { id: 'cogs', sign: -1 },
      ]),
      item('sga', 'هزینه‌های فروش، اداری و عمومی', { note: '۸', standard: '۱-۸۶', expense: true }),
      item('impairment', 'زیان کاهش ارزش دریافتنی‌ها', { note: '۹', standard: '۱-۸۶', expense: true }),
      item('other_income', 'سایر درآمدها', { note: '۱۰', standard: '۱-۸۶' }),
      item('other_expenses', 'سایر هزینه‌ها', { note: '۱۱', standard: '۱-۸۶', expense: true }),
      subtotal('operating_profit', 'سود عملیاتی', [
        { id: 'gross_profit', sign: 1 }, { id: 'sga', sign: -1 },
        { id: 'impairment', sign: -1 }, { id: 'other_income', sign: 1 },
        { id: 'other_expenses', sign: -1 },
      ]),
      item('finance_cost', 'هزینه‌های مالی', { note: '۱۲', standard: 'ب ۱-۸۳', expense: true }),
      item('non_operating', 'سایر درآمدها و هزینه‌های غیرعملیاتی', { note: '۱۳' }),
      subtotal('pbt', 'سود عملیات در حال تداوم قبل از مالیات', [
        { id: 'operating_profit', sign: 1 }, { id: 'finance_cost', sign: -1 },
        { id: 'non_operating', sign: 1 },
      ]),
      item('tax', 'هزینه مالیات بر درآمد', { note: '۳۶-۴', standard: '۱-۳۵ و ۳۵-۷۶', expense: true }),
      subtotal('net_continuing', 'سود خالص عملیات در حال تداوم', [
        { id: 'pbt', sign: 1 }, { id: 'tax', sign: -1 },
      ]),
      section('discontinued_section', 'عملیات متوقف‌شده'),
      item('discontinued', 'سود (زیان) خالص عملیات متوقف‌شده', { note: '۱۴', standard: 'ث ۱-۸۳' }),
      total('net_profit', 'سود خالص', [
        { id: 'net_continuing', sign: 1 }, { id: 'discontinued', sign: 1 },
      ]),
      section('eps_section', 'سود هر سهم', { standard: '۳۰-۳۴' }),
      item('eps_operating', 'سود پایه هر سهم — عملیاتی (ریال)', { note: '۱۵', standard: '۳۰-۳۱' }),
      item('eps_non_operating', 'سود پایه هر سهم — غیرعملیاتی (ریال)', { standard: '۳۰-۳۱' }),
      item('eps_continuing', 'ناشی از عملیات در حال تداوم (ریال)', { standard: '۳۰-۳۱' }),
      item('eps_discontinued', 'ناشی از عملیات متوقف‌شده (ریال)', { standard: '۳۰-۳۳' }),
      total('eps_total', 'سود پایه هر سهم (ریال)', [
        { id: 'eps_continuing', sign: 1 }, { id: 'eps_discontinued', sign: 1 },
      ], { standard: '۱-۸۶', note: '۱۵' }),
    ],
    footnote: 'یادداشت‌های توضیحی، بخش جدایی‌ناپذیر صورت‌های مالی است.',
  },
  comprehensive: {
    title: 'صورت سود و زیان جامع',
    columns: AMOUNT_COLUMNS,
    unit: 'مبالغ به ریال',
    rows: [
      item('net_profit', 'سود خالص', { note: '۲', standard: 'پ ۱-۵۲', indent: 0 }),
      section('oci_no_reclass', 'سایر اقلام سود و زیان جامع که در دوره‌های آتی به صورت سود و زیان تجدید طبقه‌بندی نخواهد شد:', { standard: 'الف ۱-۱۰۰' }),
      item('revaluation', 'مازاد تجدید ارزیابی دارایی‌های ثابت مشهود', { note: '۱۶', standard: '۱۱-۸۱' }),
      item('tax_revaluation', 'مالیات بر درآمد اقلام فوق', { expense: true }),
      section('oci_reclass', 'سایر اقلام سود و زیان جامع که در دوره‌های آتی به صورت سود و زیان تجدید طبقه‌بندی خواهد شد:'),
      item('fx_translation', 'تفاوت تسعیر ارز عملیات خارجی', { note: '۱۶' }),
      item('tax_fx', 'مالیات بر درآمد اقلام فوق', { expense: true }),
      subtotal('oci_total', 'سایر اقلام سود و زیان جامع پس از کسر مالیات', [
        { id: 'revaluation', sign: 1 }, { id: 'tax_revaluation', sign: -1 },
        { id: 'fx_translation', sign: 1 }, { id: 'tax_fx', sign: -1 },
      ]),
      total('total_comprehensive', 'سود جامع', [
        { id: 'net_profit', sign: 1 }, { id: 'oci_total', sign: 1 },
      ]),
    ],
    footnote: 'یادداشت‌های توضیحی، بخش جدایی‌ناپذیر صورت‌های مالی است.',
  },
  balanceAssets: {
    title: 'صورت وضعیت مالی',
    columns: BALANCE_COLUMNS,
    unit: 'مبالغ به ریال',
    rows: [
      section('assets', 'دارایی‌ها'),
      section('noncurrent', 'دارایی‌های غیرجاری'),
      item('fixed_assets', 'دارایی‌های ثابت مشهود', { note: '۱۶', standard: 'الف ۱-۵۵' }),
      item('investment_property', 'سرمایه‌گذاری در املاک', { note: '۱۷', standard: 'ب ۱-۵۵' }),
      item('intangible_assets', 'دارایی‌های نامشهود', { note: '۱۸', standard: 'پ ۱-۵۵' }),
      item('long_term_investments', 'سرمایه‌گذاری‌های بلندمدت', { note: '۱۹', standard: 'ت ۱-۵۵' }),
      item('long_term_receivables', 'دریافتنی‌های تجاری و سایر دریافتنی‌ها', { note: '۲۰', standard: 'ت ۱-۵۵' }),
      item('deferred_tax_asset', 'دارایی مالیات انتقالی', { note: '۳۵', standard: 'ش ۱-۵۵' }),
      item('other_noncurrent_assets', 'سایر دارایی‌های غیرجاری', { note: '۲۱', standard: '۱-۵۶' }),
      subtotal('total_noncurrent_assets', 'جمع دارایی‌های غیرجاری', [
        { id: 'fixed_assets', sign: 1 }, { id: 'investment_property', sign: 1 },
        { id: 'intangible_assets', sign: 1 }, { id: 'long_term_investments', sign: 1 },
        { id: 'long_term_receivables', sign: 1 }, { id: 'deferred_tax_asset', sign: 1 },
        { id: 'other_noncurrent_assets', sign: 1 },
      ]),
      section('current_assets', 'دارایی‌های جاری'),
      item('prepayments', 'پیش‌پرداخت‌ها', { note: '۲۲', standard: 'خ ۱-۵۵' }),
      item('inventory', 'موجودی مواد و کالا', { note: '۲۳', standard: 'چ ۱-۵۵' }),
      item('contract_assets', 'دارایی‌های حاصل از قرارداد', { note: '۲۴', standard: '(الف) ۴۳-۱۱۶' }),
      item('trade_receivables', 'دریافتنی‌های تجاری و سایر دریافتنی‌ها', { note: '۲۰', standard: 'ح ۱-۵۵' }),
      item('short_term_investments', 'سرمایه‌گذاری‌های کوتاه‌مدت', { note: '۲۵', standard: 'ت ۱-۵۵' }),
      item('cash', 'موجودی نقد', { note: '۲۶', standard: 'د ۱-۵۵' }),
      item('assets_held_for_sale', 'دارایی‌های غیرجاری نگهداری‌شده برای فروش', { note: '۲۷', standard: 'ذ ۱-۵۵ و ۳۱-۳۷' }),
      item('other_current_assets', 'سایر دارایی‌های جاری'),
      subtotal('total_current_assets', 'جمع دارایی‌های جاری', [
        { id: 'prepayments', sign: 1 }, { id: 'inventory', sign: 1 },
        { id: 'contract_assets', sign: 1 }, { id: 'trade_receivables', sign: 1 },
        { id: 'short_term_investments', sign: 1 }, { id: 'cash', sign: 1 },
        { id: 'assets_held_for_sale', sign: 1 }, { id: 'other_current_assets', sign: 1 },
      ]),
      total('total_assets', 'جمع دارایی‌ها', [
        { id: 'total_noncurrent_assets', sign: 1 }, { id: 'total_current_assets', sign: 1 },
      ], { sourceTotal: true }),
    ],
    footnote: 'یادداشت‌های توضیحی، بخش جدایی‌ناپذیر صورت‌های مالی است.',
  },
  balanceLiabilities: {
    title: 'صورت وضعیت مالی',
    columns: BALANCE_COLUMNS,
    unit: 'مبالغ به ریال',
    rows: [
      section('equity_liabilities', 'حقوق مالکانه و بدهی‌ها'),
      section('equity', 'حقوق مالکانه'),
      item('share_capital', 'سرمایه', { note: '۲۸', standard: 'ظ ۱-۵۵' }),
      item('capital_in_progress', 'افزایش سرمایه در جریان', { note: '۲۹', standard: 'ث ۱-۸۰' }),
      item('share_premium', 'صرف سهام', { note: '۳۰', standard: 'ث ۱-۸۰' }),
      item('treasury_premium', 'صرف سهام خزانه', { standard: 'ث ۱-۸۰' }),
      item('legal_reserve', 'اندوخته قانونی', { note: '۳۱', standard: 'ث ۱-۸۰' }),
      item('other_reserves', 'سایر اندوخته‌ها', { note: '۳۲', standard: 'ث ۱-۸۰' }),
      item('revaluation_surplus', 'مازاد تجدید ارزیابی دارایی‌ها', { standard: '۱۱-۸۱ و ۱۷-۹۶' }),
      item('retained_earnings', 'سود انباشته', { standard: '۱-۵۶' }),
      item('treasury_shares', 'سهام خزانه', { note: '۳۳', standard: '۳۵-۳۶', expense: true }),
      item('other_equity', 'سایر اقلام حقوق مالکانه'),
      total('total_equity', 'جمع حقوق مالکانه', [
        { id: 'share_capital', sign: 1 }, { id: 'capital_in_progress', sign: 1 },
        { id: 'share_premium', sign: 1 }, { id: 'treasury_premium', sign: 1 },
        { id: 'legal_reserve', sign: 1 }, { id: 'other_reserves', sign: 1 },
        { id: 'revaluation_surplus', sign: 1 }, { id: 'retained_earnings', sign: 1 },
        { id: 'treasury_shares', sign: -1 }, { id: 'other_equity', sign: 1 },
      ], { sourceTotal: true }),
      section('liabilities', 'بدهی‌ها'),
      section('noncurrent_liabilities', 'بدهی‌های غیرجاری'),
      item('long_term_payables', 'پرداختنی‌های تجاری و سایر پرداختنی‌ها', { note: '۳۴', standard: 'ر ۱-۵۵' }),
      item('long_term_facilities', 'تسهیلات مالی بلندمدت', { note: '۳۵', standard: 'ژ ۱-۵۵' }),
      item('deferred_tax_liability', 'بدهی مالیات انتقالی', { note: '۳۶', standard: 'رش ۱-۵۵' }),
      item('employee_benefits', 'ذخیره مزایای پایان خدمت کارکنان', { note: '۳۷', standard: 'ز ۱-۵۵' }),
      item('other_noncurrent_liabilities', 'سایر بدهی‌های غیرجاری'),
      subtotal('total_noncurrent_liabilities', 'جمع بدهی‌های غیرجاری', [
        { id: 'long_term_payables', sign: 1 }, { id: 'long_term_facilities', sign: 1 },
        { id: 'deferred_tax_liability', sign: 1 }, { id: 'employee_benefits', sign: 1 },
        { id: 'other_noncurrent_liabilities', sign: 1 },
      ]),
      section('current_liabilities', 'بدهی‌های جاری'),
      item('trade_payables', 'پرداختنی‌های تجاری و سایر پرداختنی‌ها', { note: '۳۴', standard: 'ر ۱-۵۵' }),
      item('tax_payable', 'مالیات پرداختنی', { note: '۳۶', standard: 'س ۱-۵۵' }),
      item('dividends_payable', 'سود سهام پرداختنی', { note: '۳۸', standard: 'ژ ۱-۵۵' }),
      item('short_term_facilities', 'تسهیلات مالی', { note: '۳۵', standard: 'ژ ۱-۵۵' }),
      item('provisions', 'ذخایر', { note: '۳۹', standard: 'ز ۱-۵۵' }),
      item('contract_liabilities', 'بدهی‌های ناشی از قرارداد', { note: '۴۰', standard: '(الف) ۴۳-۱۱۶' }),
      item('advances', 'پیش‌دریافت‌ها', { note: '۴۱', standard: 'ص ۱-۵۵' }),
      item('liabilities_held_for_sale', 'بدهی‌های مرتبط با دارایی‌های غیرجاری نگهداری‌شده برای فروش', { note: '۲۷', standard: 'ض ۱-۵۵ و ۳۱-۳۷' }),
      item('other_current_liabilities', 'سایر بدهی‌های جاری'),
      subtotal('total_current_liabilities', 'جمع بدهی‌های جاری', [
        { id: 'trade_payables', sign: 1 }, { id: 'tax_payable', sign: 1 },
        { id: 'dividends_payable', sign: 1 }, { id: 'short_term_facilities', sign: 1 },
        { id: 'provisions', sign: 1 }, { id: 'contract_liabilities', sign: 1 },
        { id: 'advances', sign: 1 }, { id: 'liabilities_held_for_sale', sign: 1 },
        { id: 'other_current_liabilities', sign: 1 },
      ]),
      total('total_liabilities', 'جمع بدهی‌ها', [
        { id: 'total_noncurrent_liabilities', sign: 1 }, { id: 'total_current_liabilities', sign: 1 },
      ], { sourceTotal: true }),
      total('total_equity_liabilities', 'جمع حقوق مالکانه و بدهی‌ها', [
        { id: 'total_equity', sign: 1 }, { id: 'total_liabilities', sign: 1 },
      ]),
    ],
    footnote: 'یادداشت‌های توضیحی، بخش جدایی‌ناپذیر صورت‌های مالی است.',
  },
  equity: {
    title: 'صورت تغییرات در حقوق مالکانه',
    columns: EQUITY_COLUMNS,
    unit: 'مبالغ به ریال',
    rows: [
      section('equity_prior', 'تغییرات حقوق مالکانه در سال قبل'),
      item('opening_prior', 'مانده در ابتدای سال قبل', { standard: 'پ ۱-۱۰۸', preserveTotal: true }),
      item('prior_corrections', 'اصلاح اشتباهات و تغییر در رویه‌های حسابداری', { note: '۴۰', standard: 'ب ۱-۱۰۸' }),
      subtotal('restated_opening', 'مانده تجدید ارائه‌شده در ابتدای سال قبل', null),
      item('prior_net_profit', 'سود خالص گزارش‌شده سال قبل', { standard: 'پ ۱-۱۰۸' }),
      item('prior_oci', 'سایر اقلام سود و زیان جامع سال قبل', { standard: 'پ ۱-۱۰۸' }),
      subtotal('prior_comprehensive', 'سود جامع سال قبل', null),
      item('prior_dividends', 'سود سهام مصوب', { standard: '۱-۱۱۰' }),
      item('prior_other', 'سایر تغییرات حقوق مالکانه', { standard: 'پ ۱-۱۰۸' }),
      subtotal('opening_current', 'مانده تجدید ارائه‌شده در ابتدای سال جاری', null, { preserveTotal: true }),
      section('equity_current', 'تغییرات حقوق مالکانه در سال جاری'),
      item('net_profit', 'سود خالص سال جاری', { standard: 'پ ۱-۱۰۸' }),
      item('oci', 'سایر اقلام سود و زیان جامع پس از کسر مالیات', { standard: 'پ ۱-۱۰۸' }),
      subtotal('comprehensive', 'سود جامع سال جاری', null),
      item('dividends', 'سود سهام مصوب', { standard: '۱-۱۱۰' }),
      item('capital_increase', 'افزایش سرمایه', { standard: 'پ ۱-۱۰۸' }),
      item('capital_in_progress_change', 'افزایش سرمایه در جریان', { standard: 'پ ۱-۱۰۸' }),
      item('treasury_purchase', 'خرید سهام خزانه', { standard: 'پ ۱-۱۰۸' }),
      item('treasury_sale', 'فروش سهام خزانه', { standard: 'پ ۱-۱۰۸' }),
      item('equity_transfer', 'انتقال از سایر اقلام حقوق مالکانه به سود انباشته', { standard: 'پ ۱-۱۰۸' }),
      item('legal_reserve_allocation', 'تخصیص به اندوخته قانونی', { standard: 'پ ۱-۱۰۸' }),
      item('other_reserve_allocation', 'تخصیص به سایر اندوخته‌ها', { standard: 'پ ۱-۱۰۸' }),
      total('closing', 'مانده در پایان سال جاری', null, { preserveTotal: true }),
    ],
    footnote: 'یادداشت‌های توضیحی، بخش جدایی‌ناپذیر صورت‌های مالی است.',
  },
  cashflow: {
    title: 'صورت جریان‌های نقدی',
    columns: AMOUNT_COLUMNS,
    unit: 'مبالغ به ریال',
    rows: [
      section('operating', 'جریان‌های نقدی حاصل از فعالیت‌های عملیاتی', { standard: '۲-۹' }),
      item('operating_in', 'وجه نقد حاصل از عملیات', { note: '۴۳', standard: '۲-۱۲' }),
      item('operating_out', 'پرداخت‌های نقدی بابت مالیات بر درآمد و هزینه‌های عملیاتی', { standard: '۲-۳۲', expense: true }),
      subtotal('operating_net', 'جریان خالص ورود (خروج) وجه نقد حاصل از فعالیت‌های عملیاتی', [
        { id: 'operating_in', sign: 1 }, { id: 'operating_out', sign: -1 },
      ]),
      section('investing', 'جریان‌های نقدی حاصل از فعالیت‌های سرمایه‌گذاری', { standard: '۲-۹' }),
      item('sale_fixed_assets', 'دریافت‌های نقدی از فروش دارایی‌های ثابت مشهود', { standard: 'ب ۲-۱۵' }),
      item('purchase_fixed_assets', 'پرداخت‌های نقدی برای خرید دارایی‌های ثابت مشهود', { standard: 'الف ۲-۱۵', expense: true }),
      item('sale_assets_held_for_sale', 'دریافت‌های نقدی از فروش دارایی‌های غیرجاری نگهداری‌شده برای فروش'),
      item('sale_intangible', 'دریافت‌های نقدی از فروش دارایی‌های نامشهود', { standard: 'ب ۲-۱۵' }),
      item('purchase_intangible', 'پرداخت‌های نقدی برای خرید دارایی‌های نامشهود', { standard: 'الف ۲-۱۵', expense: true }),
      item('sale_long_term_investments', 'دریافت‌های نقدی از فروش سرمایه‌گذاری‌های بلندمدت', { standard: 'ت ۲-۱۵' }),
      item('purchase_long_term_investments', 'پرداخت‌های نقدی برای تحصیل سرمایه‌گذاری‌های بلندمدت', { standard: 'پ ۲-۱۵', expense: true }),
      item('sale_investment_property', 'دریافت‌های نقدی از فروش سرمایه‌گذاری در املاک', { standard: 'ت ۲-۱۵' }),
      item('purchase_investment_property', 'پرداخت‌های نقدی برای تحصیل سرمایه‌گذاری در املاک', { standard: 'پ ۲-۱۵', expense: true }),
      item('sale_short_term_investments', 'دریافت‌های نقدی از فروش سرمایه‌گذاری‌های کوتاه‌مدت', { standard: 'ت ۲-۱۵' }),
      item('purchase_short_term_investments', 'پرداخت‌های نقدی برای تحصیل سرمایه‌گذاری‌های کوتاه‌مدت', { standard: 'پ ۲-۱۵', expense: true }),
      item('loans_granted', 'پرداخت‌های نقدی بابت تسهیلات اعطایی به دیگران', { standard: 'ث ۲-۱۵', expense: true }),
      item('loans_repaid', 'دریافت‌های نقدی از استرداد تسهیلات اعطایی به دیگران', { standard: 'ج ۲-۱۵' }),
      item('interest_received', 'دریافت‌های نقدی از سود تسهیلات اعطایی به دیگران', { standard: '۲-۳۱' }),
      item('dividends_received', 'دریافت‌های نقدی از سود سهام', { standard: '۲-۳۱' }),
      item('other_investment_income', 'دریافت‌های نقدی از سود سایر سرمایه‌گذاری‌ها', { standard: '۲-۲۹' }),
      subtotal('investing_net', 'جریان خالص ورود (خروج) وجه نقد حاصل از فعالیت‌های سرمایه‌گذاری', [
        { id: 'sale_fixed_assets', sign: 1 }, { id: 'purchase_fixed_assets', sign: -1 },
        { id: 'sale_assets_held_for_sale', sign: 1 }, { id: 'sale_intangible', sign: 1 },
        { id: 'purchase_intangible', sign: -1 }, { id: 'sale_long_term_investments', sign: 1 },
        { id: 'purchase_long_term_investments', sign: -1 }, { id: 'sale_investment_property', sign: 1 },
        { id: 'purchase_investment_property', sign: -1 }, { id: 'sale_short_term_investments', sign: 1 },
        { id: 'purchase_short_term_investments', sign: -1 }, { id: 'loans_granted', sign: -1 },
        { id: 'loans_repaid', sign: 1 }, { id: 'interest_received', sign: 1 },
        { id: 'dividends_received', sign: 1 }, { id: 'other_investment_income', sign: 1 },
      ], { sourceTotal: true }),
      section('financing', 'جریان‌های نقدی حاصل از فعالیت‌های تأمین مالی', { standard: '۲-۹' }),
      item('capital_increase_cash', 'دریافت‌های نقدی از افزایش سرمایه', { standard: 'الف ۲-۱۶' }),
      item('share_premium_cash', 'دریافت‌های نقدی از صرف سهام', { standard: 'الف ۲-۱۶' }),
      item('treasury_sale_cash', 'دریافت‌های نقدی از فروش سهام خزانه', { standard: 'الف ۲-۱۶' }),
      item('treasury_purchase_cash', 'پرداخت‌های نقدی برای خرید سهام خزانه', { standard: 'ب ۲-۱۶', expense: true }),
      item('facilities_received', 'دریافت‌های نقدی از تسهیلات', { standard: 'پ ۲-۱۶' }),
      item('facilities_repaid', 'پرداخت‌های نقدی بابت اصل تسهیلات', { standard: 'ت ۲-۱۶', expense: true }),
      item('facilities_interest_paid', 'پرداخت‌های نقدی بابت سود تسهیلات', { standard: '۲-۳۱', expense: true }),
      item('bonds_received', 'دریافت‌های نقدی از انتشار اوراق مشارکت', { standard: 'پ ۲-۱۶' }),
      item('bonds_repaid', 'پرداخت‌های نقدی بابت اصل اوراق مشارکت', { standard: 'ت ۲-۱۶', expense: true }),
      item('bonds_interest_paid', 'پرداخت‌های نقدی بابت سود اوراق مشارکت', { standard: 'ت ۲-۱۶', expense: true }),
      item('sukuk_received', 'دریافت‌های نقدی از انتشار اوراق خرید دین', { standard: 'پ ۲-۱۶' }),
      item('sukuk_repaid', 'پرداخت‌های نقدی بابت اصل اوراق خرید دین', { standard: 'ت ۲-۱۶', expense: true }),
      item('sukuk_interest_paid', 'پرداخت‌های نقدی بابت سود اوراق خرید دین', { standard: 'ت ۲-۱۶', expense: true }),
      item('lease_paid', 'پرداخت‌های نقدی بابت اصل اقساط اجاره سرمایه‌ای', { standard: 'ث ۲-۱۶', expense: true }),
      item('lease_interest_paid', 'پرداخت‌های نقدی بابت سود اجاره سرمایه‌ای', { standard: 'ث ۲-۱۶', expense: true }),
      item('dividends_paid', 'پرداخت‌های نقدی بابت سود سهام', { standard: '۲-۳۱', expense: true }),
      subtotal('financing_net', 'جریان خالص ورود (خروج) وجه نقد حاصل از فعالیت‌های تأمین مالی', [
        { id: 'capital_increase_cash', sign: 1 }, { id: 'share_premium_cash', sign: 1 },
        { id: 'treasury_sale_cash', sign: 1 }, { id: 'treasury_purchase_cash', sign: -1 },
        { id: 'facilities_received', sign: 1 }, { id: 'facilities_repaid', sign: -1 },
        { id: 'facilities_interest_paid', sign: -1 }, { id: 'bonds_received', sign: 1 },
        { id: 'bonds_repaid', sign: -1 }, { id: 'bonds_interest_paid', sign: -1 },
        { id: 'sukuk_received', sign: 1 }, { id: 'sukuk_repaid', sign: -1 },
        { id: 'sukuk_interest_paid', sign: -1 }, { id: 'lease_paid', sign: -1 },
        { id: 'lease_interest_paid', sign: -1 }, { id: 'dividends_paid', sign: -1 },
      ], { sourceTotal: true }),
      subtotal('net_change', 'خالص افزایش (کاهش) در موجودی نقد', [
        { id: 'operating_net', sign: 1 }, { id: 'investing_net', sign: 1 },
        { id: 'financing_net', sign: 1 },
      ]),
      item('beginning_cash', 'مانده موجودی نقد در ابتدای سال', { standard: '۲-۴۹' }),
      item('fx_effect', 'تأثیر تغییرات نرخ ارز', { standard: '۲-۲۸' }),
      total('ending_cash', 'مانده موجودی نقد در پایان سال', [
        { id: 'net_change', sign: 1 }, { id: 'beginning_cash', sign: 1 },
        { id: 'fx_effect', sign: 1 },
      ], { standard: '۲-۴۹' }),
    ],
    footnote: 'یادداشت‌های توضیحی، بخش جدایی‌ناپذیر صورت‌های مالی است.',
  },
};

export const NOTE_SECTIONS = [
  { id: 'history', number: '۱', title: 'تاریخچه و فعالیت شرکت', page: '۱۰', hint: 'معرفی شرکت، موضوع فعالیت و ساختار حقوقی' },
  { id: 'basis', number: '۲', title: 'مبنای تهیهٔ صورت‌های مالی', page: '۱۱', hint: 'استانداردهای حسابداری و مبنای اندازه‌گیری' },
  { id: 'policies', number: '۳', title: 'اهم رویه‌های حسابداری', page: '۱۲-۲۰', hint: 'رویه‌های شناسایی درآمد، دارایی‌ها و بدهی‌ها' },
  { id: 'fixed_assets', number: '۴', title: 'دارایی‌های ثابت مشهود', page: '۲۱-۲۴', hint: 'بهای تمام‌شده، استهلاک و تجدید ارزیابی' },
  { id: 'investments', number: '۵', title: 'سرمایه‌گذاری‌ها و املاک', page: '۲۵-۲۹', hint: 'سرمایه‌گذاری بلندمدت، کوتاه‌مدت و املاک' },
  { id: 'receivables', number: '۶', title: 'دریافتنی‌ها و موجودی‌ها', page: '۳۰-۳۴', hint: 'دریافتنی‌های تجاری، پیش‌پرداخت‌ها و موجودی مواد و کالا' },
  { id: 'cash', number: '۷', title: 'موجودی نقد و سرمایه‌گذاری کوتاه‌مدت', page: '۳۵-۳۷', hint: 'موجودی نزد بانک‌ها و تنخواه' },
  { id: 'equity', number: '۸', title: 'سرمایه، اندوخته‌ها و سود انباشته', page: '۳۸-۴۲', hint: 'تغییرات حقوق مالکانه و سود سهام' },
  { id: 'liabilities', number: '۹', title: 'بدهی‌ها و ذخایر', page: '۴۳-۴۷', hint: 'پرداختنی‌ها، تسهیلات و مزایای پایان خدمت' },
  { id: 'tax', number: '۱۰', title: 'مالیات بر درآمد', page: '۴۸-۵۰', hint: 'مالیات جاری، انتقالی و آشتی مالیات' },
  { id: 'income', number: '۱۱', title: 'درآمدها و هزینه‌ها', page: '۵۱-۵۵', hint: 'تفکیک درآمد عملیاتی و هزینه‌ها' },
  { id: 'related', number: '۱۲', title: 'معاملات با اشخاص وابسته', page: '۵۶-۵۸', hint: 'طرف‌های وابسته و مانده‌های بین‌گروهی' },
  { id: 'commitments', number: '۱۳', title: 'تعهدات و رویدادهای بعدی', page: '۵۹-۶۲', hint: 'تعهدات سرمایه‌ای، ضمانت‌ها و رویدادهای پس از تاریخ گزارش' },
  { id: 'segments', number: '۱۴', title: 'گزارش‌گری بر حسب قسمت‌ها', page: '۶۳-۷۹', hint: 'اطلاعات تفکیکی فعالیت‌ها و بازارها' },
];

const num = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

const pair = (current, prior) => ({ current: num(current), prior: num(prior) });
const triple = (current, prior, opening) => ({
  current: num(current), prior: num(prior), opening: num(opening),
});

const valueOf = (values, rowId, columnKey) => {
  const row = values?.[rowId];
  if (!row) return null;
  return num(row[columnKey]);
};

export const normText = (value) => String(value || '')
  .replace(/\u200c/g, '')
  .replace(/[يى]/g, 'ی')
  .replace(/ك/g, 'ک')
  .replace(/\s+/g, '');

const norm = normText;

export const ASSET_MATCHERS = [
  {
    id: 'fixed_assets',
    words: [
      'دارایی ثابت', 'داراییهای ثابت', 'دارایی‌های ثابت', 'اموال', 'ماشین', 'تجهیزات',
      'ساختمان', 'ابنیه', 'اثاثه', 'وسایل نقلیه', 'تاسیسات', 'تأسیسات', 'در جریان تکمیل',
    ],
  },
  { id: 'investment_property', words: ['املاک', 'سرمایه‌گذاری در املاک'] },
  { id: 'intangible_assets', words: ['نامشهود'] },
  {
    id: 'long_term_receivables',
    words: ['دریافتنی بلندمدت', 'دریافتنی‌های بلندمدت', 'دریافتنیهای بلندمدت'],
  },
  {
    id: 'long_term_investments',
    words: ['سرمایه‌گذاری بلندمدت', 'سرمایه‌گذاری‌های بلندمدت', 'سرمایهگذاریهای بلندمدت'],
  },
  { id: 'deferred_tax_asset', words: ['مالیات انتقالی', 'مالیات معوق'] },
  { id: 'prepayments', words: ['پیش‌پرداخت', 'پیش پرداخت'] },
  { id: 'cash', words: ['موجودی نقد', 'نقد', 'بانک', 'صندوق', 'تنخواه'] },
  { id: 'inventory', words: ['موجودی مواد', 'موجودی کالا', 'موجودی‌ها'] },
  { id: 'contract_assets', words: ['قرارداد'] },
  { id: 'trade_receivables', words: ['دریافتنی', 'مطالبات'] },
  {
    id: 'short_term_investments',
    words: ['سرمایه‌گذاری کوتاه', 'سرمایه‌گذاری‌های کوتاه', 'سرمایهگذاریهای کوتاه'],
  },
  { id: 'assets_held_for_sale', words: ['نگهداری برای فروش', 'نگهداری‌شده برای فروش'] },
];

export const LIABILITY_MATCHERS = [
  {
    id: 'long_term_payables',
    words: ['پرداختنی بلندمدت', 'پرداختنی‌های بلندمدت', 'پرداختنیهای بلندمدت'],
  },
  {
    id: 'long_term_facilities',
    words: ['تسهیلات بلندمدت', 'تسهیلات مالی بلندمدت', 'تسهیلات مالی بلند مدت'],
  },
  { id: 'employee_benefits', words: ['مزایای پایان خدمت', 'ذخیره مزایا'] },
  { id: 'deferred_tax_liability', words: ['مالیات انتقالی', 'مالیات معوق'] },
  { id: 'tax_payable', words: ['مالیات پرداختنی'] },
  { id: 'dividends_payable', words: ['سود سهام'] },
  { id: 'trade_payables', words: ['پرداختنی', 'بستانکار'] },
  { id: 'short_term_facilities', words: ['تسهیلات', 'وام'] },
  { id: 'provisions', words: ['ذخایر', 'ذخیره'] },
  { id: 'contract_liabilities', words: ['قرارداد'] },
  { id: 'advances', words: ['پیش‌دریافت', 'پیش دریافت'] },
  { id: 'liabilities_held_for_sale', words: ['نگهداری برای فروش', 'نگهداری‌شده برای فروش'] },
];

export const EQUITY_MATCHERS = [
  { id: 'capital_in_progress', words: ['افزایش سرمایه در جریان', 'سرمایه در جریان'] },
  { id: 'treasury_premium', words: ['صرف سهام خزانه'] },
  { id: 'share_premium', words: ['صرف سهام'] },
  { id: 'legal_reserve', words: ['اندوخته قانونی'] },
  { id: 'other_reserves', words: ['اندوخته'] },
  { id: 'revaluation_surplus', words: ['تجدید ارزیابی'] },
  { id: 'retained_earnings', words: ['سود انباشته', 'سود و زیان'] },
  { id: 'treasury_shares', words: ['سهام خزانه'] },
  { id: 'share_capital', words: ['سرمایه'] },
];

export const groupMatch = (group, matchers) => {
  const name = norm(group?.name);
  return matchers.find((matcher) => matcher.words.some((word) => name.includes(norm(word))))?.id;
};

export const currentAssetFallback = (group) => {
  const name = norm(group?.name);
  const code = String(group?.code || '');
  return code.startsWith('11') || /جاری|کوتاه|نقد|موجودی|دریافتنی|پیش/.test(name)
    ? 'other_current_assets'
    : 'other_noncurrent_assets';
};

export const currentLiabilityFallback = (group) => {
  const name = norm(group?.name);
  const code = String(group?.code || '');
  return code.startsWith('21') || /جاری|پرداختنی|مالیات|سودسهام|پیش|ذخایر/.test(name)
    ? 'other_current_liabilities'
    : 'other_noncurrent_liabilities';
};

/**
 * گروه‌های ترازنامه را یک‌بار به ردیف‌های استاندارد صورت وضعیت مالی نگاشت می‌کند.
 * خروجی، هم برای ساخت صورت‌های اصلی و هم برای یادداشت‌های توضیحی استفاده می‌شود
 * تا جمع یادداشت و ردیف صورت مالی همیشه از یک منبع باشد.
 */
export const classifyBalanceGroups = (balanceData) => {
  const result = { assets: {}, liabilities: {}, equity: {} };
  const add = (side, groups, matchers, fallback) => {
    (groups || []).forEach((group) => {
      const id = groupMatch(group, matchers) || fallback(group);
      if (!id) return;
      const bucket = result[side][id] || (result[side][id] = []);
      if (!bucket.some((item) => String(item.code) === String(group.code) && item.name === group.name)) {
        bucket.push(group);
      }
    });
  };
  add('assets', balanceData?.asset_groups, ASSET_MATCHERS, currentAssetFallback);
  add('liabilities', balanceData?.liability_groups, LIABILITY_MATCHERS, currentLiabilityFallback);
  add('equity', balanceData?.equity_groups, EQUITY_MATCHERS, () => 'other_equity');
  return result;
};

export const groupTotalValue = (group) => {
  const value = Number(group?.total || 0);
  return Number.isFinite(value) ? value : 0;
};

const sumValues = (values) => round(Object.values(values).reduce((sum, value) => sum + Number(value || 0), 0));

const buildBalanceSide = (balanceData) => {
  const assets = {};
  const liabilities = {};
  const equity = {};
  const classified = classifyBalanceGroups(balanceData);
  const flatten = (buckets) => Object.fromEntries(Object.entries(buckets).map(([id, groups]) => [
    id,
    round(groups.reduce((sum, group) => {
      const value = groupTotalValue(group);
      return sum + (id === 'treasury_shares' ? Math.abs(value) : value);
    }, 0)),
  ]));
  Object.assign(assets, flatten(classified.assets));
  Object.assign(liabilities, flatten(classified.liabilities));
  Object.assign(equity, flatten(classified.equity));

  const totalAssets = num(balanceData?.total_assets);
  if (totalAssets !== null && Math.abs(totalAssets - sumValues(assets)) >= 0.01) {
    assets.other_noncurrent_assets = round((assets.other_noncurrent_assets || 0) + totalAssets - sumValues(assets));
  }
  const totalLiabilities = num(balanceData?.total_liabilities);
  if (totalLiabilities !== null && Math.abs(totalLiabilities - sumValues(liabilities)) >= 0.01) {
    liabilities.other_noncurrent_liabilities = round((liabilities.other_noncurrent_liabilities || 0) + totalLiabilities - sumValues(liabilities));
  }
  const totalEquity = num(balanceData?.total_equity);
  if (totalEquity !== null && Math.abs(totalEquity - sumValues(equity)) >= 0.01) {
    equity.other_equity = round((equity.other_equity || 0) + totalEquity - sumValues(equity));
  }
  return { assets, liabilities, equity };
};

const mergeSide = (currentValues, priorValues, openingValues = {}) => {
  const ids = new Set([
    ...Object.keys(currentValues), ...Object.keys(priorValues), ...Object.keys(openingValues),
  ]);
  return Object.fromEntries([...ids].map((id) => [id, triple(
    currentValues[id], priorValues[id], openingValues[id],
  )]));
};

const equityColumnsFor = (side, total) => {
  const treasury = num(side?.treasury_shares);
  const otherReserves = round((num(side?.other_reserves) || 0) + (num(side?.other_equity) || 0));
  return {
    capital: num(side?.share_capital),
    capital_in_progress: num(side?.capital_in_progress),
    share_premium: num(side?.share_premium),
    treasury_premium: num(side?.treasury_premium),
    legal_reserve: num(side?.legal_reserve),
    other_reserves: otherReserves || null,
    revaluation: num(side?.revaluation_surplus),
    retained: num(side?.retained_earnings),
    treasury_shares: treasury === null ? null : -Math.abs(treasury),
    total: num(total),
  };
};

const pnlGroupList = (statement, key) => {
  if (Array.isArray(statement?.[key]) && statement[key].length) return statement[key];
  const rows = statement?.[key.replace('_groups', '_rows')] || [];
  const buckets = {};
  rows.forEach((row) => {
    const bucketKey = `${row.group_code || ''}|${row.group || 'سایر'}`;
    const bucket = buckets[bucketKey] || (buckets[bucketKey] = {
      code: row.group_code || '', name: row.group || 'سایر حساب‌ها', total: 0,
    });
    bucket.total += Number(row.balance || 0);
  });
  return Object.values(buckets);
};

const groupSum = (groups) => round((groups || []).reduce(
  (total, group) => total + Number(group.total || 0), 0,
));

const classifyPnlForStatement = (inc = {}) => {
  const revenue = pnlGroupList(inc, 'revenue_groups');
  const cost = pnlGroupList(inc, 'cost_groups');
  const expense = pnlGroupList(inc, 'expense_groups');
  const revenueOperating = [];
  const otherIncome = [];
  revenue.forEach((group) => {
    if (['سایر', 'غیرعملیاتی', 'سود فروش', 'سود سرمایه', 'سود سپرده']
      .some((word) => normText(group.name).includes(normText(word)))) {
      otherIncome.push(group);
    } else {
      revenueOperating.push(group);
    }
  });
  const split = { sga: [], impairment: [], other: [], finance: [], nonOperating: [], tax: [] };
  expense.forEach((group) => {
    const name = normText(group.name);
    if (name.includes(normText('مالیات'))) split.tax.push(group);
    else if (name.includes(normText('کاهش ارزش')) || name.includes(normText('مشکوک'))) split.impairment.push(group);
    else if (name.includes(normText('مالی')) || name.includes(normText('بهره'))
      || name.includes(normText('کارمزد')) || name.includes(normText('تسهیلات'))) split.finance.push(group);
    else if (name.includes(normText('غیرعملیاتی'))) split.nonOperating.push(group);
    else if (name.includes(normText('سایر'))) split.other.push(group);
    else split.sga.push(group);
  });
  return {
    revenue: revenue.length ? groupSum(revenue) : num(inc.revenue),
    revenueOperating: revenue.length ? groupSum(revenueOperating) : num(inc.revenue),
    otherIncome: revenue.length ? groupSum(otherIncome) : null,
    cost: cost.length ? groupSum(cost) : num(inc.cost_of_sales),
    sga: expense.length ? groupSum(split.sga) : num(inc.expenses),
    impairment: expense.length ? groupSum(split.impairment) : null,
    other: expense.length ? groupSum(split.other) : null,
    finance: expense.length ? groupSum(split.finance) : null,
    nonOperating: expense.length ? -groupSum(split.nonOperating) : null,
    tax: expense.length ? groupSum(split.tax) : null,
  };
};

export const buildInitialValues = (api, prior, balanceData, priorBalanceData, openingBalanceData) => {
  const inc = api?.income_statement || {};
  const pinc = prior?.income_statement || {};
  const detail = classifyPnlForStatement(inc);
  const pdetail = classifyPnlForStatement(pinc);
  const bs = api?.balance_sheet || {};
  const pbs = prior?.balance_sheet || {};
  const obs = openingBalanceData || {};
  const cf = api?.cash_flow || {};
  const pcf = prior?.cash_flow || {};
  const netProfit = num(inc.net_profit);
  const totalEquity = num(bs.total_equity);
  const currentSide = buildBalanceSide(balanceData);
  const priorSide = buildBalanceSide(priorBalanceData);
  const openingSide = buildBalanceSide(openingBalanceData);
  return {
    income: {
      revenue: pair(detail.revenueOperating, pdetail.revenueOperating),
      cogs: pair(detail.cost, pdetail.cost),
      sga: pair(detail.sga, pdetail.sga),
      impairment: pair(detail.impairment, pdetail.impairment),
      other_income: pair(detail.otherIncome, pdetail.otherIncome),
      other_expenses: pair(detail.other, pdetail.other),
      finance_cost: pair(detail.finance, pdetail.finance),
      non_operating: pair(detail.nonOperating, pdetail.nonOperating),
      tax: pair(detail.tax, pdetail.tax),
    },
    comprehensive: {
      net_profit: pair(inc.net_profit, pinc.net_profit),
    },
    balanceAssets: {
      ...mergeSide(currentSide.assets, priorSide.assets, openingSide.assets),
      total_assets: triple(bs.total_assets, pbs.total_assets, obs.total_assets),
    },
    balanceLiabilities: {
      ...mergeSide(currentSide.liabilities, priorSide.liabilities, openingSide.liabilities),
      ...mergeSide(currentSide.equity, priorSide.equity, openingSide.equity),
      total_equity: triple(bs.total_equity, pbs.total_equity, obs.total_equity),
      total_liabilities: triple(bs.total_liabilities, pbs.total_liabilities, obs.total_liabilities),
    },
    equity: {
      opening_prior: equityColumnsFor(openingSide.equity, obs.total_equity),
      opening_current: equityColumnsFor(
        priorSide.equity,
        num(pbs.total_equity) ?? (totalEquity !== null && netProfit !== null ? round(totalEquity - netProfit) : null),
      ),
      prior_net_profit: { retained: num(pinc.net_profit) },
      net_profit: { retained: netProfit },
      closing: equityColumnsFor(currentSide.equity, totalEquity),
    },
    cashflow: {
      operating_in: pair(cf.operating_in, pcf.operating_in),
      operating_out: pair(cf.operating_out, pcf.operating_out),
      investing_net: pair(cf.investing, pcf.investing),
      financing_net: pair(cf.financing, pcf.financing),
      beginning_cash: {
        current: num(priorSide.assets.cash || 0),
        prior: num(openingSide.assets.cash || 0),
      },
    },
  };
};

export const recalculateStatements = (manualValues = {}) => {
  const result = {};
  Object.entries(STATEMENTS).forEach(([statementId, definition]) => {
    const source = manualValues[statementId] || {};
    const calculated = {};
    const read = (rowId, columnKey) => {
      const computed = calculated[rowId];
      if (computed && computed[columnKey] !== undefined && computed[columnKey] !== '') return num(computed[columnKey]);
      return valueOf(source, rowId, columnKey);
    };

    definition.rows.forEach((row) => {
      const output = { ...(source[row.id] || {}) };
      if (Array.isArray(row.formula)) {
        definition.columns
          .filter((column) => !column.totalColumn)
          .forEach((column) => {
            let sum = 0;
            let hasValue = false;
            row.formula.forEach((ref) => {
              const value = read(ref.id, column.key);
              if (value !== null) {
                sum += value * ref.sign;
                hasValue = true;
              }
            });
            if (hasValue) output[column.key] = round(sum);
          });
      }

      if (definition.columns === EQUITY_COLUMNS && !row.preserveTotal) {
        const values = definition.columns
          .filter((column) => !column.totalColumn)
          .map((column) => num(output[column.key]))
          .filter((value) => value !== null);
        if (values.length) output.total = round(values.reduce((sum, value) => sum + value, 0));
      }
      calculated[row.id] = output;
    });
    result[statementId] = calculated;
  });
  return result;
};

export const buildNoteDefaults = ({ api, companyName, yearName }) => {
  const inc = api?.income_statement || {};
  const bs = api?.balance_sheet || {};
  const cf = api?.cash_flow || {};
  const money = (value) => `${formatPersianNumber(value || 0)} ریال`;
  return {
    history: `شرکت ${companyName || 'جاری'} در سال مالی ${yearName || '—'} صورت‌های مالی خود را بر اساس استانداردهای حسابداری ایران تهیه و ارائه کرده است.`,
    basis: 'صورت‌های مالی بر مبنای بهای تمام‌شده و با رعایت استانداردهای حسابداری ایران تهیه شده است. اقلام صورت‌های مالی بر اساس ماهیت و کارکرد در گروه‌های مناسب طبقه‌بندی شده‌اند.',
    policies: 'رویه‌های حسابداری در رابطه با شناسایی درآمد، دارایی‌های ثابت، موجودی‌ها، دریافتنی‌ها، تسهیلات مالی و مالیات بر درآمد به‌صورت یکنواخت با سال قبل اعمال شده است.',
    fixed_assets: 'دارایی‌های ثابت مشهود به بهای تمام‌شده پس از کسر استهلاک انباشته و زیان کاهش ارزش، در صورت وضعیت مالی ارائه شده‌اند.',
    investments: 'سرمایه‌گذاری‌ها بر اساس قصد مدیریت و ماهیت بازار طبقه‌بندی و در پایان دوره با مبلغ بازیافتنی مقایسه شده‌اند.',
    receivables: 'دریافتنی‌های تجاری و سایر دریافتنی‌ها به مبلغ اسمی پس از کسر ذخیرهٔ مطالبات مشکوک‌الوصول ارائه شده‌اند.',
    cash: 'موجودی نقد شامل موجودی نزد بانک‌ها و صندوق است و برای اهداف صورت جریان‌های نقدی نیز به همین شکل تعریف می‌شود.',
    equity: `جمع حقوق مالکانه در پایان دوره ${money(bs.total_equity)} است و شامل سرمایه، اندوخته‌ها و سود انباشته می‌شود. سود خالص دوره ${money(inc.net_profit)} بوده است.`,
    liabilities: `جمع بدهی‌ها در پایان دوره ${money(bs.total_liabilities)} است و بر اساس سررسید به بدهی‌های جاری و غیرجاری تفکیک شده است.`,
    tax: 'هزینهٔ مالیات بر درآمد بر اساس سود مشمول مالیات و با در نظر گرفتن مالیات انتقالی و تفاوت‌های دائمی محاسبه شده است.',
    income: `درآمدهای عملیاتی دوره ${money(inc.revenue)} و بهای تمام‌شدهٔ درآمدهای عملیاتی ${money(inc.cost_of_sales)} بوده است؛ سود ناخالص ${money(inc.gross_profit)} و سود خالص ${money(inc.net_profit)} است.`,
    related: 'معاملات با اشخاص وابسته در جریان عملیات عادی و با شرایط متعارف انجام شده و مانده‌های آن در یادداشت‌های مربوط افشا شده است.',
    commitments: 'تعهدات سرمایه‌ای، ضمانت‌نامه‌ها و رویدادهای پس از تاریخ گزارش که بر وضعیت مالی اثر بااهمیت دارند، در این یادداشت افشا می‌شوند.',
    segments: `اطلاعات تفکیکی فعالیت‌ها بر اساس گزارش‌های داخلی مدیریت تهیه می‌شود. خالص تغییر وجه نقد دوره ${money(cf.net_change)} بوده است.`,
  };
};

export const parseNumericInput = (raw) => {
  const normalized = toEnglishDigits(String(raw ?? ''))
    .replace(/[٬,]/g, '')
    .replace(/\s+/g, '');
  if (!normalized || normalized === '-') return '';
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : '';
};


