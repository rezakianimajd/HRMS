import React from 'react';
import {
  Box, Button, ButtonBase, Chip, CircularProgress, Grid, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ScheduleIcon from '@mui/icons-material/Schedule';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { CONTRACT_STATUS_COLORS } from '../../core/theme/tokens';
import { ProgressBar, SurfaceCard, INK, MUTED, SOFT_BG } from '../accounting/AccountingDashboardUI';
import { MetricBox, SectionHeading, dateLabel, money } from './StatementWorkspaceUI';

export const EXPIRING_ACCENT = '#f59e0b';
const RED = '#be123c';
const ORANGE = '#ea580c';
const AMBER = '#b45309';
const YELLOW = '#ca8a04';
const GREEN = '#0f766e';

export const effEnd = (contract) => {
  const dated = (Array.isArray(contract?.addendums) ? contract.addendums : []).filter((item) => item.new_end_date);
  const last = dated.length ? dated.reduce((latest, item) => (String(item.date || '') > String(latest.date || '') ? item : latest), dated[0]) : null;
  return last?.new_end_date || contract?.end_date || null;
};
export const effAmount = (contract) => Number(contract?.amount || 0)
  + (Array.isArray(contract?.addendums) ? contract.addendums : []).reduce((sum, item) => sum + Number(item.amount_change || 0), 0);
export const daysUntil = (value) => {
  if (!value) return null;
  const target = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / 86400000);
};
export const expiryMeta = (days) => {
  if (days === null) return { key: 'later', label: 'بدون تاریخ پایان', color: MUTED, bg: SOFT_BG, icon: CalendarMonthIcon };
  if (days < 0) return { key: 'expired', label: 'منقضی شده', color: RED, bg: '#fff1f2', icon: EventBusyIcon };
  if (days <= 30) return { key: 'soon30', label: 'انقضا تا ۳۰ روز', color: ORANGE, bg: '#fff7ed', icon: WarningAmberIcon };
  if (days <= 60) return { key: 'soon60', label: 'انقضا تا ۶۰ روز', color: AMBER, bg: '#fffbeb', icon: ScheduleIcon };
  if (days <= 90) return { key: 'soon90', label: 'انقضا تا ۹۰ روز', color: YELLOW, bg: '#fefce8', icon: NotificationsActiveIcon };
  return { key: 'later', label: 'بیش از ۹۰ روز', color: GREEN, bg: '#ecfdf5', icon: CalendarMonthIcon };
};
const urgency = (days) => (days === null ? 0 : days < 0 ? 100 : Math.max(0, Math.min(100, 100 - (days / 90) * 100)));

export const ExpiryCard = ({ contract, onOpen }) => {
  const theme = useTheme();
  const end = effEnd(contract);
  const days = daysUntil(end);
  const meta = expiryMeta(days);
  const Icon = meta.icon;
  const addendumCount = Array.isArray(contract.addendums) ? contract.addendums.length : 0;
  return (
    <Paper elevation={0} sx={{
      height: '100%', p: 1.4, borderRadius: '16px', border: `1px solid ${theme.palette.divider}`,
      bgcolor: theme.palette.background.paper, display: 'flex', flexDirection: 'column', gap: 0.85,
      borderTop: `3px solid ${meta.color}`,
      transition: 'box-shadow .18s ease, border-color .18s ease',
      '&:hover': { borderColor: alpha(meta.color, 0.32), boxShadow: `0 10px 24px ${alpha(meta.color, 0.07)}` },
    }}>
      <Stack direction="row" alignItems="flex-start" spacing={0.8}>
        <Box sx={{ width: 36, height: 36, borderRadius: '10px', flexShrink: 0, bgcolor: alpha(meta.color, 0.08), color: meta.color, border: `1px solid ${alpha(meta.color, 0.16)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon sx={{ fontSize: 19 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 12, fontWeight: 900, color: INK }}>{contract.subject || 'قرارداد'}</Typography>
          <Typography noWrap sx={{ fontSize: 12, color: MUTED }}>{contract.number || 'بدون شماره'} · {contract.party_name || 'طرف قرارداد'}</Typography>
        </Box>
        <Chip size="small" label={meta.label} sx={{ height: 21, fontSize: 12, fontWeight: 800, bgcolor: meta.bg, color: meta.color }} />
      </Stack>

      <Box sx={{ borderRadius: '11px', p: 0.9, bgcolor: alpha(meta.color, 0.035), border: `1px solid ${alpha(meta.color, 0.13)}` }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Box>
            <Typography sx={{ fontSize: 12, color: MUTED }}>تاریخ پایان مؤثر</Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: meta.color }}>{dateLabel(end)}</Typography>
          </Box>
          <Chip size="small" label={days === null ? '—' : days < 0 ? `${toPersianDigits(Math.abs(days))} روز گذشته` : days === 0 ? 'امروز' : `${toPersianDigits(days)} روز مانده`}
            sx={{ height: 22, fontSize: 12, fontWeight: 900, bgcolor: meta.bg, color: meta.color }} />
        </Stack>
      </Box>

      <Grid container spacing={0.55}>
        <Grid item xs={7}><MetricBox label="مبلغ مؤثر" value={money(effAmount(contract), contract.currency_name || contract.currency_symbol || 'ریال')} color={AMBER} /></Grid>
        <Grid item xs={5}><MetricBox label="الحاقیه‌ها" value={formatPersianNumber(addendumCount)} color={contract.status === 'active' ? GREEN : MUTED} /></Grid>
      </Grid>

      <Box>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.35 }}>
          <Typography sx={{ fontSize: 12, color: MUTED }}>درجه فوریت</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: meta.color }}>{toPersianDigits(urgency(days).toFixed(0))}٪</Typography>
        </Stack>
        <ProgressBar value={urgency(days)} color={meta.color} height={5} />
      </Box>

      <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap" sx={{ mt: 'auto' }}>
        <Chip size="small" label={contract.status_display || contract.status || 'بدون وضعیت'}
          sx={{ height: 18, fontSize: 12, bgcolor: alpha(CONTRACT_STATUS_COLORS[contract.status] || MUTED, 0.08), color: CONTRACT_STATUS_COLORS[contract.status] || MUTED }} />
        <Chip size="small" icon={<CalendarMonthIcon sx={{ fontSize: '12px !important' }} />} label={`شروع ${dateLabel(contract.start_date)}`}
          sx={{ height: 18, fontSize: 12, bgcolor: SOFT_BG, color: MUTED, '& .MuiChip-icon': { color: MUTED } }} />
      </Stack>

      <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => onOpen(contract)} sx={{ alignSelf: 'flex-start', fontSize: 12, minWidth: 0 }}>پرونده قرارداد</Button>
    </Paper>
  );
};

export const ExpiryTable = ({ rows, onOpen }) => {
  const theme = useTheme();
  const headSx = { fontWeight: 800, fontSize: 12, color: '#334155', bgcolor: '#f8fafc', whiteSpace: 'nowrap', py: 1 };
  const cellSx = { fontSize: 12, whiteSpace: 'nowrap', py: 0.8, borderBottom: '1px solid #eef2f7' };
  return (
    <Paper elevation={0} sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 560 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {['قرارداد', 'طرف قرارداد', 'تاریخ پایان', 'روز مانده', 'مبلغ مؤثر', 'الحاقیه', 'وضعیت', 'اقدام'].map((label) => (
                <TableCell key={label} sx={headSx} align={label === 'اقدام' ? 'center' : 'right'}>{label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((contract) => {
              const end = effEnd(contract);
              const days = daysUntil(end);
              const meta = expiryMeta(days);
              return (
                <TableRow key={contract.id} hover>
                  <TableCell sx={{ ...cellSx, fontWeight: 800 }}>{contract.subject || '—'}<Typography component="span" sx={{ display: 'block', fontSize: 12, color: MUTED, fontWeight: 500 }}>{contract.number || '—'}</Typography></TableCell>
                  <TableCell sx={cellSx}>{contract.party_name || '—'}</TableCell>
                  <TableCell sx={cellSx}>{dateLabel(end)}</TableCell>
                  <TableCell sx={{ ...cellSx, color: meta.color, fontWeight: 800 }}>{days === null ? '—' : days < 0 ? `${toPersianDigits(Math.abs(days))} روز گذشته` : `${toPersianDigits(days)} روز`}</TableCell>
                  <TableCell sx={cellSx}>{money(effAmount(contract), contract.currency_name || contract.currency_symbol || 'ریال')}</TableCell>
                  <TableCell sx={cellSx}>{formatPersianNumber(Array.isArray(contract.addendums) ? contract.addendums.length : 0)}</TableCell>
                  <TableCell sx={cellSx}><Chip size="small" label={meta.label} sx={{ height: 19, fontSize: 12, bgcolor: meta.bg, color: meta.color, fontWeight: 800 }} /></TableCell>
                  <TableCell sx={{ ...cellSx, textAlign: 'center' }}><Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => onOpen(contract)} sx={{ fontSize: 12 }}>پرونده</Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export const ExpirySummaryCard = ({ counts, total, laterCount, isLoading }) => {
  const ranges = [
    { key: 'expired', label: 'منقضی‌شده', color: RED },
    { key: 'soon30', label: 'تا ۳۰ روز', color: ORANGE },
    { key: 'soon60', label: 'تا ۶۰ روز', color: AMBER },
    { key: 'soon90', label: 'تا ۹۰ روز', color: YELLOW },
  ];
  return (
    <SurfaceCard title="توزیع بازه‌های انقضا" icon={NotificationsActiveIcon} color={EXPIRING_ACCENT}
      action={<Chip size="small" label={`${formatPersianNumber(total)} قرارداد`} sx={{ height: 21, fontSize: 12, bgcolor: alpha(EXPIRING_ACCENT, 0.08), color: AMBER, fontWeight: 800 }} />}>
      {isLoading ? <Box sx={{ py: 3, textAlign: 'center' }}><CircularProgress size={20} /></Box> : (
        <Stack spacing={0.85}>
          {ranges.map((range) => {
            const count = counts[range.key] || 0;
            const percent = total > 0 ? (count / total) * 100 : 0;
            return (
              <Box key={range.key}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.3 }}>
                  <Typography sx={{ fontSize: 12, color: INK, fontWeight: 700 }}>{range.label}</Typography>
                  <Typography sx={{ fontSize: 12, color: range.color, fontWeight: 900 }}>{formatPersianNumber(count)}</Typography>
                </Stack>
                <ProgressBar value={percent} color={range.color} height={5} />
              </Box>
            );
          })}
          {laterCount > 0 ? (
            <Typography sx={{ fontSize: 12, color: MUTED, pt: 0.2 }}>{formatPersianNumber(laterCount)} قرارداد بیش از ۹۰ روز اعتبار دارد.</Typography>
          ) : null}
        </Stack>
      )}
    </SurfaceCard>
  );
};

export const ExpiryUrgentCard = ({ rows, onOpen }) => (
  <SurfaceCard title="فوری‌ترین قراردادها" icon={WarningAmberIcon} color={RED}
    action={<Chip size="small" label={formatPersianNumber(rows.length)} sx={{ height: 20, fontSize: 12, bgcolor: '#fff1f2', color: RED, fontWeight: 800 }} />}>
    {rows.length ? (
      <Stack spacing={0.5}>
        {rows.map((contract) => {
          const days = daysUntil(effEnd(contract));
          const meta = expiryMeta(days);
          const Icon = meta.icon;
          return (
            <ButtonBase key={contract.id} onClick={() => onOpen(contract)}
              sx={{ width: '100%', p: 0.8, borderRadius: '10px', justifyContent: 'flex-start', textAlign: 'right', border: '1px solid #f1f5f9', bgcolor: '#fff', '&:hover': { bgcolor: meta.bg, borderColor: alpha(meta.color, 0.25) } }}>
              <Stack direction="row" alignItems="center" spacing={0.7} sx={{ width: '100%' }}>
                <Box sx={{ width: 27, height: 27, borderRadius: '8px', bgcolor: meta.bg, color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon sx={{ fontSize: 15 }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{contract.subject || 'قرارداد'}</Typography>
                  <Typography noWrap sx={{ fontSize: 12, color: MUTED }}>{dateLabel(effEnd(contract))} · {contract.party_name || '—'}</Typography>
                </Box>
                <Chip size="small" label={days === null ? '—' : days < 0 ? `${toPersianDigits(Math.abs(days))} روز گذشته` : `${toPersianDigits(days)} روز`}
                  sx={{ height: 19, fontSize: 12, bgcolor: meta.bg, color: meta.color, fontWeight: 800 }} />
              </Stack>
            </ButtonBase>
          );
        })}
      </Stack>
    ) : (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <CalendarMonthIcon sx={{ fontSize: 30, color: GREEN, mb: 0.6 }} />
        <Typography sx={{ fontSize: 12, color: MUTED }}>قرارداد فوری در بازه ۹۰ روز وجود ندارد.</Typography>
      </Box>
    )}
  </SurfaceCard>
);

// __APPEND__
