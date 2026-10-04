import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Dialog, DialogTitle, TextField, List, ListItemButton, ListItemText, Typography, InputAdornment, Chip, Avatar, Box,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import HandshakeIcon from '@mui/icons-material/Handshake';
import { formatPersianNumber } from '../../utils/numberUtils';
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS, currencyLabel } from '../../theme/tokens';

/**
 * Global command palette (Ctrl+K) — quick contract search + navigation.
 */
const CommandPalette = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
        setQ('');
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const { data } = useQuery({
    queryKey: ['command-palette-contracts'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 200 } }).then(r => r.data),
    enabled: open,
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const results = useMemo(() => {
    const s = (q || '').trim().toLowerCase();
    if (!s) return list.slice(0, 8);
    return list.filter(c =>
      (c.subject || '').toLowerCase().includes(s) ||
      (c.number || '').toLowerCase().includes(s) ||
      (c.party_name || '').toLowerCase().includes(s)).slice(0, 8);
  }, [list, q]);

  return (
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder="جستجوی سریع قراردادها (Ctrl+K)..."
          value={q}
          onChange={e => setQ(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
      </DialogTitle>
      <List sx={{ maxHeight: 400, overflow: 'auto', pt: 0 }}>
        {results.length === 0 ? (
          <Typography variant="body2" color="textSecondary" textAlign="center" py={3}>قراردادی یافت نشد</Typography>
        ) : (
          results.map(c => (
            <ListItemButton key={c.id} onClick={() => { setOpen(false); navigate(`/external-contracts/${c.id}`); }}>
              <Avatar sx={{ width: 34, height: 34, mr: 1.5, background: CONTRACT_STATUS_COLORS[c.status] || '#64748b' }}>
                <HandshakeIcon sx={{ color: '#fff', fontSize: 18 }} />
              </Avatar>
              <ListItemText
                primary={c.subject}
                secondary={`${c.number || '—'} · ${c.party_name || '—'}`}
              />
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="body2" fontWeight={700} color="#b45309">{formatPersianNumber(c.amount || 0)} {currencyLabel(c)}</Typography>
              </Box>
              <Chip size="small" label={CONTRACT_STATUS_LABELS[c.status] || c.status} sx={{ ml: 1, bgcolor: `${CONTRACT_STATUS_COLORS[c.status] || '#64748b'}18`, color: CONTRACT_STATUS_COLORS[c.status] || '#64748b' }} />
            </ListItemButton>
          ))
        )}
      </List>
    </Dialog>
  );
};

export default CommandPalette;
