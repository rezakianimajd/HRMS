import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Checkbox, Chip, Grid, MenuItem, Paper, Stack, TextField,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import axiosInstance from '../../core/api/axiosConfig';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';
import PrintButton from '../../core/print/PrintButton';
import { toGregorian, toJalali } from '../../core/utils/dateUtils';
import { money, payrollCardSx, statusMeta } from './payrollUi';

const BANK_ITEMS = [
  { field: 'base_salary', code: 'BASE_SALARY', label: 'حقوق پایه' },
  { field: 'attraction_allowance', code: 'ATTRACTION_ALLOWANCE', label: 'حق جذب' },
  { field: 'job_allowance', code: 'JOB_ALLOWANCE', label: 'فوق‌العاده شغل' },
  { field: 'supervision_allowance', code: 'SUPERVISION_ALLOWANCE', label: 'حق سرپرستی' },
  { field: 'hardship_allowance', code: 'HARDSHIP_ALLOWANCE', label: 'سختی کار' },
  { field: 'workshop_mission_allowance', code: 'WORKSHOP_MISSION', label: 'ماموریت کارگاهی' },
  { field: 'seniority_allowance', code: 'SENIORITY_ALLOWANCE', label: 'پایه سنوات' },
  { field: 'other_allowance', code: 'OTHER_ALLOWANCE', label: 'سایر مزایا' },
];

const WELFARE_ITEMS = [
  { field: 'housing_allowance', code: 'HOUSING_ALLOWANCE', label: 'حق مسکن' },
  { field: 'marriage_allowance', code: 'MARRIAGE_ALLOWANCE', label: 'حق تأهل' },
  { field: 'child_allowance', code: 'CHILD_ALLOWANCE', label: 'حق اولاد' },
  { field: 'food_allowance', code: 'FOOD_ALLOWANCE', label: 'بن کارکنان' },
  { field: 'travel_allowance', code: 'TRAVEL_ALLOWANCE', label: 'هزینه سفر' },
  { field: 'phone_allowance', code: 'PHONE_ALLOWANCE', label: 'هزینه تلفن' },
];

const ALL_ITEMS = [...BANK_ITEMS, ...WELFARE_ITEMS];
const defaultFlags = () => ALL_ITEMS.reduce((acc, row) => {
  acc[row.code] = { compute: true, insurable: true, taxable: true };
  return acc;
}, {});

const emptyProfile = (employee = '') => ({
  employee,
  order_number: '',
  description: '',
  issue_date: toGregorian('1405/01/01'),
  effective_from: toGregorian('1405/01/01'),
  effective_to: '',
  calculation_method: 'annual_1405',
  status: 'active',
  base_salary: 0,
  housing_allowance: 0,
  food_allowance: 0,
  seniority_allowance: 0,
  attraction_allowance: 0,
  job_allowance: 0,
  supervision_allowance: 0,
  hardship_allowance: 0,
  workshop_mission_allowance: 0,
  marriage_allowance: 0,
  child_allowance: 0,
  travel_allowance: 0,
  phone_allowance: 0,
  other_allowance: 0,
  insurance_eligible: true,
  tax_eligible: true,
  direct_labor: true,
  default_project: '',
  default_cost_center: '',
  component_settings: defaultFlags(),
  notes: '',
});

const formatInput = (value) => (value == null || value === '' ? '' : String(value));
const dateLabel = (value) => (value ? toJalali(value) : '—');

const OrderItemTable = ({ title, items, form, setField, setFlag }) => (
  <Paper elevation={0} sx={payrollCardSx({ p: 1.5 })}>
    <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 1 }}>{title}</Typography>
    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <Box component="thead">
        <Box component="tr" sx={{ color: 'text.secondary' }}>
          {['شرح', 'مبلغ', 'محاسبه', 'بیمه', 'مالیات'].map((label) => (
            <Box component="th" key={label} sx={{ p: 0.6, textAlign: 'center', borderBottom: '1px solid var(--hrms-table-border-color, #e2e8f0)' }}>{label}</Box>
          ))}
        </Box>
      </Box>
      <Box component="tbody">
        {items.map((item) => {
          const flags = form.component_settings?.[item.code] || { compute: true, insurable: true, taxable: true };
          return (
            <Box component="tr" key={item.code}>
              <Box component="td" sx={{ p: 0.6, borderBottom: '1px solid var(--hrms-table-border-color, #e2e8f0)' }}>{item.label}</Box>
              <Box component="td" sx={{ p: 0.6, borderBottom: '1px solid var(--hrms-table-border-color, #e2e8f0)', minWidth: 150 }}>
                <TextField
                  fullWidth size="small" type="number" value={formatInput(form[item.field])}
                  onChange={(event) => setField(item.field, event.target.value)}
                  inputProps={{ inputMode: 'numeric', style: { fontSize: 12, textAlign: 'left' } }}
                />
              </Box>
              {['compute', 'insurable', 'taxable'].map((key) => (
                <Box component="td" key={key} sx={{ p: 0.6, textAlign: 'center', borderBottom: '1px solid var(--hrms-table-border-color, #e2e8f0)' }}>
                  <Checkbox size="small" checked={flags[key] !== false} onChange={(event) => setFlag(item.code, key, event.target.checked)} />
                </Box>
              ))}
            </Box>
          );
        })}
      </Box>
    </Box>
    <Typography sx={{ mt: 1, fontSize: 11.5, color: 'text.secondary' }}>
      جمع این بخش: {money(items.reduce((sum, item) => sum + Number(form[item.field] || 0), 0))}
    </Typography>
  </Paper>
);


const PayrollOrderPage = ({ accent }) => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProfile);
  const [message, setMessage] = useState(null);

  const { data: options } = useQuery({
    queryKey: ['payroll-options'],
    queryFn: () => axiosInstance.get('/payroll/options/').then((r) => r.data),
  });
  const { data } = useQuery({
    queryKey: ['payroll-profiles'],
    queryFn: () => axiosInstance.get('/payroll-profiles/', { params: { page_size: 500 } }).then((r) => r.data),
  });
  const profiles = Array.isArray(data) ? data : data?.results || [];
  const employees = useMemo(() => {
    const term = search.trim();
    return (options?.employees || []).filter((row) => !term
      || [row.name, row.code, row.department, row.job_title].some((value) => String(value || '').includes(term)));
  }, [options, search]);
  const costCenters = options?.cost_centers || [];
  const employeeProfiles = useMemo(
    () => profiles.filter((row) => String(row.employee) === String(selectedEmployee))
      .sort((a, b) => String(b.effective_from || '').localeCompare(String(a.effective_from || ''))),
    [profiles, selectedEmployee],
  );

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const setFlag = (code, key, value) => setForm((prev) => {
    const current = prev.component_settings?.[code] || { compute: true, insurable: true, taxable: true };
    return { ...prev, component_settings: { ...(prev.component_settings || {}), [code]: { ...current, [key]: value } } };
  });

  const loadProfile = (row) => {
    setEditing(row.id);
    setSelectedEmployee(String(row.employee));
    setForm({
      ...emptyProfile(String(row.employee)),
      ...row,
      effective_to: row.effective_to || '',
      default_project: row.default_project || '',
      default_cost_center: row.default_cost_center || '',
      component_settings: { ...defaultFlags(), ...(row.component_settings || {}) },
    });
  };
  const selectEmployee = (id) => {
    setSelectedEmployee(id);
    const row = profiles.find((item) => String(item.employee) === String(id));
    if (row) loadProfile(row);
    else { setEditing(null); setForm(emptyProfile(id)); }
  };
  const newOrder = () => { setEditing(null); setForm(emptyProfile(selectedEmployee)); };

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        effective_to: form.effective_to || null,
        issue_date: form.issue_date || null,
        default_project: form.default_project || null,
        default_cost_center: form.default_cost_center || null,
      };
      return editing
        ? axiosInstance.patch(`/payroll-profiles/${editing}/`, payload)
        : axiosInstance.post('/payroll-profiles/', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-profiles'] });
      setMessage({ ok: true, text: 'حکم پرسنلی ذخیره شد.' });
    },
    onError: (error) => setMessage({ ok: false, text: error.response?.data?.detail || error.response?.data?.non_field_errors?.[0] || 'ذخیرهٔ حکم ناموفق بود.' }),
  });


  const downloadCsv = () => {
    const headers = ['کد پرسنلی', 'نام', 'شماره حکم', 'شرح', 'تاریخ صدور', 'معتبر از', 'حقوق پایه', 'جمع مزایا', 'وضعیت'];
    const rows = employeeProfiles.map((row) => [
      row.employee_code, row.employee_name, row.order_number, row.description,
      dateLabel(row.issue_date), dateLabel(row.effective_from), row.base_salary,
      ALL_ITEMS.filter((item) => item.field !== 'base_salary').reduce((sum, item) => sum + Number(row[item.field] || 0), 0),
      statusMeta(row.status).label,
    ]);
    const csv = [headers, ...rows]
      .map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `payroll-orders-${selectedEmployee || 'all'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };


  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {message && <Alert severity={message.ok ? 'success' : 'error'} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <Paper elevation={0} sx={payrollCardSx({ p: 1.5 })}>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={2}>
            <TextField select fullWidth size="small" label="سال حکم" value="1405" disabled>
              <MenuItem value="1405">۱۴۰۵</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField select fullWidth size="small" label="روش محاسبهٔ حکم" value={form.calculation_method} onChange={(event) => setField('calculation_method', event.target.value)}>
              <MenuItem value="annual_1405">قوانین تاریخ‌محور سال ۱۴۰۵</MenuItem>
              <MenuItem value="manual">دستی</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField select fullWidth size="small" label="پرسنل" value={selectedEmployee} onChange={(event) => selectEmployee(event.target.value)}>
              <MenuItem value="">انتخاب پرسنل…</MenuItem>
              {employees.map((row) => <MenuItem key={row.id} value={String(row.id)}>{row.name} — {row.code}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField fullWidth size="small" label="جست‌وجوی پرسنل" value={search} onChange={(event) => setSearch(event.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField select fullWidth size="small" label="مرکز هزینه" value={form.default_cost_center} onChange={(event) => setField('default_cost_center', event.target.value)}>
              <MenuItem value="">بدون مرکز هزینه</MenuItem>
              {costCenters.map((row) => <MenuItem key={row.id} value={String(row.id)}>{row.code} — {row.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField fullWidth size="small" label="کد/شمارهٔ حکم" value={form.order_number} onChange={(event) => setField('order_number', event.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <JalaliDatePicker label="تاریخ صدور" value={form.issue_date} onChange={(value) => setField('issue_date', value)} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <JalaliDatePicker label="تاریخ اجرا" value={form.effective_from} onChange={(value) => setField('effective_from', value)} />
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={0} sx={payrollCardSx({ p: 1.5 })}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 800 }}>سابقهٔ احکام {selectedEmployee ? 'همین پرسنل' : ''}</Typography>
          <Button size="small" variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: accent }} onClick={newOrder} disabled={!selectedEmployee}>حکم جدید</Button>
          <Button size="small" startIcon={<DownloadIcon />} onClick={downloadCsv} disabled={!employeeProfiles.length}>خروجی اکسل</Button>
          <PrintButton target="main" title="احکام پرسنلی" orientation="landscape" />
          <Button size="small" onClick={() => navigate('/correspondence')}>خروج</Button>
        </Stack>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <Box component="thead"><Box component="tr" sx={{ color: 'text.secondary' }}>
              {['شماره حکم', 'شرح حکم', 'تاریخ صدور', 'تاریخ اجرا', 'حقوق پایه', 'جمع مزایا', 'وضعیت'].map((label) => (
                <Box component="th" key={label} sx={{ p: 0.75, borderBottom: '1px solid var(--hrms-table-border-color, #e2e8f0)', textAlign: 'right' }}>{label}</Box>
              ))}
            </Box></Box>
            <Box component="tbody">
              {employeeProfiles.length === 0 ? (
                <Box component="tr"><Box component="td" colSpan={7} sx={{ p: 2, color: 'text.secondary' }}>برای این پرسنل حکمی ثبت نشده است.</Box></Box>
              ) : employeeProfiles.map((row) => (
                <Box component="tr" key={row.id} onClick={() => loadProfile(row)} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                  <Box component="td" sx={{ p: 0.75, borderBottom: '1px solid var(--hrms-table-border-color, #e2e8f0)' }}>{row.order_number || '—'}</Box>
                  <Box component="td" sx={{ p: 0.75, borderBottom: '1px solid var(--hrms-table-border-color, #e2e8f0)' }}>{row.description || 'حکم حقوقی'}</Box>
                  <Box component="td" sx={{ p: 0.75, borderBottom: '1px solid var(--hrms-table-border-color, #e2e8f0)' }}>{dateLabel(row.issue_date)}</Box>
                  <Box component="td" sx={{ p: 0.75, borderBottom: '1px solid var(--hrms-table-border-color, #e2e8f0)' }}>{dateLabel(row.effective_from)}</Box>
                  <Box component="td" sx={{ p: 0.75, borderBottom: '1px solid var(--hrms-table-border-color, #e2e8f0)' }}>{money(row.base_salary)}</Box>
                  <Box component="td" sx={{ p: 0.75, borderBottom: '1px solid var(--hrms-table-border-color, #e2e8f0)' }}>{money(ALL_ITEMS.filter((item) => item.field !== 'base_salary').reduce((sum, item) => sum + Number(row[item.field] || 0), 0))}</Box>
                  <Box component="td" sx={{ p: 0.75, borderBottom: '1px solid var(--hrms-table-border-color, #e2e8f0)' }}><Chip size="small" label={statusMeta(row.status).label} /></Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Paper>


      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <OrderItemTable title="مزایای نقدی و بانکی" items={BANK_ITEMS} form={form} setField={setField} setFlag={setFlag} />
        </Grid>
        <Grid item xs={12} md={6}>
          <OrderItemTable title="مزایای رفاهی و کمک‌هزینه‌ها" items={WELFARE_ITEMS} form={form} setField={setField} setFlag={setFlag} />
        </Grid>
      </Grid>

      <Paper elevation={0} sx={payrollCardSx({ p: 1.5 })}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField fullWidth size="small" label="شرح حکم" value={form.description} onChange={(event) => setField('description', event.target.value)} />
          </Grid>
          <Grid item xs={12} sm={4} md={2}>
            <TextField select fullWidth size="small" label="وضعیت حکم" value={form.status} onChange={(event) => setField('status', event.target.value)}>
              <MenuItem value="active">فعال</MenuItem>
              <MenuItem value="suspended">تعلیق</MenuItem>
              <MenuItem value="terminated">پایان همکاری</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4} md={2}>
            <TextField select fullWidth size="small" label="پوشش بیمه" value={form.insurance_eligible ? '1' : '0'} onChange={(event) => setField('insurance_eligible', event.target.value === '1')}>
              <MenuItem value="1">مشمول بیمه</MenuItem>
              <MenuItem value="0">غیرمشمول</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4} md={2}>
            <TextField select fullWidth size="small" label="پوشش مالیات" value={form.tax_eligible ? '1' : '0'} onChange={(event) => setField('tax_eligible', event.target.value === '1')}>
              <MenuItem value="1">مشمول مالیات</MenuItem>
              <MenuItem value="0">غیرمشمول</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Paper elevation={0} sx={payrollCardSx({ px: 2, py: 1, bgcolor: 'var(--hrms-table-header-bg, #f8fafc)' })}>
                <Typography sx={{ fontSize: 12, fontWeight: 800 }}>جمع حقوق و مزایا: {money(ALL_ITEMS.reduce((sum, item) => sum + Number(form[item.field] || 0), 0))}</Typography>
              </Paper>
              <Button variant="contained" startIcon={<SaveIcon />} sx={{ bgcolor: accent }} disabled={!selectedEmployee || save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? 'در حال ذخیره…' : 'ذخیرهٔ حکم'}
              </Button>
              <Button variant="outlined" onClick={() => setForm(emptyProfile(selectedEmployee))}>بازنشانی</Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default PayrollOrderPage;

