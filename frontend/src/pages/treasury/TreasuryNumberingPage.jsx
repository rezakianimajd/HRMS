import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, FormControlLabel, Paper, Stack, Switch,
  TextField, Typography,
} from '@mui/material';
import NumbersIcon from '@mui/icons-material/Numbers';
import SaveIcon from '@mui/icons-material/Save';
import axiosInstance from '../../core/api/axiosConfig';
import PageHeader from '../../core/components/ui/PageHeader';
import { useTreasuryTheme, chipSx } from './treasuryMasterUi';

const PREFIX_FIELDS = [
  ['receipt_prefix', 'فیش دریافت'],
  ['payment_prefix', 'فیش پرداخت'],
  ['transfer_prefix', 'انتقال وجه'],
  ['request_prefix', 'درخواست پرداخت'],
  ['order_prefix', 'دستور پرداخت'],
];

const DEFAULTS = {
  receipt_prefix: 'RC',
  payment_prefix: 'PY',
  transfer_prefix: 'TR',
  request_prefix: 'PR',
  order_prefix: 'PO',
  padding: 6,
  separator: '-',
  include_year: true,
  reset_yearly: true,
};

const TreasuryNumberingPage = () => {
  const moduleTheme = useTreasuryTheme();
  const qc = useQueryClient();
  const [form, setForm] = useState(DEFAULTS);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const settingQuery = useQuery({
    queryKey: ['treasury-numbering'],
    queryFn: () => axiosInstance.get('/treasury/numbering/').then((response) => response.data),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!settingQuery.data) return;
    const data = settingQuery.data;
    setForm({
      receipt_prefix: data.receipt_prefix ?? DEFAULTS.receipt_prefix,
      payment_prefix: data.payment_prefix ?? DEFAULTS.payment_prefix,
      transfer_prefix: data.transfer_prefix ?? DEFAULTS.transfer_prefix,
      request_prefix: data.request_prefix ?? DEFAULTS.request_prefix,
      order_prefix: data.order_prefix ?? DEFAULTS.order_prefix,
      padding: data.padding ?? DEFAULTS.padding,
      separator: data.separator ?? DEFAULTS.separator,
      include_year: Boolean(data.include_year),
      reset_yearly: Boolean(data.reset_yearly),
    });
  }, [settingQuery.data]);

  const save = useMutation({
    mutationFn: () => axiosInstance.put('/treasury/numbering/', form),
    onSuccess: (response) => {
      qc.setQueryData(['treasury-numbering'], response.data);
      setToast('تنظیمات شماره‌گذاری ذخیره شد.');
      setError('');
    },
    onError: () => setError('ذخیرهٔ تنظیمات انجام نشد.'),
  });

  const preview = settingQuery.data?.preview || {};
  const docKinds = settingQuery.data?.doc_kinds || [];

  if (settingQuery.isLoading) {
    return (
      <Box sx={{ py: 9, textAlign: 'center' }}>
        <CircularProgress size={22} sx={{ color: moduleTheme.accent }} />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        icon={<NumbersIcon />}
        title="شماره‌گذاری اسناد خزانه"
        subtitle="پیشوند، سال شمسی، تعداد رقم و جداکنندهٔ شمارهٔ فیش‌ها و دستورهای پرداخت"
        actions={(
          <Button size="small" variant="contained" startIcon={<SaveIcon sx={{ fontSize: 16 }} />}
            disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'در حال ذخیره…' : 'ذخیره'}
          </Button>
        )}
      />

      {error ? <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert> : null}
      {toast ? (
        <Alert severity="success" sx={{ mb: 1 }} onClose={() => setToast('')}>{toast}</Alert>
      ) : null}

      <Box sx={{
        display: 'grid',
        gap: 1.25,
        gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' },
      }}>
        <Paper elevation={0} sx={{
          p: 1.5,
          borderRadius: 'var(--hrms-table-radius, 16px)',
          border: '1px solid',
          borderColor: moduleTheme.cardBorderColor,
        }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 800, mb: 1 }}>
            تنظیمات شماره
          </Typography>
          <Stack spacing={1.1}>
            {PREFIX_FIELDS.map(([name, label]) => (
              <TextField
                key={name}
                size="small"
                label={`پیشوند ${label}`}
                value={form[name]}
                onChange={(event) => setForm((previous) => ({
                  ...previous, [name]: event.target.value,
                }))}
              />
            ))}
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                type="number"
                label="تعداد رقم"
                value={form.padding}
                onChange={(event) => setForm((previous) => ({
                  ...previous, padding: event.target.value,
                }))}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="جداکننده"
                value={form.separator}
                onChange={(event) => setForm((previous) => ({
                  ...previous, separator: event.target.value,
                }))}
                sx={{ width: 110 }}
              />
            </Stack>
            <FormControlLabel
              control={(
                <Switch
                  size="small"
                  checked={form.include_year}
                  onChange={(event) => setForm((previous) => ({
                    ...previous, include_year: event.target.checked,
                  }))}
                />
              )}
              label={<Typography sx={{ fontSize: 11.5 }}>درج سال شمسی در شماره</Typography>}
            />
            <FormControlLabel
              control={(
                <Switch
                  size="small"
                  checked={form.reset_yearly}
                  onChange={(event) => setForm((previous) => ({
                    ...previous, reset_yearly: event.target.checked,
                  }))}
                />
              )}
              label={<Typography sx={{ fontSize: 11.5 }}>شمارش سالانه از یک شروع شود</Typography>}
            />
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{
          p: 1.5,
          borderRadius: 'var(--hrms-table-radius, 16px)',
          border: '1px solid',
          borderColor: moduleTheme.cardBorderColor,
        }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 800, mb: 0.5 }}>
            پیش‌نمایش شمارهٔ بعدی
          </Typography>
          <Typography sx={{ fontSize: 10.5, opacity: 0.7, mb: 1 }}>
            شماره‌ها بر پایهٔ سال شمسی و بیشترین شمارهٔ موجود صادر می‌شوند و تکرار نمی‌شوند.
          </Typography>
          <Stack spacing={0.75}>
            {docKinds.map((item) => (
              <Stack key={item.key} direction="row" alignItems="center" spacing={1}>
                <Typography sx={{ fontSize: 11.5, flex: 1 }}>{item.label}</Typography>
                <Chip size="small" label={preview[item.key] || '—'}
                  sx={chipSx(moduleTheme.accent)} />
              </Stack>
            ))}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
};

export default TreasuryNumberingPage;

