import React from 'react';
import { Box, Typography, Divider, Chip, Stack } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { formatPersianNumber } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';

/**
 * Live preview of a contract statement (صورت‌وضعیت).
 * Fed directly by the in-progress form state — updates as the user types.
 */
const StatementPreview = ({ form = {}, contract, color = '#6366f1' }) => {
  const amount = Number(form.amount || 0);
  const approved = !!form.is_approved;

  const Row = ({ label, value, mono }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, py: 0.9 }}>
      <Typography variant="caption" color="textSecondary" sx={{ flexShrink: 0 }}>{label}</Typography>
      <Typography variant={mono ? 'body2' : 'body1'} fontWeight={700}
        sx={{ textAlign: 'left', direction: mono ? 'rtl' : 'inherit', minWidth: 0, wordBreak: 'break-word' }}>
        {value || '—'}
      </Typography>
    </Box>
  );

  return (
    <Box dir="rtl" sx={{
      position: 'relative',
      borderRadius: '16px',
      p: 3,
      overflow: 'hidden',
      background: 'linear-gradient(160deg, rgba(255,255,255,0.96), rgba(248,250,255,0.88))',
      border: '1px solid rgba(255,255,255,0.7)',
      boxShadow: '0 18px 48px rgba(99,102,241,0.16)',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(120% 60% at 0% 0%, ${color}1f, transparent 60%)`,
        pointerEvents: 'none',
      },
    }}>
      {/* Header */}
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: '12px',
          background: `linear-gradient(135deg,${color},${color}99)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 8px 22px ${color}55`,
        }}>
          <ReceiptLongIcon sx={{ color: '#fff', fontSize: 24 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={900} sx={{ color: color, letterSpacing: '-0.2px' }}>
            صورت‌وضعیت
          </Typography>
          <Typography variant="caption" color="textSecondary" noWrap>
            {contract?.subject || contract?.number || 'بدون قرارداد'}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={approved ? 'تأیید شده' : 'در انتظار تأیید'}
          sx={{
            fontWeight: 800,
            bgcolor: approved ? '#10b98122' : '#f59e0b22',
            color: approved ? '#10b981' : '#f59e0b',
            border: `1px solid ${approved ? '#10b98144' : '#f59e0b44'}`,
          }}
        />
      </Box>

      <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />

      {/* Meta rows */}
      <Stack spacing={0}>
        <Row label="شماره صورت‌وضعیت" value={form.number} />
        <Divider sx={{ borderStyle: 'dashed', opacity: 0.6 }} />
        <Row label="تاریخ" value={form.date ? toJalali(form.date) : ''} />
      </Stack>

      <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />

      {/* Amount block */}
      <Box sx={{
        borderRadius: '12px',
        p: 2,
        textAlign: 'center',
        background: `linear-gradient(135deg, ${color}14, ${color}06)`,
        border: `1px solid ${color}22`,
      }}>
        <Typography variant="caption" color="textSecondary">مبلغ صورت‌وضعیت (ریال)</Typography>
        <Typography variant="h4" fontWeight={900} sx={{ color: color, mt: 0.5, direction: 'rtl' }}>
          {formatPersianNumber(amount)}
        </Typography>
      </Box>

      {/* Description */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="textSecondary">توضیحات</Typography>
        <Typography variant="body2" sx={{ mt: 0.5, minHeight: 40, color: form.description ? 'text.primary' : 'text.disabled', whiteSpace: 'pre-wrap' }}>
          {form.description || 'توضیحی وارد نشده است.'}
        </Typography>
      </Box>

      <Divider sx={{ my: 2, borderStyle: 'dashed' }} />

      {/* Signatures */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        {['تهیه‌کننده', 'تأییدکننده'].map((s) => (
          <Box key={s} sx={{ flex: 1, textAlign: 'center' }}>
            <Box sx={{ height: 34, borderBottom: `1px dashed ${color}55`, mb: 0.5 }} />
            <Typography variant="caption" color="textSecondary">{s}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default StatementPreview;
