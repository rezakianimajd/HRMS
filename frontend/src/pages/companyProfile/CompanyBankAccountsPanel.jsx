import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Grid, IconButton, MenuItem, Stack, Switch, TextField,
  Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import axiosInstance from '../../core/api/axiosConfig';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';
import { SOFT } from '../../core/components/settings/settingsUi';
import { toPersianDigits } from '../../core/utils/numberUtils';
import {
  ActiveChip, DialogSection, EntityDialog, Field, FormGrid,
  NumericField, SectionCard, SimpleTable, fieldSx,
} from './companyProfileUi';

const EMPTY = {
  title: '', bank_name: '', branch_name: '', branch_code: '', account_number: '',
  iban: '', card_number: '', account_type: 'current', currency: '', swift_code: '',
  holder_name: '', opening_date: '', is_official: false, sort_order: 0, note: '', is_active: true,
};
const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);
const clean = (form) => ({
  ...form,
  currency: form.currency || null,
  opening_date: form.opening_date || null,
  sort_order: Number(form.sort_order) || 0,
  is_official: Boolean(form.is_official),
  is_active: Boolean(form.is_active),
});

const CompanyBankAccountsPanel = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const { data, isLoading } = useQuery({
    queryKey: ['company-bank-accounts'],
    queryFn: () => axiosInstance.get('/company-bank-accounts/').then((response) => response.data),
  });
  const { data: currencies } = useQuery({
    queryKey: ['currencies-company-profile'],
    queryFn: () => axiosInstance.get('/currencies/').then((response) => response.data),
  });
  const rows = asList(data);
  const currencyList = asList(currencies);

  const save = useMutation({
    mutationFn: (payload) => (editingId
      ? axiosInstance.patch(`/company-bank-accounts/${editingId}/`, payload)
      : axiosInstance.post('/company-bank-accounts/', payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-bank-accounts'] });
      qc.invalidateQueries({ queryKey: ['company-profile'] });
      setOpen(false);
    },
  });
  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/company-bank-accounts/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-bank-accounts'] });
      qc.invalidateQueries({ queryKey: ['company-profile'] });
    },
  });
  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const openCreate = () => { setEditingId(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (row) => { setEditingId(row.id); setForm({ ...EMPTY, ...row }); setOpen(true); };

  const columns = [
    { key: 'bank_name', label: 'بانک / حساب', render: (row) => (
      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 900 }}>{row.bank_name}</Typography>
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
          {row.account_type_display || row.account_type || '—'} {row.is_official ? ' · حساب رسمی' : ''}
        </Typography>
      </Box>
    ) },
    { key: 'branch_name', label: 'شعبه', render: (row) => `${row.branch_name || '—'}${row.branch_code ? ` (${toPersianDigits(row.branch_code)})` : ''}` },
    { key: 'account_number', label: 'شماره حساب', render: (row) => toPersianDigits(row.account_number || '—') },
    { key: 'iban', label: 'شبا', render: (row) => <Typography sx={{ fontSize: 11, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>{toPersianDigits(row.iban || '—')}</Typography> },
    { key: 'currency_name', label: 'ارز', align: 'center', render: (row) => row.currency_name || row.currency_code || 'ریال' },
    { key: 'is_official', label: 'رسمی', align: 'center', render: (row) => (
      row.is_official
        ? <Typography sx={{ fontSize: 11, fontWeight: 900, color: SOFT.green }}>رسمی</Typography>
        : <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>—</Typography>
    ) },
    { key: 'is_active', label: 'وضعیت', align: 'center', render: (row) => <ActiveChip active={row.is_active} /> },
    { key: 'actions', label: '', align: 'center', render: (row) => (
      <Stack direction="row" spacing={0.2} justifyContent="center">
        <IconButton size="small" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton>
        <IconButton size="small" color="error" onClick={() => {
          if (window.confirm(`حذف حساب «${row.bank_name}»؟`)) remove.mutate(row.id);
        }}><DeleteIcon fontSize="small" /></IconButton>
      </Stack>
    ) },
  ];

  return (
    <SectionCard icon={<AccountBalanceIcon />} title="حساب‌های بانکی شرکت" color={SOFT.green}
      subtitle="حساب رسمی، شبا، شماره حساب، کارت، شعبه و ارز — برای اسناد رسمی و پرداخت‌ها"
      action={<Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}
        sx={{ bgcolor: SOFT.green, boxShadow: 'none' }}>حساب جدید</Button>}>
      <SimpleTable columns={columns} rows={rows} rowKey={(row) => row.id}
        emptyText={isLoading ? 'در حال بارگذاری…' : 'هنوز حساب بانکی ثبت نشده است.'} minWidth={1000} />

      <EntityDialog open={open} onClose={() => setOpen(false)} saving={save.isPending}
        title={editingId ? 'ویرایش حساب بانکی' : 'ثبت حساب بانکی جدید'}
        subtitle="حساب رسمی شرکت را مشخص کنید تا در اسناد و مکاتبات رسمی استفاده شود."
        onSubmit={() => save.mutate(clean(form))}>
        <DialogSection title="مشخصات حساب">
          <FormGrid>
            <Field label="عنوان حساب" value={form.title} onChange={(value) => set('title', value)} md={8} />
            <Grid item xs={12} md={4}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ height: 40 }}>
                <Switch checked={Boolean(form.is_official)} onChange={(event) => set('is_official', event.target.checked)} />
                <Typography sx={{ fontSize: 12 }}>حساب رسمی شرکت</Typography>
              </Stack>
            </Grid>
            <Field label="نام بانک" value={form.bank_name} onChange={(value) => set('bank_name', value)} />
            <Field label="نام شعبه" value={form.branch_name} onChange={(value) => set('branch_name', value)} />
            <Field label="کد شعبه" value={form.branch_code} onChange={(value) => set('branch_code', value)} />
            <Field label="شماره حساب" value={form.account_number} onChange={(value) => set('account_number', value)} />
            <Field label="شماره شبا (IBAN)" value={form.iban} onChange={(value) => set('iban', value.toUpperCase())} />
            <Field label="شماره کارت" value={form.card_number} onChange={(value) => set('card_number', value)} />
            <Grid item xs={12} md={4}>
              <TextField select size="small" fullWidth sx={fieldSx} label="نوع حساب"
                value={form.account_type} onChange={(event) => set('account_type', event.target.value)}>
                <MenuItem value="current">جاری</MenuItem>
                <MenuItem value="savings">پس‌انداز</MenuItem>
                <MenuItem value="foreign_currency">ارزی</MenuItem>
                <MenuItem value="deposit">سپرده</MenuItem>
                <MenuItem value="other">سایر</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select size="small" fullWidth sx={fieldSx} label="ارز حساب"
                value={form.currency || ''} onChange={(event) => set('currency', event.target.value)}>
                <MenuItem value="">ریال (پیش‌فرض)</MenuItem>
                {currencyList.map((currency) => (
                  <MenuItem key={currency.id} value={currency.id}>{currency.name} ({currency.code})</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Field label="کد SWIFT" value={form.swift_code} onChange={(value) => set('swift_code', value)} />
            <Field label="نام صاحب حساب" value={form.holder_name} onChange={(value) => set('holder_name', value)} />
            <Grid item xs={12} md={4}><JalaliDatePicker fullWidth sx={fieldSx} label="تاریخ افتتاح"
              value={form.opening_date || ''} onChange={(value) => set('opening_date', value)} /></Grid>
            <NumericField label="ترتیب نمایش" value={form.sort_order} onChange={(value) => set('sort_order', value)} />
            <Grid item xs={12} md={4}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ height: 40 }}>
                <Switch checked={Boolean(form.is_active)} onChange={(event) => set('is_active', event.target.checked)} />
                <Typography sx={{ fontSize: 12 }}>حساب فعال است</Typography>
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

export default CompanyBankAccountsPanel;
