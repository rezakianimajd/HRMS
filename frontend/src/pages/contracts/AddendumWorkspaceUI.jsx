import React from 'react';
import {
  Box, Button, ButtonBase, Chip, Divider, IconButton, Paper, Stack, Table,
  TableBody, TableCell, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { useModulePalette } from '../../core/context/ModulePaletteContext';
import { DEFAULT_TYPOGRAPHY } from '../../core/theme/appearanceDefaults';
import { formatPersianNumber } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';
import { CONTRACT_TARGET_LABELS } from '../../core/constants/addendumSubjects';
import { MUTED } from '../accounting/AccountingDashboardUI';

const formatFileSize = (size) => {
  const bytes = Number(size) || 0;
  if (bytes < 1024 * 1024) return `${formatPersianNumber(Math.max(1, Math.round(bytes / 1024)))} KB`;
  return `${formatPersianNumber((bytes / 1024 / 1024).toFixed(1))} MB`;
};

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
          <Typography sx={{ fontSize: Math.max(type.bodySize - 2, 12), color: theme.palette.text.secondary }}>
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
      <Typography sx={{ fontSize: Math.max(type.bodySize - 1, 12), color: theme.palette.text.secondary }}>
        {label}
      </Typography>
      <Typography sx={{
        fontSize: Math.max(type.bodySize - 0.5, 12), fontWeight: strong ? 900 : 700,
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
      <Typography sx={{ mt: 0.5, mb: action ? 2 : 0, fontSize: Math.max(type.bodySize - 1, 12), color: theme.palette.text.secondary }}>
        {description}
      </Typography>
      {action || null}
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
            <TableCell key={label} sx={{ fontWeight: 900, fontSize: 12, color: theme.palette.text.secondary }}>{label}</TableCell>
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
              <TableCell sx={{ fontSize: 12 }}>{label}</TableCell>
              <TableCell sx={{ fontSize: 12, color: theme.palette.text.secondary }}>
                {isDate ? dateLabel(base[field]) : money(base[field], currency)}
              </TableCell>
              <TableCell sx={{ fontSize: 12, fontWeight: isChanged ? 900 : 500 }}>
                {isDate ? dateLabel(effective[field]) : money(effective[field], currency)}
              </TableCell>
              <TableCell sx={{ fontSize: 12, fontWeight: 800, color: isChanged ? '#0f766e' : theme.palette.text.secondary }}>
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
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900,
            }}>
              {done ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : formatPersianNumber(index + 1)}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 12, fontWeight: current ? 900 : 700, color: theme.palette.text.primary }}>
                {step.title}
              </Typography>
              <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>{step.hint}</Typography>
            </Box>
          </ButtonBase>
        );
      })}
    </Stack>
  );
};


export const AttachmentPicker = ({
  documents = [], pendingFiles = [], onAdd, onRemovePending, onRemoveDocument, accent,
  buttonLabel = 'افزودن PDF الحاقیه', emptyText = 'فایل PDF الحاقیه را اینجا پیوست کنید.',
  documentLabel = 'الحاقیه', accept = 'application/pdf,.pdf',
  hint = 'فقط PDF · حداکثر ۲۵ مگابایت برای هر فایل',
  icon: DocumentIcon = PictureAsPdfIcon,
}) => {
  const { theme } = useAddendumStyle();
  const handleFiles = (event) => {
    onAdd(Array.from(event.target.files || []));
    event.target.value = '';
  };
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
        <Button component="label" variant="outlined" size="small" startIcon={<AttachFileIcon />}>
          {buttonLabel}
          <input hidden type="file" accept={accept} multiple onChange={handleFiles} />
        </Button>
        <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>
          {hint}
        </Typography>
      </Stack>
      {!documents.length && !pendingFiles.length ? (
        <Box sx={{
          py: 2, textAlign: 'center', borderRadius: '11px', border: `1px dashed ${theme.palette.divider}`,
          bgcolor: alpha(accent || theme.palette.primary.main, 0.025),
        }}>
          <DocumentIcon sx={{ fontSize: 22, color: theme.palette.text.disabled, mb: 0.4 }} />
          <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>
            {emptyText}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={0.6}>
          {documents.map((document) => (
            <Paper key={`doc-${document.id}`} elevation={0} sx={{
              p: 0.85, borderRadius: '10px', border: `1px solid ${theme.palette.divider}`,
              display: 'flex', alignItems: 'center', gap: 0.75,
            }}>
              <DocumentIcon sx={{ fontSize: 18, color: '#be123c', flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 12, fontWeight: 800 }}>{document.title || 'PDF الحاقیه'}</Typography>
                <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>
                  {document.addendum_number || document.guarantee_number
                    ? `${documentLabel} ${document.addendum_number || document.guarantee_number}`
                    : 'پیوست ذخیره‌شده'}
                </Typography>
              </Box>
              <Button size="small" component="a" href={document.file_url || document.file} target="_blank"
                rel="noreferrer" sx={{ minWidth: 0, px: 0.6, fontSize: 12 }}>
                مشاهده
              </Button>
              {onRemoveDocument ? (
                <Tooltip title="حذف پیوست">
                  <IconButton size="small" color="error" onClick={() => onRemoveDocument(document)}>
                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              ) : null}
            </Paper>
          ))}
          {pendingFiles.map((file, index) => (
            <Paper key={`pending-${file.name}-${index}`} elevation={0} sx={{
              p: 0.85, borderRadius: '10px', border: `1px dashed ${alpha(accent || theme.palette.primary.main, 0.35)}`,
              bgcolor: alpha(accent || theme.palette.primary.main, 0.025),
              display: 'flex', alignItems: 'center', gap: 0.75,
            }}>
              <DocumentIcon sx={{ fontSize: 18, color: '#be123c', flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 12, fontWeight: 800 }}>{file.name}</Typography>
                <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>
                  در انتظار ذخیره · {formatFileSize(file.size)}
                </Typography>
              </Box>
              <Tooltip title="حذف از صف">
                <IconButton size="small" color="error" onClick={() => onRemovePending(index)}>
                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export const AttachmentLinks = ({ documents = [], icon: DocumentIcon = PictureAsPdfIcon, documentLabel = 'PDF الحاقیه' }) => {
  const { theme } = useAddendumStyle();
  if (!documents.length) return null;
  return (
    <Stack spacing={0.55}>
      {documents.map((document) => (
        <Button key={document.id} component="a" href={document.file_url || document.file} target="_blank"
          rel="noreferrer" variant="outlined" size="small" startIcon={<DocumentIcon />}
          sx={{ justifyContent: 'flex-start', fontSize: 12, borderColor: theme.palette.divider }}>
          {document.title || documentLabel}
        </Button>
      ))}
    </Stack>
  );
};
