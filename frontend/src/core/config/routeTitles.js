/**
 * عنوان فارسی مسیرهایی که در منوی ماژول‌ها با path دقیق پیدا نمی‌شوند
 * (مسیرهای تودرتو، پارامتردار یا صفحه‌های مستقل). دفترچهٔ «صفحات باز»
 * از همین عنوان استفاده می‌کند تا هیچ تبی با مسیر انگلیسی نمایش داده نشود.
 */
const EXACT = {
  '/coming-soon': { title: 'به‌زودی', color: '#64748b' },
  '/reports': { title: 'گزارش‌ها', color: '#6366f1' },
  '/correspondences': { title: 'مکاتبات', color: '#0ea5e9' },
  '/management-analytics': { title: 'تحلیل مدیریتی', color: '#8b5cf6' },
  '/payslips': { title: 'فیش‌های حقوقی', color: '#3b82f6' },
  '/payroll': { title: 'حقوق و دستمزد', color: '#3b82f6' },
  '/payroll/attendance-import': { title: 'دریافت کارکرد', color: '#3b82f6' },
  '/finance-reports': { title: 'گزارش‌های مالی', color: '#0ea5e9' },
  '/data-entry': { title: 'ورود اطلاعات', color: '#8b5cf6' },
  '/my-workdesk': { title: 'کارتابل من', color: '#0f766e' },
  '/correspondence/workdesk': { title: 'کارتابل مکاتبات', color: '#0ea5e9' },
  '/settings/correspondence-numbering': { title: 'تعاریف و شماره‌گذاری مکاتبات', color: '#64748b' },
  '/insurance/dependents': { title: 'بیمه تکمیلی و افراد تحت تکفل', color: '#ec4899' },
  '/benefits': { title: 'مزایا', color: '#10b981' },
  '/benefit-payments': { title: 'پرداخت مزایا', color: '#10b981' },
  '/deductions': { title: 'کسورات', color: '#f97316' },
  '/petty-cash': { title: 'تنخواه', color: '#f59e0b' },
  '/petty-cash/custodians': { title: 'تنخواه‌داران', color: '#f59e0b' },
  '/petty-cash/reports': { title: 'گزارش‌های تنخواه', color: '#f59e0b' },
  '/accounting/reports': { title: 'گزارش‌های حسابداری', color: '#0ea5e9' },
  '/accounting/settings': { title: 'تنظیمات حسابداری', color: '#0ea5e9' },
  '/accounting/documents/new': { title: 'سند حسابداری جدید', color: '#0ea5e9' },
  '/procurement/supplier-profile': { title: 'پروندهٔ تأمین‌کننده', color: '#3b82f6' },
  '/treasury': { title: 'خزانه‌داری', color: '#14b8a6' },
  '/treasury/entities': { title: 'حساب‌ها و صندوق‌ها', color: '#14b8a6' },
  '/treasury/payment-orders': { title: 'دستورهای پرداخت', color: '#14b8a6' },
  '/treasury/approval-rules': { title: 'سطوح تأیید پرداخت', color: '#14b8a6' },
  '/treasury/accounts': { title: 'حساب‌های بانکی', color: '#14b8a6' },
  '/treasury/cashboxes': { title: 'صندوق‌ها', color: '#14b8a6' },
  '/treasury/banks': { title: 'بانک‌ها', color: '#14b8a6' },
  '/treasury/bank-branches': { title: 'شعبه‌های بانکی', color: '#14b8a6' },
  '/treasury/terminals': { title: 'پایانه‌های کارت‌خوان', color: '#14b8a6' },
  '/treasury/payment-methods': { title: 'روش‌های پرداخت', color: '#14b8a6' },
  '/treasury/numbering': { title: 'شماره‌گذاری اسناد', color: '#14b8a6' },
  '/treasury/voucher-book': { title: 'دفتر اسناد', color: '#14b8a6' },
  '/treasury/bank-orders': { title: 'دستور پرداخت بین‌بانکی', color: '#14b8a6' },
  '/treasury/print-templates': { title: 'قالب‌های چاپ', color: '#14b8a6' },
  '/treasury/reports': { title: 'گزارش‌های خزانه', color: '#14b8a6' },
  '/treasury/reconciliation': { title: 'مغایرت بانکی', color: '#14b8a6' },
  '/treasury/verify': { title: 'اعتبارسنجی اسناد', color: '#14b8a6' },
  '/treasury/transactions': { title: 'عملیات خزانه', color: '#14b8a6' },
  '/treasury/payables': { title: 'قابل‌پرداخت‌ها', color: '#14b8a6' },
  '/treasury/checkbooks': { title: 'دسته‌چک‌ها', color: '#14b8a6' },
  '/treasury/received-checks': { title: 'چک‌های دریافتی', color: '#14b8a6' },
  '/treasury/issued-checks': { title: 'چک‌های پرداختی', color: '#14b8a6' },
  '/treasury/payment-requests': { title: 'درخواست‌های پرداخت', color: '#14b8a6' },
  '/treasury/payment-commitments': { title: 'تعهدات پرداخت', color: '#14b8a6' },
  '/treasury/receipts': { title: 'دریافت‌ها', color: '#14b8a6' },
  '/treasury/advances': { title: 'علی‌الحساب‌ها', color: '#14b8a6' },
  '/treasury/transfers': { title: 'انتقال وجوه', color: '#14b8a6' },
  '/treasury/guarantees': { title: 'تضامین و ضمانت‌نامه‌ها', color: '#14b8a6' },
  '/treasury/forecast': { title: 'پیش‌بینی نقدینگی', color: '#14b8a6' },
  '/chat': { title: 'گفتگوی سازمانی', color: '#0ea5e9' },
  '/planning': { title: 'برنامه‌ریزی شخصی', color: '#6366f1' },
  '/documents': { title: 'اسناد شرکت', color: '#0f766e' },
  '/document-management': { title: 'مدیریت اسناد', color: '#0f766e' },
  '/document-management/library': { title: 'کتابخانهٔ اسناد', color: '#0f766e' },
  '/document-management/folders': { title: 'پوشه‌های اسناد', color: '#0f766e' },
  '/document-management/reports': { title: 'گزارش‌های اسناد', color: '#0f766e' },
  '/document-management/activity': { title: 'فعالیت اسناد', color: '#0f766e' },
};

const PATTERNS = [
  [/^\/employees\/[^/]+\/edit$/, 'ویرایش پروندهٔ پرسنلی', '#ec4899'],
  [/^\/employees\/[^/]+$/, 'پروندهٔ پرسنلی', '#ec4899'],
  [/^\/contracts\/[^/]+\/edit$/, 'ویرایش قرارداد', '#f59e0b'],
  [/^\/external-contracts\/[^/]+$/, 'پروندهٔ قرارداد', '#f59e0b'],
  [/^\/projects\/[^/]+$/, 'پروندهٔ پروژه', '#8b5cf6'],
  [/^\/petty-cash\/reports\/[^/]+$/, 'گزارش تنخواه', '#f59e0b'],
  [/^\/petty-cash\/expenses\/[^/]+\/edit$/, 'ویرایش صورت هزینه', '#f59e0b'],
  [/^\/petty-cash\/[^/]+$/, 'تنخواه', '#f59e0b'],
  [/^\/accounting\/documents\/[^/]+\/edit$/, 'ویرایش سند حسابداری', '#0ea5e9'],
  [/^\/accounting\/codings\/[^/]+$/, 'کدینگ حسابداری', '#0ea5e9'],
  [/^\/accounting\/accounts\/[^/]+$/, 'حساب‌های حسابداری', '#0ea5e9'],
  [/^\/accounting(?:\/.*)?$/, 'حسابداری', '#0ea5e9'],
  [/^\/procurement\/inquiries\/[^/]+\/comparison$/, 'مقایسهٔ پیشنهادهای استعلام', '#3b82f6'],
  [/^\/payroll(?:\/.*)?$/, 'حقوق و دستمزد', '#3b82f6'],
  [/^\/treasury(?:\/.*)?$/, 'خزانه‌داری', '#14b8a6'],
  [/^\/settings(?:\/.*)?$/, 'تنظیمات', '#64748b'],
  [/^\/orgchart(?:\/.*)?$/, 'چارت سازمانی', '#8b5cf6'],
];

export const routeTitleMeta = (path) => {
  const clean = String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
  if (EXACT[clean]) return EXACT[clean];
  for (const [pattern, title, color] of PATTERNS) {
    if (pattern.test(clean)) return { title, color };
  }
  return null;
};

export default routeTitleMeta;
