import React, { useMemo, useState } from 'react';
import {
  Box, TextField, InputAdornment, Paper, Stack, Typography, Chip, Avatar,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import HandshakeIcon from '@mui/icons-material/Handshake';
import BusinessIcon from '@mui/icons-material/Business';
import { formatPersianNumber } from '../../utils/numberUtils';
import { glassPaper, CONTRACT_STATUS_LABELS as STATUS_LABELS, CONTRACT_STATUS_COLORS as STATUS_COLORS, currencyLabel } from '../../theme/tokens';

/**
 * Searchable, selectable contract list (search bar + rows with number,
 * subject, party, amount, currency, status).
 */
const ContractPicker = ({ contracts = [], onSelect, selectedId, height = 460 }) => {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = (q || '').trim().toLowerCase();
    if (!s) return contracts;
    return contracts.filter(c =>
      (c.number || '').toLowerCase().includes(s) ||
      (c.subject || '').toLowerCase().includes(s) ||
      (c.party_name || '').toLowerCase().includes(s));
  }, [contracts, q]);

  return (
    <Box>
      <TextField
        size="small"
        fullWidth
        placeholder="جستجوی قرارداد (شماره، موضوع، طرف حساب)..."
        value={q}
        onChange={e => setQ(e.target.value)}
        sx={{ mb: 1.5 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
      />

      <Stack spacing={1} sx={{ maxHeight: height, overflow: 'auto', pr: 0.5 }}>
        {filtered.length === 0 && (
          <Typography variant="body2" color="textSecondary" textAlign="center" py={4}>قراردادی یافت نشد.</Typography>
        )}
        {filtered.map(c => {
          const selected = selectedId && String(selectedId) === String(c.id);
          return (
            <Paper
              key={c.id}
              onClick={() => onSelect(c)}
              sx={{
                ...glassPaper,
                p: 1.5,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
                border: selected ? '1.5px solid #f59e0b' : '1px solid rgba(255,255,255,0.5)',
                background: selected ? 'rgba(245,158,11,0.10)' : glassPaper.background,
                '&:hover': { borderColor: '#f59e0b', transform: 'translateX(-3px)' },
                transition: 'all 0.15s ease',
              }}
            >
              <Avatar sx={{ width: 40, height: 40, background: STATUS_COLORS[c.status] || '#64748b' }}>
                <HandshakeIcon sx={{ color: '#fff', fontSize: 20 }} />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <Typography variant="body2" fontWeight={800}>{c.subject}</Typography>
                <Typography variant="caption" color="textSecondary" display="block">
                  شماره: {c.number || '—'} · <BusinessIcon sx={{ fontSize: 12, verticalAlign: 'middle' }} /> {c.party_name || '—'}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="body2" fontWeight={800} color="#b45309">
                  {formatPersianNumber(c.amount || 0)} <Typography component="span" variant="caption">{currencyLabel(c)}</Typography>
                </Typography>
              </Box>
              <Chip size="small" label={STATUS_LABELS[c.status] || c.status}
                sx={{ bgcolor: `${STATUS_COLORS[c.status] || '#64748b'}18`, color: STATUS_COLORS[c.status] || '#64748b', fontWeight: 700 }} />
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
};

export default ContractPicker;
