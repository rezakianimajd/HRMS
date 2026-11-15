import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, MenuItem, Paper, Stack, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import axiosInstance from '../../core/api/axiosConfig';
import DataTable from '../../core/components/ui/DataTable';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';
import { money, number, payrollCardSx, statusMeta } from './payrollUi';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const emptyOvertime = () => ({ employee: '', date: today(), hours: 1, kind: 'overtime', multiplier: '', amount: '', note: '' });
const emptyAdvance = () => ({ employee: '', date: today(), amount: '', installment_count: 1, installment_amount: '', reason: '', note: '' });
const emptyAllocation = () => ({ employee: '', project: '', cost_center: '', percentage: 100, effective_from: today(), effective_to: '', is_direct: true, note: '' });

const Section = ({ title, children, action, accent }) => (
  <Paper elevation={0} sx={payrollCardSx()}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
      <Box sx={{ width: 4, height: 22, borderRadius: 2, bgcolor: accent }} />
      <Typography sx={{ flex: 1, fontSize: 14, fontWeight: 800 }}>{title}</Typography>
      {action}
    </Box>
    {children}
  </Paper>
);

const PayrollOperationsPanel = ({ accent, mode = 'all' }) => {
  const showOvertime = mode === 'all' || mode === 'overtime';
  const showAdvance = mode === 'all' || mode === 'advance';
  const showAllocation = mode === 'all' || mode === 'allocation';
  const qc = useQueryClient();
  const [message, setMessage] = useState(null);
  const [overtimeOpen, setOvertimeOpen] = useState(false);
  const [overtimeForm, setOvertimeForm] = useState(emptyOvertime);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceForm, setAdvanceForm] = useState(emptyAdvance);
  const [allocationOpen, setAllocationOpen] = useState(false);
  const [allocationForm, setAllocationForm] = useState(emptyAllocation);

  const { data: options } = useQuery({ queryKey: ['payroll-options'], queryFn: () => axiosInstance.get('/payroll/options/').then((r) => r.data) });
  const { data: overtimes } = useQuery({ queryKey: ['payroll-overtimes'], queryFn: () => axiosInstance.get('/payroll-overtimes/', { params: { page_size: 200 } }).then((r) => r.data) });
  const { data: advances } = useQuery({ queryKey: ['payroll-advances'], queryFn: () => axiosInstance.get('/payroll-advances/', { params: { page_size: 200 } }).then((r) => r.data) });
  const { data: allocations } = useQuery({ queryKey: ['payroll-allocations'], queryFn: () => axiosInstance.get('/payroll-cost-allocations/', { params: { page_size: 200 } }).then((r) => r.data) });

  const overtimeRows = Array.isArray(overtimes) ? overtimes : overtimes?.results || [];
  const advanceRows = Array.isArray(advances) ? advances : advances?.results || [];
  const allocationRows = Array.isArray(allocations) ? allocations : allocations?.results || [];
  const employees = options?.employees || [];
  const projects = options?.projects || [];
  const costCenters = options?.cost_centers || [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['payroll-overtimes'] });
    qc.invalidateQueries({ queryKey: ['payroll-advances'] });
    qc.invalidateQueries({ queryKey: ['payroll-allocations'] });
  };
  const onError = (errorObject) => setMessage({ ok: false, text: errorObject.response?.data?.detail || errorObject.response?.data?.non_field_errors?.[0] || 'عملیات ناموفق بود.' });

  const createOvertime = useMutation({
    mutationFn: (payload) => axiosInstance.post('/payroll-overtimes/', {
      ...payload,
      multiplier: payload.multiplier === '' ? null : payload.multiplier,
      amount: payload.amount === '' ? null : payload.amount,
    }),
    onSuccess: () => { invalidate(); setOvertimeOpen(false); setOvertimeForm(emptyOvertime()); setMessage({ ok: true, text: 'اضافه‌کاری ثبت شد.' }); },
    onError,
  });
  const approveOvertime = useMutation({
    mutationFn: (id) => axiosInstance.post(`/payroll-overtimes/${id}/approve/`),
    onSuccess: () => { invalidate(); setMessage({ ok: true, text: 'اضافه‌کاری تأیید شد.' }); }, onError,
  });
  const createAdvance = useMutation({
    mutationFn: (payload) => axiosInstance.post('/payroll-advances/', {
      ...payload, installment_amount: payload.installment_amount || 0,
    }),
    onSuccess: () => { invalidate(); setAdvanceOpen(false); setAdvanceForm(emptyAdvance()); setMessage({ ok: true, text: 'مساعده ثبت شد.' }); },
    onError,
  });
  const approveAdvance = useMutation({
    mutationFn: (id) => axiosInstance.post(`/payroll-advances/${id}/approve/`),
    onSuccess: () => { invalidate(); setMessage({ ok: true, text: 'مساعده تأیید شد.' }); }, onError,
  });
  const createAllocation = useMutation({
    mutationFn: (payload) => axiosInstance.post('/payroll-cost-allocations/', {
      ...payload,
      project: payload.project || null,
      cost_center: payload.cost_center || null,
      effective_to: payload.effective_to || null,
    }),
    onSuccess: () => { invalidate(); setAllocationOpen(false); setAllocationForm(emptyAllocation()); setMessage({ ok: true, text: 'تخصیص هزینه ثبت شد.' }); },
    onError,
  });

  const overtimeColumns = useMemo(() => [
    { key: 'employee', label: 'پرسنل', render: (row) => `${row.employee_name} (${row.employee_code})` },
    { key: 'date', label: 'تاریخ', render: (row) => row.date },
    { key: 'kind', label: 'نوع', render: (row) => row.kind_display },
    { key: 'hours', label: 'ساعت', render: (row) => number(row.hours) },
    { key: 'amount', label: 'مبلغ', render: (row) => money(row.amount) },
    { key: 'status', label: 'وضعیت', render: (row) => <Chip size="small" label={row.status_display || statusMeta(row.status).label} /> },
    { key: 'actions', label: '', render: (row) => (row.status !== 'approved' && row.status !== 'processed' ? <Button size="small" startIcon={<CheckCircleIcon />} onClick={() => approveOvertime.mutate(row.id)}>تأیید</Button> : null) },
  ], [approveOvertime]);

  const advanceColumns = useMemo(() => [
    { key: 'employee', label: 'پرسنل', render: (row) => `${row.employee_name} (${row.employee_code})` },
    { key: 'date', label: 'تاریخ', render: (row) => row.date },
    { key: 'amount', label: 'مبلغ', render: (row) => money(row.amount) },
    { key: 'remaining_amount', label: 'مانده', render: (row) => money(row.remaining_amount) },
    { key: 'installment_amount', label: 'قسط', render: (row) => money(row.installment_amount) },
    { key: 'status', label: 'وضعیت', render: (row) => <Chip size="small" label={row.status_display || statusMeta(row.status).label} /> },
    { key: 'actions', label: '', render: (row) => (row.status === 'draft' ? <Button size="small" startIcon={<CheckCircleIcon />} onClick={() => approveAdvance.mutate(row.id)}>تأیید</Button> : null) },
  ], [approveAdvance]);

  const allocationColumns = [
    { key: 'employee', label: 'پرسنل', render: (row) => `${row.employee_name} (${row.employee_code})` },
    { key: 'project_name', label: 'پروژه', render: (row) => row.project_name || '—' },
    { key: 'cost_center_name', label: 'مرکز هزینه', render: (row) => row.cost_center_name || '—' },
    { key: 'percentage', label: 'درصد', render: (row) => `${number(row.percentage)}٪` },
    { key: 'effective_from', label: 'از تاریخ', render: (row) => row.effective_from },
    { key: 'is_direct', label: 'نوع', render: (row) => (row.is_direct ? 'مستقیم' : 'غیرمستقیم') },
  ];

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {message && <Alert severity={message.ok ? 'success' : 'error'} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {showOvertime && (
        <Section title="اضافه‌کاری، شب‌کاری و تعطیل‌کاری" accent={accent} action={<Button size="small" variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: accent }} onClick={() => { setOvertimeForm(emptyOvertime()); setOvertimeOpen(true); }}>ثبت مورد جدید</Button>}>
          <DataTable ariaLabel="فهرست اضافه‌کاری" rows={overtimeRows} columns={overtimeColumns} themed getRowId={(row) => row.id} emptyText="موردی ثبت نشده است." />
        </Section>
      )}
      <Grid container spacing={2}>
        {showAdvance && (
          <Grid item xs={12} md={showAllocation ? 6 : 12}>
            <Section title="مساعده‌های پرسنل" accent={accent} action={<Button size="small" startIcon={<AddIcon />} onClick={() => { setAdvanceForm(emptyAdvance()); setAdvanceOpen(true); }}>مساعدهٔ جدید</Button>}>
              <DataTable ariaLabel="فهرست مساعده‌ها" rows={advanceRows} columns={advanceColumns} themed getRowId={(row) => row.id} emptyText="مساعده‌ای ثبت نشده است." />
            </Section>
          </Grid>
        )}
        {showAllocation && (
          <Grid item xs={12} md={showAdvance ? 6 : 12}>
            <Section title="تخصیص هزینه به پروژه و مرکز هزینه" accent={accent} action={<Button size="small" startIcon={<AddIcon />} onClick={() => { setAllocationForm(emptyAllocation()); setAllocationOpen(true); }}>تخصیص جدید</Button>}>
              <DataTable ariaLabel="تخصیص هزینه" rows={allocationRows} columns={allocationColumns} themed getRowId={(row) => row.id} emptyText="تخصیصی ثبت نشده است." />
            </Section>
          </Grid>
        )}
      </Grid>


      <Dialog open={overtimeOpen} onClose={() => setOvertimeOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>ثبت اضافه‌کاری / کار اضافی</DialogTitle>
        <DialogContent>
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField select fullWidth size="small" label="پرسنل" value={overtimeForm.employee} onChange={(event) => setOvertimeForm((prev) => ({ ...prev, employee: event.target.value }))}>
              {employees.map((row) => <MenuItem key={row.id} value={row.id}>{row.name} ({row.code})</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={12} sm={6}><JalaliDatePicker label="تاریخ" value={overtimeForm.date} onChange={(value) => setOvertimeForm((prev) => ({ ...prev, date: value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="number" label="ساعت" value={overtimeForm.hours} onChange={(event) => setOvertimeForm((prev) => ({ ...prev, hours: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField select fullWidth size="small" label="نوع" value={overtimeForm.kind} onChange={(event) => setOvertimeForm((prev) => ({ ...prev, kind: event.target.value }))}>
              <MenuItem value="overtime">اضافه‌کاری</MenuItem><MenuItem value="night">شب‌کاری</MenuItem><MenuItem value="holiday">تعطیل‌کاری</MenuItem><MenuItem value="shift">نوبت‌کاری</MenuItem><MenuItem value="mission">مأموریت</MenuItem>
            </TextField></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="number" label="ضریب (اختیاری)" value={overtimeForm.multiplier} onChange={(event) => setOvertimeForm((prev) => ({ ...prev, multiplier: event.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" type="number" label="مبلغ (اختیاری — خالی = محاسبهٔ خودکار)" value={overtimeForm.amount} onChange={(event) => setOvertimeForm((prev) => ({ ...prev, amount: event.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="توضیح" value={overtimeForm.note} onChange={(event) => setOvertimeForm((prev) => ({ ...prev, note: event.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setOvertimeOpen(false)}>انصراف</Button><Button variant="contained" sx={{ bgcolor: accent }} disabled={createOvertime.isPending} onClick={() => createOvertime.mutate(overtimeForm)}>ثبت</Button></DialogActions>
      </Dialog>

      <Dialog open={advanceOpen} onClose={() => setAdvanceOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>ثبت مساعده</DialogTitle>
        <DialogContent>
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField select fullWidth size="small" label="پرسنل" value={advanceForm.employee} onChange={(event) => setAdvanceForm((prev) => ({ ...prev, employee: event.target.value }))}>
              {employees.map((row) => <MenuItem key={row.id} value={row.id}>{row.name} ({row.code})</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={12} sm={6}><JalaliDatePicker label="تاریخ" value={advanceForm.date} onChange={(value) => setAdvanceForm((prev) => ({ ...prev, date: value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="number" label="مبلغ" value={advanceForm.amount} onChange={(event) => setAdvanceForm((prev) => ({ ...prev, amount: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="number" label="تعداد اقساط" value={advanceForm.installment_count} onChange={(event) => setAdvanceForm((prev) => ({ ...prev, installment_count: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="number" label="مبلغ هر قسط (اختیاری)" value={advanceForm.installment_amount} onChange={(event) => setAdvanceForm((prev) => ({ ...prev, installment_amount: event.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="علت" value={advanceForm.reason} onChange={(event) => setAdvanceForm((prev) => ({ ...prev, reason: event.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setAdvanceOpen(false)}>انصراف</Button><Button variant="contained" sx={{ bgcolor: accent }} disabled={createAdvance.isPending} onClick={() => createAdvance.mutate(advanceForm)}>ثبت</Button></DialogActions>
      </Dialog>


      <Dialog open={allocationOpen} onClose={() => setAllocationOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>تخصیص هزینهٔ حقوق</DialogTitle>
        <DialogContent>
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField select fullWidth size="small" label="پرسنل" value={allocationForm.employee} onChange={(event) => setAllocationForm((prev) => ({ ...prev, employee: event.target.value }))}>
              {employees.map((row) => <MenuItem key={row.id} value={row.id}>{row.name} ({row.code})</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={12} sm={6}><TextField select fullWidth size="small" label="پروژه" value={allocationForm.project} onChange={(event) => setAllocationForm((prev) => ({ ...prev, project: event.target.value }))}>
              <MenuItem value="">بدون پروژه</MenuItem>
              {projects.map((row) => <MenuItem key={row.id} value={row.id}>{row.code} — {row.name}</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={12} sm={6}><TextField select fullWidth size="small" label="مرکز هزینه" value={allocationForm.cost_center} onChange={(event) => setAllocationForm((prev) => ({ ...prev, cost_center: event.target.value }))}>
              <MenuItem value="">بدون مرکز هزینه</MenuItem>
              {costCenters.map((row) => <MenuItem key={row.id} value={row.id}>{row.code} — {row.name}</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="number" label="درصد" value={allocationForm.percentage} onChange={(event) => setAllocationForm((prev) => ({ ...prev, percentage: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><JalaliDatePicker label="معتبر از" value={allocationForm.effective_from} onChange={(value) => setAllocationForm((prev) => ({ ...prev, effective_from: value }))} /></Grid>
            <Grid item xs={12} sm={6}><JalaliDatePicker label="معتبر تا (اختیاری)" value={allocationForm.effective_to} onChange={(value) => setAllocationForm((prev) => ({ ...prev, effective_to: value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="توضیح" value={allocationForm.note} onChange={(event) => setAllocationForm((prev) => ({ ...prev, note: event.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setAllocationOpen(false)}>انصراف</Button><Button variant="contained" sx={{ bgcolor: accent }} disabled={createAllocation.isPending} onClick={() => createAllocation.mutate(allocationForm)}>ثبت تخصیص</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default PayrollOperationsPanel;

