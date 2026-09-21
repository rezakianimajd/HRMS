import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, CircularProgress, Stack, Chip, TextField, InputAdornment,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SearchIcon from '@mui/icons-material/Search';
import { formatPersianNumber } from '../core/utils/numberUtils';

const COLOR = '#0ea5e9';
const COLOR_DARK = '#0284c7';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.34))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 14px 40px rgba(14,165,233,0.12)', borderRadius: '16px',
};

const PettyCashCustodiansPage = () => {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['pc-custodians'], queryFn: () => axiosInstance.get('/petty-cash-funds/custodians/').then(r => r.data) });
  const list = Array.isArray(data) ? data : [];
  const filtered = list.filter(c => !search || `${c.name} ${c.employee_id} ${c.department}`.includes(search));

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}28`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <PeopleIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>تنخواه‌داران</Typography>
          <Typography variant="body2" color="textSecondary">پرسنلی که تنخواه دارند و ماندهٔ هر تنخواه</Typography>
        </Box>
        <Chip label={`${list.length} تنخواه‌دار`} sx={{ fontWeight: 700, bgcolor: 'rgba(14,165,233,0.1)', color: COLOR_DARK }} />
      </Paper>

      <Paper sx={{ ...glass, p: 1.5, mb: 2 }}>
        <TextField placeholder="جستجوی تنخواه‌دار…" size="small" fullWidth value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
      </Paper>

      {isLoading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : (
        <Stack spacing={1.5}>
          {filtered.length === 0
            ? <Paper sx={{ ...glass, p: 4, textAlign: 'center' }}><Typography color="textSecondary">تنخواه‌داری ثبت نشده است.</Typography></Paper>
            : filtered.map(c => (
              <Paper key={c.id} sx={{ ...glass, p: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                  <Avatar sx={{ bgcolor: COLOR }}><PeopleIcon /></Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" fontWeight={800}>{c.name}</Typography>
                    <Typography variant="caption" color="textSecondary">{c.employee_id}{c.department ? ` · ${c.department}` : ''}</Typography>
                  </Box>
                  <Chip icon={<AccountBalanceWalletIcon />} label={`جمع مانده: ${formatPersianNumber(c.total_balance)} ریال`} sx={{ fontWeight: 800, bgcolor: 'rgba(14,165,233,0.1)', color: COLOR_DARK }} />
                </Stack>
                <Stack spacing={0.75}>
                  {c.funds.map(f => (
                    <Box key={f.id} sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 0.75, borderRadius: '10px', background: 'rgba(255,255,255,0.55)' }}>
                      <Typography variant="body2">{f.code} · {f.title}</Typography>
                      <Typography variant="body2" fontWeight={700} color={COLOR_DARK}>{formatPersianNumber(f.balance)} ریال</Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            ))}
        </Stack>
      )}
    </Box>
  );
};

export default PettyCashCustodiansPage;