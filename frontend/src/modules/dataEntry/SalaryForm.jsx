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
  { value: '1', label: 'ظپط±ظˆط±ط¯غŒظ†' }, { value: '2', label: 'ط§ط±ط¯غŒط¨ظ‡ط´طھ' },
  { value: '3', label: 'ط®ط±ط¯ط§ط¯' }, { value: '4', label: 'طھغŒط±' },
  { value: '5', label: 'ظ…ط±ط¯ط§ط¯' }, { value: '6', label: 'ط´ظ‡ط±غŒظˆط±' },
  { value: '7', label: 'ظ…ظ‡ط±' }, { value: '8', label: 'ط¢ط¨ط§ظ†' },
  { value: '9', label: 'ط¢ط°ط±' }, { value: '10', label: 'ط¯غŒ' },
  { value: '11', label: 'ط¨ظ‡ظ…ظ†' }, { value: '12', label: 'ط§ط³ظپظ†ط¯' },
];

const EARNINGS = [
  { key: 'base_salary', label: 'ط­ظ‚ظˆظ‚ ظ¾ط§غŒظ‡' },
  { key: 'overtime_pay', label: 'ط§ط¶ط§ظپظ‡â€Œع©ط§ط±غŒ' },
  { key: 'night_shift', label: 'ط´ط¨â€Œع©ط§ط±غŒ' },
  { key: 'shift_work', label: 'ظ†ظˆط¨طھâ€Œع©ط§ط±غŒ' },
  { key: 'attraction_allowance', label: 'ط­ظ‚ ط¬ط°ط¨' },
  { key: 'supervision_allowance', label: 'ط­ظ‚ ط³ط±ظ¾ط±ط³طھغŒ' },
  { key: 'workshop_mission', label: 'ظ…ط§ظ…ظˆط±غŒطھ ع©ط§ط±ع¯ط§ظ‡غŒ' },
  { key: 'seniority_base', label: 'ظ¾ط§غŒظ‡ ط³ظ†ظˆط§طھ' },
  { key: 'job_allowance', label: 'ظپظˆظ‚â€Œط§ظ„ط¹ط§ط¯ظ‡ ط´ط؛ظ„' },
  { key: 'hardship_allowance', label: 'ط³ط®طھغŒ ع©ط§ط±' },
  { key: 'travel_cost', label: 'ظ‡ط²غŒظ†ظ‡ ط³ظپط±' },
  { key: 'housing_allowance', label: 'ط­ظ‚ ظ…ط³ع©ظ†' },
  { key: 'marriage_allowance', label: 'ط­ظ‚ طھط£ظ‡ظ„' },
  { key: 'children_allowance', label: 'ط­ظ‚ ط§ظˆظ„ط§ط¯' },
  { key: 'meal_voucher', label: 'ط¨ظ† ع©ط§ط±ع©ظ†ط§ظ†' },
  { key: 'deferred_salary_1', label: 'ط­ظ‚ظˆظ‚ ظ…ط¹ظˆظ‚ظ‡ غ±' },
  { key: 'deferred_salary_2', label: 'ط­ظ‚ظˆظ‚ ظ…ط¹ظˆظ‚ظ‡ غ²' },
  { key: 'bonus_reserve', label: 'ط¹غŒط¯غŒ ظˆ ط°ط®غŒط±ظ‡' },
  { key: 'other_benefits', label: 'ط³ط§غŒط± ظ…ط²ط§غŒط§' },
  { key: 'mission_allowance', label: 'ط­ظ‚ ظ…ط£ظ…ظˆط±غŒطھ' },
];

const DEDUCTIONS = [
  { key: 'employee_insurance', label: 'ط­ظ‚ ط¨غŒظ…ظ‡ ط³ظ‡ظ… ظ¾ط±ط³ظ†ظ„' },
  { key: 'tax', label: 'ظ…ط§ظ„غŒط§طھ' },
  { key: 'advance', label: 'ظ…ط³ط§ط¹ط¯ظ‡' },
  { key: 'supplementary_insurance', label: 'ط¨غŒظ…ظ‡ طھع©ظ…غŒظ„غŒ' },
  { key: 'employee_loan', label: 'ظˆط§ظ… ع©ط§ط±ع©ظ†ط§ظ†' },
  { key: 'work_deduction', label: 'ع©ط³ط± ع©ط§ط±' },
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
    borderRadius: '10px',
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
        borderRadius: '10px',
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
    onError: (e) => setError(e.response?.data?.error || 'ط®ط·ط§ ط¯ط± ط°ط®غŒط±ظ‡'),
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
    if (!form.employee) { setError('ط§ظ†طھط®ط§ط¨ ظ¾ط±ط³ظ†ظ„ ط§ظ„ط²ط§ظ…غŒ ط§ط³طھ'); return; }
    if (!form.year || !form.month) { setError('ط³ط§ظ„ ظˆ ظ…ط§ظ‡ ط§ظ„ط²ط§ظ…غŒ ط§ط³طھ'); return; }

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
      {saved && <Alert severity="success" sx={{ mb: 2 }}>âœ… ظپغŒط´ ط­ظ‚ظˆظ‚غŒ ط¨ط§ ظ…ظˆظپظ‚غŒطھ ط«ط¨طھ ط´ط¯</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* 1. Basic Info */}
      <SectionCard title="ط§ط·ظ„ط§ط¹ط§طھ ظ¾ط§غŒظ‡" icon={<BadgeIcon sx={{ fontSize: 18, color: '#fff' }} />} color="#f59e0b">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small" required>
              <InputLabel>ظ¾ط±ط³ظ†ظ„</InputLabel>
              <Select value={form.employee || ''} label="ظ¾ط±ط³ظ†ظ„" onChange={e => set('employee', e.target.value)}>
                {Array.isArray(employees) && employees.map(emp => (
                  <MenuItem key={emp.id} value={emp.id}>{emp.full_name} ({toPersianDigits(emp.employee_id)})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField fullWidth size="small" label="ط³ط§ظ„" type="number" value={form.year || ''}
              onChange={e => set('year', e.target.value)} required
              inputProps={{ style: { textAlign: 'right' } }} />
          </Grid>
          <Grid item xs={6} sm={4}>
            <FormControl fullWidth size="small" required>
              <InputLabel>ظ…ط§ظ‡</InputLabel>
              <Select value={form.month || ''} label="ظ…ط§ظ‡" onChange={e => set('month', e.target.value)}>
                {MONTHS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField fullWidth size="small" label="ع©ط§ط±ع©ط±ط¯ (ط±ظˆط²)" type="number" value={form.work_days || ''}
              onChange={e => set('work_days', e.target.value)} inputProps={{ style: { textAlign: 'right' } }} />
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField fullWidth size="small" label="ط³ط§ط¹طھ ط§ط¶ط§ظپظ‡â€Œع©ط§ط±" type="number" value={form.overtime_hours || ''}
              onChange={e => set('overtime_hours', e.target.value)} inputProps={{ style: { textAlign: 'right' } }} />
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField fullWidth size="small" label="ط±ظˆط² ظ…ط£ظ…ظˆط±غŒطھ" type="number" value={form.mission_days || ''}
              onChange={e => set('mission_days', e.target.value)} inputProps={{ style: { textAlign: 'right' } }} />
          </Grid>
        </Grid>
      </SectionCard>

      {/* 2. Earnings */}
      <SectionCard title="ط­ظ‚ظˆظ‚ ظˆ ظ…ط²ط§غŒط§" icon={<PaidIcon sx={{ fontSize: 18, color: '#fff' }} />} color="#10b981">
        <Grid container spacing={2}>
          {EARNINGS.map(f => (
            <Grid item xs={6} sm={4} md={3} key={f.key}>
              <MoneyField meta={f} value={form[f.key]} onChange={set} />
            </Grid>
          ))}
        </Grid>
      </SectionCard>

      {/* 3. Insurance */}
      <SectionCard title="ط¨غŒظ…ظ‡" icon={<ShieldIcon sx={{ fontSize: 18, color: '#fff' }} />} color="#6366f1">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <MoneyField meta={{ key: 'insurance_subject', label: 'ظ…ط´ظ…ظˆظ„ ط¨غŒظ…ظ‡' }} value={form.insurance_subject} onChange={set} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <MoneyField meta={{ key: 'employer_insurance', label: 'ط­ظ‚ ط¨غŒظ…ظ‡ ط³ظ‡ظ… ع©ط§ط±ظپط±ظ…ط§' }} value={form.employer_insurance} onChange={set} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <MoneyField meta={{ key: 'employee_insurance', label: 'ط­ظ‚ ط¨غŒظ…ظ‡ ط³ظ‡ظ… ظ¾ط±ط³ظ†ظ„' }} value={form.employee_insurance} onChange={set} />
          </Grid>
        </Grid>
      </SectionCard>

      {/* 4. Deductions */}
      <SectionCard title="ع©ط³ظˆط±ط§طھ" icon={<RemoveCircleIcon sx={{ fontSize: 18, color: '#fff' }} />} color="#ef4444">
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
        borderRadius: '10px',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Avatar sx={{ width: 32, height: 32, background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>
            <CalculateIcon sx={{ fontSize: 18, color: '#fff' }} />
          </Avatar>
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#8b5cf6' }}>ط¬ظ…ط¹â€Œط¨ظ†ط¯غŒ</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={6} md={4}>
            <Box sx={{ background: 'rgba(255,255,255,0.6)', borderRadius: '10px', p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="textSecondary">ط¬ظ…ط¹ ط­ظ‚ظˆظ‚ ظˆ ظ…ط²ط§غŒط§</Typography>
              <Typography variant="h6" fontWeight={800} color="success.main">{formatPersianNumber(totalBenefits)}</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={4}>
            <Box sx={{ background: 'rgba(255,255,255,0.6)', borderRadius: '10px', p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="textSecondary">ط¬ظ…ط¹ ع©ط³ظˆط±</Typography>
              <Typography variant="h6" fontWeight={800} color="error.main">{formatPersianNumber(totalDeductions)}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '10px', p: 2, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>ظ‚ط§ط¨ظ„ ظ¾ط±ط¯ط§ط®طھ</Typography>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#fff' }}>{formatPersianNumber(netPayable)}</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button variant="outlined" startIcon={<ClearIcon />} onClick={() => setForm({ year: 1404, month: '6' })}>
          ظ¾ط§ع© ع©ط±ط¯ظ†
        </Button>
        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={mutation.isLoading}>
          {mutation.isLoading ? <CircularProgress size={20} /> : 'ط°ط®غŒط±ظ‡ ظپغŒط´ ط­ظ‚ظˆظ‚غŒ'}
        </Button>
      </Box>
    </Box>
  );
};

export { MONTHS };
export default SalaryForm;