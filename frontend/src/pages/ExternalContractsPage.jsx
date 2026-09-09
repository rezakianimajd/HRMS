import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, InputAdornment,
} from '@mui/material';
import HandshakeIcon from '@mui/icons-material/Handshake';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { formatPersianNumber } from '../core/utils/numberUtils';

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

const ExternalContractsPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [openParty, setOpenParty] = useState(false);
  const [partyForm, setPartyForm] = useState({ name: '', party_type: 'contractor', mobile: '', email: '', national_id: '' });

  const { data: parties } = useQuery({
    queryKey: ['contract-parties'],
    queryFn: () => axiosInstance.get('/contract-parties/').then(r => r.data),
  });
  const partyList = Array.isArray(parties) ? parties : parties?.results || [];

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['external-contracts'],
    queryFn: () => axiosInstance.get('/external-contracts/').then(r => r.data),
  });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  const createParty = useMutation({
    mutationFn: (payload) => axiosInstance.post('/contract-parties/', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-parties'] });
      setOpenParty(false);
      setPartyForm({ name: '', party_type: 'contractor', mobile: '', email: '', national_id: '' });
    },
  });

  if (isLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  const filtered = search
    ? contractList.filter(c =>
        (c.subject || '').includes(search) || (c.party_name || '').includes(search) || (c.number || '').includes(search))
    : contractList;

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(245,158,11,0.10), rgba(249,115,22,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(245,158,11,0.16)', borderRadius: 3 }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 24px rgba(245,158,11,0.4)' }}>
          <HandshakeIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color="#b45309">قراردادهای برون‌سازمانی</Typography>
          <Typography variant="body2" color="textSecondary">پیمانکاری، خرید، مناقصه + فاکتور، صورت‌وضعیت، الحاقیه، تضمین و پرداخت</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/contracts/new')}
          sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', borderRadius: 2 }}>
          قرارداد جدید
        </Button>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setOpenParty(true)}>طرف جدید</Button>
      </Paper>

      {/* Search */}
      <Paper sx={{ p: 1.5, mb: 2, borderRadius: 2.5, background: 'rgba(255,255,255,0.6)' }}>
        <TextField size="small" placeholder="جستجو: موضوع، شماره، طرف قرارداد..." value={search}
          onChange={e => setSearch(e.target.value)} fullWidth
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
      </Paper>

      {/* Contracts list */}
      <Paper sx={{ p: 2, borderRadius: 3, background: 'rgba(255,255,255,0.65)' }}>
        {filtered.length === 0 ? (
          <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>قراردادی ثبت نشده است.</Typography>
        ) : (
          <Stack spacing={1.25}>
            {filtered.map(c => (
              <Paper
                key={c.id}
                variant="outlined"
                onClick={() => navigate(`/external-contracts/${c.id}`)}
                sx={{
                  p: 1.75, borderRadius: 2.5, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.5)',
                  '&:hover': { borderColor: '#f59e0b', transform: 'translateX(-3px)' },
                  transition: 'all 0.2s ease',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Avatar sx={{ width: 40, height: 40, background: STATUS_COLORS[c.status] || '#64748b' }}>
                    <HandshakeIcon sx={{ color: '#fff', fontSize: 20 }} />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="body2" fontWeight={700}>{c.subject}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {c.party_name} · {TYPE_LABELS[c.contract_type]} · {c.number || 'بدون شماره'}
                    </Typography>
                  </Box>
                  <Chip size="small" label={STATUS_LABELS[c.status]} sx={{ color: '#fff', bgcolor: STATUS_COLORS[c.status] || '#64748b' }} />
                  <Typography variant="caption" fontWeight={800}>{formatPersianNumber(c.amount || 0)} ریال</Typography>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      {/* Party dialog */}
      <Dialog open={openParty} onClose={() => setOpenParty(false)} maxWidth="sm" fullWidth>
        <DialogTitle>طرف قرارداد جدید</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField size="small" label="نام / عنوان *" value={partyForm.name} onChange={e => setPartyForm(p => ({ ...p, name: e.target.value }))} />
          <FormControl size="small">
            <InputLabel>نوع طرف</InputLabel>
            <Select value={partyForm.party_type} label="نوع طرف" onChange={e => setPartyForm(p => ({ ...p, party_type: e.target.value }))}>
              <MenuItem value="contractor">پیمانکار</MenuItem>
              <MenuItem value="supplier">فروشنده / تأمین‌کننده</MenuItem>
              <MenuItem value="consultant">مشاور</MenuItem>
              <MenuItem value="other">سایر</MenuItem>
            </Select>
          </FormControl>
          <TextField size="small" label="شناسه ملی / کد ثبت" value={partyForm.national_id} onChange={e => setPartyForm(p => ({ ...p, national_id: e.target.value }))} />
          <TextField size="small" label="موبایل" value={partyForm.mobile} onChange={e => setPartyForm(p => ({ ...p, mobile: e.target.value }))} />
          <TextField size="small" label="ایمیل" value={partyForm.email} onChange={e => setPartyForm(p => ({ ...p, email: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenParty(false)}>انصراف</Button>
          <Button variant="contained" disabled={!partyForm.name} onClick={() => createParty.mutate(partyForm)}
            sx={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>ثبت</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExternalContractsPage;