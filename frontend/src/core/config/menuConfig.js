import React from 'react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AccessTimeFilledIcon from '@mui/icons-material/AccessTimeFilled';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import PaymentsIcon from '@mui/icons-material/Payments';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import InsightsIcon from '@mui/icons-material/Insights';
import PsychologyIcon from '@mui/icons-material/Psychology';
import CategoryIcon from '@mui/icons-material/Category';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import BackupIcon from '@mui/icons-material/Backup';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PaletteIcon from '@mui/icons-material/Palette';
import DescriptionIcon from '@mui/icons-material/Description';
import PostAddIcon from '@mui/icons-material/PostAdd';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LockIcon from '@mui/icons-material/Lock';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import GavelIcon from '@mui/icons-material/Gavel';
import StorefrontIcon from '@mui/icons-material/Storefront';
import RuleIcon from '@mui/icons-material/Rule';
import HandshakeIcon from '@mui/icons-material/Handshake';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WarningIcon from '@mui/icons-material/Warning';

/**
 * Central navigation model for the HRMS.
 *
 * A professional SaaS menu is grouped into work-spaces that follow the
 * employee life-cycle:
 *   خانه → پرسنل → چرخه عملیات → مالی → مدارک/مکاتبات → بینش و هوش → سیستم
 *
 * `ready: false` items point to placeholder routes that show "در حال توسعه".
 * `primary: true` items are highlighted when the drawer is in collapsed mode.
 */
const menuConfig = [
  {
    id: 'home',
    title: 'خانه',
    color: '#6366f1',
    items: [
      { id: 'dashboard', title: 'داشبورد', icon: <DashboardIcon />, path: '/dashboard', color: '#6366f1', primary: true, ready: true },
    ],
  },
  {
    id: 'people',
    title: 'مدیریت پرسنل',
    color: '#ec4899',
    items: [
      { id: 'employees', title: 'پرونده‌های پرسنلی', icon: <PeopleIcon />, path: '/employees', color: '#ec4899', primary: true, ready: true },
      { id: 'employee-new', title: 'افزودن پرسنل', icon: <PersonAddIcon />, path: '/employees/new', color: '#ec4899', primary: false, ready: true },
      { id: 'phonebook', title: 'دفترچه تلفن', icon: <PhoneInTalkIcon />, path: '/phonebook', color: '#10b981', primary: false, ready: true },
      { id: 'advanced-search', title: 'جستجوی پیشرفته', icon: <ManageSearchIcon />, path: '/search', color: '#f59e0b', primary: false, ready: true },
      { id: 'contracts', title: 'قراردادها', icon: <HistoryEduIcon />, path: '/contracts', color: '#f59e0b', primary: false, ready: true },
      { id: 'recruitment', title: 'جذب و استخدام', icon: <PersonSearchIcon />, path: '/recruitment', color: '#0ea5e9', primary: false, ready: true },
    ],
  },
  {
    id: 'operations',
    title: 'چرخه عملیات و کارکنان',
    color: '#14b8a6',
    items: [
      { id: 'org-chart', title: 'چارت سازمانی', icon: <AccountTreeIcon />, path: '/org-chart', color: '#8b5cf6', primary: true, ready: true },
      { id: 'data-import', title: 'درون‌ریزی داده', icon: <UploadFileIcon />, path: '/data-import', color: '#f97316', primary: false, ready: true },
      { id: 'attendance', title: 'حضور و غیاب', icon: <AccessTimeFilledIcon />, path: '/attendance', color: '#0ea5e9', primary: false, ready: true },
      { id: 'leaves', title: 'مرخصی و مأموریت', icon: <BeachAccessIcon />, path: '/leaves', color: '#06b6d4', primary: false, ready: true },
      { id: 'requests', title: 'درخواست‌های اداری', icon: <FactCheckIcon />, path: '/requests', color: '#f59e0b', primary: false, ready: true },
      { id: 'calendar', title: 'تقویم سازمانی', icon: <CalendarMonthIcon />, path: '/calendar', color: '#ec4899', primary: false, ready: true },
      { id: 'assets', title: 'اموال و تجهیزات', icon: <Inventory2Icon />, path: '/assets', color: '#10b981', primary: false, ready: true },
      { id: 'lifecycle', title: 'ورود و خروج', icon: <PlaylistAddCheckIcon />, path: '/lifecycle', color: '#8b5cf6', primary: false, ready: true },
    ],
  },
  {
    id: 'payroll',
    title: 'مالی',
    color: '#3b82f6',
    items: [
      { id: 'payslips', title: 'فیش حقوق', icon: <ReceiptLongIcon />, path: '/payslips', color: '#3b82f6', primary: true, ready: true },
      { id: 'benefits', title: 'مزایا و کارانه', icon: <CardGiftcardIcon />, path: '/benefits', color: '#10b981', primary: false, ready: true },
      { id: 'deductions', title: 'کسورات', icon: <PaymentsIcon />, path: '/deductions', color: '#8b5cf6', primary: false, ready: true },
      { id: 'finance-reports', title: 'گزارش مالی', icon: <BarChartOutlinedIcon />, path: '/finance-reports', color: '#6366f1', primary: false, ready: true },
    ],
  },
  {
    id: 'welfare',
    title: 'رفاهی و تسهیلات',
    color: '#10b981',
    items: [
      { id: 'insurance', title: 'بیمه تکمیلی', icon: <CardGiftcardIcon />, path: '/insurance', color: '#8b5cf6', primary: false, ready: true },
      { id: 'loans', title: 'وام و تسهیلات', icon: <PaymentsIcon />, path: '/loans', color: '#10b981', primary: false, ready: true },
    ],
  },
  {
    id: 'documents',
    title: 'مدارک و مکاتبات',
    color: '#06b6d4',
    items: [
      { id: 'correspondences', title: 'مکاتبات اداری', icon: <MailOutlineIcon />, path: '/correspondences', color: '#06b6d4', primary: false, ready: true },
      { id: 'bale-messaging', title: 'اطلاع‌رسانی و پیام بله', icon: <ChatBubbleOutlineIcon />, path: '/bale-messaging', color: '#10b981', primary: false, ready: true },
      { id: 'company-documents', title: 'بایگانی اسناد سازمان', icon: <FolderSharedIcon />, path: '/documents', color: '#f97316', primary: false, ready: true },
    ],
  },
  {
    id: 'insights',
    title: 'بینش و دستیار هوشمند',
    color: '#f43f5e',
    items: [
      { id: 'scoring', title: 'امتیازدهی و ارزیابی', icon: <LeaderboardIcon />, path: '/scoring', color: '#3b82f6', primary: true, ready: true },
      { id: 'management-analytics', title: 'داشبورد مدیریتی', icon: <InsightsIcon />, path: '/management-analytics', color: '#3b82f6', primary: false, ready: true },
      { id: 'appraisal', title: 'ارزیابی عملکرد', icon: <FactCheckOutlinedIcon />, path: '/appraisal', color: '#10b981', primary: false, ready: true },
      { id: 'assistant', title: 'دستیار هوشمند', icon: <PsychologyIcon />, path: '/assistant', color: '#8b5cf6', primary: false, ready: true },
    ],
  },
];

/* ---------------------------------------------------------------------------
 * تنظیمات و تعاریف — یک ماژول متمرکز برای همهٔ تنظیمات پلتفرم.
 * هیچ تنظیمی نباید داخل ماژول HR یا قراردادها بماند؛ همه از اینجا است.
 * ------------------------------------------------------------------------- */
const settingsMenu = [
  {
    id: 'settings-system',
    title: 'تنظیمات سیستم',
    color: '#64748b',
    items: [
      { id: 'settings', title: 'تنظیمات عمومی', icon: <SettingsIcon />, path: '/settings', color: '#64748b', primary: true, ready: true },
      { id: 'definitions', title: 'تعاریف اولیه', icon: <CategoryIcon />, path: '/definitions', color: '#14b8a6', primary: false, ready: true },
      { id: 'users', title: 'کاربران و نقش‌ها', icon: <AdminPanelSettingsIcon />, path: '/users', color: '#64748b', primary: false, ready: true },
      { id: 'appearance', title: 'ظاهر و پوسته', icon: <PaletteIcon />, path: '/appearance', color: '#8b5cf6', primary: false, ready: true },
      { id: 'audit', title: 'دفترچه فعالیت (Audit)', icon: <HistoryIcon />, path: '/audit', color: '#64748b', primary: false, ready: true },
    ],
  },
  {
    id: 'settings-maintenance',
    title: 'نگهداری و امنیت',
    color: '#3b82f6',
    items: [
      { id: 'settings-backup', title: 'پشتیبان‌گیری و بازیابی', icon: <BackupIcon />, path: '/settings?tab=backup', color: '#3b82f6', primary: false, ready: true },
      { id: 'settings-management', title: 'تنظیمات مدیریتی', icon: <AdminPanelSettingsIcon />, path: '/settings?tab=management', color: '#f97316', primary: false, ready: true },
      { id: 'settings-notifications', title: 'اطلاع‌رسانی', icon: <NotificationsActiveIcon />, path: '/settings?tab=notifications', color: '#10b981', primary: false, ready: true },
    ],
  },
];

const comingSoon = (path, id, title, icon, color, primary = false) => ({
  id, title, icon, path, color, primary, ready: false,
});

const contractsMenu = [
  {
    id: 'home',
    title: 'خانه',
    color: '#f59e0b',
    items: [
      { id: 'contracts-dashboard', title: 'داشبورد قراردادها', icon: <DashboardIcon />, path: '/contracts-dashboard', color: '#f59e0b', primary: true, ready: true },
    ],
  },
  {
    id: 'contracts-lifecycle',
    title: 'قراردادها',
    color: '#f97316',
    items: [
      { id: 'external-contracts', title: 'قراردادهای من', icon: <HistoryEduIcon />, path: '/external-contracts', color: '#f59e0b', primary: true, ready: true },
      { id: 'contracts-new', title: 'قرارداد جدید', icon: <PostAddIcon />, path: '/contracts/new', color: '#10b981', primary: false, ready: true },
      comingSoon('/contracts-templates', 'contracts-templates', 'قالب‌ها و پیش‌نویس‌ها', <DescriptionIcon />, '#6366f1'),
      comingSoon('/contracts-drafts', 'contracts-drafts', 'پیش‌نویس‌ها', <FactCheckIcon />, '#64748b'),
      comingSoon('/contracts-approvals', 'contracts-approvals', 'در انتظار تأیید', <RuleIcon />, '#f59e0b'),
    ],
  },
  {
    id: 'contracts-finance',
    title: 'مالی قرارداد',
    color: '#3b82f6',
    items: [
      comingSoon('/contracts-invoices', 'contracts-invoices', 'فاکتورها', <ReceiptIcon />, '#10b981'),
      comingSoon('/contracts-statements', 'contracts-statements', 'صورت‌وضعیت‌ها', <ReceiptLongIcon />, '#6366f1'),
      comingSoon('/contracts-payments', 'contracts-payments', 'پرداخت‌ها', <PaymentsIcon />, '#8b5cf6'),
      { id: 'contracts-guarantees', title: 'تضامین', icon: <LockIcon />, path: '/contracts-guarantees', color: '#ef4444', primary: false, ready: true },
    ],
  },
  {
    id: 'contracts-parties',
    title: 'طرف‌های قرارداد',
    color: '#0ea5e9',
    items: [
      { id: 'contract-parties-list', title: 'پیمانکاران و فروشندگان', icon: <StorefrontIcon />, path: '/contract-parties', color: '#0ea5e9', primary: false, ready: true },
      comingSoon('/contract-parties-eval', 'contract-parties-eval', 'ارزیابی تأمین‌کنندگان', <AssessmentIcon />, '#f97316'),
    ],
  },
  {
    id: 'contracts-risks',
    title: 'مدیریت ریسک',
    color: '#ef4444',
    items: [
      comingSoon('/contracts-expiring', 'contracts-expiring', 'قراردادهای رو به انقضا', <WarningIcon />, '#ef4444'),
      comingSoon('/contracts-alerts', 'contracts-alerts', 'هشدارها و یادآوری‌ها', <NotificationsActiveIcon />, '#f59e0b'),
      comingSoon('/contracts-disputes', 'contracts-disputes', 'اختلافات و دعاوی', <GavelIcon />, '#8b5cf6'),
    ],
  },
  {
    id: 'contracts-config',
    title: 'پیکربندی',
    color: '#64748b',
    items: [
      comingSoon('/contracts-workflow', 'contracts-workflow', 'گردشکار تأیید', <SwapHorizIcon />, '#6366f1'),
      comingSoon('/contracts-types', 'contracts-types', 'انواع قرارداد', <CategoryIcon />, '#14b8a6'),
    ],
  },
  {
    id: 'contracts-docs',
    title: 'ارتباطات و اسناد',
    color: '#06b6d4',
    items: [
      { id: 'correspondences-c', title: 'مکاتبات', icon: <MailOutlineIcon />, path: '/correspondences', color: '#06b6d4', primary: false, ready: true },
      comingSoon('/contracts-documents', 'contracts-docs', 'بایگانی اسناد قرارداد', <FolderSharedIcon />, '#f97316'),
    ],
  },
];

export function getMenuForApp(appSlug) {
  if (appSlug === 'contracts') return contractsMenu;
  if (appSlug === 'settings') return settingsMenu;
  return menuConfig;
}

export default menuConfig;
