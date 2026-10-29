import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import useAuth from '../core/hooks/useAuth';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControl, IconButton, InputLabel, MenuItem,
  Paper, Select, Snackbar, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import SyncIcon from '@mui/icons-material/Sync';
import RestoreOutlinedIcon from '@mui/icons-material/RestoreOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import PageHeader from '../core/components/ui/PageHeader';
import { MUTED } from './accounting/AccountingDashboardUI';
import {
  CONFIDENTIALITY, DOC_STATUS, DOCUMENT_TYPE,
  DocumentDetailDrawer, DocumentEditorDialog, FolderEditorDialog, WORKFLOW_STATUS,
} from './contracts/DocumentManagementUI';
import { buildPersonnelRows, normalizeText } from './contracts/personnelDocuments';
import {
  documentMatchesModuleText, findDocumentModule, findModuleForFolder,
  folderDescendants, moduleFolderIds, scopedLibraryFolders,
} from '../core/config/documentLibraryModules';
import {
  ModulePager, ModuleTable, ModuleToolbar,
  useModuleTableState, useModuleTheme, useRowHeight,
} from './contracts/contractModuleUi';

const EMPTY_DOCUMENT = {
  id: null, title: '', folder: '', description: '', tags: '', reference_number: '',
  document_type: 'other', owner_department: '', issuing_authority: '',
  related_entity_type: '', related_entity_id: '', related_entity_label: '',
  issue_date: '', effective_date: '', review_date: '', expiry_date: '', retention_until: '',
  confidentiality: 'internal', status: 'draft', workflow_status: 'draft',
  is_locked: false, file: null, file_name: '', versions: [],
};
const EMPTY_FOLDER = { id: null, name: '', parent: '', color: '#0f766e', description: '' };

const PERSONNEL_WORDS = ['پرسنل', 'کارکنان', 'employees', 'employee', 'personnel', 'منابعانسانی'];
const isPersonnelFolder = (folder) => {
  if (!folder) return false;
  const text = normalizeText(`${folder.name || ''} ${folder.path || ''} ${folder.code || ''}`);
  return PERSONNEL_WORDS.some((word) => text.includes(normalizeText(word)));
};

const fetchAllEmployees = async () => {
  const rows = [];
  let page = 1;
  let hasNext = true;
  while (hasNext && page <= 20) {
    const response = await axiosInstance.get('/employees/', { params: { page_size: 100, page } });
    const payload = response.data;
    if (Array.isArray(payload)) return payload;
    rows.push(...(payload.results || []));
    hasNext = Boolean(payload.next);
    page += 1;
  }
  return rows;
};


const DocumentManagementPage = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissions = user?.permissions || {};
  const canManage = Boolean(user?.is_superuser || permissions.can_manage_documents);
  const canApprove = Boolean(user?.is_superuser || permissions.can_approve_documents);
  const canPublish = Boolean(user?.is_superuser || permissions.can_publish_documents);
  const canDelete = Boolean(user?.is_superuser || permissions.can_delete_documents);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [folderId, setFolderId] = useState(() => searchParams.get('folder') || '');
  const [moduleFilter, setModuleFilter] = useState(() => searchParams.get('module') || '');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'all');
  const [confidentialityFilter, setConfidentialityFilter] = useState(() => searchParams.get('confidentiality') || 'all');
  const [typeFilter, setTypeFilter] = useState(() => searchParams.get('type') || 'all');
  const [workflowFilter, setWorkflowFilter] = useState(() => searchParams.get('workflow') || 'all');
  const [reviewFilter, setReviewFilter] = useState(() => searchParams.get('review') || '');
  const [scope, setScope] = useState(() => searchParams.get('scope') || 'all');
  const [sortBy, setSortBy] = useState('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const [autoSynced, setAutoSynced] = useState(false);
  const [supersedeRow, setSupersedeRow] = useState(null);
  const [replacementId, setReplacementId] = useState('');
  const [rejectRow, setRejectRow] = useState(null);
  const [rejectNote, setRejectNote] = useState('');

  const searchParamsKey = searchParams.toString();
  useEffect(() => {
    const params = new URLSearchParams(searchParamsKey);
    setStatusFilter(params.get('status') || 'all');
    setConfidentialityFilter(params.get('confidentiality') || 'all');
    setTypeFilter(params.get('type') || 'all');
    setWorkflowFilter(params.get('workflow') || 'all');
    setReviewFilter(params.get('review') || '');
    setScope(params.get('scope') || 'all');
    setSearch(params.get('q') || '');
    setFolderId(params.get('folder') || '');
    setModuleFilter(params.get('module') || '');
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

  const detailActivitiesQuery = useQuery({
    queryKey: ['dms-detail-activities', detail?.id],
    queryFn: () => axiosInstance.get('/document-management/activities/', { params: { document: detail.id, page_size: 50 } }).then((response) => response.data),
    enabled: Boolean(detail?.id),
  });
  const detailActivities = Array.isArray(detailActivitiesQuery.data) ? detailActivitiesQuery.data : detailActivitiesQuery.data?.results || [];

  const selectedFolder = folders.find((folder) => String(folder.id) === String(folderId));
  const folderIds = useMemo(() => {
    if (!folderId) return null;
    return folderDescendants(folders, [folderId]);
  }, [folderId, folders]);

  const scopedLibrary = useMemo(
    () => scopedLibraryFolders(folders, { moduleKey: moduleFilter, folderId }),
    [folders, moduleFilter, folderId],
  );
  const activeModule = scopedLibrary.module
    || findModuleForFolder(selectedFolder, folders)
    || (moduleFilter ? findDocumentModule(moduleFilter) : null);
  const activeModuleKey = moduleFilter || activeModule?.key || '';
  const scopedModuleIds = useMemo(
    () => (activeModuleKey ? moduleFolderIds(folders, activeModuleKey) : null),
    [activeModuleKey, folders],
  );
  const scopedFolders = scopedLibrary.folders;

  const matchesDocumentFilters = (row) => {
    const scopeIds = folderIds || scopedModuleIds;
    if (scopeIds && !scopeIds.has(String(row.folder))) return false;
    if (!scopeIds && activeModuleKey && !documentMatchesModuleText(row, activeModuleKey)) return false;
    if (statusFilter === 'all') {
      if (workflowFilter === 'all' && row.status === 'archived') return false;
    } else if (row.status !== statusFilter) return false;
    if (typeFilter !== 'all' && row.document_type !== typeFilter) return false;
    if (workflowFilter !== 'all' && row.workflow_status !== workflowFilter) return false;
    if (confidentialityFilter !== 'all' && row.confidentiality !== confidentialityFilter) return false;
    if (scope === 'mine' && String(row.created_by) !== String(user?.id)) return false;
    if (scope === 'expiring' && !(row.days_until_expiry != null && row.days_until_expiry >= 0 && row.days_until_expiry <= 30)) return false;
    if (scope === 'expired' && !row.is_expired) return false;
    if (reviewFilter === 'due') {
      if (!row.review_date || String(row.review_date) > new Date().toISOString().slice(0, 10)) return false;
    }
    if (reviewFilter === 'soon') {
      const today = new Date().toISOString().slice(0, 10);
      const limit = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      if (!row.review_date || String(row.review_date) < today || String(row.review_date) > limit) return false;
    }
    return true;
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = documents.filter((row) => {
      if (!matchesDocumentFilters(row)) return false;
      if (!query) return true;
      return [row.title, row.description, row.tags, row.reference_number, row.folder_path, row.file_name]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
    result = [...result].sort((a, b) => {
      if (sortBy === 'title') return String(a.title || '').localeCompare(String(b.title || ''), 'fa');
      if (sortBy === 'reference') return String(a.reference_number || '').localeCompare(String(b.reference_number || ''), 'fa');
      if (sortBy === 'updated') return String(b.updated_at || '').localeCompare(String(a.updated_at || ''));
      if (sortBy === 'expiry') return String(a.expiry_date || '9999').localeCompare(String(b.expiry_date || '9999'));
      if (sortBy === 'size') return Number(b.file_size || 0) - Number(a.file_size || 0);
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
    return result;
  }, [documents, folderIds, scopedModuleIds, activeModuleKey, statusFilter, typeFilter, workflowFilter, reviewFilter, confidentialityFilter, scope, user?.id, search, sortBy]);

  const personnelDocuments = useMemo(
    () => documents.filter(matchesDocumentFilters),
    [documents, folderIds, scopedModuleIds, activeModuleKey, statusFilter, typeFilter, workflowFilter, reviewFilter, confidentialityFilter, scope, user?.id],
  );

  const personnelMode = activeModuleKey === 'employees'
    || findModuleForFolder(selectedFolder, folders)?.key === 'employees'
    || isPersonnelFolder(selectedFolder);
  const personnelEmployeesQuery = useQuery({
    queryKey: ['dms-personnel-employees'],
    queryFn: fetchAllEmployees,
    enabled: personnelMode,
    staleTime: 5 * 60 * 1000,
  });
  const personnelEmployees = Array.isArray(personnelEmployeesQuery.data) ? personnelEmployeesQuery.data : [];
  const personnel = useMemo(
    () => (personnelMode ? buildPersonnelRows(personnelEmployees, personnelDocuments, search) : { rows: [], unassigned: [] }),
    [personnelMode, personnelEmployees, personnelDocuments, search],
  );
  /* نمای پرسنلی هم جدولی است: هر ردیف یک مدرک + نام و کد پرسنلی */
  const personnelRows = useMemo(() => (personnelMode
    ? [
      ...personnel.rows.flatMap((person) => person.documents.map((doc) => ({
        ...doc,
        employee_name: person.employee.full_name || '',
        employee_code: person.employee.employee_id || '',
      }))),
      ...(personnel.unassigned || []).map((doc) => ({
        ...doc, employee_name: 'بدون پرسنل قابل تطبیق', employee_code: '',
      })),
    ]
    : []), [personnelMode, personnel.rows, personnel.unassigned]);

  const replacementOptions = supersedeRow
    ? documents.filter((row) => String(row.id) !== String(supersedeRow.id) && ['approved', 'published'].includes(row.workflow_status))
    : [];
  const activeModuleMeta = findModuleForFolder(selectedFolder, folders)
    || scopedLibrary.module
    || (moduleFilter ? findDocumentModule(moduleFilter) : null);
  const viewMeta = personnelMode
    ? {
      title: `کتابخانه اسناد · ${activeModuleMeta?.label || 'پرسنل'}`,
      subtitle: 'مدارک پرسنلی در یک جدول استاندارد؛ هر ردیف یک مدرک با نام و کد پرسنلی',
    }
    : activeModuleMeta
      ? {
        title: `کتابخانه اسناد · ${activeModuleMeta.label}`,
        subtitle: 'فایل‌های همین ماژول در جدول استاندارد کتابخانه',
      }
      : scope === 'mine'
    ? { title: 'اسناد من', subtitle: 'اسنادی که شما ایجاد کرده‌اید' }
    : scope === 'expiring'
      ? { title: 'اسناد نزدیک انقضا', subtitle: 'اسناد دارای تاریخ انقضا در ۳۰ روز آینده' }
      : scope === 'expired'
        ? { title: 'اسناد منقضی', subtitle: 'اسنادی که تاریخ انقضای آن‌ها گذشته است' }
        : reviewFilter === 'due'
          ? { title: 'بازنگری‌های سررسیدشده', subtitle: 'اسناد کنترل‌شده‌ای که تاریخ بازنگری آن‌ها رسیده است' }
          : statusFilter === 'archived'
          ? { title: 'بایگانی اسناد', subtitle: 'اسناد بایگانی‌شده و قابل بازگردانی' }
          : statusFilter === 'draft'
            ? { title: 'پیش‌نویس‌های اسناد', subtitle: 'اسناد در حال تکمیل و پیش‌نویس' }
            : workflowFilter !== 'all'
              ? { title: WORKFLOW_STATUS[workflowFilter]?.label || 'گردش‌کار اسناد', subtitle: 'اسناد در این مرحله از چرخهٔ کنترل سند' }
              : typeFilter !== 'all'
                ? { title: DOCUMENT_TYPE[typeFilter]?.label || 'اسناد سازمانی', subtitle: 'اسناد سازمانی طبقه‌بندی‌شده در کتابخانهٔ مرکزی' }
                : confidentialityFilter !== 'all'
                  ? { title: 'اسناد محرمانه', subtitle: 'اسناد با سطح دسترسی محدود' }
                  : { title: 'کتابخانه اسناد', subtitle: 'کتابخانه مرکزی اسناد با نسخه‌بندی، متادیتا و تاریخچه — نمای جدولی' };

  /* ---- جدول استاندارد استودیوتم ---- */
  const moduleTheme = useModuleTheme();
  const tableRows = personnelMode ? personnelRows : filtered;
  const pageSize = moduleTheme.tableTheme.rowsPerPage;
  const { page, setPage, totalPages, pageNumbers } = useModuleTableState(
    tableRows.length, pageSize, [
    search, folderId, moduleFilter, statusFilter, confidentialityFilter,
    typeFilter, workflowFilter, reviewFilter, scope, sortBy, personnelMode, pageSize,
  ],
  );
  const pagedRows = useMemo(
    () => tableRows.slice(page * pageSize, (page + 1) * pageSize),
    [tableRows, page, pageSize],
  );
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(moduleTheme.tableTheme, pagedRows.length);

  const filterOptions = (meta) => [
    { value: 'all', label: 'همه' },
    ...Object.entries(meta).map(([key, item]) => ({ value: key, label: item.label || key })),
  ];
  const activeChips = [
    statusFilter !== 'all' ? { key: 'status', label: `وضعیت: ${DOC_STATUS[statusFilter]?.label || statusFilter}`, clear: () => setStatusFilter('all') } : null,
    confidentialityFilter !== 'all' ? { key: 'confidentiality', label: `محرمانگی: ${CONFIDENTIALITY[confidentialityFilter]?.label || confidentialityFilter}`, clear: () => setConfidentialityFilter('all') } : null,
    typeFilter !== 'all' ? { key: 'type', label: `نوع: ${DOCUMENT_TYPE[typeFilter]?.label || typeFilter}`, clear: () => setTypeFilter('all') } : null,
    workflowFilter !== 'all' ? { key: 'workflow', label: `گردش‌کار: ${WORKFLOW_STATUS[workflowFilter]?.label || workflowFilter}`, clear: () => setWorkflowFilter('all') } : null,
  ].filter(Boolean);

  const totalSize = tableRows.reduce((sum, row) => sum + Number(row.file_size || 0), 0);
  const totalVersions = tableRows.reduce((sum, row) => sum + Number(row.version_count || 1), 0);
  const expiringSoon = tableRows.filter((row) => row.days_until_expiry != null
    && row.days_until_expiry >= 0 && row.days_until_expiry <= 30).length;
  const dateCell = (value) => (value ? toJalali(String(value).slice(0, 10)) : '—');
  const sizeCell = (value) => {
    const bytes = Number(value) || 0;
    if (!bytes) return '—';
    if (bytes >= 1024 * 1024) return `${formatPersianNumber((bytes / 1024 / 1024).toFixed(1))} MB`;
    return `${formatPersianNumber(Math.max(1, Math.round(bytes / 1024)))} KB`;
  };

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['dms-folders'] });
    qc.invalidateQueries({ queryKey: ['dms-menu-folders'] });
    qc.invalidateQueries({ queryKey: ['dms-documents'] });
    qc.invalidateQueries({ queryKey: ['dms-stats'] });
    qc.invalidateQueries({ queryKey: ['dms-activities'] });
    qc.invalidateQueries({ queryKey: ['dms-detail-activities'] });
  };

  const syncStorage = useMutation({
    mutationFn: () => axiosInstance.post('/document-management/sync-storage/'),
    onSuccess: (response) => {
      const count = response.data?.created || 0;
      invalidateAll();
      setToast(count
        ? `${formatPersianNumber(count)} فایل موجود در بایگانی ماژول‌ها ایندکس شد`
        : 'فایل جدیدی برای ایندکس پیدا نشد');
    },
    onError: () => setToast('همگام‌سازی بایگانی انجام نشد'),
  });

  // بار اول، فایل‌های موجود در بایگانی ماژول‌ها را بدون نیاز به کلیک ایندکس کن.
  useEffect(() => {
    if (!autoSynced && canManage && statsQuery.isSuccess && (stats.total || 0) === 0) {
      setAutoSynced(true);
      syncStorage.mutate();
    }
  }, [autoSynced, canManage, statsQuery.isSuccess, stats.total, syncStorage]);

  // اگر بک‌اند در stats فایل‌های موجود را ایندکس کرد، کتابخانه را دوباره بارگذاری کن.
  useEffect(() => {
    if ((stats.auto_indexed || 0) > 0) {
      qc.invalidateQueries({ queryKey: ['dms-documents'] });
      qc.invalidateQueries({ queryKey: ['dms-folders'] });
      qc.invalidateQueries({ queryKey: ['dms-menu-folders'] });
      qc.invalidateQueries({ queryKey: ['dms-activities'] });
    }
  }, [stats.auto_indexed, qc]);

  const saveDocument = useMutation({
    mutationFn: (payload) => {
      const body = new FormData();
      body.append('title', payload.title || '');
      if (payload.folder) body.append('folder', payload.folder);
      body.append('description', payload.description || '');
      body.append('tags', payload.tags || '');
      body.append('reference_number', payload.reference_number || '');
      body.append('document_type', payload.document_type || 'other');
      body.append('owner_department', payload.owner_department || '');
      body.append('issuing_authority', payload.issuing_authority || '');
      body.append('related_entity_type', payload.related_entity_type || '');
      body.append('related_entity_id', payload.related_entity_id || '');
      body.append('related_entity_label', payload.related_entity_label || '');
      body.append('confidentiality', payload.confidentiality || 'internal');
      body.append('is_locked', payload.is_locked ? 'true' : 'false');
      if (payload.issue_date) body.append('issue_date', payload.issue_date);
      if (payload.effective_date) body.append('effective_date', payload.effective_date);
      if (payload.review_date) body.append('review_date', payload.review_date);
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
  const workflow = useMutation({
    mutationFn: ({ row, status, replacement_id, note }) => axiosInstance.post(
      `/document-management/documents/${row.id}/workflow/`,
      { status, replacement_id, note },
    ),
    onSuccess: (response) => {
      invalidateAll();
      setDetail(response.data);
      setSupersedeRow(null);
      setReplacementId('');
      setRejectRow(null);
      setRejectNote('');
      setToast('وضعیت گردش‌کار سند به‌روزرسانی شد');
    },
    onError: (event) => {
      const data = event.response?.data;
      const message = typeof data === 'string' ? data : data?.status?.[0] || data?.detail || 'تغییر وضعیت گردش‌کار انجام نشد';
      setToast(message);
    },
  });
  const requestWorkflow = (row, status) => {
    if (status === 'superseded') {
      setSupersedeRow(row);
      setReplacementId('');
      return;
    }
    if (status === 'rejected') {
      setRejectRow(row);
      setRejectNote('');
      return;
    }
    workflow.mutate({ row, status });
  };
  const downloadDocument = useMutation({
    mutationFn: async (row) => {
      const response = await axiosInstance.get(
        `/document-management/documents/${row.id}/content/`,
        { responseType: 'blob' },
      );
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = row.file_name || 'document';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
      return response.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dms-activities'] }); qc.invalidateQueries({ queryKey: ['dms-detail-activities'] }); setToast('دانلود سند ثبت شد'); },
    onError: () => setToast('دانلود سند انجام نشد'),
  });
  const previewDocument = useMutation({
    mutationFn: async (row) => {
      const response = await axiosInstance.get(
        `/document-management/documents/${row.id}/content/`,
        { responseType: 'blob' },
      );
      const blobUrl = URL.createObjectURL(response.data);
      const target = window.open(blobUrl, '_blank');
      if (!target) {
        URL.revokeObjectURL(blobUrl);
        throw new Error('مرورگر اجازه باز کردن پنجره پیش‌نمایش را نداد.');
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      return response.data;
    },
    onError: () => setToast('پیش‌نمایش سند انجام نشد'),
  });
  const downloadVersion = useMutation({
    mutationFn: async ({ row, version }) => {
      const response = await axiosInstance.get(
        `/document-management/documents/${row.id}/content/`,
        { params: { version: version.id }, responseType: 'blob' },
      );
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = version.original_name || row.file_name || 'document';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
      return response.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dms-detail-activities'] }); setToast('نسخه انتخاب‌شده دانلود شد'); },
    onError: () => setToast('دانلود نسخه انجام نشد'),
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
      qc.invalidateQueries({ queryKey: ['dms-menu-folders'] });
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
    if (!canManage) { setToast('برای آپلود سند به مجوز مدیریت اسناد نیاز دارید.'); return; }
    setForm({ ...EMPTY_DOCUMENT, folder: folderId || '', issue_date: new Date().toISOString().slice(0, 10) });
    setError('');
    setEditorOpen(true);
  };
  const [uploadRequested, setUploadRequested] = useState(false);
  useEffect(() => {
    if (!uploadRequested && canManage && searchParams.get('action') === 'upload') {
      setUploadRequested(true);
      openNew();
    }
  }, [uploadRequested, canManage, searchParamsKey]);
  const openEdit = (row) => {
    if (row.is_editable_in_workflow === false) {
      setToast('این سند منتشرشده است؛ برای ویرایش ابتدا از گردش‌کار «شروع بازنگری» را بزنید.');
      return;
    }
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
  const clearScope = () => { setFolderId(''); setModuleFilter(''); navigate('/document-management/library'); };
  const openFolderEdit = (folder) => {
    setFolderEditing(true);
    setFolderForm({ id: folder.id, name: folder.name || '', parent: folder.parent || '', color: folder.color || '#0f766e', description: folder.description || '' });
    setFolderError('');
    setFolderDialog(true);
  };

  const exportCsv = () => {
    const headers = ['عنوان', 'نوع سند', 'پوشه', 'محرمانگی', 'گردش‌کار', 'نسخه', 'حجم', 'تاریخ صدور', 'تاریخ انقضا', 'برچسب‌ها'];
    const body = filtered.map((row) => [
      row.title, DOCUMENT_TYPE[row.document_type]?.label || '', row.folder_path || '',
      row.confidentiality_display || '', WORKFLOW_STATUS[row.workflow_status]?.label || row.workflow_status_display || '',
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

  if (documentsQuery.isLoading || foldersQuery.isLoading) {
    return <Box sx={{ py: 9, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={personnelMode ? <PeopleAltOutlinedIcon /> : <FolderOpenOutlinedIcon />}
        title={viewMeta.title}
        subtitle={viewMeta.subtitle}
        badge={<Typography sx={{ fontSize: 11.5, fontWeight: 800, color: MUTED }}>
          {personnelMode
            ? `${formatPersianNumber(personnelRows.length)} مدرک · ${formatPersianNumber(personnel.rows.length)} پرسنل`
            : `${formatPersianNumber(filtered.length)} سند`}
        </Typography>}
        actions={(
          <>
            <Tooltip title="به‌روزرسانی"><span><Button variant="outlined" disabled={documentsQuery.isFetching} onClick={() => { documentsQuery.refetch(); statsQuery.refetch(); foldersQuery.refetch(); }} sx={{ minWidth: 40, px: 1 }}><RefreshIcon fontSize="small" /></Button></span></Tooltip>
            <Button variant="outlined" startIcon={<SyncIcon />} disabled={!canManage || syncStorage.isPending} onClick={() => syncStorage.mutate()}>
              {syncStorage.isPending ? 'در حال همگام‌سازی…' : 'همگام‌سازی بایگانی'}
            </Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv}>خروجی</Button>
            <Button variant="outlined" startIcon={<CreateNewFolderOutlinedIcon />} disabled={!canManage} onClick={openFolderNew}>پوشه جدید</Button>
            <Button variant="contained" startIcon={<UploadFileOutlinedIcon />} disabled={!canManage} onClick={openNew}>آپلود سند</Button>
          </>
        )}
      />

      <ModuleToolbar
        theme={moduleTheme}
        search={search}
        onSearch={setSearch}
        searchPlaceholder={personnelMode
          ? 'جست‌وجوی نام، کد پرسنلی، عنوان مدرک یا توضیحات…'
          : 'جست‌وجو در عنوان، برچسب، شماره مرجع یا نام فایل…'}
        sort={sortBy}
        sortOptions={[
          { value: 'newest', label: 'جدیدترین' },
          { value: 'updated', label: 'آخرین ویرایش' },
          { value: 'title', label: 'عنوان' },
          { value: 'reference', label: 'شماره مرجع' },
          { value: 'expiry', label: 'نزدیک‌ترین انقضا' },
          { value: 'size', label: 'بیشترین حجم' },
        ]}
        onSort={setSortBy}
        filters={[
          { label: 'وضعیت', value: statusFilter, options: filterOptions(DOC_STATUS), onChange: setStatusFilter },
          { label: 'محرمانگی', value: confidentialityFilter, options: filterOptions(CONFIDENTIALITY), onChange: setConfidentialityFilter },
          { label: 'نوع سند', value: typeFilter, options: filterOptions(DOCUMENT_TYPE), onChange: setTypeFilter },
          { label: 'گردش‌کار', value: workflowFilter, options: filterOptions(WORKFLOW_STATUS), onChange: setWorkflowFilter },
        ]}
        activeChips={activeChips}
        activeFilterCount={activeChips.length}
        onReset={() => {
          setSearch('');
          setStatusFilter('all');
          setConfidentialityFilter('all');
          setTypeFilter('all');
          setWorkflowFilter('all');
          setSortBy('newest');
        }}
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
      />

      {error ? (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 1.25, borderRadius: '12px' }}>{error}</Alert>
      ) : null}

      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)',
        overflow: 'hidden',
        px: `${moduleTheme.cardPadX}px`, py: `${moduleTheme.cardPadY}px`,
        border: '1px solid', borderColor: moduleTheme.cardBorderColor,
        bgcolor: 'background.paper', boxShadow: 'none',
      }}>
        <ModuleTable
          tableTheme={moduleTheme.tableTheme}
          ariaLabel="فهرست اسناد کتابخانه"
          containerRef={tableRef}
          tableHeight={tableHeight}
          rowHeight={rowHeight}
          dimmed={documentsQuery.isFetching}
          rows={pagedRows}
          rowKey={(row) => row.id}
          onRowClick={(row) => setDetail(row)}
          emptyText="سندی با این مشخصات پیدا نشد؛ فیلترها یا عبارت جست‌وجو را تغییر دهید."
          columns={[
            {
              key: 'row',
              label: 'ردیف',
              width: '4%',
              align: 'center',
              render: (_row, index) => (
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: MUTED }}>
                  {toPersianDigits(page * pageSize + index + 1)}
                </Typography>
              ),
            },
            {
              key: 'title',
              label: 'عنوان سند',
              width: '23%',
              render: (row) => (
                <Typography noWrap title={`${row.title || ''}${row.reference_number ? ` · ${row.reference_number}` : ''}`}
                  sx={{ fontSize: 12, fontWeight: 800 }}>
                  {row.title || '—'}
                </Typography>
              ),
            },
            {
              key: 'type',
              label: 'نوع',
              width: '9%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>
                  {DOCUMENT_TYPE[row.document_type]?.label || '—'}
                </Typography>
              ),
            },
            personnelMode ? {
              key: 'employee',
              label: 'پرسنل',
              width: '13%',
              render: (row) => (
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap title={row.employee_name} sx={{ fontSize: 11.5, fontWeight: 800 }}>
                    {row.employee_name || '—'}
                  </Typography>
                  {row.employee_code ? (
                    <Typography noWrap sx={{ fontSize: 10, color: MUTED }}>
                      {`کد ${toPersianDigits(row.employee_code)}`}
                    </Typography>
                  ) : null}
                </Box>
              ),
            } : {
              key: 'folder',
              label: 'پوشه',
              width: '13%',
              render: (row) => (
                <Typography noWrap title={row.folder_path} sx={{ fontSize: 11, color: 'text.secondary' }}>
                  {row.folder_path || 'بدون پوشه'}
                </Typography>
              ),
            },
            {
              key: 'confidentiality',
              label: 'محرمانگی',
              width: '9%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>
                  {CONFIDENTIALITY[row.confidentiality]?.label || row.confidentiality_display || '—'}
                </Typography>
              ),
            },
            {
              key: 'workflow',
              label: 'گردش‌کار',
              width: '9%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{
                  fontSize: 11, fontWeight: 800,
                  color: WORKFLOW_STATUS[row.workflow_status]?.color || 'text.primary',
                }}>
                  {WORKFLOW_STATUS[row.workflow_status]?.label || row.workflow_status_display || '—'}
                </Typography>
              ),
            },
            {
              key: 'version',
              label: 'نسخه',
              width: '6%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 11, fontWeight: 700 }}>
                  {toPersianDigits(row.version_count || 1)}
                </Typography>
              ),
            },
            {
              key: 'size',
              label: 'حجم',
              width: '7%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary' }}>{sizeCell(row.file_size)}</Typography>
              ),
            },
            {
              key: 'expiry',
              label: 'انقضا',
              width: '9%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{
                  fontSize: 11,
                  fontWeight: row.is_expired ? 900 : 600,
                  color: row.is_expired ? '#be123c' : 'text.primary',
                }}>
                  {dateCell(row.expiry_date)}
                </Typography>
              ),
            },
            {
              key: 'actions',
              label: 'عملیات',
              width: '11%',
              align: 'center',
              render: (row) => (
                <Stack direction="row" spacing={0.1} alignItems="center" justifyContent="center"
                  onClick={(event) => event.stopPropagation()}>
                  <Tooltip title="جزئیات و نسخه‌ها">
                    <IconButton size="small" aria-label="جزئیات سند" onClick={() => setDetail(row)}>
                      <VisibilityOutlinedIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                  {row.status === 'archived' ? (
                    <Tooltip title="بازگردانی از بایگانی">
                      <IconButton size="small" aria-label="بازگردانی سند" color="success"
                        disabled={!canManage} onClick={() => restore.mutate(row)}>
                        <RestoreOutlinedIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="ویرایش سند">
                      <IconButton size="small" aria-label="ویرایش سند" disabled={!canManage}
                        onClick={() => openEdit(row)}>
                        <EditOutlinedIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="دانلود">
                    <IconButton size="small" aria-label="دانلود سند" onClick={() => downloadDocument.mutate(row)}>
                      <DownloadIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="حذف">
                    <IconButton size="small" aria-label="حذف سند" color="error"
                      disabled={!canDelete} onClick={() => setConfirmDelete(row)}>
                      <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ),
            },
          ]}
        />
        <ModulePager
          tableTheme={moduleTheme.tableTheme}
          page={page}
          onPage={setPage}
          totalPages={totalPages}
          pageNumbers={pageNumbers}
          total={tableRows.length}
          pageSize={pageSize}
          unit="سند"
        />
        <Stack direction="row" spacing={2.5} useFlexGap flexWrap="wrap"
          sx={{ pt: 1.25, mt: 1.25, borderTop: '1px dashed', borderColor: 'divider' }}>
          {[
            ['اسناد', formatPersianNumber(tableRows.length)],
            ['نسخه‌ها', formatPersianNumber(totalVersions)],
            ['حجم کل', sizeCell(totalSize)],
            ['انقضا تا ۳۰ روز', formatPersianNumber(expiringSoon)],
          ].map(([label, value]) => (
            <Box key={label}>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>{label}</Typography>
              <Typography sx={{ fontSize: 11.5, fontWeight: 900, color: 'text.primary' }}>{value}</Typography>
            </Box>
          ))}
        </Stack>
      </Paper>

      <DocumentDetailDrawer row={detail} activities={detailActivities} onClose={() => setDetail(null)}
        onEdit={openEdit} onArchive={(selected) => archive.mutate(selected)}
        onRestore={(selected) => restore.mutate(selected)} onDelete={setConfirmDelete}
        onWorkflow={requestWorkflow}
        canManage={canManage} canApprove={canApprove} canPublish={canPublish} canDelete={canDelete}
        onPreview={(row) => previewDocument.mutate(row)}
        onVersionDownload={(row, version) => downloadVersion.mutate({ row, version })}
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

      <Dialog open={Boolean(rejectRow)} onClose={() => setRejectRow(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, fontSize: 14 }}>رد / بازگشت سند</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 12, color: MUTED, mb: 1.2 }}>دلیل بازگشت سند «{rejectRow?.title}» را ثبت کنید.</Typography>
          <TextField size="small" fullWidth multiline rows={3} label="دلیل بازنگری *" value={rejectNote}
            onChange={(event) => setRejectNote(event.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectRow(null)}>انصراف</Button>
          <Button color="error" variant="contained" disabled={!rejectNote.trim() || workflow.isPending}
            onClick={() => workflow.mutate({ row: rejectRow, status: 'rejected', note: rejectNote.trim() })}>ثبت بازگشت</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(supersedeRow)} onClose={() => { setSupersedeRow(null); setReplacementId(''); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, fontSize: 14 }}>ثبت جایگزینی سند</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 12, color: MUTED, mb: 1.2 }}>
            سند «{supersedeRow?.title}» جایگزین‌شده علامت می‌خورد و سند جدید به‌عنوان نسخهٔ لازم‌الاجرا معرفی می‌شود.
          </Typography>
          <FormControl size="small" fullWidth>
            <InputLabel>سند جایگزین</InputLabel>
            <Select value={replacementId} label="سند جایگزین" onChange={(event) => setReplacementId(event.target.value)}>
              {replacementOptions.map((row) => <MenuItem key={row.id} value={row.id}>{row.title} · {row.reference_number || `#${row.id}`}</MenuItem>)}
            </Select>
          </FormControl>
          {!replacementOptions.length ? <Alert severity="warning" sx={{ mt: 1.2, borderRadius: '10px' }}>سند تأییدشده یا منتشرشدهٔ دیگری برای جایگزینی وجود ندارد.</Alert> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupersedeRow(null)}>انصراف</Button>
          <Button variant="contained" disabled={!replacementId || workflow.isPending}
            onClick={() => workflow.mutate({ row: supersedeRow, status: 'superseded', replacement_id: replacementId })}>
            ثبت جایگزینی
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3400} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.includes('نشد') ? 'error' : 'success'} onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
};

export default DocumentManagementPage;