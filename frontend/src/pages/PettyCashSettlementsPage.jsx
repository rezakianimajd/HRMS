import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Paper, Button, CircularProgress, Stack, Chip, TextField, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Tooltip, Alert, Grid, Typography,
  Checkbox, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PaymentsIcon from '@mui/icons-material/Payments';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import PageHeader from '../core/components/ui/PageHeader';

const COLOR = '#10b981';
const COLOR_DARK = '#059669';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.34))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(16,185,129,0.12)', borderRadius: '16px',
};

const STATUS = {
  draft: { label: 'پیش‌نویس', color: '#64748b' },
  submitted: { label: 'در انتظار تأیید', color: '#f59e0b' },
  approved: { label: 'تأییدشده', color: '#0ea5e9' },
  posted: { label: 'ثبت نهایی', color: '#10b981' },
  rejected: { label: 'برگشت‌خورده', color: '#ef4444' },
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const emptyForm = () => ({ fund: '', date: today(), cash_counted: '', notes: '', statements: [] });

const PettyCashSettlementsPage = () => {
  const qc = useQueryClient();
  const [msg, setMsg] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  const { data: settlements, isLoading } = useQuery({
    queryKey: ['pc-settlements'],
    queryFn: () => axiosInstance.get('/petty-cash-settlements/').then(r => r.data),
  });
  const { data: funds } = useQuery({
    queryKey: ['pc-funds-list'],
    queryFn: () => axiosInstance.get('/petty-cash-funds/').then(r => r.data),
  });
  const settlementList = Array.isArray(settlements) ? settlements : settlements?.results || [];
  const fundList = Array.isArray(funds) ? funds : funds?.results || [];

  const { data: statements } = useQuery({
    queryKey: ['pc-unsettled-statements', form.fund],
    queryFn: () => axiosInstance.get('/petty-cash-expense-statements/', {
      params: { fund: form.fund, unsettled: '1' },
    }).then(r => r.data),
    enabled: !!form.fund,
  });
  const statementList = useMemo(
    () => (Array.isArray(statements) ? statements : statements?.results || []),
    [statements],
  );

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['pc-settlements'] });
    qc.invalidateQueries({ queryKey: ['pc-unsettled-statements'] });
  };
  const onError = (e) => setMsg({ ok: false, text: e.response?.data?.error || 'خطا در انجام عملیات' });

  const runPreview = async () => {
    if (!form.fund) { setMsg({ ok: false, text: 'ابتدا تنخواه را انتخاب کنید.' }); return; }
    setPreviewing(true);
    try {
      const { data } = await axiosInstance.post('/petty-cash-settlements/preview/', {
        fund: form.fund,
        statements: form.statements,
        cash_counted: Number(form.cash_counted) || 0,
      });
      setPreview(data);
    } catch (e) {
      onError(e);
    } finally {
      setPreviewing(false);
    }
  };

  const createSettlement = useMutation({
    mutationFn: (payload) => axiosInstance.post('/petty-cash-settlements/', payload),
    onSuccess: () => {
      refresh();
      setOpen(false);
      setPreview(null);
      setForm(emptyForm());
      setMsg({ ok: true, text: 'تسویه ایجاد شد (پیش‌نویس)' });
    },
    onError,
  });

  const act = useMutation({
    mutationFn: ({ id, action, body }) => axiosInstance.post(`/petty-cash-settlements/${id}/${action}/`, body || {}),
    onSuccess: () => { refresh(); setMsg({ ok: true, text: 'عملیات انجام شد' }); },
    onError,
  });

  const submitForm = () => {
    if (!form.fund) { setMsg({ ok: false, text: 'تنخواه را انتخاب کنید.' }); return; }
    createSettlement.mutate({
      fund: form.fund,
      date: form.date,
      cash_counted: Number(form.cash_counted) || 0,
      notes: form.notes,
      statements: form.statements,
    });
  };

  const toggleStatement = (id) => {
    setForm(prev => ({
      ...prev,
      statements: prev.statements.includes(id)
        ? prev.statements.filter(x => x !== id)
        : [...prev.statements, id],
    }));
  };

  const selectedTotal = useMemo(
    () => statementList
      .filter(s => form.statements.includes(s.id))
      .reduce((sum, s) => sum + Number(s.total || 0), 0),
    [statementList, form.statements],
  );


  return (
    <Box>
      <PageHeader
        icon={<FactCheckIcon />}
        title="تسویه‌های تنخواه"
        actions={(
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}
            sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px' }}>
            تسویه جدید
          </Button>
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
                  <TableCell>شماره</TableCell><TableCell>تاریخ</TableCell><TableCell>تنخواه</TableCell>
                  <TableCell>نقد شمارش‌شده</TableCell><TableCell>هزینهٔ تأییدشده</TableCell>
                  <TableCell>کسری</TableCell><TableCell>اضافه</TableCell><TableCell>شارژ مجدد</TableCell>
                  <TableCell>وضعیت</TableCell><TableCell>عملیات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {settlementList.length === 0 ? (
                  <TableRow><TableCell colSpan={10} align="center">تسویه‌ای ثبت نشده است</TableCell></TableRow>
                ) : settlementList.map(s => (
                  <TableRow key={s.id} hover>
                    <TableCell>{s.number || `#${s.id}`}</TableCell>
                    <TableCell>{toJalali(s.date)}</TableCell>
                    <TableCell>{s.fund_title}</TableCell>
                    <TableCell>{formatPersianNumber(s.cash_counted)}</TableCell>
                    <TableCell>{formatPersianNumber(s.expenses_total)}</TableCell>
                    <TableCell sx={{ color: Number(s.shortage) ? '#ef4444' : 'inherit' }}>{formatPersianNumber(s.shortage)}</TableCell>
                    <TableCell sx={{ color: Number(s.overage) ? '#f59e0b' : 'inherit' }}>{formatPersianNumber(s.overage)}</TableCell>
                    <TableCell>{formatPersianNumber(s.recharge_amount)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={STATUS[s.status]?.label || s.status}
                        sx={{
                          bgcolor: `${STATUS[s.status]?.color || '#64748b'}18`,
                          color: STATUS[s.status]?.color || '#64748b', fontWeight: 700,
                        }} />
                    </TableCell>
                    <TableCell>
                      {s.status === 'draft' && (
                        <Tooltip title="ارسال برای تأیید">
                          <IconButton size="small" color="primary" onClick={() => act.mutate({ id: s.id, action: 'submit' })}>
                            <SendIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {s.status === 'submitted' && (
                        <>
                          <Tooltip title="تأیید">
                            <IconButton size="small" color="success" onClick={() => act.mutate({ id: s.id, action: 'approve' })}>
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="برگشت">
                            <IconButton size="small" color="error" onClick={() => {
                              const note = window.prompt('علت برگشت تسویه:');
                              if (note) act.mutate({ id: s.id, action: 'reject', body: { note } });
                            }}>
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {s.status === 'approved' && (
                        <Tooltip title="ثبت نهایی (برگشت وجه و شارژ مجدد)">
                          <IconButton size="small" color="warning" onClick={() => act.mutate({ id: s.id, action: 'post' })}>
                            <PaymentsIcon fontSize="small" />
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


      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800, color: COLOR_DARK }}>تسویهٔ جدید تنخواه</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={4}>
              <TextField select fullWidth size="small" label="تنخواه" value={form.fund}
                onChange={(e) => { set('fund', e.target.value); set('statements', []); setPreview(null); }}>
                <MenuItem value="">—</MenuItem>
                {fundList.map(f => <MenuItem key={f.id} value={f.id}>{f.title}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <JalaliDatePicker label="تاریخ تسویه" value={form.date} onChange={(v) => set('date', v)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" type="number" label="وجه نقد شمارش‌شده (ریال)"
                value={form.cash_counted} onChange={(e) => set('cash_counted', e.target.value)} />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 0.5 }} />
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                صورت‌های هزینهٔ تسویه‌نشده {form.fund ? `(${statementList.length} مورد)` : ''}
              </Typography>
              <Box sx={{ maxHeight: 220, overflow: 'auto', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px' }}>
                {statementList.length === 0 ? (
                  <Typography variant="body2" color="textSecondary" sx={{ p: 2 }}>
                    صورت هزینهٔ تسویه‌نشده‌ای برای این تنخواه وجود ندارد.
                  </Typography>
                ) : statementList.map(s => (
                  <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <Checkbox size="small" checked={form.statements.includes(s.id)} onChange={() => toggleStatement(s.id)} />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {s.number || `#${s.id}`} · {toJalali(s.date)} · {s.status_display}
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>{formatPersianNumber(s.total)}</Typography>
                  </Box>
                ))}
              </Box>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
                <Typography variant="caption" color="textSecondary">
                  جمع انتخاب‌شده: {formatPersianNumber(selectedTotal)} ریال
                </Typography>
                <Button size="small" variant="outlined" onClick={runPreview} disabled={previewing}>
                  {previewing ? 'در حال محاسبه…' : 'محاسبهٔ پیش‌نمایش تسویه'}
                </Button>
              </Stack>
            </Grid>

            {preview && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: '14px', background: 'rgba(16,185,129,0.05)' }}>
                  <Grid container spacing={1.5}>
                    {[
                      ['ماندهٔ دفتری', preview.book_balance],
                      ['هزینهٔ تأییدشده', preview.expenses_total],
                      ['هزینهٔ ردشده', preview.rejected_total],
                      ['در انتظار بررسی', preview.pending_total],
                      ['برگشت وجه', preview.returned_amount],
                      ['کسری', preview.shortage],
                      ['اضافه‌پرداخت', preview.overage],
                      ['قابل شارژ مجدد', preview.recharge_amount],
                    ].map(([label, value]) => (
                      <Grid item xs={6} md={3} key={label}>
                        <Typography variant="caption" color="textSecondary">{label}</Typography>
                        <Typography variant="body2" fontWeight={800}>{formatPersianNumber(value)}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                    {preview.approved_count} صورت تأییدشده · {preview.pending_count} در انتظار · {preview.rejected_count} ردشده
                  </Typography>
                </Paper>
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField fullWidth size="small" multiline minRows={2} label="توضیحات / صورت‌جلسه شمارش وجه نقد"
                value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} color="inherit">انصراف</Button>
          <Button variant="contained" onClick={submitForm} disabled={createSettlement.isPending}
            sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px' }}>
            {createSettlement.isPending ? <CircularProgress size={20} /> : 'ایجاد تسویه'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PettyCashSettlementsPage;

