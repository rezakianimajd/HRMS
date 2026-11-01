import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Paper, Button, CircularProgress, Stack, Chip, TextField, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Tooltip, Alert, Grid, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import PageHeader from '../core/components/ui/PageHeader';

const COLOR = '#f59e0b';
const COLOR_DARK = '#d97706';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.34))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(245,158,11,0.12)', borderRadius: '16px',
};

const KINDS = [
  { value: 'fund', label: 'درخواست وجه تنخواه' },
  { value: 'recharge', label: 'درخواست شارژ مجدد' },
  { value: 'limit_increase', label: 'درخواست افزایش سقف' },
  { value: 'adhoc', label: 'تنخواه موردی' },
  { value: 'mission', label: 'تنخواه مأموریت' },
  { value: 'extend', label: 'تمدید مهلت تسویه' },
  { value: 'custodian_change', label: 'تغییر تنخواه‌دار' },
  { value: 'close', label: 'بستن / لغو تنخواه' },
];

const STATUS = {
  draft: { label: 'پیش‌نویس', color: '#64748b' },
  submitted: { label: 'در انتظار تأیید', color: '#f59e0b' },
  approved: { label: 'تأییدشده', color: '#0ea5e9' },
  rejected: { label: 'ردشده', color: '#ef4444' },
  cancelled: { label: 'لغوشده', color: '#94a3b8' },
  done: { label: 'اجراشده', color: '#10b981' },
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const emptyForm = () => ({ kind: 'fund', fund: '', amount: '', reason: '', needed_date: today() });

const PettyCashRequestsPage = () => {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [msg, setMsg] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['pc-requests', statusFilter],
    queryFn: () => axiosInstance.get('/petty-cash-requests/', {
      params: statusFilter ? { status: statusFilter } : {},
    }).then(r => r.data),
  });
  const { data: funds } = useQuery({
    queryKey: ['pc-funds-list'],
    queryFn: () => axiosInstance.get('/petty-cash-funds/').then(r => r.data),
  });
  const requestList = Array.isArray(requests) ? requests : requests?.results || [];
  const fundList = Array.isArray(funds) ? funds : funds?.results || [];

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const refresh = () => qc.invalidateQueries({ queryKey: ['pc-requests'] });
  const onError = (e) => setMsg({ ok: false, text: e.response?.data?.error || 'خطا در انجام عملیات' });

  const createRequest = useMutation({
    mutationFn: (payload) => axiosInstance.post('/petty-cash-requests/', payload),
    onSuccess: () => {
      refresh();
      setOpen(false);
      setForm(emptyForm());
      setMsg({ ok: true, text: 'درخواست به‌صورت پیش‌نویس ثبت شد' });
    },
    onError,
  });

  const act = useMutation({
    mutationFn: ({ id, action, body }) => axiosInstance.post(`/petty-cash-requests/${id}/${action}/`, body || {}),
    onSuccess: () => { refresh(); setMsg({ ok: true, text: 'عملیات انجام شد' }); },
    onError,
  });

  const submitForm = () => {
    createRequest.mutate({
      kind: form.kind,
      fund: form.fund || null,
      amount: Number(form.amount) || 0,
      reason: form.reason,
      needed_date: form.needed_date || null,
    });
  };

  return (
    <Box>
      <PageHeader
        icon={<RequestQuoteIcon />}
        title="درخواست‌های تنخواه"
        actions={(
          <Stack direction="row" spacing={1}>
            <TextField select size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 170 }}>
              <MenuItem value="">همه وضعیت‌ها</MenuItem>
              {Object.entries(STATUS).map(([value, meta]) => (
                <MenuItem key={value} value={value}>{meta.label}</MenuItem>
              ))}
            </TextField>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}
              sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px' }}>
              درخواست جدید
            </Button>
          </Stack>
        )}
      />

      {msg && (
        <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setMsg(null)}>
          {msg.text}
        </Alert>
      )}


      <Paper sx={{ ...glass, p: 1.5 }}>
        {isLoading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>شماره</TableCell><TableCell>نوع</TableCell><TableCell>تنخواه</TableCell>
                  <TableCell>مبلغ</TableCell><TableCell>تاریخ نیاز</TableCell>
                  <TableCell>وضعیت</TableCell><TableCell>عملیات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requestList.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center">درخواستی ثبت نشده است</TableCell></TableRow>
                ) : requestList.map(r => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.number || `#${r.id}`}</TableCell>
                    <TableCell>{r.kind_display}</TableCell>
                    <TableCell>{r.fund_title || '—'}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{formatPersianNumber(r.amount)}</TableCell>
                    <TableCell>{r.needed_date ? toJalali(r.needed_date) : '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={STATUS[r.status]?.label || r.status}
                        sx={{
                          bgcolor: `${STATUS[r.status]?.color || '#64748b'}18`,
                          color: STATUS[r.status]?.color || '#64748b', fontWeight: 700,
                        }} />
                    </TableCell>
                    <TableCell>
                      {r.status === 'draft' && (
                        <Tooltip title="ارسال برای تأیید">
                          <IconButton size="small" color="primary" onClick={() => act.mutate({ id: r.id, action: 'submit' })}>
                            <SendIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {r.status === 'submitted' && (
                        <>
                          <Tooltip title="تأیید">
                            <IconButton size="small" color="success" onClick={() => act.mutate({ id: r.id, action: 'approve' })}>
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="رد">
                            <IconButton size="small" color="error" onClick={() => {
                              const note = window.prompt('علت رد درخواست:');
                              if (note) act.mutate({ id: r.id, action: 'reject', body: { note } });
                            }}>
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {r.status === 'approved' && (
                        <Tooltip title="اجرای درخواست">
                          <IconButton size="small" color="warning" onClick={() => act.mutate({ id: r.id, action: 'execute' })}>
                            <PlayCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>


      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800, color: COLOR_DARK }}>درخواست جدید تنخواه</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField select fullWidth size="small" label="نوع درخواست" value={form.kind} onChange={(e) => set('kind', e.target.value)}>
                {KINDS.map(k => <MenuItem key={k.value} value={k.value}>{k.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField select fullWidth size="small" label="تنخواه" value={form.fund} onChange={(e) => set('fund', e.target.value)}>
                <MenuItem value="">—</MenuItem>
                {fundList.map(f => <MenuItem key={f.id} value={f.id}>{f.title}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" type="number" label="مبلغ (ریال)" value={form.amount} onChange={(e) => set('amount', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <JalaliDatePicker label="تاریخ موردنیاز" value={form.needed_date} onChange={(v) => set('needed_date', v)} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" multiline minRows={2} label="شرح و علت درخواست" value={form.reason} onChange={(e) => set('reason', e.target.value)} />
            </Grid>
          </Grid>
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1.5 }}>
            درخواست ابتدا به‌صورت پیش‌نویس ذخیره می‌شود؛ سپس از فهرست آن را ارسال و تأیید کنید.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} color="inherit">انصراف</Button>
          <Button variant="contained" onClick={submitForm} disabled={createRequest.isPending}
            sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px' }}>
            {createRequest.isPending ? <CircularProgress size={20} /> : 'ذخیرهٔ پیش‌نویس'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PettyCashRequestsPage;

