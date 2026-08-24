import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Box, Grid, TextField, Button, FormControl, InputLabel, Select,
  MenuItem, Alert, CircularProgress, Typography, Paper, Avatar,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ClearIcon from '@mui/icons-material/Clear';
import BadgeIcon from '@mui/icons-material/Badge';
import PaidIcon from '@mui/icons-material/Paid';
import ShieldIcon from '@mui/icons-material/Shield';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import CalculateIcon from '@mui/icons-material/Calculate';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';

const MONTHS = [
  { value: '1', label: 'فروردین' }, { value: '2', label: 'اردیبهشت' },
  { value: '3', label: 'خرداد' }, { value: '4', label: 'تیر' },
  { value: '5', label: 'مرداد' }, { value: '6', label: 'شهریور' },
  { value: '7', label: 'مهر' }, { value: '8', label: 'آبان' },
  { value: '9', label: 'آذر' }, { value: '10', label: 'دی' },
  { value: '11', label: 'بهمن' }, { value: '12', label: 'اسفند' },
];

const EARNINGS = [
  { key: 'base_salary', label: 'حقوق پایه' },
  { key: 'overtime_pay', label: 'اضافه‌کاری' },
  { key: 'night_shift', label: 'شب‌کاری' },
  { key: 'shift_work', label: 'نوبت‌کاری' },
  { key: 'attraction_allowance', label: 'حق جذب' },
  { key: 'supervision_allowance', label: 'حق سرپرستی' },
  { key: 'workshop_mission', label: 'ماموریت کارگاهی' },
  { key: 'seniority_base', label: 'پایه سنوات' },
  { key: 'job_allowance', label: 'فوق‌العاده شغل' },
  { key: 'hardship_allowance', label: 'سختی کار' },
  { key: 'travel_cost', label: 'هزینه سفر' },
  { key: 'housing_allowance', label: 'حق مسکن' },
  { key: 'marriage_allowance', label: 'حق تأهل' },
  { key: 'children_allowance', label: 'حق اولاد' },
  { key: 'meal_voucher', label: 'بن کارکنان' },
  { key: 'deferred_salary_1', label: 'حقوق معوقه ۱' },
  { key: 'deferred_salary_2', label: 'حقوق معوقه ۲' },
  { key: 'bonus_reserve', label: 'عیدی و ذخیره' },
  { key: 'other_benefits', label: 'سایر مزایا' },
  { key: 'mission_allowance', label: 'حق مأموریت' },
];

const DEDUCTIONS = [
  { key: 'employee_insurance', label: 'حق بیمه سهم پرسنل' },
  { key: 'tax', label: 'مالیات' },
  { key: 'advance', label: 'مساعده' },
  { key: 'supplementary_insurance', label: 'بیمه تکمیلی' },
  { key: 'employee_loan', label: 'وام کارکنان' },
  { key: 'work_deduction', label: 'کسر کار' },
];

/* -------------------------------------------------------------------------
 * Glass section card with colored header
 * ------------------------------------------------------------------------- */
const SectionCard = ({ title, icon, color, children }) => (
  <Paper sx={{
    mb: 2,
    overflow: 'hidden',
    background: `linear-gradient(135deg, ${color}0d, ${color}05)`,
    border: `1px solid ${color}22`,
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    borderRadius: 3,
    transition: 'all 0.25s ease',
    '&:hover': { boxShadow: `0 8px 24px ${color}14` },
  }}>
    <Box sx={{
      px: 2.5, py: 1.5,
      borderBottom: `1px solid ${color}22`,
      background: `linear-gradient(135deg, ${color}14, ${color}08)`,
      display: 'flex', alignItems: 'center', gap: 1.5,
    }}>
      <Avatar sx={{ width: 32, height: 32, background: `linear-gradient(135deg, ${color}, ${color}90)`, boxShadow: `0 2px 8px ${color}40` }}>
        {icon}
      </Avatar>
      <Typography variant="subtitle1" fontWeight={700} sx={{ color }}>
        {title}
      </Typography>
    </Box>
    <Box sx={{ p: 2.5 }}>
      {children}
    </Box>
  </Paper>
);

const MoneyField = ({ meta, value, onChange }) => (
  <TextField
    fullWidth
    size="small"
    label={meta.label}
    type="number"
    value={value || ''}
    onChange={e => onChange(meta.key, e.target.value)}
    inputProps={{ style: { textAlign: 'right' } }}
    sx={{
      '& .MuiOutlinedInput-root': {
        background: 'rgba(255,255,255,0.6)',
        borderRadius: 2,
      },
    }}
  />
);

const SalaryForm = ({ onSuccess }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ year: 1404, month: '6' });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const { data: employees } = useQuery({
    queryKey: ['emp-dropdown'],
    queryFn: () => axiosInstance.get('/employees/', { params: { page_size: 500 } }).then(r => r.data.results || r.data),
  });

  const mutation = useMutation({
    mutationFn: (payload) => axiosInstance.post('/salaries/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
      queryClient.invalidateQueries({ queryKey: ['employee-salary-records'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      if (onSuccess) onSuccess();
    },
    onError: (e) => setError(e.response?.data?.error || 'خطا در ذخیره'),
  });

  const set = (key, value) => setForm(p => ({ ...p, [key]: value }));

  const totalBenefits = useMemo(() =>
    EARNINGS.reduce((sum, f) => sum + (Number(form[f.key]) || 0), 0),
  [form]);
  const totalDeductions = useMemo(() =>
    DEDUCTIONS.reduce((sum, f) => sum + (Number(form[f.key]) || 0), 0),
  [form]);
  const netPayable = totalBenefits - totalDeductions;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.employee) { setError('انتخاب پرسنل الزامی است'); return; }
    if (!form.year || !form.month) { setError('سال و ماه الزامی است'); return; }

    const payload = { ...form };
    EARNINGS.forEach(f => payload[f.key] = Number(form[f.key]) || 0);
    DEDUCTIONS.forEach(f => payload[f.key] = Number(form[f.key]) || 0);
    payload.work_days = Number(form.work_days) || 0;
    payload.overtime_hours = Number(form.overtime_hours) || 0;
    payload.mission_days = Number(form.mission_days) || 0;
    payload.insurance_subject = Number(form.insurance_subject) || 0;
    payload.employer_insurance = Number(form.employer_insurance) || 0;
    payload.total_benefits = totalBenefits;
    payload.total_deductions = totalDeductions;
    payload.net_payable = netPayable;
    mutation.mutate(payload);
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {saved && <Alert severity="success" sx={{ mb: 2 }}>✅ فیش حقوقی با موفقیت ثبت شد</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* 1. Basic Info */}
      <SectionCard title="اطلاعات پایه" icon={<BadgeIcon sx={{ fontSize: 18, color: '#fff' }} />} color="#f59e0b">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small" required>
              <InputLabel>پرسنل</InputLabel>
              <Select value={form.employee || ''} label="پرسنل" onChange={e => set('employee', e.target.value)}>
                {Array.isArray(employees) && employees.map(emp => (
                  <MenuItem key={emp.id} value={emp.id}>{emp.full_name} ({toPersianDigits(emp.employee_id)})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField fullWidth size="small" label="سال" type="number" value={form.year || ''}
              onChange={e => set('year', e.target.value)} required
              inputProps={{ style: { textAlign: 'right' } }} />
          </Grid>
          <Grid item xs={6} sm={4}>
            <FormControl fullWidth size="small" required>
              <InputLabel>ماه</InputLabel>
              <Select value={form.month || ''} label="ماه" onChange={e => set('month', e.target.value)}>
                {MONTHS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField fullWidth size="small" label="کارکرد (روز)" type="number" value={form.work_days || ''}
              onChange={e => set('work_days', e.target.value)} inputProps={{ style: { textAlign: 'right' } }} />
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField fullWidth size="small" label="ساعت اضافه‌کار" type="number" value={form.overtime_hours || ''}
              onChange={e => set('overtime_hours', e.target.value)} inputProps={{ style: { textAlign: 'right' } }} />
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField fullWidth size="small" label="روز مأموریت" type="number" value={form.mission_days || ''}
              onChange={e => set('mission_days', e.target.value)} inputProps={{ style: { textAlign: 'right' } }} />
          </Grid>
        </Grid>
      </SectionCard>

      {/* 2. Earnings */}
      <SectionCard title="حقوق و مزایا" icon={<PaidIcon sx={{ fontSize: 18, color: '#fff' }} />} color="#10b981">
        <Grid container spacing={2}>
          {EARNINGS.map(f => (
            <Grid item xs={6} sm={4} md={3} key={f.key}>
              <MoneyField meta={f} value={form[f.key]} onChange={set} />
            </Grid>
          ))}
        </Grid>
      </SectionCard>

      {/* 3. Insurance */}
      <SectionCard title="بیمه" icon={<ShieldIcon sx={{ fontSize: 18, color: '#fff' }} />} color="#6366f1">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <MoneyField meta={{ key: 'insurance_subject', label: 'مشمول بیمه' }} value={form.insurance_subject} onChange={set} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <MoneyField meta={{ key: 'employer_insurance', label: 'حق بیمه سهم کارفرما' }} value={form.employer_insurance} onChange={set} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <MoneyField meta={{ key: 'employee_insurance', label: 'حق بیمه سهم پرسنل' }} value={form.employee_insurance} onChange={set} />
          </Grid>
        </Grid>
      </SectionCard>

      {/* 4. Deductions */}
      <SectionCard title="کسورات" icon={<RemoveCircleIcon sx={{ fontSize: 18, color: '#fff' }} />} color="#ef4444">
        <Grid container spacing={2}>
          {DEDUCTIONS.map(f => (
            <Grid item xs={6} sm={4} md={3} key={f.key}>
              <MoneyField meta={f} value={form[f.key]} onChange={set} />
            </Grid>
          ))}
        </Grid>
      </SectionCard>

      {/* 5. Summary Totals */}
      <Paper sx={{
        p: 2.5,
        mb: 2,
        background: 'linear-gradient(135deg, #8b5cf60d, #8b5cf605)',
        border: '1px solid #8b5cf622',
        backdropFilter: 'blur(14px)',
        borderRadius: 3,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Avatar sx={{ width: 32, height: 32, background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>
            <CalculateIcon sx={{ fontSize: 18, color: '#fff' }} />
          </Avatar>
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#8b5cf6' }}>جمع‌بندی</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={6} md={4}>
            <Box sx={{ background: 'rgba(255,255,255,0.6)', borderRadius: 2, p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="textSecondary">جمع حقوق و مزایا</Typography>
              <Typography variant="h6" fontWeight={800} color="success.main">{formatPersianNumber(totalBenefits)}</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={4}>
            <Box sx={{ background: 'rgba(255,255,255,0.6)', borderRadius: 2, p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="textSecondary">جمع کسور</Typography>
              <Typography variant="h6" fontWeight={800} color="error.main">{formatPersianNumber(totalDeductions)}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 2, p: 2, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>قابل پرداخت</Typography>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#fff' }}>{formatPersianNumber(netPayable)}</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button variant="outlined" startIcon={<ClearIcon />} onClick={() => setForm({ year: 1404, month: '6' })}>
          پاک کردن
        </Button>
        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={mutation.isLoading}>
          {mutation.isLoading ? <CircularProgress size={20} /> : 'ذخیره فیش حقوقی'}
        </Button>
      </Box>
    </Box>
  );
};

export { MONTHS };
export default SalaryForm;