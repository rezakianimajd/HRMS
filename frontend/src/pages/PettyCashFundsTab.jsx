import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Paper, Button, CircularProgress, Stack, Chip, TextField, MenuItem, Dialog,
  DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Tooltip, Alert, Grid, Typography, Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { formatPersianNumber } from '../core/utils/numberUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const COLOR = '#f59e0b';
const COLOR_DARK = '#d97706';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.34))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(245,158,11,0.12)', borderRadius: '16px',
};

const KINDS = [
  { value: 'imprest', label: 'ثابت (Imprest)' },
  { value: 'occasional', label: 'موردی' },
  { value: 'advance', label: 'علی‌الحساب' },
];

const STATUS_LABEL = { active: 'فعال', suspended: 'معلق', archived: 'بایگانی‌شده' };
const STATUS_COLOR = { active: 'success', suspended: 'warning', archived: 'default' };

const emptyFund = () => ({
  code: '', title: '', custodian: null, kind: 'imprest',
  opening_balance: '', fixed_amount: '', limit: '', settlement_days: 30,
  start_date: '', end_date: '',
});

const PettyCashFundsTab = () => {
  const qc = useQueryClient();
  const [msg, setMsg] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyFund);

  const { data: funds, isLoading } = useQuery({
    queryKey: ['pc-funds-list'],
    queryFn: () => axiosInstance.get('/petty-cash-funds/').then(r => r.data),
  });
  const { data: employees } = useQuery({
    queryKey: ['pc-employees-picker'],
    queryFn: () => axiosInstance.get('/employees/', { params: { page_size: 500 } }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const list = Array.isArray(funds) ? funds : funds?.results || [];
  const employeeList = Array.isArray(employees) ? employees : employees?.results || [];
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const onError = (e) => setMsg({ ok: false, text: e.response?.data?.error || 'خطا در انجام عملیات' });

  const save = useMutation({
    mutationFn: ({ id, payload }) => (
      id
        ? axiosInstance.patch(`/petty-cash-funds/${id}/`, payload)
        : axiosInstance.post('/petty-cash-funds/', payload)
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pc-funds-list'] });
      qc.invalidateQueries({ queryKey: ['pc-custodian-options'] });
      setOpen(false);
      setEditing(null);
      setForm(emptyFund());
      setMsg({ ok: true, text: 'تنخواه ذخیره شد' });
    },
    onError,
  });

  const openCreate = () => { setEditing(null); setForm(emptyFund()); setOpen(true); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      code: row.code || '',
      title: row.title || '',
      custodian: row.custodian || null,
      kind: row.kind || 'imprest',
      opening_balance: row.opening_balance ?? '',
      fixed_amount: row.fixed_amount ?? '',
      limit: row.limit ?? '',
      settlement_days: row.settlement_days ?? 30,
      start_date: row.start_date || '',
      end_date: row.end_date || '',
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.code || !form.title || !form.custodian) {
      setMsg({ ok: false, text: 'کد، عنوان و تنخواه‌دار الزامی است.' });
      return;
    }
    save.mutate({
      id: editing?.id,
      payload: {
        code: form.code,
        title: form.title,
        custodian: form.custodian,
        kind: form.kind,
        opening_balance: Number(form.opening_balance) || 0,
        fixed_amount: Number(form.fixed_amount) || 0,
        limit: form.limit === '' ? null : Number(form.limit),
        settlement_days: Number(form.settlement_days) || 30,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      },
    });
  };


  return (
    <Box>
      {msg && (
        <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setMsg(null)}>
          {msg.text}
        </Alert>
      )}

      <Paper sx={{ ...glass, p: 2, mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <AccountBalanceWalletIcon sx={{ color: COLOR_DARK }} />
          <Typography variant="subtitle1" fontWeight={800} sx={{ color: COLOR_DARK, flex: 1 }}>
            تعریف تنخواه‌ها
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
            sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px' }}>
            تنخواه جدید
          </Button>
        </Stack>
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
          نوع تنخواه، مبلغ ثابت، مهلت تسویه و بازهٔ اعتبار در همین تعاریف مشخص می‌شود؛
          سقف و مانده هر تنخواه در فهرست زیر قابل مشاهده است.
        </Typography>
      </Paper>

      <Paper sx={{ ...glass, p: 1.5 }}>
        {isLoading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>کد</TableCell><TableCell>عنوان</TableCell><TableCell>تنخواه‌دار</TableCell>
                  <TableCell>نوع</TableCell><TableCell>سقف</TableCell><TableCell>مانده</TableCell>
                  <TableCell>مهلت تسویه</TableCell><TableCell>اعتبار</TableCell>
                  <TableCell>وضعیت</TableCell><TableCell>عملیات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow><TableCell colSpan={10} align="center">تنخواهی تعریف نشده است</TableCell></TableRow>
                ) : list.map(row => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.code}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{row.title}</TableCell>
                    <TableCell>{row.custodian_name}</TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined"
                        label={(KINDS.find(k => k.value === row.kind) || {}).label || row.kind} />
                    </TableCell>
                    <TableCell>{formatPersianNumber(row.limit || 0)}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{formatPersianNumber(row.balance || 0)}</TableCell>
                    <TableCell>{formatPersianNumber(row.settlement_days || 0)} روز</TableCell>
                    <TableCell>
                      {row.start_date || row.end_date
                        ? `${row.start_date || '—'} ← ${row.end_date || '—'}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={STATUS_LABEL[row.status] || row.status}
                        color={STATUS_COLOR[row.status] || 'default'} sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="ویرایش">
                        <IconButton size="small" color="primary" onClick={() => openEdit(row)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>


      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800, color: COLOR_DARK }}>
          {editing ? 'ویرایش تنخواه' : 'تعریف تنخواه جدید'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={3}>
              <TextField fullWidth size="small" label="کد تنخواه" value={form.code}
                onChange={(e) => set('code', e.target.value)} disabled={!!editing} />
            </Grid>
            <Grid item xs={12} md={5}>
              <TextField fullWidth size="small" label="عنوان تنخواه" value={form.title}
                onChange={(e) => set('title', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select fullWidth size="small" label="نوع تنخواه" value={form.kind}
                onChange={(e) => set('kind', e.target.value)}>
                {KINDS.map(k => <MenuItem key={k.value} value={k.value}>{k.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={employeeList}
                value={employeeList.find(e => String(e.id) === String(form.custodian)) || null}
                getOptionLabel={(e) => `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.employee_id || `#${e.id}`}
                isOptionEqualToValue={(a, b) => String(a.id) === String(b.id)}
                onChange={(_, value) => set('custodian', value?.id || null)}
                renderInput={(params) => (
                  <TextField {...params} size="small" label="تنخواه‌دار" placeholder="جستجوی پرسنل…" />
                )}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth size="small" type="number" label="اعتبار اولیه (ریال)"
                value={form.opening_balance} onChange={(e) => set('opening_balance', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth size="small" type="number" label="مبلغ ثابت (ریال)"
                value={form.fixed_amount} onChange={(e) => set('fixed_amount', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth size="small" type="number" label="سقف (ریال)"
                value={form.limit} onChange={(e) => set('limit', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth size="small" type="number" label="مهلت تسویه (روز)"
                value={form.settlement_days} onChange={(e) => set('settlement_days', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <JalaliDatePicker label="شروع اعتبار" value={form.start_date} onChange={(v) => set('start_date', v)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <JalaliDatePicker label="پایان اعتبار" value={form.end_date} onChange={(v) => set('end_date', v)} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} color="inherit">انصراف</Button>
          <Button variant="contained" onClick={submit} disabled={save.isPending}
            sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px' }}>
            {save.isPending ? <CircularProgress size={20} /> : 'ذخیره'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PettyCashFundsTab;

