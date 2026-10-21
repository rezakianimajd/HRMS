import React, { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Chip, CircularProgress, Grid, Stack, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined';
import SyncIcon from '@mui/icons-material/Sync';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import axiosInstance from '../../core/api/axiosConfig';
import useAuth from '../../core/hooks/useAuth';
import PageHeader from '../../core/components/ui/PageHeader';
import { INK, KpiTile, MUTED, SurfaceCard } from '../accounting/AccountingDashboardUI';
import { formatPersianNumber } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';
import {
  ActivityCard, DMS_ACCENT, FolderOverview, StorageCard, StoragePolicyCard,
  formatBytes,
} from './DocumentManagementUI';

const DocumentManagementDashboardPage = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = Boolean(user?.is_superuser || user?.permissions?.can_manage_documents);

  const statsQuery = useQuery({
    queryKey: ['dms-stats'],
    queryFn: () => axiosInstance.get('/document-management/stats/').then((response) => response.data),
  });
  const documentsQuery = useQuery({
    queryKey: ['dms-documents'],
    queryFn: () => axiosInstance.get('/document-management/documents/', { params: { page_size: 500, include_archived: 1 } }).then((response) => response.data),
  });
  const foldersQuery = useQuery({
    queryKey: ['dms-folders'],
    queryFn: () => axiosInstance.get('/document-management/folders/').then((response) => response.data),
  });
  const activitiesQuery = useQuery({
    queryKey: ['dms-activities'],
    queryFn: () => axiosInstance.get('/document-management/activities/', { params: { page_size: 20 } }).then((response) => response.data),
  });

  const documents = useMemo(() => (Array.isArray(documentsQuery.data) ? documentsQuery.data : documentsQuery.data?.results || []), [documentsQuery.data]);
  const folders = useMemo(() => (Array.isArray(foldersQuery.data) ? foldersQuery.data : foldersQuery.data?.results || []), [foldersQuery.data]);
  const activities = useMemo(() => (Array.isArray(activitiesQuery.data) ? activitiesQuery.data : activitiesQuery.data?.results || []), [activitiesQuery.data]);
  const stats = statsQuery.data || {};

  const activeDocs = documents.filter((row) => row.status !== 'archived');
  const archived = documents.filter((row) => row.status === 'archived');
  const expiring = activeDocs.filter((row) => row.is_expired || (row.days_until_expiry != null && row.days_until_expiry >= 0 && row.days_until_expiry <= 30));
  const recent = [...documents].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))).slice(0, 5);

  const syncStorage = useMutation({
    mutationFn: () => axiosInstance.post('/document-management/sync-storage/'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dms-stats'] });
      qc.invalidateQueries({ queryKey: ['dms-documents'] });
      qc.invalidateQueries({ queryKey: ['dms-folders'] });
      qc.invalidateQueries({ queryKey: ['dms-menu-folders'] });
      qc.invalidateQueries({ queryKey: ['dms-activities'] });
    },
  });

  const openLibrary = (query = '') => navigate(`/document-management/library${query}`);
  const openFolder = (id) => openLibrary(`?folder=${id}`);

  if (documentsQuery.isLoading || foldersQuery.isLoading) {
    return <Box sx={{ py: 9, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<DashboardOutlinedIcon />}
        title="داشبورد اسناد"
        subtitle="نمای مدیریتی کتابخانه مرکزی، ساختار پوشه‌ها و وضعیت بایگانی"
        badge={<Chip size="small" label={`${formatPersianNumber(activeDocs.length)} سند فعال`} sx={{ height: 23, fontWeight: 800, bgcolor: alpha(DMS_ACCENT, 0.08), color: DMS_ACCENT }} />}
        actions={(
          <>
            <Button variant="outlined" startIcon={<SyncIcon />} disabled={!canManage || syncStorage.isPending} onClick={() => syncStorage.mutate()}>همگام‌سازی بایگانی</Button>
            <Button variant="outlined" startIcon={<LibraryBooksOutlinedIcon />} onClick={() => openLibrary()}>کتابخانه اسناد</Button>
            <Button variant="contained" startIcon={<UploadFileOutlinedIcon />} disabled={!canManage} onClick={() => openLibrary('?action=upload')}>آپلود سند</Button>
          </>
        )}
      />

      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={6} md={3}><KpiTile icon={FolderOpenOutlinedIcon} label="کل اسناد فعال" value={formatPersianNumber(activeDocs.length)} suffix="سند" color={DMS_ACCENT} hint={`${formatPersianNumber(archived.length)} سند بایگانی`} /></Grid>
        <Grid item xs={6} md={3}><KpiTile icon={UploadFileOutlinedIcon} label="در انتظار بررسی" value={formatPersianNumber(stats.pending_review || 0)} suffix="سند" color="#2563eb" hint={`${formatPersianNumber(stats.published || 0)} منتشرشده`} /></Grid>
        <Grid item xs={6} md={3}><KpiTile icon={WarningAmberOutlinedIcon} label="نزدیک انقضا / منقضی" value={formatPersianNumber(expiring.length)} suffix="سند" color="#be123c" hint={`${formatPersianNumber(stats.review_due || 0)} بازنگری سررسید`} /></Grid>
        <Grid item xs={6} md={3}><KpiTile icon={ArchiveOutlinedIcon} label="فضای بایگانی" value={formatBytes(stats.storage_bytes || 0)} color="#2563eb" size={16} hint={`${formatPersianNumber(folders.length)} پوشه`} /></Grid>
      </Grid>

      <Box sx={{ mb: 1.5 }}>
        <FolderOverview folders={folders} selected="" onSelect={openFolder} />
      </Box>

      <Grid container spacing={1.5}>
        <Grid item xs={12} lg={7}>
          <SurfaceCard title="آخرین اسناد" icon={FolderOpenOutlinedIcon} color={DMS_ACCENT}
            action={<Button size="small" onClick={() => openLibrary()} sx={{ fontSize: 12 }}>مشاهده همه</Button>}>
            <Stack spacing={0.55}>
              {recent.map((row) => (
                <Stack key={row.id} direction="row" alignItems="center" spacing={0.6}
                  sx={{ p: 0.7, borderRadius: '10px', border: '1px solid #eef2f7', cursor: 'pointer', '&:hover': { bgcolor: alpha(DMS_ACCENT, 0.03) } }}
                  onClick={() => openLibrary(`?q=${encodeURIComponent(row.title)}`)}>
                  <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: alpha(DMS_ACCENT, 0.08), color: DMS_ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FolderOpenOutlinedIcon sx={{ fontSize: 14 }} /></Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{row.title}</Typography>
                    <Typography noWrap sx={{ fontSize: 12, color: MUTED }}>{row.folder_path || 'بدون پوشه'} · {toJalali(row.created_at?.slice(0, 10))}</Typography>
                  </Box>
                  <Chip size="small" label={formatBytes(row.file_size)} sx={{ height: 18, fontSize: 12, bgcolor: '#f1f5f9', color: MUTED }} />
                </Stack>
              ))}
              {!recent.length ? <Typography sx={{ py: 2, fontSize: 12, color: MUTED, textAlign: 'center' }}>سندی ثبت نشده است.</Typography> : null}
            </Stack>
          </SurfaceCard>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Stack spacing={1.5}>
            <StorageCard stats={stats} isLoading={statsQuery.isLoading} />
            <StoragePolicyCard policy={stats.storage_policy} />
            <ActivityCard activities={activities} onOpen={(documentId) => openLibrary(`?q=${encodeURIComponent(documentId)}`)} />
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DocumentManagementDashboardPage;
