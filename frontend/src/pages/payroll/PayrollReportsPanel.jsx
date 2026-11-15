import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Grid, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import axiosInstance from '../../core/api/axiosConfig';
import InfoCard from '../../core/components/ui/InfoCard';
import PrintButton from '../../core/print/PrintButton';
import { money, number, statusMeta } from './payrollUi';

const PayrollReportsPanel = ({ accent, periodId }) => {
  const qc = useQueryClient();
  const [message, setMessage] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState('');
  const { data: options } = useQuery({ queryKey: ['payroll-options'], queryFn: () => axiosInstance.get('/payroll/options/').then((r) => r.data) });
  const { data: periodsData } = useQuery({ queryKey: ['payroll-periods'], queryFn: () => axiosInstance.get('/payroll-periods/', { params: { page_size: 100 } }).then((r) => r.data) });
  const { data: reports } = useQuery({ queryKey: ['payroll-reports'], queryFn: () => axiosInstance.get('/payroll/reports/').then((r) => r.data) });
  const periods = Array.isArray(periodsData) ? periodsData : periodsData?.results || [];
  const activePeriod = periodId || String(periods[0]?.id || '');
  const { data: summary } = useQuery({
    queryKey: ['payroll-summary', activePeriod],
    queryFn: () => axiosInstance.get(`/payroll-periods/${activePeriod}/summary/`).then((r) => r.data),
    enabled: Boolean(activePeriod),
  });
  const { data: batches } = useQuery({
    queryKey: ['payroll-batches', activePeriod],
    queryFn: () => axiosInstance.get('/payroll-payment-batches/', { params: { period: activePeriod } }).then((r) => r.data),
    enabled: Boolean(activePeriod),
  });
  const batchRows = Array.isArray(batches) ? batches : batches?.results || [];
  const formats = options?.bank_formats || [];

  const generate = useMutation({
    mutationFn: () => axiosInstance.post('/payroll-payment-batches/generate/', { period: activePeriod, format: selectedFormat }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-batches'] });
      setMessage({ ok: true, text: 'فایل پرداخت بانکی تولید شد.' });
    },
    onError: (error) => setMessage({ ok: false, text: error.response?.data?.detail || 'تولید فایل پرداخت ناموفق بود.' }),
  });

  const reconciliation = summary?.reconciliation;
  const costs = summary?.costs || [];

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {message && <Alert severity={message.ok ? 'success' : 'error'} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 800 }}>گزارش‌های دورهٔ {summary?.period?.label || '—'}</Typography>
        <PrintButton target="main" title="گزارش حقوق و دستمزد" orientation="landscape" />
      </Paper>

      {reconciliation && (
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={3}><InfoCard icon={<AccountBalanceIcon />} label="حقوق ناخالص" value={money(reconciliation.payroll.gross)} sub={`خالص: ${money(reconciliation.payroll.net)}`} color={accent} /></Grid>
          <Grid item xs={12} sm={6} md={3}><InfoCard icon={<AccountBalanceIcon />} label="سند حسابداری" value={reconciliation.accounting.document_id ? `#${reconciliation.accounting.document_id}` : 'ثبت نشده'} sub={`مغایرت: ${money(reconciliation.accounting.difference)}`} color={accent} /></Grid>
          <Grid item xs={12} sm={6} md={3}><InfoCard icon={<AccountBalanceIcon />} label="درخواست پرداخت" value={reconciliation.treasury.payment_request_id ? `#${reconciliation.treasury.payment_request_id}` : 'ثبت نشده'} sub={`مغایرت: ${money(reconciliation.treasury.difference)}`} color={accent} /></Grid>
          <Grid item xs={12} sm={6} md={3}><InfoCard icon={<AccountBalanceIcon />} label="ماندهٔ پرداخت‌نشده" value={money(reconciliation.unpaid)} sub={`پرداخت‌شده: ${money(reconciliation.treasury.paid)}`} color={accent} /></Grid>
        </Grid>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 1 }}>هزینهٔ نیروی کار به تفکیک پروژه / مرکز هزینه</Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow>{['پروژه', 'مرکز هزینه', 'مبلغ'].map((label) => <TableCell key={label} sx={{ fontWeight: 800 }}>{label}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {costs.length === 0 ? <TableRow><TableCell colSpan={3}>تخصیص هزینه‌ای برای این دوره ثبت نشده است.</TableCell></TableRow> : costs.map((row, index) => (
                    <TableRow key={`${row.project_id}-${row.cost_center_id}-${index}`}>
                      <TableCell>{row.project_code ? `${row.project_code} — ${row.project_name}` : 'بدون پروژه'}</TableCell>
                      <TableCell>{row.cost_center_code ? `${row.cost_center_code} — ${row.cost_center_name}` : 'بدون مرکز هزینه'}</TableCell>
                      <TableCell>{money(row.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 1 }}>فایل پرداخت بانکی</Typography>
            <Stack spacing={1.25}>
              <TextField select size="small" label="قالب بانک" value={selectedFormat} onChange={(event) => setSelectedFormat(event.target.value)}>
                {formats.length === 0 ? <MenuItem value="">قالب بانکی تعریف نشده</MenuItem> : formats.map((row) => <MenuItem key={row.id} value={row.id}>{row.bank} — {row.name}</MenuItem>)}
              </TextField>
              <Button variant="contained" sx={{ bgcolor: accent }} disabled={!selectedFormat || !activePeriod || generate.isPending} onClick={() => generate.mutate()}>تولید فایل پرداخت</Button>
              {batchRows.map((row) => (
                <Stack key={row.id} direction="row" spacing={1} alignItems="center">
                  <Chip size="small" label={row.status_display || statusMeta(row.status).label} />
                  <Typography sx={{ flex: 1, fontSize: 12 }}>{row.format_name} — {number(row.line_count)} سطر — {money(row.total_amount)}</Typography>
                  {row.file_url && <Button size="small" startIcon={<DownloadIcon />} href={row.file_url} target="_blank" rel="noreferrer">دریافت</Button>}
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>


      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 1 }}>روند دوره‌ها</Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow>{['دوره', 'نفرات', 'ناخالص', 'بیمه کارمند', 'بیمه کارفرما', 'مالیات', 'خالص', 'کل هزینه'].map((label) => <TableCell key={label} sx={{ fontWeight: 800 }}>{label}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {(reports?.periods || []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.label}</TableCell><TableCell>{number(row.employee_count)}</TableCell>
                  <TableCell>{money(row.gross)}</TableCell><TableCell>{money(row.insurance_employee)}</TableCell>
                  <TableCell>{money(row.insurance_employer)}</TableCell><TableCell>{money(row.tax)}</TableCell>
                  <TableCell>{money(row.net)}</TableCell><TableCell>{money(row.total_cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Paper>
    </Box>
  );
};

export default PayrollReportsPanel;

