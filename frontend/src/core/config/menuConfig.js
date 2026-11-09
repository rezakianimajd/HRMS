import React from 'react';
import DashboardIcon from '@mui/icons-material/Dashboard';

import TimelineIcon from '@mui/icons-material/Timeline';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
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
import FolderCopyIcon from '@mui/icons-material/FolderCopy';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import InsightsIcon from '@mui/icons-material/Insights';
import PsychologyIcon from '@mui/icons-material/Psychology';
import CategoryIcon from '@mui/icons-material/Category';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import SendIcon from '@mui/icons-material/Send';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import ContactsIcon from '@mui/icons-material/Contacts';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import BackupIcon from '@mui/icons-material/Backup';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PaletteIcon from '@mui/icons-material/Palette';
import DescriptionIcon from '@mui/icons-material/Description';
import PostAddIcon from '@mui/icons-material/PostAdd';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LockIcon from '@mui/icons-material/Lock';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import GavelIcon from '@mui/icons-material/Gavel';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import StraightenIcon from '@mui/icons-material/Straighten';
import RuleIcon from '@mui/icons-material/Rule';
import HandshakeIcon from '@mui/icons-material/Handshake';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import TuneIcon from '@mui/icons-material/Tune';
import CalculateIcon from '@mui/icons-material/Calculate';
import HubIcon from '@mui/icons-material/Hub';
import NumbersIcon from '@mui/icons-material/Numbers';
import GridViewIcon from '@mui/icons-material/GridView';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import GroupsIcon from '@mui/icons-material/Groups';
import CalendarViewMonthIcon from '@mui/icons-material/CalendarViewMonth';
import { DOCUMENT_LIBRARY_MODULES, moduleRootFolders } from './documentLibraryModules';

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
      { id: 'benefit-payments', title: 'پرداخت مزایا', icon: <CardGiftcardIcon />, path: '/benefit-payments', color: '#14b8a6', primary: false, ready: true },
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
    id: 'hr-reports',
    title: 'گزارشات',
    color: '#0ea5e9',
    items: [
      { id: 'family-report', title: 'گزارش خانواده پرسنل', icon: <FamilyRestroomIcon />, path: '/reports/family', color: '#be185d', primary: false, ready: true },
    ],
  },
  {
    id: 'documents',
    title: 'مدارک و مکاتبات',
    color: '#06b6d4',
    items: [
      { id: 'correspondences', title: 'مکاتبات اداری', icon: <MailOutlineIcon />, path: '/correspondence', color: '#06b6d4', primary: false, ready: true },
      { id: 'bale-messaging', title: 'اطلاع‌رسانی و پیام بله', icon: <ChatBubbleOutlineIcon />, path: '/bale-messaging', color: '#10b981', primary: false, ready: true },
    ],
  },
  {
    id: 'insights',
    title: 'بینش و دستیار هوشمند',
    color: '#f43f5e',
    items: [
      { id: 'scoring', title: 'امتیازدهی و ارزیابی', icon: <LeaderboardIcon />, path: '/scoring', color: '#3b82f6', primary: true, ready: true },
      { id: 'appraisal', title: 'ارزیابی عملکرد', icon: <FactCheckOutlinedIcon />, path: '/appraisal', color: '#10b981', primary: false, ready: true },
      { id: 'assistant', title: 'دستیار هوشمند', icon: <PsychologyIcon />, path: '/assistant', color: '#8b5cf6', primary: false, ready: true },
    ],
  },
];

const comingSoon = (path, id, title, icon, color, primary = false) => ({
  id, title, icon, path, color, primary, ready: false,
});

const settingsMenu = [
  {
    id: 'settings-home',
    title: 'خانه',
    color: '#6366f1',
    items: [
      comingSoon('/settings/dashboard', 'settings-dashboard', 'داشبورد', <DashboardIcon />, '#6366f1', true),
    ],
  },
  {
    id: 'settings-general',
    title: 'تنظیمات عمومی',
    color: '#64748b',
    items: [
      { id: 'settings', title: 'تنظیمات عمومی', icon: <SettingsIcon />, path: '/settings', color: '#64748b', primary: false, ready: true },
      { id: 'company-profile', title: 'مشخصات شرکت', icon: <BusinessIcon />, path: '/company-profile', color: '#6366f1', primary: false, ready: true },
      { id: 'users', title: 'کاربران و نقش‌ها', icon: <AdminPanelSettingsIcon />, path: '/users', color: '#64748b', primary: false, ready: true },
      { id: 'appearance', title: 'ظاهر و پوسته', icon: <PaletteIcon />, path: '/appearance', color: '#8b5cf6', primary: false, ready: true },
      { id: 'audit', title: 'دفترچه فعالیت', icon: <HistoryIcon />, path: '/audit', color: '#64748b', primary: false, ready: true },
      { id: 'settings-backup', title: 'پشتیبان‌گیری و بازیابی', icon: <BackupIcon />, path: '/settings?tab=backup', color: '#3b82f6', primary: false, ready: true },
      { id: 'settings-management', title: 'تنظیمات مدیریتی', icon: <AdminPanelSettingsIcon />, path: '/settings?tab=management', color: '#f97316', primary: false, ready: true },
      { id: 'settings-notifications', title: 'اطلاع‌رسانی', icon: <NotificationsActiveIcon />, path: '/settings?tab=notifications', color: '#10b981', primary: false, ready: true },
      { id: 'settings-updates', title: 'به‌روزرسانی سیستم', icon: <SystemUpdateAltIcon />, path: '/settings?tab=updates', color: '#8b5cf6', primary: false, ready: true },
    ],
  },
  {
    id: 'settings-correspondence',
    title: 'مکاتبات اداری',
    color: '#0ea5e9',
    items: [
      { id: 'settings-correspondence-numbering', title: 'تعاریف اولیه و شماره‌گذاری', icon: <NumbersIcon />, path: '/settings/correspondence-numbering', color: '#0ea5e9', primary: true, ready: true },
      { id: 'settings-correspondence-types', title: 'انواع مکاتبه', icon: <CategoryIcon />, path: '/correspondence/settings?tab=categories', color: '#6366f1', primary: false, ready: true },
      { id: 'settings-correspondence-contacts', title: 'مخاطبین و سازمان‌ها', icon: <ContactsIcon />, path: '/correspondence/settings?tab=contacts', color: '#0f766e', primary: false, ready: true },
      { id: 'settings-correspondence-mapping', title: 'نگاشت نام‌ها', icon: <AltRouteIcon />, path: '/correspondence/name-mapping', color: '#8b5cf6', primary: false, ready: true },
    ],
  },
  {
    id: 'settings-projects',
    title: 'مدیریت پروژه',
    color: '#8b5cf6',
    items: [
      { id: 'settings-projects-definitions', title: 'تعاریف اولیه', icon: <CategoryIcon />, path: '/projects/definitions', color: '#6d28d9', primary: true, ready: true },
      comingSoon('/modules/projects', 'mod-projects', 'مدیریت پروژه', <InsightsIcon />, '#8b5cf6'),
    ],
  },
  {
    id: 'settings-inventory',
    title: 'انبار و موجودی',
    color: '#10b981',
    items: [comingSoon('/modules/inventory', 'mod-inventory', 'انبار و موجودی', <Inventory2Icon />, '#10b981')],
  },
  {
    id: 'settings-accounting',
    title: 'حسابداری',
    color: '#0ea5e9',
    items: [
      { id: 'settings-accounting-definitions', title: 'تعاریف اولیه', icon: <SettingsIcon />, path: '/settings?tab=accounting', color: '#0ea5e9', primary: true, ready: true },
    ],
  },
  {
    id: 'settings-pettycash',
    title: 'تنخواه',
    color: '#f59e0b',
    items: [
      { id: 'settings-pettycash-definitions', title: 'تعاریف اولیه', icon: <AccountBalanceWalletIcon />, path: '/petty-cash/definitions', color: '#f59e0b', primary: true, ready: true },
      { id: 'settings-pettycash-settings', title: 'تنظیمات تنخواه', icon: <SettingsIcon />, path: '/petty-cash/settings', color: '#64748b', primary: false, ready: true },
      { id: 'settings-pettycash-approval', title: 'سیاست تأیید', icon: <RuleIcon />, path: '/petty-cash/policies', color: '#8b5cf6', primary: false, ready: true },
    ],
  },
  {
    id: 'settings-assets',
    title: 'اموال و دارایی',
    color: '#f97316',
    items: [comingSoon('/modules/assets', 'mod-assets', 'اموال و دارایی', <AssessmentIcon />, '#f97316')],
  },
  {
    id: 'settings-crm',
    title: 'CRM',
    color: '#ec4899',
    items: [comingSoon('/modules/crm', 'mod-crm', 'مدیریت ارتباط با مشتری', <PeopleIcon />, '#ec4899')],
  },
  {
    id: 'settings-sales',
    title: 'فروش',
    color: '#22c55e',
    items: [comingSoon('/modules/sales', 'mod-sales', 'فروش', <ReceiptIcon />, '#22c55e')],
  },
  {
    id: 'settings-production',
    title: 'تولید و برنامه‌ریزی',
    color: '#a855f7',
    items: [comingSoon('/modules/production', 'mod-production', 'تولید و برنامه‌ریزی', <PlaylistAddCheckIcon />, '#a855f7')],
  },
  {
    id: 'settings-hr',
    title: 'مدیریت منابع انسانی',
    color: '#ec4899',
    items: [
      { id: 'definitions', title: 'تعاریف اولیه', icon: <CategoryIcon />, path: '/definitions', color: '#ec4899', primary: true, ready: true },
    ],
  },
  {
    id: 'settings-contracts',
    title: 'مدیریت قراردادها',
    color: '#f59e0b',
    items: [
      { id: 'contracts-definitions', title: 'تعاریف اولیه', icon: <CategoryIcon />, path: '/contracts-definitions', color: '#f59e0b', primary: true, ready: true },
      { id: 'contracts-account-mapping-menu', title: 'نگاشت و کنترل', icon: <AccountTreeIcon />, path: '/contracts-accounting-mapping', color: '#0f766e', primary: false, ready: true },
      { id: 'contracts-settings-menu', title: 'انواع قرارداد و ارزیابی', icon: <CategoryIcon />, path: '/contracts-settings', color: '#14b8a6', primary: false, ready: true },
    ],
  },
];

const pettycashMenu = [
  {
    id: 'pettycash-home',
    title: 'خانه',
    color: '#f59e0b',
    items: [
      { id: 'petty-cash-dashboard', title: 'داشبورد', icon: <DashboardIcon />, path: '/petty-cash/dashboard', color: '#f59e0b', primary: true, ready: true },
    ],
  },
  {
    id: 'pettycash-operations',
    title: 'عملیات',
    color: '#10b981',
    items: [
      { id: 'petty-cash-expense-new', title: 'صورت هزینه جدید', icon: <PostAddIcon />, path: '/petty-cash/expenses/new', color: '#6366f1', primary: true, ready: true },
      { id: 'petty-cash-expenses', title: 'صورت ریز هزینه‌ها', icon: <ReceiptLongIcon />, path: '/petty-cash/expenses', color: '#10b981', primary: true, ready: true },
      { id: 'petty-cash-ledger', title: 'دفتر تنخواه', icon: <MenuBookIcon />, path: '/petty-cash/ledger', color: '#0ea5e9', primary: true, ready: true },
      { id: 'petty-cash-requests', title: 'درخواست‌ها', icon: <RequestQuoteIcon />, path: '/petty-cash/requests', color: '#f59e0b', primary: true, ready: true },
      { id: 'petty-cash-settlements', title: 'تسویه‌ها', icon: <FactCheckIcon />, path: '/petty-cash/settlements', color: '#10b981', primary: true, ready: true },
    ],
  },
  {
    id: 'pettycash-reports',
    title: 'گزارشات',
    color: '#0ea5e9',
    items: [
      { id: 'petty-cash-report-details', title: 'گزارش دهی جزئیات', icon: <AssessmentIcon />, path: '/petty-cash/reports/details', color: '#0ea5e9', primary: true, ready: true },
      { id: 'petty-cash-report-summary', title: 'وضعیت تنخواه‌ها', icon: <AccountBalanceWalletIcon />, path: '/petty-cash/reports/summary', color: '#f59e0b', primary: false, ready: true },
      { id: 'petty-cash-report-cashflow', title: 'گردش دریافت و پرداخت', icon: <SwapHorizIcon />, path: '/petty-cash/reports/cashflow', color: '#10b981', primary: false, ready: true },
      { id: 'petty-cash-report-category', title: 'هزینه به تفکیک سرفصل', icon: <CategoryIcon />, path: '/petty-cash/reports/by-category', color: '#8b5cf6', primary: false, ready: true },
      { id: 'petty-cash-report-project', title: 'هزینه به تفکیک پروژه', icon: <AccountTreeIcon />, path: '/petty-cash/reports/by-project', color: '#14b8a6', primary: false, ready: true },
      { id: 'petty-cash-report-custodians', title: 'عملکرد تنخواه‌داران', icon: <PeopleIcon />, path: '/petty-cash/reports/custodians', color: '#0ea5e9', primary: false, ready: true },
      { id: 'petty-cash-report-credit', title: 'اعتبار در برابر مصرف', icon: <LeaderboardIcon />, path: '/petty-cash/reports/credit-vs-usage', color: '#f59e0b', primary: false, ready: true },
      { id: 'petty-cash-report-overdue', title: 'تسویه‌های معوق', icon: <AccessTimeFilledIcon />, path: '/petty-cash/reports/overdue', color: '#ef4444', primary: false, ready: true },
      { id: 'petty-cash-report-settlements', title: 'تاریخچهٔ تسویه‌ها', icon: <HistoryIcon />, path: '/petty-cash/reports/settlements', color: '#10b981', primary: false, ready: true },
      { id: 'petty-cash-report-compliance', title: 'کنترل مستندات', icon: <VerifiedUserIcon />, path: '/petty-cash/reports/compliance', color: '#8b5cf6', primary: false, ready: true },
      { id: 'petty-cash-calendar', title: 'تقویم هزینه‌ها', icon: <CalendarMonthIcon />, path: '/petty-cash/calendar', color: '#ec4899', primary: false, ready: true },
    ],
  },
];

const accountingMenu = [
  {
    id: 'accounting-home',
    title: 'خانه',
    color: '#3b82f6',
    items: [
      { id: 'accounting-dashboard', title: 'داشبورد', icon: <DashboardIcon />, path: '/accounting', color: '#3b82f6', primary: true, ready: true },
    ],
  },
  {
    id: 'accounting-definitions',
    title: 'تعاریف حسابداری',
    color: '#3b82f6',
    items: [
      { id: 'acc-tree', title: 'درخت حساب‌ها', icon: <AccountTreeIcon />, path: '/accounting/accounts-tree', color: '#0f766e', primary: false, ready: true },
      { id: 'acc-groups', title: 'گروه حساب‌ها', icon: <CategoryIcon />, path: '/accounting/groups', color: '#6366f1', primary: false, ready: true },
      { id: 'acc-general', title: 'حساب‌های کل', icon: <AccountTreeIcon />, path: '/accounting/accounts/general', color: '#10b981', primary: false, ready: true },
      { id: 'acc-subsidiary', title: 'حساب‌های معین', icon: <ReceiptLongIcon />, path: '/accounting/accounts/subsidiary', color: '#0ea5e9', primary: false, ready: true },
      { id: 'acc-auxiliary', title: 'حساب‌های تفصیلی', icon: <CategoryIcon />, path: '/accounting/auxiliary', color: '#f59e0b', primary: false, ready: true },
      { id: 'acc-cost-centers', title: 'مراکز هزینه', icon: <CalculateIcon />, path: '/accounting/codings/costcenters', color: '#8b5cf6', primary: false, ready: true },
      { id: 'acc-org-parties', title: 'سازمان‌ها و اشخاص', icon: <GroupsIcon />, path: '/accounting/org-parties', color: '#0ea5e9', primary: false, ready: true },
    ],
  },
  {
    id: 'accounting-operations',
    title: 'عملیات',
    color: '#10b981',
    items: [
      { id: 'accounting-document-new', title: 'سند جدید', icon: <PostAddIcon />, path: '/accounting/document-new', color: '#6366f1', primary: false, ready: true },
      { id: 'accounting-documents', title: 'اسناد حسابداری', icon: <DescriptionIcon />, path: '/accounting/documents', color: '#10b981', primary: false, ready: true },
      { id: 'accounting-document-search', title: 'جستجو در اسناد', icon: <ManageSearchIcon />, path: '/accounting/documents/search', color: '#6366f1', primary: false, ready: true },
      { id: 'accounting-sequences', title: 'شماره‌گذاری اسناد', icon: <NumbersIcon />, path: '/accounting/sequences', color: '#0ea5e9', primary: false, ready: true },
      { id: 'accounting-document-finalize', title: 'قطعی کردن اسناد', icon: <LockIcon />, path: '/accounting/documents/finalize', color: '#f97316', primary: false, ready: true },
      { id: 'accounting-document-control', title: 'کنترل اسناد', icon: <FactCheckIcon />, path: '/accounting/documents/control', color: '#14b8a6', primary: false, ready: true },
    ],
  },
  {
    id: 'accounting-tools',
    title: 'ابزارهای مالی',
    color: '#64748b',
    items: [
      { id: 'accounting-reconciliation', title: 'مغایرت‌گیری بانکی', icon: <CompareArrowsIcon />, path: '/accounting/reconciliation', color: '#14b8a6', primary: false, ready: true },
      { id: 'accounting-approval-policies', title: 'سیاست تأیید اسناد', icon: <RuleIcon />, path: '/accounting/approval-policies', color: '#8b5cf6', primary: false, ready: true },
      { id: 'accounting-datamapping', title: 'نگاشت و ایمپورت داده', icon: <UploadFileIcon />, path: '/accounting/datamapping', color: '#6366f1', primary: false, ready: true },
    ],
  },
  {
    id: 'accounting-integration',
    title: 'ارتباط با ماژول‌ها',
    color: '#14b8a6',
    items: [
      { id: 'accounting-integration', title: 'قالب‌ها و صف ثبت', icon: <HubIcon />, path: '/accounting/integration', color: '#14b8a6', primary: false, ready: true },
      comingSoon('/accounting/integration/monitor', 'accounting-integration-monitor', 'مانیتور ثبت', <InsightsIcon />, '#0ea5e9'),
    ],
  },
  {
    id: 'accounting-fiscal',
    title: 'دوره مالی',
    color: '#0ea5e9',
    items: [
      { id: 'accounting-fiscal', title: 'دوره مالی', icon: <CalendarMonthIcon />, path: '/accounting/fiscal', color: '#0ea5e9', primary: false, ready: true },
      comingSoon('/accounting/periods', 'accounting-periods', 'دوره‌ها', <HistoryIcon />, '#6366f1'),
      comingSoon('/accounting/closing', 'accounting-closing', 'بستن دوره', <LockIcon />, '#ef4444'),
    ],
  },
  {
    id: 'accounting-annual',
    title: 'عملیات سالانه',
    color: '#0ea5e9',
    items: [
      { id: 'acc-annual-opening', title: 'سند افتتاحیه', icon: <PostAddIcon />, path: '/accounting/annual/opening-document', color: '#0ea5e9', primary: false, ready: true },
      { id: 'acc-annual-close-accounts', title: 'بستن حساب‌ها', icon: <LockIcon />, path: '/accounting/annual/close-accounts', color: '#f59e0b', primary: false, ready: true },
      { id: 'acc-annual-closing', title: 'سند اختتامیه', icon: <LockIcon />, path: '/accounting/annual/closing-document', color: '#ef4444', primary: false, ready: true },
      { id: 'acc-annual-legal-books', title: 'ساخت دفاتر قانونی', icon: <MenuBookIcon />, path: '/accounting/annual/legal-books', color: '#10b981', primary: false, ready: true },
    ],
  },
  {
    id: 'accounting-reports',
    title: 'گزارش‌ها',
    color: '#8b5cf6',
    items: [
      { id: 'acc-report-matrix', title: 'مرور ترکیبی (ماتریس)', icon: <GridViewIcon />, path: '/accounting/reports/matrix', color: '#06b6d4', primary: false, ready: true },
      { id: 'acc-report-tree-tb', title: 'تراز درختی حساب‌ها', icon: <AccountTreeIcon />, path: '/accounting/reports/tree-trial-balance', color: '#8b5cf6', primary: false, ready: true },
      { id: 'acc-report-ledger-review', title: 'مرور پله‌ای دفاتر', icon: <MenuBookIcon />, path: '/accounting/reports/ledger-review', color: '#f59e0b', primary: false, ready: true },
      { id: 'acc-report-balance-sheet', title: 'ترازنامه', icon: <AccountBalanceIcon />, path: '/accounting/reports/balance-sheet', color: '#3b82f6', primary: false, ready: true },
      { id: 'acc-report-income-statement', title: 'سود و زیان', icon: <TrendingUpIcon />, path: '/accounting/reports/income-statement', color: '#10b981', primary: false, ready: true },
      { id: 'acc-report-cash-flow', title: 'جریان وجوه نقد', icon: <AccountBalanceWalletIcon />, path: '/accounting/reports/cash-flow', color: '#0ea5e9', primary: false, ready: true },
      { id: 'acc-report-financial-statements', title: 'صورت‌های مالی', icon: <DescriptionIcon />, path: '/accounting/reports/financial-statements', color: '#ec4899', primary: false, ready: true },
    ],
  },
  {
    id: 'accounting-tax',
    title: 'مالیات و اظهارنامه',
    color: '#d97706',
    items: [
      { id: 'acc-tax-vat', title: 'گزارش ارزش افزوده', icon: <ReceiptIcon />, path: '/accounting/tax/vat-ledger', color: '#d97706', primary: false, ready: true },
      { id: 'acc-tax-seasonal', title: 'معاملات فصلی خرید', icon: <CalendarViewMonthIcon />, path: '/accounting/tax/seasonal', color: '#f59e0b', primary: false, ready: true },
      { id: 'acc-tax-official', title: 'دفاتر رسمی مالیاتی', icon: <MenuBookIcon />, path: '/accounting/tax/official-ledger', color: '#10b981', primary: false, ready: true },
      { id: 'acc-tax-bi', title: 'داشبورد هوش مالی', icon: <InsightsIcon />, path: '/accounting/tax/bi-dashboard', color: '#8b5cf6', primary: false, ready: true },
    ],
  },
];

const TREASURY_ACCENT = '#14b8a6';
const treasuryItem = (id, title, icon, path, color = TREASURY_ACCENT) => ({
  id, title, icon, path, color, primary: false, ready: true,
});

const treasuryMenu = [
  {
    // ── خانه ──────────────────────────────────────────────────────────
    id: 'treasury-home', title: 'خانه', color: TREASURY_ACCENT,
    items: [
      {
        id: 'treasury',
        title: 'داشبورد خزانه',
        icon: <AccountBalanceWalletIcon />,
        path: '/treasury',
        color: TREASURY_ACCENT,
        primary: true,
        ready: true,
      },
    ],
  },
  {
    id: 'treasury-money-movement', title: 'دریافت و پرداخت', color: '#0ea5e9',
    items: [
      treasuryItem('treasury-transactions', 'همه عملیات', <SwapHorizIcon />, '/treasury/transactions', '#0ea5e9'),
      treasuryItem('treasury-receipts', 'دریافت‌ها', <CallReceivedIcon />, '/treasury/receipts', '#10b981'),
      treasuryItem('treasury-payments-list', 'پرداخت‌ها', <PaymentsIcon />, '/treasury/transactions?direction=payment', '#ef4444'),
      treasuryItem('treasury-transfers', 'انتقال وجوه', <CompareArrowsIcon />, '/treasury/transfers', '#3b82f6'),
      treasuryItem('treasury-voucher-book', 'فیش‌ها و رسیدها', <ReceiptLongIcon />, '/treasury/voucher-book', '#0284c7'),
    ],
  },
  {
    id: 'treasury-requests-orders', title: 'درخواست و دستور پرداخت', color: '#3b82f6',
    items: [
      treasuryItem('treasury-payment-requests', 'درخواست‌های پرداخت', <RequestQuoteIcon />, '/treasury/payment-requests', '#3b82f6'),
      treasuryItem('treasury-payment-orders', 'دستورهای پرداخت', <PaymentsIcon />, '/treasury/payment-orders', '#0284c7'),
      treasuryItem('treasury-pending-approval', 'در انتظار تأیید', <FactCheckOutlinedIcon />, '/treasury/payment-requests?status=submitted,under_review', '#b45309'),
      treasuryItem('treasury-pending-payment', 'در انتظار پرداخت', <EventAvailableIcon />, '/treasury/payment-requests?status=approved,scheduled,payment_ordered', '#8b5cf6'),
      treasuryItem('treasury-paid-requests', 'پرداخت‌شده', <VerifiedUserIcon />, '/treasury/payment-requests?status=paid', '#10b981'),
    ],
  },
  {
    id: 'treasury-banking', title: 'بانک و حساب‌ها', color: '#0f766e',
    items: [
      treasuryItem('treasury-banks', 'بانک‌ها', <AccountBalanceIcon />, '/treasury/banks', '#0ea5e9'),
      treasuryItem('treasury-bank-branches', 'شعب', <AltRouteIcon />, '/treasury/bank-branches', '#0284c7'),
      treasuryItem('treasury-accounts', 'حساب‌های بانکی', <AccountBalanceWalletIcon />, '/treasury/accounts', '#0f766e'),
      treasuryItem('treasury-statement', 'گردش حساب', <HistoryIcon />, '/treasury/transactions', '#3b82f6'),
      treasuryItem('treasury-bank-orders', 'عملیات بانکی', <AccountBalanceIcon />, '/treasury/bank-orders', '#14b8a6'),
    ],
  },
  {
    id: 'treasury-pos', title: 'کارت‌خوان و درگاه', color: '#f59e0b',
    items: [
      treasuryItem('treasury-terminals', 'پایانه‌ها', <PointOfSaleIcon />, '/treasury/terminals', '#f59e0b'),
      treasuryItem('treasury-pos-transactions', 'تراکنش‌ها', <ReceiptLongIcon />, '/treasury/receipts?method=pos', '#d97706'),
      treasuryItem('treasury-pos-settlements', 'تسویه‌ها', <PaymentsIcon />, '/treasury/receipts?method=pos&status=cleared', '#10b981'),
      treasuryItem('treasury-pos-mismatches', 'مغایرت‌ها', <InsightsIcon />, '/treasury/reconciliation', '#ef4444'),
    ],
  },
  {
    id: 'treasury-receivable-docs', title: 'اسناد دریافتنی', color: '#10b981',
    items: [
      treasuryItem('treasury-received-checks', 'چک‌های دریافتی', <ReceiptLongIcon />, '/treasury/received-checks', '#10b981'),
      treasuryItem('treasury-checks-clearing', 'در جریان وصول', <TimelineIcon />, '/treasury/received-checks?status=deposited,clearing', '#7c3aed'),
      treasuryItem('treasury-checks-cleared', 'وصول‌شده', <VerifiedUserIcon />, '/treasury/received-checks?status=cleared', '#0f766e'),
      treasuryItem('treasury-checks-bounced', 'برگشتی', <RuleIcon />, '/treasury/received-checks?status=bounced', '#ef4444'),
      treasuryItem('treasury-checks-returned', 'عودتی', <SyncAltIcon />, '/treasury/received-checks?status=returned_to_customer', '#b45309'),
    ],
  },
  {
    id: 'treasury-payable-docs', title: 'اسناد پرداختنی', color: '#ef4444',
    items: [
      treasuryItem('treasury-issued-checks', 'چک‌های پرداختی', <PaymentsIcon />, '/treasury/issued-checks', '#ef4444'),
      treasuryItem('treasury-issued-checks-issued', 'صادرشده', <EditNoteIcon />, '/treasury/issued-checks?status=issued', '#0ea5e9'),
      treasuryItem('treasury-issued-checks-delivered', 'تحویل‌شده', <HandshakeIcon />, '/treasury/issued-checks?status=delivered', '#3b82f6'),
      treasuryItem('treasury-issued-checks-cleared', 'وصول‌شده', <VerifiedUserIcon />, '/treasury/issued-checks?status=cleared', '#0f766e'),
      treasuryItem('treasury-issued-checks-bounced', 'برگشتی', <RuleIcon />, '/treasury/issued-checks?status=bounced', '#ef4444'),
    ],
  },
  {
    id: 'treasury-check-ops', title: 'عملیات چک', color: '#8b5cf6',
    items: [
      treasuryItem('treasury-check-register', 'ثبت چک', <PostAddIcon />, '/treasury/received-checks?status=registered', '#8b5cf6'),
      treasuryItem('treasury-check-assign', 'واگذاری', <AltRouteIcon />, '/treasury/received-checks?status=deposited', '#3b82f6'),
      treasuryItem('treasury-check-transfer', 'انتقال', <SyncAltIcon />, '/treasury/received-checks?status=transferred', '#0ea5e9'),
      treasuryItem('treasury-check-collect', 'وصول', <VerifiedUserIcon />, '/treasury/received-checks?status=cleared', '#0f766e'),
      treasuryItem('treasury-check-bounce', 'برگشت', <RuleIcon />, '/treasury/received-checks?status=bounced', '#ef4444'),
      treasuryItem('treasury-check-return', 'عودت', <CompareArrowsIcon />, '/treasury/received-checks?status=returned_to_customer', '#b45309'),
      treasuryItem('treasury-check-cancel', 'ابطال', <LockIcon />, '/treasury/received-checks?status=cancelled', '#64748b'),
    ],
  },
  {
    id: 'treasury-cash', title: 'صندوق و وجوه نقد', color: '#14b8a6',
    items: [
      treasuryItem('treasury-cashboxes', 'صندوق‌ها', <PointOfSaleIcon />, '/treasury/cashboxes', '#14b8a6'),
      treasuryItem('treasury-cash-receipts', 'دریافت نقدی', <CallReceivedIcon />, '/treasury/receipts?method=cash', '#10b981'),
      treasuryItem('treasury-cash-payments', 'پرداخت نقدی', <PaymentsIcon />, '/treasury/transactions?direction=payment&instrument_kind=cash', '#ef4444'),
      treasuryItem('treasury-cash-count', 'شمارش صندوق', <FactCheckIcon />, '/treasury/cashboxes', '#0ea5e9'),
      treasuryItem('treasury-cash-mismatch', 'مغایرت صندوق', <InsightsIcon />, '/treasury/reconciliation', '#b45309'),
    ],
  },
  {
    id: 'treasury-due', title: 'تعهدات و سررسیدها', color: '#b45309',
    items: [
      treasuryItem('treasury-commitments', 'تعهدات پرداخت', <EventAvailableIcon />, '/treasury/payment-commitments', '#b45309'),
      treasuryItem('treasury-commitments-open', 'پرداخت‌های آتی', <CalendarMonthIcon />, '/treasury/payment-commitments?status=open', '#d97706'),
      treasuryItem('treasury-future-receipts', 'دریافت‌های آتی', <CallReceivedIcon />, '/treasury/receipts?status=expected', '#0ea5e9'),
      treasuryItem('treasury-checks-due', 'چک‌های سررسید', <PaymentsIcon />, '/treasury/issued-checks?due_soon=1', '#ef4444'),
      treasuryItem('treasury-due-calendar', 'تقویم سررسید', <CalendarMonthIcon />, '/treasury/forecast', '#8b5cf6'),
    ],
  },
  {
    id: 'treasury-liquidity', title: 'مدیریت نقدینگی', color: '#0ea5e9',
    items: [
      treasuryItem('treasury-cash-flow', 'جریان نقدی', <TimelineIcon />, '/treasury/reports?kind=daily', '#0ea5e9'),
      treasuryItem('treasury-sources-uses', 'منابع و مصارف', <CompareArrowsIcon />, '/treasury/reports?kind=cash_flow', '#0284c7'),
      treasuryItem('treasury-forecast', 'پیش‌بینی نقدینگی', <InsightsIcon />, '/treasury/forecast', '#14b8a6'),
      treasuryItem('treasury-liquidity-gap', 'شکاف نقدینگی', <TrendingUpIcon />, '/treasury', '#8b5cf6'),
      treasuryItem('treasury-liquidity-scenarios', 'سناریوهای نقدینگی', <PsychologyIcon />, '/treasury/forecast', '#7c3aed'),
    ],
  },
  {
    id: 'treasury-recon', title: 'مغایرت بانکی', color: '#0f766e',
    items: [
      treasuryItem('treasury-reconciliation', 'دوره‌های مغایرت', <InsightsIcon />, '/treasury/reconciliation', '#0f766e'),
      treasuryItem('treasury-statement-lines', 'صورت‌حساب بانک', <MenuBookIcon />, '/treasury/reconciliation', '#0284c7'),
      treasuryItem('treasury-recon-auto', 'تطبیق خودکار', <RuleIcon />, '/treasury/reconciliation', '#0ea5e9'),
      treasuryItem('treasury-recon-manual', 'تطبیق دستی', <HandshakeIcon />, '/treasury/reconciliation', '#3b82f6'),
      treasuryItem('treasury-recon-open', 'موارد مغایر', <RuleIcon />, '/treasury/reconciliation', '#ef4444'),
    ],
  },
  {
    id: 'treasury-fx', title: 'عملیات ارزی', color: '#7c3aed',
    items: [
      treasuryItem('treasury-currencies', 'ارزها', <NumbersIcon />, '/treasury/accounts', '#7c3aed'),
      treasuryItem('treasury-fx-accounts', 'حساب‌های ارزی', <AccountBalanceWalletIcon />, '/treasury/accounts', '#8b5cf6'),
      treasuryItem('treasury-fx-receipts', 'دریافت ارزی', <CallReceivedIcon />, '/treasury/receipts?method=foreign_currency', '#0ea5e9'),
      treasuryItem('treasury-fx-payments', 'پرداخت ارزی', <PaymentsIcon />, '/treasury/transactions?direction=payment', '#ef4444'),
      treasuryItem('treasury-fx-revaluation', 'تسعیر ارز', <CalculateIcon />, '/treasury/reports', '#14b8a6'),
    ],
  },
  {
    id: 'treasury-reports', title: 'گزارش‌ها', color: '#3b82f6',
    items: [
      treasuryItem('treasury-reports-main', 'دریافت و پرداخت', <AssessmentIcon />, '/treasury/reports', '#3b82f6'),
      treasuryItem('treasury-reports-bank', 'بانک', <AccountBalanceIcon />, '/treasury/reports?kind=cash_flow', '#0ea5e9'),
      treasuryItem('treasury-reports-cash', 'صندوق', <PointOfSaleIcon />, '/treasury/reports?kind=cash_flow', '#14b8a6'),
      treasuryItem('treasury-reports-cheque', 'چک', <ReceiptLongIcon />, '/treasury/reports?kind=receivables_due', '#ef4444'),
      treasuryItem('treasury-reports-pos', 'کارت‌خوان', <PointOfSaleIcon />, '/treasury/reports?kind=daily', '#f59e0b'),
      treasuryItem('treasury-reports-commitments', 'تعهدات', <EventAvailableIcon />, '/treasury/reports?kind=by_party', '#b45309'),
      treasuryItem('treasury-reports-liquidity', 'نقدینگی', <TrendingUpIcon />, '/treasury/reports?kind=daily', '#8b5cf6'),
    ],
  },
  {
    id: 'treasury-print', title: 'اسناد و چاپ', color: '#64748b',
    items: [
      treasuryItem('treasury-print-receipt', 'فیش دریافت', <CallReceivedIcon />, '/treasury/receipts', '#10b981'),
      treasuryItem('treasury-print-payment', 'فیش پرداخت', <PaymentsIcon />, '/treasury/payment-orders', '#ef4444'),
      treasuryItem('treasury-print-slips', 'رسیدها', <ReceiptLongIcon />, '/treasury/voucher-book', '#0284c7'),
      treasuryItem('treasury-print-notices', 'اعلامیه‌ها', <DescriptionIcon />, '/treasury/bank-orders', '#3b82f6'),
      treasuryItem('treasury-print-order', 'دستور پرداخت', <PostAddIcon />, '/treasury/payment-orders', '#8b5cf6'),
      treasuryItem('treasury-print-templates', 'قالب‌های چاپ', <NumbersIcon />, '/treasury/print-templates', '#64748b'),
    ],
  },
  {
    id: 'treasury-master', title: 'تعاریف', color: '#0f766e',
    items: [
      treasuryItem('treasury-banks-master', 'بانک‌ها و شعب', <AccountBalanceIcon />, '/treasury/banks', '#0ea5e9'),
      treasuryItem('treasury-accounts-master', 'حساب‌های بانکی', <AccountBalanceWalletIcon />, '/treasury/accounts', '#0f766e'),
      treasuryItem('treasury-cashboxes-master', 'صندوق‌ها', <PaymentsIcon />, '/treasury/cashboxes', '#14b8a6'),
      treasuryItem('treasury-payment-methods', 'روش‌های دریافت و پرداخت', <TuneIcon />, '/treasury/payment-methods', '#8b5cf6'),
      treasuryItem('treasury-document-types', 'انواع اسناد', <CategoryIcon />, '/treasury/voucher-book', '#0284c7'),
      treasuryItem('treasury-numbering', 'شماره‌گذاری', <NumbersIcon />, '/treasury/numbering', '#64748b'),
      treasuryItem('treasury-approval-rules', 'سطوح تأیید', <FactCheckOutlinedIcon />, '/treasury/approval-rules', '#b45309'),
      treasuryItem('treasury-print-templates-master', 'قالب چاپ', <NumbersIcon />, '/treasury/print-templates', '#7c3aed'),
    ],
  },



];

const procurementMenu = [
  {
    id: 'procurement-home',
    title: 'خانه',
    color: '#f59e0b',
    items: [
      { id: 'procurement', title: 'داشبورد مدیریت خرید', icon: <ShoppingCartIcon />, path: '/procurement', color: '#f59e0b', primary: true, ready: true },
    ],
  },
  {
    id: 'procurement-profile',
    title: 'مدیریت خرید',
    color: '#f59e0b',
    items: [
      { id: 'procurement-profiles', title: 'پرونده خرید', icon: <StorefrontIcon />, path: '/procurement/profiles', color: '#f59e0b', primary: true, ready: true },
    ],
  },
  {
    id: 'procurement-master',
    title: 'اطلاعات پایه',
    color: '#f59e0b',
    items: [
      { id: 'procurement-suppliers', title: 'تأمین‌کنندگان', icon: <StorefrontIcon />, path: '/procurement/suppliers', color: '#f59e0b', primary: false, ready: true },
      { id: 'procurement-items', title: 'کالاها و خدمات', icon: <Inventory2Icon />, path: '/procurement/items', color: '#10b981', primary: false, ready: true },
    ],
  },
  {
    id: 'procurement-operations',
    title: 'خریدها',
    color: '#3b82f6',
    items: [
      { id: 'procurement-inquiries', title: 'استعلام‌ها (RFQ)', icon: <RequestQuoteIcon />, path: '/procurement/inquiries', color: '#f59e0b', primary: true, ready: true },
      { id: 'procurement-requests', title: 'درخواست‌های خرید', icon: <RequestQuoteIcon />, path: '/procurement/requests', color: '#3b82f6', primary: false, ready: true },
      { id: 'procurement-orders', title: 'سفارش‌های خرید', icon: <ShoppingCartIcon />, path: '/procurement/orders', color: '#8b5cf6', primary: false, ready: true },
      { id: 'procurement-receipts', title: 'رسید کالا', icon: <LocalShippingIcon />, path: '/procurement/receipts', color: '#0ea5e9', primary: false, ready: true },
      { id: 'procurement-invoices', title: 'صورتحساب‌ها', icon: <ReceiptLongIcon />, path: '/procurement/invoices', color: '#ef4444', primary: false, ready: true },
      { id: 'procurement-payments', title: 'پرداخت‌ها', icon: <PaymentsIcon />, path: '/procurement/payments', color: '#10b981', primary: false, ready: true },
      { id: 'procurement-proforma', title: 'پیش‌فاکتورها', icon: <ReceiptLongIcon />, path: '/procurement/proforma', color: '#8b5cf6', primary: false, ready: true },
      { id: 'procurement-guarantees', title: 'تضامین خرید', icon: <RequestQuoteIcon />, path: '/procurement/guarantees', color: '#0f766e', primary: false, ready: true },
      { id: 'procurement-allocations', title: 'تخصیص پرداخت‌ها', icon: <PaymentsIcon />, path: '/procurement/allocations', color: '#0ea5e9', primary: false, ready: true },
    ],
  },
];

const projectsMenu = [
  {
    id: 'projects-home',
    title: 'خانه',
    color: '#8b5cf6',
    items: [
      { id: 'projects-dashboard', title: 'داشبورد', icon: <DashboardIcon />, path: '/projects/dashboard', color: '#8b5cf6', primary: true, ready: true },
    ],
  },
  {
    id: 'projects-management',
    title: 'مدیریت پروژه',
    color: '#8b5cf6',
    items: [
      { id: 'projects', title: 'پروژه‌ها', icon: <AccountTreeIcon />, path: '/projects', color: '#8b5cf6', primary: true, ready: true },
      { id: 'projects-types', title: 'انواع پروژه', icon: <CategoryIcon />, path: '/projects/types', color: '#6366f1', primary: false, ready: true },
      { id: 'projects-definitions', title: 'تعاریف اولیه', icon: <CategoryIcon />, path: '/projects/definitions', color: '#6d28d9', primary: false, ready: true },
      { id: 'projects-calendar', title: 'تقویم پروژه‌ها', icon: <CalendarMonthIcon />, path: '/projects/calendar', color: '#10b981', primary: false, ready: true },
      { id: 'projects-schedule', title: 'زمان‌بندی و EVM', icon: <TimelineIcon />, path: '/projects/schedule', color: '#8b5cf6', primary: true, ready: true },
      { id: 'projects-risks', title: 'رجیستر ریسک', icon: <InsightsIcon />, path: '/projects/risks', color: '#ef4444', primary: false, ready: true },
      { id: 'projects-quality', title: 'کیفیت و HSE', icon: <FactCheckIcon />, path: '/projects/quality', color: '#0ea5e9', primary: false, ready: true },
      { id: 'projects-structure', title: 'ساختار (WBS / CBS)', icon: <AccountTreeIcon />, path: '/projects/structure', color: '#0ea5e9', primary: false, ready: true },
      { id: 'projects-resources', title: 'منابع (RBS)', icon: <Inventory2Icon />, path: '/projects/resources', color: '#10b981', primary: false, ready: true },
      { id: 'projects-cost-sources', title: 'منشأ هزینه', icon: <NumbersIcon />, path: '/projects/cost-sources', color: '#f59e0b', primary: false, ready: true },
      { id: 'projects-obs', title: 'OBS', icon: <AdminPanelSettingsIcon />, path: '/projects/obs', color: '#ef4444', primary: false, ready: true },
    ],
  },
  {
    id: 'projects-commercial',
    title: 'تجاری و قراردادها',
    color: '#f59e0b',
    items: [
      { id: 'projects-price-lists', title: 'فهرست‌بها', icon: <ReceiptLongIcon />, path: '/projects/price-lists', color: '#f59e0b', primary: false, ready: true },
      { id: 'projects-contracts', title: 'قراردادها و تجاری', icon: <HistoryEduIcon />, path: '/projects/commercial', color: '#f97316', primary: false, ready: true },
      { id: 'projects-change-orders', title: 'تغییرات پروژه', icon: <HistoryEduIcon />, path: '/projects/change-orders', color: '#ec4899', primary: false, ready: true },
            { id: 'projects-certification', title: 'صورتجلسه و گواهی پرداخت', icon: <FactCheckIcon />, path: '/projects/certification', color: '#10b981', primary: false, ready: true },

      comingSoon('/projects/progress', 'projects-progress', 'صورت‌وضعیت‌ها', <BarChartOutlinedIcon />, '#6366f1'),
    ],
  },
  {
    id: 'projects-cost',
    title: 'بهای تمام‌شده',
    color: '#ef4444',
    items: [
      { id: 'projects-cost-dashboard', title: 'کنترل هزینه', icon: <ReceiptIcon />, path: '/projects/cost', color: '#ef4444', primary: false, ready: true },
      comingSoon('/projects/cost-transactions', 'projects-cost-transactions', 'تراکنش‌های هزینه', <ReceiptIcon />, '#ef4444'),
      comingSoon('/projects/commitments', 'projects-commitments', 'تعهدات', <LockIcon />, '#8b5cf6'),
    ],
  },
  {
    id: 'projects-control',
    title: 'کنترل پروژه',
    color: '#10b981',
    items: [
      comingSoon('/projects/budget', 'projects-budget', 'بودجه', <AssessmentIcon />, '#10b981'),
      { id: 'projects-reports', title: 'گزارش‌ها', icon: <InsightsIcon />, path: '/projects/reports', color: '#6366f1', primary: false, ready: true },
    ],
  },
];

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
      { id: 'contracts-templates', title: 'قالب‌ها و پیش‌نویس‌ها', icon: <DescriptionIcon />, path: '/contracts-templates', color: '#6366f1', primary: false, ready: true },
      { id: 'contracts-drafts', title: 'پیش‌نویس‌ها', icon: <FactCheckIcon />, path: '/contracts-drafts', color: '#64748b', primary: false, ready: true },
      { id: 'contracts-approvals', title: 'در انتظار تأیید', icon: <RuleIcon />, path: '/contracts-approvals', color: '#f59e0b', primary: false, ready: true },
      { id: 'contracts-calendar', title: 'تقویم قراردادها', icon: <CalendarMonthIcon />, path: '/contracts-calendar', color: '#10b981', primary: false, ready: true },
    ],
  },
  {
    id: 'contracts-finance',
    title: 'مالی قرارداد',
    color: '#3b82f6',
    items: [
      { id: 'contracts-finance-page', title: 'تحلیل مالی قرارداد', icon: <ReceiptIcon />, path: '/contracts-finance', color: '#3b82f6', primary: false, ready: true },
      { id: 'contracts-invoices', title: 'فاکتورها', icon: <ReceiptIcon />, path: '/contracts-invoices', color: '#10b981', primary: false, ready: true },
      { id: 'contracts-statements', title: 'صورت‌وضعیت‌ها', icon: <ReceiptLongIcon />, path: '/contracts-statements', color: '#6366f1', primary: false, ready: true },
      { id: 'contracts-payments', title: 'پرداخت‌ها', icon: <PaymentsIcon />, path: '/contracts-payments', color: '#8b5cf6', primary: false, ready: true },
      { id: 'contracts-addendums', title: 'الحاقیه‌ها', icon: <DescriptionIcon />, path: '/contracts-addendums', color: '#ec4899', primary: false, ready: true },
      { id: 'contracts-guarantees', title: 'تضامین', icon: <LockIcon />, path: '/contracts-guarantees', color: '#ef4444', primary: false, ready: true },
    ],
  },
  {
    id: 'contracts-parties',
    title: 'طرف‌های قرارداد',
    color: '#0ea5e9',
    items: [
      { id: 'contract-parties-list', title: 'پیمانکاران و فروشندگان', icon: <StorefrontIcon />, path: '/contract-parties', color: '#0ea5e9', primary: false, ready: true },
      { id: 'contract-parties-eval', title: 'ارزیابی تأمین‌کنندگان', icon: <AssessmentIcon />, path: '/contracts-evaluations', color: '#f97316', primary: false, ready: true },
    ],
  },
  {
    id: 'contracts-risks',
    title: 'پایش قراردادها',
    color: '#f59e0b',
    items: [
      { id: 'contracts-expiring', title: 'قراردادهای رو به انقضا', icon: <NotificationsActiveIcon />, path: '/contracts-expiring', color: '#f59e0b', primary: false, ready: true },
      { id: 'contracts-completeness', title: 'نواقص قراردادها', icon: <FactCheckIcon />, path: '/contracts-completeness', color: '#be123c', primary: false, ready: true },
      { id: 'contracts-guarantees-monitor', title: 'پایش تضامین', icon: <VerifiedUserIcon />, path: '/contracts-guarantees-monitor', color: '#0f766e', primary: false, ready: true },
      { id: 'contracts-disputes', title: 'اختلافات و دعاوی', icon: <GavelIcon />, path: '/contracts-disputes', color: '#8b5cf6', primary: false, ready: true },
    ],
  },
  {
    id: 'contracts-config',
    title: 'پیکربندی',
    color: '#64748b',
    items: [
      { id: 'contracts-types', title: 'انواع قرارداد', icon: <CategoryIcon />, path: '/contracts-settings', color: '#14b8a6', primary: false, ready: true },
      { id: 'contracts-account-mapping', title: 'نگاشت و کنترل', icon: <AccountTreeIcon />, path: '/contracts-accounting-mapping', color: '#0f766e', primary: false, ready: true },
      { id: 'contracts-evaluations', title: 'ارزیابی تأمین‌کنندگان', icon: <AssessmentIcon />, path: '/contracts-evaluations', color: '#f97316', primary: false, ready: true },
      { id: 'contracts-workflow', title: 'گردشکار تأیید', icon: <SwapHorizIcon />, path: '/contracts-workflow', color: '#6366f1', primary: false, ready: true },
    ],
  },
  {
    id: 'contracts-docs',
    title: 'ارتباطات و اسناد',
    color: '#06b6d4',
    items: [
      { id: 'correspondences-c', title: 'مکاتبات', icon: <MailOutlineIcon />, path: '/correspondence', color: '#06b6d4', primary: false, ready: true },
      { id: 'contracts-docs', title: 'بایگانی اسناد قرارداد', icon: <FolderSharedIcon />, path: '/contracts-documents', color: '#f97316', primary: false, ready: true },
    ],
  },
];

const DOCUMENT_MODULE_ICONS = {
  people: <PeopleIcon />,
  person: <PeopleIcon />,
  person_search: <PersonSearchIcon />,
  contract: <HandshakeIcon />,
  project: <AccountTreeIcon />,
  pettycash: <AccountBalanceWalletIcon />,
  payroll: <PaymentsIcon />,
  accounting: <CalculateIcon />,
  procurement: <ShoppingCartIcon />,
  treasury: <AccountBalanceIcon />,
  organization: <FolderSharedIcon />,
  correspondence: <MailOutlineIcon />,
};

const documentLibraryPath = (module, root) => (
  root
    ? `/document-management/library?folder=${root.id}`
    : `/document-management/library?module=${module.key}`
);

const documentLibraryItem = (module, folders = []) => {
  const roots = moduleRootFolders(folders, module.key);
  const children = (module.children || []).map((child) => {
    const childRoots = moduleRootFolders(folders, child.key);
    return {
      id: `dms-library-${child.key}`,
      title: child.label,
      icon: DOCUMENT_MODULE_ICONS[child.icon] || <FolderCopyIcon />,
      path: documentLibraryPath(child, childRoots[0]),
      color: child.color || module.color,
      ready: true,
    };
  });
  return {
    id: `dms-library-${module.key}`,
    title: module.label,
    icon: DOCUMENT_MODULE_ICONS[module.icon] || <FolderCopyIcon />,
    path: module.children?.length ? `/document-management/library?module=${module.key}` : documentLibraryPath(module, roots[0]),
    color: module.color,
    primary: false,
    ready: true,
    children: children.length ? children : undefined,
  };
};

export const buildLibraryModuleItems = (folders = []) => (
  DOCUMENT_LIBRARY_MODULES.map((module) => documentLibraryItem(module, folders))
);

const documentsMenu = [
  {
    id: 'documents-home',
    title: 'خانه',
    color: '#0f766e',
    items: [
      { id: 'documents-dashboard', title: 'داشبورد اسناد', icon: <DashboardIcon />, path: '/document-management', color: '#0f766e', primary: true, ready: true },
    ],
  },
  {
    id: 'documents-overview',
    title: 'نمای کلی',
    color: '#64748b',
    items: [
      { id: 'documents-all', title: 'همه اسناد', icon: <FolderCopyIcon />, path: '/document-management/library?scope=all', color: '#0f766e', primary: false, ready: true },
      { id: 'documents-drafts', title: 'پیش‌نویس‌ها', icon: <FactCheckIcon />, path: '/document-management/library?workflow=draft', color: '#64748b', primary: false, ready: true },
      { id: 'documents-mine', title: 'اسناد من', icon: <PersonSearchIcon />, path: '/document-management/library?scope=mine', color: '#0ea5e9', primary: false, ready: true },
      { id: 'documents-confidential', title: 'اسناد محرمانه', icon: <LockIcon />, path: '/document-management/library?confidentiality=confidential', color: '#be123c', primary: false, ready: true },
    ],
  },
  {
    id: 'documents-library',
    title: 'کتابخانه اسناد',
    color: '#0ea5e9',
    items: buildLibraryModuleItems([]),
  },
  {
    id: 'documents-workflow',
    title: 'گردش‌کار اسناد',
    color: '#7c3aed',
    items: [
      { id: 'documents-workflow-review', title: 'در حال بررسی', icon: <FactCheckOutlinedIcon />, path: '/document-management/library?workflow=in_review', color: '#2563eb', primary: false, ready: true },
      { id: 'documents-workflow-approved', title: 'تأییدشده', icon: <VerifiedUserIcon />, path: '/document-management/library?workflow=approved', color: '#7c3aed', primary: false, ready: true },
      { id: 'documents-workflow-published', title: 'منتشرشده و لازم‌الاجرا', icon: <GavelIcon />, path: '/document-management/library?workflow=published', color: '#0f766e', primary: false, ready: true },
      { id: 'documents-workflow-rejected', title: 'ردشده / بازگشتی', icon: <HistoryIcon />, path: '/document-management/library?workflow=rejected', color: '#be123c', primary: false, ready: true },
      { id: 'documents-workflow-withdrawn', title: 'لغوشده', icon: <LockIcon />, path: '/document-management/library?workflow=withdrawn', color: '#b45309', primary: false, ready: true },
      { id: 'documents-workflow-superseded', title: 'جایگزین‌شده', icon: <SwapHorizIcon />, path: '/document-management/library?workflow=superseded', color: '#64748b', primary: false, ready: true },
    ],
  },
  {
    id: 'documents-control',
    title: 'پایش و بایگانی',
    color: '#f59e0b',
    items: [
      { id: 'documents-archived', title: 'بایگانی اسناد', icon: <FolderSharedIcon />, path: '/document-management/library?status=archived', color: '#b45309', primary: false, ready: true },
      { id: 'documents-expiring', title: 'اسناد نزدیک انقضا', icon: <NotificationsActiveIcon />, path: '/document-management/library?scope=expiring', color: '#f59e0b', primary: false, ready: true },
      { id: 'documents-review-due', title: 'بازنگری سررسیدشده', icon: <EventAvailableIcon />, path: '/document-management/library?review=due', color: '#7c3aed', primary: false, ready: true },
      { id: 'documents-expired', title: 'اسناد منقضی', icon: <HistoryIcon />, path: '/document-management/library?scope=expired', color: '#be123c', primary: false, ready: true },
    ],
  },
  {
    id: 'documents-structure',
    title: 'ساختار و مدیریت',
    color: '#0f766e',
    items: [
      { id: 'documents-folders', title: 'پوشه‌ها و ماژول‌ها', icon: <FolderCopyIcon />, path: '/document-management/folders', color: '#0f766e', primary: false, ready: true },
    ],
  },
  {
    id: 'documents-reports',
    title: 'گزارش‌ها و تاریخچه',
    color: '#6366f1',
    items: [
      { id: 'documents-report', title: 'گزارش جامع اسناد', icon: <InsightsIcon />, path: '/document-management/reports', color: '#6366f1', primary: false, ready: true },
      { id: 'documents-activity', title: 'تاریخچه فعالیت', icon: <HistoryIcon />, path: '/document-management/activity', color: '#8b5cf6', primary: false, ready: true },
    ],
  },
];

const DOCUMENTS_COMPANY_ROOT_CODE = 'company.documents';

const dmsFolderPath = (id) => `/document-management/library?folder=${id}`;
const dmsFolderItem = (folder) => ({
  id: `dms-folder-${folder.id}`,
  title: folder.name,
  path: dmsFolderPath(folder.id),
  color: folder.color || '#0f766e',
  primary: false,
  ready: true,
});

const dmsFolderChildren = (folders, parentId, limit = 40) => {
  const children = folders
    .filter((folder) => String(folder.parent || '') === String(parentId))
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name || '').localeCompare(String(b.name || ''), 'fa'));
  const items = children.slice(0, limit).map(dmsFolderItem);
  if (children.length > limit) {
    items.push({
      id: `dms-more-${parentId}`,
      title: 'مشاهده همه پوشه‌ها…',
      path: '/document-management/folders',
      color: '#64748b',
      ready: true,
    });
  }
  return items;
};

export function buildDocumentsMenu(folders = []) {
  const rows = Array.isArray(folders) ? folders : [];
  if (!rows.length) return documentsMenu;

  const items = buildLibraryModuleItems(rows);
  const companyRoot = rows.find((folder) => folder.code === DOCUMENTS_COMPANY_ROOT_CODE)
    || moduleRootFolders(rows, 'organization')[0];
  const organizationItem = items.find((item) => item.id === 'dms-library-organization');
  if (organizationItem && companyRoot) {
    const children = dmsFolderChildren(rows, companyRoot.id);
    organizationItem.path = dmsFolderPath(companyRoot.id);
    organizationItem.children = children.length ? children : undefined;
  }

  return documentsMenu.map((group) => (
    group.id === 'documents-library' ? { ...group, items } : group
  ));
}

const correspondenceMenu = [
  {
    id: 'correspondence-home',
    title: 'میزکار مکاتبات',
    color: '#0ea5e9',
    items: [
      { id: 'correspondence-dashboard', title: 'داشبورد مکاتبات', icon: <DashboardIcon />, path: '/correspondence', color: '#0ea5e9', primary: true, ready: true },
    ],
  },
  {
    id: 'correspondence-registry',
    title: 'دفتر وارده و صادره',
    color: '#0284c7',
    items: [
      { id: 'correspondence-all', title: 'همه مکاتبات', icon: <MailOutlineIcon />, path: '/correspondence/letters', color: '#0ea5e9', primary: false, ready: true },
      { id: 'correspondence-incoming', title: 'نامه‌های وارده', icon: <InboxIcon />, path: '/correspondence/incoming', color: '#0284c7', primary: true, ready: true },
      { id: 'correspondence-outgoing', title: 'نامه‌های صادره', icon: <SendIcon />, path: '/correspondence/outgoing', color: '#0f766e', primary: false, ready: true },
      { id: 'correspondence-internal', title: 'مکاتبات داخلی', icon: <MailOutlineIcon />, path: '/correspondence/internal', color: '#7c3aed', primary: false, ready: true },
      { id: 'correspondence-new', title: 'ثبت نامه جدید', icon: <PostAddIcon />, path: '/correspondence/incoming?new=1', color: '#10b981', primary: false, ready: true },
      { id: 'correspondence-drafts', title: 'پیش‌نویس‌ها', icon: <EditNoteIcon />, path: '/correspondence/drafts', color: '#64748b', primary: false, ready: true },
    ],
  },
  {
    id: 'correspondence-followup',
    title: 'ارجاع و پیگیری',
    color: '#f59e0b',
    items: [
      { id: 'correspondence-referrals', title: 'ارجاعات من', icon: <AltRouteIcon />, path: '/correspondence/referrals', color: '#f59e0b', primary: false, ready: true },
      { id: 'correspondence-overdue', title: 'پیگیری معوقات', icon: <NotificationsActiveIcon />, path: '/correspondence/overdue', color: '#be123c', primary: false, ready: true },
      { id: 'correspondence-archive', title: 'بایگانی مکاتبات', icon: <FolderSharedIcon />, path: '/correspondence/archive', color: '#475569', primary: false, ready: true },
    ],
  },
  {
    id: 'correspondence-admin',
    title: 'تعاریف و مخاطبین',
    color: '#8b5cf6',
    items: [
      { id: 'correspondence-name-mapping', title: 'نگاشت نام‌ها', icon: <SyncAltIcon />, path: '/correspondence/name-mapping', color: '#8b5cf6', primary: false, ready: true },
      { id: 'correspondence-directory', title: 'مخاطبین و سازمان‌ها', icon: <ContactsIcon />, path: '/correspondence/settings?tab=contacts', color: '#8b5cf6', primary: false, ready: true },
      { id: 'correspondence-settings', title: 'تنظیمات مکاتبات', icon: <SettingsIcon />, path: '/correspondence/settings', color: '#64748b', primary: false, ready: true },
    ],
  },
];

/**
 * حذف آیتم‌های منو که کاربر مجوز «مشاهده» آنها را ندارد.
 *
 * قاعدهٔ سازگاری: اگر کاربر برای این ماژول هیچ کد ریز فعالی نداشته باشد
 * (کاربران قدیمی/نقش‌محور)، منو دست‌نخورده برمی‌گردد تا کسی قفل نشود.
 */
const filterMenuByPermissions = (menu, moduleSlug, permissions) => {
  if (!permissions || typeof permissions !== 'object') return menu;
  const prefix = `${moduleSlug}.`;
  const hasCodes = Object.keys(permissions).some(
    (code) => code.startsWith(prefix) && Boolean(permissions[code]),
  );
  if (!hasCodes) return menu;

  const keepItem = (item) => {
    const id = String(item?.id || '');
    const key = id.startsWith(`${moduleSlug}-`) ? id.slice(moduleSlug.length + 1) : id;
    return Boolean(permissions[`${moduleSlug}.${key}.view`]);
  };

  return menu
    .map((group) => {
      if (Array.isArray(group.items)) {
        return { ...group, items: group.items.filter(keepItem) };
      }
      return group;
    })
    .filter((group) => (Array.isArray(group.items) ? group.items.length > 0 : true));
};

export function getMenuForApp(appSlug, options = {}) {
  let menu;
  if (appSlug === 'documents') {
    menu = options.folders?.length ? buildDocumentsMenu(options.folders) : documentsMenu;
  } else if (appSlug === 'contracts') menu = contractsMenu;
  else if (appSlug === 'settings') menu = settingsMenu;
  else if (appSlug === 'projects') menu = projectsMenu;
  else if (appSlug === 'pettycash') menu = pettycashMenu;
  else if (appSlug === 'accounting') menu = accountingMenu;
  else if (appSlug === 'procurement') menu = procurementMenu;
  else if (appSlug === 'treasury') menu = treasuryMenu;
  else if (appSlug === 'correspondence') menu = correspondenceMenu;
  else menu = menuConfig;

  return filterMenuByPermissions(menu, appSlug, options.permissions);
}

export default menuConfig;
