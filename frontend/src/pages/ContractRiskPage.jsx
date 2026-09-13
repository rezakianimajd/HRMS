import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Tabs, Tab, Chip, IconButton,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import GavelIcon from '@mui/icons-material/Gavel';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import AddIcon from '@mui/icons-material/Add';
import EditNoteIcon from '@mui/icons-material/EditNote';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const glassPaper = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 32px rgba(99,102,241,0.08)', borderRadius: '10px',
};

const DISPUTE_TYPES = {
  financial: 'مالی', technical: 'فنی', timeline: 'زمان‌بندی / تأخیر',
  quality: 'کیفیت', legal: 'حقوقی', other: 'سایر',
};

const DISPUTE_STATUS = {
  open: { label: 'باز', color: '#ef4444' },
  under_review: { label: 'در حال بررسی', color: '#f59e0b' },
  resolved: { label: 'حل‌شده', color: '#10b981' },
  escalated: { label: 'ارجاع بالاتر', color: '#8b5cf6' },
  closed: { label: 'بسته', color: '#64748b' },
};

const SEVERITY = {
  low: { label: 'کم', color: '#10b981' },
  medium: { label: 'متوسط', color: '#f59e0b' },
  high: { label: 'زیاد', color: '#f97316' },
  critical: { label: 'بحرانی', color: '#ef4444' },
};

const ContractRiskPage = () => {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(120deg, rgba(239,68,68,0.10), rgba(245,158,11,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(239,68,68,0.18)', borderRadius: '10px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg,#ef4444,#f59e0b)', boxShadow: '0 8px 24px rgba(239,68,68,0.4)' }}>
          <WarningIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#b91c1c">مدیریت ریسک قرارداد</Typography>
          <Typography variant="body2" color="textSecondary">قراردادهای رو به انقضا، هشدارها و اختلافات/دعاوی</Typography>
        </Box>
      </Paper>
      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab icon={<NotificationsActiveIcon />} label="رو به انقضا" />
        <Tab icon={<GavelIcon />} label="اختلافات و دعاوی" />
      </Tabs>
      {tab === 0 && <ExpiringContracts />}
      {tab === 1 && <DisputesManager />}
    </Box>
  );
};

const ExpiringContracts = () => {
  const { data, isLoading } = useQuery({ queryKey: ['ext-contracts-risk'], queryFn: () => axiosInstance.get('/external-contracts/').then(r => r.data) });
  const list = Array.isArray(data) ? data : data?.results || [];
  const buckets = useMemo(() => {
    const now = new Date();
    const days = (d) => Math.ceil((new Date(d) - now) / 86400000);
    const withEnd = list.filter(c => c.end_date);
    return {
      expired: withEnd.filter(c => days(c.end_date) < 0),
      soon30: withEnd.filter(c => days(c.end_date) >= 0 && days(c.end_date) <= 30),
      soon60: withEnd.filter(c => days(c.end_date) > 30 && days(c.end_date) <= 60),
      soon90: withEnd.filter(c => days(c.end_date) > 60 && days(c.end_date) <= 90),
    };
  }, [list]);
  if (isLoading) return <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>;
  const Section = ({ title, color, items }) => (
    <Paper sx={{ ...glassPaper, p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
        <Typography variant="subtitle2" fontWeight={800}>{title}</Typography>
        <Chip size="small" label={formatPersianNumber(items.length)} sx={{ bgcolor: `${color}22`, color }} />
      </Box>
      {items.length === 0 ? <Typography variant="caption" color="textSecondary">موردی نیست</Typography> : (
        <Stack spacing={0.75}>
          {items.map(c => {
            const d = Math.ceil((new Date(c.end_date) - new Date()) / 86400000);
            return (
              <Paper key={c.id} variant="outlined" sx={{ p: 1, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700}>{c.subject}</Typography>
                  <Typography variant="caption" color="textSecondary">{c.party_name}</Typography>
                </Box>
                <Typography variant="caption" color="textSecondary">پایان: {toJalali(c.end_date)}</Typography>
                <Chip size="small" label={d < 0 ? `${formatPersianNumber(Math.abs(d))} روز گذشته` : `${formatPersianNumber(d)} روز مانده`} sx={{ bgcolor: `${color}22`, color }} />
              </Paper>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
  return (
    <Box>
      <Section title="منقضی‌شده" color="#ef4444" items={buckets.expired} />
      <Section title="انقضا تا ۳۰ روز" color="#f97316" items={buckets.soon30} />
      <Section title="انقضا تا ۶۰ روز" color="#f59e0b" items={buckets.soon60} />
      <Section title="انقضا تا ۹۰ روز" color="#eab308" items={buckets.soon90} />
    </Box>
  );
};

const DisputesManager = () => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});
  const { data: contracts } = useQuery({ queryKey: ['ext-contracts-disp'], queryFn: () => axiosInstance.get('/external-contracts/').then(r => r.data) });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];
  const { data, isLoading } = useQuery({ queryKey: ['contract-disputes'], queryFn: () => axiosInstance.get('/contract-disputes/').then(r => r.data) });
  const list = Array.isArray(data) ? data : data?.results || [];
  const save = useMutation({ mutationFn: (p) => p.id ? axiosInstance.patch(`/contract-disputes/${p.id}/`, p) : axiosInstance.post('/contract-disputes/', p), onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-disputes'] }); setDialog(false); setForm({}); } });
  const del = useMutation({ mutationFn: (id) => axiosInstance.delete(`/contract-disputes/${id}/`), onSuccess: () => qc.invalidateQueries({ queryKey: ['contract-disputes'] }) });
  if (isLoading) return <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>;
  return (
    <Paper sx={{ ...glassPaper, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={800}>اختلافات و دعاوی</Typography>
        <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={() => { setForm({}); setDialog(true); }}>افزودن</Button>
      </Box>
      {list.length === 0 ? <Typography variant="caption" color="textSecondary" textAlign="center">اختلافی ثبت نشده است</Typography> : (
        <Grid container spacing={2}>
          {list.map(d => (
            <Grid item xs={12} md={6} key={d.id}>
              <Paper sx={{ ...glassPaper, p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <GavelIcon sx={{ color: SEVERITY[d.severity]?.color }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={800}>{d.title}</Typography>
                    <Typography variant="caption" color="textSecondary">{d.contract_subject}</Typography>
                  </Box>
                  <Chip size="small" label={DISPUTE_STATUS[d.status]?.label} sx={{ bgcolor: `${DISPUTE_STATUS[d.status]?.color}22`, color: DISPUTE_STATUS[d.status]?.color }} />
                  <Chip size="small" label={SEVERITY[d.severity]?.label} sx={{ bgcolor: `${SEVERITY[d.severity]?.color}22`, color: SEVERITY[d.severity]?.color }} />
                </Box>
                <Stack spacing={0.25}>
                  <Typography variant="caption" color="textSecondary">نوع: {DISPUTE_TYPES[d.dispute_type]} · تاریخ: {toJalali(d.opened_date)}</Typography>
                  {d.claim_amount ? <Typography variant="caption">مبلغ ادعا: {formatPersianNumber(d.claim_amount)} ریال</Typography> : null}
                </Stack>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                  <IconButton size="small" onClick={() => { setForm({ ...d }); setDialog(true); }}><EditNoteIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف؟')) del.mutate(d.id); }}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form.id ? 'ویرایش اختلاف' : 'اختلاف جدید'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <FormControl size="small" fullWidth><InputLabel>قرارداد *</InputLabel>
            <Select value={form.contract || ''} label="قرارداد *" onChange={e => setForm(p => ({ ...p, contract: e.target.value }))}>
              {contractList.map(c => <MenuItem key={c.id} value={c.id}>{c.subject || c.number}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="موضوع *" value={form.title || ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          <Grid container spacing={1.5}>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth><InputLabel>نوع</InputLabel>
                <Select value={form.dispute_type || 'other'} label="نوع" onChange={e => setForm(p => ({ ...p, dispute_type: e.target.value }))}>
                  {Object.entries(DISPUTE_TYPES).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth><InputLabel>شدت</InputLabel>
                <Select value={form.severity || 'medium'} label="شدت" onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}>
                  {Object.entries(SEVERITY).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth><InputLabel>وضعیت</InputLabel>
                <Select value={form.status || 'open'} label="وضعیت" onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {Object.entries(DISPUTE_STATUS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}><TextField size="small" label="مبلغ ادعا" type="number" value={form.claim_amount ?? ''} onChange={e => setForm(p => ({ ...p, claim_amount: e.target.value }))} /></Grid>
          </Grid>
          <JalaliDatePicker fullWidth label="تاریخ طرح" value={form.opened_date} onChange={(g) => setForm(p => ({ ...p, opened_date: g }))} />
          <TextField size="small" label="شرح" multiline rows={2} value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          <TextField size="small" label="اقدام / نتیجه" multiline rows={2} value={form.resolution || ''} onChange={e => setForm(p => ({ ...p, resolution: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" disabled={!form.title || !form.contract} onClick={() => save.mutate({ ...form, claim_amount: Number(form.claim_amount) || null })} sx={{ background: 'linear-gradient(135deg,#ef4444,#f59e0b)' }}>ذخیره</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ContractRiskPage;
