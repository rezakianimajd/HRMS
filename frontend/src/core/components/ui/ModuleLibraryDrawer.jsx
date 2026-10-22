import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, Divider, Drawer, IconButton,
  InputAdornment, List, ListItemButton, ListItemText, Paper, Stack, TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import FolderSharedOutlinedIcon from '@mui/icons-material/FolderSharedOutlined';
import ManageSearchOutlinedIcon from '@mui/icons-material/ManageSearchOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import SearchIcon from '@mui/icons-material/Search';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import axiosInstance from '../../api/axiosConfig';
import { formatPersianNumber } from '../../utils/numberUtils';
import { FolderTree, fileMeta } from '../../../pages/contracts/DocumentManagementUI';
import { scopedLibraryFolders } from '../../config/documentLibraryModules';

const normalize = (value) => String(value ?? '').trim().toLowerCase();

const ModuleLibraryDrawer = ({
  open, onClose, moduleKey = '', moduleTitle = '', accent = '#0f766e',
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  const foldersQuery = useQuery({
    queryKey: ['dms-module-library-folders'],
    queryFn: () => axiosInstance.get('/document-management/folders/').then((response) => response.data),
    enabled: open,
    staleTime: 60 * 1000,
  });
  const documentsQuery = useQuery({
    queryKey: ['dms-module-library-documents'],
    queryFn: () => axiosInstance.get('/document-management/documents/', {
      params: { page_size: 250, include_archived: 0 },
    }).then((response) => response.data),
    enabled: open,
    staleTime: 60 * 1000,
  });

  const folders = useMemo(() => (
    Array.isArray(foldersQuery.data) ? foldersQuery.data : foldersQuery.data?.results || []
  ), [foldersQuery.data]);
  const documents = useMemo(() => (
    Array.isArray(documentsQuery.data) ? documentsQuery.data : documentsQuery.data?.results || []
  ), [documentsQuery.data]);

  const scoped = useMemo(() => {
    if (!folders.length) return { folders: [], roots: [], module: null };
    if (!moduleKey || moduleKey === 'documents') {
      return { folders, roots: folders.filter((folder) => !folder.parent), module: null };
    }
    return scopedLibraryFolders(folders, { moduleKey });
  }, [folders, moduleKey]);

  const scopedIds = useMemo(
    () => new Set(scoped.folders.map((folder) => String(folder.id))),
    [scoped.folders],
  );

  const moduleDocuments = useMemo(() => {
    const rows = (!moduleKey || moduleKey === 'documents')
      ? documents
      : documents.filter((row) => scopedIds.has(String(row.folder)));
    return [...rows].sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
  }, [documents, moduleKey, scopedIds]);

  const query = normalize(search);
  const visibleFolders = useMemo(() => {
    if (!query) return scoped.folders;
    const matches = new Set();
    scoped.folders.forEach((folder) => {
      const text = normalize([folder.name, folder.code, folder.path].filter(Boolean).join(' '));
      if (!text.includes(query)) return;
      matches.add(String(folder.id));
      let current = folder;
      while (current?.parent) {
        matches.add(String(current.parent));
        current = scoped.folders.find((row) => String(row.id) === String(current.parent));
      }
    });
    return scoped.folders.filter((folder) => matches.has(String(folder.id)));
  }, [scoped.folders, query]);

  const visibleDocuments = useMemo(() => {
    const rows = query
      ? moduleDocuments.filter((row) => normalize([
        row.title, row.description, row.tags, row.reference_number, row.folder_name,
      ].filter(Boolean).join(' ')).includes(query))
      : moduleDocuments;
    return rows.slice(0, 7);
  }, [moduleDocuments, query]);

  const folderCount = scoped.folders.length;
  const documentCount = moduleDocuments.length;
  const baseLibraryPath = moduleKey && moduleKey !== 'documents'
    ? `/document-management/library?module=${moduleKey}`
    : '/document-management/library';
  const joinQuery = (path, key, value) => `${path}${path.includes('?') ? '&' : '?'}${key}=${encodeURIComponent(value)}`;

  const go = (path) => {
    onClose?.();
    navigate(path);
  };

  const openFolder = (folderId) => {
    go(joinQuery(baseLibraryPath, 'folder', folderId));
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 430 },
          maxWidth: '100%',
          bgcolor: 'background.default',
          backgroundImage: (theme) => `linear-gradient(160deg, ${alpha(accent, 0.08)}, ${theme.palette.background.default} 34%)`,
          border: 0,
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{
          px: 2.25, py: 2, color: '#fff',
          background: `linear-gradient(135deg, ${accent}, ${alpha(accent, 0.82)})`,
          position: 'relative', overflow: 'hidden',
          '&::after': {
            content: '""', position: 'absolute', width: 160, height: 160, borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)', top: -90, left: -35,
          },
        }}>
          <Stack direction="row" alignItems="flex-start" spacing={1.25} sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{
              width: 42, height: 42, borderRadius: '13px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.22)',
            }}>
              <FolderSharedOutlinedIcon />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: 12, opacity: 0.82, fontWeight: 600 }}>پوشهٔ ماژول</Typography>
              <Typography noWrap sx={{ fontSize: 17, fontWeight: 900, mt: 0.15 }}>{moduleTitle || 'کتابخانهٔ اسناد'}</Typography>
              <Typography sx={{ fontSize: 11.5, opacity: 0.82, mt: 0.3 }}>
                دسترسی سریع به پوشه‌ها و اسناد همین ماژول
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small" aria-label="بستن پوشهٔ ماژول"
              sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' } }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>

        <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
          <TextField
            fullWidth size="small" value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="جستجو در پوشه‌ها و اسناد این ماژول…"
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: alpha(accent, 0.8) }} /></InputAdornment>,
              sx: { bgcolor: 'background.paper', borderRadius: '11px', fontSize: 12.5 },
            }}
          />
          <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
            <Chip size="small" icon={<FolderOpenOutlinedIcon />} label={`${formatPersianNumber(folderCount)} پوشه`}
              sx={{ bgcolor: alpha(accent, 0.09), color: accent, fontWeight: 800 }} />
            <Chip size="small" icon={<DescriptionOutlinedIcon />} label={`${formatPersianNumber(documentCount)} سند`}
              sx={{ bgcolor: 'action.hover', color: 'text.secondary', fontWeight: 700 }} />
            <Button size="small" endIcon={<OpenInNewOutlinedIcon />} onClick={() => go(baseLibraryPath)}
              sx={{ mr: 'auto', fontSize: 11, fontWeight: 800, color: accent }}>
              کتابخانهٔ ماژول
            </Button>
          </Stack>
        </Box>

        <Divider />


        <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1.25 }}>
          {foldersQuery.isLoading ? (
            <Stack alignItems="center" spacing={1} py={4}>
              <CircularProgress size={24} />
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>در حال بارگذاری پوشه‌ها…</Typography>
            </Stack>
          ) : foldersQuery.isError ? (
            <Alert severity="error" sx={{ fontSize: 12 }}>دریافت پوشه‌های ماژول انجام نشد.</Alert>
          ) : !visibleFolders.length ? (
            <Paper variant="outlined" sx={{ p: 2.25, borderRadius: '14px', textAlign: 'center', borderStyle: 'dashed' }}>
              <FolderOpenOutlinedIcon sx={{ fontSize: 34, color: alpha(accent, 0.55), mb: 0.5 }} />
              <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>پوشه‌ای برای این ماژول پیدا نشد</Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.5, lineHeight: 1.8 }}>
                {query ? 'عبارت جستجو را تغییر دهید یا همهٔ پوشه‌ها را ببینید.' : 'از مدیریت اسناد، پوشهٔ این ماژول را ایجاد کنید.'}
              </Typography>
              <Button size="small" startIcon={<SettingsOutlinedIcon />} onClick={() => go('/document-management/folders')}
                sx={{ mt: 1, fontSize: 11.5, fontWeight: 800, color: accent }}>
                مدیریت پوشه‌ها
              </Button>
            </Paper>
          ) : (
            <Paper variant="outlined" sx={{ p: 0.75, borderRadius: '14px', borderColor: alpha(accent, 0.16), bgcolor: 'background.paper' }}>
              <FolderTree folders={visibleFolders} selected="" onSelect={openFolder} />
            </Paper>
          )}

          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 2, mb: 0.75, px: 0.4 }}>
            <DescriptionOutlinedIcon sx={{ fontSize: 17, color: accent }} />
            <Typography sx={{ fontSize: 12, fontWeight: 900 }}>آخرین اسناد</Typography>
            <Box sx={{ flex: 1, height: 1, bgcolor: alpha(accent, 0.15) }} />
            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{formatPersianNumber(moduleDocuments.length)} سند</Typography>
          </Stack>

          {documentsQuery.isLoading ? (
            <Stack alignItems="center" py={2}><CircularProgress size={20} /></Stack>
          ) : visibleDocuments.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '12px', textAlign: 'center' }}>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>سندی برای نمایش وجود ندارد.</Typography>
            </Paper>
          ) : (
            <List dense disablePadding>
              {visibleDocuments.map((row) => {
                const meta = fileMeta(row);
                const Icon = meta.icon;
                return (
                  <ListItemButton key={row.id} onClick={() => go(
                    row.folder
                      ? joinQuery(joinQuery(baseLibraryPath, 'folder', row.folder), 'q', row.title)
                      : joinQuery(baseLibraryPath, 'q', row.title),
                  )} sx={{ borderRadius: '11px', mb: 0.4, alignItems: 'flex-start' }}>
                    <Box sx={{
                      width: 30, height: 30, borderRadius: '9px', flexShrink: 0, mr: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: alpha(meta.color, 0.1), color: meta.color,
                    }}>
                      <Icon sx={{ fontSize: 16 }} />
                    </Box>
                    <ListItemText
                      primary={row.title}
                      secondary={`${row.folder_name || row.folder_path || 'بدون پوشه'} · ${row.updated_at ? 'به‌روزرسانی‌شده' : ''}`}
                      primaryTypographyProps={{ noWrap: true, fontSize: 12, fontWeight: 800 }}
                      secondaryTypographyProps={{ noWrap: true, fontSize: 10.5 }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </Box>

        <Divider />
        <Stack direction="row" spacing={1} sx={{ p: 1.5 }}>
          <Button fullWidth size="small" variant="outlined" startIcon={<ManageSearchOutlinedIcon />}
            onClick={() => go('/document-management/library')}
            sx={{ fontSize: 11.5, fontWeight: 800, borderColor: alpha(accent, 0.3), color: accent }}>
            کتابخانه
          </Button>
          <Button fullWidth size="small" variant="contained" startIcon={<SettingsOutlinedIcon />}
            onClick={() => go('/document-management/folders')}
            sx={{ fontSize: 11.5, fontWeight: 800, bgcolor: accent, '&:hover': { bgcolor: alpha(accent, 0.88) } }}>
            مدیریت پوشه‌ها
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
};

export default ModuleLibraryDrawer;
