import React from 'react';
import { Chip } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { MasterDataPage, chipSx } from './treasuryMasterUi';

const CATEGORIES = [
  { value: 'receipt', label: 'دریافت' },
  { value: 'payment', label: 'پرداخت' },
  { value: 'both', label: 'دریافت و پرداخت' },
];

const TARGETS = [
  { value: 'bank', label: 'بانک' },
  { value: 'cash', label: 'صندوق' },
  { value: 'cheque', label: 'چک' },
  { value: 'card', label: 'کارت' },
];

const FIELDS = [
  { name: 'code', label: 'کد روش', required: true, helper: 'مثال: CHEQUE / POS' },
  { name: 'name', label: 'عنوان', required: true },
  { name: 'category', label: 'سمت کاربرد', type: 'select', options: CATEGORIES, required: true, default: 'both' },
  { name: 'target', label: 'ابزار', type: 'select', options: TARGETS, required: true, default: 'bank' },
  { name: 'sort_order', label: 'ترتیب', type: 'number' },
  { name: 'requires_bank', label: 'نیازمند بانک/شعبه', type: 'switch' },
  { name: 'requires_cheque', label: 'نیازمند مشخصات چک', type: 'switch' },
  { name: 'requires_card', label: 'نیازمند شماره کارت', type: 'switch' },
  { name: 'requires_terminal', label: 'نیازمند پایانه', type: 'switch' },
  { name: 'requires_reference', label: 'نیازمند شماره پیگیری', type: 'switch' },
  { name: 'requires_tracking', label: 'نیازمند شماره مرجع بانکی', type: 'switch' },
  { name: 'requires_foreign_currency', label: 'نیازمند ارز/نرخ', type: 'switch' },
  { name: 'description', label: 'توضیح' },
  { name: 'is_active', label: 'فعال', type: 'switch' },
];

const requirementChips = (requirements) => {
  const map = {
    bank: ['بانک', '#0ea5e9'],
    cheque: ['چک', '#8b5cf6'],
    card: ['کارت', '#0f766e'],
    terminal: ['پایانه', '#f59e0b'],
    reference: ['پیگیری', '#64748b'],
    tracking: ['مرجع بانکی', '#b45309'],
    foreign_currency: ['ارز', '#be123c'],
  };
  return Object.entries(requirements || {})
    .filter(([, enabled]) => enabled)
    .map(([key]) => map[key])
    .filter(Boolean);
};

const columns = [
  {
    key: 'name',
    label: 'روش',
    width: '28%',
    render: (row) => (
      <div>
        <div style={{ fontWeight: 800, fontSize: 12 }}>{row.name}</div>
        <div style={{ fontSize: 10, opacity: 0.65 }}>{row.code}</div>
      </div>
    ),
  },
  {
    key: 'category',
    label: 'کاربرد',
    width: '14%',
    align: 'center',
    render: (row) => (
      <Chip size="small" label={row.category_display || '—'}
        sx={chipSx(row.category === 'receipt' ? '#0ea5e9' : row.category === 'payment' ? '#f59e0b' : '#8b5cf6')} />
    ),
  },
  { key: 'target', label: 'ابزار', width: '12%', align: 'center', render: (row) => row.target_display || '—' },
  {
    key: 'requirements',
    label: 'اطلاعات لازم',
    width: '34%',
    render: (row) => (
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {requirementChips(row.requirements).map(([label, color]) => (
          <Chip key={label} size="small" label={label} sx={chipSx(color)} />
        ))}
      </div>
    ),
  },
  {
    key: 'status',
    label: 'وضعیت',
    width: '12%',
    align: 'center',
    render: (row) => (
      <Chip size="small" label={row.is_active ? 'فعال' : 'غیرفعال'}
        sx={chipSx(row.is_active ? '#0f766e' : '#64748b')} />
    ),
  },
];

const TreasuryPaymentMethodsPage = () => (
  <MasterDataPage
    title="روش‌های دریافت و پرداخت"
    subtitle="هر روش می‌گوید چه اطلاعاتی لازم دارد (چک، کارت، پایانه، شماره پیگیری)"
    icon={<TuneIcon />}
    endpoint="/treasury/payment-methods/"
    queryKey={['treasury-payment-methods']}
    addLabel="روش جدید"
    searchPlaceholder="جست‌وجوی کد یا عنوان روش…"
    fields={FIELDS}
    columns={columns}
    emptyText="روشی ثبت نشده است."
  />
);

export default TreasuryPaymentMethodsPage;
