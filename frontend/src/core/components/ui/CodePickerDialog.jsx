import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, TextField, InputAdornment,
  List, ListItemButton, Typography, Box, IconButton, Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

const FONT = 'Vazirmatn, IRANSans, sans-serif';

const CodePickerDialog = ({ open, title, options = [], onSelect, onClose, color = '#10b981' }) => {
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);

  const filtered = useMemo(() => {
    const needle = String(q || '').trim().toLowerCase();
    if (!needle) return options;
    return options.filter(o =>
      String(o.code || '').toLowerCase().includes(needle) ||
      String(o.name || '').toLowerCase().includes(needle),
    );
  }, [q, options]);

  useEffect(() => {
    if (open) { setQ(''); setCursor(0); }
  }, [open]);

  const choose = (o) => { if (o) { onSelect(o); onClose(); } };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: '22px',
            background: 'linear-gradient(160deg, rgba(255,255,255,0.97), rgba(250,251,255,0.90))',
            backdropFilter: 'blur(28px) saturate(170%)',
            WebkitBackdropFilter: 'blur(28px) saturate(170%)',
            border: '1px solid rgba(255,255,255,0.9)',
            boxShadow: '0 28px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(16,185,129,0.10)',
            overflow: 'hidden',
          },
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, m: 0, px: 2.5, py: 2, color, fontWeight: 800, fontFamily: FONT, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        {title}
        <Box sx={{ flex: 1 }} />
        <Chip size="small" label={`${filtered.length} مورد`} sx={{ color, bgcolor: `${color}14`, fontWeight: 700, fontFamily: FONT }} />
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2, py: 2 }}>
        <TextField
          autoFocus fullWidth size="small"
          placeholder="جستجو بر اساس کد یا شرح…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
            else if (e.key === 'Enter') { e.preventDefault(); choose(filtered[cursor]); }
          }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment>,
          }}
          sx={{
            '& .MuiOutlinedInput-root': { borderRadius: '14px', background: 'rgba(255,255,255,0.9)', fontFamily: FONT },
            '& .MuiInputBase-input': { fontFamily: FONT },
          }}
        />

        <List dense sx={{ maxHeight: 440, overflowY: 'auto', mt: 1.5 }}>
          {filtered.length === 0 ? (
            <Typography color="textSecondary" textAlign="center" py={5} sx={{ fontFamily: FONT }}>موردی یافت نشد.</Typography>
          ) : filtered.slice(0, 200).map((o, idx) => (
            <ListItemButton
              key={o.id}
              onClick={() => choose(o)}
              onMouseEnter={() => setCursor(idx)}
              selected={idx === cursor}
              sx={{
                borderRadius: '14px', mb: 0.5, px: 1.5, py: 1,
                '&.Mui-selected': { background: `${color}12` },
                '&.Mui-selected:hover': { background: `${color}16` },
              }}
            >
              <Chip size="small" label={o.code} sx={{ fontWeight: 800, minWidth: 64, bgcolor: `${color}14`, color, fontFamily: FONT }} />
              <Typography variant="body2" sx={{ px: 1.5, fontFamily: FONT, fontWeight: 600 }}>{o.name}</Typography>
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
};

export default CodePickerDialog;