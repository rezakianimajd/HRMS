/** تأمین‌کنندگان — چیدمان استاندارد ماژول: هدر، نوار جستجو، جدول در کارت. */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../core/api/axiosConfig';
import { Box, Button, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import BlockIcon from '@mui/icons-material/Block';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PageHeader from '../../core/components/ui/PageHeader';
import { printElement } from '../../core/print/printEngine';
import {
  ModulePager, ModuleTable, ModuleToolbar,
  useModuleTableState, useModuleTheme, useRowHeight,
} from '../contracts/contractModuleUi';
import { DialogShell, Field, FormGrid, digits, money, num, useList } from './procurementUi';

const STATUS_OPTIONS = [
  { value: 'active', label: 'فعال' },
  { value: 'inactive', label: 'غیرفعال' },
  { value: 'blacklisted', label: 'لیست سیاه' },
];
const STATUS_COLORS = { active: '#0f766e', inactive: '#64748b', blacklisted: '#be123c' };
const FILTER_OPTIONS = [{ value: 'all', label: 'همه' }, ...STATUS_OPTIONS];

const EMPTY = {
  code: '', name: '', category: '', national_id: '', economic_code: '', registration_number: '',
  postal_code: '', tax_id: '', phone: '', mobile: '', email: '', address: '', contact_person: '',
  bank_name: '', account_number: '', sheba_number: '', credit_limit: '', payment_terms: '',
  rating: '0', status: 'active', description: '',
};

const cardSx = {
  borderRadius: 'var(--hrms-table-radius, 16px)', border: '1px solid',
  borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 'none',
};

export const ProcurementSuppliersStudio = () => {
  const navigate = useNavigate();
  const moduleTheme = useModuleTheme();
  const themeTokens = moduleTheme.tableTheme || {};
  const tableFrameSx = themeTokens.frame
    ? { px: `${themeTokens.frameX}px`, py: `${themeTokens.frameY}px` }
    : { px: 1.25, py: 1.25 };
  const pageSize = themeTokens.rowsPerPage || 25;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
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

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = (suppliers.rows || []).map((row) => ({
      ...row,
      finance: financial[row.id] || {},
      categoryLabel: (categories.rows || []).find((item) => item.id === row.category)?.name || '—',
    }));
    result = result.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (!query) return true;
      return [row.name, row.code, row.national_id, row.economic_code, row.phone, row.mobile,
        row.email, row.contact_person].some(
        (value) => String(value || '').toLowerCase().includes(query),
      );
    });
    return [...result].sort((a, b) => {
      if (sortBy === 'amount') return num(b.finance.invoices_total) - num(a.finance.invoices_total);
      if (sortBy === 'balance') return num(b.finance.invoices_balance) - num(a.finance.invoices_balance);
      if (sortBy === 'code') return String(a.code).localeCompare(String(b.code), 'fa');
      return String(a.name).localeCompare(String(b.name), 'fa');
    });
  }, [suppliers.rows, financial, categories.rows, search, statusFilter, sortBy]);

  const { page, setPage, totalPages, pageNumbers } = useModuleTableState(
    rows.length, pageSize, [search, statusFilter, sortBy, pageSize],
  );
  const pagedRows = rows.slice(page * pageSize, page * pageSize + pageSize);
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(
    themeTokens, Math.max(1, pagedRows.length),
  );

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

  const activeChips = [
    statusFilter !== 'all'
      ? { label: `وضعیت: ${(STATUS_OPTIONS.find((item) => item.value === statusFilter) || {}).label}`, onDelete: () => setStatusFilter('all') }
      : null,
    search ? { label: `جستجو: ${search}`, onDelete: () => setSearch('') } : null,
  ].filter(Boolean);

  return (
    <Box>
      <PageHeader
        icon={<StorefrontIcon />}
        title="تأمین‌کنندگان"
        subtitle="طرف حساب‌های خرید: اطلاعات قانونی، بانکی، اعتباری و خلاصهٔ مالی هر تأمین‌کننده"
        actions={(
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" size="small" startIcon={<PrintOutlinedIcon fontSize="small" />}
              onClick={() => printElement('main', { title: 'تأمین‌کنندگان', orientation: 'landscape' })}>
              چاپ
            </Button>
            <Button variant="contained" size="small" startIcon={<AddIcon fontSize="small" />}
              onClick={openCreate}>تأمین‌کننده جدید</Button>
          </Stack>
        )}
      />

      <ModuleToolbar
        theme={moduleTheme}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="جستجو در نام، کد، شناسهٔ ملی یا تماس…"
        sort={sortBy}
        sortOptions={[
          { value: 'name', label: 'نام تأمین‌کننده' },
          { value: 'code', label: 'کد' },
          { value: 'amount', label: 'بیشترین مبلغ فاکتور' },
          { value: 'balance', label: 'بیشترین مانده' },
        ]}
        onSort={setSortBy}
        filters={[{
          label: 'وضعیت',
          value: statusFilter,
          options: FILTER_OPTIONS,
          onChange: setStatusFilter,
        }]}
        activeChips={activeChips}
        activeFilterCount={activeChips.length}
        onReset={() => { setSearch(''); setStatusFilter('all'); setSortBy('name'); }}
      />


      {error || suppliers.error ? (
        <Typography sx={{ color: 'error.main', fontSize: 12, mb: 1 }}>{error || suppliers.error}</Typography>
      ) : null}

      <Box sx={{ ...cardSx, ...tableFrameSx }}>
        <ModuleTable
          tableTheme={themeTokens}
          ariaLabel="فهرست تأمین‌کنندگان"
          containerRef={tableRef}
          tableHeight={tableHeight}
          rowHeight={rowHeight}
          dimmed={suppliers.loading}
          rows={pagedRows}
          rowKey={(row) => row.id}
          onRowClick={(row) => openEdit(row)}
          emptyText="تأمین‌کننده‌ای با این شرایط پیدا نشد."
          columns={[
            { key: 'row', label: 'ردیف', width: '4%', align: 'center',
              render: (row, index) => digits(page * pageSize + index + 1) },
            { key: 'name', label: 'نام / عنوان', width: '22%', render: (row) => row.name },
            { key: 'code', label: 'کد', width: '7%', align: 'center',
              render: (row) => digits(row.code || '—') },
            { key: 'category', label: 'دسته', width: '12%', render: (row) => row.categoryLabel },
            { key: 'national', label: 'شناسه ملی', width: '12%',
              render: (row) => digits(row.national_id || '—') },
            { key: 'contact', label: 'تماس', width: '12%',
              render: (row) => digits(row.phone || row.mobile || '—') },
            { key: 'rating', label: 'امتیاز', width: '6%', align: 'center',
              render: (row) => digits(row.rating || 0) },
            { key: 'amount', label: 'مبلغ فاکتورها', width: '11%',
              render: (row) => money(row.finance.invoices_total || 0) },
            { key: 'balance', label: 'مانده', width: '10%',
              render: (row) => money(row.finance.invoices_balance || 0) },
            { key: 'status', label: 'وضعیت', width: '8%', align: 'center',
              render: (row) => (
                <Chip size="small"
                  label={(STATUS_OPTIONS.find((item) => item.value === row.status) || {}).label || row.status}
                  sx={{
                    height: 21, fontSize: 10.5, fontWeight: 800,
                    bgcolor: alpha(STATUS_COLORS[row.status] || '#64748b', 0.12),
                    color: STATUS_COLORS[row.status] || '#64748b',
                  }} />
              ) },
            { key: 'actions', label: 'عملیات', width: '14%', align: 'center',
              render: (row) => (
                <Stack direction="row" spacing={0.25} justifyContent="center">
                  <Button size="small"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/procurement/supplier-profile?supplier=${row.id}`);
                    }} sx={{ fontSize: 11 }}>پرونده</Button>
                  <Button size="small"
                    onClick={(event) => { event.stopPropagation(); openEdit(row); }}
                    sx={{ fontSize: 11 }}>ویرایش</Button>
                  <Button size="small"
                    onClick={(event) => { event.stopPropagation(); toggleStatus(row); }}
                    sx={{ fontSize: 11 }}>وضعیت</Button>
                  <Button size="small" color="error"
                    onClick={(event) => { event.stopPropagation(); remove(row); }}
                    sx={{ fontSize: 11 }}>حذف</Button>
                </Stack>
              ) },
          ]}
        />
        <ModulePager
          tableTheme={themeTokens}
          page={page}
          onPage={setPage}
          totalPages={totalPages}
          pageNumbers={pageNumbers}
          total={rows.length}
          pageSize={pageSize}
          unit="تأمین‌کننده"
        />
      </Box>


      <DialogShell open={open} title={editing ? 'ویرایش تأمین‌کننده' : 'ثبت تأمین‌کننده'} maxWidth="md"
        onClose={() => setOpen(false)} onSubmit={submit} loading={saving} error={error}>
        <FormGrid>
          <Field size={5} label="نام / عنوان" required value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          <Field size={3} label="کد" required value={form.code}
            onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} />
          <Field size={4} label="دسته" select options={(categories.rows || []).map((row) => ({ value: row.id, label: row.name }))}
            value={form.category}
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
      </DialogShell>
    </Box>
  );
};

export default ProcurementSuppliersStudio;

