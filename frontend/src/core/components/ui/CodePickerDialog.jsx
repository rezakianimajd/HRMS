import React, { useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, TextField, InputAdornment, Button,
  List, ListItemButton, ListItemText, Stack, Chip, Typography, Box, IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

/**
 * دیالوگ شیشه‌ای جستجو و انتخاب کد (معین / تفصیل).
 * نمایش: کد + شرح در لیست، جستجو هم روی کد و هم شرح.
 * پس از انتخاب، فقط callback با item صدا زده می‌شود.
 */
const CodePickerDialog = ({ open, title, options, onSelect, onClose, color = '#10b981' }) => {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = (q || '').trim();
    if (!needle) return options;
    return options.filter(o =>
      (o.code || '').includes(needle) || (o.name || '').includes(needle),
    );
  }, [q, options]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: '20px',
            background: 'linear-gradient(150deg, rgba(255,255,255,0.9), rgba(248,250,252,0.78))',
            backdropFilter: 'blur(26px)',
            WebkitBackdropFilter: 'blur(26px)',
            border: '1px solid rgba(255,255,255,0.8)',
            boxShadow: '0 24px 70px rgba(0,0,0,0.22)',
          },
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color, fontWeight: 800 }}>
        {title}
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder="جستجو بر اساس کد یا شرح…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': { borderRadius: '12px', background: 'rgba(255,255,255,0.7)' },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="end"><SearchIcon fontSize="small" /></InputAdornment>
            ),
          }}
        />

        <Stack direction="row" spacing={1} mb={1.5}>
          <Chip size="small" label={`${filtered.length} مورد`} sx={{ color }} />
          {q && <Chip size="small" label="پاک‌کردن" onDelete={() => setQ('')} />}
        </Stack>

        <List dense sx={{ maxHeight: 420, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <Typography color="textSecondary" textAlign="center" py={4}>موردی یافت نشد.</Typography>
          ) : (
            filtered.slice(0, 200).map((o) => (
              <ListItemButton
                key={o.id}
                onClick={() => { onSelect(o); onClose(); }}
                sx={{ borderRadius: '10px', mb: 0.5, '&:hover': { background: `${color}12` } }}
              >
                <Chip size="small" label={o.code} sx={{ fontWeight: 800, minWidth: 70, bgcolor: `${color}18`, color }} />
                <ListItemText primary={o.name} sx={{ px: 1.5 }} />
              </ListItemButton>
            ))
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
};

export default CodePickerDialog;