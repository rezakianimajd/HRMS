import React from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';

export const ACCENT = '#0ea5e9';
export const INCOMING = '#0284c7';
export const OUTGOING = '#0f766e';
export const INTERNAL = '#7c3aed';
export const OK = '#0f766e';
export const WARN = '#b45309';
export const SOON = '#ea580c';
export const DANGER = '#be123c';
export const SLATE = '#475569';

export const DIRECTION_META = {
  incoming: { label: 'وارده', color: INCOMING, bg: '#eff6ff' },
  outgoing: { label: 'صادره', color: OUTGOING, bg: '#ecfdf5' },
  internal: { label: 'داخلی', color: INTERNAL, bg: '#f5f3ff' },
};

export const STATUS_META = {
  draft: { label: 'پیش‌نویس', color: SLATE, bg: '#f1f5f9' },
  registered: { label: 'ثبت‌شده', color: INCOMING, bg: '#eff6ff' },
  in_progress: { label: 'در جریان', color: WARN, bg: '#fffbeb' },
  answered: { label: 'پاسخ داده‌شده', color: OK, bg: '#ecfdf5' },
  closed: { label: 'بسته‌شده', color: SLATE, bg: '#f1f5f9' },
  archived: { label: 'بایگانی‌شده', color: '#334155', bg: '#e2e8f0' },
  canceled: { label: 'لغوشده', color: DANGER, bg: '#fff1f2' },
};

export const PRIORITY_META = {
  low: { label: 'کم', color: SLATE },
  normal: { label: 'عادی', color: INCOMING },
  high: { label: 'زیاد', color: SOON },
  urgent: { label: 'فوری', color: DANGER },
};

export const CONFIDENTIALITY_META = {
  normal: { label: 'عادی', color: SLATE },
  confidential: { label: 'محرمانه', color: WARN },
  secret: { label: 'سری', color: DANGER },
};

export const REFERRAL_STATUS_META = {
  pending: { label: 'در انتظار اقدام', color: WARN, bg: '#fffbeb' },
  in_progress: { label: 'در حال اقدام', color: SOON, bg: '#fff7ed' },
  done: { label: 'اقدام شد', color: OK, bg: '#ecfdf5' },
  returned: { label: 'برگشت داده شد', color: SLATE, bg: '#f1f5f9' },
  canceled: { label: 'لغو', color: DANGER, bg: '#fff1f2' },
};

export const EVENT_META = {
  created: { label: 'ایجاد', color: SLATE },
  updated: { label: 'ویرایش', color: SLATE },
  registered: { label: 'ثبت شماره', color: INCOMING },
  referred: { label: 'ارجاع', color: WARN },
  referral_done: { label: 'اقدام ارجاع', color: OK },
  replied: { label: 'پاسخ', color: OK },
  attached: { label: 'پیوست', color: INTERNAL },
  status_changed: { label: 'تغییر وضعیت', color: WARN },
  archived: { label: 'بایگانی', color: '#334155' },
  closed: { label: 'بسته شد', color: SLATE },
  commented: { label: 'یادداشت', color: INCOMING },
};

export const dateLabel = (value) => (value ? toJalali(value) : '—');

/** ساعت با اعداد فارسی: «۰۹:۳۰». */
export const timeLabel = (value) => {
  if (!value) return '';
  const text = String(value);
  const match = text.match(/(\d{1,2}):(\d{2})/);
  if (!match) return toPersianDigits(text);
  return `${toPersianDigits(match[1].padStart(2, '0'))}:${toPersianDigits(match[2])}`;
};

/** تاریخ و ساعت شمسی با اعداد فارسی: «۱۴۰۵/۰۸/۱۲ — ۱۴:۳۵». */
export const dateTimeLabel = (value) => {
  if (!value) return '—';
  const text = String(value);
  const day = toJalali(text.slice(0, 10));
  const match = text.match(/[T ](\d{2}):(\d{2})/);
  return match ? `${day} — ${toPersianDigits(match[1])}:${toPersianDigits(match[2])}` : day;
};

export const money = (value) => formatPersianNumber(Math.round(Number(value) || 0));

export const compactMoney = (value, currency = '') => {
  const amount = Number(value) || 0;
  if (!amount) return '—';
  if (Math.abs(amount) >= 1000000000) return `${formatPersianNumber((amount / 1000000000).toFixed(1))} میلیارد ${currency}`.trim();
  if (Math.abs(amount) >= 1000000) return `${formatPersianNumber((amount / 1000000).toFixed(1))} میلیون ${currency}`.trim();
  return `${formatPersianNumber(Math.round(amount))} ${currency}`.trim();
};

export const daysLabel = (days) => {
  if (days === null || days === undefined) return '—';
  if (days < 0) return `${toPersianDigits(Math.abs(days))} روز گذشته`;
  if (days === 0) return 'امروز';
  return `${toPersianDigits(days)} روز مانده`;
};

export const daysColor = (days) => {
  if (days === null || days === undefined) return SLATE;
  if (days < 0) return DANGER;
  if (days <= 7) return SOON;
  if (days <= 30) return WARN;
  return OK;
};

export const chipSx = (color, bg) => ({
  height: 20,
  fontSize: 10.5,
  fontWeight: 800,
  bgcolor: bg || alpha(color, 0.08),
  color,
  border: `1px solid ${alpha(color, 0.22)}`,
  '& .MuiChip-label': { px: 0.8 },
});

export const MetaChip = ({ meta, label, size = 'small' }) => (
  <Chip size={size} label={label || meta?.label || '—'} sx={chipSx(meta?.color || SLATE, meta?.bg)} />
);

export const daysBetween = (value) => {
  if (!value) return null;
  const target = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target - new Date()) / 86400000);
};

export const KpiTile = ({ label, value, hint, color, icon: Icon, onClick }) => (
  <Paper
    elevation={0}
    onClick={onClick}
    sx={{
      p: 1.15,
      borderRadius: '14px',
      border: '1px solid',
      borderColor: alpha(color, 0.2),
      bgcolor: alpha(color, 0.035),
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      minWidth: 0,
      overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'box-shadow .15s ease, transform .15s ease',
      '&:hover': onClick ? { boxShadow: `0 6px 18px ${alpha(color, 0.14)}`, transform: 'translateY(-1px)' } : undefined,
    }}
  >
    <Box sx={{
      width: 34, height: 34, borderRadius: '10px', flex: '0 0 auto',
      display: 'grid', placeItems: 'center', bgcolor: alpha(color, 0.12), color,
    }}>
      <Icon sx={{ fontSize: 18 }} />
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 700, color: SLATE }}>{label}</Typography>
      <Typography noWrap title={String(value)} sx={{
        fontSize: 14, fontWeight: 900, color,
        fontFamily: 'var(--hrms-table-number-font, inherit)',
      }}>
        {value}
      </Typography>
      {hint ? (
        <Typography noWrap sx={{ fontSize: 9.5, fontWeight: 600, color: SLATE }}>{hint}</Typography>
      ) : null}
    </Box>
  </Paper>
);

export const SectionPaper = ({ children, sx }) => (
  <Paper elevation={0} sx={{
    p: 1.25,
    borderRadius: '16px',
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: 'background.paper',
    boxShadow: 'none',
    minWidth: 0,
    overflow: 'hidden',
    ...sx,
  }}>
    {children}
  </Paper>
);

export const MiniRow = ({ onClick, children, sx }) => (
  <Box
    onClick={onClick}
    sx={{
      display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, overflow: 'hidden',
      px: 0.75, py: 0.55, borderRadius: '10px', cursor: onClick ? 'pointer' : 'default',
      border: '1px solid', borderColor: 'divider',
      '&:hover': onClick ? { bgcolor: alpha(ACCENT, 0.06) } : undefined,
      ...sx,
    }}
  >
    {children}
  </Box>
);

export const SectionTitle = ({ icon: Icon, title, hint, color = ACCENT, action }) => (
  <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap flexWrap="wrap"
    sx={{ mb: 1, minWidth: 0 }}>
    {Icon ? <Icon sx={{ fontSize: 17, color, flex: '0 0 auto' }} /> : null}
    <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 900, flex: '0 0 auto' }}>{title}</Typography>
    {hint ? (
      <Typography noWrap sx={{ fontSize: 10.5, color: SLATE, flex: '1 1 auto', minWidth: 0 }}>
        {hint}
      </Typography>
    ) : null}
    {action || null}
  </Stack>
);

