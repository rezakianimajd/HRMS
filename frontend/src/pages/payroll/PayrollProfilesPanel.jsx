import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Grid, IconButton, MenuItem, Paper, Stack, Switch, TextField,
  Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import axiosInstance from '../../core/api/axiosConfig';
import DataTable from '../../core/components/ui/DataTable';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';
import { money, payrollCardSx, statusMeta } from './payrollUi';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const empty = () => ({
  employee: '', effective_from: today(), effective_to: '', status: 'active',
  base_salary: 0, housing_allowance: 0, food_allowance: 0, seniority_allowance: 0,
  attraction_allowance: 0, job_allowance: 0, other_allowance: 0,
  insurance_eligible: true, tax_eligible: true, direct_labor: true,
  default_project: '', default_cost_center: '', project_percent: 0, notes: '',
});

const PayrollProfilesPanel = ({ accent }) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState(null);
  const { data: options } = useQuery({ queryKey: ['payroll-options'], queryFn: () => axiosInstance.get('/payroll/options/').then((r) => r.data) });
  const { data, isLoading } = useQuery({ queryKey: ['payroll-profiles'], queryFn: () => axiosInstance.get('/payroll-profiles/', { params: { page_size: 500 } }).then((r) => r.data) });
  const rows = Array.isArray(data) ? data : data?.results || [];
  const employees = options?.employees || [];
  const projects = options?.projects || [];
  const costCenters = options?.cost_centers || [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ['payroll-profiles'] });
  const onError = (errorObject) => setMessage({ ok: false, text: errorObject.response?.data?.detail || errorObject.response?.data?.non_field_errors?.[0] || 'ذخیرهٔ پروفایل ناموفق بود.' });
  const save = useMutation({
    mutationFn: (payload) => {
      const data = {
        ...payload,
        effective_to: payload.effective_to || null,
        default_project: payload.default_project || null,
        default_cost_center: payload.default_cost_center || null,
      };
      return editing ? axiosInstance.patch(`/payroll-profiles/${editing}/`, data) : axiosInstance.post('/payroll-profiles/', data);
    },
    onSuccess: () => { invalidate(); setOpen(false); setEditing(null); setForm(empty()); setMessage({ ok: true, text: 'پروفایل حقوقی ذخیره شد.' }); },
    onError,
  });

  const columns = useMemo(() => [
    { key: 'employee', label: 'پرسنل', render: (row) => `${row.employee_name} (${row.employee_code})` },
    { key: 'effective_from', label: 'معتبر از', render: (row) => row.effective_from },
    { key: 'base_salary', label: 'حقوق پایه', render: (row) => money(row.base_salary) },
    { key: 'allowances', label: 'جمع مزایای ثابت', render: (row) => money(Number(row.housing_allowance || 0) + Number(row.food_allowance || 0) + Number(row.seniority_allowance || 0) + Number(row.attraction_allowance || 0) + Number(row.job_allowance || 0) + Number(row.other_allowance || 0)) },
    { key: 'coverage', label: 'پوشش', render: (row) => <Stack direction="row" spacing={0.5}>{row.insurance_eligible ? <Chip size="small" label="بیمه" /> : null}{row.tax_eligible ? <Chip size="small" label="مالیات" /> : null}</Stack> },
    { key: 'status', label: 'وضعیت', render: (row) => <Chip size="small" label={statusMeta(row.status).label} /> },
    {
      key: 'actions', label: '', render: (row) => (
        <Tooltip title="ویرایش"><span><IconButton size="small" onClick={() => { setEditing(row.id); setForm({ ...empty(), ...row, effective_to: row.effective_to || '', default_project: row.default_project || '', default_cost_center: row.default_cost_center || '' }); setOpen(true); }}><EditIcon fontSize="small" /></IconButton></span></Tooltip>
      ),
    },
  ], []);

  return (
    <Box>
      <Paper elevation={0} sx={payrollCardSx({ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5 })}>
        <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 800 }}>پروفایل حقوقی پرسنل (Snapshot دوره از این پروفایل گرفته می‌شود)</Typography>
        <Button size="small" variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: accent }} onClick={() => { setEditing(null); setForm(empty()); setOpen(true); }}>پروفایل جدید</Button>
      </Paper>
      {message && <Alert severity={message.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <DataTable ariaLabel="پروفایل‌های حقوقی" rows={rows} columns={columns} loading={isLoading} themed getRowId={(row) => row.id} emptyText="پروفایل حقوقی ثبت نشده است؛ محاسبه بدون پروفایل، حقوق پایه صفر در نظر می‌گیرد." />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? 'ویرایش پروفایل حقوقی' : 'پروفایل حقوقی جدید'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={8}><TextField select fullWidth size="small" label="پرسنل" value={form.employee} onChange={(event) => setForm((prev) => ({ ...prev, employee: event.target.value }))}>
              {employees.map((row) => <MenuItem key={row.id} value={row.id}>{row.name} ({row.code})</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={12} sm={4}><JalaliDatePicker label="معتبر از" value={form.effective_from} onChange={(value) => setForm((prev) => ({ ...prev, effective_from: value }))} /></Grid>
            <Grid item xs={12} sm={4}><JalaliDatePicker label="معتبر تا (اختیاری)" value={form.effective_to} onChange={(value) => setForm((prev) => ({ ...prev, effective_to: value }))} /></Grid>
            <Grid item xs={12} sm={4}><TextField select fullWidth size="small" label="وضعیت" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
              <MenuItem value="active">فعال</MenuItem><MenuItem value="suspended">تعلیق</MenuItem><MenuItem value="terminated">پایان همکاری</MenuItem>
            </TextField></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" type="number" label="حقوق پایه" value={form.base_salary} onChange={(event) => setForm((prev) => ({ ...prev, base_salary: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" type="number" label="حق مسکن" value={form.housing_allowance} onChange={(event) => setForm((prev) => ({ ...prev, housing_allowance: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" type="number" label="بن/اقلام مصرفی" value={form.food_allowance} onChange={(event) => setForm((prev) => ({ ...prev, food_allowance: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" type="number" label="پایه سنوات" value={form.seniority_allowance} onChange={(event) => setForm((prev) => ({ ...prev, seniority_allowance: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" type="number" label="حق جذب" value={form.attraction_allowance} onChange={(event) => setForm((prev) => ({ ...prev, attraction_allowance: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" type="number" label="فوق‌العاده شغل" value={form.job_allowance} onChange={(event) => setForm((prev) => ({ ...prev, job_allowance: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" type="number" label="سایر مزایای ثابت" value={form.other_allowance} onChange={(event) => setForm((prev) => ({ ...prev, other_allowance: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={4}><TextField select fullWidth size="small" label="پروژهٔ پیش‌فرض" value={form.default_project} onChange={(event) => setForm((prev) => ({ ...prev, default_project: event.target.value }))}>
              <MenuItem value="">بدون پروژه</MenuItem>
              {projects.map((row) => <MenuItem key={row.id} value={row.id}>{row.code} — {row.name}</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={12} sm={4}><TextField select fullWidth size="small" label="مرکز هزینهٔ پیش‌فرض" value={form.default_cost_center} onChange={(event) => setForm((prev) => ({ ...prev, default_cost_center: event.target.value }))}>
              <MenuItem value="">بدون مرکز هزینه</MenuItem>
              {costCenters.map((row) => <MenuItem key={row.id} value={row.id}>{row.code} — {row.name}</MenuItem>)}
            </TextField></Grid>


            <Grid item xs={12}><Stack direction="row" spacing={2} flexWrap="wrap">
              <FormControlLabel control={<Switch checked={Boolean(form.insurance_eligible)} onChange={(event) => setForm((prev) => ({ ...prev, insurance_eligible: event.target.checked }))} />} label="مشمول بیمه" />
              <FormControlLabel control={<Switch checked={Boolean(form.tax_eligible)} onChange={(event) => setForm((prev) => ({ ...prev, tax_eligible: event.target.checked }))} />} label="مشمول مالیات" />
              <FormControlLabel control={<Switch checked={Boolean(form.direct_labor)} onChange={(event) => setForm((prev) => ({ ...prev, direct_labor: event.target.checked }))} />} label="نیروی کار مستقیم" />
            </Stack></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" multiline minRows={2} label="یادداشت" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>انصراف</Button><Button variant="contained" sx={{ bgcolor: accent }} disabled={save.isPending} onClick={() => save.mutate(form)}>ذخیرهٔ پروفایل</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default PayrollProfilesPanel;

