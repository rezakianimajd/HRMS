/** بخش نمایشی صفحهٔ تأمین‌کنندگان (پوستهٔ استودیو تم). */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../core/api/axiosConfig';
import { Box, Button, CircularProgress, MenuItem, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BlockIcon from '@mui/icons-material/Block';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { DialogShell, Field, FormGrid, digits, money, num, useList } from './procurementUi';
import { StudioCard, StudioChip, StudioHeader, StudioKpi, studioTableSx, useProcurementStudio } from './procurementStudioUi';

const STATUS_OPTIONS = [
  { value: 'active', label: 'فعال' },
  { value: 'inactive', label: 'غیرفعال' },
  { value: 'blacklisted', label: 'لیست سیاه' },
];
const STATUS_COLOR = { active: '#0f766e', inactive: '#64748b', blacklisted: '#be123c' };

const EMPTY = {
  code: '', name: '', category: '', national_id: '', economic_code: '', registration_number: '',
  postal_code: '', tax_id: '', phone: '', mobile: '', email: '', address: '', contact_person: '',
  bank_name: '', account_number: '', sheba_number: '', credit_limit: '', payment_terms: '',
  rating: '0', status: 'active', description: '',
};

export const ProcurementSuppliersStudio = () => {
  const studio = useProcurementStudio();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const suppliers = useList('/procurement/suppliers/', { page_size: 500 });
  const profiles = useList('/procurement/supplier-profiles/', { page_size: 500 });
  const categories = useList('/procurement/supplier-categories/', { page_size: 200 });

  const financial = useMemo(() => {
    const map = {};
    (profiles.rows || []).forEach((row) => { map[row.id] = row; });
    return map;
  }, [profiles.rows]);

  const rows = useMemo(() => (suppliers.rows || []).map((row) => ({
    ...row,
    finance: financial[row.id] || {},
    categoryLabel: (categories.rows || []).find((item) => item.id === row.category)?.name || '—',
  })), [suppliers.rows, financial, categories.rows]);

  const filtered = rows.filter((row) => {
    if (statusFilter && row.status !== statusFilter) return false;
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [row.name, row.code, row.national_id, row.economic_code, row.phone, row.mobile,
      row.email, row.contact_person].some(
      (value) => String(value || '').toLowerCase().includes(query),
    );
  });

  const totals = filtered.reduce((acc, row) => ({
    active: acc.active + (row.status === 'active' ? 1 : 0),
    blacklisted: acc.blacklisted + (row.status === 'blacklisted' ? 1 : 0),
    invoices: acc.invoices + num(row.finance.invoices_total),
    balance: acc.balance + num(row.finance.invoices_balance),
    guarantees: acc.guarantees + num(row.finance.guarantees_total),
  }), { active: 0, blacklisted: 0, invoices: 0, balance: 0, guarantees: 0 });

  const categoryOptions = (categories.rows || []).map((row) => ({ value: row.id, label: row.name }));

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(''); setOpen(true); };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      ...EMPTY,
      ...Object.keys(EMPTY).reduce((acc, key) => {
        const value = row[key];
        acc[key] = value === null || value === undefined ? EMPTY[key] : String(value);
        return acc;
      }, {}),
    });
    setError('');
    setOpen(true);
  };

  const submit = () => {
    setError('');
    if (!form.name.trim()) { setError('نام تأمین‌کننده الزامی است.'); return; }
    if (!form.code.trim()) { setError('کد تأمین‌کننده الزامی است.'); return; }
    const payload = {
      ...form,
      category: form.category || null,
      credit_limit: form.credit_limit === '' ? null : num(form.credit_limit),
      rating: num(form.rating),
    };
    setSaving(true);
    const request = editing
      ? axiosInstance.patch(`/procurement/suppliers/${editing.id}/`, payload)
      : axiosInstance.post('/procurement/suppliers/', payload);
    request
      .then(() => { setOpen(false); suppliers.reload(); profiles.reload(); })
      .catch((err) => setError(err?.response?.data?.detail || 'ذخیرهٔ تأمین‌کننده ناموفق بود.'))
      .finally(() => setSaving(false));
  };

  const remove = (row) => {
    if (!window.confirm(`حذف تأمین‌کننده «${row.name}»؟`)) return;
    axiosInstance.delete(`/procurement/suppliers/${row.id}/`)
      .then(() => { suppliers.reload(); profiles.reload(); })
      .catch((err) => setError(err?.response?.data?.detail || 'حذف ناموفق بود.'));
  };

  const toggleStatus = (row) => {
    const next = row.status === 'blacklisted' ? 'active' : 'blacklisted';
    axiosInstance.patch(`/procurement/suppliers/${row.id}/`, { status: next })
      .then(suppliers.reload)
      .catch((err) => setError(err?.response?.data?.detail || 'تغییر وضعیت ناموفق بود.'));
  };

  return (
    <Box>
      <StudioHeader icon={<StorefrontIcon />} title="تأمین‌کنندگان"
        subtitle="طرف حساب‌های خرید: اطلاعات قانونی، بانکی، اعتباری و خلاصهٔ مالی هر تأمین‌کننده"
        actions={(
          <Stack direction="row" spacing={1}>
            <TextField size="small" placeholder="جست‌وجو…" value={search}
              onChange={(event) => setSearch(event.target.value)} sx={{ width: 200 }} />
            <TextField size="small" select label="وضعیت" value={statusFilter} sx={{ width: 130 }}
              onChange={(event) => setStatusFilter(event.target.value)}>
              <MenuItem value="">همه</MenuItem>
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
            <Button variant="contained" size="small" startIcon={<AddIcon fontSize="small" />}
              onClick={openCreate} sx={{ bgcolor: studio.accent }}>تأمین‌کننده جدید</Button>
          </Stack>
        )} />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 1.5, mb: 1.5 }}>
        <StudioKpi label="تأمین‌کنندگان" value={digits(filtered.length)}
          hint={`فعال: ${digits(totals.active)}`} icon={StorefrontIcon} color={studio.accent} />
        <StudioKpi label="مبلغ فاکتورها" value={money(totals.invoices)} color="#0f766e" />
        <StudioKpi label="مانده پرداخت‌نشده" value={money(totals.balance)} color="#b45309" />
        <StudioKpi label="تضامین خرید" value={money(totals.guarantees)}
          hint={`لیست سیاه: ${digits(totals.blacklisted)}`} color="#8b5cf6" />
      </Box>

      {error || suppliers.error ? (
        <Typography sx={{ color: 'error.main', fontSize: 12, mb: 1 }}>{error || suppliers.error}</Typography>
      ) : null}

      <StudioCard padding={0}>
        {suppliers.loading ? (
          <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress size={22} /></Stack>
        ) : (
          <Table size="small" sx={studioTableSx(studio)}>
            <TableHead>
              <TableRow>
                <TableCell>کد</TableCell>
                <TableCell>نام / عنوان</TableCell>
                <TableCell>دسته</TableCell>
                <TableCell>شناسه / تماس</TableCell>
                <TableCell align="center">امتیاز</TableCell>
                <TableCell>فاکتورها</TableCell>
                <TableCell>مانده</TableCell>
                <TableCell align="center">وضعیت</TableCell>
                <TableCell align="center">عملیات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{digits(row.code || '—')}</TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>{row.name}</Typography>
                    <Typography sx={{ fontSize: 10.5, color: studio.muted }}>
                      {row.contact_person || row.email || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.categoryLabel}</TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 11.5 }}>{digits(row.phone || row.mobile || '—')}</Typography>
                    <Typography sx={{ fontSize: 10.5, color: studio.muted }}>
                      {digits(row.national_id || '—')}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{digits(row.rating || 0)}</TableCell>
                  <TableCell>{money(row.finance.invoices_total || 0)}</TableCell>
                  <TableCell>{money(row.finance.invoices_balance || 0)}</TableCell>
                  <TableCell align="center">
                    <StudioChip
                      label={(STATUS_OPTIONS.find((item) => item.value === row.status) || {}).label || row.status}
                      color={STATUS_COLOR[row.status]} />
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.25} justifyContent="center">
                      <Tooltip title="پرونده خرید">
                        <span>
                          <Button size="small"
                            onClick={() => navigate(`/procurement/supplier-profile?supplier=${row.id}`)}
                            sx={{ fontSize: 11 }}>پرونده</Button>
                        </span>
                      </Tooltip>
                      <Tooltip title="ویرایش">
                        <span>
                          <Button size="small" onClick={() => openEdit(row)} sx={{ fontSize: 11 }}>ویرایش</Button>
                        </span>
                      </Tooltip>
                      <Tooltip title="لیست سیاه / بازگشت">
                        <span>
                          <Button size="small" onClick={() => toggleStatus(row)} sx={{ fontSize: 11 }}>وضعیت</Button>
                        </span>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <span>
                          <Button size="small" color="error" onClick={() => remove(row)}
                            sx={{ fontSize: 11 }}>حذف</Button>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: studio.muted }}>
                    تأمین‌کننده‌ای یافت نشد.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}
      </StudioCard>

      <DialogShell open={open} title={editing ? 'ویرایش تأمین‌کننده' : 'ثبت تأمین‌کننده'} maxWidth="md"
        onClose={() => setOpen(false)} onSubmit={submit} loading={saving} error={error}>
        <FormGrid>
          <Field size={5} label="نام / عنوان" required value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          <Field size={3} label="کد" required value={form.code}
            onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} />
          <Field size={4} label="دسته" select options={categoryOptions} value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} />
          <Field size={4} label="شناسه ملی / کد ثبت" value={form.national_id}
            onChange={(event) => setForm((prev) => ({ ...prev, national_id: event.target.value }))} />
          <Field size={4} label="کد اقتصادی" value={form.economic_code}
            onChange={(event) => setForm((prev) => ({ ...prev, economic_code: event.target.value }))} />
          <Field size={4} label="شماره ثبت" value={form.registration_number}
            onChange={(event) => setForm((prev) => ({ ...prev, registration_number: event.target.value }))} />
          <Field size={4} label="شناسه مالیاتی" value={form.tax_id}
            onChange={(event) => setForm((prev) => ({ ...prev, tax_id: event.target.value }))} />
          <Field size={4} label="کد پستی" value={form.postal_code}
            onChange={(event) => setForm((prev) => ({ ...prev, postal_code: event.target.value }))} />
          <Field size={4} label="وضعیت" select options={STATUS_OPTIONS} value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))} />
          <Field size={4} label="تلفن" value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
          <Field size={4} label="موبایل" value={form.mobile}
            onChange={(event) => setForm((prev) => ({ ...prev, mobile: event.target.value }))} />
          <Field size={4} label="ایمیل" value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
          <Field size={4} label="شخص رابط" value={form.contact_person}
            onChange={(event) => setForm((prev) => ({ ...prev, contact_person: event.target.value }))} />
          <Field size={4} label="بانک" value={form.bank_name}
            onChange={(event) => setForm((prev) => ({ ...prev, bank_name: event.target.value }))} />
          <Field size={4} label="شماره حساب" value={form.account_number}
            onChange={(event) => setForm((prev) => ({ ...prev, account_number: event.target.value }))} />
          <Field size={4} label="شماره شبا" value={form.sheba_number}
            onChange={(event) => setForm((prev) => ({ ...prev, sheba_number: event.target.value }))} />
          <Field size={4} label="سقف اعتبار (ریال)" type="number" value={form.credit_limit}
            onChange={(event) => setForm((prev) => ({ ...prev, credit_limit: event.target.value }))} />
          <Field size={4} label="شرایط پرداخت" value={form.payment_terms}
            onChange={(event) => setForm((prev) => ({ ...prev, payment_terms: event.target.value }))} />
          <Field size={4} label="امتیاز (۰-۵)" type="number" value={form.rating}
            onChange={(event) => setForm((prev) => ({ ...prev, rating: event.target.value }))} />
          <Field size={12} label="آدرس" value={form.address}
            onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} />
          <Field size={12} label="توضیحات" value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
        </FormGrid>
        {editing ? (
          <Typography sx={{ mt: 1.5, fontSize: 11.5, color: 'text.secondary' }}>
            فاکتورها {money(editing.finance?.invoices_total || 0)} · مانده{' '}
            {money(editing.finance?.invoices_balance || 0)} · تضامین{' '}
            {money(editing.finance?.guarantees_total || 0)}
          </Typography>
        ) : null}
      </DialogShell>
    </Box>
  );
};

export default ProcurementSuppliersStudio;

