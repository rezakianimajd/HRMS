import React from 'react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BadgeIcon from '@mui/icons-material/Badge';
import DescriptionIcon from '@mui/icons-material/Description';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CalculateIcon from '@mui/icons-material/Calculate';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PaidIcon from '@mui/icons-material/Paid';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import GavelIcon from '@mui/icons-material/Gavel';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import SavingsIcon from '@mui/icons-material/Savings';
import TuneIcon from '@mui/icons-material/Tune';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import CallMadeIcon from '@mui/icons-material/CallMade';
import SettingsIcon from '@mui/icons-material/Settings';
import BusinessIcon from '@mui/icons-material/Business';
import PaymentsIcon from '@mui/icons-material/Payments';

const placeholder = (key, path, label, description, icon, requirements, related = []) => ({
  key, path, label, description, icon, panel: 'placeholder', requirements, related,
});

export const PAYROLL_PAGES = [
  {
    key: 'home',
    path: '/payroll/dashboard',
    label: 'خانه',
    description: 'نمای کلی دورهٔ جاری، روند حقوق، هشدارهای محاسباتی و شاخص‌های هزینه',
    icon: <DashboardIcon />,
    panel: 'dashboard',
  },
  {
    key: 'employees',
    path: '/payroll/employees',
    label: 'مشخصات',
    description: 'مشخصات پرسنل حقوق‌بگیر، واحد، عنوان شغلی و وضعیت حکم حقوقی',
    icon: <BadgeIcon />,
    panel: 'employees',
  },
  {
    key: 'profiles',
    path: '/payroll/profiles',
    label: 'احکام پرسنل',
    description: 'احکام و پروفایل حقوقی تاریخ‌محور پرسنل؛ مبنای Snapshot هر دوره',
    icon: <DescriptionIcon />,
    panel: 'profiles',
  },
  {
    key: 'loans',
    path: '/payroll/loans',
    label: 'وام‌ها',
    description: 'وام‌های اعطاشده به پرسنل، اقساط و وضعیت بازپرداخت',
    icon: <AccountBalanceWalletIcon />,
    panel: 'loans',
  },
  {
    key: 'calculate',
    path: '/payroll/calculate',
    label: 'محاسبه حقوق',
    description: 'ایجاد دوره و اجرای محاسبهٔ مؤلفه‌محور حقوق بر اساس قوانین تاریخ‌محور',
    icon: <CalculateIcon />,
    panel: 'periods',
  },
  {
    key: 'accounting',
    path: '/payroll/accounting',
    label: 'سند حقوق',
    description: 'ثبت سند حسابداری متوازن حقوق و پیگیری مغایرت با حساب‌ها',
    icon: <AccountBalanceIcon />,
    panel: 'periods',
  },
  {
    key: 'reports',
    path: '/payroll/reports',
    label: 'گزارشات',
    description: 'گزارش روند دوره‌ها، تفکیک هزینه، مغایرت حسابداری و خزانه',
    icon: <AssessmentIcon />,
    panel: 'reports',
  },
  {
    key: 'net-payments',
    path: '/payroll/net-payments',
    label: 'خالص پرداختی',
    description: 'مبالغ خالص قابل پرداخت هر پرسنل و جمع پرداختی دوره',
    icon: <PaidIcon />,
    panel: 'results',
  },
  {
    key: 'results',
    path: '/payroll/results',
    label: 'اطلاعات حقوق',
    description: 'ریز اقلام حقوق، بیمه، مالیات و کسورات هر پرسنل',
    icon: <ReceiptLongIcon />,
    panel: 'results',
  },
  {
    key: 'payslips',
    path: '/payroll/payslips',
    label: 'فیش حقوقی پرسنل',
    description: 'مشاهده و چاپ فیش حقوقی با قالب رسمی شرکت',
    icon: <ReceiptLongIcon />,
    panel: 'results',
  },
  {
    key: 'employee-loans',
    path: '/payroll/employee-loans',
    label: 'وام کارکنان',
    description: 'پیگیری وام‌های کارکنان و اقساط مرتبط با دورهٔ حقوق',
    icon: <AccountBalanceWalletIcon />,
    panel: 'loans',
  },
  {
    key: 'advances',
    path: '/payroll/advances',
    label: 'مساعده کارکنان',
    description: 'ثبت و پیگیری مساعده، اقساط و کسر خودکار از حقوق',
    icon: <PaymentsIcon />,
    panel: 'operations',
    mode: 'advance',
  },
  {
    key: 'insurance-export',
    path: '/payroll/insurance-export',
    label: 'بیمه کارکنان (خروجی)',
    description: 'خروجی بیمهٔ سهم کارمند و کارفرما برای ارسال به شعبهٔ بیمه',
    icon: <HealthAndSafetyIcon />,
    panel: 'export',
    kind: 'insurance',
  },
  {
    key: 'tax-export',
    path: '/payroll/tax-export',
    label: 'مالیات کارکنان',
    description: 'خروجی مالیات حقوق کارکنان برای ارسال به ادارهٔ مالیاتی',
    icon: <GavelIcon />,
    panel: 'export',
    kind: 'tax',
  },
  placeholder(
    'eidi-operations', '/payroll/annual/eidi-operations', 'عملیات و کارکرد عیدی', 'ثبت کارکرد سالانه، روزهای کارکرد و ورودی‌های محاسبهٔ عیدی سال ۱۴۰۵',
    <CardGiftcardIcon />,
    ['تعریف مؤلفهٔ عیدی در متغیرهای سیستم حقوق', 'تکمیل احکام پرسنل و روزهای کارکرد', 'ثبت نرخ‌ها و سقف‌های قانونی ۱۴۰۵ در تعاریف اولیه'],
    [{ label: 'احکام پرسنل', path: '/payroll/profiles' }, { label: 'تعاریف اولیه', path: '/payroll/definitions/components' }],
  ),
  placeholder(
    'eidi-calculate', '/payroll/annual/eidi-calculate', 'محاسبه عیدی', 'محاسبهٔ عیدی بر اساس روزهای کارکرد، سابقه و سقف قانونی سال ۱۴۰۵',
    <CardGiftcardIcon />,
    ['تکمیل عملیات و کارکرد عیدی', 'تعریف مؤلفهٔ عیدی و نرخ‌های سال ۱۴۰۵'],
    [{ label: 'عملیات عیدی', path: '/payroll/annual/eidi-operations' }],
  ),
  placeholder(
    'eidi-report', '/payroll/annual/eidi-report', 'گزارش عیدی', 'گزارش تفصیلی عیدی کارکنان و جمع پرداختی سالانه',
    <AssessmentIcon />,
    ['ثبت محاسبهٔ عیدی در دوره', 'تعریف قالب چاپ/خروجی'],
    [{ label: 'محاسبه عیدی', path: '/payroll/annual/eidi-calculate' }],
  ),
  placeholder(
    'eidi-document', '/payroll/annual/eidi-document', 'سند عیدی', 'ثبت سند حسابداری عیدی و پیگیری مغایرت با دفاتر',
    <AccountBalanceIcon />,
    ['نگاشت حساب عیدی در تعاریف اولیه', 'محاسبه و تأیید عیدی'],
    [{ label: 'گزارش عیدی', path: '/payroll/annual/eidi-report' }, { label: 'نگاشت حساب‌ها', path: '/payroll/definitions/expense-debit' }],
  ),
  placeholder(
    'leave-balance-operations', '/payroll/leave/balance-operations', 'عملیات مانده مرخصی', 'محاسبه و انتقال مانده مرخصی استحقاقی سال ۱۴۰۵',
    <EventBusyIcon />,
    ['ثبت مرخصی و مأموریت در ماژول مرخصی', 'تعریف سهمیهٔ سالانه در تنظیمات حقوق', 'تعریف مؤلفهٔ بازخرید مرخصی'],
    [{ label: 'تنظیمات حقوق', path: '/payroll/definitions/tax-fixed' }],
  ),
  placeholder(
    'leave-balance-report', '/payroll/leave/balance-report', 'گزارش مانده مرخصی', 'گزارش مانده مرخصی هر پرسنل و سابقهٔ استفاده',
    <EventBusyIcon />,
    ['تکمیل عملیات مانده مرخصی', 'اتصال به درخواست‌های مرخصی'],
    [{ label: 'عملیات مانده مرخصی', path: '/payroll/leave/balance-operations' }],
  ),
  placeholder(
    'leave-balance-document', '/payroll/leave/balance-document', 'سند مانده مرخصی', 'ثبت سند حسابداری بدهی مانده مرخصی',
    <AccountBalanceIcon />,
    ['تعریف حساب بدهی مرخصی', 'محاسبه و تأیید مانده مرخصی'],
    [{ label: 'گزارش مانده مرخصی', path: '/payroll/leave/balance-report' }],
  ),
  placeholder(
    'reserve-operations', '/payroll/leave/reserve-operations', 'عملیات ذخیره سنوات', 'محاسبهٔ ذخیرهٔ سنوات و بازخرید پایان خدمت طبق قوانین ۱۴۰۵',
    <SavingsIcon />,
    ['تکمیل احکام پرسنل و سابقهٔ خدمت', 'تعریف نرخ و مؤلفهٔ ذخیره سنوات'],
    [{ label: 'احکام پرسنل', path: '/payroll/profiles' }],
  ),
  placeholder(
    'reserve-report', '/payroll/leave/reserve-report', 'گزارش ذخیره سنوات', 'گزارش ذخیرهٔ سنوات هر پرسنل و مانده بدهی',
    <SavingsIcon />,
    ['تکمیل عملیات ذخیره سنوات'],
    [{ label: 'عملیات ذخیره سنوات', path: '/payroll/leave/reserve-operations' }],
  ),
  placeholder(
    'reserve-document', '/payroll/leave/reserve-document', 'سند ذخیره سنوات', 'ثبت سند حسابداری ذخیرهٔ سنوات',
    <AccountBalanceIcon />,
    ['تعریف حساب ذخیره سنوات', 'محاسبه و تأیید ذخیره'],
    [{ label: 'گزارش ذخیره سنوات', path: '/payroll/leave/reserve-report' }],
  ),
  {
    key: 'tax-fixed',
    path: '/payroll/definitions/tax-fixed',
    label: 'تعاریف ثابت (اداره دارایی)',
    description: 'قواعد محاسبه، روز/ساعت کاری و سیاست‌های پایهٔ حقوق سال ۱۴۰۵',
    icon: <SettingsIcon />,
    panel: 'settings',
    section: 'base',
  },
  {
    key: 'employee-status',
    path: '/payroll/definitions/employee-status',
    label: 'وضعیت کارکنان',
    description: 'وضعیت شاغل، تعلیق و پایان همکاری بر اساس احکام حقوقی',
    icon: <BadgeIcon />,
    panel: 'status',
  },
  placeholder(
    'tax-insurance-branches', '/payroll/definitions/branches', 'شعب مالیاتی و بیمه', 'تعریف شعبهٔ مالیاتی، شعبهٔ بیمه و شمارهٔ کارگاه/بیمهٔ هر پرسنل',
    <BusinessIcon />,
    ['افزودن مدل و API شعب مالیاتی/بیمه', 'اتصال هر پرسنل به شعبهٔ مربوط', 'تعریف کد کارگاه و شمارهٔ بیمه'],
    [{ label: 'خروجی بیمه', path: '/payroll/insurance-export' }, { label: 'خروجی مالیات', path: '/payroll/tax-export' }],
  ),
  {
    key: 'components',
    path: '/payroll/definitions/components',
    label: 'متغیرهای سیستم حقوق',
    description: 'مزایا، کسورات، هزینه‌های کارفرما و قوانین محاسبه',
    icon: <TuneIcon />,
    panel: 'settings',
    section: 'components',
  },
  {
    key: 'insurance-rates',
    path: '/payroll/definitions/insurance-rates',
    label: 'رنج بیمه',
    description: 'نرخ‌های بیمهٔ تاریخ‌محور، کف و سقف مبنای بیمه',
    icon: <HealthAndSafetyIcon />,
    panel: 'settings',
    section: 'insurance',
  },
  {
    key: 'tax-brackets',
    path: '/payroll/definitions/tax-brackets',
    label: 'رنج مالیات',
    description: 'پله‌های مالیات تصاعدی تاریخ‌محور و معافیت ماهانه',
    icon: <GavelIcon />,
    panel: 'settings',
    section: 'tax',
  },
  {
    key: 'activity-centers',
    path: '/payroll/definitions/activity-centers',
    label: 'مراکز اصلی فعالیت',
    description: 'پروژه‌ها و مراکز اصلی فعالیت برای تخصیص هزینهٔ حقوق',
    icon: <AccountTreeIcon />,
    panel: 'centers',
    mode: 'projects',
  },
  {
    key: 'cost-centers',
    path: '/payroll/definitions/cost-centers',
    label: 'مراکز هزینه بدهکاران',
    description: 'مراکز هزینهٔ قابل استفاده در تخصیص و سند حقوق',
    icon: <SwapHorizIcon />,
    panel: 'centers',
    mode: 'cost_centers',
  },
  {
    key: 'expense-debit',
    path: '/payroll/definitions/expense-debit',
    label: 'هزینه حقوق (بدهکار)',
    description: 'نگاشت رویدادهای حقوق به حساب‌های بدهکار',
    icon: <CallReceivedIcon />,
    panel: 'settings',
    section: 'mapping',
  },
  {
    key: 'expense-credit',
    path: '/payroll/definitions/expense-credit',
    label: 'هزینه حقوق (بستانکار)',
    description: 'نگاشت رویدادهای حقوق به حساب‌های بستانکار',
    icon: <CallMadeIcon />,
    panel: 'settings',
    section: 'mapping',
  },
  // مسیرهای قدیمی برای سازگاری با لینک‌های قبلی؛ در منو نمایش داده نمی‌شوند.
  {
    key: 'legacy-periods', path: '/payroll/periods', label: 'دوره‌های حقوق', description: 'دوره‌های حقوق', icon: <CalculateIcon />, panel: 'periods',
  },
  {
    key: 'legacy-settings', path: '/payroll/settings', label: 'تنظیمات حقوق', description: 'تنظیمات کامل حقوق', icon: <SettingsIcon />, panel: 'settings',
  },
  {
    key: 'legacy-operations', path: '/payroll/operations', label: 'عملیات حقوق', description: 'اضافه‌کاری، مساعده و تخصیص', icon: <TuneIcon />, panel: 'operations',
  },
  {
    key: 'legacy-settlement', path: '/payroll/settlement', label: 'تسویه حساب', description: 'تسویه حساب پایان همکاری', icon: <SavingsIcon />, panel: 'settlement',
  },
];


