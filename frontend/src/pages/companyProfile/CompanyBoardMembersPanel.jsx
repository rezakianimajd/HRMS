import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Grid, IconButton, MenuItem, Stack, Switch, TextField,
  Tooltip, Typography, alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import axiosInstance from '../../core/api/axiosConfig';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';
import { SOFT } from '../../core/components/settings/settingsUi';
import { toPersianDigits } from '../../core/utils/numberUtils';
import {
  ActiveChip, DialogSection, EntityDialog, Field, FormGrid, NumericField,
  SectionCard, SimpleTable, fieldSx,
} from './companyProfileUi';

const EMPTY = {
  full_name: '', position: '', membership_type: 'non_executive', national_id: '',
  appointment_date: '', end_date: '', share_percent: '', has_signature_authority: false,
  sort_order: 0, note: '', is_active: true,
};
const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);
const clean = (form) => ({
  ...form,
  appointment_date: form.appointment_date || null,
  end_date: form.end_date || null,
  share_percent: form.share_percent === '' ? null : form.share_percent,
  sort_order: Number(form.sort_order) || 0,
  is_active: Boolean(form.is_active),
  has_signature_authority: Boolean(form.has_signature_authority),
});

const CompanyBoardMembersPanel = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const { data, isLoading } = useQuery({
    queryKey: ['company-board-members'],
    queryFn: () => axiosInstance.get('/company-board-members/').then((response) => response.data),
  });
  const rows = asList(data);
  const save = useMutation({
    mutationFn: (payload) => (editingId
      ? axiosInstance.patch(`/company-board-members/${editingId}/`, payload)
      : axiosInstance.post('/company-board-members/', payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-board-members'] });
      qc.invalidateQueries({ queryKey: ['company-profile'] });
      setOpen(false);
    },
  });
  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/company-board-members/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-board-members'] });
      qc.invalidateQueries({ queryKey: ['company-profile'] });
    },
  });
  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const openCreate = () => { setEditingId(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (row) => { setEditingId(row.id); setForm({ ...EMPTY, ...row }); setOpen(true); };

  const columns = [
    { key: 'full_name', label: 'عضو هیئت مدیره', render: (row) => (
      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 900 }}>{row.full_name}</Typography>
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>{row.position}</Typography>
      </Box>
    ) },
    { key: 'membership_type', label: 'نوع عضویت', render: (row) => row.membership_type_display || row.membership_type },
    { key: 'national_id', label: 'کد ملی', render: (row) => toPersianDigits(row.national_id || '—') },
    { key: 'appointment_date', label: 'انتصاب', render: (row) => toPersianDigits(row.appointment_date || '—') },
    { key: 'has_signature_authority', label: 'حق امضا', align: 'center', render: (row) => (
      row.has_signature_authority
        ? <Typography sx={{ fontSize: 11, fontWeight: 900, color: SOFT.green }}>دارد</Typography>
        : <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>—</Typography>
    ) },
    { key: 'is_active', label: 'وضعیت', align: 'center', render: (row) => <ActiveChip active={row.is_active} /> },
    { key: 'actions', label: '', align: 'center', render: (row) => (
      <Stack direction="row" spacing={0.2} justifyContent="center">
        <IconButton size="small" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton>
        <IconButton size="small" color="error" onClick={() => {
          if (window.confirm(`حذف «${row.full_name}» از هیئت مدیره؟`)) remove.mutate(row.id);
        }}><DeleteIcon fontSize="small" /></IconButton>
      </Stack>
    ) },
  ];

  return (
    <SectionCard icon={<AccountTreeIcon />} title="هیئت مدیره" color={SOFT.blue}
      subtitle="اعضای هیئت مدیره، بازرسان، نوع عضویت، دورهٔ مسئولیت و حق امضا"
      action={<Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}
        sx={{ bgcolor: SOFT.blue, boxShadow: 'none' }}>عضو جدید</Button>}>
      <SimpleTable columns={columns} rows={rows} rowKey={(row) => row.id}
        emptyText={isLoading ? 'در حال بارگذاری…' : 'هنوز عضوی برای هیئت مدیره ثبت نشده است.'} minWidth={900} />

      <EntityDialog open={open} onClose={() => setOpen(false)} saving={save.isPending}
        title={editingId ? 'ویرایش عضو هیئت مدیره' : 'افزودن عضو هیئت مدیره'}
        subtitle="سمت، نوع عضویت و دورهٔ مسئولیت را مطابق اساسنامه ثبت کنید."
        onSubmit={() => save.mutate(clean(form))}>
        <DialogSection title="مشخصات عضو">
          <FormGrid>
            <Field label="نام و نام خانوادگی" value={form.full_name} onChange={(value) => set('full_name', value)} md={8} />
            <Field label="سمت در هیئت مدیره" value={form.position} onChange={(value) => set('position', value)} md={4} />
            <Grid item xs={12} md={4}>
              <TextField select size="small" fullWidth sx={fieldSx} label="نوع عضویت"
                value={form.membership_type} onChange={(event) => set('membership_type', event.target.value)}>
                <MenuItem value="executive">اجرایی</MenuItem>
                <MenuItem value="non_executive">غیراجرایی</MenuItem>
                <MenuItem value="independent">مستقل</MenuItem>
              </TextField>
            </Grid>
            <Field label="کد ملی" value={form.national_id} onChange={(value) => set('national_id', value)} />
            <Grid item xs={12} md={4}><JalaliDatePicker fullWidth sx={fieldSx} label="تاریخ انتصاب"
              value={form.appointment_date || ''} onChange={(value) => set('appointment_date', value)} /></Grid>
            <Grid item xs={12} md={4}><JalaliDatePicker fullWidth sx={fieldSx} label="پایان دوره"
              value={form.end_date || ''} onChange={(value) => set('end_date', value)} /></Grid>
            <NumericField label="درصد سهام (اختیاری)" value={form.share_percent} onChange={(value) => set('share_percent', value)} />
            <NumericField label="ترتیب نمایش" value={form.sort_order} onChange={(value) => set('sort_order', value)} />
            <Grid item xs={12} md={4}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ height: 40 }}>
                <Switch checked={Boolean(form.has_signature_authority)}
                  onChange={(event) => set('has_signature_authority', event.target.checked)} />
                <Typography sx={{ fontSize: 12 }}>حق امضا دارد</Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ height: 40 }}>
                <Switch checked={Boolean(form.is_active)} onChange={(event) => set('is_active', event.target.checked)} />
                <Typography sx={{ fontSize: 12 }}>عضو فعال است</Typography>
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

export default CompanyBoardMembersPanel;
