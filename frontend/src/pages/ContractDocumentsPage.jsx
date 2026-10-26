import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Box, Button, Chip, CircularProgress, Collapse, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Drawer, FormControl, FormHelperText, Grid,
  IconButton, InputAdornment, InputLabel, LinearProgress, MenuItem, Paper, Select,
  Snackbar, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import ImageIcon from '@mui/icons-material/Image';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import LastPageIcon from '@mui/icons-material/LastPage';
import LockIcon from '@mui/icons-material/Lock';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import TableChartIcon from '@mui/icons-material/TableChart';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import PageHeader from '../core/components/ui/PageHeader';
import { formatPersianNumber, normalizeCurrencyLabel, toPersianDigits } from '../core/utils/numberUtils';
import { statementDisplayTitle } from './contracts/statementKinds';
import { toJalali } from '../core/utils/dateUtils';
import { CONTRACT_STATUS_LABELS } from '../core/theme/tokens';
import { INK, MUTED } from './accounting/AccountingDashboardUI';
import { useDesignTokens } from '../core/context/DesignTokenContext';
import { resolveTableTheme, tableTypographySx } from '../core/theme/tableStyles';
import { resolveToolbarTheme } from '../core/theme/toolbarStyles';
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

/* ترتیب نمایش — مستقل از فیلترها (در شمارش فیلترها و چیپ‌های فیلتر نمی‌آید) */
const SORT_OPTIONS = [
  { value: 'newest', label: 'جدیدترین' },
  { value: 'oldest', label: 'قدیمی‌ترین' },
  { value: 'title', label: 'عنوان (الف→ی)' },
  { value: 'largest', label: 'بیشترین حجم' },
];
/* ترتیب لیست قراردادها در صفحهٔ ورود بایگانی */
const CONTRACT_SORT_OPTIONS = [
  { value: 'lastUpload', label: 'آخرین بارگذاری' },
  { value: 'docCount', label: 'بیشترین سند' },
  { value: 'number', label: 'شماره قرارداد' },
];

/* فلش بازشوی «ترتیب»: کلاس MuiSelect-icon حذف می‌شود تا قاعدهٔ پیش‌فرض MUI
 * در RTL فلش را سمت راست (روی آیکون ترتیب) نگذارد. */
const SortArrowLeft = ({ className, ...rest }) => (
  <ExpandMoreIcon
    {...rest}
    sx={{
      position: 'absolute', left: 8, top: 'calc(50% - 10px)',
      fontSize: 20, color: 'text.secondary', pointerEvents: 'none',
    }}
  />
);

/* سلکت فیلترها با همان استایل نوار ابزار استاندارد */
const FilterSelect = ({ label, value, options, onChange, labelsPosition, radius = 8 }) => (
  <Box>
    {labelsPosition === 'above' ? (
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>{label}</Typography>
    ) : null}
    <FormControl size="small" fullWidth>
      {labelsPosition === 'inline' ? <InputLabel>{label}</InputLabel> : null}
      <Select
        value={value || ''}
        label={labelsPosition === 'inline' ? label : undefined}
        displayEmpty={labelsPosition !== 'inline'}
        onChange={(event) => onChange(event.target.value)}
        sx={{ fontSize: 12.5, borderRadius: `${radius}px`, bgcolor: 'background.paper' }}
        renderValue={(selected) => {
          const match = options.find((option) => String(option.value) === String(selected));
          if (!match || match.value === '') {
            return <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>همه</Typography>;
          }
          return <Typography component="span" sx={{ fontSize: 12, fontWeight: 700 }}>{match.label}</Typography>;
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.value || 'all'} value={option.value}>{option.label}</MenuItem>
        ))}
      </Select>
    </FormControl>
  </Box>
);

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





/* جدول استاندارد بایگانی — همان توکن‌های جدولِ صفحهٔ «قراردادهای من» */
const DocumentArchiveTable = ({
  rows, tableTheme, containerRef, tableHeight, rowHeight, dimmed,
  onView, onEdit, onDelete, onPreview, onDownload,
}) => (
  <TableContainer
    ref={containerRef}
    data-visible-rows={tableTheme.visibleRows}
    data-row-height={rowHeight}
    data-table-height={`${tableHeight}px`}
    sx={{
      height: { xs: 'auto', sm: `${tableHeight}px` },
      maxHeight: { xs: 'none', sm: `${tableHeight}px` },
      overflowY: 'auto',
      opacity: dimmed ? 0.6 : 1,
      transition: 'opacity .15s ease',
    }}
  >
    <Table
      size="small"
      stickyHeader
      aria-label="فهرست اسناد قرارداد"
      sx={{
        width: '100%',
        minWidth: 980,
        tableLayout: 'fixed',
        '& td, & th': {
          px: 1,
          py: `${tableTheme.cellPadding}px`,
          whiteSpace: tableTheme.singleLine ? 'nowrap' : 'normal',
          borderBottom: tableTheme.divider,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
        '& thead th': {
          textAlign: `${tableTheme.headerTextAlign} !important`,
          backgroundColor: 'var(--hrms-table-header-bg)',
          height: `${tableTheme.headerHeight}px`,
          fontSize: tableTheme.header.fontSize,
          fontWeight: tableTheme.header.fontWeight,
          color: tableTheme.header.color,
        },
        '& tbody td': {
          height: `${tableTheme.rowHeight}px`,
          fontSize: tableTheme.cell.fontSize,
          fontWeight: tableTheme.cell.fontWeight,
          color: tableTheme.cell.color,
          ...(tableTheme.cellTextAlign ? { textAlign: `${tableTheme.cellTextAlign} !important` } : null),
        },
        '& tbody tr.MuiTableRow-hover:hover': { backgroundColor: tableTheme.hoverBg },
        ...tableTypographySx(tableTheme),
      }}
    >
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={{ width: '26%' }}>سند</TableCell>
          <TableCell align="center" sx={{ width: '8%' }}>نوع</TableCell>
          <TableCell align="center" sx={{ width: '18%' }}>جایگاه</TableCell>
          <TableCell align="center" sx={{ width: '18%' }}>قرارداد</TableCell>
          <TableCell align="center" sx={{ width: '10%' }}>تاریخ بارگذاری</TableCell>
          <TableCell align="center" sx={{ width: '8%' }}>حجم</TableCell>
          <TableCell align="center" sx={{ width: '12%' }}>عملیات</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} hover onClick={() => onView(row)} sx={{ cursor: 'pointer' }}>
            <TableCell align="right">
              <Stack direction="row" alignItems="center" spacing={0.7}>
                <FileBadge row={row} size={28} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 12, fontWeight: 800 }}>{row.title || '—'}</Typography>
                  <Typography noWrap sx={{ fontSize: 10.5, color: MUTED, direction: 'ltr', textAlign: 'right' }}>
                    {row.file_name || '—'}
                  </Typography>
                </Box>
              </Stack>
            </TableCell>
            <TableCell align="center"><FileTypeChip row={row} /></TableCell>
            <TableCell align="right">
              <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="flex-start">
                <RelationPill row={row} />
                <Typography noWrap title={relationTargetLabel(row)} sx={{ fontSize: 10.5, color: MUTED }}>
                  {relationTargetLabel(row)}
                </Typography>
              </Stack>
            </TableCell>
            <TableCell align="right">
              <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800 }}>{row.contract_number || '—'}</Typography>
              <Typography noWrap title={row.contract_subject} sx={{ fontSize: 10.5, color: MUTED }}>
                {row.contract_subject || '—'}
              </Typography>
            </TableCell>
            <TableCell align="center">
              <Typography noWrap sx={{ fontSize: 11.5, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                {dateLabel(row.uploaded_at)}
              </Typography>
            </TableCell>
            <TableCell align="center">
              <Typography noWrap sx={{ fontSize: 11.5, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                {row.file_size_display || formatFileSize(row.file_size)}
              </Typography>
            </TableCell>
            <TableCell align="center" onClick={(event) => event.stopPropagation()}>
              <Stack direction="row" spacing={0.05} justifyContent="center">
                <Tooltip title="پیش‌نمایش"><IconButton size="small" onClick={() => onPreview(row)}><OpenInNewIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                <Tooltip title="دانلود"><IconButton size="small" color="primary" onClick={() => onDownload(row)}><DownloadIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                <Tooltip title="جزئیات"><IconButton size="small" onClick={() => onView(row)}><VisibilityIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                <Tooltip title="ویرایش"><IconButton size="small" onClick={() => onEdit(row)}><EditIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => onDelete(row)}><DeleteIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
              </Stack>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);


/* صفحه‌بند استاندارد (توکن‌های تم) — مشترک بین جدول قراردادها و جدول اسناد */
const TablePager = ({ tableTheme, page, onPage, totalPages, pageNumbers, total, pageSize, unit = 'سند' }) => {
  if (!tableTheme.showPagination || total <= pageSize) return null;
  return (
    <Box sx={{
      px: 1.5,
      py: tableTheme.paginationDense ? 0.75 : 1.25,
      borderTop: '1px solid',
      borderColor: 'var(--hrms-table-border-color, #e8edf4)',
    }}>
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 32 }}>
        {tableTheme.showPaginationRange ? (
          <Typography sx={{
            position: 'absolute', insetInlineStart: 0,
            display: { xs: 'none', sm: 'block' },
            fontSize: tableTheme.paginationFontSize - 0.5,
            color: 'text.secondary', whiteSpace: 'nowrap',
          }}>
            نمایش {toPersianDigits(page * pageSize + 1)} تا{' '}
            {toPersianDigits(Math.min((page + 1) * pageSize, total))} از{' '}
            {toPersianDigits(total)} {unit}
            {' · '}
            {toPersianDigits(tableTheme.visibleRows)} ردیف در نما
          </Typography>
        ) : null}
        <Stack direction="row" spacing={0.5} alignItems="center">
          {tableTheme.paginationVariant === 'pages' ? (
            <>
              <IconButton size="small" disabled={page === 0} onClick={() => onPage(0)} aria-label="صفحهٔ اول"
                sx={{ color: tableTheme.paginationAccent, p: 0.4 }}>
                <FirstPageIcon fontSize="small" sx={{ transform: 'scaleX(-1)' }} />
              </IconButton>
              <IconButton size="small" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="صفحهٔ قبل"
                sx={{ color: tableTheme.paginationAccent, p: 0.4 }}>
                <ChevronRightIcon fontSize="small" />
              </IconButton>
              {pageNumbers.map((index) => (
                <Box
                  key={index}
                  component="button"
                  type="button"
                  onClick={() => onPage(index)}
                  aria-current={index === page ? 'page' : undefined}
                  sx={{
                    minWidth: 28, height: 28, px: 0.75,
                    borderRadius: `${tableTheme.paginationRadius}px`,
                    border: '1px solid',
                    borderColor: index === page ? tableTheme.paginationAccent : 'divider',
                    bgcolor: index === page ? tableTheme.paginationAccent : 'transparent',
                    color: index === page ? '#fff' : 'text.secondary',
                    fontFamily: 'inherit',
                    fontSize: tableTheme.paginationFontSize,
                    fontWeight: index === page ? 800 : 600,
                    cursor: 'pointer',
                  }}
                >
                  {toPersianDigits(index + 1)}
                </Box>
              ))}
              <IconButton size="small" disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)} aria-label="صفحهٔ بعد"
                sx={{ color: tableTheme.paginationAccent, p: 0.4 }}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" disabled={page >= totalPages - 1} onClick={() => onPage(totalPages - 1)} aria-label="صفحهٔ آخر"
                sx={{ color: tableTheme.paginationAccent, p: 0.4 }}>
                <LastPageIcon fontSize="small" sx={{ transform: 'scaleX(-1)' }} />
              </IconButton>
            </>
          ) : (
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton size="small" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="صفحهٔ قبل">
                <ChevronRightIcon fontSize="small" />
              </IconButton>
              <Typography sx={{ fontSize: tableTheme.paginationFontSize }}>
                {toPersianDigits(page + 1)} / {toPersianDigits(totalPages)}
              </Typography>
              <IconButton size="small" disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)} aria-label="صفحهٔ بعد">
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            </Stack>
          )}
        </Stack>
      </Box>
    </Box>
  );
};


/* جدول استاندارد «لیست قراردادها» در صفحهٔ ورود بایگانی */
const ContractArchiveTable = ({
  rows, tableTheme, containerRef, tableHeight, rowHeight, dimmed,
  docCounts, onOpen,
}) => (
  <TableContainer
    ref={containerRef}
    data-visible-rows={tableTheme.visibleRows}
    data-row-height={rowHeight}
    data-table-height={`${tableHeight}px`}
    sx={{
      height: { xs: 'auto', sm: `${tableHeight}px` },
      maxHeight: { xs: 'none', sm: `${tableHeight}px` },
      overflowY: 'auto',
      opacity: dimmed ? 0.6 : 1,
      transition: 'opacity .15s ease',
    }}
  >
    <Table
      size="small"
      stickyHeader
      aria-label="فهرست قراردادهای بایگانی"
      sx={{
        width: '100%',
        minWidth: 720,
        tableLayout: 'fixed',
        '& td, & th': {
          px: 1,
          py: `${tableTheme.cellPadding}px`,
          whiteSpace: tableTheme.singleLine ? 'nowrap' : 'normal',
          borderBottom: tableTheme.divider,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
        '& thead th': {
          textAlign: `${tableTheme.headerTextAlign} !important`,
          backgroundColor: 'var(--hrms-table-header-bg)',
          height: `${tableTheme.headerHeight}px`,
          fontSize: tableTheme.header.fontSize,
          fontWeight: tableTheme.header.fontWeight,
          color: tableTheme.header.color,
        },
        '& tbody td': {
          height: `${tableTheme.rowHeight}px`,
          fontSize: tableTheme.cell.fontSize,
          fontWeight: tableTheme.cell.fontWeight,
          color: tableTheme.cell.color,
          ...(tableTheme.cellTextAlign ? { textAlign: `${tableTheme.cellTextAlign} !important` } : null),
        },
        '& tbody tr.MuiTableRow-hover:hover': { backgroundColor: tableTheme.hoverBg },
        ...tableTypographySx(tableTheme),
      }}
    >
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={{ width: '14%' }}>شماره قرارداد</TableCell>
          <TableCell align="center" sx={{ width: '28%' }}>طرف قرارداد</TableCell>
          <TableCell align="center" sx={{ width: '44%' }}>موضوع قرارداد</TableCell>
          <TableCell align="center" sx={{ width: '14%', textAlign: 'center !important' }}>تعداد اسناد</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((contract) => (
          <TableRow key={contract.id} hover onClick={() => onOpen(contract)} sx={{ cursor: 'pointer' }}>
            <TableCell align="center">
              <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                {toPersianDigits(contract.number || '—')}
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography noWrap title={contract.party_name} sx={{ fontSize: 11.5, fontWeight: 700 }}>
                {contract.party_name || '—'}
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography noWrap title={contract.subject} sx={{ fontSize: 12, fontWeight: 800 }}>
                {contract.subject || '—'}
              </Typography>
            </TableCell>
            <TableCell align="center" sx={{ textAlign: 'center !important' }}>
              <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                {formatPersianNumber(docCounts[String(contract.id)] || 0)}
              </Typography>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
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
              {row.statement_number ? <InfoLine label="صورت‌وضعیت / تعدیل" value={statementDisplayTitle({ kind: row.statement_kind, number: row.statement_number })} ltr /> : null}
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
  /* همان توکن‌های استودیوی تم که صفحهٔ «قراردادهای من» می‌خواند */
  const { tokens } = useDesignTokens();
  const tableTheme = resolveTableTheme(tokens);
  const toolbar = resolveToolbarTheme(tokens);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const contractId = searchParams.get('contract') || '';
  const [search, setSearch] = useState('');
  const [relationFilter, setRelationFilter] = useState('all');
  const [fileFilter, setFileFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [contractSort, setContractSort] = useState('lastUpload');
  const [contractStatus, setContractStatus] = useState('');
  const [onlyWithDocs, setOnlyWithDocs] = useState(false);
  const [page, setPage] = useState(0);
  const [contractPage, setContractPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
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
    staleTime: 60 * 1000,
  });
  const allDocs = useMemo(
    () => (Array.isArray(docsQuery.data) ? docsQuery.data : docsQuery.data?.results || []),
    [docsQuery.data],
  );
  const contractsQuery = useQuery({
    queryKey: ['external-contracts-all-docs'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 500 } }).then((r) => r.data),
    // پاسخ سنگین است (اسناد/فاکتور/... تودرتو)؛ تا ۵ دقیقه دوباره گرفته نمی‌شود
    staleTime: 5 * 60 * 1000,
    // پس از رسیدن اسناد شروع می‌شود تا دو درخواست سنگین هم‌زمان سرور را قفل نکنند
    enabled: !docsQuery.isLoading,
  });
  const contractList = useMemo(
    () => (Array.isArray(contractsQuery.data) ? contractsQuery.data : contractsQuery.data?.results || []),
    [contractsQuery.data],
  );
  /* فهرست قراردادها فوراً از خودِ اسناد ساخته می‌شود تا جدول معطل پاسخ سنگین
   * /external-contracts/ (که اسناد/فاکتور/... تودرتو دارد) نماند؛ وقتی آن پاسخ
   * رسید، اطلاعات تکمیلی (وضعیت و قراردادهای بدون سند) با همین فهرست ادغام می‌شود. */
  const contractDirectory = useMemo(() => {
    const map = new Map();
    allDocs.forEach((doc) => {
      const key = String(doc.contract ?? '');
      if (!key || key === 'null' || map.has(key)) return;
      map.set(key, {
        id: doc.contract,
        number: doc.contract_number,
        subject: doc.contract_subject,
        party_name: doc.contract_party_name,
        status: '',
      });
    });
    contractList.forEach((contract) => {
      const key = String(contract.id);
      const docRow = map.get(key);
      map.set(key, docRow ? { ...docRow, ...contract } : contract);
    });
    return Array.from(map.values());
  }, [allDocs, contractList]);
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
  const relationCounts = useMemo(() => countByRelation(scopedDocs), [scopedDocs]);
  const fileCounts = useMemo(() => countByFileType(scopedDocs), [scopedDocs]);

  /* ---- داده‌های صفحهٔ ورود: لیست قراردادها + آخرین بارگذاری‌ها ---- */
  const docCountByContract = useMemo(() => allDocs.reduce((counts, row) => {
    const key = String(row.contract);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {}), [allDocs]);
  const lastUploadByContract = useMemo(() => allDocs.reduce((latest, row) => {
    const key = String(row.contract);
    const stamp = String(row.uploaded_at || '');
    if (!latest[key] || stamp > latest[key]) latest[key] = stamp;
    return latest;
  }, {}), [allDocs]);
  const recentDocs = useMemo(
    () => [...allDocs]
      .sort((a, b) => String(b.uploaded_at || '').localeCompare(String(a.uploaded_at || '')))
      .slice(0, 8),
    [allDocs],
  );
  const contractRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = contractDirectory.filter((contract) => {
      if (onlyWithDocs && !docCountByContract[String(contract.id)]) return false;
      if (contractStatus && contract.status !== contractStatus) return false;
      if (!term) return true;
      return [contract.number, contract.subject, contract.party_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
    return [...rows].sort((a, b) => {
      if (contractSort === 'docCount') {
        return (docCountByContract[String(b.id)] || 0) - (docCountByContract[String(a.id)] || 0);
      }
      if (contractSort === 'number') {
        return String(a.number || '').localeCompare(String(b.number || ''), 'fa');
      }
      return String(lastUploadByContract[String(b.id)] || '')
        .localeCompare(String(lastUploadByContract[String(a.id)] || ''));
    });
  }, [contractDirectory, search, onlyWithDocs, contractStatus, contractSort, docCountByContract, lastUploadByContract]);
  const contractPageSize = tableTheme.rowsPerPage;
  const contractTotalPages = Math.max(1, Math.ceil(contractRows.length / contractPageSize));
  useEffect(() => { setContractPage(0); }, [search, onlyWithDocs, contractStatus, contractSort, contractPageSize]);
  useEffect(() => {
    if (contractPage > contractTotalPages - 1) setContractPage(Math.max(0, contractTotalPages - 1));
  }, [contractPage, contractTotalPages]);
  const pagedContracts = useMemo(
    () => contractRows.slice(contractPage * contractPageSize, (contractPage + 1) * contractPageSize),
    [contractRows, contractPage, contractPageSize],
  );
  const contractPageNumbers = (() => {
    const size = 5;
    const start = Math.max(0, Math.min(contractPage - 2, contractTotalPages - size));
    const end = Math.min(contractTotalPages, start + size);
    return Array.from({ length: Math.max(0, end - start) }, (_, index) => start + index);
  })();

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

  /* ---- صفحه‌بندی سمت کاربر با تعداد ردیف توکن تم ---- */
  const pageSize = tableTheme.rowsPerPage;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { setPage(0); }, [search, relationFilter, fileFilter, sortBy, contractId, pageSize]);
  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);
  const pagedRows = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize],
  );
  const pageNumbers = (() => {
    const size = 5;
    const start = Math.max(0, Math.min(page - 2, totalPages - size));
    const end = Math.min(totalPages, start + size);
    return Array.from({ length: Math.max(0, end - start) }, (_, index) => start + index);
  })();

  /* ---- ارتفاع جدول بر اساس ارتفاع واقعی ردیف‌ها (همان مکانیزم صفحهٔ قراردادهای من) ---- */
  const tableScrollRef = useRef(null);
  const [measuredRowPx, setMeasuredRowPx] = useState(0);
  const [measuredHeadPx, setMeasuredHeadPx] = useState(0);
  const measureTableRows = () => {
    const host = tableScrollRef.current;
    if (!host) return;
    const rowEl = host.querySelector('tbody tr');
    const headEl = host.querySelector('thead tr');
    const rowPx = rowEl ? Math.round(rowEl.getBoundingClientRect().height) : 0;
    const headPx = headEl ? Math.round(headEl.getBoundingClientRect().height) : 0;
    setMeasuredRowPx((previous) => (previous === rowPx ? previous : rowPx));
    setMeasuredHeadPx((previous) => (previous === headPx ? previous : headPx));
  };
  useLayoutEffect(measureTableRows, [
    pagedRows.length, pagedContracts.length, recentDocs.length,
    tableTheme.rowHeight, tableTheme.headerHeight,
  ]);
  useEffect(() => {
    const onResize = () => measureTableRows();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const effectiveRowPx = measuredRowPx > 0 ? measuredRowPx : tableTheme.rowHeight;
  const effectiveHeadPx = measuredHeadPx > 0 ? measuredHeadPx : tableTheme.headerHeight;
  const tableHeight = Math.round(effectiveHeadPx + effectiveRowPx * tableTheme.visibleRows);

  /* ---- فیلترها و ترتیب: در صفحهٔ ورود روی لیست قراردادها، در نمای قرارداد روی اسناد ---- */
  const scopedMode = Boolean(contractId);
  const sortOptions = scopedMode ? SORT_OPTIONS : CONTRACT_SORT_OPTIONS;
  const sortValue = scopedMode ? sortBy : contractSort;
  const setSortValue = scopedMode ? setSortBy : setContractSort;

  const resetFilters = () => {
    setSearch('');
    if (scopedMode) {
      setRelationFilter('all');
      setFileFilter('all');
      setSortBy('newest');
    } else {
      setContractStatus('');
      setOnlyWithDocs(false);
      setContractSort('lastUpload');
    }
  };
  const clearContract = () => {
    setSearchParams({});
    setDetail(null);
  };
  const openContract = (contract) => setSearchParams({ contract: String(contract.id) });

  const contractOptions = useMemo(() => [
    { value: '', label: 'همهٔ قراردادها' },
    ...contractList.map((contract) => ({
      value: String(contract.id),
      label: `${toPersianDigits(contract.number || '—')} — ${contract.subject || ''}`,
    })),
  ], [contractList]);
  const relationOptionsList = [
    { value: 'all', label: `همه (${formatPersianNumber(relationCounts.all || 0)})` },
    ...RELATION_ORDER.map((key) => ({
      value: key,
      label: `${RELATION_META[key].label} (${formatPersianNumber(relationCounts[key] || 0)})`,
    })),
  ];
  const fileOptionsList = [
    { value: 'all', label: 'همه' },
    ...Object.entries(FILE_TYPE_META).map(([key, meta]) => ({
      value: key,
      label: `${meta.label} (${formatPersianNumber(fileCounts[key] || 0)})`,
    })),
  ];
  const statusOptionsList = [
    { value: '', label: 'همه' },
    ...Object.entries(CONTRACT_STATUS_LABELS).map(([key, label]) => ({ value: key, label })),
  ];
  const docsToggleOptions = [
    { value: 'all', label: 'همهٔ قراردادها' },
    { value: 'withDocs', label: 'فقط دارای سند' },
  ];

  const activeFilterCount = scopedMode
    ? (relationFilter !== 'all' ? 1 : 0) + (fileFilter !== 'all' ? 1 : 0)
    : (contractStatus ? 1 : 0) + (onlyWithDocs ? 1 : 0);
  const activeChips = (scopedMode
    ? [
      relationFilter !== 'all'
        ? {
          key: 'relation',
          label: `جایگاه سند: ${RELATION_META[relationFilter]?.label || relationFilter}`,
          clear: () => setRelationFilter('all'),
        }
        : null,
      fileFilter !== 'all'
        ? {
          key: 'file',
          label: `نوع فایل: ${FILE_TYPE_META[fileFilter]?.label || fileFilter}`,
          clear: () => setFileFilter('all'),
        }
        : null,
    ]
    : [
      contractStatus
        ? {
          key: 'status',
          label: `وضعیت قرارداد: ${CONTRACT_STATUS_LABELS[contractStatus] || contractStatus}`,
          clear: () => setContractStatus(''),
        }
        : null,
      onlyWithDocs
        ? {
          key: 'withDocs',
          label: 'فقط قراردادهای دارای سند',
          clear: () => setOnlyWithDocs(false),
        }
        : null,
    ]).filter(Boolean);
  const activeChipSx = toolbar.chipStyle === 'outlined'
    ? { bgcolor: 'transparent', border: `1px solid ${toolbar.chipBorder}`, color: toolbar.primary, fontWeight: 700 }
    : { bgcolor: toolbar.chipBg, color: toolbar.primary, fontWeight: 700, border: `1px solid ${toolbar.chipBorder}` };
  const filtersExpanded = filtersOpen === null ? false : filtersOpen;


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

  /* اسکلت صفحه (هدر و نوار ابزار) فوراً می‌آید؛ فقط داخل کارت اسپینر نشان داده می‌شود */
  const tableLoading = (
    <Box sx={{ py: 7, textAlign: 'center' }}>
      <CircularProgress size={26} />
    </Box>
  );

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<FolderSharedIcon />}
        color={ACCENT}
        subtitle="آرشیو یکپارچهٔ اسناد قرارداد، الحاقیه، تضمین و صورت‌وضعیت"
        title="بایگانی اسناد قرارداد"
        badge={(
          <Chip size="small" label={`${formatPersianNumber(filtered.length)} سند`}
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
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv}>خروجی</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>سند جدید</Button>
          </>
        )}
      />

      {/* نوار استاندارد جستجو، ترتیب و فیلترها — همان الگوی صفحهٔ «قراردادهای من» */}
      <Paper sx={{ p: 1.25, mb: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 'none' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} useFlexGap alignItems={{ xs: 'stretch', sm: 'center' }}>
          <TextField
            size="small"
            placeholder={toolbar.searchPlaceholder}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{
              flex: toolbar.searchWidth === '100%' ? 1 : '0 0 auto',
              width: toolbar.searchWidth === '100%' ? { xs: '100%', sm: 'auto' } : `${toolbar.searchWidth}px`,
              '& .MuiOutlinedInput-root': {
                height: `${toolbar.searchHeight}px`,
                borderRadius: `${toolbar.searchRadius}px`,
                bgcolor: toolbar.searchBg,
                fontSize: 12.5,
              },
            }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            }}
          />
          {/* ترتیب نمایش: کنار جستجو و پیش از دکمهٔ فیلترها — خودش فیلتر نیست */}
          <TextField
            select
            size="small"
            value={sortValue}
            onChange={(event) => setSortValue(event.target.value)}
            sx={{
              flex: '0 0 auto',
              minWidth: { xs: '100%', sm: 168 },
              '& .MuiOutlinedInput-root': {
                height: `${toolbar.searchHeight}px`,
                borderRadius: `${toolbar.searchRadius}px`,
                fontSize: 12.5,
              },
              '& .MuiSelect-select': { paddingLeft: '30px !important', paddingRight: '10px !important' },
            }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SortIcon fontSize="small" /></InputAdornment> }}
            SelectProps={{ inputProps: { 'aria-label': 'ترتیب نمایش' }, IconComponent: SortArrowLeft }}
          >
            {sortOptions.map((option) => (
              <MenuItem key={option.value} value={option.value} sx={{ fontSize: 12.5 }}>{option.label}</MenuItem>
            ))}
          </TextField>
          <Button
            variant={toolbar.filtersVariant}
            onClick={() => setFiltersOpen(!filtersExpanded)}
            startIcon={toolbar.filtersIconPosition === 'start' ? <FilterListIcon fontSize="small" /> : null}
            endIcon={toolbar.filtersIconPosition === 'end' ? <FilterListIcon fontSize="small" /> : null}
            aria-expanded={filtersExpanded}
            sx={{
              /* هم‌ارتفاع با کادر جستجو و کنترل ترتیب */
              height: `${toolbar.searchHeight}px !important`,
              minHeight: `${toolbar.searchHeight}px !important`,
              maxHeight: `${toolbar.searchHeight}px !important`,
              alignSelf: 'center', py: 0, boxSizing: 'border-box',
              borderRadius: `${toolbar.filtersRadius}px`,
              fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', minWidth: 'auto', px: 2,
            }}
          >
            {toolbar.filtersLabel}
            {toolbar.showFiltersCount && activeFilterCount > 0 ? (
              <Chip
                size="small"
                label={toPersianDigits(activeFilterCount)}
                sx={{
                  ml: 0.75, height: 18, fontSize: 11, fontWeight: 800,
                  bgcolor: toolbar.filtersVariant === 'contained' ? 'rgba(255,255,255,0.24)' : toolbar.chipBg,
                  color: toolbar.filtersVariant === 'contained' ? '#fff' : toolbar.primary,
                }}
              />
            ) : null}
          </Button>
          {toolbar.showReset && (activeFilterCount > 0 || search) ? (
            <Button
              size="small" variant="text"
              onClick={() => { resetFilters(); clearContract(); }}
              sx={{
                height: `${toolbar.searchHeight}px`,
                minHeight: `${toolbar.searchHeight}px`,
                alignSelf: 'center', py: 0,
                fontSize: 12.5, whiteSpace: 'nowrap',
              }}
            >
              {toolbar.resetLabel}
            </Button>
          ) : null}
        </Stack>

        <Collapse in={filtersExpanded} timeout={180} unmountOnExit>
          <Box sx={{
            mt: 1.25, pt: 1.25, borderTop: '1px dashed', borderColor: 'divider',
            bgcolor: toolbar.panelBg,
            borderRadius: `${toolbar.panelRadius}px`,
            p: `${toolbar.panelPadding}px`,
          }}>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: toolbar.panelGrid },
              gap: `${toolbar.panelGap}px`,
              alignItems: 'end',
            }}>
              {scopedMode ? (
                <>
                  <FilterSelect
                    label="جایگاه سند" value={relationFilter} options={relationOptionsList}
                    labelsPosition={toolbar.labelsPosition} radius={toolbar.filtersRadius}
                    onChange={setRelationFilter}
                  />
                  <FilterSelect
                    label="نوع فایل" value={fileFilter} options={fileOptionsList}
                    labelsPosition={toolbar.labelsPosition} radius={toolbar.filtersRadius}
                    onChange={setFileFilter}
                  />
                </>
              ) : (
                <>
                  <FilterSelect
                    label="وضعیت قرارداد" value={contractStatus} options={statusOptionsList}
                    labelsPosition={toolbar.labelsPosition} radius={toolbar.filtersRadius}
                    onChange={setContractStatus}
                  />
                  <FilterSelect
                    label="نمایش" value={onlyWithDocs ? 'withDocs' : 'all'} options={docsToggleOptions}
                    labelsPosition={toolbar.labelsPosition} radius={toolbar.filtersRadius}
                    onChange={(value) => setOnlyWithDocs(value === 'withDocs')}
                  />
                  <FilterSelect
                    label="قرارداد" value={contractId} options={contractOptions}
                    labelsPosition={toolbar.labelsPosition} radius={toolbar.filtersRadius}
                    onChange={(value) => setSearchParams(value ? { contract: value } : {})}
                  />
                </>
              )}
              {toolbar.showReset ? (
                <Button
                  variant="text" size="small" onClick={resetFilters}
                  sx={{ fontSize: 12.5, justifySelf: 'start', height: `${toolbar.searchHeight - 6}px` }}
                >
                  بازنشانی فیلترها
                </Button>
              ) : null}
            </Box>
          </Box>
        </Collapse>

        {activeChips.length > 0 ? (
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
            {activeChips.map((chip) => (
              <Chip key={chip.key} size="small" label={chip.label} onDelete={chip.clear} sx={activeChipSx} />
            ))}
          </Stack>
        ) : null}
      </Paper>



      {scopedMode ? (
        /* نمای اسناد یک قرارداد انتخاب‌شده */
        docsQuery.isLoading ? tableLoading : !filtered.length ? (
          <Paper elevation={0} sx={{
            p: 5, borderRadius: '16px', border: '1px dashed', borderColor: 'divider',
            textAlign: 'center', bgcolor: 'background.paper',
          }}>
            <FolderSharedIcon sx={{ fontSize: 36, color: theme.palette.text.disabled, mb: 1 }} />
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>سندی با این مشخصات پیدا نشد.</Typography>
            <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.3 }}>فیلترها را تغییر دهید یا سند جدید بارگذاری کنید.</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ mt: 1.5 }}>افزودن سند</Button>
          </Paper>
        ) : (
          <Paper elevation={0} sx={{
            borderRadius: 'var(--hrms-table-radius, 16px)',
            overflow: 'hidden',
            border: '1px solid', borderColor: 'divider',
            bgcolor: 'background.paper', boxShadow: 'none',
          }}>
            <DocumentArchiveTable
              rows={pagedRows}
              tableTheme={tableTheme}
              containerRef={tableScrollRef}
              tableHeight={tableHeight}
              rowHeight={effectiveRowPx}
              dimmed={docsQuery.isFetching}
              onView={setDetail}
              onEdit={openEdit}
              onDelete={setConfirmDelete}
              onPreview={previewFile}
              onDownload={downloadFile}
            />
            <TablePager
              tableTheme={tableTheme}
              page={page}
              onPage={setPage}
              totalPages={totalPages}
              pageNumbers={pageNumbers}
              total={filtered.length}
              pageSize={pageSize}
              unit="سند"
            />
          </Paper>
        )
      ) : (

        <Paper elevation={0} sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: 'stretch',
          borderRadius: 'var(--hrms-table-radius, 16px)',
          overflow: 'hidden',
          border: '1px solid', borderColor: 'divider',
          bgcolor: 'background.paper', boxShadow: 'none',
        }}>
          {/* جدول قراردادها — داخل همان کارت استاندارد */}
          <Box sx={{ width: { xs: '100%', lg: '66.6667%' }, minWidth: 0 }}>
            {docsQuery.isLoading ? tableLoading : !contractRows.length ? (
              <Box sx={{ p: 5, textAlign: 'center' }}>
                <FolderSharedIcon sx={{ fontSize: 36, color: theme.palette.text.disabled, mb: 1 }} />
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>قراردادی با این مشخصات پیدا نشد.</Typography>
                <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.3 }}>عبارت جستجو یا فیلترها را تغییر دهید.</Typography>
              </Box>
            ) : (
              <>
                <ContractArchiveTable
                  rows={pagedContracts}
                  tableTheme={tableTheme}
                  containerRef={tableScrollRef}
                  tableHeight={tableHeight}
                  rowHeight={effectiveRowPx}
                  dimmed={docsQuery.isFetching || contractsQuery.isFetching}
                  docCounts={docCountByContract}
                  onOpen={openContract}
                />
                <TablePager
                  tableTheme={tableTheme}
                  page={contractPage}
                  onPage={setContractPage}
                  totalPages={contractTotalPages}
                  pageNumbers={contractPageNumbers}
                  total={contractRows.length}
                  pageSize={contractPageSize}
                  unit="قرارداد"
                />
              </>
            )}
          </Box>
          {/* آخرین بارگذاری‌ها — یک سوم، درون همان کارت */}
          <Box sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            borderTop: { xs: '1px solid', lg: 'none' },
            borderInlineStart: { lg: '1px solid' },
            borderColor: 'divider',
            maxHeight: { lg: tableHeight },
          }}>
            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {recentDocs.length ? recentDocs.map((doc) => (
                <Box
                  key={doc.id}
                  onClick={() => setDetail(doc)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 0.75,
                    px: 1.25, py: 0.85,
                    borderBottom: tableTheme.divider,
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: tableTheme.hoverBg },
                    '&:last-of-type': { borderBottom: 'none' },
                  }}
                >
                  <FileBadge row={doc} size={26} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800 }}>{doc.title || '—'}</Typography>
                    <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }}>
                      {toPersianDigits(doc.contract_number || '—')} · {dateLabel(doc.uploaded_at)}
                    </Typography>
                  </Box>
                  <Tooltip title="دانلود">
                    <IconButton
                      size="small"
                      onClick={(event) => { event.stopPropagation(); downloadFile(doc); }}
                    >
                      <DownloadIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )) : (
                <Box sx={{ p: 3.5, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 11.5, color: MUTED }}>سندی بارگذاری نشده است.</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Paper>
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
