import React from 'react';
import {
  Box, Paper, Typography, Grid, TextField, Avatar, alpha, Stack, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Chip, Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { SOFT } from '../../core/components/settings/settingsUi';
import { toEnglishDigits, toPersianDigits } from '../../core/utils/numberUtils';

export const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 12.5 },
};

export const SectionCard = ({ icon, title, subtitle, color = SOFT.indigo, children, action, sx }) => (
  <Paper sx={{
    borderRadius: 'var(--hrms-radius-large, 16px)',
    border: 'var(--hrms-border-card, 1px solid #e8edf4)',
    bgcolor: 'var(--hrms-region-card-bg, #fff)',
    boxShadow: 'var(--hrms-shadow-card, 0 4px 18px rgba(15,23,42,0.04))',
    p: 1.75, mb: 1.75, overflow: 'hidden', ...(sx || {}),
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5, flexWrap: 'wrap' }}>
      <Avatar variant="rounded" sx={{
        width: 34, height: 34, borderRadius: '9px',
        bgcolor: alpha(color, 0.14), color,
      }}>
        {React.cloneElement(icon, { sx: { fontSize: 18 } })}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 900 }}>{title}</Typography>
        {subtitle ? (
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{subtitle}</Typography>
        ) : null}
      </Box>
      {action}
    </Box>
    {children}
  </Paper>
);

export const FormGrid = ({ children, spacing = 2 }) => (
  <Grid container spacing={spacing}>{children}</Grid>
);

export const Field = ({ label, value, onChange, md = 4, xs = 12, ...rest }) => (
  <Grid item xs={xs} md={md}>
    <TextField
      size="small" fullWidth sx={fieldSx} label={label} value={value ?? ''}
      onChange={(event) => onChange(event.target.value)} {...rest}
    />
  </Grid>
);

export const NumericField = ({ label, value, onChange, md = 4, xs = 12, ...rest }) => (
  <Field
    label={label} value={toPersianDigits(value ?? '')}
    onChange={(next) => onChange(toEnglishDigits(next))} md={md} xs={xs} {...rest}
  />
);

export const EmptyNote = ({ text = 'هنوز اطلاعاتی ثبت نشده است.' }) => (
  <Box sx={{
    py: 4, textAlign: 'center', color: 'text.secondary', fontSize: 12,
    border: '1px dashed', borderColor: 'divider', borderRadius: '10px',
  }}>
    {text}
  </Box>
);

export const EntityDialog = ({ open, title, subtitle, onClose, onSubmit, saving, children, maxWidth = 'md' }) => (
  <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth
    PaperProps={{ style: { borderRadius: 12 } }}>
    <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, pb: 1 }}>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 900 }}>{title}</Typography>
        {subtitle ? (
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.3 }}>{subtitle}</Typography>
        ) : null}
      </Box>
      <IconButton size="small" onClick={onClose} aria-label="بستن"><CloseIcon fontSize="small" /></IconButton>
    </DialogTitle>
    <DialogContent dividers sx={{ pt: 1.5 }}>{children}</DialogContent>
    <DialogActions sx={{ px: 2, py: 1.25 }}>
      <Button size="small" onClick={onClose} disabled={saving}>انصراف</Button>
      <Button size="small" variant="contained" onClick={onSubmit} disabled={saving}
        sx={{ bgcolor: SOFT.indigo, boxShadow: 'none' }}>
        {saving ? 'در حال ذخیره…' : 'ذخیره'}
      </Button>
    </DialogActions>
  </Dialog>
);
export const EntityToolbar = ({ title, hint, action }) => (
  <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
    <Box sx={{ flex: 1, minWidth: 180 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 900 }}>{title}</Typography>
      {hint ? <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{hint}</Typography> : null}
    </Box>
    {action}
  </Stack>
);

export const SimpleTable = ({ columns, rows, rowKey, emptyText, onRowClick, minWidth = 720 }) => (
  <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px', overflowX: 'auto' }}>
    <Table size="small" sx={{ minWidth }}>
      <TableHead>
        <TableRow sx={{ bgcolor: alpha(SOFT.slate, 0.08) }}>
          {columns.map((column) => (
            <TableCell key={column.key} align={column.align || 'right'}
              sx={{ fontSize: 11.5, fontWeight: 900, whiteSpace: 'nowrap' }}>
              {column.label}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.length ? rows.map((row) => (
          <TableRow key={rowKey(row)} hover sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
            onClick={onRowClick ? () => onRowClick(row) : undefined}>
            {columns.map((column) => (
              <TableCell key={column.key} align={column.align || 'right'}
                sx={{ fontSize: 12, py: 0.85 }}>
                {column.render ? column.render(row) : (row[column.key] ?? '—')}
              </TableCell>
            ))}
          </TableRow>
        )) : (
          <TableRow>
            <TableCell colSpan={columns.length} align="center" sx={{ py: 3.5 }}>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                {emptyText || 'هنوز اطلاعاتی ثبت نشده است.'}
              </Typography>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </TableContainer>
);

export const ActiveChip = ({ active = true }) => (
  <Chip size="small" label={active ? 'فعال' : 'غیرفعال'}
    sx={{
      height: 22, fontSize: 10.5, fontWeight: 800,
      bgcolor: alpha(active ? SOFT.green : SOFT.slate, 0.12),
      color: active ? '#277a44' : '#64748b',
    }} />
);

export const MoneyText = ({ value, suffix = 'ریال' }) => (
  <Typography component="span" sx={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
    {value === null || value === undefined || value === ''
      ? '—'
      : `${toPersianDigits(Number(value).toLocaleString('en-US'))} ${suffix}`}
  </Typography>
);

export const DialogSection = ({ title, children }) => (
  <Box sx={{ mb: 1.75 }}>
    <Typography sx={{ fontSize: 11.5, fontWeight: 900, color: 'text.secondary', mb: 0.8 }}>
      {title}
    </Typography>
    <Divider sx={{ mb: 1.1 }} />
    {children}
  </Box>
);

export const dangerButtonSx = { color: '#be123c', borderColor: alpha('#be123c', 0.25) };

