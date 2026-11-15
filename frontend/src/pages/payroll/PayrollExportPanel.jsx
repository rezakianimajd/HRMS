import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Grid, MenuItem, Paper, TextField, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import axiosInstance from '../../core/api/axiosConfig';
import DataTable from '../../core/components/ui/DataTable';
import InfoCard from '../../core/components/ui/InfoCard';
import PrintButton from '../../core/print/PrintButton';
import { money, payrollCardSx, statusMeta } from './payrollUi';

const moneyOf = (rows, field) => rows.reduce((sum, row) => sum + Number(row[field] || 0), 0);

const PayrollExportPanel = ({ accent, periodId, setPeriodId, kind = 'insurance' }) => {
  const isTax = kind === 'tax';
  const { data: periodsData } = useQuery({
    queryKey: ['payroll-periods'],
    queryFn: () => axiosInstance.get('/payroll-periods/', { params: { page_size: 100 } }).then((r) => r.data),
  });
  const periods = Array.isArray(periodsData) ? periodsData : periodsData?.results || [];
  const activePeriod = periodId || String(periods[0]?.id || '');
  const period = periods.find((row) => String(row.id) === String(activePeriod));
  const { data, isLoading } = useQuery({
    queryKey: ['payroll-export-results', activePeriod],
    queryFn: () => axiosInstance.get(`/payroll-periods/${activePeriod}/results/`, { params: { page_size: 1000 } }).then((r) => r.data),
    enabled: Boolean(activePeriod),
  });
  const rows = Array.isArray(data) ? data : data?.results || [];

  const totals = useMemo(() => ({
    employee_insurance: moneyOf(rows, 'insurance_employee'),
    employer_insurance: moneyOf(rows, 'insurance_employer'),
    tax: moneyOf(rows, 'tax_amount'),
    gross: moneyOf(rows, 'gross_amount'),
    net: moneyOf(rows, 'net_amount'),
  }), [rows]);

  const columns = isTax ? [
    { key: 'employee_name', label: 'پرسنل', render: (row) => `${row.employee_name || '—'} (${row.employee_code || '—'})` },
    { key: 'gross_amount', label: 'ماخذ محاسبه', render: (row) => money(row.gross_amount) },
    { key: 'insurance_employee', label: 'بیمهٔ سهم کارمند', render: (row) => money(row.insurance_employee) },
    { key: 'tax_amount', label: 'مالیات حقوق', render: (row) => money(row.tax_amount) },
    { key: 'net_amount', label: 'خالص پرداختی', render: (row) => money(row.net_amount) },
    { key: 'status', label: 'وضعیت', render: (row) => statusMeta(row.status).label },
  ] : [
    { key: 'employee_name', label: 'پرسنل', render: (row) => `${row.employee_name || '—'} (${row.employee_code || '—'})` },
    { key: 'gross_amount', label: 'مبنای بیمه', render: (row) => money(row.gross_amount) },
    { key: 'insurance_employee', label: 'سهم کارمند', render: (row) => money(row.insurance_employee) },
    { key: 'insurance_employer', label: 'سهم کارفرما', render: (row) => money(row.insurance_employer) },
    { key: 'total_cost', label: 'جمع بیمه', render: (row) => money(Number(row.insurance_employee || 0) + Number(row.insurance_employer || 0)) },
    { key: 'status', label: 'وضعیت', render: (row) => statusMeta(row.status).label },
  ];

  const downloadCsv = () => {
    const headers = isTax
      ? ['کد پرسنلی', 'نام', 'ماخذ محاسبه', 'بیمه سهم کارمند', 'مالیات', 'خالص پرداختی']
      : ['کد پرسنلی', 'نام', 'مبنای بیمه', 'سهم کارمند', 'سهم کارفرما'];
    const values = rows.map((row) => (isTax
      ? [row.employee_code, row.employee_name, row.gross_amount, row.insurance_employee, row.tax_amount, row.net_amount]
      : [row.employee_code, row.employee_name, row.gross_amount, row.insurance_employee, row.insurance_employer]));
    const csv = [headers, ...values]
      .map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${isTax ? 'payroll-tax' : 'payroll-insurance'}-${activePeriod || 'period'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Paper elevation={0} sx={payrollCardSx({ p: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' })}>
        <TextField select size="small" label="دورهٔ حقوق" value={activePeriod} onChange={(event) => setPeriodId(event.target.value)} sx={{ minWidth: 260 }}>
          {periods.length === 0 ? <MenuItem value="">دوره‌ای ثبت نشده</MenuItem> : periods.map((row) => (
            <MenuItem key={row.id} value={String(row.id)}>{row.label || row.title} — {row.status_display || statusMeta(row.status).label}</MenuItem>
          ))}
        </TextField>
        <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 800 }}>
          {isTax ? 'خروجی مالیات کارکنان' : 'خروجی بیمهٔ کارکنان'}{period ? ` — ${period.label}` : ''}
        </Typography>
        <Button size="small" startIcon={<DownloadIcon />} onClick={downloadCsv} disabled={!rows.length}>دریافت فایل CSV</Button>
        <PrintButton target="main" title={isTax ? 'خروجی مالیات کارکنان' : 'خروجی بیمهٔ کارکنان'} orientation="landscape" />
      </Paper>
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6} md={3}><InfoCard icon={<DownloadIcon />} label="تعداد ردیف" value={String(rows.length)} sub="پرسنل محاسبه‌شده" color={accent} /></Grid>
        <Grid item xs={12} sm={6} md={3}><InfoCard icon={<DownloadIcon />} label="جمع ناخالص" value={money(totals.gross)} sub="مبنای خروجی" color={accent} /></Grid>
        <Grid item xs={12} sm={6} md={3}><InfoCard icon={<DownloadIcon />} label={isTax ? 'جمع مالیات' : 'بیمهٔ سهم کارمند'} value={money(isTax ? totals.tax : totals.employee_insurance)} sub="سهم کارمند" color={accent} /></Grid>
        <Grid item xs={12} sm={6} md={3}><InfoCard icon={<DownloadIcon />} label={isTax ? 'خالص پرداختی' : 'بیمهٔ سهم کارفرما'} value={money(isTax ? totals.net : totals.employer_insurance)} sub="جمع دوره" color={accent} /></Grid>
      </Grid>
      <DataTable ariaLabel={isTax ? 'خروجی مالیات' : 'خروجی بیمه'} rows={rows} columns={columns} loading={isLoading} themed getRowId={(row) => row.id} emptyText="برای این دوره نتیجه‌ای ثبت نشده است." />
    </Box>
  );
};

export default PayrollExportPanel;
