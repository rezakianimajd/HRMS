import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Alert, Box, Button, Chip, CircularProgress, IconButton, Menu, MenuItem,
  Paper, Stack,
  Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import JalaliMaskedDateInput from '../../core/components/ui/JalaliMaskedDateInput';
import AttachmentPreviewDialog from '../../core/components/ui/AttachmentPreviewDialog';
import ArchiveIcon from '@mui/icons-material/Archive';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import EditNoteIcon from '@mui/icons-material/EditNote';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReplyIcon from '@mui/icons-material/Reply';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import useAuth from '../../core/hooks/useAuth';
import { letterCan } from '../../core/utils/correspondencePermissions';
import PageHeader from '../../core/components/ui/PageHeader';
import { MUTED } from '../accounting/AccountingDashboardUI';
import {
  ModulePager, ModuleTable, ModuleToolbar, useModuleTheme, useRowHeight,
} from '../contracts/contractModuleUi';
import {
  ACCENT, DANGER, DIRECTION_META, INCOMING, INTERNAL, KpiTile,
  OK, OUTGOING, PRIORITY_META, REFERRAL_STATUS_META, SLATE, STATUS_META, WARN, chipSx,
  dateLabel, daysBetween, daysColor, daysLabel, timeLabel,
} from './correspondenceUi';
import {
  PartyPicker, partyValue,
} from './correspondenceLookups';
import {
  CellText, InlineDate, InlineSelect,
  InlineText, inlineSx, joinParts,
} from './correspondenceFormUi';
import {
  ENTRY_METHOD_META, LetterFormDialog,
  asList,
} from './correspondenceLetterForm';
import { CONTACTS_KEY, META_KEY, REFERRALS_KEY, STATS_KEY } from './correspondenceQueryKeys';
import useLetterListState, { defaultSortFor } from './useLetterListState';
import usePrintDocument from '../../core/print/usePrintDocument';
import PrintPreviewDialog from '../../core/print/PrintPreviewDialog';
import { CompleteReferralDialog, ReferDialog } from './correspondenceReferDialogs';
import LetterDetailsDialog from './correspondenceLetterDetails';
import useLetterMutations from './useLetterMutations';


export const LETTER_PAGE_PRESETS = {
  all: {
    title: 'دفتر مکاتبات اداری',
    icon: MailOutlineIcon,
    accent: ACCENT,
  },
  incoming: {
    title: 'نامه‌های وارده',
    icon: InboxIcon,
    accent: INCOMING,
    direction: 'incoming',
  },
  outgoing: {
    title: 'نامه‌های صادره',
    icon: SendIcon,
    accent: OUTGOING,
    direction: 'outgoing',
  },
  internal: {
    title: 'مکاتبات داخلی',
    icon: MailOutlineIcon,
    accent: INTERNAL,
    direction: 'internal',
  },
  drafts: {
    title: 'پیش‌نویس‌های مکاتبات',
    icon: EditNoteIcon,
    accent: SLATE,
    status: 'draft',
  },
  referrals: {
    title: 'ارجاعات من',
    icon: ForwardToInboxIcon,
    accent: WARN,
    scope: 'referred',
  },
  overdue: {
    title: 'پیگیری معوقات',
    icon: WarningAmberIcon,
    accent: DANGER,
    overdue: true,
  },
  archive: {
    title: 'بایگانی مکاتبات',
    icon: ArchiveIcon,
    accent: '#334155',
    archived: true,
  },
};



const CorrespondenceLettersPage = ({ mode = 'all' }) => {
  const moduleTheme = useModuleTheme();
  const qc = useQueryClient();
  const { user } = useAuth();
  const preset = LETTER_PAGE_PRESETS[mode] || LETTER_PAGE_PRESETS.all;
  const print = usePrintDocument();

  const pageSize = moduleTheme.tableTheme.rowsPerPage;
  const [drawerLetter, setDrawerLetter] = useState(null);
  const [drawerTab, setDrawerTab] = useState('info');
  const [formOpen, setFormOpen] = useState(false);
  const [formLetter, setFormLetter] = useState(null);
  const [referLetter, setReferLetter] = useState(null);
  const [rowMenu, setRowMenu] = useState(null);
  const [completeReferral, setCompleteReferral] = useState(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [previewState, setPreviewState] = useState(null);

  /* فیلترها، جست‌وجوی دی‌بانس‌شده، صفحه‌بندی و کوئری فهرست در یک هوک مستقل */
  const {
    archivedOnly, setArchivedOnly, attachmentFilter, setAttachmentFilter, categoryFilter,
    setCategoryFilter, debouncedSearch, direction, setDirection, entryMethodFilter,
    setEntryMethodFilter, filtersOpen, setFiltersOpen, isFetching, isLoading, letters,
    listParams, page, setPage, pageNumbers, priorityFilter, setPriorityFilter, overdueOnly,
    setOverdueOnly, refetch, scope, setScope, search, setSearch, sortBy, setSortBy,
    statusFilter, setStatusFilter, total, totalPages,
  } = useLetterListState({
    preset,
    pageSize,
    onNewRequested: () => {
      setFormLetter(null);
      setFormOpen(true);
    },
  });

  /* با تغییر mode، فیلترها به پیش‌فرض همان صفحه برمی‌گردند.
     در رندر اول اجرا نمی‌شود تا مقادیر آمده از URL (?q=…&has_attachments=…) حفظ شوند. */
  const previousModeRef = useRef(mode);
  useEffect(() => {
    if (previousModeRef.current === mode) return;
    previousModeRef.current = mode;
    const next = LETTER_PAGE_PRESETS[mode] || LETTER_PAGE_PRESETS.all;
    setDirection(next.direction || 'all');
    setStatusFilter(next.status || 'all');
    setScope(next.scope || 'all');
    setOverdueOnly(Boolean(next.overdue));
    setArchivedOnly(Boolean(next.archived));
    setCategoryFilter('all');
    setPriorityFilter('all');
    setEntryMethodFilter('all');
    setSearch('');
    setSortBy(defaultSortFor(next.direction));
    setFiltersOpen(false);
    // eslint-disable-next-line
  }, [mode]);

  useEffect(() => {
    setDrawerTab('info');
  }, [drawerLetter?.id]);


  /* مجوزهای ریز این صفحه (بر اساس جهت جاری) */
  const activeDirection = direction !== 'all' ? direction : (preset.direction || 'incoming');
  const canDelete = useMemo(
    () => letterCan(user, 'delete', activeDirection),
    [user, activeDirection],
  );
  const canCreate = useMemo(
    () => letterCan(user, 'create', activeDirection),
    [user, activeDirection],
  );
  const canEdit = useMemo(
    () => letterCan(user, 'edit', activeDirection),
    [user, activeDirection],
  );
  const canExport = useMemo(
    () => letterCan(user, 'export', activeDirection),
    [user, activeDirection],
  );

  /** مجوز هر نامه بر اساس جهت خودش (صفحهٔ «همه مکاتبات» چند جهت دارد). */
  const canEditOf = (letter) => letterCan(user, 'edit', letter?.direction || activeDirection);
  const canCreateOf = (letter) => letterCan(user, 'create', letter?.direction || activeDirection);
  const canDeleteOf = (letter) => letterCan(user, 'delete', letter?.direction || activeDirection);


  const { data: meta } = useQuery({
    queryKey: META_KEY,
    queryFn: () => axiosInstance.get('/letters/meta/').then((response) => response.data),
  });
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: STATS_KEY,
    queryFn: () => axiosInstance.get('/letters/stats/').then((response) => response.data),
  });
  const { data: myReferrals, refetch: refetchReferrals } = useQuery({
    queryKey: REFERRALS_KEY,
    queryFn: () => axiosInstance.get('/letter-referrals/', {
      params: { mine: 1, open_only: 1, page_size: 100 },
    }).then((response) => response.data),
  });
  const { data: rawContacts } = useQuery({
    queryKey: CONTACTS_KEY,
    queryFn: () => axiosInstance.get('/correspondents/', { params: { page_size: 500 } })
      .then((response) => response.data),
  });

  const contacts = useMemo(() => asList(rawContacts), [rawContacts]);

  const { data: drawerDetail } = useQuery({
    queryKey: ['correspondence-letter', drawerLetter?.id],
    queryFn: () => axiosInstance.get(`/letters/${drawerLetter.id}/`).then((response) => response.data),
    enabled: Boolean(drawerLetter?.id),
  });
  const activeLetter = drawerDetail || drawerLetter;

  /* ---------- نوشتن: ویرایش درجای ردیف‌ها، ثبت/ارجاع/حذف/آپلود (هوک مستقل) ---------- */
  const {
    bulkSaving, deleteAttachment, deleteLetter, discardAll, discardRow, dirtyCount, draft,
    editRowId, letterAction, patchDraft, referralComplete, refreshAll, rowDirty, rowEditing,
    saveAllEdits, saveRowEdit, savingIds, startRowEdit, uploadAttachment, uploadRef, uploading,
  } = useLetterMutations({
    activeLetterId: activeLetter?.id,
    canEditOf,
    letters,
    qc,
    refreshList: refetch,
    refreshReferrals: refetchReferrals,
    refreshStats: refetchStats,
    setComment,
    setCompleteReferral,
    setDrawerLetter,
    setError,
    setToast,
  });

  /** کلیک تکی = پروندهٔ نامه، دوبار کلیک = ویرایش درجا (بدون باز شدن هم‌زمان پرونده). */
  const rowClickTimer = useRef(0);
  const handleRowClick = (row) => {
    if (editRowId) return;
    window.clearTimeout(rowClickTimer.current);
    rowClickTimer.current = window.setTimeout(() => {
      setDrawerLetter(row.letter);
      setComment('');
    }, 220);
  };
  const handleRowDoubleClick = (row) => {
    window.clearTimeout(rowClickTimer.current);
    startRowEdit(row.letter);
  };


  const rows = useMemo(() => letters.map((letter) => {
    const days = daysBetween(letter.due_date);
    const openStatuses = ['draft', 'registered', 'in_progress'];
    return {
      letter,
      days,
      overdue: days !== null && days < 0 && openStatuses.includes(letter.status),
      statusMeta: STATUS_META[letter.status] || STATUS_META.registered,
      directionMeta: DIRECTION_META[letter.direction] || DIRECTION_META.incoming,
    };
  }), [letters]);

  const counts = useMemo(() => letters.reduce((acc, letter) => {
    acc[letter.direction] = (acc[letter.direction] || 0) + 1;
    acc[letter.status] = (acc[letter.status] || 0) + 1;
    return acc;
  }, {}), [letters]);

  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(moduleTheme.tableTheme, rows.length);

  const totals = stats?.totals || {};
  const myReferralCount = totals.my_referrals ?? asList(myReferrals).length;

  const exportExcel = async () => {
    const response = await axiosInstance.get('/letters/export-excel/', {
      params: listParams, responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'correspondence.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  };

  /** آیتم‌های پیش‌نمایش: آدرس امن (توکن‌دار) با fallback مسیر مستقیم. */
  const previewItems = (files) => (files || [])
    .filter((file) => file && (file.preview_url || file.file_url))
    .map((file) => ({ ...file, file_url: file.preview_url || file.file_url }));

  const openPreview = (files, index, title) => {
    const items = previewItems(files);
    if (!items.length) return;
    setPreviewState({ items, index: Math.min(Math.max(index || 0, 0), items.length - 1), title });
  };

  const openRowPreview = async (letter) => {
    if (!letter?.id) return;
    const cachedFiles = previewItems(letter.attachments);
    if (cachedFiles.length) {
      openPreview(cachedFiles, 0, letter.subject);
      return;
    }
    try {
      const detail = await qc.fetchQuery({
        queryKey: ['correspondence-letter', letter.id],
        queryFn: () => axiosInstance.get(`/letters/${letter.id}/`).then((response) => response.data),
      });
      const files = previewItems(detail?.attachments);
      if (files.length) {
        openPreview(files, 0, detail.subject || letter.subject);
        return;
      }
      setDrawerLetter(detail && detail.id ? detail : letter);
      setDrawerTab('attachments');
      setToast('این نامه فایل قابل‌نمایش ندارد.');
    } catch (err) {
      setError('دریافت پیوست‌های نامه ممکن نشد.');
    }
  };

  const openNew = (presetDirection) => {
    setFormLetter(null);
    setFormOpen(true);
    if (presetDirection && !preset.direction) setDirection(presetDirection);
  };

  const resetFilters = () => {
    setSearch('');
    setDirection(preset.direction || 'all');
    setStatusFilter(preset.status || 'all');
    setScope(preset.scope || 'all');
    setOverdueOnly(Boolean(preset.overdue));
    setArchivedOnly(Boolean(preset.archived));
    setCategoryFilter('all');
    setPriorityFilter('all');
    setEntryMethodFilter('all');
    setAttachmentFilter('all');
    setSortBy('newest');
  };

  const activeFilterCount = [
    !preset.direction && direction !== 'all',
    !preset.status && statusFilter !== 'all',
    categoryFilter !== 'all', priorityFilter !== 'all',
    ['incoming', 'all'].includes(mode) && entryMethodFilter !== 'all',
    attachmentFilter !== 'all',
  ].filter(Boolean).length;

  const activeChips = [
    !preset.direction && direction !== 'all' && {
      key: 'direction',
      label: `جهت: ${DIRECTION_META[direction]?.label || direction}`,
      clear: () => setDirection('all'),
    },
    !preset.status && statusFilter !== 'all' && {
      key: 'status',
      label: `وضعیت: ${STATUS_META[statusFilter]?.label || statusFilter}`,
      clear: () => setStatusFilter('all'),
    },
    categoryFilter !== 'all' && {
      key: 'category',
      label: `نوع: ${(meta?.categories || []).find((row) => row.id === Number(categoryFilter))?.name || ''}`,
      clear: () => setCategoryFilter('all'),
    },
    priorityFilter !== 'all' && {
      key: 'priority', label: `اولویت: ${PRIORITY_META[priorityFilter]?.label || ''}`,
      clear: () => setPriorityFilter('all'),
    },
    ['incoming', 'all'].includes(mode) && entryMethodFilter !== 'all' && {
      key: 'entry_method',
      label: `${preset.direction === 'outgoing' ? 'نحوهٔ ثبت' : 'نحوهٔ ورود'}: `
        + `${ENTRY_METHOD_META[entryMethodFilter]?.label || entryMethodFilter}`,
      clear: () => setEntryMethodFilter('all'),
    },
    attachmentFilter !== 'all' && {
      key: 'attachments',
      label: attachmentFilter === 'with' ? 'فقط دارای پیوست' : 'فقط بدون پیوست',
      clear: () => setAttachmentFilter('all'),
    },
  ].filter(Boolean);

  const pageFilters = [];
  if (!preset.direction) {
    pageFilters.push({
      label: 'جهت',
      value: direction,
      options: [
        { value: 'all', label: 'همهٔ جهات' },
        ...Object.entries(DIRECTION_META).map(([value, item]) => ({ value, label: item.label })),
      ],
      onChange: setDirection,
    });
  }
  if (!preset.status) {
    pageFilters.push({
      label: 'وضعیت',
      value: statusFilter,
      options: [
        { value: 'all', label: 'همهٔ وضعیت‌ها' },
        ...Object.entries(STATUS_META).map(([value, item]) => ({ value, label: item.label })),
      ],
      onChange: setStatusFilter,
    });
  }
  if (['incoming', 'all'].includes(mode)) {
    pageFilters.push({
      label: 'نحوهٔ ورود',
      value: entryMethodFilter,
      options: [
        { value: 'all', label: 'همه' },
        ...Object.entries(ENTRY_METHOD_META).map(([value, item]) => ({ value, label: item.label })),
      ],
      onChange: setEntryMethodFilter,
    });
  }
  pageFilters.push({
    label: 'نوع مکاتبه',
    value: categoryFilter,
    options: [
      { value: 'all', label: 'همهٔ انواع' },
      ...(meta?.categories || []).map((row) => ({ value: row.id, label: row.name })),
    ],
    onChange: setCategoryFilter,
  });
  pageFilters.push({
    label: 'اولویت',
    value: priorityFilter,
    options: [
      { value: 'all', label: 'همهٔ اولویت‌ها' },
      ...Object.entries(PRIORITY_META).map(([value, item]) => ({ value, label: item.label })),
    ],
    onChange: setPriorityFilter,
  });
  pageFilters.push({
    label: 'پیوست',
    value: attachmentFilter,
    options: [
      { value: 'all', label: 'همه' },
      { value: 'with', label: 'دارای پیوست' },
      { value: 'without', label: 'بدون پیوست' },
    ],
    onChange: setAttachmentFilter,
  });

  const pageAccent = preset.accent || ACCENT;
  const PageIcon = preset.icon || MailOutlineIcon;

  if (isLoading) {
    return <Box sx={{ py: 9, textAlign: 'center' }}><CircularProgress sx={{ color: pageAccent }} /></Box>;
  }

  return (
    <Box sx={{ pb: 1, minWidth: 0 }}>
      <PageHeader
        icon={<PageIcon />}
        title={preset.title}
        badge={(
          <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap">
            <Chip size="small" label={`${formatPersianNumber(total)} مکاتبه`}
              sx={{ height: 23, fontWeight: 800, bgcolor: alpha(pageAccent, 0.1), color: pageAccent }} />
            {mode === 'all' ? (
              <>
                <Chip size="small" label={`وارده ${formatPersianNumber(totals.incoming || 0)}`}
                  sx={{ height: 23, fontWeight: 800, bgcolor: alpha(INCOMING, 0.1), color: INCOMING }} />
                <Chip size="small" label={`صادره ${formatPersianNumber(totals.outgoing || 0)}`}
                  sx={{ height: 23, fontWeight: 800, bgcolor: alpha(OUTGOING, 0.1), color: OUTGOING }} />
              </>
            ) : null}
            {totals.overdue && mode !== 'overdue' ? (
              <Chip size="small" label={`معوق ${formatPersianNumber(totals.overdue)}`}
                sx={{ height: 23, fontWeight: 800, bgcolor: alpha(DANGER, 0.1), color: DANGER }} />
            ) : null}
            {mode === 'referrals' && totals.my_overdue_referrals ? (
              <Chip size="small" label={`ارجاع معوق ${formatPersianNumber(totals.my_overdue_referrals)}`}
                sx={{ height: 23, fontWeight: 800, bgcolor: alpha(DANGER, 0.1), color: DANGER }} />
            ) : null}
          </Stack>
        )}
        actions={(
          <>
            {dirtyCount ? (
              <>
                <Tooltip title="ذخیرهٔ همهٔ ردیف‌های ویرایش‌شده در جدول">
                  <span>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      disabled={bulkSaving}
                      onClick={saveAllEdits}
                      sx={{ bgcolor: OK, '&:hover': { bgcolor: '#115e59' } }}
                    >
                      {bulkSaving
                        ? 'در حال ذخیره…'
                        : `ذخیرهٔ تغییرات (${toPersianDigits(dirtyCount)})`}
                    </Button>
                  </span>
                </Tooltip>
                <Button variant="text" onClick={discardAll} disabled={bulkSaving}>
                  انصراف از ویرایش
                </Button>
              </>
            ) : (
              <Tooltip title="برای ویرایش، روی ردیف دوبار کلیک کنید (Enter: ذخیره، Esc: انصراف)">
                <Chip
                  size="small"
                  icon={<EditOutlinedIcon sx={{ fontSize: 14 }} />}
                  label="ویرایش: دوبار کلیک روی ردیف"
                  sx={{ height: 26, fontWeight: 700, bgcolor: alpha(ACCENT, 0.08), color: ACCENT }}
                />
              </Tooltip>
            )}
            <Tooltip title="به‌روزرسانی">
              <span>
                <Button variant="outlined" disabled={isFetching} onClick={refreshAll}
                  sx={{ minWidth: 40, px: 1 }}>
                  <RefreshIcon fontSize="small" />
                </Button>
              </span>
            </Tooltip>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportExcel}
              disabled={!canExport}>خروجی اکسل</Button>
            <Tooltip title="نگاشت نام‌های واردشده از اکسل به پرسنل و طرف‌های حساب">
              <Button variant="outlined" startIcon={<SyncAltIcon />}
                onClick={() => { window.location.assign('/correspondence/name-mapping'); }}>
                نگاشت نام‌ها
              </Button>
            </Tooltip>
            {mode === 'all' ? (
              <>
                <Button variant="outlined" startIcon={<InboxIcon />}
                  disabled={!canCreate}
                  onClick={() => openNew('incoming')}>
                  وارده جدید
                </Button>
                <Button variant="contained" startIcon={<SendIcon />} onClick={() => openNew('outgoing')}
                  disabled={!canCreate}
                  sx={{ bgcolor: OUTGOING, '&:hover': { bgcolor: '#115e59' } }}>
                  نامه صادره
                </Button>
              </>
            ) : (
              <Button variant="contained" startIcon={<PageIcon />}
                disabled={!canCreate}
                onClick={() => openNew(preset.direction || 'incoming')}
                sx={{ bgcolor: pageAccent, '&:hover': { bgcolor: alpha(pageAccent, 0.85) } }}>
                {preset.direction === 'outgoing' ? 'نامه صادره جدید'
                  : preset.direction === 'internal' ? 'مکاتبه داخلی جدید'
                    : preset.direction === 'incoming' ? 'نامه وارده جدید' : 'مکاتبه جدید'}
              </Button>
            )}
          </>
        )}
      />

      {mode === 'all' ? (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: 'repeat(2, minmax(0,1fr))', md: 'repeat(3, minmax(0,1fr))', lg: 'repeat(6, minmax(0,1fr))' },
          gap: 1, mb: 1.25, minWidth: 0,
        }}>
          <KpiTile label="کل مکاتبات" value={formatPersianNumber(totals.all || 0)}
            color={SLATE} icon={MailOutlineIcon} />
          <KpiTile label="نامه‌های وارده" value={formatPersianNumber(totals.incoming || 0)}
            hint={`این ماه: ${formatPersianNumber(totals.incoming_this_month || 0)}`} color={INCOMING}
            icon={InboxIcon} onClick={() => setDirection('incoming')} />
          <KpiTile label="نامه‌های صادره" value={formatPersianNumber(totals.outgoing || 0)}
            hint={`این ماه: ${formatPersianNumber(totals.outgoing_this_month || 0)}`} color={OUTGOING}
            icon={SendIcon} onClick={() => setDirection('outgoing')} />
          <KpiTile label="در جریان" value={formatPersianNumber(totals.open || 0)}
            hint={`پیش‌نویس: ${formatPersianNumber(totals.drafts || 0)}`} color={WARN}
            icon={EditNoteIcon} onClick={() => setStatusFilter('in_progress')} />
          <KpiTile label="معوق (مهلت پاسخ)" value={formatPersianNumber(totals.overdue || 0)} color={DANGER} icon={WarningAmberIcon}
            onClick={() => setOverdueOnly(true)} />
          <KpiTile label="ارجاعات من" value={formatPersianNumber(myReferralCount)}
            hint={`معوق: ${formatPersianNumber(totals.my_overdue_referrals || 0)}`} color={INTERNAL}
            icon={ForwardToInboxIcon} onClick={() => setScope('referred')} />
        </Box>
      ) : null}

      {totals.overdue && mode !== 'overdue' ? (
        <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 1, borderRadius: '12px', py: 0.35 }}>
          <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap">
            <Typography sx={{ fontSize: 12 }}>
              {formatPersianNumber(totals.overdue)} مکاتبه از مهلت پاسخ گذشته است.
            </Typography>
            <Button size="small" variant="text" onClick={() => setOverdueOnly(true)}
              sx={{ fontSize: 12.5, fontWeight: 800, py: 0 }}>
              نمایش معوقات
            </Button>
          </Stack>
        </Alert>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mb: 1, borderRadius: '12px', py: 0.35 }}
          onClose={() => setError('')}>
          <Typography sx={{ fontSize: 12 }}>{error}</Typography>
        </Alert>
      ) : null}
      {toast ? (
        <Alert severity="success" sx={{ mb: 1, borderRadius: '12px', py: 0.35 }}
          onClose={() => setToast('')}>
          <Typography sx={{ fontSize: 12 }}>{toast}</Typography>
        </Alert>
      ) : null}

      <ModuleToolbar
        theme={moduleTheme}
        search={search}
        onSearch={setSearch}
        searchPlaceholder={mode === 'all'
          ? 'جستجو در موضوع، شماره، طرف حساب، نام ارجاع‌شده، متن نامه یا پیوست…'
          : `جستجو در ${preset.title} (موضوع، شماره، طرف حساب، ارجاع‌شده)…`}
        sort={sortBy}
        sortOptions={[
          ...(preset.direction === 'incoming' ? [
            { value: 'reg_no', label: 'شماره ثبت (آخرین اول)' },
            { value: 'reg_no_asc', label: 'شماره ثبت (اولین اول)' },
          ] : []),
          ...(preset.direction === 'outgoing' ? [
            { value: 'out_no', label: 'شماره نامه (آخرین سری اول)' },
            { value: 'out_no_asc', label: 'شماره نامه (اولین سری اول)' },
          ] : []),
          { value: 'newest', label: preset.direction === 'outgoing'
            ? 'جدیدترین تاریخ نامه/ارسال' : 'جدیدترین تاریخ ورود' },
          { value: 'oldest', label: preset.direction === 'outgoing'
            ? 'قدیمی‌ترین تاریخ نامه/ارسال' : 'قدیمی‌ترین تاریخ ورود' },
          { value: 'due', label: 'نزدیک‌ترین مهلت' },
          { value: 'number', label: 'شماره نامه' },
        ]}
        onSort={setSortBy}
        filters={pageFilters}
        activeChips={activeChips}
        activeFilterCount={activeFilterCount}
        onReset={resetFilters}
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
      />

      <Paper elevation={0}
        onKeyDown={(event) => {
          if (!editRowId) return;
          const target = event.target;
          if (event.key === 'Escape') {
            event.preventDefault();
            discardRow(editRowId);
            return;
          }
          if (event.key === 'Enter' && !event.shiftKey && target?.tagName === 'INPUT') {
            event.preventDefault();
            saveRowEdit(editRowId);
          }
        }}
        sx={{
          borderRadius: 'var(--hrms-table-radius, 16px)',
          overflow: 'hidden',
          px: `${moduleTheme.cardPadX}px`, py: `${moduleTheme.cardPadY}px`,
          border: '1px solid', borderColor: moduleTheme.cardBorderColor,
          bgcolor: 'background.paper', boxShadow: 'none',
        }}>
        <ModuleTable
          tableTheme={moduleTheme.tableTheme}
          ariaLabel="فهرست مکاتبات اداری"
          containerRef={tableRef}
          tableHeight={tableHeight}
          rowHeight={rowHeight}
          dimmed={isFetching}
          rows={rows}
          rowKey={(row) => row.letter.id}
          onRowClick={handleRowClick}
          rowAttributes={(row) => ({
            onDoubleClick: (event) => {
              event.preventDefault();
              handleRowDoubleClick(row);
            },
          })}
          emptyText="مکاتبه‌ای با این شرایط یافت نشد."
          minWidth={mode === 'incoming' ? 1180 : (mode === 'outgoing' ? 1130 : 1040)}
          tableLayout="fixed"
          columns={[
            /* ── شمارهٔ ثبت ورود به واحد (ستون اول دفتر وارده) ── */
            ...(mode === 'incoming' ? [
              {
                key: 'unit_reg_no', label: 'شماره ثبت', width: '10%', align: 'center',
                render: (row) => {
                  const { letter } = row;
                  if (rowEditing(letter)) {
                    return (
                      <InlineText value={draft.unit_reg_no} onChange={patchDraft('unit_reg_no')}
                        placeholder="شماره ثبت" align="center" />
                    );
                  }
                  const value = letter.unit_reg_no ? toPersianDigits(letter.unit_reg_no) : '—';
                  const companyReg = letter.company_reg_no
                    ? toPersianDigits(letter.company_reg_no) : '';
                  const meta = joinParts(
                    letter.unit_reg_date ? `تاریخ ثبت ورود به واحد: ${dateLabel(letter.unit_reg_date)}` : '',
                    companyReg ? `شماره ثبت ورود به شرکت (ردیف اکسل): ${companyReg}` : '',
                    letter.unit_reg_date || letter.unit_name ? '' : 'ستون ردیف۲ اندیکاتور',
                    letter.unit_name ? `واحد: ${letter.unit_name}` : '',
                  );
                  return (
                    <Box sx={{ minWidth: 0 }} title={meta || undefined}>
                      <Typography sx={{
                        fontSize: 11.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                        color: letter.unit_reg_no ? undefined : MUTED,
                      }}>
                        {value}
                      </Typography>
                      {companyReg ? (
                        <Typography noWrap sx={{ fontSize: 9.5, color: MUTED }}>
                          مؤسسه: {companyReg}
                        </Typography>
                      ) : null}
                    </Box>
                  );
                },
              },
            ] : []),
            /* ── تاریخ ارسال (فقط دفتر صادره) ── */
            ...(mode === 'outgoing' ? [
              {
                key: 'sent_date', label: 'تاریخ ارسال', width: '10%', align: 'center',
                render: (row) => {
                  const { letter } = row;
                  if (rowEditing(letter)) {
                    return (
                      <JalaliMaskedDateInput variant="standard" label="" sx={inlineSx}
                        value={draft.sent_date}
                        onChange={(value) => patchDraft('sent_date')(value)} />
                    );
                  }
                  const sent = letter.sent_date ? dateLabel(letter.sent_date) : '—';
                  const meta = joinParts(
                    letter.entry_time ? `ساعت ${timeLabel(letter.entry_time)}` : '',
                    letter.delivery_type_display || '',
                    letter.delivered_by_label ? `تحویل: ${letter.delivered_by_label}` : '',
                  );
                  return (
                    <CellText mono weight={700} title={meta || undefined}>
                      {sent}
                    </CellText>
                  );
                },
              },
            ] : []),
            /* ── تاریخ ورود (فقط دفتر وارده) ── */
            ...(mode === 'incoming' ? [
              {
                key: 'received_date', label: 'تاریخ ورود', width: '10%', align: 'center',
                render: (row) => {
                  const { letter } = row;
                  const received = letter.received_date ? dateLabel(letter.received_date) : '—';
                  const meta = joinParts(
                    letter.entry_time ? `ساعت ورود ${timeLabel(letter.entry_time)}` : '',
                    letter.delivered_by_label
                      ? `تحویل‌دهنده: ${letter.delivered_by_label}`
                      : (letter.delivered_by_name || letter.entered_by_label
                        ? `تحویل‌دهنده: ${letter.delivered_by_name || letter.entered_by_label}` : ''),
                    letter.entry_method_display || '',
                  );
                  return (
                    <CellText mono weight={700} title={meta || undefined}>
                      {received}
                    </CellText>
                  );
                },
              },
            ] : []),
            /* ── شمارهٔ نامه ── */
            {
              key: 'number', label: 'شماره نامه',
              width: mode === 'incoming' ? '12%' : '14%', align: 'center',
              render: (row) => {
                const { letter } = row;
                if (rowEditing(letter)) {
                  return (
                    <InlineText value={draft.number} onChange={patchDraft('number')}
                      placeholder="شماره نامه" align="center" />
                  );
                }
                const numberText = letter.number
                  ? toPersianDigits(letter.number)
                  : (letter.archive_ref
                    ? toPersianDigits(letter.archive_ref)
                    : 'بدون شماره');
                const meta = joinParts(
                  letter.contract_title ? `قرارداد: ${letter.contract_title}` : '',
                  letter.contract_number ? `شماره قرارداد ${toPersianDigits(letter.contract_number)}` : '',
                );
                return (
                  <CellText mono weight={800} title={meta || undefined}>
                    {numberText}
                  </CellText>
                );
              },
            },
            /* ── طرف حساب / طرف مکاتبه ── */
            {
              key: 'party', label: mode === 'incoming' ? 'طرف حساب' : 'طرف مکاتبه',
              width: mode === 'incoming' ? '18%' : '20%',
              render: (row) => {
                const { letter } = row;
                if (rowEditing(letter)) {
                  return (
                    <PartyPicker
                      label="" placeholder="طرف حساب"
                      variant="standard" size="small" sx={inlineSx}
                      value={draft.party_account
                        ? partyValue(draft.party_account, letter.party_account_name)
                        : (draft.party_name || null)}
                      onChange={(party) => {
                        patchDraft('party_account')(party?.id || '');
                        if (!party?.id) patchDraft('party_name')(party?.name || '');
                      }}
                    />
                  );
                }
                const primary = letter.party_account_name
                  || letter.party_name
                  || letter.organization_name
                  || letter.correspondent_name
                  || letter.sender_party_name
                  || letter.sender_name
                  || letter.receiver_name || '—';
                const meta = joinParts(
                  letter.correspondent_name && letter.correspondent_name !== primary
                    ? letter.correspondent_name : '',
                  letter.receiver_name && letter.receiver_name !== primary
                    ? `گیرنده: ${letter.receiver_name}` : '',
                  letter.sender_name && letter.sender_name !== primary ? letter.sender_name : '',
                );
                return (
                  <CellText weight={700} title={meta || undefined}>{primary}</CellText>
                );
              },
            },
            /* ── موضوع نامه ── */
            {
              key: 'subject', label: 'موضوع نامه',
              width: mode === 'incoming' ? '20%' : '24%',
              render: (row) => {
                const { letter } = row;
                if (rowEditing(letter)) {
                  return (
                    <InlineText value={draft.subject} onChange={patchDraft('subject')}
                      placeholder="موضوع نامه" />
                  );
                }
                const meta = joinParts(
                  letter.category_title,
                  letter.summary ? String(letter.summary).slice(0, 120) : '',
                  letter.unit_name,
                );
                return (
                  <CellText weight={700} title={meta || undefined}>{letter.subject || '—'}</CellText>
                );
              },
            },
            /* ── تاریخ نامه ── */
            {
              key: 'date', label: 'تاریخ نامه', width: '11%', align: 'center',
              render: (row) => {
                const { letter } = row;
                if (rowEditing(letter)) {
                  return <InlineDate value={draft.letter_date} onChange={patchDraft('letter_date')} />;
                }
                return (
                  <CellText mono weight={700}
                    title={letter.due_date ? `مهلت پاسخ: ${dateLabel(letter.due_date)}` : undefined}>
                    {dateLabel(letter.letter_date)}
                  </CellText>
                );
              },
            },
            /* ── ارجاع (آخرین ارجاع) — وارده ── */
            ...(mode === 'incoming' ? [
              {
                key: 'referral', label: 'ارجاع', width: '10%',
                render: (row) => {
                  const last = row.letter.last_referral;
                  if (!last) return <CellText color={MUTED}>بدون ارجاع</CellText>;
                  const referralMeta = REFERRAL_STATUS_META[last.status];
                  const target = last.target_label || last.to_employee_name
                    || last.to_user_name || last.to_name || '—';
                  const meta = joinParts(
                    referralMeta?.label,
                    dateLabel(last.referred_on),
                    last.instruction,
                  );
                  return (
                    <CellText weight={700} color={referralMeta?.color || undefined} title={meta || undefined}>
                      {target}
                    </CellText>
                  );
                },
              },
            ] : []),
            /* ── مهلت پاسخ و وضعیت — صادره/داخلی ── */
            ...(mode === 'incoming' ? [] : [
              {
                key: 'due', label: 'مهلت پاسخ', width: '11%', align: 'center',
                render: (row) => {
                  const { letter } = row;
                  if (rowEditing(letter)) {
                    return <InlineDate value={draft.due_date} onChange={patchDraft('due_date')} />;
                  }
                  if (!letter.due_date) return <CellText color={MUTED}>—</CellText>;
                  return (
                    <Tooltip title={dateLabel(letter.due_date)}>
                      <Chip size="small" label={daysLabel(row.days)} sx={chipSx(daysColor(row.days))} />
                    </Tooltip>
                  );
                },
              },
              {
                key: 'status', label: 'وضعیت', width: '11%', align: 'center',
                render: (row) => (rowEditing(row.letter) ? (
                  <InlineSelect value={draft.status} onChange={patchDraft('status')}
                    options={meta?.statuses || []} />
                ) : (
                  <Chip size="small" label={row.statusMeta.label}
                    sx={chipSx(row.statusMeta.color, row.statusMeta.bg)} />
                )),
              },
            ]),
            /* ── عملیات ── */
            {
              key: 'actions', label: 'عملیات', width: '9%', align: 'center',
              render: (row) => {
                const { letter } = row;
                const rowSaving = savingIds.includes(letter.id);
                if (rowEditing(letter)) {
                  return (
                    <Stack direction="row" spacing={0.25} useFlexGap justifyContent="center"
                      onClick={(event) => event.stopPropagation()}>
                      <Tooltip title="ذخیرهٔ ردیف (Enter)">
                        <span>
                          <IconButton size="small" disabled={rowSaving}
                            aria-label="ذخیرهٔ ردیف"
                            onClick={() => saveRowEdit(letter.id)}>
                            {rowSaving
                              ? <CircularProgress size={14} />
                              : <CheckCircleOutlineIcon sx={{ fontSize: 17, color: OK }} />}
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="انصراف (Esc)">
                        <IconButton size="small" aria-label="انصراف از ویرایش"
                          onClick={() => discardRow(letter.id)}>
                          <CloseIcon sx={{ fontSize: 17 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  );
                }
                return (
                  <Stack direction="row" spacing={0.25} useFlexGap justifyContent="center"
                    onClick={(event) => event.stopPropagation()}>
                    {(letter.attachment_count || (letter.attachments || []).length) ? (
                      <Tooltip title="مشاهدهٔ پیوست">
                        <IconButton size="small" aria-label="مشاهدهٔ پیوست"
                          onClick={() => openRowPreview(letter)}>
                          <AttachFileIcon sx={{ fontSize: 17, color: INTERNAL }} />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    <Tooltip title="مشاهدهٔ پرونده">
                      <IconButton size="small" aria-label="مشاهدهٔ نامه"
                        onClick={() => { setDrawerLetter(letter); setComment(''); }}>
                        <VisibilityOutlinedIcon sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={rowDirty(letter) ? 'ادامهٔ ویرایش' : 'ویرایش سریع ردیف'}>
                      <span>
                        <IconButton size="small" aria-label="ویرایش ردیف"
                          disabled={rowSaving}
                          onClick={() => startRowEdit(letter)}>
                          {rowSaving
                            ? <CircularProgress size={14} />
                            : (
                              <EditOutlinedIcon
                                sx={{ fontSize: 17, color: rowDirty(letter) ? OK : ACCENT }}
                              />
                            )}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="بیشتر">
                      <IconButton size="small" aria-label="عملیات بیشتر"
                        onClick={(event) => setRowMenu({ anchorEl: event.currentTarget, letter })}>
                        <MoreVertIcon sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                );
              },
            },
          ]}
        />
        <ModulePager
          tableTheme={moduleTheme.tableTheme}
          page={page}
          onPage={setPage}
          totalPages={totalPages}
          pageNumbers={pageNumbers}
          total={total}
          pageSize={pageSize}
          unit="مکاتبه"
        />
        <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap"
          sx={{ pt: 1.25, mt: 1.25, borderTop: '1px dashed', borderColor: 'divider' }}>
          {!preset.direction ? (
            <>
              <Chip size="small" label={`وارده: ${formatPersianNumber(stats?.by_direction?.incoming ?? counts.incoming ?? 0)}`} sx={chipSx(INCOMING)} />
              <Chip size="small" label={`صادره: ${formatPersianNumber(stats?.by_direction?.outgoing ?? counts.outgoing ?? 0)}`} sx={chipSx(OUTGOING)} />
              <Chip size="small" label={`داخلی: ${formatPersianNumber(stats?.by_direction?.internal ?? counts.internal ?? 0)}`} sx={chipSx(INTERNAL)} />
            </>
          ) : null}
          {!preset.status ? (
            <Chip size="small" label={`پیش‌نویس: ${formatPersianNumber(stats?.by_status?.draft ?? counts.draft ?? 0)}`} sx={chipSx(SLATE)} />
          ) : null}
          <Chip size="small" label={`در جریان: ${formatPersianNumber(stats?.by_status?.in_progress ?? counts.in_progress ?? 0)}`} sx={chipSx(WARN)} />
          {!preset.archived ? (
            <Chip size="small" label={`بایگانی: ${formatPersianNumber(stats?.by_status?.archived ?? counts.archived ?? 0)}`} sx={chipSx('#334155')} />
          ) : null}
          <Chip size="small" label={`ارجاعات من: ${formatPersianNumber(myReferralCount)}`} sx={chipSx(INTERNAL)} />
          {totals.urgent ? (
            <Chip size="small" label={`فوری/زیاد: ${formatPersianNumber(totals.urgent)}`} sx={chipSx(DANGER)} />
          ) : null}
        </Stack>
      </Paper>

      <Menu
        anchorEl={rowMenu?.anchorEl || null}
        open={Boolean(rowMenu)}
        onClose={() => setRowMenu(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        PaperProps={{ sx: { minWidth: 190, borderRadius: '12px' } }}
      >
        <MenuItem
          disabled={!canEditOf(rowMenu?.letter)}
          onClick={() => {
            setReferLetter(rowMenu.letter);
            setRowMenu(null);
          }}
          sx={{ fontSize: 12.5, gap: 1 }}
        >
          <ForwardToInboxIcon sx={{ fontSize: 16, color: WARN }} />
          ارجاع نامه
        </MenuItem>
        <MenuItem
          disabled={!canEditOf(rowMenu?.letter)}
          onClick={() => {
            setFormLetter(rowMenu.letter);
            setFormOpen(true);
            setRowMenu(null);
          }}
          sx={{ fontSize: 12.5, gap: 1 }}
        >
          <EditNoteIcon sx={{ fontSize: 16, color: INTERNAL }} />
          ویرایش کامل در فرم
        </MenuItem>
        <MenuItem
          disabled={!rowMenu?.letter?.number || !canEditOf(rowMenu?.letter)}
          onClick={() => {
            letterAction.mutate({ id: rowMenu.letter.id, action: 'register' });
            setRowMenu(null);
          }}
          sx={{ fontSize: 12.5, gap: 1 }}
        >
          <TaskAltIcon sx={{ fontSize: 16, color: INCOMING }} />
          ثبت شماره
        </MenuItem>
        <MenuItem
          disabled={
            ['archived', 'canceled'].includes(rowMenu?.letter?.status)
            || !canCreateOf(rowMenu?.letter)
          }
          onClick={() => {
            letterAction.mutate({ id: rowMenu.letter.id, action: 'reply', payload: {} });
            setRowMenu(null);
          }}
          sx={{ fontSize: 12.5, gap: 1 }}
        >
          <ReplyIcon sx={{ fontSize: 16, color: OK }} />
          ایجاد پاسخ
        </MenuItem>
        <MenuItem
          disabled={
            ['closed', 'archived'].includes(rowMenu?.letter?.status)
            || !canEditOf(rowMenu?.letter)
          }
          onClick={() => {
            letterAction.mutate({ id: rowMenu.letter.id, action: 'close' });
            setRowMenu(null);
          }}
          sx={{ fontSize: 12.5, gap: 1 }}
        >
          <DoneAllIcon sx={{ fontSize: 16, color: INTERNAL }} />
          بستن پرونده
        </MenuItem>
        <MenuItem
          disabled={rowMenu?.letter?.status === 'archived' || !canEditOf(rowMenu?.letter)}
          onClick={() => {
            letterAction.mutate({ id: rowMenu.letter.id, action: 'archive' });
            setRowMenu(null);
          }}
          sx={{ fontSize: 12.5, gap: 1 }}
        >
          <ArchiveIcon sx={{ fontSize: 16, color: SLATE }} />
          بایگانی
        </MenuItem>
        {canDeleteOf(rowMenu?.letter) ? (
          <MenuItem
            onClick={() => {
              const target = rowMenu?.letter;
              setRowMenu(null);
              if (!target) return;
              const label = target.number ? `شماره ${toPersianDigits(target.number)}` : target.subject;
              if (window.confirm(`نامه «${label}» حذف شود؟ این عمل بازگشت‌ناپذیر است.`)) {
                deleteLetter.mutate(target.id);
              }
            }}
            sx={{ fontSize: 12.5, gap: 1, color: DANGER }}
          >
            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            حذف نامه
          </MenuItem>
        ) : null}
      </Menu>

      <LetterDetailsDialog
        open={Boolean(drawerLetter)}
        letter={activeLetter}
        tab={drawerTab}
        onTabChange={setDrawerTab}
        onClose={() => setDrawerLetter(null)}
        comment={comment}
        onCommentChange={setComment}
        onCommentSubmit={() => letterAction.mutate({
          id: activeLetter.id, action: 'comment', payload: { note: comment },
        })}
        commentPending={letterAction.isPending}
        canEditOf={canEditOf}
        canCreateOf={canCreateOf}
        canDeleteOf={canDeleteOf}
        onAction={(action, payload) => letterAction.mutate({ id: activeLetter.id, action, payload })}
        onEdit={() => { setFormLetter(activeLetter); setFormOpen(true); }}
        onPrint={() => print.openDocument({
          document: 'letter', payload: { id: activeLetter.id },
        })}
        onRefer={() => setReferLetter(activeLetter)}
        onCompleteReferral={setCompleteReferral}
        onPreview={openPreview}
        onUpload={uploadAttachment}
        uploadRef={uploadRef}
        uploading={uploading}
        onDelete={() => {
          const target = activeLetter;
          if (!target?.id) return;
          const label = target.number
            ? `شماره ${toPersianDigits(target.number)}`
            : (target.subject || 'بدون موضوع');
          if (window.confirm(`نامه «${label}» حذف شود؟ این عمل بازگشت‌ناپذیر است.`)) {
            deleteLetter.mutate(target.id);
          }
        }}
        onDeleteAttachment={(file) => deleteAttachment.mutate(file.id)}
        deleteAttachmentPending={deleteAttachment.isPending}
      />

      <AttachmentPreviewDialog
        open={Boolean(previewState)}
        items={previewState?.items || []}
        index={previewState?.index || 0}
        title={previewState?.title || ''}
        accent={pageAccent}
        onClose={() => setPreviewState(null)}
      />

      <PrintPreviewDialog
        open={print.open}
        title={print.title || 'چاپ نامه'}
        html={print.html}
        loading={print.loading}
        error={print.error}
        onClose={print.close}
      />

      <LetterFormDialog
        open={formOpen}
        initial={formLetter}
        presetDirection={preset.direction || (direction !== 'all' ? direction : 'incoming')}
        meta={meta}
        contacts={contacts}
        canDelete={canDelete}
        onClose={() => { setFormOpen(false); setFormLetter(null); }}
        onSaved={(letter) => setDrawerLetter(letter)}
      />

      <CompleteReferralDialog
        open={Boolean(completeReferral)}
        referral={completeReferral}
        pending={referralComplete.isPending}
        onClose={() => setCompleteReferral(null)}
        onSubmit={(payload) => referralComplete.mutate({ id: completeReferral.id, payload })}
      />

      <ReferDialog
        open={Boolean(referLetter)}
        letter={referLetter}
        pending={letterAction.isPending}
        onClose={() => setReferLetter(null)}
        onSubmit={(payload) => {
          letterAction.mutate({ id: referLetter.id, action: 'refer', payload });
          setReferLetter(null);
        }}
      />
    </Box>
  );
};

export default CorrespondenceLettersPage;





