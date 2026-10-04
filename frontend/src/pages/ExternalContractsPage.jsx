import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, InputAdornment, IconButton, Tooltip, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import HandshakeIcon from '@mui/icons-material/Handshake';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BusinessIcon from '@mui/icons-material/Business';
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
        p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(245,158,11,0.10), rgba(249,115,22,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(245,158,11,0.16)', borderRadius: '12px',
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 24px rgba(245,158,11,0.4)' }}>
          <HandshakeIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h6" fontWeight={800} color="#b45309">قراردادهای برون‌سازمانی</Typography>
          <Typography variant="body2" color="textSecondary">پیمانکاری، خرید، مناقصه + فاکتور، صورت‌وضعیت، الحاقیه، تضمین و پرداخت</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/contracts/new')}
          sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', borderRadius: '10px', px: 2.5, whiteSpace: 'nowrap' }}>
          قرارداد جدید
        </Button>
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
            <Paper sx={{ p: 1.5, borderRadius: '12px', background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(100,116,139,0.14)', display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: `${k.color}18`, color: k.color }}><HandshakeIcon sx={{ fontSize: 18 }} /></Avatar>
              <Box>
                <Typography variant="caption" color="textSecondary" display="block" noWrap>{k.label}</Typography>
                <Typography variant="h6" fontWeight={800} color={k.color} noWrap>{formatPersianNumber(k.value)}</Typography>
              </Box>
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

      {/* Table */}
      <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
        {isLoading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <HandshakeIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
            <Typography color="textSecondary">قراردادی ثبت نشده است.</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(245,158,11,0.06)' }}>
                  <TableCell sx={{ fontWeight: 700 }}>شماره</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>موضوع قرارداد</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>طرف قرارداد</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>نوع</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>مبلغ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>تاریخ شروع</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>تاریخ پایان</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>وضعیت</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>عملیات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id} hover>
                    <TableCell>{c.number ? toPersianDigits(c.number) : '—'}</TableCell>
                    <TableCell><Typography variant="body2" fontWeight={700}>{c.subject}</Typography></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BusinessIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        <Typography variant="body2">{c.party_name || '—'}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={TYPE_LABELS[c.contract_type] || c.contract_type}
                        sx={{ bgcolor: 'rgba(245,158,11,0.1)', color: '#b45309', fontWeight: 700, fontSize: 11 }} />
                    </TableCell>
                    <TableCell>{c.amount ? `${formatPersianNumber(c.amount)} ${c.currency_name || 'ریال'}` : '—'}</TableCell>
                    <TableCell>{c.start_date ? toJalali(c.start_date) : '—'}</TableCell>
                    <TableCell>{c.end_date ? toJalali(c.end_date) : '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={STATUS_LABELS[c.status] || c.status}
                        sx={{ bgcolor: `${STATUS_COLORS[c.status] || '#64748b'}18`, color: STATUS_COLORS[c.status] || '#64748b', fontWeight: 700, fontSize: 11 }} />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="مشاهده">
                        <IconButton size="small" color="info" onClick={() => navigate(`/external-contracts/${c.id}`)}><VisibilityIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="ویرایش">
                        <IconButton size="small" color="primary" onClick={() => navigate(`/contracts/${c.id}/edit`)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton size="small" color="error" onClick={() => setDeleteId(c.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

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


