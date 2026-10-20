import React, { useMemo, useState } from 'react';
import {
  Alert, Box, Button, ButtonBase, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, Drawer, FormControl,
  FormControlLabel, Grid, IconButton, InputLabel, MenuItem, Paper, Select,
  Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import AudioFileOutlinedIcon from '@mui/icons-material/AudioFileOutlined';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import RestoreOutlinedIcon from '@mui/icons-material/RestoreOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import TimelineIcon from '@mui/icons-material/Timeline';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';
import { SurfaceCard, INK, MUTED, SOFT_BG } from '../accounting/AccountingDashboardUI';
import { InfoLine, MetricBox, SectionHeading } from './StatementWorkspaceUI';

export const DMS_ACCENT = '#0f766e';
const GREEN = '#0f766e';
const AMBER = '#b45309';
const RED = '#be123c';
const BLUE = '#2563eb';
const VIOLET = '#7c3aed';
const SLATE = '#64748b';

export const CONFIDENTIALITY = {
  public: { label: 'عمومی', color: GREEN, bg: '#ecfdf5' },
  internal: { label: 'داخلی', color: BLUE, bg: '#eff6ff' },
  confidential: { label: 'محرمانه', color: AMBER, bg: '#fffbeb' },
  secret: { label: 'سری', color: RED, bg: '#fff1f2' },
};
export const DOC_STATUS = {
  draft: { label: 'پیش‌نویس', color: SLATE, bg: '#f8fafc' },
  active: { label: 'فعال', color: GREEN, bg: '#ecfdf5' },
  archived: { label: 'بایگانی‌شده', color: AMBER, bg: '#fffbeb' },
};
export const confidentialityMeta = (row) => CONFIDENTIALITY[row?.confidentiality] || CONFIDENTIALITY.internal;
export const statusMeta = (row) => DOC_STATUS[row?.status] || DOC_STATUS.active;

export const formatBytes = (bytes) => {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export const fileMeta = (document) => {
  const ext = (document?.file_extension || '').toLowerCase();
  if (ext === '.pdf') return { icon: PictureAsPdfOutlinedIcon, color: '#be123c', label: 'PDF' };
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)) return { icon: ImageOutlinedIcon, color: VIOLET, label: 'تصویر' };
  if (['.xls', '.xlsx', '.csv'].includes(ext)) return { icon: TableChartOutlinedIcon, color: GREEN, label: 'اکسل' };
  if (['.doc', '.docx'].includes(ext)) return { icon: DescriptionOutlinedIcon, color: BLUE, label: 'Word' };
  if (['.zip', '.rar'].includes(ext)) return { icon: ArchiveOutlinedIcon, color: AMBER, label: 'بایگانی' };
  if (['.mp3', '.wav', '.ogg'].includes(ext)) return { icon: AudioFileOutlinedIcon, color: VIOLET, label: 'صدا' };
  return { icon: InsertDriveFileOutlinedIcon, color: SLATE, label: 'فایل' };
};

export const FolderTree = ({ folders = [], selected, onSelect, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState({});
  const childrenByParent = useMemo(() => {
    const map = new Map();
    folders.forEach((folder) => {
      const key = folder.parent ? String(folder.parent) : 'root';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(folder);
    });
    return map;
  }, [folders]);
  const renderNodes = (parent, depth = 0) => (childrenByParent.get(parent) || []).map((folder) => {
    const hasChildren = (childrenByParent.get(String(folder.id)) || []).length > 0;
    const isExpanded = expanded[folder.id] !== false;
    const isSelected = String(selected) === String(folder.id);
    return (
      <Box key={folder.id}>
        <Box role="button" tabIndex={0} aria-label={`پوشه ${folder.name}`}
          onClick={() => onSelect(folder.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSelect(folder.id);
            }
          }}
          sx={{
            width: '100%', p: 0.6, pl: 0.6 + depth * 1.1, borderRadius: '9px', textAlign: 'right',
            cursor: 'pointer', bgcolor: isSelected ? alpha(folder.color || DMS_ACCENT, 0.09) : 'transparent',
            border: `1px solid ${isSelected ? alpha(folder.color || DMS_ACCENT, 0.22) : 'transparent'}`,
            '&:hover': { bgcolor: 'rgba(15,118,110,0.04)' },
            '&:focus-visible': { outline: `2px solid ${alpha(folder.color || DMS_ACCENT, 0.35)}`, outlineOffset: 1 },
          }}>
          <Stack direction="row" alignItems="center" spacing={0.35} sx={{ width: '100%' }}>
            <IconButton size="small" onClick={(event) => { event.stopPropagation(); setExpanded((previous) => ({ ...previous, [folder.id]: !isExpanded })); }}
              sx={{ p: 0.1, visibility: hasChildren ? 'visible' : 'hidden', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform .15s ease' }}>
              <ChevronRightIcon sx={{ fontSize: 14 }} />
            </IconButton>
            <FolderOutlinedIcon sx={{ fontSize: 16, color: folder.color || DMS_ACCENT }} />
            <Typography sx={{ flex: 1, minWidth: 0, fontSize: 8.8, fontWeight: 700, color: INK }} noWrap>{folder.name}</Typography>
            <Chip size="small" label={formatPersianNumber(folder.documents_count || 0)} sx={{ height: 18, fontSize: 7.5, bgcolor: SOFT_BG, color: MUTED }} />
            {onEdit ? <IconButton size="small" onClick={(event) => { event.stopPropagation(); onEdit(folder); }} sx={{ p: 0.15, color: MUTED }}><EditOutlinedIcon sx={{ fontSize: 12 }} /></IconButton> : null}
            {onDelete ? <IconButton size="small" onClick={(event) => { event.stopPropagation(); onDelete(folder); }} sx={{ p: 0.15, color: RED }}><DeleteOutlineIcon sx={{ fontSize: 12 }} /></IconButton> : null}
          </Stack>
        </Box>
        {hasChildren && isExpanded ? renderNodes(String(folder.id), depth + 1) : null}
      </Box>
    );
  });
  return <Stack spacing={0.1}>{renderNodes('root')}</Stack>;
};

export const DocumentCard = ({ row, onView, onEdit, onDownload, onArchive, onRestore, onDelete }) => {
  const theme = useTheme();
  const meta = fileMeta(row);
  const confidentiality = confidentialityMeta(row);
  const status = statusMeta(row);
  const Icon = meta.icon;
  return (
    <Paper elevation={0} sx={{
      height: '100%', p: 1.4, borderRadius: '16px', border: `1px solid ${theme.palette.divider}`,
      bgcolor: theme.palette.background.paper, display: 'flex', flexDirection: 'column', gap: 0.8,
      borderTop: `3px solid ${meta.color}`,
      transition: 'box-shadow .18s ease, border-color .18s ease',
      '&:hover': { borderColor: alpha(meta.color, 0.3), boxShadow: `0 10px 24px ${alpha(meta.color, 0.06)}` },
    }}>
      <Stack direction="row" alignItems="flex-start" spacing={0.8}>
        <Box sx={{ width: 38, height: 38, borderRadius: '10px', flexShrink: 0, bgcolor: alpha(meta.color, 0.08), color: meta.color, border: `1px solid ${alpha(meta.color, 0.16)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon sx={{ fontSize: 20 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 900, color: INK }}>{row.title}</Typography>
          <Typography noWrap sx={{ fontSize: 8.1, color: MUTED }}>{row.folder_path || row.folder_name || 'بدون پوشه'} · {row.file_name || 'فایل'}</Typography>
        </Box>
        <Chip size="small" label={confidentiality.label} sx={{ height: 20, fontSize: 7.8, fontWeight: 800, bgcolor: confidentiality.bg, color: confidentiality.color }} />
      </Stack>

      <Stack direction="row" spacing={0.35} useFlexGap flexWrap="wrap">
        <Chip size="small" label={status.label} sx={{ height: 18, fontSize: 7.4, fontWeight: 800, bgcolor: status.bg, color: status.color }} />
        <Chip size="small" label={`v${toPersianDigits(row.version_count || 1)}`} sx={{ height: 18, fontSize: 7.4, bgcolor: SOFT_BG, color: MUTED }} />
        <Chip size="small" label={row.file_size_display || formatBytes(row.file_size)} sx={{ height: 18, fontSize: 7.4, bgcolor: SOFT_BG, color: MUTED }} />
        {row.is_expired ? <Chip size="small" icon={<WarningAmberOutlinedIcon sx={{ fontSize: '12px !important' }} />} label="منقضی" sx={{ height: 18, fontSize: 7.4, bgcolor: '#fff1f2', color: RED, '& .MuiChip-icon': { color: RED } }} /> : null}
      </Stack>

      <Grid container spacing={0.55}>
        <Grid item xs={6}><MetricBox label="تاریخ صدور" value={toJalali(row.issue_date)} color={MUTED} /></Grid>
        <Grid item xs={6}><MetricBox label="تاریخ انقضا" value={toJalali(row.expiry_date)} color={row.is_expired ? RED : MUTED} /></Grid>
      </Grid>

      {row.tags_list?.length ? (
        <Stack direction="row" spacing={0.35} useFlexGap flexWrap="wrap">
          {row.tags_list.slice(0, 3).map((tag) => <Chip key={tag} size="small" label={tag} sx={{ height: 17, fontSize: 7.2, bgcolor: alpha(DMS_ACCENT, 0.05), color: DMS_ACCENT }} />)}
          {row.tags_list.length > 3 ? <Chip size="small" label={`+${toPersianDigits(row.tags_list.length - 3)}`} sx={{ height: 17, fontSize: 7.2, bgcolor: SOFT_BG, color: MUTED }} /> : null}
        </Stack>
      ) : null}

      <Divider sx={{ mt: 'auto' }} />
      <Stack direction="row" alignItems="center" spacing={0.2}>
        <Button size="small" startIcon={<VisibilityOutlinedIcon />} onClick={() => onView(row)} sx={{ fontSize: 8.2, minWidth: 0 }}>جزئیات</Button>
        <Tooltip title="دانلود"><span><IconButton size="small" onClick={() => onDownload?.(row)} disabled={!row.file_url} sx={{ color: BLUE, p: 0.35 }}><DownloadOutlinedIcon sx={{ fontSize: 16 }} /></IconButton></span></Tooltip>
        <Tooltip title="ویرایش / نسخه جدید"><IconButton size="small" onClick={() => onEdit(row)} sx={{ color: MUTED, p: 0.35 }}><EditOutlinedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
        <Box sx={{ flex: 1 }} />
        {row.status === 'archived' ? (
          <Tooltip title="بازگردانی"><IconButton size="small" onClick={() => onRestore(row)} sx={{ color: GREEN, p: 0.35 }}><RestoreOutlinedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
        ) : (
          <Tooltip title="بایگانی"><IconButton size="small" onClick={() => onArchive(row)} sx={{ color: AMBER, p: 0.35 }}><ArchiveOutlinedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
        )}
        <Tooltip title="حذف"><IconButton size="small" onClick={() => onDelete(row)} sx={{ color: RED, p: 0.35 }}><DeleteOutlineIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
      </Stack>
    </Paper>
  );
};

export const DocumentTable = ({ rows, onView, onEdit, onDownload, onArchive, onRestore, onDelete }) => {
  const theme = useTheme();
  const headSx = { fontWeight: 800, fontSize: 8.6, color: '#334155', bgcolor: '#f8fafc', whiteSpace: 'nowrap', py: 1 };
  const cellSx = { fontSize: 8.8, whiteSpace: 'nowrap', py: 0.8, borderBottom: '1px solid #eef2f7' };
  return (
    <Paper elevation={0} sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 580 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {['عنوان', 'پوشه', 'محرمانگی', 'وضعیت', 'نسخه', 'حجم', 'انقضا', 'اقدام'].map((label) => (
                <TableCell key={label} sx={headSx} align={label === 'اقدام' ? 'center' : 'right'}>{label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const confidentiality = confidentialityMeta(row);
              const status = statusMeta(row);
              return (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ ...cellSx, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 800 }}>{row.title}</TableCell>
                  <TableCell sx={{ ...cellSx, maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.folder_path || row.folder_name || '—'}</TableCell>
                  <TableCell sx={cellSx}><Chip size="small" label={confidentiality.label} sx={{ height: 19, fontSize: 7.8, fontWeight: 800, bgcolor: confidentiality.bg, color: confidentiality.color }} /></TableCell>
                  <TableCell sx={cellSx}><Chip size="small" label={status.label} sx={{ height: 19, fontSize: 7.8, fontWeight: 800, bgcolor: status.bg, color: status.color }} /></TableCell>
                  <TableCell sx={cellSx}>v{toPersianDigits(row.version_count || 1)}</TableCell>
                  <TableCell sx={cellSx}>{row.file_size_display || formatBytes(row.file_size)}</TableCell>
                  <TableCell sx={{ ...cellSx, color: row.is_expired ? RED : MUTED }}>{toJalali(row.expiry_date)}</TableCell>
                  <TableCell sx={{ ...cellSx, textAlign: 'center' }}>
                    <Tooltip title="جزئیات"><IconButton size="small" onClick={() => onView(row)} sx={{ p: 0.25, color: BLUE }}><VisibilityOutlinedIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                    <Tooltip title="دانلود"><span><IconButton size="small" onClick={() => onDownload?.(row)} disabled={!row.file_url} sx={{ p: 0.25, color: BLUE }}><DownloadOutlinedIcon sx={{ fontSize: 15 }} /></IconButton></span></Tooltip>
                    <Tooltip title="ویرایش"><IconButton size="small" onClick={() => onEdit(row)} sx={{ p: 0.25 }}><EditOutlinedIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                    {row.status === 'archived'
                      ? <Tooltip title="بازگردانی"><IconButton size="small" onClick={() => onRestore(row)} sx={{ p: 0.25, color: GREEN }}><RestoreOutlinedIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                      : <Tooltip title="بایگانی"><IconButton size="small" onClick={() => onArchive(row)} sx={{ p: 0.25, color: AMBER }}><ArchiveOutlinedIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>}
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

export const StorageCard = ({ stats, isLoading }) => (
  <SurfaceCard title="فضای بایگانی" icon={FolderOpenOutlinedIcon} color={DMS_ACCENT}
    action={<Chip size="small" label={formatBytes(stats?.storage_bytes || 0)} sx={{ height: 21, fontSize: 8.3, fontWeight: 800, bgcolor: alpha(DMS_ACCENT, 0.08), color: DMS_ACCENT }} />}>
    {isLoading ? <Box sx={{ py: 3, textAlign: 'center' }}><CircularProgress size={20} /></Box> : (
      <Stack spacing={1}>
        <Box>
          <Typography sx={{ fontSize: 26, fontWeight: 900, color: DMS_ACCENT }}>{formatBytes(stats?.storage_bytes || 0)}</Typography>
          <Typography sx={{ fontSize: 8.2, color: MUTED }}>حجم کل فایل‌های بایگانی‌شده</Typography>
        </Box>
        <Grid container spacing={0.55}>
          <Grid item xs={6}><MetricBox label="کل اسناد" value={formatPersianNumber(stats?.total || 0)} color={DMS_ACCENT} /></Grid>
          <Grid item xs={6}><MetricBox label="پوشه‌ها" value={formatPersianNumber(stats?.folders || 0)} color={BLUE} /></Grid>
          <Grid item xs={6}><MetricBox label="فعال" value={formatPersianNumber(stats?.active || 0)} color={GREEN} /></Grid>
          <Grid item xs={6}><MetricBox label="بایگانی" value={formatPersianNumber(stats?.archived || 0)} color={AMBER} /></Grid>
        </Grid>
        {(stats?.expiring_soon || stats?.expired) ? (
          <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap">
            {stats.expiring_soon ? <Chip size="small" label={`${formatPersianNumber(stats.expiring_soon)} انقضا تا ۳۰ روز`} sx={{ height: 19, fontSize: 7.8, bgcolor: '#fffbeb', color: AMBER }} /> : null}
            {stats.expired ? <Chip size="small" label={`${formatPersianNumber(stats.expired)} منقضی`} sx={{ height: 19, fontSize: 7.8, bgcolor: '#fff1f2', color: RED }} /> : null}
          </Stack>
        ) : null}
      </Stack>
    )}
  </SurfaceCard>
);

export const ActivityCard = ({ activities = [], onOpen }) => (
  <SurfaceCard title="آخرین فعالیت‌ها" icon={TimelineIcon} color={VIOLET}
    action={<Chip size="small" label={formatPersianNumber(activities.length)} sx={{ height: 19, fontSize: 7.8, bgcolor: alpha(VIOLET, 0.08), color: VIOLET }} />}>
    {activities.length ? (
      <Stack spacing={0.45}>
        {activities.slice(0, 6).map((activity) => (
          <ButtonBase key={activity.id} onClick={() => activity.document && onOpen?.(activity.document)}
            sx={{ width: '100%', p: 0.65, borderRadius: '9px', justifyContent: 'flex-start', textAlign: 'right', border: '1px solid #f1f5f9', bgcolor: '#fff', '&:hover': { bgcolor: alpha(VIOLET, 0.035) } }}>
            <Stack direction="row" alignItems="center" spacing={0.55} sx={{ width: '100%' }}>
              <Box sx={{ width: 25, height: 25, borderRadius: '7px', bgcolor: alpha(VIOLET, 0.08), color: VIOLET, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><TimelineIcon sx={{ fontSize: 13 }} /></Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 8.5, fontWeight: 800, color: INK }}>{activity.action_display} · {activity.document_title || 'سند'}</Typography>
                <Typography noWrap sx={{ fontSize: 7.5, color: MUTED }}>{activity.user_name || 'سیستم'} · {toJalali(String(activity.created_at || '').slice(0, 10))}</Typography>
              </Box>
            </Stack>
          </ButtonBase>
        ))}
      </Stack>
    ) : <Typography sx={{ fontSize: 8.6, color: MUTED }}>فعالیتی ثبت نشده است.</Typography>}
  </SurfaceCard>
);

export const DocumentDetailDrawer = ({
  row, activities = [], onClose, onEdit, onArchive, onRestore, onDelete, onRestoreVersion,
}) => {
  const theme = useTheme();
  if (!row) return null;
  const meta = fileMeta(row);
  const confidentiality = confidentialityMeta(row);
  const status = statusMeta(row);
  const Icon = meta.icon;
  const versions = Array.isArray(row.versions) ? row.versions : [];
  return (
    <Drawer anchor="left" open={Boolean(row)} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 460 }, bgcolor: SOFT_BG } }}>
      <Stack sx={{ height: '100%' }}>
        <Box sx={{ p: 1.7, bgcolor: theme.palette.background.paper, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" alignItems="flex-start" spacing={1}>
            <Box sx={{ width: 42, height: 42, borderRadius: '12px', flexShrink: 0, bgcolor: alpha(meta.color, 0.08), color: meta.color, border: `1px solid ${alpha(meta.color, 0.16)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon sx={{ fontSize: 22 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: 12.8, fontWeight: 900, color: INK }}>{row.title}</Typography>
              <Typography noWrap sx={{ fontSize: 8.8, color: MUTED }}>{row.folder_path || row.folder_name || 'بدون پوشه'} · {row.file_name || meta.label}</Typography>
            </Box>
            <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
          <Stack direction="row" spacing={0.45} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
            <Chip size="small" label={confidentiality.label} sx={{ height: 21, fontSize: 8.2, fontWeight: 800, bgcolor: confidentiality.bg, color: confidentiality.color }} />
            <Chip size="small" label={status.label} sx={{ height: 21, fontSize: 8.2, fontWeight: 800, bgcolor: status.bg, color: status.color }} />
            <Chip size="small" label={`نسخه ${toPersianDigits(row.version_count || 1)}`} sx={{ height: 21, fontSize: 8.2, bgcolor: SOFT_BG, color: MUTED }} />
            {row.is_locked ? <Chip size="small" label="قفل" sx={{ height: 21, fontSize: 8.2, bgcolor: '#fff1f2', color: RED }} /> : null}
          </Stack>
        </Box>

        <Box sx={{ p: 1.5, flex: 1, overflowY: 'auto' }}>
          <Stack spacing={1.3}>
            <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={InsertDriveFileOutlinedIcon} title="مشخصات فایل" color={meta.color} />
              <InfoLine label="نام فایل" value={row.file_name || '—'} />
              <InfoLine label="حجم" value={row.file_size_display || formatBytes(row.file_size)} />
              <InfoLine label="نوع" value={row.mime_type || meta.label} />
              <InfoLine label="شماره مرجع" value={row.reference_number || '—'} />
              <InfoLine label="ایجادکننده" value={row.created_by_name || '—'} />
              <InfoLine label="آخرین ویرایش" value={row.updated_by_name || '—'} />
            </Paper>

            <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={CalendarMonthIcon} title="متادیتا و تاریخ‌ها" color={BLUE} />
              <InfoLine label="تاریخ صدور" value={toJalali(row.issue_date)} />
              <InfoLine label="تاریخ انقضا" value={toJalali(row.expiry_date)} color={row.is_expired ? RED : INK} />
              <InfoLine label="نگهداری تا" value={toJalali(row.retention_until)} />
              {row.tags_list?.length ? (
                <Stack direction="row" spacing={0.35} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
                  {row.tags_list.map((tag) => <Chip key={tag} size="small" label={tag} sx={{ height: 19, fontSize: 7.8, bgcolor: alpha(DMS_ACCENT, 0.06), color: DMS_ACCENT }} />)}
                </Stack>
              ) : null}
            </Paper>

            <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={RestoreOutlinedIcon} title="نسخه‌ها" color={VIOLET}
                action={<Chip size="small" label={formatPersianNumber(versions.length)} sx={{ height: 19, fontSize: 7.8, bgcolor: alpha(VIOLET, 0.08), color: VIOLET }} />} />
              {versions.length ? (
                <Stack spacing={0.45}>
                  {versions.map((version) => (
                    <Stack key={version.id} direction="row" alignItems="center" spacing={0.55} sx={{ p: 0.65, borderRadius: '9px', border: '1px solid #eef2f7', bgcolor: '#fff' }}>
                      <Box sx={{ width: 26, height: 26, borderRadius: '7px', bgcolor: alpha(VIOLET, 0.08), color: VIOLET, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RestoreOutlinedIcon sx={{ fontSize: 14 }} /></Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography noWrap sx={{ fontSize: 8.7, fontWeight: 800, color: INK }}>نسخه {toPersianDigits(version.version_number)} · {version.original_name}</Typography>
                        <Typography sx={{ fontSize: 7.6, color: MUTED }}>{version.file_size_display} · {version.created_by_name || 'سیستم'} · {toJalali(String(version.created_at || '').slice(0, 10))}</Typography>
                      </Box>
                      {String(version.id) === String(row.current_version) ? (
                        <Chip size="small" label="جاری" sx={{ height: 18, fontSize: 7.4, bgcolor: '#ecfdf5', color: GREEN }} />
                      ) : (
                        <Tooltip title="بازگردانی این نسخه">
                          <IconButton size="small" onClick={() => onRestoreVersion?.(row, version)} sx={{ color: AMBER, p: 0.25 }}><RestoreOutlinedIcon sx={{ fontSize: 15 }} /></IconButton>
                        </Tooltip>
                      )}
                      {version.file_url ? <IconButton size="small" component="a" href={version.file_url} target="_blank" rel="noreferrer" sx={{ color: BLUE, p: 0.25 }}><DownloadOutlinedIcon sx={{ fontSize: 15 }} /></IconButton> : null}
                    </Stack>
                  ))}
                </Stack>
              ) : <Typography sx={{ fontSize: 8.5, color: MUTED }}>نسخه‌ای ثبت نشده است.</Typography>}
            </Paper>

            <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={TimelineIcon} title="تاریخچه فعالیت" color={VIOLET} />
              {activities.length ? (
                <Stack spacing={0.4}>
                  {activities.map((activity) => (
                    <Stack key={activity.id} direction="row" alignItems="center" spacing={0.55}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: VIOLET, flexShrink: 0 }} />
                      <Typography sx={{ flex: 1, fontSize: 8.2, color: INK }}>{activity.action_display} · {activity.user_name || 'سیستم'}</Typography>
                      <Typography sx={{ fontSize: 7.5, color: MUTED }}>{toJalali(String(activity.created_at || '').slice(0, 10))}</Typography>
                    </Stack>
                  ))}
                </Stack>
              ) : <Typography sx={{ fontSize: 8.5, color: MUTED }}>فعالیتی ثبت نشده است.</Typography>}
            </Paper>

            {row.description ? (
              <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
                <SectionHeading icon={DescriptionOutlinedIcon} title="توضیحات" color={MUTED} />
                <Typography sx={{ fontSize: 8.9, color: INK, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{row.description}</Typography>
              </Paper>
            ) : null}
          </Stack>
        </Box>

        <Divider />
        <Stack direction="row" spacing={0.55} sx={{ p: 1.35, bgcolor: theme.palette.background.paper }}>
          <Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(row)} sx={{ flex: 1 }}>ویرایش</Button>
          {row.status === 'archived'
            ? <Tooltip title="بازگردانی"><Button variant="outlined" onClick={() => onRestore(row)} sx={{ minWidth: 40, px: 1 }}><RestoreOutlinedIcon fontSize="small" /></Button></Tooltip>
            : <Tooltip title="بایگانی"><Button variant="outlined" onClick={() => onArchive(row)} sx={{ minWidth: 40, px: 1 }}><ArchiveOutlinedIcon fontSize="small" /></Button></Tooltip>}
          <Tooltip title="حذف"><Button color="error" variant="outlined" onClick={() => onDelete(row)} sx={{ minWidth: 40, px: 1 }}><DeleteOutlineIcon fontSize="small" /></Button></Tooltip>
        </Stack>
      </Stack>
    </Drawer>
  );
};

export const DocumentEditorDialog = ({
  open, onClose, form, setForm, folderList = [], error, setError, saving, onSave,
}) => {
  const selectedFolder = folderList.find((folder) => String(folder.id) === String(form.folder));
  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const file = form.file || null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '18px' } }}>
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', gap: 1.1, px: 2.5, py: 1.7,
        background: 'linear-gradient(120deg, rgba(15,118,110,0.12), rgba(37,99,235,0.05), rgba(255,255,255,0.5))',
        borderBottom: `1px solid ${alpha(DMS_ACCENT, 0.14)}`,
      }}>
        <Box sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: DMS_ACCENT, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UploadFileOutlinedIcon /></Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 900, color: INK }}>{form.id ? 'ویرایش سند / ثبت نسخه جدید' : 'آپلود سند جدید'}</Typography>
          <Typography noWrap sx={{ fontSize: 8.8, color: MUTED }}>{selectedFolder?.path || 'کتابخانه اسناد'} · {form.file?.name || form.file_name || 'انتخاب فایل برای بایگانی'}</Typography>
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {error ? <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: '10px', fontSize: 10 }}>{error}</Alert> : null}

        <Box component="label" sx={{
          display: 'flex', alignItems: 'center', gap: 1, p: 1.2, borderRadius: '12px', border: `1px dashed ${alpha(DMS_ACCENT, 0.35)}`,
          bgcolor: alpha(DMS_ACCENT, 0.025), cursor: 'pointer', '&:hover': { bgcolor: alpha(DMS_ACCENT, 0.05) },
        }}>
          <input type="file" hidden onChange={(event) => update('file', event.target.files?.[0] || null)}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.bmp,.zip,.rar" />
          <Box sx={{ width: 38, height: 38, borderRadius: '10px', bgcolor: alpha(DMS_ACCENT, 0.09), color: DMS_ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UploadFileOutlinedIcon /></Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 9.4, fontWeight: 800, color: INK }}>{file ? file.name : form.file_name || 'انتخاب فایل سند'}</Typography>
            <Typography sx={{ fontSize: 8, color: MUTED }}>{file ? formatBytes(file.size) : 'PDF، Word، Excel، PowerPoint، تصویر، متن یا ZIP · حداکثر ۵۰ مگابایت'}</Typography>
          </Box>
          <Chip size="small" label={form.id ? 'نسخه جدید' : 'انتخاب'} sx={{ height: 20, fontSize: 7.8, bgcolor: alpha(DMS_ACCENT, 0.08), color: DMS_ACCENT }} />
        </Box>

        <Grid container spacing={1.1}>
          <Grid item xs={12}><TextField size="small" fullWidth label="عنوان سند *" value={form.title || ''} onChange={(event) => update('title', event.target.value)} /></Grid>
          <Grid item xs={12} sm={6}>
            <FormControl size="small" fullWidth>
              <InputLabel>پوشه</InputLabel>
              <Select value={form.folder || ''} label="پوشه" onChange={(event) => update('folder', event.target.value)}>
                <MenuItem value="">بدون پوشه</MenuItem>
                {folderList.map((folder) => <MenuItem key={folder.id} value={folder.id}>{folder.path || folder.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="شماره مرجع / ثبت" value={form.reference_number || ''} onChange={(event) => update('reference_number', event.target.value)} /></Grid>
          <Grid item xs={12} sm={6}>
            <FormControl size="small" fullWidth>
              <InputLabel>سطح محرمانگی</InputLabel>
              <Select value={form.confidentiality || 'internal'} label="سطح محرمانگی" onChange={(event) => update('confidentiality', event.target.value)}>
                {Object.entries(CONFIDENTIALITY).map(([key, meta]) => <MenuItem key={key} value={key}>{meta.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl size="small" fullWidth>
              <InputLabel>وضعیت</InputLabel>
              <Select value={form.status || 'active'} label="وضعیت" onChange={(event) => update('status', event.target.value)}>
                {Object.entries(DOC_STATUS).map(([key, meta]) => <MenuItem key={key} value={key}>{meta.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4}><JalaliDatePicker fullWidth label="تاریخ صدور" value={form.issue_date || ''} onChange={(value) => update('issue_date', value)} /></Grid>
          <Grid item xs={12} sm={4}><JalaliDatePicker fullWidth label="تاریخ انقضا" value={form.expiry_date || ''} onChange={(value) => update('expiry_date', value)} /></Grid>
          <Grid item xs={12} sm={4}><JalaliDatePicker fullWidth label="نگهداری تا" value={form.retention_until || ''} onChange={(value) => update('retention_until', value)} /></Grid>
          <Grid item xs={12}><TextField size="small" fullWidth label="برچسب‌ها (با کاما جدا کنید)" value={form.tags || ''} onChange={(event) => update('tags', event.target.value)} placeholder="قرارداد, مالی, ۱۴۰۵" /></Grid>
          <Grid item xs={12}><TextField size="small" fullWidth multiline rows={2} label="توضیحات" value={form.description || ''} onChange={(event) => update('description', event.target.value)} /></Grid>
          <Grid item xs={12}>
            <FormControlLabel control={<Switch checked={Boolean(form.is_locked)} onChange={(event) => update('is_locked', event.target.checked)} />}
              label={<Typography sx={{ fontSize: 9.2, fontWeight: 700, color: INK }}>قفل ویرایش سند پس از ثبت</Typography>} />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 2.4, py: 1.4, borderTop: '1px solid #e5ebf0' }}>
        <Button onClick={onClose}>انصراف</Button>
        <Button variant="contained" onClick={onSave} disabled={saving || !form.title || (!form.id && !form.file)}
          startIcon={saving ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <UploadFileOutlinedIcon />}
          sx={{ px: 2.5, bgcolor: DMS_ACCENT, '&:hover': { bgcolor: '#115e59' } }}>
          {saving ? 'در حال ذخیره…' : form.id ? 'ذخیره / ثبت نسخه' : 'آپلود سند'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const FolderEditorDialog = ({
  open, onClose, form, setForm, folderList = [], editing, error, setError, saving, onSave,
}) => {
  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '18px' } }}>
      <DialogTitle sx={{ fontWeight: 900, fontSize: 14 }}>{editing ? 'ویرایش پوشه' : 'پوشه جدید'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, pt: 1 }}>
        {error ? <Alert severity="error" sx={{ borderRadius: '10px', fontSize: 10 }}>{error}</Alert> : null}
        <TextField size="small" fullWidth label="نام پوشه *" value={form.name || ''} onChange={(event) => update('name', event.target.value)} />
        <FormControl size="small" fullWidth>
          <InputLabel>پوشه والد</InputLabel>
          <Select value={form.parent || ''} label="پوشه والد" onChange={(event) => update('parent', event.target.value)}>
            <MenuItem value="">پوشه اصلی</MenuItem>
            {folderList.filter((folder) => String(folder.id) !== String(form.id)).map((folder) => <MenuItem key={folder.id} value={folder.id}>{folder.path || folder.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Stack direction="row" spacing={1} alignItems="center">
          <input type="color" value={form.color || '#0f766e'} onChange={(event) => update('color', event.target.value)}
            style={{ width: 42, height: 34, border: 'none', background: 'transparent', cursor: 'pointer' }} />
          <TextField size="small" fullWidth label="رنگ پوشه" value={form.color || '#0f766e'} onChange={(event) => update('color', event.target.value)} />
        </Stack>
        <TextField size="small" fullWidth multiline rows={2} label="توضیحات" value={form.description || ''} onChange={(event) => update('description', event.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>انصراف</Button>
        <Button variant="contained" onClick={onSave} disabled={saving || !form.name}
          sx={{ bgcolor: DMS_ACCENT, '&:hover': { bgcolor: '#115e59' } }}>{saving ? 'در حال ذخیره…' : 'ذخیره پوشه'}</Button>
      </DialogActions>
    </Dialog>
  );
};
