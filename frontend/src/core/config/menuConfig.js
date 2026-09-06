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
import PaymentsIcon from '@mui/icons-material/Payments';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import PsychologyIcon from '@mui/icons-material/Psychology';
import CategoryIcon from '@mui/icons-material/Category';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';

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
    ],
  },
  {
    id: 'operations',
    title: 'چرخه عملیات و کارکنان',
    color: '#14b8a6',
    items: [
      { id: 'org-chart', title: 'چارت سازمانی', icon: <AccountTreeIcon />, path: '/org-chart', color: '#8b5cf6', primary: true, ready: true },
      { id: 'data-entry', title: 'ورود اطلاعات', icon: <EditNoteIcon />, path: '/data-entry', color: '#f97316', primary: false, ready: true },
      { id: 'attendance', title: 'حضور و غیاب', icon: <AccessTimeFilledIcon />, path: '/attendance', color: '#0ea5e9', primary: false, ready: true },
      { id: 'leaves', title: 'مرخصی و مأموریت', icon: <BeachAccessIcon />, path: '/leaves', color: '#06b6d4', primary: false, ready: true },
      { id: 'requests', title: 'درخواست‌های اداری', icon: <FactCheckIcon />, path: '/requests', color: '#f59e0b', primary: false, ready: true },
    ],
  },
  {
    id: 'payroll',
    title: 'مالی',
    color: '#3b82f6',
    items: [
      { id: 'payslips', title: 'فیش حقوق', icon: <ReceiptLongIcon />, path: '/payslips', color: '#3b82f6', primary: true, ready: true },
      { id: 'finance-reports', title: 'گزارش مالی', icon: <PaymentsIcon />, path: '/finance-reports', color: '#6366f1', primary: false, ready: true },
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
      { id: 'company-documents', title: 'بایگانی اسناد سازمان', icon: <FolderSharedIcon />, path: '/documents', color: '#f97316', primary: false, ready: true },
    ],
  },
  {
    id: 'insights',
    title: 'بینش و دستیار هوشمند',
    color: '#f43f5e',
    items: [
      { id: 'scoring', title: 'امتیازدهی و ارزیابی', icon: <LeaderboardIcon />, path: '/scoring', color: '#3b82f6', primary: true, ready: true },
      { id: 'assistant', title: 'دستیار هوشمند', icon: <PsychologyIcon />, path: '/assistant', color: '#8b5cf6', primary: false, ready: true },
    ],
  },
  {
    id: 'system',
    title: 'مدیریت سیستم',
    color: '#64748b',
    items: [
      { id: 'definitions', title: 'تعاریف اولیه', icon: <CategoryIcon />, path: '/definitions', color: '#14b8a6', primary: true, ready: true },
      { id: 'users', title: 'کاربران و نقش‌ها', icon: <AdminPanelSettingsIcon />, path: '/users', color: '#64748b', primary: false, ready: true },
      { id: 'audit', title: 'دفترچه فعالیت (Audit)', icon: <HistoryIcon />, path: '/audit', color: '#64748b', primary: false, ready: true },
      { id: 'settings', title: 'تنظیمات کلی', icon: <SettingsIcon />, path: '/settings', color: '#64748b', primary: false, ready: true },
    ],
  },
];

export default menuConfig;