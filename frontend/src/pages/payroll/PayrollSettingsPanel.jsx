import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Grid, IconButton, MenuItem, Paper, Stack, Switch, TextField,
  Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import axiosInstance from '../../core/api/axiosConfig';
import DataTable from '../../core/components/ui/DataTable';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';
import { money, number, payrollCardSx } from './payrollUi';

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

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const emptyRate = () => ({ effective_from: today(), effective_to: '', employee_rate: 7, employer_rate: 23, min_base: 0, max_base: 0, description: '' });
const emptyTax = () => ({ effective_from: today(), effective_to: '', lower_bound: 0, upper_bound: '', rate: 10, description: '' });
const emptyComponent = () => ({
  code: '', title: '', kind: 'earning', category: 'allowance', calc_type: 'fixed', formula: '',
  priority: 100, is_active: true, is_insurable: true, is_taxable: true, is_benefit: true,
  affects_cost: true, allocatable_to_project: true, allocatable_to_cost_center: true,
  min_amount: '', max_amount: '', description: '',
});

const PayrollSettingsPanel = ({ accent, section }) => {
  const show = (key) => !section || section === key;
  const qc = useQueryClient();
  const [message, setMessage] = useState(null);
  const [settingsForm, setSettingsForm] = useState(null);
  const [rateOpen, setRateOpen] = useState(false);
  const [rateForm, setRateForm] = useState(emptyRate);
  const [taxOpen, setTaxOpen] = useState(false);
  const [taxForm, setTaxForm] = useState(emptyTax);
  const [componentOpen, setComponentOpen] = useState(false);
  const [componentForm, setComponentForm] = useState(emptyComponent);
  const [editingComponent, setEditingComponent] = useState(null);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [mappingForm, setMappingForm] = useState({ code: 'salary_expense', title: '', account: '', journal: '', requires_project: false, requires_cost_center: false });
  const [formatOpen, setFormatOpen] = useState(false);
  const [formatForm, setFormatForm] = useState({ code: '', name: '', bank_name: '', format_type: 'csv', line_fields: 'beneficiary_name,national_id,bank_name,account_number,iban,amount' });

  const settingsQuery = useQuery({
    queryKey: ['payroll-settings'],
    queryFn: () => axiosInstance.get('/payroll-settings/').then((r) => r.data),
  });
  const ratesQuery = useQuery({
    queryKey: ['payroll-insurance-rates'],
    queryFn: () => axiosInstance.get('/payroll-insurance-rates/').then((r) => r.data),
  });
  const taxQuery = useQuery({
    queryKey: ['payroll-tax-brackets'],
    queryFn: () => axiosInstance.get('/payroll-tax-brackets/').then((r) => r.data),
  });
  const componentsQuery = useQuery({
    queryKey: ['payroll-components'],
    queryFn: () => axiosInstance.get('/payroll-components/', { params: { page_size: 200 } }).then((r) => r.data),
  });
  const mappingsQuery = useQuery({
    queryKey: ['payroll-account-mappings'],
    queryFn: () => axiosInstance.get('/payroll-account-mappings/').then((r) => r.data),
  });
  const formatsQuery = useQuery({
    queryKey: ['payroll-bank-formats'],
    queryFn: () => axiosInstance.get('/payroll-bank-formats/').then((r) => r.data),
  });
  const optionsQuery = useQuery({
    queryKey: ['payroll-options'],
    queryFn: () => axiosInstance.get('/payroll/options/').then((r) => r.data),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (settingsQuery.data && settingsForm === null) {
      setSettingsForm({ ...settingsQuery.data });
    }
  }, [settingsQuery.data, settingsForm]);

  const rates = Array.isArray(ratesQuery.data) ? ratesQuery.data : ratesQuery.data?.results || [];
  const taxes = Array.isArray(taxQuery.data) ? taxQuery.data : taxQuery.data?.results || [];
  const components = Array.isArray(componentsQuery.data) ? componentsQuery.data : componentsQuery.data?.results || [];
  const mappings = Array.isArray(mappingsQuery.data) ? mappingsQuery.data : mappingsQuery.data?.results || [];
  const formats = Array.isArray(formatsQuery.data) ? formatsQuery.data : formatsQuery.data?.results || [];
  const options = optionsQuery.data || {};

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['payroll-settings'] });
    qc.invalidateQueries({ queryKey: ['payroll-insurance-rates'] });
    qc.invalidateQueries({ queryKey: ['payroll-tax-brackets'] });
    qc.invalidateQueries({ queryKey: ['payroll-components'] });
    qc.invalidateQueries({ queryKey: ['payroll-account-mappings'] });
    qc.invalidateQueries({ queryKey: ['payroll-bank-formats'] });
    qc.invalidateQueries({ queryKey: ['payroll-options'] });
  };
  const onError = (errorObject) => setMessage({
    ok: false,
    text: errorObject.response?.data?.detail
      || errorObject.response?.data?.non_field_errors?.[0]
      || 'ذخیرهٔ تنظیمات ناموفق بود.',
  });

  const saveSettings = useMutation({
    mutationFn: (payload) => (payload.id
      ? axiosInstance.patch(`/payroll-settings/${payload.id}/`, payload)
      : axiosInstance.post('/payroll-settings/', payload)),
    onSuccess: () => { invalidate(); setMessage({ ok: true, text: 'تنظیمات حقوق ذخیره شد.' }); },
    onError,
  });
  const saveRate = useMutation({
    mutationFn: (payload) => axiosInstance.post('/payroll-insurance-rates/', {
      ...payload, effective_to: payload.effective_to || null,
    }),
    onSuccess: () => { invalidate(); setRateOpen(false); setRateForm(emptyRate()); setMessage({ ok: true, text: 'نرخ بیمه ثبت شد.' }); },
    onError,
  });
  const saveTax = useMutation({
    mutationFn: (payload) => axiosInstance.post('/payroll-tax-brackets/', {
      ...payload, effective_to: payload.effective_to || null,
      upper_bound: payload.upper_bound === '' ? null : payload.upper_bound,
    }),
    onSuccess: () => { invalidate(); setTaxOpen(false); setTaxForm(emptyTax()); setMessage({ ok: true, text: 'پلهٔ مالیات ثبت شد.' }); },
    onError,
  });
  const saveComponent = useMutation({
    mutationFn: (payload) => (editingComponent
      ? axiosInstance.patch(`/payroll-components/${editingComponent}/`, payload)
      : axiosInstance.post('/payroll-components/', payload)),
    onSuccess: () => { invalidate(); setComponentOpen(false); setComponentForm(emptyComponent()); setEditingComponent(null); setMessage({ ok: true, text: 'مؤلفه ذخیره شد.' }); },
    onError,
  });
  const deleteComponent = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/payroll-components/${id}/`),
    onSuccess: () => { invalidate(); setMessage({ ok: true, text: 'مؤلفه حذف شد.' }); },
    onError,
  });
  const saveMapping = useMutation({
    mutationFn: (payload) => axiosInstance.post('/payroll-account-mappings/', {
      ...payload, journal: payload.journal || null,
    }),
    onSuccess: () => { invalidate(); setMappingOpen(false); setMessage({ ok: true, text: 'نگاشت حساب ذخیره شد.' }); },
    onError,
  });
  const saveFormat = useMutation({
    mutationFn: (payload) => axiosInstance.post('/payroll-bank-formats/', {
      ...payload,
      line_fields: payload.line_fields.split(',').map((item) => item.trim()).filter(Boolean),
    }),
    onSuccess: () => { invalidate(); setFormatOpen(false); setMessage({ ok: true, text: 'قالب فایل بانکی ذخیره شد.' }); },
    onError,
  });


  const setSetting = (key, value) => setSettingsForm((prev) => ({ ...(prev || {}), [key]: value }));
  const componentColumns = useMemo(() => [
    { key: 'code', label: 'کد', render: (row) => <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{row.code}</Typography> },
    { key: 'title', label: 'عنوان', render: (row) => row.title },
    { key: 'kind', label: 'نوع', render: (row) => <Chip size="small" label={row.kind_display || row.kind} /> },
    { key: 'calc_type', label: 'محاسبه', render: (row) => row.calc_type_display || row.calc_type },
    { key: 'flags', label: 'مشمول', render: (row) => (
      <Stack direction="row" spacing={0.5} flexWrap="wrap">
        {row.is_insurable ? <Chip size="small" label="بیمه" /> : null}
        {row.is_taxable ? <Chip size="small" label="مالیات" /> : null}
        {row.affects_cost ? <Chip size="small" label="بهای تمام‌شده" /> : null}
      </Stack>
    ) },
    { key: 'priority', label: 'اولویت', align: 'center', render: (row) => number(row.priority) },
    {
      key: 'actions', label: 'عملیات', render: (row) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="ویرایش"><span><IconButton size="small" onClick={() => { setEditingComponent(row.id); setComponentForm({ ...emptyComponent(), ...row }); setComponentOpen(true); }}><EditIcon fontSize="small" /></IconButton></span></Tooltip>
          {!row.is_builtin && <Tooltip title="حذف"><span><IconButton size="small" color="error" onClick={() => { if (window.confirm('این مؤلفه حذف شود؟')) deleteComponent.mutate(row.id); }}><DeleteIcon fontSize="small" /></IconButton></span></Tooltip>}
        </Stack>
      ),
    },
  ], [deleteComponent]);

  const rateColumns = [
    { key: 'effective_from', label: 'معتبر از', render: (row) => row.effective_from },
    { key: 'employee_rate', label: 'سهم کارمند', render: (row) => `${number(row.employee_rate)}٪` },
    { key: 'employer_rate', label: 'سهم کارفرما', render: (row) => `${number(row.employer_rate)}٪` },
    { key: 'base', label: 'کف/سقف مبنا', render: (row) => `${money(row.min_base)} / ${money(row.max_base)}` },
  ];
  const taxColumns = [
    { key: 'effective_from', label: 'معتبر از', render: (row) => row.effective_from },
    { key: 'lower_bound', label: 'از مبلغ', render: (row) => money(row.lower_bound) },
    { key: 'upper_bound', label: 'تا مبلغ', render: (row) => (row.upper_bound == null ? 'بدون سقف' : money(row.upper_bound)) },
    { key: 'rate', label: 'نرخ', render: (row) => `${number(row.rate)}٪` },
  ];
  const mappingColumns = [
    { key: 'code', label: 'رویداد', render: (row) => row.code_display || row.code },
    { key: 'account', label: 'حساب', render: (row) => `${row.account_code} — ${row.account_name}` },
    { key: 'journal_name', label: 'روزنامه', render: (row) => row.journal_name || '—' },
  ];
  const formatColumns = [
    { key: 'code', label: 'کد', render: (row) => row.code },
    { key: 'name', label: 'نام قالب', render: (row) => row.name },
    { key: 'bank_name', label: 'بانک', render: (row) => row.bank_name || '—' },
    { key: 'format_type', label: 'نوع', render: (row) => row.format_type },
    { key: 'fields', label: 'ستون‌ها', render: (row) => (row.line_fields || []).length },
  ];


  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {message && <Alert severity={message.ok ? 'success' : 'error'} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {show('base') && (<Section title="قواعد محاسبه و نرخ‌های پایه" accent={accent} action={<Button size="small" variant="contained" startIcon={<SaveIcon />} sx={{ bgcolor: accent }} disabled={!settingsForm || saveSettings.isPending} onClick={() => saveSettings.mutate(settingsForm)}>{saveSettings.isPending ? 'در حال ذخیره…' : 'ذخیرهٔ تنظیمات'}</Button>}>
        {settingsForm ? (
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="روز کاری ماه" type="number" value={settingsForm.work_days_per_month ?? ''} onChange={(event) => setSetting('work_days_per_month', event.target.value)} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="ساعت کاری روز" type="number" value={settingsForm.work_hours_per_day ?? ''} onChange={(event) => setSetting('work_hours_per_day', event.target.value)} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="نرخ بیمه سهم کارمند (٪)" type="number" value={settingsForm.insurance_employee_rate ?? ''} onChange={(event) => setSetting('insurance_employee_rate', event.target.value)} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="نرخ بیمه سهم کارفرما (٪)" type="number" value={settingsForm.insurance_employer_rate ?? ''} onChange={(event) => setSetting('insurance_employer_rate', event.target.value)} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="کف مبنای بیمه" type="number" value={settingsForm.insurance_min_base ?? ''} onChange={(event) => setSetting('insurance_min_base', event.target.value)} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="سقف مبنای بیمه (۰=بدون سقف)" type="number" value={settingsForm.insurance_max_base ?? ''} onChange={(event) => setSetting('insurance_max_base', event.target.value)} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="معافیت مالیاتی ماهانه" type="number" value={settingsForm.tax_exemption_monthly ?? ''} onChange={(event) => setSetting('tax_exemption_monthly', event.target.value)} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="مرخصی استحقاقی سالانه" type="number" value={settingsForm.annual_leave_days ?? ''} onChange={(event) => setSetting('annual_leave_days', event.target.value)} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="ضریب اضافه‌کاری" type="number" value={settingsForm.overtime_rate ?? ''} onChange={(event) => setSetting('overtime_rate', event.target.value)} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="ضریب شب‌کاری" type="number" value={settingsForm.night_rate ?? ''} onChange={(event) => setSetting('night_rate', event.target.value)} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="ضریب تعطیل‌کاری" type="number" value={settingsForm.holiday_rate ?? ''} onChange={(event) => setSetting('holiday_rate', event.target.value)} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="آستانهٔ هشدار تغییر (٪)" type="number" value={settingsForm.large_change_threshold ?? ''} onChange={(event) => setSetting('large_change_threshold', event.target.value)} /></Grid>
            <Grid item xs={12} sm={6} md={3}><FormControlLabel control={<Switch checked={Boolean(settingsForm.tax_deduct_employee_insurance)} onChange={(event) => setSetting('tax_deduct_employee_insurance', event.target.checked)} />} label="کسر بیمهٔ کارمند از مبنای مالیات" /></Grid>
            <Grid item xs={12} sm={6} md={3}><FormControlLabel control={<Switch checked={Boolean(settingsForm.include_unapproved_overtime)} onChange={(event) => setSetting('include_unapproved_overtime', event.target.checked)} />} label="احتساب اضافه‌کاری تأییدنشده" /></Grid>
            <Grid item xs={12} sm={6} md={3}><FormControlLabel control={<Switch checked={Boolean(settingsForm.require_bank_account)} onChange={(event) => setSetting('require_bank_account', event.target.checked)} />} label="الزام حساب/شبا" /></Grid>
          </Grid>
        ) : <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>در حال دریافت تنظیمات…</Typography>}
      </Section>)}


      {(show('insurance') || show('tax')) && (<Grid container spacing={2}>
        {show('insurance') && (
        <Grid item xs={12} md={show('tax') ? 6 : 12}>
          <Section title="نرخ‌های بیمه (تاریخ‌محور)" accent={accent} action={<Button size="small" startIcon={<AddIcon />} onClick={() => { setRateForm(emptyRate()); setRateOpen(true); }}>نرخ جدید</Button>}>
            <DataTable ariaLabel="نرخ‌های بیمه" rows={rates} columns={rateColumns} themed getRowId={(row) => row.id} emptyText="نرخ بیمه‌ای ثبت نشده است." />
          </Section>
        </Grid>
        )}
        {show('tax') && (
        <Grid item xs={12} md={show('insurance') ? 6 : 12}>
          <Section title="پله‌های مالیات (تاریخ‌محور)" accent={accent} action={<Button size="small" startIcon={<AddIcon />} onClick={() => { setTaxForm(emptyTax()); setTaxOpen(true); }}>پلهٔ جدید</Button>}>
            <DataTable ariaLabel="پله‌های مالیات" rows={taxes} columns={taxColumns} themed getRowId={(row) => row.id} emptyText="پلهٔ مالیاتی ثبت نشده است." />
          </Section>
        </Grid>
        )}
      </Grid>)}

      {show('components') && (<Section title="مزایا و کسورات (مؤلفه‌محور)" accent={accent} action={<Button size="small" variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: accent }} onClick={() => { setEditingComponent(null); setComponentForm(emptyComponent()); setComponentOpen(true); }}>مؤلفهٔ جدید</Button>}>
        <DataTable ariaLabel="مؤلفه‌های حقوق" rows={components} columns={componentColumns} themed getRowId={(row) => row.id} emptyText="مؤلفه‌ای ثبت نشده است." />
      </Section>)}

      {(show('mapping') || show('formats')) && (<Grid container spacing={2}>
        {show('mapping') && (
        <Grid item xs={12} md={show('formats') ? 6 : 12}>
          <Section title="نگاشت حساب‌های حقوق" accent={accent} action={<Button size="small" startIcon={<AddIcon />} onClick={() => setMappingOpen(true)}>نگاشت جدید</Button>}>
            <DataTable ariaLabel="نگاشت حساب‌ها" rows={mappings} columns={mappingColumns} themed getRowId={(row) => row.id} emptyText="نگاشت حسابی ثبت نشده است؛ قبل از ثبت سند، رویدادهای اصلی را نگاشت کنید." />
          </Section>
        </Grid>
        )}
        {show('formats') && (
        <Grid item xs={12} md={show('mapping') ? 6 : 12}>
          <Section title="قالب‌های فایل پرداخت بانکی" accent={accent} action={<Button size="small" startIcon={<AddIcon />} onClick={() => setFormatOpen(true)}>قالب جدید</Button>}>
            <DataTable ariaLabel="قالب‌های بانکی" rows={formats} columns={formatColumns} themed getRowId={(row) => row.id} emptyText="قالب فایل پرداختی ثبت نشده است." />
          </Section>
        </Grid>
        )}
      </Grid>)}



      <Dialog open={rateOpen} onClose={() => setRateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>نرخ بیمهٔ جدید</DialogTitle>
        <DialogContent>
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}><JalaliDatePicker label="معتبر از" value={rateForm.effective_from} onChange={(value) => setRateForm((prev) => ({ ...prev, effective_from: value }))} /></Grid>
            <Grid item xs={12} sm={6}><JalaliDatePicker label="معتبر تا (اختیاری)" value={rateForm.effective_to} onChange={(value) => setRateForm((prev) => ({ ...prev, effective_to: value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="number" label="نرخ سهم کارمند (٪)" value={rateForm.employee_rate} onChange={(event) => setRateForm((prev) => ({ ...prev, employee_rate: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="number" label="نرخ سهم کارفرما (٪)" value={rateForm.employer_rate} onChange={(event) => setRateForm((prev) => ({ ...prev, employer_rate: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="number" label="کف مبنا" value={rateForm.min_base} onChange={(event) => setRateForm((prev) => ({ ...prev, min_base: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="number" label="سقف مبنا (۰=بدون سقف)" value={rateForm.max_base} onChange={(event) => setRateForm((prev) => ({ ...prev, max_base: event.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="شرح" value={rateForm.description} onChange={(event) => setRateForm((prev) => ({ ...prev, description: event.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setRateOpen(false)}>انصراف</Button><Button variant="contained" sx={{ bgcolor: accent }} disabled={saveRate.isPending} onClick={() => saveRate.mutate(rateForm)}>ثبت نرخ</Button></DialogActions>
      </Dialog>

      <Dialog open={taxOpen} onClose={() => setTaxOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>پلهٔ مالیات جدید</DialogTitle>
        <DialogContent>
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}><JalaliDatePicker label="معتبر از" value={taxForm.effective_from} onChange={(value) => setTaxForm((prev) => ({ ...prev, effective_from: value }))} /></Grid>
            <Grid item xs={12} sm={6}><JalaliDatePicker label="معتبر تا (اختیاری)" value={taxForm.effective_to} onChange={(value) => setTaxForm((prev) => ({ ...prev, effective_to: value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="number" label="از مبلغ" value={taxForm.lower_bound} onChange={(event) => setTaxForm((prev) => ({ ...prev, lower_bound: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="number" label="تا مبلغ (خالی=بدون سقف)" value={taxForm.upper_bound} onChange={(event) => setTaxForm((prev) => ({ ...prev, upper_bound: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="number" label="نرخ (٪)" value={taxForm.rate} onChange={(event) => setTaxForm((prev) => ({ ...prev, rate: event.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="شرح" value={taxForm.description} onChange={(event) => setTaxForm((prev) => ({ ...prev, description: event.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setTaxOpen(false)}>انصراف</Button><Button variant="contained" sx={{ bgcolor: accent }} disabled={saveTax.isPending} onClick={() => saveTax.mutate(taxForm)}>ثبت پله</Button></DialogActions>
      </Dialog>


      <Dialog open={componentOpen} onClose={() => setComponentOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingComponent ? 'ویرایش مؤلفه' : 'مؤلفهٔ جدید'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="کد" value={componentForm.code} disabled={componentForm.is_builtin} onChange={(event) => setComponentForm((prev) => ({ ...prev, code: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={8}><TextField fullWidth size="small" label="عنوان" value={componentForm.title} onChange={(event) => setComponentForm((prev) => ({ ...prev, title: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField select fullWidth size="small" label="نوع" value={componentForm.kind} onChange={(event) => setComponentForm((prev) => ({ ...prev, kind: event.target.value }))}>
              <MenuItem value="earning">دریافتی</MenuItem><MenuItem value="deduction">کسورات</MenuItem><MenuItem value="employer_cost">هزینهٔ کارفرما</MenuItem>
            </TextField></Grid>
            <Grid item xs={12} sm={6}><TextField select fullWidth size="small" label="دسته" value={componentForm.category} onChange={(event) => setComponentForm((prev) => ({ ...prev, category: event.target.value }))}>
              {['base', 'allowance', 'overtime', 'shift', 'insurance', 'tax', 'loan', 'advance', 'leave', 'bonus', 'other'].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={12} sm={6}><TextField select fullWidth size="small" label="نوع محاسبه" value={componentForm.calc_type} onChange={(event) => setComponentForm((prev) => ({ ...prev, calc_type: event.target.value }))}>
              {['fixed', 'formula', 'percent', 'attendance', 'manual'].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="number" label="اولویت" value={componentForm.priority} onChange={(event) => setComponentForm((prev) => ({ ...prev, priority: event.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="فرمول (SUM, MIN, MAX, ROUND, IF, ABS)" value={componentForm.formula || ''} onChange={(event) => setComponentForm((prev) => ({ ...prev, formula: event.target.value }))} placeholder="BASE_SALARY * 10 / 100" /></Grid>
            <Grid item xs={12}><Stack direction="row" spacing={2} flexWrap="wrap">
              {[['is_insurable', 'مشمول بیمه'], ['is_taxable', 'مشمول مالیات'], ['is_benefit', 'مشمول مزایا'], ['affects_cost', 'مؤثر در بهای تمام‌شده'], ['allocatable_to_project', 'قابل تخصیص به پروژه'], ['allocatable_to_cost_center', 'قابل تخصیص به مرکز هزینه']].map(([key, label]) => (
                <FormControlLabel key={key} control={<Switch checked={Boolean(componentForm[key])} onChange={(event) => setComponentForm((prev) => ({ ...prev, [key]: event.target.checked }))} />} label={label} />
              ))}
            </Stack></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" multiline minRows={2} label="توضیحات" value={componentForm.description || ''} onChange={(event) => setComponentForm((prev) => ({ ...prev, description: event.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setComponentOpen(false)}>انصراف</Button><Button variant="contained" sx={{ bgcolor: accent }} disabled={saveComponent.isPending} onClick={() => saveComponent.mutate(componentForm)}>ذخیرهٔ مؤلفه</Button></DialogActions>
      </Dialog>

      <Dialog open={mappingOpen} onClose={() => setMappingOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>نگاشت حساب حقوق</DialogTitle>
        <DialogContent>
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField select fullWidth size="small" label="رویداد" value={mappingForm.code} onChange={(event) => setMappingForm((prev) => ({ ...prev, code: event.target.value }))}>
              {[['salary_expense', 'هزینهٔ حقوق و مزایا'], ['employer_insurance_expense', 'هزینهٔ بیمهٔ کارفرما'], ['employee_insurance_payable', 'بیمهٔ پرداختنی — کارمند'], ['employer_insurance_payable', 'بیمهٔ پرداختنی — کارفرما'], ['tax_payable', 'مالیات پرداختنی'], ['net_payable', 'حقوق پرداختنی'], ['other_deduction_payable', 'سایر کسورات پرداختنی']].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={12}><TextField select fullWidth size="small" label="حساب" value={mappingForm.account} onChange={(event) => setMappingForm((prev) => ({ ...prev, account: event.target.value }))}>
              {(options.accounts || []).map((row) => <MenuItem key={row.id} value={row.id}>{row.code} — {row.name}</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={12}><TextField select fullWidth size="small" label="دفتر روزنامه (اختیاری)" value={mappingForm.journal} onChange={(event) => setMappingForm((prev) => ({ ...prev, journal: event.target.value }))}>
              <MenuItem value="">بدون روزنامه</MenuItem>
              {(options.journals || []).map((row) => <MenuItem key={row.id} value={row.id}>{row.code} — {row.name}</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={12}><Stack direction="row" spacing={2}><FormControlLabel control={<Switch checked={Boolean(mappingForm.requires_project)} onChange={(event) => setMappingForm((prev) => ({ ...prev, requires_project: event.target.checked }))} />} label="نیازمند پروژه" /><FormControlLabel control={<Switch checked={Boolean(mappingForm.requires_cost_center)} onChange={(event) => setMappingForm((prev) => ({ ...prev, requires_cost_center: event.target.checked }))} />} label="نیازمند مرکز هزینه" /></Stack></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setMappingOpen(false)}>انصراف</Button><Button variant="contained" sx={{ bgcolor: accent }} disabled={saveMapping.isPending} onClick={() => saveMapping.mutate(mappingForm)}>ذخیرهٔ نگاشت</Button></DialogActions>
      </Dialog>

      <Dialog open={formatOpen} onClose={() => setFormatOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>قالب فایل پرداخت بانکی</DialogTitle>
        <DialogContent>
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="کد" value={formatForm.code} onChange={(event) => setFormatForm((prev) => ({ ...prev, code: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={8}><TextField fullWidth size="small" label="نام قالب" value={formatForm.name} onChange={(event) => setFormatForm((prev) => ({ ...prev, name: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="بانک" value={formatForm.bank_name} onChange={(event) => setFormatForm((prev) => ({ ...prev, bank_name: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField select fullWidth size="small" label="نوع فایل" value={formatForm.format_type} onChange={(event) => setFormatForm((prev) => ({ ...prev, format_type: event.target.value }))}><MenuItem value="csv">CSV</MenuItem><MenuItem value="fixed">طول ثابت</MenuItem></TextField></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="ستون‌ها (با کاما)" value={formatForm.line_fields} onChange={(event) => setFormatForm((prev) => ({ ...prev, line_fields: event.target.value }))} helperText="کلیدهای مجاز: beneficiary_name, national_id, bank_name, account_number, iban, amount, employee_code" /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setFormatOpen(false)}>انصراف</Button><Button variant="contained" sx={{ bgcolor: accent }} disabled={saveFormat.isPending} onClick={() => saveFormat.mutate(formatForm)}>ذخیرهٔ قالب</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default PayrollSettingsPanel;

