import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, CircularProgress, Stack, TextField, InputAdornment,
  FormControl, InputLabel, Select, MenuItem, Button, Chip, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const COLOR = '#6366f1';
const COLOR_DARK = '#4f46e5';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.34))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(99,102,241,0.12)', borderRadius: '16px',
};

const STATUS_META = {
  draft: { label: 'پیش‌نویس', color: '#64748b' },
  submitted: { label: 'در انتظار تأیید', color: '#f59e0b' },
  approved: { label: 'تأییدشده', color: '#10b981' },
  posted: { label: 'ثبت‌شده', color: '#3b82f6' },
  locked: { label: 'قفل‌شده', color: '#6366f1' },
  reversed: { label: 'برگشت‌خورده', color: '#ef4444' },
};

const AccountingDocumentSearchPage = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [journal, setJournal] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [applied, setApplied] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['doc-search', applied],
    queryFn: () => axiosInstance.get('/accounting/documents/', {
      params: { q: applied.q, status: applied.status || undefined, date_from: applied.date_from || undefined, date_to: applied.date_to || undefined, journal: applied.journal || undefined, min_amount: applied.min_amount || undefined },
    }).then(r => r.data),
  });
  const { data: journals } = useQuery({ queryKey: ['search-journals'], queryFn: () => axiosInstance.get('/accounting/journals/').then(r => r.data) });
  const journalList = Array.isArray(journals) ? journals : journals?.results || [];
  const list = Array.isArray(data) ? data : data?.results || [];

  const doSearch = () => setApplied({ q, status, date_from: dateFrom, date_to: dateTo, journal, min_amount: minAmount });
  const clear = () => { setQ(''); setStatus(''); setDateFrom(''); setDateTo(''); setJournal(''); setMinAmount(''); setApplied({}); };

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.3))`, border: `1px solid ${COLOR}30`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <SearchIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>جستجو در اسناد</Typography>
          <Typography variant="body2" color="textSecondary">جستجوی پیشرفته با فیلترهای متنوع</Typography>
        </Box>
      </Paper>

      <Paper sx={{ ...glass, p: 2, mb: 2 }}>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap mb={1.5}>
          <TextField size="small" placeholder="جستجوی شماره/شرح…" value={q} onChange={e => setQ(e.target.value)} sx={{ minWidth: 240, flex: 1 }}
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
        </Stack>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <JalaliDatePicker noHelper label="از تاریخ" value={dateFrom} onChange={setDateFrom} sx={{ width: 150 }} />
          <JalaliDatePicker noHelper label="تا تاریخ" value={dateTo} onChange={setDateTo} sx={{ width: 150 }} />
          <TextField size="small" label="حداقل مبلغ" type="number" value={minAmount} onChange={e => setMinAmount(e.target.value)} sx={{ width: 140 }} />
          <Button variant="contained" startIcon={<SearchIcon />} onClick={doSearch}
            sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px' }}>جستجو</Button>
          <Button variant="outlined" startIcon={<ClearIcon />} onClick={clear}>پاک کردن</Button>
        </Stack>
      </Paper>

      <Paper sx={{ ...glass, p: 2 }}>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>{list.length} سند یافت شد</Typography>
        {isLoading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : (
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TableCell>شماره</TableCell><TableCell>تاریخ</TableCell><TableCell>روزنامه</TableCell><TableCell>شرح</TableCell><TableCell>بدهکار</TableCell><TableCell>بستانکار</TableCell><TableCell>وضعیت</TableCell><TableCell></TableCell></TableRow></TableHead>
              <TableBody>
                {list.length === 0 ? <TableRow><TableCell colSpan={8} align="center" sx={{ color: 'text.secondary' }}>سندی یافت نشد</TableCell></TableRow> :
                list.map(r => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.number || `#${r.id}`}</TableCell>
                    <TableCell>{toJalali(r.date)}</TableCell>
                    <TableCell>{r.journal_name || '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.description}</TableCell>
                    <TableCell>{formatPersianNumber(r.total_debit)}</TableCell>
                    <TableCell>{formatPersianNumber(r.total_credit)}</TableCell>
                    <TableCell><Chip size="small" label={STATUS_META[r.status]?.label || r.status} sx={{ bgcolor: `${STATUS_META[r.status]?.color || '#64748b'}18`, color: STATUS_META[r.status]?.color, fontWeight: 700 }} /></TableCell>
                    <TableCell>
                      <Tooltip title="مشاهده/ویرایش"><IconButton size="small" onClick={() => navigate(`/accounting/documents/${r.id}/edit`)}><OpenInNewIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default AccountingDocumentSearchPage;