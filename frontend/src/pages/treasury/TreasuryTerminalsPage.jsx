import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Chip } from '@mui/material';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import axiosInstance from '../../core/api/axiosConfig';
import {
  MasterDataPage, asList, chipSx, dateLabel, moneyLabel,
} from './treasuryMasterUi';

const FIELDS = [
  { name: 'terminal_number', label: 'شماره پایانه', required: true },
  { name: 'bank', label: 'بانک', type: 'select' },
  { name: 'provider', label: 'شرکت ارائه‌دهنده' },
  { name: 'merchant_number', label: 'شماره پذیرنده' },
  { name: 'serial_number', label: 'شماره سریال دستگاه' },
  { name: 'entity', label: 'حساب بانکی مقصد', type: 'select' },
  { name: 'branch_name', label: 'شعبه' },
  { name: 'activated_on', label: 'تاریخ فعال‌سازی', type: 'date' },
  { name: 'is_active', label: 'فعال', type: 'switch', default: true },
  { name: 'note', label: 'یادداشت' },
];

const columns = [
  {
    key: 'terminal',
    label: 'پایانه',
    width: '24%',
    render: (row) => (
      <div>
        <div style={{ fontWeight: 800, fontSize: 12 }}>{row.terminal_number}</div>
        <div style={{ fontSize: 10, opacity: 0.65 }}>{row.serial_number || '—'}</div>
      </div>
    ),
  },
  { key: 'bank', label: 'بانک / ارائه‌دهنده', width: '22%', render: (row) => [row.bank_name, row.provider].filter(Boolean).join(' · ') || '—' },
  { key: 'merchant', label: 'پذیرنده', width: '14%', render: (row) => row.merchant_number || '—' },
  { key: 'account', label: 'حساب مقصد', width: '18%', render: (row) => row.entity_name || '—' },
  { key: 'activated', label: 'فعال‌سازی', width: '12%', render: (row) => dateLabel(row.activated_on) },
  {
    key: 'status',
    label: 'وضعیت',
    width: '10%',
    align: 'center',
    render: (row) => (
      <Chip size="small" label={row.is_active ? 'فعال' : 'غیرفعال'}
        sx={chipSx(row.is_active ? '#0f766e' : '#64748b')} />
    ),
  },
];

const TreasuryTerminalsPage = () => {
  const banksQuery = useQuery({
    queryKey: ['treasury-banks-select'],
    queryFn: () => axiosInstance.get('/treasury/banks/', { params: { page_size: 300 } })
      .then((response) => response.data),
    staleTime: 120_000,
  });
  const accountsQuery = useQuery({
    queryKey: ['treasury-entities', 'bank'],
    queryFn: () => axiosInstance.get('/treasury/treasury-entities/', {
      params: { entity_type: 'bank', page_size: 300 },
    }).then((response) => response.data),
    staleTime: 60_000,
  });

  const fieldOptions = useMemo(() => ({
    bank: asList(banksQuery.data).map((row) => ({ value: row.id, label: row.name })),
    entity: asList(accountsQuery.data).map((row) => ({
      value: row.id,
      label: `${row.name} — ${moneyLabel(row.balance)}`,
    })),
  }), [banksQuery.data, accountsQuery.data]);

  return (
    <MasterDataPage
      title="پایانه‌های کارت‌خوان"
      subtitle="پایانه، پذیرنده و حساب مقصد دریافت‌های کارت‌خوان"
      icon={<PointOfSaleIcon />}
      endpoint="/treasury/pos-terminals/"
      queryKey={['treasury-pos-terminals']}
      addLabel="پایانهٔ جدید"
      searchPlaceholder="جست‌وجوی شماره پایانه، پذیرنده یا بانک…"
      fields={FIELDS}
      columns={columns}
      fieldOptions={fieldOptions}
      emptyText="پایانه‌ای ثبت نشده است."
    />
  );
};

export default TreasuryTerminalsPage;
