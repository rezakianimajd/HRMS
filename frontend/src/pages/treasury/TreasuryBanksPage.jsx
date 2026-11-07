import React from 'react';
import { Chip } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import {
  MasterDataPage, chipSx, dateLabel, moneyLabel, toPersianDigits,
} from './treasuryMasterUi';

const FIELDS = [
  { name: 'name', label: 'نام بانک', required: true },
  { name: 'name_en', label: 'نام انگلیسی' },
  { name: 'code', label: 'کد بانک', helper: 'کد رسمی بانک مرکزی' },
  { name: 'swift_code', label: 'کد SWIFT' },
  { name: 'sort_order', label: 'ترتیب نمایش', type: 'number' },
  { name: 'is_active', label: 'فعال', type: 'switch', default: true },
  { name: 'note', label: 'یادداشت' },
];

const columns = [
  {
    key: 'name',
    label: 'بانک',
    width: '34%',
    render: (row) => (
      <div>
        <div style={{ fontWeight: 800, fontSize: 12 }}>{row.name}</div>
        <div style={{ fontSize: 10, color: 'inherit', opacity: 0.65 }}>
          {row.name_en || row.note || '—'}
        </div>
      </div>
    ),
  },
  { key: 'code', label: 'کد بانک', width: '12%', render: (row) => toPersianDigits(row.code || '—') },
  { key: 'swift', label: 'SWIFT', width: '16%', render: (row) => row.swift_code || '—' },
  {
    key: 'branches',
    label: 'شعبه‌ها',
    width: '14%',
    align: 'center',
    render: (row) => (
      <Chip size="small" label={`${toPersianDigits(row.branch_count || 0)} شعبه`}
        sx={chipSx('#0ea5e9')} />
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
  { key: 'order', label: 'ترتیب', width: '10%', align: 'center', render: (row) => toPersianDigits(row.sort_order ?? 0) },
];

const TreasuryBanksPage = () => (
  <MasterDataPage
    title="بانک‌ها"
    subtitle="کاتالوگ بانک‌های کشور (Master Data) — قابل مدیریت توسط مدیر سیستم، مستقل از کد ثابت"
    icon={<AccountBalanceIcon />}
    endpoint="/treasury/banks/"
    queryKey={['treasury-banks']}
    addLabel="بانک جدید"
    searchPlaceholder="جست‌وجوی نام یا کد بانک…"
    fields={FIELDS}
    columns={columns}
    emptyText="بانکی ثبت نشده است؛ از «بانک جدید» شروع کنید."
  />
);

export default TreasuryBanksPage;
export { dateLabel, moneyLabel };
