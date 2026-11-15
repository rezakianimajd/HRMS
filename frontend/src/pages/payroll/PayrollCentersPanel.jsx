import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Paper, TextField, Typography } from '@mui/material';
import axiosInstance from '../../core/api/axiosConfig';
import DataTable from '../../core/components/ui/DataTable';
import { payrollCardSx } from './payrollUi';

const PayrollCentersPanel = ({ accent, mode = 'projects' }) => {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['payroll-options'],
    queryFn: () => axiosInstance.get('/payroll/options/').then((r) => r.data),
  });
  const source = mode === 'cost_centers' ? (data?.cost_centers || []) : (data?.projects || []);
  const rows = useMemo(() => {
    const term = search.trim();
    return source.filter((row) => !term || [row.code, row.name].some((value) => String(value || '').includes(term)));
  }, [search, source]);

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Paper elevation={0} sx={payrollCardSx({ p: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' })}>
        <Box sx={{ width: 4, height: 22, borderRadius: 2, bgcolor: accent }} />
        <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 800 }}>
          {mode === 'cost_centers' ? 'مراکز هزینه بدهکاران حقوق' : 'مراکز اصلی فعالیت (پروژه‌ها)'}
        </Typography>
        <TextField size="small" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جست‌وجوی کد یا نام" />
      </Paper>
      <DataTable
        ariaLabel={mode === 'cost_centers' ? 'مراکز هزینه' : 'مراکز فعالیت'}
        rows={rows}
        columns={[
          { key: 'code', label: 'کد', render: (row) => row.code },
          { key: 'name', label: 'نام', render: (row) => row.name },
        ]}
        loading={isLoading}
        themed
        getRowId={(row) => row.id}
        emptyText="مرکزی تعریف نشده است."
      />
    </Box>
  );
};

export default PayrollCentersPanel;
