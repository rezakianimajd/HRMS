import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, InputAdornment, Alert, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, FormHelperText, Tooltip, IconButton,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import GavelIcon from '@mui/icons-material/Gavel';
import UndoIcon from '@mui/icons-material/Undo';
import BlockIcon from '@mui/icons-material/Block';
import UpdateIcon from '@mui/icons-material/Update';
import PaymentsIcon from '@mui/icons-material/Payments';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import ContractPicker from '../core/components/ui/ContractPicker';
import MoneyInput from '../core/components/ui/MoneyInput';
import PageHeader from '../core/components/ui/PageHeader';
import InfoCard from '../core/components/ui/InfoCard';
import { GUARANTEE_TYPES, GUARANTEE_TYPE_LABELS as TYPE_LABELS } from '../core/constants/guaranteeTypes';

const INSTRUMENT_LABELS = {
  check: 'چک',
  promissory: 'سفته',
  bank_guarantee: 'ضمانت‌نامه بانکی',
  check_and_guarantee: 'چک + ضمانت‌نامه',
  promissory_and_guarantee: 'سفته + ضمانت‌نامه',
};

const INSTRUMENT_COLORS = {
  check: '#f59e0b',
  promissory: '#8b5cf6',
  bank_guarantee: '#10b981',
  check_and_guarantee: '#3b82f6',
  promissory_and_guarantee: '#ec4899',
};

const ACTION_LABELS = {
  returned: 'استرداد',
  executed: 'اجرا / ضبط',
  canceled: 'ابطال',
  extended: 'تمدید',
};

const EMPTY = {
  id: null, contract: '', contract_guarantee_index: null, guarantee_type: 'performance', instrument_type: 'check',
  number: '', amount: '', issue_date: '', expiry_date: '', bank: '',
  check_number: '', check_bank: '', check_due_date: '',
  promissory_number: '', promissory_due_date: '',
  guarantee_number: '', guarantee_expiry_date: '', note: '',
};

const GuaranteesPage = () => {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const urlContract = searchParams.get('contract') || '';
  const [contractId, setContractId] = useState(urlContract);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [actionDialog, setActionDialog] = useState(null); // { id, action }
  const [newExpiry, setNewExpiry] = useState('');
  const [error, setError] = useState('');

  const { data: raw, isLoading } = useQuery({
    queryKey: ['contract-guarantees'],
    queryFn: () => axiosInstance.get('/contract-guarantees/').then(r => r.data),
  });
  const list = Array.isArray(raw) ? raw : raw?.results || [];

  const { data: contracts } = useQuery({
    queryKey: ['external-contracts-all'],
    queryFn: () => axiosInstance.get('/external-contracts/').then(r => r.data),
  });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];
  const selectedContract = contractList.find(c => String(c.id) === String(form.contract || contractId));
  const { data: contractDetail } = useQuery({
    queryKey: ['contract-detail-guarantee', form.contract],
    queryFn: () => axiosInstance.get(`/external-contracts/${form.contract}/`).then(r => r.data),
    enabled: dialog && Boolean(form.contract),
  });
  const contractGuaranteeItems = Array.isArray(contractDetail?.guarantee_items)
    ? contractDetail.guarantee_items
    : (Array.isArray(selectedContract?.guarantee_items) ? selectedContract.guarantee_items : []);

  const sanitizeGuarantee = (p) => ({
    ...p,
    contract: p.contract || null,
    contract_guarantee_index: p.contract_guarantee_index === '' || p.contract_guarantee_index == null
      ? null
      : Number(p.contract_guarantee_index),
    amount: p.amount === '' || p.amount == null ? 0 : Number(p.amount),
    issue_date: p.issue_date || null,
    expiry_date: p.expiry_date || null,
    check_due_date: p.check_due_date || null,
    promissory_due_date: p.promissory_due_date || null,
    guarantee_expiry_date: p.guarantee_expiry_date || null,
    release_date: p.release_date || null,
  });

  const save = useMutation({
    mutationFn: (payload) => {
      const clean = sanitizeGuarantee(payload);
      return clean.id
        ? axiosInstance.patch(`/contract-guarantees/${clean.id}/`, clean)
        : axiosInstance.post('/contract-guarantees/', clean);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-guarantees'] });
      qc.invalidateQueries({ queryKey: ['external-contracts'] });
      setDialog(false);
      setForm(EMPTY);
      setError('');
    },
    onError: (e) => {
      const data = e.response?.data;
      let msg = 'خطا در ذخیره';
      if (data) {
        if (typeof data === 'string') msg = data;
        else if (Array.isArray(data)) msg = data[0];
        else if (data.detail) msg = data.detail;
        else if (data.error) msg = data.error;
        else if (data.non_field_errors) msg = data.non_field_errors[0];
        else {
          const first = Object.values(data).flat()[0];
          if (first) msg = first;
        }
      }
      setError(msg);
    },
  });

  const applyLifecycle = useMutation({
    mutationFn: ({ id, action, new_expiry_date }) =>
      axiosInstance.post(`/contract-guarantees/${id}/lifecycle/`, { action, new_expiry_date }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-guarantees'] });
      qc.invalidateQueries({ queryKey: ['external-contracts'] });
      setActionDialog(null);
      setNewExpiry('');
    },
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-guarantees/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contract-guarantees'] }),
  });

  const statusOf = (g) => {
    if (g.last_action === 'returned') return { key: 'returned', label: 'استرداد شده', color: 'success' };
    if (g.last_action === 'executed') return { key: 'executed', label: 'اجرا / ضبط شده', color: 'error' };
    if (g.last_action === 'canceled') return { key: 'canceled', label: 'ابطال شده', color: 'warning' };
    const due = g.guarantee_expiry_date || g.check_due_date || g.promissory_due_date || g.expiry_date;
    if (due && new Date(due) < new Date()) return { key: 'expired', label: 'منقضی', color: 'error' };
    return { key: 'active', label: 'معتبر', color: 'primary' };
  };

  const guaranteeItemLabel = (item = {}, index = null) => {
    const type = TYPE_LABELS[item.type] || item.type || 'ضمانت';
    const amount = item.amount
      ? `${formatPersianNumber(item.amount)} ریال`
      : item.percent ? `${toPersianDigits(item.percent)}٪ از قرارداد` : '';
    const row = index != null ? `ردیف ${toPersianDigits(index + 1)}` : '';
    return [row, type, amount, item.note].filter(Boolean).join(' — ');
  };

  const contractItemsFor = (id) => {
    const contract = contractList.find(c => String(c.id) === String(id));
    return Array.isArray(contract?.guarantee_items) ? contract.guarantee_items : [];
  };

  const guaranteeLinkFor = (g) => {
    const index = g.contract_guarantee_index;
    if (index != null) {
      const item = contractItemsFor(g.contract)[index];
      if (item) return guaranteeItemLabel(item, index);
    }
    return g.contract_guarantee_label || '';
  };

  const applyGuaranteeLink = (value) => {
    if (value === '') {
      setForm(p => ({ ...p, contract_guarantee_index: null }));
      return;
    }
    const index = Number(value);
    const item = contractGuaranteeItems[index] || {};
    const contractAmount = Number(contractDetail?.amount || selectedContract?.amount || 0);
    const amount = item.amount
      || (item.percent && contractAmount ? Math.round((contractAmount * Number(item.percent)) / 100) : null);
    setForm(p => ({
      ...p,
      contract_guarantee_index: index,
      guarantee_type: item.type || p.guarantee_type,
      ...(amount ? { amount } : {}),
    }));
  };

  const filtered = useMemo(() => {
    let result = list;
    if (contractId) {
      result = result.filter(g => String(g.contract) === String(contractId));
    }
    if (statusFilter) {
      result = result.filter(g => statusOf(g).key === statusFilter);
    }
    if (typeFilter) {
      result = result.filter(g => g.instrument_type === typeFilter);
    }
    if (search) {
      const s = search.trim();
      result = result.filter(g =>
        (g.number || '').includes(s) || (g.bank || '').includes(s) ||
        (g.contract_subject || '').includes(s) || (g.check_number || '').includes(s) ||
        (g.contract_guarantee_label || '').includes(s));
    }
    return result;
  }, [list, search, contractId, statusFilter, typeFilter]);

  const scopedList = contractId
    ? list.filter(g => String(g.contract) === String(contractId))
    : list;
  const activeCount = scopedList.filter(g => statusOf(g).key === 'active').length;
  const expiringCount = scopedList.filter(g => {
    const due = g.guarantee_expiry_date || g.check_due_date || g.promissory_due_date || g.expiry_date;
    if (!due) return false;
    const days = Math.ceil((new Date(due) - new Date()) / 86400000);
    return days >= 0 && days <= 30;
  }).length;
  const totalAmount = scopedList.reduce((sum, g) => sum + Number(g.amount || 0), 0);

  const availableActions = (instrumentType) => {
    if (instrumentType === 'check' || instrumentType === 'promissory') {
      return ['returned', 'executed'];
    }
    if (instrumentType === 'bank_guarantee') {
      return ['canceled', 'extended', 'executed'];
    }
    // ترکیبی: همهٔ اقدامات
    return ['returned', 'executed', 'canceled', 'extended'];
  };

  const needsInstrument = (t) => t === 'check' || t === 'check_and_guarantee';
  const needsPromissory = (t) => t === 'promissory' || t === 'promissory_and_guarantee';
  const needsGuarantee = (t) => t === 'bank_guarantee' || t === 'check_and_guarantee' || t === 'promissory_and_guarantee';

  if (isLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
            <PageHeader
        icon={<LockIcon />}
        title="تضامین و ضمانت‌نامه‌ها"
        actions={(
          <Button variant="contained" startIcon={<AddIcon />} disabled={!contractId}
            onClick={() => { setForm({ ...EMPTY, contract: contractId || '' }); setError(''); setDialog(true); }}>
            تضمین جدید
          </Button>
        )}
      />

      {!contractId ? (
        <Paper sx={{ p: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={500}>انتخاب قرارداد</Typography>
              <Typography variant="caption" color="text.secondary">برای مشاهده و ثبت تضامین، ابتدا قرارداد را انتخاب کنید.</Typography>
            </Box>
            <Chip label={`${formatPersianNumber(contractList.length)} قرارداد`} color="primary" variant="outlined" />
          </Stack>
          <ContractPicker contracts={contractList} onSelect={(c) => setContractId(String(c.id))} height={520} />
        </Paper>
      ) : (
        <>
          <Paper sx={{ p: 1.5, mb: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} useFlexGap alignItems={{ lg: 'center' }}>
              <Button size="small" startIcon={<ArrowBackIcon />} variant="outlined" onClick={() => setContractId('')}>تغییر قرارداد</Button>
              <Box sx={{ flex: 1, minWidth: 180 }}>
                <Typography variant="body2" fontWeight={500} noWrap>
                  {contractList.find(c => String(c.id) === String(contractId))?.subject || 'قرارداد'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {toPersianDigits(scopedList.length)} تضمین ثبت‌شده
                </Typography>
              </Box>
              <TextField size="small" placeholder="جستجو: شماره، بانک، شماره چک، ضمانت قرارداد…" value={search}
                onChange={e => setSearch(e.target.value)} sx={{ minWidth: { xs: '100%', lg: 280 } }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
              <FormControl size="small" sx={{ minWidth: { xs: '100%', lg: 150 } }}>
                <InputLabel>وضعیت</InputLabel>
                <Select value={statusFilter} label="وضعیت" onChange={e => setStatusFilter(e.target.value)}>
                  <MenuItem value="">همه</MenuItem>
                  <MenuItem value="active">معتبر</MenuItem>
                  <MenuItem value="expired">منقضی</MenuItem>
                  <MenuItem value="returned">استرداد شده</MenuItem>
                  <MenuItem value="executed">اجرا / ضبط شده</MenuItem>
                  <MenuItem value="canceled">ابطال شده</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: { xs: '100%', lg: 160 } }}>
                <InputLabel>ابزار</InputLabel>
                <Select value={typeFilter} label="ابزار" onChange={e => setTypeFilter(e.target.value)}>
                  <MenuItem value="">همه</MenuItem>
                  {Object.entries(INSTRUMENT_LABELS).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
          </Paper>

          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <InfoCard icon={<LockIcon />} label="کل تضامین" value={scopedList.length} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <InfoCard icon={<CheckCircleIcon />} label="معتبر" value={activeCount} color="#059669" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <InfoCard icon={<EventBusyIcon />} label="در ۳۰ روز آینده" value={expiringCount} color="#f59e0b" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <InfoCard icon={<PaymentsIcon />} label="مجموع مبلغ" value={formatPersianNumber(totalAmount)} suffix="ریال" />
            </Grid>
          </Grid>

          <Paper sx={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 330px)' }}>
              <Table size="small" stickyHeader sx={{ '& td, & th': { px: 1.25, py: 0.9 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>نوع / ابزار</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>شماره / مرجع</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>مبلغ</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>ضمانت قرارداد</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>انقضا / سررسید</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>وضعیت</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>عملیات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        تضمینی با این مشخصات ثبت نشده است.
                      </TableCell>
                    </TableRow>
                  ) : filtered.map(g => {
                    const status = statusOf(g);
                    const actions = availableActions(g.instrument_type);
                    const due = g.guarantee_expiry_date || g.check_due_date || g.promissory_due_date || g.expiry_date;
                    const number = g.number || g.check_number || g.promissory_number || g.guarantee_number || '—';
                    const canAct = !['returned', 'executed', 'canceled'].includes(g.last_action);
                    return (
                      <TableRow key={g.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{INSTRUMENT_LABELS[g.instrument_type] || '—'}</Typography>
                          <Typography variant="caption" color="text.secondary">{TYPE_LABELS[g.guarantee_type] || '—'}</Typography>
                        </TableCell>
                        <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{number}</TableCell>
                        <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatPersianNumber(g.amount || 0)}</TableCell>
                        <TableCell sx={{ maxWidth: 240 }}>
                          <Typography variant="body2" noWrap title={guaranteeLinkFor(g)}>{guaranteeLinkFor(g) || '—'}</Typography>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{toJalali(due)}</TableCell>
                        <TableCell align="center">
                          <Chip size="small" color={status.color} variant="outlined" label={status.label} />
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.25} justifyContent="center">
                            {canAct && actions.map(action => {
                              const icon = action === 'returned' ? <UndoIcon fontSize="small" />
                                : action === 'executed' ? <GavelIcon fontSize="small" />
                                  : action === 'canceled' ? <BlockIcon fontSize="small" /> : <UpdateIcon fontSize="small" />;
                              const color = action === 'returned' ? 'success'
                                : action === 'executed' ? 'error'
                                  : action === 'canceled' ? 'warning' : 'primary';
                              return (
                                <Tooltip key={action} title={ACTION_LABELS[action]}>
                                  <IconButton size="small" color={color}
                                    onClick={() => setActionDialog({ id: g.id, action, instrument: g.instrument_type })}>
                                    {icon}
                                  </IconButton>
                                </Tooltip>
                              );
                            })}
                            <Tooltip title="ویرایش">
                              <IconButton size="small" onClick={() => { setForm({ ...g }); setError(''); setDialog(true); }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف">
                              <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف این تضمین؟')) remove.mutate(g.id); }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}

      {/* Add/Edit dialog with dynamic fields */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: '16px', boxShadow: 'none', background: '#ffffff' } }}>
        <DialogTitle sx={{
          display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 2,
          borderBottom: '1px solid', borderColor: 'divider',
        }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'action.hover', color: 'primary.main',
          }}>
            <LockIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={500}>{form.id ? 'ویرایش تضمین' : 'تضمین جدید'}</Typography>
            <Typography variant="caption" color="text.secondary">ثبت چک، سفته یا ضمانت‌نامه بانکی برای قرارداد</Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>قرارداد مرتبط *</InputLabel>
                <Select value={form.contract || ''} label="قرارداد مرتبط *"
                  onChange={e => setForm(p => ({ ...p, contract: e.target.value, contract_guarantee_index: null }))}>
                  {contractList.map(c => <MenuItem key={c.id} value={c.id}>{c.subject || c.number}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl size="small" fullWidth disabled={!contractGuaranteeItems.length}>
                <InputLabel>ضمانت قرارداد</InputLabel>
                <Select value={form.contract_guarantee_index ?? ''} label="ضمانت قرارداد"
                  onChange={e => applyGuaranteeLink(e.target.value)}>
                  <MenuItem value="">بدون اتصال به ضمانت قرارداد</MenuItem>
                  {contractGuaranteeItems.map((item, index) => (
                    <MenuItem key={index} value={index}>{guaranteeItemLabel(item, index)}</MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  {contractGuaranteeItems.length
                    ? 'ضمانت تعریف‌شده در قرارداد را انتخاب کنید تا این رکورد به آن متصل شود.'
                    : 'برای این قرارداد هنوز ضمانتی در مشخصات قرارداد تعریف نشده است.'}
                </FormHelperText>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>نوع تضمین</InputLabel>
                <Select value={form.guarantee_type} label="نوع تضمین" onChange={e => setForm(p => ({ ...p, guarantee_type: e.target.value }))}>
                  {GUARANTEE_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="textSecondary" sx={{ mb: 0.75, display: 'block' }}>نوع ابزار تضمین</Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {Object.entries(INSTRUMENT_LABELS).map(([k, v]) => {
                  const active = form.instrument_type === k;
                  const color = INSTRUMENT_COLORS[k] || '#64748b';
                  return (
                    <Chip
                      key={k}
                      label={v}
                      onClick={() => setForm(p => ({ ...p, instrument_type: k }))}
                      sx={{
                        cursor: 'pointer', borderRadius: '10px', fontWeight: 700,
                        bgcolor: active ? color : `${color}14`, color: active ? '#fff' : color,
                        border: `1px solid ${active ? color : `${color}44`}`,
                        '&:hover': { bgcolor: active ? color : `${color}26` },
                      }}
                    />
                  );
                })}
              </Box>
            </Grid>
          </Grid>

          <Box>
            <Typography variant="caption" fontWeight={700} color="#1d4ed8" sx={{ mb: 1, display: 'block' }}>اطلاعات پایه</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}><MoneyInput size="small" fullWidth label="مبلغ (ریال)" value={form.amount} onChange={(v) => setForm(p => ({ ...p, amount: v }))} /></Grid>
              <Grid item xs={12} md={4}><JalaliDatePicker fullWidth label="تاریخ صدور" value={form.issue_date} onChange={(g) => setForm(p => ({ ...p, issue_date: g }))} /></Grid>
              <Grid item xs={12} md={4}><TextField size="small" fullWidth label="بانک صادرکننده" value={form.bank} onChange={e => setForm(p => ({ ...p, bank: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField size="small" fullWidth label="شماره / مرجع" value={form.number} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><JalaliDatePicker fullWidth label="تاریخ انقضا / سررسید" value={form.expiry_date} onChange={(g) => setForm(p => ({ ...p, expiry_date: g }))} /></Grid>
            </Grid>
          </Box>

          {needsInstrument(form.instrument_type) && (
            <Box sx={{ p: 2, borderRadius: '16px', background: '#ffffff', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={500} sx={{ mb: 1, display: 'block' }}>اطلاعات چک</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}><TextField size="small" fullWidth label="شماره چک" value={form.check_number} onChange={e => setForm(p => ({ ...p, check_number: e.target.value }))} /></Grid>
                <Grid item xs={12} md={4}><TextField size="small" fullWidth label="بانک چک" value={form.check_bank} onChange={e => setForm(p => ({ ...p, check_bank: e.target.value }))} /></Grid>
                <Grid item xs={12} md={4}><JalaliDatePicker fullWidth label="تاریخ سررسید چک" value={form.check_due_date} onChange={(g) => setForm(p => ({ ...p, check_due_date: g }))} /></Grid>
              </Grid>
            </Box>
          )}

          {needsPromissory(form.instrument_type) && (
            <Box sx={{ p: 2, borderRadius: '16px', background: '#ffffff', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={500} sx={{ mb: 1, display: 'block' }}>اطلاعات سفته</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}><TextField size="small" fullWidth label="شماره سفته" value={form.promissory_number} onChange={e => setForm(p => ({ ...p, promissory_number: e.target.value }))} /></Grid>
                <Grid item xs={12} md={6}><JalaliDatePicker fullWidth label="تاریخ سررسید سفته" value={form.promissory_due_date} onChange={(g) => setForm(p => ({ ...p, promissory_due_date: g }))} /></Grid>
              </Grid>
            </Box>
          )}

          {needsGuarantee(form.instrument_type) && (
            <Box sx={{ p: 2, borderRadius: '16px', background: '#ffffff', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={500} sx={{ mb: 1, display: 'block' }}>اطلاعات ضمانت‌نامه</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}><TextField size="small" fullWidth label="شماره ضمانت‌نامه" value={form.guarantee_number} onChange={e => setForm(p => ({ ...p, guarantee_number: e.target.value }))} /></Grid>
                <Grid item xs={12} md={6}><JalaliDatePicker fullWidth label="تاریخ انقضای ضمانت‌نامه" value={form.guarantee_expiry_date} onChange={(g) => setForm(p => ({ ...p, guarantee_expiry_date: g }))} /></Grid>
              </Grid>
            </Box>
          )}

          <TextField size="small" label="یادداشت" multiline rows={2} value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />

          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" disabled={!form.contract || !form.guarantee_type}
            onClick={() => save.mutate(form)}>
            {save.isLoading ? <CircularProgress size={20} color="inherit" /> : 'ذخیره'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lifecycle action dialog */}
      <Dialog open={!!actionDialog} onClose={() => { setActionDialog(null); setNewExpiry(''); }} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '16px', boxShadow: 'none' } }}>
        <DialogTitle>{ACTION_LABELS[actionDialog?.action] || 'اقدام'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          {actionDialog?.action === 'extended' && (
            <JalaliDatePicker fullWidth label="تاریخ انقضای جدید" value={newExpiry} onChange={setNewExpiry} />
          )}
          <Typography variant="body2" color="textSecondary">
            این اقدام بر وضعیت تضمین ثبت خواهد شد.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setActionDialog(null); setNewExpiry(''); }}>انصراف</Button>
          <Button variant="contained"
            color={actionDialog?.action === 'executed' ? 'error' : actionDialog?.action === 'canceled' ? 'warning' : 'primary'}
            onClick={() => applyLifecycle.mutate({ id: actionDialog.id, action: actionDialog.action, new_expiry_date: newExpiry || null })}>
            تأیید
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GuaranteesPage;