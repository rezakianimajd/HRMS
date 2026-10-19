import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../../core/api/axiosConfig';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, Grid, IconButton, InputLabel, MenuItem,
  Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';
import EventIcon from '@mui/icons-material/Event';
import GavelIcon from '@mui/icons-material/Gavel';
import InsightsIcon from '@mui/icons-material/Insights';
import LockIcon from '@mui/icons-material/Lock';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import PrintIcon from '@mui/icons-material/Print';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShieldIcon from '@mui/icons-material/Shield';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { alpha, useTheme } from '@mui/material/styles';
import {
  formatPersianNumber, formatPersianPercent, toPersianDigits,
} from '../../../core/utils/numberUtils';
import { toJalali } from '../../../core/utils/dateUtils';
import JalaliDatePicker from '../../../core/components/ui/JalaliDatePicker';
import PageHeader from '../../../core/components/ui/PageHeader';
import { ProgressBar, SurfaceCard } from '../AccountingDashboardUI';
import { useModulePalette } from '../../../core/context/ModulePaletteContext';
import { DEFAULT_TYPOGRAPHY } from '../../../core/theme/appearanceDefaults';

const TONE = {
  asset: '#2563eb',
  liability: '#e11d48',
  equity: '#0f766e',
  audit: '#7c3aed',
  info: '#0e7490',
  neutral: '#475569',
  warning: '#d97706',
};

const money = (value) => formatPersianNumber(value || 0);
const pct = (value) => formatPersianPercent(value || 0);
const jalali = (iso) => (iso ? toJalali(iso) : '—');
const ratioText = (value, digits = 2) => toPersianDigits(Number(value || 0).toFixed(digits));

const InfoField = ({ label, value, color }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  return (
    <Box>
      <Typography sx={{ fontSize: Math.max(type.bodySize - 2, 9.5), color: theme.palette.text.secondary, mb: 0.2 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: Math.max(type.bodySize, 11.5), fontWeight: 800, color: color || theme.palette.text.primary }}>
        {value}
      </Typography>
    </Box>
  );
};

const MetricTile = ({ icon: Icon, label, value, hint, color, progress, progressLabel }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  return (
    <Paper elevation={0} sx={{
      p: 1.4, height: '100%', borderRadius: '16px', bgcolor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`, display: 'flex', flexDirection: 'column', gap: 0.75,
    }}>
      <Stack direction="row" alignItems="center" spacing={0.9} useFlexGap>
        <Box sx={{
          width: 34, height: 34, flexShrink: 0, borderRadius: '10px', color,
          bgcolor: alpha(color, 0.08), border: `1px solid ${alpha(color, 0.17)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon sx={{ fontSize: 18 }} />
        </Box>
        <Typography sx={{
          flex: 1, minWidth: 0, fontSize: Math.max(type.bodySize - 1, 10.5),
          color: theme.palette.text.secondary, fontWeight: 600, lineHeight: 1.45,
        }}>
          {label}
        </Typography>
      </Stack>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, flexWrap: 'wrap' }}>
        <Typography sx={{
          fontSize: Math.max(type.cardSize + 2, 17), fontWeight: 900, lineHeight: 1.35,
          color: theme.palette.text.primary, fontVariantNumeric: 'tabular-nums', direction: 'rtl',
        }}>
          {value}
        </Typography>
        <Typography sx={{ fontSize: Math.max(type.bodySize - 2, 9.5), color: theme.palette.text.secondary }}>
          ریال
        </Typography>
      </Box>
      {hint ? (
        <Typography sx={{ fontSize: Math.max(type.bodySize - 2, 9.5), color: theme.palette.text.secondary }}>
          {hint}
        </Typography>
      ) : null}
      {progress !== undefined && progress !== null ? (
        <Box sx={{ mt: 0.15 }}>
          <ProgressBar value={progress} color={color} height={5} />
          {progressLabel ? (
            <Typography sx={{ mt: 0.35, fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary }}>
              {progressLabel}
            </Typography>
          ) : null}
        </Box>
      ) : null}
    </Paper>
  );
};

const BalanceStatus = ({ balanced, difference, compact = false, short = false }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const color = balanced ? TONE.equity : theme.palette.error.main;
  const label = short
    ? (balanced ? 'تراز است' : 'ناتراز')
    : (balanced ? 'معادلهٔ حسابداری تراز است' : `ناتراز — اختلاف ${money(difference)} ریال`);
  return (
    <Chip
      size="small"
      icon={balanced ? <CheckCircleIcon /> : <WarningAmberIcon />}
      label={label}
      sx={{
        height: compact ? 25 : 28, fontSize: Math.max(type.bodySize - 2, 10), fontWeight: 800,
        bgcolor: alpha(color, 0.08), color, border: `1px solid ${alpha(color, 0.22)}`,
        '& .MuiChip-icon': { color, fontSize: 15 },
      }}
    />
  );
};

const MetaItem = ({ icon: Icon, label, value, hint, color }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
      <Box sx={{
        width: 30, height: 30, flexShrink: 0, borderRadius: '9px', color,
        bgcolor: alpha(color, 0.08), border: `1px solid ${alpha(color, 0.16)}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon sx={{ fontSize: 16 }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary }}>
          {label}
        </Typography>
        <Typography noWrap sx={{ fontSize: Math.max(type.bodySize - 1, 10.5), fontWeight: 800, color: theme.palette.text.primary }}>
          {value}
        </Typography>
        {hint ? (
          <Typography noWrap sx={{ fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary }}>
            {hint}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
};

const SnapshotBar = ({ data, balanced, difference, accent }) => {
  const theme = useTheme();
  const year = data?.fiscal_year;
  return (
    <Paper elevation={0} sx={{
      p: 1.25, mb: 1.5, borderRadius: '16px', bgcolor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
    }}>
      <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" alignItems="center">
        <MetaItem
          icon={CalendarMonthIcon}
          label="سال مالی"
          value={year?.name ? toPersianDigits(year.name) : 'همهٔ دوره‌ها'}
          hint={year ? `${jalali(year.start_date)} تا ${jalali(year.end_date)}` : 'بدون محدودیت سال مالی'}
          color={accent}
        />
        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
        <MetaItem
          icon={EventIcon}
          label="تا تاریخ"
          value={data?.as_of ? jalali(data.as_of) : 'امروز'}
          hint="مبنای مانده‌های گزارش"
          color={TONE.info}
        />
        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
        <MetaItem
          icon={AccessTimeIcon}
          label="تولید گزارش"
          value={data?.generated_at ? jalali(String(data.generated_at).slice(0, 10)) : '—'}
          hint="آخرین محاسبهٔ سرور"
          color={TONE.neutral}
        />
        <Box sx={{ flex: 1, minWidth: 8 }} />
        <BalanceStatus balanced={balanced} difference={difference} />
      </Stack>
    </Paper>
  );
};

const BalanceSection = ({ title, subtitle, icon, tone, total, groups, emptyText, compact = false }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const color = TONE[tone];
  const accountCount = groups.reduce(
    (sum, group) => sum + (group.rows || []).filter((row) => !row.is_synthetic).length,
    0,
  );
  const headSx = {
    fontSize: Math.max(type.bodySize - 3, 9), fontWeight: 800, color: theme.palette.text.primary,
    bgcolor: theme.palette.action.hover, borderBottom: `1px solid ${theme.palette.divider}`,
    whiteSpace: 'nowrap', py: 0.9, px: 1,
  };
  const cellSx = {
    fontSize: Math.max(type.bodySize - 2, 10.5), borderBottom: `1px solid ${theme.palette.divider}`,
    whiteSpace: 'nowrap', py: 0.55, px: 1, color: theme.palette.text.primary,
  };
  return (
    <SurfaceCard
      title={title}
      icon={icon}
      color={color}
      sx={{ height: compact ? 'auto' : '100%' }}
      contentSx={{ p: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}
      action={(
        <Stack direction="row" spacing={0.5} useFlexGap>
          <Chip
            size="small"
            label={`${toPersianDigits(groups.length)} گروه`}
            sx={{ height: 22, fontSize: Math.max(type.bodySize - 3, 9), fontWeight: 800, bgcolor: alpha(color, 0.08), color }}
          />
          <Chip
            size="small"
            label={`${toPersianDigits(accountCount)} حساب`}
            sx={{ height: 22, fontSize: Math.max(type.bodySize - 3, 9), fontWeight: 700, bgcolor: theme.palette.action.hover, color: theme.palette.text.secondary }}
          />
        </Stack>
      )}
    >
      <Box sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography sx={{ fontSize: Math.max(type.bodySize - 2, 10), color: theme.palette.text.secondary }}>
          {subtitle}
        </Typography>
      </Box>
      {groups.length === 0 ? (
        <Box sx={{ py: 5, px: 2, textAlign: 'center', flex: 1 }}>
          <DescriptionIcon sx={{ fontSize: 26, color: theme.palette.text.disabled, mb: 0.75 }} />
          <Typography sx={{ fontSize: Math.max(type.bodySize - 1, 10.5), color: theme.palette.text.secondary }}>
            {emptyText}
          </Typography>
        </Box>
      ) : (
        <TableContainer sx={{
          maxHeight: compact ? 292 : 486, minHeight: 0,
          '@media print': { maxHeight: 'none', overflow: 'visible' },
        }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ ...headSx, width: 82 }}>کد</TableCell>
                <TableCell sx={{ ...headSx, minWidth: 170 }}>گروه / حساب</TableCell>
                <TableCell align="left" sx={{ ...headSx, width: 135 }}>مانده (ریال)</TableCell>
                <TableCell align="left" sx={{ ...headSx, width: 72 }}>سهم</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((group) => (
                <React.Fragment key={`${group.code}-${group.name}`}>
                  <TableRow sx={{ bgcolor: alpha(color, 0.055) }}>
                    <TableCell align="center" sx={{ ...cellSx, fontWeight: 800, color }}>
                      {group.code ? toPersianDigits(group.code) : '—'}
                    </TableCell>
                    <TableCell sx={{ ...cellSx, fontWeight: 800, color: theme.palette.text.primary, whiteSpace: 'normal' }}>
                      {group.name}
                    </TableCell>
                    <TableCell align="left" sx={{ ...cellSx, fontWeight: 900, color }}>
                      {money(group.total)}
                    </TableCell>
                    <TableCell align="left" sx={{ ...cellSx }}>
                      <Chip
                        size="small"
                        label={pct(group.percent)}
                        sx={{ height: 20, fontSize: Math.max(type.bodySize - 4, 8.5), fontWeight: 800, bgcolor: alpha(color, 0.08), color }}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={4} sx={{ p: 0, border: 0 }}>
                      <ProgressBar
                        value={Math.min(Math.abs(group.percent || 0), 100)}
                        color={color}
                        height={3}
                        track={alpha(color, 0.07)}
                      />
                    </TableCell>
                  </TableRow>
                  {(group.rows || []).map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell align="center" sx={{
                        ...cellSx, color: theme.palette.text.secondary, direction: 'ltr',
                        fontSize: Math.max(type.bodySize - 3, 9.5),
                      }}>
                        {row.code ? toPersianDigits(row.code) : '—'}
                      </TableCell>
                      <TableCell sx={{ ...cellSx, pl: 2.25, whiteSpace: 'normal' }}>
                        <Stack direction="row" spacing={0.5} alignItems="center" useFlexGap flexWrap="wrap">
                          <Typography sx={{ fontSize: Math.max(type.bodySize - 1, 10.5), color: theme.palette.text.primary }}>
                            {row.name}
                          </Typography>
                          {row.is_synthetic ? (
                            <Chip
                              size="small"
                              label="محاسبه‌شده"
                              sx={{ height: 18, fontSize: 8.5, fontWeight: 700, bgcolor: alpha(TONE.warning, 0.08), color: TONE.warning }}
                            />
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell align="left" sx={{
                        ...cellSx, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                        color: Number(row.balance) < 0 ? theme.palette.error.main : theme.palette.text.primary,
                      }}>
                        {money(row.balance)}
                      </TableCell>
                      <TableCell align="left" sx={{ ...cellSx, color: theme.palette.text.secondary }}>
                        {pct(row.share)}
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Box sx={{
        px: 1.5, py: 1.15, mt: 'auto', borderTop: `1px solid ${theme.palette.divider}`,
        bgcolor: alpha(color, 0.035), display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 1, flexWrap: 'wrap',
      }}>
        <Typography sx={{ fontSize: Math.max(type.bodySize, 11), fontWeight: 800, color: theme.palette.text.primary }}>
          جمع {title}
        </Typography>
        <Typography sx={{ fontSize: Math.max(type.cardSize, 13), fontWeight: 900, color, fontVariantNumeric: 'tabular-nums' }}>
          {money(total)} <Typography component="span" sx={{ fontSize: Math.max(type.bodySize - 2, 9.5), fontWeight: 500, color: theme.palette.text.secondary }}>ریال</Typography>
        </Typography>
      </Box>
    </SurfaceCard>
  );
};

const IntegrityItem = ({ icon: Icon, label, value, tone }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  return (
    <Box sx={{
      p: 0.9, borderRadius: '11px', bgcolor: alpha(tone, 0.055),
      border: `1px solid ${alpha(tone, 0.16)}`, minWidth: 0,
    }}>
      <Stack direction="row" spacing={0.5} alignItems="center" useFlexGap>
        <Icon sx={{ fontSize: 14, color: tone, flexShrink: 0 }} />
        <Typography noWrap sx={{ fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary }}>
          {label}
        </Typography>
      </Stack>
      <Typography sx={{ mt: 0.15, fontSize: Math.max(type.statSize, 13), fontWeight: 900, color: tone }}>
        {toPersianDigits(value || 0)}
      </Typography>
    </Box>
  );
};

const AuditCard = ({ audit, audited, onRecord }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const approval = audit?.approval || null;
  const integrity = audit?.integrity || {};
  const tone = audited
    ? TONE.equity
    : (approval ? (approval.status === 'rejected' ? theme.palette.error.main : TONE.warning) : TONE.neutral);
  const pending = Number(integrity.pending_approval || 0);
  const unbalanced = Number(integrity.unbalanced_documents || 0);
  const isClean = integrity.is_clean !== undefined
    ? Boolean(integrity.is_clean)
    : pending === 0 && unbalanced === 0;
  const statusText = audited
    ? 'تأیید نهایی حسابرسی'
    : approval
      ? (approval.status === 'rejected' ? 'تأیید حسابرسی رد شده است' : 'تأیید ثبت‌شده؛ نیازمند کنترل نهایی')
      : 'تأیید حسابرسی ثبت نشده است';
  const subtitle = approval
    ? `${approval.auditor_name}${approval.audit_firm ? ` — ${approval.audit_firm}` : ''}`
    : 'برای درج مهر تأیید، اطلاعات حسابرس و تاریخ تأیید را ثبت کنید.';
  return (
    <SurfaceCard
      title="مهر تأیید حسابرسی"
      icon={VerifiedIcon}
      color={TONE.audit}
      sx={{ height: '100%' }}
      contentSx={{ p: 2 }}
      action={(
        <Chip
          size="small"
          label={approval?.status_display || 'بدون تأیید'}
          sx={{ height: 23, fontSize: Math.max(type.bodySize - 3, 9), fontWeight: 800, bgcolor: alpha(tone, 0.08), color: tone }}
        />
      )}
    >
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Box sx={{
          width: 46, height: 46, flexShrink: 0, borderRadius: '14px', color: tone,
          bgcolor: alpha(tone, 0.08), border: `1px solid ${alpha(tone, 0.18)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {audited ? <VerifiedIcon sx={{ fontSize: 26 }} /> : <GavelIcon sx={{ fontSize: 24 }} />}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: Math.max(type.cardSize - 1, 12.5), fontWeight: 900, color: theme.palette.text.primary }}>
            {statusText}
          </Typography>
          <Typography sx={{ fontSize: Math.max(type.bodySize - 2, 9.8), color: theme.palette.text.secondary, mt: 0.2 }}>
            {subtitle}
          </Typography>
        </Box>
      </Stack>

      {approval ? (
        <Grid container spacing={1.25} sx={{ mt: 1.5 }}>
          <Grid item xs={6} md={3}><InfoField label="شمارهٔ گزارش / نامه" value={toPersianDigits(approval.reference_no) || '—'} /></Grid>
          <Grid item xs={6} md={3}><InfoField label="تاریخ تأیید" value={jalali(approval.approved_at)} /></Grid>
          <Grid item xs={6} md={3}><InfoField label="سال مالی" value={toPersianDigits(approval.fiscal_year_name) || '—'} /></Grid>
          <Grid item xs={6} md={3}><InfoField label="تهیه‌کننده" value={approval.prepared_by_name || '—'} /></Grid>
          {approval.opinion_note ? (
            <Grid item xs={12}>
              <Box sx={{ p: 1.1, borderRadius: '11px', bgcolor: theme.palette.action.hover, border: `1px dashed ${theme.palette.divider}` }}>
                <Typography sx={{ fontSize: Math.max(type.bodySize - 1, 10.5), color: theme.palette.text.primary, lineHeight: 1.9 }}>
                  {approval.opinion_note}
                </Typography>
              </Box>
            </Grid>
          ) : null}
        </Grid>
      ) : (
        <Box sx={{ mt: 1.25, p: 1, borderRadius: '11px', bgcolor: theme.palette.action.hover, border: `1px dashed ${theme.palette.divider}` }}>
          <Typography sx={{ fontSize: Math.max(type.bodySize - 2, 9.8), color: theme.palette.text.secondary, lineHeight: 1.9 }}>
            پس از کنترل اسناد و مانده‌ها، تأیید حسابرس را ثبت کنید تا مهر تأیید روی این صورت مالی درج شود.
          </Typography>
        </Box>
      )}

      <Divider sx={{ my: 1.5 }} />
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.8 }}>
        <ShieldIcon sx={{ fontSize: 16, color: TONE.audit }} />
        <Typography sx={{ fontSize: Math.max(type.bodySize - 1, 10.5), fontWeight: 800, color: theme.palette.text.primary }}>
          کنترل صحت داده‌های مبنا
        </Typography>
        <Chip
          size="small"
          label={isClean ? 'پاک' : 'نیازمند بررسی'}
          sx={{ height: 20, fontSize: 8.5, fontWeight: 800, bgcolor: alpha(isClean ? TONE.equity : TONE.warning, 0.08), color: isClean ? TONE.equity : TONE.warning }}
        />
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 0.75 }}>
        <IntegrityItem icon={LockIcon} label="ثبت‌شده / قفل" value={integrity.posted} tone={TONE.info} />
        <IntegrityItem icon={PendingActionsIcon} label="در انتظار تأیید" value={integrity.pending_approval} tone={pending ? TONE.warning : TONE.equity} />
        <IntegrityItem icon={WarningAmberIcon} label="سند ناتراز" value={integrity.unbalanced_documents} tone={unbalanced ? theme.palette.error.main : TONE.equity} />
        <IntegrityItem icon={DescriptionIcon} label="پیش‌نویس کنارگذاشته" value={integrity.draft_excluded} tone={TONE.neutral} />
      </Box>

      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} useFlexGap flexWrap="wrap">
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={onRecord}
          sx={{ borderRadius: '9px', fontSize: Math.max(type.buttonSize - 1, 10.5) }}>
          ثبت تأیید حسابرسی
        </Button>
        {approval ? (
          <Chip size="small" label={approval.is_final ? 'تأیید نهایی' : 'غیرنهایی'}
            sx={{ height: 22, fontSize: 9, fontWeight: 800, bgcolor: alpha(approval.is_final ? TONE.equity : TONE.warning, 0.08), color: approval.is_final ? TONE.equity : TONE.warning }} />
        ) : null}
      </Stack>
    </SurfaceCard>
  );
};

const RatioLine = ({ label, value, color, hint }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
        <Typography sx={{ fontSize: Math.max(type.bodySize - 1, 10.5), color: theme.palette.text.primary, fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: Math.max(type.bodySize, 11.5), fontWeight: 900, color }}>
          {pct(value)}
        </Typography>
      </Stack>
      <Box sx={{ mt: 0.45 }}>
        <ProgressBar value={Math.min(Math.abs(value || 0), 100)} color={color} height={7} />
      </Box>
      {hint ? (
        <Typography sx={{ mt: 0.35, fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary }}>
          {hint}
        </Typography>
      ) : null}
    </Box>
  );
};

const AnalysisCard = ({ data, balanced }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const ratios = data?.ratios || {};
  const netProfit = Number(data?.net_profit || 0);
  const debt = Number(ratios.debt_to_asset || 0);
  const equity = Number(ratios.equity_to_asset || 0);
  const leverage = Number(ratios.leverage || 0);
  const difference = Number(data?.difference || 0);
  const netColor = netProfit >= 0 ? TONE.equity : theme.palette.error.main;
  return (
    <SurfaceCard
      title="تحلیل ساختار مالی"
      icon={InsightsIcon}
      color={TONE.info}
      sx={{ height: '100%' }}
      contentSx={{ p: 2 }}
      action={(
        <Chip size="small" label={balanced ? 'تراز' : 'ناتراز'}
          sx={{ height: 22, fontSize: 9, fontWeight: 800, bgcolor: alpha(balanced ? TONE.equity : theme.palette.error.main, 0.08), color: balanced ? TONE.equity : theme.palette.error.main }} />
      )}
    >
      <Stack spacing={1.35}>
        <RatioLine label="بدهی‌ها به دارایی‌ها" value={debt} color={TONE.liability}
          hint="سهم بدهی‌ها از کل منابع مالی" />
        <RatioLine label="حقوق صاحبان سهام به دارایی‌ها" value={equity} color={TONE.equity}
          hint="سهم مالکان از کل منابع مالی" />
      </Stack>

      <Box sx={{
        mt: 1.5, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
        gap: 0.75,
      }}>
        <Box sx={{ p: 0.9, borderRadius: '11px', bgcolor: theme.palette.action.hover, border: `1px solid ${theme.palette.divider}` }}>
          <Typography sx={{ fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary }}>اهرم مالی</Typography>
          <Typography sx={{ mt: 0.15, fontSize: Math.max(type.statSize, 13), fontWeight: 900, color: TONE.neutral }}>
            {ratioText(leverage)}×
          </Typography>
        </Box>
        <Box sx={{ p: 0.9, borderRadius: '11px', bgcolor: alpha(netColor, 0.05), border: `1px solid ${alpha(netColor, 0.16)}` }}>
          <Typography sx={{ fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary }}>سود / زیان دوره</Typography>
          <Typography sx={{ mt: 0.15, fontSize: Math.max(type.statSize, 13), fontWeight: 900, color: netColor, fontVariantNumeric: 'tabular-nums' }}>
            {money(netProfit)}
          </Typography>
        </Box>
        <Box sx={{ p: 0.9, borderRadius: '11px', bgcolor: theme.palette.action.hover, border: `1px solid ${theme.palette.divider}` }}>
          <Typography sx={{ fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary }}>اختلاف تراز</Typography>
          <Typography sx={{ mt: 0.15, fontSize: Math.max(type.statSize, 13), fontWeight: 900, color: balanced ? TONE.equity : theme.palette.error.main, fontVariantNumeric: 'tabular-nums' }}>
            {money(difference)}
          </Typography>
        </Box>
      </Box>

      <Box sx={{
        mt: 1.5, p: 1.15, borderRadius: '11px', bgcolor: theme.palette.action.hover,
        border: `1px dashed ${theme.palette.divider}`,
      }}>
        <Typography sx={{ fontSize: Math.max(type.bodySize - 3, 9), fontWeight: 800, color: theme.palette.text.secondary }}>
          معادلهٔ حسابداری
        </Typography>
        <Typography sx={{ mt: 0.35, fontSize: Math.max(type.bodySize - 1, 10.5), color: theme.palette.text.primary, fontVariantNumeric: 'tabular-nums', lineHeight: 1.9 }}>
          {money(data?.total_assets)} {balanced ? '=' : '≠'} {money(data?.total_liabilities)} + {money(data?.total_equity)}
        </Typography>
        {Math.abs(netProfit) >= 0.01 ? (
          <Typography sx={{ mt: 0.35, fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary }}>
            سود (زیان) دوره به‌صورت خودکار در حقوق صاحبان سهام لحاظ شده است.
          </Typography>
        ) : null}
      </Box>
    </SurfaceCard>
  );
};

const groupedOf = (groups, rows, total) => {
  if (groups && groups.length) return groups;
  const list = rows || [];
  if (!list.length) return [];
  const byGroup = {};
  list.forEach((row) => {
    const key = row.group || 'سایر حساب‌ها';
    const bucket = byGroup[key] || (byGroup[key] = {
      name: key, code: row.group_code || '', rows: [], total: 0,
    });
    bucket.rows.push(row);
    bucket.total += Number(row.balance || 0);
  });
  return Object.values(byGroup)
    .sort((a, b) => b.total - a.total)
    .map((group) => ({
      ...group,
      total: Math.round(group.total * 100) / 100,
      percent: total ? Math.round((group.total / total) * 1000) / 10 : 0,
      rows: [...group.rows]
        .sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), 'en'))
        .map((row) => ({
          ...row,
          share: total ? Math.round(((row.balance || 0) / total) * 1000) / 10 : 0,
        })),
    }));
};

const BalanceSheetPage = () => {
  const qc = useQueryClient();
  const theme = useTheme();
  const { typography, getPalette } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const accent = getPalette('accounting')?.accent || '#2563eb';
  const [yearId, setYearId] = useState('');
  const [asOf, setAsOf] = useState('');
  const [msg, setMsg] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    auditor_name: '', audit_firm: '', reference_no: '', approved_at: '',
    status: 'approved', opinion_note: '', prepared_by_name: '', as_of_date: '',
  });

  const { data: years } = useQuery({
    queryKey: ['acc-fy-list'],
    queryFn: () => axiosInstance.get('/accounting/fiscal-years/').then((r) => r.data),
  });
  const yearList = Array.isArray(years) ? years : years?.results || [];

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['acc-bs-page', yearId, asOf],
    queryFn: () => axiosInstance.get('/accounting/reports/balance-sheet/', {
      params: {
        ...(yearId ? { fiscal_year: yearId } : {}),
        ...(asOf ? { as_of: asOf } : {}),
      },
    }).then((r) => r.data),
  });

  const saveApproval = useMutation({
    mutationFn: (body) => axiosInstance.post('/accounting/statement-approvals/', body).then((r) => r.data),
    onSuccess: (saved) => {
      setMsg({ type: 'success', text: `تأیید حسابرسی «${saved.auditor_name}» ثبت شد (${saved.status_display}).` });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['acc-bs-page'] });
      qc.invalidateQueries({ queryKey: ['acc-report-fs'] });
    },
    onError: (error) => {
      const body = error?.response?.data;
      const fieldError = body && typeof body === 'object'
        ? Object.values(body).find((value) => Array.isArray(value) && value.length)
        : null;
      setMsg({
        type: 'error',
        text: body?.detail || fieldError?.[0] || 'ثبت تأیید حسابرسی ناموفق بود.',
      });
    },
  });

  const balanced = data?.is_balanced !== undefined
    ? !!data.is_balanced
    : (!!data && Math.round(((data.total_assets || 0) - (data.total_liabilities_equity || 0)) * 100) / 100 === 0);
  const difference = data?.difference !== undefined
    ? data.difference
    : Math.round(((data?.total_assets || 0) - (data?.total_liabilities_equity || 0)) * 100) / 100;
  const audited = !!data?.audited;
  const assetGroups = useMemo(() => groupedOf(data?.asset_groups, data?.assets, data?.total_assets), [data]);
  const liabilityGroups = useMemo(() => groupedOf(data?.liability_groups, data?.liabilities, data?.total_liabilities), [data]);
  const equityGroups = useMemo(() => groupedOf(data?.equity_groups, data?.equity, data?.total_equity), [data]);

  const openAuditDialog = () => {
    setMsg(null);
    setForm((prev) => ({
      ...prev,
      as_of_date: data?.as_of || asOf || '',
    }));
    setOpen(true);
  };

  const submitApproval = () => {
    if (!form.auditor_name.trim()) {
      setMsg({ type: 'error', text: 'نام حسابرس / تأییدکننده الزامی است.' });
      return;
    }
    saveApproval.mutate({
      ...form,
      statement_type: 'balance_sheet',
      fiscal_year: yearId || null,
      approved_at: form.approved_at || null,
      as_of_date: form.as_of_date || null,
    });
  };

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<AccountBalanceIcon />}
        title="ترازنامه"
        badge={data ? <BalanceStatus balanced={balanced} difference={difference} compact short /> : null}
        actions={(
          <>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>سال مالی</InputLabel>
              <Select value={yearId} label="سال مالی" onChange={(e) => setYearId(e.target.value)}>
                <MenuItem value="">همهٔ دوره‌ها</MenuItem>
                {yearList.map((year) => (
                  <MenuItem key={year.id} value={String(year.id)}>
                    {toPersianDigits(year.name)}{year.is_current ? ' (جاری)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ width: { xs: '100%', sm: 165 } }}>
              <JalaliDatePicker fullWidth label="تا تاریخ" value={asOf} onChange={(value) => setAsOf(value || '')} />
            </Box>
            <Tooltip title="به‌روزرسانی گزارش">
              <span>
                <Button variant="outlined" onClick={() => refetch()} disabled={isFetching}
                  sx={{ minWidth: 40, px: 1 }}>
                  <RefreshIcon fontSize="small" />
                </Button>
              </span>
            </Tooltip>
            <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>
              چاپ
            </Button>
            <Button variant="contained" startIcon={<VerifiedIcon />} onClick={openAuditDialog}>
              ثبت تأیید حسابرسی
            </Button>
          </>
        )}
      />

      {msg ? (
        <Alert severity={msg.type} sx={{ mb: 1.5, borderRadius: '12px' }} onClose={() => setMsg(null)}>
          {msg.text}
        </Alert>
      ) : null}

      {data ? <SnapshotBar data={data} balanced={balanced} difference={difference} accent={accent} /> : null}

      {isLoading ? (
        <Paper elevation={0} sx={{ py: 8, borderRadius: '18px', border: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}>
          <CircularProgress size={30} />
        </Paper>
      ) : isError ? (
        <Alert severity="error" sx={{ borderRadius: '12px' }}
          action={<Button size="small" onClick={() => refetch()}>تلاش دوباره</Button>}>
          خطا در بارگذاری ترازنامه. لطفاً دوباره تلاش کنید.
        </Alert>
      ) : (
        <>
          <Grid container spacing={1.25} sx={{ mb: 1.5 }}>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricTile
                icon={AccountBalanceWalletIcon}
                label="جمع دارایی‌ها"
                value={money(data?.total_assets)}
                hint="کل منابع اقتصادی شرکت"
                color={TONE.asset}
                progress={100}
                progressLabel="۱۰۰٪ ساختار مالی"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricTile
                icon={AccountBalanceIcon}
                label="جمع بدهی‌ها"
                value={money(data?.total_liabilities)}
                hint={`${pct(data?.ratios?.debt_to_asset)} از دارایی‌ها`}
                color={TONE.liability}
                progress={data?.ratios?.debt_to_asset}
                progressLabel="نسبت بدهی به دارایی"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricTile
                icon={TrendingUpIcon}
                label="حقوق صاحبان سهام"
                value={money(data?.total_equity)}
                hint={`${pct(data?.ratios?.equity_to_asset)} از دارایی‌ها`}
                color={TONE.equity}
                progress={data?.ratios?.equity_to_asset}
                progressLabel="سهم مالکان از منابع"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricTile
                icon={ShieldIcon}
                label="بدهی + حقوق صاحبان سهام"
                value={money(data?.total_liabilities_equity)}
                hint={balanced ? 'معادلهٔ حسابداری تراز است' : `اختلاف تراز: ${money(difference)} ریال`}
                color={balanced ? TONE.equity : theme.palette.error.main}
                progress={null}
              />
            </Grid>
          </Grid>

          <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
            <Grid item xs={12} lg={7}>
              <BalanceSection
                title="دارایی‌ها"
                subtitle="Assets — منابع اقتصادی شرکت و مصارف سرمایه"
                icon={AccountBalanceWalletIcon}
                tone="asset"
                total={data?.total_assets}
                groups={assetGroups}
                emptyText="حساب دارایی با مانده در این دوره ثبت نشده است."
              />
            </Grid>
            <Grid item xs={12} lg={5}>
              <Stack spacing={1.5}>
                <BalanceSection
                  title="بدهی‌ها"
                  subtitle="Liabilities — تعهدات به اشخاص ثالث"
                  icon={AccountBalanceIcon}
                  tone="liability"
                  total={data?.total_liabilities}
                  groups={liabilityGroups}
                  emptyText="حساب بدهی با مانده در این دوره ثبت نشده است."
                  compact
                />
                <BalanceSection
                  title="حقوق صاحبان سهام"
                  subtitle="Equity — سرمایه، اندوخته و سود انباشته"
                  icon={TrendingUpIcon}
                  tone="equity"
                  total={data?.total_equity}
                  groups={equityGroups}
                  emptyText="حساب حقوق صاحبان سهام با مانده در این دوره ثبت نشده است."
                  compact
                />
              </Stack>
            </Grid>
          </Grid>

          <Grid container spacing={1.5}>
            <Grid item xs={12} lg={7}>
              <AuditCard audit={data?.audit} audited={audited} onRecord={openAuditDialog} />
            </Grid>
            <Grid item xs={12} lg={5}>
              <AnalysisCard data={data} balanced={balanced} />
            </Grid>
          </Grid>
        </>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: '18px' } }}>
        <DialogTitle sx={{ p: 2, pb: 1.5 }}>
          <Stack direction="row" spacing={1.1} alignItems="center">
            <Box sx={{
              width: 40, height: 40, borderRadius: '12px', color: TONE.audit,
              bgcolor: alpha(TONE.audit, 0.08), border: `1px solid ${alpha(TONE.audit, 0.18)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <VerifiedIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: Math.max(type.cardSize - 1, 12.5), fontWeight: 900, color: theme.palette.text.primary }}>
                ثبت تأیید حسابرسی ترازنامه
              </Typography>
              <Typography sx={{ fontSize: Math.max(type.bodySize - 2, 9.8), color: theme.palette.text.secondary, mt: 0.15 }}>
                اطلاعات حسابرس، مرجع گزارش و متن نظر را تکمیل کنید.
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setOpen(false)} aria-label="بستن">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: theme.palette.divider }}>
          {msg?.type === 'error' ? (
            <Alert severity="error" sx={{ mb: 1.5, borderRadius: '10px' }}>{msg.text}</Alert>
          ) : null}
          <Grid container spacing={1.5} sx={{ mt: 0 }}>
            <Grid item xs={12} md={6}>
              <TextField size="small" fullWidth required label="حسابرس / تأییدکننده *"
                value={form.auditor_name}
                onChange={(e) => setForm((prev) => ({ ...prev, auditor_name: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField size="small" fullWidth label="مؤسسهٔ حسابرسی" value={form.audit_firm}
                onChange={(e) => setForm((prev) => ({ ...prev, audit_firm: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField size="small" fullWidth label="شمارهٔ گزارش / نامه" value={form.reference_no}
                onChange={(e) => setForm((prev) => ({ ...prev, reference_no: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <JalaliDatePicker fullWidth label="تاریخ تأیید" value={form.approved_at}
                onChange={(value) => setForm((prev) => ({ ...prev, approved_at: value || '' }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl size="small" fullWidth>
                <InputLabel>وضعیت تأیید</InputLabel>
                <Select value={form.status} label="وضعیت تأیید"
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
                  <MenuItem value="approved">تأییدشده</MenuItem>
                  <MenuItem value="approved_with_comments">تأیید با ملاحظات</MenuItem>
                  <MenuItem value="pending">در انتظار تأیید</MenuItem>
                  <MenuItem value="rejected">رد شده</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <JalaliDatePicker fullWidth label="تاریخ صورت مالی" value={form.as_of_date}
                onChange={(value) => setForm((prev) => ({ ...prev, as_of_date: value || '' }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField size="small" fullWidth label="تهیه‌کننده" value={form.prepared_by_name}
                onChange={(e) => setForm((prev) => ({ ...prev, prepared_by_name: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField size="small" fullWidth disabled label="سال مالی"
                value={toPersianDigits(data?.fiscal_year?.name) || 'همهٔ دوره‌ها'} />
            </Grid>
            <Grid item xs={12}>
              <TextField size="small" fullWidth multiline minRows={3} label="متن نظر حسابرسی"
                value={form.opinion_note}
                onChange={(e) => setForm((prev) => ({ ...prev, opinion_note: e.target.value }))}
                helperText="این متن در کارت تأیید، زیر نام حسابرس نمایش داده می‌شود." />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ fontSize: Math.max(type.buttonSize, 11) }}>انصراف</Button>
          <Button variant="contained" onClick={submitApproval} disabled={saveApproval.isPending}
            startIcon={<VerifiedIcon />} sx={{ borderRadius: '9px', fontSize: Math.max(type.buttonSize, 11) }}>
            {saveApproval.isPending ? 'در حال ثبت…' : 'ثبت تأیید'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BalanceSheetPage;
