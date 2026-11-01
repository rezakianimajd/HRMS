import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Paper, Button, CircularProgress, Stack, TextField, Alert, Grid, Typography,
  FormControlLabel, Switch, Chip,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SaveIcon from '@mui/icons-material/Save';
import PageHeader from '../core/components/ui/PageHeader';

const COLOR = '#64748b';
const COLOR_DARK = '#475569';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.34))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(100,116,139,0.12)', borderRadius: '16px',
};

const METHODS = [
  { value: 'cash', label: 'نقد' },
  { value: 'card', label: 'کارت' },
  { value: 'bank_transfer', label: 'انتقال بانکی' },
  { value: 'cheque', label: 'چک' },
  { value: 'other', label: 'سایر' },
];

const toggles = [
  { key: 'require_attachment', label: 'الزام پیوست برای هر سطر هزینه' },
  { key: 'require_invoice_number', label: 'الزام شمارهٔ فاکتور' },
  { key: 'enforce_segregation_of_duties', label: 'الزام تفکیک وظایف (ثبت‌کننده ≠ تأییدکننده)' },
  { key: 'allow_negative_balance', label: 'اجازهٔ ماندهٔ منفی تنخواه' },
];

const PettyCashSettingsPage = () => {
  const qc = useQueryClient();
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['pc-settings'],
    queryFn: () => axiosInstance.get('/petty-cash-settings/current/').then(r => r.data),
  });

  useEffect(() => {
    if (data) setForm({ ...data, payment_methods: data.payment_methods || [] });
  }, [data]);

  const save = useMutation({
    mutationFn: (payload) => axiosInstance.patch('/petty-cash-settings/current/', payload),
    onSuccess: (res) => {
      setForm({ ...res.data, payment_methods: res.data.payment_methods || [] });
      qc.invalidateQueries({ queryKey: ['pc-settings'] });
      setMsg({ ok: true, text: 'تنظیمات ذخیره شد' });
    },
    onError: (e) => setMsg({ ok: false, text: e.response?.data?.error || 'خطا در ذخیرهٔ تنظیمات' }),
  });

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const toggleMethod = (value) => {
    const current = form.payment_methods || [];
    set('payment_methods', current.includes(value)
      ? current.filter(x => x !== value)
      : [...current, value]);
  };

  const submit = () => {
    const payload = {
      number_prefix: form.number_prefix,
      default_settlement_days: Number(form.default_settlement_days) || 30,
      default_limit: form.default_limit === '' ? null : form.default_limit,
      max_single_payment: form.max_single_payment === '' ? null : form.max_single_payment,
      low_balance_alert_ratio: form.low_balance_alert_ratio,
      payment_methods: form.payment_methods || [],
    };
    toggles.forEach(t => { payload[t.key] = !!form[t.key]; });
    save.mutate(payload);
  };

  if (isLoading) return <Box textAlign="center" py={6}><CircularProgress /></Box>;


  return (
    <Box>
      <PageHeader icon={<SettingsIcon />} title="تنظیمات تنخواه" />

      {msg && (
        <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setMsg(null)}>
          {msg.text}
        </Alert>
      )}

      <Paper sx={{ ...glass, p: 2.5 }}>
        <Typography variant="subtitle1" fontWeight={800} sx={{ color: COLOR_DARK, mb: 2 }}>
          قوانین و محدودیت‌ها
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField fullWidth size="small" label="پیشوند شماره‌گذاری"
              value={form.number_prefix || ''} onChange={(e) => set('number_prefix', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth size="small" type="number" label="مهلت پیش‌فرض تسویه (روز)"
              value={form.default_settlement_days ?? ''} onChange={(e) => set('default_settlement_days', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth size="small" type="number" label="سقف پیش‌فرض تنخواه (ریال)"
              value={form.default_limit ?? ''} onChange={(e) => set('default_limit', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth size="small" type="number" label="سقف هر پرداخت (ریال)"
              value={form.max_single_payment ?? ''} onChange={(e) => set('max_single_payment', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth size="small" type="number" label="آستانهٔ هشدار ماندهٔ کم (درصد)"
              value={form.low_balance_alert_ratio ?? ''} onChange={(e) => set('low_balance_alert_ratio', e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>روش‌های پرداخت مجاز (خالی = همه)</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {METHODS.map(m => (
                <Chip key={m.value} label={m.label} clickable
                  color={(form.payment_methods || []).includes(m.value) ? 'primary' : 'default'}
                  onClick={() => toggleMethod(m.value)}
                  sx={{ fontWeight: 700 }} />
              ))}
            </Stack>
          </Grid>
          <Grid item xs={12}>
            <Grid container spacing={1}>
              {toggles.map(t => (
                <Grid item xs={12} md={6} key={t.key}>
                  <FormControlLabel
                    control={<Switch checked={!!form[t.key]} onChange={(e) => set(t.key, e.target.checked)} />}
                    label={<Typography variant="body2">{t.label}</Typography>}
                  />
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>

        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={submit} disabled={save.isPending}
            sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px', px: 3 }}>
            {save.isPending ? <CircularProgress size={20} /> : 'ذخیرهٔ تنظیمات'}
          </Button>
        </Stack>

        <Alert severity="info" sx={{ mt: 2, borderRadius: '12px' }}>
          این تنظیمات بر کنترل‌های سمت سرور (الزام پیوست، سقف پرداخت، تفکیک وظایف و ماندهٔ منفی) اثر می‌گذارد.
          برای جلوگیری از توقف گردش فعلی، «الزام پیوست» خاموش و «اجازهٔ ماندهٔ منفی» باز است.
        </Alert>
      </Paper>
    </Box>
  );
};

export default PettyCashSettingsPage;

