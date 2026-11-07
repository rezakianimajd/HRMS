import React from 'react';
import PaymentsIcon from '@mui/icons-material/Payments';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { dateColumn, moneyColumn } from './treasuryListConfigs';
import { statusChip } from './treasuryListUi';

const RECEIVED_STATUS = [
  { value: 'registered', label: 'ثبت‌شده' },
  { value: 'in_custody', label: 'در صندوق اسناد' },
  { value: 'deposited', label: 'واگذارشده به بانک' },
  { value: 'clearing', label: 'در جریان وصول' },
  { value: 'cleared', label: 'وصول‌شده' },
  { value: 'bounced', label: 'برگشتی' },
  { value: 'returned_to_customer', label: 'عودت به صادرکننده' },
  { value: 'transferred', label: 'واگذارشده به شخص' },
  { value: 'cancelled', label: 'لغو' },
];

const ISSUED_STATUS = [
  { value: 'draft', label: 'پیش‌نویس' },
  { value: 'issued', label: 'صادرشده' },
  { value: 'delivered', label: 'تحویل‌شده' },
  { value: 'cleared', label: 'پاس‌شده' },
  { value: 'bounced', label: 'برگشتی' },
  { value: 'returned', label: 'عودت‌شده' },
  { value: 'cancelled', label: 'لغو' },
];

export const RECEIVED_CHECKS_CONFIG = {
  title: 'چک‌های دریافتی',
  subtitle: 'صندوق اسناد → واگذاری به بانک → وصول/برگشت/عودت/واگذاری به شخص',
  icon: <ReceiptLongIcon />,
  endpoint: '/treasury/received-checks/',
  queryKey: ['treasury-received-checks'],
  searchPlaceholder: 'جست‌وجوی شماره چک، بانک، صادرکننده یا سریال…',
  filters: [{ key: 'status', label: 'وضعیت', options: RECEIVED_STATUS, width: 190 }],
  columns: [
    { key: 'number', label: 'شماره چک', width: '12%' },
    { key: 'kind_display', label: 'نوع', width: '9%', align: 'center' },
    { key: 'party', label: 'صادرکننده', width: '20%' },
    { key: 'bank_name', label: 'بانک', width: '16%' },
    dateColumn('due_date', 'سررسید'),
    moneyColumn('amount', 'مبلغ', '14%'),
    {
      key: 'status',
      label: 'وضعیت',
      width: '14%',
      align: 'center',
      render: (row) => statusChip(row),
    },
  ],
  rowActions: [
    {
      key: 'receive', label: 'تحویل', url: (row) => `/treasury/received-checks/${row.id}/receive/`,
      visible: (row) => row.status === 'registered',
    },
    {
      key: 'deposit', label: 'واگذاری', url: (row) => `/treasury/received-checks/${row.id}/deposit/`,
      visible: (row) => ['registered', 'in_custody'].includes(row.status),
    },
    {
      key: 'clear', label: 'وصول', url: (row) => `/treasury/received-checks/${row.id}/clear/`,
      visible: (row) => ['deposited', 'clearing'].includes(row.status),
    },
    {
      key: 'bounce', label: 'برگشت', url: (row) => `/treasury/received-checks/${row.id}/bounce/`,
      payload: () => ({ reason: 'برگشت از فهرست چک‌ها' }),
      visible: (row) => ['deposited', 'clearing'].includes(row.status),
    },
  ],
  quickCreate: {
    label: 'ثبت چک دریافتی',
    fields: [
      { name: 'number', label: 'شماره چک', required: true },
      { name: 'party', label: 'صادرکننده', required: true },
      { name: 'bank_name', label: 'بانک صادرکننده', required: true },
      { name: 'amount', label: 'مبلغ', type: 'number', required: true },
      { name: 'issue_date', label: 'تاریخ صدور', type: 'date', required: true },
      { name: 'due_date', label: 'سررسید', type: 'date', required: true },
    ],
  },
  emptyText: 'چکی با این فیلترها ثبت نشده است.',
};

export const ISSUED_CHECKS_CONFIG = {
  title: 'چک‌های پرداختی',
  subtitle: 'صدور → تحویل به ذی‌نفع → پاس/برگشت/عودت',
  icon: <PaymentsIcon />,
  endpoint: '/treasury/issued-checks/',
  queryKey: ['treasury-issued-checks'],
  searchPlaceholder: 'جست‌وجوی شماره چک، ذی‌نفع یا بانک…',
  filters: [{ key: 'status', label: 'وضعیت', options: ISSUED_STATUS, width: 190 }],
  columns: [
    { key: 'number', label: 'شماره چک', width: '12%' },
    { key: 'party', label: 'ذی‌نفع', width: '22%' },
    { key: 'checkbook_bank', label: 'بانک', width: '16%', render: (row) => row.checkbook_bank || '—' },
    dateColumn('due_date', 'سررسید'),
    dateColumn('delivery_date', 'تحویل'),
    moneyColumn('amount', 'مبلغ', '14%'),
    { key: 'status', label: 'وضعیت', width: '12%', align: 'center', render: (row) => statusChip(row) },
  ],
  rowActions: [
    {
      key: 'issue', label: 'صدور', url: (row) => `/treasury/issued-checks/${row.id}/issue/`,
      visible: (row) => row.status === 'draft',
    },
    {
      key: 'deliver', label: 'تحویل', url: (row) => `/treasury/issued-checks/${row.id}/deliver/`,
      visible: (row) => row.status === 'issued',
    },
    {
      key: 'clear', label: 'پاس', url: (row) => `/treasury/issued-checks/${row.id}/clear/`,
      visible: (row) => ['issued', 'delivered'].includes(row.status),
    },
    {
      key: 'return_check', label: 'عودت', url: (row) => `/treasury/issued-checks/${row.id}/return_check/`,
      visible: (row) => ['issued', 'delivered'].includes(row.status),
    },
  ],
  emptyText: 'چکی با این فیلترها ثبت نشده است.',
};
