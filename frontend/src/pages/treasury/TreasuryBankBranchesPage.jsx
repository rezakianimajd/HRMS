import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Chip } from '@mui/material';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import axiosInstance from '../../core/api/axiosConfig';
import { MasterDataPage, asList, chipSx } from './treasuryMasterUi';

const FIELDS = [
  { name: 'bank', label: 'بانک', type: 'select', required: true },
  { name: 'name', label: 'نام شعبه', required: true },
  { name: 'code', label: 'کد شعبه' },
  { name: 'city', label: 'شهر' },
  { name: 'province', label: 'استان' },
  { name: 'address', label: 'آدرس شعبه' },
  { name: 'phone', label: 'تلفن' },
  { name: 'is_active', label: 'فعال', type: 'switch', default: true },
];

const columns = [
  { key: 'bank', label: 'بانک', width: '22%', render: (row) => row.bank_name || '—' },
  {
    key: 'name',
    label: 'شعبه',
    width: '28%',
    render: (row) => (
      <div>
        <div style={{ fontWeight: 800, fontSize: 12 }}>{row.name}</div>
        <div style={{ fontSize: 10, opacity: 0.65 }}>{row.address || '—'}</div>
      </div>
    ),
  },
  { key: 'code', label: 'کد شعبه', width: '12%', render: (row) => row.code || '—' },
  { key: 'city', label: 'شهر / استان', width: '18%', render: (row) => [row.city, row.province].filter(Boolean).join(' · ') || '—' },
  { key: 'phone', label: 'تلفن', width: '12%', render: (row) => row.phone || '—' },
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

const TreasuryBankBranchesPage = () => {
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

  return (
    <MasterDataPage
      title="شعبه‌های بانک"
      subtitle="شعبه، آدرس و تلفن برای درج در فیش‌ها و رسیدهای خزانه"
      icon={<AltRouteIcon />}
      endpoint="/treasury/bank-branches/"
      queryKey={['treasury-bank-branches']}
      addLabel="شعبهٔ جدید"
      searchPlaceholder="جست‌وجوی شعبه، شهر یا بانک…"
      fields={FIELDS}
      columns={columns}
      fieldOptions={{ bank: bankOptions }}
      emptyText="شعبه‌ای ثبت نشده است."
    />
  );
};

export default TreasuryBankBranchesPage;
