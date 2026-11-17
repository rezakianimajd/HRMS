import React, { useMemo, useState } from 'react';
import {
  Alert, Box, ButtonBase, Chip, CircularProgress, IconButton, InputAdornment,
  Paper, TextField, Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import axiosInstance from '../../core/api/axiosConfig';
import { folderDescendants, moduleRootFolders } from '../../core/config/documentLibraryModules';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';
import {
  confidentialityMeta, documentTypeMeta, fileMeta,
} from '../contracts/DocumentManagementUI';

const ACCENT = '#2563eb';

const folderCountLabel = (folder) => {
  const docs = Number(folder?.documents_count) || 0;
  const children = Number(folder?.children_count) || 0;
  return [
    docs ? `${formatPersianNumber(docs)} سند` : '',
    children ? `${formatPersianNumber(children)} زیرپوشه` : '',
  ].filter(Boolean).join(' · ') || 'خالی';
};

const sortedFolders = (rows) => [...rows].sort(
  (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)
    || String(a.name || '').localeCompare(String(b.name || ''), 'fa'),
);

const FolderCard = ({ folder, onSelect, accent }) => (
  <ButtonBase
    onClick={() => onSelect(folder)}
    sx={{ textAlign: 'right', borderRadius: '14px', display: 'block', width: '100%' }}
  >
    <Paper elevation={0} sx={{
      p: 1.35,
      height: '100%',
      borderRadius: 'var(--hrms-radius-large, 14px)',
      border: 'var(--hrms-border-card, 1px solid #e8edf4)',
      bgcolor: 'var(--hrms-region-card-bg, #ffffff)',
      boxShadow: 'var(--hrms-shadow-card, none)',
      transition: 'border-color 0.16s ease, transform 0.16s ease',
      '&:hover': { borderColor: alpha(accent, 0.38), transform: 'translateY(-1px)' },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.1 }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: '11px', flexShrink: 0,
          display: 'grid', placeItems: 'center',
          color: folder.color || accent,
          bgcolor: alpha(folder.color || accent, 0.1),
        }}>
          {Number(folder.children_count) ? (
            <FolderOpenOutlinedIcon sx={{ fontSize: 21 }} />
          ) : (
            <FolderOutlinedIcon sx={{ fontSize: 21 }} />
          )}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 900 }}>{folder.name}</Typography>
          <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.25 }}>
            {folderCountLabel(folder)}
          </Typography>
        </Box>
      </Box>
      <Box sx={{
        mt: 1.15, height: 3, borderRadius: 99,
        bgcolor: alpha(folder.color || accent, 0.16),
        overflow: 'hidden',
      }}>
        <Box sx={{
          width: `${Math.min(100, 18 + (Number(folder.documents_count) || 0) * 3)}%`,
          height: '100%', bgcolor: folder.color || accent, borderRadius: 99,
        }} />
      </Box>
    </Paper>
  </ButtonBase>
);

const DocumentRow = ({ row, onPreview, onDownload, busy }) => {
  const file = fileMeta(row);
  const FileIcon = file.icon;
  const confidentiality = confidentialityMeta(row);
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.1, px: 1.25, py: 1,
      borderBottom: '1px solid', borderColor: 'divider',
      '&:last-of-type': { borderBottom: 0 },
    }}>
      <Box sx={{
        width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
        display: 'grid', placeItems: 'center', color: file.color,
        bgcolor: alpha(file.color, 0.1),
      }}>
        <FileIcon sx={{ fontSize: 19 }} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography noWrap sx={{ fontSize: 12, fontWeight: 800 }}>{row.title}</Typography>
        <Typography noWrap sx={{ fontSize: 10, color: 'text.secondary', mt: 0.2 }}>
          {[documentTypeMeta(row).label, row.file_size_display, row.issue_date ? toJalali(row.issue_date) : '']
            .filter(Boolean).join(' · ')}
        </Typography>
      </Box>
      <Chip
        size="small"
        label={confidentiality.label}
        sx={{
          height: 20, fontSize: 9.5, fontWeight: 800,
          color: confidentiality.color, bgcolor: confidentiality.bg,
          border: `1px solid ${alpha(confidentiality.color, 0.22)}`,
        }}
      />
      <Tooltip title="پیش‌نمایش">
        <span>
          <IconButton size="small" disabled={busy} onClick={() => onPreview(row)} aria-label="پیش‌نمایش سند">
            <VisibilityOutlinedIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="دریافت">
        <span>
          <IconButton size="small" disabled={busy} onClick={() => onDownload(row)} aria-label="دریافت سند">
            <DownloadOutlinedIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

/**
 * پنجرهٔ کاری «اسناد سازمانی» — مثل چت/برنامه‌ریزی روی همان صفحه باز می‌شود.
 * ابتدا ساختار پوشه‌ها و سپس اسناد همان پوشه؛ بدون ریختن همهٔ فایل‌ها در یک لیست.
 */
const OrganizationalDocumentsPanel = () => {
  const theme = useTheme();
  const qc = useQueryClient();
  const [folderId, setFolderId] = useState('');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);

  const foldersQuery = useQuery({
    queryKey: ['org-documents-folders'],
    queryFn: () => axiosInstance
      .get('/document-management/folders/')
      .then((response) => response.data),
    staleTime: 60_000,
  });
  const folders = Array.isArray(foldersQuery.data) ? foldersQuery.data : [];

  const organizationRoots = useMemo(
    () => moduleRootFolders(folders, 'organization'),
    [folders],
  );
  const organizationIds = useMemo(
    () => folderDescendants(folders, organizationRoots.map((folder) => folder.id)),
    [folders, organizationRoots],
  );
  const organizationFolders = useMemo(
    () => folders.filter((folder) => organizationIds.has(String(folder.id))),
    [folders, organizationIds],
  );
  const selectedFolder = organizationFolders.find(
    (folder) => String(folder.id) === String(folderId),
  ) || null;

  const visibleFolders = useMemo(() => {
    const parent = selectedFolder ? selectedFolder.id : '';
    const rows = organizationFolders.filter(
      (folder) => String(folder.parent || '') === String(parent),
    );
    return sortedFolders(rows);
  }, [organizationFolders, selectedFolder]);

  const documentsQuery = useQuery({
    queryKey: ['org-documents-list', folderId, search],
    queryFn: () => axiosInstance
      .get('/document-management/documents/', {
        params: {
          folder: folderId,
          search: search.trim() || undefined,
          page_size: 100,
          ordering: '-created_at',
          include_archived: 1,
        },
      })
      .then((response) => response.data),
    enabled: Boolean(folderId),
    staleTime: 20_000,
  });
  const documents = Array.isArray(documentsQuery.data)
    ? documentsQuery.data
    : documentsQuery.data?.results || [];

  const folderTrail = useMemo(() => {
    const trail = [];
    let current = selectedFolder;
    const visited = new Set();
    while (current && !visited.has(String(current.id))) {
      visited.add(String(current.id));
      trail.unshift(current);
      current = organizationFolders.find(
        (folder) => String(folder.id) === String(current.parent),
      ) || null;
    }
    return trail;
  }, [selectedFolder, organizationFolders]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['org-documents-folders'] });
    if (folderId) qc.invalidateQueries({ queryKey: ['org-documents-list', folderId] });
  };

  const openContent = async (row, download = false) => {
    setBusyId(row.id);
    try {
      const response = await axiosInstance.get(
        `/document-management/documents/${row.id}/content/`,
        { responseType: 'blob' },
      );
      const blobUrl = URL.createObjectURL(response.data);
      if (download) {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = row.file_name || 'document';
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const target = window.open(blobUrl, '_blank');
        if (!target) URL.revokeObjectURL(blobUrl);
      }
    } finally {
      setBusyId(null);
    }
  };

  const tokenBorder = 'var(--hrms-border-card, 1px solid #e8edf4)';
  const tokenRadius = 'var(--hrms-radius-large, 16px)';

  if (foldersQuery.isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  if (foldersQuery.isError) {
    return <Alert severity="error" sx={{ borderRadius: '12px' }}>خطا در دریافت پوشه‌های اسناد سازمانی.</Alert>;
  }


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, minHeight: 0, height: '100%' }}>
      <Paper elevation={0} sx={{
        p: 1.15, borderRadius: tokenRadius, border: tokenBorder,
        bgcolor: 'var(--hrms-region-card-bg, #ffffff)',
        boxShadow: 'var(--hrms-shadow-card, none)',
        display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
      }}>
        <ButtonBase
          onClick={() => { setFolderId(''); setSearch(''); }}
          sx={{ borderRadius: '9px', px: 1, py: 0.55, color: ACCENT, bgcolor: alpha(ACCENT, 0.07) }}
        >
          <FolderOpenOutlinedIcon sx={{ fontSize: 18, ml: 0.4 }} />
          <Typography sx={{ fontSize: 11.5, fontWeight: 900, mr: 0.5 }}>اسناد سازمانی</Typography>
        </ButtonBase>
        {folderTrail.map((folder) => (
          <React.Fragment key={`trail-${folder.id}`}>
            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>/</Typography>
            <ButtonBase
              onClick={() => setFolderId(folder.id)}
              sx={{ borderRadius: '8px', px: 0.55, py: 0.35 }}
            >
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: 'text.secondary' }}>
                {folder.name}
              </Typography>
            </ButtonBase>
          </React.Fragment>
        ))}
        <Box sx={{ flex: 1 }} />
        <TextField
          size="small"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="جست‌وجوی سند…"
          sx={{
            width: { xs: '100%', sm: 220 },
            '& .MuiInputBase-root': { fontSize: 11.5, borderRadius: '9px' },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 17 }} />
              </InputAdornment>
            ),
          }}
        />
        <Tooltip title="به‌روزرسانی">
          <IconButton size="small" onClick={refresh} aria-label="به‌روزرسانی اسناد سازمانی">
            <RefreshIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Paper>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.25 }}>
        {!folderId ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 900 }}>پوشه‌های اسناد سازمانی</Typography>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.2 }}>
                  برای مشاهدهٔ اسناد، یک پوشه را انتخاب کنید.
                </Typography>
              </Box>
              <Chip
                size="small"
                label={`${toPersianDigits(organizationRoots.length)} پوشهٔ اصلی`}
                sx={{ fontSize: 10, height: 22, bgcolor: alpha(ACCENT, 0.08), color: ACCENT }}
              />
            </Box>
            {organizationRoots.length ? (
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
                gap: 1.1,
              }}>
                {sortedFolders(organizationRoots).map((folder) => (
                  <FolderCard key={folder.id} folder={folder} accent={ACCENT} onSelect={(row) => setFolderId(row.id)} />
                ))}
              </Box>
            ) : (
              <Alert severity="info" sx={{ borderRadius: '12px' }}>
                پوشه‌ای برای اسناد سازمانی در دسترس شما نیست.
              </Alert>
            )}
          </Box>
        ) : (

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
              <Tooltip title="بازگشت">
                <IconButton
                  size="small"
                  onClick={() => setFolderId(selectedFolder?.parent || '')}
                  aria-label="بازگشت به پوشهٔ بالاتر"
                >
                  <ArrowBackIcon sx={{ fontSize: 18, transform: 'scaleX(-1)' }} />
                </IconButton>
              </Tooltip>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 13, fontWeight: 900 }}>{selectedFolder?.name}</Typography>
                <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.15 }}>
                  {selectedFolder?.path || folderTrail.map((row) => row.name).join(' / ')}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }} />
              <Chip
                size="small"
                label={`${toPersianDigits(documents.length)} سند`}
                sx={{ fontSize: 10, height: 22, bgcolor: alpha(theme.palette.text.primary, 0.05) }}
              />
            </Box>

            {visibleFolders.length > 0 && (
              <Box sx={{ mb: 1.25 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 900, color: 'text.secondary', mb: 0.75 }}>
                  زیرپوشه‌ها
                </Typography>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
                  gap: 1,
                }}>
                  {visibleFolders.map((folder) => (
                    <FolderCard key={folder.id} folder={folder} accent={ACCENT} onSelect={(row) => setFolderId(row.id)} />
                  ))}
                </Box>
              </Box>
            )}

            <Paper elevation={0} sx={{
              borderRadius: tokenRadius, border: tokenBorder, overflow: 'hidden',
              bgcolor: 'var(--hrms-region-card-bg, #ffffff)',
              boxShadow: 'var(--hrms-shadow-card, none)',
            }}>
              <Box sx={{ px: 1.35, py: 0.9, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 900 }}>اسناد این پوشه</Typography>
              </Box>
              {documentsQuery.isLoading ? (
                <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}><CircularProgress size={24} /></Box>
              ) : documents.length ? (
                documents.map((row) => (
                  <DocumentRow
                    key={row.id}
                    row={row}
                    busy={busyId === row.id}
                    onPreview={(documentRow) => openContent(documentRow, false)}
                    onDownload={(documentRow) => openContent(documentRow, true)}
                  />
                ))
              ) : (
                <Box sx={{ py: 5, textAlign: 'center' }}>
                  <DescriptionOutlinedIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 0.5 }} />
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                    سندی مستقیماً در این پوشه ثبت نشده است.
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default OrganizationalDocumentsPanel;

