import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Tabs, Tab, Chip, IconButton,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentsIcon from '@mui/icons-material/Payments';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const glassPaper = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 32px rgba(99,102,241,0.08)', borderRadius: 10,
};

const ContractFinancePage = () => {
  const qc = useQueryClient();
  const [contractId, setContractId] = useState('');
  const [tab, setTab] = useState(0);

  const { data: contracts } = useQuery({ queryKey: ['ext-contracts-fin'], queryFn: () => axiosInstance.get('/external-contracts/').then(r => r.data) });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  const { data: contract } = useQuery({
    queryKey: ['ext-contract-fin', contractId],
    queryFn: () => axiosInstance.get(`/external-contracts/${contractId}/`).then(r => r.data),
    enabled: !!contractId,
  });

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(59,130,246,0.10), rgba(245,158,11,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(59,130,246,0.18)', borderRadius: 10 }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg,#3b82f6,#f59e0b)', boxShadow: '0 8px 24px rgba(59,130,246,0.4)' }}>
          <AccountBalanceWalletIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color="#1d4ed8">مالی قرارداد</Typography>
          <Typography variant="body2" color="textSecondary">فاکتور، صورت‌وضعیت، پرداخت و الحاقیه — کنترل مالی کامل هر قرارداد</Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel>قرارداد</InputLabel>
          <Select value={contractId || ''} label="قرارداد" onChange={e => setContractId(e.target.value)}>
            {contractList.map(c => <MenuItem key={c.id} value={c.id}>{c.subject || c.number}</MenuItem>)}
          </Select>
        </FormControl>
      </Paper>

      {!contractId ? (
        <Paper sx={{ ...glassPaper, p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">برای مشاهدهٔ مالی، یک قرارداد انتخاب کنید.</Typography>
        </Paper>
      ) : !contract ? (
        <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
      ) : (
        <>
          {/* Summary */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} md={3}>
              <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="textSecondary">مبلغ قرارداد</Typography>
                <Typography variant="h6" fontWeight={800} color="#f59e0b">{formatPersianNumber(contract.amount || 0)}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="textSecondary">جمع فاکتورها</Typography>
                <Typography variant="h6" fontWeight={800} color="#8b5cf6">
                  {formatPersianNumber((contract.invoices || []).reduce((s, x) => s + Number(x.total || 0), 0))}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="textSecondary">جمع پرداخت‌ها</Typography>
                <Typography variant="h6" fontWeight={800} color="#10b981">
                  {formatPersianNumber((contract.payments || []).reduce((s, x) => s + Number(x.amount || 0), 0))}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="textSecondary">صورت‌وضعیت‌ها</Typography>
                <Typography variant="h6" fontWeight={800} color="#6366f1">
                  {formatPersianNumber((contract.statements || []).reduce((s, x) => s + Number(x.amount || 0), 0))}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab icon={<ReceiptIcon />} label="فاکتورها" />
            <Tab icon={<ReceiptLongIcon />} label="صورت‌وضعیت" />
            <Tab icon={<PaymentsIcon />} label="پرداخت‌ها" />
            <Tab icon={<EditNoteIcon />} label="الحاقیه" />
          </Tabs>

          {tab === 0 && <InvoiceManager contractId={contractId} />}
          {tab === 1 && <StatementManager contractId={contractId} />}
          {tab === 2 && <PaymentManager contractId={contractId} />}
          {tab === 3 && <AddendumManager contractId={contractId} />}
        </>
      )}
    </Box>
  );
};

/* ---- shared list renderer ---- */
const ManagerShell = ({ title, color, icon, onAdd, children }) => (
  <Paper sx={{ ...glassPaper, p: 2 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
      <Typography variant="subtitle2" fontWeight={800} sx={{ color }}>{title}</Typography>
      <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={onAdd}>افزودن</Button>
    </Box>
    {children}
  </Paper>
);

const Row = ({ title, subtitle, onDelete, onEdit }) => (
  <Paper variant="outlined" sx={{ p: 1, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 1 }}>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="body2" fontWeight={700}>{title}</Typography>
      {subtitle && <Typography variant="caption" color="textSecondary">{subtitle}</Typography>}
    </Box>
    {onEdit && <IconButton size="small" onClick={onEdit}><EditNoteIcon fontSize="small" /></IconButton>}
    {onDelete && <IconButton size="small" color="error" onClick={onDelete}><DeleteIcon fontSize="small" /></IconButton>}
  </Paper>
);

/* ---- Invoice ---- */
const InvoiceManager = ({ contractId }) => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});
  const { data } = useQuery({ queryKey: ['invoices-fin', contractId], queryFn: () => axiosInstance.get('/contract-invoices/', { params: { contract: contractId } }).then(r => r.data) });
  const list = Array.isArray(data) ? data : data?.results || [];
  const save = useMutation({ mutationFn: (p) => p.id ? axiosInstance.patch(`/contract-invoices/${p.id}/`, p) : axiosInstance.post('/contract-invoices/', p), onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices-fin'] }); setDialog(false); setForm({}); } });
  const del = useMutation({ mutationFn: (id) => axiosInstance.delete(`/contract-invoices/${id}/`), onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices-fin'] }) });

  return (
    <ManagerShell title="فاکتورها" color="#8b5cf6" onAdd={() => { setForm({ contract: contractId }); setDialog(true); }}>
      <Stack spacing={0.75}>
        {list.map(x => <Row key={x.id} title={`${x.number || '—'} · ${formatPersianNumber(x.total)}`} subtitle={toJalali(x.date)}
          onEdit={() => { setForm({ ...x }); setDialog(true); }} onDelete={() => { if (window.confirm('حذف؟')) del.mutate(x.id); }} />)}
        {list.length === 0 && <Typography variant="caption" color="textSecondary" textAlign="center">فاکتوری نیست</Typography>}
      </Stack>
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>فاکتور</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField size="small" label="شماره" value={form.number || ''} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} />
          <JalaliDatePicker fullWidth label="تاریخ" value={form.date} onChange={(g) => setForm(p => ({ ...p, date: g }))} />
          <Grid container spacing={1.5}>
            <Grid item xs={4}><TextField size="small" label="مبلغ" type="number" value={form.amount ?? ''} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></Grid>
            <Grid item xs={4}><TextField size="small" label="مالیات" type="number" value={form.vat ?? ''} onChange={e => setForm(p => ({ ...p, vat: e.target.value }))} /></Grid>
            <Grid item xs={4}><TextField size="small" label="کل" type="number" value={form.total ?? ''} onChange={e => setForm(p => ({ ...p, total: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" onClick={() => save.mutate({ ...form, amount: Number(form.amount) || 0, vat: Number(form.vat) || 0, total: Number(form.total) || 0 })}
            sx={{ background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)' }}>ذخیره</Button>
        </DialogActions>
      </Dialog>
    </ManagerShell>
  );
};

/* ---- Statement ---- */
const StatementManager = ({ contractId }) => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});
  const { data } = useQuery({ queryKey: ['statements-fin', contractId], queryFn: () => axiosInstance.get('/contract-statements/', { params: { contract: contractId } }).then(r => r.data) });
  const list = Array.isArray(data) ? data : data?.results || [];
  const save = useMutation({ mutationFn: (p) => p.id ? axiosInstance.patch(`/contract-statements/${p.id}/`, p) : axiosInstance.post('/contract-statements/', p), onSuccess: () => { qc.invalidateQueries({ queryKey: ['statements-fin'] }); setDialog(false); setForm({}); } });
  const del = useMutation({ mutationFn: (id) => axiosInstance.delete(`/contract-statements/${id}/`), onSuccess: () => qc.invalidateQueries({ queryKey: ['statements-fin'] }) });

  return (
    <ManagerShell title="صورت‌وضعیت" color="#6366f1" onAdd={() => { setForm({ contract: contractId }); setDialog(true); }}>
      <Stack spacing={0.75}>
        {list.map(x => <Row key={x.id} title={`${x.number || '—'} · ${formatPersianNumber(x.amount)}`} subtitle={toJalali(x.date)}
          onEdit={() => { setForm({ ...x }); setDialog(true); }} onDelete={() => { if (window.confirm('حذف؟')) del.mutate(x.id); }} />)}
        {list.length === 0 && <Typography variant="caption" color="textSecondary" textAlign="center">صورت‌وضعیتی نیست</Typography>}
      </Stack>
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>صورت‌وضعیت</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField size="small" label="شماره" value={form.number || ''} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} />
          <JalaliDatePicker fullWidth label="تاریخ" value={form.date} onChange={(g) => setForm(p => ({ ...p, date: g }))} />
          <TextField size="small" label="مبلغ" type="number" value={form.amount ?? ''} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" onClick={() => save.mutate({ ...form, amount: Number(form.amount) || 0 })}
            sx={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>ذخیره</Button>
        </DialogActions>
      </Dialog>
    </ManagerShell>
  );
};

/* ---- Payment ---- */
const PaymentManager = ({ contractId }) => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});
  const { data } = useQuery({ queryKey: ['payments-fin', contractId], queryFn: () => axiosInstance.get('/contract-payments/', { params: { contract: contractId } }).then(r => r.data) });
  const list = Array.isArray(data) ? data : data?.results || [];
  const save = useMutation({ mutationFn: (p) => p.id ? axiosInstance.patch(`/contract-payments/${p.id}/`, p) : axiosInstance.post('/contract-payments/', p), onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments-fin'] }); setDialog(false); setForm({}); } });
  const del = useMutation({ mutationFn: (id) => axiosInstance.delete(`/contract-payments/${id}/`), onSuccess: () => qc.invalidateQueries({ queryKey: ['payments-fin'] }) });

  return (
    <ManagerShell title="پرداخت‌ها" color="#10b981" onAdd={() => { setForm({ contract: contractId }); setDialog(true); }}>
      <Stack spacing={0.75}>
        {list.map(x => <Row key={x.id} title={`${formatPersianNumber(x.amount)} · ${x.reference || ''}`} subtitle={toJalali(x.date)}
          onEdit={() => { setForm({ ...x }); setDialog(true); }} onDelete={() => { if (window.confirm('حذف؟')) del.mutate(x.id); }} />)}
        {list.length === 0 && <Typography variant="caption" color="textSecondary" textAlign="center">پرداختی نیست</Typography>}
      </Stack>
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>پرداخت</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <JalaliDatePicker fullWidth label="تاریخ" value={form.date} onChange={(g) => setForm(p => ({ ...p, date: g }))} />
          <TextField size="small" label="مبلغ" type="number" value={form.amount ?? ''} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
          <TextField size="small" label="مرجع" value={form.reference || ''} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} />
          <TextField size="small" label="روش" value={form.method || ''} onChange={e => setForm(p => ({ ...p, method: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" onClick={() => save.mutate({ ...form, amount: Number(form.amount) || 0 })}
            sx={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>ذخیره</Button>
        </DialogActions>
      </Dialog>
    </ManagerShell>
  );
};

/* ---- Addendum ---- */
const AddendumManager = ({ contractId }) => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});
  const { data } = useQuery({ queryKey: ['addendums-fin', contractId], queryFn: () => axiosInstance.get('/contract-addendums/', { params: { contract: contractId } }).then(r => r.data) });
  const list = Array.isArray(data) ? data : data?.results || [];
  const save = useMutation({ mutationFn: (p) => p.id ? axiosInstance.patch(`/contract-addendums/${p.id}/`, p) : axiosInstance.post('/contract-addendums/', p), onSuccess: () => { qc.invalidateQueries({ queryKey: ['addendums-fin'] }); setDialog(false); setForm({}); } });
  const del = useMutation({ mutationFn: (id) => axiosInstance.delete(`/contract-addendums/${id}/`), onSuccess: () => qc.invalidateQueries({ queryKey: ['addendums-fin'] }) });

  return (
    <ManagerShell title="الحاقیه‌ها" color="#ec4899" onAdd={() => { setForm({ contract: contractId }); setDialog(true); }}>
      <Stack spacing={0.75}>
        {list.map(x => <Row key={x.id} title={`${x.number || '—'}`} subtitle={x.change_description}
          onEdit={() => { setForm({ ...x }); setDialog(true); }} onDelete={() => { if (window.confirm('حذف؟')) del.mutate(x.id); }} />)}
        {list.length === 0 && <Typography variant="caption" color="textSecondary" textAlign="center">الحاقیه‌ای نیست</Typography>}
      </Stack>
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>الحاقیه</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField size="small" label="شماره" value={form.number || ''} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} />
          <JalaliDatePicker fullWidth label="تاریخ" value={form.date} onChange={(g) => setForm(p => ({ ...p, date: g }))} />
          <TextField size="small" label="شرح تغییرات" multiline rows={2} value={form.change_description || ''} onChange={e => setForm(p => ({ ...p, change_description: e.target.value }))} />
          <TextField size="small" label="تغییر مبلغ" type="number" value={form.amount_change ?? ''} onChange={e => setForm(p => ({ ...p, amount_change: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" onClick={() => save.mutate({ ...form, amount_change: Number(form.amount_change) || null })}
            sx={{ background: 'linear-gradient(135deg,#ec4899,#8b5cf6)' }}>ذخیره</Button>
        </DialogActions>
      </Dialog>
    </ManagerShell>
  );
};

export default ContractFinancePage;