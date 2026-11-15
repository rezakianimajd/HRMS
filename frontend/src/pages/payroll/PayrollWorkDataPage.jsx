import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Checkbox, Chip, Grid, MenuItem, Paper, Stack, TextField, Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import axiosInstance from '../../core/api/axiosConfig';
import PrintButton from '../../core/print/PrintButton';
import { money, payrollCardSx, statusMeta } from './payrollUi';

const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

const FIELDS = [
  { key: 'work_days', label: 'کارکرد ماه (روز)', group: 'کارکرد' },
  { key: 'payable_days', label: 'روز قابل پرداخت', group: 'کارکرد' },
  { key: 'overtime_hours', label: 'ساعت اضافه‌کاری', group: 'کارکرد' },
  { key: 'friday_hours', label: 'ساعت جمعه‌کاری', group: 'کارکرد' },
  { key: 'night_hours', label: 'ساعت شب‌کاری', group: 'کارکرد' },
  { key: 'shift_hours', label: 'ساعت نوبت‌کاری', group: 'کارکرد' },
  { key: 'insurance_days', label: 'روز بیمه', group: 'کارکرد' },
  { key: 'mission_days', label: 'روز مأموریت', group: 'کارکرد' },
  { key: 'paid_leave_days', label: 'مرخصی استحقاقی (روز)', group: 'کسورات' },
  { key: 'unpaid_leave_days', label: 'مرخصی بدون حقوق (روز)', group: 'کسورات' },
  { key: 'absence_days', label: 'غیبت (روز)', group: 'کسورات' },
  { key: 'other_earning', label: 'سایر دریافتی (ریال)', group: 'مالی' },
  { key: 'other_deduction', label: 'سایر کسورات (ریال)', group: 'مالی' },
];

const DEFAULT_FLAGS = FIELDS.reduce((acc, row) => {
  acc[row.key] = {
    add: !['paid_leave_days', 'unpaid_leave_days', 'absence_days', 'other_deduction'].includes(row.key),
    insurable: ['work_days', 'overtime_hours', 'friday_hours', 'night_hours', 'shift_hours', 'insurance_days'].includes(row.key),
    taxable: ['work_days', 'overtime_hours', 'friday_hours', 'night_hours', 'shift_hours'].includes(row.key),
  };
  return acc;
}, {});

const emptyWork = (employee = '') => ({
  employee, year: 1405, month: 8, work_days: 30, payable_days: 30, insurance_days: 30,
  overtime_hours: 0, friday_hours: 0, night_hours: 0, shift_hours: 0,
  mission_days: 0, paid_leave_days: 0, unpaid_leave_days: 0, absence_days: 0,
  other_earning: 0, other_deduction: 0, status: 'draft', note: '',
  items: DEFAULT_FLAGS,
});

const valueOf = (value) => (value == null || value === '' ? '' : String(value));

const PayrollWorkDataPage = ({ accent }) => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [year, setYear] = useState(1405);
  const [month, setMonth] = useState(8);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyWork);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState(null);

  const { data: options } = useQuery({
    queryKey: ['payroll-options'],
    queryFn: () => axiosInstance.get('/payroll/options/').then((r) => r.data),
  });
  const { data, isLoading } = useQuery({
    queryKey: ['payroll-work-data', year, month, selectedEmployee],
    queryFn: () => axiosInstance.get('/payroll-work-data/', { params: { year, month, employee: selectedEmployee } }).then((r) => r.data),
    enabled: Boolean(selectedEmployee),
  });
  const rows = Array.isArray(data) ? data : data?.results || [];
  const existing = rows[0];
  const employees = useMemo(() => {
    const term = search.trim();
    return (options?.employees || []).filter((row) => !term
      || [row.name, row.code, row.department, row.job_title].some((value) => String(value || '').includes(term)));
  }, [options, search]);

  useEffect(() => {
    if (!selectedEmployee) return;
    if (existing) {
      setEditing(existing.id);
      setForm({
        ...emptyWork(String(existing.employee)),
        ...existing,
        employee: String(existing.employee),
        period: existing.period || '',
        items: { ...DEFAULT_FLAGS, ...(existing.items || {}) },
      });
    } else {
      setEditing(null);
      setForm({ ...emptyWork(selectedEmployee), year, month });
    }
  }, [existing, selectedEmployee, year, month]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const setFlag = (key, field, value) => setForm((prev) => ({
    ...prev,
    items: {
      ...(prev.items || {}),
      [key]: { ...(DEFAULT_FLAGS[key] || {}), ...(prev.items?.[key] || {}), [field]: value },
    },
  }));

  const save = useMutation({
    mutationFn: () => {
      const payload = { ...form, year: Number(year), month: Number(month), employee: selectedEmployee };
      return editing
        ? axiosInstance.patch(`/payroll-work-data/${editing}/`, payload)
        : axiosInstance.post('/payroll-work-data/', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-work-data'] });
      setMessage({ ok: true, text: 'اطلاعات کارکرد ذخیره شد.' });
    },
    onError: (error) => setMessage({ ok: false, text: error.response?.data?.detail || error.response?.data?.non_field_errors?.[0] || 'ذخیرهٔ کارکرد ناموفق بود.' }),
  });

  const approve = useMutation({
    mutationFn: () => axiosInstance.post(`/payroll-work-data/${editing}/approve/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-work-data'] });
      setMessage({ ok: true, text: 'کارکرد تأیید شد و در محاسبهٔ دوره لحاظ می‌شود.' });
    },
    onError: (error) => setMessage({ ok: false, text: error.response?.data?.detail || 'تأیید کارکرد ناموفق بود.' }),
  });

  const downloadCsv = () => {
    const headers = ['کد پرسنلی', 'نام', 'سال', 'ماه', ...FIELDS.map((row) => row.label)];
    const csvRows = rows.map((row) => [
      row.employee_code, row.employee_name, row.year, MONTHS[Number(row.month) - 1],
      ...FIELDS.map((field) => row[field.key] || 0),
    ]);
    const csv = [headers, ...csvRows]
      .map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `payroll-work-${year}-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };


  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {message && <Alert severity={message.ok ? 'success' : 'error'} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <Paper elevation={0} sx={payrollCardSx({ p: 1.5 })}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={6} md={1.5}>
            <TextField select fullWidth size="small" label="سال" value={year} onChange={(event) => setYear(Number(event.target.value))}>
              <MenuItem value={1405}>۱۴۰۵</MenuItem>
              <MenuItem value={1404}>۱۴۰۴</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField select fullWidth size="small" label="ماه" value={month} onChange={(event) => setMonth(Number(event.target.value))}>
              {MONTHS.map((label, index) => <MenuItem key={label} value={index + 1}>{label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField select fullWidth size="small" label="کد پرسنلی / نام" value={selectedEmployee} onChange={(event) => setSelectedEmployee(event.target.value)}>
              <MenuItem value="">انتخاب پرسنل…</MenuItem>
              {employees.map((row) => <MenuItem key={row.id} value={String(row.id)}>{row.name} — {row.code}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField fullWidth size="small" label="جست‌وجو" value={search} onChange={(event) => setSearch(event.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6} md={2.5}>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Chip size="small" label={existing ? statusMeta(existing.status).label : 'ماه جدید'} />
              <Button size="small" startIcon={<DownloadIcon />} onClick={downloadCsv} disabled={!rows.length}>اکسل</Button>
              <PrintButton target="main" title="اطلاعات کارکرد ماهانه" orientation="landscape" />
              <Button size="small" onClick={() => navigate('/payroll/dashboard')}>خروج</Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={0} sx={payrollCardSx({ p: 1.5 })}>
        <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 1 }}>
          فاکتورهای کارکرد {selectedEmployee ? `— ${employees.find((row) => String(row.id) === String(selectedEmployee))?.name || ''}` : ''}
        </Typography>
        <Grid container spacing={1.5}>
          {FIELDS.map((field) => (
            <Grid item xs={12} sm={6} md={3} key={field.key}>
              <TextField
                fullWidth size="small" type="number" label={field.label}
                value={valueOf(form[field.key])}
                onChange={(event) => setField(field.key, event.target.value)}
                disabled={!selectedEmployee}
                inputProps={{ inputMode: 'numeric' }}
              />
            </Grid>
          ))}
          <Grid item xs={12} md={6}>
            <TextField fullWidth size="small" label="توضیح" value={form.note || ''} onChange={(event) => setField('note', event.target.value)} />
          </Grid>
        </Grid>
      </Paper>


      <Paper elevation={0} sx={payrollCardSx({ p: 1.5 })}>
        <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 1 }}>اقلام و تأثیر در محاسبه</Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <Box component="thead"><Box component="tr" sx={{ color: 'text.secondary' }}>
              {['شرح', 'مقدار', 'اضافه گردد', 'کسر گردد', 'بیمه پذیر', 'مالیات پذیر'].map((label) => (
                <Box component="th" key={label} sx={{ p: 0.7, textAlign: 'center', borderBottom: '1px solid var(--hrms-table-border-color, #e2e8f0)' }}>{label}</Box>
              ))}
            </Box></Box>
            <Box component="tbody">
              {FIELDS.map((field) => {
                const flags = { ...(DEFAULT_FLAGS[field.key] || {}), ...(form.items?.[field.key] || {}) };
                return (
                  <Box component="tr" key={field.key}>
                    <Box component="td" sx={{ p: 0.7, borderBottom: '1px solid var(--hrms-table-border-color, #e2e8f0)' }}>{field.label}</Box>
                    <Box component="td" sx={{ p: 0.7, textAlign: 'center', borderBottom: '1px solid var(--hrms-table-border-color, #e2e8f0)' }}>{valueOf(form[field.key]) || '۰'}</Box>
                    {['add', 'deduct', 'insurable', 'taxable'].map((key) => (
                      <Box component="td" key={key} sx={{ p: 0.7, textAlign: 'center', borderBottom: '1px solid var(--hrms-table-border-color, #e2e8f0)' }}>
                        <Checkbox
                          size="small"
                          checked={key === 'deduct' ? flags.add === false : Boolean(flags[key])}
                          onChange={(event) => {
                            if (key === 'deduct') setFlag(field.key, 'add', !event.target.checked);
                            else setFlag(field.key, key, event.target.checked);
                          }}
                        />
                      </Box>
                    ))}
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', mt: 2, flexWrap: 'wrap' }}>
          <Paper elevation={0} sx={payrollCardSx({ px: 2, py: 1, bgcolor: 'var(--hrms-table-header-bg, #f8fafc)' })}>
            <Typography sx={{ fontSize: 12, fontWeight: 800 }}>جمع کمک‌هزینه‌ها: {money(Number(form.other_earning || 0))} · جمع کسورات: {money(Number(form.other_deduction || 0))}</Typography>
          </Paper>
          <Button variant="contained" startIcon={<SaveIcon />} sx={{ bgcolor: accent }} disabled={!selectedEmployee || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'در حال ذخیره…' : 'ذخیره'}
          </Button>
          <Button variant="outlined" startIcon={<CheckCircleIcon />} disabled={!editing || approve.isPending || existing?.status === 'approved'} onClick={() => approve.mutate()}>
            تأیید کارکرد
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default PayrollWorkDataPage;

