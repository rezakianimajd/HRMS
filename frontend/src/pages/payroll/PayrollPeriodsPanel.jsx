import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PaidIcon from '@mui/icons-material/Paid';
import LockIcon from '@mui/icons-material/Lock';
import RefreshIcon from '@mui/icons-material/Refresh';
import axiosInstance from '../../core/api/axiosConfig';
import DataTable from '../../core/components/ui/DataTable';
import { toJalali } from '../../core/utils/dateUtils';
import { toPersianDigits } from '../../core/utils/numberUtils';
import { dateLabel, money, number, payrollCardSx, statusMeta } from './payrollUi';

const currentJalali = () => {
  const date = new Date();
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const parts = toJalali(iso).split('/');
  return { year: Number(parts[0]) || 1405, month: Number(parts[1]) || 1 };
};

const emptyForm = () => {
  const now = currentJalali();
  return { year: now.year, month: now.month, period_type: 'monthly', title: '' };
};

const PayrollPeriodsPanel = ({ accent, onOpenResults }) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['payroll-periods'],
    queryFn: () => axiosInstance.get('/payroll-periods/', { params: { page_size: 100 } }).then((r) => r.data),
    staleTime: 20_000,
  });
  const rows = Array.isArray(data) ? data : data?.results || [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['payroll-periods'] });
    qc.invalidateQueries({ queryKey: ['payroll-dashboard'] });
    qc.invalidateQueries({ queryKey: ['payroll-options'] });
  };
  const onError = (errorObject) => setMessage({
    ok: false,
    text: errorObject.response?.data?.detail
      || errorObject.response?.data?.non_field_errors?.[0]
      || 'عملیات انجام نشد. مجوز و تنظیمات دوره را بررسی کنید.',
  });

  const createMutation = useMutation({
    mutationFn: (payload) => axiosInstance.post('/payroll-periods/', payload),
    onSuccess: (response) => {
      invalidate();
      setOpen(false);
      setForm(emptyForm());
      setMessage({ ok: true, text: `دورهٔ «${response.data?.label || 'جدید'}» ایجاد شد.` });
    },
    onError,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, payload }) => axiosInstance.post(`/payroll-periods/${id}/${action}/`, payload || {}),
    onSuccess: (response, variables) => {
      invalidate();
      setMessage({ ok: true, text: `عملیات «${variables.action}» انجام شد.` });
      if (response.data?.id && variables.action === 'calculate') onOpenResults(response.data.id);
    },
    onError,
    onSettled: () => setBusy(''),
  });

  const run = (row, action, payload) => {
    if (action === 'recalculate') {
      const reason = window.prompt('علت بازمحاسبهٔ دوره را وارد کنید:');
      if (!reason) return;
      payload = { reason };
    }
    setBusy(`${row.id}-${action}`);
    actionMutation.mutate({ id: row.id, action, payload });
  };

  const columns = useMemo(() => [
    {
      key: 'label', label: 'دوره', render: (row) => (
        <Box>
          <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>{row.title || row.label}</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{dateLabel(row.start_date)} تا {dateLabel(row.end_date)}</Typography>
        </Box>
      ),
    },
    { key: 'status', label: 'وضعیت', render: (row) => <Chip size="small" label={row.status_display || statusMeta(row.status).label} /> },
    { key: 'employee_count', label: 'نفرات', align: 'center', render: (row) => number(row.employee_count) },
    { key: 'gross_amount', label: 'ناخالص', render: (row) => money(row.gross_amount) },
    { key: 'net_amount', label: 'خالص', render: (row) => money(row.net_amount) },
    { key: 'total_cost', label: 'کل هزینه', render: (row) => money(row.total_cost) },
    {
      key: 'actions', label: 'عملیات', render: (row) => {
        const isBusy = (action) => busy === `${row.id}-${action}`;
        const button = (action, label, icon, color = 'inherit', payload) => (
          <Tooltip title={label} key={action}>
            <span>
              <IconButton size="small" color={color} disabled={Boolean(busy)} onClick={() => run(row, action, payload)}>
                {isBusy(action) ? <CircularProgress size={14} /> : icon}
              </IconButton>
            </span>
          </Tooltip>
        );
        return (
          <Stack direction="row" spacing={0.25} useFlexGap flexWrap="wrap">
            {['draft', 'open'].includes(row.status) && button('calculate', 'محاسبه حقوق', <PlayArrowIcon fontSize="small" />, 'primary')}
            {row.status === 'calculated' && button('review', 'ارسال برای بررسی', <VisibilityIcon fontSize="small" />)}
            {['calculated', 'under_review'].includes(row.status) && button('approve', 'تأیید دوره', <CheckCircleIcon fontSize="small" />, 'success')}
            {['calculated', 'under_review', 'approved'].includes(row.status) && button('recalculate', 'بازمحاسبه', <RefreshIcon fontSize="small" />, 'warning')}
            {row.status === 'approved' && button('post-accounting', 'ثبت سند حسابداری', <AccountBalanceIcon fontSize="small" />, 'secondary')}
            {row.status === 'approved' && button('payment-request', 'درخواست پرداخت خزانه', <PaidIcon fontSize="small" />, 'primary')}
            {row.status === 'payment_pending' && button('mark-paid', 'ثبت پرداخت', <PaidIcon fontSize="small" />, 'success')}
            {row.status === 'paid' && button('close', 'بستن دوره', <LockIcon fontSize="small" />)}
            <Tooltip title="مشاهدهٔ نتایج و فیش‌ها"><span><IconButton size="small" onClick={() => onOpenResults(row.id)}><ReceiptLongIcon fontSize="small" /></IconButton></span></Tooltip>
          </Stack>
        );
      },
    },
  ], [busy, onOpenResults]);


  return (
    <Box>
      <Paper elevation={0} sx={payrollCardSx({ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' })}>
        <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 800 }}>دوره‌های حقوق</Typography>
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => { setForm(emptyForm()); setOpen(true); }} sx={{ bgcolor: accent }}>
          دورهٔ جدید
        </Button>
      </Paper>
      {message && <Alert severity={message.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {error ? <Alert severity="error">دریافت دوره‌ها ناموفق بود.</Alert> : (
        <DataTable ariaLabel="فهرست دوره‌های حقوق" rows={rows} columns={columns} loading={isLoading} themed getRowId={(row) => row.id} emptyText="هنوز دورهٔ حقوقی ثبت نشده است." />
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>ایجاد دورهٔ حقوق</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField label="سال شمسی" type="number" size="small" value={form.year} onChange={(event) => setForm((prev) => ({ ...prev, year: event.target.value }))} inputProps={{ inputMode: 'numeric' }} />
            <TextField select label="ماه شمسی" size="small" value={form.month} onChange={(event) => setForm((prev) => ({ ...prev, month: event.target.value }))}>
              {['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'].map((label, index) => (
                <MenuItem key={label} value={index + 1}>{label}</MenuItem>
              ))}
            </TextField>
            <TextField select label="نوع دوره" size="small" value={form.period_type} onChange={(event) => setForm((prev) => ({ ...prev, period_type: event.target.value }))}>
              <MenuItem value="monthly">ماهانه</MenuItem>
              <MenuItem value="settlement">تسویه حساب</MenuItem>
              <MenuItem value="adjustment">اصلاحی</MenuItem>
              <MenuItem value="other">سایر</MenuItem>
            </TextField>
            <TextField label="عنوان (اختیاری)" size="small" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder={`حقوق ${toPersianDigits(form.year)}/${toPersianDigits(form.month)}`} />
            <Alert severity="info">تاریخ شروع و پایان ماه شمسی به‌صورت خودکار محاسبه می‌شود. قبل از محاسبه، نرخ بیمه و پله‌های مالیات را در تب «تنظیمات» ثبت کنید.</Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
          <Button variant="contained" sx={{ bgcolor: accent }} disabled={createMutation.isPending} onClick={() => createMutation.mutate(form)}>
            {createMutation.isPending ? 'در حال ایجاد…' : 'ایجاد دوره'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PayrollPeriodsPanel;

