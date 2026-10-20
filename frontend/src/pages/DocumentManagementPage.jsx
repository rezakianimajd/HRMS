import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import useAuth from '../core/hooks/useAuth';
import {
  Alert, Box, Button, ButtonBase, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControl, Grid, IconButton,
  InputAdornment, InputLabel, MenuItem, Paper, Select, Snackbar, Stack,
  TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import TableRowsIcon from '@mui/icons-material/TableRows';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { formatPersianNumber } from '../core/utils/numberUtils';
import PageHeader from '../core/components/ui/PageHeader';
import { INK, KpiTile, MUTED, SOFT_BG, SurfaceCard } from './accounting/AccountingDashboardUI';
import {
  ActivityCard, CONFIDENTIALITY, DMS_ACCENT, DOC_STATUS, DocumentCard,
  DocumentDetailDrawer, DocumentEditorDialog, DocumentTable, FolderEditorDialog,
  FolderTree, StorageCard, formatBytes,
} from './contracts/DocumentManagementUI';

const EMPTY_DOCUMENT = {
  id: null, title: '', folder: '', description: '', tags: '', reference_number: '',
  issue_date: '', expiry_date: '', retention_until: '', confidentiality: 'internal',
  status: 'active', is_locked: false, file: null, file_name: '', versions: [],
};
const EMPTY_FOLDER = { id: null, name: '', parent: '', color: '#0f766e', description: '' };

const DocumentManagementPage = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [folderId, setFolderId] = useState(() => searchParams.get('folder') || '');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'all');
  const [confidentialityFilter, setConfidentialityFilter] = useState(() => searchParams.get('confidentiality') || 'all');
  const [scope, setScope] = useState(() => searchParams.get('scope') || 'all');
  const [sortBy, setSortBy] = useState('newest');
  const [view, setView] = useState('cards');
  const [detail, setDetail] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_DOCUMENT);
  const [folderDialog, setFolderDialog] = useState(false);
  const [folderEditing, setFolderEditing] = useState(false);
  const [folderForm, setFolderForm] = useState(EMPTY_FOLDER);
  const [folderError, setFolderError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmFolderDelete, setConfirmFolderDelete] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const searchParamsKey = searchParams.toString();
  useEffect(() => {
    const params = new URLSearchParams(searchParamsKey);
    setStatusFilter(params.get('status') || 'all');
    setConfidentialityFilter(params.get('confidentiality') || 'all');
    setScope(params.get('scope') || 'all');
    setSearch(params.get('q') || '');
    setFolderId(params.get('folder') || '');
  }, [searchParamsKey]);

  const foldersQuery = useQuery({
    queryKey: ['dms-folders'],
    queryFn: () => axiosInstance.get('/document-management/folders/').then((response) => response.data),
  });
  const folders = useMemo(
    () => (Array.isArray(foldersQuery.data) ? foldersQuery.data : foldersQuery.data?.results || []),
    [foldersQuery.data],
  );

  const documentsQuery = useQuery({
    queryKey: ['dms-documents'],
    queryFn: () => axiosInstance.get('/document-management/documents/', { params: { page_size: 500, include_archived: 1 } }).then((response) => response.data),
  });
  const documents = useMemo(
    () => (Array.isArray(documentsQuery.data) ? documentsQuery.data : documentsQuery.data?.results || []),
    [documentsQuery.data],
  );

  const statsQuery = useQuery({
    queryKey: ['dms-stats'],
    queryFn: () => axiosInstance.get('/document-management/stats/').then((response) => response.data),
  });
  const stats = statsQuery.data || {};

  const activitiesQuery = useQuery({
    queryKey: ['dms-activities'],
    queryFn: () => axiosInstance.get('/document-management/activities/', { params: { page_size: 20 } }).then((response) => response.data),
  });
  const activities = Array.isArray(activitiesQuery.data) ? activitiesQuery.data : activitiesQuery.data?.results || [];

  const detailActivitiesQuery = useQuery({
    queryKey: ['dms-detail-activities', detail?.id],
    queryFn: () => axiosInstance.get('/document-management/activities/', { params: { document: detail.id, page_size: 50 } }).then((response) => response.data),
    enabled: Boolean(detail?.id),
  });
  const detailActivities = Array.isArray(detailActivitiesQuery.data) ? detailActivitiesQuery.data : detailActivitiesQuery.data?.results || [];

  const folderIds = useMemo(() => {
    if (!folderId) return null;
    const selected = String(folderId);
    const ids = new Set([selected]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const folder of folders) {
        if (folder.parent && ids.has(String(folder.parent)) && !ids.has(String(folder.id))) {
          ids.add(String(folder.id));
          changed = true;
        }
      }
    }
    return ids;
  }, [folderId, folders]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = documents.filter((row) => {
      if (folderIds && !folderIds.has(String(row.folder))) return false;
      if (statusFilter === 'all') {
        if (row.status === 'archived') return false;
      } else if (row.status !== statusFilter) return false;
      if (confidentialityFilter !== 'all' && row.confidentiality !== confidentialityFilter) return false;
      if (scope === 'mine' && String(row.created_by) !== String(user?.id)) return false;
      if (scope === 'expiring' && !(row.days_until_expiry != null && row.days_until_expiry >= 0 && row.days_until_expiry <= 30)) return false;
      if (scope === 'expired' && !row.is_expired) return false;
      if (!query) return true;
      return [row.title, row.description, row.tags, row.reference_number, row.folder_path, row.file_name]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
    result = [...result].sort((a, b) => {
      if (sortBy === 'title') return String(a.title || '').localeCompare(String(b.title || ''), 'fa');
      if (sortBy === 'expiry') return String(a.expiry_date || '9999').localeCompare(String(b.expiry_date || '9999'));
      if (sortBy === 'size') return Number(b.file_size || 0) - Number(a.file_size || 0);
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
    return result;
  }, [documents, folderIds, statusFilter, confidentialityFilter, scope, user?.id, search, sortBy]);

  const activeDocuments = documents.filter((row) => row.status !== 'archived');
  const activeCount = activeDocuments.filter((row) => row.status === 'active').length;
  const archivedCount = documents.filter((row) => row.status === 'archived').length;
  const expiringCount = activeDocuments.filter((row) => row.is_expired || (row.days_until_expiry != null && row.days_until_expiry >= 0 && row.days_until_expiry <= 30)).length;
  const selectedFolder = folders.find((folder) => String(folder.id) === String(folderId));
  const viewMeta = scope === 'mine'
    ? { title: 'اسناد من', subtitle: 'اسنادی که شما ایجاد کرده‌اید' }
    : scope === 'expiring'
      ? { title: 'اسناد نزدیک انقضا', subtitle: 'اسناد دارای تاریخ انقضا در ۳۰ روز آینده' }
      : scope === 'expired'
        ? { title: 'اسناد منقضی', subtitle: 'اسنادی که تاریخ انقضای آن‌ها گذشته است' }
        : statusFilter === 'archived'
          ? { title: 'بایگانی اسناد', subtitle: 'اسناد بایگانی‌شده و قابل بازگردانی' }
          : statusFilter === 'draft'
            ? { title: 'پیش‌نویس‌های اسناد', subtitle: 'اسناد در حال تکمیل و پیش‌نویس' }
            : confidentialityFilter !== 'all'
              ? { title: 'اسناد محرمانه', subtitle: 'اسناد با سطح دسترسی محدود' }
              : { title: 'کتابخانه اسناد', subtitle: 'کتابخانه مرکزی اسناد با پوشه‌بندی، نسخه‌بندی، متادیتا و تاریخچه' };

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['dms-folders'] });
    qc.invalidateQueries({ queryKey: ['dms-documents'] });
    qc.invalidateQueries({ queryKey: ['dms-stats'] });
    qc.invalidateQueries({ queryKey: ['dms-activities'] });
    qc.invalidateQueries({ queryKey: ['dms-detail-activities'] });
  };

  const saveDocument = useMutation({
    mutationFn: (payload) => {
      const body = new FormData();
      body.append('title', payload.title || '');
      if (payload.folder) body.append('folder', payload.folder);
      body.append('description', payload.description || '');
      body.append('tags', payload.tags || '');
      body.append('reference_number', payload.reference_number || '');
      body.append('confidentiality', payload.confidentiality || 'internal');
      body.append('status', payload.status || 'active');
      body.append('is_locked', payload.is_locked ? 'true' : 'false');
      if (payload.issue_date) body.append('issue_date', payload.issue_date);
      if (payload.expiry_date) body.append('expiry_date', payload.expiry_date);
      if (payload.retention_until) body.append('retention_until', payload.retention_until);
      if (payload.file) body.append('file', payload.file);
      return payload.id
        ? axiosInstance.patch(`/document-management/documents/${payload.id}/`, body)
        : axiosInstance.post('/document-management/documents/', body);
    },
    onSuccess: () => {
      invalidateAll();
      setEditorOpen(false);
      setForm(EMPTY_DOCUMENT);
      setError('');
      setToast(form.id ? 'سند و نسخه جدید ذخیره شد' : 'سند با موفقیت آپلود شد');
    },
    onError: (event) => {
      const data = event.response?.data;
      let message = 'ذخیره سند انجام نشد.';
      if (typeof data === 'string') message = data;
      else if (Array.isArray(data)) message = data[0];
      else if (data?.detail) message = data.detail;
      else if (data && typeof data === 'object') {
        const first = Object.values(data).flat()[0];
        if (first) message = first;
      }
      setError(message);
    },
  });

  const archive = useMutation({
    mutationFn: (row) => axiosInstance.post(`/document-management/documents/${row.id}/archive/`),
    onSuccess: () => { invalidateAll(); setDetail(null); setToast('سند بایگانی شد'); },
    onError: () => setToast('بایگانی سند انجام نشد'),
  });
  const restore = useMutation({
    mutationFn: (row) => axiosInstance.post(`/document-management/documents/${row.id}/restore/`),
    onSuccess: () => { invalidateAll(); setDetail(null); setToast('سند بازگردانی شد'); },
    onError: () => setToast('بازگردانی سند انجام نشد'),
  });
  const removeDocument = useMutation({
    mutationFn: (row) => axiosInstance.delete(`/document-management/documents/${row.id}/`, { params: { purge: 1 } }),
    onSuccess: () => { invalidateAll(); setConfirmDelete(null); setDetail(null); setToast('سند حذف شد'); },
    onError: () => setToast('حذف سند انجام نشد'),
  });
  const restoreVersion = useMutation({
    mutationFn: ({ row, version }) => axiosInstance.post(`/document-management/documents/${row.id}/restore-version/`, { version: version.id }),
    onSuccess: (response) => { invalidateAll(); setDetail(response.data); setToast('نسخه انتخاب‌شده به‌عنوان نسخه جاری بازگردانی شد'); },
    onError: () => setToast('بازگردانی نسخه انجام نشد'),
  });
  const downloadDocument = useMutation({
    mutationFn: async (row) => {
      const target = window.open('', '_blank');
      const response = await axiosInstance.post(`/document-management/documents/${row.id}/download/`);
      if (target) target.location.href = response.data.url;
      return response.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dms-activities'] }); setToast('دانلود سند ثبت شد'); },
    onError: () => setToast('دانلود سند انجام نشد'),
  });

  const saveFolder = useMutation({
    mutationFn: (payload) => {
      const clean = {
        name: payload.name,
        parent: payload.parent || null,
        color: payload.color || '#0f766e',
        description: payload.description || '',
      };
      return payload.id
        ? axiosInstance.patch(`/document-management/folders/${payload.id}/`, clean)
        : axiosInstance.post('/document-management/folders/', clean);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dms-folders'] });
      qc.invalidateQueries({ queryKey: ['dms-stats'] });
      setFolderDialog(false);
      setFolderForm(EMPTY_FOLDER);
      setFolderError('');
      setToast(folderEditing ? 'پوشه ویرایش شد' : 'پوشه ایجاد شد');
    },
    onError: (event) => {
      const data = event.response?.data;
      setFolderError(typeof data === 'string' ? data : data?.name?.[0] || 'ذخیره پوشه انجام نشد.');
    },
  });
  const removeFolder = useMutation({
    mutationFn: (row) => axiosInstance.delete(`/document-management/folders/${row.id}/`),
    onSuccess: () => { invalidateAll(); setConfirmFolderDelete(null); setToast('پوشه حذف شد'); },
    onError: () => setToast('حذف پوشه انجام نشد'),
  });

  const openNew = () => {
    setForm({ ...EMPTY_DOCUMENT, folder: folderId || '', issue_date: new Date().toISOString().slice(0, 10) });
    setError('');
    setEditorOpen(true);
  };
  const openEdit = (row) => {
    setForm({ ...EMPTY_DOCUMENT, ...row, folder: row.folder || '', file: null, is_locked: Boolean(row.is_locked) });
    setError('');
    setDetail(null);
    setEditorOpen(true);
  };
  const submit = () => {
    if (!form.title?.trim()) { setError('عنوان سند را وارد کنید.'); return; }
    if (!form.id && !form.file) { setError('برای سند جدید انتخاب فایل الزامی است.'); return; }
    setError('');
    saveDocument.mutate(form);
  };
  const openFolderNew = () => { setFolderEditing(false); setFolderForm(EMPTY_FOLDER); setFolderError(''); setFolderDialog(true); };
  const openFolderEdit = (folder) => {
    setFolderEditing(true);
    setFolderForm({ id: folder.id, name: folder.name || '', parent: folder.parent || '', color: folder.color || '#0f766e', description: folder.description || '' });
    setFolderError('');
    setFolderDialog(true);
  };

  const exportCsv = () => {
    const headers = ['عنوان', 'پوشه', 'محرمانگی', 'وضعیت', 'نسخه', 'حجم', 'تاریخ صدور', 'تاریخ انقضا', 'برچسب‌ها'];
    const body = filtered.map((row) => [
      row.title, row.folder_path || '', row.confidentiality_display || '', row.status_display || '',
      row.version_count || 1, row.file_size || 0, row.issue_date || '', row.expiry_date || '', row.tags || '',
    ]);
    const csv = [headers, ...body]
      .map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `document-library-${selectedFolder?.name || 'all'}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const openActivityTarget = (documentId) => {
    const found = documents.find((row) => String(row.id) === String(documentId));
    if (found) setDetail(found);
  };

  if (documentsQuery.isLoading || foldersQuery.isLoading) {
    return <Box sx={{ py: 9, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<FolderOpenOutlinedIcon />}
        title={viewMeta.title}
        subtitle={viewMeta.subtitle}
        badge={<Chip size="small" label={`${formatPersianNumber(activeDocuments.length)} سند فعال`}
          sx={{ height: 23, fontWeight: 800, bgcolor: alpha(DMS_ACCENT, 0.08), color: DMS_ACCENT }} />}
        actions={(
          <>
            <Tooltip title="به‌روزرسانی"><span><Button variant="outlined" disabled={documentsQuery.isFetching} onClick={() => { documentsQuery.refetch(); statsQuery.refetch(); activitiesQuery.refetch(); }} sx={{ minWidth: 40, px: 1 }}><RefreshIcon fontSize="small" /></Button></span></Tooltip>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv}>خروجی</Button>
            <Button variant="outlined" startIcon={<CreateNewFolderOutlinedIcon />} onClick={openFolderNew}>پوشه جدید</Button>
            <Button variant="contained" startIcon={<UploadFileOutlinedIcon />} onClick={openNew}>آپلود سند</Button>
          </>
        )}
      />

      <Grid container spacing={1.5}>
        <Grid item xs={12} lg={3} sx={{ order: { xs: 2, lg: 1 } }}>
          <Stack spacing={1.5} sx={{ position: { lg: 'sticky' }, top: 16 }}>
            <SurfaceCard title="پوشه‌های اسناد" icon={FolderOpenOutlinedIcon} color={DMS_ACCENT}
              action={<IconButton size="small" onClick={openFolderNew} sx={{ color: DMS_ACCENT }}><AddIcon fontSize="small" /></IconButton>}>
              <Stack spacing={0.6}>
                <ButtonBase onClick={() => setFolderId('')}
                  sx={{ width: '100%', p: 0.7, borderRadius: '9px', justifyContent: 'flex-start', textAlign: 'right', bgcolor: !folderId ? alpha(DMS_ACCENT, 0.08) : 'transparent', border: `1px solid ${!folderId ? alpha(DMS_ACCENT, 0.2) : 'transparent'}` }}>
                  <Stack direction="row" alignItems="center" spacing={0.6} sx={{ width: '100%' }}>
                    <FolderOpenOutlinedIcon sx={{ fontSize: 17, color: DMS_ACCENT }} />
                    <Typography sx={{ flex: 1, fontSize: 8.9, fontWeight: 800, color: INK }}>همه اسناد</Typography>
                    <Chip size="small" label={formatPersianNumber(activeDocuments.length)} sx={{ height: 18, fontSize: 7.5, bgcolor: SOFT_BG, color: MUTED }} />
                  </Stack>
                </ButtonBase>
                <Divider />
                {folders.length ? <FolderTree folders={folders} selected={folderId} onSelect={setFolderId}
                  onEdit={openFolderEdit} onDelete={setConfirmFolderDelete} /> : (
                  <Typography sx={{ fontSize: 8.6, color: MUTED, py: 1 }}>پوشه‌ای ساخته نشده است.</Typography>
                )}
              </Stack>
            </SurfaceCard>
            <StorageCard stats={stats} isLoading={statsQuery.isLoading} />
            <ActivityCard activities={activities} onOpen={openActivityTarget} />
          </Stack>
        </Grid>

        <Grid item xs={12} lg={9} sx={{ order: { xs: 1, lg: 2 } }}>
          <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
            <Grid item xs={6} md={3}><KpiTile icon={FolderOpenOutlinedIcon} label="کل اسناد فعال" value={formatPersianNumber(activeDocuments.length)} suffix="سند" color={DMS_ACCENT} hint={`${formatPersianNumber(archivedCount)} سند بایگانی`} /></Grid>
            <Grid item xs={6} md={3}><KpiTile icon={UploadFileOutlinedIcon} label="اسناد فعال" value={formatPersianNumber(activeCount)} suffix="سند" color="#0f766e" hint={`${formatPersianNumber(activeDocuments.length - activeCount)} پیش‌نویس`} /></Grid>
            <Grid item xs={6} md={3}><KpiTile icon={WarningAmberOutlinedIcon} label="نزدیک انقضا / منقضی" value={formatPersianNumber(expiringCount)} suffix="سند" color="#be123c" hint="نیازمند بررسی" /></Grid>
            <Grid item xs={6} md={3}><KpiTile icon={DownloadIcon} label="فضای بایگانی" value={formatBytes(stats.storage_bytes || 0)} color="#2563eb" size={16} hint={`${formatPersianNumber(stats.folders || folders.length)} پوشه`} /></Grid>
          </Grid>

          <Paper elevation={0} sx={{ p: 1.25, mb: 1.5, borderRadius: '16px', border: '1px solid #e5edf1' }}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
              <TextField size="small" placeholder="جست‌وجو در عنوان، برچسب، شماره مرجع یا نام فایل…"
                value={search} onChange={(event) => setSearch(event.target.value)}
                sx={{ minWidth: { xs: '100%', sm: 220 }, flex: 1 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
              <FormControl size="small" sx={{ minWidth: 135 }}>
                <InputLabel>وضعیت</InputLabel>
                <Select value={statusFilter} label="وضعیت" onChange={(event) => setStatusFilter(event.target.value)}>
                  <MenuItem value="all">همه</MenuItem>
                  {Object.entries(DOC_STATUS).map(([key, meta]) => <MenuItem key={key} value={key}>{meta.label}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 135 }}>
                <InputLabel>محرمانگی</InputLabel>
                <Select value={confidentialityFilter} label="محرمانگی" onChange={(event) => setConfidentialityFilter(event.target.value)}>
                  <MenuItem value="all">همه</MenuItem>
                  {Object.entries(CONFIDENTIALITY).map(([key, meta]) => <MenuItem key={key} value={key}>{meta.label}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 125 }}>
                <InputLabel>ترتیب</InputLabel>
                <Select value={sortBy} label="ترتیب" onChange={(event) => setSortBy(event.target.value)}>
                  <MenuItem value="newest">جدیدترین</MenuItem>
                  <MenuItem value="title">عنوان</MenuItem>
                  <MenuItem value="expiry">نزدیک‌ترین انقضا</MenuItem>
                  <MenuItem value="size">بیشترین حجم</MenuItem>
                </Select>
              </FormControl>
              <ToggleButtonGroup size="small" exclusive value={view} onChange={(_event, value) => value && setView(value)}>
                <ToggleButton value="cards" aria-label="نمای کارت" sx={{ px: 1 }}><Tooltip title="کارت"><ViewModuleIcon fontSize="small" /></Tooltip></ToggleButton>
                <ToggleButton value="table" aria-label="نمای جدول" sx={{ px: 1 }}><Tooltip title="جدول"><TableRowsIcon fontSize="small" /></Tooltip></ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Paper>

          {selectedFolder ? (
            <Alert severity="info" icon={<FolderOpenOutlinedIcon />} sx={{ mb: 1, borderRadius: '11px', py: 0.15 }}>
              <Stack direction="row" alignItems="center" spacing={0.7}>
                <Typography sx={{ flex: 1, fontSize: 9.2 }}>در حال نمایش اسناد پوشه «{selectedFolder.path || selectedFolder.name}»</Typography>
                <Button size="small" onClick={() => setFolderId('')} sx={{ fontSize: 8.5 }}>نمایش همه</Button>
              </Stack>
            </Alert>
          ) : null}

          {error ? <Alert severity="error" onClose={() => setError('')} sx={{ mb: 1, borderRadius: '11px' }}>{error}</Alert> : null}

          {!filtered.length ? (
            <Paper elevation={0} sx={{ p: 5, borderRadius: '16px', border: '1px dashed #dbe4ea', textAlign: 'center' }}>
              <FolderOpenOutlinedIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1 }} />
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }}>سندی با این مشخصات پیدا نشد.</Typography>
              <Typography sx={{ fontSize: 9, color: '#64748b', mt: 0.4 }}>پوشه، فیلترها یا عبارت جست‌وجو را تغییر دهید.</Typography>
              <Button variant="contained" startIcon={<UploadFileOutlinedIcon />} onClick={openNew} sx={{ mt: 1.5 }}>آپلود سند جدید</Button>
            </Paper>
          ) : view === 'cards' ? (
            <Grid container spacing={1.5}>
              {filtered.map((row) => (
                <Grid item xs={12} md={6} xl={4} key={row.id}>
                  <DocumentCard row={row} onView={setDetail} onEdit={openEdit} onDownload={(selected) => downloadDocument.mutate(selected)}
                    onArchive={(selected) => archive.mutate(selected)} onRestore={(selected) => restore.mutate(selected)}
                    onDelete={setConfirmDelete} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <DocumentTable rows={filtered} onView={setDetail} onEdit={openEdit} onDownload={(selected) => downloadDocument.mutate(selected)}
              onArchive={(selected) => archive.mutate(selected)} onRestore={(selected) => restore.mutate(selected)}
              onDelete={setConfirmDelete} />
          )}
        </Grid>
      </Grid>

      <DocumentDetailDrawer row={detail} activities={detailActivities} onClose={() => setDetail(null)}
        onEdit={openEdit} onArchive={(selected) => archive.mutate(selected)}
        onRestore={(selected) => restore.mutate(selected)} onDelete={setConfirmDelete}
        onRestoreVersion={(row, version) => restoreVersion.mutate({ row, version })} />

      <DocumentEditorDialog open={editorOpen} onClose={() => { setEditorOpen(false); setError(''); }}
        form={form} setForm={setForm} folderList={folders} error={error} setError={setError}
        saving={saveDocument.isPending} onSave={submit} />

      <FolderEditorDialog open={folderDialog} onClose={() => setFolderDialog(false)}
        form={folderForm} setForm={setFolderForm} folderList={folders} editing={folderEditing}
        error={folderError} setError={setFolderError} saving={saveFolder.isPending}
        onSave={() => saveFolder.mutate(folderForm)} />

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, fontSize: 14 }}>حذف قطعی سند</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ borderRadius: '10px' }}>
            سند «{confirmDelete?.title || (confirmDelete ? `#${confirmDelete.id}` : 'انتخاب‌شده')}» و همه نسخه‌های آن برای همیشه حذف شود؟ برای نگهداری از دکمه «بایگانی» استفاده کنید.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>انصراف</Button>
          <Button color="error" variant="contained" disabled={removeDocument.isPending} onClick={() => removeDocument.mutate(confirmDelete)}>
            {removeDocument.isPending ? <CircularProgress size={18} color="inherit" /> : 'حذف قطعی'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmFolderDelete)} onClose={() => setConfirmFolderDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, fontSize: 14 }}>حذف پوشه</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ borderRadius: '10px' }}>
            پوشه «{confirmFolderDelete?.name || 'انتخاب‌شده'}» حذف شود؟ اسناد داخل آن بدون پوشه خواهند شد.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmFolderDelete(null)}>انصراف</Button>
          <Button color="error" variant="contained" disabled={removeFolder.isPending} onClick={() => removeFolder.mutate(confirmFolderDelete)}>حذف</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3400} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.includes('نشد') ? 'error' : 'success'} onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
};

export default DocumentManagementPage;
