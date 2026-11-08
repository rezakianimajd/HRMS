/** ابزارهای مشترک صفحات خرید و تدارکات (لیست + دیالوگ + فرم). */
import React, { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';

export const FONT = 'Vazirmatn, IRANSans, sans-serif';
export const ACCENT = '#f59e0b';
export const ACCENT_DARK = '#b45309';
export const OK = '#10b981';
export const WARN = '#f59e0b';
export const DANGER = '#ef4444';
export const INFO = '#3b82f6';

export const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.46))',
  backdropFilter: 'blur(22px) saturate(180%)',
  WebkitBackdropFilter: 'blur(22px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 14px 40px rgba(245,158,11,0.12)',
  borderRadius: '16px',
};

export const asList = (data) => (Array.isArray(data) ? data : data?.results || []);
export const money = (value, unit = 'ریال') => `${formatPersianNumber(Math.round(Number(value) || 0))} ${unit}`.trim();
export const dateLabel = (value) => (value ? toJalali(value) : '—');
export const num = (value) => Number(value) || 0;

/** هوک بارگذاری فهرست با پارامترها. */
export const useList = (endpoint, params = {}) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const key = JSON.stringify(params);

  const load = useCallback(() => {
    setLoading(true);
    return axiosInstance.get(endpoint, { params })
      .then((response) => { setRows(asList(response.data)); setError(''); })
      .catch((err) => setError(err?.response?.data?.detail || 'بارگذاری فهرست ناموفق بود.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [endpoint, key]);

  useEffect(() => { load(); }, [load]);
  return { rows, loading, error, reload: load, setRows };
};

export const TH = ({ children, align = 'right' }) => (
  <TableCell align={align} sx={{ fontFamily: FONT, fontWeight: 800, fontSize: 12 }}>{children}</TableCell>
);

export const TD = ({ children, bold, align = 'right', ...rest }) => (
  <TableCell align={align} sx={{ fontFamily: FONT, fontSize: 12, ...(bold ? { fontWeight: 800 } : {}) }} {...rest}>
    {children}
  </TableCell>
);

/** پوستهٔ بخش: سرصفحه + بدنه. */
export const SectionShell = ({ icon, title, subtitle, actions, children, loading, error }) => (
  <Box>
    <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
      background: `linear-gradient(120deg, ${ACCENT}1a, rgba(255,255,255,0.35))`,
      border: `1px solid ${ACCENT}28`, borderRadius: '16px' }}>
      <Box sx={{ width: 46, height: 46, borderRadius: '14px', display: 'grid', placeItems: 'center',
        background: `linear-gradient(135deg,${ACCENT},${ACCENT_DARK})`, color: '#fff' }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 180 }}>
        <Typography sx={{ fontFamily: FONT, fontWeight: 900, fontSize: 15 }}>{title}</Typography>
        {subtitle ? (
          <Typography sx={{ fontFamily: FONT, fontSize: 12, color: '#64748b' }}>{subtitle}</Typography>
        ) : null}
      </Box>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>{actions}</Stack>
    </Paper>

    <Paper sx={{ ...glass, p: 1.5 }}>
      {error ? <Alert severity="error" sx={{ mb: 1, fontFamily: FONT }}>{error}</Alert> : null}
      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={24} sx={{ color: ACCENT }} /></Stack>
      ) : children}
    </Paper>
  </Box>
);

/** جدول سادهٔ فهرست با حالت خالی. */
export const SimpleTable = ({ head, children, emptyText = 'موردی ثبت نشده است.', maxHeight = '62vh' }) => (
  <TableContainer sx={{ maxHeight }}>
    <Table size="small" stickyHeader>
      <TableHead><TableRow>{head}</TableRow></TableHead>
      <TableBody>
        {React.Children.count(children) === 0 ? (
          <TableRow>
            <TableCell colSpan={head.length} align="center" sx={{ py: 4, fontFamily: FONT, color: '#94a3b8' }}>
              {emptyText}
            </TableCell>
          </TableRow>
        ) : children}
      </TableBody>
    </Table>
  </TableContainer>
);

/** دیالوگ فرم/جزئیات با دکمه‌های استاندارد. */
export const DialogShell = ({
  open, title, onClose, onSubmit, submitLabel = 'ثبت', loading, error, maxWidth = 'md', children,
}) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth={maxWidth}>
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontFamily: FONT, fontWeight: 900, fontSize: 15 }}>
      <Box sx={{ flex: 1 }}>{title}</Box>
      <IconButton size="small" onClick={onClose} aria-label="بستن"><CloseIcon fontSize="small" /></IconButton>
    </DialogTitle>
    <DialogContent dividers sx={{ fontFamily: FONT }}>
      {error ? <Alert severity="error" sx={{ mb: 1.5, fontFamily: FONT }}>{error}</Alert> : null}
      {children}
    </DialogContent>
    <DialogActions sx={{ px: 2, py: 1.25 }}>
      <Button size="small" onClick={onClose} color="inherit" sx={{ fontFamily: FONT }}>انصراف</Button>
      {onSubmit ? (
        <Button size="small" variant="contained" onClick={onSubmit} disabled={loading}
          sx={{ bgcolor: ACCENT_DARK, fontFamily: FONT, '&:hover': { bgcolor: ACCENT } }}>
          {loading ? 'در حال ثبت…' : submitLabel}
        </Button>
      ) : null}
    </DialogActions>
  </Dialog>
);

/** ورودی متنی استاندارد فرم‌های خرید. */
export const Field = ({
  label, value, onChange, type = 'text', select, options = [], required, size = 12, disabled,
}) => (
  <Box sx={{ gridColumn: `span ${size}` }}>
    <TextField fullWidth size="small" label={label} value={value ?? ''} onChange={onChange} type={type}
      select={select} disabled={disabled} required={required}
      InputLabelProps={type === 'date' ? { shrink: true } : undefined}
      sx={{ fontFamily: FONT }}>
      {select ? options.map((option) => (
        <MenuItem key={option.value} value={option.value} sx={{ fontFamily: FONT, fontSize: 13 }}>
          {option.label}
        </MenuItem>
      )) : null}
    </TextField>
  </Box>
);

/** دکمهٔ افزودن سطر برای دیالوگ‌های سند. */
export const AddRowButton = ({ onClick, label = 'افزودن سطر' }) => (
  <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={onClick}
    sx={{ fontFamily: FONT, color: ACCENT_DARK, fontWeight: 800 }}>{label}</Button>
);

/** شبکهٔ فرم دو/سه/چهارستونه. */
export const FormGrid = ({ children }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 1.25 }}>{children}</Box>
);

export const todayIso = () => new Date().toISOString().slice(0, 10);
export const digits = toPersianDigits;

/** چیپ وضعیت با نقشهٔ رنگ. */
export const StatusChip = ({ status, map = {} }) => {
  const meta = map[status] || { label: status || '—', color: '#64748b' };
  return (
    <Chip size="small" label={meta.label}
      sx={{ bgcolor: `${meta.color}18`, color: meta.color, fontWeight: 800, fontFamily: FONT, height: 22 }} />
  );
};
