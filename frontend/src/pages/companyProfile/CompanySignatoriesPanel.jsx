import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Grid, IconButton, Stack, Switch, TextField, Tooltip,
  Typography, alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DrawIcon from '@mui/icons-material/Draw';
import axiosInstance from '../../core/api/axiosConfig';
import { SOFT } from '../../core/components/settings/settingsUi';
import { toPersianDigits } from '../../core/utils/numberUtils';
import {
  ActiveChip, DialogSection, EntityDialog, Field, FormGrid,
  NumericField, SectionCard, SimpleTable, fieldSx,
} from './companyProfileUi';

const EMPTY = {
  full_name: '', position: '', national_id: '', mobile: '', email: '',
  signature_order: 0, is_default: false, can_sign_contracts: true,
  can_sign_financial: true, note: '', is_active: true, signature_image: null,
};
const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

const buildFormData = (form) => {
  const data = new FormData();
  Object.entries(form).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (key === 'signature_image') {
      if (value instanceof File) data.append(key, value);
      return;
    }
    if (typeof value === 'boolean') data.append(key, value ? 'true' : 'false');
    else data.append(key, value);
  });
  return data;
};

const CompanySignatoriesPanel = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const { data, isLoading } = useQuery({
    queryKey: ['signatories'],
    queryFn: () => axiosInstance.get('/signatories/').then((response) => response.data),
  });
  const rows = asList(data);

  const save = useMutation({
    mutationFn: (payload) => (editingId
      ? axiosInstance.patch(`/signatories/${editingId}/`, payload, { headers: { 'Content-Type': 'multipart/form-data' } })
      : axiosInstance.post('/signatories/', payload, { headers: { 'Content-Type': 'multipart/form-data' } })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signatories'] });
      qc.invalidateQueries({ queryKey: ['company-profile'] });
      setOpen(false);
    },
  });
  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/signatories/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signatories'] });
      qc.invalidateQueries({ queryKey: ['company-profile'] });
    },
  });
  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const openCreate = () => { setEditingId(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (row) => { setEditingId(row.id); setForm({ ...EMPTY, ...row, signature_image: null }); setOpen(true); };

  const columns = [
    { key: 'full_name', label: 'صاحب امضا', render: (row) => (
      <Stack direction="row" spacing={1} alignItems="center">
        <Box sx={{ width: 38, height: 38, borderRadius: '9px', overflow: 'hidden', bgcolor: alpha(SOFT.indigo, 0.08), display: 'grid', placeItems: 'center' }}>
          {row.signature_image_url
            ? <Box component="img" src={row.signature_image_url} alt="امضا" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <DrawIcon sx={{ fontSize: 19, color: SOFT.indigo }} />}
        </Box>
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 900 }}>{row.full_name}</Typography>
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>{row.position || '—'}</Typography>
        </Box>
      </Stack>
    ) },
    { key: 'national_id', label: 'کد ملی', render: (row) => toPersianDigits(row.national_id || '—') },
    { key: 'mobile', label: 'موبایل', render: (row) => toPersianDigits(row.mobile || '—') },
    { key: 'authority', label: 'دامنهٔ امضا', render: (row) => (
      <Typography sx={{ fontSize: 11 }}>
        {[row.can_sign_contracts ? 'قرارداد' : null, row.can_sign_financial ? 'مالی' : null].filter(Boolean).join(' / ') || '—'}
      </Typography>
    ) },
    { key: 'is_default', label: 'پیش‌فرض', align: 'center', render: (row) => (
      row.is_default ? <Typography sx={{ fontSize: 11, fontWeight: 900, color: SOFT.green }}>پیش‌فرض</Typography> : '—'
    ) },
    { key: 'is_active', label: 'وضعیت', align: 'center', render: (row) => <ActiveChip active={row.is_active} /> },
    { key: 'actions', label: '', align: 'center', render: (row) => (
      <Stack direction="row" spacing={0.2} justifyContent="center">
        <IconButton size="small" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton>
        <IconButton size="small" color="error" onClick={() => {
          if (window.confirm(`حذف صاحب امضا «${row.full_name}»؟`)) remove.mutate(row.id);
        }}><DeleteIcon fontSize="small" /></IconButton>
      </Stack>
    ) },
  ];

  return (
    <SectionCard icon={<DrawIcon />} title="صاحبان امضا" color={SOFT.amber}
      subtitle="می‌توانید چند نفر را با حق امضای مستقل ثبت کنید؛ هر رکورد دامنهٔ امضا و نمونهٔ امضای خودش را دارد."
      action={<Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}
        sx={{ bgcolor: SOFT.amber, boxShadow: 'none' }}>صاحب امضا جدید</Button>}>
      <SimpleTable columns={columns} rows={rows} rowKey={(row) => row.id}
        emptyText={isLoading ? 'در حال بارگذاری…' : 'هنوز صاحب امضایی ثبت نشده است.'} minWidth={980} />

      <EntityDialog open={open} onClose={() => setOpen(false)} saving={save.isPending}
        title={editingId ? 'ویرایش صاحب امضا' : 'افزودن صاحب امضا'}
        subtitle="برای دو یا چند نفر، هر نفر را به‌صورت یک رکورد جدا ثبت کنید."
        onSubmit={() => save.mutate(buildFormData(form))}>
        <DialogSection title="مشخصات صاحب امضا">
          <FormGrid>
            <Field label="نام و نام خانوادگی" value={form.full_name} onChange={(value) => set('full_name', value)} md={8} />
            <Field label="سمت / عنوان" value={form.position} onChange={(value) => set('position', value)} />
            <Field label="کد ملی" value={form.national_id} onChange={(value) => set('national_id', value)} />
            <Field label="موبایل" value={form.mobile} onChange={(value) => set('mobile', value)} />
            <Field label="ایمیل" value={form.email} onChange={(value) => set('email', value)} />
            <NumericField label="ترتیب امضا" value={form.signature_order} onChange={(value) => set('signature_order', value)} />
            <Grid item xs={12} md={4}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ height: 40 }}>
                <Switch checked={Boolean(form.is_default)} onChange={(event) => set('is_default', event.target.checked)} />
                <Typography sx={{ fontSize: 12 }}>امضای پیش‌فرض</Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ height: 40 }}>
                <Switch checked={Boolean(form.is_active)} onChange={(event) => set('is_active', event.target.checked)} />
                <Typography sx={{ fontSize: 12 }}>فعال است</Typography>
              </Stack>
            </Grid>
          </FormGrid>
        </DialogSection>
        <DialogSection title="دامنهٔ امضا">
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
            <Stack direction="row" alignItems="center" spacing={0.8}>
              <Switch checked={Boolean(form.can_sign_contracts)}
                onChange={(event) => set('can_sign_contracts', event.target.checked)} />
              <Typography sx={{ fontSize: 12 }}>مجاز به امضای قرارداد</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.8}>
              <Switch checked={Boolean(form.can_sign_financial)}
                onChange={(event) => set('can_sign_financial', event.target.checked)} />
              <Typography sx={{ fontSize: 12 }}>مجاز به امضای اسناد مالی</Typography>
            </Stack>
          </Stack>
        </DialogSection>
        <DialogSection title="نمونهٔ امضا و یادداشت">
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }}>
            <Box sx={{ width: 150, height: 72, borderRadius: '10px', border: '1px dashed', borderColor: 'divider', display: 'grid', placeItems: 'center', overflow: 'hidden', bgcolor: 'background.paper' }}>
              {form.signature_image || form.signature_image_url ? (
                <Box component="img" alt="نمونهٔ امضا"
                  src={form.signature_image instanceof File ? URL.createObjectURL(form.signature_image) : form.signature_image_url}
                  sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              ) : <DrawIcon sx={{ color: SOFT.amber }} />}
            </Box>
            <Button size="small" variant="outlined" component="label" sx={{ borderColor: alpha(SOFT.amber, 0.4), color: SOFT.amber }}>
              انتخاب تصویر امضا
              <input hidden type="file" accept="image/*"
                onChange={(event) => set('signature_image', event.target.files?.[0] || null)} />
            </Button>
          </Stack>
          <TextField size="small" fullWidth sx={{ ...fieldSx, mt: 1.5 }} multiline rows={2} label="یادداشت"
            value={form.note || ''} onChange={(event) => set('note', event.target.value)} />
        </DialogSection>
      </EntityDialog>
    </SectionCard>
  );
};

export default CompanySignatoriesPanel;
