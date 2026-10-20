import React from 'react';
import {
  Alert, Box, Button, ButtonBase, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, Drawer, FormControl,
  Grid, IconButton, InputLabel, MenuItem, Paper, Select, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionIcon from '@mui/icons-material/Description';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GavelIcon from '@mui/icons-material/Gavel';
import SaveIcon from '@mui/icons-material/Save';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { ProgressBar, SurfaceCard, INK, MUTED, SOFT_BG } from '../accounting/AccountingDashboardUI';
import MoneyInput from '../../core/components/ui/MoneyInput';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';
import { InfoLine, MetricBox, SectionHeading, dateLabel, money } from './StatementWorkspaceUI';

export const DISPUTE_ACCENT = '#8b5cf6';
const GREEN = '#0f766e';
const AMBER = '#b45309';
const RED = '#be123c';
const PURPLE = '#7c3aed';
const SLATE = '#64748b';

export const DISPUTE_TYPES = {
  financial: 'مالی', technical: 'فنی', timeline: 'زمان‌بندی / تأخیر',
  quality: 'کیفیت', legal: 'حقوقی', other: 'سایر',
};
export const DISPUTE_STATUSES = {
  open: { label: 'باز', color: RED, bg: '#fff1f2', icon: GavelIcon },
  under_review: { label: 'در حال بررسی', color: AMBER, bg: '#fffbeb', icon: CalendarMonthIcon },
  resolved: { label: 'حل‌شده', color: GREEN, bg: '#ecfdf5', icon: CheckCircleIcon },
  escalated: { label: 'ارجاع بالاتر', color: PURPLE, bg: '#f5f3ff', icon: WarningAmberIcon },
  closed: { label: 'بسته', color: SLATE, bg: '#f8fafc', icon: TaskAltIcon },
};
export const SEVERITIES = {
  low: { label: 'کم', color: GREEN, bg: '#ecfdf5' },
  medium: { label: 'متوسط', color: AMBER, bg: '#fffbeb' },
  high: { label: 'زیاد', color: '#ea580c', bg: '#fff7ed' },
  critical: { label: 'بحرانی', color: RED, bg: '#fff1f2' },
};
export const disputeStatusMeta = (row) => DISPUTE_STATUSES[row?.status] || DISPUTE_STATUSES.open;
export const severityMeta = (row) => SEVERITIES[row?.severity] || SEVERITIES.medium;

export const DisputeCard = ({ row, onView, onEdit, onDelete }) => {
  const theme = useTheme();
  const status = disputeStatusMeta(row);
  const severity = severityMeta(row);
  const Icon = status.icon;
  return (
    <Paper elevation={0} sx={{
      height: '100%', p: 1.4, borderRadius: '16px', border: `1px solid ${theme.palette.divider}`,
      bgcolor: theme.palette.background.paper, display: 'flex', flexDirection: 'column', gap: 0.85,
      borderTop: `3px solid ${severity.color}`,
      transition: 'box-shadow .18s ease, border-color .18s ease',
      '&:hover': { borderColor: alpha(DISPUTE_ACCENT, 0.3), boxShadow: `0 10px 24px ${alpha(DISPUTE_ACCENT, 0.06)}` },
    }}>
      <Stack direction="row" alignItems="flex-start" spacing={0.8}>
        <Box sx={{ width: 36, height: 36, borderRadius: '10px', flexShrink: 0, bgcolor: alpha(severity.color, 0.08), color: severity.color, border: `1px solid ${alpha(severity.color, 0.16)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon sx={{ fontSize: 19 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 10.6, fontWeight: 900, color: INK }}>{row.title || 'اختلاف قرارداد'}</Typography>
          <Typography noWrap sx={{ fontSize: 8.3, color: MUTED }}>{row.contract_subject || 'قرارداد'} · {DISPUTE_TYPES[row.dispute_type] || 'سایر'}</Typography>
        </Box>
        <Chip size="small" label={status.label} sx={{ height: 21, fontSize: 8.2, fontWeight: 800, bgcolor: status.bg, color: status.color }} />
      </Stack>

      <Box sx={{ borderRadius: '11px', p: 0.9, bgcolor: alpha(severity.color, 0.035), border: `1px solid ${alpha(severity.color, 0.13)}` }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Box>
            <Typography sx={{ fontSize: 8.1, color: MUTED }}>مبلغ ادعا</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 900, color: row.claim_amount ? severity.color : MUTED }}>{row.claim_amount ? money(row.claim_amount, 'ریال') : 'ثبت نشده'}</Typography>
          </Box>
          <Chip size="small" label={`شدت ${severity.label}`} sx={{ height: 21, fontSize: 8.2, fontWeight: 800, bgcolor: severity.bg, color: severity.color }} />
        </Stack>
      </Box>

      <Grid container spacing={0.55}>
        <Grid item xs={6}><MetricBox label="تاریخ طرح" value={dateLabel(row.opened_date)} color={PURPLE} /></Grid>
        <Grid item xs={6}><MetricBox label="تاریخ حل" value={dateLabel(row.resolved_date)} color={row.resolved_date ? GREEN : MUTED} /></Grid>
      </Grid>

      {row.description ? (
        <Typography sx={{ fontSize: 8.4, color: MUTED, lineHeight: 1.8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{row.description}</Typography>
      ) : null}

      <Divider sx={{ mt: 'auto' }} />
      <Stack direction="row" alignItems="center" spacing={0.2}>
        <Button size="small" startIcon={<VisibilityOutlinedIcon />} onClick={() => onView(row)} sx={{ fontSize: 8.2, minWidth: 0 }}>جزئیات</Button>
        <Tooltip title="ویرایش"><IconButton size="small" onClick={() => onEdit(row)} sx={{ color: MUTED, p: 0.35 }}><EditOutlinedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="حذف"><IconButton size="small" onClick={() => onDelete(row)} sx={{ color: RED, p: 0.35 }}><DeleteOutlineIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
      </Stack>
    </Paper>
  );
};

export const DisputeTable = ({ rows, onView, onEdit, onDelete }) => {
  const theme = useTheme();
  const headSx = { fontWeight: 800, fontSize: 8.6, color: '#334155', bgcolor: '#f8fafc', whiteSpace: 'nowrap', py: 1 };
  const cellSx = { fontSize: 8.8, whiteSpace: 'nowrap', py: 0.8, borderBottom: '1px solid #eef2f7' };
  return (
    <Paper elevation={0} sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 560 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {['موضوع', 'قرارداد', 'نوع', 'شدت', 'وضعیت', 'مبلغ ادعا', 'تاریخ طرح', 'اقدام'].map((label) => (
                <TableCell key={label} sx={headSx} align={label === 'اقدام' ? 'center' : 'right'}>{label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const status = disputeStatusMeta(row);
              const severity = severityMeta(row);
              return (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ ...cellSx, fontWeight: 800, maxWidth: 230, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.title || '—'}</TableCell>
                  <TableCell sx={{ ...cellSx, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.contract_subject || '—'}</TableCell>
                  <TableCell sx={cellSx}>{DISPUTE_TYPES[row.dispute_type] || 'سایر'}</TableCell>
                  <TableCell sx={cellSx}><Chip size="small" label={severity.label} sx={{ height: 19, fontSize: 7.9, bgcolor: severity.bg, color: severity.color, fontWeight: 800 }} /></TableCell>
                  <TableCell sx={cellSx}><Chip size="small" label={status.label} sx={{ height: 19, fontSize: 7.9, bgcolor: status.bg, color: status.color, fontWeight: 800 }} /></TableCell>
                  <TableCell sx={cellSx}>{row.claim_amount ? money(row.claim_amount, 'ریال') : '—'}</TableCell>
                  <TableCell sx={cellSx}>{dateLabel(row.opened_date)}</TableCell>
                  <TableCell sx={{ ...cellSx, textAlign: 'center' }}>
                    <Tooltip title="جزئیات"><IconButton size="small" onClick={() => onView(row)} sx={{ p: 0.25, color: PURPLE }}><VisibilityOutlinedIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                    <Tooltip title="ویرایش"><IconButton size="small" onClick={() => onEdit(row)} sx={{ p: 0.25 }}><EditOutlinedIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                    <Tooltip title="حذف"><IconButton size="small" onClick={() => onDelete(row)} sx={{ p: 0.25, color: RED }}><DeleteOutlineIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export const DisputeStatusCard = ({ counts, active, onChange }) => {
  const items = [
    { key: 'all', label: 'همه دعاوی', color: DISPUTE_ACCENT, icon: GavelIcon },
    ...Object.entries(DISPUTE_STATUSES).map(([key, meta]) => ({ key, label: meta.label, color: meta.color, icon: meta.icon })),
  ];
  return (
    <SurfaceCard title="وضعیت دعاوی" icon={GavelIcon} color={DISPUTE_ACCENT}>
      <Stack spacing={0.42}>
        {items.map((item) => {
          const Icon = item.icon;
          const selected = active === item.key;
          return (
            <ButtonBase key={item.key} onClick={() => onChange(item.key)}
              sx={{ width: '100%', p: 0.65, borderRadius: '10px', justifyContent: 'flex-start', textAlign: 'right', border: `1px solid ${selected ? alpha(item.color, 0.3) : '#eef2f7'}`, bgcolor: selected ? alpha(item.color, 0.05) : '#fff', '&:hover': { bgcolor: alpha(item.color, 0.04) } }}>
              <Stack direction="row" alignItems="center" spacing={0.6} sx={{ width: '100%' }}>
                <Box sx={{ width: 26, height: 26, borderRadius: '8px', bgcolor: alpha(item.color, 0.08), color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon sx={{ fontSize: 14 }} /></Box>
                <Typography sx={{ flex: 1, fontSize: 8.5, fontWeight: selected ? 900 : 700, color: INK }}>{item.label}</Typography>
                <Chip size="small" label={formatPersianNumber(counts[item.key] || 0)} sx={{ height: 18, fontSize: 7.8, bgcolor: alpha(item.color, 0.08), color: item.color, fontWeight: 900 }} />
              </Stack>
            </ButtonBase>
          );
        })}
      </Stack>
    </SurfaceCard>
  );
};

export const DisputeSeverityCard = ({ counts, total }) => {
  const items = Object.entries(SEVERITIES);
  return (
    <SurfaceCard title="شدت دعاوی" icon={WarningAmberIcon} color={RED}>
      <Stack spacing={0.75}>
        {items.map(([key, meta]) => {
          const count = counts[key] || 0;
          const percent = total > 0 ? (count / total) * 100 : 0;
          return (
            <Box key={key}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
                <Typography sx={{ fontSize: 8.4, color: INK }}>{meta.label}</Typography>
                <Typography sx={{ fontSize: 8.2, fontWeight: 900, color: meta.color }}>{formatPersianNumber(count)}</Typography>
              </Stack>
              <ProgressBar value={percent} color={meta.color} height={5} />
            </Box>
          );
        })}
      </Stack>
    </SurfaceCard>
  );
};

export const DisputeContractsCard = ({ rows, onOpen }) => (
  <SurfaceCard title="قراردادهای دارای دعوا" icon={DescriptionIcon} color={DISPUTE_ACCENT}
    action={<Chip size="small" label={formatPersianNumber(rows.length)} sx={{ height: 19, fontSize: 7.8, bgcolor: alpha(DISPUTE_ACCENT, 0.08), color: DISPUTE_ACCENT }} />}>
    {rows.length ? (
      <Stack spacing={0.5}>
        {rows.map((item) => (
          <ButtonBase key={item.id} onClick={() => onOpen(item.id)}
            sx={{ width: '100%', p: 0.7, borderRadius: '10px', justifyContent: 'flex-start', textAlign: 'right', border: '1px solid #f1f5f9', bgcolor: '#fff', '&:hover': { bgcolor: alpha(DISPUTE_ACCENT, 0.04), borderColor: alpha(DISPUTE_ACCENT, 0.2) } }}>
            <Stack direction="row" alignItems="center" spacing={0.6} sx={{ width: '100%' }}>
              <Box sx={{ width: 26, height: 26, borderRadius: '8px', bgcolor: alpha(DISPUTE_ACCENT, 0.08), color: DISPUTE_ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><GavelIcon sx={{ fontSize: 14 }} /></Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 8.8, fontWeight: 800, color: INK }}>{item.subject || 'قرارداد'}</Typography>
                <Typography sx={{ fontSize: 7.6, color: MUTED }}>{formatPersianNumber(item.count)} دعوا · {money(item.claim, 'ریال')}</Typography>
              </Box>
              <ArrowForwardIcon sx={{ fontSize: 14, color: MUTED }} />
            </Stack>
          </ButtonBase>
        ))}
      </Stack>
    ) : <Typography sx={{ fontSize: 8.6, color: MUTED }}>دعوایی ثبت نشده است.</Typography>}
  </SurfaceCard>
);

export const DisputeDetailDrawer = ({ row, contract, onClose, onEdit, onDelete }) => {
  const theme = useTheme();
  if (!row) return null;
  const status = disputeStatusMeta(row);
  const severity = severityMeta(row);
  const StatusIcon = status.icon;
  return (
    <Drawer anchor="left" open={Boolean(row)} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, bgcolor: SOFT_BG } }}>
      <Stack sx={{ height: '100%' }}>
        <Box sx={{ p: 1.75, bgcolor: theme.palette.background.paper, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" alignItems="flex-start" spacing={1}>
            <Box sx={{ width: 40, height: 40, borderRadius: '12px', flexShrink: 0, bgcolor: alpha(severity.color, 0.08), color: severity.color, border: `1px solid ${alpha(severity.color, 0.16)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <StatusIcon sx={{ fontSize: 21 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 12.8, fontWeight: 900, color: INK }}>{row.title || 'اختلاف قرارداد'}</Typography>
              <Typography noWrap sx={{ fontSize: 9.2, color: MUTED }}>{row.contract_subject || contract?.subject || '—'}</Typography>
            </Box>
            <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
          <Stack direction="row" spacing={0.45} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
            <Chip size="small" label={status.label} sx={{ height: 21, fontSize: 8.3, fontWeight: 800, bgcolor: status.bg, color: status.color }} />
            <Chip size="small" label={`شدت ${severity.label}`} sx={{ height: 21, fontSize: 8.3, fontWeight: 800, bgcolor: severity.bg, color: severity.color }} />
            <Chip size="small" label={DISPUTE_TYPES[row.dispute_type] || 'سایر'} sx={{ height: 21, fontSize: 8.2, bgcolor: SOFT_BG, color: MUTED }} />
          </Stack>
        </Box>

        <Box sx={{ p: 1.5, flex: 1, overflowY: 'auto' }}>
          <Stack spacing={1.4}>
            <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={GavelIcon} title="اطلاعات دعوا" color={severity.color} />
              <Box sx={{ p: 1, borderRadius: '11px', bgcolor: alpha(severity.color, 0.04), border: `1px solid ${alpha(severity.color, 0.12)}`, mb: 0.8 }}>
                <Typography sx={{ fontSize: 8.2, color: MUTED }}>مبلغ ادعا</Typography>
                <Typography sx={{ fontSize: 17, fontWeight: 900, color: row.claim_amount ? severity.color : MUTED, lineHeight: 1.4 }}>{row.claim_amount ? money(row.claim_amount, 'ریال') : 'ثبت نشده'}</Typography>
              </Box>
              <InfoLine label="نوع اختلاف" value={DISPUTE_TYPES[row.dispute_type] || 'سایر'} />
              <InfoLine label="شدت" value={severity.label} color={severity.color} />
              <InfoLine label="وضعیت" value={status.label} color={status.color} />
              <InfoLine label="تاریخ طرح" value={dateLabel(row.opened_date)} />
              <InfoLine label="تاریخ حل" value={dateLabel(row.resolved_date)} />
            </Paper>

            <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={DescriptionIcon} title="قرارداد" color={DISPUTE_ACCENT} />
              <InfoLine label="قرارداد" value={row.contract_subject || contract?.subject} />
              <InfoLine label="شماره قرارداد" value={contract?.number} />
              <InfoLine label="طرف قرارداد" value={contract?.party_name} />
            </Paper>

            {row.description ? (
              <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
                <SectionHeading icon={DescriptionIcon} title="شرح اختلاف" color={MUTED} />
                <Typography sx={{ fontSize: 8.9, color: INK, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{row.description}</Typography>
              </Paper>
            ) : null}

            {row.resolution ? (
              <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
                <SectionHeading icon={CheckCircleIcon} title="اقدام / نتیجه" color={GREEN} />
                <Typography sx={{ fontSize: 8.9, color: INK, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{row.resolution}</Typography>
              </Paper>
            ) : null}
          </Stack>
        </Box>

        <Divider />
        <Stack direction="row" spacing={0.6} sx={{ p: 1.4, bgcolor: theme.palette.background.paper }}>
          <Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(row)} sx={{ flex: 1 }}>ویرایش</Button>
          <Tooltip title="حذف"><Button color="error" variant="outlined" onClick={() => onDelete(row)} sx={{ minWidth: 40, px: 1 }}><DeleteOutlineIcon fontSize="small" /></Button></Tooltip>
        </Stack>
      </Stack>
    </Drawer>
  );
};

export const DisputeEditorDialog = ({
  open, onClose, form, setForm, contractList, error, setError, saving, onSave,
}) => {
  const status = disputeStatusMeta(form);
  const severity = severityMeta(form);
  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const selectedContract = contractList.find((contract) => String(contract.id) === String(form.contract));
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '18px' } }}>
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', gap: 1.1, px: 2.5, py: 1.7,
        background: 'linear-gradient(120deg, rgba(139,92,246,0.13), rgba(239,68,68,0.05), rgba(255,255,255,0.5))',
        borderBottom: `1px solid ${alpha(DISPUTE_ACCENT, 0.14)}`,
      }}>
        <Box sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: DISPUTE_ACCENT, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><GavelIcon /></Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 900, color: INK }}>{form.id ? 'ویرایش اختلاف' : 'ثبت اختلاف جدید'}</Typography>
          <Typography noWrap sx={{ fontSize: 8.8, color: MUTED }}>{selectedContract?.subject || 'انتخاب قرارداد و ثبت جزئیات دعوا'}</Typography>
        </Box>
        <Chip size="small" label={status.label} sx={{ height: 22, fontSize: 8.2, fontWeight: 800, bgcolor: status.bg, color: status.color }} />
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {error ? <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: '10px', fontSize: 10 }}>{error}</Alert> : null}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.4fr 1fr 1fr 1fr' }, gap: 0.7, p: 1, borderRadius: '12px', bgcolor: SOFT_BG, border: '1px solid #e8eef2' }}>
          <Box><Typography sx={{ fontSize: 7.7, color: MUTED }}>قرارداد</Typography><Typography noWrap sx={{ fontSize: 9.1, fontWeight: 800, color: INK }}>{selectedContract?.subject || '—'}</Typography></Box>
          <Box><Typography sx={{ fontSize: 7.7, color: MUTED }}>شدت</Typography><Typography sx={{ fontSize: 9.6, fontWeight: 900, color: severity.color }}>{severity.label}</Typography></Box>
          <Box><Typography sx={{ fontSize: 7.7, color: MUTED }}>وضعیت</Typography><Typography sx={{ fontSize: 9.6, fontWeight: 900, color: status.color }}>{status.label}</Typography></Box>
          <Box><Typography sx={{ fontSize: 7.7, color: MUTED }}>مبلغ ادعا</Typography><Typography noWrap sx={{ fontSize: 9.6, fontWeight: 900, color: form.claim_amount ? severity.color : MUTED }}>{form.claim_amount ? money(form.claim_amount, 'ریال') : '—'}</Typography></Box>
        </Box>

        <Grid container spacing={1.1}>
          <Grid item xs={12}>
            <FormControl size="small" fullWidth>
              <InputLabel>قرارداد *</InputLabel>
              <Select value={form.contract || ''} label="قرارداد *" onChange={(event) => update('contract', event.target.value)}>
                {contractList.map((contract) => <MenuItem key={contract.id} value={contract.id}>{contract.subject || contract.number}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}><TextField size="small" fullWidth label="موضوع اختلاف *" value={form.title || ''} onChange={(event) => update('title', event.target.value)} /></Grid>

          <Grid item xs={12} sm={6}>
            <FormControl size="small" fullWidth>
              <InputLabel>نوع اختلاف</InputLabel>
              <Select value={form.dispute_type || 'other'} label="نوع اختلاف" onChange={(event) => update('dispute_type', event.target.value)}>
                {Object.entries(DISPUTE_TYPES).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl size="small" fullWidth>
              <InputLabel>شدت</InputLabel>
              <Select value={form.severity || 'medium'} label="شدت" onChange={(event) => update('severity', event.target.value)}>
                {Object.entries(SEVERITIES).map(([key, meta]) => <MenuItem key={key} value={key}>{meta.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl size="small" fullWidth>
              <InputLabel>وضعیت</InputLabel>
              <Select value={form.status || 'open'} label="وضعیت" onChange={(event) => update('status', event.target.value)}>
                {Object.entries(DISPUTE_STATUSES).map(([key, meta]) => <MenuItem key={key} value={key}>{meta.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}><MoneyInput size="small" fullWidth label="مبلغ ادعا (ریال)" value={form.claim_amount ?? 0} onChange={(value) => update('claim_amount', value)} /></Grid>
          <Grid item xs={12} sm={6}><JalaliDatePicker fullWidth label="تاریخ طرح" value={form.opened_date || ''} onChange={(value) => update('opened_date', value)} /></Grid>
          <Grid item xs={12} sm={6}><JalaliDatePicker fullWidth label="تاریخ حل" value={form.resolved_date || ''} onChange={(value) => update('resolved_date', value)} /></Grid>
          <Grid item xs={12}><TextField size="small" fullWidth multiline rows={2} label="شرح اختلاف" value={form.description || ''} onChange={(event) => update('description', event.target.value)} /></Grid>
          <Grid item xs={12}><TextField size="small" fullWidth multiline rows={2} label="اقدام / نتیجه" value={form.resolution || ''} onChange={(event) => update('resolution', event.target.value)} /></Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 2.4, py: 1.4, borderTop: '1px solid #e5ebf0' }}>
        <Button onClick={onClose}>انصراف</Button>
        <Button variant="contained" onClick={onSave} disabled={saving || !form.contract || !form.title}
          startIcon={saving ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <SaveIcon />}
          sx={{ px: 2.5, bgcolor: DISPUTE_ACCENT, '&:hover': { bgcolor: '#7c3aed' } }}>
          {saving ? 'در حال ذخیره…' : 'ذخیره اختلاف'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
