import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, InputAdornment, IconButton, Tooltip, Alert,
} from '@mui/material';
import HandshakeIcon from '@mui/icons-material/Handshake';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';

const TYPE_LABELS = {
  construction: 'پیمانکاری / اجرا',
  purchase: 'خرید',
  tender: 'مناقصه',
  consulting: 'مشاوره',
  service: 'خدمات',
  other: 'سایر',
};

const STATUS_LABELS = {
  draft: 'پیش‌نویس',
  active: 'در حال اجرا',
  suspended: 'متوقف',
  completed: 'تکمیل شده',
  terminated: 'فسخ شده',
};

const STATUS_COLORS = {
  draft: '#64748b',
  active: '#10b981',
  suspended: '#f59e0b',
  completed: '#3b82f6',
  terminated: '#ef4444',
};

const TYPE_COLORS = {
  construction: '#f97316',
  purchase: '#10b981',
  tender: '#f59e0b',
  consulting: '#6366f1',
  service: '#0ea5e9',
  other: '#64748b',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.6)',
    '&:hover': { background: 'rgba(255,255,255,0.85)' },
    '&.Mui-focused': { background: '#fff', boxShadow: '0 0 0 4px rgba(245,158,11,0.12)' },
  },
};

const ExternalContractsPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [msg, setMsg] = useState('');

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['external-contracts'],
    queryFn: () => axiosInstance.get('/external-contracts/').then(r => r.data),
  });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  // نوع قرارداد از «نوع پیکربندی‌شده» خوانده می‌شود؛ اگر خالی بود، نوع ثابت.
  const typeLabel = (c) => c.contract_type_master_name || TYPE_LABELS[c.contract_type] || c.contract_type || '—';

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/external-contracts/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['external-contracts'] });
      setDeleteId(null);
      setMsg('قرارداد حذف شد.');
      setTimeout(() => setMsg(''), 2500);
    },
  });

  const filtered = contractList.filter(c =>
    (!search || (c.subject || '').includes(search) || (c.party_name || '').includes(search) || (c.number || '').includes(search)) &&
    (!statusFilter || c.status === statusFilter) &&
    (!typeFilter || c.contract_type === typeFilter)
  );

  const exportCsv = (rows) => {
    const header = ['شماره', 'موضوع', 'طرف', 'نوع', 'مبلغ', 'ارز', 'شروع', 'پایان', 'وضعیت'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = rows.map(c => [
      c.number, c.subject, c.party_name, typeLabel(c),
      c.amount, c.currency_name || 'ریال', toJalali(c.start_date), toJalali(c.end_date),
      STATUS_LABELS[c.status] || c.status,
    ].map(esc).join(','));
    const csv = '\uFEFF' + [header.map(esc).join(','), ...lines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contracts.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const counts = {
    total: contractList.length,
    active: contractList.filter(c => c.status === 'active').length,
    completed: contractList.filter(c => c.status === 'completed').length,
    suspended: contractList.filter(c => c.status === 'suspended').length,
    terminated: contractList.filter(c => c.status === 'terminated').length,
  };

  return (
    <Box>
      {/* Header */}
      <Paper sx={{
        p: 3, mb: 2.5, textAlign: 'center', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(249,115,22,0.06), rgba(255,255,255,0.4))',
        border: '1px solid rgba(245,158,11,0.18)', borderRadius: '18px',
      }}>
        <Box sx={{ position: 'absolute', top: -70, left: '50%', transform: 'translateX(-50%)', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.18), transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
        <Avatar sx={{ width: 60, height: 60, mx: 'auto', background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 10px 30px rgba(245,158,11,0.45)', position: 'relative', zIndex: 1 }}>
          <HandshakeIcon sx={{ color: '#fff', fontSize: 30 }} />
        </Avatar>
        <Typography variant="h5" fontWeight={900} color="#b45309" sx={{ mt: 1.25, position: 'relative', zIndex: 1 }}>قراردادهای من</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ position: 'relative', zIndex: 1 }}>
          مدیریت پیمانکاری، خرید و مناقصه با فاکتور، صورت‌وضعیت، الحاقیه، تضمین و پرداخت
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportCsv(filtered)}
            sx={{ borderRadius: '12px', px: 2.5, whiteSpace: 'nowrap' }}>
            خروجی CSV
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/contracts/new')}
            sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', borderRadius: '12px', px: 2.5, whiteSpace: 'nowrap', boxShadow: '0 8px 20px rgba(245,158,11,0.35)' }}>
            قرارداد جدید
          </Button>
        </Box>
      </Paper>

      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      {/* KPI cards */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {[
          { label: 'کل قراردادها', value: counts.total, color: '#f59e0b' },
          { label: 'در حال اجرا', value: counts.active, color: '#10b981' },
          { label: 'تکمیل شده', value: counts.completed, color: '#3b82f6' },
          { label: 'متوقف', value: counts.suspended, color: '#f59e0b' },
          { label: 'فسخ شده', value: counts.terminated, color: '#ef4444' },
        ].map(k => (
          <Grid item xs={6} sm={4} md={2.4} key={k.label}>
            <Paper sx={{
              p: 1.75, borderRadius: '16px', textAlign: 'center', position: 'relative', overflow: 'hidden',
              background: `linear-gradient(160deg, ${k.color}14, rgba(255,255,255,0.6))`,
              border: `1px solid ${k.color}22`,
              boxShadow: `0 4px 16px ${k.color}10`,
              '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 14px 30px ${k.color}22` },
              transition: 'all 0.2s ease',
            }}>
              <Typography variant="h5" fontWeight={900} sx={{ color: k.color, direction: 'ltr' }}>{formatPersianNumber(k.value)}</Typography>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>{k.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 1.5, mb: 2, borderRadius: '12px', background: 'rgba(255,255,255,0.6)' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField size="small" placeholder="جستجوی موضوع / طرف / شماره…" value={search} onChange={e => setSearch(e.target.value)}
            sx={{ flex: 1, ...fieldSx }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 170 } }}>
            <InputLabel>وضعیت</InputLabel>
            <Select value={statusFilter || ''} label="وضعیت" onChange={e => setStatusFilter(e.target.value)}>
              <MenuItem value="">همه</MenuItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 170 } }}>
            <InputLabel>نوع</InputLabel>
            <Select value={typeFilter || ''} label="نوع" onChange={e => setTypeFilter(e.target.value)}>
              <MenuItem value="">همه</MenuItem>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Contract list */}
      <Box>
        {isLoading ? (
          <Paper sx={{ py: 6, textAlign: 'center', borderRadius: '16px' }}><CircularProgress /></Paper>
        ) : filtered.length === 0 ? (
          <Paper sx={{ py: 7, textAlign: 'center', borderRadius: '16px', background: 'rgba(255,255,255,0.55)' }}>
            <HandshakeIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 1.5 }} />
            <Typography color="textSecondary">قراردادی ثبت نشده است.</Typography>
          </Paper>
        ) : (
          <Stack spacing={1.25}>
            {filtered.map(c => {
              const tColor = TYPE_COLORS[c.contract_type] || '#64748b';
              return (
                <Paper key={c.id} onClick={() => navigate(`/external-contracts/${c.id}`)}
                  sx={{
                    p: 2, borderRadius: '16px', cursor: 'pointer',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.85), rgba(255,255,255,0.55))',
                    border: '1px solid rgba(100,116,139,0.14)',
                    boxShadow: '0 2px 10px rgba(15,23,42,0.02)',
                    '&:hover': { borderColor: `${tColor}66`, boxShadow: `0 14px 34px rgba(15,23,42,0.09)`, transform: 'translateY(-2px)' },
                    transition: 'all 0.18s ease',
                  }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Avatar sx={{ width: 48, height: 48, background: `linear-gradient(135deg, ${tColor}, ${tColor}cc)`, boxShadow: `0 6px 16px ${tColor}33`, flexShrink: 0 }}>
                      <HandshakeIcon sx={{ color: '#fff' }} />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 220 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="caption" fontWeight={800} color="textSecondary" sx={{ whiteSpace: 'nowrap' }}>#{toPersianDigits(c.number || '—')}</Typography>
                        <Chip size="small" label={typeLabel(c)} sx={{ bgcolor: `${tColor}18`, color: tColor, fontWeight: 700, fontSize: 10, height: 20 }} />
                        <Chip size="small" label={STATUS_LABELS[c.status] || c.status} sx={{ bgcolor: `${STATUS_COLORS[c.status] || '#64748b'}18`, color: STATUS_COLORS[c.status] || '#64748b', fontWeight: 700, fontSize: 10, height: 20 }} />
                      </Box>
                      <Typography variant="body1" fontWeight={800} sx={{ mt: 0.5 }}>{c.subject}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {c.party_name || '—'} · {c.start_date ? toJalali(c.start_date) : '—'} تا {c.end_date ? toJalali(c.end_date) : '—'}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', flexShrink: 0 }}>
                      <Typography variant="h6" fontWeight={900} sx={{ color: '#b45309', direction: 'ltr' }}>{formatPersianNumber(c.amount || 0)}</Typography>
                      <Typography variant="caption" color="textSecondary">{c.currency_name || 'ریال'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <Tooltip title="مشاهده"><IconButton size="small" color="info" onClick={() => navigate(`/external-contracts/${c.id}`)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="ویرایش"><IconButton size="small" color="primary" onClick={() => navigate(`/contracts/${c.id}/edit`)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => setDeleteId(c.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </Box>
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#b91c1c', fontWeight: 800 }}>حذف قرارداد</DialogTitle>
        <DialogContent>
          <Typography variant="body2">آیا از حذف این قرارداد اطمینان دارید؟ اسناد، فاکتورها و پرداخت‌های مرتبط نیز حذف می‌شوند.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteId(null)}>انصراف</Button>
          <Button variant="contained" color="error" onClick={() => remove.mutate(deleteId)}>حذف</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExternalContractsPage;


