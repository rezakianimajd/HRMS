import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Chip } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import axiosInstance from '../../core/api/axiosConfig';
import {
  MasterDataPage, asList, chipSx, dateLabel, moneyLabel,
} from './treasuryMasterUi';

const CURRENCIES = [
  { value: 'IRR', label: 'ریال' },
  { value: 'USD', label: 'دلار' },
  { value: 'EUR', label: 'یورو' },
  { value: 'AED', label: 'درهم' },
  { value: 'TRY', label: 'لیر' },
  { value: 'OTHER', label: 'سایر' },
];

const ACCOUNT_TYPES = [
  { value: 'current', label: 'جاری' },
  { value: 'short', label: 'کوتاه‌مدت' },
  { value: 'long', label: 'بلندمدت' },
  { value: 'loan', label: 'قرض‌الحسنه' },
  { value: 'foreign', label: 'ارزی' },
  { value: 'other', label: 'سایر' },
];

const POLICIES = [
  { value: 'block', label: 'ممنوع' },
  { value: 'warn', label: 'با هشدار' },
  { value: 'approve', label: 'فقط با مجوز' },
];

const fieldsFor = () => ([
  { name: 'code', label: 'کد حساب', required: true },
  { name: 'name', label: 'عنوان حساب', required: true },
  { name: 'bank', label: 'بانک', type: 'select' },
  { name: 'branch_name', label: 'نام شعبه' },
  { name: 'branch_code', label: 'کد شعبه' },
  { name: 'account_number', label: 'شماره حساب' },
  { name: 'sheba_number', label: 'شماره شبا' },
  { name: 'card_number', label: 'شماره کارت' },
  { name: 'account_type', label: 'نوع حساب', type: 'select', options: ACCOUNT_TYPES, default: 'current' },
  { name: 'currency', label: 'ارز', type: 'select', options: CURRENCIES, required: true, default: 'IRR' },
  { name: 'owner_name', label: 'صاحب حساب' },
  { name: 'opened_on', label: 'تاریخ افتتاح', type: 'date' },
  { name: 'initial_balance', label: 'ماندهٔ افتتاحیه', type: 'number' },
  { name: 'payment_limit', label: 'سقف هر پرداخت', type: 'number' },
  { name: 'min_balance', label: 'حداقل موجودی', type: 'number' },
  { name: 'max_balance', label: 'حداکثر موجودی (۰ = بی‌سقف)', type: 'number' },
  { name: 'negative_balance_policy', label: 'سیاست ماندهٔ منفی', type: 'select', options: POLICIES, default: 'block' },
  { name: 'allow_receipt', label: 'مجاز برای دریافت', type: 'switch', default: true },
  { name: 'allow_payment', label: 'مجاز برای پرداخت', type: 'switch', default: true },
  { name: 'allow_transfer', label: 'مجاز برای انتقال', type: 'switch', default: true },
  { name: 'is_active', label: 'فعال', type: 'switch', default: true },
  { name: 'description', label: 'توضیحات', multiline: true },
]);

const columns = [
  {
    key: 'name',
    label: 'حساب',
    width: '24%',
    render: (row) => (
      <div>
        <div style={{ fontWeight: 800, fontSize: 12 }}>{row.name}</div>
        <div style={{ fontSize: 10, opacity: 0.65 }}>
          {[row.code, row.bank_name, row.branch_name].filter(Boolean).join(' · ') || '—'}
        </div>
      </div>
    ),
  },
  {
    key: 'account',
    label: 'حساب / شبا',
    width: '24%',
    render: (row) => (
      <div style={{ fontSize: 11 }}>
        <div>{row.account_number || '—'}</div>
        <div style={{ fontSize: 10, opacity: 0.65 }}>{row.sheba_number || '—'}</div>
      </div>
    ),
  },
  {
    key: 'currency',
    label: 'ارز',
    width: '9%',
    align: 'center',
    render: (row) => row.currency_display || row.currency || '—',
  },
  {
    key: 'balance',
    label: 'مانده',
    width: '14%',
    align: 'center',
    render: (row) => moneyLabel(row.balance),
  },
  {
    key: 'flags',
    label: 'مجوزها',
    width: '16%',
    render: (row) => (
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {row.allow_receipt ? <Chip size="small" label="دریافت" sx={chipSx('#0f766e')} /> : null}
        {row.allow_payment ? <Chip size="small" label="پرداخت" sx={chipSx('#0ea5e9')} /> : null}
        {row.allow_transfer ? <Chip size="small" label="انتقال" sx={chipSx('#8b5cf6')} /> : null}
      </div>
    ),
  },
  {
    key: 'policy',
    label: 'سیاست منفی',
    width: '12%',
    align: 'center',
    render: (row) => (
      <Chip size="small" label={row.policy_display || '—'}
        sx={chipSx(row.negative_balance_policy === 'block' ? '#be123c' : '#b45309')} />
    ),
  },
  { key: 'opened', label: 'افتتاح', width: '10%', render: (row) => dateLabel(row.opened_on) },
];

const EntityAccountsPage = ({ entityType, title, subtitle, addLabel }) => {
  const banksQuery = useQuery({
    queryKey: ['treasury-banks-select'],
    queryFn: () => axiosInstance.get('/treasury/banks/', { params: { page_size: 300 } })
      .then((response) => response.data),
    staleTime: 120_000,
  });
  const bankOptions = useMemo(
    () => asList(banksQuery.data).map((row) => ({ value: row.id, label: row.name })),
    [banksQuery.data],
  );
  const fields = useMemo(() => fieldsFor(), []);

  return (
    <MasterDataPage
      title={title}
      subtitle={subtitle}
      icon={<AccountBalanceWalletIcon />}
      endpoint="/treasury/treasury-entities/"
      queryKey={['treasury-entities', entityType]}
      addLabel={addLabel}
      searchPlaceholder="جست‌وجوی کد، نام یا شماره حساب…"
      params={{ entity_type: entityType }}
      fields={fields}
      columns={columns}
      fieldOptions={{ bank: bankOptions }}
      transformSave={(values) => ({ ...values, entity_type: entityType })}
      emptyText="حسابی ثبت نشده است."
    />
  );
};

export const TreasuryBankAccountsPage = () => (
  <EntityAccountsPage
    entityType="bank"
    title="حساب‌های بانکی شرکت"
    subtitle="حساب، شبا، کارت، سقف پرداخت و سیاست ماندهٔ منفی هر بانک"
    addLabel="حساب بانکی جدید"
  />
);

export const TreasuryCashBoxesPage = () => (
  <EntityAccountsPage
    entityType="cash"
    title="صندوق‌ها"
    subtitle="صندوق‌های نقدی، حداقل/حداکثر مانده و سیاست پرداخت بیش از موجودی"
    addLabel="صندوق جدید"
  />
);

export default TreasuryBankAccountsPage;

