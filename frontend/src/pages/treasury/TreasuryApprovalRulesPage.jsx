import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, FormControlLabel, Paper, Stack, Switch, TextField, Typography,
} from '@mui/material';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import axiosInstance from '../../core/api/axiosConfig';
import { formatPersianNumber } from '../../core/utils/numberUtils';
import { TreasuryListPage } from './treasuryListUi';
import { statusChip } from './treasuryListUi';
import { useTreasuryTheme } from './treasuryMasterUi';

const PERMISSIONS = ['treasury_approve', 'treasury_manage_config'];

const SettingsCard = () => {
  const moduleTheme = useTreasuryTheme();
  const qc = useQueryClient();
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const settingsQuery = useQuery({
    queryKey: ['treasury-settings'],
    queryFn: () => axiosInstance.get('/treasury/settings/').then((response) => response.data),
  });

  useEffect(() => {
    if (settingsQuery.data && !form) {
      setForm({
        enforce_segregation: Boolean(settingsQuery.data.enforce_segregation),
        require_approval: Boolean(settingsQuery.data.require_approval),
        duplicate_reference_days: settingsQuery.data.duplicate_reference_days ?? 30,
        default_payment_limit: settingsQuery.data.default_payment_limit || '',
      });
    }
  }, [settingsQuery.data, form]);

  const save = useMutation({
    mutationFn: (payload) => axiosInstance.put('/treasury/settings/', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treasury-settings'] });
      setMessage('تنظیمات ذخیره شد.');
      setError('');
    },
    onError: (err) => setError(
      err?.response?.data?.detail || err?.response?.data?.error || 'ذخیره نشد.',
    ),
  });

  if (!form) return null;

  return (
    <Paper elevation={0} sx={{
      p: 1.25,
      mb: 1.25,
      borderRadius: 'var(--hrms-info-card-radius, 14px)',
      border: '1px solid',
      borderColor: moduleTheme.cardBorderColor,
    }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 800, mb: 1 }}>
        کنترل‌های سازمانی پرداخت
      </Typography>
      {error ? <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert> : null}
      {message ? <Alert severity="success" sx={{ mb: 1 }}>{message}</Alert> : null}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap"
        alignItems={{ xs: 'stretch', md: 'center' }}>
        <FormControlLabel
          control={(
            <Switch
              size="small"
              checked={form.enforce_segregation}
              onChange={(event) => setForm({ ...form, enforce_segregation: event.target.checked })}
            />
          )}
          label={<Typography sx={{ fontSize: 11.5 }}>تفکیک وظایف الزامی</Typography>}
        />
        <FormControlLabel
          control={(
            <Switch
              size="small"
              checked={form.require_approval}
              onChange={(event) => setForm({ ...form, require_approval: event.target.checked })}
            />
          )}
          label={<Typography sx={{ fontSize: 11.5 }}>تأیید پرداخت الزامی</Typography>}
        />
        <TextField
          size="small"
          type="number"
          label="بازهٔ بررسی شمارهٔ تکراری (روز)"
          value={form.duplicate_reference_days}
          onChange={(event) => setForm({ ...form, duplicate_reference_days: event.target.value })}
          sx={{ width: 220 }}
        />
        <TextField
          size="small"
          type="number"
          label="سقف پیش‌فرض هر پرداخت"
          value={form.default_payment_limit}
          onChange={(event) => setForm({ ...form, default_payment_limit: event.target.value })}
          sx={{ width: 200 }}
        />
        <Box sx={{ flex: 1 }} />
        <Button
          size="small"
          variant="contained"
          disabled={save.isPending}
          onClick={() => save.mutate({
            ...form,
            duplicate_reference_days: Number(form.duplicate_reference_days) || 0,
            default_payment_limit: form.default_payment_limit === ''
              ? null : Number(form.default_payment_limit),
          })}
        >
          ذخیرهٔ تنظیمات
        </Button>
      </Stack>
    </Paper>
  );
};

const RULES_CONFIG = {
  title: 'سطوح تأیید پرداخت',
  subtitle: 'قواعد تأیید بر اساس بازهٔ مبلغ و مجوز لازم (treasury_approve / manage_config)',
  icon: <FactCheckOutlinedIcon />,
  endpoint: '/treasury/approval-rules/',
  queryKey: ['treasury-approval-rules'],
  searchPlaceholder: 'جست‌وجوی عنوان، مجوز یا یادداشت…',
  columns: [
    { key: 'name', label: 'عنوان قاعده', width: '26%' },
    {
      key: 'min_amount',
      label: 'از مبلغ',
      width: '16%',
      align: 'center',
      type: 'money',
    },
    {
      key: 'max_amount',
      label: 'تا مبلغ',
      width: '16%',
      align: 'center',
      render: (row) => (row.max_amount === null || row.max_amount === undefined
        ? 'بی‌سقف'
        : formatPersianNumber(row.max_amount)),
    },
    {
      key: 'required_permission',
      label: 'مجوز لازم',
      width: '20%',
      render: (row) => PERMISSIONS.includes(row.required_permission)
        ? (row.required_permission === 'treasury_approve' ? 'تأیید خزانه' : 'مدیریت تنظیمات')
        : row.required_permission,
    },
    { key: 'notes', label: 'یادداشت', width: '14%', render: (row) => row.notes || '—' },
    {
      key: 'is_active',
      label: 'وضعیت',
      width: '10%',
      align: 'center',
      render: (row) => statusChip(
        { status: row.is_active ? 'active' : 'cancelled', status_display: row.is_active ? 'فعال' : 'غیرفعال' },
      ),
    },
  ],
  quickCreate: {
    label: 'قاعدهٔ جدید',
    fields: [
      { name: 'name', label: 'عنوان قاعده', required: true },
      { name: 'min_amount', label: 'از مبلغ', type: 'number', required: true },
      { name: 'max_amount', label: 'تا مبلغ (خالی = بی‌سقف)', type: 'number' },
      {
        name: 'required_permission',
        label: 'مجوز لازم',
        type: 'select',
        options: [
          { value: 'treasury_approve', label: 'تأیید خزانه' },
          { value: 'treasury_manage_config', label: 'مدیریت تنظیمات' },
        ],
      },
      { name: 'notes', label: 'یادداشت' },
    ],
  },
  emptyText: 'قاعده‌ای تعریف نشده است؛ پیش‌فرض «تأیید خزانه» اعمال می‌شود.',
};

const TreasuryApprovalRulesPage = () => (
  <Box>
    <SettingsCard />
    <TreasuryListPage {...RULES_CONFIG} />
  </Box>
);

export default TreasuryApprovalRulesPage;

