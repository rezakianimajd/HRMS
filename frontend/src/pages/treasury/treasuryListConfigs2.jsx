import React from 'react';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PaymentsIcon from '@mui/icons-material/Payments';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import {
  DATE_FROM, DATE_TO, ENTITY_FILTER, dateColumn, moneyColumn,
} from './treasuryListConfigs';
import { statusChip } from './treasuryListUi';

const REQUEST_STATUS = [
  { value: 'draft', label: 'پیش‌نویس' },
  { value: 'submitted', label: 'ثبت‌شده' },
  { value: 'under_review', label: 'در بررسی' },
  { value: 'approved', label: 'تأییدشده' },
  { value: 'scheduled', label: 'برنامه‌ریزی‌شده' },
  { value: 'payment_ordered', label: 'دستور صادرشده' },
  { value: 'paid', label: 'پرداخت‌شده' },
  { value: 'rejected', label: 'ردشده' },
  { value: 'returned', label: 'برگشتی' },
  { value: 'cancelled', label: 'لغو' },
];

export const PAYMENT_REQUESTS_CONFIG = {
  title: 'درخواست‌های پرداخت',
  subtitle: 'چرخهٔ درخواست → بررسی → تأیید → اجرا با کسورات و مبلغ خالص',
  icon: <RequestQuoteIcon />,
  endpoint: '/treasury/payment-requests/',
  queryKey: ['treasury-payment-requests'],
  searchPlaceholder: 'جست‌وجوی شماره، عنوان یا طرف حساب…',
  filters: [
    { key: 'status', label: 'وضعیت', options: REQUEST_STATUS, width: 180 },
    DATE_FROM,
    DATE_TO,
  ],
  columns: [
    { key: 'number', label: 'شماره', width: '12%', render: (row) => row.number || `#${row.id}` },
    dateColumn('requested_date', 'تاریخ درخواست'),
    { key: 'title', label: 'عنوان', width: '22%' },
    { key: 'party_name', label: 'ذی‌نفع', width: '16%', render: (row) => row.party_name || '—' },
    moneyColumn('amount', 'مبلغ', '12%'),
    moneyColumn('deductions_total', 'کسورات', '10%'),
    moneyColumn('net_amount', 'خالص', '12%'),
    { key: 'status', label: 'وضعیت', width: '12%', align: 'center', render: (row) => statusChip(row) },
  ],
  rowActions: [
    {
      key: 'submit', label: 'ثبت',
      url: (row) => `/treasury/payment-requests/${row.id}/submit/`,
      visible: (row) => row.status === 'draft',
    },
    {
      key: 'review', label: 'بررسی',
      url: (row) => `/treasury/payment-requests/${row.id}/under_review/`,
      visible: (row) => row.status === 'submitted',
    },
    {
      key: 'approve', label: 'تأیید',
      url: (row) => `/treasury/payment-requests/${row.id}/approve/`,
      visible: (row) => row.status === 'under_review',
    },
  ],
  quickCreate: {
    label: 'درخواست جدید',
    fields: [
      { name: 'title', label: 'عنوان', required: true },
      { name: 'party', label: 'طرف حساب', type: 'remote', endpoint: '/contract-parties/', labelKey: 'name' },
      { name: 'amount', label: 'مبلغ', type: 'number', required: true },
      { name: 'requested_date', label: 'تاریخ درخواست', type: 'date', required: true },
      { name: 'due_date', label: 'تاریخ مورد نیاز', type: 'date' },
      { name: 'description', label: 'شرح' },
    ],
  },
  emptyText: 'درخواستی با این فیلترها ثبت نشده است.',
};

export const PAYMENT_ORDERS_CONFIG = {
  title: 'دستورهای پرداخت',
  subtitle: 'صدور و اجرای دستور پرداخت با روش/ابزار مشخص و شماره پیگیری',
  icon: <PaymentsIcon />,
  endpoint: '/treasury/payment-orders/',
  queryKey: ['treasury-payment-orders'],
  searchPlaceholder: 'جست‌وجوی شماره دستور، درخواست یا ذی‌نفع…',
  filters: [
    {
      key: 'status',
      label: 'وضعیت',
      options: [
        { value: 'draft', label: 'پیش‌نویس' },
        { value: 'issued', label: 'صادرشده' },
        { value: 'executed', label: 'اجراشده' },
        { value: 'returned', label: 'برگشتی' },
        { value: 'cancelled', label: 'لغو' },
      ],
    },
    ENTITY_FILTER,
    DATE_FROM,
    DATE_TO,
  ],
  columns: [
    { key: 'number', label: 'شماره', width: '14%', render: (row) => row.number || `#${row.id}` },
    { key: 'request_number', label: 'درخواست', width: '14%', render: (row) => row.request_number || '—' },
    { key: 'beneficiary_name', label: 'ذی‌نفع', width: '20%', render: (row) => row.beneficiary_name || '—' },
    { key: 'instrument_display', label: 'ابزار', width: '12%', render: (row) => row.payment_method_name || row.instrument_display },
    { key: 'entity_name', label: 'حساب/صندوق', width: '16%', render: (row) => row.entity_name || '—' },
    moneyColumn('amount', 'مبلغ', '12%'),
    dateColumn('execution_date', 'تاریخ اجرا'),
    { key: 'status', label: 'وضعیت', width: '12%', align: 'center', render: (row) => statusChip(row) },
  ],
  rowActions: [
    {
      key: 'issue', label: 'صدور',
      url: (row) => `/treasury/payment-orders/${row.id}/issue/`,
      visible: (row) => row.status === 'draft',
    },
    {
      key: 'execute', label: 'اجرا',
      url: (row) => `/treasury/payment-orders/${row.id}/execute/`,
      visible: (row) => row.status === 'issued',
    },
  ],
  emptyText: 'دستور پرداختی ثبت نشده است.',
};

export const COMMITMENTS_CONFIG = {
  title: 'تعهدات پرداخت',
  subtitle: 'بدهی‌های قطعی/در انتظار خزانه با سررسید و مانده',
  icon: <EventAvailableIcon />,
  endpoint: '/treasury/payment-commitments/',
  queryKey: ['treasury-commitments'],
  searchPlaceholder: 'جست‌وجوی شماره، عنوان یا طرف حساب…',
  filters: [
    {
      key: 'status',
      label: 'وضعیت',
      options: [
        { value: 'open', label: 'باز' },
        { value: 'scheduled', label: 'برنامه‌ریزی‌شده' },
        { value: 'partial', label: 'پرداخت جزئی' },
        { value: 'paid', label: 'تسویه‌شده' },
      ],
    },
    DATE_FROM,
    DATE_TO,
  ],
  columns: [
    { key: 'number', label: 'شماره', width: '12%', render: (row) => row.number || `#${row.id}` },
    { key: 'title', label: 'عنوان', width: '26%' },
    { key: 'party_name', label: 'طرف حساب', width: '18%', render: (row) => row.party_name || '—' },
    moneyColumn('amount', 'مبلغ', '14%'),
    moneyColumn('balance', 'مانده', '12%'),
    dateColumn('due_date', 'سررسید'),
    { key: 'status', label: 'وضعیت', width: '12%', align: 'center', render: (row) => statusChip(row) },
  ],
  quickCreate: {
    label: 'تعهد جدید',
    fields: [
      { name: 'title', label: 'عنوان تعهد', required: true },
      { name: 'party', label: 'طرف حساب', type: 'remote', endpoint: '/contract-parties/', labelKey: 'name' },
      { name: 'amount', label: 'مبلغ', type: 'number', required: true },
      { name: 'due_date', label: 'سررسید', type: 'date' },
    ],
  },
  emptyText: 'تعهدی ثبت نشده است.',
};

export const TRANSFERS_CONFIG = {
  title: 'انتقال وجوه',
  subtitle: 'انتقال بین حساب‌ها/صندوق‌ها با کارمزد و شماره پیگیری',
  icon: <SwapHorizIcon />,
  endpoint: '/treasury/treasury-transfers/',
  queryKey: ['treasury-transfers'],
  searchPlaceholder: 'جست‌وجوی شماره یا شرح…',
  filters: [
    {
      key: 'status',
      label: 'وضعیت',
      options: [
        { value: 'draft', label: 'پیش‌نویس' },
        { value: 'posted', label: 'ثبت‌شده' },
        { value: 'cancelled', label: 'لغو' },
      ],
    },
    ENTITY_FILTER,
    DATE_FROM,
    DATE_TO,
  ],
  columns: [
    { key: 'number', label: 'شماره', width: '12%', render: (row) => row.number || `#${row.id}` },
    dateColumn('date', 'تاریخ'),
    { key: 'source_name', label: 'از حساب', width: '20%', render: (row) => row.source_name || '—' },
    { key: 'destination_name', label: 'به حساب', width: '20%', render: (row) => row.destination_name || '—' },
    moneyColumn('amount', 'مبلغ', '14%'),
    moneyColumn('fee', 'کارمزد', '10%'),
    { key: 'status', label: 'وضعیت', width: '12%', align: 'center', render: (row) => statusChip(row) },
  ],
  rowActions: [
    {
      key: 'post', label: 'ثبت',
      url: (row) => `/treasury/treasury-transfers/${row.id}/post_transfer/`,
      visible: (row) => row.status === 'draft',
    },
  ],
  emptyText: 'انتقالی ثبت نشده است.',
};


export const ADVANCES_CONFIG = {
  title: 'علی‌الحساب‌ها',
  subtitle: 'پیش‌پرداخت‌ها/علی‌الحساب با مانده و تسویهٔ خودکار',
  icon: <RequestQuoteIcon />,
  endpoint: '/treasury/advance-accounts/',
  queryKey: ['treasury-advances'],
  searchPlaceholder: 'جست‌وجوی شماره یا طرف حساب…',
  filters: [
    {
      key: 'status',
      label: 'وضعیت',
      options: [
        { value: 'open', label: 'باز' },
        { value: 'partial', label: 'تسویه جزئی' },
        { value: 'settled', label: 'تسویه‌شده' },
      ],
    },
  ],
  columns: [
    { key: 'number', label: 'شماره', width: '14%', render: (row) => row.number || `#${row.id}` },
    dateColumn('date', 'تاریخ'),
    { key: 'party_name', label: 'طرف حساب', width: '22%', render: (row) => row.party_name || '—' },
    moneyColumn('amount', 'مبلغ', '14%'),
    moneyColumn('settled_amount', 'تسویه‌شده', '14%'),
    moneyColumn('balance', 'مانده', '14%'),
    { key: 'status', label: 'وضعیت', width: '12%', align: 'center', render: (row) => statusChip(row) },
  ],
  emptyText: 'علی‌الحسابی ثبت نشده است.',
};

export const GUARANTEES_CONFIG = {
  title: 'سپرده و ضمانت‌نامه',
  subtitle: 'سپرده‌های حسن انجام کار/مناقصه و ضمانت‌نامه‌ها با هشدار سررسید',
  icon: <VerifiedUserIcon />,
  endpoint: '/treasury/guarantees/',
  queryKey: ['treasury-guarantees'],
  searchPlaceholder: 'جست‌وجوی شماره، صادرکننده یا ذی‌نفع…',
  filters: [
    {
      key: 'status',
      label: 'وضعیت',
      options: [
        { value: 'active', label: 'فعال' },
        { value: 'expired', label: 'منقضی' },
        { value: 'released', label: 'آزادشده' },
      ],
    },
  ],
  columns: [
    { key: 'number', label: 'شماره', width: '12%', render: (row) => row.number || `#${row.id}` },
    { key: 'kind_display', label: 'نوع', width: '18%' },
    { key: 'beneficiary', label: 'ذی‌نفع', width: '20%', render: (row) => row.beneficiary || '—' },
    moneyColumn('amount', 'مبلغ', '14%'),
    dateColumn('expiry_date', 'انقضا'),
    {
      key: 'days',
      label: 'روز تا انقضا',
      width: '12%',
      align: 'center',
      render: (row) => (row.days_to_expiry === null ? '—' : row.days_to_expiry),
    },
    { key: 'status', label: 'وضعیت', width: '12%', align: 'center', render: (row) => statusChip(row) },
  ],
  rowActions: [
    {
      key: 'release', label: 'آزادسازی',
      url: (row) => `/treasury/guarantees/${row.id}/release/`,
      visible: (row) => row.status === 'active',
    },
  ],
  emptyText: 'سپرده‌ای ثبت نشده است.',
};

export const CHECKBOOKS_CONFIG = {
  title: 'دسته‌چک‌ها',
  subtitle: 'دسته‌چک بانک‌ها با سری و برگ مصرف‌شده',
  icon: <MenuBookIcon />,
  endpoint: '/treasury/check-books/',
  queryKey: ['treasury-checkbooks'],
  searchPlaceholder: 'جست‌وجوی کد، بانک یا شماره حساب…',
  columns: [
    { key: 'code', label: 'کد', width: '12%' },
    { key: 'bank_name', label: 'بانک', width: '24%' },
    {
      key: 'account_number',
      label: 'شماره حساب',
      width: '20%',
      render: (row) => row.account_number || '—',
    },
    { key: 'series_start', label: 'از سری', width: '12%', render: (row) => row.series_start || '—' },
    { key: 'series_end', label: 'تا سری', width: '12%', render: (row) => row.series_end || '—' },
    {
      key: 'used',
      label: 'مصرف‌شده',
      width: '14%',
      align: 'center',
      render: (row) => `${row.used_leaves || 0} از ${row.total_leaves || 0}`,
    },
  ],
  emptyText: 'دسته‌چکی ثبت نشده است.',
};

export const PAYABLES_CONFIG = {
  title: 'قابل‌پرداخت‌ها',
  subtitle: 'تجمیع بدهی‌ها از تدارکات، حقوق، قرارداد و پروژه',
  icon: <ReceiptLongIcon />,
  endpoint: '/treasury/payable-items/',
  queryKey: ['treasury-payables'],
  searchPlaceholder: 'جست‌وجوی عنوان یا طرف حساب…',
  filters: [
    {
      key: 'is_paid',
      label: 'وضعیت تسویه',
      options: [
        { value: 'false', label: 'باز' },
        { value: 'true', label: 'تسویه‌شده' },
      ],
    },
  ],
  columns: [
    { key: 'title', label: 'عنوان', width: '28%' },
    { key: 'source_type_display', label: 'نوع مبدأ', width: '14%' },
    { key: 'party', label: 'طرف حساب', width: '18%', render: (row) => row.party || '—' },
    moneyColumn('amount', 'مبلغ', '14%'),
    moneyColumn('balance', 'مانده', '12%'),
    dateColumn('due_date', 'سررسید'),
  ],
  emptyText: 'قابل‌پرداختی ثبت نشده است.',
};

export { AccountBalanceIcon, DATE_FROM, DATE_TO, ENTITY_FILTER };

