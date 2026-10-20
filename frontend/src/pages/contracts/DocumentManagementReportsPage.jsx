import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, Chip, CircularProgress, Grid, Paper, Stack, Table,
  TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import axiosInstance from '../../core/api/axiosConfig';
import PageHeader from '../../core/components/ui/PageHeader';
import { INK, KpiTile, MUTED, SOFT_BG, SurfaceCard } from '../accounting/AccountingDashboardUI';
import {
  CONFIDENTIALITY, DMS_ACCENT, DOC_STATUS, formatBytes,
} from './DocumentManagementUI';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';

const DocumentManagementReportsPage = () => {
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

  const documents = useMemo(() => (Array.isArray(documentsQuery.data) ? documentsQuery.data : documentsQuery.data?.results || []), [documentsQuery.data]);
  const folders = useMemo(() => (Array.isArray(foldersQuery.data) ? foldersQuery.data : foldersQuery.data?.results || []), [foldersQuery.data]);
  const stats = statsQuery.data || {};
  const liveDocs = useMemo(() => documents.filter((row) => row.status !== 'archived'), [documents]);
  const expiring = liveDocs
    .filter((row) => row.is_expired || (row.days_until_expiry != null && row.days_until_expiry >= 0 && row.days_until_expiry <= 30))
    .sort((a, b) => String(a.expiry_date || '9999').localeCompare(String(b.expiry_date || '9999')));
  const recent = [...documents].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))).slice(0, 8);

  const byFolder = useMemo(() => {
    const counts = new Map();
    liveDocs.forEach((row) => counts.set(String(row.folder || ''), (counts.get(String(row.folder || '')) || 0) + 1));
    return folders
      .map((folder) => ({ ...folder, count: counts.get(String(folder.id)) || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [liveDocs, folders]);

  const byConfidentiality = useMemo(() => Object.keys(CONFIDENTIALITY).map((key) => ({
    key, ...CONFIDENTIALITY[key], count: liveDocs.filter((row) => row.confidentiality === key).length,
  })), [liveDocs]);
  const byStatus = useMemo(() => Object.keys(DOC_STATUS).map((key) => ({
    key, ...DOC_STATUS[key], count: documents.filter((row) => row.status === key).length,
  })), [documents]);

  const exportCsv = () => {
    const headers = ['عنوان', 'پوشه', 'محرمانگی', 'وضعیت', 'نسخه', 'حجم', 'تاریخ انقضا', 'ایجادکننده'];
    const rows = documents.map((row) => [
      row.title, row.folder_path || '', row.confidentiality_display || '', row.status_display || '',
      row.version_count || 1, row.file_size || 0, row.expiry_date || '', row.created_by_name || '',
    ]);
    const csv = [headers, ...rows].map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'document-management-report.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (documentsQuery.isLoading) {
    return <Box sx={{ py: 9, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <PageHeader
        icon={<InsightsOutlinedIcon />}
        title="گزارش جامع اسناد"
        subtitle="تصویر مدیریتی از حجم، وضعیت، محرمانگی و انقضای اسناد سازمان"
        actions={<Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv}>خروجی CSV</Button>}
      />

      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={6} md={3}><KpiTile icon={FolderOpenOutlinedIcon} label="کل اسناد فعال" value={formatPersianNumber(liveDocs.length)} suffix="سند" color={DMS_ACCENT} hint={`${formatPersianNumber(documents.length)} سند در بایگانی`} /></Grid>
        <Grid item xs={6} md={3}><KpiTile icon={ArchiveOutlinedIcon} label="بایگانی‌شده" value={formatPersianNumber(documents.filter((row) => row.status === 'archived').length)} suffix="سند" color="#b45309" hint="قابل بازگردانی" /></Grid>
        <Grid item xs={6} md={3}><KpiTile icon={WarningAmberOutlinedIcon} label="نزدیک انقضا / منقضی" value={formatPersianNumber(expiring.length)} suffix="سند" color="#be123c" hint="نیازمند بررسی" /></Grid>
        <Grid item xs={6} md={3}><KpiTile icon={StorageOutlinedIcon} label="فضای بایگانی" value={formatBytes(stats.storage_bytes || 0)} color="#2563eb" size={16} hint={`${formatPersianNumber(folders.length)} پوشه`} /></Grid>
      </Grid>

      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={12} md={5}>
          <SurfaceCard title="توزیع محرمانگی" icon={LockOutlinedIcon} color="#be123c">
            <Stack spacing={1}>
              {byConfidentiality.map((item) => {
                const percent = liveDocs.length ? Math.round((item.count / liveDocs.length) * 100) : 0;
                return <DistributionRow key={item.key} label={item.label} count={item.count} percent={percent} color={item.color} />;
              })}
            </Stack>
          </SurfaceCard>
        </Grid>
        <Grid item xs={12} md={3}>
          <SurfaceCard title="وضعیت اسناد" icon={ArchiveOutlinedIcon} color={DMS_ACCENT}>
            <Stack spacing={0.8}>
              {byStatus.map((item) => (
                <Stack key={item.key} direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 0.8, borderRadius: '9px', bgcolor: SOFT_BG }}>
                  <Stack direction="row" alignItems="center" spacing={0.6}>
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: item.color }} />
                    <Typography sx={{ fontSize: 8.8, color: INK }}>{item.label}</Typography>
                  </Stack>
                  <Typography sx={{ fontSize: 10, fontWeight: 900, color: item.color }}>{formatPersianNumber(item.count)}</Typography>
                </Stack>
              ))}
            </Stack>
          </SurfaceCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <SurfaceCard title="پوشه‌های پرکاربرد" icon={FolderOpenOutlinedIcon} color="#2563eb">
            <Stack spacing={0.55}>
              {byFolder.map((folder) => (
                <Stack key={folder.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 0.55, borderBottom: '1px solid #eef2f7' }}>
                  <Typography noWrap sx={{ fontSize: 8.7, color: INK }}>{folder.path || folder.name}</Typography>
                  <Chip size="small" label={formatPersianNumber(folder.count)} sx={{ height: 18, fontSize: 7.5, bgcolor: alpha(DMS_ACCENT, 0.08), color: DMS_ACCENT }} />
                </Stack>
              ))}
              {!byFolder.length ? <Typography sx={{ fontSize: 8.6, color: MUTED }}>پوشه‌ای وجود ندارد.</Typography> : null}
            </Stack>
          </SurfaceCard>
        </Grid>
      </Grid>

      <Grid container spacing={1.5}>
        <Grid item xs={12} lg={7}>
          <SurfaceCard title="آخرین اسناد ثبت‌شده" icon={FolderOpenOutlinedIcon} color={DMS_ACCENT}>
            <Paper elevation={0} sx={{ border: '1px solid #eef2f7', borderRadius: '10px', overflow: 'hidden' }}>
              <Table size="small">
                <TableHead><TableRow>
                  {['عنوان', 'پوشه', 'محرمانگی', 'وضعیت', 'انقضا'].map((label) => <TableCell key={label} sx={{ fontSize: 8.5, fontWeight: 800, bgcolor: SOFT_BG }}>{label}</TableCell>)}
                </TableRow></TableHead>
                <TableBody>
                  {recent.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ fontSize: 8.8, fontWeight: 700 }}>{row.title}</TableCell>
                      <TableCell sx={{ fontSize: 8.4, color: MUTED }}>{row.folder_path || '—'}</TableCell>
                      <TableCell><Chip size="small" label={CONFIDENTIALITY[row.confidentiality]?.label || '—'} sx={{ height: 18, fontSize: 7.4, bgcolor: CONFIDENTIALITY[row.confidentiality]?.bg, color: CONFIDENTIALITY[row.confidentiality]?.color }} /></TableCell>
                      <TableCell><Chip size="small" label={DOC_STATUS[row.status]?.label || '—'} sx={{ height: 18, fontSize: 7.4, bgcolor: DOC_STATUS[row.status]?.bg, color: DOC_STATUS[row.status]?.color }} /></TableCell>
                      <TableCell sx={{ fontSize: 8.2, color: row.is_expired ? '#be123c' : MUTED }}>{toJalali(row.expiry_date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!recent.length ? <Typography sx={{ p: 2, fontSize: 8.8, color: MUTED }}>سندی ثبت نشده است.</Typography> : null}
            </Paper>
          </SurfaceCard>
        </Grid>
        <Grid item xs={12} lg={5}>
          <SurfaceCard title="اسناد نیازمند اقدام" icon={WarningAmberOutlinedIcon} color="#be123c"
            action={<Chip size="small" label={formatPersianNumber(expiring.length)} sx={{ height: 19, fontSize: 7.8, bgcolor: '#fff1f2', color: '#be123c' }} />}>
            <Stack spacing={0.55}>
              {expiring.slice(0, 8).map((row) => (
                <Stack key={row.id} direction="row" alignItems="center" spacing={0.6} sx={{ p: 0.65, borderRadius: '9px', border: '1px solid #f1f5f9' }}>
                  <WarningAmberOutlinedIcon sx={{ fontSize: 14, color: row.is_expired ? '#be123c' : '#b45309' }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{ fontSize: 8.7, fontWeight: 800, color: INK }}>{row.title}</Typography>
                    <Typography sx={{ fontSize: 7.5, color: MUTED }}>{row.folder_path || 'بدون پوشه'} · {toJalali(row.expiry_date)}</Typography>
                  </Box>
                  <Chip size="small" label={row.is_expired ? 'منقضی' : `${toPersianDigits(row.days_until_expiry)} روز`} sx={{ height: 18, fontSize: 7.3, bgcolor: row.is_expired ? '#fff1f2' : '#fffbeb', color: row.is_expired ? '#be123c' : '#b45309' }} />
                </Stack>
              ))}
              {!expiring.length ? <Typography sx={{ fontSize: 8.6, color: MUTED }}>سند نیازمند اقدامی وجود ندارد.</Typography> : null}
            </Stack>
          </SurfaceCard>
        </Grid>
      </Grid>
    </Box>
  );
};

const DistributionRow = ({ label, count, percent, color }) => (
  <Box>
    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.35 }}>
      <Typography sx={{ fontSize: 8.6, color: INK }}>{label}</Typography>
      <Typography sx={{ fontSize: 8.4, fontWeight: 800, color }}>{formatPersianNumber(count)} · {toPersianDigits(percent)}٪</Typography>
    </Stack>
    <Box sx={{ height: 5, borderRadius: 999, bgcolor: '#eef2f7', overflow: 'hidden' }}>
      <Box sx={{ height: '100%', width: `${percent}%`, bgcolor: color, borderRadius: 999 }} />
    </Box>
  </Box>
);

export default DocumentManagementReportsPage;
