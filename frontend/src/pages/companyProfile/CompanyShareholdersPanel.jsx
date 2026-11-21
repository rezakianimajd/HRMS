import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Grid, IconButton, LinearProgress, MenuItem, Stack, Switch,
  TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupsIcon from '@mui/icons-material/Groups';
import axiosInstance from '../../core/api/axiosConfig';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';
import { SOFT } from '../../core/components/settings/settingsUi';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import {
  ActiveChip, DialogSection, EntityDialog, Field, FormGrid, MoneyText,
  NumericField, SectionCard, SimpleTable, fieldSx,
} from './companyProfileUi';

const EMPTY = {
  shareholder_type: 'natural', name: '', national_id: '', registration_number: '',
  economic_code: '', representative_name: '', representative_national_id: '',
  share_percent: '', shares_count: '', investment_amount: '', start_date: '',
  end_date: '', sort_order: 0, note: '', is_active: true,
};
const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);
const clean = (form) => ({
  ...form,
  share_percent: form.share_percent === '' ? 0 : form.share_percent,
  shares_count: form.shares_count === '' ? 0 : form.shares_count,
  investment_amount: form.investment_amount === '' ? null : form.investment_amount,
  start_date: form.start_date || null,
  end_date: form.end_date || null,
  sort_order: Number(form.sort_order) || 0,
  is_active: Boolean(form.is_active),
});
const Metric = ({ label, value }) => (
  <Box sx={{ p: 1.1, border: '1px solid', borderColor: 'divider', borderRadius: '10px', bgcolor: alpha(SOFT.violet, 0.04) }}>
    <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary' }}>{label}</Typography>
    <Typography sx={{ fontSize: 15, fontWeight: 900 }}>{value}</Typography>
  </Box>
);

const CompanyShareholdersPanel = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ['company-shareholders'],
    queryFn: () => axiosInstance.get('/company-shareholders/').then((response) => response.data),
  });
  const rows = asList(data);
  const totalPercent = useMemo(() => rows.reduce((sum, row) => sum + Number(row.share_percent || 0), 0), [rows]);
  const totalShares = useMemo(() => rows.reduce((sum, row) => sum + Number(row.shares_count || 0), 0), [rows]);

  const save = useMutation({
    mutationFn: (payload) => (editingId
      ? axiosInstance.patch(`/company-shareholders/${editingId}/`, payload)
      : axiosInstance.post('/company-shareholders/', payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-shareholders'] });
      qc.invalidateQueries({ queryKey: ['company-profile'] });
      setOpen(false);
    },
  });
  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/company-shareholders/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-shareholders'] });
      qc.invalidateQueries({ queryKey: ['company-profile'] });
    },
  });

  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const openCreate = () => { setEditingId(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (row) => { setEditingId(row.id); setForm({ ...EMPTY, ...row }); setOpen(true); };

  const columns = [
    { key: 'name', label: 'سهام‌دار', render: (row) => (
      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 900 }}>{row.name}</Typography>
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
          {row.shareholder_type_display || row.shareholder_type}
        </Typography>
      </Box>
    ) },
    { key: 'national_id', label: 'کد ملی / شناسه ملی', render: (row) => toPersianDigits(row.national_id || '—') },
    { key: 'share_percent', label: 'درصد سهام', align: 'center', render: (row) => (
      <Typography sx={{ fontSize: 12, fontWeight: 900, color: SOFT.indigo }}>
        {toPersianDigits(Number(row.share_percent || 0).toLocaleString('en-US'))}٪
      </Typography>
    ) },
    { key: 'shares_count', label: 'تعداد سهام', align: 'center', render: (row) => formatPersianNumber(row.shares_count || 0) },
    { key: 'investment_amount', label: 'سرمایه‌گذاری', render: (row) => <MoneyText value={row.investment_amount} /> },
    { key: 'is_active', label: 'وضعیت', align: 'center', render: (row) => <ActiveChip active={row.is_active} /> },
    { key: 'actions', label: '', align: 'center', render: (row) => (
      <Stack direction="row" spacing={0.2} justifyContent="center">
        <Tooltip title="ویرایش"><IconButton size="small" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => {
          if (window.confirm(`حذف سهام‌دار «${row.name}»؟`)) remove.mutate(row.id);
        }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
      </Stack>
    ) },
  ];

  return (
    <SectionCard icon={<GroupsIcon />} title="سهام‌داران" color={SOFT.violet}
      subtitle="ترکیب سهام، درصد مالکیت و اطلاعات هویتی سهام‌داران حقیقی و حقوقی"
      action={<Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}
        sx={{ bgcolor: SOFT.violet, boxShadow: 'none' }}>سهام‌دار جدید</Button>}>
      <Grid container spacing={1.25} sx={{ mb: 1.5 }}>
        <Grid item xs={12} sm={4}><Metric label="تعداد سهام‌داران" value={formatPersianNumber(rows.length)} /></Grid>
        <Grid item xs={12} sm={4}><Metric label="جمع درصد سهام" value={`${toPersianDigits(totalPercent.toLocaleString('en-US'))}٪`} /></Grid>
        <Grid item xs={12} sm={4}><Metric label="جمع تعداد سهام" value={formatPersianNumber(totalShares)} /></Grid>
      </Grid>
      <Box sx={{ mb: 1.5 }}>
        <LinearProgress variant="determinate" value={Math.min(100, totalPercent)}
          sx={{ height: 7, borderRadius: 4, bgcolor: alpha(SOFT.violet, 0.14),
            '& .MuiLinearProgress-bar': { bgcolor: totalPercent > 100 ? '#be123c' : SOFT.violet } }} />
        {totalPercent > 100 ? (
          <Typography sx={{ fontSize: 10.5, color: '#be123c', mt: 0.5, fontWeight: 800 }}>
            جمع درصد سهام بیش از ۱۰۰٪ است؛ لطفاً سهام‌داران را اصلاح کنید.
          </Typography>
        ) : null}
      </Box>
      <SimpleTable columns={columns} rows={rows} rowKey={(row) => row.id}
        emptyText={isLoading ? 'در حال بارگذاری…' : 'هنوز سهام‌داری ثبت نشده است.'} minWidth={900} />

      <EntityDialog open={open} onClose={() => setOpen(false)} saving={save.isPending}
        title={editingId ? 'ویرایش سهام‌دار' : 'ثبت سهام‌دار جدید'}
        subtitle="اطلاعات هویتی، درصد مالکیت و سابقهٔ سهامداری را دقیق وارد کنید."
        onSubmit={() => save.mutate(clean(form))}>
        <DialogSection title="هویت سهام‌دار">
          <FormGrid>
            <Grid item xs={12} md={4}>
              <TextField select size="small" fullWidth sx={fieldSx} label="نوع سهام‌دار"
                value={form.shareholder_type} onChange={(event) => set('shareholder_type', event.target.value)}>
                <MenuItem value="natural">شخص حقیقی</MenuItem>
                <MenuItem value="legal">شخص حقوقی</MenuItem>
                <MenuItem value="institutional">نهاد / سرمایه‌گذار</MenuItem>
              </TextField>
            </Grid>
            <Field label="نام سهام‌دار" value={form.name} onChange={(value) => set('name', value)} md={8} />
            <Field label="کد ملی / شناسه ملی" value={form.national_id} onChange={(value) => set('national_id', value)} />
            <Field label="شماره ثبت" value={form.registration_number} onChange={(value) => set('registration_number', value)} />
            <Field label="کد اقتصادی" value={form.economic_code} onChange={(value) => set('economic_code', value)} />
            <Field label="نام نماینده" value={form.representative_name} onChange={(value) => set('representative_name', value)} />
            <Field label="کد ملی نماینده" value={form.representative_national_id} onChange={(value) => set('representative_national_id', value)} />
          </FormGrid>
        </DialogSection>
        <DialogSection title="سهام و سرمایه‌گذاری">
          <FormGrid>
            <NumericField label="درصد سهام" value={form.share_percent} onChange={(value) => set('share_percent', value)} />
            <NumericField label="تعداد سهام" value={form.shares_count} onChange={(value) => set('shares_count', value)} />
            <NumericField label="مبلغ سرمایه‌گذاری (ریال)" value={form.investment_amount} onChange={(value) => set('investment_amount', value)} />
            <Grid item xs={12} md={4}><JalaliDatePicker fullWidth sx={fieldSx} label="تاریخ شروع سهامداری"
              value={form.start_date || ''} onChange={(value) => set('start_date', value)} /></Grid>
            <Grid item xs={12} md={4}><JalaliDatePicker fullWidth sx={fieldSx} label="تاریخ پایان سهامداری"
              value={form.end_date || ''} onChange={(value) => set('end_date', value)} /></Grid>
            <NumericField label="ترتیب نمایش" value={form.sort_order} onChange={(value) => set('sort_order', value)} />
            <Grid item xs={12} md={4}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ height: 40 }}>
                <Switch checked={Boolean(form.is_active)} onChange={(event) => set('is_active', event.target.checked)} />
                <Typography sx={{ fontSize: 12 }}>سهام‌دار فعال است</Typography>
              </Stack>
            </Grid>
            <Grid item xs={12}><TextField size="small" fullWidth sx={fieldSx} multiline rows={2} label="یادداشت"
              value={form.note || ''} onChange={(event) => set('note', event.target.value)} /></Grid>
          </FormGrid>
        </DialogSection>
      </EntityDialog>
    </SectionCard>
  );
};

export default CompanyShareholdersPanel;
