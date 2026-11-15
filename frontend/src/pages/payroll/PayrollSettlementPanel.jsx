import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, MenuItem, Paper, Stack, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CalculateIcon from '@mui/icons-material/Calculate';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PaidIcon from '@mui/icons-material/Paid';
import axiosInstance from '../../core/api/axiosConfig';
import DataTable from '../../core/components/ui/DataTable';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';
import { money, number, statusMeta } from './payrollUi';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const empty = () => ({ employee: '', date: today(), kind: 'resignation', eid_amount: 0, other_earnings: 0, other_deductions: 0, notes: '' });

const PayrollSettlementPanel = ({ accent }) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState(null);
  const { data: options } = useQuery({ queryKey: ['payroll-options'], queryFn: () => axiosInstance.get('/payroll/options/').then((r) => r.data) });
  const { data, isLoading } = useQuery({ queryKey: ['payroll-settlements'], queryFn: () => axiosInstance.get('/payroll-settlements/', { params: { page_size: 200 } }).then((r) => r.data) });
  const rows = Array.isArray(data) ? data : data?.results || [];
  const employees = options?.employees || [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ['payroll-settlements'] });
  const onError = (errorObject) => setMessage({ ok: false, text: errorObject.response?.data?.detail || 'عملیات ناموفق بود.' });
  const create = useMutation({
    mutationFn: (payload) => axiosInstance.post('/payroll-settlements/', payload),
    onSuccess: () => { invalidate(); setOpen(false); setForm(empty()); setMessage({ ok: true, text: 'تسویه ایجاد شد؛ اکنون محاسبه را اجرا کنید.' }); }, onError,
  });
  const action = useMutation({
    mutationFn: ({ id, name }) => axiosInstance.post(`/payroll-settlements/${id}/${name}/`),
    onSuccess: () => { invalidate(); setMessage({ ok: true, text: 'عملیات تسویه انجام شد.' }); }, onError,
  });

  const columns = useMemo(() => [
    { key: 'employee', label: 'پرسنل', render: (row) => `${row.employee_name} (${row.employee_code})` },
    { key: 'date', label: 'تاریخ', render: (row) => row.date },
    { key: 'kind', label: 'نوع', render: (row) => row.kind_display },
    { key: 'service_years', label: 'سابقه', render: (row) => number(row.service_years) },
    { key: 'gross_amount', label: 'مطالبات', render: (row) => money(row.gross_amount) },
    { key: 'loan_balance', label: 'مانده وام/مساعده', render: (row) => money(Number(row.loan_balance || 0) + Number(row.advance_balance || 0)) },
    { key: 'net_amount', label: 'خالص', render: (row) => money(row.net_amount) },
    { key: 'status', label: 'وضعیت', render: (row) => <Chip size="small" label={row.status_display || statusMeta(row.status).label} /> },
    {
      key: 'actions', label: 'عملیات', render: (row) => (
        <Stack direction="row" spacing={0.5}>
          {['draft', 'calculated'].includes(row.status) && <Button size="small" startIcon={<CalculateIcon />} onClick={() => action.mutate({ id: row.id, name: 'calculate' })}>محاسبه</Button>}
          {row.status === 'calculated' && <Button size="small" startIcon={<CheckCircleIcon />} onClick={() => action.mutate({ id: row.id, name: 'approve' })}>تأیید</Button>}
          {row.status === 'approved' && <Button size="small" startIcon={<PaidIcon />} onClick={() => action.mutate({ id: row.id, name: 'mark-paid' })}>پرداخت</Button>}
        </Stack>
      ),
    },
  ], [action]);

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 800 }}>تسویه حساب پایان همکاری</Typography>
        <Button size="small" variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: accent }} onClick={() => { setForm(empty()); setOpen(true); }}>تسویهٔ جدید</Button>
      </Paper>
      {message && <Alert severity={message.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Alert severity="info" sx={{ mb: 2 }}>محاسبهٔ تسویه از پروفایل حقوقی، سابقهٔ استخدام، مرخصی استحقاقی و ماندهٔ وام/مساعده استفاده می‌کند. مبالغ عیدی و سایر موارد قابل ویرایش است.</Alert>
      <DataTable ariaLabel="تسویه‌حساب‌ها" rows={rows} columns={columns} loading={isLoading} themed getRowId={(row) => row.id} emptyText="تسویه‌حسابی ثبت نشده است." />


      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>تسویه حساب جدید</DialogTitle>
        <DialogContent>
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField select fullWidth size="small" label="پرسنل" value={form.employee} onChange={(event) => setForm((prev) => ({ ...prev, employee: event.target.value }))}>
              {employees.map((row) => <MenuItem key={row.id} value={row.id}>{row.name} ({row.code})</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={12} sm={6}><JalaliDatePicker label="تاریخ تسویه" value={form.date} onChange={(value) => setForm((prev) => ({ ...prev, date: value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField select fullWidth size="small" label="نوع" value={form.kind} onChange={(event) => setForm((prev) => ({ ...prev, kind: event.target.value }))}>
              <MenuItem value="resignation">استعفا</MenuItem><MenuItem value="termination">پایان همکاری</MenuItem><MenuItem value="retirement">بازنشستگی</MenuItem><MenuItem value="contract_end">پایان قرارداد</MenuItem><MenuItem value="other">سایر</MenuItem>
            </TextField></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" type="number" label="عیدی" value={form.eid_amount} onChange={(event) => setForm((prev) => ({ ...prev, eid_amount: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" type="number" label="سایر مزایا" value={form.other_earnings} onChange={(event) => setForm((prev) => ({ ...prev, other_earnings: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" type="number" label="سایر کسورات" value={form.other_deductions} onChange={(event) => setForm((prev) => ({ ...prev, other_deductions: event.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" multiline minRows={2} label="یادداشت" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>انصراف</Button><Button variant="contained" sx={{ bgcolor: accent }} disabled={create.isPending} onClick={() => create.mutate(form)}>ایجاد تسویه</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default PayrollSettlementPanel;

