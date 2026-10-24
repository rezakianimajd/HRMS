import React from 'react';
import { Box, Typography, Stack, Chip, ButtonBase } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DrawIcon from '@mui/icons-material/Draw';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import EditNoteIcon from '@mui/icons-material/EditNote';
import LockIcon from '@mui/icons-material/Lock';
import PaymentsIcon from '@mui/icons-material/Payments';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';
import {
  KpiTile as ThemeKpiTile,
  ProgressBar as ThemeProgressBar,
  SurfaceCard as ThemeSurfaceCard,
} from '../accounting/AccountingDashboardUI';

export const CARD_BG = '#ffffff';
export const CARD_BORDER = '#e8edf4';
export const SOFT_BG = '#f8fafc';
export const INK = '#0f172a';
export const MUTED = '#64748b';

export const clampPercent = (value) => Math.max(0, Math.min(100, Number(value) || 0));

export const SectionCard = ({ title, color = '#f59e0b', icon: Icon, action, children, sx, contentSx }) => (
  <ThemeSurfaceCard
    title={title}
    icon={Icon}
    color={color}
    action={action}
    sx={sx}
    contentSx={contentSx || { p: 2 }}
  >
    {children}
  </ThemeSurfaceCard>
);

export const ProgressBar = ({ value, color = '#f59e0b', height = 8, track = '#eef2f7' }) => (
  <ThemeProgressBar value={value} color={color} height={height} track={track} />
);

export const KpiCard = ({
  icon: Icon, label, value, suffix, hint, color = '#f59e0b',
  progress, progressLabel, size = 20,
}) => (
  <ThemeKpiTile
    icon={Icon}
    label={label}
    value={toPersianDigits(value)}
    suffix={suffix}
    hint={hint}
    color={color}
    progress={progress}
    progressLabel={progressLabel}
    size={size}
  />
);

export const DetailTile = ({ label, value, ltr }) => (
  <Box sx={{ p: 1.25, minHeight: 60, borderRadius: '12px', bgcolor: SOFT_BG, border: '1px solid #eef2f7', minWidth: 0 }}>
    <Typography sx={{ fontSize: 12, color: MUTED, mb: 0.3 }}>{label}</Typography>
    <Typography sx={{
      fontSize: 12.2, fontWeight: 700, color: INK, wordBreak: 'break-word',
      direction: 'rtl', textAlign: 'right',
    }}>
      {value || '—'}
    </Typography>
  </Box>
);
export const FinancialDonut = ({ paid = 0, remaining = 0, size = 168, thickness = 20 }) => {
  const total = Number(paid) + Number(remaining);
  const percent = total > 0 ? Math.round((Number(paid) / total) * 100) : 0;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;

  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eef2f7" strokeWidth={thickness} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#0ea5e9" strokeWidth={thickness}
          strokeDasharray={`${dash} ${circumference - dash}`} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: 24, fontWeight: 900, color: INK, lineHeight: 1.1 }}>{toPersianDigits(percent)}٪</Typography>
        <Typography sx={{ fontSize: 12, color: MUTED, mt: 0.3 }}>پرداخت‌شده</Typography>
      </Box>
    </Box>
  );
};

export const MoneyBar = ({ label, value, total, color, suffix }) => {
  const percent = Number(total) > 0 ? (Number(value) / Number(total)) * 100 : 0;
  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} useFlexGap sx={{ mb: 0.5 }}>
        <Stack direction="row" alignItems="center" spacing={0.6} useFlexGap>
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color }} />
          <Typography sx={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>{label}</Typography>
        </Stack>
        <Typography sx={{ fontSize: 12, color: INK, fontWeight: 800, whiteSpace: 'nowrap' }}>
          {formatPersianNumber(value)} <Box component="span" sx={{ color: MUTED, fontWeight: 500 }}>{suffix}</Box>
        </Typography>
      </Stack>
      <ProgressBar value={percent} color={color} height={6} />
    </Box>
  );
};

export const EffectMetric = ({ label, value, base, rawValue = 0, rawBase = 0, color, icon: Icon, isDate }) => {
  const max = Math.max(Number(rawValue) || 0, Number(rawBase) || 0, 1);
  const basePercent = ((Number(rawBase) || 0) / max) * 100;
  const currentPercent = ((Number(rawValue) || 0) / max) * 100;
  const delta = !isDate && Number(rawBase) > 0 ? Math.round(((Number(rawValue) - Number(rawBase)) / Number(rawBase)) * 100) : null;

  return (
    <Box sx={{ p: 1.5, height: '100%', borderRadius: '14px', border: '1px solid #eef2f7', bgcolor: '#fff' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.75} useFlexGap>
        <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap>
          <Box sx={{
            width: 30, height: 30, borderRadius: '9px', bgcolor: `${color}10`, color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon sx={{ fontSize: 16 }} />
          </Box>
          <Typography sx={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>{label}</Typography>
        </Stack>
        {delta !== null ? (
          <Chip size="small" label={`${delta >= 0 ? '+' : ''}${toPersianDigits(delta)}٪`}
            sx={{ height: 19, fontSize: 12, fontWeight: 800, bgcolor: delta >= 0 ? '#eff6ff' : '#fff1f2', color: delta >= 0 ? '#1d4ed8' : '#be123c' }} />
        ) : null}
      </Stack>

      <Typography sx={{ mt: 1, fontSize: 15, fontWeight: 900, color: INK, direction: 'rtl', textAlign: 'right' }}>
        {value}
      </Typography>
      <Typography sx={{ mt: 0.3, fontSize: 12, color: MUTED }}>پایه: {base}</Typography>

      {isDate ? null : (
        <Stack spacing={0.45} sx={{ mt: 0.8 }}>
          <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap>
            <Typography sx={{ width: 25, fontSize: 12, color: MUTED }}>پایه</Typography>
            <Box sx={{ flex: 1 }}><ProgressBar value={basePercent} color="#cbd5e1" height={4} /></Box>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap>
            <Typography sx={{ width: 25, fontSize: 12, color: MUTED }}>مؤثر</Typography>
            <Box sx={{ flex: 1 }}><ProgressBar value={currentPercent} color={color} height={4} /></Box>
          </Stack>
        </Stack>
      )}
    </Box>
  );
};

export const ActionTile = ({ icon: Icon, label, count = 0, color, onClick }) => (
  <ButtonBase onClick={onClick} sx={{
    width: '100%', textAlign: 'right', p: 1.25, borderRadius: '14px',
    border: `1px solid ${CARD_BORDER}`, bgcolor: CARD_BG, display: 'flex',
    alignItems: 'center', justifyContent: 'flex-start', gap: 1.1,
    '&:hover': { borderColor: `${color}66`, bgcolor: `${color}06` },
  }}>
    <Box sx={{
      width: 38, height: 38, flexShrink: 0, borderRadius: '11px', bgcolor: `${color}0f`,
      color, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon sx={{ fontSize: 19 }} />
    </Box>
    <Box sx={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
      <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{label}</Typography>
      <Typography sx={{ fontSize: 12, color: MUTED, mt: 0.15 }}>{toPersianDigits(count)} مورد</Typography>
    </Box>
    <ChevronLeftIcon sx={{ fontSize: 17, color: '#cbd5e1', flexShrink: 0 }} />
  </ButtonBase>
);

export const CountTile = ({ icon: Icon, label, value, color }) => (
  <Box sx={{ p: 1.2, borderRadius: '12px', border: '1px solid #eef2f7', bgcolor: SOFT_BG }}>
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <Box sx={{ width: 30, height: 30, borderRadius: '9px', bgcolor: `${color}10`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon sx={{ fontSize: 16 }} />
      </Box>
      <Typography sx={{ fontSize: 18, fontWeight: 900, color: INK }}>{toPersianDigits(value)}</Typography>
    </Stack>
    <Typography sx={{ mt: 0.6, fontSize: 12, color: MUTED }}>{label}</Typography>
  </Box>
);

export const EmptyState = ({ icon: Icon = DescriptionOutlinedIcon, text }) => (
  <Box sx={{ py: 3.5, textAlign: 'center' }}>
    <Box sx={{ width: 46, height: 46, mx: 'auto', mb: 1, borderRadius: '14px', bgcolor: SOFT_BG, color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon sx={{ fontSize: 22 }} />
    </Box>
    <Typography sx={{ fontSize: 12, color: MUTED }}>{text}</Typography>
  </Box>
);

const timelineColors = {
  created: '#64748b', signing: '#0ea5e9', start: '#6366f1', end: '#e11d48',
  invoice: '#8b5cf6', statement: '#3b82f6', addendum: '#ec4899',
  guarantee: '#f59e0b', 'guarantee-expiry': '#e11d48', payment: '#0891b2', document: '#f97316',
};

const timelineIcons = {
  created: AddCircleOutlineIcon,
  signing: DrawIcon,
  start: PlayCircleOutlineIcon,
  end: EventBusyIcon,
  invoice: ReceiptIcon,
  statement: ReceiptLongIcon,
  addendum: EditNoteIcon,
  guarantee: LockIcon,
  'guarantee-expiry': EventBusyIcon,
  payment: PaymentsIcon,
  document: FolderOpenIcon,
};

export const TimelineList = ({ events = [], maxHeight = 420 }) => (
  <Box sx={{ maxHeight, overflowY: 'auto', pr: 0.5 }}>
    {events.map((ev, index) => {
      const color = timelineColors[ev.type] || '#6366f1';
      const Icon = timelineIcons[ev.type] || AddCircleOutlineIcon;
      return (
        <Box key={`${ev.type}-${ev.date}-${index}`} sx={{ display: 'flex', alignItems: 'stretch', gap: 1.2, pb: index === events.length - 1 ? 0 : 1.1 }}>
          <Box sx={{ width: 32, flexShrink: 0, position: 'relative' }}>
            {index !== events.length - 1 ? (
              <Box sx={{ position: 'absolute', top: 32, bottom: -12, left: '50%', width: 2, bgcolor: '#eef2f7', transform: 'translateX(-50%)' }} />
            ) : null}
            <Box sx={{
              position: 'relative', zIndex: 1, width: 30, height: 30, borderRadius: '10px',
              bgcolor: CARD_BG, border: `1px solid ${color}44`, color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon sx={{ fontSize: 15 }} />
            </Box>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0, p: 1.15, borderRadius: '11px', bgcolor: SOFT_BG, border: '1px solid #eef2f7' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.75} useFlexGap>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{ev.title}</Typography>
              <Typography sx={{ fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>{toJalali(ev.date)}</Typography>
            </Stack>
            {ev.extra ? <Typography sx={{ mt: 0.25, fontSize: 12, color: MUTED }}>{ev.extra}</Typography> : null}
          </Box>
        </Box>
      );
    })}
  </Box>
);

