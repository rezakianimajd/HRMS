import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, Grid, MenuItem, Paper, Stack, TextField, Typography,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import axiosInstance from '../../core/api/axiosConfig';
import DataTable from '../../core/components/ui/DataTable';
import InfoCard from '../../core/components/ui/InfoCard';
import { usePrintDocument } from '../../core/print/usePrintDocument';
import PrintPreviewDialog from '../../core/print/PrintPreviewDialog';
import { money, number, statusMeta } from './payrollUi';

const PayrollResultsPanel = ({ accent, periodId, setPeriodId }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const print = usePrintDocument();

  const { data: periodsData } = useQuery({
    queryKey: ['payroll-periods'],
    queryFn: () => axiosInstance.get('/payroll-periods/', { params: { page_size: 100 } }).then((r) => r.data),
    staleTime: 20_000,
  });
  const periods = Array.isArray(periodsData) ? periodsData : periodsData?.results || [];
  const activePeriod = periodId || String(periods[0]?.id || '');
  const period = periods.find((row) => String(row.id) === String(activePeriod));

  const { data, isLoading, error } = useQuery({
    queryKey: ['payroll-results', activePeriod, search],
    queryFn: () => axiosInstance.get(`/payroll-periods/${activePeriod}/results/`, {
      params: { page_size: 500, search },
    }).then((r) => r.data),
    enabled: Boolean(activePeriod),
    staleTime: 15_000,
  });
  const rows = Array.isArray(data) ? data : data?.results || [];

  const openDetail = async (row) => {
    setSelected(row);
    try {
      const response = await axiosInstance.get(`/payroll-results/${row.id}/`);
      setSelected(response.data);
    } catch (error) {
      // summary data is still useful even if detail fetch fails
    }
  };

  const columns = useMemo(() => [
    { key: 'employee_code', label: 'کد پرسنلی', render: (row) => row.employee_code },
    { key: 'employee_name', label: 'نام', render: (row) => row.employee_name },
    { key: 'status', label: 'وضعیت', render: (row) => <Chip size="small" label={row.status_display || statusMeta(row.status).label} /> },
    { key: 'payable_days', label: 'کارکرد', align: 'center', render: (row) => number(row.payable_days) },
    { key: 'overtime_hours', label: 'اضافه‌کاری', align: 'center', render: (row) => number(row.overtime_hours) },
    { key: 'gross_amount', label: 'ناخالص', render: (row) => money(row.gross_amount) },
    { key: 'insurance_employee', label: 'بیمه کارمند', render: (row) => money(row.insurance_employee) },
    { key: 'tax_amount', label: 'مالیات', render: (row) => money(row.tax_amount) },
    { key: 'net_amount', label: 'خالص', render: (row) => money(row.net_amount) },
    {
      key: 'actions', label: 'عملیات', render: (row) => (
        <Stack direction="row" spacing={0.5}>
          <Button size="small" startIcon={<VisibilityIcon fontSize="small" />} onClick={() => openDetail(row)}>جزئیات</Button>
          <Button size="small" startIcon={<PrintIcon fontSize="small" />} onClick={() => print.openDocument({
            document: 'payroll-payslip', payload: { id: row.id }, options: { paper: 'A5', orientation: 'portrait' },
          })}>فیش</Button>
        </Stack>
      ),
    },
  ], [print]);

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField select size="small" label="دوره" value={activePeriod} onChange={(event) => setPeriodId(event.target.value)} sx={{ minWidth: 230 }}>
          {periods.map((row) => <MenuItem key={row.id} value={String(row.id)}>{row.title || row.label} — {row.status_display || statusMeta(row.status).label}</MenuItem>)}
        </TextField>
        <TextField
          size="small" placeholder="جست‌وجوی نام یا کد پرسنلی" value={search}
          onChange={(event) => setSearch(event.target.value)}
          InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} /> }}
          sx={{ flex: '1 1 240px' }}
        />
        <Box sx={{ flex: 1 }} />
        {period && <Chip label={`${number(period.employee_count)} نفر — ${money(period.net_amount)}`} sx={{ bgcolor: `${accent}18`, color: accent, fontWeight: 700 }} />}
      </Paper>

      {period && (
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}><InfoCard icon={<PrintIcon />} label="دوره" value={period.label} sub={period.status_display || statusMeta(period.status).label} color={accent} /></Grid>
          <Grid item xs={12} sm={6} md={3}><InfoCard icon={<PrintIcon />} label="ناخالص" value={money(period.gross_amount)} sub={`خالص: ${money(period.net_amount)}`} color={accent} /></Grid>
          <Grid item xs={12} sm={6} md={3}><InfoCard icon={<PrintIcon />} label="بیمه و مالیات" value={money(Number(period.insurance_employee || 0) + Number(period.tax_amount || 0))} sub={`بیمه کارفرما: ${money(period.insurance_employer)}`} color={accent} /></Grid>
          <Grid item xs={12} sm={6} md={3}><InfoCard icon={<PrintIcon />} label="هشدار" value={number(period.warning_count)} sub="موارد نیازمند بررسی" color={accent} /></Grid>
        </Grid>
      )}

      {!activePeriod && <Alert severity="info">ابتدا یک دورهٔ حقوق ایجاد کنید.</Alert>}
      {error ? <Alert severity="error">دریافت نتایج دوره ناموفق بود.</Alert> : (
        activePeriod && <DataTable ariaLabel="نتایج حقوق کارکنان" rows={rows} columns={columns} loading={isLoading} themed getRowId={(row) => row.id} emptyText="نتیجهٔ محاسبه‌ای برای این دوره وجود ندارد." />
      )}


      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth maxWidth="md">
        <DialogTitle>فیش و جزئیات حقوق — {selected?.employee_name}</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={2}>
              {selected.warnings?.length > 0 && <Alert severity="warning">{selected.warnings.join(' • ')}</Alert>}
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6} md={3}><InfoCard label="کد پرسنلی" value={selected.employee_code} /></Grid>
                <Grid item xs={12} sm={6} md={3}><InfoCard label="ناخالص" value={money(selected.gross_amount)} /></Grid>
                <Grid item xs={12} sm={6} md={3}><InfoCard label="کسورات" value={money(Number(selected.insurance_employee || 0) + Number(selected.tax_amount || 0) + Number(selected.other_deductions || 0))} /></Grid>
                <Grid item xs={12} sm={6} md={3}><InfoCard label="خالص" value={money(selected.net_amount)} /></Grid>
              </Grid>
              <Divider />
              <Typography sx={{ fontSize: 13, fontWeight: 800 }}>اقلام حقوق</Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <Box component="thead"><Box component="tr" sx={{ color: 'text.secondary' }}>{['کد', 'عنوان', 'نوع', 'مقدار', 'مبلغ'].map((label) => <Box component="th" key={label} sx={{ textAlign: 'right', p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>{label}</Box>)}</Box></Box>
                  <Box component="tbody">
                    {(selected.items || []).map((row) => (
                      <Box component="tr" key={row.id}>
                        <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>{row.code}</Box>
                        <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>{row.title}</Box>
                        <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>{row.kind === 'earning' ? 'دریافتی' : row.kind === 'deduction' ? 'کسورات' : 'هزینهٔ کارفرما'}</Box>
                        <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>{row.quantity ? number(row.quantity) : '—'}</Box>
                        <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>{money(row.amount)}</Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>بستن</Button>
          <Button variant="contained" startIcon={<PrintIcon />} sx={{ bgcolor: accent }} onClick={() => selected && print.openDocument({ document: 'payroll-payslip', payload: { id: selected.id }, options: { paper: 'A5' } })}>پیش‌نمایش و چاپ فیش</Button>
        </DialogActions>
      </Dialog>

      <PrintPreviewDialog open={print.open} html={print.html} loading={print.loading} error={print.error} title={print.title || 'فیش حقوقی'} onClose={print.close} />
    </Box>
  );
};

export default PayrollResultsPanel;

