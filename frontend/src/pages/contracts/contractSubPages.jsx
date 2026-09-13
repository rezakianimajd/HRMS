import React from 'react';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentsIcon from '@mui/icons-material/Payments';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ContractSubEntityPage from './ContractSubEntityPage';
import { formatPersianNumber } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';

/* ---------------------------- Invoices ---------------------------- */
export const ContractInvoicesPage = () => (
  <ContractSubEntityPage
    config={{
      title: 'فاکتورهای قرارداد',
      subtitle: 'ثبت و مدیریت فاکتورها با مبلغ، مالیات و مبلغ کل',
      color: '#8b5cf6',
      icon: <ReceiptIcon sx={{ color: '#fff' }} />,
      endpoint: '/contract-invoices/',
      queryKey: 'invoices-sub',
      addLabel: 'فاکتور جدید',
      editLabel: 'ویرایش فاکتور',
      listColumns: [
        { key: 'number', label: 'شماره' },
        { key: 'date', label: 'تاریخ', render: (v) => toJalali(v) },
        { key: 'amount', label: 'مبلغ', render: (v) => formatPersianNumber(v || 0) },
        { key: 'vat', label: 'مالیات', render: (v) => formatPersianNumber(v || 0) },
        { key: 'total', label: 'مبلغ کل', render: (v) => formatPersianNumber(v || 0) },
      ],
      fields: [
        { key: 'number', label: 'شماره فاکتور', type: 'text', span: 6 },
        { key: 'date', label: 'تاریخ فاکتور', type: 'date', span: 6 },
        { key: 'amount', label: 'مبلغ (ریال)', type: 'number', span: 4 },
        { key: 'vat', label: 'مالیات (ریال)', type: 'number', span: 4 },
        { key: 'total', label: 'مبلغ کل (ریال)', type: 'number', span: 4 },
        { key: 'is_paid', label: 'پرداخت شده', type: 'bool', span: 6 },
        { key: 'description', label: 'توضیحات', type: 'textarea', span: 12 },
      ],
    }}
  />
);

/* --------------------------- Statements --------------------------- */
export const ContractStatementsPage = () => (
  <ContractSubEntityPage
    config={{
      title: 'صورت‌وضعیت‌های قرارداد',
      subtitle: 'ثبت صورت‌وضعیت با شماره، تاریخ، مبلغ و وضعیت تأیید',
      color: '#6366f1',
      icon: <ReceiptLongIcon sx={{ color: '#fff' }} />,
      endpoint: '/contract-statements/',
      queryKey: 'statements-sub',
      addLabel: 'صورت‌وضعیت جدید',
      editLabel: 'ویرایش صورت‌وضعیت',
      listColumns: [
        { key: 'number', label: 'شماره' },
        { key: 'date', label: 'تاریخ', render: (v) => toJalali(v) },
        { key: 'amount', label: 'مبلغ', render: (v) => formatPersianNumber(v || 0) },
        { key: 'is_approved', label: 'تأیید', render: (v) => (v ? 'تأیید شده' : 'در انتظار') },
      ],
      fields: [
        { key: 'number', label: 'شماره صورت‌وضعیت', type: 'text', span: 6 },
        { key: 'date', label: 'تاریخ', type: 'date', span: 6 },
        { key: 'amount', label: 'مبلغ (ریال)', type: 'number', span: 6 },
        { key: 'is_approved', label: 'تأیید شده', type: 'bool', span: 6 },
        { key: 'description', label: 'توضیحات', type: 'textarea', span: 12 },
      ],
    }}
  />
);

/* ---------------------------- Payments ---------------------------- */
export const ContractPaymentsPage = () => (
  <ContractSubEntityPage
    config={{
      title: 'پرداخت‌های قرارداد',
      subtitle: 'ثبت پرداخت‌ها با تاریخ، مبلغ، مرجع و روش پرداخت',
      color: '#10b981',
      icon: <PaymentsIcon sx={{ color: '#fff' }} />,
      endpoint: '/contract-payments/',
      queryKey: 'payments-sub',
      addLabel: 'پرداخت جدید',
      editLabel: 'ویرایش پرداخت',
      listColumns: [
        { key: 'date', label: 'تاریخ', render: (v) => toJalali(v) },
        { key: 'amount', label: 'مبلغ', render: (v) => formatPersianNumber(v || 0) },
        { key: 'reference', label: 'مرجع' },
        { key: 'method', label: 'روش' },
      ],
      fields: [
        { key: 'date', label: 'تاریخ پرداخت', type: 'date', span: 6 },
        { key: 'amount', label: 'مبلغ (ریال)', type: 'number', span: 6 },
        { key: 'reference', label: 'شماره مرجع / سند', type: 'text', span: 6 },
        { key: 'method', label: 'روش پرداخت', type: 'text', span: 6 },
      ],
    }}
  />
);

/* ---------------------------- Addendums --------------------------- */
export const ContractAddendumsPage = () => (
  <ContractSubEntityPage
    config={{
      title: 'الحاقیه‌های قرارداد',
      subtitle: 'ثبت الحاقیه با شرح تغییرات، تغییر مبلغ و تاریخ پایان جدید',
      color: '#ec4899',
      icon: <EditNoteIcon sx={{ color: '#fff' }} />,
      endpoint: '/contract-addendums/',
      queryKey: 'addendums-sub',
      addLabel: 'الحاقیه جدید',
      editLabel: 'ویرایش الحاقیه',
      listColumns: [
        { key: 'number', label: 'شماره' },
        { key: 'date', label: 'تاریخ', render: (v) => toJalali(v) },
        { key: 'amount_change', label: 'تغییر مبلغ', render: (v) => formatPersianNumber(v || 0) },
        { key: 'new_end_date', label: 'پایان جدید', render: (v) => toJalali(v) },
      ],
      fields: [
        { key: 'number', label: 'شماره الحاقیه', type: 'text', span: 6 },
        { key: 'date', label: 'تاریخ', type: 'date', span: 6 },
        { key: 'amount_change', label: 'تغییر مبلغ (ریال)', type: 'number', span: 6 },
        { key: 'new_end_date', label: 'تاریخ پایان جدید', type: 'date', span: 6 },
        { key: 'change_description', label: 'شرح تغییرات', type: 'textarea', span: 12 },
      ],
    }}
  />
);