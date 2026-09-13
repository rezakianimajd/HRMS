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
  construction: 'ظ¾غŒظ…ط§ظ†ع©ط§ط±غŒ / ط§ط¬ط±ط§',
  purchase: 'ط®ط±غŒط¯',
  tender: 'ظ…ظ†ط§ظ‚طµظ‡',
  consulting: 'ظ…ط´ط§ظˆط±ظ‡',
  service: 'ط®ط¯ظ…ط§طھ',
  other: 'ط³ط§غŒط±',
};

const STATUS_LABELS = {
  draft: 'ظ¾غŒط´â€Œظ†ظˆغŒط³',
  active: 'ط¯ط± ط­ط§ظ„ ط§ط¬ط±ط§',
  suspended: 'ظ…طھظˆظ‚ظپ',
  completed: 'طھع©ظ…غŒظ„ ط´ط¯ظ‡',
  terminated: 'ظپط³ط® ط´ط¯ظ‡',
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
        border: '1px solid rgba(245,158,11,0.16)', borderRadius: '10px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 24px rgba(245,158,11,0.4)' }}>
          <HandshakeIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color="#b45309">ظ‚ط±ط§ط±ط¯ط§ط¯ظ‡ط§غŒ ط¨ط±ظˆظ†â€Œط³ط§ط²ظ…ط§ظ†غŒ</Typography>
          <Typography variant="body2" color="textSecondary">ظ¾غŒظ…ط§ظ†ع©ط§ط±غŒطŒ ط®ط±غŒط¯طŒ ظ…ظ†ط§ظ‚طµظ‡ + ظپط§ع©طھظˆط±طŒ طµظˆط±طھâ€Œظˆط¶ط¹غŒطھطŒ ط§ظ„ط­ط§ظ‚غŒظ‡طŒ طھط¶ظ…غŒظ† ظˆ ظ¾ط±ط¯ط§ط®طھ</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/contracts/new')}
          sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', borderRadius: '10px' }}>
          ظ‚ط±ط§ط±ط¯ط§ط¯ ط¬ط¯غŒط¯
        </Button>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setOpenParty(true)}>ط·ط±ظپ ط¬ط¯غŒط¯</Button>
      </Paper>

      {/* Search */}
      <Paper sx={{ p: 1.5, mb: 2, borderRadius: '10px', background: 'rgba(255,255,255,0.6)' }}>
        <TextField size="small" placeholder="ط¬ط³طھط¬ظˆ: ظ…ظˆط¶ظˆط¹طŒ ط´ظ…ط§ط±ظ‡طŒ ط·ط±ظپ ظ‚ط±ط§ط±ط¯ط§ط¯..." value={search}
          onChange={e => setSearch(e.target.value)} fullWidth
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
      </Paper>

      {/* Contracts list */}
      <Paper sx={{ p: 2, borderRadius: '10px', background: 'rgba(255,255,255,0.65)' }}>
        {filtered.length === 0 ? (
          <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>ظ‚ط±ط§ط±ط¯ط§ط¯غŒ ط«ط¨طھ ظ†ط´ط¯ظ‡ ط§ط³طھ.</Typography>
        ) : (
          <Stack spacing={1.25}>
            {filtered.map(c => (
              <Paper
                key={c.id}
                variant="outlined"
                onClick={() => navigate(`/external-contracts/${c.id}`)}
                sx={{
                  p: 1.75, borderRadius: '10px', cursor: 'pointer',
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
                      {c.party_name} آ· {TYPE_LABELS[c.contract_type]} آ· {c.number || 'ط¨ط¯ظˆظ† ط´ظ…ط§ط±ظ‡'}
                    </Typography>
                  </Box>
                  <Chip size="small" label={STATUS_LABELS[c.status]} sx={{ color: '#fff', bgcolor: STATUS_COLORS[c.status] || '#64748b' }} />
                  <Typography variant="caption" fontWeight={800}>{formatPersianNumber(c.amount || 0)} ط±غŒط§ظ„</Typography>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      {/* Party dialog */}
      <Dialog open={openParty} onClose={() => setOpenParty(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ط·ط±ظپ ظ‚ط±ط§ط±ط¯ط§ط¯ ط¬ط¯غŒط¯</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField size="small" label="ظ†ط§ظ… / ط¹ظ†ظˆط§ظ† *" value={partyForm.name} onChange={e => setPartyForm(p => ({ ...p, name: e.target.value }))} />
          <FormControl size="small">
            <InputLabel>ظ†ظˆط¹ ط·ط±ظپ</InputLabel>
            <Select value={partyForm.party_type} label="ظ†ظˆط¹ ط·ط±ظپ" onChange={e => setPartyForm(p => ({ ...p, party_type: e.target.value }))}>
              <MenuItem value="contractor">ظ¾غŒظ…ط§ظ†ع©ط§ط±</MenuItem>
              <MenuItem value="supplier">ظپط±ظˆط´ظ†ط¯ظ‡ / طھط£ظ…غŒظ†â€Œع©ظ†ظ†ط¯ظ‡</MenuItem>
              <MenuItem value="consultant">ظ…ط´ط§ظˆط±</MenuItem>
              <MenuItem value="other">ط³ط§غŒط±</MenuItem>
            </Select>
          </FormControl>
          <TextField size="small" label="ط´ظ†ط§ط³ظ‡ ظ…ظ„غŒ / ع©ط¯ ط«ط¨طھ" value={partyForm.national_id} onChange={e => setPartyForm(p => ({ ...p, national_id: e.target.value }))} />
          <TextField size="small" label="ظ…ظˆط¨ط§غŒظ„" value={partyForm.mobile} onChange={e => setPartyForm(p => ({ ...p, mobile: e.target.value }))} />
          <TextField size="small" label="ط§غŒظ…غŒظ„" value={partyForm.email} onChange={e => setPartyForm(p => ({ ...p, email: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenParty(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" disabled={!partyForm.name} onClick={() => createParty.mutate(partyForm)}
            sx={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>ط«ط¨طھ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExternalContractsPage;