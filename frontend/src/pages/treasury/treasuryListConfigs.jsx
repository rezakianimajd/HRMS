import React from 'react';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import { statusChip } from './treasuryListUi';

/**
 * کانفیگ فهرست‌های ماژول خزانه: داده + ستون‌ها + فیلتر + عملیات.
 * ظاهر (هدر/نوار جست‌وجو/جدول) از موتور مشترک `TreasuryListPage` می‌آید.
 */

export const dateColumn = (key, label, width = '10%') => ({ key, label, width, type: 'date' });
export const moneyColumn = (key, label, width = '14%') => ({
  key, label, width, type: 'money', align: 'center',
});

export const ENTITY_FILTER = {
  key: 'entity', label: 'حساب/صندوق', optionsFrom: 'entities', width: 190,
};
export const DATE_FROM = { key: 'date_from', label: 'از تاریخ', type: 'date' };
export const DATE_TO = { key: 'date_to', label: 'تا تاریخ', type: 'date' };

export const METHOD_OPTIONS = [
  { value: 'cash', label: 'نقدی' },
  { value: 'bank', label: 'واریز به حساب' },
  { value: 'transfer', label: 'حواله بانکی' },
  { value: 'internal_transfer', label: 'انتقال بانکی' },
  { value: 'cheque', label: 'چک' },
  { value: 'guarantee_cheque', label: 'چک تضمینی' },
  { value: 'card_to_card', label: 'کارت‌به‌کارت' },
  { value: 'pos', label: 'کارت‌خوان' },
  { value: 'draft', label: 'اسناد دریافتنی' },
  { value: 'foreign_currency', label: 'ارزی' },
  { value: 'other', label: 'سایر' },
];

export const DOC_STATUS_OPTIONS = [
  { value: 'draft', label: 'پیش‌نویس' },
  { value: 'posted', label: 'ثبت‌شده' },
  { value: 'cancelled', label: 'لغو' },
];

export const RECEIPTS_CONFIG = {
  title: 'دریافت‌ها',
  subtitle: 'فیش‌های دریافت نقدی/بانکی/چکی با چرخهٔ وصول و چاپ رسید',
  icon: <CallReceivedIcon />,
  endpoint: '/treasury/receipts/',
  queryKey: ['treasury-receipts'],
  searchPlaceholder: 'جست‌وجوی شماره، طرف حساب یا پیگیری…',
  filters: [
    {
      key: 'status',
      label: 'وضعیت',
      options: [
        { value: 'expected', label: 'مورد انتظار' },
        { value: 'received', label: 'دریافت‌شده' },
        { value: 'cleared', label: 'وصول‌شده' },
        { value: 'returned', label: 'برگشتی' },
      ],
    },
    ENTITY_FILTER,
    { key: 'method', label: 'روش دریافت', options: METHOD_OPTIONS, width: 180 },
    DATE_FROM,
    DATE_TO,
  ],
  columns: [
    { key: 'number', label: 'شماره فیش', width: '14%', render: (row) => row.number || `#${row.id}` },
    dateColumn('received_date', 'تاریخ دریافت'),
    {
      key: 'party_name',
      label: 'طرف حساب',
      width: '20%',
      render: (row) => row.party_name || row.received_from || '—',
    },
    {
      key: 'method',
      label: 'روش',
      width: '12%',
      render: (row) => row.payment_method_name || row.method_display,
    },
    { key: 'purpose', label: 'بابت', width: '16%', render: (row) => row.purpose || '—' },
    moneyColumn('amount', 'مبلغ'),
    { key: 'status', label: 'وضعیت', width: '11%', align: 'center', render: (row) => statusChip(row) },
  ],
  rowActions: [
    {
      key: 'receive',
      label: 'دریافت',
      url: (row) => `/treasury/receipts/${row.id}/receive/`,
      visible: (row) => row.status === 'expected',
    },
    {
      key: 'clear',
      label: 'وصول',
      url: (row) => `/treasury/receipts/${row.id}/clear/`,
      visible: (row) => row.status === 'received',
    },
  ],
  quickCreate: {
    label: 'دریافت جدید',
    fields: [
      { name: 'party', label: 'طرف حساب', type: 'remote', endpoint: '/contract-parties/', labelKey: 'name' },
      { name: 'received_from', label: 'دریافت از (نام آزاد)' },
      { name: 'amount', label: 'مبلغ', type: 'number', required: true },
      { name: 'entity', label: 'بانک/صندوق', type: 'remote', endpoint: '/treasury/treasury-entities/', labelKey: 'name' },
      { name: 'method', label: 'روش دریافت', type: 'select', options: METHOD_OPTIONS },
      { name: 'purpose', label: 'بابت' },
      { name: 'expected_date', label: 'تاریخ مورد انتظار', type: 'date' },
    ],
  },
  emptyText: 'دریافتی با این فیلترها ثبت نشده است.',
};

export const TRANSACTIONS_CONFIG = {
  title: 'همه عملیات دریافت و پرداخت',
  subtitle: 'گردش حساب‌ها و صندوق‌ها با انواع سند (نقدی/چک/شبا/سند)',
  icon: <CallReceivedIcon />,
  endpoint: '/treasury/treasury-transactions/',
  queryKey: ['treasury-transactions'],
  searchPlaceholder: 'جست‌وجوی شماره، طرف، پیگیری یا مرجع بانکی…',
  filters: [
    {
      key: 'direction',
      label: 'جهت',
      options: [
        { value: 'receipt', label: 'دریافت' },
        { value: 'payment', label: 'پرداخت' },
      ],
    },
    { key: 'status', label: 'وضعیت', options: DOC_STATUS_OPTIONS },
    {
      key: 'instrument_kind',
      label: 'نوع سند',
      options: [
        { value: 'cash', label: 'نقدی' },
        { value: 'cheque', label: 'چک' },
        { value: 'sheba', label: 'شبا' },
        { value: 'bill', label: 'سند/برات' },
        { value: 'pos', label: 'کارت‌خوان' },
      ],
    },
    ENTITY_FILTER,
    DATE_FROM,
    DATE_TO,
  ],
  columns: [
    { key: 'number', label: 'سریال', width: '14%', render: (row) => row.number || `#${row.id}` },
    dateColumn('date', 'تاریخ'),
    {
      key: 'direction',
      label: 'جهت',
      width: '8%',
      align: 'center',
      render: (row) => row.direction_display,
    },
    {
      key: 'instrument_kind',
      label: 'نوع سند',
      width: '10%',
      align: 'center',
      render: (row) => row.instrument_kind_display,
    },
    {
      key: 'entity_name',
      label: 'حساب/صندوق',
      width: '16%',
      render: (row) => row.entity_name || '—',
    },
    { key: 'party', label: 'طرف حساب', width: '18%', render: (row) => row.party || '—' },
    moneyColumn('amount', 'مبلغ', '12%'),
    {
      key: 'status',
      label: 'وضعیت',
      width: '10%',
      align: 'center',
      render: (row) => statusChip(row),
    },
  ],
  rowActions: [
    {
      key: 'post',
      label: 'ثبت',
      url: (row) => `/treasury/treasury-transactions/${row.id}/post_transaction/`,
      visible: (row) => row.status === 'draft',
    },
    {
      key: 'cancel',
      label: 'ابطال',
      url: (row) => `/treasury/treasury-transactions/${row.id}/cancel/`,
      payload: () => ({ reason: 'ابطال از فهرست عملیات' }),
      visible: (row) => row.status === 'draft',
    },
  ],
  emptyText: 'عملیاتی با این فیلترها ثبت نشده است.',
};

