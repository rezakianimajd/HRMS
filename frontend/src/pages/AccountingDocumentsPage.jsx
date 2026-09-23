import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Chip,
  IconButton, Tooltip, Alert, TextField, InputAdornment, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import UndoIcon from '@mui/icons-material/Undo';
import HistoryIcon from '@mui/icons-material/History';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import Timeline from '../core/components/ui/Timeline';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const COLOR = '#3b82f6';
const COLOR_DARK = '#2563eb';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.70), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(59,130,246,0.12)',
  borderRadius: '16px',
};

const STATUS_META = {
  draft: { label: 'پیش‌نویس', color: '#64748b' },
  submitted: { label: 'در انتظار تأیید', color: '#f59e0b' },
  approved: { label: 'تأییدشده', color: '#10b981' },
  posted: { label: 'ثبت‌شده', color: '#3b82f6' },
  locked: { label: 'قفل‌شده', color: '#6366f1' },
  reversed: { label: 'برگشت‌خورده', color: '#ef4444' },
};

const AccountingDocumentsPage = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [actionMsg, setActionMsg] = useState(null);
  const [timeline, setTimeline] = useState(null);

  // فیلترها
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [journal, setJournal] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['accounting-documents', q, status, dateFrom, dateTo, journal],
    queryFn: () => axiosInstance.get('/accounting/documents/', {
      params: { q, status: status || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined, journal: journal || undefined },
    }).then(r => r.data),
  });

  const { data: journals } = useQuery({ queryKey: ['doc-journals'], queryFn: () => axiosInstance.get('/accounting/journals/').then(r => r.data) });
  const journalList = Array.isArray(journals) ? journals : journals?.results || [];
  const list = Array.isArray(data) ? data : data?.results || [];

  const action = useMutation({
    mutationFn: ({ id, act }) => axiosInstance.post(`/accounting/documents/${id}/${act}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting-documents'] });
      setActionMsg({ ok: true, text: 'عملیات با موفقیت انجام شد' });
      setTimeout(() => setActionMsg(null), 2500);
    },
    onError: (e) => {
      setActionMsg({ ok: false, text: e.response?.data?.error || 'خطا در عملیات' });
      setTimeout(() => setActionMsg(null), 4000);
    },
  });

  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/accounting/documents/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounting-documents'] }),
  });

  const openTimeline = (row) => {
    axiosInstance.get(`/accounting/documents/${row.id}/`)
      .then(r => setTimeline(r.data)).catch(e => setActionMsg({ ok: false, text: e.response?.data?.error || 'خطا' }));
  };

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.3))`, border: `1px solid ${COLOR}30`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <DescriptionIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>اسناد حسابداری</Typography>
          <Typography variant="body2" color="textSecondary">ثبت، تأیید و ثبت نهایی اسناد با چرخهٔ دوطرفه</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/accounting/documents/new')}
          sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px', px: 3 }}>
          سند جدید
        </Button>
      </Paper>

      {actionMsg && <Alert severity={actionMsg.ok ? 'success' : 'error'} sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setActionMsg(null)}>{actionMsg.text}</Alert>}

      {/* فیلترها */}
      <Paper sx={{ ...glass, p: 1.5, mb: 2 }}>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <TextField size="small" placeholder="جستجوی شماره/شرح…" value={q} onChange={e => setQ(e.target.value)} sx={{ minWidth: 220, flex: 1 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>وضعیت</InputLabel>
            <Select value={status} label="وضعیت" onChange={e => setStatus(e.target.value)}>
              <MenuItem value="">همه</MenuItem>
              {Object.entries(STATUS_META).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>روزنامه</InputLabel>
            <Select value={journal} label="روزنامه" onChange={e => setJournal(e.target.value)}>
              <MenuItem value="">همه</MenuItem>
              {journalList.map(j => <MenuItem key={j.id} value={j.id}>{j.name}</MenuItem>)}
            </Select>
          </FormControl>
          <JalaliDatePicker noHelper label="از تاریخ" value={dateFrom} onChange={setDateFrom} sx={{ width: 140 }} />
          <JalaliDatePicker noHelper label="تا تاریخ" value={dateTo} onChange={setDateTo} sx={{ width: 140 }} />
          <Button size="small" variant="outlined" startIcon={<ClearIcon />} onClick={() => { setQ(''); setStatus(''); setDateFrom(''); setDateTo(''); setJournal(''); }}>پاک کردن</Button>
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />}
            onClick={() => window.open(`/api/accounting/documents/export/?q=${q}&status=${status}&date_from=${dateFrom}&date_to=${dateTo}&journal=${journal}`, '_blank')}>
            خروجی CSV
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ ...glass, p: 2 }}>
        {isLoading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>شماره</TableCell>
                  <TableCell>تاریخ</TableCell>
                  <TableCell>دفتر</TableCell>
                  <TableCell>شرح</TableCell>
                  <TableCell>بدهکار</TableCell>
                  <TableCell>بستانکار</TableCell>
                  <TableCell>وضعیت</TableCell>
                  <TableCell>عملیات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ color: 'text.secondary' }}>سندی ثبت نشده است</TableCell></TableRow>
                ) : list.map(row => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.number || `#${row.id}`}</TableCell>
                    <TableCell>{toJalali(row.date)}</TableCell>
                    <TableCell>{row.journal_name || '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.description}</TableCell>
                    <TableCell>{formatPersianNumber(row.total_debit)}</TableCell>
                    <TableCell>{formatPersianNumber(row.total_credit)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={STATUS_META[row.status]?.label || row.status}
                        sx={{ bgcolor: `${STATUS_META[row.status]?.color || '#64748b'}18`, color: STATUS_META[row.status]?.color || '#64748b', fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      {row.status === 'draft' && <Tooltip title="ویرایش"><IconButton size="small" color="primary" onClick={() => navigate(`/accounting/documents/${row.id}/edit`)}><EditIcon fontSize="small" /></IconButton></Tooltip>}
                      {row.status !== 'draft' && <Tooltip title="مشاهده / ویرایش"><IconButton size="small" onClick={() => navigate(`/accounting/documents/${row.id}/edit`)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>}
                      {row.status === 'draft' && <Tooltip title="ارسال"><IconButton size="small" color="primary" onClick={() => action.mutate({ id: row.id, act: 'submit' })}><SendIcon fontSize="small" /></IconButton></Tooltip>}
                      {row.status === 'submitted' && <Tooltip title="تأیید"><IconButton size="small" color="success" onClick={() => action.mutate({ id: row.id, act: 'approve' })}><CheckCircleIcon fontSize="small" /></IconButton></Tooltip>}
                      {(row.status === 'approved' || row.status === 'submitted') && <Tooltip title="ثبت نهایی"><IconButton size="small" color="info" onClick={() => action.mutate({ id: row.id, act: 'post_document' })}><LockIcon fontSize="small" /></IconButton></Tooltip>}
                      {(row.status === 'posted' || row.status === 'locked') && <Tooltip title="برگشت"><IconButton size="small" color="warning" onClick={() => action.mutate({ id: row.id, act: 'reverse' })}><UndoIcon fontSize="small" /></IconButton></Tooltip>}
                      {row.status === 'draft' && <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف؟')) del.mutate(row.id); }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
                      <Tooltip title="تایم‌لاین"><IconButton size="small" color="primary" onClick={() => openTimeline(row)}><HistoryIcon fontSize="small" /></IconButton></Tooltip>
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
        <DialogTitle sx={{ fontWeight: 800, color: COLOR_DARK }}>تایم‌لاین سند {timeline?.number || `#${timeline?.id}`}</DialogTitle>
        <DialogContent><Timeline events={timeline?.history} /></DialogContent>
      </Dialog>
    </Box>
  );
};

export default AccountingDocumentsPage;