import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Stack, Chip,
  TextField, IconButton, Tooltip, Alert, Autocomplete, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/History';
import Timeline from '../core/components/ui/Timeline';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';

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
  submitted: { label: 'ارسال به حسابداری', color: '#f59e0b' },
  approved: { label: 'تأیید حسابداری', color: '#10b981' },
  posted: { label: 'ثبت نهایی', color: '#3b82f6' },
  rejected: { label: 'برگشت خورده', color: '#ef4444' },
  edited: { label: 'ویرایش‌شده', color: '#8b5cf6' },
};

const PettyCashExpensesPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [msg, setMsg] = React.useState(null);
  const [timeline, setTimeline] = React.useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['petty-expenses'], queryFn: () => axiosInstance.get('/petty-cash-expense-statements/').then(r => r.data) });
  const list = Array.isArray(data) ? data : data?.results || [];

  const submit = useMutation({
    mutationFn: (id) => axiosInstance.post(`/petty-cash-expense-statements/${id}/submit/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['petty-expenses'] }); setMsg({ ok: true, text: 'به کارتابل حسابداری ارسال شد' }); },
    onError: (e) => setMsg({ ok: false, text: e.response?.data?.error || 'خطا' }),
  });

  const filtered = list.filter(s => !search || `${s.number} ${s.fund_title} ${s.description}`.includes(search));

  const openTimeline = (s) => {
    axiosInstance.get(`/petty-cash-expense-statements/${s.id}/`)
      .then(r => setTimeline(r.data)).catch(e => setMsg({ ok: false, text: e.response?.data?.error || 'خطا' }));
  };

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}28`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <ReceiptLongIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>صورت هزینه‌های تنخواه</Typography>
          <Typography variant="body2" color="textSecondary">چرخهٔ ارسال به حسابداری، تأیید و ثبت نهایی</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/petty-cash/expenses/new')}
          sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px', px: 3 }}>
          صورت هزینه جدید
        </Button>
      </Paper>

      {msg && <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Paper sx={{ ...glass, p: 1.5, mb: 2 }}>
        <TextField placeholder="جستجو…" size="small" fullWidth value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
      </Paper>

      <Paper sx={{ ...glass, overflow: 'hidden' }}>
        {isLoading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : (
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>شماره</TableCell><TableCell>تاریخ</TableCell><TableCell>تنخواه</TableCell><TableCell>تنخواه‌دار</TableCell><TableCell>مبلغ</TableCell><TableCell>شرح</TableCell><TableCell>وضعیت</TableCell><TableCell>عملیات</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {filtered.length === 0 ? <TableRow><TableCell colSpan={8} align="center">موردی ثبت نشده است</TableCell></TableRow> :
                filtered.map(s => (
                  <TableRow key={s.id} hover>
                    <TableCell>{s.number || `#${s.id}`}</TableCell>
                    <TableCell>{toJalali(s.date)}</TableCell>
                    <TableCell>{s.fund_title}</TableCell>
                    <TableCell>{s.custodian_name}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{formatPersianNumber(s.total)}</TableCell>
                    <TableCell sx={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.description}</TableCell>
                    <TableCell><Chip size="small" label={STATUS[s.status]?.label || s.status} sx={{ bgcolor: `${STATUS[s.status]?.color || '#64748b'}18`, color: STATUS[s.status]?.color || '#64748b', fontWeight: 700 }} /></TableCell>
                    <TableCell>
                      {s.status === 'draft' && <Tooltip title="ارسال به حسابداری"><IconButton size="small" color="primary" onClick={() => submit.mutate(s.id)}><SendIcon fontSize="small" /></IconButton></Tooltip>}
                      <Tooltip title="تایم‌لاین"><IconButton size="small" color="info" onClick={() => openTimeline(s)}><HistoryIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={!!timeline} onClose={() => setTimeline(null)} fullWidth maxWidth="sm"
        slotProps={{ paper: { sx: { borderRadius: '20px', background: 'linear-gradient(150deg, #fff, #f8fafc)' } } }}>
        <DialogTitle sx={{ fontWeight: 800, color: COLOR_DARK }}>تایم‌لاین صورت {timeline?.number || `#${timeline?.id}`}</DialogTitle>
        <DialogContent><Timeline events={timeline?.history} /></DialogContent>
      </Dialog>
    </Box>
  );
};

export default PettyCashExpensesPage;