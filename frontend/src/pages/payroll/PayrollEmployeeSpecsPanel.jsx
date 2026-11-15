import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Paper, TextField, Typography } from '@mui/material';
import axiosInstance from '../../core/api/axiosConfig';
import DataTable from '../../core/components/ui/DataTable';
import { money, payrollCardSx, statusMeta } from './payrollUi';

const PayrollEmployeeSpecsPanel = ({ accent }) => {
  const [search, setSearch] = useState('');
  const { data: options, isLoading: optionsLoading } = useQuery({
    queryKey: ['payroll-options'],
    queryFn: () => axiosInstance.get('/payroll/options/').then((r) => r.data),
  });
  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ['payroll-profiles'],
    queryFn: () => axiosInstance.get('/payroll-profiles/', { params: { page_size: 500 } }).then((r) => r.data),
  });
  const employees = options?.employees || [];
  const profileRows = Array.isArray(profiles) ? profiles : profiles?.results || [];

  const latestProfiles = useMemo(() => {
    const map = new Map();
    profileRows.forEach((row) => {
      const current = map.get(row.employee);
      if (!current || String(row.effective_from || '') > String(current.effective_from || '')) {
        map.set(row.employee, row);
      }
    });
    return map;
  }, [profileRows]);

  const rows = useMemo(() => {
    const term = search.trim();
    return employees
      .filter((row) => !term || [row.name, row.code, row.department, row.job_title]
        .some((value) => String(value || '').includes(term)))
      .map((row) => {
        const profile = latestProfiles.get(row.id);
        return {
          ...row,
          base_salary: profile?.base_salary ?? null,
          profile_status: profile?.status || 'missing',
          effective_from: profile?.effective_from || '',
        };
      });
  }, [employees, latestProfiles, search]);

  const columns = [
    { key: 'name', label: 'نام و نام خانوادگی', render: (row) => row.name },
    { key: 'code', label: 'کد پرسنلی', render: (row) => row.code },
    { key: 'department', label: 'واحد', render: (row) => row.department || '—' },
    { key: 'job_title', label: 'عنوان شغلی', render: (row) => row.job_title || '—' },
    { key: 'base_salary', label: 'حقوق پایهٔ جاری', render: (row) => (row.base_salary == null ? 'بدون حکم' : money(row.base_salary)) },
    { key: 'profile_status', label: 'وضعیت حکم', render: (row) => <Typography component="span" sx={{ fontSize: 12 }}>{row.profile_status === 'missing' ? 'ثبت نشده' : statusMeta(row.profile_status).label}</Typography> },
    { key: 'effective_from', label: 'معتبر از', render: (row) => row.effective_from || '—' },
  ];

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Paper elevation={0} sx={payrollCardSx({ p: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' })}>
        <Box sx={{ width: 4, height: 22, borderRadius: 2, bgcolor: accent }} />
        <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 800 }}>
          مشخصات پرسنل — منبع هویت و اطلاعات استخدامی، پروندهٔ HR است
        </Typography>
        <TextField
          size="small"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="جست‌وجوی نام، کد، واحد یا عنوان شغلی"
          sx={{ minWidth: 280 }}
        />
      </Paper>
      <DataTable
        ariaLabel="مشخصات پرسنل حقوق"
        rows={rows}
        columns={columns}
        loading={optionsLoading || profilesLoading}
        themed
        getRowId={(row) => row.id}
        emptyText="پرسنلی برای نمایش وجود ندارد."
      />
    </Box>
  );
};

export default PayrollEmployeeSpecsPanel;
