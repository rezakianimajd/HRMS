import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, CircularProgress, Stack, Chip,
  TextField, InputAdornment, IconButton, Tooltip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert,
} from '@mui/material';
import BookOutlinedIcon from '@mui/icons-material/BookOutlined';
import SearchIcon from '@mui/icons-material/Search';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';

const COLOR = '#0ea5e9';
const COLOR_DARK = '#0284c7';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.34))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 14px 40px rgba(14,165,233,0.12)', borderRadius: '16px',
};

const PettyCashLedgerPage = () => {
  const [search, setSearch] = useState('');
  const [fundId, setFundId] = useState('');

  const { data: funds } = useQuery({ queryKey: ['ledger-funds'], queryFn: () => axiosInstance.get('/petty-cash-funds/').then(r => r.data) });
  const fundList = Array.isArray(funds) ? funds : funds?.results || [];

  const { data: ledger, isLoading } = useQuery({
    queryKey: ['ledger', fundId],
    queryFn: () => axiosInstance.get(`/petty-cash-funds/${fundId}/ledger/`).then(r => r.data),
    enabled: !!fundId,
  });

  const txs = Array.isArray(ledger?.transactions) ? ledger.transactions : [];
  const filtered = txs.filter(t => !search || `${t.title} ${t.description} ${t.category_name}`.includes(search));

  // محاسبه ماندهٔ جاری
  let running = Number(ledger?.opening_balance || 0);

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}28`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <AutoStoriesIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>دفتر تنخواه</Typography>
          <Typography variant="body2" color="textSecondary">نمای ماندهٔ جاری هر تنخواه و تراکنش‌ها</Typography>
        </Box>
      </Paper>

      <Paper sx={{ ...glass, p: 2, mb: 2 }}>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <TextField size="small" select value={fundId} onChange={e => setFundId(e.target.value)} sx={{ minWidth: 240 }}
            SelectProps={{ native: true }}>
            <option value="">— انتخاب تنخواه —</option>
            {fundList.map(f => <option key={f.id} value={f.id}>{f.code} - {f.title}</option>)}
          </TextField>
          <TextField placeholder="جستجو…" size="small" value={search} onChange={e => setSearch(e.target.value)} sx={{ minWidth: 200 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
        </Stack>
      </Paper>

      {!fundId ? (
        <Paper sx={{ ...glass, p: 4, textAlign: 'center' }}><Typography color="textSecondary">یک تنخواه انتخاب کنید</Typography></Paper>
      ) : isLoading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : (
        <>
          {/* خلاصه مانده */}
          <Paper sx={{ ...glass, p: 2, mb: 2, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Box><Typography variant="caption" color="textSecondary">اعتبار اولیه</Typography><Typography variant="h6" fontWeight={800}>{formatPersianNumber(ledger.opening_balance)}</Typography></Box>
            <Box><Typography variant="caption" color="textSecondary">دریافت‌ها</Typography><Typography variant="h6" fontWeight={800} color="green">{formatPersianNumber(ledger.total_credits)}</Typography></Box>
            <Box><Typography variant="caption" color="textSecondary">هزینه‌ها</Typography><Typography variant="h6" fontWeight={800} color="red">{formatPersianNumber(ledger.total_debits)}</Typography></Box>
            <Box><Typography variant="caption" color="textSecondary">ماندهٔ فعلی</Typography><Typography variant="h6" fontWeight={900} color={COLOR_DARK}>{formatPersianNumber(ledger.balance)}</Typography></Box>
            {ledger.fund?.is_reconciled && <Chip size="small" label="مغایرت‌گیری‌شده" color="success" />}
          </Paper>

          <Paper sx={{ ...glass, overflow: 'hidden' }}>
            <TableContainer>
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell>تاریخ</TableCell><TableCell>نوع</TableCell><TableCell>عنوان</TableCell><TableCell>دسته</TableCell><TableCell>دریافت</TableCell><TableCell>هزینه</TableCell><TableCell>مانده</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {filtered.map(t => {
                    const credit = t.entry_type === 'credit' ? Number(t.amount) : 0;
                    const debit = t.entry_type === 'debit' ? Number(t.amount) : 0;
                    running += credit - debit;
                    return (
                      <TableRow key={t.id} hover>
                        <TableCell>{toJalali(t.date)}</TableCell>
                        <TableCell><Chip size="small" label={t.entry_type_display} sx={{ bgcolor: t.entry_type === 'credit' ? '#10b98118' : '#ef444418', color: t.entry_type === 'credit' ? '#059669' : '#dc2626' }} /></TableCell>
                        <TableCell>{t.title}</TableCell>
                        <TableCell>{t.category_name || '—'}</TableCell>
                        <TableCell sx={{ color: credit ? 'green' : '#94a3b8' }}>{credit ? formatPersianNumber(credit) : '—'}</TableCell>
                        <TableCell sx={{ color: debit ? 'red' : '#94a3b8' }}>{debit ? formatPersianNumber(debit) : '—'}</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>{formatPersianNumber(running)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default PettyCashLedgerPage;