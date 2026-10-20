import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Chip, CircularProgress, FormControl, Grid, InputLabel, MenuItem,
  Paper, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import axiosInstance from '../../core/api/axiosConfig';
import PageHeader from '../../core/components/ui/PageHeader';
import { INK, KpiTile, MUTED, SOFT_BG, SurfaceCard } from '../accounting/AccountingDashboardUI';
import { DMS_ACCENT } from './DocumentManagementUI';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';

const ACTION_LABELS = {
  create: 'ایجاد سند', update: 'ویرایش اطلاعات', new_version: 'ثبت نسخه جدید',
  archive: 'بایگانی', restore: 'بازگردانی', delete: 'حذف', download: 'دانلود',
};

const DocumentManagementActivityPage = () => {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('all');
  const { data, isLoading } = useQuery({
    queryKey: ['dms-activities-all'],
    queryFn: () => axiosInstance.get('/document-management/activities/', { params: { page_size: 200 } }).then((response) => response.data),
  });
  const activities = useMemo(() => (Array.isArray(data) ? data : data?.results || []), [data]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return activities.filter((row) => {
      if (action !== 'all' && row.action !== action) return false;
      if (!query) return true;
      return [row.document_title, row.user_name, row.action_display, ACTION_LABELS[row.action]]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [activities, action, search]);

  const count = (key) => activities.filter((row) => row.action === key).length;

  if (isLoading) return <Box sx={{ py: 9, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader
        icon={<HistoryIcon />}
        title="تاریخچه فعالیت اسناد"
        subtitle="ردپای حسابرسی ایجاد، ویرایش، نسخه‌بندی، دانلود، بایگانی و بازگردانی اسناد"
        badge={<Chip size="small" label={`${formatPersianNumber(activities.length)} رویداد`} sx={{ height: 23, fontWeight: 800, bgcolor: '#f5f3ff', color: '#7c3aed' }} />}
      />

      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={6} md={3}><KpiTile icon={HistoryIcon} label="کل رویدادها" value={formatPersianNumber(activities.length)} suffix="رویداد" color={DMS_ACCENT} /></Grid>
        <Grid item xs={6} md={3}><KpiTile icon={HistoryIcon} label="ایجاد و ویرایش" value={formatPersianNumber(count('create') + count('update'))} suffix="رویداد" color="#2563eb" /></Grid>
        <Grid item xs={6} md={3}><KpiTile icon={HistoryIcon} label="نسخه جدید" value={formatPersianNumber(count('new_version'))} suffix="رویداد" color="#7c3aed" /></Grid>
        <Grid item xs={6} md={3}><KpiTile icon={HistoryIcon} label="دانلود" value={formatPersianNumber(count('download'))} suffix="رویداد" color="#0f766e" /></Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: 1.25, mb: 1.5, borderRadius: '16px', border: '1px solid #e5edf1' }}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
          <TextField size="small" placeholder="جست‌وجو در سند، کاربر یا اقدام…" value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 17, color: MUTED, ml: 0.5 }} /> }}
            sx={{ minWidth: { xs: '100%', sm: 260 }, flex: 1 }} />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>نوع اقدام</InputLabel>
            <Select value={action} label="نوع اقدام" onChange={(event) => setAction(event.target.value)}>
              <MenuItem value="all">همه اقدامات</MenuItem>
              {Object.entries(ACTION_LABELS).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
            </Select>
          </FormControl>
          <Chip size="small" label={`${formatPersianNumber(filtered.length)} نتیجه`} sx={{ height: 23, fontSize: 8, bgcolor: SOFT_BG, color: MUTED }} />
        </Stack>
      </Paper>

      <SurfaceCard title="رویدادهای ثبت‌شده" icon={HistoryIcon} color="#7c3aed">
        <Paper elevation={0} sx={{ border: '1px solid #eef2f7', borderRadius: '10px', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead><TableRow>
              {['اقدام', 'سند', 'کاربر', 'تاریخ', 'جزئیات'].map((label) => <TableCell key={label} sx={{ fontSize: 8.5, fontWeight: 800, bgcolor: SOFT_BG }}>{label}</TableCell>)}
            </TableRow></TableHead>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell><Chip size="small" label={row.action_display || ACTION_LABELS[row.action] || row.action} sx={{ height: 19, fontSize: 7.6, bgcolor: '#f5f3ff', color: '#7c3aed' }} /></TableCell>
                  <TableCell sx={{ fontSize: 8.8, fontWeight: 700, color: INK }}>{row.document_title || '—'}</TableCell>
                  <TableCell sx={{ fontSize: 8.5, color: MUTED }}>{row.user_name || 'سیستم'}</TableCell>
                  <TableCell sx={{ fontSize: 8.2, color: MUTED }}>{toJalali(String(row.created_at || '').slice(0, 10))} · {toPersianDigits(String(row.created_at || '').slice(11, 16))}</TableCell>
                  <TableCell sx={{ fontSize: 8.2, color: MUTED }}>{formatDetails(row.details)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!filtered.length ? <Typography sx={{ p: 2.5, fontSize: 9, color: MUTED, textAlign: 'center' }}>رویدادی با این مشخصات پیدا نشد.</Typography> : null}
        </Paper>
      </SurfaceCard>
    </Box>
  );
};

const formatDetails = (details) => {
  if (!details || typeof details !== 'object') return '—';
  return Object.entries(details).map(([key, value]) => `${key}: ${value}`).join(' · ') || '—';
};

export default DocumentManagementActivityPage;
