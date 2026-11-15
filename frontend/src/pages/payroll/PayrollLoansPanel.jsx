import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Chip, MenuItem, Paper, TextField, Typography } from '@mui/material';
import axiosInstance from '../../core/api/axiosConfig';
import DataTable from '../../core/components/ui/DataTable';
import { dateLabel, money, payrollCardSx } from './payrollUi';

const LOAN_LABELS = {
  qarz: 'قرض‌الحسنه', car: 'خودرو', housing: 'مسکن', urgent: 'ضروری', other: 'سایر',
};
const LOAN_STATUS = { active: 'فعال', paid: 'تسویه‌شده', cancelled: 'لغو‌شده' };

const PayrollLoansPanel = ({ accent }) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['payroll-loans'],
    queryFn: () => axiosInstance.get('/loans/', { params: { page_size: 500 } }).then((r) => r.data),
  });
  const allRows = Array.isArray(data) ? data : data?.results || [];

  const rows = useMemo(() => {
    const term = search.trim();
    return allRows.filter((row) => {
      if (status && row.status !== status) return false;
      if (!term) return true;
      return [row.employee_name, row.employee_code, row.loan_type_display, row.description]
        .some((value) => String(value || '').includes(term));
    });
  }, [allRows, search, status]);

  const totals = useMemo(() => rows.reduce((sum, row) => sum + Number(row.amount || 0), 0), [rows]);

  const columns = [
    { key: 'employee_name', label: 'پرسنل', render: (row) => `${row.employee_name || '—'} (${row.employee_code || '—'})` },
    { key: 'loan_type', label: 'نوع وام', render: (row) => row.loan_type_display || LOAN_LABELS[row.loan_type] || '—' },
    { key: 'amount', label: 'مبلغ وام', render: (row) => money(row.amount) },
    { key: 'installment', label: 'اقساط', render: (row) => `${row.installment_count || 0} قسط × ${money(row.installment_amount)}` },
    { key: 'grant_date', label: 'تاریخ اعطا', render: (row) => dateLabel(row.grant_date) },
    { key: 'due_date', label: 'آخرین سررسید', render: (row) => dateLabel(row.due_date) },
    { key: 'status', label: 'وضعیت', render: (row) => <Chip size="small" label={row.status_display || LOAN_STATUS[row.status] || row.status} /> },
  ];

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Paper elevation={0} sx={payrollCardSx({ p: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' })}>
        <Box sx={{ width: 4, height: 22, borderRadius: 2, bgcolor: accent }} />
        <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 800 }}>
          وام‌های کارکنان — {rows.length} وام · جمع مبلغ {money(totals)}
        </Typography>
        <TextField select size="small" label="وضعیت" value={status} onChange={(event) => setStatus(event.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="">همه</MenuItem>
          {Object.entries(LOAN_STATUS).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
        </TextField>
        <TextField size="small" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جست‌وجوی پرسنل یا نوع وام" />
      </Paper>
      <DataTable ariaLabel="وام‌های کارکنان" rows={rows} columns={columns} loading={isLoading} themed getRowId={(row) => row.id} emptyText="وام ثبت‌شده‌ای وجود ندارد." />
    </Box>
  );
};

export default PayrollLoansPanel;
