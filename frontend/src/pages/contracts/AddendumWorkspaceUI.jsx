import React from 'react';
import {
  Box, Button, ButtonBase, Chip, Divider, IconButton, Paper, Stack, Table,
  TableBody, TableCell, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import EditNoteIcon from '@mui/icons-material/EditNote';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useModulePalette } from '../../core/context/ModulePaletteContext';
import { DEFAULT_TYPOGRAPHY } from '../../core/theme/appearanceDefaults';
import { formatPersianNumber, normalizeCurrencyLabel } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';
import { CONTRACT_TARGET_LABELS } from '../../core/constants/addendumSubjects';
import { ProgressBar, MUTED, SOFT_BG } from '../accounting/AccountingDashboardUI';

export const GROUP_TONES = {
  financial: '#0f766e',
  time: '#2563eb',
  scope: '#7c3aed',
  parties: '#be185d',
  legal: '#b45309',
  close: '#0e7490',
  other: '#64748b',
};

export const groupTone = (group) => GROUP_TONES[group] || GROUP_TONES.other;

export const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const money = (value, currency = 'ریال') => {
  if (value === null || value === undefined || value === '') return '—';
  return `${formatPersianNumber(toNumber(value))} ${currency}`;
};

export const signedMoney = (value, currency = 'ریال') => {
  if (value === null || value === undefined || value === '') return '—';
  const number = toNumber(value);
  return `${number > 0 ? '+' : ''}${formatPersianNumber(number)} ${currency}`;
};

export const deltaTone = (value, inverse = false) => {
  const number = toNumber(value);
  if (!number) return MUTED;
  return (inverse ? number < 0 : number > 0) ? '#0f766e' : '#be123c';
};

export const dateLabel = (value) => (value ? toJalali(value) : '—');

export const changeOf = (row, field) => (
  (row?.effect?.changes || []).find((item) => item.field === field) || null
);

export const dayDiff = (from, to) => {
  if (!from || !to) return null;
  const start = new Date(`${String(from).slice(0, 10)}T00:00:00`);
  const end = new Date(`${String(to).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.round((end - start) / 86400000);
};

export const effectDelta = (row, field) => {
  const change = changeOf(row, field);
  if (!change) return null;
  if (field === 'end_date') return { from: change.from, to: change.to, days: dayDiff(change.from, change.to) };
  return toNumber(change.to) - toNumber(change.from);
};

export const useAddendumStyle = () => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  return {
    theme,
    type: { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) },
  };
};

/* ------------------------------------------------------------------ atoms */

export const SectionTitle = ({ icon: Icon, title, hint, action, color }) => {
  const { theme, type } = useAddendumStyle();
  const tone = color || theme.palette.primary.main;
  return (
    <Stack direction="row" alignItems="center" spacing={1} useFlexGap sx={{ mb: 1.25 }}>
      {Icon ? (
        <Box sx={{
          width: 30, height: 30, borderRadius: '9px', color: tone,
          bgcolor: alpha(tone, 0.07), border: `1px solid ${alpha(tone, 0.16)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon sx={{ fontSize: 17 }} />
        </Box>
      ) : null}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: Math.max(type.cardSize - 1, 12), fontWeight: 900, color: theme.palette.text.primary }}>
          {title}
        </Typography>
        {hint ? (
          <Typography sx={{ fontSize: Math.max(type.bodySize - 2, 9.5), color: theme.palette.text.secondary }}>
            {hint}
          </Typography>
        ) : null}
      </Box>
      {action || null}
    </Stack>
  );
};

export const InfoLine = ({ label, value, ltr = false, strong = false, color }) => {
  const { theme, type } = useAddendumStyle();
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1} useFlexGap sx={{ py: 0.45 }}>
      <Typography sx={{ fontSize: Math.max(type.bodySize - 1, 10.5), color: theme.palette.text.secondary }}>
        {label}
      </Typography>
      <Typography sx={{
        fontSize: Math.max(type.bodySize - 0.5, 10.8), fontWeight: strong ? 900 : 700,
        color: color || theme.palette.text.primary, direction: ltr ? 'ltr' : 'rtl', textAlign: 'left',
        fontVariantNumeric: 'tabular-nums', wordBreak: 'break-word',
      }}>
        {value === null || value === undefined || value === '' ? '—' : value}
      </Typography>
    </Stack>
  );
};

export const SubjectPill = ({ subject, compact = false }) => {
  const tone = groupTone(subject?.group);
  return (
    <Chip
      size="small"
      icon={<Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: tone }} />}
      label={subject?.label || subject?.group_label || subject?.type || 'موضوع'}
      sx={{
        height: compact ? 22 : 24, borderRadius: '8px', fontWeight: 700,
        bgcolor: alpha(tone, 0.08), color: tone, border: `1px solid ${alpha(tone, 0.14)}`,
        '& .MuiChip-label': { fontSize: compact ? 9.2 : 9.8, px: 0.8 },
      }}
    />
  );
};

export const EmptyState = ({ title, description, action }) => {
  const { theme, type } = useAddendumStyle();
  return (
    <Paper elevation={0} sx={{
      p: { xs: 3, md: 5 }, textAlign: 'center', borderRadius: '18px',
      border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper,
    }}>
      <Box sx={{
        width: 58, height: 58, mx: 'auto', mb: 1.5, borderRadius: '18px',
        bgcolor: alpha(theme.palette.primary.main, 0.06), color: theme.palette.primary.main,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <EditNoteIcon sx={{ fontSize: 28 }} />
      </Box>
      <Typography sx={{ fontSize: Math.max(type.cardSize - 1, 12.5), fontWeight: 900, color: theme.palette.text.primary }}>
        {title}
      </Typography>
      <Typography sx={{ mt: 0.5, mb: action ? 2 : 0, fontSize: Math.max(type.bodySize - 1, 10.5), color: theme.palette.text.secondary }}>
        {description}
      </Typography>
      {action || null}
    </Paper>
  );
};

/* --------------------------------------------------------- contract cards */

export const ContractSnapshotCard = ({ contract, accent, onBack }) => {
  const { theme, type } = useAddendumStyle();
  if (!contract) return null;
  const currency = normalizeCurrencyLabel(contract.currency_name || contract.currency_symbol);
  const base = toNumber(contract.amount);
  const effective = toNumber(contract.effective_amount ?? contract.amount);
  const advance = toNumber(contract.advance_payment);
  return (
    <Paper elevation={0} sx={{
      borderRadius: '18px', border: `1px solid ${theme.palette.divider}`,
      bgcolor: theme.palette.background.paper, overflow: 'hidden',
    }}>
      <Box sx={{ height: 3, bgcolor: accent }} />
      <Box sx={{ p: 1.5 }}>
        <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 1 }}>
          <Box sx={{
            width: 38, height: 38, borderRadius: '11px', flexShrink: 0,
            color: accent, bgcolor: alpha(accent, 0.08), border: `1px solid ${alpha(accent, 0.16)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <EditNoteIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: Math.max(type.bodySize - 2, 9.5), color: theme.palette.text.secondary }}>
              {contract.number ? `قرارداد ${contract.number}` : 'پروندهٔ قرارداد'}
            </Typography>
            <Typography sx={{ fontSize: Math.max(type.cardSize - 1, 12), fontWeight: 900, color: theme.palette.text.primary, lineHeight: 1.5 }}>
              {contract.subject || 'بدون موضوع'}
            </Typography>
          </Box>
          <Chip size="small" label={contract.status_display || '—'}
            sx={{ height: 21, fontSize: 9, fontWeight: 800, bgcolor: alpha(accent, 0.07), color: accent }} />
        </Stack>
        <Divider sx={{ my: 0.75 }} />
        <InfoLine label="طرف قرارداد" value={contract.party_name} />
        <InfoLine label="نوع" value={contract.contract_type_display || '—'} />
        <InfoLine label="مبلغ پایه" value={money(base, currency)} ltr />
        <InfoLine label="مبلغ مؤثر" value={money(effective, currency)} ltr strong color={effective !== base ? '#0f766e' : undefined} />
        <InfoLine label="تاریخ شروع" value={dateLabel(contract.start_date)} />
        <InfoLine label="تاریخ پایان مؤثر" value={dateLabel(contract.effective_end_date || contract.end_date)} />
        <Box sx={{ mt: 1 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.4 }}>
            <Typography sx={{ fontSize: 9.5, color: theme.palette.text.secondary }}>پیش‌پرداخت</Typography>
            <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: theme.palette.text.primary }}>
              {money(advance, currency)}
            </Typography>
          </Stack>
          <ProgressBar value={base > 0 ? (advance / base) * 100 : 0} color={accent} height={5} />
        </Box>
        {onBack ? (
          <Button fullWidth size="small" variant="outlined" startIcon={<ArrowBackIcon />}
            onClick={onBack} sx={{ mt: 1.25 }}>
            تغییر قرارداد
          </Button>
        ) : null}
      </Box>
    </Paper>
  );
};

export const EffectiveProfileCard = ({ base, effective, accent, currency = 'ریال' }) => {
  const { theme } = useAddendumStyle();
  const fields = [
    ['amount', 'مبلغ قرارداد', true],
    ['advance_payment', 'پیش‌پرداخت', true],
    ['guarantee_amount', 'تضمین', true],
    ['retention_percent', 'حسن انجام کار', false],
    ['end_date', 'تاریخ پایان', false],
  ];
  return (
    <Paper elevation={0} sx={{
      borderRadius: '18px', border: `1px solid ${theme.palette.divider}`,
      bgcolor: theme.palette.background.paper, p: 1.5,
    }}>
      <SectionTitle icon={TrendingUpIcon} title="پروندهٔ مؤثر" hint="پایه در برابر پس از الحاقیه‌ها" color={accent} />
      <Stack spacing={0.85}>
        {fields.map(([key, label, isMoney]) => {
          const before = base?.[key];
          const after = effective?.[key];
          const changed = String(before ?? '') !== String(after ?? '');
          const delta = key === 'end_date'
            ? dayDiff(before, after)
            : toNumber(after) - toNumber(before);
          return (
            <Box key={key}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Typography sx={{ fontSize: 9.8, color: theme.palette.text.secondary }}>{label}</Typography>
                <Typography sx={{ fontSize: 10.8, fontWeight: 900, color: changed ? '#0f766e' : theme.palette.text.primary }}>
                  {key === 'end_date' ? dateLabel(after) : (isMoney ? money(after, currency) : `${toNumber(after)}٪`)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography sx={{ fontSize: 8.8, color: theme.palette.text.secondary, direction: 'ltr' }}>
                  {key === 'end_date' ? dateLabel(before) : (isMoney ? money(before, currency) : `${toNumber(before)}٪`)}
                </Typography>
                {changed ? (
                  <Chip size="small" label={key === 'end_date'
                    ? `${delta > 0 ? '+' : ''}${formatPersianNumber(delta)} روز`
                    : (isMoney ? signedMoney(delta, currency) : `${delta > 0 ? '+' : ''}${formatPersianNumber(delta)}٪`)}
                    sx={{ height: 18, fontSize: 8.5, fontWeight: 800, bgcolor: alpha('#0f766e', 0.08), color: '#0f766e' }} />
                ) : null}
              </Stack>
            </Box>
          );
        })}
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 8.8, color: theme.palette.text.secondary }}>
        محاسبه بر اساس تاریخ و ترتیب الحاقیه‌ها؛ مبلغ قرارداد بازنویسی نمی‌شود.
      </Typography>
    </Paper>
  );
};


/* ----------------------------------------------------------- effect table */

export const EffectTable = ({ effect, compact = false, currency = 'ریال' }) => {
  const { theme } = useAddendumStyle();
  if (!effect) return null;
  const base = effect.base || {};
  const effective = effect.effective || {};
  const deltas = effect.deltas || {};
  const changed = new Set(effect.changed || []);
  return (
    <Table size="small" sx={{ '& .MuiTableCell-root': {
      py: compact ? 0.45 : 0.7, px: compact ? 0.6 : 0.9, borderColor: theme.palette.divider,
    } }}>
      <TableHead>
        <TableRow>
          {['مورد', 'پایه', 'پس از الحاقیه', 'تغییر'].map((label) => (
            <TableCell key={label} sx={{ fontWeight: 900, fontSize: 9.5, color: theme.palette.text.secondary }}>{label}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {Object.entries(CONTRACT_TARGET_LABELS).map(([field, label]) => {
          const isDate = field === 'end_date';
          const isChanged = changed.has(field) || Math.abs(toNumber(deltas[field])) > 0
            || (isDate && String(base[field] ?? '') !== String(effective[field] ?? ''));
          const delta = isDate ? dayDiff(base[field], effective[field]) : toNumber(deltas[field]);
          return (
            <TableRow key={field} sx={{ bgcolor: isChanged ? alpha('#0f766e', 0.035) : 'transparent' }}>
              <TableCell sx={{ fontSize: 9.5 }}>{label}</TableCell>
              <TableCell sx={{ fontSize: 9.5, color: theme.palette.text.secondary }}>
                {isDate ? dateLabel(base[field]) : money(base[field], currency)}
              </TableCell>
              <TableCell sx={{ fontSize: 9.5, fontWeight: isChanged ? 900 : 500 }}>
                {isDate ? dateLabel(effective[field]) : money(effective[field], currency)}
              </TableCell>
              <TableCell sx={{ fontSize: 9.5, fontWeight: 800, color: isChanged ? '#0f766e' : theme.palette.text.secondary }}>
                {!isChanged ? '—' : isDate
                  ? `${delta > 0 ? '+' : ''}${formatPersianNumber(delta)} روز`
                  : signedMoney(delta, currency)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};


/* ------------------------------------------------------------- amendments */

const AmendmentActions = ({ onView, onEdit, onDuplicate, onDelete }) => (
  <Stack direction="row" spacing={0.15}>
    {onView ? <Tooltip title="جزئیات"><IconButton size="small" onClick={onView}><VisibilityIcon fontSize="small" /></IconButton></Tooltip> : null}
    {onEdit ? <Tooltip title="ویرایش"><IconButton size="small" onClick={onEdit}><EditIcon fontSize="small" /></IconButton></Tooltip> : null}
    {onDuplicate ? <Tooltip title="کپی"><IconButton size="small" onClick={onDuplicate}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip> : null}
    {onDelete ? <Tooltip title="حذف"><IconButton size="small" color="error" onClick={onDelete}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip> : null}
  </Stack>
);

export const AmendmentCard = ({ row, index, accent, currency = 'ریال', onView, onEdit, onDuplicate, onDelete }) => {
  const { theme, type } = useAddendumStyle();
  const subjects = row.subjects_detail || [];
  const amountDelta = effectDelta(row, 'amount');
  const endDelta = effectDelta(row, 'end_date');
  const changes = row.effect?.changes || [];
  return (
    <Paper elevation={0} sx={{
      height: '100%', p: 1.6, borderRadius: '16px', border: `1px solid ${theme.palette.divider}`,
      bgcolor: theme.palette.background.paper, display: 'flex', flexDirection: 'column', gap: 1,
      transition: 'border-color .18s ease, box-shadow .18s ease',
      '&:hover': { borderColor: alpha(accent, 0.35), boxShadow: `0 10px 24px ${alpha(accent, 0.06)}` },
    }}>
      <Stack direction="row" alignItems="flex-start" spacing={1}>
        <Box sx={{
          width: 35, height: 35, borderRadius: '10px', flexShrink: 0,
          bgcolor: alpha(accent, 0.08), color: accent, border: `1px solid ${alpha(accent, 0.16)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 900,
        }}>
          {formatPersianNumber(index + 1)}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: Math.max(type.bodySize + 0.5, 11.5), fontWeight: 900, color: theme.palette.text.primary, lineHeight: 1.5 }}>
            {row.subjects_display || row.subject_type_display || row.subject || 'الحاقیه'}
          </Typography>
          <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" sx={{ mt: 0.2 }}>
            <Typography sx={{ fontSize: 9.2, color: theme.palette.text.secondary }}>
              {row.number ? `شماره ${row.number}` : 'بدون شماره'}
            </Typography>
            <Typography sx={{ fontSize: 9.2, color: theme.palette.text.secondary }}>·</Typography>
            <Typography sx={{ fontSize: 9.2, color: theme.palette.text.secondary }}>{dateLabel(row.date)}</Typography>
          </Stack>
        </Box>
        <AmendmentActions onView={onView} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
      </Stack>

      <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap" sx={{ minHeight: 22 }}>
        {subjects.slice(0, 3).map((item) => <SubjectPill key={item.type} subject={item} compact />)}
        {subjects.length > 3 ? <Chip size="small" label={`+${formatPersianNumber(subjects.length - 3)}`} sx={{ height: 22, fontSize: 9 }} /> : null}
        {!subjects.length && row.subject ? <SubjectPill subject={{ label: row.subject, group: 'other' }} compact /> : null}
      </Stack>

      <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap">
        {amountDelta !== null ? (
          <Chip size="small" icon={<TrendingUpIcon sx={{ fontSize: 13 }} />}
            label={signedMoney(amountDelta, currency)}
            sx={{ height: 23, fontSize: 9, fontWeight: 800, bgcolor: alpha(deltaTone(amountDelta), 0.08), color: deltaTone(amountDelta) }} />
        ) : null}
        {endDelta?.days ? (
          <Chip size="small" icon={<CalendarMonthIcon sx={{ fontSize: 13 }} />}
            label={`${endDelta.days > 0 ? '+' : ''}${formatPersianNumber(endDelta.days)} روز`}
            sx={{ height: 23, fontSize: 9, fontWeight: 800, bgcolor: alpha('#2563eb', 0.07), color: '#2563eb' }} />
        ) : null}
        {changes.length ? (
          <Chip size="small" icon={<CheckCircleIcon sx={{ fontSize: 13 }} />}
            label={`${formatPersianNumber(changes.length)} اثر`}
            sx={{ height: 23, fontSize: 9, fontWeight: 800, bgcolor: alpha('#0f766e', 0.07), color: '#0f766e' }} />
        ) : (
          <Chip size="small" icon={<WarningAmberIcon sx={{ fontSize: 13 }} />} label="بدون اثر مالی"
            sx={{ height: 23, fontSize: 9, fontWeight: 800, bgcolor: alpha('#b45309', 0.07), color: '#b45309' }} />
        )}
      </Stack>

      {row.change_description ? (
        <Typography sx={{
          fontSize: 9.6, color: theme.palette.text.secondary, lineHeight: 1.7,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {row.change_description}
        </Typography>
      ) : null}

      <Box sx={{ flex: 1 }} />
      <Divider />
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.5}>
        <Typography sx={{ fontSize: 8.8, color: theme.palette.text.secondary }}>
          {row.provisions?.length ? `${formatPersianNumber(row.provisions.length)} بند` : 'بدون بند'}
        </Typography>
        <Button size="small" endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />} onClick={onView}
          sx={{ minWidth: 0, py: 0.15, px: 0.5, fontSize: 9.5 }}>
          مشاهدهٔ اثر
        </Button>
      </Stack>
    </Paper>
  );
};


export const AmendmentTable = ({ rows, accent, currency = 'ریال', onView, onEdit, onDuplicate, onDelete }) => {
  const { theme } = useAddendumStyle();
  return (
    <Paper elevation={0} sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
      <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: SOFT_BG }}>
            {['#', 'شماره / تاریخ', 'موضوع‌ها', 'تغییر مبلغ', 'مدت', 'اثر', ''].map((label) => (
              <TableCell key={label || 'actions'} sx={{ fontSize: 9.5, fontWeight: 900, color: theme.palette.text.secondary }}>{label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => {
            const amountDelta = effectDelta(row, 'amount');
            const endDelta = effectDelta(row, 'end_date');
            return (
              <TableRow key={row.id} hover>
                <TableCell sx={{ fontSize: 9.5, fontWeight: 800, color: accent }}>{formatPersianNumber(index + 1)}</TableCell>
                <TableCell>
                  <Typography sx={{ fontSize: 9.8, fontWeight: 800 }}>{row.number || '—'}</Typography>
                  <Typography sx={{ fontSize: 8.8, color: theme.palette.text.secondary }}>{dateLabel(row.date)}</Typography>
                </TableCell>
                <TableCell sx={{ maxWidth: 250 }}>
                  <Stack direction="row" spacing={0.35} useFlexGap flexWrap="wrap">
                    {(row.subjects_detail || []).slice(0, 2).map((item) => <SubjectPill key={item.type} subject={item} compact />)}
                    {(row.subjects_detail || []).length > 2 ? (
                      <Chip size="small" label={`+${formatPersianNumber(row.subjects_detail.length - 2)}`} sx={{ height: 21, fontSize: 8.5 }} />
                    ) : null}
                  </Stack>
                </TableCell>
                <TableCell sx={{ fontSize: 9.5, fontWeight: 800, color: amountDelta === null ? theme.palette.text.secondary : deltaTone(amountDelta) }}>
                  {amountDelta === null ? '—' : signedMoney(amountDelta, currency)}
                </TableCell>
                <TableCell sx={{ fontSize: 9.5, color: endDelta?.days ? '#2563eb' : theme.palette.text.secondary }}>
                  {endDelta?.days ? `${endDelta.days > 0 ? '+' : ''}${formatPersianNumber(endDelta.days)} روز` : '—'}
                </TableCell>
                <TableCell sx={{ fontSize: 9.5 }}>{formatPersianNumber((row.effect?.changes || []).length)}</TableCell>
                <TableCell align="left">
                  <AmendmentActions onView={onView} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </Box>
    </Paper>
  );
};


export const AmendmentTimeline = ({ rows, accent, currency = 'ریال', onView, onEdit, onDelete }) => {
  const { theme } = useAddendumStyle();
  return (
    <Paper elevation={0} sx={{ p: { xs: 1.5, md: 2 }, borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
      <Stack spacing={0}>
        {rows.map((row, index) => (
          <Stack key={row.id} direction="row" spacing={1.25} sx={{ position: 'relative', pb: index === rows.length - 1 ? 0 : 2 }}>
            {index < rows.length - 1 ? (
              <Box sx={{ position: 'absolute', top: 22, bottom: -2, right: 11, width: 1, bgcolor: theme.palette.divider }} />
            ) : null}
            <Box sx={{
              width: 23, height: 23, borderRadius: '50%', flexShrink: 0, zIndex: 1,
              bgcolor: alpha(accent, 0.1), color: accent, border: `1px solid ${alpha(accent, 0.24)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8.5, fontWeight: 900,
            }}>
              {formatPersianNumber(index + 1)}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap flexWrap="wrap">
                <Typography sx={{ fontSize: 10.8, fontWeight: 900 }}>{row.subjects_display || row.subject || 'الحاقیه'}</Typography>
                <Chip size="small" label={dateLabel(row.date)} sx={{ height: 19, fontSize: 8.5 }} />
              </Stack>
              <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
                {(row.subjects_detail || []).slice(0, 2).map((item) => <SubjectPill key={item.type} subject={item} compact />)}
                {effectDelta(row, 'amount') !== null ? (
                  <Chip size="small" label={signedMoney(effectDelta(row, 'amount'), currency)}
                    sx={{ height: 21, fontSize: 8.5, fontWeight: 800, bgcolor: alpha('#0f766e', 0.07), color: '#0f766e' }} />
                ) : null}
              </Stack>
              <Stack direction="row" spacing={0.25} sx={{ mt: 0.25 }}>
                <Button size="small" onClick={onView} sx={{ minWidth: 0, fontSize: 8.8, py: 0 }}>جزئیات</Button>
                <Button size="small" onClick={onEdit} sx={{ minWidth: 0, fontSize: 8.8, py: 0 }}>ویرایش</Button>
                <Button size="small" color="error" onClick={onDelete} sx={{ minWidth: 0, fontSize: 8.8, py: 0 }}>حذف</Button>
              </Stack>
            </Box>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
};


export const EditorStepNav = ({ steps, active, onChange, accent }) => {
  const { theme } = useAddendumStyle();
  return (
    <Stack spacing={0.35}>
      {steps.map((step, index) => {
        const done = index < active;
        const current = index === active;
        return (
          <ButtonBase key={step.key} onClick={() => onChange(index)} sx={{
            width: '100%', justifyContent: 'flex-start', textAlign: 'right', gap: 1,
            p: 0.8, borderRadius: '11px',
            bgcolor: current ? alpha(accent, 0.07) : 'transparent',
            border: `1px solid ${current ? alpha(accent, 0.18) : 'transparent'}`,
          }}>
            <Box sx={{
              width: 24, height: 24, borderRadius: '8px', flexShrink: 0,
              bgcolor: done ? alpha('#0f766e', 0.1) : (current ? alpha(accent, 0.1) : theme.palette.action.hover),
              color: done ? '#0f766e' : (current ? accent : theme.palette.text.secondary),
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 900,
            }}>
              {done ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : formatPersianNumber(index + 1)}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 9.8, fontWeight: current ? 900 : 700, color: theme.palette.text.primary }}>
                {step.title}
              </Typography>
              <Typography sx={{ fontSize: 8.5, color: theme.palette.text.secondary }}>{step.hint}</Typography>
            </Box>
          </ButtonBase>
        );
      })}
    </Stack>
  );
};

