import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Chip, Grid, Paper, Typography } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import axiosInstance from '../../core/api/axiosConfig';
import DataTable from '../../core/components/ui/DataTable';
import InfoCard from '../../core/components/ui/InfoCard';
import { payrollCardSx, statusMeta } from './payrollUi';

const PayrollStatusPanel = ({ accent }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['payroll-profiles'],
    queryFn: () => axiosInstance.get('/payroll-profiles/', { params: { page_size: 500 } }).then((r) => r.data),
  });
  const rows = Array.isArray(data) ? data : data?.results || [];
  const counts = useMemo(() => rows.reduce((map, row) => {
    map[row.status] = (map[row.status] || 0) + 1;
    return map;
  }, {}), [rows]);

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6} md={3}><InfoCard icon={<PeopleIcon />} label="کل احکام" value={String(rows.length)} sub="پروفایل حقوقی" color={accent} /></Grid>
        <Grid item xs={12} sm={6} md={3}><InfoCard icon={<CheckCircleIcon />} label="فعال" value={String(counts.active || 0)} sub="شاغل" color={accent} /></Grid>
        <Grid item xs={12} sm={6} md={3}><InfoCard icon={<PauseCircleIcon />} label="تعلیق" value={String(counts.suspended || 0)} sub="موقت" color={accent} /></Grid>
        <Grid item xs={12} sm={6} md={3}><InfoCard icon={<PersonOffIcon />} label="پایان همکاری" value={String(counts.terminated || 0)} sub="خاتمه‌یافته" color={accent} /></Grid>
      </Grid>
      <Paper elevation={0} sx={payrollCardSx({ p: 1.5 })}>
        <Typography sx={{ fontSize: 13, fontWeight: 800 }}>وضعیت کارکنان بر اساس احکام حقوقی</Typography>
      </Paper>
      <DataTable
        ariaLabel="وضعیت کارکنان"
        rows={rows}
        columns={[
          { key: 'employee', label: 'پرسنل', render: (row) => `${row.employee_name} (${row.employee_code})` },
          { key: 'status', label: 'وضعیت', render: (row) => <Chip size="small" label={statusMeta(row.status).label} /> },
          { key: 'effective_from', label: 'معتبر از', render: (row) => row.effective_from },
          { key: 'effective_to', label: 'معتبر تا', render: (row) => row.effective_to || '—' },
        ]}
        loading={isLoading}
        themed
        getRowId={(row) => row.id}
        emptyText="حکم حقوقی ثبت نشده است."
      />
    </Box>
  );
};

export default PayrollStatusPanel;
