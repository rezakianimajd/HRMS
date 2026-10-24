import React, { useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Box, Button, ButtonBase, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Drawer, FormControl, FormHelperText, Grid,
  IconButton, InputAdornment, InputLabel, LinearProgress, MenuItem, Paper, Select,
  Snackbar, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import ImageIcon from '@mui/icons-material/Image';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import LockIcon from '@mui/icons-material/Lock';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import TableChartIcon from '@mui/icons-material/TableChart';
import TableRowsIcon from '@mui/icons-material/TableRows';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import PageHeader from '../core/components/ui/PageHeader';
import DataTable from '../core/components/ui/DataTable';
import ContractListPicker from '../core/components/ui/ContractListPicker';
import { formatPersianNumber, formatStatementNumber, normalizeCurrencyLabel, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import { KpiTile, SurfaceCard, INK, MUTED, SOFT_BG } from './accounting/AccountingDashboardUI';
import {
  DOC_ACCENT, FILE_TYPE_META, RELATION_META, RELATION_ORDER,
  countByFileType, countByRelation, documentTitleForFile, fileMeta,
  formatFileSize, matchesDocumentSearch, relationKeyOf, relationMetaOf,
  relationOptionLabel, relationTargetLabel,
} from './contracts/contractDocumentsHelpers';

const ACCENT = DOC_ACCENT;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.zip', '.rar',
];
const EMPTY_FORM = {
  id: null, contract: '', relationType: 'contract', addendum: '',
  guarantee: '', statement: '', title: '', files: [], existing: null,
};

const FILE_ICONS = {
  pdf: PictureAsPdfIcon,
  image: ImageIcon,
  word: DescriptionIcon,
  excel: TableChartIcon,
  powerpoint: ViewModuleIcon,
  archive: FolderSharedIcon,
  other: InsertDriveFileIcon,
};

const RELATION_ICONS = {
  contract: FolderSharedIcon,
  addendum: NoteAltIcon,
  guarantee: LockIcon,
  statement: ReceiptLongIcon,
};

const fileIconFor = (row) => FILE_ICONS[fileMeta(row).iconKey] || InsertDriveFileIcon;
const relationIconFor = (row) => RELATION_ICONS[relationMetaOf(row).iconKey] || FolderSharedIcon;
const dateLabel = (value) => (value ? toJalali(String(value).slice(0, 10)) : '—');
const money = (value, currency = 'ریال') => `${formatPersianNumber(Number(value) || 0)} ${currency}`;

const InfoLine = ({ label, value, strong, ltr }) => {
  const display = value === null || value === undefined || value === '' ? '—' : value;
  return (
    <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1} sx={{ py: 0.38 }}>
      <Typography sx={{ fontSize: 12, color: MUTED, flexShrink: 0 }}>{label}</Typography>
      <Typography sx={{
        fontSize: strong ? 10.8 : 9.9, fontWeight: strong ? 900 : 700, color: INK,
        textAlign: 'left', direction: ltr ? 'ltr' : 'rtl', minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }} title={typeof display === 'string' ? display : undefined}>
        {display}
      </Typography>
    </Stack>
  );
};

const SectionHeading = ({ icon: Icon, title, hint, color = '#2563eb', action }) => (
  <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.8 }}>
    {Icon ? (
      <Box sx={{
        width: 27, height: 27, borderRadius: '8px', color, bgcolor: alpha(color, 0.08),
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon sx={{ fontSize: 15 }} />
      </Box>
    ) : null}
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 900, color: INK }}>{title}</Typography>
      {hint ? <Typography sx={{ fontSize: 10.5, color: MUTED }}>{hint}</Typography> : null}
    </Box>
    {action || null}
  </Stack>
);

const FileBadge = ({ row, size = 38 }) => {
  const meta = fileMeta(row);
  const Icon = fileIconFor(row);
  return (
    <Box sx={{
      width: size, height: size, borderRadius: '11px', flexShrink: 0,
      bgcolor: alpha(meta.color, 0.08), color: meta.color,
      border: `1px solid ${alpha(meta.color, 0.16)}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon sx={{ fontSize: Math.max(18, size * 0.52) }} />
    </Box>
  );
};

const RelationPill = ({ row, size = 21 }) => {
  const meta = relationMetaOf(row);
  const Icon = relationIconFor(row);
  return (
    <Chip size="small" icon={<Icon sx={{ fontSize: 12 }} />} label={meta.label}
      sx={{
        height: size, fontSize: 11, fontWeight: 800,
        bgcolor: alpha(meta.color, 0.07), color: meta.color,
        '& .MuiChip-icon': { color: meta.color },
      }} />
  );
};

const FileTypeChip = ({ row }) => {
  const meta = fileMeta(row);
  return <Chip size="small" label={meta.label}
    sx={{ height: 20, fontSize: 11, fontWeight: 800, bgcolor: alpha(meta.color, 0.07), color: meta.color }} />;
};


const ContractSnapshotCard = ({ contract, accent, onBack, currency, documentCount = 0 }) => (
  <SurfaceCard title="قرارداد" icon={DescriptionIcon} color={accent}
    action={<Button size="small" startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ minWidth: 0, fontSize: 12 }}>تغییر</Button>}>
    <Stack spacing={0.75}>
      <Box>
        <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: INK, lineHeight: 1.6 }}>
          {contract?.subject || 'قرارداد'}
        </Typography>
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.3 }}>
          <Chip size="small" label={contract?.number || 'بدون شماره'}
            sx={{ height: 20, fontSize: 11, fontWeight: 800, bgcolor: alpha(accent, 0.07), color: accent }} />
          {contract?.status_display ? (
            <Chip size="small" label={contract.status_display}
              sx={{ height: 20, fontSize: 11, bgcolor: SOFT_BG, color: MUTED }} />
          ) : null}
        </Stack>
      </Box>
      <Divider />
      <InfoLine label="طرف قرارداد" value={contract?.party_name} />
      <InfoLine label="مبلغ قرارداد" value={money(contract?.amount, currency)} ltr />
      <InfoLine label="تاریخ شروع" value={dateLabel(contract?.start_date)} />
      <InfoLine label="تاریخ پایان" value={dateLabel(contract?.effective_end_date || contract?.end_date)} />
      <InfoLine label="تعداد اسناد" value={formatPersianNumber(documentCount)} strong />
    </Stack>
  </SurfaceCard>
);

const RelationBreakdown = ({ counts, active, onChange, accent, fileCounts = {} }) => (
  <SurfaceCard title="نقشهٔ اسناد" icon={FolderSharedIcon} color={accent}>
    <Stack spacing={0.2}>
      <ButtonBase onClick={() => onChange('all')} sx={{
        width: '100%', p: 0.7, borderRadius: '9px', justifyContent: 'space-between',
        bgcolor: active === 'all' ? alpha(accent, 0.07) : 'transparent',
        border: `1px solid ${active === 'all' ? alpha(accent, 0.18) : 'transparent'}`,
      }}>
        <Stack direction="row" alignItems="center" spacing={0.65}>
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: accent }} />
          <Typography sx={{ fontSize: 12, fontWeight: active === 'all' ? 900 : 700, color: active === 'all' ? accent : INK }}>
            همهٔ اسناد
          </Typography>
        </Stack>
        <Chip size="small" label={formatPersianNumber(counts.all || 0)} sx={{ height: 18, fontSize: 11, bgcolor: SOFT_BG }} />
      </ButtonBase>
      {RELATION_ORDER.map((key) => {
        const meta = RELATION_META[key];
        const Icon = RELATION_ICONS[key];
        return (
          <ButtonBase key={key} onClick={() => onChange(key)} sx={{
            width: '100%', p: 0.7, borderRadius: '9px', justifyContent: 'space-between',
            bgcolor: active === key ? alpha(meta.color, 0.07) : 'transparent',
            border: `1px solid ${active === key ? alpha(meta.color, 0.18) : 'transparent'}`,
          }}>
            <Stack direction="row" alignItems="center" spacing={0.65}>
              <Box sx={{
                width: 21, height: 21, borderRadius: '6px', bgcolor: alpha(meta.color, 0.08),
                color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon sx={{ fontSize: 12 }} /></Box>
              <Typography sx={{ fontSize: 12, fontWeight: active === key ? 900 : 700, color: active === key ? meta.color : INK }}>
                {meta.label}
              </Typography>
            </Stack>
            <Chip size="small" label={formatPersianNumber(counts[key] || 0)} sx={{ height: 18, fontSize: 11, bgcolor: SOFT_BG }} />
          </ButtonBase>
        );
      })}
      <Divider sx={{ my: 0.5 }} />
      <Stack direction="row" spacing={0.45} useFlexGap flexWrap="wrap">
        {Object.entries(fileCounts).map(([key, count]) => (
          <Chip key={key} size="small"
            label={`${FILE_TYPE_META[key]?.label || key} ${formatPersianNumber(count)}`}
            sx={{ height: 19, fontSize: 10.5, bgcolor: alpha(FILE_TYPE_META[key]?.color || MUTED, 0.07), color: FILE_TYPE_META[key]?.color || MUTED }} />
        ))}
        {!Object.keys(fileCounts).length ? <Typography sx={{ fontSize: 11, color: MUTED }}>هنوز فایلی ثبت نشده است.</Typography> : null}
      </Stack>
    </Stack>
  </SurfaceCard>
);


const LatestDocsPanel = ({ documents, onOpen, onSelectContract, accent }) => (
  <SurfaceCard title="آخرین اسناد" icon={UploadFileIcon} color={accent}
    action={<Chip size="small" label={formatPersianNumber(documents.length)} sx={{ height: 21, fontSize: 11, bgcolor: alpha(accent, 0.07), color: accent, fontWeight: 900 }} />}>
    {documents.length ? (
      <Stack spacing={0.55}>
        {documents.map((row) => (
          <ButtonBase key={row.id}
            onClick={() => { onOpen(row); onSelectContract(row.contract); }}
            sx={{
              width: '100%', p: 0.85, borderRadius: '10px', justifyContent: 'flex-start',
              border: '1px solid #f1f5f9', bgcolor: '#fff', textAlign: 'right',
              '&:hover': { bgcolor: alpha(accent, 0.035), borderColor: alpha(accent, 0.16) },
            }}>
            <Stack direction="row" alignItems="center" spacing={0.8} sx={{ width: '100%' }}>
              <FileBadge row={row} size={30} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{row.title}</Typography>
                <Typography noWrap sx={{ fontSize: 11, color: MUTED }}>
                  {row.contract_number || '—'} · {dateLabel(row.uploaded_at)}
                </Typography>
              </Box>
              <RelationPill row={row} size={19} />
            </Stack>
          </ButtonBase>
        ))}
      </Stack>
    ) : (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <FolderSharedIcon sx={{ fontSize: 30, color: '#cbd5e1', mb: 0.6 }} />
        <Typography sx={{ fontSize: 12, color: MUTED }}>هنوز سندی بارگذاری نشده است.</Typography>
      </Box>
    )}
  </SurfaceCard>
);

const LandingContent = ({ contractList, documents, docCountByContract, accent, onSelect, onSelectContract, onOpen }) => {
  const relationCounts = useMemo(() => countByRelation(documents), [documents]);
  const contractsWithDocs = new Set(documents.map((row) => String(row.contract))).size;
  const latest = useMemo(
    () => [...documents].sort((a, b) => String(b.uploaded_at || '').localeCompare(String(a.uploaded_at || ''))).slice(0, 7),
    [documents],
  );
  return (
    <>
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={6} md={3}>
          <KpiTile icon={FolderSharedIcon} label="کل اسناد" value={formatPersianNumber(documents.length)}
            suffix="سند" color={accent} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={DescriptionIcon} label="قراردادهای دارای سند" value={formatPersianNumber(contractsWithDocs)}
            suffix="قرارداد" color="#2563eb" />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={NoteAltIcon} label="پیوست الحاقیه و تضمین"
            value={formatPersianNumber((relationCounts.addendum || 0) + (relationCounts.guarantee || 0))}
            suffix="سند" color="#7c3aed" />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={ReceiptLongIcon} label="اسناد صورت‌وضعیت" value={formatPersianNumber(relationCounts.statement || 0)}
            suffix="سند" color="#b45309" />
        </Grid>
      </Grid>
      <Grid container spacing={1.5}>
        <Grid item xs={12} lg={8}>
          <SurfaceCard title="انتخاب قرارداد" icon={FolderSharedIcon} color={accent}>
            <ContractListPicker
              contracts={contractList}
              onSelect={onSelect}
              height={540}
              accent={accent}
              countLabel="سند"
              countHeaderLabel="تعداد اسناد"
              getCount={(contract) => docCountByContract[String(contract.id)] || 0}
            />
          </SurfaceCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Stack spacing={1.5}>
            <LatestDocsPanel documents={latest} onOpen={onOpen} onSelectContract={onSelectContract} accent={accent} />
            <SurfaceCard title="راهنمای بایگانی" icon={LockIcon} color="#64748b">
              <Stack spacing={0.55}>
                {[
                  ['اسناد عمومی قرارداد', 'قرارداد، مکاتبات، مجوزها و پیوست‌های عمومی'],
                  ['الحاقیه', 'فقط PDF و متصل به همان الحاقیه'],
                  ['تضمین', 'فقط PDF و متصل به همان تضمین'],
                  ['صورت‌وضعیت', 'مستندات پشتیبان همان صورت‌وضعیت'],
                ].map(([title, hint]) => (
                  <Stack key={title} direction="row" spacing={0.65} alignItems="flex-start">
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: accent, mt: 0.7, flexShrink: 0 }} />
                    <Box>
                      <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: INK }}>{title}</Typography>
                      <Typography sx={{ fontSize: 10.5, color: MUTED }}>{hint}</Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </SurfaceCard>
          </Stack>
        </Grid>
      </Grid>
    </>
  );
};


const DocumentCard = ({ row, onView, onEdit, onDelete, onPreview, onDownload }) => {
  const theme = useTheme();
  const meta = fileMeta(row);
  return (
    <Paper elevation={0} sx={{
      height: '100%', p: 1.4, borderRadius: '16px', border: `1px solid ${theme.palette.divider}`,
      bgcolor: theme.palette.background.paper, display: 'flex', flexDirection: 'column', gap: 0.8,
      borderTop: `3px solid ${meta.color}`, transition: 'box-shadow .18s ease, border-color .18s ease',
      '&:hover': { borderColor: alpha(meta.color, 0.35), boxShadow: `0 10px 24px ${alpha(meta.color, 0.07)}` },
    }}>
      <Stack direction="row" alignItems="flex-start" spacing={0.9}>
        <FileBadge row={row} size={38} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap title={row.title} sx={{ fontSize: 12.5, fontWeight: 900, color: INK }}>
            {row.title}
          </Typography>
          <Typography noWrap title={row.file_name} sx={{ fontSize: 10.5, color: MUTED, direction: 'ltr', textAlign: 'right' }}>
            {row.file_name || '—'}
          </Typography>
        </Box>
        <FileTypeChip row={row} />
      </Stack>

      <Stack direction="row" spacing={0.45} useFlexGap flexWrap="wrap">
        <RelationPill row={row} />
        <Chip size="small" label={relationTargetLabel(row)}
          sx={{ height: 21, fontSize: 10.5, maxWidth: 210, bgcolor: SOFT_BG, color: MUTED }} />
      </Stack>

      <Box sx={{ p: 0.8, borderRadius: '9px', bgcolor: alpha(meta.color, 0.035), border: `1px solid ${alpha(meta.color, 0.09)}` }}>
        <Stack direction="row" justifyContent="space-between" spacing={1}>
          <Box>
            <Typography sx={{ fontSize: 10, color: MUTED }}>بارگذاری</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: INK }}>{dateLabel(row.uploaded_at)}</Typography>
          </Box>
          <Box sx={{ textAlign: 'left' }}>
            <Typography sx={{ fontSize: 10, color: MUTED }}>حجم</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: INK }}>{row.file_size_display || formatFileSize(row.file_size)}</Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ flex: 1 }} />
      <Divider />
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.5}>
        <Typography noWrap sx={{ fontSize: 10.5, color: MUTED, maxWidth: 150 }}>
          {row.contract_number || '—'}
        </Typography>
        <Stack direction="row" spacing={0.05} alignItems="center">
          <Tooltip title="پیش‌نمایش"><IconButton size="small" onClick={() => onPreview(row)}><OpenInNewIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
          <Tooltip title="دانلود"><IconButton size="small" color="primary" onClick={() => onDownload(row)}><DownloadIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
          <Tooltip title="جزئیات"><IconButton size="small" onClick={() => onView(row)}><VisibilityIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
          <Tooltip title="ویرایش"><IconButton size="small" onClick={() => onEdit(row)}><EditIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
          <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => onDelete(row)}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
};


const DocumentTable = ({ rows, onView, onEdit, onDelete, onPreview, onDownload }) => (
  <DataTable
    rows={rows}
    getRowId={(row) => row.id}
    maxHeight="calc(100vh - 330px)"
    stickyHeader
    ariaLabel="فهرست اسناد قرارداد"
    tableSx={{ '& td, & th': { px: 1.2, py: 0.8 } }}
    columns={[
      {
        key: 'title',
        label: 'سند',
        render: (row) => (
          <Stack direction="row" alignItems="center" spacing={0.7}>
            <FileBadge row={row} size={28} />
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: 12, fontWeight: 800 }}>{row.title}</Typography>
              <Typography noWrap sx={{ fontSize: 10.5, color: MUTED, direction: 'ltr', textAlign: 'right' }}>
                {row.file_name || '—'}
              </Typography>
            </Box>
          </Stack>
        ),
      },
      { key: 'type', label: 'نوع', align: 'center', render: (row) => <FileTypeChip row={row} /> },
      {
        key: 'relation', label: 'جایگاه', align: 'center',
        render: (row) => (
          <Stack spacing={0.3} alignItems="center">
            <RelationPill row={row} />
            <Typography noWrap title={relationTargetLabel(row)} sx={{ fontSize: 10.5, color: MUTED, maxWidth: 170 }}>
              {relationTargetLabel(row)}
            </Typography>
          </Stack>
        ),
      },
      {
        key: 'contract', label: 'قرارداد', cellSx: { maxWidth: 190 },
        render: (row) => (
          <Box>
            <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800 }}>{row.contract_number || '—'}</Typography>
            <Typography noWrap title={row.contract_subject} sx={{ fontSize: 10.5, color: MUTED }}>{row.contract_subject || '—'}</Typography>
          </Box>
        ),
      },
      { key: 'uploaded', label: 'تاریخ بارگذاری', align: 'center', render: (row) => dateLabel(row.uploaded_at) },
      {
        key: 'actions', label: 'عملیات', align: 'center', cellSx: { whiteSpace: 'nowrap' },
        render: (row) => (
          <Stack direction="row" spacing={0.05} justifyContent="center">
            <Tooltip title="پیش‌نمایش"><IconButton size="small" onClick={() => onPreview(row)}><OpenInNewIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
            <Tooltip title="دانلود"><IconButton size="small" onClick={() => onDownload(row)}><DownloadIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
            <Tooltip title="جزئیات"><IconButton size="small" onClick={() => onView(row)}><VisibilityIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
            <Tooltip title="ویرایش"><IconButton size="small" onClick={() => onEdit(row)}><EditIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
            <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => onDelete(row)}><DeleteIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
          </Stack>
        ),
      },
    ]}
  />
);


const DocumentDetailDrawer = ({ row, onClose, onEdit, onDelete, accent }) => {
  const theme = useTheme();
  if (!row) return null;
  const meta = fileMeta(row);
  const relation = relationMetaOf(row);
  const relationIcon = RELATION_ICONS[relation.iconKey] || FolderSharedIcon;
  const isPdf = meta.key === 'pdf';
  const isImage = meta.key === 'image';

  return (
    <Drawer anchor="left" open={Boolean(row)} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 500 }, bgcolor: SOFT_BG } }}>
      <Stack sx={{ height: '100%' }}>
        <Box sx={{ p: 1.7, bgcolor: theme.palette.background.paper, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" alignItems="flex-start" spacing={1}>
            <FileBadge row={row} size={42} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 900, color: INK }}>{row.title}</Typography>
              <Typography noWrap title={row.file_name} sx={{ fontSize: 10.5, color: MUTED, direction: 'ltr', textAlign: 'right' }}>
                {row.file_name || '—'}
              </Typography>
            </Box>
            <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
          <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
            <RelationPill row={row} />
            <FileTypeChip row={row} />
            <Chip size="small" label={row.file_size_display || formatFileSize(row.file_size)}
              sx={{ height: 21, fontSize: 11, bgcolor: SOFT_BG, color: MUTED }} />
            <Chip size="small" label={row.contract_number || 'بدون شماره قرارداد'}
              sx={{ height: 21, fontSize: 11, bgcolor: alpha(accent, 0.07), color: accent }} />
          </Stack>
        </Box>

        <Box sx={{ p: 1.5, flex: 1, overflowY: 'auto' }}>
          <Stack spacing={1.4}>
            <Paper elevation={0} sx={{ p: 1.3, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={OpenInNewIcon} title="پیش‌نمایش فایل" color={meta.color}
                action={<Button size="small" onClick={() => window.open(row.file_url, '_blank', 'noopener,noreferrer')}
                  sx={{ minWidth: 0, fontSize: 11 }}>بازکردن</Button>} />
              {isPdf ? (
                <Box component="iframe" title={row.title} src={row.file_url}
                  sx={{ width: '100%', height: 280, border: 0, borderRadius: '10px', bgcolor: '#fff' }} />
              ) : isImage ? (
                <Box component="img" src={row.file_url} alt={row.title}
                  sx={{ width: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: '10px', bgcolor: '#fff' }} />
              ) : (
                <Box sx={{ p: 2.2, borderRadius: '10px', bgcolor: '#fff', textAlign: 'center', border: '1px dashed #e2e8f0' }}>
                  <FileBadge row={row} size={40} />
                  <Typography sx={{ mt: 0.7, fontSize: 11.5, color: MUTED }}>
                    پیش‌نمایش مرورگر برای این نوع فایل در دسترس نیست؛ فایل را باز یا دانلود کنید.
                  </Typography>
                </Box>
              )}
            </Paper>

            <Paper elevation={0} sx={{ p: 1.3, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={relationIcon} title="جایگاه سند" color={relation.color} />
              <InfoLine label="نوع ارتباط" value={relation.label} strong />
              <InfoLine label="مورد مرتبط" value={relationTargetLabel(row)} />
              {row.addendum_subject ? <InfoLine label="موضوع الحاقیه" value={row.addendum_subject} /> : null}
              {row.guarantee_number ? <InfoLine label="شماره تضمین" value={row.guarantee_number} ltr /> : null}
              {row.statement_number ? <InfoLine label="شماره صورت‌وضعیت" value={formatStatementNumber(row.statement_number)} ltr /> : null}
            </Paper>

            <Paper elevation={0} sx={{ p: 1.3, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={DescriptionIcon} title="قرارداد" color={accent} />
              <InfoLine label="شماره" value={row.contract_number} strong />
              <InfoLine label="موضوع" value={row.contract_subject} />
              <InfoLine label="طرف قرارداد" value={row.contract_party_name} />
            </Paper>

            <Paper elevation={0} sx={{ p: 1.3, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={CalendarMonthIcon} title="مشخصات فایل" color="#64748b" />
              <InfoLine label="نام فایل" value={row.file_name} ltr />
              <InfoLine label="پسوند" value={row.file_extension || '—'} ltr />
              <InfoLine label="حجم" value={row.file_size_display || formatFileSize(row.file_size)} />
              <InfoLine label="تاریخ بارگذاری" value={dateLabel(row.uploaded_at)} />
            </Paper>
          </Stack>
        </Box>

        <Divider />
        <Stack direction="row" spacing={1} sx={{ p: 1.25, bgcolor: theme.palette.background.paper }}>
          <Button fullWidth variant="outlined" startIcon={<DownloadIcon />}
            onClick={() => window.open(row.file_url, '_blank', 'noopener,noreferrer')}>دانلود</Button>
          <Button fullWidth variant="outlined" startIcon={<EditIcon />} onClick={() => onEdit(row)}>ویرایش</Button>
          <Button fullWidth variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => onDelete(row)}>حذف</Button>
        </Stack>
      </Stack>
    </Drawer>
  );
};


const DocumentEditorDialog = ({
  open, onClose, form, setForm, contracts, relationOptions,
  onPickFiles, onRemoveFile, onSave, saving, progress, error, setError, accent,
}) => {
  const theme = useTheme();
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const editing = Boolean(form.id);
  const pdfOnly = ['addendum', 'guarantee'].includes(form.relationType);
  const accept = pdfOnly ? '.pdf,application/pdf' : ALLOWED_EXTENSIONS.join(',');
  const targetField = form.relationType === 'addendum' ? 'addendum'
    : form.relationType === 'guarantee' ? 'guarantee'
      : form.relationType === 'statement' ? 'statement' : '';
  const targetOptions = form.relationType === 'addendum' ? relationOptions.addendums
    : form.relationType === 'guarantee' ? relationOptions.guarantees
      : form.relationType === 'statement' ? relationOptions.statements : [];
  const targetValue = targetField ? form[targetField] : '';
  const pendingFiles = form.files || [];

  const setRelationType = (type) => setForm((previous) => ({
    ...previous, relationType: type, addendum: '', guarantee: '', statement: '',
  }));
  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length) onPickFiles(editing ? files.slice(0, 1) : files);
  };
  const selectContract = (value) => setForm((previous) => ({
    ...previous, contract: value, addendum: '', guarantee: '', statement: '',
  }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: '16px', boxShadow: 'none' } }}>
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', gap: 1.1, px: 2.15, py: 1.45,
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}>
        <Box sx={{
          width: 37, height: 37, borderRadius: '11px', flexShrink: 0,
          bgcolor: alpha(accent, 0.08), color: accent, border: `1px solid ${alpha(accent, 0.16)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <FolderSharedIcon sx={{ fontSize: 19 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 900, color: INK }}>
            {editing ? 'ویرایش سند قرارداد' : 'افزودن سند به بایگانی'}
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: MUTED }}>
            {editing ? 'مشخصات و جایگاه سند را اصلاح کنید' : 'می‌توانید چند فایل را هم‌زمان بارگذاری کنید'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.15 }}>
        <Stack spacing={1.7}>
          <Box>
            <SectionHeading icon={DescriptionIcon} title="قرارداد و جایگاه سند" color={accent} />
            <Grid container spacing={1.2}>
              <Grid item xs={12} md={6}>
                <FormControl size="small" fullWidth>
                  <InputLabel>قرارداد *</InputLabel>
                  <Select value={form.contract || ''} label="قرارداد *"
                    onChange={(event) => selectContract(event.target.value)}>
                    {contracts.map((contract) => (
                      <MenuItem key={contract.id} value={String(contract.id)}>
                        {contract.subject || contract.number || `قرارداد ${contract.id}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography sx={{ fontSize: 11.5, color: MUTED, mb: 0.55 }}>این سند به کدام بخش تعلق دارد؟</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {RELATION_ORDER.map((key) => {
                    const meta = RELATION_META[key];
                    const Icon = RELATION_ICONS[key];
                    const active = form.relationType === key;
                    return (
                      <Chip key={key} icon={<Icon sx={{ fontSize: 13 }} />} label={meta.label}
                        onClick={() => setRelationType(key)}
                        sx={{
                          cursor: 'pointer', borderRadius: '9px', fontWeight: 800, fontSize: 11,
                          bgcolor: active ? meta.color : alpha(meta.color, 0.07),
                          color: active ? '#fff' : meta.color,
                          border: `1px solid ${active ? meta.color : alpha(meta.color, 0.25)}`,
                          '& .MuiChip-icon': { color: active ? '#fff' : meta.color },
                        }} />
                    );
                  })}
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Divider />


          <Box>
            <SectionHeading icon={AttachFileIcon} title="فایل سند" color={pdfOnly ? '#be123c' : '#2563eb'}
              hint={pdfOnly
                ? 'برای الحاقیه و تضمین فقط فایل PDF با حجم حداکثر ۲۵ مگابایت'
                : 'فرمت‌های رایج اداری و تصویری، هر فایل حداکثر ۲۵ مگابایت'} />
            <Grid container spacing={1.2} sx={{ mb: 1 }}>
              <Grid item xs={12} md={7}>
                <TextField size="small" fullWidth label={editing ? 'عنوان سند *' : 'عنوان سند (اختیاری)'}
                  value={form.title}
                  helperText={editing ? 'عنوان قابل ویرایش است.' : 'خالی بماند، از نام فایل ساخته می‌شود.'}
                  onChange={(event) => update('title', event.target.value)} />
              </Grid>
              <Grid item xs={12} md={5}>
                <FormControl size="small" fullWidth>
                  <InputLabel>{RELATION_META[form.relationType].label} مرتبط</InputLabel>
                  <Select value={String(targetValue || '')} label={`${RELATION_META[form.relationType].label} مرتبط`}
                    disabled={!form.contract || !targetField}
                    onChange={(event) => update(targetField, event.target.value)}>
                    <MenuItem value="">بدون اتصال</MenuItem>
                    {targetOptions.map((item) => (
                      <MenuItem key={item.id} value={String(item.id)}>
                        {relationOptionLabel(form.relationType, item)}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText sx={{ mx: 0 }}>
                    {!targetField ? 'این سند در سطح قرارداد بایگانی می‌شود.' : (targetOptions.length
                      ? 'سند در پروندهٔ همین مورد مرتبط نمایش داده می‌شود.'
                      : 'برای این قرارداد موردی از این نوع ثبت نشده است.')}
                  </FormHelperText>
                </FormControl>
              </Grid>
            </Grid>

            <Box
              onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(event) => { event.preventDefault(); setDragActive(false); addFiles(event.dataTransfer.files); }}
              onClick={() => inputRef.current?.click()}
              sx={{
                p: 2.2, textAlign: 'center', cursor: 'pointer', borderRadius: '12px',
                border: `2px dashed ${dragActive ? accent : alpha(accent, 0.3)}`,
                background: dragActive ? alpha(accent, 0.06) : alpha(accent, 0.02),
                transition: 'all .18s ease',
              }}
            >
              <CloudUploadIcon sx={{ fontSize: 42, color: accent, mb: 0.7 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>
                {editing ? 'برای جایگزینی فایل، اینجا رها کنید' : 'فایل‌ها را اینجا رها کنید یا کلیک کنید'}
              </Typography>
              <Typography sx={{ fontSize: 10.5, color: MUTED, mt: 0.2 }}>
                {pdfOnly ? 'PDF' : 'PDF، Word، Excel، PowerPoint، تصویر یا ZIP'} · حداکثر ۲۵ مگابایت
              </Typography>
              <input ref={inputRef} type="file" hidden multiple={!editing} accept={accept}
                onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }} />
            </Box>


            {form.existing ? (
              <Paper variant="outlined" sx={{ mt: 0.9, p: 0.75, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <FileBadge row={{ file_name: form.existing.file_name, file_extension: form.existing.file_extension }} size={28} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 11, fontWeight: 800 }}>فایل فعلی: {form.existing.file_name || '—'}</Typography>
                  <Typography sx={{ fontSize: 10, color: MUTED }}>فقط در صورت نیاز، فایل جدید انتخاب کنید.</Typography>
                </Box>
              </Paper>
            ) : null}

            {pendingFiles.length ? (
              <Stack spacing={0.45} sx={{ mt: 0.9 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: INK }}>
                    {editing ? 'فایل جانشین' : `${toPersianDigits(pendingFiles.length)} فایل آمادهٔ بارگذاری`}
                  </Typography>
                  {!editing ? <Chip size="small" label="چند فایلی" sx={{ height: 19, fontSize: 10.5, bgcolor: alpha(accent, 0.08), color: accent }} /> : null}
                </Stack>
                {pendingFiles.map((file, index) => {
                  const meta = fileMeta(file.name);
                  return (
                    <Paper key={`${file.name}-${index}`} variant="outlined"
                      sx={{ p: 0.65, borderRadius: '9px', display: 'flex', alignItems: 'center', gap: 0.6 }}>
                      <Box sx={{ color: meta.color, display: 'flex' }}><InsertDriveFileIcon sx={{ fontSize: 18 }} /></Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography noWrap sx={{ fontSize: 11, fontWeight: 700 }}>{file.name}</Typography>
                        <Typography sx={{ fontSize: 10, color: MUTED }}>{formatFileSize(file.size)}</Typography>
                      </Box>
                      <IconButton size="small" onClick={() => onRemoveFile(index)}><CloseIcon sx={{ fontSize: 15 }} /></IconButton>
                    </Paper>
                  );
                })}
              </Stack>
            ) : null}
          </Box>

          {saving && progress ? (
            <Box>
              <LinearProgress variant={progress.total ? 'determinate' : 'indeterminate'}
                value={progress.total ? (progress.done / progress.total) * 100 : 0}
                sx={{ height: 6, borderRadius: 3 }} />
              <Typography sx={{ mt: 0.4, fontSize: 10.5, color: MUTED, textAlign: 'center' }}>
                {progress.total ? `بارگذاری ${toPersianDigits(progress.done)} از ${toPersianDigits(progress.total)}` : 'در حال ذخیره…'}
              </Typography>
            </Box>
          ) : null}

          {error ? <Alert severity="error" onClose={() => setError('')}>{error}</Alert> : null}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 2.15, py: 1.35, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button onClick={onClose}>انصراف</Button>
        <Button variant="contained" disabled={saving} onClick={onSave}>
          {saving ? <CircularProgress size={18} color="inherit" /> : (editing ? 'ذخیره تغییرات' : 'بارگذاری اسناد')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};


const ContractDocumentsPage = () => {
  const qc = useQueryClient();
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const contractId = searchParams.get('contract') || '';
  const [search, setSearch] = useState('');
  const [relationFilter, setRelationFilter] = useState('all');
  const [fileFilter, setFileFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [view, setView] = useState('cards');
  const [detail, setDetail] = useState(null);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const docsQuery = useQuery({
    queryKey: ['contract-documents-all'],
    queryFn: () => axiosInstance.get('/contract-documents/', { params: { page_size: 500 } }).then((r) => r.data),
  });
  const allDocs = useMemo(
    () => (Array.isArray(docsQuery.data) ? docsQuery.data : docsQuery.data?.results || []),
    [docsQuery.data],
  );
  const contractsQuery = useQuery({
    queryKey: ['external-contracts-all-docs'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 500 } }).then((r) => r.data),
  });
  const contractList = useMemo(
    () => (Array.isArray(contractsQuery.data) ? contractsQuery.data : contractsQuery.data?.results || []),
    [contractsQuery.data],
  );
  const selectedContract = contractList.find((contract) => String(contract.id) === String(contractId)) || null;
  const formContract = contractList.find((contract) => String(contract.id) === String(form.contract)) || null;
  const currencyLabel = normalizeCurrencyLabel(
    (formContract || selectedContract)?.currency_name
    || (formContract || selectedContract)?.currency_symbol
    || 'ریال',
  );

  const addendumsQuery = useQuery({
    queryKey: ['contract-document-addendums', form.contract],
    queryFn: () => axiosInstance.get('/contract-addendums/', { params: { contract: form.contract, page_size: 200 } }).then((r) => r.data),
    enabled: dialog && Boolean(form.contract),
  });
  const guaranteesQuery = useQuery({
    queryKey: ['contract-document-guarantees', form.contract],
    queryFn: () => axiosInstance.get('/contract-guarantees/', { params: { contract: form.contract, page_size: 200 } }).then((r) => r.data),
    enabled: dialog && Boolean(form.contract),
  });
  const statementsQuery = useQuery({
    queryKey: ['contract-document-statements', form.contract],
    queryFn: () => axiosInstance.get('/contract-statements/', { params: { contract: form.contract, page_size: 200 } }).then((r) => r.data),
    enabled: dialog && Boolean(form.contract),
  });
  const listOf = (query) => (Array.isArray(query.data) ? query.data : query.data?.results || []);
  const relationOptions = {
    addendums: listOf(addendumsQuery),
    guarantees: listOf(guaranteesQuery),
    statements: listOf(statementsQuery),
  };

  const scopedDocs = useMemo(
    () => (contractId ? allDocs.filter((row) => String(row.contract) === String(contractId)) : allDocs),
    [allDocs, contractId],
  );
  const docCountByContract = useMemo(() => allDocs.reduce((counts, row) => {
    const key = String(row.contract);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {}), [allDocs]);
  const relationCounts = useMemo(() => countByRelation(scopedDocs), [scopedDocs]);
  const fileCounts = useMemo(() => countByFileType(scopedDocs), [scopedDocs]);
  const pdfCount = fileCounts.pdf || 0;

  const filtered = useMemo(() => {
    let rows = scopedDocs.filter((row) => {
      if (relationFilter !== 'all' && relationKeyOf(row) !== relationFilter) return false;
      if (fileFilter !== 'all' && fileMeta(row).key !== fileFilter) return false;
      return matchesDocumentSearch(row, search);
    });
    rows = [...rows].sort((a, b) => {
      if (sortBy === 'oldest') return String(a.uploaded_at || '').localeCompare(String(b.uploaded_at || ''));
      if (sortBy === 'title') return String(a.title || '').localeCompare(String(b.title || ''), 'fa');
      if (sortBy === 'largest') return Number(b.file_size || 0) - Number(a.file_size || 0);
      return String(b.uploaded_at || '').localeCompare(String(a.uploaded_at || ''));
    });
    return rows;
  }, [scopedDocs, relationFilter, fileFilter, search, sortBy]);

  const resetFilters = () => {
    setSearch('');
    setRelationFilter('all');
    setFileFilter('all');
    setSortBy('newest');
  };
  const selectContract = (contract) => {
    setSearchParams({ contract: String(contract.id) });
    resetFilters();
  };
  const clearContract = () => {
    setSearchParams({});
    resetFilters();
    setDetail(null);
  };


  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['contract-documents-all'] });
    qc.invalidateQueries({ queryKey: ['contract-documents'] });
    qc.invalidateQueries({ queryKey: ['contract-document-addendums'] });
    qc.invalidateQueries({ queryKey: ['contract-document-guarantees'] });
    qc.invalidateQueries({ queryKey: ['contract-document-statements'] });
    qc.invalidateQueries({ queryKey: ['contract-details'] });
  };

  const relationPayload = (payload) => ({
    addendum: payload.relationType === 'addendum' && payload.addendum ? Number(payload.addendum) : null,
    guarantee: payload.relationType === 'guarantee' && payload.guarantee ? Number(payload.guarantee) : null,
    statement: payload.relationType === 'statement' && payload.statement ? Number(payload.statement) : null,
  });

  const save = useMutation({
    mutationFn: async (payload) => {
      const relation = relationPayload(payload);
      if (payload.id) {
        await axiosInstance.patch(`/contract-documents/${payload.id}/`, {
          contract: payload.contract,
          title: String(payload.title || '').trim(),
          ...relation,
        });
        if (payload.files?.[0]) {
          const body = new FormData();
          body.append('file', payload.files[0]);
          await axiosInstance.patch(`/contract-documents/${payload.id}/`, body, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
        return { count: 1 };
      }

      const files = payload.files || [];
      setProgress({ done: 0, total: files.length });
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const body = new FormData();
        body.append('contract', payload.contract);
        body.append('title', documentTitleForFile(file, payload.title, files.length > 1));
        if (relation.addendum) body.append('addendum', relation.addendum);
        if (relation.guarantee) body.append('guarantee', relation.guarantee);
        if (relation.statement) body.append('statement', relation.statement);
        body.append('file', file);
        await axiosInstance.post('/contract-documents/', body, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setProgress({ done: index + 1, total: files.length });
      }
      return { count: files.length };
    },
    onSuccess: ({ count }) => {
      invalidateAll();
      setDialog(false);
      setForm(EMPTY_FORM);
      setError('');
      setProgress({ done: 0, total: 0 });
      setToast(`${toPersianDigits(count)} سند با موفقیت بایگانی شد`);
    },
    onError: (event) => {
      const data = event.response?.data;
      const first = typeof data === 'string'
        ? data
        : Array.isArray(data)
          ? data[0]
          : data?.file?.[0] || data?.detail || (data && Object.values(data).flat()[0]);
      setError(typeof first === 'string' ? first : event.message || 'ذخیرهٔ سند انجام نشد.');
      setProgress({ done: 0, total: 0 });
    },
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-documents/${id}/`),
    onSuccess: () => {
      invalidateAll();
      setConfirmDelete(null);
      setDetail(null);
      setToast('سند از بایگانی حذف شد');
    },
    onError: () => setToast('حذف سند انجام نشد'),
  });

  const openNew = () => {
    setDetail(null);
    setForm({ ...EMPTY_FORM, contract: contractId || '' });
    setError('');
    setProgress({ done: 0, total: 0 });
    setDialog(true);
  };
  const openEdit = (row) => {
    setDetail(null);
    setForm({
      ...EMPTY_FORM,
      id: row.id,
      contract: String(row.contract || ''),
      relationType: relationKeyOf(row),
      addendum: String(row.addendum || ''),
      guarantee: String(row.guarantee || ''),
      statement: String(row.statement || ''),
      title: row.title || '',
      files: [],
      existing: { file_name: row.file_name, file_extension: row.file_extension },
    });
    setError('');
    setProgress({ done: 0, total: 0 });
    setDialog(true);
  };
  const closeEditor = () => {
    if (save.isLoading) return;
    setDialog(false);
    setForm(EMPTY_FORM);
    setError('');
    setProgress({ done: 0, total: 0 });
  };

  const addPendingFiles = (files) => {
    const pdfOnly = ['addendum', 'guarantee'].includes(form.relationType);
    const accepted = [];
    let rejection = '';
    Array.from(files || []).forEach((file) => {
      const ext = `.${String(file.name || '').split('.').pop()?.toLowerCase()}`;
      if (!ALLOWED_EXTENSIONS.includes(ext) || (pdfOnly && ext !== '.pdf')) {
        rejection = pdfOnly
          ? 'برای الحاقیه و تضمین فقط فایل PDF مجاز است.'
          : 'فرمت فایل انتخاب‌شده مجاز نیست.';
        return;
      }
      if (Number(file.size) > MAX_FILE_SIZE) {
        rejection = 'حجم هر فایل نباید بیشتر از ۲۵ مگابایت باشد.';
        return;
      }
      accepted.push(file);
    });
    if (accepted.length) {
      setForm((previous) => ({
        ...previous,
        files: previous.id ? accepted.slice(0, 1) : [...(previous.files || []), ...accepted],
      }));
    }
    setError(rejection);
  };
  const removePendingFile = (index) => setForm((previous) => ({
    ...previous,
    files: (previous.files || []).filter((_, fileIndex) => fileIndex !== index),
  }));


  const submit = () => {
    if (!form.contract) {
      setError('قرارداد را انتخاب کنید.');
      return;
    }
    if (form.id && !String(form.title || '').trim()) {
      setError('عنوان سند را وارد کنید.');
      return;
    }
    if (!form.id && !(form.files || []).length) {
      setError('حداقل یک فایل انتخاب کنید.');
      return;
    }
    if (form.id && !(form.files || []).length && !form.existing?.file_name) {
      setError('فایل سند موجود نیست؛ یک فایل جدید انتخاب کنید.');
      return;
    }
    if (['addendum', 'guarantee'].includes(form.relationType)) {
      const badFile = (form.files || []).find((file) => !String(file.name || '').toLowerCase().endsWith('.pdf'));
      if (badFile) {
        setError('برای الحاقیه و تضمین فقط فایل PDF مجاز است.');
        return;
      }
    }
    if (form.relationType !== 'contract' && !form[form.relationType]) {
      setError(`مورد مرتبط (${RELATION_META[form.relationType].label}) را انتخاب کنید.`);
      return;
    }
    setError('');
    save.mutate(form);
  };

  const previewFile = (row) => window.open(row.file_url, '_blank', 'noopener,noreferrer');
  const downloadFile = (row) => {
    if (!row.file_url) return;
    const link = document.createElement('a');
    link.href = row.file_url;
    link.download = row.file_name || row.title || 'contract-document';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const exportCsv = () => {
    const headers = ['عنوان', 'قرارداد', 'طرف قرارداد', 'جایگاه', 'مورد مرتبط', 'نام فایل', 'تاریخ بارگذاری'];
    const rows = filtered.map((row) => [
      row.title || '', row.contract_number || '', row.contract_party_name || '',
      relationMetaOf(row).label, relationTargetLabel(row), row.file_name || '',
      String(row.uploaded_at || '').slice(0, 10),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contract-documents-${contractId || 'all'}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (docsQuery.isLoading) {
    return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<FolderSharedIcon />}
        color={ACCENT}
        subtitle="آرشیو یکپارچهٔ اسناد قرارداد، الحاقیه، تضمین و صورت‌وضعیت"
        title="بایگانی اسناد قرارداد"
        badge={(
          <Chip size="small" label={contractId ? `${formatPersianNumber(scopedDocs.length)} سند` : 'مدیریت اسناد قرارداد'}
            sx={{ height: 23, fontWeight: 800, bgcolor: alpha(ACCENT, 0.08), color: ACCENT }} />
        )}
        actions={(
          <>
            <Tooltip title="به‌روزرسانی">
              <span>
                <Button variant="outlined" onClick={() => docsQuery.refetch()} disabled={docsQuery.isFetching}
                  sx={{ minWidth: 40, px: 1 }}><RefreshIcon fontSize="small" /></Button>
              </span>
            </Tooltip>
            {contractId ? (
              <Button variant="outlined" startIcon={<DescriptionIcon />}
                onClick={() => navigate(`/external-contracts/${contractId}`)}>پرونده قرارداد</Button>
            ) : null}
            {contractId ? <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv}>خروجی</Button> : null}
            <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>سند جدید</Button>
          </>
        )}
      />

      {!contractId ? (
        <LandingContent
          contractList={contractList}
          documents={allDocs}
          docCountByContract={docCountByContract}
          accent={ACCENT}
          onSelect={selectContract}
          onSelectContract={(id) => {
            const target = contractList.find((contract) => String(contract.id) === String(id));
            if (target) selectContract(target);
          }}
          onOpen={setDetail}
        />
      ) : (
        <>


          <Grid container spacing={1.5}>
            <Grid item xs={12} lg={3} sx={{ order: { xs: 2, lg: 1 } }}>
              <Stack spacing={1.5} sx={{ position: { lg: 'sticky' }, top: 16 }}>
                <ContractSnapshotCard contract={selectedContract} accent={ACCENT} onBack={clearContract}
                  currency={currencyLabel} documentCount={scopedDocs.length} />
                <RelationBreakdown counts={relationCounts} active={relationFilter}
                  onChange={(key) => setRelationFilter(key)} accent={ACCENT} fileCounts={fileCounts} />
              </Stack>
            </Grid>

            <Grid item xs={12} lg={9} sx={{ order: { xs: 1, lg: 2 } }}>
              <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                <Grid item xs={6} md={3}>
                  <KpiTile icon={FolderSharedIcon} label="کل اسناد" value={formatPersianNumber(scopedDocs.length)}
                    suffix="سند" color={ACCENT} />
                </Grid>
                <Grid item xs={6} md={3}>
                  <KpiTile icon={NoteAltIcon} label="الحاقیه و تضمین"
                    value={formatPersianNumber((relationCounts.addendum || 0) + (relationCounts.guarantee || 0))}
                    suffix="سند" color="#7c3aed" />
                </Grid>
                <Grid item xs={6} md={3}>
                  <KpiTile icon={ReceiptLongIcon} label="صورت‌وضعیت" value={formatPersianNumber(relationCounts.statement || 0)}
                    suffix="سند" color="#2563eb" />
                </Grid>
                <Grid item xs={6} md={3}>
                  <KpiTile icon={PictureAsPdfIcon} label="فایل‌های PDF" value={formatPersianNumber(pdfCount)}
                    suffix="فایل" color="#be123c" />
                </Grid>
              </Grid>


              <Paper elevation={0} sx={{ p: 1.25, mb: 1.5, borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                  <TextField size="small" placeholder="جست‌وجو در عنوان، فایل، قرارداد…"
                    value={search} onChange={(event) => setSearch(event.target.value)}
                    sx={{ minWidth: { xs: '100%', sm: 230 }, flex: 1 }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
                  <FormControl size="small" sx={{ minWidth: 155 }}>
                    <InputLabel>جایگاه</InputLabel>
                    <Select value={relationFilter} label="جایگاه" onChange={(event) => setRelationFilter(event.target.value)}>
                      <MenuItem value="all">همه ({formatPersianNumber(relationCounts.all || 0)})</MenuItem>
                      {RELATION_ORDER.map((key) => (
                        <MenuItem key={key} value={key}>{RELATION_META[key].label} ({formatPersianNumber(relationCounts[key] || 0)})</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 135 }}>
                    <InputLabel>نوع فایل</InputLabel>
                    <Select value={fileFilter} label="نوع فایل" onChange={(event) => setFileFilter(event.target.value)}>
                      <MenuItem value="all">همه</MenuItem>
                      {Object.entries(FILE_TYPE_META).map(([key, meta]) => (
                        <MenuItem key={key} value={key}>{meta.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 135 }}>
                    <InputLabel>ترتیب</InputLabel>
                    <Select value={sortBy} label="ترتیب" onChange={(event) => setSortBy(event.target.value)}>
                      <MenuItem value="newest">جدیدترین</MenuItem>
                      <MenuItem value="oldest">قدیمی‌ترین</MenuItem>
                      <MenuItem value="title">عنوان</MenuItem>
                      <MenuItem value="largest">بیشترین حجم</MenuItem>
                    </Select>
                  </FormControl>
                  <ToggleButtonGroup size="small" exclusive value={view} onChange={(_event, value) => value && setView(value)}>
                    <ToggleButton value="cards" aria-label="نمای کارت" sx={{ px: 1 }}><Tooltip title="کارت"><ViewModuleIcon fontSize="small" /></Tooltip></ToggleButton>
                    <ToggleButton value="table" aria-label="نمای جدول" sx={{ px: 1 }}><Tooltip title="جدول"><TableRowsIcon fontSize="small" /></Tooltip></ToggleButton>
                  </ToggleButtonGroup>
                  <Button variant="contained" startIcon={<UploadFileIcon />} onClick={openNew}
                    sx={{ display: { xs: 'none', md: 'flex' } }}>افزودن سند</Button>
                </Stack>
              </Paper>

              {!filtered.length ? (
                <Paper elevation={0} sx={{ p: 5, borderRadius: '16px', border: `1px dashed ${theme.palette.divider}`, textAlign: 'center' }}>
                  <FolderSharedIcon sx={{ fontSize: 36, color: theme.palette.text.disabled, mb: 1 }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>سندی با این مشخصات پیدا نشد.</Typography>
                  <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.3 }}>فیلترها را تغییر دهید یا سند جدید بارگذاری کنید.</Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ mt: 1.5 }}>افزودن سند</Button>
                </Paper>
              ) : view === 'cards' ? (
                <Grid container spacing={1.5}>
                  {filtered.map((row) => (
                    <Grid item xs={12} md={6} xl={4} key={row.id}>
                      <DocumentCard row={row} onView={setDetail} onEdit={openEdit}
                        onDelete={setConfirmDelete} onPreview={previewFile} onDownload={downloadFile} />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <DocumentTable rows={filtered} onView={setDetail} onEdit={openEdit}
                  onDelete={setConfirmDelete} onPreview={previewFile} onDownload={downloadFile} />
              )}
            </Grid>
          </Grid>
        </>
      )}


      <DocumentDetailDrawer row={detail} onClose={() => setDetail(null)}
        onEdit={openEdit} onDelete={setConfirmDelete} accent={ACCENT} />

      <DocumentEditorDialog
        open={dialog}
        onClose={closeEditor}
        form={form}
        setForm={setForm}
        contracts={contractList}
        relationOptions={relationOptions}
        onPickFiles={addPendingFiles}
        onRemoveFile={removePendingFile}
        onSave={submit}
        saving={save.isLoading}
        progress={progress}
        error={error}
        setError={setError}
        accent={ACCENT}
      />

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, fontSize: 14 }}>حذف سند</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ borderRadius: '10px' }}>
            سند «{confirmDelete?.title || 'انتخاب‌شده'}» از بایگانی قرارداد حذف شود؟ این عملیات قابل بازگشت نیست.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>انصراف</Button>
          <Button color="error" variant="contained" disabled={remove.isLoading}
            onClick={() => remove.mutate(confirmDelete.id)}>
            {remove.isLoading ? <CircularProgress size={18} color="inherit" /> : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3400} onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.includes('نشد') ? 'error' : 'success'} onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ContractDocumentsPage;
